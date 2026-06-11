/**
 * @file lighthouse_architecture.js
 * @description A lighthouse keeps watch over a night sea. The tower stands on
 * a jagged rock at one side of the screen; its lamp sweeps one or two
 * volumetric beams through drifting fog motes, which catch the light as the
 * beam passes over them. Distant ships cross the horizon with blinking mast
 * lights, the moon lays a glint column on the water, and the sea breathes in
 * layered shimmer bands.
 *
 * Seed-driven variation: rock side and silhouette, tower height and stripe
 * livery (white/red, white/black, brick, bone), beam count (1-2 opposed),
 * sweep speed/width, warm or cold light, weather (clear / fog / drizzle),
 * moon phase and presence, ship count.
 *
 * Interaction: the cursor is a wandering second light that brightens motes
 * near it; shockwaves (clicks) rock the ships and sound the foghorn — a slow
 * expanding ring from the lamp. The familiar can visit the lamp: it is
 * published as a point of interest each frame.
 */

import { mouse } from './state.js';
import { pointsOfInterest } from './points_of_interest.js';

const TAU = Math.PI * 2;

export class LighthouseArchitecture {
    constructor() {
        this.tick = 0;
        this._sprite = null;     // rock + tower silhouette
        this._beamSprite = null; // gradient wedge, drawn rotated
        this._flareSprite = null;
        this._motes = [];
        this._ships = [];
        this._hornRings = [];
        this._beamAngle = 0;
        this._lampX = 0;
        this._lampY = 0;
        this._horizon = 0;
        this._seaBands = [];
        this._drops = [];
        this._lastShockCount = 0;
    }

    init(system) {
        const rng = system.rng;
        const w = system.width;
        const h = system.height;
        this.tick = 0;

        this._horizon = h * (0.55 + rng() * 0.12);
        this._side = rng() < 0.5 ? 0 : 1; // 0 = left, 1 = right
        this._towerH = h * (0.26 + rng() * 0.12);
        this._beamCount = rng() < 0.35 ? 2 : 1;
        this._beamSpeed = (0.003 + rng() * 0.005) * (rng() < 0.5 ? 1 : -1);
        this._beamHalfWidth = 0.05 + rng() * 0.05; // radians
        this._beamWarm = rng() < 0.6;
        this._beamHue = this._beamWarm ? 45 + rng() * 15 : 185 + rng() * 30;
        this._weather = Math.floor(rng() * 3); // 0 clear, 1 fog, 2 drizzle
        this._hasMoon = rng() < 0.75;
        this._moonX = w * (this._side === 0 ? 0.55 + rng() * 0.35 : 0.1 + rng() * 0.35);
        this._moonY = h * (0.1 + rng() * 0.18);
        this._moonPhase = 0.3 + rng() * 0.7; // crescent → full
        this._beamAngle = rng() * TAU;

        const rockX = this._side === 0 ? w * (0.1 + rng() * 0.1) : w * (0.8 + rng() * 0.1);
        this._lampX = rockX;
        this._lampY = this._horizon - h * 0.045 - this._towerH;

        this._prerenderScene(system, rockX, rng);
        this._prerenderBeam(system, rng);
        this._prerenderFlare();

        // Fog motes: more in fog weather, fewer when clear
        const moteCount = Math.round((this._weather === 1 ? 130 : 70) * (0.6 + rng() * 0.6));
        this._motes = [];
        for (let i = 0; i < moteCount; i++) {
            this._motes.push({
                x: rng() * w,
                y: rng() * h,
                size: 0.8 + rng() * 2.2,
                drift: 0.08 + rng() * 0.3,
                bob: rng() * TAU,
                depth: 0.4 + rng() * 0.6,
            });
        }

        // Drizzle streaks
        this._drops = [];
        if (this._weather === 2) {
            const dropCount = 70 + Math.floor(rng() * 60);
            for (let i = 0; i < dropCount; i++) {
                this._drops.push({ x: rng() * w, y: rng() * h, len: 6 + rng() * 10, speed: 6 + rng() * 6 });
            }
        }

        // Ships crossing the horizon
        const shipCount = Math.floor(rng() * 3) + (this._weather === 1 ? 0 : 1);
        this._ships = [];
        for (let i = 0; i < shipCount; i++) {
            this._ships.push({
                x: rng() * w,
                speed: (0.1 + rng() * 0.2) * (rng() < 0.5 ? 1 : -1),
                size: 8 + rng() * 14,
                bob: rng() * TAU,
                rock: 0,
                blinkPhase: Math.floor(rng() * 120),
            });
        }

        // Sea shimmer bands
        this._seaBands = [];
        const bands = 10;
        for (let i = 0; i < bands; i++) {
            this._seaBands.push({
                t: (i + 0.5) / bands,
                phase: rng() * TAU,
                speed: 0.004 + rng() * 0.01,
                amp: 1 + rng() * 3,
            });
        }

        this._hornRings = [];
        this._lastShockCount = 0;
    }

