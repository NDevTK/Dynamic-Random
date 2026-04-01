/**
 * @file plasma_ball_architecture.js
 * @description Interactive plasma globe effect - electric arcs crawl from a central
 * orb toward the cursor, forking and branching based on the seed. Different seeds
 * produce wildly different arc behaviors: jagged vs smooth, single vs multi-tendril,
 * warm vs cold palettes, pulsing vs steady. Clicking spawns burst discharges.
 */

import { Architecture } from './background_architectures.js';
import { mouse, isLeftMouseDown } from './state.js';

export class PlasmaBallArchitecture extends Architecture {
    constructor() {
        super();
        this.arcs = [];
        this.orbs = [];
        this.discharges = [];
        this.ambientTendrils = [];
        this.glowPulse = 0;
        this.arcStyle = 0;
        this.colorScheme = null;
        this.forkProb = 0;
        this.jaggedness = 0;
        this.tendrilCount = 0;
        this.orbPulseSpeed = 0;
        this.backgroundGlow = 0;
    }

    init(system) {
        const rng = system.rng;

        // Seed-driven arc behavior — makes each seed feel completely different
        this.arcStyle = Math.floor(rng() * 6);
        // 0 = jagged lightning, 1 = smooth sine tendrils, 2 = branching tree
        // 3 = spiral coils, 4 = scattered sparks, 5 = pulsing rings

        this.jaggedness = 5 + rng() * 40;
        this.forkProb = 0.02 + rng() * 0.12;
        this.tendrilCount = 3 + Math.floor(rng() * 8);
        this.orbPulseSpeed = 0.02 + rng() * 0.06;
        this.arcLifespan = 8 + Math.floor(rng() * 20);
        this.arcThickness = 1 + rng() * 3;
        this.backgroundGlow = 0.1 + rng() * 0.3;

        // Color schemes — each seed picks a dramatically different palette
        const palettes = [
            { core: [180, 120, 255], mid: [120, 60, 255], outer: [60, 0, 200], glow: 'rgba(100, 50, 255, ' },
            { core: [255, 200, 100], mid: [255, 130, 30], outer: [200, 60, 0], glow: 'rgba(255, 130, 30, ' },
            { core: [100, 255, 200], mid: [0, 200, 180], outer: [0, 100, 120], glow: 'rgba(0, 200, 180, ' },
            { core: [255, 100, 100], mid: [255, 30, 60], outer: [180, 0, 30], glow: 'rgba(255, 30, 60, ' },
            { core: [200, 255, 255], mid: [100, 200, 255], outer: [30, 80, 200], glow: 'rgba(100, 200, 255, ' },
            { core: [255, 100, 255], mid: [200, 0, 200], outer: [120, 0, 150], glow: 'rgba(200, 0, 200, ' },
            { core: [255, 255, 200], mid: [200, 255, 100], outer: [80, 200, 0], glow: 'rgba(200, 255, 100, ' },
        ];
        this.colorScheme = palettes[Math.floor(rng() * palettes.length)];

        // Seed-driven orb configuration
        const orbCount = 1 + Math.floor(rng() * 3);
        this.orbs = [];
        for (let i = 0; i < orbCount; i++) {
            this.orbs.push({
                x: system.width * (0.2 + rng() * 0.6),
                y: system.height * (0.2 + rng() * 0.6),
                baseX: system.width * (0.2 + rng() * 0.6),
                baseY: system.height * (0.2 + rng() * 0.6),
                radius: 20 + rng() * 40,
                driftAngle: rng() * Math.PI * 2,
                driftSpeed: 0.003 + rng() * 0.01,
                driftRadius: 20 + rng() * 60,
                phase: rng() * Math.PI * 2
            });
        }

        // Pre-generate ambient background tendrils
        this.ambientTendrils = [];
        const ambientCount = 5 + Math.floor(rng() * 10);
        for (let i = 0; i < ambientCount; i++) {
            this.ambientTendrils.push({
                angle: rng() * Math.PI * 2,
                speed: 0.002 + rng() * 0.008,
                length: 80 + rng() * 200,
                phase: rng() * Math.PI * 2,
                orbIndex: Math.floor(rng() * orbCount)
            });
        }

        this.discharges = [];
    }

