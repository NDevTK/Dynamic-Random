/**
 * @file emotion_weather_effects.js
 * @description The background responds to mouse behavior patterns to create weather.
 * Frantic movement = electrical storm, calm circles = aurora, stillness = snow/fog,
 * clicking = lightning strikes. Seeds determine the "biome" which changes the visual
 * language completely. Weather transitions smoothly between states.
 *
 * Biomes:
 * 0 - Tropical: rain, thunderstorms, humidity halos, monsoon winds
 * 1 - Arctic: snowflakes, blizzard, ice crystals, northern lights
 * 2 - Volcanic: ember rain, lava cracks, heat shimmer, ash clouds
 * 3 - Oceanic: sea spray, fog banks, bioluminescent plankton, tidal swells
 * 4 - Celestial: meteor showers, cosmic dust, solar wind, starbursts
 * 5 - Digital: pixel rain, data corruption, signal static, code streams
 */

export class EmotionWeather {
    constructor() {
        this.biome = 0;
        this.tick = 0;
        this.hue = 200;
        this.saturation = 50;

        // Weather state (0-1 intensities)
        this.stormIntensity = 0;
        this.calmIntensity = 0;
        this.stillIntensity = 0;

        // Behavior tracking
        this._mx = 0;
        this._my = 0;
        this._speedHistory = new Float32Array(60);
        this._speedIdx = 0;
        this._directionChanges = 0;
        this._prevDirX = 0;
        this._prevDirY = 0;
        this._isClicking = false;
        this._stillFrames = 0;

        // Particles for weather effects
        this.particles = [];
        this.maxParticles = 200;
        this.particlePool = [];

        // Lightning
        this.lightningBolts = [];
        this.lightningCooldown = 0;

        // Transition smoothing
        this._targetStorm = 0;
        this._targetCalm = 0;
        this._targetStill = 0;
        this._transitionSpeed = 0.02;

        // Biome params
        this.windAngle = 0;
        this.windStrength = 0;
        this.particleBaseSize = 2;
        this.particleShape = 0; // 0=circle, 1=line, 2=star, 3=square
    }

    configure(rng, hues) {
        this.biome = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = hues.length > 0 ? hues[Math.floor(rng() * hues.length)].h : Math.floor(rng() * 360);
        this.saturation = 40 + Math.floor(rng() * 40);
        this.particles = [];
        this.lightningBolts = [];
        this._speedHistory.fill(0);
        this._speedIdx = 0;
        this._directionChanges = 0;
        this._stillFrames = 0;

        this.windAngle = rng() * Math.PI * 2;
        this.windStrength = 0.5 + rng() * 1.5;
        this._transitionSpeed = 0.015 + rng() * 0.02;

        switch (this.biome) {
            case 0: // Tropical
                this.hue = 200 + Math.floor(rng() * 30);
                this.particleShape = 1; // rain lines
                this.particleBaseSize = 2 + rng() * 3;
                break;
            case 1: // Arctic
                this.hue = 190 + Math.floor(rng() * 30);
                this.particleShape = 2; // snowflake stars
                this.particleBaseSize = 2 + rng() * 2;
                break;
            case 2: // Volcanic
                this.hue = 10 + Math.floor(rng() * 25);
                this.particleShape = 0; // embers
                this.particleBaseSize = 1 + rng() * 2;
                break;
            case 3: // Oceanic
                this.hue = 180 + Math.floor(rng() * 40);
                this.particleShape = 0; // spray dots
                this.particleBaseSize = 1 + rng() * 2;
                break;
            case 4: // Celestial
                this.hue = Math.floor(rng() * 360);
                this.particleShape = 2; // stars
                this.particleBaseSize = 1 + rng() * 1.5;
                break;
            case 5: // Digital
                this.hue = 120 + Math.floor(rng() * 60);
                this.particleShape = 3; // squares/pixels
                this.particleBaseSize = 2 + rng() * 3;
                break;
        }
    }

