/**
 * @file metro_map_generator.js
 * @description Seeded procedural generator for schematic transit ("metro") maps.
 * Produces octilinear line geometry — horizontal/vertical/45° runs joined by
 * rounded corners, the visual grammar of real subway diagrams — plus station
 * placement with interchange clustering and an optional octilinear river band.
 *
 * Four topologies, picked per seed:
 *  - weave:     crosshatch of horizontal-ish and vertical-ish lines (+ rare diagonal)
 *  - spokes:    3-4 straight diameter lines through a hub, optional ring
 *  - orbital:   two concentric ring lines threaded by straight diameters
 *  - riverside: lines hugging both banks of a river, bridged by crossing lines
 *
 * Pure geometry: no DOM or canvas access, so it is cheap to test and reuse.
 * Rendering and interaction live in metro_transit_effects.js.
 */

const TAU = Math.PI * 2;

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/**
 * Core octilinear walk along a dominant axis `u` with 45° jogs in `v`.
 * Endpoint v is soft — jogs are biased toward evTarget but the line is allowed
 * to land wherever its last run ends, which keeps generation robust.
 */
function octiWalk(rng, su, sv, eu, evTarget, jogs, vMin, vMax) {
    const pts = [{ u: su, v: sv }];
    const dirU = eu > su ? 1 : -1;
    const span = Math.abs(eu - su);
    const fr = [];
    for (let i = 0; i < jogs; i++) fr.push(0.12 + rng() * 0.74);
    fr.sort((a, b) => a - b);
    let u = su;
    let v = sv;
    for (let i = 0; i < jogs; i++) {
        const ju = su + dirU * span * fr[i];
        if ((ju - u) * dirU < 16) continue; // too close to the previous corner
        const nextU = i + 1 < jogs ? su + dirU * span * fr[i + 1] : eu;
        const maxMag = Math.abs(nextU - ju) * 0.85;
        const want = (evTarget - v) * (0.35 + rng() * 0.65) + (rng() - 0.5) * span * 0.22;
        let mag = Math.min(Math.abs(want), maxMag);
        if (mag < 26) continue;
        const sgn = want < 0 ? -1 : 1;
        const nv = clamp(v + sgn * mag, vMin, vMax);
        mag = Math.abs(nv - v);
        if (mag < 26) continue;
        pts.push({ u: ju, v });
        u = ju + dirU * mag;
        v = nv;
        pts.push({ u, v });
    }
    pts.push({ u: eu, v });
    return pts;
}

/**
 * Octilinear path from (sx,sy) toward (ex,ey). The dominant axis is travelled
 * fully; the cross axis is approached via 45° jogs.
 */
export function octilinearPath(rng, sx, sy, ex, ey, jogs, xMin, xMax, yMin, yMax) {
    if (Math.abs(ex - sx) >= Math.abs(ey - sy)) {
        return octiWalk(rng, sx, sy, ex, ey, jogs, yMin, yMax).map(p => ({ x: p.u, y: p.v }));
    }
    return octiWalk(rng, sy, sx, ey, ex, jogs, xMin, xMax).map(p => ({ x: p.v, y: p.u }));
}

/** Quadratic-sample a corner: in-point, 3 curve samples through b, out-point. */
function pushRoundedCorner(out, a, b, c, radius) {
    const d1 = Math.hypot(b.x - a.x, b.y - a.y);
    const d2 = Math.hypot(c.x - b.x, c.y - b.y);
    const r = Math.min(radius, d1 * 0.5, d2 * 0.5);
    if (r < 2 || d1 < 1e-6 || d2 < 1e-6) {
        out.push({ x: b.x, y: b.y });
        return;
    }
    const inP = { x: b.x - (b.x - a.x) / d1 * r, y: b.y - (b.y - a.y) / d1 * r };
    const outP = { x: b.x + (c.x - b.x) / d2 * r, y: b.y + (c.y - b.y) / d2 * r };
    out.push(inP);
    for (let t = 0.25; t < 0.9; t += 0.25) {
        const mt = 1 - t;
        out.push({
            x: mt * mt * inP.x + 2 * mt * t * b.x + t * t * outP.x,
            y: mt * mt * inP.y + 2 * mt * t * b.y + t * t * outP.y,
        });
    }
    out.push(outP);
}

