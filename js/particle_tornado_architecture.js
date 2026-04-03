/**
 * @file particle_tornado_architecture.js
 * @description Multiple tornado vortices that suck in particles, spin them around,
 * and fling them outward. Each tornado has its own size, rotation speed, color, and
 * debris field. Mouse cursor attracts/repels tornado funnels. Clicking spawns new
 * temporary micro-tornadoes. Seeds dramatically change tornado count, behavior,
 * particle styles, and atmospheric effects.
 *
 * Modes:
 * 0 - Storm Chaser: Classic dust-devil tornadoes with debris particles and dark sky
 * 1 - Fire Whirl: Flame-colored vortices with ember particles and heat shimmer
 * 2 - Water Spout: Blue spiral columns with spray particles and ocean surface
 * 3 - Galaxy Spiral: Cosmic-scale spirals with star particles and nebula clouds
 * 4 - Petal Storm: Gentle flower petal vortices with pastel colors and soft physics
 * 5 - Electric Vortex: Lightning-infused tornadoes with plasma particles and arc discharges
 */

import { Architecture } from './background_architectures.js';
import { mouse, isLeftMouseDown } from './state.js';

const TAU = Math.PI * 2;

export class ParticleTornadoArchitecture extends Architecture {
    constructor() {
        super();
        this.mode = 0;
        this.tick = 0;

        // Tornadoes
        this._tornadoes = [];
        this._maxTornadoes = 6;

        // Particles
        this._particles = [];
        this._particlePool = [];
        this._maxParticles = 400;

        // Debris/sparks from tornado interactions
        this._debris = [];
        this._debrisPool = [];

        // Atmospheric elements
        this._clouds = [];
        this._arcs = []; // Electric arcs for mode 5

        // Theme
        this._baseHue = 0;
        this._particleStyle = 0; // 0=dots, 1=streaks, 2=shapes, 3=embers
        this._atmosphereAlpha = 0;
        this._groundLevel = 0;

        // Click tracking
        this._lastClickX = 0;
        this._lastClickY = 0;
        this._clickRegistered = false;
    }

    init(system) {
        const rng = system.rng;

        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this._tornadoes = [];
        this._particles = [];
        this._debris = [];
        this._clouds = [];
        this._arcs = [];

        const W = system.width, H = system.height;

        switch (this.mode) {
            case 0: // Storm Chaser
                this._baseHue = 30 + rng() * 20;
                this._particleStyle = Math.floor(rng() * 2); // dots or streaks
                this._atmosphereAlpha = 0.15 + rng() * 0.1;
                this._groundLevel = H * 0.85;
                break;
            case 1: // Fire Whirl
                this._baseHue = rng() * 30;
                this._particleStyle = 3; // embers
                this._atmosphereAlpha = 0.1 + rng() * 0.1;
                this._groundLevel = H * 0.9;
                break;
            case 2: // Water Spout
                this._baseHue = 190 + rng() * 30;
                this._particleStyle = 0; // spray dots
                this._atmosphereAlpha = 0.08;
                this._groundLevel = H * 0.75;
                break;
            case 3: // Galaxy Spiral
                this._baseHue = 240 + rng() * 80;
                this._particleStyle = 0; // stars
                this._atmosphereAlpha = 0.02;
                this._groundLevel = H; // no ground
                break;
            case 4: // Petal Storm
                this._baseHue = 300 + rng() * 60;
                this._particleStyle = 2; // shapes (petals)
                this._atmosphereAlpha = 0.05;
                this._groundLevel = H;
                break;
            case 5: // Electric Vortex
                this._baseHue = 180 + rng() * 60;
                this._particleStyle = 1; // streaks
                this._atmosphereAlpha = 0.1;
                this._groundLevel = H * 0.9;
                break;
        }

        // Generate tornadoes
        const tornadoCount = 1 + Math.floor(rng() * 3);
        for (let i = 0; i < tornadoCount; i++) {
            this._spawnTornado(rng, W, H, true);
        }

        // Generate initial particles
        const initParticles = 100 + Math.floor(rng() * 150);
        for (let i = 0; i < initParticles; i++) {
            this._spawnParticle(rng, W, H);
        }

        // Generate atmospheric clouds
        const cloudCount = 4 + Math.floor(rng() * 6);
        for (let i = 0; i < cloudCount; i++) {
            this._clouds.push({
                x: rng() * W,
                y: rng() * H * 0.4,
                width: 100 + rng() * 200,
                height: 30 + rng() * 50,
                speed: (rng() - 0.5) * 0.5,
                opacity: 0.03 + rng() * 0.05,
            });
        }

        if (!this._clickHandler) {
            this._clickHandler = (e) => {
                this._lastClickX = e.clientX;
                this._lastClickY = e.clientY;
                this._clickRegistered = true;
            };
            window.addEventListener('click', this._clickHandler);
        }
    }

