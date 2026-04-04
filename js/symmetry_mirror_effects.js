/**
 * @file symmetry_mirror_effects.js
 * @description Interactive effect: mouse movement is reflected through seed-
 * determined symmetry (2-fold, 3-fold, 4-fold, 6-fold, or 8-fold). Each
 * reflected cursor leaves its own trail with independent color shifts.
 * The symmetry center slowly drifts or orbits based on seed. Clicking
 * spawns a symmetrical burst of expanding rings. The rotation of the
 * symmetry axis is animated, creating kaleidoscopic motion patterns.
 *
 * Seed controls: fold count, rotation speed, center drift pattern, trail
 * type (dots/lines/ribbons), color rotation per fold, mirror vs rotational
 * symmetry, bloom intensity, and symmetry axis lines visibility.
 */

export class SymmetryMirror {
    constructor() {
        this.folds = 4;
        this.centerX = 0;
        this.centerY = 0;
        this.rotationOffset = 0;
        this.rotationSpeed = 0.001;
        this.driftStyle = 0;
        this.trailType = 0;
        this.hueShiftPerFold = 30;
        this.isMirror = false;
        this.trails = [];
        this.maxTrailLen = 60;
        this.bursts = [];
        this.burstPool = [];
        this.palette = [];
        this._tick = 0;
        this._clickRegistered = false;
        this._trailWriteIdx = 0;
        // Reusable reflect result to avoid per-call allocation
        this._refResult = { x: 0, y: 0 };
        // Cached window dimensions (updated on draw)
        this._w = 0;
        this._h = 0;
        // Show symmetry axis lines
        this.showAxes = false;
    }

    configure(rng, palette) {
        const foldOptions = [2, 3, 4, 5, 6, 8];
        this.folds = foldOptions[Math.floor(rng() * foldOptions.length)];
        this.rotationSpeed = (rng() - 0.5) * 0.004;
        this.hueShiftPerFold = 15 + rng() * 60;
        this.isMirror = rng() > 0.5;
        this.trailType = Math.floor(rng() * 4);
        this.driftStyle = Math.floor(rng() * 4);
        this.maxTrailLen = 30 + Math.floor(rng() * 50);
        this.trailWidth = 1 + rng() * 3;
        this.bloomIntensity = 0.05 + rng() * 0.2;
        this.showAxes = rng() > 0.6;
        // Trail alpha varies per seed for different intensities
        this.trailAlpha = 0.2 + rng() * 0.3;

        this.palette = palette && palette.length >= 2 ? palette : [
            { h: rng() * 360, s: 60 + rng() * 30, l: 60 + rng() * 20 },
            { h: rng() * 360, s: 50 + rng() * 40, l: 55 + rng() * 25 },
        ];

        this._w = window.innerWidth;
        this._h = window.innerHeight;
        this.centerX = this._w / 2;
        this.centerY = this._h / 2;
        this.trails = [];
        this.bursts = [];
        this.burstPool = [];
        this._trailWriteIdx = 0;
    }

    _prand(seed) {
        return ((seed * 2654435761) >>> 0) / 4294967296;
    }

    update(mx, my, isClicking) {
        this._tick++;
        this._w = window.innerWidth;
        this._h = window.innerHeight;

        // Update center based on drift style
        if (this.driftStyle === 1) {
            this.centerX = this._w / 2 + Math.cos(this._tick * 0.003) * this._w * 0.15;
            this.centerY = this._h / 2 + Math.sin(this._tick * 0.003) * this._h * 0.15;
        } else if (this.driftStyle === 2) {
            this.centerX = this._w / 2 + Math.sin(this._tick * 0.002) * this._w * 0.2;
            this.centerY = this._h / 2 + Math.sin(this._tick * 0.004) * this._h * 0.1;
        } else if (this.driftStyle === 3) {
            this.centerX += (mx - this.centerX) * 0.01;
            this.centerY += (my - this.centerY) * 0.01;
        }

        this.rotationOffset += this.rotationSpeed;

        // Record trail point using ring buffer
        if (this.trails.length < this.maxTrailLen) {
            this.trails.push({ x: mx, y: my, tick: this._tick });
        } else {
            const tp = this.trails[this._trailWriteIdx];
            tp.x = mx;
            tp.y = my;
            tp.tick = this._tick;
            this._trailWriteIdx = (this._trailWriteIdx + 1) % this.maxTrailLen;
        }

        // Click creates symmetrical bursts
        if (isClicking && !this._clickRegistered) {
            this._clickRegistered = true;
            for (let f = 0; f < this.folds; f++) {
                const angle = (f / this.folds) * Math.PI * 2 + this.rotationOffset;
                this._reflectInto(mx, my, angle, f);
                let burst = this.burstPool.length > 0 ? this.burstPool.pop() : {};
                burst.x = this._refResult.x;
                burst.y = this._refResult.y;
                burst.radius = 0;
                burst.maxRadius = 40 + this._prand(this._tick + f * 7) * 40;
                burst.life = 1.0;
                burst.hue = (this.palette[0].h + f * this.hueShiftPerFold) % 360;
                this.bursts.push(burst);
            }
        }
        if (!isClicking) this._clickRegistered = false;

        // Update bursts
        for (let i = this.bursts.length - 1; i >= 0; i--) {
            const b = this.bursts[i];
            b.radius += 2;
            b.life = Math.max(0, 1 - b.radius / b.maxRadius);
            if (b.life <= 0) {
                if (this.burstPool.length < 50) this.burstPool.push(b);
                this.bursts[i] = this.bursts[this.bursts.length - 1];
                this.bursts.pop();
            }
        }
    }

