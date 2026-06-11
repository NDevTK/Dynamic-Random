/**
 * @file metro_transit_effects.js
 * @description Interactive effect: a living schematic metro map. A seeded
 * octilinear transit network (see metro_map_generator.js) is pre-rendered once
 * to an offscreen canvas; glowing trains then run the lines in real time,
 * easing into stations, dwelling with blinking doors, and collecting the tiny
 * passengers that accumulate on platforms.
 *
 * Seed-driven variation:
 *  - 4 network topologies: weave, spokes (hub + optional ring), orbital
 *    (concentric rings + diameters), riverside (banks bridged across a river)
 *  - 2-7 lines with distinct hues spread around a palette-derived base, in
 *    neon / classic / pastel colorways
 *  - 4 station styles (ringed disc, white dot, perpendicular tick, square),
 *    line width, map opacity, corner radius, station spacing
 *  - train fleet size, car count (1-3), speed, dwell time; rare dashed
 *    "under construction" line
 *  - optional river band; interchange clusters drawn as connected white discs
 *
 * Interaction: the cursor highlights the nearest station (pulse ring + roundel
 * badge, waiting passengers perk up); clicking dispatches a bright express
 * train onto the nearest line from the click point.
 *
 * Performance: the entire static map (river, casings, line cores, termini,
 * interchange connectors, stations) is rasterized once per universe into an
 * offscreen canvas and blitted per frame; per-frame work is only trains
 * (arc-length lookup with cached segment hints), capped pooled pings, and one
 * batched passenger fill.
 */

import { generateMetroNetwork, pointAtDist, nearestOnLine } from './metro_map_generator.js';
import { pointsOfInterest } from './points_of_interest.js';

