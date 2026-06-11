/**
 * @file observatory_chart.js
 * @description Layout engine for the Observatory: the constellation journal
 * drawn as an actual star chart. Every universe you've visited is a star
 * whose position derives from its seed (so the same journal always draws the
 * same sky), lineages cluster into constellations around their founding
 * seed, your visits in time-order trace a faint journey line, and travelers
 * you've met leave hollow stars — their home worlds, charted but unvisited.
 *
 * Pure geometry/color — no DOM. journal.js renders the result to a canvas.
 */

import { stringToSeed } from './utils.js';
import { parseLineage } from './epoch_system.js';
import { BLUEPRINT_THEME } from './lore_codex.js';

const THEME_HUE = {
    cosmic: 210, temporal: 265, void: 285, organic: 110, aquatic: 185,
    digital: 150, crystal: 195, craft: 35, fire: 18, sonic: 330, ethereal: 50,
};

/** Deterministic hue for a blueprint name (falls back through lore themes). */
export function blueprintHue(blueprintName) {
    const theme = BLUEPRINT_THEME[blueprintName] || 'cosmic';
    return THEME_HUE[theme] !== undefined ? THEME_HUE[theme] : 210;
}

function hash01(str, salt) {
    let h = stringToSeed(String(str) + ':' + salt) >>> 0;
    h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0);
    return h / 4294967296;
}

/**
 * Lay out journal entries as stars.
 * @param {Array} entries - journal entries ({seed, blueprint?, visits?, ts, kind?, metName?})
 * @param {number} width
 * @param {number} height
 * @param {string} currentSeed - highlighted star
 * @returns {{ stars: Array, lineageLinks: Array, journeyLinks: Array }}
 */
export function chartLayout(entries, width, height, currentSeed) {
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.min(width, height) * 0.46;

    // Anchor per lineage base: seed-hash → polar position (stable forever)
    const anchors = new Map();
    const anchorOf = (base) => {
        let a = anchors.get(base);
        if (!a) {
            const ang = hash01(base, 'ang') * Math.PI * 2;
            const rad = (0.18 + hash01(base, 'rad') * 0.82) * maxR;
            a = { x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad * 0.92 };
            anchors.set(base, a);
        }
        return a;
    };

    const stars = [];
    const bySeed = new Map();
    for (const en of entries) {
        const { base, generation } = parseLineage(en.seed);
        const a = anchorOf(base);
        // Descendants orbit their founder; the founder sits on the anchor
        let x = a.x;
        let y = a.y;
        if (generation > 1) {
            const oAng = hash01(en.seed, 'orb') * Math.PI * 2;
            const oRad = 10 + generation * 7;
            x = a.x + Math.cos(oAng) * oRad;
            y = a.y + Math.sin(oAng) * oRad;
        }
        const met = en.kind === 'met';
        const visits = en.visits || 1;
        const star = {
            x: Math.max(10, Math.min(width - 10, x)),
            y: Math.max(10, Math.min(height - 10, y)),
            r: met ? 2.5 : 2.5 + Math.min(4, visits),
            hue: blueprintHue(en.blueprint),
            met,
            current: en.seed === currentSeed,
            generation,
            base,
            entry: en,
        };
        stars.push(star);
        bySeed.set(en.seed, star);
    }

    // Lineage constellation lines: gen N → gen N+1 within a base
    const lineageLinks = [];
    const byBase = new Map();
    for (const s of stars) {
        if (!byBase.has(s.base)) byBase.set(s.base, []);
        byBase.get(s.base).push(s);
    }
    for (const group of byBase.values()) {
        if (group.length < 2) continue;
        group.sort((a, b) => a.generation - b.generation);
        for (let i = 1; i < group.length; i++) {
            lineageLinks.push({ a: group[i - 1], b: group[i] });
        }
    }

    // Journey line: visited stars in time order (your path through the sky)
    const visited = stars.filter((s) => !s.met).sort((a, b) => a.entry.ts - b.entry.ts);
    const journeyLinks = [];
    for (let i = 1; i < visited.length; i++) {
        journeyLinks.push({ a: visited[i - 1], b: visited[i] });
    }

    return { stars, lineageLinks, journeyLinks };
}

/** Render a chart layout to a 2D context (transparent background). */
export function drawChart(ctx, layout, width, height, hovered) {
    ctx.clearRect(0, 0, width, height);

    // Journey first (faint dotted path), then lineage lines, then stars
    ctx.save();
    ctx.setLineDash([2, 5]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const l of layout.journeyLinks) {
        ctx.moveTo(l.a.x, l.a.y);
        ctx.lineTo(l.b.x, l.b.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(255, 220, 170, 0.35)';
    ctx.beginPath();
    for (const l of layout.lineageLinks) {
        ctx.moveTo(l.a.x, l.a.y);
        ctx.lineTo(l.b.x, l.b.y);
    }
    ctx.stroke();

    for (const s of layout.stars) {
        const isHover = s === hovered;
        if (s.met) {
            ctx.strokeStyle = `hsla(${s.hue}, 70%, 75%, ${isHover ? 0.95 : 0.5})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r + 1, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.fillStyle = `hsla(${s.hue}, 80%, ${isHover ? 85 : 70}%, ${isHover ? 1 : 0.85})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
        if (s.current) {
            ctx.strokeStyle = `hsla(${s.hue}, 90%, 80%, 0.9)`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (isHover) {
            const en = s.entry;
            const label = s.met
                ? `${en.metName ? en.metName + "'s home — " : ''}${en.seed}`
                : `${en.epithet || en.seed} · ${en.seed}`;
            ctx.font = '11px "Exo 2", sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
            const tw = ctx.measureText(label).width;
            const lx = Math.max(6, Math.min(width - tw - 6, s.x - tw / 2));
            const ly = s.y > 26 ? s.y - 14 : s.y + 22;
            ctx.fillText(label, lx, ly);
        }
    }
    ctx.restore();
}

/** Nearest star within `radius` of (x, y), or null. */
export function hitTest(layout, x, y, radius = 14) {
    let best = null;
    let bestD = radius * radius;
    for (const s of layout.stars) {
        const dx = s.x - x;
        const dy = s.y - y;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = s; }
    }
    return best;
}
