/**
 * @file clockwork_orrery_effects.js
 * @description Interactive effect: a brass clockwork orrery. Planets ride
 * etched concentric rails on rigid arms around a machined hub — but the
 * motion is mechanical, not celestial: an escapement advances the arms in
 * discrete tick-tock steps with a little overshoot wobble, like a museum
 * piece on the hour.
 *
 * Seed-driven variation:
 *  - 3-6 arms with harmonic gear ratios (inner arms faster), 0-2 moons per
 *    planet, optional retrograde arm
 *  - materials: brass, silver, verdigris, or palette-neon, mixed per seed
 *  - rail styles (solid / dashed / double-etched), escapement period
 *    (snappy to stately), hub ornamentation
 *
 * Interaction: the cursor is a magnet — planets near it are dragged off
 * their rails and spring back with a wobble when released. Clicking winds
 * the mechanism: the escapement freewheels for a couple of seconds while
 * the hub flashes.
 */

import { pointsOfInterest } from './points_of_interest.js';

const TAU = Math.PI * 2;

export class ClockworkOrrery {
    constructor() {
        this._arms = [];
        this._tick = 0;
        this._cx = 0;
        this._cy = 0;
        this._tickPeriod = 30;
        this._stepEase = 0.2;
        this._windDown = 0;
        this._hubR = 10;
        this._railStyle = 0;
        this._hubHue = 45;
        this._wasClicking = false;
        this._lcg = 1;
    }

    _rand() {
        this._lcg = (Math.imul(this._lcg, 1664525) + 1013904223) >>> 0;
        return this._lcg / 4294967296;
    }

    configure(rng, palette) {
        this._tick = 0;
        this._windDown = 0;
        this._wasClicking = false;
        this._lcg = ((rng() * 4294967296) >>> 0) || 1;

        const w = window.innerWidth;
        const h = window.innerHeight;
        this._cx = w * (0.35 + rng() * 0.3);
        this._cy = h * (0.35 + rng() * 0.3);
        const maxR = Math.min(w, h) * (0.3 + rng() * 0.14);

        this._tickPeriod = 20 + Math.floor(rng() * 26);
        this._stepEase = 0.12 + rng() * 0.14;
        this._railStyle = Math.floor(rng() * 3); // solid / dashed / double
        this._hubR = 8 + rng() * 7;

        // Materials: brass / silver / verdigris / palette neon
        const neonHue = palette && palette.length > 0 ? palette[0].h : rng() * 360;
        const materials = [
            { h: 42, s: 65, l: 55 },                     // brass
            { h: 210, s: 12, l: 72 },                    // silver
            { h: 160, s: 38, l: 48 },                    // verdigris
            { h: neonHue, s: 90, l: 62 },                // living light
        ];
        this._hubHue = materials[Math.floor(rng() * 2)].h; // hub stays metallic

        const armCount = 3 + Math.floor(rng() * 4);
        const retrogradeIdx = rng() < 0.4 ? Math.floor(rng() * armCount) : -1;
        this._arms = [];
        for (let i = 0; i < armCount; i++) {
            const t = (i + 1) / armCount;
            const mat = materials[Math.floor(rng() * materials.length)];
            const moons = [];
            const moonCount = rng() < 0.45 ? 1 + (rng() < 0.3 ? 1 : 0) : 0;
            for (let m = 0; m < moonCount; m++) {
                moons.push({
                    r: 9 + rng() * 8 + m * 6,
                    angle: rng() * TAU,
                    speed: 0.06 + rng() * 0.08,
                    size: 1.2 + rng() * 1.4,
                });
            }
            this._arms.push({
                railR: this._hubR + 14 + t * (maxR - this._hubR - 14),
                angle: rng() * TAU,
                shownAngle: 0,
                // Inner arms tick farther per step; one may run retrograde
                stepSize: (TAU / 60) * (1.6 - t) * (i === retrogradeIdx ? -1 : 1) * (0.7 + rng() * 0.6),
                phase: Math.floor(rng() * this._tickPeriod),
                planetR: 3.5 + (1 - t) * 2 + rng() * 3,
                mat,
                isNeon: mat.h === neonHue,
                moons,
                dragX: 0,
                dragY: 0,
            });
            this._arms[i].shownAngle = this._arms[i].angle;
        }
    }