/** Round the corners of an open polyline, returning a denser polyline. */
export function roundOpen(pts, radius) {
    if (pts.length < 3) return pts.slice();
    const out = [{ x: pts[0].x, y: pts[0].y }];
    for (let i = 1; i < pts.length - 1; i++) {
        pushRoundedCorner(out, pts[i - 1], pts[i], pts[i + 1], radius);
    }
    out.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
    return out;
}

/** Round every vertex of a closed polygon; output is closed (last === first). */
export function roundClosed(pts, radius) {
    const n = pts.length;
    const out = [];
    for (let i = 0; i < n; i++) {
        pushRoundedCorner(out, pts[(i + n - 1) % n], pts[i], pts[(i + 1) % n], radius);
    }
    out.push({ x: out[0].x, y: out[0].y });
    return out;
}

/** Build a line record with cumulative arc lengths from a (possibly noisy) polyline. */
export function buildLine(rawPts, isLoop) {
    const pts = [rawPts[0]];
    for (let i = 1; i < rawPts.length; i++) {
        const prev = pts[pts.length - 1];
        const p = rawPts[i];
        if (Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y) > 0.5) pts.push(p);
    }
    const cum = new Float64Array(pts.length);
    for (let i = 1; i < pts.length; i++) {
        cum[i] = cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    return {
        pts,
        cum,
        total: cum[pts.length - 1],
        isLoop: !!isLoop,
        stationDists: [],
        stationRefs: [],
    };
}

/**
 * Resolve the point at arc distance `d` along a line. Writes x/y/ang into
 * `out` and returns the segment index, which callers pass back as `hint`
 * next frame for O(1) amortized lookups.
 */
export function pointAtDist(line, d, hint, out) {
    const pts = line.pts;
    const cum = line.cum;
    const n = pts.length;
    if (line.isLoop) {
        d = ((d % line.total) + line.total) % line.total;
    } else {
        d = clamp(d, 0, line.total);
    }
    let i = clamp(hint | 0, 0, n - 2);
    while (i > 0 && d < cum[i]) i--;
    while (i < n - 2 && d > cum[i + 1]) i++;
    const segLen = cum[i + 1] - cum[i];
    const t = segLen > 0 ? (d - cum[i]) / segLen : 0;
    const a = pts[i];
    const b = pts[i + 1];
    out.x = a.x + (b.x - a.x) * t;
    out.y = a.y + (b.y - a.y) * t;
    out.ang = Math.atan2(b.y - a.y, b.x - a.x);
    return i;
}

/**
 * Nearest point on a line to (x, y) using exact point-to-segment distance.
 * Returns squared distance and the arc distance of the closest point.
 * Only called on clicks, so the full segment scan is fine.
 */
export function nearestOnLine(line, x, y) {
    const pts = line.pts;
    const cum = line.cum;
    let bestD2 = Infinity;
    let bestDist = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
        const ax = pts[i].x;
        const ay = pts[i].y;
        const dx = pts[i + 1].x - ax;
        const dy = pts[i + 1].y - ay;
        const len2 = dx * dx + dy * dy;
        if (len2 < 1e-6) continue;
        const t = clamp(((x - ax) * dx + (y - ay) * dy) / len2, 0, 1);
        const px = ax + dx * t;
        const py = ay + dy * t;
        const ddx = x - px;
        const ddy = y - py;
        const d2 = ddx * ddx + ddy * ddy;
        if (d2 < bestD2) {
            bestD2 = d2;
            bestDist = cum[i] + Math.sqrt(len2) * t;
        }
    }
    return { d2: bestD2, dist: bestDist };
}

/** Flat-top octagon (all edges at 0/45/90/135°, matching the octilinear grammar). */
function octagon(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 8; i++) {
        const a = TAU / 16 + (i / 8) * TAU;
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return pts;
}

/** Point where a ray from (cx,cy) at angle `ang` exits the given rect. */
function rayToRect(cx, cy, ang, x0, y0, x1, y1) {
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    let tMin = Infinity;
    if (dx > 1e-9) tMin = Math.min(tMin, (x1 - cx) / dx);
    else if (dx < -1e-9) tMin = Math.min(tMin, (x0 - cx) / dx);
    if (dy > 1e-9) tMin = Math.min(tMin, (y1 - cy) / dy);
    else if (dy < -1e-9) tMin = Math.min(tMin, (y0 - cy) / dy);
    return { x: cx + dx * tMin, y: cy + dy * tMin };
}

