/**
 * @file particle_swarm_effects.js
 * @description Autonomous micro-particle systems that create emergent behaviors
 * around and independent of the cursor. Each seed produces wildly different
 * swarm personalities.
 *
 * Modes:
 * 0 - Murmuration: boid flocking that follows cursor like starlings
 * 1 - Firefly Sync: particles blink in synchronizing patterns
 * 2 - Magnetic Chains: particles form chains that stretch and snap
 * 3 - Predator-Prey: two species chase each other, cursor is apex predator
 * 4 - Orbit Dance: particles orbit cursor at quantized radii like electron shells
 * 5 - Spore Burst: particles explode from cursor and drift with wind currents
 */

export class ParticleSwarm {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.particles = [];
        this.maxParticles = 80;

        // Murmuration
        this.separationDist = 20;
        this.alignmentDist = 50;
        this.cohesionDist = 80;
        this.maxSpeed = 3;
        this.cursorAttraction = 0.02;

        // Firefly
        this.flashDuration = 20;
        this.syncStrength = 0.02;

        // Magnetic chains
        this.chainDist = 40;
        this.chainStrength = 0.3;

        // Predator-prey
        this.preyCount = 0;
        this.predatorCount = 0;

        // Orbit
        this.shells = [];
        this.shellCount = 3;
        this._orbitCenterX = 0;
        this._orbitCenterY = 0;

        // Spore
        this.windAngle = 0;
        this.windSpeed = 0;
        this.burstCooldown = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? (palette[0].h || Math.floor(rng() * 360)) : Math.floor(rng() * 360);
        this.tick = 0;
        this.particles = [];

        const w = window.innerWidth, h = window.innerHeight;
        this._orbitCenterX = w / 2;
        this._orbitCenterY = h / 2;