    _spawnTornado(rng, W, H, permanent) {
        if (this._tornadoes.length >= this._maxTornadoes) return;

        const baseX = W * (0.15 + rng() * 0.7);
        this._tornadoes.push({
            x: baseX,
            y: H * 0.5,
            baseX: baseX,
            topY: H * (0.1 + rng() * 0.2),
            bottomY: this._groundLevel,
            width: 30 + rng() * 60,
            topWidth: 80 + rng() * 120,
            rotationSpeed: (0.02 + rng() * 0.04) * (rng() > 0.5 ? 1 : -1),
            wobblePhase: rng() * TAU,
            wobbleSpeed: 0.005 + rng() * 0.01,
            wobbleAmount: 20 + rng() * 40,
            pullStrength: 0.5 + rng() * 1.5,
            hue: (this._baseHue + rng() * 40) % 360,
            permanent: permanent,
            life: permanent ? Infinity : 120 + rng() * 120,
            maxLife: 240,
            layers: 8 + Math.floor(rng() * 8),
            suctionRadius: 150 + rng() * 150,
        });
    }

    _spawnParticle(rng, W, H) {
        if (this._particles.length >= this._maxParticles) return;
        const p = this._particlePool.length > 0 ? this._particlePool.pop() : {};
        p.x = rng() * W;
        p.y = rng() * H;
        p.vx = (rng() - 0.5) * 1;
        p.vy = (rng() - 0.5) * 1;
        p.size = 1 + rng() * 3;
        p.hue = (this._baseHue + rng() * 60 - 30 + 360) % 360;
        p.alpha = 0.3 + rng() * 0.5;
        p.rotation = rng() * TAU;
        p.rotSpeed = (rng() - 0.5) * 0.1;
        p.captured = false; // Currently in a tornado?
        p.life = 200 + Math.floor(rng() * 200);
        this._particles.push(p);
    }

    update(system) {
        this.tick++;
        const W = system.width, H = system.height;

        // Handle clicks
        if (this._clickRegistered) {
            this._clickRegistered = false;
            // Spawn temporary micro-tornado at click
            const tempRng = () => Math.random();
            this._spawnTornado(tempRng, W, H, false);
            // Spawn burst of particles
            for (let i = 0; i < 20; i++) {
                this._spawnParticle(tempRng, W, H);
                if (this._particles.length > 0) {
                    const p = this._particles[this._particles.length - 1];
                    p.x = this._lastClickX;
                    p.y = this._lastClickY;
                    const angle = (i / 20) * TAU;
                    p.vx = Math.cos(angle) * (2 + Math.random() * 3);
                    p.vy = Math.sin(angle) * (2 + Math.random() * 3);
                }
            }
        }

        // Update tornadoes
        for (let i = this._tornadoes.length - 1; i >= 0; i--) {
            const t = this._tornadoes[i];

            // Wobble motion
            t.wobblePhase += t.wobbleSpeed;
            t.x = t.baseX + Math.sin(t.wobblePhase) * t.wobbleAmount;

            // Mouse attraction/repulsion
            const dx = mouse.x - t.x;
            const dy = mouse.y - (t.topY + t.bottomY) / 2;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 300 && dist > 1) {
                const force = isLeftMouseDown ? -0.5 : 0.2;
                t.baseX += (dx / dist) * force;
                // Keep in bounds
                t.baseX = Math.max(50, Math.min(W - 50, t.baseX));
            }

            // Temporary tornado life
            if (!t.permanent) {
                t.life--;
                if (t.life <= 0) {
                    this._tornadoes[i] = this._tornadoes[this._tornadoes.length - 1];
                    this._tornadoes.pop();
                }
            }
        }

