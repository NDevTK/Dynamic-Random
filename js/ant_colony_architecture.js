/**
 * @file ant_colony_architecture.js
 * @description Emergent ant colony simulation with visible pheromone trails that glow.
 * Ants forage between nest and food sources, leaving colored trail networks.
 * Click to place food sources. Seed determines colony count, terrain obstacles,
 * ant behavior parameters, pheromone colors, and foraging strategies.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class AntColonyArchitecture extends Architecture {
    constructor() {
        super();
        this.ants = [];
        this.nests = [];
        this.foodSources = [];
        this.pheromoneGrid = null;
        this.gridW = 0;
        this.gridH = 0;
        this.cellSize = 6;
        this.obstacles = [];
        this.colonyStyle = 0;
        this.tick = 0;
    }

    init(system) {
        const rng = system.rng;
        const w = system.width;
        const h = system.height;

        // Colony style: 0=classic forager, 1=army ants (raiders), 2=leaf cutter (highways),
        // 3=weaver (silk bridges), 4=fire ants (radial mounds)
        this.colonyStyle = Math.floor(rng() * 5);

        // Pheromone color schemes based on seed
        const pheromoneSchemes = [
            { home: [0, 100, 50], food: [120, 100, 50] },     // Red-Green classic
            { home: [200, 90, 60], food: [40, 100, 60] },     // Blue-Orange
            { home: [280, 80, 50], food: [60, 100, 50] },     // Purple-Yellow
            { home: [160, 90, 40], food: [320, 90, 60] },     // Teal-Magenta
            { home: [30, 100, 50], food: [210, 80, 50] },     // Amber-Cyan
        ];
        this.pheromoneColors = pheromoneSchemes[Math.floor(rng() * pheromoneSchemes.length)];

        // Pheromone grid for trail marking
        this.gridW = Math.ceil(w / this.cellSize);
        this.gridH = Math.ceil(h / this.cellSize);
        // Two channels: [0] = home pheromone, [1] = food pheromone
        const totalCells = this.gridW * this.gridH;
        this.pheromoneGrid = new Float32Array(totalCells * 2);

        // Generate nests
        this.nests = [];
        const nestCount = 1 + Math.floor(rng() * 3);
        for (let i = 0; i < nestCount; i++) {
            this.nests.push({
                x: w * (0.2 + rng() * 0.6),
                y: h * (0.2 + rng() * 0.6),
                radius: 15 + rng() * 10,
                hue: (system.hue + i * 90) % 360,
                population: 0,
            });
        }

        // Generate food sources
        this.foodSources = [];
        const foodCount = 3 + Math.floor(rng() * 5);
        for (let i = 0; i < foodCount; i++) {
            this.foodSources.push({
                x: w * (0.1 + rng() * 0.8),
                y: h * (0.1 + rng() * 0.8),
                amount: 200 + rng() * 500,
                maxAmount: 700,
                radius: 8 + rng() * 8,
                hue: 60 + rng() * 60,
            });
        }

        // Generate obstacles based on seed
        this.obstacles = [];
        if (this.colonyStyle !== 1) { // Army ants ignore obstacles
            const obstCount = 3 + Math.floor(rng() * 6);
            for (let i = 0; i < obstCount; i++) {
                const type = rng() > 0.5 ? 'circle' : 'rect';
                if (type === 'circle') {
                    this.obstacles.push({
                        type: 'circle',
                        x: w * (0.1 + rng() * 0.8),
                        y: h * (0.1 + rng() * 0.8),
                        radius: 20 + rng() * 40,
                    });
                } else {
                    const ox = w * (0.1 + rng() * 0.8);
                    const oy = h * (0.1 + rng() * 0.8);
                    this.obstacles.push({
                        type: 'rect',
                        x: ox, y: oy,
                        w: 30 + rng() * 80,
                        h: 10 + rng() * 30,
                        angle: rng() * Math.PI,
                    });
                }
            }
        }

        // Generate ants
        this.ants = [];
        const antCount = Math.floor((80 + rng() * 120) * (system.qualityScale || 1));
        for (let i = 0; i < antCount; i++) {
            const nest = this.nests[Math.floor(rng() * this.nests.length)];
            this.ants.push({
                x: nest.x + (rng() - 0.5) * nest.radius * 2,
                y: nest.y + (rng() - 0.5) * nest.radius * 2,
                angle: rng() * Math.PI * 2,
                speed: 1.2 + rng() * 0.8,
                hasFood: false,
                nestIndex: this.nests.indexOf(nest),
                wanderStrength: 0.3 + rng() * 0.4,
                pheromoneStrength: 0.8 + rng() * 0.4,
                size: 2 + rng() * 1.5,
            });
        }

        this.tick = 0;
        this.decayRate = 0.995 + rng() * 0.003;
        this.diffuseRate = 0.1 + rng() * 0.15;
    }

    _isObstacle(x, y) {
        for (const obs of this.obstacles) {
            if (obs.type === 'circle') {
                const dx = x - obs.x;
                const dy = y - obs.y;
                if (dx * dx + dy * dy < obs.radius * obs.radius) return true;
            }
        }
        return false;
    }

    _sensePhero(x, y, channel) {
        const gx = Math.floor(x / this.cellSize);
        const gy = Math.floor(y / this.cellSize);
        if (gx < 0 || gx >= this.gridW || gy < 0 || gy >= this.gridH) return 0;
        return this.pheromoneGrid[(gy * this.gridW + gx) * 2 + channel];
    }

    _depositPhero(x, y, channel, amount) {
        const gx = Math.floor(x / this.cellSize);
        const gy = Math.floor(y / this.cellSize);
        if (gx < 0 || gx >= this.gridW || gy < 0 || gy >= this.gridH) return;
        const idx = (gy * this.gridW + gx) * 2 + channel;
        this.pheromoneGrid[idx] = Math.min(1, this.pheromoneGrid[idx] + amount);
    }

    update(system) {
        this.tick++;
        const w = system.width;
        const h = system.height;

        // Click to add food
        if (this.tick % 60 === 0 && this.foodSources.length < 15) {
            // Slowly regenerate depleted food
            for (const food of this.foodSources) {
                if (food.amount < food.maxAmount * 0.1) {
                    food.amount += 2;
                }
            }
        }

        // Update ants
        for (const ant of this.ants) {
            const nest = this.nests[ant.nestIndex];

            // Sense pheromones in three directions (left, center, right)
            const senseAngle = 0.5;
            const senseDist = 10;
            const targetChannel = ant.hasFood ? 0 : 1; // Follow home when carrying, follow food when foraging

            const leftX = ant.x + Math.cos(ant.angle - senseAngle) * senseDist;
            const leftY = ant.y + Math.sin(ant.angle - senseAngle) * senseDist;
            const centerX = ant.x + Math.cos(ant.angle) * senseDist;
            const centerY = ant.y + Math.sin(ant.angle) * senseDist;
            const rightX = ant.x + Math.cos(ant.angle + senseAngle) * senseDist;
            const rightY = ant.y + Math.sin(ant.angle + senseAngle) * senseDist;

            const leftPhero = this._sensePhero(leftX, leftY, targetChannel);
            const centerPhero = this._sensePhero(centerX, centerY, targetChannel);
            const rightPhero = this._sensePhero(rightX, rightY, targetChannel);

            // Steer toward strongest pheromone
            if (centerPhero >= leftPhero && centerPhero >= rightPhero) {
                // Go straight, slight random wander
                ant.angle += (Math.random() - 0.5) * ant.wanderStrength * 0.3;
            } else if (leftPhero > rightPhero) {
                ant.angle -= 0.2;
            } else {
                ant.angle += 0.2;
            }

            // Random wander component
            ant.angle += (Math.random() - 0.5) * ant.wanderStrength;

            // Mouse avoidance/attraction
            const dmx = mouse.x - ant.x;
            const dmy = mouse.y - ant.y;
            const dmDist = Math.sqrt(dmx * dmx + dmy * dmy);
            if (dmDist < 80 && dmDist > 5) {
                // Ants scatter from cursor
                ant.angle = Math.atan2(-dmy, -dmx) + (Math.random() - 0.5) * 0.5;
            }

            // Move
            const nx = ant.x + Math.cos(ant.angle) * ant.speed;
            const ny = ant.y + Math.sin(ant.angle) * ant.speed;

            // Boundary bounce
            if (nx < 5 || nx > w - 5) ant.angle = Math.PI - ant.angle;
            if (ny < 5 || ny > h - 5) ant.angle = -ant.angle;

            // Obstacle avoidance
            if (!this._isObstacle(nx, ny)) {
                ant.x = nx;
                ant.y = ny;
            } else {
                ant.angle += Math.PI * 0.5 + (Math.random() - 0.5);
            }

            // Deposit pheromone
            const depositChannel = ant.hasFood ? 1 : 0; // Deposit food trail when carrying, home trail when foraging
            this._depositPhero(ant.x, ant.y, depositChannel, 0.05 * ant.pheromoneStrength);

            // Check if at food source
            if (!ant.hasFood) {
                for (const food of this.foodSources) {
                    const dx = ant.x - food.x;
                    const dy = ant.y - food.y;
                    if (dx * dx + dy * dy < food.radius * food.radius && food.amount > 0) {
                        ant.hasFood = true;
                        food.amount -= 1;
                        ant.angle += Math.PI; // Turn around
                        break;
                    }
                }
            }

            // Check if at nest
            if (ant.hasFood) {
                const dx = ant.x - nest.x;
                const dy = ant.y - nest.y;
                if (dx * dx + dy * dy < nest.radius * nest.radius) {
                    ant.hasFood = false;
                    nest.population++;
                    ant.angle += Math.PI; // Turn around
                }
            }
        }

        // Pheromone decay and diffusion (every other frame for performance)
        if (this.tick % 2 === 0) {
            const decay = this.decayRate;
            for (let i = 0; i < this.pheromoneGrid.length; i++) {
                this.pheromoneGrid[i] *= decay;
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const w = system.width;
        const h = system.height;
        const qualityScale = system.qualityScale || 1;

        // Draw pheromone trails as glowing pixels
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const step = qualityScale < 0.5 ? 2 : 1;
        for (let gy = 0; gy < this.gridH; gy += step) {
            for (let gx = 0; gx < this.gridW; gx += step) {
                const idx = (gy * this.gridW + gx) * 2;
                const homePhero = this.pheromoneGrid[idx];
                const foodPhero = this.pheromoneGrid[idx + 1];

                if (homePhero > 0.02 || foodPhero > 0.02) {
                    const px = gx * this.cellSize;
                    const py = gy * this.cellSize;

                    if (homePhero > 0.02) {
                        const hc = this.pheromoneColors.home;
                        ctx.fillStyle = `hsla(${hc[0]}, ${hc[1]}%, ${hc[2]}%, ${homePhero * 0.7})`;
                        ctx.fillRect(px, py, this.cellSize * step, this.cellSize * step);
                    }
                    if (foodPhero > 0.02) {
                        const fc = this.pheromoneColors.food;
                        ctx.fillStyle = `hsla(${fc[0]}, ${fc[1]}%, ${fc[2]}%, ${foodPhero * 0.7})`;
                        ctx.fillRect(px, py, this.cellSize * step, this.cellSize * step);
                    }
                }
            }
        }
        ctx.restore();

        // Draw obstacles
        ctx.save();
        ctx.fillStyle = 'rgba(40, 30, 20, 0.6)';
        for (const obs of this.obstacles) {
            if (obs.type === 'circle') {
                ctx.beginPath();
                ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.save();
                ctx.translate(obs.x, obs.y);
                ctx.rotate(obs.angle);
                ctx.fillRect(-obs.w / 2, -obs.h / 2, obs.w, obs.h);
                ctx.restore();
            }
        }
        ctx.restore();

        // Draw food sources
        for (const food of this.foodSources) {
            const ratio = food.amount / food.maxAmount;
            if (ratio <= 0) continue;

            // Glow
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const foodGlow = ctx.createRadialGradient(food.x, food.y, 0, food.x, food.y, food.radius * 2);
            foodGlow.addColorStop(0, `hsla(${food.hue}, 90%, 60%, ${0.3 * ratio})`);
            foodGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = foodGlow;
            ctx.beginPath();
            ctx.arc(food.x, food.y, food.radius * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Food pile (clustered dots)
            ctx.fillStyle = `hsla(${food.hue}, 80%, 50%, ${0.8 * ratio})`;
            const dotCount = Math.ceil(ratio * 8);
            for (let d = 0; d < dotCount; d++) {
                const da = (d / dotCount) * Math.PI * 2 + this.tick * 0.01;
                const dr = food.radius * 0.4 * ratio;
                ctx.beginPath();
                ctx.arc(food.x + Math.cos(da) * dr, food.y + Math.sin(da) * dr, 2 + ratio * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw nests
        for (const nest of this.nests) {
            // Nest entrance
            const nestGrad = ctx.createRadialGradient(nest.x, nest.y, 0, nest.x, nest.y, nest.radius * 1.5);
            nestGrad.addColorStop(0, `hsla(${nest.hue}, 40%, 15%, 0.8)`);
            nestGrad.addColorStop(0.6, `hsla(${nest.hue}, 50%, 25%, 0.4)`);
            nestGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = nestGrad;
            ctx.beginPath();
            ctx.arc(nest.x, nest.y, nest.radius * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Entrance hole
            ctx.fillStyle = `hsla(${nest.hue}, 20%, 8%, 0.9)`;
            ctx.beginPath();
            ctx.arc(nest.x, nest.y, nest.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Population indicator: faint rings
            const rings = Math.min(5, Math.floor(nest.population / 20));
            ctx.strokeStyle = `hsla(${nest.hue}, 50%, 40%, 0.15)`;
            ctx.lineWidth = 1;
            for (let r = 1; r <= rings; r++) {
                ctx.beginPath();
                ctx.arc(nest.x, nest.y, nest.radius + r * 8, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Draw ants
        ctx.save();
        for (const ant of this.ants) {
            const nest = this.nests[ant.nestIndex];
            // Ant body color changes when carrying food
            if (ant.hasFood) {
                ctx.fillStyle = `hsla(60, 80%, 60%, 0.9)`;
            } else {
                ctx.fillStyle = `hsla(${nest.hue}, 20%, 25%, 0.85)`;
            }

            // Draw ant as elongated body
            ctx.save();
            ctx.translate(ant.x, ant.y);
            ctx.rotate(ant.angle);

            // Body segments
            ctx.beginPath();
            ctx.ellipse(0, 0, ant.size * 1.2, ant.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            // Head
            ctx.beginPath();
            ctx.arc(ant.size * 1.4, 0, ant.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            // Abdomen
            ctx.beginPath();
            ctx.ellipse(-ant.size * 1.3, 0, ant.size * 0.8, ant.size * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Legs (simplified)
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 0.5;
            const legPhase = this.tick * 0.3;
            for (let l = -1; l <= 1; l++) {
                const legAngle = Math.sin(legPhase + l * 1.5) * 0.5;
                ctx.beginPath();
                ctx.moveTo(l * ant.size * 0.5, 0);
                ctx.lineTo(l * ant.size * 0.5 + Math.cos(Math.PI / 2 + legAngle) * ant.size * 1.5, Math.sin(Math.PI / 2 + legAngle) * ant.size * 1.5);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(l * ant.size * 0.5, 0);
                ctx.lineTo(l * ant.size * 0.5 + Math.cos(-Math.PI / 2 - legAngle) * ant.size * 1.5, Math.sin(-Math.PI / 2 - legAngle) * ant.size * 1.5);
                ctx.stroke();
            }

            ctx.restore();
        }
        ctx.restore();
    }
}
