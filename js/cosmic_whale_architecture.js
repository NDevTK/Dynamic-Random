/**
 * @file cosmic_whale_architecture.js
 * @description Ethereal space whales gliding through the cosmos with procedural
 * body shapes, bioluminescent particle trails, and aurora-like wake effects.
 * Mouse proximity causes creatures to surface/dive. Seed controls species shape,
 * color palette, swim patterns, school size, and trail style.
 */

import { Architecture } from './background_architectures.js';
import { mouse, isLeftMouseDown } from './state.js';

export class CosmicWhaleArchitecture extends Architecture {
    constructor() {
        super();
        this.creatures = [];
        this.trailParticles = [];
        this.trailPool = [];
        this.plankton = [];
        this.palette = [];
        this.speciesType = 0;
        this.depthLayers = 3;
        this.currentPhase = 0;
        this.waveAmplitude = 0;
        this.nebulaGlow = [];
    }

    init(system) {
        const rng = system.rng;

        // Species types: 0=whale, 1=manta ray, 2=jellyfish, 3=leviathan, 4=serpent
        this.speciesType = Math.floor(rng() * 5);

        // Seed-driven palettes - dramatically different color stories
        const palettes = [
            // Abyssal blue - deep ocean bioluminescence
            [{ h: 200, s: 80, l: 60 }, { h: 220, s: 90, l: 40 }, { h: 180, s: 70, l: 50 }, { h: 240, s: 60, l: 70 }],
            // Cosmic purple - nebula tones
            [{ h: 280, s: 70, l: 55 }, { h: 300, s: 80, l: 45 }, { h: 260, s: 90, l: 65 }, { h: 320, s: 60, l: 50 }],
            // Solar gold - warm stellar
            [{ h: 40, s: 90, l: 60 }, { h: 20, s: 80, l: 50 }, { h: 60, s: 70, l: 55 }, { h: 10, s: 85, l: 45 }],
            // Aurora green - northern lights
            [{ h: 140, s: 80, l: 50 }, { h: 160, s: 70, l: 60 }, { h: 120, s: 90, l: 40 }, { h: 100, s: 60, l: 55 }],
            // Blood moon - crimson deep
            [{ h: 0, s: 80, l: 45 }, { h: 340, s: 70, l: 55 }, { h: 20, s: 90, l: 40 }, { h: 350, s: 60, l: 60 }],
        ];
        this.palette = palettes[Math.floor(rng() * palettes.length)];

        this.waveAmplitude = 20 + rng() * 60;
        this.depthLayers = 2 + Math.floor(rng() * 3);

        // Generate creatures
        this.creatures = [];
        const count = 3 + Math.floor(rng() * 5);
        for (let i = 0; i < count; i++) {
            this.creatures.push(this._createCreature(system, rng, i));
        }

        // Background plankton/stars
        this.plankton = [];
        const planktonCount = 80 + Math.floor(rng() * 120);
        for (let i = 0; i < planktonCount; i++) {
            this.plankton.push({
                x: rng() * system.width,
                y: rng() * system.height,
                size: 0.5 + rng() * 2,
                alpha: 0.1 + rng() * 0.4,
                phase: rng() * Math.PI * 2,
                speed: 0.002 + rng() * 0.008,
                drift: (rng() - 0.5) * 0.3,
                layer: Math.floor(rng() * this.depthLayers),
                hueIdx: Math.floor(rng() * this.palette.length)
            });
        }

        // Nebula glow spots
        this.nebulaGlow = [];
        for (let i = 0; i < 4; i++) {
            this.nebulaGlow.push({
                x: rng() * system.width,
                y: rng() * system.height,
                radius: 100 + rng() * 300,
                hueIdx: Math.floor(rng() * this.palette.length),
                alpha: 0.02 + rng() * 0.04,
                phase: rng() * Math.PI * 2,
                speed: 0.001 + rng() * 0.003
            });
        }

        this.trailParticles = [];
        this.trailPool = [];
    }

