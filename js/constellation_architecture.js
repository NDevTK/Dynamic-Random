/**
 * @file constellation_architecture.js
 * @description Interactive star map where mouse proximity reveals hidden constellations.
 * Stars pulse and connect into mythology-inspired patterns. Seed determines star
 * placement, constellation shapes, color temperature, and nebula backdrop.
 * Mouse draws temporary light bridges between nearby stars.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class ConstellationArchitecture extends Architecture {
    constructor() {
        super();
        this.stars = [];
        this.constellations = [];
        this.revealRadius = 250;
        this.mouseTrail = [];
        this.trailPool = [];
        this.shootingStars = [];
        this.nebulaPatches = [];
        this.colorTemp = 0; // 0=warm, 1=cool, 2=mixed
        this.twinkleBase = 0;
        this.revealedLinks = [];
    }

    init(system) {
        const rng = system.rng;
        this.colorTemp = Math.floor(rng() * 4);
        this.twinkleBase = rng() * Math.PI * 2;

        // Generate star field with brightness classes
        this.stars = [];
        const starCount = 300 + Math.floor(rng() * 200);
        for (let i = 0; i < starCount; i++) {
            const brightness = rng();
            const sizeClass = brightness > 0.95 ? 'giant' : brightness > 0.7 ? 'bright' : 'dim';
            this.stars.push({
                x: rng() * system.width,
                y: rng() * system.height,
                size: sizeClass === 'giant' ? 2.5 + rng() * 2 : sizeClass === 'bright' ? 1.2 + rng() * 1.5 : 0.4 + rng() * 0.8,
                brightness: sizeClass === 'giant' ? 0.9 : sizeClass === 'bright' ? 0.5 + rng() * 0.3 : 0.1 + rng() * 0.2,
                twinklePhase: rng() * Math.PI * 2,
                twinkleSpeed: 0.01 + rng() * 0.04,
                colorShift: rng() * 60 - 30,
                sizeClass,
                revealed: 0
            });
        }

        // Generate constellation patterns (groups of connected stars)
        this.constellations = [];
        const constellationCount = 4 + Math.floor(rng() * 5);
        const usedStars = new Set();

        for (let c = 0; c < constellationCount; c++) {
            // Pick a seed star (prefer bright ones)
            let seedStar = -1;
            for (let attempt = 0; attempt < 50; attempt++) {
                const idx = Math.floor(rng() * this.stars.length);
                if (!usedStars.has(idx) && this.stars[idx].sizeClass !== 'dim') {
                    seedStar = idx;
                    break;
                }
            }
            if (seedStar === -1) continue;

            // Build constellation by finding nearby stars
            const members = [seedStar];
            usedStars.add(seedStar);
            const connections = [];
            const maxMembers = 3 + Math.floor(rng() * 6);

            for (let m = 0; m < maxMembers; m++) {
                const lastStar = this.stars[members[members.length - 1]];
                let bestIdx = -1;
                let bestDist = Infinity;

                for (let s = 0; s < this.stars.length; s++) {
                    if (usedStars.has(s)) continue;
                    const dx = this.stars[s].x - lastStar.x;
                    const dy = this.stars[s].y - lastStar.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 250 && dist > 40 && dist < bestDist) {
                        bestDist = dist;
                        bestIdx = s;
                    }
                }

                if (bestIdx !== -1) {
                    connections.push([members[members.length - 1], bestIdx]);
                    // Sometimes branch from earlier star
                    if (rng() > 0.6 && members.length > 2) {
                        const branchFrom = Math.floor(rng() * (members.length - 1));
                        connections.push([members[branchFrom], bestIdx]);
                    }
                    members.push(bestIdx);
                    usedStars.add(bestIdx);
                }
            }

            if (connections.length > 0) {
                this.constellations.push({
                    members,
                    connections,
                    hue: rng() * 360,
                    revealed: 0,
                    name: this._generateName(rng)
                });
            }
        }

        // Nebula backdrop patches
        this.nebulaPatches = [];
        const patchCount = 2 + Math.floor(rng() * 3);
        for (let i = 0; i < patchCount; i++) {
            this.nebulaPatches.push({
                x: rng() * system.width,
                y: rng() * system.height,
                rx: 100 + rng() * 300,
                ry: 80 + rng() * 200,
                rotation: rng() * Math.PI,
                hue: rng() * 360,
                alpha: 0.02 + rng() * 0.04,
                drift: (rng() - 0.5) * 0.1
            });
        }

        this.mouseTrail = [];
        this.trailPool = [];
        this.shootingStars = [];
    }

    _generateName(rng) {
        const prefixes = ['Ur', 'Al', 'Ve', 'Ca', 'Py', 'Cy', 'Ly', 'Or', 'An', 'Se', 'Dr', 'Hy'];
        const middles = ['sa', 'ra', 'go', 'pe', 'dra', 'ri', 'phi', 'ta', 'no', 'mi'];
        const suffixes = ['us', 'is', 'on', 'ae', 'um', 'ix', 'or', 'ia'];
        return prefixes[Math.floor(rng() * prefixes.length)] +
               middles[Math.floor(rng() * middles.length)] +
               suffixes[Math.floor(rng() * suffixes.length)];
    }

    _getStarColor(star) {
        let baseHue;
        switch (this.colorTemp) {
            case 0: baseHue = 30 + star.colorShift * 0.5; break;  // warm gold
            case 1: baseHue = 210 + star.colorShift * 0.5; break; // cool blue
            case 2: baseHue = 0 + star.colorShift; break;         // mixed
            case 3: baseHue = 60 + star.colorShift * 0.3; break;  // white-yellow
            default: baseHue = 0;
        }
        const sat = this.colorTemp === 3 ? 10 : 40 + star.brightness * 30;
        const lit = 70 + star.brightness * 25;
        return { h: baseHue, s: sat, l: lit };
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;
        const revealRadiusSq = this.revealRadius * this.revealRadius;

        // Update star reveal state based on mouse proximity
        for (let i = 0; i < this.stars.length; i++) {
            const s = this.stars[i];
            const dx = s.x - mx;
            const dy = s.y - my;
            const distSq = dx * dx + dy * dy;
            if (distSq < revealRadiusSq) {
                s.revealed = Math.min(1, s.revealed + 0.05);
            } else {
                s.revealed = Math.max(0, s.revealed - 0.01);
            }
        }

        // Update constellation reveal
        for (const c of this.constellations) {
            let anyRevealed = false;
            for (const idx of c.members) {
                if (this.stars[idx].revealed > 0.3) {
                    anyRevealed = true;
                    break;
                }
            }
            if (anyRevealed) {
                c.revealed = Math.min(1, c.revealed + 0.02);
            } else {
                c.revealed = Math.max(0, c.revealed - 0.005);
            }
        }

        // Mouse trail (stardust)
        if (system.speedMultiplier > 1.5) {
            for (let i = 0; i < 2; i++) {
                let t = this.trailPool.length > 0 ? this.trailPool.pop() : {};
                t.x = mx + (system.rng() - 0.5) * 20;
                t.y = my + (system.rng() - 0.5) * 20;
                t.life = 1.0;
                t.decay = 0.02 + system.rng() * 0.02;
                t.size = 1 + system.rng() * 2;
                this.mouseTrail.push(t);
            }
        }

        for (let i = this.mouseTrail.length - 1; i >= 0; i--) {
            const t = this.mouseTrail[i];
            t.life -= t.decay;
            if (t.life <= 0) {
                this.trailPool.push(t);
                this.mouseTrail[i] = this.mouseTrail[this.mouseTrail.length - 1];
                this.mouseTrail.pop();
            }
        }

        // Shooting stars
        if (system.rng() < 0.008) {
            const angle = system.rng() * Math.PI * 0.5 + Math.PI * 0.25;
            this.shootingStars.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height * 0.5,
                vx: Math.cos(angle) * (15 + system.rng() * 15),
                vy: Math.sin(angle) * (15 + system.rng() * 15),
                life: 30 + system.rng() * 20,
                maxLife: 50,
                tail: []
            });
        }

        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const ss = this.shootingStars[i];
            ss.tail.push({ x: ss.x, y: ss.y });
            if (ss.tail.length > 15) ss.tail.shift();
            ss.x += ss.vx;
            ss.y += ss.vy;
            ss.life--;
            if (ss.life <= 0) {
                this.shootingStars.splice(i, 1);
            }
        }

        // Drift nebula patches
        for (const p of this.nebulaPatches) {
            p.rotation += p.drift * 0.001;
        }

        // Gravity well scatters nearby constellations visually
        if (system.isGravityWell) {
            for (const s of this.stars) {
                const dx = s.x - mx;
                const dy = s.y - my;
                const distSq = dx * dx + dy * dy;
                if (distSq < 90000) {
                    s.revealed = 1;
                }
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;

        // Draw nebula backdrop
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const patch of this.nebulaPatches) {
            ctx.save();
            ctx.translate(patch.x, patch.y);
            ctx.rotate(patch.rotation);
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, patch.rx);
            grad.addColorStop(0, `hsla(${patch.hue}, 60%, 30%, ${patch.alpha})`);
            grad.addColorStop(0.5, `hsla(${(patch.hue + 30) % 360}, 50%, 20%, ${patch.alpha * 0.5})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.scale(1, patch.ry / patch.rx);
            ctx.beginPath();
            ctx.arc(0, 0, patch.rx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();

        // Draw stars
        ctx.save();
        for (const star of this.stars) {
            const twinkle = Math.sin(tick * star.twinkleSpeed + star.twinklePhase + this.twinkleBase) * 0.3 + 0.7;
            const revealBoost = star.revealed * 0.5;
            const alpha = Math.min(1, (star.brightness + revealBoost) * twinkle);
            const color = this._getStarColor(star);

            if (alpha < 0.02) continue;

            // Glow for bright/giant stars
            if (star.sizeClass !== 'dim' && alpha > 0.3) {
                ctx.globalCompositeOperation = 'lighter';
                const glowSize = star.size * (3 + star.revealed * 3);
                ctx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${alpha * 0.15})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, glowSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
            }

            // Star core
            ctx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size * (1 + star.revealed * 0.5), 0, Math.PI * 2);
            ctx.fill();

            // Cross-spike for giant stars
            if (star.sizeClass === 'giant') {
                const spikeLen = star.size * 4 * twinkle;
                ctx.strokeStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${alpha * 0.4})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(star.x - spikeLen, star.y);
                ctx.lineTo(star.x + spikeLen, star.y);
                ctx.moveTo(star.x, star.y - spikeLen);
                ctx.lineTo(star.x, star.y + spikeLen);
                ctx.stroke();
            }
        }
        ctx.restore();

        // Draw constellation lines
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const constellation of this.constellations) {
            if (constellation.revealed < 0.01) continue;

            const alpha = constellation.revealed * 0.4;
            ctx.strokeStyle = `hsla(${constellation.hue}, 50%, 70%, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 6]);

            for (const [a, b] of constellation.connections) {
                const sa = this.stars[a];
                const sb = this.stars[b];
                ctx.beginPath();
                ctx.moveTo(sa.x, sa.y);
                ctx.lineTo(sb.x, sb.y);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();

        // Draw mouse reveal radius (subtle)
        const mx = mouse.x;
        const my = mouse.y;
        ctx.save();
        const revealGrad = ctx.createRadialGradient(mx, my, 0, mx, my, this.revealRadius);
        revealGrad.addColorStop(0, 'rgba(255, 255, 255, 0.015)');
        revealGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.005)');
        revealGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = revealGrad;
        ctx.beginPath();
        ctx.arc(mx, my, this.revealRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Mouse stardust trail
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const t of this.mouseTrail) {
            ctx.fillStyle = `rgba(200, 220, 255, ${t.life * 0.5})`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.size * t.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();

        // Shooting stars
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const ss of this.shootingStars) {
            const alpha = ss.life / ss.maxLife;
            if (ss.tail.length > 1) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(ss.tail[0].x, ss.tail[0].y);
                for (let t = 1; t < ss.tail.length; t++) {
                    ctx.lineTo(ss.tail[t].x, ss.tail[t].y);
                }
                ctx.lineTo(ss.x, ss.y);
                ctx.stroke();
            }
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }
}
