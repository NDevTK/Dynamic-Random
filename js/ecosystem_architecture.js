/**
 * @file ecosystem_architecture.js
 * @description A living ecosystem of tiny creatures with emergent predator/prey
 * behavior. Seeds dramatically change species types, movement patterns, food chain
 * dynamics, colors, and environmental rules. Cursor acts as a "god hand" —
 * left-click spawns food bursts that attract prey, right-click area creates
 * a danger zone that scatters creatures. The ecosystem self-balances over time.
 */

import { Architecture } from './background_architectures.js';
import { mouse, isLeftMouseDown, isRightMouseDown } from './state.js';

export class EcosystemArchitecture extends Architecture {
    constructor() {
        super();
        this.creatures = [];
        this.foodParticles = [];
        this.foodPool = [];
        this.deathParticles = [];
        this.deathPool = [];
        this.biome = 0;
        this.speciesConfig = [];
        this.environmentHue = 0;
        this.foodSpawnRate = 0;
        this.maxCreatures = 200;
    }

    init(system) {
        const rng = system.rng;

        // Biome determines overall aesthetic
        this.biome = Math.floor(rng() * 6);
        // 0 = deep ocean, 1 = forest canopy, 2 = alien desert, 3 = microscopic
        // 4 = neon reef, 5 = volcanic vents

        this.environmentHue = rng() * 360;
        this.foodSpawnRate = 20 + Math.floor(rng() * 40);
        this.maxCreatures = Math.floor(150 + rng() * 150);

        // Species configuration — 3-5 species per seed with different roles
        const speciesCount = 3 + Math.floor(rng() * 3);
        this.speciesConfig = [];

        const roles = ['prey', 'predator', 'scavenger', 'parasite', 'herbivore'];
        const shapes = ['circle', 'triangle', 'diamond', 'worm', 'star'];
        const movements = ['wander', 'school', 'zigzag', 'orbit', 'dash'];

        for (let i = 0; i < speciesCount; i++) {
            const role = roles[i % roles.length];
            const hue = (this.environmentHue + i * (360 / speciesCount) + rng() * 30) % 360;

            this.speciesConfig.push({
                id: i,
                role,
                shape: shapes[Math.floor(rng() * shapes.length)],
                movement: movements[Math.floor(rng() * movements.length)],
                hue,
                saturation: 60 + rng() * 30,
                size: role === 'predator' ? 6 + rng() * 6 : 2 + rng() * 5,
                speed: role === 'predator' ? 1.5 + rng() * 2 : 0.5 + rng() * 2,
                turnRate: 0.02 + rng() * 0.08,
                senseRadius: 60 + rng() * 120,
                preySpecies: role === 'predator' ? [Math.floor(rng() * speciesCount)] : [],
                fleeFrom: role === 'prey' ? [] : [], // filled below
                reproduction: 0.001 + rng() * 0.003,
                lifespan: 500 + Math.floor(rng() * 1500),
                tailLength: Math.floor(rng() * 8),
                glowIntensity: rng() * 0.5
            });
        }

        // Set up flee relationships — prey flees from predators
        for (const sp of this.speciesConfig) {
            if (sp.role === 'predator') {
                for (const prey of sp.preySpecies) {
                    if (this.speciesConfig[prey]) {
                        this.speciesConfig[prey].fleeFrom.push(sp.id);
                    }
                }
            }
        }

        // Spawn initial population
        this.creatures = [];
        for (let i = 0; i < this.maxCreatures; i++) {
            this._spawnCreature(system, rng);
        }

        this.foodParticles = [];
        this.deathParticles = [];
    }

    _spawnCreature(system, rng, x, y) {
        const species = this.speciesConfig[Math.floor(rng() * this.speciesConfig.length)];
        this.creatures.push({
            x: x !== undefined ? x : rng() * system.width,
            y: y !== undefined ? y : rng() * system.height,
            vx: (rng() - 0.5) * species.speed,
            vy: (rng() - 0.5) * species.speed,
            angle: rng() * Math.PI * 2,
            species: species.id,
            energy: 50 + rng() * 50,
            age: 0,
            maxAge: species.lifespan * (0.8 + rng() * 0.4),
            size: species.size * (0.8 + rng() * 0.4),
            trail: [],
            phase: rng() * Math.PI * 2,
            wiggle: rng() * Math.PI * 2,
            schoolAngle: rng() * Math.PI * 2
        });
    }