/** Insert a station arc-distance, skipping near-duplicates, keeping sort order. */
function insertStationDist(line, d) {
    for (const e of line.stationDists) {
        if (Math.abs(e - d) < 40) return;
    }
    line.stationDists.push(d);
    line.stationDists.sort((a, b) => a - b);
}

function placeStationDists(line, rng, spacing) {
    let s = spacing * (line.isLoop ? 0.3 : 0.4 + rng() * 0.4);
    const limit = line.isLoop ? line.total - spacing * 0.45 : line.total - 36;
    while (s < limit && line.stationDists.length < 11) {
        insertStationDist(line, s);
        s += spacing * (0.75 + rng() * 0.55);
    }
}

/** Group stations of different lines that sit within 24px into interchanges. */
function clusterStations(stations) {
    const groups = [];
    const R2 = 24 * 24;
    for (let i = 0; i < stations.length; i++) {
        for (let j = i + 1; j < stations.length; j++) {
            const a = stations[i];
            const b = stations[j];
            if (a.line === b.line) continue;
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            if (dx * dx + dy * dy >= R2) continue;
            if (a.group < 0 && b.group < 0) {
                a.group = b.group = groups.length;
                groups.push([i, j]);
            } else if (a.group >= 0 && b.group < 0) {
                b.group = a.group;
                groups[a.group].push(j);
            } else if (b.group >= 0 && a.group < 0) {
                a.group = b.group;
                groups[b.group].push(i);
            } else if (a.group !== b.group) {
                const from = groups[b.group];
                const into = groups[a.group];
                for (const idx of from) {
                    stations[idx].group = a.group;
                    into.push(idx);
                }
                from.length = 0;
            }
        }
    }
    return groups.filter(g => g.length > 1);
}

/**
 * Generate a complete metro network for a w×h viewport.
 * @param {function} rng - seeded RNG
 * @returns {{ topology: string, lines: object[], stations: object[],
 *             interchanges: number[][], river: object|null, cornerR: number }}
 */
