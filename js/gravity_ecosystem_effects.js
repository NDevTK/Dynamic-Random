/**
 * @file gravity_ecosystem_effects.js
 * @description A living micro-ecosystem where seed determines species traits,
 * food chains, and behaviors. Predators hunt prey, prey flees, plants grow.
 * Mouse acts as a god-like environmental force: left-click spawns food blooms,
 * right-click creates extinction events. Each seed produces wildly different
 * ecosystems with unique color-coded species, movement patterns, and population
 * dynamics. Some seeds create peaceful herbivore worlds, others brutal predator pits.
 *
 * Modes (seed-selected):
 * 0 - Ocean: jellyfish predators, plankton prey, kelp plants, currents push
 * 1 - Savanna: pack hunters, herd grazers, grass patches, watering holes
 * 2 - Fungal: spore clouds, mycelium networks, decomposers, everything connected
 * 3 - Insect Colony: queen/drone/worker hierarchy, pheromone trails, hive building
 * 4 - Microscopic: amoebas that split, viruses that infect, antibodies that chase
 */

const TAU = Math.PI * 2;

export class GravityEcosystem {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 120;
        this.saturation = 60;
        this._rng = Math.random;

        this.creatures = [];
        this.plants = [];
        this.trails = [];
        this.maxCreatures = 120;
        this.maxPlants = 40;
        this.maxTrails = 300;

        this._mouseX = 0;
        this._mouseY = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Species config (set by seed)
        this._predatorSpeed = 2;
        this._preySpeed = 1.5;
        this._predatorSize = 6;
        this._preySize = 3;
        this._predatorHue = 0;
        this._preyHue = 120;
        this._plantHue = 80;
        this._predatorCount = 8;
        this._preyCount = 40;
        this._huntRadius = 150;
        this._fleeRadius = 120;
        this._predatorShape = 0; // 0=triangle, 1=diamond, 2=cross
        this._preyShape = 0; // 0=circle, 1=dot-cluster, 2=oval
        this._currentFlow = { x: 0, y: 0 };
        this._flowAngle = 0;
        this._flowSpeed = 0.01;

        // Population tracking for visual indicators
        this._predatorPop = 0;
        this._preyPop = 0;

