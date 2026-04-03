/**
 * @file particle_ecology_effects.js
 * @description A miniature ecosystem where particle species interact: plants grow,
 * herbivores graze, predators hunt. The cursor acts as a weather system—hovering
 * grows plants, clicking triggers seasons. Each seed creates unique species balance.
 *
 * Species:
 * - Spores (green): Grow from energy nodes, spread slowly, glow when mature
 * - Grazers (cyan/blue): Wander seeking spores, grow when fed, split when large
 * - Hunters (red/orange): Chase grazers, fast but starve without prey
 * - Decomposers (purple): Feed on dead particles, recycle into spore energy
 *
 * Modes:
 * 0 - Balanced Ecosystem: All species in equilibrium
 * 1 - Bloom: Explosive plant growth, cursor is sunlight
 * 2 - Predator World: Mostly hunters, grazers are rare and fast
 * 3 - Fungal Network: Decomposers dominate, connected by mycelium threads
 * 4 - Migration: Species flow in currents, seasonal patterns
 * 5 - Symbiosis: Species pair up and orbit each other
 */

const TAU = Math.PI * 2;

export class ParticleEcology {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this._particles = [];
        this._energyNodes = [];
        this._maxParticles = 300;
        this._hue = 120;
        this._hueGrazer = 180;
        this._hueHunter = 15;
        this._hueDecomposer = 280;
        this._mx = 0;
        this._my = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._intensity = 1;
        this._season = 0; // 0=spring 1=summer 2=autumn 3=winter
        this._seasonTimer = 0;

        // Spatial grid
        this._gridCellSize = 50;
        this._grid = null;
        this._gridCols = 0;
        this._gridRows = 0;

