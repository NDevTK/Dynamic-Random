/**
 * @file dimensional_rift_architecture.js
 * @description Dimensional rift architecture with tears/portals in space showing
 * alternate realities beneath. Features distortion fields, reality bubbles,
 * and particles leaking between dimensions.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class DimensionalRiftArchitecture extends Architecture {
    constructor() {
        super();
        this.rifts = [];
        this.leakParticles = [];
        this.particlePool = [];
        this.distortionField = [];
        this.realityBubbles = [];
        this.tearLines = [];
        this.dimensionHue = 0;
        this.baseHue = 0;
        this.riftStyle = 0;
        this.dimensionType = 0;
    }

    init(system) {
        const rng = system.rng;

        this.baseHue = system.hue;
        this.dimensionHue = (system.hue + 120 + rng() * 120) % 360;
        this.riftStyle = Math.floor(rng() * 4); // 0=jagged tears, 1=circular portals, 2=linear slashes, 3=organic holes
        this.dimensionType = Math.floor(rng() * 4); // What you see "through" the rift

        // Create initial rifts
        this.rifts = [];
        const riftCount = 2 + Math.floor(rng() * 3);
        for (let i = 0; i < riftCount; i++) {
            this._createRift(system, rng() * system.width, rng() * system.height, false);
        }

        // Tear lines across the screen (permanent)
        this.tearLines = [];
        const tearCount = 3 + Math.floor(rng() * 5);
        for (let i = 0; i < tearCount; i++) {
            const points = [];
            let x = rng() * system.width;
            let y = rng() * system.height;
            const segCount = 5 + Math.floor(rng() * 8);
            let angle = rng() * Math.PI * 2;
            for (let j = 0; j < segCount; j++) {
                points.push({ x, y });
                angle += (rng() - 0.5) * 1.5;
                const len = 20 + rng() * 60;
                x += Math.cos(angle) * len;
                y += Math.sin(angle) * len;
            }
            this.tearLines.push({
                points,
                width: 1 + rng() * 3,
                glow: 0.05 + rng() * 0.1,
                pulsePhase: rng() * Math.PI * 2,
                pulseSpeed: 0.01 + rng() * 0.02
            });
        }

        this.leakParticles = [];
        this.particlePool = [];
        this.realityBubbles = [];
        this.distortionField = [];
    }

    _createRift(system, x, y, isTemporary) {
        const rng = system.rng;

        const rift = {
            x, y,
            size: isTemporary ? (20 + rng() * 40) : (40 + rng() * 100),
            rotation: rng() * Math.PI * 2,
            rotSpeed: (rng() - 0.5) * 0.005,
            pulsePhase: rng() * Math.PI * 2,
            pulseSpeed: 0.02 + rng() * 0.03,
            style: this.riftStyle,
            depth: 0.3 + rng() * 0.7,
            edgeVertices: [],
            isTemporary,
            life: isTemporary ? (80 + rng() * 60) : -1,
            maxLife: isTemporary ? 140 : -1,
            innerPattern: rng() * Math.PI * 2,
            flickerPhase: rng() * Math.PI * 2
        };

        // Generate edge shape based on rift style
        if (rift.style === 0) {
            // Jagged tear
            const count = 12 + Math.floor(rng() * 8);
            for (let i = 0; i < count; i++) {
                const t = i / count;
                const angle = t * Math.PI * 2;
                const r = rift.size * (0.3 + rng() * 0.7);
                const jag = (i % 2 === 0) ? 1.3 : 0.6;
                rift.edgeVertices.push({
                    angle, baseR: r * jag,
                    wobbleSpeed: 0.02 + rng() * 0.04,
                    wobbleAmp: 3 + rng() * 8,
                    wobblePhase: rng() * Math.PI * 2
                });
            }
        } else if (rift.style === 1) {
            // Circular portal (smooth with slight wobble)
            const count = 30;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                rift.edgeVertices.push({
                    angle, baseR: rift.size,
                    wobbleSpeed: 0.03 + rng() * 0.02,
                    wobbleAmp: 2 + rng() * 5,
                    wobblePhase: rng() * Math.PI * 2
                });
            }
        } else if (rift.style === 2) {
            // Linear slash
            const hw = rift.size;
            const hh = rift.size * 0.15;
            const count = 16;
            for (let i = 0; i < count; i++) {
                const t = i / count;
                const angle = t * Math.PI * 2;
                const rx = hw, ry = hh;
                const r = (rx * ry) / Math.sqrt(ry * ry * Math.cos(angle) * Math.cos(angle) + rx * rx * Math.sin(angle) * Math.sin(angle));
                rift.edgeVertices.push({
                    angle, baseR: r + (rng() - 0.5) * 8,
                    wobbleSpeed: 0.02 + rng() * 0.03,
                    wobbleAmp: 2 + rng() * 4,
                    wobblePhase: rng() * Math.PI * 2
                });
            }
        } else {
            // Organic hole
            const count = 20;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const r = rift.size * (0.5 + Math.sin(angle * 3) * 0.2 + rng() * 0.3);
                rift.edgeVertices.push({
                    angle, baseR: r,
                    wobbleSpeed: 0.01 + rng() * 0.03,
                    wobbleAmp: 5 + rng() * 10,
                    wobblePhase: rng() * Math.PI * 2
                });
            }
        }

        this.rifts.push(rift);
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;
        const tick = system.tick;

        // Update rifts
        for (let i = this.rifts.length - 1; i >= 0; i--) {
            const rift = this.rifts[i];
            rift.rotation += rift.rotSpeed * system.speedMultiplier;

            if (rift.isTemporary) {
                rift.life--;
                if (rift.life <= 0) {
                    this.rifts.splice(i, 1);
                    continue;
                }
            }

            // Emit leak particles from rift edges
            if (tick % 5 === 0 && this.leakParticles.length < 150) {
                const v = rift.edgeVertices[Math.floor(system.rng() * rift.edgeVertices.length)];
                const wobble = Math.sin(tick * v.wobbleSpeed + v.wobblePhase) * v.wobbleAmp;
                const r = v.baseR + wobble;
                const angle = v.angle + rift.rotation;
                const px = rift.x + Math.cos(angle) * r;
                const py = rift.y + Math.sin(angle) * r;

                let p = this.particlePool.length > 0 ? this.particlePool.pop() : {};
                p.x = px;
                p.y = py;
                p.vx = (Math.cos(angle) * 0.5 + (system.rng() - 0.5)) * 1.5;
                p.vy = (Math.sin(angle) * 0.5 + (system.rng() - 0.5)) * 1.5;
                p.life = 1.0;
                p.decay = 0.01 + system.rng() * 0.02;
                p.size = 1 + system.rng() * 3;
                p.fromDimension = system.rng() > 0.5;
                this.leakParticles.push(p);
            }
        }

        // Shockwave creates temporary rifts
        system.shockwaves.forEach(sw => {
            if (sw.radius < 20 && this.rifts.length < 8) {
                this._createRift(system, sw.x, sw.y, true);
            }
        });

        // Gravity well warps rift edges and pulls particles
        if (system.isGravityWell) {
            for (let i = 0; i < this.rifts.length; i++) {
                const rift = this.rifts[i];
                const dx = mx - rift.x;
                const dy = my - rift.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 400) {
                    rift.rotSpeed += 0.001;
                    rift.x += dx * 0.002;
                    rift.y += dy * 0.002;
                }
            }
        }

        // Update leak particles
        for (let i = this.leakParticles.length - 1; i >= 0; i--) {
            const p = this.leakParticles[i];
            p.x += p.vx * system.speedMultiplier;
            p.y += p.vy * system.speedMultiplier;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= p.decay;

            if (system.isGravityWell) {
                const dx = mx - p.x;
                const dy = my - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 10 && dist < 300) {
                    p.vx += (dx / dist) * 0.3;
                    p.vy += (dy / dist) * 0.3;
                }
            }

            if (p.life <= 0) {
                this.particlePool.push(p);
                this.leakParticles[i] = this.leakParticles[this.leakParticles.length - 1];
                this.leakParticles.pop();
            }
        }

        // Reality bubbles: slowly drifting areas of "other dimension" visibility
        if (tick % 60 === 0 && this.realityBubbles.length < 5 && system.rng() < 0.3) {
            this.realityBubbles.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                size: 0,
                maxSize: 30 + system.rng() * 50,
                growSpeed: 0.3 + system.rng() * 0.5,
                vx: (system.rng() - 0.5) * 0.5,
                vy: (system.rng() - 0.5) * 0.5,
                life: 1.0,
                decay: 0.002 + system.rng() * 0.003
            });
        }
        for (let i = this.realityBubbles.length - 1; i >= 0; i--) {
            const b = this.realityBubbles[i];
            b.x += b.vx;
            b.y += b.vy;
            if (b.size < b.maxSize) b.size += b.growSpeed;
            else b.life -= b.decay;
            if (b.life <= 0) this.realityBubbles.splice(i, 1);
        }
    }

    _drawDimensionContent(ctx, x, y, size, tick, dimType, hue) {
        // Draw what's visible "through" the rift
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.clip();

        switch (dimType) {
            case 0: {
                // Starfield from another dimension
                const starCount = Math.floor(size * 0.5);
                ctx.fillStyle = `hsla(${hue}, 60%, 5%, 0.8)`;
                ctx.fillRect(x - size, y - size, size * 2, size * 2);
                for (let i = 0; i < starCount; i++) {
                    const sx = x + Math.sin(i * 1.618 + tick * 0.01) * size * 0.9;
                    const sy = y + Math.cos(i * 2.718 + tick * 0.008) * size * 0.9;
                    const bright = 0.3 + Math.sin(tick * 0.05 + i * 3) * 0.7;
                    ctx.fillStyle = `hsla(${(hue + i * 30) % 360}, 80%, 70%, ${bright})`;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 1 + Math.sin(i) * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }
            case 1: {
                // Pulsing geometric grid
                ctx.strokeStyle = `hsla(${hue}, 80%, 50%, 0.3)`;
                ctx.lineWidth = 1;
                const gridSize = 20;
                const offset = tick * 0.5;
                for (let gx = -size; gx < size; gx += gridSize) {
                    ctx.beginPath();
                    ctx.moveTo(x + gx, y - size);
                    ctx.lineTo(x + gx, y + size);
                    ctx.stroke();
                }
                for (let gy = -size; gy < size; gy += gridSize) {
                    ctx.beginPath();
                    ctx.moveTo(x - size, y + gy + (offset % gridSize));
                    ctx.lineTo(x + size, y + gy + (offset % gridSize));
                    ctx.stroke();
                }
                break;
            }
            case 2: {
                // Swirling void
                const spiralCount = 3;
                for (let s = 0; s < spiralCount; s++) {
                    ctx.strokeStyle = `hsla(${(hue + s * 40) % 360}, 80%, 50%, 0.2)`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    for (let a = 0; a < Math.PI * 6; a += 0.1) {
                        const r = (a / (Math.PI * 6)) * size;
                        const px = x + Math.cos(a + tick * 0.02 + s * (Math.PI * 2 / spiralCount)) * r;
                        const py = y + Math.sin(a + tick * 0.02 + s * (Math.PI * 2 / spiralCount)) * r;
                        if (a === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.stroke();
                }
                break;
            }
            case 3: {
                // Organic pulsing mass
                const blobCount = 5;
                for (let b = 0; b < blobCount; b++) {
                    const bx = x + Math.sin(tick * 0.01 + b * 2) * size * 0.5;
                    const by = y + Math.cos(tick * 0.013 + b * 3) * size * 0.5;
                    const br = 10 + Math.sin(tick * 0.03 + b) * 5 + size * 0.2;
                    const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
                    grad.addColorStop(0, `hsla(${(hue + b * 25) % 360}, 70%, 40%, 0.4)`);
                    grad.addColorStop(1, 'transparent');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(bx, by, br, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }
        }

        ctx.restore();
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;

        // Draw tear lines
        for (let i = 0; i < this.tearLines.length; i++) {
            const tear = this.tearLines[i];
            const pulse = Math.sin(tick * tear.pulseSpeed + tear.pulsePhase) * 0.5 + 0.5;

            // Glow behind tear
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `hsla(${this.dimensionHue}, 80%, 60%, ${tear.glow * pulse})`;
            ctx.lineWidth = tear.width * 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (let j = 0; j < tear.points.length; j++) {
                const p = tear.points[j];
                if (j === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
            ctx.restore();

            // Sharp white crack line
            ctx.strokeStyle = `rgba(200, 220, 255, ${0.1 + pulse * 0.15})`;
            ctx.lineWidth = tear.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (let j = 0; j < tear.points.length; j++) {
                const p = tear.points[j];
                if (j === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
        }

        // Draw reality bubbles
        for (let i = 0; i < this.realityBubbles.length; i++) {
            const b = this.realityBubbles[i];
            const alpha = Math.min(1, b.life, b.size / b.maxSize);
            ctx.save();
            ctx.globalAlpha = alpha * 0.6;
            this._drawDimensionContent(ctx, b.x, b.y, b.size, tick, this.dimensionType, this.dimensionHue);
            ctx.globalAlpha = 1;

            // Edge glow
            ctx.globalCompositeOperation = 'lighter';
            const grad = ctx.createRadialGradient(b.x, b.y, b.size * 0.8, b.x, b.y, b.size);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.8, `hsla(${this.dimensionHue}, 80%, 60%, ${alpha * 0.15})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw rifts
        for (let ri = 0; ri < this.rifts.length; ri++) {
            const rift = this.rifts[ri];
            const lifeAlpha = rift.isTemporary ? Math.min(1, rift.life / 30, (rift.maxLife - (rift.maxLife - rift.life)) / 30) : 1;
            const pulse = Math.sin(tick * rift.pulseSpeed + rift.pulsePhase) * 0.15 + 0.85;

            // Build rift shape path
            ctx.save();
            ctx.translate(rift.x, rift.y);
            ctx.rotate(rift.rotation);

            const path = new Path2D();
            for (let vi = 0; vi < rift.edgeVertices.length; vi++) {
                const v = rift.edgeVertices[vi];
                const wobble = Math.sin(tick * v.wobbleSpeed + v.wobblePhase) * v.wobbleAmp;
                const r = (v.baseR + wobble) * pulse;
                const px = Math.cos(v.angle) * r;
                const py = Math.sin(v.angle) * r;
                if (vi === 0) path.moveTo(px, py);
                else path.lineTo(px, py);
            }
            path.closePath();

            // Dimension content visible through rift
            ctx.save();
            ctx.clip(path);
            ctx.rotate(-rift.rotation);
            ctx.translate(-rift.x, -rift.y);
            ctx.globalAlpha = lifeAlpha * 0.7;
            this._drawDimensionContent(ctx, rift.x, rift.y, rift.size, tick, this.dimensionType, this.dimensionHue);
            ctx.restore();

            // Rift edge glow
            ctx.globalCompositeOperation = 'lighter';
            const flicker = Math.sin(tick * 0.1 + rift.flickerPhase) * 0.2 + 0.8;
            ctx.strokeStyle = `hsla(${this.dimensionHue}, 90%, 70%, ${0.4 * lifeAlpha * flicker})`;
            ctx.lineWidth = 3;
            ctx.stroke(path);

            // Outer glow
            ctx.strokeStyle = `hsla(${this.dimensionHue}, 80%, 50%, ${0.15 * lifeAlpha * flicker})`;
            ctx.lineWidth = 8;
            ctx.stroke(path);

            // Inner edge highlight
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 * lifeAlpha * flicker})`;
            ctx.lineWidth = 1;
            ctx.stroke(path);

            ctx.restore();
        }

        // Draw leak particles
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < this.leakParticles.length; i++) {
            const p = this.leakParticles[i];
            const hue = p.fromDimension ? this.dimensionHue : this.baseHue;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
            grad.addColorStop(0, `hsla(${hue}, 80%, 70%, ${p.life * 0.5})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