    _spawnParticle(x, y, type) {
        if (this.particles.length >= this.maxParticles) return;
        const p = this.particlePool.length > 0 ? this.particlePool.pop() : {};
        p.x = x;
        p.y = y;
        p.vx = (Math.random() - 0.5) * 2;
        p.vy = Math.random() * 2 + 1;
        p.size = this.particleBaseSize * (0.5 + Math.random());
        p.life = 100 + Math.random() * 150;
        p.maxLife = p.life;
        p.type = type;
        p.hueOffset = (Math.random() - 0.5) * 30;
        p.wobble = Math.random() * Math.PI * 2;
        this.particles.push(p);
    }

    _createLightning(x, y) {
        const bolt = { segments: [], alpha: 1, life: 15 };
        let bx = x;
        let by = y;
        const targetY = y + 100 + Math.random() * 300;
        const steps = 8 + Math.floor(Math.random() * 8);

        bolt.segments.push({ x: bx, y: by });
        for (let i = 0; i < steps; i++) {
            bx += (Math.random() - 0.5) * 40;
            by += (targetY - y) / steps;
            bolt.segments.push({ x: bx, y: by });

            // Branch
            if (Math.random() > 0.7 && i > 2) {
                const branch = [];
                let brx = bx, bry = by;
                const branchLen = 3 + Math.floor(Math.random() * 4);
                for (let j = 0; j < branchLen; j++) {
                    brx += (Math.random() - 0.5) * 30;
                    bry += 15 + Math.random() * 20;
                    branch.push({ x: brx, y: bry });
                }
                bolt.branch = branch;
                bolt.branchStart = bolt.segments.length - 1;
            }
        }
        this.lightningBolts.push(bolt);
    }

    update(mx, my, isClicking) {
        this.tick++;
        const prevMx = this._mx;
        const prevMy = this._my;
        this._mx = mx;
        this._my = my;
        this._isClicking = isClicking;

        const dx = mx - prevMx;
        const dy = my - prevMy;
        const speed = Math.sqrt(dx * dx + dy * dy);

        // Track speed history
        this._speedHistory[this._speedIdx % 60] = speed;
        this._speedIdx++;

        // Track direction changes (frantic indicator)
        if (speed > 2) {
            const dirX = dx / speed;
            const dirY = dy / speed;
            const dot = dirX * this._prevDirX + dirY * this._prevDirY;
            if (dot < 0.3) this._directionChanges++;
            this._prevDirX = dirX;
            this._prevDirY = dirY;
        }

        // Calculate stillness
        if (speed < 1) this._stillFrames++;
        else this._stillFrames = Math.max(0, this._stillFrames - 2);

        // Decay direction changes over time
        if (this.tick % 30 === 0) {
            this._directionChanges = Math.max(0, this._directionChanges - 5);
        }

        // Calculate average speed
        let avgSpeed = 0;
        for (let i = 0; i < 60; i++) avgSpeed += this._speedHistory[i];
        avgSpeed /= 60;

        // Determine weather targets
        this._targetStorm = Math.min(1, (this._directionChanges / 30) + avgSpeed / 40);
        this._targetCalm = Math.min(1, Math.max(0, 0.8 - avgSpeed / 15 - this._directionChanges / 40));
        this._targetStill = Math.min(1, this._stillFrames / 120);

        // Smooth transitions
        const ts = this._transitionSpeed;
        this.stormIntensity += (this._targetStorm - this.stormIntensity) * ts;
        this.calmIntensity += (this._targetCalm - this.calmIntensity) * ts;
        this.stillIntensity += (this._targetStill - this.stillIntensity) * ts;

        // Wind responds to behavior
        this.windAngle += (Math.atan2(dy, dx) - this.windAngle) * 0.02;

        // Spawn weather particles
        const spawnRate = Math.floor(this.stormIntensity * 6 + this.calmIntensity * 1 + this.stillIntensity * 2);
        const w = window.innerWidth;
        const h = window.innerHeight;

        for (let i = 0; i < spawnRate; i++) {
            const x = Math.random() * w;
            const y = -10;
            const type = this.stormIntensity > 0.5 ? 'storm' : this.stillIntensity > 0.5 ? 'still' : 'calm';
            this._spawnParticle(x, y, type);
        }

        // Lightning during storm + clicking
        this.lightningCooldown = Math.max(0, this.lightningCooldown - 1);
        if (isClicking && this.stormIntensity > 0.2 && this.lightningCooldown === 0) {
            this._createLightning(mx, my - 200 - Math.random() * 200);
            this.lightningCooldown = 10;
        }
        // Random lightning during intense storm
        if (this.stormIntensity > 0.7 && Math.random() < 0.02) {
            this._createLightning(Math.random() * w, -50);
        }

        // Update particles
        const windCos = Math.cos(this.windAngle) * this.windStrength * this.stormIntensity;
        const windSin = Math.sin(this.windAngle) * this.windStrength * this.stormIntensity;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.vx += windCos * 0.1;
            p.vy += 0.05; // gravity
            if (this.biome === 2) p.vy -= 0.15; // embers rise
            p.x += p.vx;
            p.y += p.vy;
            p.wobble += 0.05;
            p.life--;

            if (p.life <= 0 || p.y > h + 20 || p.x < -20 || p.x > w + 20 ||
                (this.biome === 2 && p.y < -20)) {
                this.particlePool.push(p);
                this.particles[i] = this.particles[this.particles.length - 1];
                this.particles.pop();
            }
        }