    // Writes result into this._refResult to avoid object allocation
    _reflectInto(x, y, angle, foldIdx) {
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let pointAngle = Math.atan2(dy, dx);

        if (this.isMirror && foldIdx % 2 === 1) {
            pointAngle = angle * 2 - pointAngle;
        } else {
            pointAngle += angle;
        }

        this._refResult.x = this.centerX + Math.cos(pointAngle) * dist;
        this._refResult.y = this.centerY + Math.sin(pointAngle) * dist;
    }

    draw(ctx) {
        if (this.trails.length < 2) return;

        const tick = this._tick;
        const pts = this.trails;
        const len = pts.length;
        const startIdx = len === this.maxTrailLen ? this._trailWriteIdx : 0;

        ctx.globalCompositeOperation = 'lighter';

        // Draw faint symmetry axis lines
        if (this.showAxes) {
            const maxDim = Math.max(this._w, this._h);
            ctx.lineWidth = 0.5;
            for (let f = 0; f < this.folds; f++) {
                const angle = (f / this.folds) * Math.PI * 2 + this.rotationOffset;
                ctx.strokeStyle = `hsla(${this.palette[0].h}, 30%, 50%, 0.04)`;
                ctx.beginPath();
                ctx.moveTo(this.centerX, this.centerY);
                ctx.lineTo(this.centerX + Math.cos(angle) * maxDim, this.centerY + Math.sin(angle) * maxDim);
                ctx.stroke();
            }
        }

        // Draw trails for each fold
        for (let f = 0; f < this.folds; f++) {
            const angle = (f / this.folds) * Math.PI * 2 + this.rotationOffset;
            const hue = (this.palette[0].h + f * this.hueShiftPerFold) % 360;
            const c = this.palette[f % this.palette.length];

            if (this.trailType === 0) {
                // Dots — batch with single fill style per fold
                for (let j = 0; j < len; j++) {
                    const p = pts[(startIdx + j) % len];
                    const age = tick - p.tick;
                    if (age > this.maxTrailLen || age < 0) continue;
                    const alpha = (1 - age / this.maxTrailLen) * this.trailAlpha;
                    this._reflectInto(p.x, p.y, angle, f);
                    ctx.fillStyle = `hsla(${hue}, ${c.s}%, ${c.l}%, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(this._refResult.x, this._refResult.y, this.trailWidth, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (this.trailType === 1 || this.trailType === 2) {
                // Connected line or ribbon
                ctx.beginPath();
                let first = true;
                for (let j = 0; j < len; j++) {
                    const p = pts[(startIdx + j) % len];
                    const age = tick - p.tick;
                    if (age > this.maxTrailLen || age < 0) continue;
                    this._reflectInto(p.x, p.y, angle, f);
                    if (first) { ctx.moveTo(this._refResult.x, this._refResult.y); first = false; }
                    else ctx.lineTo(this._refResult.x, this._refResult.y);
                }
                ctx.strokeStyle = `hsla(${hue}, ${c.s}%, ${c.l}%, ${this.trailAlpha * 0.8})`;
                ctx.lineWidth = this.trailType === 2 ? this.trailWidth * 2 : this.trailWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();
            } else {
                // Fading sparks
                for (let j = 0; j < len; j += 2) {
                    const p = pts[(startIdx + j) % len];
                    const age = tick - p.tick;
                    if (age > this.maxTrailLen || age < 0) continue;
                    const alpha = (1 - age / this.maxTrailLen) * this.trailAlpha;
                    this._reflectInto(p.x, p.y, angle, f);
                    const sparkSize = this.trailWidth * (1 - age / this.maxTrailLen);
                    ctx.fillStyle = `hsla(${hue}, ${c.s}%, ${c.l + 10}%, ${alpha})`;
                    ctx.fillRect(this._refResult.x - sparkSize, this._refResult.y - sparkSize, sparkSize * 2, sparkSize * 2);
                }
            }

            // Bloom glow at cursor head position
            if (this.bloomIntensity > 0.05 && len > 0) {
                const latest = pts[(startIdx + len - 1) % len];
                this._reflectInto(latest.x, latest.y, angle, f);
                ctx.fillStyle = `hsla(${hue}, ${c.s}%, ${c.l + 15}%, ${this.bloomIntensity})`;
                ctx.beginPath();
                ctx.arc(this._refResult.x, this._refResult.y, 15, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw center point with pulse
        const centerPulse = 0.3 + 0.1 * Math.sin(tick * 0.05);
        ctx.fillStyle = `hsla(${this.palette[0].h}, 50%, 80%, ${centerPulse})`;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw bursts
        for (const burst of this.bursts) {
            if (burst.life < 0.01) continue;
            ctx.strokeStyle = `hsla(${burst.hue}, 70%, 70%, ${burst.life * 0.4})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(burst.x, burst.y, burst.radius, 0, Math.PI * 2);
            ctx.stroke();
            // Inner ring
            if (burst.radius > 10) {
                ctx.strokeStyle = `hsla(${burst.hue}, 70%, 80%, ${burst.life * 0.2})`;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.arc(burst.x, burst.y, burst.radius * 0.6, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