export function generateMetroNetwork(rng, w, h) {
    const margin = Math.min(w, h) * 0.06 + 18;
    const cornerR = 10 + rng() * 16;
    const topologies = ['weave', 'spokes', 'orbital', 'riverside'];
    const topology = topologies[Math.floor(rng() * topologies.length)];
    const lines = [];
    let river = null;

    const addOpen = (raw) => lines.push(buildLine(roundOpen(raw, cornerR), false));
    const addClosed = (raw) => lines.push(buildLine(roundClosed(raw, cornerR), true));

    // Diameter line through (cx, cy) at one of the four octilinear angles.
    // Returns the arc distance of the hub so a station can be pinned there.
    const addDiameter = (cx, cy, ang) => {
        const a = rayToRect(cx, cy, ang, margin, margin, w - margin, h - margin);
        const b = rayToRect(cx, cy, ang + Math.PI, margin, margin, w - margin, h - margin);
        const ln = buildLine([a, { x: cx, y: cy }, b], false);
        lines.push(ln);
        return Math.hypot(cx - a.x, cy - a.y);
    };

    if (topology === 'weave') {
        const nH = 1 + Math.floor(rng() * 3);
        const nV = 1 + Math.floor(rng() * (nH > 2 ? 2 : 3));
        for (let i = 0; i < nH; i++) {
            const sy = h * (0.14 + 0.72 * ((i + 0.2 + rng() * 0.6) / nH));
            const ey = clamp(sy + (rng() - 0.5) * h * 0.5, margin, h - margin);
            const ltr = rng() < 0.5;
            addOpen(octilinearPath(rng, ltr ? margin : w - margin, sy, ltr ? w - margin : margin, ey,
                1 + Math.floor(rng() * 3), margin, w - margin, margin, h - margin));
        }
        for (let i = 0; i < nV; i++) {
            const sx = w * (0.12 + 0.76 * ((i + 0.2 + rng() * 0.6) / nV));
            const ex = clamp(sx + (rng() - 0.5) * w * 0.4, margin, w - margin);
            const ttb = rng() < 0.5;
            addOpen(octilinearPath(rng, sx, ttb ? margin : h - margin, ex, ttb ? h - margin : margin,
                1 + Math.floor(rng() * 3), margin, w - margin, margin, h - margin));
        }
        if (rng() < 0.3) {
            // One bold corner-to-corner diagonal
            const flip = rng() < 0.5;
            addOpen(octilinearPath(rng, margin, flip ? h - margin : margin, w - margin, flip ? margin : h - margin,
                2 + Math.floor(rng() * 2), margin, w - margin, margin, h - margin));
        }
    } else if (topology === 'spokes') {
        const cx = w * (0.38 + rng() * 0.24);
        const cy = h * (0.38 + rng() * 0.24);
        const angles = [0, TAU / 8, TAU / 4, TAU * 3 / 8];
        // Fisher-Yates with the seeded rng
        for (let i = angles.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            const t = angles[i]; angles[i] = angles[j]; angles[j] = t;
        }
        const count = 3 + (rng() < 0.55 ? 1 : 0);
        const hubDists = [];
        for (let i = 0; i < count; i++) hubDists.push(addDiameter(cx, cy, angles[i]));
        if (rng() < 0.7) {
            addClosed(octagon(cx, cy, Math.min(w, h) * (0.2 + rng() * 0.13)));
        }
        // Pin a station on every diameter at the hub → clustered mega-interchange
        for (let i = 0; i < count; i++) insertStationDist(lines[i], hubDists[i]);
    } else if (topology === 'orbital') {
        const cx = w * (0.42 + rng() * 0.16);
        const cy = h * (0.42 + rng() * 0.16);
        const m = Math.min(w, h);
        addClosed(octagon(cx, cy, m * (0.13 + rng() * 0.05)));
        addClosed(octagon(cx, cy, m * (0.3 + rng() * 0.09)));
        const angles = [0, TAU / 8, TAU / 4, TAU * 3 / 8];
        const start = Math.floor(rng() * 4);
        const count = 2 + (rng() < 0.5 ? 1 : 0);
        for (let i = 0; i < count; i++) {
            const ringCount = lines.length;
            const hubDist = addDiameter(cx, cy, angles[(start + i) % 4]);
            insertStationDist(lines[ringCount], hubDist);
        }
    } else { // riverside
        const riverY = h * (0.32 + rng() * 0.36);
        const riverRaw = octilinearPath(rng, -40, riverY, w + 40, clamp(riverY + (rng() - 0.5) * h * 0.35, h * 0.2, h * 0.8),
            2 + Math.floor(rng() * 3), -40, w + 40, h * 0.16, h * 0.84);
        river = { pts: roundOpen(riverRaw, cornerR * 2.4), width: 18 + rng() * 24 };
        const banks = 2 + (rng() < 0.4 ? 1 : 0);
        for (let i = 0; i < banks; i++) {
            const above = i % 2 === 0;
            const off = 50 + rng() * h * 0.18;
            const sy = clamp(riverY + (above ? -off : off), margin, h - margin);
            const yLo = above ? margin : clamp(riverY + 34, margin, h - margin);
            const yHi = above ? clamp(riverY - 34, margin, h - margin) : h - margin;
            addOpen(octilinearPath(rng, margin, sy, w - margin, clamp(sy + (rng() - 0.5) * h * 0.3, yLo, yHi),
                1 + Math.floor(rng() * 3), margin, w - margin, Math.min(yLo, yHi), Math.max(yLo, yHi)));
        }
        const crossings = 1 + Math.floor(rng() * 3);
        for (let i = 0; i < crossings; i++) {
            const sx = w * (0.15 + 0.7 * ((i + rng() * 0.8) / crossings));
            addOpen(octilinearPath(rng, sx, margin, clamp(sx + (rng() - 0.5) * w * 0.3, margin, w - margin), h - margin,
                1 + Math.floor(rng() * 2), margin, w - margin, margin, h - margin));
        }
    }

    // ── Stations ──
    const spacing = 95 + rng() * 75;
    const stations = [];
    const scratch = { x: 0, y: 0, ang: 0 };
    for (let li = 0; li < lines.length; li++) {
        const ln = lines[li];
        placeStationDists(ln, rng, spacing);
        let seg = 0;
        for (const d of ln.stationDists) {
            seg = pointAtDist(ln, d, seg, scratch);
            ln.stationRefs.push(stations.length);
            stations.push({
                x: scratch.x,
                y: scratch.y,
                ang: scratch.ang,
                line: li,
                dist: d,
                group: -1,
                pax: 0,
                maxPax: 4,
            });
        }
    }
    const interchanges = clusterStations(stations);

    return { topology, lines, stations, interchanges, river, cornerR };
}
