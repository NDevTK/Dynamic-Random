/**
 * @file crystal_growth_effects.js
 * @description Crystalline structures that grow from click points with faceted
 * geometry, internal refraction, and prismatic light effects. Cursor proximity
 * causes crystals to glow and resonate. Seed determines crystal system and color.
 *
 * Modes:
 * 0 - Quartz Formation: Hexagonal prismatic crystals growing in clusters
 * 1 - Snowflake: Dendritic ice crystal branching with 6-fold symmetry
 * 2 - Geode: Circular cavities lined with sparkling crystal druzy
 * 3 - Bismuth: Iridescent stepped rectangular spiral crystals
 * 4 - Amethyst: Purple-tinted pointed crystals with internal glow
 * 5 - Fluorite: Cubic octahedral crystals with fluorescence under cursor UV
 */

const TAU = Math.PI * 2;

export class CrystalGrowth {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 280;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        this.crystals = [];
        this.maxCrystals = 120;

        // Growth seeds (click points)
        this._seeds = [];
        this._maxSeeds = 15;

        // Sparkle particles
        this._sparkles = [];
        this._sparklePool = [];
        this._maxSparkles = 80;

        // Offscreen canvas for completed crystals
        this._crystalCanvas = null;
        this._crystalCtx = null;
        this._crystalW = 0;
        this._crystalH = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.crystals = [];
        this._seeds = [];
        this._sparkles = [];
        this.intensity = 0.5 + rng() * 0.6;

