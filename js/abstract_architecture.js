/**
 * @file abstract_architecture.js
 * @description Defines the Abstract architecture with morphing blobs, floating particles,
 * glow halos, blob-to-blob bridges, and interaction with gravity wells and shockwaves.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';
import { createNoise2D } from './simplex_noise.js';

export class AbstractArchitecture extends Architecture {
    constructor() {
        super();
        this.blobs = [];
        this.floatingParticles = [];
        this.noise2D = null;
        this.visualMode = 0;
        this.colorMode = 0;
        this.blobShape = 0;
        this.clickBursts = [];
        this.trailCanvas = null;
        this.trailCtx = null;
    }

    init(system) {
        const rng = system.rng;
        this.noise2D = createNoise2D(Math.floor(rng() * 100000));

        // Seed-driven visual mode: dramatically changes appearance
        this.visualMode = Math.floor(rng() * 5);
        // 0=classic glow, 1=spiky/crystalline, 2=translucent layers, 3=neon outline, 4=watercolor

        // Seed-driven color mode
        this.colorMode = Math.floor(rng() * 4);
        // 0=hue spread, 1=monochromatic, 2=complementary, 3=rainbow cycle

        // Seed-driven blob shape complexity
        this.blobShape = Math.floor(rng() * 3);
        // 0=smooth (12pts), 1=complex (20pts), 2=angular (6pts)
        const pointCounts = [12, 20, 6];
        const pointCount = pointCounts[this.blobShape];

        // Variable blob count per seed (6-16)
        const count = 6 + Math.floor(rng() * 10);

        this.blobs = [];
        for (let i = 0; i < count; i++) {
            const baseRadius = this.visualMode === 1 ? (rng() * 80 + 50) : (rng() * 150 + 100);
            this.blobs.push({
                x: rng() * system.width,
                y: rng() * system.height,
                radius: baseRadius,
                vx: (rng() - 0.5) * 1.5,
                vy: (rng() - 0.5) * 1.5,
                points: Array.from({length: pointCount}, (_, j) => ({
                    angle: (j / pointCount) * Math.PI * 2,
                    offset: rng() * 0.3 + 0.85,
                    baseOffset: rng() * 0.3 + 0.85,
                    speed: rng() * 0.02 + 0.01,
                    phase: rng() * Math.PI * 2
                })),
                hue: this._getBlobHue(system.hue, rng, i, count),
                shockScale: 1.0,
                pulsePhase: rng() * Math.PI * 2,
                pulseSpeed: 0.005 + rng() * 0.02
            });
        }

        // Floating particles - count varies with visual mode
        const particleCount = this.visualMode === 4 ? 80 : 40;
        this.floatingParticles = [];
        for (let i = 0; i < particleCount; i++) {
            this.floatingParticles.push({
                x: rng() * system.width,
                y: rng() * system.height,
                vx: (rng() - 0.5) * 0.4,
                vy: (rng() - 0.5) * 0.4,
                radius: rng() * 2.5 + 1,
                alpha: rng() * 0.3 + 0.1,
                hue: (system.hue + (rng() - 0.5) * 40 + 360) % 360,
                phase: rng() * Math.PI * 2
            });
        }

        // Trail canvas for watercolor mode
        if (this.visualMode === 4) {
            this.trailCanvas = document.createElement('canvas');
            this.trailCanvas.width = system.width;
            this.trailCanvas.height = system.height;
            this.trailCtx = this.trailCanvas.getContext('2d');
        } else {
            this.trailCanvas = null;
        }

        this.clickBursts = [];
    }

    _getBlobHue(baseHue, rng, index, total) {
        switch (this.colorMode) {
            case 0: // Spread (original behavior)
                return (baseHue + (rng() - 0.5) * 100 + 360) % 360;
            case 1: // Monochromatic (subtle variation)
                return (baseHue + (rng() - 0.5) * 20 + 360) % 360;
            case 2: // Complementary (two opposing hues)
                return (baseHue + (index % 2 === 0 ? 0 : 180) + (rng() - 0.5) * 30 + 360) % 360;
            case 3: // Rainbow (evenly spaced)
                return (index / total) * 360;
            default:
                return rng() * 360;
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

        // Blob mitosis: when a blob is fast and there are few blobs, chance to split
        const newBlobs = [];
        this.blobs.forEach(b => {
            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            if (speed > 3 && this.blobs.length + newBlobs.length < 16 && system.rng() < 0.005) {
                // Split into two smaller blobs with opposite velocities
                const halfRadius = b.radius * 0.5;
                b.radius = halfRadius;
                newBlobs.push({
                    x: b.x,
                    y: b.y,
                    radius: halfRadius,
                    vx: -b.vx,
                    vy: -b.vy,
                    points: b.points.map(p => ({
                        angle: p.angle,
                        offset: p.offset,
                        baseOffset: p.baseOffset,
                        speed: p.speed,
                        phase: p.phase
                    })),
                    hue: b.hue,
                    shockScale: 1.0
                });
            }
        });
        if (newBlobs.length > 0) {
            this.blobs.push(...newBlobs);
        }

        // Color bleeding: when two blobs are within connectDist, interpolate hues
        for (let i = 0; i < this.blobs.length; i++) {
            for (let j = i + 1; j < this.blobs.length; j++) {
                const a = this.blobs[i];
                const bB = this.blobs[j];
                const cdx = a.x - bB.x;
                const cdy = a.y - bB.y;
                const dist = Math.sqrt(cdx * cdx + cdy * cdy);
                const connectDist = (a.radius + bB.radius) * 1.5;
                if (dist < connectDist) {
                    // Slowly interpolate hues toward each other (0.1% per frame)
                    const avgHue = (a.hue + bB.hue) / 2;
                    // Handle hue wrapping: find shortest path
                    let diffA = avgHue - a.hue;
                    let diffB = avgHue - bB.hue;
                    if (diffA > 180) diffA -= 360;
                    if (diffA < -180) diffA += 360;
                    if (diffB > 180) diffB -= 360;
                    if (diffB < -180) diffB += 360;
                    a.hue = (a.hue + diffA * 0.001 + 360) % 360;
                    bB.hue = (bB.hue + diffB * 0.001 + 360) % 360;
                }
            }
        }

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
        const qualityScale = system.qualityScale || 1;
        const vm = this.visualMode;

        // Watercolor mode: draw onto trail canvas with persistence
        if (vm === 4 && this.trailCtx) {
            this.trailCtx.globalAlpha = 0.03;
            this.trailCtx.fillStyle = '#000';
            this.trailCtx.fillRect(0, 0, system.width, system.height);
            this.trailCtx.globalAlpha = 1;
        }

        // Draw click bursts
        for (let i = this.clickBursts.length - 1; i >= 0; i--) {
            const burst = this.clickBursts[i];
            burst.life -= 0.015;
            burst.radius += 3;
            if (burst.life <= 0) { this.clickBursts.splice(i, 1); continue; }
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `hsla(${burst.hue}, 80%, 70%, ${burst.life * 0.4})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(burst.x, burst.y, burst.radius, 0, Math.PI * 2);
            ctx.stroke();
            // Inner ring
            ctx.strokeStyle = `hsla(${burst.hue + 30}, 60%, 80%, ${burst.life * 0.2})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(burst.x, burst.y, burst.radius * 0.6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Draw floating particles
        this.floatingParticles.forEach(fp => {
            const flicker = 0.5 + Math.sin(tick * 0.03 + fp.phase) * 0.3;
            ctx.fillStyle = `hsla(${fp.hue}, 60%, 60%, ${fp.alpha * flicker})`;
            ctx.beginPath();
            ctx.arc(fp.x, fp.y, fp.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw morphing blobs
        this.blobs.forEach((b, bi) => {
            b.pulsePhase += b.pulseSpeed;
            const pulse = 1 + Math.sin(b.pulsePhase) * 0.05;
            const h = (b.hue + (this.colorMode === 3 ? tick * 0.3 : Math.sin(tick * 0.005) * 20) + 360) % 360;
            const effectiveRadius = b.radius * b.shockScale * pulse;

            if (vm === 0 || vm === 4) {
                // Classic glow / watercolor mode
                if (qualityScale > 0.4) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.fillStyle = `hsla(${h}, 70%, 50%, 0.06)`;
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, effectiveRadius * 1.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                ctx.fillStyle = `hsla(${h}, 60%, 50%, ${vm === 4 ? 0.04 : 0.08})`;
                ctx.beginPath();
                ctx.arc(b.x, b.y, effectiveRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = `hsla(${h}, 60%, 50%, ${vm === 4 ? 0.08 : 0.15})`;
                ctx.beginPath();
                ctx.arc(b.x, b.y, effectiveRadius * 0.6, 0, Math.PI * 2);
                ctx.fill();
            } else if (vm === 1) {
                // Spiky/crystalline mode - no fill, jagged outline
                ctx.strokeStyle = `hsla(${h}, 80%, 60%, 0.3)`;
                ctx.lineWidth = 1.5;
            } else if (vm === 2) {
                // Translucent layers
                for (let layer = 3; layer >= 0; layer--) {
                    const lr = effectiveRadius * (0.3 + layer * 0.25);
                    ctx.fillStyle = `hsla(${(h + layer * 15) % 360}, 50%, ${40 + layer * 10}%, ${0.05 + layer * 0.02})`;
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, lr, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (vm === 3) {
                // Neon outline - no fill, bright stroke with glow
                ctx.save();
                ctx.shadowColor = `hsla(${h}, 100%, 60%, 0.6)`;
                ctx.shadowBlur = 20;
                ctx.strokeStyle = `hsla(${h}, 100%, 70%, 0.5)`;
                ctx.lineWidth = 2;
            }

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

            // -- Internal vein-like structure --
            const veinCount = 3 + Math.floor(bi * 1.3) % 3; // 3-5 veins per blob
            ctx.save();
            for (let v = 0; v < veinCount; v++) {
                const veinAngle = (v / veinCount) * Math.PI * 2 + bi * 0.7;
                const veinLen = effectiveRadius * 0.7;
                const endX = b.x + Math.cos(veinAngle) * veinLen;
                const endY = b.y + Math.sin(veinAngle) * veinLen;

                // Noise-offset control point for organic curvature
                const noiseVal = this.noise2D(b.x * 0.005 + v, tick * 0.008 + bi);
                const perpAngle = veinAngle + Math.PI / 2;
                const cpOffset = noiseVal * effectiveRadius * 0.3;
                const cpVx = (b.x + endX) / 2 + Math.cos(perpAngle) * cpOffset;
                const cpVy = (b.y + endY) / 2 + Math.sin(perpAngle) * cpOffset;

                const veinAlpha = 0.06 + Math.abs(noiseVal) * 0.04; // 0.06-0.1
                ctx.strokeStyle = `hsla(${h}, 50%, 60%, ${veinAlpha})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(b.x, b.y);
                ctx.quadraticCurveTo(cpVx, cpVy, endX, endY);
                ctx.stroke();
            }
            ctx.restore();

            // -- Glow ring using 'lighter' composite (stroked arc, no gradient) --
            if (qualityScale > 0.5) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = `hsla(${h}, 80%, 60%, 0.06)`;
                ctx.lineWidth = effectiveRadius * 0.15;
                ctx.beginPath();
                ctx.arc(b.x, b.y, effectiveRadius * 0.97, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // Visual mode specific finishing
            if (vm === 1) {
                // Spiky mode: only stroke, no fill
                ctx.stroke();
            } else if (vm === 3) {
                // Neon mode: stroke with glow
                ctx.stroke();
                ctx.restore();
            } else {
                // Subtle outline (alpha 0.2)
                ctx.strokeStyle = `hsla(${h}, 60%, 70%, 0.2)`;
                ctx.lineWidth = 2;
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
            }
        });

        // Watercolor trail composite
        if (vm === 4 && this.trailCanvas) {
            // Draw current blobs onto trail canvas
            for (const b of this.blobs) {
                const h = (b.hue + 360) % 360;
                const r = b.radius * b.shockScale;
                this.trailCtx.fillStyle = `hsla(${h}, 50%, 50%, 0.02)`;
                this.trailCtx.beginPath();
                this.trailCtx.arc(b.x, b.y, r, 0, Math.PI * 2);
                this.trailCtx.fill();
            }
            ctx.globalAlpha = 0.5;
            ctx.drawImage(this.trailCanvas, 0, 0);
            ctx.globalAlpha = 1;
        }

        // -- Blob-to-blob tendril connections: curved lines when close --
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

                    // Pulsing width with sin(tick)
                    const pulse = 1.0 + Math.sin(tick * 0.04) * 0.4;

                    // Control point offset by noise for organic curve
                    const midX = (a.x + bB.x) / 2;
                    const midY = (a.y + bB.y) / 2;
                    const noiseOffset = this.noise2D(midX * 0.01 + tick * 0.005, midY * 0.01) * 60;
                    // Perpendicular direction to the line between blobs
                    const perpX = -(bB.y - a.y) / dist;
                    const perpY = (bB.x - a.x) / dist;
                    const cpX = midX + perpX * noiseOffset;
                    const cpY = midY + perpY * noiseOffset;

                    // Use averaged hue solid color instead of per-bridge gradient
                    const avgHue = (hA + hB) / 2;
                    ctx.strokeStyle = `hsla(${avgHue}, 60%, 55%, ${bridgeAlpha})`;
                    ctx.lineWidth = 1.5 * pulse;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.quadraticCurveTo(cpX, cpY, bB.x, bB.y);
                    ctx.stroke();
                }
            }
        }
    }

    onShockwave(x, y) {
        // Click creates expanding burst ring
        if (this.clickBursts.length < 8) {
            const hue = this.blobs.length > 0 ? this.blobs[0].hue : 0;
            this.clickBursts.push({ x, y, radius: 10, life: 1, hue });
        }
        // Push nearby blobs outward
        for (const b of this.blobs) {
            const dx = b.x - x, dy = b.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < 300) {
                const force = (300 - dist) / 300 * 3;
                b.vx += (dx / dist) * force;
                b.vy += (dy / dist) * force;
                b.shockScale = 1.3;
            }
        }
    }
}
