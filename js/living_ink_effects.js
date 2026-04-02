/**
 * @file living_ink_effects.js
 * @description Organic ink/paint system that flows, bleeds, and evolves from cursor
 * interactions. Uses simplified fluid-like cellular rules to create living, breathing
 * patterns that feel like painting with magic ink. Each seed creates a completely
 * different ink personality - from delicate watercolors to aggressive splatter.
 *
 * Modes:
 * 0 - Watercolor Bloom: soft, spreading ink that bleeds and blurs like wet watercolor
 * 1 - Calligraphy Flow: flowing brush strokes with pressure-sensitive width
 * 2 - Rorschach Mirror: symmetric ink blots that form Rorschach-like patterns
 * 3 - Splatter Burst: explosive paint splatter on clicks with dripping physics
 * 4 - Vine Growth: organic branching vines that grow from interaction points
 * 5 - Smoke Tendrils: wispy smoke trails that curl and dissipate with fluid motion
 */

export class LivingInk {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.saturation = 70;
        this.intensity = 1;

        this._mouseX = 0;
        this._mouseY = 0;
        this._prevMouseX = 0;
        this._prevMouseY = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._rng = Math.random;

        // Watercolor blobs
        this.blobs = [];
        this.blobPool = [];
        this.maxBlobs = 40;

        // Calligraphy strokes
        this.strokePoints = [];
        this.maxStrokePoints = 80;
        this.brushWidth = 3;
        this.inkFlow = 0.5;

        // Rorschach
        this.rorschachBlots = [];
        this.rorschachPool = [];
        this.maxRorschachBlots = 30;
        this.symmetryAxis = 0; // 0=vertical, 1=horizontal, 2=both

        // Splatter
        this.splatters = [];
        this.splatterPool = [];
        this.maxSplatters = 50;
        this.drips = [];
        this.dripPool = [];
        this.maxDrips = 20;

        // Vine growth
        this.vines = [];
        this.vinePool = [];
        this.maxVines = 15;
        this.vineBranchAngle = 0.4;
        this.vineGrowSpeed = 1.5;

