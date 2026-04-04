/**
 * @file living_geometry_effects.js
 * @description Interactive effect: clicking plants "seeds" that grow into
 * animated geometric structures — fractal trees, spiraling towers, branching
 * crystals, or recursive polygons. Each growth is different based on the
 * universe seed. Structures sway gently and react to mouse proximity by
 * bending toward or away from it. Old structures slowly wither and dissolve.
 *
 * Seed controls: growth shape (fractal tree, spiral, crystal lattice, nested
 * polygons), branch angle, growth speed, max depth, color progression along
 * branches, sway amplitude, mouse attraction/repulsion, and decay style.
 */

export class LivingGeometry {
    constructor() {
        this.plants = [];
        this.maxPlants = 8;
        this.growthType = 0;
        this.branchAngle = Math.PI / 6;
        this.growthSpeed = 0.5;
        this.maxDepth = 5;
        this.swayAmplitude = 0.02;
        this.mouseReaction = 1;
        this.palette = [];
        this._tick = 0;
        this._clickRegistered = false;
        // Reusable branch buffer to avoid per-frame allocation
        this._branchBuf = [];
        this._branchCount = 0;
        // Mouse influence distance squared
        this._influenceDistSq = 200 * 200;
    }

    configure(rng, palette) {
        this.growthType = Math.floor(rng() * 4);
        this.branchAngle = Math.PI / (4 + rng() * 8);
        this.growthSpeed = 0.3 + rng() * 0.8;
        this.maxDepth = 4 + Math.floor(rng() * 4);
        this.swayAmplitude = 0.01 + rng() * 0.04;
        this.mouseReaction = (rng() > 0.5 ? 1 : -1) * (0.5 + rng() * 1.5);
        this.branchingFactor = 2 + Math.floor(rng() * 2);
        // Leaf glow size varies per seed
        this.leafSize = 2 + rng() * 4;
        // Root glow on plant base
        this.rootGlow = rng() > 0.5;

        this.palette = palette && palette.length >= 2 ? palette : [
            { h: rng() * 360, s: 50 + rng() * 40, l: 40 + rng() * 20 },
            { h: rng() * 360, s: 60 + rng() * 30, l: 60 + rng() * 25 },
            { h: rng() * 360, s: 40 + rng() * 30, l: 70 + rng() * 20 },
        ];

        this.plants = [];
        this._branchBuf = [];
    }

    update(mx, my, isClicking) {
        this._tick++;

        // Click plants a new growth
        if (isClicking && !this._clickRegistered) {
            this._clickRegistered = true;
            if (this.plants.length >= this.maxPlants) {
                // Swap-remove oldest (index 0) instead of shift
                this.plants[0] = this.plants[this.plants.length - 1];
                this.plants.pop();
            }
            this.plants.push({
                x: mx,
                y: my,
                growth: 0,
                maxGrowth: 1,
                birth: this._tick,
                dying: false,
                deathProgress: 0,
            });
        }
        if (!isClicking) this._clickRegistered = false;

        // Update plant state
        for (let i = this.plants.length - 1; i >= 0; i--) {
            const plant = this.plants[i];

            if (!plant.dying) {
                plant.growth = Math.min(plant.maxGrowth, plant.growth + this.growthSpeed * 0.01);
                if (this._tick - plant.birth > 900) {
                    plant.dying = true;
                }
            } else {
                plant.deathProgress += 0.005;
                if (plant.deathProgress >= 1) {
                    // Swap-remove instead of splice
                    this.plants[i] = this.plants[this.plants.length - 1];
                    this.plants.pop();
                }
            }
        }

        this._mx = mx;
        this._my = my;
    }

    // Push a branch into the reusable buffer
    _pushBranch(x1, y1, x2, y2, depth, fade, width) {
        const idx = this._branchCount;
        if (idx >= this._branchBuf.length) {
            this._branchBuf.push({ x1, y1, x2, y2, depth, fade, width });
        } else {
            const b = this._branchBuf[idx];
            b.x1 = x1; b.y1 = y1; b.x2 = x2; b.y2 = y2;
            b.depth = depth; b.fade = fade; b.width = width;
        }
        this._branchCount++;
    }

    _genFractalTree(plant, x, y, angle, length, depth, fade) {
        if (depth > this.maxDepth || length < 3) return;

        const mx = this._mx;
        const my = this._my;
        const dx = mx - x;
        const dy = my - y;
        const distSq = dx * dx + dy * dy;
        const influence = distSq < this._influenceDistSq
            ? (1 - distSq / this._influenceDistSq) * this.mouseReaction * 0.1
            : 0;
        const mouseAngle = influence !== 0 ? Math.atan2(dy, dx) : 0;
        const adjustedAngle = angle + Math.sin(mouseAngle - angle) * influence;

        const sway = Math.sin(this._tick * 0.03 + depth * 0.5 + x * 0.01) * this.swayAmplitude * (depth + 1);
        const finalAngle = adjustedAngle + sway;

        const ex = x + Math.cos(finalAngle) * length;
        const ey = y + Math.sin(finalAngle) * length;

        this._pushBranch(x, y, ex, ey, depth, fade, Math.max(0.5, (this.maxDepth - depth) * 1.2));

        for (let b = 0; b < this.branchingFactor; b++) {
            const spread = (b - (this.branchingFactor - 1) / 2) * this.branchAngle;
            this._genFractalTree(plant, ex, ey, finalAngle + spread, length * 0.65, depth + 1, fade);
        }
    }