        switch (this.mode) {
            case 0: // Murmuration
                this.maxParticles = 60 + Math.floor(rng() * 40);
                this.separationDist = 15 + rng() * 15;
                this.alignmentDist = 40 + rng() * 30;
                this.cohesionDist = 60 + rng() * 40;
                this.maxSpeed = 2 + rng() * 3;
                this.cursorAttraction = 0.01 + rng() * 0.03;
                for (let i = 0; i < this.maxParticles; i++) {
                    this.particles.push({
                        x: rng() * w, y: rng() * h,
                        vx: (rng() - 0.5) * 2, vy: (rng() - 0.5) * 2,
                        hueOffset: rng() * 30 - 15,
                    });
                }
                break;

            case 1: // Firefly
                this.maxParticles = 40 + Math.floor(rng() * 30);
                this.flashDuration = 15 + Math.floor(rng() * 20);
                this.syncStrength = 0.01 + rng() * 0.03;
                for (let i = 0; i < this.maxParticles; i++) {
                    this.particles.push({
                        x: rng() * w, y: rng() * h,
                        vx: (rng() - 0.5) * 0.5, vy: (rng() - 0.5) * 0.5,
                        phase: rng() * Math.PI * 2,
                        period: 60 + rng() * 80,
                        brightness: 0,
                        hueOffset: rng() * 40 - 20,
                    });
                }
                break;

            case 2: // Magnetic chains
                this.maxParticles = 30 + Math.floor(rng() * 25);
                this.chainDist = 30 + rng() * 30;
                this.chainStrength = 0.2 + rng() * 0.3;
                for (let i = 0; i < this.maxParticles; i++) {
                    this.particles.push({
                        x: rng() * w, y: rng() * h,
                        vx: (rng() - 0.5) * 1, vy: (rng() - 0.5) * 1,
                        charge: rng() > 0.5 ? 1 : -1,
                        size: 2 + rng() * 4,
                    });
                }
                break;

            case 3: // Predator-prey
                this.preyCount = 40 + Math.floor(rng() * 20);
                this.predatorCount = 3 + Math.floor(rng() * 4);
                this.maxParticles = this.preyCount + this.predatorCount;
                for (let i = 0; i < this.preyCount; i++) {
                    this.particles.push({
                        x: rng() * w, y: rng() * h,
                        vx: (rng() - 0.5) * 2, vy: (rng() - 0.5) * 2,
                        type: 'prey', size: 2 + rng() * 2,
                        hueOffset: rng() * 20,
                    });
                }
                for (let i = 0; i < this.predatorCount; i++) {
                    this.particles.push({
                        x: rng() * w, y: rng() * h,
                        vx: (rng() - 0.5) * 1, vy: (rng() - 0.5) * 1,
                        type: 'predator', size: 5 + rng() * 3,
                        hueOffset: 0,
                        energy: 1.0, // predators get tired, burst when prey nearby
                    });
                }
                break;

            case 4: // Orbit dance
                this.shellCount = 3 + Math.floor(rng() * 4);
                this.shells = [];
                for (let i = 0; i < this.shellCount; i++) {
                    this.shells.push({
                        radius: 40 + i * (30 + rng() * 20),
                        speed: (0.01 + rng() * 0.02) * (rng() > 0.5 ? 1 : -1),
                        hue: (this.hue + i * 40) % 360,
                    });
                }
                this.maxParticles = this.shellCount * (4 + Math.floor(rng() * 4));
                for (let i = 0; i < this.maxParticles; i++) {
                    const shellIdx = i % this.shellCount;
                    this.particles.push({
                        x: w / 2, y: h / 2,
                        angle: (i / this.maxParticles) * Math.PI * 2,
                        shell: shellIdx,
                        wobble: rng() * Math.PI * 2,
                        wobbleSpeed: 0.02 + rng() * 0.03,
                        wobbleAmp: 2 + rng() * 8,
                        size: 1.5 + rng() * 2.5,
                    });
                }
                break;

            case 5: // Spore burst
                this.maxParticles = 80;
                this.windAngle = rng() * Math.PI * 2;
                this.windSpeed = 0.3 + rng() * 0.7;
                this.burstCooldown = 0;
                break;
        }
    }

    update(mx, my, isClicking) {
        this.tick++;

        switch (this.mode) {
            case 0: this._updateMurmuration(mx, my); break;
            case 1: this._updateFireflies(mx, my); break;
            case 2: this._updateMagneticChains(mx, my); break;
            case 3: this._updatePredatorPrey(mx, my); break;
            case 4: this._updateOrbitDance(mx, my); break;
            case 5: this._updateSpores(mx, my, isClicking); break;
        }
    }

    _updateMurmuration(mx, my) {
        const w = window.innerWidth, h = window.innerHeight;
        const len = this.particles.length;

        for (let i = 0; i < len; i++) {
            const p = this.particles[i];
            let sepX = 0, sepY = 0, alignX = 0, alignY = 0, cohX = 0, cohY = 0;
            let sepCount = 0, alignCount = 0, cohCount = 0;

            // Sample neighbors with stride for performance
            const step = Math.max(1, Math.floor(len / 20));
            for (let j = 0; j < len; j += step) {
                if (i === j) continue;
                const o = this.particles[j];
                const dx = o.x - p.x, dy = o.y - p.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < this.separationDist * this.separationDist && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    sepX -= dx / dist; sepY -= dy / dist; sepCount++;
                }
                if (distSq < this.alignmentDist * this.alignmentDist) {
                    alignX += o.vx; alignY += o.vy; alignCount++;
                }
                if (distSq < this.cohesionDist * this.cohesionDist) {
                    cohX += o.x; cohY += o.y; cohCount++;
                }
            }

            if (sepCount > 0) { p.vx += sepX / sepCount * 0.5; p.vy += sepY / sepCount * 0.5; }
            if (alignCount > 0) { p.vx += (alignX / alignCount - p.vx) * 0.05; p.vy += (alignY / alignCount - p.vy) * 0.05; }
            if (cohCount > 0) { p.vx += (cohX / cohCount - p.x) * 0.005; p.vy += (cohY / cohCount - p.y) * 0.005; }

            // Cursor attraction
            const cdx = mx - p.x, cdy = my - p.y;
            const cdist = Math.sqrt(cdx * cdx + cdy * cdy) + 1;
            p.vx += cdx / cdist * this.cursorAttraction;
            p.vy += cdy / cdist * this.cursorAttraction;

            // Speed limit
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > this.maxSpeed) { p.vx = p.vx / speed * this.maxSpeed; p.vy = p.vy / speed * this.maxSpeed; }

            p.x += p.vx; p.y += p.vy;

            // Wrap around
            if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20;
            if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20;
        }
    }

    _updateFireflies(mx, my) {
        const len = this.particles.length;

        for (let i = 0; i < len; i++) {
            const p = this.particles[i];
            // Gentle drift
            p.vx += (Math.random() - 0.5) * 0.1;
            p.vy += (Math.random() - 0.5) * 0.1;
            p.vx *= 0.95; p.vy *= 0.95;
            p.x += p.vx; p.y += p.vy;

            // Update flash phase
            p.phase += (Math.PI * 2) / p.period;
            p.brightness = Math.pow(Math.max(0, Math.sin(p.phase)), 3);

            // Sync with nearest neighbors (spatial proximity based)
            // Use deterministic neighbor sampling based on index to avoid repeated random picks
            for (let k = 1; k <= 5; k++) {
                const j = (i + k * 7) % len; // deterministic spread
                if (j === i) continue;
                const o = this.particles[j];
                const dx = o.x - p.x, dy = o.y - p.y;
                if (dx * dx + dy * dy < 10000) { // within 100px
                    // Kuramoto-style phase sync
                    p.phase += Math.sin(o.phase - p.phase) * this.syncStrength;
                }
            }

            // Cursor attraction
            const dx = mx - p.x, dy = my - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 1;
            if (dist < 200) {
                p.vx += dx / dist * 0.02;
                p.vy += dy / dist * 0.02;
            }

            // Wrap
            const w = window.innerWidth, h = window.innerHeight;
            if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20;
            if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20;
        }
    }

    _updateMagneticChains(mx, my) {
        const w = window.innerWidth, h = window.innerHeight;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            // Interact with nearby particles
            for (let j = i + 1; j < this.particles.length; j++) {
                const o = this.particles[j];
                const dx = o.x - p.x, dy = o.y - p.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < this.chainDist * this.chainDist * 4) {
                    const dist = Math.sqrt(distSq) + 1;
                    // Opposite charges attract (negative product), same repel (positive product)
                    const polarity = p.charge * o.charge; // -1 = attract, +1 = repel
                    const force = polarity * this.chainStrength / (dist * 0.5);
                    const fx = dx / dist * force;
                    const fy = dy / dist * force;
                    // Repulsion pushes apart, attraction pulls together
                    p.vx -= fx; p.vy -= fy;
                    o.vx += fx; o.vy += fy;
                }
            }

            // Cursor acts as alternating charge field
            const cdx = mx - p.x, cdy = my - p.y;
            const cdist = Math.sqrt(cdx * cdx + cdy * cdy) + 1;
            const cforce = p.charge * -0.5 / (cdist * 0.3);
            p.vx += cdx / cdist * cforce;
            p.vy += cdy / cdist * cforce;

            p.vx *= 0.96; p.vy *= 0.96;
            p.x += p.vx; p.y += p.vy;

            // Contain within screen with bounce
            if (p.x < 0) { p.x = 0; p.vx *= -0.5; }
            if (p.x > w) { p.x = w; p.vx *= -0.5; }
            if (p.y < 0) { p.y = 0; p.vy *= -0.5; }
            if (p.y > h) { p.y = h; p.vy *= -0.5; }
        }
    }

    _updatePredatorPrey(mx, my) {
        const w = window.innerWidth, h = window.innerHeight;

        for (const p of this.particles) {
            if (p.type === 'prey') {
                // Flee from predators and cursor
                for (const o of this.particles) {
                    if (o.type !== 'predator') continue;
                    const dx = p.x - o.x, dy = p.y - o.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 22500) { // 150^2
                        const dist = Math.sqrt(distSq) + 1;
                        p.vx += dx / dist * 0.8;
                        p.vy += dy / dist * 0.8;
                    }
                }
                // Flee from cursor
                const cdx = p.x - mx, cdy = p.y - my;
                const cdist = Math.sqrt(cdx * cdx + cdy * cdy) + 1;
                if (cdist < 120) {
                    p.vx += cdx / cdist * 1.2;
                    p.vy += cdy / cdist * 1.2;
                }

                // Flock with nearby prey using index-based sampling
                let flockX = 0, flockY = 0, count = 0;
                for (let i = 0; i < this.particles.length; i += 3) {
                    const o = this.particles[i];
                    if (o.type !== 'prey' || o === p) continue;
                    const dx = o.x - p.x, dy = o.y - p.y;
                    if (dx * dx + dy * dy < 5000) {
                        flockX += o.x; flockY += o.y; count++;
                    }
                }
                if (count > 0) {
                    p.vx += (flockX / count - p.x) * 0.002;
                    p.vy += (flockY / count - p.y) * 0.002;
                }
            } else {
                // Predators chase nearest prey with burst speed
                let nearestDist = Infinity, nearestPrey = null;
                for (const o of this.particles) {
                    if (o.type !== 'prey') continue;
                    const dx = o.x - p.x, dy = o.y - p.y;
                    const dist = dx * dx + dy * dy;
                    if (dist < nearestDist) { nearestDist = dist; nearestPrey = o; }
                }
                if (nearestPrey) {
                    const dx = nearestPrey.x - p.x, dy = nearestPrey.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) + 1;
                    // Predators burst when close to prey, otherwise cruise
                    const chaseForce = dist < 80 ? 0.4 : 0.15;
                    p.vx += dx / dist * chaseForce;
                    p.vy += dy / dist * chaseForce;
                }
            }

            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            // Predators can match prey speed with burst ability
            const maxSpd = p.type === 'prey' ? 3.5 : 3.0;
            if (speed > maxSpd) { p.vx = p.vx / speed * maxSpd; p.vy = p.vy / speed * maxSpd; }

            p.vx *= 0.98; p.vy *= 0.98;
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        }
    }

    _updateOrbitDance(mx, my) {
        // Smooth the orbit center toward mouse position (prevents jarring snaps)
        this._orbitCenterX += (mx - this._orbitCenterX) * 0.08;
        this._orbitCenterY += (my - this._orbitCenterY) * 0.08;

        const cx = this._orbitCenterX;
        const cy = this._orbitCenterY;

        for (const p of this.particles) {
            const shell = this.shells[p.shell];
            p.angle += shell.speed;
            p.wobble += p.wobbleSpeed;

            const radius = shell.radius + Math.sin(p.wobble) * p.wobbleAmp;
            p.x = cx + Math.cos(p.angle) * radius;
            p.y = cy + Math.sin(p.angle) * radius;
        }
    }

    _updateSpores(mx, my, isClicking) {
        const w = window.innerWidth, h = window.innerHeight;

        // Wind shifts
        this.windAngle += (Math.random() - 0.5) * 0.02;
        const windX = Math.cos(this.windAngle) * this.windSpeed;
        const windY = Math.sin(this.windAngle) * this.windSpeed;

        // Burst on click (mutually exclusive with auto-emit)
        if (this.burstCooldown > 0) this.burstCooldown--;

        if (isClicking) {
            if (this.burstCooldown === 0 && this.particles.length < this.maxParticles) {
                this.burstCooldown = 5;
                const count = 3 + Math.floor(Math.random() * 4);
                for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 1 + Math.random() * 4;
                    this.particles.push({
                        x: mx, y: my,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: 1.0,
                        decay: 0.003 + Math.random() * 0.005,
                        size: 1 + Math.random() * 3,
                        spin: (Math.random() - 0.5) * 0.1,
                        angle: 0,
                        hueOffset: Math.random() * 40 - 20,
                    });
                }
            }
        } else {
            // Auto-emit gently when not clicking
            if (this.tick % 15 === 0 && this.particles.length < this.maxParticles / 2) {
                this.particles.push({
                    x: mx + (Math.random() - 0.5) * 20,
                    y: my + (Math.random() - 0.5) * 20,
                    vx: (Math.random() - 0.5) * 1, vy: -0.5 - Math.random(),
                    life: 1.0, decay: 0.004 + Math.random() * 0.004,
                    size: 1 + Math.random() * 2, spin: (Math.random() - 0.5) * 0.05,
                    angle: 0, hueOffset: Math.random() * 30 - 15,
                });
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.vx += windX * 0.01; p.vy += windY * 0.01 - 0.01; // slight updraft
            p.vx *= 0.99; p.vy *= 0.99;
            p.x += p.vx; p.y += p.vy;
            p.angle += p.spin;
            p.life -= p.decay;
            if (p.life <= 0 || p.x < -50 || p.x > w + 50 || p.y < -50 || p.y > h + 50) {
                this.particles[i] = this.particles[this.particles.length - 1];
                this.particles.pop();
            }
        }
    }

    draw(ctx, system) {
        if (this.particles.length === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        switch (this.mode) {
            case 0: this._drawMurmuration(ctx); break;
            case 1: this._drawFireflies(ctx); break;
            case 2: this._drawMagneticChains(ctx); break;
            case 3: this._drawPredatorPrey(ctx); break;
            case 4: this._drawOrbitDance(ctx); break;
            case 5: this._drawSpores(ctx); break;
        }

        ctx.restore();
    }

    _drawMurmuration(ctx) {
        const alignDistSq = this.alignmentDist * this.alignmentDist;

        // Draw connections between nearby boids (batch into single path per alpha range)
        ctx.lineWidth = 0.3;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            for (let j = i + 1; j < this.particles.length; j++) {
                const o = this.particles[j];
                const dx = o.x - p.x, dy = o.y - p.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < alignDistSq) {
                    const dist = Math.sqrt(distSq);
                    const alpha = (1 - dist / this.alignmentDist) * 0.15;
                    ctx.strokeStyle = `hsla(${this.hue}, 60%, 60%, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(o.x, o.y);
                    ctx.stroke();
                }
            }

            // Draw boid as directional triangle
            const angle = Math.atan2(p.vy, p.vx);
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const hue = (this.hue + p.hueOffset + 360) % 360;
            const brightness = 55 + speed * 5;
            ctx.fillStyle = `hsla(${hue}, 70%, ${brightness}%, 0.4)`;
            ctx.beginPath();
            ctx.moveTo(p.x + Math.cos(angle) * 4, p.y + Math.sin(angle) * 4);
            ctx.lineTo(p.x + Math.cos(angle + 2.4) * 2.5, p.y + Math.sin(angle + 2.4) * 2.5);
            ctx.lineTo(p.x + Math.cos(angle - 2.4) * 2.5, p.y + Math.sin(angle - 2.4) * 2.5);
            ctx.closePath();
            ctx.fill();
        }
    }

    _drawFireflies(ctx) {
        for (const p of this.particles) {
            if (p.brightness < 0.05) continue;
            const hue = (this.hue + p.hueOffset + 360) % 360;
            const alpha = p.brightness * 0.5;

            // Outer glow
            ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${alpha * 0.2})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 10 + p.brightness * 8, 0, Math.PI * 2);
            ctx.fill();

            // Middle glow
            ctx.fillStyle = `hsla(${hue}, 85%, 75%, ${alpha * 0.4})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5 + p.brightness * 4, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `hsla(${hue}, 90%, 90%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.5 + p.brightness * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawMagneticChains(ctx) {
        // Draw connections between opposite charges
        ctx.lineWidth = 0.5;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            for (let j = i + 1; j < this.particles.length; j++) {
                const o = this.particles[j];
                if (p.charge === o.charge) continue; // only connect opposites
                const dx = o.x - p.x, dy = o.y - p.y;
                const distSq = dx * dx + dy * dy;
                const maxDistSq = this.chainDist * this.chainDist * 2.25;
                if (distSq < maxDistSq) {
                    const dist = Math.sqrt(distSq);
                    const alpha = (1 - dist / (this.chainDist * 1.5)) * 0.3;
                    ctx.strokeStyle = `hsla(${this.hue}, 60%, 55%, ${alpha})`;
                    // Draw as curved line for visual interest
                    const midX = (p.x + o.x) / 2 + (p.y - o.y) * 0.15;
                    const midY = (p.y + o.y) / 2 + (o.x - p.x) * 0.15;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.quadraticCurveTo(midX, midY, o.x, o.y);
                    ctx.stroke();
                }
            }

            // Draw particle with charge indicator
            const hue = p.charge > 0 ? this.hue : (this.hue + 180) % 360;
            ctx.fillStyle = `hsla(${hue}, 80%, 65%, 0.5)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            // Small charge symbol
            ctx.strokeStyle = `hsla(${hue}, 90%, 80%, 0.3)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x - 3, p.y);
            ctx.lineTo(p.x + 3, p.y);
            if (p.charge > 0) {
                ctx.moveTo(p.x, p.y - 3);
                ctx.lineTo(p.x, p.y + 3);
            }
            ctx.stroke();
        }
    }

    _drawPredatorPrey(ctx) {
        for (const p of this.particles) {
            if (p.type === 'prey') {
                const hue = (this.hue + 60 + p.hueOffset) % 360;
                const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                // Prey glow brighter when fleeing fast
                const fleeGlow = Math.min(1, speed / 3);
                ctx.fillStyle = `hsla(${hue}, 70%, ${60 + fleeGlow * 15}%, ${0.3 + fleeGlow * 0.15})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size + fleeGlow, 0, Math.PI * 2);
                ctx.fill();
            } else {
                const hue = (this.hue + 180) % 360;
                // Predator has menacing glow
                ctx.fillStyle = `hsla(${hue}, 90%, 40%, 0.1)`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = `hsla(${hue}, 90%, 50%, 0.15)`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = `hsla(${hue}, 95%, 60%, 0.5)`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    _drawOrbitDance(ctx) {
        const cx = this._orbitCenterX;
        const cy = this._orbitCenterY;

        // Draw shell rings (faint dashed circles)
        ctx.setLineDash([3, 6]);
        ctx.lineWidth = 0.5;
        for (const shell of this.shells) {
            ctx.strokeStyle = `hsla(${shell.hue}, 30%, 40%, 0.04)`;
            ctx.beginPath();
            ctx.arc(cx, cy, shell.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Draw particles with motion trails
        for (const p of this.particles) {
            const shell = this.shells[p.shell];
            const hue = shell.hue;
            const size = p.size;

            // Short motion trail
            const trailLen = 0.15;
            const trailAngle = p.angle - shell.speed * 5;
            const radius = shell.radius + Math.sin(p.wobble) * p.wobbleAmp;
            const tx = cx + Math.cos(trailAngle) * radius;
            const ty = cy + Math.sin(trailAngle) * radius;
            ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.08)`;
            ctx.lineWidth = size * 0.5;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();

            // Particle glow
            ctx.fillStyle = `hsla(${hue}, 90%, 85%, 0.15)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Particle core
            ctx.fillStyle = `hsla(${hue}, 80%, 70%, 0.45)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawSpores(ctx) {
        for (const p of this.particles) {
            const hue = (this.hue + p.hueOffset + 360) % 360;
            const alpha = p.life * 0.4;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);

            // Spore body
            ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Glow
            ctx.fillStyle = `hsla(${hue}, 80%, 75%, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }
}
