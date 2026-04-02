/**
 * @file phantom_cursor_effects.js
 * @description Ghost cursor system that spawns phantom copies of the user's cursor,
 * each with unique movement behaviors. Creates an eerie, playful feeling of being
 * followed by spectral entities. Each seed dramatically changes the phantom personalities.
 *
 * Modes:
 * 0 - Mirror Phantoms: ghosts mirror cursor across axes with configurable symmetry
 * 1 - Orbit Satellites: phantoms orbit the cursor like moons, leaving luminous trails
 * 2 - Delayed Echoes: time-lagged replays of cursor path with increasing distortion
 * 3 - Magnetic Swarm: phantoms are attracted/repelled by cursor with spring physics
 * 4 - Dimensional Shadows: phantoms exist in "parallel planes" with perspective shift
 * 5 - Chaos Dancers: phantoms follow strange attractor paths seeded from cursor position
 */

export class PhantomCursor {
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

        // Phantoms array (shared across modes)
        this.phantoms = [];
        this.phantomCount = 4;

        // Mirror mode
        this.mirrorAxes = 2; // 2=bilateral, 4=quad, 6=hex, 8=octal
        this.mirrorRotation = 0;
        this.mirrorRotSpeed = 0;

        // Orbit mode
        this.orbitTrailLen = 30;

        // Delayed echo mode
        this.echoBuffer = []; // Ring buffer of positions
        this.echoBufferSize = 300;
        this.echoWriteIdx = 0;
        this.echoFilled = false;

        // Magnetic swarm
        this.springK = 0.02;
        this.dampening = 0.92;

        // Dimensional shadows
        this.perspectiveDepth = 400;
        this.planeRotation = 0;