        // Trail canvas
        this._trailCanvas = null;
        this._trailCtx = null;
    }

    configure(rng, hues) {
        this.tick = 0;
        this.mode = Math.floor(rng() * 6);
        this._season = 0;
        this._seasonTimer = 0;

        this._hue = hues.length > 0 ? hues[0].h : 120;
        this._hueGrazer = hues.length > 1 ? hues[1].h : 190;
        this._hueHunter = (this._hue + 180) % 360;
        this._hueDecomposer = hues.length > 2 ? hues[2].h : 280;
        this._intensity = 0.5 + rng() * 0.5;

        const W = window.innerWidth;
        const H = window.innerHeight;

        // Spatial grid
        this._gridCols = Math.ceil(W / this._gridCellSize) + 1;
        this._gridRows = Math.ceil(H / this._gridCellSize) + 1;
        this._grid = new Array(this._gridCols * this._gridRows);

        // Energy nodes (where spores grow)
        this._energyNodes = [];
        const nodeCount = 5 + Math.floor(rng() * 8);
        for (let i = 0; i < nodeCount; i++) {
            this._energyNodes.push({
                x: rng() * W,
                y: rng() * H,
                energy: 0.5 + rng() * 0.5,
                radius: 60 + rng() * 80,
            });
        }

        // Generate initial population
        this._particles = [];
        let sporeCount, grazerCount, hunterCount, decomposerCount;

        switch (this.mode) {
            case 0: sporeCount = 80; grazerCount = 40; hunterCount = 15; decomposerCount = 10; break;
            case 1: sporeCount = 150; grazerCount = 20; hunterCount = 5; decomposerCount = 5; break;
            case 2: sporeCount = 40; grazerCount = 25; hunterCount = 40; decomposerCount = 10; break;
            case 3: sporeCount = 30; grazerCount = 20; hunterCount = 10; decomposerCount = 60; break;
            case 4: sporeCount = 60; grazerCount = 40; hunterCount = 15; decomposerCount = 15; break;
            case 5: sporeCount = 50; grazerCount = 50; hunterCount = 15; decomposerCount = 10; break;
            default: sporeCount = 60; grazerCount = 30; hunterCount = 15; decomposerCount = 10;
        }

        this._maxParticles = sporeCount + grazerCount + hunterCount + decomposerCount + 100;

        const spawn = (type, count) => {
            for (let i = 0; i < count; i++) {
                this._particles.push(this._createParticle(rng, type, rng() * W, rng() * H));
            }
        };

        spawn('spore', sporeCount);
        spawn('grazer', grazerCount);
        spawn('hunter', hunterCount);
        spawn('decomposer', decomposerCount);

        // Trail canvas at half res
        const tw = Math.ceil(W / 2);
        const th = Math.ceil(H / 2);
        this._trailCanvas = document.createElement('canvas');
        this._trailCanvas.width = tw;
        this._trailCanvas.height = th;
        this._trailCtx = this._trailCanvas.getContext('2d', { alpha: true });
        this._trailCtx.clearRect(0, 0, tw, th);
    }

    _createParticle(rng, type, x, y) {
        // Inline lookup instead of dictionary allocation each call
        let speed, size, maxAge;
        switch (type) {
            case 'spore':      speed = 0.2; size = 2;   maxAge = 600 + Math.floor(rng() * 400); break;
            case 'grazer':     speed = 1.2; size = 3;   maxAge = 800 + Math.floor(rng() * 400); break;
            case 'hunter':     speed = 2.0; size = 3.5; maxAge = 500 + Math.floor(rng() * 300); break;
            case 'decomposer': speed = 0.8; size = 2.5; maxAge = 700 + Math.floor(rng() * 300); break;
            default:           speed = 1.0; size = 2.5; maxAge = 600;
        }
        return {
            type,
            x, y,
            vx: (rng() - 0.5) * speed,
            vy: (rng() - 0.5) * speed,
            size: size * (0.7 + rng() * 0.6),
            energy: 0.5 + rng() * 0.5,
            maxSpeed: speed * (0.8 + rng() * 0.4),
            age: 0,
            maxAge,
            partner: null, // Mode 5 symbiosis
            wanderAngle: rng() * TAU,
            _gridNext: null,
        };
    }

    _buildGrid() {
        for (let i = 0; i < this._grid.length; i++) this._grid[i] = null;
        for (let i = 0; i < this._particles.length; i++) {
            const p = this._particles[i];
            const col = Math.max(0, Math.min(this._gridCols - 1, Math.floor(p.x / this._gridCellSize)));
            const row = Math.max(0, Math.min(this._gridRows - 1, Math.floor(p.y / this._gridCellSize)));
            const cellIdx = row * this._gridCols + col;
            p._gridNext = this._grid[cellIdx];
            this._grid[cellIdx] = i;
        }
    }

    _findNearestDying(p, range) {
        const col = Math.max(0, Math.min(this._gridCols - 1, Math.floor(p.x / this._gridCellSize)));
        const row = Math.max(0, Math.min(this._gridRows - 1, Math.floor(p.y / this._gridCellSize)));
        const cellRange = Math.ceil(range / this._gridCellSize);
        let nearest = null, nearDistSq = range * range;

        for (let dr = -cellRange; dr <= cellRange; dr++) {
            const r2 = row + dr;
            if (r2 < 0 || r2 >= this._gridRows) continue;
            for (let dc = -cellRange; dc <= cellRange; dc++) {
                const c2 = col + dc;
                if (c2 < 0 || c2 >= this._gridCols) continue;
                let idx = this._grid[r2 * this._gridCols + c2];
                while (idx !== null && idx !== undefined) {
                    const other = this._particles[idx];
                    if (other !== p && other.type !== 'decomposer' && other.energy < 0.2 && other.energy > 0) {
                        const dx = other.x - p.x;
                        const dy = other.y - p.y;
                        const dSq = dx * dx + dy * dy;
                        if (dSq < nearDistSq) {
                            nearDistSq = dSq;
                            nearest = other;
                        }
                    }
                    idx = other._gridNext;
                }
            }
        }
        return nearest;
    }

    _findNearest(p, typeFilter, range) {
        const col = Math.max(0, Math.min(this._gridCols - 1, Math.floor(p.x / this._gridCellSize)));
        const row = Math.max(0, Math.min(this._gridRows - 1, Math.floor(p.y / this._gridCellSize)));
        const cellRange = Math.ceil(range / this._gridCellSize);
        let nearest = null, nearDistSq = range * range;

        for (let dr = -cellRange; dr <= cellRange; dr++) {
            const r2 = row + dr;
            if (r2 < 0 || r2 >= this._gridRows) continue;
            for (let dc = -cellRange; dc <= cellRange; dc++) {
                const c2 = col + dc;
                if (c2 < 0 || c2 >= this._gridCols) continue;
                let idx = this._grid[r2 * this._gridCols + c2];
                while (idx !== null && idx !== undefined) {
                    const other = this._particles[idx];
                    if (other !== p && other.type === typeFilter) {
                        const dx = other.x - p.x;
                        const dy = other.y - p.y;
                        const dSq = dx * dx + dy * dy;
                        if (dSq < nearDistSq) {
                            nearDistSq = dSq;
                            nearest = other;
                        }
                    }
                    idx = other._gridNext;
                }
            }
        }
        return nearest;
    }

    update(mx, my, isClicking) {
        this.tick++;
        const dx = mx - this._mx;
        const dy = my - this._my;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._mx = mx;
        this._my = my;

        const clickJust = isClicking && !this._wasClicking;
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Season cycling (mode 4)
        if (this.mode === 4) {
            this._seasonTimer++;
            if (this._seasonTimer > 600) {
                this._seasonTimer = 0;
                this._season = (this._season + 1) % 4;
            }
        }
        if (clickJust) {
            this._season = (this._season + 1) % 4;
        }

        const W = window.innerWidth;
        const H = window.innerHeight;

        // Build spatial grid
        this._buildGrid();

        // Cursor grows spores nearby (sunlight effect)
        if (this.mode === 1 || this._season === 1) {
            for (const node of this._energyNodes) {
                const ndx = mx - node.x;
                const ndy = my - node.y;
                if (ndx * ndx + ndy * ndy < node.radius * node.radius) {
                    node.energy = Math.min(1, node.energy + 0.005);
                }
            }
        }

        // Update particles
        const toRemove = [];
        const toAdd = [];

        for (let i = 0; i < this._particles.length; i++) {
            const p = this._particles[i];
            p.age++;

            // Natural death
            if (p.age > p.maxAge || p.energy <= 0) {
                // Decompose into energy
                if (p.type !== 'decomposer') {
                    toRemove.push(i);
                    continue;
                } else if (p.age > p.maxAge) {
                    toRemove.push(i);
                    continue;
                }
            }

            // Passive energy drain
            p.energy -= p.type === 'hunter' ? 0.002 : 0.001;

            // Wander
            p.wanderAngle += (((this.tick * 2654435761 + i * 1597334677) >>> 0) / 4294967296 - 0.5) * 0.3;

            const wanderForce = 0.02;
            p.vx += Math.cos(p.wanderAngle) * wanderForce;
            p.vy += Math.sin(p.wanderAngle) * wanderForce;

            // Mode 4: seasonal currents
            if (this.mode === 4) {
                const currentAngle = this._season * Math.PI / 2 + Math.sin(this.tick * 0.003 + p.x * 0.005) * 0.5;
                p.vx += Math.cos(currentAngle) * 0.01;
                p.vy += Math.sin(currentAngle) * 0.01;
            }

            // Species behavior
            if (p.type === 'spore') {
                // Grow near energy nodes
                for (const node of this._energyNodes) {
                    const ndx = p.x - node.x;
                    const ndy = p.y - node.y;
                    if (ndx * ndx + ndy * ndy < node.radius * node.radius) {
                        p.energy = Math.min(1, p.energy + node.energy * 0.002);
                    }
                }
                // Reproduce
                if (p.energy > 0.9 && this._particles.length + toAdd.length < this._maxParticles && this.tick % 30 === 0) {
                    const pr = ((this.tick * 2654435761 + i * 1234567) >>> 0) / 4294967296;
                    if (pr < 0.1) {
                        // Create a counter-based RNG for the child particle
                        let childSeed = this.tick * 1597334677 + i * 2246822519;
                        const childRng = () => {
                            childSeed = (childSeed * 1664525 + 1013904223) >>> 0;
                            return childSeed / 4294967296;
                        };
                        const child = this._createParticle(childRng,
                            'spore', p.x + (pr - 0.5) * 20, p.y + (pr - 0.5) * 20);
                        child.energy = 0.3;
                        toAdd.push(child);
                        p.energy -= 0.3;
                    }
                }
            } else if (p.type === 'grazer') {
                // Seek spores
                const prey = this._findNearest(p, 'spore', 120);
                if (prey) {
                    const pdx = prey.x - p.x;
                    const pdy = prey.y - p.y;
                    const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
                    p.vx += (pdx / pDist) * 0.05;
                    p.vy += (pdy / pDist) * 0.05;

                    // Eat if close
                    if (pDist < 10) {
                        p.energy = Math.min(1, p.energy + 0.2);
                        prey.energy = 0; // Kill spore
                    }
                }
                // Flee hunters
                const threat = this._findNearest(p, 'hunter', 100);
                if (threat) {
                    const tdx = p.x - threat.x;
                    const tdy = p.y - threat.y;
                    const tDist = Math.sqrt(tdx * tdx + tdy * tdy);
                    p.vx += (tdx / tDist) * 0.08;
                    p.vy += (tdy / tDist) * 0.08;
                }
            } else if (p.type === 'hunter') {
                // Chase grazers
                const prey = this._findNearest(p, 'grazer', 180);
                if (prey) {
                    const pdx = prey.x - p.x;
                    const pdy = prey.y - p.y;
                    const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
                    p.vx += (pdx / pDist) * 0.08;
                    p.vy += (pdy / pDist) * 0.08;

                    if (pDist < 12) {
                        p.energy = Math.min(1, p.energy + 0.4);
                        prey.energy = 0;
                    }
                }
            } else if (p.type === 'decomposer') {
                // Seek low-energy particles to feed on (recycling)
                const corpse = this._findNearestDying(p, 100);
                if (corpse) {
                    const cdx = corpse.x - p.x;
                    const cdy = corpse.y - p.y;
                    const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
                    p.vx += (cdx / cDist) * 0.04;
                    p.vy += (cdy / cDist) * 0.04;
                    if (cDist < 15) {
                        p.energy = Math.min(1, p.energy + 0.15);
                        corpse.energy = 0; // Consume it
                        // Boost nearby energy nodes
                        for (const node of this._energyNodes) {
                            const ndx = p.x - node.x;
                            const ndy = p.y - node.y;
                            if (ndx * ndx + ndy * ndy < node.radius * node.radius) {
                                node.energy = Math.min(1, node.energy + 0.05);
                            }
                        }
                    }
                } else {
                    p.energy = Math.min(1, p.energy + 0.0005); // Slow passive regen
                }
            }

            // Mode 5: symbiosis - orbit partner
            if (this.mode === 5 && p.partner) {
                if (p.partner.energy <= 0) {
                    p.partner = null;
                } else {
                    const pdx = p.partner.x - p.x;
                    const pdy = p.partner.y - p.y;
                    const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
                    if (pDist > 30) {
                        p.vx += (pdx / pDist) * 0.03;
                        p.vy += (pdy / pDist) * 0.03;
                    } else if (pDist < 15) {
                        p.vx -= (pdx / pDist) * 0.02;
                        p.vy -= (pdy / pDist) * 0.02;
                    }
                    // Perpendicular orbit force
                    p.vx += (-pdy / pDist) * 0.015;
                    p.vy += (pdx / pDist) * 0.015;
                }
            } else if (this.mode === 5 && !p.partner && this.tick % 60 === 0) {
                // Try to find a partner of different type
                for (const other of this._particles) {
                    if (other !== p && other.type !== p.type && !other.partner) {
                        const odx = other.x - p.x;
                        const ody = other.y - p.y;
                        if (odx * odx + ody * ody < 2500) {
                            p.partner = other;
                            other.partner = p;
                            break;
                        }
                    }
                }
            }

            // Cursor interaction
            const cmx = mx - p.x;
            const cmy = my - p.y;
            const cDistSq = cmx * cmx + cmy * cmy;
            if (isClicking && cDistSq < 22500) { // 150px
                // Scatter
                const cDist = Math.sqrt(cDistSq);
                p.vx -= (cmx / cDist) * 0.3;
                p.vy -= (cmy / cDist) * 0.3;
            } else if (cDistSq < 10000 && p.type === 'spore') {
                // Cursor warms spores
                p.energy = Math.min(1, p.energy + 0.003);
            }

            // Speed limit and friction
            const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (spd > p.maxSpeed) {
                p.vx = (p.vx / spd) * p.maxSpeed;
                p.vy = (p.vy / spd) * p.maxSpeed;
            }
            p.vx *= 0.98;
            p.vy *= 0.98;

            p.x += p.vx;
            p.y += p.vy;

            // Wrap
            if (p.x < -10) p.x = W + 10;
            if (p.x > W + 10) p.x = -10;
            if (p.y < -10) p.y = H + 10;
            if (p.y > H + 10) p.y = -10;
        }

        // Remove dead
        for (let i = toRemove.length - 1; i >= 0; i--) {
            const idx = toRemove[i];
            this._particles[idx] = this._particles[this._particles.length - 1];
            this._particles.pop();
        }

        // Add new
        for (const p of toAdd) {
            if (this._particles.length < this._maxParticles) {
                this._particles.push(p);
            }
        }

        // Trail
        if (this._trailCtx && this.tick % 2 === 0) {
            const tc = this._trailCtx;
            tc.globalCompositeOperation = 'destination-out';
            tc.fillStyle = 'rgba(0,0,0,0.02)';
            tc.fillRect(0, 0, this._trailCanvas.width, this._trailCanvas.height);

            tc.globalCompositeOperation = 'lighter';
            for (const p of this._particles) {
                if (p.energy < 0.1) continue;
                const hue = p.type === 'spore' ? this._hue
                    : p.type === 'grazer' ? this._hueGrazer
                    : p.type === 'hunter' ? this._hueHunter
                    : this._hueDecomposer;
                tc.fillStyle = `hsla(${hue}, 60%, 50%, ${p.energy * 0.08})`;
                tc.beginPath();
                tc.arc(p.x / 2, p.y / 2, p.size, 0, TAU);
                tc.fill();
            }
        }
    }

    draw(ctx, system) {
        ctx.save();

        // Trail layer
        if (this._trailCanvas) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.5 * this._intensity;
            ctx.drawImage(this._trailCanvas, 0, 0, system.width, system.height);
            ctx.globalAlpha = 1;
        }

        ctx.globalCompositeOperation = 'lighter';
        const intensity = this._intensity;

        // Energy nodes: subtle glow
        for (const node of this._energyNodes) {
            const alpha = node.energy * 0.04 * intensity;
            ctx.fillStyle = `hsla(${this._hue}, 60%, 40%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, TAU);
            ctx.fill();
        }

        // Mode 3: mycelium threads between decomposers (avoid .filter allocation)
        if (this.mode === 3) {
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            const parts = this._particles;
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].type !== 'decomposer') continue;
                for (let j = i + 1; j < parts.length; j++) {
                    if (parts[j].type !== 'decomposer') continue;
                    const ddx = parts[i].x - parts[j].x;
                    const ddy = parts[i].y - parts[j].y;
                    if (ddx * ddx + ddy * ddy < 14400) { // 120px
                        ctx.moveTo(parts[i].x, parts[i].y);
                        ctx.lineTo(parts[j].x, parts[j].y);
                    }
                }
            }
            ctx.strokeStyle = `hsla(${this._hueDecomposer}, 40%, 50%, ${0.08 * intensity})`;
            ctx.stroke();
        }

        // Mode 5: symbiosis connections
        if (this.mode === 5) {
            ctx.lineWidth = 0.5;
            const drawn = new Set();
            for (const p of this._particles) {
                if (p.partner && !drawn.has(p)) {
                    drawn.add(p.partner);
                    const alpha = Math.min(p.energy, p.partner.energy) * 0.15 * intensity;
                    ctx.strokeStyle = `hsla(${(this._hue + 60) % 360}, 50%, 60%, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.partner.x, p.partner.y);
                    ctx.stroke();
                }
            }
        }

        // Draw particles with species-specific shapes
        for (const p of this._particles) {
            if (p.energy <= 0) continue;

            const hue = p.type === 'spore' ? this._hue
                : p.type === 'grazer' ? this._hueGrazer
                : p.type === 'hunter' ? this._hueHunter
                : this._hueDecomposer;

            const alpha = (0.2 + p.energy * 0.4) * intensity;
            const size = p.size * (0.5 + p.energy * 0.5);
            const lightness = 50 + p.energy * 30;

            // Outer glow for high-energy particles
            if (p.energy > 0.6) {
                ctx.fillStyle = `hsla(${hue}, 60%, ${lightness - 10}%, ${alpha * 0.1})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, size * 4, 0, TAU);
                ctx.fill();
            }

            ctx.fillStyle = `hsla(${hue}, 70%, ${lightness}%, ${alpha})`;
            ctx.beginPath();

            if (p.type === 'spore') {
                // Spores: soft hexagonal bloom
                for (let k = 0; k < 6; k++) {
                    const a = (k / 6) * TAU;
                    const lx = p.x + Math.cos(a) * size;
                    const ly = p.y + Math.sin(a) * size;
                    if (k === 0) ctx.moveTo(lx, ly);
                    else ctx.lineTo(lx, ly);
                }
                ctx.closePath();
            } else if (p.type === 'hunter') {
                // Hunters: sharp triangle pointing in movement direction
                const angle = Math.atan2(p.vy, p.vx);
                ctx.moveTo(p.x + Math.cos(angle) * size * 1.8, p.y + Math.sin(angle) * size * 1.8);
                ctx.lineTo(p.x + Math.cos(angle + 2.4) * size, p.y + Math.sin(angle + 2.4) * size);
                ctx.lineTo(p.x + Math.cos(angle - 2.4) * size, p.y + Math.sin(angle - 2.4) * size);
                ctx.closePath();
            } else if (p.type === 'decomposer') {
                // Decomposers: 4-pointed star
                for (let k = 0; k < 8; k++) {
                    const a = (k / 8) * TAU;
                    const r = k % 2 === 0 ? size * 1.3 : size * 0.5;
                    const lx = p.x + Math.cos(a) * r;
                    const ly = p.y + Math.sin(a) * r;
                    if (k === 0) ctx.moveTo(lx, ly);
                    else ctx.lineTo(lx, ly);
                }
                ctx.closePath();
            } else {
                // Grazers: circle (default)
                ctx.arc(p.x, p.y, size, 0, TAU);
            }
            ctx.fill();

            // Hot center for full energy
            if (p.energy > 0.85) {
                ctx.fillStyle = `hsla(${hue}, 30%, 90%, ${(p.energy - 0.85) * 2 * intensity})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, size * 0.3, 0, TAU);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
