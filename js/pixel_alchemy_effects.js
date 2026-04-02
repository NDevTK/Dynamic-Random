/**
 * @file pixel_alchemy_effects.js
 * @description Color transmutation and elemental trail effects that transform
 * the background's visual character as you move and interact. Each seed creates
 * a different "elemental affinity" that changes how the cursor affects its surroundings.
 *
 * Modes:
 * 0 - Ember Trail: cursor leaves burning embers that smolder and fade with heat glow
 * 1 - Ice Crystallize: cursor freezes the area, spawning branching frost crystals
 * 2 - Toxic Bloom: poisonous spore-like particles billow from cursor path
 * 3 - Gold Transmute: Midas touch - expanding golden veins radiate from clicks
 * 4 - Void Corruption: dark tendrils consume light, leaving anti-color voids
 * 5 - Prismatic Shatter: cursor trail shatters into rainbow glass fragments
 */

export class PixelAlchemy {
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

        // Ember particles
        this.embers = [];
        this.emberPool = [];
        this.maxEmbers = 60;

        // Ice crystals
        this.crystals = [];
        this.crystalPool = [];
        this.maxCrystals = 40;
        this.frostRadius = 0;

        // Toxic spores
        this.spores = [];
        this.sporePool = [];
        this.maxSpores = 50;

        // Gold veins
        this.veins = [];
        this.veinPool = [];
        this.maxVeins = 30;

        // Void tendrils
        this.tendrils = [];
        this.tendrilPool = [];
        this.maxTendrils = 20;
        this.voidPulse = 0;

