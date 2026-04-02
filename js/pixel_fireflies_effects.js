/**
 * @file pixel_fireflies_effects.js
 * @description Emergent flocking fireflies that leave phosphorescent trails which
 * fade slowly. Fireflies exhibit curiosity toward the cursor, scatter on click,
 * and synchronize their blinking patterns over time (like real fireflies).
 *
 * Modes:
 * 0 - Meadow: Warm yellow-green fireflies with gentle wandering and sync blink
 * 1 - Deep Forest: Cool blue-green bioluminescent bugs with long trailing glow
 * 2 - Swarm Intelligence: Fireflies form shapes and letters by coordinating
 * 3 - Aurora Swarm: Fireflies leave color-shifting aurora-like ribbons
 * 4 - Predator/Prey: Two species - chasers (red) and evaders (blue) with emergent dynamics
 * 5 - Constellation Bugs: Fireflies connect with light threads when near each other
 */

const TAU = Math.PI * 2;

export class PixelFireflies {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 80;
        this.saturation = 70;
        this.intensity = 1;
        this._rng = Math.random;

        this.fireflies = [];
        this.maxFireflies = 120;

        // Phosphorescent trail canvas (offscreen, decays slowly)
        this._trailCanvas = null;
        this._trailCtx = null;
        this._trailW = 0;
        this._trailH = 0;

        this._mouseX = 0;
        this._mouseY = 0;
        this._prevMX = 0;
        this._prevMY = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Sync blink state
        this._globalPhase = 0;
        this._syncStrength = 0;