        // Update particles
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.life--;
            if (p.life <= 0 || p.y < -50 || p.y > H + 50 || p.x < -50 || p.x > W + 50) {
                this._particlePool.push(p);
                this._particles[i] = this._particles[this._particles.length - 1];
                this._particles.pop();
                continue;
            }

            p.captured = false;

            // Tornado forces
            for (const t of this._tornadoes) {
                const lifeAlpha = t.permanent ? 1 : Math.min(1, t.life / 30);
                // Interpolate tornado center at particle's height
                const tProgress = Math.max(0, Math.min(1, (p.y - t.topY) / (t.bottomY - t.topY)));
                const tWidthAtY = t.width + (t.topWidth - t.width) * (1 - tProgress);
                const tcx = t.x;

                const dx = p.x - tcx;
                const dy = p.y - (t.topY + t.bottomY) / 2;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < t.suctionRadius) {
                    p.captured = true;
                    const force = t.pullStrength * (1 - dist / t.suctionRadius) * lifeAlpha;

                    // Tangential (rotation) force
                    const angle = Math.atan2(dy, dx);
                    const tangentX = -Math.sin(angle) * t.rotationSpeed * 20;
                    const tangentY = Math.cos(angle) * t.rotationSpeed * 20;
                    p.vx += tangentX * force * 0.1;
                    p.vy += tangentY * force * 0.1;

                    // Radial pull toward center
                    if (dist > tWidthAtY * 0.3) {
                        p.vx -= (dx / dist) * force * 0.3;
                    }

                    // Updraft (lift particles)
                    p.vy -= force * 0.15;
                }
            }

            // Gravity (mode-dependent)
            if (this.mode !== 3 && this.mode !== 4) {
                p.vy += 0.02;
            }

            // Damping
            p.vx *= 0.98;
            p.vy *= 0.98;

            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotSpeed;
        }

        // Respawn particles to maintain count
        const rng = () => _prand(this.tick * 17 + this._particles.length);
        while (this._particles.length < this._maxParticles * 0.7) {
            this._spawnParticle(rng, W, H);
        }

        // Update clouds
        for (const cloud of this._clouds) {
            cloud.x += cloud.speed;
            if (cloud.x > W + cloud.width) cloud.x = -cloud.width;
            if (cloud.x < -cloud.width * 2) cloud.x = W + cloud.width;
        }

        // Electric arcs (mode 5)
        if (this.mode === 5 && this.tick % 15 === 0 && this._tornadoes.length > 0) {
            const t = this._tornadoes[Math.floor(Math.random() * this._tornadoes.length)];
            if (this._arcs.length < 10) {
                this._arcs.push({
                    x1: t.x + (Math.random() - 0.5) * t.topWidth,
                    y1: t.topY + Math.random() * (t.bottomY - t.topY) * 0.5,
                    x2: t.x + (Math.random() - 0.5) * t.topWidth * 2,
                    y2: t.topY + Math.random() * (t.bottomY - t.topY),
                    life: 5 + Math.floor(Math.random() * 10),
                    hue: (this._baseHue + Math.random() * 40) % 360,
                });
            }
        }
        for (let i = this._arcs.length - 1; i >= 0; i--) {
            this._arcs[i].life--;
            if (this._arcs[i].life <= 0) {
                this._arcs[i] = this._arcs[this._arcs.length - 1];
                this._arcs.pop();
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const W = system.width, H = system.height;

        ctx.save();

        // Atmospheric gradient overlay
        if (this._atmosphereAlpha > 0) {
            const g = ctx.createLinearGradient(0, 0, 0, H);
            if (this.mode === 1) {
                // Fire: warm atmosphere
                g.addColorStop(0, `hsla(${this._baseHue}, 80%, 10%, ${this._atmosphereAlpha})`);
                g.addColorStop(1, `hsla(${this._baseHue + 20}, 90%, 20%, ${this._atmosphereAlpha * 1.5})`);
            } else if (this.mode === 2) {
                // Water: blue mist
                g.addColorStop(0, `hsla(${this._baseHue}, 40%, 40%, ${this._atmosphereAlpha * 0.5})`);
                g.addColorStop(1, `hsla(${this._baseHue}, 60%, 20%, ${this._atmosphereAlpha})`);
            } else {
                g.addColorStop(0, `hsla(${this._baseHue}, 20%, 15%, ${this._atmosphereAlpha})`);
                g.addColorStop(1, `hsla(${this._baseHue}, 30%, 8%, ${this._atmosphereAlpha * 0.5})`);
            }
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        }

        // Draw clouds
        ctx.globalCompositeOperation = 'lighter';
        for (const cloud of this._clouds) {
            const g = ctx.createRadialGradient(
                cloud.x + cloud.width / 2, cloud.y + cloud.height / 2, 0,
                cloud.x + cloud.width / 2, cloud.y + cloud.height / 2, cloud.width / 2
            );
            g.addColorStop(0, `hsla(${this._baseHue}, 20%, 50%, ${cloud.opacity})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(cloud.x + cloud.width / 2, cloud.y + cloud.height / 2,
                cloud.width / 2, cloud.height / 2, 0, 0, TAU);
            ctx.fill();
        }

        // Draw tornado funnels
        for (const t of this._tornadoes) {
            const lifeAlpha = t.permanent ? 1 : Math.min(1, t.life / 30);

            ctx.globalCompositeOperation = 'lighter';

            // Draw funnel layers
            for (let layer = 0; layer < t.layers; layer++) {
                const progress = layer / t.layers;
                const y = t.topY + (t.bottomY - t.topY) * progress;
                const widthAtLayer = t.width + (t.topWidth - t.width) * (1 - progress);
                const rotOffset = this.tick * t.rotationSpeed + layer * 0.5;

                // Swirling oval at each layer height
                const alpha = (0.02 + (1 - progress) * 0.03) * lifeAlpha;
                const hue = (t.hue + layer * 5) % 360;

                ctx.save();
                ctx.translate(t.x, y);
                ctx.rotate(rotOffset);

                ctx.strokeStyle = `hsla(${hue}, 60%, 55%, ${alpha})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(0, 0, widthAtLayer, widthAtLayer * 0.3, 0, 0, TAU);
                ctx.stroke();

                // Inner glow
                if (layer % 2 === 0) {
                    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, widthAtLayer * 0.8);
                    g.addColorStop(0, `hsla(${hue}, 70%, 60%, ${alpha * 0.5})`);
                    g.addColorStop(1, 'transparent');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, widthAtLayer * 0.8, widthAtLayer * 0.25, 0, 0, TAU);
                    ctx.fill();
                }

                ctx.restore();
            }

            // Central column glow
            const columnGrad = ctx.createLinearGradient(t.x, t.topY, t.x, t.bottomY);
            columnGrad.addColorStop(0, `hsla(${t.hue}, 50%, 60%, ${0.03 * lifeAlpha})`);
            columnGrad.addColorStop(0.5, `hsla(${t.hue}, 60%, 70%, ${0.06 * lifeAlpha})`);
            columnGrad.addColorStop(1, `hsla(${t.hue}, 40%, 50%, ${0.02 * lifeAlpha})`);
            ctx.fillStyle = columnGrad;

            ctx.beginPath();
            ctx.moveTo(t.x - t.width * 0.3, t.bottomY);
            ctx.quadraticCurveTo(t.x - t.topWidth * 0.4, (t.topY + t.bottomY) / 2,
                t.x - t.topWidth * 0.5, t.topY);
            ctx.lineTo(t.x + t.topWidth * 0.5, t.topY);
            ctx.quadraticCurveTo(t.x + t.topWidth * 0.4, (t.topY + t.bottomY) / 2,
                t.x + t.width * 0.3, t.bottomY);
            ctx.closePath();
            ctx.fill();
        }

        // Draw particles
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this._particles) {
            const lifeAlpha = Math.min(1, p.life / 30);
            const alpha = p.alpha * lifeAlpha * (p.captured ? 1.2 : 0.6);
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);

            if (this._particleStyle === 0) {
                // Dots
                ctx.fillStyle = `hsla(${p.hue}, 70%, 65%, ${alpha * 0.5})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (p.captured ? 1.5 : 1), 0, TAU);
                ctx.fill();
            } else if (this._particleStyle === 1) {
                // Streaks
                const len = Math.min(15, speed * 3);
                const angle = Math.atan2(p.vy, p.vx);
                ctx.strokeStyle = `hsla(${p.hue}, 80%, 65%, ${alpha * 0.4})`;
                ctx.lineWidth = p.size * 0.5;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - Math.cos(angle) * len, p.y - Math.sin(angle) * len);
                ctx.stroke();
            } else if (this._particleStyle === 2) {
                // Petal shapes
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = `hsla(${p.hue}, 60%, 70%, ${alpha * 0.4})`;
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size * 2, p.size, 0, 0, TAU);
                ctx.fill();
                ctx.restore();
            } else {
                // Embers (mode 1)
                const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
                glow.addColorStop(0, `hsla(${p.hue}, 90%, 80%, ${alpha * 0.5})`);
                glow.addColorStop(0.5, `hsla(${p.hue + 20}, 80%, 50%, ${alpha * 0.2})`);
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 3, 0, TAU);
                ctx.fill();
            }
        }

        // Draw electric arcs (mode 5)
        if (this.mode === 5) {
            for (const arc of this._arcs) {
                ctx.strokeStyle = `hsla(${arc.hue}, 90%, 75%, ${(arc.life / 15) * 0.6})`;
                ctx.lineWidth = 1 + Math.random() * 2;
                ctx.beginPath();
                ctx.moveTo(arc.x1, arc.y1);
                // Jagged lightning path
                const segments = 5;
                for (let s = 1; s <= segments; s++) {
                    const t = s / segments;
                    const lx = arc.x1 + (arc.x2 - arc.x1) * t + (Math.random() - 0.5) * 30;
                    const ly = arc.y1 + (arc.y2 - arc.y1) * t + (Math.random() - 0.5) * 20;
                    ctx.lineTo(lx, ly);
                }
                ctx.stroke();
            }
        }

        // Ground plane (for applicable modes)
        if (this._groundLevel < H) {
            ctx.globalCompositeOperation = 'source-over';
            const groundGrad = ctx.createLinearGradient(0, this._groundLevel - 30, 0, H);
            if (this.mode === 2) {
                groundGrad.addColorStop(0, 'transparent');
                groundGrad.addColorStop(0.3, `hsla(${this._baseHue}, 50%, 20%, 0.15)`);
                groundGrad.addColorStop(1, `hsla(${this._baseHue}, 60%, 15%, 0.25)`);
            } else {
                groundGrad.addColorStop(0, 'transparent');
                groundGrad.addColorStop(1, `hsla(${this._baseHue}, 20%, 10%, 0.15)`);
            }
            ctx.fillStyle = groundGrad;
            ctx.fillRect(0, this._groundLevel - 30, W, H - this._groundLevel + 30);
        }

        ctx.restore();
    }
}

function _prand(seed) {
    return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
}