    _createCreature(system, rng, index) {
        const color = this.palette[index % this.palette.length];
        const size = 40 + rng() * 80;
        const bodySegments = this.speciesType === 4 ? 12 + Math.floor(rng() * 8) :
                             this.speciesType === 2 ? 6 :
                             8 + Math.floor(rng() * 4);

        return {
            x: rng() * system.width,
            y: rng() * system.height,
            vx: (rng() - 0.5) * 1.5,
            vy: (rng() - 0.5) * 0.8,
            size,
            color,
            angle: rng() * Math.PI * 2,
            swimPhase: rng() * Math.PI * 2,
            swimSpeed: 0.015 + rng() * 0.03,
            swimAmplitude: 0.3 + rng() * 0.6,
            bodySegments,
            segmentOffsets: Array.from({ length: bodySegments }, () => rng() * Math.PI * 2),
            tailLength: 0.5 + rng() * 1.5,
            glowIntensity: 0.3 + rng() * 0.5,
            depth: rng(),
            // Interaction state
            fleeDist: 150 + rng() * 200,
            fleeSpeed: 2 + rng() * 3,
            curiosity: rng() * 0.5,
            breathPhase: rng() * Math.PI * 2,
            // Fin parameters
            finCount: this.speciesType === 1 ? 2 : 1 + Math.floor(rng() * 3),
            finAmplitude: 10 + rng() * 20,
            finSpeed: 0.02 + rng() * 0.04
        };
    }

    update(system) {
        this.currentPhase += 0.01;
        const mx = mouse.x;
        const my = mouse.y;

        for (const c of this.creatures) {
            c.swimPhase += c.swimSpeed * system.speedMultiplier;
            c.breathPhase += 0.008;

            // Mouse interaction: flee or approach based on curiosity
            const dx = mx - c.x;
            const dy = my - c.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < c.fleeDist && dist > 1) {
                if (isLeftMouseDown) {
                    // Flee from click
                    c.vx -= (dx / dist) * c.fleeSpeed * 0.1;
                    c.vy -= (dy / dist) * c.fleeSpeed * 0.1;
                } else if (c.curiosity > 0.3 && dist > 80) {
                    // Curious - slowly approach
                    c.vx += (dx / dist) * c.curiosity * 0.02;
                    c.vy += (dy / dist) * c.curiosity * 0.02;
                }
            }

            // Swimming motion
            c.vx += Math.cos(c.angle + Math.sin(c.swimPhase) * c.swimAmplitude) * 0.05;
            c.vy += Math.sin(c.angle + Math.sin(c.swimPhase) * c.swimAmplitude) * 0.03;

            // Gentle drift toward center
            c.vx += (system.width / 2 - c.x) * 0.00003;
            c.vy += (system.height / 2 - c.y) * 0.00003;

            // Damping
            c.vx *= 0.98;
            c.vy *= 0.98;

            c.x += c.vx * system.speedMultiplier;
            c.y += c.vy * system.speedMultiplier;

            // Update angle to face direction of movement
            if (Math.abs(c.vx) > 0.1 || Math.abs(c.vy) > 0.1) {
                const targetAngle = Math.atan2(c.vy, c.vx);
                let diff = targetAngle - c.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                c.angle += diff * 0.03;
            }

            // Wrap around screen with margin
            const margin = c.size * 2;
            if (c.x < -margin) c.x = system.width + margin;
            if (c.x > system.width + margin) c.x = -margin;
            if (c.y < -margin) c.y = system.height + margin;
            if (c.y > system.height + margin) c.y = -margin;

            // Spawn trail particles (capped)
            if (this.trailParticles.length < 300 && system.tick % 2 === 0) {
                const tailX = c.x - Math.cos(c.angle) * c.size * c.tailLength;
                const tailY = c.y - Math.sin(c.angle) * c.size * c.tailLength;
                let p = this.trailPool.length > 0 ? this.trailPool.pop() : {};
                p.x = tailX + (system.rng() - 0.5) * 10;
                p.y = tailY + (system.rng() - 0.5) * 10;
                p.vx = -c.vx * 0.2 + (system.rng() - 0.5) * 0.5;
                p.vy = -c.vy * 0.2 + (system.rng() - 0.5) * 0.5;
                p.life = 1.0;
                p.decay = 0.008 + system.rng() * 0.012;
                p.size = 2 + system.rng() * 4;
                p.color = c.color;
                this.trailParticles.push(p);
            }
        }