        // Smoke
        this.smokeParticles = [];
        this.smokePool = [];
        this.maxSmoke = 60;
        this.windAngle = 0;
        this.turbulence = 0.5;
    }

    configure(rng, hues) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = hues.length > 0 ? hues[Math.floor(rng() * hues.length)].h : Math.floor(rng() * 360);
        this.saturation = 50 + Math.floor(rng() * 40);
        this.intensity = 0.5 + rng() * 0.8;
        this._rng = rng;

        // Clear all particle arrays
        this.blobs = [];
        this.strokePoints = [];
        this.rorschachBlots = [];
        this.splatters = [];
        this.drips = [];
        this.vines = [];
        this.smokeParticles = [];

        switch (this.mode) {
            case 0: // Watercolor
                this.maxBlobs = 25 + Math.floor(rng() * 25);
                break;
            case 1: // Calligraphy
                this.brushWidth = 2 + rng() * 6;
                this.inkFlow = 0.3 + rng() * 0.5;
                this.maxStrokePoints = 50 + Math.floor(rng() * 60);
                break;
            case 2: // Rorschach
                this.symmetryAxis = Math.floor(rng() * 3);
                this.maxRorschachBlots = 20 + Math.floor(rng() * 20);
                break;
            case 3: // Splatter
                this.maxSplatters = 30 + Math.floor(rng() * 30);
                this.maxDrips = 10 + Math.floor(rng() * 15);
                break;
            case 4: // Vine
                this.vineBranchAngle = 0.2 + rng() * 0.6;
                this.vineGrowSpeed = 1 + rng() * 2;
                this.maxVines = 8 + Math.floor(rng() * 12);
                break;
            case 5: // Smoke
                this.maxSmoke = 40 + Math.floor(rng() * 30);
                this.windAngle = rng() * Math.PI * 2;
                this.turbulence = 0.3 + rng() * 0.7;
                break;
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._prevMouseX = this._mouseX;
        this._prevMouseY = this._mouseY;
        this._mouseX = mx;
        this._mouseY = my;
        this._isClicking = isClicking;

        const dx = mx - this._prevMouseX;
        const dy = my - this._prevMouseY;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);

        switch (this.mode) {
            case 0: this._updateWatercolor(mx, my, isClicking); break;
            case 1: this._updateCalligraphy(mx, my); break;
            case 2: this._updateRorschach(mx, my, isClicking); break;
            case 3: this._updateSplatter(mx, my, isClicking); break;
            case 4: this._updateVines(mx, my, isClicking); break;
            case 5: this._updateSmoke(mx, my, isClicking); break;
        }
    }

    _updateWatercolor(mx, my, isClicking) {
        const rng = this._rng;

        // Spawn blobs based on movement
        const shouldSpawn = isClicking || this._mouseSpeed > 2;
        if (shouldSpawn && this.tick % 3 === 0 && this.blobs.length < this.maxBlobs) {
            const blob = this.blobPool.length > 0 ? this.blobPool.pop() : {};
            blob.x = mx + (rng() - 0.5) * 15;
            blob.y = my + (rng() - 0.5) * 15;
            blob.radius = 5 + rng() * 15;
            blob.targetRadius = blob.radius + 10 + rng() * 30;
            blob.growSpeed = 0.1 + rng() * 0.3;
            blob.life = 1;
            blob.decay = 0.004 + rng() * 0.006;
            blob.hue = (this.hue + (rng() - 0.5) * 30 + 360) % 360;
            blob.wobblePhase = rng() * Math.PI * 2;
            blob.wobbleSpeed = 0.02 + rng() * 0.04;
            blob.wobbleAmp = 0.1 + rng() * 0.2;
            this.blobs.push(blob);
        }

        for (let i = this.blobs.length - 1; i >= 0; i--) {
            const b = this.blobs[i];
            b.radius += (b.targetRadius - b.radius) * b.growSpeed;
            b.wobblePhase += b.wobbleSpeed;
            b.life -= b.decay;
            if (b.life <= 0) {
                this.blobPool.push(b);
                this.blobs[i] = this.blobs[this.blobs.length - 1];
                this.blobs.pop();
            }
        }
    }

    _updateCalligraphy(mx, my) {
        if (this._mouseSpeed > 0.5) {
            this.strokePoints.push({
                x: mx, y: my,
                pressure: Math.min(1, this._mouseSpeed / 15),
                tick: this.tick,
            });
            if (this.strokePoints.length > this.maxStrokePoints) {
                this.strokePoints.shift();
            }
        }

        // Fade out old points
        for (let i = this.strokePoints.length - 1; i >= 0; i--) {
            const age = this.tick - this.strokePoints[i].tick;
            if (age > this.maxStrokePoints * 2) {
                this.strokePoints.splice(i, 1);
            }
        }
    }

    _updateRorschach(mx, my, isClicking) {
        const rng = this._rng;
        const shouldSpawn = isClicking || this._mouseSpeed > 3;

        if (shouldSpawn && this.tick % 2 === 0 && this.rorschachBlots.length < this.maxRorschachBlots) {
            const blot = this.rorschachPool.length > 0 ? this.rorschachPool.pop() : {};
            blot.x = mx + (rng() - 0.5) * 20;
            blot.y = my + (rng() - 0.5) * 20;
            blot.radius = 3 + rng() * 10;
            blot.targetRadius = blot.radius + 5 + rng() * 20;
            blot.life = 1;
            blot.decay = 0.005 + rng() * 0.008;
            blot.distortion = rng() * Math.PI * 2;
            blot.distortionAmp = 0.2 + rng() * 0.5;
            blot.hue = (this.hue + (rng() - 0.5) * 20 + 360) % 360;
            this.rorschachBlots.push(blot);
        }

        for (let i = this.rorschachBlots.length - 1; i >= 0; i--) {
            const b = this.rorschachBlots[i];
            b.radius += (b.targetRadius - b.radius) * 0.1;
            b.life -= b.decay;
            if (b.life <= 0) {
                this.rorschachPool.push(b);
                this.rorschachBlots[i] = this.rorschachBlots[this.rorschachBlots.length - 1];
                this.rorschachBlots.pop();
            }
        }
    }

    _updateSplatter(mx, my, isClicking) {
        const rng = this._rng;

        // Big splatter on click
        if (isClicking && this.tick % 4 === 0) {
            const count = 3 + Math.floor(rng() * 5);
            for (let i = 0; i < count && this.splatters.length < this.maxSplatters; i++) {
                const splat = this.splatterPool.length > 0 ? this.splatterPool.pop() : {};
                const angle = rng() * Math.PI * 2;
                const speed = 2 + rng() * 8;
                splat.x = mx;
                splat.y = my;
                splat.vx = Math.cos(angle) * speed;
                splat.vy = Math.sin(angle) * speed;
                splat.size = 2 + rng() * 6;
                splat.life = 1;
                splat.decay = 0.008 + rng() * 0.012;
                splat.hue = (this.hue + (rng() - 0.5) * 40 + 360) % 360;
                splat.settled = false;
                this.splatters.push(splat);
            }
        }

        // Movement-based small splatters
        if (this._mouseSpeed > 5 && this.tick % 3 === 0 && this.splatters.length < this.maxSplatters) {
            const splat = this.splatterPool.length > 0 ? this.splatterPool.pop() : {};
            splat.x = mx + (rng() - 0.5) * 10;
            splat.y = my + (rng() - 0.5) * 10;
            splat.vx = (rng() - 0.5) * 3;
            splat.vy = (rng() - 0.5) * 3;
            splat.size = 1 + rng() * 3;
            splat.life = 1;
            splat.decay = 0.01 + rng() * 0.01;
            splat.hue = (this.hue + (rng() - 0.5) * 30 + 360) % 360;
            splat.settled = false;
            this.splatters.push(splat);
        }

        for (let i = this.splatters.length - 1; i >= 0; i--) {
            const s = this.splatters[i];
            if (!s.settled) {
                s.x += s.vx;
                s.y += s.vy;
                s.vx *= 0.92;
                s.vy *= 0.92;
                s.vy += 0.05; // Gravity
                if (Math.abs(s.vx) < 0.1 && Math.abs(s.vy) < 0.1) {
                    s.settled = true;
                    // Spawn a drip from settled splatter
                    if (this.drips.length < this.maxDrips && rng() < 0.3) {
                        const drip = this.dripPool.length > 0 ? this.dripPool.pop() : {};
                        drip.x = s.x;
                        drip.y = s.y;
                        drip.startY = s.y;
                        drip.speed = 0.3 + rng() * 0.8;
                        drip.length = 10 + rng() * 40;
                        drip.width = s.size * 0.5;
                        drip.life = 1;
                        drip.decay = 0.005 + rng() * 0.005;
                        drip.hue = s.hue;
                        this.drips.push(drip);
                    }
                }
            }
            s.life -= s.decay;
            if (s.life <= 0) {
                this.splatterPool.push(s);
                this.splatters[i] = this.splatters[this.splatters.length - 1];
                this.splatters.pop();
            }
        }

        // Update drips
        for (let i = this.drips.length - 1; i >= 0; i--) {
            const d = this.drips[i];
            d.y += d.speed;
            d.speed *= 0.998;
            d.life -= d.decay;
            if (d.life <= 0 || d.y - d.startY > d.length) {
                this.dripPool.push(d);
                this.drips[i] = this.drips[this.drips.length - 1];
                this.drips.pop();
            }
        }
    }

    _updateVines(mx, my, isClicking) {
        const rng = this._rng;

        // Spawn new vine on click
        if (isClicking && this.tick % 20 === 0 && this.vines.length < this.maxVines) {
            const vine = this.vinePool.length > 0 ? this.vinePool.pop() : {};
            vine.segments = [{ x: mx, y: my }];
            vine.angle = rng() * Math.PI * 2;
            vine.life = 1;
            vine.decay = 0.003 + rng() * 0.005;
            vine.maxSegments = 20 + Math.floor(rng() * 30);
            vine.thickness = 1 + rng() * 2;
            vine.hue = (this.hue + (rng() - 0.5) * 40 + 360) % 360;
            vine.branches = [];
            vine.growTimer = 0;
            this.vines.push(vine);
        }

        for (let i = this.vines.length - 1; i >= 0; i--) {
            const v = this.vines[i];
            v.growTimer++;

            // Grow main vine
            if (v.growTimer % 3 === 0 && v.segments.length < v.maxSegments && v.life > 0.3) {
                const last = v.segments[v.segments.length - 1];
                // Curve toward light (upward) with wobble
                v.angle += (rng() - 0.5) * this.vineBranchAngle;
                v.angle -= 0.02; // Slight upward bias
                const nx = last.x + Math.cos(v.angle) * this.vineGrowSpeed * 3;
                const ny = last.y + Math.sin(v.angle) * this.vineGrowSpeed * 3;
                v.segments.push({ x: nx, y: ny });

                // Chance to branch
                if (v.segments.length > 5 && rng() < 0.15 && v.branches.length < 4) {
                    const branchAngle = v.angle + (rng() > 0.5 ? 1 : -1) * (0.5 + rng() * 0.8);
                    v.branches.push({
                        startIdx: v.segments.length - 1,
                        segments: [{ x: nx, y: ny }],
                        angle: branchAngle,
                        maxLen: 5 + Math.floor(rng() * 10),
                    });
                }
            }

            // Grow branches
            for (const branch of v.branches) {
                if (v.growTimer % 4 === 0 && branch.segments.length < branch.maxLen) {
                    const last = branch.segments[branch.segments.length - 1];
                    branch.angle += (rng() - 0.5) * 0.3;
                    const nx = last.x + Math.cos(branch.angle) * this.vineGrowSpeed * 2;
                    const ny = last.y + Math.sin(branch.angle) * this.vineGrowSpeed * 2;
                    branch.segments.push({ x: nx, y: ny });
                }
            }

            v.life -= v.decay;
            if (v.life <= 0) {
                this.vinePool.push(v);
                this.vines[i] = this.vines[this.vines.length - 1];
                this.vines.pop();
            }
        }
    }

    _updateSmoke(mx, my, isClicking) {
        const rng = this._rng;

        // Shift wind gently
        this.windAngle += (rng() - 0.5) * 0.02;

        const spawnRate = isClicking ? 3 : (this._mouseSpeed > 2 ? 1 : 0);
        for (let i = 0; i < spawnRate && this.smokeParticles.length < this.maxSmoke; i++) {
            const smoke = this.smokePool.length > 0 ? this.smokePool.pop() : {};
            smoke.x = mx + (rng() - 0.5) * 10;
            smoke.y = my + (rng() - 0.5) * 10;
            smoke.vx = (rng() - 0.5) * 1;
            smoke.vy = -(0.5 + rng() * 1.5); // Rise upward
            smoke.size = 5 + rng() * 10;
            smoke.targetSize = smoke.size + 15 + rng() * 30;
            smoke.life = 1;
            smoke.decay = 0.004 + rng() * 0.006;
            smoke.rotation = rng() * Math.PI * 2;
            smoke.rotSpeed = (rng() - 0.5) * 0.03;
            smoke.hue = (this.hue + (rng() - 0.5) * 20 + 360) % 360;
            smoke.turbPhase = rng() * Math.PI * 2;
            smoke.turbSpeed = 0.03 + rng() * 0.05;
            this.smokeParticles.push(smoke);
        }

        const windX = Math.cos(this.windAngle) * 0.3;
        const windY = Math.sin(this.windAngle) * 0.1;

        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const s = this.smokeParticles[i];
            s.turbPhase += s.turbSpeed;
            s.vx += windX * 0.02 + Math.sin(s.turbPhase) * this.turbulence * 0.05;
            s.vy += windY * 0.02 - 0.01; // Upward buoyancy
            s.vx *= 0.98;
            s.vy *= 0.98;
            s.x += s.vx;
            s.y += s.vy;
            s.rotation += s.rotSpeed;
            s.size += (s.targetSize - s.size) * 0.02;
            s.life -= s.decay;

            if (s.life <= 0) {
                this.smokePool.push(s);
                this.smokeParticles[i] = this.smokeParticles[this.smokeParticles.length - 1];
                this.smokeParticles.pop();
            }
        }
    }

    draw(ctx, system) {
        switch (this.mode) {
            case 0: this._drawWatercolor(ctx); break;
            case 1: this._drawCalligraphy(ctx); break;
            case 2: this._drawRorschach(ctx, system); break;
            case 3: this._drawSplatter(ctx); break;
            case 4: this._drawVines(ctx); break;
            case 5: this._drawSmoke(ctx); break;
        }
    }

    _drawWatercolor(ctx) {
        if (this.blobs.length === 0) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const b of this.blobs) {
            const alpha = b.life * 0.12 * this.intensity;
            const wobble = Math.sin(b.wobblePhase) * b.wobbleAmp;
            const rx = b.radius * (1 + wobble);
            const ry = b.radius * (1 - wobble * 0.5);

            // Soft gradient blob
            const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, Math.max(rx, ry));
            grad.addColorStop(0, `hsla(${b.hue}, ${this.saturation}%, 55%, ${alpha})`);
            grad.addColorStop(0.4, `hsla(${b.hue}, ${this.saturation - 10}%, 50%, ${alpha * 0.6})`);
            grad.addColorStop(0.7, `hsla(${(b.hue + 10) % 360}, ${this.saturation - 20}%, 45%, ${alpha * 0.2})`);
            grad.addColorStop(1, 'transparent');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(b.x, b.y, rx, ry, b.wobblePhase * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawCalligraphy(ctx) {
        if (this.strokePoints.length < 2) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < this.strokePoints.length; i++) {
            const p = this.strokePoints[i];
            const pp = this.strokePoints[i - 1];
            const age = this.tick - p.tick;
            const fadeT = Math.max(0, 1 - age / (this.maxStrokePoints * 2));
            const alpha = fadeT * this.inkFlow * 0.2 * this.intensity;
            if (alpha < 0.005) continue;

            // Width varies with pressure (speed)
            const width = this.brushWidth * (0.3 + p.pressure * 0.7) * (0.5 + fadeT * 0.5);
            const hue = (this.hue + age * 0.3) % 360;

            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 60%, ${alpha})`;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(pp.x, pp.y);
            // Smooth with quadratic curve
            const cpx = (pp.x + p.x) / 2;
            const cpy = (pp.y + p.y) / 2;
            ctx.quadraticCurveTo(pp.x, pp.y, cpx, cpy);
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawRorschach(ctx, system) {
        if (this.rorschachBlots.length === 0) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const w = system.width;
        const h = system.height;
        const cx = w / 2;
        const cy = h / 2;

        for (const b of this.rorschachBlots) {
            const alpha = b.life * 0.1 * this.intensity;
            const r = b.radius;

            // Draw distorted circle using path
            const segments = 12;
            const drawBlot = (bx, by) => {
                ctx.beginPath();
                for (let s = 0; s <= segments; s++) {
                    const a = (s / segments) * Math.PI * 2;
                    const distort = 1 + Math.sin(a * 3 + b.distortion) * b.distortionAmp;
                    const px = bx + Math.cos(a) * r * distort;
                    const py = by + Math.sin(a) * r * distort;
                    if (s === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();

                const grad = ctx.createRadialGradient(bx, by, 0, bx, by, r * 1.5);
                grad.addColorStop(0, `hsla(${b.hue}, ${this.saturation}%, 50%, ${alpha})`);
                grad.addColorStop(0.6, `hsla(${b.hue}, ${this.saturation - 10}%, 40%, ${alpha * 0.4})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fill();
            };

            // Original blot
            drawBlot(b.x, b.y);

            // Mirrored copies based on symmetry axis
            if (this.symmetryAxis === 0 || this.symmetryAxis === 2) {
                // Vertical mirror
                drawBlot(2 * cx - b.x, b.y);
            }
            if (this.symmetryAxis === 1 || this.symmetryAxis === 2) {
                // Horizontal mirror
                drawBlot(b.x, 2 * cy - b.y);
            }
            if (this.symmetryAxis === 2) {
                // Diagonal mirror
                drawBlot(2 * cx - b.x, 2 * cy - b.y);
            }
        }

        ctx.restore();
    }

    _drawSplatter(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw splatters
        for (const s of this.splatters) {
            const alpha = s.life * 0.3 * this.intensity;
            ctx.fillStyle = `hsla(${s.hue}, ${this.saturation}%, 55%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();

            // Outer ring for settled splatters
            if (s.settled) {
                ctx.strokeStyle = `hsla(${s.hue}, ${this.saturation - 10}%, 45%, ${alpha * 0.3})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size * 1.3, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Draw drips
        for (const d of this.drips) {
            const alpha = d.life * 0.25 * this.intensity;
            const currentLen = d.y - d.startY;
            const grad = ctx.createLinearGradient(d.x, d.startY, d.x, d.y);
            grad.addColorStop(0, `hsla(${d.hue}, ${this.saturation}%, 55%, ${alpha})`);
            grad.addColorStop(1, `hsla(${d.hue}, ${this.saturation}%, 50%, ${alpha * 0.3})`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = d.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(d.x, d.startY);
            ctx.lineTo(d.x, d.y);
            ctx.stroke();

            // Drip bulge at bottom
            ctx.fillStyle = `hsla(${d.hue}, ${this.saturation}%, 55%, ${alpha * 0.8})`;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.width * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawVines(ctx) {
        if (this.vines.length === 0) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const v of this.vines) {
            const alpha = v.life * 0.2 * this.intensity;
            if (alpha < 0.005) continue;

            // Draw main vine
            if (v.segments.length > 1) {
                ctx.strokeStyle = `hsla(${v.hue}, ${this.saturation}%, 45%, ${alpha})`;
                ctx.lineWidth = v.thickness;
                ctx.beginPath();
                ctx.moveTo(v.segments[0].x, v.segments[0].y);
                for (let i = 1; i < v.segments.length; i++) {
                    const prev = v.segments[i - 1];
                    const cur = v.segments[i];
                    const cpx = (prev.x + cur.x) / 2;
                    const cpy = (prev.y + cur.y) / 2;
                    ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
                }
                ctx.stroke();

                // Leaves at tip and branches
                const tip = v.segments[v.segments.length - 1];
                this._drawLeaf(ctx, tip.x, tip.y, v.hue, alpha * 1.5, v.thickness * 2);
            }

            // Draw branches
            for (const branch of v.branches) {
                if (branch.segments.length < 2) continue;
                ctx.strokeStyle = `hsla(${(v.hue + 20) % 360}, ${this.saturation}%, 50%, ${alpha * 0.7})`;
                ctx.lineWidth = v.thickness * 0.6;
                ctx.beginPath();
                ctx.moveTo(branch.segments[0].x, branch.segments[0].y);
                for (let i = 1; i < branch.segments.length; i++) {
                    ctx.lineTo(branch.segments[i].x, branch.segments[i].y);
                }
                ctx.stroke();

                // Tiny leaf at branch tip
                const bTip = branch.segments[branch.segments.length - 1];
                this._drawLeaf(ctx, bTip.x, bTip.y, (v.hue + 20) % 360, alpha, v.thickness * 1.5);
            }
        }

        ctx.restore();
    }

    _drawLeaf(ctx, x, y, hue, alpha, size) {
        ctx.fillStyle = `hsla(${(hue + 40) % 360}, 70%, 50%, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.ellipse(x, y - size * 0.3, size * 0.4, size, -Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawSmoke(ctx) {
        if (this.smokeParticles.length === 0) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const s of this.smokeParticles) {
            const alpha = s.life * 0.08 * this.intensity;
            if (alpha < 0.003) continue;

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rotation);

            // Multi-layered smoke puff for volume
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s.size);
            grad.addColorStop(0, `hsla(${s.hue}, ${this.saturation - 20}%, 50%, ${alpha})`);
            grad.addColorStop(0.3, `hsla(${s.hue}, ${this.saturation - 30}%, 45%, ${alpha * 0.5})`);
            grad.addColorStop(0.6, `hsla(${s.hue}, ${this.saturation - 40}%, 40%, ${alpha * 0.15})`);
            grad.addColorStop(1, 'transparent');

            ctx.fillStyle = grad;
            ctx.beginPath();
            // Slightly irregular shape
            const squish = 0.7 + s.life * 0.3;
            ctx.ellipse(0, 0, s.size, s.size * squish, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        ctx.restore();
    }
}