    _genSpiralTower(plant, cx, cy, growth, fade) {
        const turns = 3 * growth;
        const maxRadius = 80 * growth;
        const steps = Math.floor(40 * growth);
        if (steps < 2) return;

        let prevX = cx, prevY = cy;
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const angle = t * turns * Math.PI * 2;
            const radius = maxRadius * t;
            const height = -t * 150 * growth;
            const sway = Math.sin(this._tick * 0.02 + i * 0.1) * this.swayAmplitude * 20;

            const x = cx + Math.cos(angle) * radius;
            const y = cy + height + sway;

            if (i > 0) {
                this._pushBranch(prevX, prevY, x, y, Math.floor(t * this.maxDepth), fade, 2 * (1 - t));
            }

            // Cross braces
            if (i % 5 === 0 && i > 0) {
                const ox = cx + Math.cos(angle + Math.PI) * radius;
                this._pushBranch(x, y, ox, y, Math.floor(t * this.maxDepth), fade * 0.5, 0.5);
            }

            prevX = x;
            prevY = y;
        }
    }

    _genCrystalLattice(plant, cx, cy, growth, fade) {
        const layers = Math.floor(growth * this.maxDepth);
        const baseSize = 40;
        const sides = 6;

        for (let layer = 0; layer <= layers; layer++) {
            const size = baseSize * (1 + layer * 0.4);
            const layerAngle = layer * 0.3 + Math.sin(this._tick * 0.01) * this.swayAmplitude * 3;

            for (let i = 0; i < sides; i++) {
                const a1 = (i / sides) * Math.PI * 2 + layerAngle;
                const a2 = ((i + 1) / sides) * Math.PI * 2 + layerAngle;
                const x1 = cx + Math.cos(a1) * size;
                const y1 = cy + Math.sin(a1) * size - layer * 25;
                const x2 = cx + Math.cos(a2) * size;
                const y2 = cy + Math.sin(a2) * size - layer * 25;

                this._pushBranch(x1, y1, x2, y2, layer, fade, Math.max(0.5, 2 - layer * 0.3));

                if (layer < layers) {
                    const nextSize = baseSize * (1 + (layer + 1) * 0.4);
                    const nextAngle = (i / sides) * Math.PI * 2 + (layer + 1) * 0.3 + Math.sin(this._tick * 0.01) * this.swayAmplitude * 3;
                    const nx = cx + Math.cos(nextAngle) * nextSize;
                    const ny = cy + Math.sin(nextAngle) * nextSize - (layer + 1) * 25;
                    this._pushBranch(x1, y1, nx, ny, layer, fade * 0.6, 0.5);
                }
            }
        }
    }

    _genNestedPolygons(plant, cx, cy, growth, fade) {
        const layers = Math.floor(growth * this.maxDepth);
        const sides = 3 + Math.floor(growth * 3);

        for (let layer = 0; layer <= layers; layer++) {
            const size = 20 + layer * 25;
            const rotation = layer * 0.5 + this._tick * 0.005 * (layer % 2 === 0 ? 1 : -1);
            const sway = Math.sin(this._tick * 0.02 + layer) * this.swayAmplitude * 10;

            for (let i = 0; i < sides; i++) {
                const a1 = (i / sides) * Math.PI * 2 + rotation;
                const a2 = ((i + 1) / sides) * Math.PI * 2 + rotation;
                this._pushBranch(
                    cx + Math.cos(a1) * size + sway, cy + Math.sin(a1) * size,
                    cx + Math.cos(a2) * size + sway, cy + Math.sin(a2) * size,
                    layer, fade, Math.max(0.5, 2.5 - layer * 0.4)
                );
            }
        }
    }

    draw(ctx) {
        if (this.plants.length === 0) return;

        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';

        for (const plant of this.plants) {
            const fade = plant.dying ? 1 - plant.deathProgress : 1;
            const growth = plant.growth;

            // Generate branches into reusable buffer
            this._branchCount = 0;
            if (this.growthType === 0) {
                this._genFractalTree(plant, plant.x, plant.y, -Math.PI / 2, 60 * growth, 0, fade);
            } else if (this.growthType === 1) {
                this._genSpiralTower(plant, plant.x, plant.y, growth, fade);
            } else if (this.growthType === 2) {
                this._genCrystalLattice(plant, plant.x, plant.y, growth, fade);
            } else {
                this._genNestedPolygons(plant, plant.x, plant.y, growth, fade);
            }

            // Root glow
            if (this.rootGlow && fade > 0.3) {
                const rc = this.palette[0];
                ctx.fillStyle = `hsla(${rc.h}, ${rc.s}%, ${rc.l}%, ${fade * 0.08})`;
                ctx.beginPath();
                ctx.arc(plant.x, plant.y, 25 * growth, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw branches from buffer
            for (let bi = 0; bi < this._branchCount; bi++) {
                const branch = this._branchBuf[bi];
                const depthT = branch.depth / this.maxDepth;
                const c = this.palette[branch.depth % this.palette.length];
                const alpha = branch.fade * (0.15 + (1 - depthT) * 0.25);

                if (alpha < 0.01) continue;

                ctx.strokeStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha})`;
                ctx.lineWidth = branch.width;
                ctx.beginPath();
                ctx.moveTo(branch.x1, branch.y1);
                ctx.lineTo(branch.x2, branch.y2);
                ctx.stroke();

                // Leaf glow at tips
                if (branch.depth >= this.maxDepth - 1 && branch.fade > 0.5) {
                    ctx.fillStyle = `hsla(${(c.h + 30) % 360}, ${c.s}%, ${c.l + 15}%, ${alpha * 0.4})`;
                    ctx.beginPath();
                    ctx.arc(branch.x2, branch.y2, this.leafSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