        // Update trail particles
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const p = this.trailParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.97;
            p.vy *= 0.97;
            p.life -= p.decay;
            if (p.life <= 0) {
                if (this.trailPool.length < 300) this.trailPool.push(p);
                this.trailParticles[i] = this.trailParticles[this.trailParticles.length - 1];
                this.trailParticles.pop();
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;

        // Draw nebula glow background
        for (const n of this.nebulaGlow) {
            const phase = this.currentPhase * n.speed;
            const alpha = n.alpha * (0.7 + 0.3 * Math.sin(n.phase + phase));
            const c = this.palette[n.hueIdx];
            const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
            g.addColorStop(0, `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw plankton
        for (const p of this.plankton) {
            const flicker = 0.5 + 0.5 * Math.sin(p.phase + this.currentPhase * p.speed * 100);
            const c = this.palette[p.hueIdx];
            ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${p.alpha * flicker})`;
            ctx.beginPath();
            ctx.arc(p.x + Math.sin(this.currentPhase + p.phase) * p.drift * 20, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw trail particles
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.trailParticles) {
            const a = p.life * 0.6;
            ctx.fillStyle = `hsla(${p.color.h}, ${p.color.s}%, ${p.color.l}%, ${a})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // Draw creatures (sorted by depth for parallax)
        const sorted = this.creatures.slice().sort((a, b) => a.depth - b.depth);
        for (const c of sorted) {
            this._drawCreature(ctx, c, system);
        }
    }

    _drawCreature(ctx, c, system) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);

        const breathScale = 1 + Math.sin(c.breathPhase) * 0.05;
        ctx.scale(breathScale, breathScale);

        const col = c.color;
        const glow = c.glowIntensity * (0.7 + 0.3 * Math.sin(c.swimPhase * 2));

        // Outer glow
        const glowRadius = c.size * 2;
        const g = ctx.createRadialGradient(0, 0, c.size * 0.3, 0, 0, glowRadius);
        g.addColorStop(0, `hsla(${col.h}, ${col.s}%, ${col.l}%, ${glow * 0.15})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        if (this.speciesType === 0 || this.speciesType === 3) {
            this._drawWhaleBody(ctx, c, col, glow);
        } else if (this.speciesType === 1) {
            this._drawMantaBody(ctx, c, col, glow);
        } else if (this.speciesType === 2) {
            this._drawJellyfishBody(ctx, c, col, glow);
        } else if (this.speciesType === 4) {
            this._drawSerpentBody(ctx, c, col, glow);
        }

        ctx.restore();
    }

    _drawWhaleBody(ctx, c, col, glow) {
        const s = c.size;
        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, s, s * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${col.h}, ${col.s}%, ${col.l * 0.4}%, ${0.6 + glow * 0.3})`;
        ctx.fill();

        // Belly highlight
        ctx.beginPath();
        ctx.ellipse(s * 0.1, s * 0.1, s * 0.6, s * 0.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${col.h}, ${col.s - 20}%, ${col.l + 15}%, ${0.15})`;
        ctx.fill();

        // Tail flukes
        const tailWave = Math.sin(c.swimPhase) * 15;
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.quadraticCurveTo(-s * 1.3, -s * 0.3 + tailWave, -s * 1.6, -s * 0.4 + tailWave);
        ctx.quadraticCurveTo(-s * 1.3, tailWave * 0.5, -s * 1.6, s * 0.4 + tailWave);
        ctx.quadraticCurveTo(-s * 1.3, s * 0.3 + tailWave, -s, 0);
        ctx.fillStyle = `hsla(${col.h}, ${col.s}%, ${col.l * 0.5}%, ${0.5 + glow * 0.2})`;
        ctx.fill();

        // Dorsal fin
        const finWave = Math.sin(c.swimPhase * 1.5) * c.finAmplitude * 0.5;
        ctx.beginPath();
        ctx.moveTo(s * 0.2, -s * 0.35);
        ctx.quadraticCurveTo(0, -s * 0.7 + finWave, -s * 0.3, -s * 0.35);
        ctx.fillStyle = `hsla(${col.h}, ${col.s}%, ${col.l * 0.6}%, ${0.4})`;
        ctx.fill();

        // Eye
        ctx.beginPath();
        ctx.arc(s * 0.6, -s * 0.1, s * 0.06, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(col.h + 60) % 360}, 90%, 80%, ${0.8})`;
        ctx.fill();

        // Bioluminescent spots
        for (let i = 0; i < c.bodySegments; i++) {
            const spotX = -s * 0.8 + (i / c.bodySegments) * s * 1.6;
            const spotY = Math.sin(c.segmentOffsets[i] + c.swimPhase) * s * 0.2;
            const spotAlpha = 0.3 + 0.4 * Math.sin(c.segmentOffsets[i] + c.swimPhase * 2);
            ctx.beginPath();
            ctx.arc(spotX, spotY, s * 0.04, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${(col.h + 40) % 360}, 90%, 75%, ${spotAlpha})`;
            ctx.fill();
        }
    }

