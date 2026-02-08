/**
 * @file ink_architecture.js
 * @description Ink/watercolor diffusion simulation. Ink blobs spread across
 * the screen creating beautiful organic patterns that blend and mix.
 * Seeds determine: ink palette, diffusion speed, blob behavior, paper texture.
 * Mouse movement leaves ink trails. Click creates new ink splashes.
 * Each seed produces a completely different color composition.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class InkArchitecture extends Architecture {
    constructor() {
        super();
        this.blobs = [];
        this.droplets = [];
        this.dropletPool = [];
        this.splashes = [];
        this.paperGrain = [];
        this.palette = [];
        this.diffusionStyle = 0;
        this.inkTrail = [];
        this.trailPool = [];
        this.bleedRate = 0;
    }

    init(system) {
        const rng = system.rng;

        // Palette determines the entire mood
        const palettes = [
            // Sumi-e (Japanese ink wash)
            [{ h: 0, s: 0, l: 15 }, { h: 0, s: 0, l: 25 }, { h: 0, s: 0, l: 40 }, { h: 200, s: 10, l: 20 }],
            // Sunset watercolor
            [{ h: 10, s: 85, l: 55 }, { h: 35, s: 90, l: 60 }, { h: 340, s: 80, l: 50 }, { h: 280, s: 60, l: 45 }],
            // Ocean current
            [{ h: 190, s: 80, l: 40 }, { h: 210, s: 75, l: 50 }, { h: 170, s: 70, l: 45 }, { h: 240, s: 60, l: 35 }],
            // Forest canopy
            [{ h: 120, s: 60, l: 35 }, { h: 90, s: 50, l: 40 }, { h: 45, s: 70, l: 45 }, { h: 150, s: 55, l: 30 }],
            // Neon bleed
            [{ h: 300, s: 100, l: 55 }, { h: 180, s: 100, l: 50 }, { h: 60, s: 100, l: 55 }, { h: 0, s: 100, l: 50 }],
            // Blood & gold
            [{ h: 0, s: 90, l: 30 }, { h: 45, s: 85, l: 55 }, { h: 15, s: 80, l: 40 }, { h: 350, s: 70, l: 25 }],
            // Cosmic nebula
            [{ h: 270, s: 80, l: 40 }, { h: 330, s: 70, l: 45 }, { h: 200, s: 85, l: 35 }, { h: 50, s: 60, l: 50 }]
        ];
        this.palette = palettes[Math.floor(rng() * palettes.length)];

        // Diffusion style changes movement patterns
        this.diffusionStyle = Math.floor(rng() * 4);
        // 0 = organic spread, 1 = flowing river, 2 = exploding drops, 3 = crystalline fracture

        this.bleedRate = 0.3 + rng() * 0.7;

        // Initial ink blobs
        this.blobs = [];
        const blobCount = 4 + Math.floor(rng() * 6);
        for (let i = 0; i < blobCount; i++) {
            this.createBlob(
                system.width * (0.1 + rng() * 0.8),
                system.height * (0.1 + rng() * 0.8),
                40 + rng() * 100,
                this.palette[Math.floor(rng() * this.palette.length)],
                rng,
                system
            );
        }

        // Paper grain texture dots
        this.paperGrain = [];
        const grainCount = 300;
        for (let i = 0; i < grainCount; i++) {
            this.paperGrain.push({
                x: rng() * system.width,
                y: rng() * system.height,
                size: rng() * 2 + 0.5,
                alpha: rng() * 0.04 + 0.01
            });
        }

        this.droplets = [];
        this.dropletPool = [];
        this.splashes = [];
        this.inkTrail = [];
        this.trailPool = [];
    }

    createBlob(x, y, radius, color, rng, system) {
        // Each blob is made of many small particles that diffuse outward
        const particleCount = 30 + Math.floor(rng() * 40);
        const blob = {
            x, y,
            particles: [],
            color,
            age: 0,
            maxAge: 600 + Math.floor(rng() * 400)
        };

        for (let i = 0; i < particleCount; i++) {
            const angle = rng() * Math.PI * 2;
            const dist = rng() * radius * 0.3;
            const speed = 0.1 + rng() * this.bleedRate;

            blob.particles.push({
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                vx: Math.cos(angle) * speed * (0.5 + rng()),
                vy: Math.sin(angle) * speed * (0.5 + rng()),
                size: 3 + rng() * (radius * 0.15),
                alpha: 0.03 + rng() * 0.08,
                maxAlpha: 0.03 + rng() * 0.08,
                angle: angle,
                wobble: rng() * Math.PI * 2,
                wobbleSpeed: 0.01 + rng() * 0.03,
                drag: 0.99 + rng() * 0.008
            });
        }

        this.blobs.push(blob);
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;
        const rng = system.rng;

        // Update blobs
        this.blobs.forEach(blob => {
            blob.age++;

            blob.particles.forEach(p => {
                // Diffusion movement
                switch (this.diffusionStyle) {
                    case 0: // Organic spread
                        p.wobble += p.wobbleSpeed;
                        p.vx += Math.cos(p.wobble) * 0.02;
                        p.vy += Math.sin(p.wobble) * 0.02;
                        break;
                    case 1: // Flowing river
                        p.vx += Math.sin(p.y * 0.005 + system.tick * 0.003) * 0.03;
                        p.vy += 0.01; // slight downward flow
                        break;
                    case 2: // Exploding drops
                        // Particles accelerate outward then slow
                        const dx = p.x - blob.x;
                        const dy = p.y - blob.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        if (dist < 200) {
                            p.vx += (dx / dist) * 0.02;
                            p.vy += (dy / dist) * 0.02;
                        }
                        break;
                    case 3: // Crystalline fracture
                        // Snap to grid-like angles
                        const snapAngle = Math.round(p.angle / (Math.PI / 4)) * (Math.PI / 4);
                        p.vx += Math.cos(snapAngle) * 0.03;
                        p.vy += Math.sin(snapAngle) * 0.03;
                        break;
                }

                // Mouse interaction: ink flows away from cursor
                const mdx = p.x - mx;
                const mdy = p.y - my;
                const mDistSq = mdx * mdx + mdy * mdy;

                if (system.isGravityWell && mDistSq < 90000) {
                    // Gravity well: swirl ink around mouse
                    const mDist = Math.sqrt(mDistSq);
                    p.vx += (-mdy / mDist) * 0.5;
                    p.vy += (mdx / mDist) * 0.5;
                    // Pull inward slightly
                    p.vx -= (mdx / mDist) * 0.2;
                    p.vy -= (mdy / mDist) * 0.2;
                } else if (mDistSq < 22500) {
                    const mDist = Math.sqrt(mDistSq);
                    const force = (150 - mDist) / 150;
                    // Push ink away from cursor
                    p.vx += (mdx / mDist) * force * 0.3;
                    p.vy += (mdy / mDist) * force * 0.3;
                }

                // Shockwave interaction
                system.shockwaves.forEach(sw => {
                    const sdx = p.x - sw.x;
                    const sdy = p.y - sw.y;
                    const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
                    if (Math.abs(sDist - sw.radius) < 50) {
                        const impact = (1 - Math.abs(sDist - sw.radius) / 50) * sw.strength;
                        p.vx += (sdx / sDist) * impact * 3;
                        p.vy += (sdy / sDist) * impact * 3;
                    }
                });

                p.x += p.vx * system.speedMultiplier;
                p.y += p.vy * system.speedMultiplier;
                p.vx *= p.drag;
                p.vy *= p.drag;

                // Grow slightly as ink diffuses
                if (blob.age < blob.maxAge * 0.5) {
                    p.size += 0.02;
                }

                // Fade over time
                if (blob.age > blob.maxAge * 0.7) {
                    p.alpha = p.maxAlpha * (1 - (blob.age - blob.maxAge * 0.7) / (blob.maxAge * 0.3));
                }
            });
        });

        // Remove dead blobs
        for (let i = this.blobs.length - 1; i >= 0; i--) {
            if (this.blobs[i].age > this.blobs[i].maxAge) {
                this.blobs.splice(i, 1);
            }
        }

        // Spawn new blobs occasionally to keep it alive
        if (this.blobs.length < 3 && rng() < 0.02) {
            this.createBlob(
                rng() * system.width,
                rng() * system.height,
                40 + rng() * 80,
                this.palette[Math.floor(rng() * this.palette.length)],
                rng,
                system
            );
        }

        // Mouse ink trail
        if (this.lastMX !== undefined) {
            const speed = Math.sqrt(
                (mx - this.lastMX) * (mx - this.lastMX) +
                (my - this.lastMY) * (my - this.lastMY)
            );
            if (speed > 2) {
                const trailColor = this.palette[Math.floor(rng() * this.palette.length)];
                let t = this.trailPool.length > 0 ? this.trailPool.pop() : {};
                t.x = mx + (rng() - 0.5) * 10;
                t.y = my + (rng() - 0.5) * 10;
                t.size = 3 + speed * 0.3 + rng() * 5;
                t.alpha = 0.06 + rng() * 0.04;
                t.life = 1.0;
                t.decay = 0.003 + rng() * 0.005;
                t.color = trailColor;
                this.inkTrail.push(t);
            }
        }
        this.lastMX = mx;
        this.lastMY = my;

        // Update ink trail
        for (let i = this.inkTrail.length - 1; i >= 0; i--) {
            const t = this.inkTrail[i];
            t.life -= t.decay;
            t.size += 0.05; // Ink bleeds outward
            if (t.life <= 0) {
                this.trailPool.push(this.inkTrail[i]);
                // Swap and pop for performance
                this.inkTrail[i] = this.inkTrail[this.inkTrail.length - 1];
                this.inkTrail.pop();
            }
        }

        // Cap trail count
        while (this.inkTrail.length > 400) {
            this.trailPool.push(this.inkTrail.shift());
        }

        // Update droplets (small ambient drops)
        if (rng() < 0.05) {
            const color = this.palette[Math.floor(rng() * this.palette.length)];
            let d = this.dropletPool.length > 0 ? this.dropletPool.pop() : {};
            d.x = rng() * system.width;
            d.y = rng() * system.height;
            d.size = 1 + rng() * 4;
            d.maxSize = d.size + 5 + rng() * 15;
            d.growRate = 0.05 + rng() * 0.1;
            d.alpha = 0.05 + rng() * 0.05;
            d.color = color;
            this.droplets.push(d);
        }

        for (let i = this.droplets.length - 1; i >= 0; i--) {
            const d = this.droplets[i];
            d.size += d.growRate;
            if (d.size > d.maxSize) {
                d.alpha -= 0.002;
            }
            if (d.alpha <= 0 || d.size > d.maxSize * 1.5) {
                this.dropletPool.push(this.droplets[i]);
                this.droplets[i] = this.droplets[this.droplets.length - 1];
                this.droplets.pop();
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;

        // Paper grain texture (very subtle)
        ctx.fillStyle = '#fff';
        for (let i = 0; i < this.paperGrain.length; i++) {
            const g = this.paperGrain[i];
            ctx.globalAlpha = g.alpha;
            ctx.fillRect(g.x, g.y, g.size, g.size);
        }
        ctx.globalAlpha = 1;

        // Draw ambient droplets
        for (let i = 0; i < this.droplets.length; i++) {
            const d = this.droplets[i];
            const { h, s, l } = d.color;
            const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.size);
            grad.addColorStop(0, `hsla(${h}, ${s}%, ${l}%, ${d.alpha * 1.5})`);
            grad.addColorStop(0.6, `hsla(${h}, ${s}%, ${l}%, ${d.alpha * 0.5})`);
            grad.addColorStop(1, `hsla(${h}, ${s}%, ${l}%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw main ink blobs
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        this.blobs.forEach(blob => {
            const { h, s, l } = blob.color;
            blob.particles.forEach(p => {
                if (p.alpha < 0.005) return;

                // Outer soft glow
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                grad.addColorStop(0, `hsla(${h}, ${s}%, ${l + 10}%, ${p.alpha * 1.5})`);
                grad.addColorStop(0.4, `hsla(${h}, ${s}%, ${l}%, ${p.alpha})`);
                grad.addColorStop(0.7, `hsla(${h}, ${s - 10}%, ${l - 5}%, ${p.alpha * 0.4})`);
                grad.addColorStop(1, `hsla(${h}, ${s}%, ${l}%, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
        });

        // Draw ink trail from mouse
        for (let i = 0; i < this.inkTrail.length; i++) {
            const t = this.inkTrail[i];
            const { h, s, l } = t.color;
            const alpha = t.alpha * t.life;
            if (alpha < 0.005) continue;

            const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.size);
            grad.addColorStop(0, `hsla(${h}, ${s}%, ${l + 10}%, ${alpha * 1.5})`);
            grad.addColorStop(0.5, `hsla(${h}, ${s}%, ${l}%, ${alpha * 0.6})`);
            grad.addColorStop(1, `hsla(${h}, ${s}%, ${l}%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();

        // Water edge effect: subtle dark edges where ink meets paper
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        this.blobs.forEach(blob => {
            const { h, s, l } = blob.color;
            blob.particles.forEach(p => {
                if (p.alpha < 0.01 || p.size < 5) return;
                ctx.strokeStyle = `hsla(${h}, ${s}%, ${Math.max(0, l - 20)}%, ${p.alpha * 0.3})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.9, 0, Math.PI * 2);
                ctx.stroke();
            });
        });
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }
}