    /** Rock outcrop + striped tower + lamp room, rasterized once. */
    _prerenderScene(system, rockX, rng) {
        const w = system.width;
        const h = system.height;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const g = c.getContext('2d');

        // Jagged rock from the sea edge
        const rockW = w * (0.12 + rng() * 0.08);
        const rockTop = this._horizon - h * 0.045;
        g.fillStyle = 'rgba(8, 10, 16, 0.96)';
        g.beginPath();
        g.moveTo(rockX - rockW, this._horizon + 8);
        let px = rockX - rockW;
        const steps = 7;
        for (let i = 1; i <= steps; i++) {
            px = rockX - rockW + (i / steps) * rockW * 2;
            const peak = i === Math.ceil(steps / 2)
                ? rockTop
                : rockTop + (rng() * 0.6 + 0.15) * (this._horizon - rockTop);
            g.lineTo(px - (rng() * rockW * 0.12), peak + (rng() - 0.5) * 6);
        }
        g.lineTo(rockX + rockW, this._horizon + 8);
        g.closePath();
        g.fill();

        // Tower: tapered trunk with stripe livery
        const liveries = [
            ['#e8e4da', '#b03030'], // white / red
            ['#e8e4da', '#1a1a22'], // white / black
            ['#8a4a32', '#6a3424'], // brick
            ['#d8d2c0', '#9a917c'], // bone
        ];
        const [c1, c2] = liveries[Math.floor(rng() * liveries.length)];
        const baseW = 16 + rng() * 8;
        const topW = baseW * 0.55;
        const baseY = rockTop + 4;
        const topY = this._lampY + 8;
        const stripes = 3 + Math.floor(rng() * 3);
        for (let s = 0; s < stripes; s++) {
            const t0 = s / stripes;
            const t1 = (s + 1) / stripes;
            const y0 = baseY + (topY - baseY) * t0;
            const y1 = baseY + (topY - baseY) * t1;
            const w0 = (baseW + (topW - baseW) * t0) / 2;
            const w1 = (baseW + (topW - baseW) * t1) / 2;
            g.fillStyle = s % 2 === 0 ? c1 : c2;
            g.globalAlpha = 0.55; // silhouette-dim against the night
            g.beginPath();
            g.moveTo(rockX - w0, y0);
            g.lineTo(rockX + w0, y0);
            g.lineTo(rockX + w1, y1);
            g.lineTo(rockX - w1, y1);
            g.closePath();
            g.fill();
        }
        g.globalAlpha = 1;

        // Gallery rail + lamp room + dome
        g.fillStyle = 'rgba(14, 14, 20, 0.95)';
        g.fillRect(rockX - topW * 0.9, topY - 3, topW * 1.8, 3);
        g.fillRect(rockX - topW * 0.55, topY - 14, topW * 1.1, 11);
        g.beginPath();
        g.arc(rockX, topY - 14, topW * 0.55, Math.PI, 0);
        g.fill();

        this._sprite = c;
        this._lampY = topY - 9;
    }

    /** A long gradient wedge; rotated per frame for the volumetric beam. */
    _prerenderBeam(system, rng) {
        const len = Math.max(system.width, system.height) * 0.9;
        const wide = len * Math.tan(this._beamHalfWidth) * 2;
        const c = document.createElement('canvas');
        c.width = Math.ceil(len);
        c.height = Math.ceil(Math.max(8, wide));
        const g = c.getContext('2d');
        const grad = g.createLinearGradient(0, 0, len, 0);
        grad.addColorStop(0, `hsla(${this._beamHue}, 80%, 78%, 0.34)`);
        grad.addColorStop(0.25, `hsla(${this._beamHue}, 75%, 68%, 0.16)`);
        grad.addColorStop(1, `hsla(${this._beamHue}, 70%, 60%, 0)`);
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(0, c.height / 2);
        g.lineTo(len, 0);
        g.lineTo(len, c.height);
        g.closePath();
        g.fill();
        this._beamSprite = c;
    }

