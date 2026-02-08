/**
 * @file abstract_architecture.js
 * @description Defines the Abstract architecture with morphing blobs, floating particles,
 * glow halos, blob-to-blob bridges, and interaction with gravity wells and shockwaves.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class AbstractArchitecture extends Architecture {
    constructor() {
        super();
        this.blobs = [];
        this.floatingParticles = [];
    }

    init(system) {
        this.blobs = [];
        const count = 12;
        for (let i = 0; i < count; i++) {
            this.blobs.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                radius: system.rng() * 150 + 100,
                vx: (system.rng() - 0.5) * 1.5,
                vy: (system.rng() - 0.5) * 1.5,
                points: Array.from({length: 12}, (_, j) => ({
                    angle: (j / 12) * Math.PI * 2,
                    offset: system.rng() * 0.2 + 0.9,
                    baseOffset: system.rng() * 0.2 + 0.9,
                    speed: system.rng() * 0.02 + 0.01,
                    phase: system.rng() * Math.PI * 2
                })),
                hue: (system.hue + (system.rng() - 0.5) * 100 + 360) % 360,
                shockScale: 1.0 // for shockwave expand/contract
            });
        }

        // Floating particles that drift between blobs (replaces splatters)
        this.floatingParticles = [];
        for (let i = 0; i < 40; i++) {
            this.floatingParticles.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                vx: (system.rng() - 0.5) * 0.4,
                vy: (system.rng() - 0.5) * 0.4,
                radius: system.rng() * 2.5 + 1,
                alpha: system.rng() * 0.3 + 0.1,
                hue: (system.hue + (system.rng() - 0.5) * 40 + 360) % 360,
                phase: system.rng() * Math.PI * 2
            });
        }
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;

        this.blobs.forEach(b => {
            b.x += b.vx * system.speedMultiplier;
            b.y += b.vy * system.speedMultiplier;

            // Wrap-around with margin
            const margin = b.radius * 1.5;
            if (b.x < -margin) b.x = system.width + margin;
            else if (b.x > system.width + margin) b.x = -margin;
            if (b.y < -margin) b.y = system.height + margin;
            else if (b.y > system.height + margin) b.y = -margin;

            // Mouse repulsion - increased force (0.5)
            const dx = b.x - mx;
            const dy = b.y - my;
            const distSq = dx * dx + dy * dy;

            if (system.isGravityWell) {
                // Gravity well: blobs deform and stretch toward mouse
                const dist = Math.sqrt(distSq) || 1;
                if (dist < 400) {
                    const pullForce = (400 - dist) / 400;
                    // Slight attraction toward the well
                    b.vx -= (dx / dist) * pullForce * 0.3;
                    b.vy -= (dy / dist) * pullForce * 0.3;

                    // Deform blob points - stretch toward mouse
                    const angleToMouse = Math.atan2(my - b.y, mx - b.x);
                    b.points.forEach(p => {
                        const angleDiff = Math.abs(((p.angle - angleToMouse) + Math.PI) % (Math.PI * 2) - Math.PI);
                        const stretchAmount = (1 - angleDiff / Math.PI) * pullForce * 0.4;
                        p.offset = p.baseOffset + stretchAmount;
                    });
                } else {
                    // Restore offsets when out of range
                    b.points.forEach(p => {
                        p.offset += (p.baseOffset - p.offset) * 0.05;
                    });
                }
            } else {
                // Normal mouse repulsion (force 0.5)
                if (distSq < 90000) { // 300px radius
                    const dist = Math.sqrt(distSq) || 1;
                    const force = (300 - dist) / 300;
                    b.vx += (dx / dist) * force * 0.5;
                    b.vy += (dy / dist) * force * 0.5;
                }
                // Slowly restore offsets
                b.points.forEach(p => {
                    p.offset += (p.baseOffset - p.offset) * 0.05;
                });
            }

            // Shockwave interaction: blobs expand then contract
            if (system.shockwaves) {
                system.shockwaves.forEach(sw => {
                    const sdx = b.x - sw.x;
                    const sdy = b.y - sw.y;
                    const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
                    if (sDist > 1 && Math.abs(sDist - sw.radius) < 80) {
                        const proximity = 1 - Math.abs(sDist - sw.radius) / 80;
                        b.shockScale = 1.0 + proximity * sw.strength * 0.3;
                        // Push blob outward
                        const push = proximity * sw.strength * 2;
                        b.vx += (sdx / sDist) * push;
                        b.vy += (sdy / sDist) * push;
                    }
                });
            }
            // Decay shockScale back to 1.0
            b.shockScale += (1.0 - b.shockScale) * 0.08;

            b.vx *= 0.98;
            b.vy *= 0.98;
        });

        // Update floating particles - drift between blobs
        this.floatingParticles.forEach(fp => {
            // Gentle drift
            fp.phase += 0.01;
            fp.vx += Math.sin(fp.phase) * 0.02;
            fp.vy += Math.cos(fp.phase * 0.7) * 0.02;

            // Attracted gently to nearest blobs
            let nearestDist = Infinity;
            let nearBx = fp.x;
            let nearBy = fp.y;
            this.blobs.forEach(b => {
                const dx = b.x - fp.x;
                const dy = b.y - fp.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < nearestDist) {
                    nearestDist = d;
                    nearBx = b.x;
                    nearBy = b.y;
                }
            });
            if (nearestDist > 50 && nearestDist < 500) {
                const dx = nearBx - fp.x;
                const dy = nearBy - fp.y;
                fp.vx += (dx / nearestDist) * 0.01;
                fp.vy += (dy / nearestDist) * 0.01;
            }

            fp.x += fp.vx * system.speedMultiplier;
            fp.y += fp.vy * system.speedMultiplier;

            fp.vx *= 0.97;
            fp.vy *= 0.97;

            // Wrap
            if (fp.x < -10) fp.x = system.width + 10;
            else if (fp.x > system.width + 10) fp.x = -10;
            if (fp.y < -10) fp.y = system.height + 10;
            else if (fp.y > system.height + 10) fp.y = -10;
        });
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;

        // Draw floating particles (replaces splatters)
        this.floatingParticles.forEach(fp => {
            const flicker = 0.5 + Math.sin(tick * 0.03 + fp.phase) * 0.3;
            ctx.fillStyle = `hsla(${fp.hue}, 60%, 60%, ${fp.alpha * flicker})`;
            ctx.beginPath();
            ctx.arc(fp.x, fp.y, fp.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw morphing blobs
        this.blobs.forEach((b, bi) => {
            const h = (b.hue + Math.sin(tick * 0.005) * 20 + 360) % 360;
            const effectiveRadius = b.radius * b.shockScale;

            // -- Glow halo behind each blob --
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const haloGrad = ctx.createRadialGradient(b.x, b.y, effectiveRadius * 0.5, b.x, b.y, effectiveRadius * 1.4);
            haloGrad.addColorStop(0, `hsla(${h}, 70%, 50%, 0.12)`);
            haloGrad.addColorStop(0.6, `hsla(${h}, 70%, 50%, 0.05)`);
            haloGrad.addColorStop(1, `hsla(${h}, 70%, 50%, 0)`);
            ctx.fillStyle = haloGrad;
            ctx.beginPath();
            ctx.arc(b.x, b.y, effectiveRadius * 1.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // -- Main blob fill gradient (alpha 0.3 center) --
            const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, effectiveRadius);
            grad.addColorStop(0, `hsla(${h}, 60%, 50%, 0.3)`);
            grad.addColorStop(1, `hsla(${h}, 60%, 50%, 0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();

            const computedPoints = [];
            for (let i = 0; i < b.points.length; i++) {
                const p = b.points[i];
                const r = effectiveRadius * (p.offset + Math.sin(tick * p.speed + p.phase) * 0.15);
                const x = b.x + Math.cos(p.angle) * r;
                const y = b.y + Math.sin(p.angle) * r;
                computedPoints.push({ x, y });

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    // Smooth curve between points
                    const prev = computedPoints[i - 1];
                    const cpX = (prev.x + x) / 2;
                    const cpY = (prev.y + y) / 2;
                    ctx.quadraticCurveTo(prev.x, prev.y, cpX, cpY);
                }
            }

            ctx.closePath();
            ctx.fill();

            // -- Glow ring using 'lighter' composite --
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const ringGrad = ctx.createRadialGradient(b.x, b.y, effectiveRadius * 0.85, b.x, b.y, effectiveRadius * 1.1);
            ringGrad.addColorStop(0, `hsla(${h}, 80%, 60%, 0)`);
            ringGrad.addColorStop(0.5, `hsla(${h}, 80%, 60%, 0.08)`);
            ringGrad.addColorStop(1, `hsla(${h}, 80%, 60%, 0)`);
            ctx.fillStyle = ringGrad;
            ctx.beginPath();
            ctx.arc(b.x, b.y, effectiveRadius * 1.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Subtle outline (alpha 0.2)
            ctx.strokeStyle = `hsla(${h}, 60%, 70%, 0.2)`;
            ctx.lineWidth = 2;
            // Re-draw the path for stroke
            ctx.beginPath();
            for (let i = 0; i < computedPoints.length; i++) {
                const pt = computedPoints[i];
                if (i === 0) {
                    ctx.moveTo(pt.x, pt.y);
                } else {
                    const prev = computedPoints[i - 1];
                    const cpX = (prev.x + pt.x) / 2;
                    const cpY = (prev.y + pt.y) / 2;
                    ctx.quadraticCurveTo(prev.x, prev.y, cpX, cpY);
                }
            }
            ctx.closePath();
            ctx.stroke();
        });

        // -- Blob-to-blob bridges: thin gradient line when close --
        for (let i = 0; i < this.blobs.length; i++) {
            for (let j = i + 1; j < this.blobs.length; j++) {
                const a = this.blobs[i];
                const bB = this.blobs[j];
                const dx = a.x - bB.x;
                const dy = a.y - bB.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const connectDist = (a.radius + bB.radius) * 1.5;
                if (dist < connectDist && dist > 0) {
                    const hA = (a.hue + Math.sin(tick * 0.005) * 20 + 360) % 360;
                    const hB = (bB.hue + Math.sin(tick * 0.005) * 20 + 360) % 360;
                    const bridgeAlpha = (1 - dist / connectDist) * 0.25;

                    const bridgeGrad = ctx.createLinearGradient(a.x, a.y, bB.x, bB.y);
                    bridgeGrad.addColorStop(0, `hsla(${hA}, 60%, 55%, ${bridgeAlpha})`);
                    bridgeGrad.addColorStop(0.5, `hsla(${(hA + hB) / 2}, 60%, 55%, ${bridgeAlpha * 0.5})`);
                    bridgeGrad.addColorStop(1, `hsla(${hB}, 60%, 55%, ${bridgeAlpha})`);

                    ctx.strokeStyle = bridgeGrad;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(bB.x, bB.y);
                    ctx.stroke();
                }
            }
        }
    }
}