        // Mode-specific: pheromone trails (insect), mycelium links (fungal)
        this._pheromones = [];
        this._maxPheromones = 200;
        this._myceliumLinks = [];
        this._wateringHoles = [];
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 5);
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.saturation = 50 + rng() * 40;
        this.tick = 0;
        this._rng = rng;
        this.creatures = [];
        this.plants = [];
        this.trails = [];
        this._pheromones = [];
        this._myceliumLinks = [];
        this._wateringHoles = [];

        // Species traits driven by seed
        this._predatorSpeed = 1.2 + rng() * 2;
        this._preySpeed = 0.8 + rng() * 1.5;
        this._predatorSize = 4 + rng() * 6;
        this._preySize = 2 + rng() * 3;
        this._predatorHue = (this.hue + 180 + rng() * 40 - 20) % 360;
        this._preyHue = (this.hue + rng() * 60 - 30 + 360) % 360;
        this._plantHue = (this.hue + 60 + rng() * 40) % 360;
        this._predatorCount = 4 + Math.floor(rng() * 10);
        this._preyCount = 20 + Math.floor(rng() * 40);
        this._huntRadius = 100 + rng() * 120;
        this._fleeRadius = 80 + rng() * 100;
        this._predatorShape = Math.floor(rng() * 3);
        this._preyShape = Math.floor(rng() * 3);
        this._flowAngle = rng() * TAU;
        this._flowSpeed = 0.005 + rng() * 0.015;

        const W = window.innerWidth, H = window.innerHeight;

        // Spawn predators
        for (let i = 0; i < this._predatorCount; i++) {
            this.creatures.push(this._makePredator(rng() * W, rng() * H, rng));
        }

        // Spawn prey
        for (let i = 0; i < this._preyCount; i++) {
            this.creatures.push(this._makePrey(rng() * W, rng() * H, rng));
        }

        // Spawn plants
        for (let i = 0; i < this.maxPlants; i++) {
            this.plants.push({
                x: rng() * W,
                y: rng() * H,
                size: 2 + rng() * 4,
                growth: 0.3 + rng() * 0.7,
                maxSize: 4 + rng() * 6,
                hue: (this._plantHue + rng() * 30 - 15 + 360) % 360,
                pulse: rng() * TAU,
            });
        }
    }

    _makePredator(x, y, rng) {
        return {
            x, y,
            vx: (rng() - 0.5) * 2,
            vy: (rng() - 0.5) * 2,
            type: 'predator',
            size: this._predatorSize * (0.8 + rng() * 0.4),
            hue: (this._predatorHue + rng() * 20 - 10 + 360) % 360,
            energy: 80 + rng() * 40,
            maxEnergy: 120,
            angle: rng() * TAU,
            huntCooldown: 0,
            alpha: 0.8,
        };
    }

    _makePrey(x, y, rng) {
        return {
            x, y,
            vx: (rng() - 0.5) * 1.5,
            vy: (rng() - 0.5) * 1.5,
            type: 'prey',
            size: this._preySize * (0.8 + rng() * 0.4),
            hue: (this._preyHue + rng() * 20 - 10 + 360) % 360,
            energy: 50 + rng() * 30,
            maxEnergy: 80,
            angle: rng() * TAU,
            alpha: 0.7,
        };
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._mouseX = mx;
        this._mouseY = my;

        // Click: spawn food bloom
        if (isClicking && !this._wasClicking) {
            // Use tick-based pseudo-random instead of Math.random for determinism
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * TAU;
                const pr = ((this.tick * 2654435761 + i * 284837) >>> 0) / 4294967296;
                const dist = 30 + pr * 40;
                if (this.plants.length < this.maxPlants * 2) {
                    this.plants.push({
                        x: mx + Math.cos(angle) * dist,
                        y: my + Math.sin(angle) * dist,
                        size: 3,
                        growth: 0.5,
                        maxSize: 6,
                        hue: (this._plantHue + pr * 40 + 360) % 360,
                        pulse: pr * TAU,
                    });
                }
            }
            // Insect mode: click also emits strong pheromone burst
            if (this.mode === 3) {
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * TAU;
                    if (this._pheromones.length < this._maxPheromones) {
                        this._pheromones.push({ x: mx + Math.cos(a) * 15, y: my + Math.sin(a) * 15, strength: 1, life: 120 });
                    }
                }
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Environmental flow (currents/wind)
        this._flowAngle += this._flowSpeed;
        this._currentFlow.x = Math.cos(this._flowAngle) * 0.2;
        this._currentFlow.y = Math.sin(this._flowAngle * 0.7) * 0.15;

        const W = window.innerWidth, H = window.innerHeight;
        let predCount = 0, preyCount = 0;

        // Update creatures
        for (let i = this.creatures.length - 1; i >= 0; i--) {
            const c = this.creatures[i];

            if (c.type === 'predator') {
                predCount++;
                this._updatePredator(c, i);
            } else {
                preyCount++;
                this._updatePrey(c, i);
            }

            // Environmental flow
            c.vx += this._currentFlow.x;
            c.vy += this._currentFlow.y;

            // Mouse influence: gentle attraction
            const mdx = mx - c.x, mdy = my - c.y;
            const md = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
            if (md < 200) {
                const force = (1 - md / 200) * (isClicking ? 0.3 : 0.1);
                c.vx += (mdx / md) * force * (c.type === 'prey' ? -1 : 1);
                c.vy += (mdy / md) * force * (c.type === 'prey' ? -1 : 1);
            }

            // Speed limit
            const spd = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
            const maxSpd = c.type === 'predator' ? this._predatorSpeed : this._preySpeed;
            if (spd > maxSpd) {
                c.vx = (c.vx / spd) * maxSpd;
                c.vy = (c.vy / spd) * maxSpd;
            }

            c.vx *= 0.97;
            c.vy *= 0.97;
            c.x += c.vx;
            c.y += c.vy;
            c.angle = Math.atan2(c.vy, c.vx);

            // Wrap
            if (c.x < -30) c.x = W + 30;
            if (c.x > W + 30) c.x = -30;
            if (c.y < -30) c.y = H + 30;
            if (c.y > H + 30) c.y = -30;

            // Energy decay
            c.energy -= 0.05;
            if (c.energy <= 0) {
                // Death - leave trail
                if (this.trails.length < this.maxTrails) {
                    this.trails.push({ x: c.x, y: c.y, size: c.size * 0.5, life: 60, hue: c.hue });
                }
                this.creatures[i] = this.creatures[this.creatures.length - 1];
                this.creatures.pop();
            }
        }

        this._predatorPop = predCount;
        this._preyPop = preyCount;

        // Population balance: spawn replacements
        if (preyCount < 10 && this.creatures.length < this.maxCreatures) {
            const rng = this._rng;
            this.creatures.push(this._makePrey(rng() * W, rng() * H, rng));
        }
        if (predCount < 2 && this.creatures.length < this.maxCreatures) {
            const rng = this._rng;
            this.creatures.push(this._makePredator(rng() * W, rng() * H, rng));
        }

        // Update plants (grow, pulse)
        for (const p of this.plants) {
            p.size = Math.min(p.maxSize, p.size + 0.01 * p.growth);
            p.pulse += 0.03;
        }

        // Decay trails
        for (let i = this.trails.length - 1; i >= 0; i--) {
            this.trails[i].life--;
            if (this.trails[i].life <= 0) {
                this.trails[i] = this.trails[this.trails.length - 1];
                this.trails.pop();
            }
        }

        // Mode-specific: Insect pheromone trails
        if (this.mode === 3) {
            // Predators leave pheromone breadcrumbs
            for (const c of this.creatures) {
                if (c.type === 'predator' && this.tick % 8 === 0 && this._pheromones.length < this._maxPheromones) {
                    this._pheromones.push({ x: c.x, y: c.y, strength: 0.5, life: 80 });
                }
            }
            for (let i = this._pheromones.length - 1; i >= 0; i--) {
                this._pheromones[i].life--;
                this._pheromones[i].strength *= 0.995;
                if (this._pheromones[i].life <= 0) {
                    this._pheromones[i] = this._pheromones[this._pheromones.length - 1];
                    this._pheromones.pop();
                }
            }
        }

        // Mode-specific: Fungal mycelium connections between nearby plants
        if (this.mode === 2 && this.tick % 20 === 0) {
            this._myceliumLinks = [];
            for (let i = 0; i < this.plants.length; i++) {
                for (let j = i + 1; j < this.plants.length; j++) {
                    const dx = this.plants[j].x - this.plants[i].x;
                    const dy = this.plants[j].y - this.plants[i].y;
                    if (dx * dx + dy * dy < 25000) { // ~158px
                        this._myceliumLinks.push({ a: i, b: j });
                    }
                }
            }
        }

        // Mode-specific: Savanna watering holes (attract prey periodically)
        if (this.mode === 1 && this._wateringHoles.length === 0) {
            const rng = this._rng;
            for (let i = 0; i < 2; i++) {
                this._wateringHoles.push({ x: rng() * W, y: rng() * H, radius: 60 + rng() * 40 });
            }
        }
    }

    _updatePredator(c, idx) {
        // Hunt nearest prey
        let nearestDist = Infinity, nearestPrey = null;
        for (const other of this.creatures) {
            if (other.type !== 'prey') continue;
            const dx = other.x - c.x, dy = other.y - c.y;
            const d = dx * dx + dy * dy;
            if (d < nearestDist && d < this._huntRadius * this._huntRadius) {
                nearestDist = d;
                nearestPrey = other;
            }
        }

        if (nearestPrey) {
            const dx = nearestPrey.x - c.x, dy = nearestPrey.y - c.y;
            const d = Math.sqrt(nearestDist) || 1;
            c.vx += (dx / d) * 0.15;
            c.vy += (dy / d) * 0.15;

            // Catch prey
            if (d < c.size + nearestPrey.size) {
                c.energy = Math.min(c.maxEnergy, c.energy + 30);
                nearestPrey.energy = 0; // Mark for removal

                // Reproduce if well-fed
                if (c.energy > 90 && this.creatures.length < this.maxCreatures) {
                    c.energy -= 40;
                    const rng = this._rng;
                    this.creatures.push(this._makePredator(
                        c.x + (rng() - 0.5) * 30,
                        c.y + (rng() - 0.5) * 30,
                        rng
                    ));
                }
            }
        } else {
            // Wander
            c.vx += (Math.sin(this.tick * 0.01 + idx) * 0.05);
            c.vy += (Math.cos(this.tick * 0.013 + idx * 1.3) * 0.05);
        }
    }

    _updatePrey(c, idx) {
        // Flee nearest predator
        let nearestDist = Infinity, nearestPred = null;
        for (const other of this.creatures) {
            if (other.type !== 'predator') continue;
            const dx = other.x - c.x, dy = other.y - c.y;
            const d = dx * dx + dy * dy;
            if (d < nearestDist && d < this._fleeRadius * this._fleeRadius) {
                nearestDist = d;
                nearestPred = other;
            }
        }

        if (nearestPred) {
            const dx = c.x - nearestPred.x, dy = c.y - nearestPred.y;
            const d = Math.sqrt(nearestDist) || 1;
            c.vx += (dx / d) * 0.2;
            c.vy += (dy / d) * 0.2;
        }

        // Seek nearest plant for food
        let nearestPlant = null, plantDist = Infinity;
        for (const p of this.plants) {
            const dx = p.x - c.x, dy = p.y - c.y;
            const d = dx * dx + dy * dy;
            if (d < plantDist) { plantDist = d; nearestPlant = p; }
        }

        if (nearestPlant && plantDist < 10000) { // Within 100px
            const dx = nearestPlant.x - c.x, dy = nearestPlant.y - c.y;
            const d = Math.sqrt(plantDist) || 1;
            c.vx += (dx / d) * 0.05;
            c.vy += (dy / d) * 0.05;

            if (d < c.size + nearestPlant.size) {
                c.energy = Math.min(c.maxEnergy, c.energy + 10);
                nearestPlant.size = Math.max(1, nearestPlant.size - 0.5);

                // Reproduce
                if (c.energy > 60 && this.creatures.length < this.maxCreatures) {
                    c.energy -= 25;
                    const rng = this._rng;
                    this.creatures.push(this._makePrey(
                        c.x + (rng() - 0.5) * 20,
                        c.y + (rng() - 0.5) * 20,
                        rng
                    ));
                }
            }
        }

        // Savanna: prey attracted to watering holes
        if (this.mode === 1) {
            for (const wh of this._wateringHoles) {
                const whDx = wh.x - c.x, whDy = wh.y - c.y;
                const whD = Math.sqrt(whDx * whDx + whDy * whDy) || 1;
                if (whD < wh.radius * 2) {
                    c.vx += (whDx / whD) * 0.03;
                    c.vy += (whDy / whD) * 0.03;
                }
            }
        }
        // Insect: prey follows pheromone trails (swarm toward them)
        if (this.mode === 3) {
            let phX = 0, phY = 0, phN = 0;
            for (const ph of this._pheromones) {
                const pdx = ph.x - c.x, pdy = ph.y - c.y;
                if (Math.abs(pdx) < 60 && Math.abs(pdy) < 60) {
                    phX += pdx * ph.strength;
                    phY += pdy * ph.strength;
                    phN++;
                }
            }
            if (phN > 0) {
                c.vx += (phX / phN) * 0.003;
                c.vy += (phY / phN) * 0.003;
            }
        }

        // Mild flocking with nearby prey
        let fCohX = 0, fCohY = 0, fSepX = 0, fSepY = 0, fN = 0;
        const step = Math.max(1, Math.floor(this.creatures.length / 20));
        for (let j = idx % step; j < this.creatures.length; j += step) {
            const other = this.creatures[j];
            if (other === c || other.type !== 'prey') continue;
            const dx = other.x - c.x, dy = other.y - c.y;
            if (Math.abs(dx) > 80 || Math.abs(dy) > 80) continue;
            const d = dx * dx + dy * dy;
            if (d < 6400 && d > 0) {
                const dist = Math.sqrt(d);
                if (dist < 15) { fSepX -= dx / dist; fSepY -= dy / dist; }
                fCohX += other.x; fCohY += other.y;
                fN++;
            }
        }
        if (fN > 0) {
            c.vx += fSepX * 0.08 + (fCohX / fN - c.x) * 0.002;
            c.vy += fSepY * 0.08 + (fCohY / fN - c.y) * 0.002;
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw trails (death marks)
        for (const t of this.trails) {
            const alpha = (t.life / 60) * 0.2;
            ctx.fillStyle = `hsla(${t.hue}, 40%, 50%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.size, 0, TAU);
            ctx.fill();
        }

        // Mode-specific: draw pheromone trails (insect)
        if (this.mode === 3) {
            ctx.fillStyle = `hsla(${this._predatorHue}, 40%, 60%, 0.04)`;
            ctx.beginPath();
            for (const ph of this._pheromones) {
                ctx.moveTo(ph.x + 3, ph.y);
                ctx.arc(ph.x, ph.y, 3 * ph.strength, 0, TAU);
            }
            ctx.fill();
        }

        // Mode-specific: draw mycelium network (fungal)
        if (this.mode === 2) {
            ctx.strokeStyle = `hsla(${this._plantHue}, 40%, 55%, 0.06)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            for (const link of this._myceliumLinks) {
                const a = this.plants[link.a], b = this.plants[link.b];
                if (!a || !b) continue;
                ctx.moveTo(a.x, a.y);
                // Wavy connection
                const mx2 = (a.x + b.x) / 2 + Math.sin(this.tick * 0.01 + link.a) * 8;
                const my2 = (a.y + b.y) / 2 + Math.cos(this.tick * 0.013 + link.b) * 8;
                ctx.quadraticCurveTo(mx2, my2, b.x, b.y);
            }
            ctx.stroke();
            // Nutrient pulses along mycelium
            if (this.tick % 3 === 0) {
                const pulseAlpha = 0.12;
                ctx.fillStyle = `hsla(${this._plantHue}, 60%, 70%, ${pulseAlpha})`;
                for (const link of this._myceliumLinks) {
                    const a = this.plants[link.a], b = this.plants[link.b];
                    if (!a || !b) continue;
                    const t = (Math.sin(this.tick * 0.03 + link.a * 0.5) + 1) * 0.5;
                    const px = a.x + (b.x - a.x) * t;
                    const py = a.y + (b.y - a.y) * t;
                    ctx.beginPath();
                    ctx.arc(px, py, 2, 0, TAU);
                    ctx.fill();
                }
            }
        }

        // Mode-specific: draw watering holes (savanna)
        if (this.mode === 1) {
            for (const wh of this._wateringHoles) {
                const wobble = Math.sin(this.tick * 0.02) * 3;
                ctx.strokeStyle = `hsla(${200}, 50%, 55%, 0.06)`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(wh.x, wh.y, wh.radius + wobble, wh.radius * 0.6 + wobble, 0, 0, TAU);
                ctx.stroke();
                ctx.fillStyle = `hsla(${200}, 40%, 50%, 0.02)`;
                ctx.fill();
            }
        }

        // Draw plants
        for (const p of this.plants) {
            const pulseSize = p.size + Math.sin(p.pulse) * 0.5;
            const alpha = 0.3 + Math.sin(p.pulse) * 0.1;
            ctx.fillStyle = `hsla(${p.hue}, 60%, 45%, ${alpha})`;
            ctx.beginPath();

            if (this.mode === 0) {
                // Ocean kelp: wavy vertical lines
                ctx.moveTo(p.x, p.y);
                ctx.quadraticCurveTo(
                    p.x + Math.sin(this.tick * 0.03 + p.pulse) * 8,
                    p.y - pulseSize * 3,
                    p.x + Math.sin(this.tick * 0.02 + p.pulse) * 5,
                    p.y - pulseSize * 6
                );
                ctx.lineWidth = pulseSize * 0.5;
                ctx.strokeStyle = `hsla(${p.hue}, 60%, 45%, ${alpha})`;
                ctx.stroke();
            } else if (this.mode === 2) {
                // Fungal: radial spore pattern (cap + radiating hyphae)
                for (let a = 0; a < TAU; a += TAU / 5) {
                    const r = pulseSize * 1.5;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x + Math.cos(a + this.tick * 0.005) * r,
                              p.y + Math.sin(a + this.tick * 0.005) * r);
                }
                ctx.lineWidth = 0.5;
                ctx.strokeStyle = `hsla(${p.hue}, 50%, 55%, ${alpha * 0.5})`;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(p.x, p.y, pulseSize * 0.8, 0, TAU);
                ctx.fill();
            } else if (this.mode === 1) {
                // Savanna: grass tufts (short lines radiating upward)
                ctx.strokeStyle = `hsla(${p.hue}, 55%, 50%, ${alpha})`;
                ctx.lineWidth = 0.8;
                for (let g = 0; g < 3; g++) {
                    const gAngle = -Math.PI / 2 + (g - 1) * 0.4 + Math.sin(this.tick * 0.02 + p.pulse + g) * 0.15;
                    ctx.beginPath();
                    ctx.moveTo(p.x + (g - 1) * 2, p.y);
                    ctx.lineTo(p.x + (g - 1) * 2 + Math.cos(gAngle) * pulseSize * 2,
                              p.y + Math.sin(gAngle) * pulseSize * 2);
                    ctx.stroke();
                }
            } else if (this.mode === 3) {
                // Insect: hexagonal food deposits
                ctx.beginPath();
                for (let h = 0; h < 6; h++) {
                    const hAngle = (h / 6) * TAU;
                    const hx = p.x + Math.cos(hAngle) * pulseSize;
                    const hy = p.y + Math.sin(hAngle) * pulseSize;
                    if (h === 0) ctx.moveTo(hx, hy);
                    else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.fill();
            } else if (this.mode === 4) {
                // Microscopic: cell-like blobs with membrane
                ctx.arc(p.x, p.y, pulseSize, 0, TAU);
                ctx.fill();
                ctx.strokeStyle = `hsla(${p.hue}, 50%, 60%, ${alpha * 0.5})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.arc(p.x, p.y, pulseSize * 1.2, 0, TAU);
                ctx.stroke();
                // Nucleus
                ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${alpha * 0.5})`;
                ctx.beginPath();
                ctx.arc(p.x + Math.sin(p.pulse) * pulseSize * 0.2, p.y + Math.cos(p.pulse) * pulseSize * 0.2, pulseSize * 0.3, 0, TAU);
                ctx.fill();
            } else {
                ctx.arc(p.x, p.y, pulseSize, 0, TAU);
                ctx.fill();
            }
        }

        // Draw creatures
        for (const c of this.creatures) {
            const energyRatio = c.energy / c.maxEnergy;
            const alpha = c.alpha * (0.4 + energyRatio * 0.6);
            const lightness = 50 + energyRatio * 25;

            if (c.type === 'predator') {
                ctx.fillStyle = `hsla(${c.hue}, ${this.saturation}%, ${lightness}%, ${alpha})`;
                this._drawPredatorShape(ctx, c);

                // Hunt glow when close to prey
                if (energyRatio < 0.5) {
                    ctx.fillStyle = `hsla(${c.hue}, 80%, 60%, ${(1 - energyRatio) * 0.15})`;
                    ctx.beginPath();
                    ctx.arc(c.x, c.y, c.size * 3, 0, TAU);
                    ctx.fill();
                }
            } else {
                ctx.fillStyle = `hsla(${c.hue}, ${this.saturation}%, ${lightness}%, ${alpha})`;
                this._drawPreyShape(ctx, c);
            }

            // Speed trail
            const spd = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
            if (spd > 1) {
                ctx.strokeStyle = `hsla(${c.hue}, ${this.saturation}%, ${lightness}%, ${alpha * 0.3})`;
                ctx.lineWidth = c.size * 0.3;
                ctx.beginPath();
                ctx.moveTo(c.x, c.y);
                ctx.lineTo(c.x - c.vx * 3, c.y - c.vy * 3);
                ctx.stroke();
            }

            // Ocean mode: jellyfish tentacles on predators
            if (this.mode === 0 && c.type === 'predator') {
                ctx.strokeStyle = `hsla(${c.hue}, ${this.saturation}%, ${lightness}%, ${alpha * 0.25})`;
                ctx.lineWidth = 0.5;
                for (let t = 0; t < 4; t++) {
                    const ta = c.angle + Math.PI + (t - 1.5) * 0.4;
                    ctx.beginPath();
                    ctx.moveTo(c.x, c.y);
                    const tx = c.x + Math.cos(ta) * c.size * 2 + Math.sin(this.tick * 0.08 + t) * 3;
                    const ty = c.y + Math.sin(ta) * c.size * 2 + Math.cos(this.tick * 0.06 + t) * 3;
                    ctx.quadraticCurveTo(
                        (c.x + tx) / 2 + Math.sin(this.tick * 0.1 + t * 2) * 4,
                        (c.y + ty) / 2 + Math.cos(this.tick * 0.08 + t * 2) * 4,
                        tx, ty
                    );
                    ctx.stroke();
                }
            }

            // Microscopic mode: amoeba pseudopod extensions
            if (this.mode === 4 && c.type === 'prey') {
                ctx.fillStyle = `hsla(${c.hue}, ${this.saturation}%, ${lightness}%, ${alpha * 0.4})`;
                for (let p = 0; p < 3; p++) {
                    const pa = c.angle + Math.sin(this.tick * 0.05 + p * 2.1) * 1.5;
                    const pLen = c.size * (0.8 + Math.sin(this.tick * 0.07 + p * 1.7) * 0.4);
                    ctx.beginPath();
                    ctx.arc(c.x + Math.cos(pa) * pLen, c.y + Math.sin(pa) * pLen, c.size * 0.4, 0, TAU);
                    ctx.fill();
                }
            }
        }

        ctx.restore();
    }

    _drawPredatorShape(ctx, c) {
        const s = c.size;
        const cos = Math.cos(c.angle);
        const sin = Math.sin(c.angle);

        ctx.beginPath();
        if (this._predatorShape === 0) {
            // Arrow/triangle pointing in movement direction
            ctx.moveTo(c.x + cos * s * 1.5, c.y + sin * s * 1.5);
            ctx.lineTo(c.x - cos * s + sin * s * 0.8, c.y - sin * s - cos * s * 0.8);
            ctx.lineTo(c.x - cos * s - sin * s * 0.8, c.y - sin * s + cos * s * 0.8);
            ctx.closePath();
        } else if (this._predatorShape === 1) {
            // Diamond
            ctx.moveTo(c.x + cos * s * 1.3, c.y + sin * s * 1.3);
            ctx.lineTo(c.x + sin * s * 0.7, c.y - cos * s * 0.7);
            ctx.lineTo(c.x - cos * s * 1.3, c.y - sin * s * 1.3);
            ctx.lineTo(c.x - sin * s * 0.7, c.y + cos * s * 0.7);
            ctx.closePath();
        } else {
            // Star/cross
            for (let i = 0; i < 4; i++) {
                const a = c.angle + (i / 4) * TAU;
                ctx.moveTo(c.x, c.y);
                ctx.lineTo(c.x + Math.cos(a) * s * 1.5, c.y + Math.sin(a) * s * 1.5);
            }
            ctx.lineWidth = s * 0.4;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(c.x, c.y, s * 0.5, 0, TAU);
        }
        ctx.fill();
    }

    _drawPreyShape(ctx, c) {
        const s = c.size;
        ctx.beginPath();
        if (this._preyShape === 0) {
            ctx.arc(c.x, c.y, s, 0, TAU);
        } else if (this._preyShape === 1) {
            // Dot cluster
            for (let i = 0; i < 3; i++) {
                const a = c.angle + (i / 3) * TAU;
                ctx.moveTo(c.x + Math.cos(a) * s * 0.5 + s * 0.4, c.y + Math.sin(a) * s * 0.5);
                ctx.arc(c.x + Math.cos(a) * s * 0.5, c.y + Math.sin(a) * s * 0.5, s * 0.4, 0, TAU);
            }
        } else {
            // Oval
            ctx.ellipse(c.x, c.y, s * 1.3, s * 0.7, c.angle, 0, TAU);
        }
        ctx.fill();
    }
}