    _prerenderFlare() {
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        const g = c.getContext('2d');
        const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, `hsla(${this._beamHue}, 90%, 88%, 0.9)`);
        grad.addColorStop(0.3, `hsla(${this._beamHue}, 85%, 70%, 0.35)`);
        grad.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 64);
        this._flareSprite = c;
    }

    update(system) {
        this.tick++;
        const w = system.width;
        const h = system.height;
        this._beamAngle += this._beamSpeed * (0.6 + system.speedMultiplier * 0.4);

        // Foghorn on new shockwaves (clicks); ships rock
        if (system.shockwaves.length > this._lastShockCount && this._hornRings.length < 4) {
            this._hornRings.push({ r: 6, alpha: 0.5 });
            for (const s of this._ships) s.rock = 1;
        }
        this._lastShockCount = system.shockwaves.length;

        for (let i = this._hornRings.length - 1; i >= 0; i--) {
            const ring = this._hornRings[i];
            ring.r += 2.2;
            ring.alpha *= 0.985;
            if (ring.alpha < 0.02) {
                this._hornRings[i] = this._hornRings[this._hornRings.length - 1];
                this._hornRings.pop();
            }
        }

        for (const m of this._motes) {
            m.x += m.drift * (this._side === 0 ? 1 : -1);
            m.y += Math.sin(this.tick * 0.01 + m.bob) * 0.12;
            if (m.x > w + 10) m.x = -10;
            else if (m.x < -10) m.x = w + 10;
        }

        for (const d of this._drops) {
            d.y += d.speed;
            d.x -= d.speed * 0.18;
            if (d.y > h) { d.y = -d.len; d.x = Math.random() * (w + 60); }
        }

        for (const s of this._ships) {
            s.x += s.speed * (0.7 + system.speedMultiplier * 0.3);
            s.rock *= 0.97;
            if (s.x > w + 60) s.x = -60;
            else if (s.x < -60) s.x = w + 60;
        }

        // The lamp (and ships) are worth a visit from the familiar
        pointsOfInterest.publish(this._lampX, this._lampY, 'beacon', 1.4);
        for (const s of this._ships) {
            pointsOfInterest.publish(s.x, this._horizon - 3, 'ship', 0.7);
        }
    }

    /** Signed smallest angle difference. */
    _angDiff(a, b) {
        let d = (a - b) % TAU;
        if (d > Math.PI) d -= TAU;
        if (d < -Math.PI) d += TAU;
        return d;
    }

    draw(system) {
        const ctx = system.ctx;
        const w = system.width;
        const h = system.height;
        const q = system.qualityScale || 1;

        // Moon + glint column
        if (this._hasMoon) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = 'rgba(225, 230, 240, 0.7)';
            ctx.beginPath();
            ctx.arc(this._moonX, this._moonY, 14, 0, TAU);
            ctx.fill();
            if (this._moonPhase < 0.85) {
                // Bite a crescent out with the sky-ish dark
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = 'rgba(6, 8, 14, 0.9)';
                ctx.beginPath();
                ctx.arc(this._moonX + 10 * (1 - this._moonPhase) + 3, this._moonY - 2, 13, 0, TAU);
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = 'rgba(220, 228, 240, 0.05)';
            ctx.fillRect(this._moonX - 10, this._horizon, 20, h - this._horizon);
            ctx.restore();
        }

        // Sea: dark body + shimmer bands
        ctx.fillStyle = `hsla(${(system.hue + 190) % 360}, 45%, 8%, 0.55)`;
        ctx.fillRect(0, this._horizon, w, h - this._horizon);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 1;
        for (const b of this._seaBands) {
            const y = this._horizon + b.t * (h - this._horizon);
            const shimmer = Math.sin(this.tick * b.speed + b.phase);
            ctx.strokeStyle = `hsla(${(system.hue + 190) % 360}, 55%, ${30 + b.t * 14}%, ${0.05 + 0.05 * Math.abs(shimmer)})`;
            ctx.beginPath();
            ctx.moveTo(0, y + shimmer * b.amp);
            const segs = 8;
            for (let i = 1; i <= segs; i++) {
                ctx.lineTo((i / segs) * w, y + Math.sin(this.tick * b.speed + b.phase + i * 1.7) * b.amp);
            }
            ctx.stroke();
        }
        ctx.restore();

        // Ships on the horizon
        for (const s of this._ships) {
            const bobY = Math.sin(this.tick * 0.02 + s.bob) * 1.5 + Math.sin(this.tick * 0.11) * s.rock * 3;
            const y = this._horizon - 2 + bobY;
            ctx.save();
            ctx.translate(s.x, y);
            ctx.rotate(Math.sin(this.tick * 0.09 + s.bob) * s.rock * 0.12);
            ctx.fillStyle = 'rgba(10, 12, 18, 0.9)';
            ctx.beginPath();
            ctx.moveTo(-s.size, 0);
            ctx.lineTo(s.size, 0);
            ctx.lineTo(s.size * 0.6, 4);
            ctx.lineTo(-s.size * 0.6, 4);
            ctx.closePath();
            ctx.fill();
            ctx.fillRect(-1, -s.size * 0.7, 2, s.size * 0.7);
            if ((this.tick + s.blinkPhase) % 120 < 12) {
                ctx.fillStyle = 'rgba(255, 120, 120, 0.9)';
                ctx.fillRect(-1.5, -s.size * 0.7 - 3, 3, 3);
            }
            ctx.restore();
        }

        // Beams (rotated gradient wedges) + lamp flare
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let b = 0; b < this._beamCount; b++) {
            const ang = this._beamAngle + b * Math.PI;
            ctx.save();
            ctx.translate(this._lampX, this._lampY);
            ctx.rotate(ang);
            ctx.drawImage(this._beamSprite, 0, -this._beamSprite.height / 2);
            ctx.restore();
        }
        const pulse = 0.85 + Math.sin(this.tick * 0.2) * 0.15;
        ctx.globalAlpha = pulse;
        ctx.drawImage(this._flareSprite, this._lampX - 16, this._lampY - 16, 32, 32);
        ctx.globalAlpha = 1;

        // Foghorn rings
        for (const ring of this._hornRings) {
            ctx.strokeStyle = `hsla(${this._beamHue}, 60%, 70%, ${ring.alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(this._lampX, this._lampY, ring.r, 0, TAU);
            ctx.stroke();
        }

        // Fog motes: lit when inside a beam, gently lit near the cursor
        const skip = q < 0.5 ? 2 : 1;
        for (let i = 0; i < this._motes.length; i += skip) {
            const m = this._motes[i];
            const dx = m.x - this._lampX;
            const dy = m.y - this._lampY;
            const angTo = Math.atan2(dy, dx);
            let lit = 0;
            for (let b = 0; b < this._beamCount; b++) {
                const diff = Math.abs(this._angDiff(angTo, this._beamAngle + b * Math.PI));
                if (diff < this._beamHalfWidth * 1.6) {
                    lit = Math.max(lit, 1 - diff / (this._beamHalfWidth * 1.6));
                }
            }
            const cdx = m.x - mouse.x;
            const cdy = m.y - mouse.y;
            const cd = cdx * cdx + cdy * cdy;
            if (cd < 16900) lit = Math.max(lit, (1 - cd / 16900) * 0.7);
            const alpha = 0.04 + lit * 0.5;
            ctx.fillStyle = lit > 0.05
                ? `hsla(${this._beamHue}, 70%, ${70 + lit * 20}%, ${alpha})`
                : `rgba(180, 190, 210, ${alpha})`;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.size * (1 + lit * 0.8), 0, TAU);
            ctx.fill();
        }

        // Cursor: a wandering second light
        ctx.fillStyle = `hsla(${this._beamHue}, 60%, 75%, 0.05)`;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 90, 0, TAU);
        ctx.fill();
        ctx.restore();

        // Drizzle (over the light)
        if (this._drops.length > 0) {
            ctx.strokeStyle = 'rgba(190, 200, 220, 0.22)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (const d of this._drops) {
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x - d.len * 0.18, d.y + d.len);
            }
            ctx.stroke();
        }

        // Rock + tower silhouette on top of the sea
        ctx.drawImage(this._sprite, 0, 0);
    }
}
