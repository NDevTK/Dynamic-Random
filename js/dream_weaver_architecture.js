/**
 * @file dream_weaver_architecture.js
 * @description Surreal dreamscape with floating impossible geometry, morphing light
 * pillars, drifting thought-bubbles, and seed-driven surreal landscapes. The mouse
 * acts as a "dreamer's focus" — nearby shapes sharpen and intensify, distant ones
 * blur and dissolve. Each seed creates a radically different dream: some are serene
 * with floating islands and aurora threads, others are chaotic with recursive
 * staircases and impossible waterfalls. Click to "lucid dream" — temporarily
 * gain control and shapes orbit the cursor.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class DreamWeaverArchitecture extends Architecture {
    constructor() {
        super();
        this.shapes = [];
        this.lightPillars = [];
        this.thoughtBubbles = [];
        this.bubblePool = [];
        this.threads = [];
        this.dreamStyle = 0;
        this.tick = 0;
        this.baseHue = 0;
        this.lucidMode = false;
        this.lucidTimer = 0;
        this.floatingIslands = [];
        this.starfield = [];
    }

    init(system) {
        const rng = system.rng;
        const w = system.width;
        const h = system.height;

        this.tick = 0;
        this.baseHue = system.hue;
        this.shapes = [];
        this.lightPillars = [];
        this.thoughtBubbles = [];
        this.bubblePool = [];
        this.threads = [];
        this.floatingIslands = [];
        this.starfield = [];
        this.lucidMode = false;
        this.lucidTimer = 0;

        // 0=serene, 1=surreal, 2=cosmic, 3=underwater, 4=geometric
        this.dreamStyle = Math.floor(rng() * 5);
        this.hasMoon = rng() > 0.5;
        this.moonX = w * (0.2 + rng() * 0.6);
        this.moonY = h * (0.1 + rng() * 0.3);
        this.moonRadius = 30 + rng() * 50;
        this.moonHue = (this.baseHue + 180 + rng() * 40) % 360;
        this.driftSpeed = 0.2 + rng() * 0.8;
        this.depthLayers = 3 + Math.floor(rng() * 4);
        this.colorShift = rng() > 0.4;
        this.hasGrid = rng() > 0.7;
        this.gridSpacing = 40 + rng() * 80;

        // Floating impossible shapes
        const shapeCount = 5 + Math.floor(rng() * 10);
        const shapeTypes = ['triangle', 'penrose', 'cube', 'torus', 'mobius', 'spiral', 'hexagon', 'star'];
        for (let i = 0; i < shapeCount; i++) {
            const layer = Math.floor(rng() * this.depthLayers);
            const depthScale = 0.3 + (layer / this.depthLayers) * 0.7;
            this.shapes.push({
                x: rng() * w,
                y: rng() * h,
                vx: (rng() - 0.5) * this.driftSpeed * depthScale,
                vy: (rng() - 0.5) * this.driftSpeed * depthScale * 0.5 - 0.1,
                size: (20 + rng() * 60) * depthScale,
                type: shapeTypes[Math.floor(rng() * shapeTypes.length)],
                rotation: rng() * Math.PI * 2,
                rotSpeed: (rng() - 0.5) * 0.02,
                hue: (this.baseHue + rng() * 120) % 360,
                saturation: 40 + rng() * 50,
                lightness: 40 + rng() * 30,
                alpha: (0.1 + rng() * 0.4) * depthScale,
                layer,
                pulsePhase: rng() * Math.PI * 2,
                pulseSpeed: 0.01 + rng() * 0.03,
                wobble: rng() * 0.5,
            });
        }

        // Light pillars
        const pillarCount = 2 + Math.floor(rng() * 5);
        for (let i = 0; i < pillarCount; i++) {
            this.lightPillars.push({
                x: rng() * w,
                width: 2 + rng() * 8,
                hue: (this.baseHue + i * 30 + rng() * 20) % 360,
                alpha: 0.05 + rng() * 0.15,
                speed: (rng() - 0.5) * 0.3,
                waviness: rng() * 20,
                waveSpeed: 0.005 + rng() * 0.015,
                height: h * (0.4 + rng() * 0.6),
                y: rng() * h * 0.3,
            });
        }

        // Floating islands (serene/cosmic style)
        if (this.dreamStyle === 0 || this.dreamStyle === 2) {
            const islandCount = 2 + Math.floor(rng() * 4);
            for (let i = 0; i < islandCount; i++) {
                this.floatingIslands.push({
                    x: rng() * w,
                    y: h * (0.3 + rng() * 0.5),
                    width: 60 + rng() * 150,
                    height: 15 + rng() * 40,
                    hue: (this.baseHue + rng() * 40) % 360,
                    vx: (rng() - 0.5) * 0.15,
                    bobPhase: rng() * Math.PI * 2,
                    bobSpeed: 0.005 + rng() * 0.01,
                    bobAmount: 3 + rng() * 8,
                    hasTree: rng() > 0.4,
                    treeHeight: 20 + rng() * 40,
                    hasWaterfall: rng() > 0.6,
                    waterfallX: rng(),
                });
            }
        }

        // Background starfield
        const starCount = 80 + Math.floor(rng() * 120);
        for (let i = 0; i < starCount; i++) {
            this.starfield.push({
                x: rng() * w,
                y: rng() * h,
                size: rng() * 1.5 + 0.3,
                alpha: rng() * 0.5 + 0.1,
                twinkle: rng() * Math.PI * 2,
                twinkleSpeed: 0.02 + rng() * 0.05,
            });
        }

        // Aurora threads
        const threadCount = 3 + Math.floor(rng() * 6);
        for (let i = 0; i < threadCount; i++) {
            this.threads.push({
                y: h * (0.1 + rng() * 0.5),
                amplitude: 20 + rng() * 60,
                frequency: 0.002 + rng() * 0.006,
                speed: 0.003 + rng() * 0.01,
                hue: (this.baseHue + i * 25) % 360,
                alpha: 0.03 + rng() * 0.08,
                thickness: 30 + rng() * 80,
                phaseOffset: rng() * 100,
            });
        }
    }

    update(system) {
        this.tick++;
        const w = system.width;
        const h = system.height;
        const mx = mouse.x;
        const my = mouse.y;

        // Lucid mode decay
        if (this.lucidMode) {
            this.lucidTimer--;
            if (this.lucidTimer <= 0) this.lucidMode = false;
        }

        // Update shapes
        for (const shape of this.shapes) {
            if (this.lucidMode) {
                // In lucid mode shapes orbit the cursor
                const dx = mx - shape.x;
                const dy = my - shape.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const orbitForce = 0.5 / (dist + 50);
                shape.vx += dx * orbitForce - shape.vy * 0.01;
                shape.vy += dy * orbitForce + shape.vx * 0.01;
                shape.vx *= 0.98;
                shape.vy *= 0.98;
            }

            shape.x += shape.vx;
            shape.y += shape.vy;
            shape.rotation += shape.rotSpeed;

            // Wrap around
            if (shape.x < -shape.size) shape.x = w + shape.size;
            if (shape.x > w + shape.size) shape.x = -shape.size;
            if (shape.y < -shape.size) shape.y = h + shape.size;
            if (shape.y > h + shape.size) shape.y = -shape.size;

            // Mouse proximity effect: shapes near cursor intensify
            const dx = mx - shape.x;
            const dy = my - shape.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            shape._intensity = Math.max(0.3, 1 - dist / 400);
        }

        // Update light pillars
        for (const pillar of this.lightPillars) {
            pillar.x += pillar.speed;
            if (pillar.x < -50) pillar.x = w + 50;
            if (pillar.x > w + 50) pillar.x = -50;
        }

        // Update floating islands
        for (const island of this.floatingIslands) {
            island.x += island.vx;
            if (island.x < -island.width) island.x = w + island.width;
            if (island.x > w + island.width) island.x = -island.width;
        }

        // Spawn thought bubbles occasionally
        if (this.tick % 30 === 0 && this.thoughtBubbles.length < 20) {
            const bubble = this.bubblePool.length > 0 ? this.bubblePool.pop() : {};
            bubble.x = Math.random() * w;
            bubble.y = h + 20;
            bubble.radius = 5 + Math.random() * 20;
            bubble.vy = -(0.3 + Math.random() * 0.8);
            bubble.vx = (Math.random() - 0.5) * 0.3;
            bubble.alpha = 0.1 + Math.random() * 0.2;
            bubble.hue = (this.baseHue + Math.random() * 60) % 360;
            bubble.wobblePhase = Math.random() * Math.PI * 2;
            this.thoughtBubbles.push(bubble);
        }

        for (let i = this.thoughtBubbles.length - 1; i >= 0; i--) {
            const b = this.thoughtBubbles[i];
            b.y += b.vy;
            b.x += b.vx + Math.sin(this.tick * 0.02 + b.wobblePhase) * 0.3;
            b.alpha *= 0.998;
            if (b.y < -50 || b.alpha < 0.01) {
                this.bubblePool.push(b);
                this.thoughtBubbles[i] = this.thoughtBubbles[this.thoughtBubbles.length - 1];
                this.thoughtBubbles.pop();
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const w = system.width;
        const h = system.height;

        // Dreamy background gradient overlay
        const bgHue = this.colorShift ? (this.baseHue + this.tick * 0.05) % 360 : this.baseHue;
        const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
        bgGrad.addColorStop(0, `hsla(${bgHue}, 40%, 8%, 0.05)`);
        bgGrad.addColorStop(1, `hsla(${(bgHue + 60) % 360}, 30%, 3%, 0.03)`);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Starfield
        for (const star of this.starfield) {
            const twinkle = Math.sin(this.tick * star.twinkleSpeed + star.twinkle) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * twinkle})`;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }

        // Subtle grid (geometric dream style)
        if (this.hasGrid) {
            ctx.strokeStyle = `hsla(${this.baseHue}, 30%, 40%, 0.03)`;
            ctx.lineWidth = 0.5;
            const offset = (this.tick * 0.2) % this.gridSpacing;
            ctx.beginPath();
            for (let x = -offset; x < w + this.gridSpacing; x += this.gridSpacing) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
            }
            for (let y = -offset; y < h + this.gridSpacing; y += this.gridSpacing) {
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
            }
            ctx.stroke();
        }

        // Aurora threads
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const thread of this.threads) {
            const gradient = ctx.createLinearGradient(0, thread.y - thread.thickness, 0, thread.y + thread.thickness);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.5, `hsla(${(thread.hue + this.tick * 0.1) % 360}, 70%, 50%, ${thread.alpha})`);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(0, thread.y + thread.thickness);
            for (let x = 0; x <= w; x += 8) {
                const wave = Math.sin(x * thread.frequency + this.tick * thread.speed + thread.phaseOffset) * thread.amplitude;
                ctx.lineTo(x, thread.y + wave);
            }
            ctx.lineTo(w, thread.y + thread.thickness);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // Moon
        if (this.hasMoon) {
            const moonGlow = ctx.createRadialGradient(
                this.moonX, this.moonY, this.moonRadius * 0.8,
                this.moonX, this.moonY, this.moonRadius * 3
            );
            moonGlow.addColorStop(0, `hsla(${this.moonHue}, 20%, 80%, 0.15)`);
            moonGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = moonGlow;
            ctx.beginPath();
            ctx.arc(this.moonX, this.moonY, this.moonRadius * 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `hsla(${this.moonHue}, 15%, 85%, 0.3)`;
            ctx.beginPath();
            ctx.arc(this.moonX, this.moonY, this.moonRadius, 0, Math.PI * 2);
            ctx.fill();

            // Crescent shadow
            ctx.fillStyle = `hsla(${this.moonHue}, 50%, 5%, 0.5)`;
            ctx.beginPath();
            ctx.arc(this.moonX + this.moonRadius * 0.3, this.moonY - this.moonRadius * 0.1, this.moonRadius * 0.85, 0, Math.PI * 2);
            ctx.fill();
        }

        // Light pillars
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const pillar of this.lightPillars) {
            const wave = Math.sin(this.tick * pillar.waveSpeed) * pillar.waviness;
            const gradient = ctx.createLinearGradient(pillar.x + wave, pillar.y, pillar.x + wave, pillar.y + pillar.height);
            gradient.addColorStop(0, `hsla(${pillar.hue}, 70%, 70%, ${pillar.alpha})`);
            gradient.addColorStop(0.5, `hsla(${pillar.hue}, 60%, 50%, ${pillar.alpha * 0.5})`);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(pillar.x + wave - pillar.width / 2, pillar.y, pillar.width, pillar.height);
        }
        ctx.restore();

        // Floating islands
        for (const island of this.floatingIslands) {
            const bob = Math.sin(this.tick * island.bobSpeed + island.bobPhase) * island.bobAmount;
            const iy = island.y + bob;

            // Island shadow
            ctx.fillStyle = `hsla(${island.hue}, 30%, 10%, 0.1)`;
            ctx.beginPath();
            ctx.ellipse(island.x, iy + island.height + 20, island.width * 0.4, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Underside dripping rock
            ctx.fillStyle = `hsla(${island.hue}, 40%, 25%, 0.4)`;
            ctx.beginPath();
            ctx.moveTo(island.x - island.width / 2, iy);
            ctx.quadraticCurveTo(island.x - island.width * 0.3, iy + island.height * 1.5, island.x, iy + island.height * 2);
            ctx.quadraticCurveTo(island.x + island.width * 0.3, iy + island.height * 1.5, island.x + island.width / 2, iy);
            ctx.fill();

            // Main island body
            ctx.fillStyle = `hsla(${island.hue}, 50%, 35%, 0.5)`;
            ctx.beginPath();
            ctx.ellipse(island.x, iy, island.width / 2, island.height, 0, 0, Math.PI * 2);
            ctx.fill();

            // Grass on top
            ctx.fillStyle = `hsla(${(island.hue + 80) % 360}, 60%, 40%, 0.4)`;
            ctx.beginPath();
            ctx.ellipse(island.x, iy - island.height * 0.3, island.width / 2, island.height * 0.4, 0, Math.PI, Math.PI * 2);
            ctx.fill();

            // Tree
            if (island.hasTree) {
                const tx = island.x - island.width * 0.1;
                const ty = iy - island.height;
                // Trunk
                ctx.fillStyle = `hsla(${island.hue}, 30%, 25%, 0.4)`;
                ctx.fillRect(tx - 2, ty - island.treeHeight, 4, island.treeHeight);
                // Canopy
                ctx.fillStyle = `hsla(${(island.hue + 100) % 360}, 50%, 30%, 0.35)`;
                ctx.beginPath();
                ctx.arc(tx, ty - island.treeHeight - 10, 12 + island.treeHeight * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Waterfall
            if (island.hasWaterfall) {
                const wfx = island.x + (island.waterfallX - 0.5) * island.width * 0.5;
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = `hsla(${(island.hue + 180) % 360}, 50%, 70%, 0.15)`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(wfx, iy);
                const fallHeight = 60 + island.height;
                for (let fy = 0; fy < fallHeight; fy += 3) {
                    const wobble = Math.sin(this.tick * 0.05 + fy * 0.1) * 2;
                    ctx.lineTo(wfx + wobble, iy + fy);
                }
                ctx.stroke();
                ctx.restore();
            }
        }

        // Floating shapes
        for (const shape of this.shapes) {
            const intensity = shape._intensity || 0.5;
            const alpha = shape.alpha * intensity;
            const pulse = Math.sin(this.tick * shape.pulseSpeed + shape.pulsePhase) * 0.2 + 1;
            const size = shape.size * pulse;

            ctx.save();
            ctx.translate(shape.x, shape.y);
            ctx.rotate(shape.rotation);
            ctx.globalAlpha = alpha;

            const hue = this.colorShift ? (shape.hue + this.tick * 0.1) % 360 : shape.hue;
            ctx.strokeStyle = `hsla(${hue}, ${shape.saturation}%, ${shape.lightness}%, 1)`;
            ctx.fillStyle = `hsla(${hue}, ${shape.saturation}%, ${shape.lightness}%, 0.1)`;
            ctx.lineWidth = 1.5;

            this._drawShape(ctx, shape.type, size);

            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // Thought bubbles
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const b of this.thoughtBubbles) {
            ctx.strokeStyle = `hsla(${b.hue}, 50%, 70%, ${b.alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        // Lucid mode indicator
        if (this.lucidMode) {
            const luAlpha = Math.min(0.3, this.lucidTimer / 100);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const luGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 200);
            luGrad.addColorStop(0, `hsla(${this.baseHue}, 80%, 70%, ${luAlpha})`);
            luGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = luGrad;
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 200, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    _drawShape(ctx, type, size) {
        const s = size / 2;
        switch (type) {
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.lineTo(-s * 0.866, s * 0.5);
                ctx.lineTo(s * 0.866, s * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'penrose':
                // Impossible triangle illusion
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.lineTo(-s, s * 0.6);
                ctx.lineTo(-s * 0.6, s * 0.6);
                ctx.lineTo(-s * 0.1, -s * 0.2);
                ctx.lineTo(s * 0.4, s * 0.6);
                ctx.lineTo(s, s * 0.6);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Inner triangle offset
                ctx.beginPath();
                ctx.moveTo(0, -s * 0.4);
                ctx.lineTo(-s * 0.35, s * 0.2);
                ctx.lineTo(s * 0.35, s * 0.2);
                ctx.closePath();
                ctx.stroke();
                break;

            case 'cube':
                // Isometric cube
                const cs = s * 0.5;
                ctx.beginPath();
                // Front face
                ctx.moveTo(0, -cs);
                ctx.lineTo(-cs, 0);
                ctx.lineTo(0, cs);
                ctx.lineTo(cs, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Top face
                ctx.beginPath();
                ctx.moveTo(0, -cs);
                ctx.lineTo(-cs, -cs * 0.6);
                ctx.lineTo(0, -cs * 1.2);
                ctx.lineTo(cs, -cs * 0.6);
                ctx.closePath();
                ctx.stroke();
                break;

            case 'hexagon':
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
                    const px = Math.cos(angle) * s;
                    const py = Math.sin(angle) * s;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'star':
                ctx.beginPath();
                for (let i = 0; i < 10; i++) {
                    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
                    const r = i % 2 === 0 ? s : s * 0.4;
                    const px = Math.cos(angle) * r;
                    const py = Math.sin(angle) * r;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'spiral':
                ctx.beginPath();
                for (let a = 0; a < Math.PI * 6; a += 0.1) {
                    const r = (a / (Math.PI * 6)) * s;
                    const px = Math.cos(a) * r;
                    const py = Math.sin(a) * r;
                    if (a === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();
                break;

            case 'mobius':
                // Figure-8 / infinity
                ctx.beginPath();
                for (let a = 0; a <= Math.PI * 2; a += 0.05) {
                    const r = s * Math.sin(2 * a) * 0.7;
                    const px = Math.cos(a) * Math.abs(r);
                    const py = Math.sin(a) * r * 0.5;
                    if (a === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();
                break;

            default: // torus
                ctx.beginPath();
                ctx.arc(0, 0, s, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
                ctx.stroke();
                break;
        }
    }
}
