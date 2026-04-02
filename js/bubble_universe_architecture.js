/**
 * @file bubble_universe_architecture.js
 * @description Floating soap bubbles with iridescent rainbow shimmer that merge,
 * split, and pop. Mouse pops bubbles on click, blows them away on move.
 * Seeds dramatically change bubble density, drift patterns, iridescence,
 * size distributions, and pop physics.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class BubbleUniverseArchitecture extends Architecture {
    constructor() {
        super();
        this.bubbles = [];
        this.popParticles = [];
        this.popPool = [];
        this.driftMode = 0;
        this.iridescentShift = 0;
        this.colorScheme = 0;
        this.windAngle = 0;
        this.windSpeed = 0;
        this.shimmerFreq = 0;
        this.maxBubbles = 60;
        this.spawnRate = 0;
        this.tick = 0;
        this.connectionStyle = 0;
        this.reflectionPool = [];
        this.lastClickSpawn = 0;
    }

    init(system) {
        const rng = system.rng;

        // Seed-driven behavior modes
        this.driftMode = Math.floor(rng() * 6);
        // 0=gentle rise, 1=spiral ascent, 2=ocean current, 3=tornado, 4=gravity wells, 5=lava lamp

        this.colorScheme = Math.floor(rng() * 6);
        // 0=classic soap, 1=neon plasma, 2=ocean blue, 3=sunset warm, 4=aurora green, 5=candy pastel

        this.shimmerFreq = 0.5 + rng() * 3;
        this.windAngle = rng() * Math.PI * 2;
        this.windSpeed = 0.1 + rng() * 0.5;
        this.maxBubbles = 30 + Math.floor(rng() * 50);
        this.spawnRate = 0.3 + rng() * 0.7;
        this.popExplosiveness = 1 + rng() * 4;
        this.mergeEnabled = rng() > 0.3;
        this.wobbleIntensity = 0.5 + rng() * 2;
        this.surfaceTension = 0.01 + rng() * 0.04;

        // Seed-driven size distribution
        this.minSize = 15 + rng() * 20;
        this.maxSize = 50 + rng() * 80;

        // Seed-driven connection strings between nearby bubbles
        this.connectionStyle = Math.floor(rng() * 4);
        // 0=none, 1=thin strings, 2=elastic bands, 3=light bridges
        this.connectionDist = 80 + rng() * 120;
        this.splitThreshold = this.maxSize * (0.8 + rng() * 0.2);

        this.bubbles = [];
        this.popParticles = [];

        // Initial bubbles
        const initCount = Math.floor(this.maxBubbles * 0.6);
        for (let i = 0; i < initCount; i++) {
            this.spawnBubble(system, rng);
        }
    }

    spawnBubble(system, rng) {
        if (this.bubbles.length >= this.maxBubbles) return;

        const r = this.minSize + rng() * (this.maxSize - this.minSize);
        let x, y;

        if (this.driftMode === 0 || this.driftMode === 1) {
            // Rise from bottom
            x = rng() * system.width;
            y = system.height + r;
        } else if (this.driftMode === 2) {
            // Enter from sides
            x = rng() > 0.5 ? -r : system.width + r;
            y = rng() * system.height;
        } else {
            x = rng() * system.width;
            y = rng() * system.height;
        }

        this.bubbles.push({
            x, y, r,
            vx: (rng() - 0.5) * 0.5,
            vy: -0.3 - rng() * 0.7,
            phase: rng() * Math.PI * 2,
            wobblePhaseX: rng() * Math.PI * 2,
            wobblePhaseY: rng() * Math.PI * 2,
            iriShift: rng() * 360,
            shimmerSpeed: 0.5 + rng() * 2,
            opacity: 0,
            targetOpacity: 0.3 + rng() * 0.4,
            age: 0,
            highlight: rng() * Math.PI * 2,
        });
    }

    popBubble(index, system) {
        const b = this.bubbles[index];
        const count = Math.min(20, Math.floor(b.r * 0.5));
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const speed = (1 + Math.random() * 3) * this.popExplosiveness;
            let p = this.popPool.length > 0 ? this.popPool.pop() : {};
            p.x = b.x + Math.cos(angle) * b.r * 0.8;
            p.y = b.y + Math.sin(angle) * b.r * 0.8;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.life = 1;
            p.decay = 0.02 + Math.random() * 0.03;
            p.size = 1 + Math.random() * 3;
            p.hue = b.iriShift + i * 15;
            this.popParticles.push(p);
        }
        // Swap-remove
        this.bubbles[index] = this.bubbles[this.bubbles.length - 1];
        this.bubbles.pop();
    }

    getIridescentColor(hue, alpha) {
        switch (this.colorScheme) {
            case 0: return `hsla(${hue % 360}, 70%, 65%, ${alpha})`; // classic soap
            case 1: return `hsla(${hue % 360}, 100%, 55%, ${alpha})`; // neon plasma
            case 2: return `hsla(${180 + (hue % 60)}, 80%, 50%, ${alpha})`; // ocean
            case 3: return `hsla(${(hue % 60) + 10}, 90%, 55%, ${alpha})`; // sunset
            case 4: return `hsla(${100 + (hue % 80)}, 75%, 50%, ${alpha})`; // aurora
            case 5: return `hsla(${hue % 360}, 60%, 75%, ${alpha})`; // candy pastel
            default: return `hsla(${hue % 360}, 70%, 65%, ${alpha})`;
        }
    }

    update(system) {
        this.tick++;
        const mx = mouse.x, my = mouse.y;

        // Spawn new bubbles
        if (Math.random() < this.spawnRate * 0.1) {
            this.spawnBubble(system, system.rng);
        }

        // Wind oscillation
        this.windAngle += 0.002;

        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const b = this.bubbles[i];
            b.age++;
            b.opacity += (b.targetOpacity - b.opacity) * 0.05;

            // Wobble
            b.wobblePhaseX += 0.02 * this.wobbleIntensity;
            b.wobblePhaseY += 0.025 * this.wobbleIntensity;
            b.phase += 0.01;

            // Drift mode physics
            switch (this.driftMode) {
                case 0: // gentle rise
                    b.vy -= 0.005;
                    b.vx += Math.sin(this.windAngle) * this.windSpeed * 0.01;
                    break;
                case 1: // spiral ascent
                    b.vy -= 0.008;
                    b.vx += Math.cos(b.phase * 2) * 0.15;
                    break;
                case 2: // ocean current
                    b.vx += Math.sin(b.y * 0.005 + this.tick * 0.01) * 0.05;
                    b.vy += Math.cos(b.x * 0.003 + this.tick * 0.008) * 0.03;
                    break;
                case 3: // tornado
                    const tAngle = Math.atan2(b.y - system.height / 2, b.x - system.width / 2);
                    b.vx += Math.cos(tAngle + Math.PI / 2) * 0.08;
                    b.vy += Math.sin(tAngle + Math.PI / 2) * 0.08 - 0.02;
                    break;
                case 4: // gravity wells
                    const gx = system.width / 2, gy = system.height / 2;
                    const gdx = gx - b.x, gdy = gy - b.y;
                    const gd = Math.sqrt(gdx * gdx + gdy * gdy) + 1;
                    b.vx += (gdx / gd) * 0.02;
                    b.vy += (gdy / gd) * 0.02;
                    break;
                case 5: // lava lamp
                    b.vy += (b.y < system.height / 2 ? 0.01 : -0.01);
                    b.vx += Math.sin(b.phase * 3) * 0.05;
                    break;
            }

            // Mouse repulsion (blow bubbles away)
            const dx = b.x - mx, dy = b.y - my;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200 && dist > 1) {
                const force = (200 - dist) * 0.0008;
                b.vx += (dx / dist) * force;
                b.vy += (dy / dist) * force;
            }

            // Damping
            b.vx *= 0.995;
            b.vy *= 0.995;
            b.x += b.vx;
            b.y += b.vy;

            // Iridescence shift
            b.iriShift += b.shimmerSpeed * this.shimmerFreq * 0.3;

            // Remove if off screen
            const margin = b.r * 2;
            if (b.x < -margin || b.x > system.width + margin ||
                b.y < -margin || b.y > system.height + margin) {
                this.bubbles[i] = this.bubbles[this.bubbles.length - 1];
                this.bubbles.pop();
                continue;
            }

            // Bubble-bubble collision (merge)
            if (this.mergeEnabled && i < this.bubbles.length) {
                for (let j = i + 1; j < this.bubbles.length; j++) {
                    const b2 = this.bubbles[j];
                    const cdx = b.x - b2.x, cdy = b.y - b2.y;
                    const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
                    if (cdist < (b.r + b2.r) * 0.7) {
                        // Merge: smaller absorbed into larger
                        if (b.r >= b2.r) {
                            b.r = Math.min(this.maxSize, Math.sqrt(b.r * b.r + b2.r * b2.r));
                            b.vx = (b.vx + b2.vx) * 0.5;
                            b.vy = (b.vy + b2.vy) * 0.5;
                            this.bubbles[j] = this.bubbles[this.bubbles.length - 1];
                            this.bubbles.pop();
                            if (j < i) i--;
                        }
                        break;
                    } else if (cdist < b.r + b2.r) {
                        // Soft repulsion (surface tension)
                        const overlap = (b.r + b2.r) - cdist;
                        const pushX = (cdx / cdist) * overlap * this.surfaceTension;
                        const pushY = (cdy / cdist) * overlap * this.surfaceTension;
                        b.vx += pushX; b.vy += pushY;
                        b2.vx -= pushX; b2.vy -= pushY;
                    }
                }
            }
        }

        // Update pop particles
        for (let i = this.popParticles.length - 1; i >= 0; i--) {
            const p = this.popParticles[i];
            p.x += p.vx; p.y += p.vy;
            p.vx *= 0.96; p.vy *= 0.96;
            p.vy += 0.02;
            p.life -= p.decay;
            if (p.life <= 0) {
                this.popPool.push(p);
                this.popParticles[i] = this.popParticles[this.popParticles.length - 1];
                this.popParticles.pop();
            }
        }

        // Pop bubbles near mouse click (handled via gravity well state)
        if (system.isGravityWell) {
            for (let i = this.bubbles.length - 1; i >= 0; i--) {
                const b = this.bubbles[i];
                const dx = b.x - mx, dy = b.y - my;
                if (Math.sqrt(dx * dx + dy * dy) < b.r + 30) {
                    this.popBubble(i, system);
                }
            }
        }

        // Left click (speedMultiplier > 2) spawns a cluster of bubbles at mouse
        if (system.speedMultiplier > 5 && this.tick - this.lastClickSpawn > 5) {
            this.lastClickSpawn = this.tick;
            const count = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                if (this.bubbles.length >= this.maxBubbles) break;
                const angle = Math.random() * Math.PI * 2;
                const dist = 10 + Math.random() * 30;
                const r = this.minSize + Math.random() * (this.maxSize * 0.4 - this.minSize);
                this.bubbles.push({
                    x: mx + Math.cos(angle) * dist,
                    y: my + Math.sin(angle) * dist,
                    r,
                    vx: Math.cos(angle) * 2,
                    vy: Math.sin(angle) * 2,
                    phase: Math.random() * Math.PI * 2,
                    wobblePhaseX: Math.random() * Math.PI * 2,
                    wobblePhaseY: Math.random() * Math.PI * 2,
                    iriShift: Math.random() * 360,
                    shimmerSpeed: 0.5 + Math.random() * 2,
                    opacity: 0,
                    targetOpacity: 0.3 + Math.random() * 0.4,
                    age: 0,
                    highlight: Math.random() * Math.PI * 2,
                });
            }
        }

        // Split oversized bubbles
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const b = this.bubbles[i];
            if (b.r > this.splitThreshold && this.bubbles.length < this.maxBubbles) {
                const newR = b.r * 0.65;
                b.r = newR;
                const angle = Math.random() * Math.PI * 2;
                this.bubbles.push({
                    x: b.x + Math.cos(angle) * newR,
                    y: b.y + Math.sin(angle) * newR,
                    r: newR,
                    vx: Math.cos(angle) * 1.5,
                    vy: Math.sin(angle) * 1.5,
                    phase: Math.random() * Math.PI * 2,
                    wobblePhaseX: Math.random() * Math.PI * 2,
                    wobblePhaseY: Math.random() * Math.PI * 2,
                    iriShift: b.iriShift + 60,
                    shimmerSpeed: b.shimmerSpeed,
                    opacity: b.opacity * 0.8,
                    targetOpacity: b.targetOpacity,
                    age: 0,
                    highlight: Math.random() * Math.PI * 2,
                });
                break; // one split per frame
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;

        // Draw bubbles
        for (const b of this.bubbles) {
            const wobbleX = Math.sin(b.wobblePhaseX) * 3 * this.wobbleIntensity;
            const wobbleY = Math.cos(b.wobblePhaseY) * 2 * this.wobbleIntensity;
            const cx = b.x + wobbleX;
            const cy = b.y + wobbleY;
            const scaleX = 1 + Math.sin(b.wobblePhaseX * 0.7) * 0.03;
            const scaleY = 1 + Math.cos(b.wobblePhaseY * 0.7) * 0.03;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(scaleX, scaleY);

            // Main bubble body - iridescent gradient
            const grad = ctx.createRadialGradient(-b.r * 0.3, -b.r * 0.3, b.r * 0.1, 0, 0, b.r);
            const hue1 = b.iriShift;
            const hue2 = b.iriShift + 60;
            const hue3 = b.iriShift + 180;
            grad.addColorStop(0, this.getIridescentColor(hue1, b.opacity * 0.1));
            grad.addColorStop(0.3, this.getIridescentColor(hue2, b.opacity * 0.25));
            grad.addColorStop(0.7, this.getIridescentColor(hue3, b.opacity * 0.2));
            grad.addColorStop(0.9, this.getIridescentColor(hue1 + 90, b.opacity * 0.35));
            grad.addColorStop(1, `rgba(255,255,255,${b.opacity * 0.05})`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, b.r, 0, Math.PI * 2);
            ctx.fill();

            // Bubble rim (thin bright edge)
            ctx.strokeStyle = this.getIridescentColor(hue2 + 30, b.opacity * 0.5);
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Specular highlight (top-left)
            const hlGrad = ctx.createRadialGradient(
                -b.r * 0.35, -b.r * 0.35, 0,
                -b.r * 0.35, -b.r * 0.35, b.r * 0.4
            );
            hlGrad.addColorStop(0, `rgba(255,255,255,${b.opacity * 0.7})`);
            hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = hlGrad;
            ctx.beginPath();
            ctx.arc(-b.r * 0.35, -b.r * 0.35, b.r * 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Small secondary highlight (bottom-right)
            const hl2Grad = ctx.createRadialGradient(
                b.r * 0.25, b.r * 0.3, 0,
                b.r * 0.25, b.r * 0.3, b.r * 0.15
            );
            hl2Grad.addColorStop(0, `rgba(255,255,255,${b.opacity * 0.3})`);
            hl2Grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = hl2Grad;
            ctx.beginPath();
            ctx.arc(b.r * 0.25, b.r * 0.3, b.r * 0.15, 0, Math.PI * 2);
            ctx.fill();

            // Iridescent band arc (rainbow shimmer across surface)
            ctx.globalCompositeOperation = 'lighter';
            const bandAngle = b.phase + Math.sin(this.tick * 0.02) * 0.3;
            ctx.beginPath();
            ctx.arc(0, 0, b.r * 0.85, bandAngle, bandAngle + Math.PI * 0.6);
            ctx.strokeStyle = this.getIridescentColor(hue3 + this.tick * 0.5, b.opacity * 0.2);
            ctx.lineWidth = b.r * 0.08;
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';

            ctx.restore();
        }

        // Draw connections between nearby bubbles
        if (this.connectionStyle > 0 && this.bubbles.length > 1) {
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < this.bubbles.length; i++) {
                const a = this.bubbles[i];
                for (let j = i + 1; j < this.bubbles.length; j++) {
                    const b = this.bubbles[j];
                    const dx = a.x - b.x, dy = a.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const maxDist = this.connectionDist + a.r + b.r;
                    if (dist > maxDist || dist < a.r + b.r) continue;
                    const alpha = (1 - (dist - a.r - b.r) / this.connectionDist) * 0.3 * Math.min(a.opacity, b.opacity);
                    if (alpha < 0.01) continue;

                    if (this.connectionStyle === 1) {
                        // Thin string
                        ctx.strokeStyle = this.getIridescentColor((a.iriShift + b.iriShift) / 2, alpha);
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    } else if (this.connectionStyle === 2) {
                        // Elastic band (curved)
                        const mx = (a.x + b.x) / 2;
                        const my = (a.y + b.y) / 2 + Math.sin(this.tick * 0.03 + i) * 15;
                        ctx.strokeStyle = this.getIridescentColor(a.iriShift, alpha);
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.quadraticCurveTo(mx, my, b.x, b.y);
                        ctx.stroke();
                    } else {
                        // Light bridge (thick glow)
                        ctx.strokeStyle = this.getIridescentColor((a.iriShift + b.iriShift) / 2, alpha * 0.5);
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }
            ctx.globalCompositeOperation = 'source-over';
        }

        // Draw pop particles
        if (this.popParticles.length > 0) {
            ctx.globalCompositeOperation = 'lighter';
            for (const p of this.popParticles) {
                ctx.fillStyle = this.getIridescentColor(p.hue, p.life * 0.8);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        }
    }
}
