/**
 * @file gravity_painting_effects.js
 * @description Interactive gravity-influenced painting system. Mouse movements deposit
 * paint blobs that drip, pool, blend, and flow under simulated gravity. Different seeds
 * create wildly different painting styles, color palettes, and physical behaviors.
 *
 * Modes:
 * 0 - Watercolor Wash: Translucent blobs that spread, bleed into each other, soft edges
 * 1 - Molten Drip: Thick glowing paint that drips down under heavy gravity, lava-like
 * 2 - Splatter Jackson: Explosive paint splatters on click, chaotic fling on fast movement
 * 3 - Ink Sumi-e: Calligraphic brush strokes with pressure sensitivity from mouse speed
 * 4 - Neon Graffiti: Bright spray-paint effect with overspray haze and drip runs
 * 5 - Frozen Crystal Paint: Paint crystallizes into geometric structures as it settles
 */

const TAU = Math.PI * 2;

export class GravityPainting {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Paint blobs
        this._blobs = [];
        this._blobPool = [];
        this._maxBlobs = 300;

        // Drip particles
        this._drips = [];
        this._dripPool = [];
        this._maxDrips = 80;

        // Offscreen paint canvas (persistent layer)
        this._paintCanvas = null;
        this._paintCtx = null;
        this._paintW = 0;
        this._paintH = 0;

        // Splatter particles for mode 2
        this._splatters = [];

        // Crystal structures for mode 5
        this._crystals = [];
        this._maxCrystals = 60;

        // Physics
        this._gravity = 0.02;
        this._viscosity = 0.98;
        this._spreadRate = 0.5;
        this._dripThreshold = 0.6;

        // Color palette for this seed
        this._palette = [];
        this._colorIndex = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.intensity = 0.5 + rng() * 0.5;
        this._blobs = [];
        this._drips = [];
        this._splatters = [];
        this._crystals = [];
        this._colorIndex = 0;

        // Build a rich palette from the seed
        this._palette = [];
        const baseHue = this.hue;
        const harmony = Math.floor(rng() * 4); // 0=analogous, 1=complementary, 2=triadic, 3=split-comp
        for (let i = 0; i < 6; i++) {
            let h;
            if (harmony === 0) h = (baseHue + i * 25 - 60 + 360) % 360;
            else if (harmony === 1) h = (baseHue + (i % 2 === 0 ? 0 : 180) + i * 10) % 360;
            else if (harmony === 2) h = (baseHue + i * 120 + rng() * 20) % 360;
            else h = (baseHue + (i % 3 === 0 ? 0 : i % 3 === 1 ? 150 : 210) + rng() * 15) % 360;
            this._palette.push({
                h, s: 40 + rng() * 50, l: 35 + rng() * 35
            });
        }

        // Mode-specific physics
        switch (this.mode) {
            case 0: // Watercolor
                this._gravity = 0.005 + rng() * 0.01;
                this._viscosity = 0.995;
                this._spreadRate = 1.0 + rng() * 1.5;
                this._dripThreshold = 0.8;
                this._maxBlobs = 200;
                break;
            case 1: // Molten Drip
                this._gravity = 0.08 + rng() * 0.06;
                this._viscosity = 0.97;
                this._spreadRate = 0.3;
                this._dripThreshold = 0.3;
                this._maxBlobs = 150;
                break;
            case 2: // Splatter
                this._gravity = 0.02 + rng() * 0.02;
                this._viscosity = 0.99;
                this._spreadRate = 0.1;
                this._dripThreshold = 0.9;
                this._maxBlobs = 300;
                break;
            case 3: // Sumi-e
                this._gravity = 0.003;
                this._viscosity = 0.999;
                this._spreadRate = 0.2;
                this._dripThreshold = 0.95;
                this._maxBlobs = 250;
                break;
            case 4: // Neon Graffiti
                this._gravity = 0.04 + rng() * 0.03;
                this._viscosity = 0.985;
                this._spreadRate = 0.6;
                this._dripThreshold = 0.5;
                this._maxBlobs = 200;
                break;
            case 5: // Frozen Crystal
                this._gravity = 0.01;
                this._viscosity = 0.96;
                this._spreadRate = 0.05;
                this._dripThreshold = 0.7;
                this._maxBlobs = 180;
                break;
        }