    _drawMantaBody(ctx, c, col, glow) {
        const s = c.size;
        const wingWave = Math.sin(c.swimPhase) * s * 0.3;

        // Wings
        ctx.beginPath();
        ctx.moveTo(s * 0.5, 0);
        ctx.bezierCurveTo(s * 0.3, -s * 0.8 + wingWave, -s * 0.3, -s * 1.0 + wingWave, -s * 0.5, -s * 0.3 + wingWave * 0.5);
        ctx.lineTo(-s * 0.3, 0);
        ctx.bezierCurveTo(-s * 0.3, s * 1.0 - wingWave, s * 0.3, s * 0.8 - wingWave, s * 0.5, 0);
        ctx.fillStyle = `hsla(${col.h}, ${col.s}%, ${col.l * 0.4}%, ${0.5 + glow * 0.3})`;
        ctx.fill();

        // Central body ridge
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.5, s * 0.15, 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${col.h}, ${col.s - 10}%, ${col.l + 10}%, ${0.3})`;
        ctx.fill();

        // Tail
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, 0);
        ctx.lineTo(-s * 1.2, Math.sin(c.swimPhase * 1.5) * 10);
        ctx.strokeStyle = `hsla(${col.h}, ${col.s}%, ${col.l}%, ${0.4})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eyes
        ctx.fillStyle = `hsla(${(col.h + 60) % 360}, 90%, 80%, 0.8)`;
        ctx.beginPath();
        ctx.arc(s * 0.3, -s * 0.15, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s * 0.3, s * 0.15, s * 0.04, 0, Math.PI * 2);
        ctx.fill();