        // Update lightning
        for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
            this.lightningBolts[i].life--;
            this.lightningBolts[i].alpha = this.lightningBolts[i].life / 15;
            if (this.lightningBolts[i].life <= 0) {
                this.lightningBolts[i] = this.lightningBolts[this.lightningBolts.length - 1];
                this.lightningBolts.pop();
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        const w = system.width;
        const h = system.height;

        // Atmospheric overlay based on weather state
        this._drawAtmosphere(ctx, w, h);

        // Weather particles
        ctx.globalCompositeOperation = 'lighter';
        this._drawParticles(ctx);

        // Lightning
        this._drawLightning(ctx);

        // Biome-specific ambient effects
        this._drawBiomeAmbient(ctx, w, h);

        ctx.restore();
    }

    _drawAtmosphere(ctx, w, h) {
        // Storm darkness
        if (this.stormIntensity > 0.1) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = `rgba(10, 5, 20, ${this.stormIntensity * 0.06})`;
            ctx.fillRect(0, 0, w, h);
        }

        // Calm aurora glow
        if (this.calmIntensity > 0.2 && (this.biome === 1 || this.biome === 4)) {
            ctx.globalCompositeOperation = 'lighter';
            const auroraY = h * 0.2;
            for (let band = 0; band < 3; band++) {
                const bandY = auroraY + band * 30;
                const bandHue = (this.hue + band * 40 + this.tick * 0.3) % 360;
                const bandAlpha = this.calmIntensity * 0.04;
                const waveOffset = Math.sin(this.tick * 0.01 + band) * 50;

                ctx.beginPath();
                ctx.moveTo(0, bandY);
                for (let x = 0; x < w; x += 20) {
                    const waveY = bandY + Math.sin(x * 0.005 + this.tick * 0.02 + band) * 20 + waveOffset;
                    ctx.lineTo(x, waveY);
                }
                ctx.lineTo(w, bandY + 60);
                ctx.lineTo(0, bandY + 60);
                ctx.closePath();
                ctx.fillStyle = `hsla(${bandHue}, ${this.saturation + 20}%, 50%, ${bandAlpha})`;
                ctx.fill();
            }
        }

