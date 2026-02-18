/**
 * @file circuit_growth_architecture.js
 * @description A living circuit board that grows organically. Traces extend
 * from seed points, branch at nodes, and carry pulses of electricity.
 * Dramatically different per seed: growth patterns (manhattan, organic, diagonal),
 * branching rules, color schemes, node density, pulse behavior.
 * Mouse creates new growth origins. Click triggers electromagnetic bursts.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class CircuitGrowthArchitecture extends Architecture {
    constructor() {
        super();
        this.segments = [];
        this.nodes = [];
        this.growthTips = [];
        this.pulses = [];
        this.pulsePool = [];
        this.sparks = [];
        this.sparkPool = [];
        this.growthStyle = 0;
        this.colorScheme = 0;
        this.growthSpeed = 0;
        this.branchChance = 0;
        this.maxSegments = 0;
        this.mouseNode = null;
    }

    init(system) {
        const rng = system.rng;

        this.segments = [];
        this.nodes = [];
        this.growthTips = [];
        this.pulses = [];
        this.pulsePool = [];
        this.sparks = [];
        this.sparkPool = [];

        // Growth style completely changes the visual
        this.growthStyle = Math.floor(rng() * 5);
        // 0 = manhattan (right angles only), 1 = organic (smooth curves),
        // 2 = diagonal (45-degree angles), 3 = radial (from center outward),
        // 4 = neural (neuron-like branching)

        this.colorScheme = Math.floor(rng() * 6);
        // 0 = classic green PCB, 1 = blue tech, 2 = golden circuits,
        // 3 = red neural, 4 = white/cyan frost, 5 = multicolor rainbow

        this.growthSpeed = 1.5 + rng() * 3;
        this.branchChance = 0.01 + rng() * 0.04;
        this.maxSegments = 800 + Math.floor(rng() * 600);

        // Seed initial growth origins
        const originCount = 2 + Math.floor(rng() * 4);
        for (let i = 0; i < originCount; i++) {
            let ox, oy;
            if (this.growthStyle === 3) {
                // Radial: start from center
                ox = system.width / 2 + (rng() - 0.5) * 100;
                oy = system.height / 2 + (rng() - 0.5) * 100;
            } else {
                ox = system.width * (0.1 + rng() * 0.8);
                oy = system.height * (0.1 + rng() * 0.8);
            }

            const node = { x: ox, y: oy, connections: 0, brightness: 1.0, pulsePhase: rng() * Math.PI * 2 };
            this.nodes.push(node);

            // Spawn initial tips in various directions
            const tipCount = 2 + Math.floor(rng() * 3);
            for (let j = 0; j < tipCount; j++) {
                const angle = this.getGrowthAngle(rng);
                this.growthTips.push({
                    x: ox,
                    y: oy,
                    angle,
                    speed: this.growthSpeed * (0.8 + rng() * 0.4),
                    life: 50 + Math.floor(rng() * 150),
                    generation: 0,
                    lastNodeIndex: this.nodes.length - 1,
                    distSinceNode: 0,
                    nodeInterval: 30 + Math.floor(rng() * 40),
                    wobble: rng() * Math.PI * 2,
                    wobbleAmp: this.growthStyle === 1 ? 0.03 + rng() * 0.05 : 0
                });
            }
        }
    }

    getGrowthAngle(rng) {
        switch (this.growthStyle) {
            case 0: // Manhattan - snap to 90 degree angles
                return Math.floor(rng() * 4) * (Math.PI / 2);
            case 1: // Organic - any angle
                return rng() * Math.PI * 2;
            case 2: // Diagonal - snap to 45 degree angles
                return Math.floor(rng() * 8) * (Math.PI / 4);
            case 3: // Radial - outward from center
                return rng() * Math.PI * 2;
            case 4: // Neural - mostly horizontal/vertical with occasional branching
                return (Math.floor(rng() * 4) * (Math.PI / 2)) + (rng() - 0.5) * 0.3;
            default:
                return rng() * Math.PI * 2;
        }
    }

    getTraceColor(generation, alpha) {
        const g = Math.min(generation, 5);
        switch (this.colorScheme) {
            case 0: // Classic green PCB
                return `hsla(${120 + g * 10}, 80%, ${40 + g * 5}%, ${alpha})`;
            case 1: // Blue tech
                return `hsla(${200 + g * 15}, 85%, ${45 + g * 5}%, ${alpha})`;
            case 2: // Golden circuits
                return `hsla(${40 + g * 5}, 90%, ${50 + g * 5}%, ${alpha})`;
            case 3: // Red neural
                return `hsla(${0 + g * 8}, 85%, ${40 + g * 8}%, ${alpha})`;
            case 4: // White/cyan frost
                return `hsla(${180 + g * 10}, ${60 - g * 5}%, ${70 + g * 5}%, ${alpha})`;
            case 5: // Multicolor rainbow
                return `hsla(${(generation * 47) % 360}, 80%, 55%, ${alpha})`;
            default:
                return `hsla(120, 80%, 50%, ${alpha})`;
        }
    }

    getNodeColor(brightness) {
        switch (this.colorScheme) {
            case 0: return `hsla(120, 100%, ${60 + brightness * 30}%, ${0.4 + brightness * 0.6})`;
            case 1: return `hsla(210, 100%, ${55 + brightness * 35}%, ${0.4 + brightness * 0.6})`;
            case 2: return `hsla(45, 100%, ${60 + brightness * 30}%, ${0.4 + brightness * 0.6})`;
            case 3: return `hsla(5, 100%, ${50 + brightness * 40}%, ${0.4 + brightness * 0.6})`;
            case 4: return `hsla(185, 100%, ${75 + brightness * 20}%, ${0.4 + brightness * 0.6})`;
            case 5: return `hsla(${(brightness * 360) % 360}, 90%, 65%, ${0.4 + brightness * 0.6})`;
            default: return `hsla(120, 100%, 70%, ${0.5 + brightness * 0.5})`;
        }
    }

    update(system) {
        const rng = system.rng;
        const mx = mouse.x;
        const my = mouse.y;

        // Grow circuit traces
        for (let i = this.growthTips.length - 1; i >= 0; i--) {
            const tip = this.growthTips[i];
            tip.life--;

            if (tip.life <= 0 || this.segments.length >= this.maxSegments) {
                // Swap and pop
                this.growthTips[i] = this.growthTips[this.growthTips.length - 1];
                this.growthTips.pop();
                continue;
            }

            // Organic wobble for organic style
            if (tip.wobbleAmp > 0) {
                tip.wobble += 0.1;
                tip.angle += Math.sin(tip.wobble) * tip.wobbleAmp;
            }

            const newX = tip.x + Math.cos(tip.angle) * tip.speed * system.speedMultiplier;
            const newY = tip.y + Math.sin(tip.angle) * tip.speed * system.speedMultiplier;

            // Bounds check
            if (newX < -10 || newX > system.width + 10 || newY < -10 || newY > system.height + 10) {
                this.growthTips[i] = this.growthTips[this.growthTips.length - 1];
                this.growthTips.pop();
                continue;
            }

            // Add segment
            this.segments.push({
                x1: tip.x, y1: tip.y,
                x2: newX, y2: newY,
                generation: tip.generation,
                age: 0,
                brightness: 0.5
            });

            tip.x = newX;
            tip.y = newY;
            tip.distSinceNode += tip.speed;

            // Create node at intervals
            if (tip.distSinceNode >= tip.nodeInterval) {
                tip.distSinceNode = 0;
                const node = {
                    x: newX, y: newY,
                    connections: 1,
                    brightness: 0.8,
                    pulsePhase: rng() * Math.PI * 2
                };
                this.nodes.push(node);
                tip.lastNodeIndex = this.nodes.length - 1;

                // Chance to branch
                if (rng() < this.branchChance + tip.generation * 0.005 && this.growthTips.length < 1000) {
                    const branchCount = rng() < 0.3 ? 2 : 1;
                    for (let b = 0; b < branchCount; b++) {
                        if (this.growthTips.length >= 1000) break;
                        const branchAngle = tip.angle + (rng() > 0.5 ? 1 : -1) * (Math.PI / 4 + rng() * Math.PI / 4);
                        const nextInterval = Math.max(5, tip.nodeInterval * (0.8 + rng() * 0.4));
                        this.growthTips.push({
                            x: newX,
                            y: newY,
                            angle: this.growthStyle === 0
                                ? Math.floor(branchAngle / (Math.PI / 2)) * (Math.PI / 2)
                                : branchAngle,
                            speed: tip.speed * (0.7 + rng() * 0.3),
                            life: tip.life * (0.4 + rng() * 0.3),
                            generation: tip.generation + 1,
                            lastNodeIndex: this.nodes.length - 1,
                            distSinceNode: 0,
                            nodeInterval: nextInterval,
                            wobble: rng() * Math.PI * 2,
                            wobbleAmp: tip.wobbleAmp
                        });
                        node.connections++;
                    }

                    // Chance to change direction at node
                    if (rng() < 0.5) {
                        tip.angle = this.getGrowthAngle(rng);
                    }
                }
            }
        }

        // Mouse proximity creates new growth
        if (this.segments.length < this.maxSegments && rng() < 0.03) {
            // Grow toward mouse occasionally
            this.growthTips.push({
                x: mx + (rng() - 0.5) * 50,
                y: my + (rng() - 0.5) * 50,
                angle: this.getGrowthAngle(rng),
                speed: this.growthSpeed * (0.8 + rng() * 0.4),
                life: 30 + Math.floor(rng() * 60),
                generation: 0,
                lastNodeIndex: -1,
                distSinceNode: 0,
                nodeInterval: 25 + Math.floor(rng() * 30),
                wobble: rng() * Math.PI * 2,
                wobbleAmp: this.growthStyle === 1 ? 0.03 + rng() * 0.05 : 0
            });
        }

        // Send pulses along segments from shockwaves
        system.shockwaves.forEach(sw => {
            this.nodes.forEach(node => {
                const dx = node.x - sw.x;
                const dy = node.y - sw.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (Math.abs(dist - sw.radius) < 40) {
                    node.brightness = 1.0;
                    // Spawn pulse
                    if (rng() < 0.3) {
                        let pulse = this.pulsePool.length > 0 ? this.pulsePool.pop() : {};
                        pulse.x = node.x;
                        pulse.y = node.y;
                        pulse.radius = 0;
                        pulse.maxRadius = 80 + rng() * 80;
                        pulse.speed = 2 + rng() * 3;
                        pulse.alpha = 0.8;
                        this.pulses.push(pulse);
                    }
                }
            });
        });

        // Animate node brightness
        const tick = system.tick;
        this.nodes.forEach(node => {
            // Gentle pulse
            const pulse = Math.sin(tick * 0.03 + node.pulsePhase) * 0.15 + 0.15;
            node.brightness = Math.max(pulse, node.brightness * 0.98);

            // Mouse proximity brightens nodes
            const dx = node.x - mx;
            const dy = node.y - my;
            const distSq = dx * dx + dy * dy;
            if (distSq < 40000) {
                node.brightness = Math.min(1, node.brightness + 0.05);
            }
        });

        // Animate segment brightness
        this.segments.forEach(seg => {
            seg.age++;
            seg.brightness = Math.max(0.15, seg.brightness * 0.999);
        });

        // Update pulses
        for (let i = this.pulses.length - 1; i >= 0; i--) {
            const p = this.pulses[i];
            p.radius += p.speed;
            p.alpha = 1 - (p.radius / p.maxRadius);
            if (p.alpha <= 0) {
                this.pulsePool.push(this.pulses[i]);
                this.pulses[i] = this.pulses[this.pulses.length - 1];
                this.pulses.pop();
            }
        }

        // Periodic electrical sparks between nearby nodes
        if (rng() < 0.02 && this.nodes.length > 1) {
            const n1 = this.nodes[Math.floor(rng() * this.nodes.length)];
            let closestDist = Infinity;
            let closest = null;
            for (let i = 0; i < Math.min(this.nodes.length, 20); i++) {
                const n2 = this.nodes[Math.floor(rng() * this.nodes.length)];
                if (n2 === n1) continue;
                const dx = n1.x - n2.x;
                const dy = n1.y - n2.y;
                const dist = dx * dx + dy * dy;
                if (dist < closestDist && dist > 100) {
                    closestDist = dist;
                    closest = n2;
                }
            }
            if (closest && closestDist < 40000) {
                let spark = this.sparkPool.length > 0 ? this.sparkPool.pop() : {};
                spark.x1 = n1.x;
                spark.y1 = n1.y;
                spark.x2 = closest.x;
                spark.y2 = closest.y;
                spark.life = 1.0;
                spark.decay = 0.05 + rng() * 0.05;
                spark.jitter = 10 + rng() * 20;
                this.sparks.push(spark);
                n1.brightness = 1.0;
                closest.brightness = 1.0;
            }
        }

        // Update sparks
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            this.sparks[i].life -= this.sparks[i].decay;
            if (this.sparks[i].life <= 0) {
                this.sparkPool.push(this.sparks[i]);
                this.sparks[i] = this.sparks[this.sparks.length - 1];
                this.sparks.pop();
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;

        // Draw segments (traces)
        ctx.lineCap = 'round';
        // Batch segments by generation for fewer style changes
        const maxGen = 6;
        for (let gen = 0; gen <= maxGen; gen++) {
            const alpha = 0.15 + (1 - gen / maxGen) * 0.15;
            ctx.strokeStyle = this.getTraceColor(gen, alpha);
            ctx.lineWidth = Math.max(1, 2.5 - gen * 0.3);
            ctx.beginPath();
            for (let i = 0; i < this.segments.length; i++) {
                const seg = this.segments[i];
                if (Math.min(seg.generation, maxGen) !== gen) continue;
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
            }
            ctx.stroke();
        }

        // Draw segments above maxGen
        ctx.strokeStyle = this.getTraceColor(maxGen, 0.1);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];
            if (seg.generation <= maxGen) continue;
            ctx.moveTo(seg.x1, seg.y1);
            ctx.lineTo(seg.x2, seg.y2);
        }
        ctx.stroke();

        // Draw growing tips with glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        this.growthTips.forEach(tip => {
            const grad = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 15);
            grad.addColorStop(0, this.getTraceColor(tip.generation, 0.8));
            grad.addColorStop(0.5, this.getTraceColor(tip.generation, 0.3));
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, 15, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw nodes with glow
        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            if (node.brightness < 0.05) continue;

            const bright = node.brightness;
            const size = 3 + node.connections * 0.5;

            // Glow
            if (bright > 0.2) {
                const glowR = size * (3 + bright * 4);
                const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowR);
                grad.addColorStop(0, this.getNodeColor(bright));
                grad.addColorStop(0.4, this.getNodeColor(bright * 0.3));
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
                ctx.fill();
            }

            // Core
            ctx.fillStyle = this.getNodeColor(bright);
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw electrical sparks (jagged lightning between nodes)
        for (let i = 0; i < this.sparks.length; i++) {
            const spark = this.sparks[i];
            ctx.strokeStyle = this.getNodeColor(spark.life);
            ctx.lineWidth = 1.5 * spark.life;
            ctx.beginPath();

            const dx = spark.x2 - spark.x1;
            const dy = spark.y2 - spark.y1;
            const steps = 6;
            let px = spark.x1;
            let py = spark.y1;
            ctx.moveTo(px, py);

            for (let s = 1; s <= steps; s++) {
                const t = s / steps;
                let nx = spark.x1 + dx * t;
                let ny = spark.y1 + dy * t;
                if (s < steps) {
                    nx += (Math.random() - 0.5) * spark.jitter * spark.life;
                    ny += (Math.random() - 0.5) * spark.jitter * spark.life;
                }
                ctx.lineTo(nx, ny);
                px = nx;
                py = ny;
            }
            ctx.stroke();
        }

        // Draw pulses
        for (let i = 0; i < this.pulses.length; i++) {
            const p = this.pulses[i];
            ctx.strokeStyle = this.getNodeColor(p.alpha * 0.5);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }
}
