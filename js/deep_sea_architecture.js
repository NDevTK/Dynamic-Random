/**
 * @file deep_sea_architecture.js
 * @description Bioluminescent deep sea architecture with jellyfish, anglerfish lures,
 * deep sea creatures, floating plankton, and light effects that respond to cursor
 * as a deep-sea submersible searchlight.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class DeepSeaArchitecture extends Architecture {
    constructor() {
        super();
        this.jellyfish = [];
        this.plankton = [];
        this.anglerLures = [];
        this.bubbles = [];
        this.bubblePool = [];
        this.depthParticles = [];
        this.seaSnow = [];
        this.lightBeams = [];
        this.caustics = [];
        this.waterCurrent = { x: 0, y: 0 };
        this.palette = [];
        this.creatureStyle = 0;
        this.depthZone = 0;
    }

    init(system) {
        const rng = system.rng;

        this.depthZone = Math.floor(rng() * 4); // 0=twilight, 1=midnight, 2=abyssal, 3=hadal
        this.creatureStyle = Math.floor(rng() * 3);
        this.waterCurrent = {
            x: (rng() - 0.5) * 0.3,
            y: 0.05 + rng() * 0.1,
            phase: rng() * Math.PI * 2
        };

        // Zone-specific palettes
        const zonePalettes = [
            // Twilight: blues and greens with hints of sunlight
            [{ h: 200, s: 60, l: 40 }, { h: 180, s: 70, l: 50 }, { h: 160, s: 80, l: 55 }, { h: 50, s: 40, l: 50 }],
            // Midnight: deep blues with bioluminescent accents
            [{ h: 220, s: 80, l: 30 }, { h: 200, s: 70, l: 50 }, { h: 170, s: 90, l: 55 }, { h: 280, s: 60, l: 50 }],
            // Abyssal: near-black with intense bioluminescence
            [{ h: 240, s: 50, l: 15 }, { h: 180, s: 100, l: 55 }, { h: 60, s: 100, l: 55 }, { h: 320, s: 80, l: 50 }],
            // Hadal: alien colors, extreme depth
            [{ h: 270, s: 40, l: 10 }, { h: 0, s: 90, l: 50 }, { h: 120, s: 100, l: 60 }, { h: 300, s: 90, l: 55 }]
        ];
        this.palette = zonePalettes[this.depthZone];

        // Generate jellyfish
        this.jellyfish = [];
        const jellyCount = 3 + Math.floor(rng() * 5);
        for (let i = 0; i < jellyCount; i++) {
            const tentacleCount = 4 + Math.floor(rng() * 8);
            const tentacles = [];
            for (let t = 0; t < tentacleCount; t++) {
                const segments = [];
                const segCount = 5 + Math.floor(rng() * 8);
                for (let s = 0; s < segCount; s++) {
                    segments.push({ x: 0, y: s * 8, vx: 0, vy: 0 });
                }
                tentacles.push({
                    segments,
                    baseAngle: (t / tentacleCount - 0.5) * 1.5,
                    waveFreq: 0.02 + rng() * 0.04,
                    waveAmp: 3 + rng() * 6,
                    wavePhase: rng() * Math.PI * 2,
                    width: 1 + rng() * 2
                });
            }

            const color = this.palette[1 + Math.floor(rng() * (this.palette.length - 1))];
            this.jellyfish.push({
                x: rng() * system.width,
                y: rng() * system.height,
                vx: (rng() - 0.5) * 0.3,
                vy: -0.2 - rng() * 0.3,
                size: 15 + rng() * 35,
                bellPhase: rng() * Math.PI * 2,
                bellSpeed: 0.02 + rng() * 0.03,
                color,
                glowAlpha: 0.1 + rng() * 0.2,
                tentacles,
                pulsePhase: rng() * Math.PI * 2
            });
        }

        // Generate marine snow (constant particle fall)
        this.seaSnow = [];
        for (let i = 0; i < 150; i++) {
            this.seaSnow.push({
                x: rng() * system.width,
                y: rng() * system.height,
                size: 0.5 + rng() * 1.5,
                speed: 0.1 + rng() * 0.3,
                alpha: 0.05 + rng() * 0.15,
                drift: (rng() - 0.5) * 0.3,
                driftPhase: rng() * Math.PI * 2,
                driftSpeed: 0.005 + rng() * 0.01
            });
        }

        // Angler fish lures (floating glowing orbs)
        this.anglerLures = [];
        const lureCount = 2 + Math.floor(rng() * 3);
        for (let i = 0; i < lureCount; i++) {
            this.anglerLures.push({
                x: rng() * system.width,
                y: rng() * system.height,
                vx: (rng() - 0.5) * 0.2,
                vy: (rng() - 0.5) * 0.15,
                size: 3 + rng() * 5,
                pulsePhase: rng() * Math.PI * 2,
                pulseSpeed: 0.03 + rng() * 0.05,
                color: this.palette[2 + Math.floor(rng() * 2)],
                ropeLength: 30 + rng() * 60,
                ropePhase: rng() * Math.PI * 2
            });
        }

        // Depth particles (large, slow drifters)
        this.depthParticles = [];
        for (let i = 0; i < 20; i++) {
            this.depthParticles.push({
                x: rng() * system.width,
                y: rng() * system.height,
                size: 5 + rng() * 20,
                alpha: 0.01 + rng() * 0.04,
                vx: (rng() - 0.5) * 0.1,
                vy: (rng() - 0.5) * 0.1,
                rotSpeed: (rng() - 0.5) * 0.005,
                rotation: rng() * Math.PI * 2
            });
        }

        this.bubbles = [];
        this.bubblePool = [];
    }

    update(system) {
        const tick = system.tick;
        const mx = mouse.x;
        const my = mouse.y;

        // Water current oscillation
        this.waterCurrent.phase += 0.003;
        const currentX = Math.sin(this.waterCurrent.phase) * 0.2 + this.waterCurrent.x;
        const currentY = this.waterCurrent.y;

        // Update jellyfish
        for (let i = 0; i < this.jellyfish.length; i++) {
            const j = this.jellyfish[i];
            j.bellPhase += j.bellSpeed * system.speedMultiplier;

            // Bell propulsion pulse
            const bellPulse = Math.sin(j.bellPhase);
            if (bellPulse > 0.95) {
                j.vy -= 0.3;
            }

            j.vx += currentX * 0.01;
            j.vy += currentY * 0.005;

            // Mouse searchlight interaction: jellyfish shy away
            const dx = j.x - mx;
            const dy = j.y - my;
            const distSq = dx * dx + dy * dy;
            if (distSq < 40000 && distSq > 1) {
                const dist = Math.sqrt(distSq);
                j.vx += (dx / dist) * 0.15;
                j.vy += (dy / dist) * 0.1;
            }

            j.x += j.vx * system.speedMultiplier;
            j.y += j.vy * system.speedMultiplier;
            j.vx *= 0.99;
            j.vy *= 0.99;

            // Wrap
            if (j.y < -j.size * 4) j.y = system.height + j.size * 2;
            if (j.y > system.height + j.size * 4) j.y = -j.size * 2;
            if (j.x < -j.size * 3) j.x = system.width + j.size * 2;
            if (j.x > system.width + j.size * 3) j.x = -j.size * 2;

            // Update tentacles with spring physics
            for (const tent of j.tentacles) {
                tent.segments[0].x = j.x + Math.sin(j.bellPhase + tent.baseAngle) * j.size * 0.3;
                tent.segments[0].y = j.y + j.size * 0.5;

                for (let s = 1; s < tent.segments.length; s++) {
                    const prev = tent.segments[s - 1];
                    const seg = tent.segments[s];
                    const wave = Math.sin(tick * tent.waveFreq + s * 0.5 + tent.wavePhase) * tent.waveAmp;

                    const targetX = prev.x + wave + currentX * s * 2;
                    const targetY = prev.y + 8;

                    seg.vx += (targetX - seg.x) * 0.08;
                    seg.vy += (targetY - seg.y) * 0.08;
                    seg.vx *= 0.9;
                    seg.vy *= 0.9;
                    seg.x += seg.vx;
                    seg.y += seg.vy;
                }
            }
        }

        // Update sea snow
        for (let i = 0; i < this.seaSnow.length; i++) {
            const s = this.seaSnow[i];
            s.y += s.speed * system.speedMultiplier;
            s.x += Math.sin(tick * s.driftSpeed + s.driftPhase) * s.drift + currentX * 0.5;

            if (s.y > system.height + 10) {
                s.y = -10;
                s.x = system.rng() * system.width;
            }
            if (s.x < -10) s.x += system.width + 20;
            if (s.x > system.width + 10) s.x -= system.width + 20;
        }

        // Update angler lures
        for (let i = 0; i < this.anglerLures.length; i++) {
            const a = this.anglerLures[i];
            a.x += a.vx + currentX * 0.3;
            a.y += a.vy + currentY * 0.2;

            // Bounce off edges
            if (a.x < 50 || a.x > system.width - 50) a.vx *= -1;
            if (a.y < 50 || a.y > system.height - 50) a.vy *= -1;
        }

        // Depth particles drift
        for (let i = 0; i < this.depthParticles.length; i++) {
            const d = this.depthParticles[i];
            d.x += d.vx + currentX;
            d.y += d.vy + currentY * 0.3;
            d.rotation += d.rotSpeed;
            if (d.x < -d.size) d.x += system.width + d.size * 2;
            if (d.x > system.width + d.size) d.x -= system.width + d.size * 2;
            if (d.y < -d.size) d.y += system.height + d.size * 2;
            if (d.y > system.height + d.size) d.y -= system.height + d.size * 2;
        }

        // Bubbles from interactions
        if (system.isGravityWell && tick % 3 === 0) {
            this._spawnBubble(system, mx + (system.rng() - 0.5) * 30, my);
        }
        system.shockwaves.forEach(sw => {
            if (sw.radius < 30) {
                for (let i = 0; i < 10; i++) {
                    this._spawnBubble(system, sw.x + (system.rng() - 0.5) * 40, sw.y + (system.rng() - 0.5) * 40);
                }
            }
        });

        // Update bubbles
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const b = this.bubbles[i];
            b.y -= b.speed;
            b.x += Math.sin(tick * 0.05 + b.wobblePhase) * 0.5;
            b.life -= b.decay;
            if (b.life <= 0 || b.y < -20) {
                this.bubblePool.push(b);
                this.bubbles[i] = this.bubbles[this.bubbles.length - 1];
                this.bubbles.pop();
            }
        }
    }

    _spawnBubble(system, x, y) {
        if (this.bubbles.length >= 60) return;
        const rng = system.rng;
        let b = this.bubblePool.length > 0 ? this.bubblePool.pop() : {};
        b.x = x; b.y = y;
        b.speed = 0.5 + rng() * 2;
        b.size = 2 + rng() * 6;
        b.life = 1.0;
        b.decay = 0.005 + rng() * 0.01;
        b.wobblePhase = rng() * Math.PI * 2;
        this.bubbles.push(b);
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const mx = mouse.x;
        const my = mouse.y;

        // Depth particles (large, translucent)
        for (let i = 0; i < this.depthParticles.length; i++) {
            const d = this.depthParticles[i];
            ctx.fillStyle = `rgba(100, 150, 200, ${d.alpha})`;
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rotation);
            ctx.beginPath();
            ctx.ellipse(0, 0, d.size, d.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Sea snow
        ctx.fillStyle = 'rgba(180, 200, 220, 1)';
        for (let i = 0; i < this.seaSnow.length; i++) {
            const s = this.seaSnow[i];
            ctx.globalAlpha = s.alpha;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Searchlight from cursor (like a submersible light)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const searchGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 200);
        searchGrad.addColorStop(0, 'rgba(200, 220, 255, 0.08)');
        searchGrad.addColorStop(0.3, 'rgba(150, 180, 220, 0.04)');
        searchGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = searchGrad;
        ctx.beginPath();
        ctx.arc(mx, my, 200, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Angler lures
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < this.anglerLures.length; i++) {
            const a = this.anglerLures[i];
            const pulse = Math.pow(Math.sin(tick * a.pulseSpeed + a.pulsePhase) * 0.5 + 0.5, 2);
            const { h, s, l } = a.color;

            // Rope/stalk
            const ropeWave = Math.sin(tick * 0.02 + a.ropePhase) * 10;
            ctx.strokeStyle = `hsla(${h}, ${s * 0.5}%, ${l * 0.5}%, 0.15)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y - a.ropeLength);
            ctx.quadraticCurveTo(a.x + ropeWave, a.y - a.ropeLength * 0.5, a.x, a.y);
            ctx.stroke();

            // Lure glow
            const glowSize = a.size * (3 + pulse * 4);
            const grad = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, glowSize);
            grad.addColorStop(0, `hsla(${h}, ${s}%, ${l + 20}%, ${0.4 * pulse})`);
            grad.addColorStop(0.3, `hsla(${h}, ${s}%, ${l}%, ${0.15 * pulse})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(a.x, a.y, glowSize, 0, Math.PI * 2);
            ctx.fill();

            // Lure core
            ctx.fillStyle = `hsla(${h}, ${s}%, ${l + 30}%, ${0.6 + pulse * 0.4})`;
            ctx.beginPath();
            ctx.arc(a.x, a.y, a.size * (0.5 + pulse * 0.5), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Jellyfish
        for (let i = 0; i < this.jellyfish.length; i++) {
            const j = this.jellyfish[i];
            const { h, s, l } = j.color;
            const bellContract = Math.sin(j.bellPhase) * 0.3;
            const pulse = Math.sin(tick * 0.03 + j.pulsePhase) * 0.3 + 0.7;

            // Draw tentacles first (behind bell)
            for (const tent of j.tentacles) {
                ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, ${j.glowAlpha * 0.6})`;
                ctx.lineWidth = tent.width;
                ctx.beginPath();
                ctx.moveTo(tent.segments[0].x, tent.segments[0].y);
                for (let si = 1; si < tent.segments.length; si++) {
                    ctx.lineTo(tent.segments[si].x, tent.segments[si].y);
                }
                ctx.stroke();

                // Bioluminescent dots along tentacles
                for (let si = 0; si < tent.segments.length; si += 2) {
                    const seg = tent.segments[si];
                    const dotPulse = Math.sin(tick * 0.05 + si * 0.5 + j.pulsePhase) * 0.5 + 0.5;
                    if (dotPulse > 0.7) {
                        ctx.save();
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.fillStyle = `hsla(${h}, ${s + 10}%, ${l + 20}%, ${dotPulse * j.glowAlpha * 2})`;
                        ctx.beginPath();
                        ctx.arc(seg.x, seg.y, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                }
            }

            // Bell (dome shape)
            ctx.save();
            ctx.translate(j.x, j.y);

            // Bell glow
            ctx.globalCompositeOperation = 'lighter';
            const glowSize = j.size * 2;
            const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
            glow.addColorStop(0, `hsla(${h}, ${s}%, ${l + 10}%, ${j.glowAlpha * pulse})`);
            glow.addColorStop(0.5, `hsla(${h}, ${s}%, ${l}%, ${j.glowAlpha * 0.3 * pulse})`);
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
            ctx.fill();

            // Bell body
            ctx.globalCompositeOperation = 'source-over';
            const bellW = j.size * (1 + bellContract * 0.2);
            const bellH = j.size * (0.7 - bellContract * 0.15);
            ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, ${0.08 + j.glowAlpha * 0.1})`;
            ctx.strokeStyle = `hsla(${h}, ${s}%, ${l + 15}%, ${0.2 + j.glowAlpha * 0.2})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, 0, bellW, bellH, 0, Math.PI, 0);
            ctx.fill();
            ctx.stroke();

            // Inner bell pattern (organs)
            ctx.strokeStyle = `hsla(${h}, ${s + 10}%, ${l + 20}%, ${j.glowAlpha * 0.5})`;
            ctx.lineWidth = 0.5;
            for (let p = 0; p < 4; p++) {
                const angle = (p / 4) * Math.PI;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * bellW * 0.6, -Math.sin(angle) * bellH * 0.6);
                ctx.stroke();
            }

            ctx.restore();
        }

        // Bubbles
        for (let i = 0; i < this.bubbles.length; i++) {
            const b = this.bubbles[i];
            ctx.strokeStyle = `rgba(180, 220, 255, ${b.life * 0.3})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
            ctx.stroke();

            // Highlight spot
            ctx.fillStyle = `rgba(220, 240, 255, ${b.life * 0.15})`;
            ctx.beginPath();
            ctx.arc(b.x - b.size * 0.3, b.y - b.size * 0.3, b.size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