    _generateArc(x1, y1, x2, y2, segments, rng, depth) {
        const points = [{ x: x1, y: y1 }];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);

        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const baseX = x1 + dx * t;
            const baseY = y1 + dy * t;

            // Perpendicular offset scaled by jaggedness and distance
            const perpScale = this.jaggedness * (1 - Math.abs(t - 0.5) * 2);
            let offsetX, offsetY;

            if (this.arcStyle === 1) {
                // Smooth sine wave
                const wave = Math.sin(t * Math.PI * (3 + depth)) * perpScale;
                offsetX = (-dy / len) * wave;
                offsetY = (dx / len) * wave;
            } else if (this.arcStyle === 3) {
                // Spiral coil
                const coil = Math.sin(t * Math.PI * 8) * perpScale * 0.7;
                const coil2 = Math.cos(t * Math.PI * 8) * perpScale * 0.3;
                offsetX = (-dy / len) * coil + (dx / len) * coil2;
                offsetY = (dx / len) * coil + (dy / len) * coil2;
            } else {
                // Jagged lightning (default + styles 0, 2, 4, 5)
                offsetX = (rng() - 0.5) * perpScale * 2;
                offsetY = (rng() - 0.5) * perpScale * 2;
            }

            points.push({ x: baseX + offsetX, y: baseY + offsetY });
        }
        points.push({ x: x2, y: y2 });

        // Fork branches (style 2 = heavy branching)
        const forks = [];
        if (depth < 3) {
            const forkChance = this.arcStyle === 2 ? this.forkProb * 3 : this.forkProb;
            for (let i = 1; i < points.length - 1; i++) {
                if (rng() < forkChance) {
                    const p = points[i];
                    const angle = Math.atan2(dy, dx) + (rng() - 0.5) * Math.PI * 0.8;
                    const forkLen = len * (0.2 + rng() * 0.3) / (depth + 1);
                    const endX = p.x + Math.cos(angle) * forkLen;
                    const endY = p.y + Math.sin(angle) * forkLen;
                    forks.push(this._generateArc(p.x, p.y, endX, endY, Math.max(3, segments >> 1), rng, depth + 1));
                }
            }
        }

        return { points, forks, alpha: 1, life: this.arcLifespan, maxLife: this.arcLifespan };
    }

    _drawArcPath(ctx, arc, alpha, thickness) {
        const pts = arc.points;
        if (pts.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.lineWidth = thickness * alpha;
        ctx.stroke();

        // Draw fork branches recursively
        for (const fork of arc.forks) {
            this._drawArcPath(ctx, fork, alpha * 0.7, thickness * 0.6);
        }
    }

    update(system) {
        const tick = system.tick;
        this.glowPulse = Math.sin(tick * this.orbPulseSpeed) * 0.3 + 0.7;

        // Update orb positions (gentle drift)
        for (const orb of this.orbs) {
            orb.driftAngle += orb.driftSpeed;
            orb.x = orb.baseX + Math.cos(orb.driftAngle) * orb.driftRadius;
            orb.y = orb.baseY + Math.sin(orb.driftAngle * 0.7) * orb.driftRadius;
        }

        // Spawn arcs toward mouse
        if (tick % 3 === 0) {
            for (const orb of this.orbs) {
                const dx = mouse.x - orb.x;
                const dy = mouse.y - orb.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > orb.radius && dist < Math.max(system.width, system.height)) {
                    const segments = 8 + Math.floor(dist / 40);
                    const arc = this._generateArc(
                        orb.x, orb.y, mouse.x, mouse.y,
                        Math.min(segments, 30), system.rng, 0
                    );
                    this.arcs.push(arc);
                }
            }
        }

        // Spawn ambient tendrils from orbs
        if (tick % 6 === 0) {
            for (const t of this.ambientTendrils) {
                t.angle += t.speed;
                const orb = this.orbs[t.orbIndex] || this.orbs[0];
                const endX = orb.x + Math.cos(t.angle + t.phase) * t.length;
                const endY = orb.y + Math.sin(t.angle + t.phase) * t.length;
                const arc = this._generateArc(orb.x, orb.y, endX, endY, 8, system.rng, 1);
                arc.maxLife = 6;
                arc.life = 6;
                this.arcs.push(arc);
            }
        }

        // Click discharge burst
        if (isLeftMouseDown && tick % 4 === 0) {
            const burstCount = 6 + Math.floor(system.rng() * 6);
            for (let i = 0; i < burstCount; i++) {
                const angle = (i / burstCount) * Math.PI * 2 + system.rng() * 0.3;
                const len = 100 + system.rng() * 300;
                const endX = mouse.x + Math.cos(angle) * len;
                const endY = mouse.y + Math.sin(angle) * len;
                const arc = this._generateArc(mouse.x, mouse.y, endX, endY, 12, system.rng, 0);
                arc.maxLife = 12;
                arc.life = 12;
                this.arcs.push(arc);
            }
        }

        // Age and cull arcs
        for (let i = this.arcs.length - 1; i >= 0; i--) {
            this.arcs[i].life--;
            if (this.arcs[i].life <= 0) {
                this.arcs[i] = this.arcs[this.arcs.length - 1];
                this.arcs.pop();
            }
        }

        // Performance cap
        const maxArcs = Math.floor(200 * (system.qualityScale || 1));
        while (this.arcs.length > maxArcs) {
            this.arcs.shift();
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const cs = this.colorScheme;

        // Background glow around orbs
        for (const orb of this.orbs) {
            const pulse = this.glowPulse;
            const glowRadius = orb.radius * 4 * pulse;
            const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, glowRadius);
            grad.addColorStop(0, cs.glow + (0.3 * pulse) + ')');
            grad.addColorStop(0.3, cs.glow + (0.1 * pulse) + ')');
            grad.addColorStop(1, cs.glow + '0)');
            ctx.fillStyle = grad;
            ctx.fillRect(orb.x - glowRadius, orb.y - glowRadius, glowRadius * 2, glowRadius * 2);

            // Inner orb
            const innerGrad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius * pulse);
            innerGrad.addColorStop(0, `rgba(${cs.core[0]}, ${cs.core[1]}, ${cs.core[2]}, 0.9)`);
            innerGrad.addColorStop(0.5, `rgba(${cs.mid[0]}, ${cs.mid[1]}, ${cs.mid[2]}, 0.5)`);
            innerGrad.addColorStop(1, `rgba(${cs.outer[0]}, ${cs.outer[1]}, ${cs.outer[2]}, 0)`);
            ctx.fillStyle = innerGrad;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.radius * pulse, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw arcs
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const arc of this.arcs) {
            const alpha = arc.life / arc.maxLife;
            const r = cs.core[0] + (cs.mid[0] - cs.core[0]) * (1 - alpha);
            const g = cs.core[1] + (cs.mid[1] - cs.core[1]) * (1 - alpha);
            const b = cs.core[2] + (cs.mid[2] - cs.core[2]) * (1 - alpha);

            // Outer glow
            ctx.strokeStyle = `rgba(${cs.outer[0]}, ${cs.outer[1]}, ${cs.outer[2]}, ${alpha * 0.3})`;
            this._drawArcPath(ctx, arc, alpha, this.arcThickness * 3);

            // Core bright line
            ctx.strokeStyle = `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${alpha * 0.8})`;
            this._drawArcPath(ctx, arc, alpha, this.arcThickness);

            // Hot white center
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
            this._drawArcPath(ctx, arc, alpha, this.arcThickness * 0.4);
        }

        ctx.restore();

        // Cursor glow
        const cursorGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 60);
        cursorGrad.addColorStop(0, cs.glow + '0.15)');
        cursorGrad.addColorStop(1, cs.glow + '0)');
        ctx.fillStyle = cursorGrad;
        ctx.fillRect(mouse.x - 60, mouse.y - 60, 120, 120);
    }
}