        switch (this.mode) {
            case 0: this.hue = palette.length > 0 ? palette[0].h : 180 + Math.floor(rng() * 40); break;
            case 1: this.hue = palette.length > 0 ? palette[0].h : 195 + Math.floor(rng() * 20); break;
            case 2: this.hue = palette.length > 0 ? palette[0].h : 270 + Math.floor(rng() * 40); break;
            case 3: this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360); break;
            case 4: this.hue = palette.length > 0 ? palette[0].h : 275 + Math.floor(rng() * 15); break;
            case 5: this.hue = palette.length > 0 ? palette[0].h : 140 + Math.floor(rng() * 40); break;
        }

        const W = window.innerWidth, H = window.innerHeight;
        this._crystalW = Math.ceil(W / 2);
        this._crystalH = Math.ceil(H / 2);
        this._crystalCanvas = document.createElement('canvas');
        this._crystalCanvas.width = this._crystalW;
        this._crystalCanvas.height = this._crystalH;
        this._crystalCtx = this._crystalCanvas.getContext('2d', { alpha: true });
        this._crystalCtx.clearRect(0, 0, this._crystalW, this._crystalH);

        // Seed some initial growth points
        const initSeeds = 2 + Math.floor(rng() * 3);
        for (let i = 0; i < initSeeds; i++) {
            this._addSeed(rng() * W, rng() * H);
        }
    }

    _addSeed(x, y) {
        if (this._seeds.length >= this._maxSeeds) return;
        const seed = this.tick * 29 + this._seeds.length * 67;
        this._seeds.push({
            x, y,
            crystalCount: 0,
            maxCrystals: this.mode === 1 ? 1 : 5 + Math.floor(this._prand(seed) * 8),
            growthRate: 0.5 + this._prand(seed + 1) * 1,
            angle: this._prand(seed + 2) * TAU,
            symmetry: this.mode === 1 ? 6 : this.mode === 5 ? 4 : 0,
        });
    }

    _prand(seed) {
        return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        // Resize handling for persistent canvas
        const newW = Math.ceil(window.innerWidth / 2);
        const newH = Math.ceil(window.innerHeight / 2);
        if (newW !== this._crystalW || newH !== this._crystalH) {
            this._crystalW = newW;
            this._crystalH = newH;
            this._crystalCanvas.width = newW;
            this._crystalCanvas.height = newH;
            this._crystalCtx = this._crystalCanvas.getContext('2d', { alpha: true });
        }

        if (isClicking && !this._wasClicking) {
            this._addSeed(mx, my);
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Grow crystals from seeds
        for (const seed of this._seeds) {
            if (seed.crystalCount >= seed.maxCrystals) continue;
            if (this.crystals.length >= this.maxCrystals) break;
            if (this.tick % 5 !== 0) continue;

            if (this.mode === 1) {
                this._growSnowflake(seed);
            } else if (this.mode === 2) {
                this._growGeode(seed);
            } else if (this.mode === 3) {
                this._growBismuth(seed);
            } else {
                this._growPrismatic(seed);
            }
            seed.crystalCount++;
        }

        // Update crystal growth
        for (const c of this.crystals) {
            if (c.growthProgress < 1) {
                c.growthProgress = Math.min(1, c.growthProgress + 0.02 * c.growthSpeed);
            }

            // Cursor proximity glow
            const dx = mx - c.x, dy = my - c.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                c.glow = Math.max(c.glow, (1 - dist / 150) * 0.5);
            }
            c.glow *= 0.97;
        }

        // Sparkle near cursor on completed crystals
        if (this._mouseSpeed > 2 && this.tick % 3 === 0) {
            for (const c of this.crystals) {
                if (c.growthProgress < 0.8) continue;
                const dx = mx - c.x, dy = my - c.y;
                if (dx * dx + dy * dy < 22500 && this._sparkles.length < this._maxSparkles) {
                    const sparkle = this._sparklePool.length > 0 ? this._sparklePool.pop() : {};
                    const ss = this.tick * 23 + this._sparkles.length * 47;
                    sparkle.x = c.x + (this._prand(ss) - 0.5) * c.size * 2;
                    sparkle.y = c.y + (this._prand(ss + 1) - 0.5) * c.size * 2;
                    sparkle.life = 10 + this._prand(ss + 2) * 15;
                    sparkle.maxLife = sparkle.life;
                    sparkle.hue = (c.hue + this._prand(ss + 3) * 30) % 360;
                    sparkle.size = 1 + this._prand(ss + 4) * 2;
                    this._sparkles.push(sparkle);
                }
            }
        }

        // Update sparkles
        for (let i = this._sparkles.length - 1; i >= 0; i--) {
            this._sparkles[i].life--;
            if (this._sparkles[i].life <= 0) {
                this._sparklePool.push(this._sparkles[i]);
                this._sparkles[i] = this._sparkles[this._sparkles.length - 1];
                this._sparkles.pop();
            }
        }

        // Slow fade of crystal canvas
        if (this._crystalCtx && this.tick % 20 === 0) {
            this._crystalCtx.globalCompositeOperation = 'destination-out';
            this._crystalCtx.fillStyle = 'rgba(0,0,0,0.003)';
            this._crystalCtx.fillRect(0, 0, this._crystalW, this._crystalH);
        }
    }

    _growPrismatic(seed) {
        const gs = this.tick * 13 + seed.crystalCount * 41;
        const angle = seed.angle + (this._prand(this.tick + seed.x) - 0.5) * 1.2;
        seed.angle += 0.3 + this._prand(gs) * 0.5;
        const dist = 5 + seed.crystalCount * (3 + this._prand(gs + 1) * 5);
        this.crystals.push({
            x: seed.x + Math.cos(angle) * dist,
            y: seed.y + Math.sin(angle) * dist,
            angle: angle + Math.PI / 2 + (this._prand(gs + 2) - 0.5) * 0.5,
            size: 8 + this._prand(gs + 3) * 20,
            width: 3 + this._prand(gs + 4) * 8,
            hue: (this.hue + (this._prand(gs + 5) - 0.5) * 20 + 360) % 360,
            growthProgress: 0,
            growthSpeed: seed.growthRate * (0.5 + this._prand(gs + 6)),
            glow: 0,
            facets: this.mode === 5 ? 4 : 6,
        });
    }

    _growSnowflake(seed) {
        // Branch from seed with 6-fold symmetry
        const branchLen = 10 + seed.crystalCount * 8;
        for (let arm = 0; arm < 6; arm++) {
            if (this.crystals.length >= this.maxCrystals) break;
            const baseAngle = (arm / 6) * TAU;
            const x = seed.x + Math.cos(baseAngle) * branchLen;
            const y = seed.y + Math.sin(baseAngle) * branchLen;
            const gs = this.tick * 17 + arm * 53 + seed.crystalCount * 31;

            this.crystals.push({
                x, y,
                angle: baseAngle,
                size: 5 + this._prand(gs) * 10,
                width: 1 + this._prand(gs + 1) * 2,
                hue: (this.hue + this._prand(gs + 2) * 10 + 360) % 360,
                growthProgress: 0,
                growthSpeed: seed.growthRate,
                glow: 0,
                facets: 6,
                isSnowflake: true,
                parentX: seed.x,
                parentY: seed.y,
            });

            // Sub-branches
            if (branchLen > 20 && this._prand(gs + 3) > 0.4) {
                for (let sub = -1; sub <= 1; sub += 2) {
                    if (this.crystals.length >= this.maxCrystals) break;
                    const subAngle = baseAngle + sub * Math.PI / 3;
                    const subLen = branchLen * 0.5;
                    const sgs = gs + 10 + sub * 7;
                    this.crystals.push({
                        x: x + Math.cos(subAngle) * subLen * 0.5,
                        y: y + Math.sin(subAngle) * subLen * 0.5,
                        angle: subAngle,
                        size: subLen * 0.4,
                        width: 0.5 + this._prand(sgs),
                        hue: (this.hue + this._prand(sgs + 1) * 15 + 360) % 360,
                        growthProgress: 0,
                        growthSpeed: seed.growthRate * 0.8,
                        glow: 0,
                        facets: 6,
                        isSnowflake: true,
                        parentX: x,
                        parentY: y,
                    });
                }
            }
        }
    }

    _growGeode(seed) {
        const gs = this.tick * 11 + seed.crystalCount * 37;
        const angle = seed.angle;
        seed.angle += TAU / (seed.maxCrystals + 1) + (this._prand(gs) - 0.5) * 0.2;
        const dist = 15 + this._prand(gs + 1) * 10;

        this.crystals.push({
            x: seed.x + Math.cos(angle) * dist,
            y: seed.y + Math.sin(angle) * dist,
            angle: angle, // Point outward from center
            size: 6 + this._prand(gs + 2) * 15,
            width: 2 + this._prand(gs + 3) * 4,
            hue: (this.hue + (this._prand(gs + 4) - 0.5) * 30 + 360) % 360,
            growthProgress: 0,
            growthSpeed: seed.growthRate,
            glow: 0,
            facets: 6,
            isGeode: true,
            centerX: seed.x,
            centerY: seed.y,
        });
    }

    _growBismuth(seed) {
        // Stepped rectangular spiral
        const step = seed.crystalCount;
        const spiralAngle = step * Math.PI / 2; // 90-degree turns
        const dist = 5 + step * 6;
        const x = seed.x + Math.cos(spiralAngle) * dist;
        const y = seed.y + Math.sin(spiralAngle) * dist;
        const gs = this.tick * 19 + step * 43;

        this.crystals.push({
            x, y,
            angle: spiralAngle,
            size: 8 + this._prand(gs) * 12,
            width: 6 + this._prand(gs + 1) * 8,
            hue: (step * 40 + this.hue) % 360, // Iridescent color change
            growthProgress: 0,
            growthSpeed: seed.growthRate,
            glow: 0,
            facets: 4,
            isBismuth: true,
        });
    }

    draw(ctx, system) {
        ctx.save();

        // Persistent crystal layer
        if (this._crystalCanvas && this._crystalW > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.6 * this.intensity;
            ctx.drawImage(this._crystalCanvas, 0, 0, system.width, system.height);
            ctx.globalAlpha = 1;
        }

        ctx.globalCompositeOperation = 'lighter';

        // Draw active crystals
        for (const c of this.crystals) {
            if (c.growthProgress < 0.01) continue;
            const progress = c.growthProgress;
            const size = c.size * progress;
            const alpha = (0.1 + c.glow * 0.3) * this.intensity;

            if (c.isSnowflake) {
                this._drawSnowflakeBranch(ctx, c, size, alpha);
            } else if (c.isBismuth) {
                this._drawBismuthStep(ctx, c, size, alpha);
            } else {
                this._drawCrystalPrism(ctx, c, size, alpha);
            }

            // Fluorescence under cursor (mode 5)
            if (this.mode === 5 && c.glow > 0.1) {
                const fluoresceAlpha = c.glow * 0.2 * this.intensity;
                ctx.fillStyle = `hsla(${(c.hue + 120) % 360}, 90%, 75%, ${fluoresceAlpha})`;
                ctx.beginPath();
                ctx.arc(c.x, c.y, size * 0.5, 0, TAU);
                ctx.fill();
            }
        }

        // Sparkles
        for (const s of this._sparkles) {
            const lifeRatio = s.life / s.maxLife;
            const alpha = lifeRatio * 0.5 * this.intensity;
            const bright = Math.sin(lifeRatio * Math.PI);

            // Star-shaped sparkle
            ctx.fillStyle = `hsla(${s.hue}, 60%, 90%, ${alpha * bright})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * bright, 0, TAU);
            ctx.fill();

            // Cross rays
            if (bright > 0.5) {
                ctx.strokeStyle = `hsla(${s.hue}, 40%, 95%, ${alpha * 0.3})`;
                ctx.lineWidth = 0.5;
                const rayLen = s.size * 3 * bright;
                ctx.beginPath();
                ctx.moveTo(s.x - rayLen, s.y);
                ctx.lineTo(s.x + rayLen, s.y);
                ctx.moveTo(s.x, s.y - rayLen);
                ctx.lineTo(s.x, s.y + rayLen);
                ctx.stroke();
            }
        }

        // Geode outlines
        for (const seed of this._seeds) {
            if (this.mode === 2) {
                ctx.strokeStyle = `hsla(${this.hue}, 30%, 40%, ${0.04 * this.intensity})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(seed.x, seed.y, 20, 0, TAU);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    _drawCrystalPrism(ctx, c, size, alpha) {
        const tipX = c.x + Math.cos(c.angle) * size;
        const tipY = c.y + Math.sin(c.angle) * size;
        const perpAngle = c.angle + Math.PI / 2;
        const halfW = c.width * c.growthProgress * 0.5;

        // Crystal body (elongated hexagonal prism)
        const leftX = c.x + Math.cos(perpAngle) * halfW;
        const leftY = c.y + Math.sin(perpAngle) * halfW;
        const rightX = c.x - Math.cos(perpAngle) * halfW;
        const rightY = c.y - Math.sin(perpAngle) * halfW;

        // Left facet
        ctx.fillStyle = `hsla(${c.hue}, 50%, 50%, ${alpha * 0.7})`;
        ctx.beginPath();
        ctx.moveTo(leftX, leftY);
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(tipX, tipY);
        ctx.closePath();
        ctx.fill();

        // Right facet (lighter)
        ctx.fillStyle = `hsla(${c.hue}, 55%, 60%, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(rightX, rightY);
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(tipX, tipY);
        ctx.closePath();
        ctx.fill();

        // Edge highlight
        ctx.strokeStyle = `hsla(${c.hue + 20}, 70%, 80%, ${alpha * 0.4})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(leftX, leftY);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(rightX, rightY);
        ctx.stroke();

        // Internal refraction line
        if (c.growthProgress > 0.5) {
            ctx.strokeStyle = `hsla(${(c.hue + 40) % 360}, 60%, 75%, ${alpha * 0.2})`;
            ctx.lineWidth = 0.3;
            ctx.beginPath();
            ctx.moveTo(c.x + Math.cos(c.angle) * size * 0.3, c.y + Math.sin(c.angle) * size * 0.3);
            ctx.lineTo(tipX - Math.cos(perpAngle) * halfW * 0.3, tipY - Math.sin(perpAngle) * halfW * 0.3);
            ctx.stroke();
        }
    }

    _drawSnowflakeBranch(ctx, c, size, alpha) {
        ctx.strokeStyle = `hsla(${c.hue}, 40%, 85%, ${alpha})`;
        ctx.lineWidth = c.width * c.growthProgress;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(c.parentX || c.x, c.parentY || c.y);
        const endX = c.x + Math.cos(c.angle) * size;
        const endY = c.y + Math.sin(c.angle) * size;
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Ice crystal sparkle at tip
        if (c.growthProgress > 0.8 && c.glow > 0.05) {
            ctx.fillStyle = `rgba(200, 230, 255, ${c.glow * 0.3 * this.intensity})`;
            ctx.beginPath();
            ctx.arc(endX, endY, 2, 0, TAU);
            ctx.fill();
        }
    }

    _drawBismuthStep(ctx, c, size, alpha) {
        // Stepped rectangle
        const w = c.width * c.growthProgress;
        const h = size;

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);

        // Main face (iridescent)
        ctx.fillStyle = `hsla(${c.hue}, 70%, 50%, ${alpha * 0.6})`;
        ctx.fillRect(-w / 2, -h / 2, w, h);

        // Top edge (brighter)
        ctx.fillStyle = `hsla(${(c.hue + 30) % 360}, 80%, 65%, ${alpha * 0.4})`;
        ctx.fillRect(-w / 2, -h / 2, w, 2);

        // Side edge
        ctx.fillStyle = `hsla(${(c.hue + 60) % 360}, 60%, 55%, ${alpha * 0.3})`;
        ctx.fillRect(w / 2 - 2, -h / 2, 2, h);

        ctx.restore();
    }
}