        // Wing edge glow
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `hsla(${col.h}, ${col.s}%, ${col.l}%, ${glow * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s * 0.5, 0);
        ctx.bezierCurveTo(s * 0.3, -s * 0.8 + wingWave, -s * 0.3, -s * 1.0 + wingWave, -s * 0.5, -s * 0.3 + wingWave * 0.5);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    }

    _drawJellyfishBody(ctx, c, col, glow) {
        const s = c.size;
        const pulse = Math.sin(c.swimPhase) * 0.15;

        // Bell (dome)
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.1, s * (0.5 + pulse), s * (0.4 + pulse * 0.5), 0, Math.PI, 0);
        ctx.fillStyle = `hsla(${col.h}, ${col.s}%, ${col.l}%, ${0.15 + glow * 0.2})`;
        ctx.fill();

        // Inner bell glow
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.15, s * 0.3, s * 0.25, 0, Math.PI, 0);
        ctx.fillStyle = `hsla(${(col.h + 20) % 360}, ${col.s + 10}%, ${col.l + 10}%, ${0.1 + glow * 0.15})`;
        ctx.fill();

        // Tentacles
        const tentacleCount = c.bodySegments;
        for (let i = 0; i < tentacleCount; i++) {
            const baseX = -s * 0.4 + (i / (tentacleCount - 1)) * s * 0.8;
            ctx.beginPath();
            ctx.moveTo(baseX, s * 0.1);
            let cx = baseX;
            let cy = s * 0.1;
            for (let j = 0; j < 4; j++) {
                const wave = Math.sin(c.segmentOffsets[i] + c.swimPhase + j * 0.5) * (10 + j * 5);
                cx += wave * 0.3;
                cy += s * 0.25;
                ctx.lineTo(cx + wave, cy);
            }
            const alpha = 0.15 + 0.15 * Math.sin(c.segmentOffsets[i] + c.swimPhase);
            ctx.strokeStyle = `hsla(${(col.h + i * 15) % 360}, ${col.s}%, ${col.l}%, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Glowing tips
            ctx.beginPath();
            ctx.arc(cx, cy, 2, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${(col.h + i * 15) % 360}, 90%, 75%, ${alpha * 2})`;
            ctx.fill();
        }
    }

    _drawSerpentBody(ctx, c, col, glow) {
        const s = c.size;
        // Draw a sinuous body
        ctx.beginPath();
        const segLen = s * 0.3;
        let px = s * 0.5;
        let py = 0;
        ctx.moveTo(px, py);

        for (let i = 0; i < c.bodySegments; i++) {
            const wave = Math.sin(c.segmentOffsets[i] + c.swimPhase - i * 0.4) * s * 0.2;
            px -= segLen;
            py = wave;
            ctx.lineTo(px, py);
        }

        ctx.strokeStyle = `hsla(${col.h}, ${col.s}%, ${col.l * 0.5}%, ${0.6 + glow * 0.2})`;
        ctx.lineWidth = s * 0.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Inner glow line
        ctx.strokeStyle = `hsla(${col.h}, ${col.s}%, ${col.l}%, ${glow * 0.3})`;
        ctx.lineWidth = s * 0.1;
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.ellipse(s * 0.5, 0, s * 0.2, s * 0.15, 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${col.h}, ${col.s}%, ${col.l * 0.5}%, ${0.7})`;
        ctx.fill();

        // Eyes
        ctx.fillStyle = `hsla(${(col.h + 60) % 360}, 90%, 80%, 0.9)`;
        ctx.beginPath();
        ctx.arc(s * 0.6, -s * 0.06, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s * 0.6, s * 0.06, s * 0.04, 0, Math.PI * 2);
        ctx.fill();

        // Spine ridges
        ctx.globalCompositeOperation = 'lighter';
        px = s * 0.5;
        for (let i = 0; i < c.bodySegments; i++) {
            const wave = Math.sin(c.segmentOffsets[i] + c.swimPhase - i * 0.4) * s * 0.2;
            px -= segLen;
            const ridgeAlpha = 0.2 + 0.3 * Math.sin(c.segmentOffsets[i] + c.swimPhase * 2);
            ctx.beginPath();
            ctx.arc(px, wave, s * 0.05, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${(col.h + 30) % 360}, 90%, 70%, ${ridgeAlpha})`;
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }
}