const TAU = Math.PI * 2;

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/** Axis-aligned capsule path centered on the origin (call within a rotated ctx). */
function capsulePath(ctx, halfLen, halfWid) {
    const hl = Math.max(halfLen, halfWid + 0.1);
    ctx.beginPath();
    ctx.moveTo(-hl + halfWid, -halfWid);
    ctx.lineTo(hl - halfWid, -halfWid);
    ctx.arc(hl - halfWid, 0, halfWid, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(-hl + halfWid, halfWid);
    ctx.arc(-hl + halfWid, 0, halfWid, Math.PI / 2, Math.PI * 1.5);
    ctx.closePath();
}

function strokePolyline(g, pts) {
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.stroke();
}

export class MetroTransit {
    constructor() {
        this._net = null;
        this._trains = [];
        this._pings = [];
        this._pingPool = [];
        this._tick = 0;
        this._mapCanvas = null;
        this._mapDirty = true;
        this._genW = 1;
        this._genH = 1;
        this._hoverStation = -1;
        this._wasClicking = false;
        this._expressCount = 0;
        this._lcg = 1;
        this._pt = { x: 0, y: 0, ang: 0 }; // scratch for pointAtDist
    }

    /** Deterministic runtime RNG, reseeded from the universe seed in configure(). */
    _rand() {
        this._lcg = (Math.imul(this._lcg, 1664525) + 1013904223) >>> 0;
        return this._lcg / 4294967296;
    }

    configure(rng, palette) {
        this._tick = 0;
        this._genW = Math.max(480, window.innerWidth);
        this._genH = Math.max(360, window.innerHeight);
        this._lcg = ((rng() * 4294967296) >>> 0) || 1;

        this._net = generateMetroNetwork(rng, this._genW, this._genH);
        const lines = this._net.lines;

        // ── Colorway: one distinct hue per line around a palette-derived base ──
        const styleRoll = rng();
        const sat = styleRoll < 0.33 ? 95 : styleRoll < 0.7 ? 76 : 56; // neon / classic / pastel
        const light = styleRoll < 0.33 ? 58 : styleRoll < 0.7 ? 52 : 68;
        const baseHue = palette && palette.length > 0
            ? palette[Math.floor(rng() * palette.length)].h
            : rng() * 360;
        const hueStep = 360 / lines.length;
        for (let i = 0; i < lines.length; i++) {
            const ln = lines[i];
            ln.hue = (baseHue + i * hueStep + (rng() - 0.5) * 24 + 360) % 360;
            ln.sat = sat;
            ln.light = light;
            ln.dashed = false;
        }
        if (lines.length > 2 && rng() < 0.14) {
            lines[Math.floor(rng() * lines.length)].dashed = true; // under construction
        }

        this._lineWidth = 2.5 + rng() * 2;
        this._stationR = this._lineWidth * 1.25 + 1.4;
        this._stationStyle = Math.floor(rng() * 4); // 0 ring-disc, 1 dot, 2 tick, 3 square
        this._mapAlpha = 0.55 + rng() * 0.3;
        this._riverHue = 185 + rng() * 50;

        // ── Trains ──
        this._trains.length = 0;
        this._expressCount = 0;
        this._speedBase = 0.7 + rng() * 0.8;
        this._dwellTicks = 26 + Math.floor(rng() * 30);
        this._carCount = 1 + Math.floor(rng() * 3);
        this._carLen = 13 + rng() * 7;
        this._carGap = 3;
        for (let i = 0; i < lines.length; i++) {
            const ln = lines[i];
            const n = 1 + (ln.total > 1100 ? 1 : 0) + (rng() < 0.3 ? 1 : 0);
            for (let k = 0; k < n; k++) {
                this._spawnTrain(ln, ln.total * ((k + rng() * 0.6) / n),
                    rng() < 0.5 ? 1 : -1, this._speedBase * (0.85 + rng() * 0.3), false);
            }
        }

        // ── Passengers ──
        this._paxRate = 0.0012 + rng() * 0.0035;
        for (const st of this._net.stations) {
            st.maxPax = 3 + Math.floor(rng() * 5);
            st.pax = rng() < 0.5 ? Math.floor(rng() * 3) : 0;
        }

        this._pings.length = 0;
        this._pingPool.length = 0;
        this._hoverStation = -1;
        this._wasClicking = false;
        this._mapDirty = true;
    }

    _spawnTrain(line, dist, dir, speed, express) {
        const t = { line, dist, dir, speed, seg: 0, dwell: 0, stopIdx: -1, express };
        this._syncNextStop(t);
        this._trains.push(t);
        return t;
    }

    /** Point stopIdx at the first station strictly ahead in the travel direction. */
    _syncNextStop(t) {
        t.stopIdx = -1;
        if (t.express) return; // expresses sail through
        const ds = t.line.stationDists;
        if (ds.length === 0) return;
        if (t.dir > 0) {
            for (let i = 0; i < ds.length; i++) {
                if (ds[i] > t.dist + 1) { t.stopIdx = i; return; }
            }
            if (t.line.isLoop) t.stopIdx = 0;
        } else {
            for (let i = ds.length - 1; i >= 0; i--) {
                if (ds[i] < t.dist - 1) { t.stopIdx = i; return; }
            }
            if (t.line.isLoop) t.stopIdx = ds.length - 1;
        }
    }

    _board(t) {
        if (t.stopIdx < 0) return;
        const st = this._net.stations[t.line.stationRefs[t.stopIdx]];
        if (st && st.pax > 0) {
            st.pax = 0;
            this._spawnPing(st.x, st.y, 18, t.line.hue, 0.45);
        }
    }

    _spawnPing(x, y, maxR, hue, alpha) {
        if (this._pings.length >= 14) return;
        const p = this._pingPool.length > 0 ? this._pingPool.pop() : {};
        p.x = x; p.y = y; p.r = 2; p.maxR = maxR;
        p.hue = hue; p.alpha = alpha; p.spd = 1 + maxR / 30;
        this._pings.push(p);
    }

    _dispatchExpress(nx, ny) {
        if (this._expressCount >= 4 || !this._net) return;
        const lines = this._net.lines;
        let bestLine = -1;
        let bestD2 = 150 * 150;
        let bestDist = 0;
        for (let i = 0; i < lines.length; i++) {
            const near = nearestOnLine(lines[i], nx, ny);
            if (near.d2 < bestD2) {
                bestD2 = near.d2;
                bestLine = i;
                bestDist = near.dist;
            }
        }
        if (bestLine < 0) return;
        const ln = lines[bestLine];
        const t = this._spawnTrain(ln, bestDist, this._rand() < 0.5 ? -1 : 1,
            this._speedBase * 2.4, true);
        this._expressCount++;
        t.seg = pointAtDist(ln, t.dist, 0, this._pt);
        this._spawnPing(this._pt.x, this._pt.y, 36, ln.hue, 0.6);
    }

    update(mx, my, isClicking) {
        this._tick++;
        if (!this._net) return;

        // Mouse → network space (the map stretches with the window after resize)
        const nx = mx * (this._genW / Math.max(1, window.innerWidth));
        const ny = my * (this._genH / Math.max(1, window.innerHeight));

        // ── Hover station ──
        const stations = this._net.stations;
        let best = -1;
        let bestD = 80 * 80;
        for (let i = 0; i < stations.length; i++) {
            const dx = stations[i].x - nx;
            const dy = stations[i].y - ny;
            const d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = i; }
        }
        this._hoverStation = best;
        if (best >= 0 && this._tick % 36 === 0) {
            const st = stations[best];
            this._spawnPing(st.x, st.y, 26, this._net.lines[st.line].hue, 0.3);
        }

        // ── Click: dispatch an express from the nearest line ──
        const clicked = isClicking && !this._wasClicking;
        this._wasClicking = isClicking;
        if (clicked) this._dispatchExpress(nx, ny);

        // ── Passengers trickle onto platforms ──
        if ((this._tick & 1) === 0) {
            for (let i = 0; i < stations.length; i++) {
                const st = stations[i];
                if (st.pax < st.maxPax && this._rand() < this._paxRate * 2) st.pax++;
            }
        }

        // ── Trains ──
        for (let i = this._trains.length - 1; i >= 0; i--) {
            const t = this._trains[i];
            if (t.dwell > 0) {
                t.dwell--;
                if (t.dwell === 0) this._syncNextStop(t);
                continue;
            }
            let sp = t.speed;
            if (t.stopIdx >= 0) {
                const ds = t.line.stationDists;
                let gap = t.dir > 0 ? ds[t.stopIdx] - t.dist : t.dist - ds[t.stopIdx];
                if (gap < 0 && t.line.isLoop) gap += t.line.total;
                if (gap < 48) sp *= 0.3 + 0.7 * (gap / 48); // ease into the platform
                if (gap <= sp) {
                    t.dist = ds[t.stopIdx];
                    t.dwell = this._dwellTicks;
                    this._board(t);
                    continue;
                }
            }
            t.dist += sp * t.dir;
            if (t.line.isLoop) {
                if (t.dist >= t.line.total) t.dist -= t.line.total;
                else if (t.dist < 0) t.dist += t.line.total;
            } else if (t.dist >= t.line.total || t.dist <= 0) {
                t.dist = clamp(t.dist, 0, t.line.total);
                if (t.express) {
                    t.seg = pointAtDist(t.line, t.dist, t.seg, this._pt);
                    this._spawnPing(this._pt.x, this._pt.y, 40, t.line.hue, 0.5);
                    this._trains[i] = this._trains[this._trains.length - 1];
                    this._trains.pop();
                    this._expressCount--;
                    continue;
                }
                t.dir *= -1;
                t.dwell = this._dwellTicks; // terminus layover
                this._syncNextStop(t);
            }
        }

        // ── Lead cars are worth a look from the cursor familiar ──
        const psx = Math.max(1, window.innerWidth) / this._genW;
        const psy = Math.max(1, window.innerHeight) / this._genH;
        for (let i = 0; i < this._trains.length && i < 6; i++) {
            const t = this._trains[i];
            t.seg = pointAtDist(t.line, t.dist, t.seg, this._pt);
            pointsOfInterest.publish(this._pt.x * psx, this._pt.y * psy, 'train', t.express ? 1.2 : 0.9);
        }

        // ── Pings ──
        for (let i = this._pings.length - 1; i >= 0; i--) {
            const p = this._pings[i];
            p.r += p.spd;
            p.alpha *= 0.94;
            if (p.r > p.maxR || p.alpha < 0.02) {
                this._pingPool.push(p);
                this._pings[i] = this._pings[this._pings.length - 1];
                this._pings.pop();
            }
        }
    }

    draw(ctx, system) {
        if (!this._net) return;
        if (this._mapDirty) this._prerender();

        const q = system.qualityScale || 1;
        const sx = system.width / this._genW;
        const sy = system.height / this._genH;

        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        if (Math.abs(sx - 1) > 0.001 || Math.abs(sy - 1) > 0.001) ctx.scale(sx, sy);

        ctx.globalAlpha = this._mapAlpha;
        ctx.drawImage(this._mapCanvas, 0, 0);
        ctx.globalAlpha = 1;

        if (q >= 0.5) this._drawPassengers(ctx);
        this._drawHover(ctx);
        this._drawTrains(ctx, q);

        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 1.5;
        for (const p of this._pings) {
            ctx.strokeStyle = `hsla(${p.hue}, 90%, 65%, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, TAU);
            ctx.stroke();
        }
        ctx.restore();
    }

    _drawPassengers(ctx) {
        const stations = this._net.stations;
        ctx.fillStyle = 'rgba(255, 244, 214, 0.5)';
        ctx.beginPath();
        for (let i = 0; i < stations.length; i++) {
            if (i === this._hoverStation) continue;
            this._addPaxRects(ctx, stations[i], 0);
        }
        ctx.fill();
        // Hovered platform: passengers perk up (brighter, jiggling)
        if (this._hoverStation >= 0) {
            ctx.fillStyle = 'rgba(255, 250, 235, 0.85)';
            ctx.beginPath();
            this._addPaxRects(ctx, stations[this._hoverStation], this._tick);
            ctx.fill();
        }
    }

    _addPaxRects(ctx, st, jiggleTick) {
        const n = st.pax | 0;
        if (n === 0) return;
        const px = Math.cos(st.ang + Math.PI / 2);
        const py = Math.sin(st.ang + Math.PI / 2);
        const ax = Math.cos(st.ang);
        const ay = Math.sin(st.ang);
        for (let k = 0; k < n; k++) {
            const off = 8 + (k >> 1) * 4.5;
            const side = (k & 1) === 0 ? 1 : -1;
            const along = ((k * 53) % 9) - 4;
            const jig = jiggleTick > 0 ? Math.sin(jiggleTick * 0.22 + k * 1.7) * 1.5 : 0;
            const x = st.x + px * off * side + ax * (along + jig);
            const y = st.y + py * off * side + ay * (along + jig);
            ctx.rect(x - 1, y - 1, 2, 2);
        }
    }

    _drawHover(ctx) {
        if (this._hoverStation < 0) return;
        const st = this._net.stations[this._hoverStation];
        const hue = this._net.lines[st.line].hue;
        const pulse = 0.5 + 0.5 * Math.sin(this._tick * 0.12);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `hsla(${hue}, 90%, 70%, ${0.2 + pulse * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(st.x, st.y, this._stationR * (2 + pulse * 0.7), 0, TAU);
        ctx.stroke();
        // Mini roundel badge above the station
        const by = st.y - this._stationR - 14;
        ctx.strokeStyle = `hsla(${hue}, 85%, 62%, 0.85)`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(st.x, by, 5.5, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = 'rgba(245, 245, 255, 0.9)';
        ctx.fillRect(st.x - 8.5, by - 1.5, 17, 3);
        ctx.restore();
    }

    _drawTrains(ctx, q) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const pt = this._pt;
        const halfWid = (this._lineWidth + 2.6) / 2;
        const halfLen = this._carLen / 2;
        const step = this._carLen + this._carGap;
        for (const t of this._trains) {
            const ln = t.line;
            const cars = t.express ? this._carCount + 1 : this._carCount;
            const doors = t.dwell > 0 && t.dwell % 14 < 7;
            let seg = t.seg;
            for (let c = 0; c < cars; c++) {
                const d = t.dist - t.dir * c * step;
                if (!ln.isLoop && (d < 0 || d > ln.total)) continue;
                seg = pointAtDist(ln, d, seg, pt);
                if (c === 0) t.seg = seg;
                ctx.save();
                ctx.translate(pt.x, pt.y);
                ctx.rotate(pt.ang);
                if (q >= 0.5) {
                    ctx.fillStyle = `hsla(${ln.hue}, 95%, 65%, 0.1)`;
                    capsulePath(ctx, halfLen * 1.7, halfWid * 2.3);
                    ctx.fill();
                }
                ctx.fillStyle = `hsla(${ln.hue}, ${ln.sat}%, ${t.express ? 80 : 66}%, 0.95)`;
                capsulePath(ctx, halfLen, halfWid);
                ctx.fill();
                if (t.express) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    capsulePath(ctx, halfLen * 0.55, halfWid * 0.3);
                    ctx.fill();
                } else if (doors) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
                    ctx.lineWidth = 1;
                    capsulePath(ctx, halfLen, halfWid);
                    ctx.stroke();
                }
                if (c === 0 && t.dwell === 0) {
                    ctx.fillStyle = 'rgba(255, 255, 230, 0.8)';
                    ctx.beginPath();
                    ctx.arc(t.dir > 0 ? halfLen + 3 : -halfLen - 3, 0, 1.4, 0, TAU);
                    ctx.fill();
                }
                ctx.restore();
            }
        }
        ctx.restore();
    }

    /** Rasterize the static map (river, lines, termini, interchanges, stations). */
    _prerender() {
        if (!this._mapCanvas) this._mapCanvas = document.createElement('canvas');
        const c = this._mapCanvas;
        c.width = this._genW;
        c.height = this._genH;
        const g = c.getContext('2d');
        g.lineCap = 'round';
        g.lineJoin = 'round';

        const net = this._net;
        const lw = this._lineWidth;
        const sr = this._stationR;

        if (net.river) {
            g.strokeStyle = `hsla(${this._riverHue}, 60%, 45%, 0.16)`;
            g.lineWidth = net.river.width;
            strokePolyline(g, net.river.pts);
            g.strokeStyle = `hsla(${this._riverHue}, 70%, 60%, 0.1)`;
            g.lineWidth = net.river.width * 0.5;
            strokePolyline(g, net.river.pts);
        }

        // Dark casings first, then all cores: crossings read as layered tubes
        g.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        g.lineWidth = lw + 4;
        for (const ln of net.lines) strokePolyline(g, ln.pts);
        for (const ln of net.lines) {
            g.strokeStyle = `hsla(${ln.hue}, ${ln.sat}%, ${ln.light}%, 0.9)`;
            g.lineWidth = lw;
            if (ln.dashed) g.setLineDash([lw * 3, lw * 2.2]);
            strokePolyline(g, ln.pts);
            if (ln.dashed) g.setLineDash([]);
        }

        // Terminus bars on open lines
        g.lineWidth = lw * 0.9;
        for (const ln of net.lines) {
            if (ln.isLoop) continue;
            g.strokeStyle = `hsla(${ln.hue}, ${ln.sat}%, ${Math.min(90, ln.light + 22)}%, 0.95)`;
            this._terminusBar(g, ln.pts[0], ln.pts[1], sr * 1.9);
            this._terminusBar(g, ln.pts[ln.pts.length - 1], ln.pts[ln.pts.length - 2], sr * 1.9);
        }

        // Interchange connectors: black casing + white capsule between members
        for (const group of net.interchanges) {
            for (let pass = 0; pass < 2; pass++) {
                g.strokeStyle = pass === 0 ? 'rgba(5, 5, 12, 0.7)' : 'rgba(245, 245, 255, 0.85)';
                g.lineWidth = pass === 0 ? sr * 2.4 : sr * 1.6;
                g.beginPath();
                g.moveTo(net.stations[group[0]].x, net.stations[group[0]].y);
                for (let m = 1; m < group.length; m++) {
                    g.lineTo(net.stations[group[m]].x, net.stations[group[m]].y);
                }
                g.stroke();
            }
        }

        for (const st of net.stations) this._drawStation(g, st);

        this._mapDirty = false;
    }

    _terminusBar(g, end, prev, len) {
        const ang = Math.atan2(end.y - prev.y, end.x - prev.x) + Math.PI / 2;
        const dx = Math.cos(ang) * len;
        const dy = Math.sin(ang) * len;
        g.beginPath();
        g.moveTo(end.x + dx, end.y + dy);
        g.lineTo(end.x - dx, end.y - dy);
        g.stroke();
    }

    _drawStation(g, st) {
        const ln = this._net.lines[st.line];
        const sr = this._stationR;
        if (st.group >= 0) {
            // Interchange member: white-ringed disc regardless of style
            g.fillStyle = 'rgba(8, 8, 16, 0.9)';
            g.strokeStyle = 'rgba(245, 245, 255, 0.9)';
            g.lineWidth = 1.8;
            g.beginPath();
            g.arc(st.x, st.y, sr * 1.15, 0, TAU);
            g.fill();
            g.stroke();
            return;
        }
        const color = `hsla(${ln.hue}, ${ln.sat}%, ${Math.min(88, ln.light + 18)}%, 0.95)`;
        if (this._stationStyle === 1) {
            g.fillStyle = 'rgba(240, 240, 250, 0.9)';
            g.beginPath();
            g.arc(st.x, st.y, sr * 0.7, 0, TAU);
            g.fill();
        } else if (this._stationStyle === 2) {
            // Perpendicular tick, London-style
            const dx = Math.cos(st.ang + Math.PI / 2) * sr * 1.9;
            const dy = Math.sin(st.ang + Math.PI / 2) * sr * 1.9;
            g.strokeStyle = color;
            g.lineWidth = this._lineWidth * 0.8;
            g.beginPath();
            g.moveTo(st.x, st.y);
            g.lineTo(st.x + dx, st.y + dy);
            g.stroke();
        } else if (this._stationStyle === 3) {
            g.fillStyle = 'rgba(8, 8, 16, 0.9)';
            g.strokeStyle = color;
            g.lineWidth = 1.5;
            g.beginPath();
            g.rect(st.x - sr * 0.85, st.y - sr * 0.85, sr * 1.7, sr * 1.7);
            g.fill();
            g.stroke();
        } else {
            g.fillStyle = 'rgba(8, 8, 16, 0.9)';
            g.strokeStyle = color;
            g.lineWidth = 1.6;
            g.beginPath();
            g.arc(st.x, st.y, sr * 0.9, 0, TAU);
            g.fill();
            g.stroke();
        }
    }
}
