/**
 * @file dimensional_rift_architecture.js
 * @description Reality tears / portals that reveal alternate dimensions beneath
 * the surface. Rifts open, breathe, and close with organic animations. Each rift
 * shows a different dimensional aesthetic. Cursor proximity widens rifts, clicks
 * create new tears. Seed controls rift behavior and dimensional appearances.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

const TAU = Math.PI * 2;

export class DimensionalRiftArchitecture extends Architecture {
    constructor() {
        super();
        this.rifts = [];
        this.ambientParticles = [];
        this.dimensionType = 0;
        this.tearStyle = 0;
        this.bgStars = [];
        this.dimensionHue = 0;
        this.crackFragments = [];
        this.glitchLines = [];
        this.maxRifts = 0;
        this.riftSpawnTimer = 0;
    }

    init(system) {
        const rng = system.rng;
        const w = system.width;
        const h = system.height;

        // Dimension type determines what's visible "through" the rifts
        this.dimensionType = Math.floor(rng() * 6);
        // 0 = crystalline lattice, 1 = fire/lava, 2 = void/stars,
        // 3 = geometric wireframe, 4 = organic tendrils, 5 = digital/matrix

        this.tearStyle = Math.floor(rng() * 3);
        // 0 = jagged lightning, 1 = smooth organic, 2 = geometric cracks

        this.dimensionHue = rng() * 360;
        this.maxRifts = 3 + Math.floor(rng() * 4);

        // Background stars for the surface layer
        this.bgStars = [];
        for (let i = 0; i < 100; i++) {
            this.bgStars.push({
                x: rng() * w, y: rng() * h,
                size: rng() * 1.5 + 0.3,
                alpha: rng() * 0.3 + 0.1,
                twinkle: rng() * TAU,
                twinkleSpeed: 0.02 + rng() * 0.04
            });
        }

        // Initial rifts
        const initialCount = 1 + Math.floor(rng() * 3);
        for (let i = 0; i < initialCount; i++) {
            this.spawnRift(rng, w, h);
        }

        // Floating ambient particles (reality debris)
        this.ambientParticles = [];
        for (let i = 0; i < 40 + Math.floor(rng() * 30); i++) {
            this.ambientParticles.push({
                x: rng() * w, y: rng() * h,
                vx: (rng() - 0.5) * 0.3,
                vy: (rng() - 0.5) * 0.3,
                size: 1 + rng() * 3,
                alpha: rng() * 0.5,
                hue: this.dimensionHue + rng() * 60,
                phase: rng() * TAU,
                flickerRate: 0.02 + rng() * 0.06
            });
        }

        // Crack fragments (static decorative lines)
        this.crackFragments = [];
        const crackCount = 5 + Math.floor(rng() * 10);
        for (let i = 0; i < crackCount; i++) {
            const cx = rng() * w;
            const cy = rng() * h;
            const segments = [];
            let px = cx, py = cy;
            const segCount = 3 + Math.floor(rng() * 6);
            for (let j = 0; j < segCount; j++) {
                const angle = rng() * TAU;
                const len = 5 + rng() * 25;
                const nx = px + Math.cos(angle) * len;
                const ny = py + Math.sin(angle) * len;
                segments.push({ x1: px, y1: py, x2: nx, y2: ny });
                px = nx; py = ny;
            }
            this.crackFragments.push({
                segments,
                alpha: 0.05 + rng() * 0.15,
                width: 0.5 + rng() * 1.5,
                pulsePhase: rng() * TAU,
                pulseSpeed: 0.01 + rng() * 0.03
            });
        }
    }

    spawnRift(rng, w, h) {
        // Generate tear path (the shape of the rift)
        const cx = w * 0.15 + rng() * w * 0.7;
        const cy = h * 0.15 + rng() * h * 0.7;
        const length = 60 + rng() * 120;
        const angle = rng() * TAU;
        const points = [];
        const segments = 8 + Math.floor(rng() * 8);

        for (let i = 0; i <= segments; i++) {
            const t = i / segments - 0.5;
            const baseX = cx + Math.cos(angle) * length * t;
            const baseY = cy + Math.sin(angle) * length * t;
            const jitter = (this.tearStyle === 0) ? (rng() - 0.5) * 30 :
                          (this.tearStyle === 1) ? Math.sin(t * Math.PI * 3) * 15 * rng() :
                          0;
            const perpAngle = angle + Math.PI / 2;
            points.push({
                x: baseX + Math.cos(perpAngle) * jitter,
                y: baseY + Math.sin(perpAngle) * jitter
            });
        }

        // Dimensional content particles (what's inside the rift)
        const innerParticles = [];
        for (let i = 0; i < 20 + Math.floor(rng() * 30); i++) {
            innerParticles.push({
                ox: (rng() - 0.5) * length * 0.8,
                oy: (rng() - 0.5) * 40,
                size: 1 + rng() * 4,
                phase: rng() * TAU,
                speed: 0.01 + rng() * 0.04,
                hue: this.dimensionHue + (rng() - 0.5) * 80,
                brightness: 40 + rng() * 40
            });
        }

        this.rifts.push({
            cx, cy, angle, length,
            points,
            width: 0, // starts closed
            maxWidth: 15 + rng() * 35,
            openSpeed: 0.002 + rng() * 0.005,
            breathePhase: rng() * TAU,
            breatheSpeed: 0.008 + rng() * 0.015,
            breatheAmp: 0.1 + rng() * 0.3,
            life: 1.0,
            decayRate: 0.0001 + rng() * 0.0003,
            innerParticles,
            edgeGlowHue: this.dimensionHue + rng() * 40,
            state: 'opening' // opening, stable, closing
        });
    }

    update(system) {
        const rng = system.rng;
        const w = system.width;
        const h = system.height;
        const mx = mouse.x;
        const my = mouse.y;
        const tick = system.tick;
        const isWarp = system.speedMultiplier > 2;
        const isGravity = system.isGravityWell;

        // Rift lifecycle
        for (let i = this.rifts.length - 1; i >= 0; i--) {
            const rift = this.rifts[i];

            if (rift.state === 'opening') {
                rift.width += (rift.maxWidth - rift.width) * 0.02;
                if (rift.width > rift.maxWidth * 0.95) rift.state = 'stable';
            } else if (rift.state === 'stable') {
                rift.life -= rift.decayRate;
                if (rift.life <= 0.1) rift.state = 'closing';
            } else if (rift.state === 'closing') {
                rift.width *= 0.97;
                if (rift.width < 0.5) {
                    this.rifts.splice(i, 1);
                    continue;
                }
            }

            // Breathing animation
            const breathe = 1 + Math.sin(tick * rift.breatheSpeed + rift.breathePhase) * rift.breatheAmp;
            rift.currentWidth = rift.width * breathe * rift.life;

            // Cursor proximity widens rift
            const cdx = mx - rift.cx;
            const cdy = my - rift.cy;
            const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
            if (cdist < 200) {
                rift.currentWidth *= 1 + (1 - cdist / 200) * 0.8;
            }

            // Warp speed destabilizes rifts
            if (isWarp) {
                rift.currentWidth *= 1.5;
                rift.life -= 0.002;
            }

            // Gravity well pulls rift toward cursor
            if (isGravity && cdist < 300) {
                rift.cx += cdx * 0.002;
                rift.cy += cdy * 0.002;
            }
        }

        // Spawn new rifts
        this.riftSpawnTimer++;
        if (this.riftSpawnTimer > 300 + Math.floor(rng() * 200) && this.rifts.length < this.maxRifts) {
            this.spawnRift(rng, w, h);
            this.riftSpawnTimer = 0;
        }

        // Update ambient particles
        for (const p of this.ambientParticles) {
            p.x += p.vx;
            p.y += p.vy;
            // Particles drift toward nearest rift
            let closestRift = null;
            let closestDist = Infinity;
            for (const rift of this.rifts) {
                const dx = rift.cx - p.x;
                const dy = rift.cy - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) { closestDist = dist; closestRift = rift; }
            }
            if (closestRift && closestDist < 200) {
                const dx = closestRift.cx - p.x;
                const dy = closestRift.cy - p.y;
                p.vx += (dx / closestDist) * 0.01;
                p.vy += (dy / closestDist) * 0.01;
            }
            // Wrap
            if (p.x < 0) p.x += w;
            if (p.x > w) p.x -= w;
            if (p.y < 0) p.y += h;
            if (p.y > h) p.y -= h;
            p.vx *= 0.99;
            p.vy *= 0.99;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;

        // Background stars
        for (const star of this.bgStars) {
            const twinkle = 0.5 + 0.5 * Math.sin(tick * star.twinkleSpeed + star.twinkle);
            ctx.fillStyle = `rgba(180, 200, 220, ${star.alpha * twinkle})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, TAU);
            ctx.fill();
        }

        // Crack fragments (surface damage)
        for (const crack of this.crackFragments) {
            const pulse = 0.5 + 0.5 * Math.sin(tick * crack.pulseSpeed + crack.pulsePhase);
            ctx.strokeStyle = `rgba(${this.getDimensionColor()}, ${crack.alpha * pulse})`;
            ctx.lineWidth = crack.width;
            for (const seg of crack.segments) {
                ctx.beginPath();
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
                ctx.stroke();
            }
        }

        // Draw rifts (back to front by width for depth)
        const sortedRifts = [...this.rifts].sort((a, b) => a.currentWidth - b.currentWidth);

        for (const rift of sortedRifts) {
            if (rift.currentWidth < 1) continue;
            this.drawRift(ctx, rift, tick, system);
        }

        // Ambient particles (reality debris)
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.ambientParticles) {
            const flicker = 0.5 + 0.5 * Math.sin(tick * p.flickerRate + p.phase);
            ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.alpha * flicker})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * flicker, 0, TAU);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    drawRift(ctx, rift, tick, system) {
        const cw = rift.currentWidth;
        const perpAngle = rift.angle + Math.PI / 2;

        // Build upper and lower edges of the rift
        const upper = [];
        const lower = [];
        for (const p of rift.points) {
            upper.push({
                x: p.x + Math.cos(perpAngle) * cw * 0.5,
                y: p.y + Math.sin(perpAngle) * cw * 0.5
            });
            lower.push({
                x: p.x - Math.cos(perpAngle) * cw * 0.5,
                y: p.y - Math.sin(perpAngle) * cw * 0.5
            });
        }

        // Rift interior (the other dimension)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(upper[0].x, upper[0].y);
        for (let i = 1; i < upper.length; i++) {
            ctx.lineTo(upper[i].x, upper[i].y);
        }
        for (let i = lower.length - 1; i >= 0; i--) {
            ctx.lineTo(lower[i].x, lower[i].y);
        }
        ctx.closePath();
        ctx.clip();

        // Draw dimension content inside the clipped rift
        this.drawDimensionContent(ctx, rift, tick);

        ctx.restore();

        // Edge glow
        ctx.globalCompositeOperation = 'lighter';
        const edgeColor = `hsla(${rift.edgeGlowHue}, 90%, 60%, `;
        ctx.lineWidth = 3;
        ctx.shadowColor = `hsl(${rift.edgeGlowHue}, 100%, 70%)`;
        ctx.shadowBlur = 15;

        // Upper edge
        ctx.strokeStyle = edgeColor + (0.7 * rift.life) + ')';
        ctx.beginPath();
        ctx.moveTo(upper[0].x, upper[0].y);
        for (let i = 1; i < upper.length; i++) {
            const prev = upper[i - 1];
            const cur = upper[i];
            ctx.lineTo(cur.x, cur.y);
        }
        ctx.stroke();

        // Lower edge
        ctx.beginPath();
        ctx.moveTo(lower[0].x, lower[0].y);
        for (let i = 1; i < lower.length; i++) ctx.lineTo(lower[i].x, lower[i].y);
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Energy wisps escaping from the rift
        for (let i = 0; i < 3; i++) {
            const t = (tick * 0.02 + i * 0.33) % 1;
            const pidx = Math.floor(t * (rift.points.length - 1));
            const p = rift.points[pidx];
            const drift = Math.sin(tick * 0.05 + i) * cw;
            const wx = p.x + Math.cos(perpAngle) * drift;
            const wy = p.y + Math.sin(perpAngle) * drift;
            const wSize = 3 + Math.sin(tick * 0.1 + i) * 2;
            const g = ctx.createRadialGradient(wx, wy, 0, wx, wy, wSize * 3);
            g.addColorStop(0, `hsla(${rift.edgeGlowHue + i * 30}, 100%, 70%, ${0.4 * rift.life})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(wx, wy, wSize * 3, 0, TAU);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    drawDimensionContent(ctx, rift, tick) {
        const hue = this.dimensionHue;

        switch (this.dimensionType) {
            case 0: // Crystalline lattice
                ctx.fillStyle = `hsla(${hue}, 30%, 5%, 1)`;
                ctx.fillRect(rift.cx - rift.length, rift.cy - 50, rift.length * 2, 100);
                for (const p of rift.innerParticles) {
                    const x = rift.cx + p.ox + Math.cos(tick * p.speed + p.phase) * 10;
                    const y = rift.cy + p.oy + Math.sin(tick * p.speed + p.phase) * 5;
                    ctx.strokeStyle = `hsla(${p.hue}, 90%, ${p.brightness}%, 0.6)`;
                    ctx.lineWidth = 0.5;
                    // Crystal shapes
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const a = (TAU / 6) * i + tick * 0.01;
                        const r = p.size * 2;
                        const cx = x + Math.cos(a) * r;
                        const cy = y + Math.sin(a) * r;
                        i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
                    }
                    ctx.closePath();
                    ctx.stroke();
                }
                break;

            case 1: // Fire/lava realm
                ctx.fillStyle = `hsla(0, 50%, 3%, 1)`;
                ctx.fillRect(rift.cx - rift.length, rift.cy - 50, rift.length * 2, 100);
                for (const p of rift.innerParticles) {
                    const x = rift.cx + p.ox;
                    const y = rift.cy + p.oy + Math.sin(tick * 0.03 + p.phase) * 8;
                    const flicker = 0.5 + 0.5 * Math.sin(tick * 0.1 + p.phase);
                    const g = ctx.createRadialGradient(x, y, 0, x, y, p.size * 3);
                    g.addColorStop(0, `hsla(${30 + flicker * 20}, 100%, ${60 + flicker * 20}%, 0.8)`);
                    g.addColorStop(0.5, `hsla(${10}, 100%, 40%, 0.3)`);
                    g.addColorStop(1, 'transparent');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(x, y, p.size * 3, 0, TAU);
                    ctx.fill();
                }
                break;

            case 2: // Void/deep space
                ctx.fillStyle = `rgba(0, 0, 5, 1)`;
                ctx.fillRect(rift.cx - rift.length, rift.cy - 50, rift.length * 2, 100);
                for (const p of rift.innerParticles) {
                    const x = rift.cx + p.ox + Math.cos(tick * 0.005 + p.phase) * 3;
                    const y = rift.cy + p.oy + Math.sin(tick * 0.005 + p.phase) * 3;
                    const tw = 0.3 + 0.7 * Math.pow(Math.sin(tick * p.speed + p.phase) * 0.5 + 0.5, 3);
                    ctx.fillStyle = `rgba(255, 255, 255, ${tw * 0.8})`;
                    ctx.beginPath();
                    ctx.arc(x, y, p.size * 0.5, 0, TAU);
                    ctx.fill();
                }
                break;

            case 3: // Geometric wireframe
                ctx.fillStyle = `hsla(${hue}, 40%, 3%, 1)`;
                ctx.fillRect(rift.cx - rift.length, rift.cy - 50, rift.length * 2, 100);
                ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.4)`;
                ctx.lineWidth = 0.8;
                const gridSize = 20;
                const ox = (tick * 0.5) % gridSize;
                for (let gx = rift.cx - rift.length; gx < rift.cx + rift.length; gx += gridSize) {
                    ctx.beginPath();
                    ctx.moveTo(gx + ox, rift.cy - 50);
                    ctx.lineTo(gx + ox, rift.cy + 50);
                    ctx.stroke();
                }
                for (let gy = rift.cy - 50; gy < rift.cy + 50; gy += gridSize) {
                    ctx.beginPath();
                    ctx.moveTo(rift.cx - rift.length, gy + ox);
                    ctx.lineTo(rift.cx + rift.length, gy + ox);
                    ctx.stroke();
                }
                break;

            case 4: // Organic tendrils
                ctx.fillStyle = `hsla(${hue + 120}, 30%, 3%, 1)`;
                ctx.fillRect(rift.cx - rift.length, rift.cy - 50, rift.length * 2, 100);
                for (const p of rift.innerParticles) {
                    ctx.strokeStyle = `hsla(${p.hue + 120}, 70%, ${p.brightness}%, 0.5)`;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    const startX = rift.cx + p.ox;
                    const startY = rift.cy + p.oy;
                    ctx.moveTo(startX, startY);
                    for (let t = 0; t < 5; t++) {
                        const tx = startX + Math.cos(tick * p.speed + t * 0.8 + p.phase) * (t * 6);
                        const ty = startY + Math.sin(tick * p.speed * 1.3 + t * 0.6 + p.phase) * (t * 4);
                        ctx.lineTo(tx, ty);
                    }
                    ctx.stroke();
                }
                break;

            case 5: // Digital/matrix
                ctx.fillStyle = `rgba(0, 5, 0, 1)`;
                ctx.fillRect(rift.cx - rift.length, rift.cy - 50, rift.length * 2, 100);
                ctx.font = '10px monospace';
                const chars = '01';
                for (const p of rift.innerParticles) {
                    const x = rift.cx + p.ox;
                    const y = rift.cy + p.oy + (tick * p.speed * 30) % 60 - 30;
                    const alpha = 0.3 + 0.5 * Math.sin(tick * 0.05 + p.phase);
                    ctx.fillStyle = `hsla(120, 100%, 60%, ${alpha})`;
                    ctx.fillText(chars[Math.floor(tick * p.speed * 10) % 2], x, y);
                }
                break;
        }
    }

    getDimensionColor() {
        const hue = this.dimensionHue;
        switch (this.dimensionType) {
            case 0: return `${100 + Math.sin(hue) * 50}, ${180 + Math.sin(hue) * 50}, 255`;
            case 1: return '255, 100, 30';
            case 2: return '150, 130, 255';
            case 3: return `100, 200, ${200 + Math.sin(hue) * 55}`;
            case 4: return `80, 200, 100`;
            case 5: return '0, 255, 80';
            default: return '200, 200, 255';
        }
    }
}