    _spawnFood(x, y, rng) {
        let f = this.foodPool.length > 0 ? this.foodPool.pop() : {};
        f.x = x;
        f.y = y;
        f.size = 2 + Math.random() * 3;
        f.life = 300 + Math.floor(Math.random() * 200);
        f.hue = (this.environmentHue + 60 + Math.random() * 60) % 360;
        f.pulse = Math.random() * Math.PI * 2;
        this.foodParticles.push(f);
    }

    _spawnDeathEffect(x, y, hue) {
        for (let i = 0; i < 5; i++) {
            let d = this.deathPool.length > 0 ? this.deathPool.pop() : {};
            d.x = x;
            d.y = y;
            d.vx = (Math.random() - 0.5) * 3;
            d.vy = (Math.random() - 0.5) * 3;
            d.life = 30;
            d.maxLife = 30;
            d.hue = hue;
            d.size = 1 + Math.random() * 2;
            this.deathParticles.push(d);
        }
    }

    update(system) {
        const tick = system.tick;
        const rng = system.rng;
        const w = system.width;
        const h = system.height;
        const qualityScale = system.qualityScale || 1;

        // Natural food spawning
        if (tick % this.foodSpawnRate === 0) {
            this._spawnFood(rng() * w, rng() * h, rng);
        }

        // Cursor food burst
        if (isLeftMouseDown && tick % 8 === 0) {
            for (let i = 0; i < 5; i++) {
                this._spawnFood(
                    mouse.x + (rng() - 0.5) * 80,
                    mouse.y + (rng() - 0.5) * 80,
                    rng
                );
            }
        }

        // Update food
        for (let i = this.foodParticles.length - 1; i >= 0; i--) {
            const f = this.foodParticles[i];
            f.life--;
            f.pulse += 0.05;
            if (f.life <= 0) {
                this.foodPool.push(f);
                this.foodParticles[i] = this.foodParticles[this.foodParticles.length - 1];
                this.foodParticles.pop();
            }
        }

        // Update death particles
        for (let i = this.deathParticles.length - 1; i >= 0; i--) {
            const d = this.deathParticles[i];
            d.x += d.vx;
            d.y += d.vy;
            d.vx *= 0.95;
            d.vy *= 0.95;
            d.life--;
            if (d.life <= 0) {
                this.deathPool.push(d);
                this.deathParticles[i] = this.deathParticles[this.deathParticles.length - 1];
                this.deathParticles.pop();
            }
        }

        // Update creatures
        const creatureCount = this.creatures.length;
        for (let i = creatureCount - 1; i >= 0; i--) {
            const c = this.creatures[i];
            const sp = this.speciesConfig[c.species];
            if (!sp) continue;

            c.age++;
            c.energy -= 0.05;
            c.phase += 0.05;
            c.wiggle += 0.1;

            // Steering behaviors
            let steerX = 0, steerY = 0;

            // Movement pattern
            switch (sp.movement) {
                case 'wander':
                    c.angle += (rng() - 0.5) * sp.turnRate * 4;
                    steerX += Math.cos(c.angle) * sp.speed * 0.3;
                    steerY += Math.sin(c.angle) * sp.speed * 0.3;
                    break;
                case 'school': {
                    // Align with nearby same-species
                    let avgAngle = 0, neighbors = 0;
                    for (let j = Math.max(0, i - 20); j < Math.min(creatureCount, i + 20); j++) {
                        if (j === i) continue;
                        const other = this.creatures[j];
                        if (other.species !== c.species) continue;
                        const dx = other.x - c.x;
                        const dy = other.y - c.y;
                        if (dx * dx + dy * dy < sp.senseRadius * sp.senseRadius) {
                            avgAngle += other.angle;
                            neighbors++;
                        }
                    }
                    if (neighbors > 0) {
                        c.schoolAngle += (avgAngle / neighbors - c.schoolAngle) * 0.05;
                    }
                    steerX += Math.cos(c.schoolAngle) * sp.speed * 0.4;
                    steerY += Math.sin(c.schoolAngle) * sp.speed * 0.4;
                    break;
                }
                case 'zigzag':
                    steerX += Math.cos(c.angle + Math.sin(c.phase * 2) * 1.5) * sp.speed * 0.4;
                    steerY += Math.sin(c.angle + Math.sin(c.phase * 2) * 1.5) * sp.speed * 0.4;
                    c.angle += sp.turnRate;
                    break;
                case 'orbit':
                    c.angle += sp.turnRate;
                    steerX += Math.cos(c.angle) * sp.speed * 0.5;
                    steerY += Math.sin(c.angle) * sp.speed * 0.5;
                    break;
                case 'dash':
                    if (Math.sin(c.phase * 0.3) > 0.8) {
                        steerX += Math.cos(c.angle) * sp.speed * 2;
                        steerY += Math.sin(c.angle) * sp.speed * 2;
                    } else {
                        c.angle += (rng() - 0.5) * sp.turnRate * 3;
                    }
                    break;
            }

            // Seek food (prey/herbivore/scavenger)
            if (sp.role !== 'predator') {
                let nearestFood = null, nearestDist = sp.senseRadius;
                for (const f of this.foodParticles) {
                    const dx = f.x - c.x;
                    const dy = f.y - c.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestFood = f;
                    }
                }
                if (nearestFood) {
                    const dx = nearestFood.x - c.x;
                    const dy = nearestFood.y - c.y;
                    steerX += (dx / nearestDist) * sp.speed * 0.5;
                    steerY += (dy / nearestDist) * sp.speed * 0.5;

                    // Eat food
                    if (nearestDist < c.size + nearestFood.size) {
                        c.energy = Math.min(100, c.energy + 20);
                        nearestFood.life = 0;
                    }
                }
            }

            // Hunt prey (predators)
            if (sp.preySpecies.length > 0) {
                let nearestPrey = null, nearestPreyIdx = -1, nearestDist = sp.senseRadius;
                for (let j = 0; j < creatureCount; j++) {
                    if (j === i) continue;
                    const other = this.creatures[j];
                    if (!sp.preySpecies.includes(other.species)) continue;
                    const dx = other.x - c.x;
                    const dy = other.y - c.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestPrey = other;
                        nearestPreyIdx = j;
                    }
                }
                if (nearestPrey) {
                    const dx = nearestPrey.x - c.x;
                    const dy = nearestPrey.y - c.y;
                    steerX += (dx / nearestDist) * sp.speed * 0.7;
                    steerY += (dy / nearestDist) * sp.speed * 0.7;

                    // Catch prey
                    if (nearestDist < c.size + nearestPrey.size) {
                        c.energy = Math.min(100, c.energy + 30);
                        this._spawnDeathEffect(nearestPrey.x, nearestPrey.y,
                            this.speciesConfig[nearestPrey.species]?.hue || 0);
                        // Remove prey (swap-remove, no indexOf needed)
                        if (nearestPreyIdx >= 0) {
                            this.creatures[nearestPreyIdx] = this.creatures[this.creatures.length - 1];
                            this.creatures.pop();
                            creatureCount--;
                            if (nearestPreyIdx < i) i--;
                        }
                    }
                }
            }

