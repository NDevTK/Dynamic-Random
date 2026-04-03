/**
 * @file trail_blossom_effects.js
 * @description Interactive effect: cursor movement spawns blooming geometric
 * flowers/mandalas that grow, rotate, and fade. Each seed produces different
 * petal shapes, colors, symmetry counts, and bloom animations. Clicking creates
 * a large burst bloom. Flowers interact with each other via proximity coloring.
 */

export class TrailBlossom {
    constructor() {
        this.blooms = [];
        this.bloomPool = [];
        this.maxBlooms = 25;
        this.petalStyle = 0;
        this.symmetry = 6;
        this.palette = [];
        this.spawnTimer = 0;
        this.spawnInterval = 12;
        this.lastMx = 0;
        this.lastMy = 0;
    }

    configure(rng, palette) {
        this.petalStyle = Math.floor(rng() * 5); // 0=round, 1=pointed, 2=star, 3=spiral, 4=geometric
        this.symmetry = 3 + Math.floor(rng() * 7); // 3-9 fold symmetry
        this.spawnInterval = 8 + Math.floor(rng() * 12);
        this.palette = palette && palette.length > 0 ? palette : [
            { h: rng() * 360, s: 60 + rng() * 30, l: 50 + rng() * 20 },
            { h: rng() * 360, s: 50 + rng() * 40, l: 45 + rng() * 25 },
            { h: rng() * 360, s: 70 + rng() * 25, l: 55 + rng() * 15 },
        ];
        this.blooms = [];
        this.bloomPool = [];
    }

    update(mx, my, isClicking) {
        const dx = mx - this.lastMx;
        const dy = my - this.lastMy;
        const speed = Math.sqrt(dx * dx + dy * dy);

        this.spawnTimer++;

        // Spawn blooms based on movement
        if (speed > 3 && this.spawnTimer >= this.spawnInterval && this.blooms.length < this.maxBlooms) {
            this.spawnTimer = 0;
            this._spawnBloom(mx, my, 15 + speed * 0.5);
        }

        // Click creates a big burst bloom
        if (isClicking && this.blooms.length < this.maxBlooms) {
            this._spawnBloom(mx, my, 40 + Math.random() * 20, true);
        }

        this.lastMx = mx;
        this.lastMy = my;

        // Update blooms
        for (let i = this.blooms.length - 1; i >= 0; i--) {
            const b = this.blooms[i];
            b.age++;
            b.growthProgress = Math.min(1, b.age / b.growDuration);
            b.rotation += b.rotationSpeed;
            b.alpha = b.growthProgress < 0.3 ? b.growthProgress / 0.3 :
                      b.age > b.lifetime * 0.6 ? 1 - (b.age - b.lifetime * 0.6) / (b.lifetime * 0.4) : 1;
            b.alpha = Math.max(0, b.alpha) * 0.6;

            if (b.age > b.lifetime) {
                if (this.bloomPool.length < this.maxBlooms) this.bloomPool.push(b);
                this.blooms[i] = this.blooms[this.blooms.length - 1];
                this.blooms.pop();
            }
        }
    }

    _spawnBloom(x, y, maxSize, isBurst) {
        let b = this.bloomPool.length > 0 ? this.bloomPool.pop() : {};
        b.x = x;
        b.y = y;
        b.maxSize = maxSize;
        b.age = 0;
        b.lifetime = isBurst ? 120 + Math.random() * 60 : 60 + Math.random() * 40;
        b.growDuration = isBurst ? 30 : 15;
        b.growthProgress = 0;
        b.rotation = Math.random() * Math.PI * 2;
        b.rotationSpeed = (Math.random() - 0.5) * 0.02;
        b.colorIdx = Math.floor(Math.random() * this.palette.length);
        b.alpha = 0;
        b.symmetry = this.symmetry + (isBurst ? 2 : 0);
        b.innerRatio = 0.3 + Math.random() * 0.4;
        this.blooms.push(b);
    }

    draw(ctx, system) {
        if (this.blooms.length === 0) return;

        ctx.globalCompositeOperation = 'lighter';

        for (const b of this.blooms) {
            if (b.alpha <= 0.01) continue;
            const c = this.palette[b.colorIdx];
            const size = b.maxSize * b.growthProgress;

            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.rotation);
            ctx.globalAlpha = b.alpha;

            const sym = b.symmetry;
            const angleStep = (Math.PI * 2) / sym;

            for (let i = 0; i < sym; i++) {
                const angle = i * angleStep;
                ctx.save();
                ctx.rotate(angle);

                if (this.petalStyle === 0) {
                    // Round petals
                    ctx.beginPath();
                    ctx.ellipse(size * 0.5, 0, size * 0.35, size * 0.15, 0, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${(c.h + i * 10) % 360}, ${c.s}%, ${c.l}%, 0.4)`;
                    ctx.fill();
                } else if (this.petalStyle === 1) {
                    // Pointed petals
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.quadraticCurveTo(size * 0.3, -size * 0.15, size * 0.8, 0);
                    ctx.quadraticCurveTo(size * 0.3, size * 0.15, 0, 0);
                    ctx.fillStyle = `hsla(${(c.h + i * 15) % 360}, ${c.s}%, ${c.l}%, 0.35)`;
                    ctx.fill();
                } else if (this.petalStyle === 2) {
                    // Star points
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(size * 0.7, -size * 0.1);
                    ctx.lineTo(size, 0);
                    ctx.lineTo(size * 0.7, size * 0.1);
                    ctx.closePath();
                    ctx.fillStyle = `hsla(${(c.h + i * 20) % 360}, ${c.s}%, ${c.l}%, 0.3)`;
                    ctx.fill();
                } else if (this.petalStyle === 3) {
                    // Spiral arms
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    const spiralTwist = b.growthProgress * Math.PI * 0.5;
                    for (let t = 0; t <= 1; t += 0.1) {
                        const r = t * size;
                        const a = t * spiralTwist;
                        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                    }
                    ctx.strokeStyle = `hsla(${(c.h + i * 12) % 360}, ${c.s}%, ${c.l}%, 0.4)`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else {
                    // Geometric - layered triangles
                    const layers = 3;
                    for (let l = layers; l >= 1; l--) {
                        const ls = size * (l / layers) * 0.8;
                        ctx.beginPath();
                        ctx.moveTo(ls, 0);
                        ctx.lineTo(ls * 0.3, -ls * 0.2);
                        ctx.lineTo(ls * 0.3, ls * 0.2);
                        ctx.closePath();
                        ctx.fillStyle = `hsla(${(c.h + l * 30 + i * 10) % 360}, ${c.s}%, ${c.l - l * 5}%, ${0.2 / l})`;
                        ctx.fill();
                    }
                }

                ctx.restore();
            }

            // Center dot
            ctx.beginPath();
            ctx.arc(0, 0, size * b.innerRatio * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${c.h}, ${c.s + 10}%, ${c.l + 15}%, ${b.alpha * 0.5})`;
            ctx.fill();

            ctx.restore();
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }
}
