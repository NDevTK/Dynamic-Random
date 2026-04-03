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
    }

    configure(rng, palette) {
        // Growth type: 0=fractal tree, 1=spiral tower, 2=crystal lattice, 3=nested polygons
        this.growthType = Math.floor(rng() * 4);
        this.branchAngle = Math.PI / (4 + rng() * 8);
        this.growthSpeed = 0.3 + rng() * 0.8;
        this.maxDepth = 4 + Math.floor(rng() * 4);
        this.swayAmplitude = 0.01 + rng() * 0.04;
        // Mouse reaction: positive = attract, negative = repel
        this.mouseReaction = (rng() > 0.5 ? 1 : -1) * (0.5 + rng() * 1.5);
        this.decayStyle = Math.floor(rng() * 3); // 0=wither, 1=shatter, 2=dissolve
        this.branchingFactor = 2 + Math.floor(rng() * 2);

        this.palette = palette && palette.length >= 2 ? palette : [
            { h: rng() * 360, s: 50 + rng() * 40, l: 40 + rng() * 20 },
            { h: rng() * 360, s: 60 + rng() * 30, l: 60 + rng() * 25 },
            { h: rng() * 360, s: 40 + rng() * 30, l: 70 + rng() * 20 },
        ];

        this.plants = [];
    }

    update(mx, my, isClicking) {
        this._tick++;

        // Click plants a new growth
        if (isClicking && !this._clickRegistered) {
            this._clickRegistered = true;
            if (this.plants.length >= this.maxPlants) {
                // Remove oldest
                this.plants.shift();
            }
            this.plants.push({
                x: mx,
                y: my,
                growth: 0,
                maxGrowth: 1,
                branches: [],
                birth: this._tick,
                dying: false,
                deathProgress: 0,
            });
        }
        if (!isClicking) this._clickRegistered = false;

        // Grow and update plants
        for (let i = this.plants.length - 1; i >= 0; i--) {
            const plant = this.plants[i];

            if (!plant.dying) {
                plant.growth = Math.min(plant.maxGrowth, plant.growth + this.growthSpeed * 0.01);

                // Start dying after 15 seconds
                if (this._tick - plant.birth > 900) {
                    plant.dying = true;
                }
            } else {
                plant.deathProgress += 0.005;
                if (plant.deathProgress >= 1) {
                    this.plants.splice(i, 1);
                }
            }

            // Regenerate branches each frame based on growth (recursive structures are cheap)
            plant.branches = [];
            this._generateBranches(plant, mx, my);
        }
    }

    _generateBranches(plant, mx, my) {
        const growth = plant.growth;
        const deathFade = plant.dying ? 1 - plant.deathProgress : 1;

        if (this.growthType === 0) {
            this._genFractalTree(plant, plant.x, plant.y, -Math.PI / 2, 60 * growth, 0, mx, my, deathFade);
        } else if (this.growthType === 1) {
            this._genSpiralTower(plant, plant.x, plant.y, growth, mx, my, deathFade);
        } else if (this.growthType === 2) {
            this._genCrystalLattice(plant, plant.x, plant.y, growth, mx, my, deathFade);
        } else {
            this._genNestedPolygons(plant, plant.x, plant.y, growth, mx, my, deathFade);
        }
    }

    _genFractalTree(plant, x, y, angle, length, depth, mx, my, fade) {
        if (depth > this.maxDepth || length < 3) return;

        // Mouse influence on angle
        const dx = mx - x;
        const dy = my - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = dist < 200 ? (1 - dist / 200) * this.mouseReaction * 0.1 : 0;
        const mouseAngle = Math.atan2(dy, dx);
        const adjustedAngle = angle + Math.sin(mouseAngle - angle) * influence;

        // Sway
        const sway = Math.sin(this._tick * 0.03 + depth * 0.5 + x * 0.01) * this.swayAmplitude * (depth + 1);
        const finalAngle = adjustedAngle + sway;

        const ex = x + Math.cos(finalAngle) * length;
        const ey = y + Math.sin(finalAngle) * length;

        plant.branches.push({
            x1: x, y1: y, x2: ex, y2: ey,
            depth, fade,
            width: Math.max(0.5, (this.maxDepth - depth) * 1.2),
        });

        for (let b = 0; b < this.branchingFactor; b++) {
            const spread = (b - (this.branchingFactor - 1) / 2) * this.branchAngle;
            this._genFractalTree(plant, ex, ey, finalAngle + spread, length * 0.65, depth + 1, mx, my, fade);
        }
    }

    _genSpiralTower(plant, cx, cy, growth, mx, my, fade) {
        const turns = 3 * growth;
        const maxRadius = 80 * growth;
        const steps = Math.floor(40 * growth);

        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const angle = t * turns * Math.PI * 2;
            const radius = maxRadius * t;
            const height = -t * 150 * growth;

            const x = cx + Math.cos(angle) * radius;
            const y = cy + height;

            const sway = Math.sin(this._tick * 0.02 + i * 0.1) * this.swayAmplitude * 20;

            if (i > 0) {
                const prevT = (i - 1) / steps;
                const prevAngle = prevT * turns * Math.PI * 2;
                const prevRadius = maxRadius * prevT;
                const prevHeight = -prevT * 150 * growth;
                const px = cx + Math.cos(prevAngle) * prevRadius;
                const py = cy + prevHeight;

                plant.branches.push({
                    x1: px, y1: py + sway,
                    x2: x, y2: y + sway,
                    depth: Math.floor(t * this.maxDepth),
                    fade,
                    width: 2 * (1 - t),
                });
            }

            // Cross braces
            if (i % 5 === 0 && i > 0) {
                const oppAngle = angle + Math.PI;
                const ox = cx + Math.cos(oppAngle) * radius;
                plant.branches.push({
                    x1: x, y1: y + sway, x2: ox, y2: y + sway,
                    depth: Math.floor(t * this.maxDepth),
                    fade: fade * 0.5,
                    width: 0.5,
                });
            }
        }
    }

    _genCrystalLattice(plant, cx, cy, growth, mx, my, fade) {
        const layers = Math.floor(growth * this.maxDepth);
        const baseSize = 40;

        for (let layer = 0; layer <= layers; layer++) {
            const size = baseSize * (1 + layer * 0.4);
            const sides = 6;
            const layerAngle = layer * 0.3 + Math.sin(this._tick * 0.01) * this.swayAmplitude * 3;

            for (let i = 0; i < sides; i++) {
                const a1 = (i / sides) * Math.PI * 2 + layerAngle;
                const a2 = ((i + 1) / sides) * Math.PI * 2 + layerAngle;
                const x1 = cx + Math.cos(a1) * size;
                const y1 = cy + Math.sin(a1) * size - layer * 25;
                const x2 = cx + Math.cos(a2) * size;
                const y2 = cy + Math.sin(a2) * size - layer * 25;

                plant.branches.push({
                    x1, y1, x2, y2,
                    depth: layer, fade,
                    width: Math.max(0.5, 2 - layer * 0.3),
                });

                // Vertical connections to next layer
                if (layer < layers) {
                    const nextSize = baseSize * (1 + (layer + 1) * 0.4);
                    const nextAngle = (i / sides) * Math.PI * 2 + (layer + 1) * 0.3 + Math.sin(this._tick * 0.01) * this.swayAmplitude * 3;
                    const nx = cx + Math.cos(nextAngle) * nextSize;
                    const ny = cy + Math.sin(nextAngle) * nextSize - (layer + 1) * 25;
                    plant.branches.push({
                        x1, y1, x2: nx, y2: ny,
                        depth: layer, fade: fade * 0.6,
                        width: 0.5,
                    });
                }
            }
        }
    }

    _genNestedPolygons(plant, cx, cy, growth, mx, my, fade) {
        const layers = Math.floor(growth * this.maxDepth);
        const sides = 3 + Math.floor(growth * 3); // 3 to 6 sides

        for (let layer = 0; layer <= layers; layer++) {
            const size = 20 + layer * 25;
            const rotation = layer * 0.5 + this._tick * 0.005 * (layer % 2 === 0 ? 1 : -1);
            const sway = Math.sin(this._tick * 0.02 + layer) * this.swayAmplitude * 10;

            for (let i = 0; i < sides; i++) {
                const a1 = (i / sides) * Math.PI * 2 + rotation;
                const a2 = ((i + 1) / sides) * Math.PI * 2 + rotation;
                const x1 = cx + Math.cos(a1) * size + sway;
                const y1 = cy + Math.sin(a1) * size;
                const x2 = cx + Math.cos(a2) * size + sway;
                const y2 = cy + Math.sin(a2) * size;

                plant.branches.push({
                    x1, y1, x2, y2,
                    depth: layer, fade,
                    width: Math.max(0.5, 2.5 - layer * 0.4),
                });
            }
        }
    }

    draw(ctx) {
        if (this.plants.length === 0) return;

        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';

        for (const plant of this.plants) {
            for (const branch of plant.branches) {
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

                // Leaf glow at tips (highest depth)
                if (branch.depth >= this.maxDepth - 1 && branch.fade > 0.5) {
                    ctx.fillStyle = `hsla(${c.h + 30}, ${c.s}%, ${c.l + 15}%, ${alpha * 0.4})`;
                    ctx.beginPath();
                    ctx.arc(branch.x2, branch.y2, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