        // Shape target for mode 2
        this._shapeTargets = null;
        this._shapeIndex = 0;
    }

    configure(rng, palette) {
        this._rng = rng;
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? palette[0].h : (this.mode === 0 ? 80 : Math.floor(rng() * 360));
        this.saturation = 50 + Math.floor(rng() * 40);
        this.intensity = 0.6 + rng() * 0.6;
        this.tick = 0;
        this._syncStrength = 0;
        this._globalPhase = 0;

        const W = window.innerWidth, H = window.innerHeight;

        // Set up trail canvas at half resolution for performance
        this._trailW = Math.ceil(W / 2);
        this._trailH = Math.ceil(H / 2);
        this._trailCanvas = document.createElement('canvas');
        this._trailCanvas.width = this._trailW;
        this._trailCanvas.height = this._trailH;
        this._trailCtx = this._trailCanvas.getContext('2d', { alpha: true });
        this._trailCtx.clearRect(0, 0, this._trailW, this._trailH);

        // Determine firefly count based on mode
        const count = this.mode === 4
            ? 60 + Math.floor(rng() * 40)
            : 80 + Math.floor(rng() * 40);
        this.maxFireflies = count;

        this.fireflies = [];
        for (let i = 0; i < count; i++) {
            const isPredator = this.mode === 4 && i < count * 0.3;
            this.fireflies.push({
                x: rng() * W,
                y: rng() * H,
                vx: (rng() - 0.5) * 2,
                vy: (rng() - 0.5) * 2,
                phase: rng() * TAU,
                blinkSpeed: 0.03 + rng() * 0.04,
                size: isPredator ? 2.5 + rng() * 2 : 1.5 + rng() * 2,
                hueOffset: rng() * 40 - 20,
                brightness: 0,
                isPredator,
                curiosity: 0.3 + rng() * 0.7,
                turnSpeed: 0.05 + rng() * 0.1,
                maxSpeed: isPredator ? 2.5 + rng() : 1.5 + rng() * 1.5,
                targetAngle: rng() * TAU,
                wanderPhase: rng() * TAU,
            });
        }

        // Generate shape targets for mode 2
        if (this.mode === 2) {
            this._generateShapeTargets(rng, W, H, count);
        }
    }

    _generateShapeTargets(rng, W, H, count) {
        const shapes = [];
        const cx = W / 2, cy = H / 2;
        const r = Math.min(W, H) * 0.25;

        // Shape 1: Circle
        const circle = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * TAU;
            circle.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
        }
        shapes.push(circle);

        // Shape 2: Star
        const star = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * TAU;
            const rad = i % 2 === 0 ? r : r * 0.4;
            star.push({ x: cx + Math.cos(angle) * rad, y: cy + Math.sin(angle) * rad });
        }
        shapes.push(star);

        // Shape 3: Spiral
        const spiral = [];
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const angle = t * TAU * 3;
            const rad = t * r;
            spiral.push({ x: cx + Math.cos(angle) * rad, y: cy + Math.sin(angle) * rad });
        }
        shapes.push(spiral);

        // Shape 4: Heart
        const heart = [];
        for (let i = 0; i < count; i++) {
            const t = (i / count) * TAU;
            const hx = 16 * Math.sin(t) ** 3;
            const hy = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
            heart.push({ x: cx + hx * (r / 18), y: cy + hy * (r / 18) });
        }
        shapes.push(heart);

        this._shapeTargets = shapes;
        this._shapeIndex = 0;
    }

    update(mx, my, isClicking) {
        this.tick++;
        const dx = mx - this._prevMX;
        const dy = my - this._prevMY;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._prevMX = this._mouseX;
        this._prevMY = this._mouseY;
        this._mouseX = mx;
        this._mouseY = my;

        // Click scatter
        if (isClicking && !this._wasClicking) {
            for (const f of this.fireflies) {
                const fdx = f.x - mx, fdy = f.y - my;
                const dist = Math.sqrt(fdx * fdx + fdy * fdy) || 1;
                if (dist < 250) {
                    const force = (1 - dist / 250) * 8;
                    f.vx += (fdx / dist) * force;
                    f.vy += (fdy / dist) * force;
                    f.brightness = 1; // Flash on scatter
                }
            }
            // Mode 2: cycle shapes on click
            if (this.mode === 2 && this._shapeTargets) {
                this._shapeIndex = (this._shapeIndex + 1) % this._shapeTargets.length;
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Global sync phase advances
        this._globalPhase += 0.02;
        this._syncStrength = Math.min(1, this._syncStrength + 0.0005);

        const W = window.innerWidth, H = window.innerHeight;

        for (let i = 0; i < this.fireflies.length; i++) {
            const f = this.fireflies[i];

            // Blink: mix individual phase with global sync
            f.phase += f.blinkSpeed;
            const individualBlink = (Math.sin(f.phase) + 1) / 2;
            const syncBlink = (Math.sin(this._globalPhase) + 1) / 2;
            f.brightness = individualBlink * (1 - this._syncStrength) + syncBlink * this._syncStrength;

            // Wander
            f.wanderPhase += 0.02 + this._rng() * 0.01;
            f.targetAngle += Math.sin(f.wanderPhase) * f.turnSpeed;

            // Cursor interaction
            const cmx = mx - f.x, cmy = my - f.y;
            const cDist = Math.sqrt(cmx * cmx + cmy * cmy) || 1;

            if (this.mode === 4 && f.isPredator) {
                // Predators chase nearest prey
                let nearestPrey = null, nearDist = 200;
                for (let j = 0; j < this.fireflies.length; j++) {
                    const other = this.fireflies[j];
                    if (other.isPredator) continue;
                    const pd = Math.sqrt((other.x - f.x) ** 2 + (other.y - f.y) ** 2);
                    if (pd < nearDist) { nearDist = pd; nearestPrey = other; }
                }
                if (nearestPrey) {
                    f.targetAngle = Math.atan2(nearestPrey.y - f.y, nearestPrey.x - f.x);
                }
            } else if (this.mode === 4 && !f.isPredator) {
                // Prey flees nearest predator
                let nearestPred = null, nearDist = 150;
                for (let j = 0; j < this.fireflies.length; j++) {
                    const other = this.fireflies[j];
                    if (!other.isPredator) continue;
                    const pd = Math.sqrt((other.x - f.x) ** 2 + (other.y - f.y) ** 2);
                    if (pd < nearDist) { nearDist = pd; nearestPred = other; }
                }
                if (nearestPred) {
                    f.targetAngle = Math.atan2(f.y - nearestPred.y, f.x - nearestPred.x);
                }
            } else if (this.mode === 2 && this._shapeTargets) {
                // Move toward shape target
                const target = this._shapeTargets[this._shapeIndex][i % this._shapeTargets[this._shapeIndex].length];
                f.targetAngle = Math.atan2(target.y - f.y, target.x - f.x);
                const tdist = Math.sqrt((target.x - f.x) ** 2 + (target.y - f.y) ** 2);
                if (tdist > 5) {
                    f.vx += (target.x - f.x) * 0.01;
                    f.vy += (target.y - f.y) * 0.01;
                }
            } else {
                // Curiosity: gently attracted to cursor
                if (cDist < 200 && !isClicking) {
                    f.targetAngle = Math.atan2(cmy, cmx) * f.curiosity + f.targetAngle * (1 - f.curiosity);
                }
            }

            // Apply steering
            const desiredVX = Math.cos(f.targetAngle) * f.maxSpeed;
            const desiredVY = Math.sin(f.targetAngle) * f.maxSpeed;
            f.vx += (desiredVX - f.vx) * 0.03;
            f.vy += (desiredVY - f.vy) * 0.03;

            // Speed limit
            const spd = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
            if (spd > f.maxSpeed) {
                f.vx = (f.vx / spd) * f.maxSpeed;
                f.vy = (f.vy / spd) * f.maxSpeed;
            }

            f.x += f.vx;
            f.y += f.vy;

            // Wrap
            if (f.x < -10) f.x = W + 10;
            if (f.x > W + 10) f.x = -10;
            if (f.y < -10) f.y = H + 10;
            if (f.y > H + 10) f.y = -10;
        }

        // Update phosphorescent trail (every 2 frames for perf)
        if (this._trailCtx && this.tick % 2 === 0) {
            const tc = this._trailCtx;

            // Resize if needed
            const tw = Math.ceil(W / 2);
            const th = Math.ceil(H / 2);
            if (tw !== this._trailW || th !== this._trailH) {
                this._trailW = tw;
                this._trailH = th;
                this._trailCanvas.width = tw;
                this._trailCanvas.height = th;
            }

            // Fade existing trails
            tc.globalCompositeOperation = 'destination-out';
            tc.fillStyle = this.mode === 1 ? 'rgba(0,0,0,0.01)' : 'rgba(0,0,0,0.03)';
            tc.fillRect(0, 0, this._trailW, this._trailH);

            // Stamp new glow points
            tc.globalCompositeOperation = 'lighter';
            for (const f of this.fireflies) {
                if (f.brightness < 0.2) continue;
                const hue = f.isPredator
                    ? (this.hue + 180) % 360
                    : (this.hue + f.hueOffset + 360) % 360;
                const alpha = f.brightness * 0.15 * this.intensity;
                tc.fillStyle = `hsla(${hue}, ${this.saturation}%, 60%, ${alpha})`;
                tc.beginPath();
                tc.arc(f.x / 2, f.y / 2, f.size * 1.5, 0, TAU);
                tc.fill();
            }
        }
    }

    draw(ctx, system) {
        ctx.save();

        // Draw phosphorescent trail layer
        if (this._trailCanvas && this._trailW > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.6 * this.intensity;
            ctx.drawImage(this._trailCanvas, 0, 0, system.width, system.height);
            ctx.globalAlpha = 1;
        }

        ctx.globalCompositeOperation = 'lighter';

        // Mode 5: constellation connections
        if (this.mode === 5) {
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            let lineAlpha = 0;
            let lineCount = 0;
            for (let i = 0; i < this.fireflies.length; i++) {
                const fi = this.fireflies[i];
                if (fi.brightness < 0.3) continue;
                for (let j = i + 1; j < this.fireflies.length; j++) {
                    const fj = this.fireflies[j];
                    if (fj.brightness < 0.3) continue;
                    const dx = fi.x - fj.x, dy = fi.y - fj.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 6400) { // 80px
                        ctx.moveTo(fi.x, fi.y);
                        ctx.lineTo(fj.x, fj.y);
                        lineAlpha += Math.min(fi.brightness, fj.brightness) * 0.1;
                        lineCount++;
                    }
                }
            }
            if (lineCount > 0) {
                ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 70%, ${lineAlpha / lineCount})`;
                ctx.stroke();
            }
        }

        // Draw each firefly
        for (const f of this.fireflies) {
            if (f.brightness < 0.05) continue;

            const hue = f.isPredator
                ? (this.hue + 180) % 360
                : (this.hue + f.hueOffset + 360) % 360;
            const alpha = f.brightness * 0.5 * this.intensity;
            const lightness = 55 + f.brightness * 35;
            const size = f.size * (0.5 + f.brightness * 0.5);

            // Outer glow
            if (f.brightness > 0.4) {
                const glowAlpha = alpha * 0.25;
                ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, ${lightness}%, ${glowAlpha})`;
                ctx.beginPath();
                ctx.arc(f.x, f.y, size * 4, 0, TAU);
                ctx.fill();
            }

            // Core
            ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, ${lightness}%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(f.x, f.y, size, 0, TAU);
            ctx.fill();

            // Bright center when at peak
            if (f.brightness > 0.8) {
                ctx.fillStyle = `hsla(${hue}, 30%, 95%, ${(f.brightness - 0.8) * 2 * this.intensity})`;
                ctx.beginPath();
                ctx.arc(f.x, f.y, size * 0.4, 0, TAU);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