        // Prismatic fragments
        this.fragments = [];
        this.fragmentPool = [];
        this.maxFragments = 50;
    }

    configure(rng, hues) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = hues.length > 0 ? hues[Math.floor(rng() * hues.length)].h : Math.floor(rng() * 360);
        this.saturation = 50 + Math.floor(rng() * 40);
        this.intensity = 0.5 + rng() * 1.0;

        // Clear all particle arrays
        this.embers = [];
        this.crystals = [];
        this.spores = [];
        this.veins = [];
        this.tendrils = [];
        this.fragments = [];
        this.frostRadius = 0;
        this.voidPulse = 0;

        // Mode-specific tuning
        switch (this.mode) {
            case 0: // Ember
                this.maxEmbers = 30 + Math.floor(rng() * 50);
                break;
            case 1: // Ice
                this.maxCrystals = 20 + Math.floor(rng() * 30);
                break;
            case 2: // Toxic
                this.maxSpores = 30 + Math.floor(rng() * 40);
                break;
            case 3: // Gold
                this.maxVeins = 15 + Math.floor(rng() * 25);
                break;
            case 4: // Void
                this.maxTendrils = 10 + Math.floor(rng() * 15);
                break;
            case 5: // Prismatic
                this.maxFragments = 30 + Math.floor(rng() * 40);
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
            case 0: this._updateEmbers(mx, my, isClicking); break;
            case 1: this._updateIce(mx, my, isClicking); break;
            case 2: this._updateToxic(mx, my, isClicking); break;
            case 3: this._updateGold(mx, my, isClicking); break;
            case 4: this._updateVoid(mx, my, isClicking); break;
            case 5: this._updatePrismatic(mx, my, isClicking); break;
        }
    }

    _updateEmbers(mx, my, isClicking) {
        // Spawn embers based on speed
        const spawnRate = isClicking ? 3 : Math.min(2, Math.floor(this._mouseSpeed / 5));
        for (let i = 0; i < spawnRate && this.embers.length < this.maxEmbers; i++) {
            const ember = this.emberPool.length > 0 ? this.emberPool.pop() : {};
            ember.x = mx + (Math.random() - 0.5) * 10;
            ember.y = my + (Math.random() - 0.5) * 10;
            ember.vx = (Math.random() - 0.5) * 2;
            ember.vy = -1 - Math.random() * 3; // Rise upward
            ember.life = 1;
            ember.decay = 0.015 + Math.random() * 0.02;
            ember.size = 2 + Math.random() * 4;
            ember.hue = 15 + Math.random() * 30; // Orange-red range
            this.embers.push(ember);
        }

        for (let i = this.embers.length - 1; i >= 0; i--) {
            const e = this.embers[i];
            e.x += e.vx;
            e.y += e.vy;
            e.vy -= 0.02; // Slight acceleration upward
            e.vx *= 0.98;
            e.life -= e.decay;
            e.size *= 0.995;
            if (e.life <= 0) {
                this.emberPool.push(e);
                this.embers[i] = this.embers[this.embers.length - 1];
                this.embers.pop();
            }
        }
    }

    _updateIce(mx, my, isClicking) {
        this.frostRadius = isClicking
            ? Math.min(150, this.frostRadius + 3)
            : Math.max(0, this.frostRadius - 1);

        // Spawn crystals at frost edge
        if (this.frostRadius > 10 && this.tick % 3 === 0 && this.crystals.length < this.maxCrystals) {
            const crystal = this.crystalPool.length > 0 ? this.crystalPool.pop() : {};
            const angle = Math.random() * Math.PI * 2;
            crystal.x = mx + Math.cos(angle) * this.frostRadius;
            crystal.y = my + Math.sin(angle) * this.frostRadius;
            crystal.angle = angle;
            crystal.length = 5 + Math.random() * 15;
            crystal.branches = 1 + Math.floor(Math.random() * 3);
            crystal.life = 1;
            crystal.decay = 0.008 + Math.random() * 0.01;
            this.crystals.push(crystal);
        }

        for (let i = this.crystals.length - 1; i >= 0; i--) {
            this.crystals[i].life -= this.crystals[i].decay;
            if (this.crystals[i].life <= 0) {
                this.crystalPool.push(this.crystals[i]);
                this.crystals[i] = this.crystals[this.crystals.length - 1];
                this.crystals.pop();
            }
        }
    }

    _updateToxic(mx, my, isClicking) {
        const spawnRate = isClicking ? 2 : (this._mouseSpeed > 3 ? 1 : 0);
        for (let i = 0; i < spawnRate && this.spores.length < this.maxSpores; i++) {
            const spore = this.sporePool.length > 0 ? this.sporePool.pop() : {};
            spore.x = mx + (Math.random() - 0.5) * 20;
            spore.y = my + (Math.random() - 0.5) * 20;
            spore.vx = (Math.random() - 0.5) * 1.5;
            spore.vy = (Math.random() - 0.5) * 1.5;
            spore.life = 1;
            spore.decay = 0.008 + Math.random() * 0.01;
            spore.size = 3 + Math.random() * 8;
            spore.wobblePhase = Math.random() * Math.PI * 2;
            spore.wobbleSpeed = 0.05 + Math.random() * 0.1;
            this.spores.push(spore);
        }

        for (let i = this.spores.length - 1; i >= 0; i--) {
            const s = this.spores[i];
            s.wobblePhase += s.wobbleSpeed;
            s.x += s.vx + Math.sin(s.wobblePhase) * 0.5;
            s.y += s.vy + Math.cos(s.wobblePhase * 0.7) * 0.3;
            s.vx *= 0.99;
            s.vy *= 0.99;
            s.size *= 1.003; // Slowly expand
            s.life -= s.decay;
            if (s.life <= 0) {
                this.sporePool.push(s);
                this.spores[i] = this.spores[this.spores.length - 1];
                this.spores.pop();
            }
        }
    }

    _updateGold(mx, my, isClicking) {
        // Spawn veins on click
        if (isClicking && this.tick % 5 === 0 && this.veins.length < this.maxVeins) {
            const vein = this.veinPool.length > 0 ? this.veinPool.pop() : {};
            vein.x = mx;
            vein.y = my;
            vein.angle = Math.random() * Math.PI * 2;
            vein.length = 0;
            vein.maxLength = 40 + Math.random() * 80;
            vein.growSpeed = 2 + Math.random() * 3;
            vein.life = 1;
            vein.decay = 0.005 + Math.random() * 0.005;
            vein.width = 1 + Math.random() * 2;
            // Pre-compute vein segments for organic look
            vein.segments = [];
            let cx = vein.x, cy = vein.y, ca = vein.angle;
            const segCount = 6 + Math.floor(Math.random() * 6);
            for (let s = 0; s < segCount; s++) {
                ca += (Math.random() - 0.5) * 0.8;
                const segLen = vein.maxLength / segCount;
                cx += Math.cos(ca) * segLen;
                cy += Math.sin(ca) * segLen;
                vein.segments.push({ x: cx, y: cy });
            }
            this.veins.push(vein);
        }

        for (let i = this.veins.length - 1; i >= 0; i--) {
            const v = this.veins[i];
            v.length = Math.min(v.maxLength, v.length + v.growSpeed);
            if (v.length >= v.maxLength) {
                v.life -= v.decay;
            }
            if (v.life <= 0) {
                this.veinPool.push(v);
                this.veins[i] = this.veins[this.veins.length - 1];
                this.veins.pop();
            }
        }
    }

    _updateVoid(mx, my, isClicking) {
        this.voidPulse += 0.03;

        // Spawn void tendrils
        if ((isClicking || this._mouseSpeed > 5) && this.tick % 8 === 0 && this.tendrils.length < this.maxTendrils) {
            const tendril = this.tendrilPool.length > 0 ? this.tendrilPool.pop() : {};
            tendril.x = mx;
            tendril.y = my;
            tendril.angle = Math.random() * Math.PI * 2;
            tendril.length = 0;
            tendril.maxLength = 50 + Math.random() * 100;
            tendril.life = 1;
            tendril.decay = 0.006 + Math.random() * 0.008;
            tendril.wobbleFreq = 0.1 + Math.random() * 0.2;
            tendril.wobbleAmp = 5 + Math.random() * 15;
            this.tendrils.push(tendril);
        }

        for (let i = this.tendrils.length - 1; i >= 0; i--) {
            const t = this.tendrils[i];
            t.length = Math.min(t.maxLength, t.length + 2);
            t.life -= t.decay;
            if (t.life <= 0) {
                this.tendrilPool.push(t);
                this.tendrils[i] = this.tendrils[this.tendrils.length - 1];
                this.tendrils.pop();
            }
        }
    }

    _updatePrismatic(mx, my, isClicking) {
        const spawnRate = isClicking ? 3 : Math.min(2, Math.floor(this._mouseSpeed / 4));
        for (let i = 0; i < spawnRate && this.fragments.length < this.maxFragments; i++) {
            const frag = this.fragmentPool.length > 0 ? this.fragmentPool.pop() : {};
            frag.x = mx + (Math.random() - 0.5) * 15;
            frag.y = my + (Math.random() - 0.5) * 15;
            frag.vx = (Math.random() - 0.5) * 4;
            frag.vy = (Math.random() - 0.5) * 4;
            frag.rotation = Math.random() * Math.PI * 2;
            frag.rotSpeed = (Math.random() - 0.5) * 0.2;
            frag.life = 1;
            frag.decay = 0.012 + Math.random() * 0.015;
            frag.size = 3 + Math.random() * 8;
            frag.sides = 3 + Math.floor(Math.random() * 4); // Triangle to hexagon
            frag.hue = Math.floor(Math.random() * 360);
            this.fragments.push(frag);
        }

        for (let i = this.fragments.length - 1; i >= 0; i--) {
            const f = this.fragments[i];
            f.x += f.vx;
            f.y += f.vy;
            f.vx *= 0.97;
            f.vy *= 0.97;
            f.vy += 0.03; // Slight gravity
            f.rotation += f.rotSpeed;
            f.life -= f.decay;
            if (f.life <= 0) {
                this.fragmentPool.push(f);
                this.fragments[i] = this.fragments[this.fragments.length - 1];
                this.fragments.pop();
            }
        }
    }

    draw(ctx, system) {
        switch (this.mode) {
            case 0: this._drawEmbers(ctx); break;
            case 1: this._drawIce(ctx); break;
            case 2: this._drawToxic(ctx); break;
            case 3: this._drawGold(ctx); break;
            case 4: this._drawVoid(ctx, system); break;
            case 5: this._drawPrismatic(ctx); break;
        }
    }

    _drawEmbers(ctx) {
        if (this.embers.length === 0) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const e of this.embers) {
            const alpha = e.life * 0.5 * this.intensity;
            const lightness = 50 + (1 - e.life) * 30; // Gets brighter as it dies

            // Ember glow
            const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 2);
            grad.addColorStop(0, `hsla(${e.hue}, 100%, ${lightness}%, ${alpha})`);
            grad.addColorStop(0.4, `hsla(${e.hue + 10}, 90%, ${lightness - 10}%, ${alpha * 0.5})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size * 2, 0, Math.PI * 2);
            ctx.fill();

            // Hot core
            ctx.fillStyle = `hsla(${e.hue + 20}, 100%, 90%, ${alpha * 0.8})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _drawIce(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Frost aura around cursor
        if (this.frostRadius > 5) {
            const mx = this._mouseX;
            const my = this._mouseY;
            const grad = ctx.createRadialGradient(mx, my, 0, mx, my, this.frostRadius);
            grad.addColorStop(0, `hsla(200, 80%, 85%, ${0.03 * this.intensity})`);
            grad.addColorStop(0.7, `hsla(210, 70%, 75%, ${0.02 * this.intensity})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(mx, my, this.frostRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Ice crystals
        for (const c of this.crystals) {
            const alpha = c.life * 0.3 * this.intensity;
            ctx.strokeStyle = `hsla(200, 70%, 85%, ${alpha})`;
            ctx.lineWidth = 1;

            // Main crystal arm
            const endX = c.x + Math.cos(c.angle) * c.length;
            const endY = c.y + Math.sin(c.angle) * c.length;
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Branches (60-degree angles like real ice)
            for (let b = 0; b < c.branches; b++) {
                const bt = 0.3 + b * 0.25;
                const bx = c.x + (endX - c.x) * bt;
                const by = c.y + (endY - c.y) * bt;
                const branchLen = c.length * 0.35;

                for (const dir of [-1, 1]) {
                    const ba = c.angle + dir * Math.PI / 3;
                    ctx.beginPath();
                    ctx.moveTo(bx, by);
                    ctx.lineTo(bx + Math.cos(ba) * branchLen, by + Math.sin(ba) * branchLen);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    _drawToxic(ctx) {
        if (this.spores.length === 0) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const s of this.spores) {
            const alpha = s.life * 0.15 * this.intensity;
            const hue = 90 + Math.sin(s.wobblePhase) * 30; // Green-yellow range

            // Spore cloud
            const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size);
            grad.addColorStop(0, `hsla(${hue}, 80%, 55%, ${alpha})`);
            grad.addColorStop(0.5, `hsla(${hue + 20}, 60%, 40%, ${alpha * 0.5})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _drawGold(ctx) {
        if (this.veins.length === 0) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const v of this.veins) {
            const alpha = v.life * 0.35 * this.intensity;
            const growRatio = v.length / v.maxLength;

            // Draw vein segments up to current growth
            ctx.strokeStyle = `hsla(45, 90%, 65%, ${alpha})`;
            ctx.lineWidth = v.width;
            ctx.shadowColor = `hsla(45, 100%, 70%, ${alpha * 0.5})`;
            ctx.shadowBlur = 6;

            ctx.beginPath();
            ctx.moveTo(v.x, v.y);

            const segsToShow = Math.floor(v.segments.length * growRatio);
            for (let s = 0; s < segsToShow; s++) {
                ctx.lineTo(v.segments[s].x, v.segments[s].y);
            }
            // Partial last segment
            if (segsToShow < v.segments.length) {
                const prev = segsToShow > 0 ? v.segments[segsToShow - 1] : { x: v.x, y: v.y };
                const next = v.segments[segsToShow];
                const segProgress = (growRatio * v.segments.length) - segsToShow;
                ctx.lineTo(
                    prev.x + (next.x - prev.x) * segProgress,
                    prev.y + (next.y - prev.y) * segProgress
                );
            }
            ctx.stroke();

            // Glowing nodes at segment joins
            for (let s = 0; s < segsToShow; s++) {
                const nodeAlpha = alpha * 0.5;
                ctx.fillStyle = `hsla(50, 100%, 80%, ${nodeAlpha})`;
                ctx.beginPath();
                ctx.arc(v.segments[s].x, v.segments[s].y, v.width + 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    _drawVoid(ctx, system) {
        ctx.save();

        // Void aura around cursor (subtractive)
        const mx = this._mouseX;
        const my = this._mouseY;
        const pulse = Math.sin(this.voidPulse) * 0.5 + 0.5;
        const auraR = 40 + pulse * 20 + this._mouseSpeed * 2;

        ctx.globalCompositeOperation = 'multiply';
        const voidGrad = ctx.createRadialGradient(mx, my, 0, mx, my, auraR);
        voidGrad.addColorStop(0, `hsla(${(this.hue + 180) % 360}, 50%, 10%, ${0.3 * this.intensity})`);
        voidGrad.addColorStop(0.5, `hsla(${this.hue}, 30%, 30%, ${0.15 * this.intensity})`);
        voidGrad.addColorStop(1, `hsla(0, 0%, 100%, 1)`);
        ctx.fillStyle = voidGrad;
        ctx.beginPath();
        ctx.arc(mx, my, auraR, 0, Math.PI * 2);
        ctx.fill();

        // Void tendrils
        ctx.globalCompositeOperation = 'lighter';
        for (const t of this.tendrils) {
            const alpha = t.life * 0.2 * this.intensity;
            const progress = t.length / t.maxLength;
            const hueShift = (this.hue + 180) % 360;

            ctx.strokeStyle = `hsla(${hueShift}, 60%, 40%, ${alpha})`;
            ctx.lineWidth = 2 * t.life;
            ctx.beginPath();
            ctx.moveTo(t.x, t.y);

            // Wobbly tendril path
            const steps = 10;
            for (let s = 1; s <= steps; s++) {
                const st = (s / steps) * progress;
                const wobble = Math.sin(st * Math.PI * 2 * t.wobbleFreq + this.tick * 0.05) * t.wobbleAmp * st;
                const perpAngle = t.angle + Math.PI / 2;
                const px = t.x + Math.cos(t.angle) * t.maxLength * st + Math.cos(perpAngle) * wobble;
                const py = t.y + Math.sin(t.angle) * t.maxLength * st + Math.sin(perpAngle) * wobble;
                ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Void terminus glow
            if (progress > 0.3) {
                const tipT = progress;
                const wobble = Math.sin(tipT * Math.PI * 2 * t.wobbleFreq + this.tick * 0.05) * t.wobbleAmp * tipT;
                const perpAngle = t.angle + Math.PI / 2;
                const tipX = t.x + Math.cos(t.angle) * t.length + Math.cos(perpAngle) * wobble;
                const tipY = t.y + Math.sin(t.angle) * t.length + Math.sin(perpAngle) * wobble;

                const tipGrad = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 8);
                tipGrad.addColorStop(0, `hsla(${hueShift}, 80%, 50%, ${alpha * 0.8})`);
                tipGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = tipGrad;
                ctx.beginPath();
                ctx.arc(tipX, tipY, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    _drawPrismatic(ctx) {
        if (this.fragments.length === 0) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const f of this.fragments) {
            const alpha = f.life * 0.25 * this.intensity;

            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.rotation);

            // Glass fragment polygon
            ctx.fillStyle = `hsla(${f.hue}, 90%, 70%, ${alpha * 0.3})`;
            ctx.strokeStyle = `hsla(${f.hue}, 80%, 85%, ${alpha})`;
            ctx.lineWidth = 0.5;

            ctx.beginPath();
            for (let i = 0; i < f.sides; i++) {
                const a = (i / f.sides) * Math.PI * 2;
                const px = Math.cos(a) * f.size;
                const py = Math.sin(a) * f.size;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Highlight edge (glass reflection)
            ctx.strokeStyle = `hsla(${f.hue}, 100%, 95%, ${alpha * 0.5})`;
            ctx.lineWidth = 0.3;
            ctx.beginPath();
            const ha = Math.PI * 0.3; // highlight angle
            ctx.moveTo(Math.cos(ha) * f.size * 0.8, Math.sin(ha) * f.size * 0.8);
            ctx.lineTo(Math.cos(ha + 0.5) * f.size * 0.6, Math.sin(ha + 0.5) * f.size * 0.6);
            ctx.stroke();

            ctx.restore();
        }
        ctx.restore();
    }
}