        // Fog for stillness
        if (this.stillIntensity > 0.3) {
            ctx.globalCompositeOperation = 'source-over';
            const fogAlpha = this.stillIntensity * 0.03;
            const grad = ctx.createRadialGradient(
                this._mx, this._my, 50,
                this._mx, this._my, 400
            );
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(1, `hsla(${this.hue}, 10%, 70%, ${fogAlpha})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }
    }

    _drawParticles(ctx) {
        for (const p of this.particles) {
            const lifeFrac = p.life / p.maxLife;
            const alpha = lifeFrac * 0.3;
            if (alpha < 0.005) continue;

            let hue = (this.hue + p.hueOffset + 360) % 360;
            let lightness = 55;

            // Biome color modifiers
            if (this.biome === 2) { // Volcanic: oranges
                lightness = 50 + (1 - lifeFrac) * 20;
            } else if (this.biome === 5) { // Digital: greens
                lightness = 60;
            }

            ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, ${lightness}%, ${alpha})`;
            ctx.strokeStyle = ctx.fillStyle;

            switch (this.particleShape) {
                case 0: // Circle
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 1: // Rain line
                    ctx.lineWidth = p.size * 0.3;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x + p.vx * 3, p.y + p.vy * 3);
                    ctx.stroke();
                    break;
                case 2: { // Star
                    const sz = p.size;
                    const wobble = Math.sin(p.wobble) * 0.2;
                    ctx.beginPath();
                    for (let s = 0; s < 6; s++) {
                        const a = (s / 6) * Math.PI * 2 + wobble;
                        const r = s % 2 === 0 ? sz : sz * 0.4;
                        const sx = p.x + Math.cos(a) * r;
                        const sy = p.y + Math.sin(a) * r;
                        if (s === 0) ctx.moveTo(sx, sy);
                        else ctx.lineTo(sx, sy);
                    }
                    ctx.closePath();
                    ctx.fill();
                    break;
                }
                case 3: // Square/pixel
                    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
                    break;
            }
        }
    }

    _drawLightning(ctx) {
        for (const bolt of this.lightningBolts) {
            if (bolt.segments.length < 2) continue;
            const a = bolt.alpha;
            const hue = this.biome === 2 ? 30 : this.biome === 5 ? 160 : this.hue;

            // Core
            ctx.strokeStyle = `hsla(${hue}, 60%, 90%, ${a * 0.6})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
            for (let i = 1; i < bolt.segments.length; i++) {
                ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
            }
            ctx.stroke();

            // Glow
            ctx.strokeStyle = `hsla(${hue}, 50%, 70%, ${a * 0.2})`;
            ctx.lineWidth = 6;
            ctx.stroke();

            // Branch
            if (bolt.branch && bolt.branch.length > 0) {
                ctx.strokeStyle = `hsla(${hue}, 60%, 85%, ${a * 0.3})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                const start = bolt.segments[bolt.branchStart];
                if (start) {
                    ctx.moveTo(start.x, start.y);
                    for (const seg of bolt.branch) {
                        ctx.lineTo(seg.x, seg.y);
                    }
                    ctx.stroke();
                }
            }
        }
    }

    _drawBiomeAmbient(ctx, w, h) {
        // Biome-specific subtle background details
        switch (this.biome) {
            case 2: { // Volcanic lava cracks
                if (this.stormIntensity > 0.3) {
                    const crackCount = Math.floor(this.stormIntensity * 5);
                    ctx.globalCompositeOperation = 'lighter';
                    for (let c = 0; c < crackCount; c++) {
                        const cx = Math.sin(this.tick * 0.003 + c * 1.5) * w * 0.4 + w / 2;
                        const cy = h * 0.7 + Math.cos(this.tick * 0.002 + c) * h * 0.2;
                        ctx.strokeStyle = `hsla(${this.hue}, 90%, 55%, ${0.05 * this.stormIntensity})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(cx, cy);
                        ctx.lineTo(cx + (Math.random() - 0.5) * 60, cy + Math.random() * 40);
                        ctx.stroke();
                    }
                }
                break;
            }
            case 3: { // Oceanic wave line at bottom
                ctx.globalCompositeOperation = 'lighter';
                const waveAlpha = 0.03 + this.calmIntensity * 0.04;
                ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 55%, ${waveAlpha})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                const waveY = h * 0.85;
                for (let x = 0; x <= w; x += 5) {
                    const y = waveY + Math.sin(x * 0.02 + this.tick * 0.03) * 10
                        + Math.sin(x * 0.005 + this.tick * 0.01) * 20;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
                break;
            }
            case 5: { // Digital scanlines during storm
                if (this.stormIntensity > 0.4) {
                    ctx.globalCompositeOperation = 'lighter';
                    const lineCount = Math.floor(this.stormIntensity * 8);
                    for (let l = 0; l < lineCount; l++) {
                        const ly = Math.sin(this.tick * 0.05 + l * 0.7) * h * 0.5 + h / 2;
                        const alpha = 0.03 * this.stormIntensity;
                        ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, 60%, ${alpha})`;
                        ctx.fillRect(0, ly, w, 1);
                    }
                }
                break;
            }
        }
    }
}
