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

        // Click: spawn food bloom / extinction pulse
        if (isClicking && !this._wasClicking) {
            // Spawn food bloom near click
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * TAU;
                const dist = 30 + Math.random() * 40;
                if (this.plants.length < this.maxPlants * 2) {
                    this.plants.push({
                        x: mx + Math.cos(angle) * dist,
                        y: my + Math.sin(angle) * dist,
                        size: 3,
                        growth: 0.5,
                        maxSize: 6,
                        hue: (this._plantHue + Math.random() * 40) % 360,
                        pulse: Math.random() * TAU,
                    });
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
                // Fungal: radial spore pattern
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
            } else {
                // Default: pulsing circles
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