            // Flee from predators
            for (const fleeId of sp.fleeFrom) {
                for (let j = Math.max(0, i - 30); j < Math.min(this.creatures.length, i + 30); j++) {
                    if (j === i) continue;
                    const other = this.creatures[j];
                    if (other.species !== fleeId) continue;
                    const dx = c.x - other.x;
                    const dy = c.y - other.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < sp.senseRadius * 0.8 && dist > 0) {
                        steerX += (dx / dist) * sp.speed * 1.2;
                        steerY += (dy / dist) * sp.speed * 1.2;
                    }
                }
            }

            // Right-click danger zone
            if (isRightMouseDown) {
                const dx = c.x - mouse.x;
                const dy = c.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200 && dist > 0) {
                    steerX += (dx / dist) * sp.speed * 3;
                    steerY += (dy / dist) * sp.speed * 3;
                }
            }

            // Apply steering
            c.vx += steerX * 0.1;
            c.vy += steerY * 0.1;
            const speed = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
            if (speed > sp.speed * 2) {
                c.vx = (c.vx / speed) * sp.speed * 2;
                c.vy = (c.vy / speed) * sp.speed * 2;
            }
            c.vx *= 0.98;
            c.vy *= 0.98;
            c.x += c.vx;
            c.y += c.vy;
            c.angle = Math.atan2(c.vy, c.vx);

            // Trail
            if (sp.tailLength > 0) {
                c.trail.push({ x: c.x, y: c.y });
                while (c.trail.length > sp.tailLength) c.trail.shift();
            }

            // Screen wrapping
            if (c.x < -20) c.x = w + 20;
            if (c.x > w + 20) c.x = -20;
            if (c.y < -20) c.y = h + 20;
            if (c.y > h + 20) c.y = -20;

            // Reproduction
            if (c.energy > 80 && this.creatures.length < this.maxCreatures && rng() < sp.reproduction) {
                c.energy -= 30;
                this._spawnCreature(system, rng, c.x + (rng() - 0.5) * 20, c.y + (rng() - 0.5) * 20);
            }

            // Death
            if (c.energy <= 0 || c.age > c.maxAge) {
                this._spawnDeathEffect(c.x, c.y, sp.hue);
                // Scavengers create food on death
                if (sp.role === 'scavenger' || rng() < 0.3) {
                    this._spawnFood(c.x, c.y, rng);
                }
                this.creatures[i] = this.creatures[this.creatures.length - 1];
                this.creatures.pop();
            }
        }

        // Auto-respawn if population drops too low
        if (this.creatures.length < this.maxCreatures * 0.3 && tick % 10 === 0) {
            this._spawnCreature(system, rng);
        }

        // Cap food
        while (this.foodParticles.length > 200) {
            this.foodPool.push(this.foodParticles.shift());
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const qualityScale = system.qualityScale || 1;

        // Draw food particles
        for (const f of this.foodParticles) {
            const pulse = Math.sin(f.pulse) * 0.3 + 0.7;
            ctx.globalAlpha = pulse * 0.8;
            ctx.fillStyle = `hsl(${f.hue}, 70%, 60%)`;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.size * pulse, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Draw death particles
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const d of this.deathParticles) {
            const alpha = d.life / d.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `hsl(${d.hue}, 80%, 70%)`;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Draw creatures
        for (const c of this.creatures) {
            const sp = this.speciesConfig[c.species];
            if (!sp) continue;

            const energyRatio = c.energy / 100;
            const lightness = 40 + energyRatio * 25;

            // Trail
            if (c.trail.length > 1 && qualityScale > 0.4) {
                ctx.strokeStyle = `hsla(${sp.hue}, ${sp.saturation}%, ${lightness}%, 0.15)`;
                ctx.lineWidth = c.size * 0.5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(c.trail[0].x, c.trail[0].y);
                for (let j = 1; j < c.trail.length; j++) {
                    ctx.lineTo(c.trail[j].x, c.trail[j].y);
                }
                ctx.stroke();
            }

            // Glow
            if (sp.glowIntensity > 0.2 && qualityScale > 0.5) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const glowGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size * 3);
                glowGrad.addColorStop(0, `hsla(${sp.hue}, ${sp.saturation}%, ${lightness}%, ${sp.glowIntensity * 0.3})`);
                glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = glowGrad;
                ctx.fillRect(c.x - c.size * 3, c.y - c.size * 3, c.size * 6, c.size * 6);
                ctx.restore();
            }

            // Body
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.angle);

            ctx.fillStyle = `hsl(${sp.hue}, ${sp.saturation}%, ${lightness}%)`;

            ctx.beginPath();
            switch (sp.shape) {
                case 'circle':
                    ctx.arc(0, 0, c.size, 0, Math.PI * 2);
                    break;
                case 'triangle':
                    ctx.moveTo(c.size * 1.2, 0);
                    ctx.lineTo(-c.size * 0.7, -c.size * 0.7);
                    ctx.lineTo(-c.size * 0.7, c.size * 0.7);
                    ctx.closePath();
                    break;
                case 'diamond':
                    ctx.moveTo(c.size * 1.2, 0);
                    ctx.lineTo(0, -c.size * 0.6);
                    ctx.lineTo(-c.size, 0);
                    ctx.lineTo(0, c.size * 0.6);
                    ctx.closePath();
                    break;
                case 'worm': {
                    const wiggle = Math.sin(c.wiggle) * 2;
                    ctx.moveTo(c.size, wiggle);
                    ctx.quadraticCurveTo(0, -wiggle * 2, -c.size, wiggle);
                    ctx.quadraticCurveTo(0, wiggle * 2, c.size, wiggle);
                    break;
                }
                case 'star':
                    for (let s = 0; s < 5; s++) {
                        const outerAngle = (s * Math.PI * 2) / 5 - Math.PI / 2;
                        const innerAngle = outerAngle + Math.PI / 5;
                        const ox = Math.cos(outerAngle) * c.size;
                        const oy = Math.sin(outerAngle) * c.size;
                        const ix = Math.cos(innerAngle) * c.size * 0.4;
                        const iy = Math.sin(innerAngle) * c.size * 0.4;
                        s === 0 ? ctx.moveTo(ox, oy) : ctx.lineTo(ox, oy);
                        ctx.lineTo(ix, iy);
                    }
                    ctx.closePath();
                    break;
            }
            ctx.fill();

            // Eye for predators
            if (sp.role === 'predator') {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(c.size * 0.4, -c.size * 0.2, c.size * 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(c.size * 0.5, -c.size * 0.2, c.size * 0.1, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        // Cursor indicator
        if (isRightMouseDown) {
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.strokeStyle = `hsl(0, 80%, 50%)`;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 10]);
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 200, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }
}
