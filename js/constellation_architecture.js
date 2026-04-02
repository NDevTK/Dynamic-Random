/**
 * @file constellation_architecture.js
 * @description Interactive star map where mouse proximity reveals hidden constellations.
 * Stars pulse and connect into mythology-inspired patterns. Seed determines star
 * placement, constellation shapes, color temperature, and nebula backdrop.
 * Mouse draws temporary light bridges between nearby stars.
 */

import { Architecture } from './background_architectures.js';
import { mouse, isLeftMouseDown } from './state.js';
import { vogelSpiral, fibonacciSpiral } from './math_patterns.js';

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
        this.novaBursts = []; // click-triggered stellar flares
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

        // Seed-driven clustering pass: add Vogel spiral clusters on top of the random field
        if (rng() > 0.5) {
            const clusterCount = 3 + Math.floor(rng() * 3); // 3-5 clusters
            for (let c = 0; c < clusterCount; c++) {
                const cx = rng() * system.width;
                const cy = rng() * system.height;
                const pointCount = 20 + Math.floor(rng() * 21); // 20-40 points
                const spread = 30 + rng() * 70;
                const points = vogelSpiral(pointCount, spread);
                for (const [px, py] of points) {
                    const brightness = rng() * 0.5; // cluster stars lean dim-to-bright
                    const sizeClass = brightness > 0.4 ? 'bright' : 'dim';
                    this.stars.push({
                        x: cx + px,
                        y: cy + py,
                        size: sizeClass === 'bright' ? 1.2 + rng() * 1.5 : 0.4 + rng() * 0.8,
                        brightness: sizeClass === 'bright' ? 0.5 + rng() * 0.3 : 0.1 + rng() * 0.2,
                        twinklePhase: rng() * Math.PI * 2,
                        twinkleSpeed: 0.01 + rng() * 0.04,
                        colorShift: rng() * 60 - 30,
                        sizeClass,
                        revealed: 0
                    });
                }
            }
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

        // Periodic supernova events (seed-driven timing)
        this.supernovaTimer = 300 + Math.floor(rng() * 600);
        this.supernovae = [];

        // Star parallax depth layers (seed-driven)
        this.hasParallax = rng() > 0.5;

        // Constellation name reveal
        this.showNames = rng() > 0.4;
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
                this.shootingStars[i] = this.shootingStars[this.shootingStars.length - 1];
                this.shootingStars.pop();
            }
        }

        // Cap shooting stars
        while (this.shootingStars.length > 10) this.shootingStars.shift();

        // Drift nebula patches
        for (const p of this.nebulaPatches) {
            p.rotation += p.drift * 0.001;
        }

        // Click creates nova burst — bright stellar flare at cursor
        if (isLeftMouseDown && system.tick % 15 === 0 && this.novaBursts.length < 5) {
            this.novaBursts.push({
                x: mx, y: my,
                radius: 5, maxRadius: 150 + system.rng() * 100,
                life: 40, maxLife: 40,
                hue: system.rng() * 360
            });
        }

        // Update nova bursts
        for (let i = this.novaBursts.length - 1; i >= 0; i--) {
            const n = this.novaBursts[i];
            n.life--;
            n.radius += (n.maxRadius - n.radius) * 0.1;
            if (n.life <= 0) {
                this.novaBursts[i] = this.novaBursts[this.novaBursts.length - 1];
                this.novaBursts.pop();
            }
        }

        // Periodic supernova events
        this.supernovaTimer--;
        if (this.supernovaTimer <= 0) {
            this.supernovaTimer = 400 + Math.floor(Math.random() * 800);
            // Pick a random giant star to go supernova
            const giants = this.stars.filter(s => s.sizeClass === 'giant');
            if (giants.length > 0 && this.supernovae.length < 3) {
                const star = giants[Math.floor(Math.random() * giants.length)];
                this.supernovae.push({
                    x: star.x, y: star.y,
                    radius: 0, maxRadius: 300 + Math.random() * 200,
                    life: 1, hue: star.colorShift + 30,
                    ringCount: 3 + Math.floor(Math.random() * 3),
                    debrisCount: 20 + Math.floor(Math.random() * 20),
                    debris: Array.from({length: 20 + Math.floor(Math.random() * 20)}, () => ({
                        angle: Math.random() * Math.PI * 2,
                        speed: 1 + Math.random() * 4,
                        dist: 0,
                        size: 0.5 + Math.random() * 1.5
                    }))
                });
            }
        }

        // Update supernovae
        for (let i = this.supernovae.length - 1; i >= 0; i--) {
            const sn = this.supernovae[i];
            sn.life -= 0.005;
            sn.radius += (sn.maxRadius - sn.radius) * 0.03;
            for (const d of sn.debris) d.dist += d.speed;
            if (sn.life <= 0) {
                this.supernovae.splice(i, 1);
            }
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
        const qualityScale = system.qualityScale || 1;

        // Draw nebula backdrop (simplified: concentric circles instead of per-frame gradient)
        if (qualityScale > 0.3) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (const patch of this.nebulaPatches) {
                ctx.save();
                ctx.translate(patch.x, patch.y);
                ctx.rotate(patch.rotation);
                ctx.scale(1, patch.ry / patch.rx);
                // Inner core
                ctx.fillStyle = `hsla(${patch.hue}, 60%, 30%, ${patch.alpha})`;
                ctx.beginPath();
                ctx.arc(0, 0, patch.rx * 0.4, 0, Math.PI * 2);
                ctx.fill();
                // Mid ring
                ctx.fillStyle = `hsla(${(patch.hue + 30) % 360}, 50%, 20%, ${patch.alpha * 0.4})`;
                ctx.beginPath();
                ctx.arc(0, 0, patch.rx * 0.7, 0, Math.PI * 2);
                ctx.fill();
                // Outer haze
                ctx.fillStyle = `hsla(${patch.hue}, 40%, 15%, ${patch.alpha * 0.15})`;
                ctx.beginPath();
                ctx.arc(0, 0, patch.rx, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.restore();
        }

        // Draw stars — skip dim unrevealed stars at low quality
        ctx.save();
        for (const star of this.stars) {
            if (qualityScale < 0.5 && star.sizeClass === 'dim' && star.revealed < 0.1) continue;
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

        // Draw constellation lines and names
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

            // Show constellation name when sufficiently revealed
            if (this.showNames && constellation.revealed > 0.5 && constellation.members.length > 0) {
                let cx = 0, cy = 0;
                for (const idx of constellation.members) {
                    cx += this.stars[idx].x;
                    cy += this.stars[idx].y;
                }
                cx /= constellation.members.length;
                cy /= constellation.members.length;

                ctx.font = '11px monospace';
                ctx.textAlign = 'center';
                ctx.fillStyle = `hsla(${constellation.hue}, 40%, 80%, ${(constellation.revealed - 0.5) * 0.6})`;
                ctx.fillText(constellation.name, cx, cy - 15);
            }
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();

        // Draw supernovae
        if (this.supernovae.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (const sn of this.supernovae) {
                const a = sn.life;
                // Bright core flash
                if (a > 0.7) {
                    ctx.fillStyle = `rgba(255, 255, 240, ${(a - 0.7) * 2})`;
                    ctx.beginPath();
                    ctx.arc(sn.x, sn.y, 20 * (1 - a + 0.3), 0, Math.PI * 2);
                    ctx.fill();
                }
                // Expanding rings
                for (let r = 0; r < sn.ringCount; r++) {
                    const ringR = sn.radius * (0.5 + r * 0.25);
                    ctx.strokeStyle = `hsla(${sn.hue + r * 30}, 60%, 70%, ${a * 0.3 / (r + 1)})`;
                    ctx.lineWidth = 2 - r * 0.4;
                    ctx.beginPath();
                    ctx.arc(sn.x, sn.y, ringR, 0, Math.PI * 2);
                    ctx.stroke();
                }
                // Debris particles
                for (const d of sn.debris) {
                    const dx = sn.x + Math.cos(d.angle) * d.dist;
                    const dy = sn.y + Math.sin(d.angle) * d.dist;
                    ctx.fillStyle = `hsla(${sn.hue + 60}, 50%, 80%, ${a * 0.4})`;
                    ctx.beginPath();
                    ctx.arc(dx, dy, d.size * a, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Outer glow
                ctx.fillStyle = `hsla(${sn.hue}, 60%, 50%, ${a * 0.06})`;
                ctx.beginPath();
                ctx.arc(sn.x, sn.y, sn.radius * 1.3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

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

        // Draw nova bursts (click-triggered stellar flares)
        if (this.novaBursts.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (const n of this.novaBursts) {
                const progress = 1 - n.life / n.maxLife;
                const alpha = (1 - progress) * 0.6;

                // Bright core
                ctx.fillStyle = `hsla(${n.hue}, 40%, 90%, ${alpha})`;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius * 0.2, 0, Math.PI * 2);
                ctx.fill();

                // Expanding ring
                ctx.strokeStyle = `hsla(${n.hue}, 70%, 70%, ${alpha * 0.5})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
                ctx.stroke();

                // Outer glow
                ctx.fillStyle = `hsla(${n.hue}, 60%, 50%, ${alpha * 0.1})`;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius * 1.5, 0, Math.PI * 2);
                ctx.fill();

                // Cross-spike flare
                const spikeLen = n.radius * 1.2 * (1 - progress);
                ctx.strokeStyle = `hsla(${n.hue}, 50%, 80%, ${alpha * 0.4})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(n.x - spikeLen, n.y);
                ctx.lineTo(n.x + spikeLen, n.y);
                ctx.moveTo(n.x, n.y - spikeLen);
                ctx.lineTo(n.x, n.y + spikeLen);
                ctx.stroke();
            }
            ctx.restore();
        }
    }
}