        // Chaos dancers - attractor parameters
        this.attractorType = 0; // 0=Lorenz, 1=Rössler, 2=Aizawa, 3=Thomas
        this.attractorScale = 5;
        this.attractorDt = 0.005;
    }

    configure(rng, hues) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = hues.length > 0 ? hues[Math.floor(rng() * hues.length)].h : Math.floor(rng() * 360);
        this.saturation = 50 + Math.floor(rng() * 40);
        this.intensity = 0.6 + rng() * 0.8;
        this._rng = rng;
        this.phantoms = [];
        this.echoBuffer = [];
        this.echoWriteIdx = 0;
        this.echoFilled = false;

        const w = window.innerWidth;
        const h = window.innerHeight;

        switch (this.mode) {
            case 0: { // Mirror Phantoms
                const axisOptions = [2, 3, 4, 6, 8];
                this.mirrorAxes = axisOptions[Math.floor(rng() * axisOptions.length)];
                this.mirrorRotSpeed = (rng() - 0.5) * 0.005;
                this.mirrorRotation = rng() * Math.PI * 2;
                this.phantomCount = this.mirrorAxes;
                for (let i = 0; i < this.phantomCount; i++) {
                    this.phantoms.push({
                        x: w / 2, y: h / 2,
                        trail: [],
                        hueOffset: (360 / this.phantomCount) * i,
                        size: 3 + rng() * 3,
                    });
                }
                break;
            }
            case 1: { // Orbit Satellites
                this.phantomCount = 3 + Math.floor(rng() * 5);
                this.orbitTrailLen = 20 + Math.floor(rng() * 30);
                for (let i = 0; i < this.phantomCount; i++) {
                    this.phantoms.push({
                        x: w / 2, y: h / 2,
                        orbitRadius: 30 + rng() * 80,
                        orbitSpeed: (0.02 + rng() * 0.04) * (rng() > 0.5 ? 1 : -1),
                        orbitAngle: (i / this.phantomCount) * Math.PI * 2,
                        orbitEccentricity: 0.3 + rng() * 0.7,
                        trail: [],
                        hueOffset: rng() * 60 - 30,
                        size: 2 + rng() * 3,
                        pulsePhase: rng() * Math.PI * 2,
                        pulseSpeed: 0.03 + rng() * 0.05,
                    });
                }
                break;
            }
            case 2: { // Delayed Echoes
                this.phantomCount = 3 + Math.floor(rng() * 4);
                this.echoBufferSize = 200 + Math.floor(rng() * 200);
                this.echoBuffer = new Array(this.echoBufferSize);
                for (let i = 0; i < this.echoBufferSize; i++) {
                    this.echoBuffer[i] = { x: w / 2, y: h / 2 };
                }
                for (let i = 0; i < this.phantomCount; i++) {
                    const delay = Math.floor((i + 1) / (this.phantomCount + 1) * this.echoBufferSize);
                    this.phantoms.push({
                        x: w / 2, y: h / 2,
                        delay,
                        distortionAmp: 2 + i * (3 + rng() * 5),
                        distortionFreq: 0.05 + rng() * 0.1,
                        hueOffset: i * 25,
                        size: 4 - i * 0.5,
                        scale: 1 + i * (0.03 + rng() * 0.05),
                        trail: [],
                    });
                }
                break;
            }
            case 3: { // Magnetic Swarm
                this.phantomCount = 5 + Math.floor(rng() * 8);
                this.springK = 0.01 + rng() * 0.03;
                this.dampening = 0.88 + rng() * 0.08;
                for (let i = 0; i < this.phantomCount; i++) {
                    this.phantoms.push({
                        x: rng() * w, y: rng() * h,
                        vx: 0, vy: 0,
                        restOffsetX: (rng() - 0.5) * 100,
                        restOffsetY: (rng() - 0.5) * 100,
                        hueOffset: rng() * 40 - 20,
                        size: 2 + rng() * 4,
                        trail: [],
                    });
                }
                break;
            }
            case 4: { // Dimensional Shadows
                this.phantomCount = 3 + Math.floor(rng() * 3);
                this.perspectiveDepth = 200 + rng() * 400;
                this.planeRotation = 0;
                for (let i = 0; i < this.phantomCount; i++) {
                    this.phantoms.push({
                        x: w / 2, y: h / 2,
                        planeZ: (i + 1) * 0.2,
                        planeTiltX: (rng() - 0.5) * 0.3,
                        planeTiltY: (rng() - 0.5) * 0.3,
                        hueOffset: i * 40,
                        size: 3 + rng() * 2,
                        trail: [],
                    });
                }
                break;
            }
            case 5: { // Chaos Dancers
                this.attractorType = Math.floor(rng() * 4);
                this.attractorScale = 3 + rng() * 8;
                this.attractorDt = 0.003 + rng() * 0.007;
                this.phantomCount = 3 + Math.floor(rng() * 4);
                for (let i = 0; i < this.phantomCount; i++) {
                    this.phantoms.push({
                        x: w / 2, y: h / 2,
                        ax: (rng() - 0.5) * 2,
                        ay: (rng() - 0.5) * 2,
                        az: rng() * 2,
                        hueOffset: i * 30,
                        size: 2 + rng() * 3,
                        trail: [],
                    });
                }
                break;
            }
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
            case 0: this._updateMirror(mx, my); break;
            case 1: this._updateOrbit(mx, my); break;
            case 2: this._updateEchoes(mx, my); break;
            case 3: this._updateMagnetic(mx, my, isClicking); break;
            case 4: this._updateDimensional(mx, my); break;
            case 5: this._updateChaos(mx, my); break;
        }
    }

    _updateMirror(mx, my) {
        this.mirrorRotation += this.mirrorRotSpeed;
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const relX = mx - cx;
        const relY = my - cy;

        for (let i = 0; i < this.phantoms.length; i++) {
            const p = this.phantoms[i];
            const angle = (i / this.mirrorAxes) * Math.PI * 2 + this.mirrorRotation;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            // Rotate the relative position
            p.x = cx + relX * cos - relY * sin;
            p.y = cy + relX * sin + relY * cos;
            this._updateTrail(p, 20);
        }
    }

    _updateOrbit(mx, my) {
        for (const p of this.phantoms) {
            p.orbitAngle += p.orbitSpeed;
            p.pulsePhase += p.pulseSpeed;
            const pulse = 1 + Math.sin(p.pulsePhase) * 0.2;
            const r = p.orbitRadius * pulse;
            const ecc = p.orbitEccentricity;
            p.x = mx + Math.cos(p.orbitAngle) * r;
            p.y = my + Math.sin(p.orbitAngle) * r * ecc;
            this._updateTrail(p, this.orbitTrailLen);
        }
    }

    _updateEchoes(mx, my) {
        // Write to ring buffer
        this.echoBuffer[this.echoWriteIdx] = { x: mx, y: my };
        this.echoWriteIdx = (this.echoWriteIdx + 1) % this.echoBufferSize;
        if (this.echoWriteIdx === 0) this.echoFilled = true;

        const maxIdx = this.echoFilled ? this.echoBufferSize : this.echoWriteIdx;

        for (const p of this.phantoms) {
            if (maxIdx <= p.delay) continue;
            const readIdx = (this.echoWriteIdx - p.delay - 1 + this.echoBufferSize) % this.echoBufferSize;
            const echo = this.echoBuffer[readIdx];
            const distortion = Math.sin(this.tick * p.distortionFreq) * p.distortionAmp;
            p.x = echo.x + distortion;
            p.y = echo.y + Math.cos(this.tick * p.distortionFreq * 0.7) * p.distortionAmp;
            this._updateTrail(p, 15);
        }
    }

    _updateMagnetic(mx, my, isClicking) {
        const repulse = isClicking ? -1 : 1;
        for (const p of this.phantoms) {
            const targetX = mx + p.restOffsetX * repulse;
            const targetY = my + p.restOffsetY * repulse;
            const fx = (targetX - p.x) * this.springK;
            const fy = (targetY - p.y) * this.springK;
            p.vx = (p.vx + fx) * this.dampening;
            p.vy = (p.vy + fy) * this.dampening;
            p.x += p.vx;
            p.y += p.vy;
            this._updateTrail(p, 12);
        }
    }

    _updateDimensional(mx, my) {
        this.planeRotation += 0.003;
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const relX = mx - cx;
        const relY = my - cy;

        for (const p of this.phantoms) {
            const z = p.planeZ;
            const tiltX = p.planeTiltX + Math.sin(this.planeRotation) * 0.1;
            const tiltY = p.planeTiltY + Math.cos(this.planeRotation * 0.7) * 0.1;
            // Perspective projection with tilt
            const scale = this.perspectiveDepth / (this.perspectiveDepth + z * 200);
            const offsetX = tiltX * z * 200;
            const offsetY = tiltY * z * 200;
            p.x = cx + relX * scale + offsetX;
            p.y = cy + relY * scale + offsetY;
            this._updateTrail(p, 18);
        }
    }

    _updateChaos(mx, my) {
        const dt = this.attractorDt;
        const scale = this.attractorScale;
        const cx = mx;
        const cy = my;

        for (const p of this.phantoms) {
            let dax, day, daz;

            switch (this.attractorType) {
                case 0: // Lorenz
                    dax = 10 * (p.ay - p.ax);
                    day = p.ax * (28 - p.az) - p.ay;
                    daz = p.ax * p.ay - (8 / 3) * p.az;
                    break;
                case 1: // Rössler
                    dax = -p.ay - p.az;
                    day = p.ax + 0.2 * p.ay;
                    daz = 0.2 + p.az * (p.ax - 5.7);
                    break;
                case 2: // Aizawa
                    dax = (p.az - 0.7) * p.ax - 3.5 * p.ay;
                    day = 3.5 * p.ax + (p.az - 0.7) * p.ay;
                    daz = 0.6 + 0.95 * p.az - (p.az * p.az * p.az) / 3 - (p.ax * p.ax + p.ay * p.ay) * (1 + 0.25 * p.az);
                    break;
                case 3: // Thomas
                    dax = Math.sin(p.ay) - 0.208186 * p.ax;
                    day = Math.sin(p.az) - 0.208186 * p.ay;
                    daz = Math.sin(p.ax) - 0.208186 * p.az;
                    break;
                default:
                    dax = 0; day = 0; daz = 0;
            }

            p.ax += dax * dt;
            p.ay += day * dt;
            p.az += daz * dt;

            // Clamp to prevent divergence
            const maxVal = 50;
            if (Math.abs(p.ax) > maxVal || Math.abs(p.ay) > maxVal || Math.abs(p.az) > maxVal) {
                p.ax *= 0.9; p.ay *= 0.9; p.az *= 0.9;
            }

            p.x = cx + p.ax * scale;
            p.y = cy + p.ay * scale;
            this._updateTrail(p, 25);
        }
    }

    _updateTrail(p, maxLen) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > maxLen) {
            // Shift by overwrite (avoid array shift GC)
            const excess = p.trail.length - maxLen;
            if (excess > 5) {
                p.trail = p.trail.slice(excess);
            } else {
                p.trail.shift();
            }
        }
    }

    draw(ctx, system) {
        if (this.phantoms.length === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (let pi = 0; pi < this.phantoms.length; pi++) {
            const p = this.phantoms[pi];
            const hue = (this.hue + p.hueOffset + 360) % 360;
            const baseAlpha = 0.2 * this.intensity;

            // Draw trail
            if (p.trail.length > 2) {
                ctx.beginPath();
                ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let i = 1; i < p.trail.length; i++) {
                    ctx.lineTo(p.trail[i].x, p.trail[i].y);
                }
                const trailGrad = ctx.createLinearGradient(
                    p.trail[0].x, p.trail[0].y,
                    p.trail[p.trail.length - 1].x, p.trail[p.trail.length - 1].y
                );
                trailGrad.addColorStop(0, `hsla(${hue}, ${this.saturation}%, 60%, 0)`);
                trailGrad.addColorStop(1, `hsla(${hue}, ${this.saturation}%, 60%, ${baseAlpha * 0.5})`);
                ctx.strokeStyle = trailGrad;
                ctx.lineWidth = p.size * 0.5;
                ctx.lineCap = 'round';
                ctx.stroke();
            }

            // Outer glow
            ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, 65%, ${baseAlpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fill();

            // Inner core
            ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, 80%, ${baseAlpha * 0.8})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            // Connector line to real cursor (faint)
            if (this.mode === 1 || this.mode === 3) {
                const dx = this._mouseX - p.x;
                const dy = this._mouseY - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200) {
                    const lineAlpha = (1 - dist / 200) * baseAlpha * 0.3;
                    ctx.strokeStyle = `hsla(${hue}, 40%, 50%, ${lineAlpha})`;
                    ctx.lineWidth = 0.3;
                    ctx.beginPath();
                    ctx.moveTo(this._mouseX, this._mouseY);
                    ctx.lineTo(p.x, p.y);
                    ctx.stroke();
                }
            }
        }

        // Mode-specific decorations
        if (this.mode === 0 && this.phantoms.length > 2) {
            // Connect mirror phantoms in a polygon
            const alpha = 0.06 * this.intensity;
            ctx.strokeStyle = `hsla(${this.hue}, 30%, 50%, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(this.phantoms[0].x, this.phantoms[0].y);
            for (let i = 1; i < this.phantoms.length; i++) {
                ctx.lineTo(this.phantoms[i].x, this.phantoms[i].y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        if (this.mode === 5) {
            // Draw faint attractor path connections between chaos dancers
            ctx.lineWidth = 0.3;
            for (let i = 0; i < this.phantoms.length; i++) {
                for (let j = i + 1; j < this.phantoms.length; j++) {
                    const a = this.phantoms[i];
                    const b = this.phantoms[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 6400) { // 80^2
                        const dist = Math.sqrt(distSq);
                        const alpha = (1 - dist / 80) * 0.08 * this.intensity;
                        ctx.strokeStyle = `hsla(${this.hue}, 50%, 60%, ${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }
        }

        ctx.restore();
    }
}
