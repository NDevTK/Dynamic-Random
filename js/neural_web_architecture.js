/**
 * @file neural_web_architecture.js
 * @description Living neural network visualization. Neurons pulse when receiving
 * signals, connections carry visible impulses between nodes, new connections grow
 * toward areas of activity. Cursor proximity triggers firing cascades. The seed
 * controls topology, growth rate, signal speed, and visual style.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

const TAU = Math.PI * 2;

export class NeuralWebArchitecture extends Architecture {
    constructor() {
        super();
        this.neurons = [];
        this.connections = [];
        this.signals = [];
        this.signalPool = [];
        this.hueBase = 0;
        this.growthRate = 0;
        this.signalSpeed = 0;
        this.decayRate = 0;
        this.maxNeurons = 0;
        this.maxConnections = 0;
        this.connectionDist = 0;
        this.spontaneousRate = 0;
        this.visualStyle = 0;
        this.pulseColor = '';
        this.restColor = '';
        this.connectionColor = '';
        this.growTimer = 0;
        this.burstCooldown = 0;
    }

    init(system) {
        const rng = system.rng;
        const w = system.width;
        const h = system.height;

        this.hueBase = rng() * 360;
        this.visualStyle = Math.floor(rng() * 4);
        // 0 = cool/cyan neural, 1 = warm synaptic, 2 = electric, 3 = bioluminescent

        const hue = this.hueBase;
        if (this.visualStyle === 0) {
            this.pulseColor = [180 + rng() * 40, 90, 65];
            this.restColor = [200 + rng() * 30, 40, 25];
            this.connectionColor = [190, 50, 35];
        } else if (this.visualStyle === 1) {
            this.pulseColor = [30 + rng() * 20, 95, 60];
            this.restColor = [20 + rng() * 20, 50, 20];
            this.connectionColor = [25, 40, 30];
        } else if (this.visualStyle === 2) {
            this.pulseColor = [50 + rng() * 20, 100, 70];
            this.restColor = [60, 30, 20];
            this.connectionColor = [55, 60, 40];
        } else {
            this.pulseColor = [120 + rng() * 60, 80, 55];
            this.restColor = [140 + rng() * 40, 30, 15];
            this.connectionColor = [130, 40, 25];
        }

        this.signalSpeed = 2 + rng() * 4;
        this.decayRate = 0.005 + rng() * 0.015;
        this.growthRate = 200 + Math.floor(rng() * 300);
        this.maxNeurons = 60 + Math.floor(rng() * 40);
        this.maxConnections = 120 + Math.floor(rng() * 80);
        this.connectionDist = 100 + rng() * 120;
        this.spontaneousRate = 0.002 + rng() * 0.008;

        // Initial neuron placement
        const initCount = 20 + Math.floor(rng() * 20);
        const topologies = [
            // Random scatter
            () => ({ x: rng() * w, y: rng() * h }),
            // Grid with jitter
            () => {
                const cols = Math.ceil(Math.sqrt(initCount));
                const i = this.neurons.length;
                return {
                    x: ((i % cols) + 0.5) / cols * w + (rng() - 0.5) * 60,
                    y: (Math.floor(i / cols) + 0.5) / cols * h + (rng() - 0.5) * 60
                };
            },
            // Clustered
            () => {
                const cx = (Math.floor(rng() * 3) + 0.5) / 3 * w;
                const cy = (Math.floor(rng() * 2) + 0.5) / 2 * h;
                return {
                    x: cx + (rng() - 0.5) * 200,
                    y: cy + (rng() - 0.5) * 150
                };
            }
        ];
        const topology = topologies[Math.floor(rng() * topologies.length)];

        this.neurons = [];
        for (let i = 0; i < initCount; i++) {
            const pos = topology();
            this.neurons.push(this.createNeuron(pos.x, pos.y, rng));
        }

        // Build initial connections (connect nearby neurons)
        this.connections = [];
        for (let i = 0; i < this.neurons.length; i++) {
            const ni = this.neurons[i];
            for (let j = i + 1; j < this.neurons.length; j++) {
                const nj = this.neurons[j];
                const dist = Math.sqrt((ni.x - nj.x) ** 2 + (ni.y - nj.y) ** 2);
                if (dist < this.connectionDist && rng() > 0.4) {
                    this.connections.push(this.createConnection(i, j, dist, rng));
                }
            }
        }
    }

    createNeuron(x, y, rng) {
        return {
            x, y,
            activation: 0,        // 0 = resting, 1 = fully firing
            threshold: 0.3 + rng() * 0.4,
            refractoryTime: 0,    // cooldown after firing
            size: 3 + rng() * 4,
            pulsePhase: rng() * TAU,
            type: rng() > 0.8 ? 'inhibitory' : 'excitatory',
            accumulatedInput: 0
        };
    }

    createConnection(from, to, dist, rng) {
        return {
            from, to,
            weight: 0.2 + rng() * 0.6,
            width: 0.5 + rng() * 1.5,
            length: dist,
            activity: 0 // recent signal activity (for glow)
        };
    }

    update(system) {
        const rng = system.rng;
        const w = system.width;
        const h = system.height;
        const mx = mouse.x;
        const my = mouse.y;
        const isWarp = system.speedMultiplier > 2;
        const isGravity = system.isGravityWell;

        // --- Signal propagation ---
        for (let i = this.signals.length - 1; i >= 0; i--) {
            const sig = this.signals[i];
            sig.progress += this.signalSpeed / sig.length * (isWarp ? 3 : 1);

            if (sig.progress >= 1) {
                // Signal arrived at target neuron
                const target = this.neurons[sig.to];
                if (target) {
                    const sourceType = this.neurons[sig.from]?.type;
                    const delta = sig.strength * (sourceType === 'inhibitory' ? -0.5 : 1);
                    target.accumulatedInput += delta;
                }
                // Recycle signal
                this.signalPool.push(sig);
                this.signals[i] = this.signals[this.signals.length - 1];
                this.signals.pop();
            }
        }

        // --- Neuron dynamics ---
        for (let i = 0; i < this.neurons.length; i++) {
            const n = this.neurons[i];

            // Decay activation
            n.activation = Math.max(0, n.activation - this.decayRate * (isWarp ? 3 : 1));

            // Refractory period
            if (n.refractoryTime > 0) {
                n.refractoryTime--;
                n.accumulatedInput = 0;
                continue;
            }

            // Cursor proximity excitation
            const cdx = mx - n.x;
            const cdy = my - n.y;
            const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
            if (cdist < 120) {
                n.accumulatedInput += (1 - cdist / 120) * 0.05 * (isGravity ? 3 : 1);
            }

            // Spontaneous firing
            if (rng() < this.spontaneousRate) {
                n.accumulatedInput += 0.4;
            }

            // Fire if threshold exceeded
            if (n.accumulatedInput >= n.threshold) {
                n.activation = 1;
                n.refractoryTime = 15 + Math.floor(rng() * 10);
                n.accumulatedInput = 0;

                // Send signals along all outgoing connections
                for (const conn of this.connections) {
                    if (conn.from === i || conn.to === i) {
                        const targetIdx = conn.from === i ? conn.to : conn.from;
                        let sig = this.signalPool.length > 0 ? this.signalPool.pop() : {};
                        sig.from = i;
                        sig.to = targetIdx;
                        sig.progress = 0;
                        sig.strength = conn.weight;
                        sig.length = conn.length;
                        this.signals.push(sig);
                        conn.activity = 1;
                    }
                }
            } else {
                // Leak accumulated input
                n.accumulatedInput *= 0.95;
            }
        }

        // --- Connection activity decay ---
        for (const conn of this.connections) {
            conn.activity *= 0.95;
        }

        // --- Growth: add new neurons and connections ---
        this.growTimer++;
        if (this.growTimer >= this.growthRate && this.neurons.length < this.maxNeurons) {
            this.growTimer = 0;
            // Find most active area
            let bestX = rng() * w, bestY = rng() * h;
            let bestActivity = 0;
            for (const n of this.neurons) {
                if (n.activation > bestActivity) {
                    bestActivity = n.activation;
                    bestX = n.x + (rng() - 0.5) * 60;
                    bestY = n.y + (rng() - 0.5) * 60;
                }
            }
            // Clamp to screen
            bestX = Math.max(20, Math.min(w - 20, bestX));
            bestY = Math.max(20, Math.min(h - 20, bestY));

            const newIdx = this.neurons.length;
            this.neurons.push(this.createNeuron(bestX, bestY, rng));

            // Connect to nearby neurons
            for (let j = 0; j < this.neurons.length - 1; j++) {
                const nj = this.neurons[j];
                const dist = Math.sqrt((bestX - nj.x) ** 2 + (bestY - nj.y) ** 2);
                if (dist < this.connectionDist && this.connections.length < this.maxConnections && rng() > 0.5) {
                    this.connections.push(this.createConnection(newIdx, j, dist, rng));
                }
            }
        }

        // --- Gravity well: pull neurons toward cursor ---
        if (isGravity) {
            for (const n of this.neurons) {
                const dx = mx - n.x;
                const dy = my - n.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 20 && dist < 300) {
                    n.x += (dx / dist) * 0.5;
                    n.y += (dy / dist) * 0.5;
                }
            }
        }

        // --- Warp: burst fire all neurons ---
        if (isWarp && this.burstCooldown <= 0) {
            for (const n of this.neurons) {
                if (n.refractoryTime <= 0) {
                    n.accumulatedInput = n.threshold + 0.1;
                }
            }
            this.burstCooldown = 30;
        }
        if (this.burstCooldown > 0) this.burstCooldown--;
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;

        // --- Draw connections ---
        for (const conn of this.connections) {
            const from = this.neurons[conn.from];
            const to = this.neurons[conn.to];
            if (!from || !to) continue;

            const activity = conn.activity;
            const baseAlpha = 0.06 + activity * 0.3;
            const c = this.connectionColor;
            ctx.strokeStyle = `hsla(${c[0]}, ${c[1]}%, ${c[2] + activity * 30}%, ${baseAlpha})`;
            ctx.lineWidth = conn.width * (1 + activity);
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();

            // Active connection glow
            if (activity > 0.3) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = `hsla(${this.pulseColor[0]}, ${this.pulseColor[1]}%, ${this.pulseColor[2]}%, ${activity * 0.15})`;
                ctx.lineWidth = conn.width * 4;
                ctx.stroke();
                ctx.globalCompositeOperation = 'source-over';
            }
        }

        // --- Draw signals traveling along connections ---
        ctx.globalCompositeOperation = 'lighter';
        for (const sig of this.signals) {
            const from = this.neurons[sig.from];
            const to = this.neurons[sig.to];
            if (!from || !to) continue;

            const x = from.x + (to.x - from.x) * sig.progress;
            const y = from.y + (to.y - from.y) * sig.progress;
            const size = 2 + sig.strength * 2;

            const g = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
            const pc = this.pulseColor;
            g.addColorStop(0, `hsla(${pc[0]}, ${pc[1]}%, ${pc[2]}%, 0.9)`);
            g.addColorStop(0.3, `hsla(${pc[0]}, ${pc[1]}%, ${pc[2]}%, 0.4)`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, size * 3, 0, TAU);
            ctx.fill();

            // Bright core
            ctx.fillStyle = `hsla(${pc[0]}, 50%, 90%, 0.8)`;
            ctx.beginPath();
            ctx.arc(x, y, size * 0.5, 0, TAU);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // --- Draw neurons ---
        for (let i = 0; i < this.neurons.length; i++) {
            const n = this.neurons[i];
            const a = n.activation;
            const pulse = 1 + 0.15 * Math.sin(tick * 0.04 + n.pulsePhase);
            const r = n.size * pulse;

            // Resting halo
            const rc = this.restColor;
            ctx.fillStyle = `hsla(${rc[0]}, ${rc[1]}%, ${rc[2]}%, ${0.15 + a * 0.3})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r * 2.5, 0, TAU);
            ctx.fill();

            // Core body
            const bodyHue = rc[0] + (this.pulseColor[0] - rc[0]) * a;
            const bodyLight = rc[2] + (this.pulseColor[2] - rc[2]) * a;
            ctx.fillStyle = `hsla(${bodyHue}, ${60 + a * 30}%, ${bodyLight}%, ${0.5 + a * 0.5})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, TAU);
            ctx.fill();

            // Firing glow
            if (a > 0.3) {
                ctx.globalCompositeOperation = 'lighter';
                const glowSize = r * (2 + a * 4);
                const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowSize);
                const pc = this.pulseColor;
                g.addColorStop(0, `hsla(${pc[0]}, ${pc[1]}%, ${pc[2]}%, ${a * 0.4})`);
                g.addColorStop(0.5, `hsla(${pc[0]}, ${pc[1]}%, ${pc[2]}%, ${a * 0.1})`);
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(n.x, n.y, glowSize, 0, TAU);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
            }

            // Bright white center when highly active
            if (a > 0.6) {
                ctx.fillStyle = `rgba(255, 255, 255, ${(a - 0.6) * 2})`;
                ctx.beginPath();
                ctx.arc(n.x, n.y, r * 0.4, 0, TAU);
                ctx.fill();
            }

            // Inhibitory neurons get a distinctive ring
            if (n.type === 'inhibitory') {
                ctx.strokeStyle = `hsla(${rc[0] + 180}, 60%, 50%, ${0.2 + a * 0.3})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(n.x, n.y, r * 1.8, 0, TAU);
                ctx.stroke();
            }
        }
    }
}