    update(mx, my, isClicking) {
        this._tick++;

        // Wind the mechanism on click
        if (isClicking && !this._wasClicking) this._windDown = 110;
        this._wasClicking = isClicking;
        if (this._windDown > 0) this._windDown--;

        for (const arm of this._arms) {
            // Escapement: the target angle advances in discrete steps...
            if ((this._tick + arm.phase) % this._tickPeriod === 0) {
                arm.angle += arm.stepSize;
            }
            // ...and while wound, it freewheels
            if (this._windDown > 0) {
                arm.angle += arm.stepSize * 0.18;
            }
            // The shown arm chases the target with springy ease (tick-tock wobble)
            let d = (arm.angle - arm.shownAngle) % TAU;
            if (d > Math.PI) d -= TAU;
            if (d < -Math.PI) d += TAU;
            arm.shownAngle += d * this._stepEase;

            // Magnetic cursor: drag the planet off its rail, spring back after
            const px = this._cx + Math.cos(arm.shownAngle) * arm.railR + arm.dragX;
            const py = this._cy + Math.sin(arm.shownAngle) * arm.railR + arm.dragY;
            const dx = mx - px;
            const dy = my - py;
            const distSq = dx * dx + dy * dy;
            if (distSq < 4900 && distSq > 1) { // 70px magnet radius
                const dist = Math.sqrt(distSq);
                const pull = (1 - dist / 70) * 6;
                arm.dragX += (dx / dist) * pull;
                arm.dragY += (dy / dist) * pull;
            }
            arm.dragX *= 0.82; // spring back
            arm.dragY *= 0.82;
            const dragMag = arm.dragX * arm.dragX + arm.dragY * arm.dragY;
            if (dragMag > 3600) { // clamp so planets never tear off entirely
                const s = 60 / Math.sqrt(dragMag);
                arm.dragX *= s;
                arm.dragY *= s;
            }

            for (const moon of arm.moons) {
                moon.angle += moon.speed * (this._windDown > 0 ? 2.2 : 1);
            }

            // Planets are worth a visit from the cursor familiar
            pointsOfInterest.publish(px, py, 'planet', 0.8 + arm.planetR * 0.05);
        }
    }

    draw(ctx, system) {
        if (this._arms.length === 0) return;
        const cx = this._cx;
        const cy = this._cy;
        ctx.save();

        // Etched rails
        ctx.globalAlpha = 0.85;
        for (const arm of this._arms) {
            ctx.strokeStyle = `hsla(${arm.mat.h}, ${arm.mat.s}%, ${arm.mat.l}%, 0.22)`;
            ctx.lineWidth = 1;
            if (this._railStyle === 1) ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.arc(cx, cy, arm.railR, 0, TAU);
            ctx.stroke();
            if (this._railStyle === 2) {
                ctx.beginPath();
                ctx.arc(cx, cy, arm.railR - 2.5, 0, TAU);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }

        // Arms, counterweights, planets, moons
        for (const arm of this._arms) {
            const px = cx + Math.cos(arm.shownAngle) * arm.railR + arm.dragX;
            const py = cy + Math.sin(arm.shownAngle) * arm.railR + arm.dragY;
            const m = arm.mat;

            ctx.strokeStyle = `hsla(${m.h}, ${m.s}%, ${m.l - 12}%, 0.6)`;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(px, py);
            ctx.stroke();
            // Counterweight nub opposite the planet
            ctx.fillStyle = `hsla(${m.h}, ${m.s}%, ${m.l - 18}%, 0.7)`;
            ctx.beginPath();
            ctx.arc(cx - Math.cos(arm.shownAngle) * this._hubR * 1.6,
                cy - Math.sin(arm.shownAngle) * this._hubR * 1.6, 2.2, 0, TAU);
            ctx.fill();

            if (arm.isNeon) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = `hsla(${m.h}, 95%, 65%, 0.25)`;
                ctx.beginPath();
                ctx.arc(px, py, arm.planetR * 2.6, 0, TAU);
                ctx.fill();
                ctx.restore();
            }
            ctx.fillStyle = `hsla(${m.h}, ${m.s}%, ${m.l}%, 0.95)`;
            ctx.beginPath();
            ctx.arc(px, py, arm.planetR, 0, TAU);
            ctx.fill();
            // Machined highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(px - arm.planetR * 0.3, py - arm.planetR * 0.3, arm.planetR * 0.28, 0, TAU);
            ctx.fill();

            for (const moon of arm.moons) {
                const mxp = px + Math.cos(moon.angle) * moon.r;
                const myp = py + Math.sin(moon.angle) * moon.r;
                ctx.fillStyle = `hsla(${m.h}, ${Math.max(0, m.s - 20)}%, ${m.l + 14}%, 0.85)`;
                ctx.beginPath();
                ctx.arc(mxp, myp, moon.size, 0, TAU);
                ctx.fill();
            }
        }

        // Hub: stacked discs + screw cross + wind-up flash
        const flash = this._windDown > 0 ? 0.5 + 0.5 * Math.sin(this._tick * 0.5) : 0;
        ctx.fillStyle = `hsla(${this._hubHue}, 50%, ${30 + flash * 30}%, 0.95)`;
        ctx.beginPath();
        ctx.arc(cx, cy, this._hubR, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = `hsla(${this._hubHue}, 60%, ${62 + flash * 25}%, 0.9)`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(cx, cy, this._hubR, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, this._hubR * 0.45, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - this._hubR * 0.3, cy);
        ctx.lineTo(cx + this._hubR * 0.3, cy);
        ctx.moveTo(cx, cy - this._hubR * 0.3);
        ctx.lineTo(cx, cy + this._hubR * 0.3);
        ctx.stroke();
        if (flash > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `hsla(${this._hubHue}, 90%, 70%, ${flash * 0.5})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, this._hubR + 6 + (110 - this._windDown) * 0.8, 0, TAU);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    }
}