        const W = window.innerWidth, H = window.innerHeight;
        this._paintW = Math.ceil(W / 2);
        this._paintH = Math.ceil(H / 2);
        this._paintCanvas = document.createElement('canvas');
        this._paintCanvas.width = this._paintW;
        this._paintCanvas.height = this._paintH;
        this._paintCtx = this._paintCanvas.getContext('2d', { alpha: true });
        this._paintCtx.clearRect(0, 0, this._paintW, this._paintH);
    }

    _nextColor() {
        this._colorIndex = (this._colorIndex + 1) % this._palette.length;
        return this._palette[this._colorIndex];
    }

    _spawnBlob(x, y, vx, vy, size, color) {
        if (this._blobs.length >= this._maxBlobs) return;
        const blob = this._blobPool.length > 0 ? this._blobPool.pop() : {};
        blob.x = x; blob.y = y;
        blob.vx = vx; blob.vy = vy;
        blob.size = size;
        blob.life = 1.0;
        blob.decay = 0.003 + Math.random() * 0.005;
        blob.color = color || this._nextColor();
        blob.spread = 0;
        blob.settled = false;
        this._blobs.push(blob);
    }

    _spawnDrip(x, y, color) {
        if (this._drips.length >= this._maxDrips) return;
        const drip = this._dripPool.length > 0 ? this._dripPool.pop() : {};
        drip.x = x; drip.y = y;
        drip.vy = 0.5 + Math.random() * 1.5;
        drip.size = 1 + Math.random() * 2;
        drip.life = 1.0;
        drip.color = color;
        drip.length = 0;
        this._drips.push(drip);
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx; this._pmy = this._my;
        this._mx = mx; this._my = my;
        const dx = mx - this._pmx, dy = my - this._pmy;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);

        // Deposit paint based on mode
        if (this._mouseSpeed > 1) {
            const color = this._nextColor();
            if (this.mode === 0) {
                // Watercolor: gentle blobs along path
                if (this.tick % 2 === 0) {
                    const size = 8 + this._mouseSpeed * 0.3;
                    this._spawnBlob(mx, my, dx * 0.1, dy * 0.1, size, color);
                }
            } else if (this.mode === 1) {
                // Molten: thick blobs that drip
                const size = 5 + this._mouseSpeed * 0.5;
                this._spawnBlob(mx, my, dx * 0.05, 0.5, size, color);
            } else if (this.mode === 2) {
                // Splatter: fling paint based on speed
                if (this._mouseSpeed > 8) {
                    const count = Math.min(8, Math.floor(this._mouseSpeed * 0.3));
                    for (let i = 0; i < count; i++) {
                        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.5;
                        const speed = this._mouseSpeed * (0.3 + Math.random() * 0.7);
                        this._spawnBlob(
                            mx + (Math.random() - 0.5) * 20,
                            my + (Math.random() - 0.5) * 20,
                            Math.cos(angle) * speed * 0.3,
                            Math.sin(angle) * speed * 0.3,
                            2 + Math.random() * 6, color
                        );
                    }
                } else if (this.tick % 3 === 0) {
                    this._spawnBlob(mx, my, dx * 0.05, dy * 0.05, 3 + Math.random() * 4, color);
                }
            } else if (this.mode === 3) {
                // Sumi-e: pressure-sensitive brush
                const pressure = Math.min(1, this._mouseSpeed / 15);
                const size = 2 + pressure * 12;
                if (this.tick % 2 === 0) {
                    this._spawnBlob(mx, my, dx * 0.02, dy * 0.02, size, {
                        h: this.hue, s: 10, l: 10 + pressure * 20
                    });
                }
            } else if (this.mode === 4) {
                // Neon: spray paint with overspray
                const spread = 15 + this._mouseSpeed * 0.5;
                for (let i = 0; i < 2; i++) {
                    this._spawnBlob(
                        mx + (Math.random() - 0.5) * spread,
                        my + (Math.random() - 0.5) * spread,
                        (Math.random() - 0.5) * 0.5,
                        (Math.random() - 0.5) * 0.5,
                        1 + Math.random() * 3, color
                    );
                }
            } else if (this.mode === 5) {
                // Crystal: small seeds that crystallize
                if (this.tick % 4 === 0) {
                    this._spawnBlob(mx, my, dx * 0.02, dy * 0.02, 3 + Math.random() * 3, color);
                }
            }
        }

        // Click effects
        if (isClicking && !this._wasClicking) {
            const color = this._nextColor();
            if (this.mode === 2) {
                // Big splatter explosion
                for (let i = 0; i < 20; i++) {
                    const angle = Math.random() * TAU;
                    const speed = 2 + Math.random() * 8;
                    this._spawnBlob(mx, my,
                        Math.cos(angle) * speed, Math.sin(angle) * speed,
                        2 + Math.random() * 8, color
                    );
                }
            } else if (this.mode === 5) {
                // Seed a crystal cluster
                if (this._crystals.length < this._maxCrystals) {
                    const sides = 4 + Math.floor(Math.random() * 4);
                    this._crystals.push({
                        x: mx, y: my, size: 5, maxSize: 20 + Math.random() * 30,
                        growth: 0.3 + Math.random() * 0.3, sides,
                        rotation: Math.random() * TAU, color,
                        branches: [], age: 0
                    });
                }
            } else {
                // General: bigger blob on click
                for (let i = 0; i < 5; i++) {
                    const angle = Math.random() * TAU;
                    const speed = 1 + Math.random() * 3;
                    this._spawnBlob(mx, my,
                        Math.cos(angle) * speed, Math.sin(angle) * speed,
                        4 + Math.random() * 8, color
                    );
                }
            }
        }
        this._wasClicking = isClicking;

        const H = window.innerHeight;

        // Update blobs
        for (let i = this._blobs.length - 1; i >= 0; i--) {
            const b = this._blobs[i];
            b.vy += this._gravity;
            b.vx *= this._viscosity;
            b.vy *= this._viscosity;
            b.x += b.vx; b.y += b.vy;
            b.spread += this._spreadRate * b.life;
            b.life -= b.decay;

            // Settle when slow enough
            if (Math.abs(b.vx) < 0.1 && Math.abs(b.vy) < 0.2) {
                b.settled = true;
            }

            // Spawn drips from settled blobs
            if (b.settled && b.life > this._dripThreshold && Math.random() < 0.02) {
                this._spawnDrip(b.x, b.y, b.color);
            }

            // Paint to persistent canvas
            if (this._paintCtx && b.life > 0.1 && this.tick % 3 === 0) {
                const pc = this._paintCtx;
                const px = b.x / 2, py = b.y / 2;
                const pSize = (b.size + b.spread * 0.5) / 2;
                const alpha = b.life * 0.03 * this.intensity;
                pc.globalCompositeOperation = 'source-over';
                pc.fillStyle = `hsla(${b.color.h}, ${b.color.s}%, ${b.color.l}%, ${alpha})`;
                pc.beginPath();
                pc.arc(px, py, pSize, 0, TAU);
                pc.fill();
            }

            if (b.life <= 0 || b.y > H + 20) {
                this._blobPool.push(b);
                this._blobs[i] = this._blobs[this._blobs.length - 1];
                this._blobs.pop();
            }
        }

        // Update drips
        for (let i = this._drips.length - 1; i >= 0; i--) {
            const d = this._drips[i];
            d.vy += this._gravity * 2;
            d.y += d.vy;
            d.length = Math.min(d.length + d.vy, 30);
            d.life -= 0.008;

            // Paint drip trail
            if (this._paintCtx && d.life > 0) {
                const pc = this._paintCtx;
                const alpha = d.life * 0.04 * this.intensity;
                pc.strokeStyle = `hsla(${d.color.h}, ${d.color.s}%, ${d.color.l}%, ${alpha})`;
                pc.lineWidth = d.size / 2;
                pc.beginPath();
                pc.moveTo(d.x / 2, (d.y - d.length) / 2);
                pc.lineTo(d.x / 2, d.y / 2);
                pc.stroke();
            }

            if (d.life <= 0 || d.y > H + 20) {
                this._dripPool.push(d);
                this._drips[i] = this._drips[this._drips.length - 1];
                this._drips.pop();
            }
        }

        // Update crystals
        for (const c of this._crystals) {
            c.age++;
            if (c.size < c.maxSize) {
                c.size += c.growth;
            }
            // Grow branches
            if (c.age % 30 === 0 && c.branches.length < 6 && c.size > 10) {
                const angle = c.rotation + (c.branches.length / 6) * TAU + Math.random() * 0.3;
                c.branches.push({
                    angle, length: 0, maxLength: 10 + Math.random() * 20,
                    growth: 0.2 + Math.random() * 0.3
                });
            }
            for (const br of c.branches) {
                if (br.length < br.maxLength) br.length += br.growth;
            }
        }

        // Fade persistent canvas slowly
        if (this._paintCtx && this.tick % 8 === 0) {
            this._paintCtx.globalCompositeOperation = 'destination-out';
            this._paintCtx.fillStyle = 'rgba(0,0,0,0.003)';
            this._paintCtx.fillRect(0, 0, this._paintW, this._paintH);
        }
    }

    draw(ctx, system) {
        ctx.save();

        // Draw persistent paint layer
        if (this._paintCanvas && this._paintW > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.8 * this.intensity;
            ctx.drawImage(this._paintCanvas, 0, 0, system.width, system.height);
            ctx.globalAlpha = 1;
        }

        ctx.globalCompositeOperation = 'lighter';

        // Active blobs
        for (const b of this._blobs) {
            if (b.life <= 0.05) continue;
            const alpha = b.life * 0.2 * this.intensity;
            const size = b.size + b.spread * 0.3;

            if (this.mode === 1) {
                // Molten: glowing core
                const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, size * 1.5);
                grad.addColorStop(0, `hsla(${b.color.h}, ${b.color.s}%, ${b.color.l + 20}%, ${alpha})`);
                grad.addColorStop(0.5, `hsla(${b.color.h}, ${b.color.s}%, ${b.color.l}%, ${alpha * 0.5})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(b.x, b.y, size * 1.5, 0, TAU);
                ctx.fill();
            } else if (this.mode === 4) {
                // Neon: bright with outer haze
                ctx.fillStyle = `hsla(${b.color.h}, 90%, 75%, ${alpha * 0.3})`;
                ctx.beginPath();
                ctx.arc(b.x, b.y, size * 2, 0, TAU);
                ctx.fill();
                ctx.fillStyle = `hsla(${b.color.h}, 90%, 85%, ${alpha})`;
                ctx.beginPath();
                ctx.arc(b.x, b.y, size * 0.6, 0, TAU);
                ctx.fill();
            } else if (this.mode === 3) {
                // Sumi-e: sharp-edged ink
                ctx.fillStyle = `hsla(${b.color.h}, ${b.color.s}%, ${b.color.l}%, ${alpha * 1.5})`;
                ctx.beginPath();
                ctx.arc(b.x, b.y, size, 0, TAU);
                ctx.fill();
            } else {
                ctx.fillStyle = `hsla(${b.color.h}, ${b.color.s}%, ${b.color.l}%, ${alpha})`;
                ctx.beginPath();
                ctx.arc(b.x, b.y, size, 0, TAU);
                ctx.fill();
            }
        }

        // Drips
        for (const d of this._drips) {
            if (d.life <= 0.05) continue;
            const alpha = d.life * 0.25 * this.intensity;
            ctx.strokeStyle = `hsla(${d.color.h}, ${d.color.s}%, ${d.color.l}%, ${alpha})`;
            ctx.lineWidth = d.size;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(d.x, d.y - d.length);
            ctx.lineTo(d.x, d.y);
            ctx.stroke();
            // Drip tip bulge
            ctx.fillStyle = `hsla(${d.color.h}, ${d.color.s}%, ${d.color.l + 10}%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size * 1.2, 0, TAU);
            ctx.fill();
        }

        // Crystals (mode 5)
        if (this.mode === 5) {
            for (const c of this._crystals) {
                const alpha = Math.min(1, c.age / 60) * 0.2 * this.intensity;
                // Main crystal body
                ctx.strokeStyle = `hsla(${c.color.h}, ${c.color.s}%, ${c.color.l + 15}%, ${alpha})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let s = 0; s <= c.sides; s++) {
                    const a = c.rotation + (s / c.sides) * TAU;
                    const px = c.x + Math.cos(a) * c.size;
                    const py = c.y + Math.sin(a) * c.size;
                    if (s === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
                // Fill
                ctx.fillStyle = `hsla(${c.color.h}, ${c.color.s}%, ${c.color.l}%, ${alpha * 0.3})`;
                ctx.fill();
                // Inner facets
                ctx.strokeStyle = `hsla(${c.color.h}, ${c.color.s - 10}%, ${c.color.l + 25}%, ${alpha * 0.5})`;
                ctx.beginPath();
                for (let s = 0; s < c.sides; s++) {
                    const a = c.rotation + (s / c.sides) * TAU;
                    ctx.moveTo(c.x, c.y);
                    ctx.lineTo(c.x + Math.cos(a) * c.size * 0.7, c.y + Math.sin(a) * c.size * 0.7);
                }
                ctx.stroke();
                // Branches
                for (const br of c.branches) {
                    const bx = c.x + Math.cos(br.angle) * c.size;
                    const by = c.y + Math.sin(br.angle) * c.size;
                    const ex = bx + Math.cos(br.angle) * br.length;
                    const ey = by + Math.sin(br.angle) * br.length;
                    ctx.strokeStyle = `hsla(${c.color.h}, ${c.color.s}%, ${c.color.l + 10}%, ${alpha * 0.6})`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(bx, by);
                    ctx.lineTo(ex, ey);
                    ctx.stroke();
                }
            }
        }

        ctx.restore();
    }
}
