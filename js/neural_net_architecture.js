/**
 * @file neural_net_architecture.js
 * @description Neural Network Visualization with layered neurons, weighted connections,
 * forward-pass signal propagation, and 4 seed-selected topologies (feedforward, recurrent,
 * convolutional grid, transformer attention). Mouse drives input layer. Gravity well
 * triggers backpropagation. Shockwaves simulate training steps.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

/**
 * Neural network visualization with layered neurons connected by weighted edges.
 * Supports 4 topologies: feedforward, recurrent (curved backward connections),
 * convolutional (grid neuron layout), and transformer (intra-layer attention lines).
 * Signals propagate as glowing pulses along connections; arriving signals activate
 * destination neurons with a fading glow. Mouse cursor drives input layer activations,
 * gravity well reverses signal flow (backpropagation), shockwaves trigger training
 * steps that flash connections and shift weights. Dropout dims random hidden neurons.
 */
export class NeuralNetArchitecture extends Architecture {
    constructor() {
        super();
        this.layers = [];          // array of arrays of neuron objects
        this.connections = [];     // weighted edges between neurons
        this.signals = [];         // glowing pulses traveling along connections
        this.topology = 0;        // 0=feedforward, 1=recurrent, 2=convolutional, 3=transformer
        this.activationStyle = 0; // 0=soft glow, 1=sharp ring, 2=pulsing halo
        this.trainingFlash = 0;   // global flash timer from shockwave training events
        this.backpropActive = false;
    }

    init(system) {
        const rng = system.rng;
        this.topology = Math.floor(rng() * 4); // 0=feedforward,1=recurrent,2=conv,3=transformer
        this.activationStyle = Math.floor(rng() * 3); // 0=soft glow,1=sharp ring,2=pulsing halo
        const layerCount = 3 + Math.floor(rng() * 5);
        const mX = system.width * 0.1, uW = system.width * 0.8;
        const mY = system.height * 0.1, uH = system.height * 0.8;

        this.layers = [];
        for (let l = 0; l < layerCount; l++) {
            const layer = [], x = mX + (uW / (layerCount - 1)) * l;
            const cnt = 4 + Math.floor(rng() * 9);
            if (this.topology === 2) {
                const cols = Math.ceil(Math.sqrt(cnt)), rows = Math.ceil(cnt / cols);
                const gs = Math.min(40, uH / (rows + 1)), gy = (system.height - rows * gs) / 2;
                for (let n = 0; n < cnt; n++) {
                    const bx = x + (n % cols - cols / 2) * gs;
                    const by = gy + Math.floor(n / cols) * gs + gs / 2;
                    layer.push({ x: bx, y: by, baseX: bx, baseY: by, radius: 6 + rng() * 4,
                        activation: 0, glowFade: 0, dropout: false, phase: rng() * Math.PI * 2 });
                }
            } else {
                const sp = uH / (cnt + 1);
                for (let n = 0; n < cnt; n++) {
                    const by = mY + sp * (n + 1);
                    layer.push({ x, y: by, baseX: x, baseY: by, radius: 6 + rng() * 4,
                        activation: 0, glowFade: 0, dropout: false, phase: rng() * Math.PI * 2 });
                }
            }
            this.layers.push(layer);
        }
        // Dropout: dim ~15% of hidden neurons
        for (let l = 1; l < this.layers.length - 1; l++)
            for (let n = 0; n < this.layers[l].length; n++)
                if (rng() < 0.15) this.layers[l][n].dropout = true;

        // Build weighted connection graph and reset runtime state
        this.connections = [];
        this._buildConnections(rng);
        this.signals = [];
        this.trainingFlash = 0;
        this.backpropActive = false;
    }

    /**
     * Build the connection graph based on the selected topology.
     * All topologies get feedforward connections; recurrent adds backward curves,
     * transformer adds intra-layer attention edges with varying opacity.
     */
    _buildConnections(rng) {
        // Feedforward connections between adjacent layers
        for (let l = 0; l < this.layers.length - 1; l++)
            for (let i = 0; i < this.layers[l].length; i++)
                for (let j = 0; j < this.layers[l + 1].length; j++) {
                    if (rng() < 0.15) continue;
                    const w = 0.2 + rng() * 0.8;
                    this.connections.push({ fromLayer: l, fromIdx: i, toLayer: l + 1, toIdx: j,
                        weight: w, opacity: 0.1 + w * 0.5, flashTimer: 0, recurrent: false });
                }
        // Recurrent: curved backward connections
        if (this.topology === 1)
            for (let l = 1; l < this.layers.length; l++) {
                const rc = 1 + Math.floor(rng() * 3);
                for (let r = 0; r < rc; r++) {
                    const w = 0.2 + rng() * 0.5;
                    this.connections.push({ fromLayer: l, fromIdx: Math.floor(rng() * this.layers[l].length),
                        toLayer: l - 1, toIdx: Math.floor(rng() * this.layers[l - 1].length),
                        weight: w, opacity: 0.15 + rng() * 0.3, flashTimer: 0, recurrent: true });
                }
            }
        // Transformer: attention connections within layers
        if (this.topology === 3)
            for (let l = 1; l < this.layers.length - 1; l++)
                for (let i = 0; i < this.layers[l].length; i++)
                    for (let j = i + 1; j < this.layers[l].length; j++) {
                        if (rng() < 0.4) continue;
                        const w = 0.1 + rng() * 0.6;
                        this.connections.push({ fromLayer: l, fromIdx: i, toLayer: l, toIdx: j,
                            weight: w, opacity: 0.05 + w * 0.25, flashTimer: 0, recurrent: false, attention: true });
                    }
    }

    /** Create a signal pulse on the given connection, optionally in reverse (backprop). */
    _spawnSignal(c, reverse) {
        const conn = this.connections[c];
        if (!conn) return;
        const from = reverse ? this.layers[conn.toLayer]?.[conn.toIdx] : this.layers[conn.fromLayer]?.[conn.fromIdx];
        const to = reverse ? this.layers[conn.fromLayer]?.[conn.fromIdx] : this.layers[conn.toLayer]?.[conn.toIdx];
        if (!from || !to) return;
        this.signals.push({ fromNeuron: from, toNeuron: to, progress: 0,
            intensity: 0.5 + conn.weight * 0.5, connIdx: c, reverse: !!reverse });
    }

    update(system) {
        const { tick, speedMultiplier: speed, isGravityWell, shockwaves, deviceTilt } = system;
        const mx = mouse.x, my = mouse.y;
        const tiltX = (deviceTilt?.x || 0) * 5, tiltY = (deviceTilt?.y || 0) * 5;

        // Apply tilt offset to all neurons
        for (const layer of this.layers)
            for (const nr of layer) { nr.x = nr.baseX + tiltX; nr.y = nr.baseY + tiltY; }

        // Mouse as input: map cursor to first-layer activations
        if (this.layers.length > 0) {
            const maxDist = system.height * 0.6;
            for (const nr of this.layers[0]) {
                const d = Math.sqrt((mx - nr.x) ** 2 + (my - nr.y) ** 2);
                const act = Math.max(0, 1 - d / maxDist);
                nr.activation = act;
                nr.glowFade = Math.max(nr.glowFade, act);
            }
        }

        // Gravity well: reverse signal direction (backpropagation visual)
        this.backpropActive = isGravityWell;

        // Spawn signals from source layer (input normally, output during backprop)
        if (tick % Math.max(2, Math.floor(8 / speed)) === 0) {
            const rev = this.backpropActive;
            const srcIdx = rev ? this.layers.length - 1 : 0;
            this._fireFromLayer(srcIdx, rev, system, 0.1, 0.15);
            // Also fire from activated middle layers
            for (let l = 1; l < this.layers.length - 1; l++)
                this._fireFromLayer(l, rev, system, 0.3, 0.05);
        }

        // Update signal propagation
        for (let i = this.signals.length - 1; i >= 0; i--) {
            const sig = this.signals[i];
            sig.progress += 0.015 * speed;
            if (sig.progress >= 1) {
                sig.toNeuron.activation = Math.min(1, sig.toNeuron.activation + sig.intensity * 0.4);
                sig.toNeuron.glowFade = Math.min(1, sig.toNeuron.glowFade + sig.intensity * 0.6);
                this.signals.splice(i, 1);
            }
        }
        while (this.signals.length > 300) this.signals.shift();

        // Decay neuron activations and glow over time
        for (const layer of this.layers)
            for (const nr of layer) { nr.activation *= 0.97; nr.glowFade *= 0.96; }

        // Shockwave: "training step" - flash connections white, pulse neurons, shift weights
        for (const sw of shockwaves) {
            for (const conn of this.connections) {
                const fN = this.layers[conn.fromLayer]?.[conn.fromIdx];
                const tN = this.layers[conn.toLayer]?.[conn.toIdx];
                if (!fN || !tN) continue;
                const d = Math.sqrt(((fN.x + tN.x) / 2 - sw.x) ** 2 + ((fN.y + tN.y) / 2 - sw.y) ** 2);
                if (Math.abs(d - sw.radius) < 80) {
                    conn.flashTimer = 15;
                    conn.weight = Math.max(0.1, Math.min(1, conn.weight + (system.rng() - 0.5) * 0.2));
                    conn.opacity = 0.1 + conn.weight * 0.5;
                }
            }
            for (const layer of this.layers)
                for (const nr of layer) {
                    const d = Math.sqrt((nr.x - sw.x) ** 2 + (nr.y - sw.y) ** 2);
                    if (Math.abs(d - sw.radius) < 100) {
                        nr.glowFade = Math.min(1, nr.glowFade + sw.strength * 0.8);
                        nr.activation = Math.min(1, nr.activation + sw.strength * 0.5);
                    }
                }
            this.trainingFlash = Math.max(this.trainingFlash, 12);
        }

        if (this.trainingFlash > 0) this.trainingFlash--;
        for (const conn of this.connections)
            if (conn.flashTimer > 0) conn.flashTimer--;
    }

    /** Fire signals from all sufficiently activated neurons in the given layer. */
    _fireFromLayer(layerIdx, reverse, system, glowThresh, prob) {
        for (let n = 0; n < this.layers[layerIdx].length; n++) {
            const nr = this.layers[layerIdx][n];
            if (nr.activation < glowThresh && nr.glowFade < glowThresh + 0.1) continue;
            for (let c = 0; c < this.connections.length; c++) {
                const cn = this.connections[c];
                const match = reverse
                    ? (cn.toLayer === layerIdx && cn.toIdx === n)
                    : (cn.fromLayer === layerIdx && cn.fromIdx === n);
                if (match && system.rng() < prob) this._spawnSignal(c, reverse);
            }
        }
    }

    draw(system) {
        const ctx = system.ctx, h = system.hue, tick = system.tick;
        // Connections behind, then signals, then neurons on top
        this._drawConnections(ctx, h);
        this._drawSignals(ctx, h);
        this._drawNeurons(ctx, h, tick);
    }

    /** Draw all connection lines, batched by type. Line thickness encodes weight. */
    _drawConnections(ctx, h) {
        ctx.lineCap = 'round';
        const flashBoost = this.trainingFlash / 12;
        for (const conn of this.connections) {
            const fN = this.layers[conn.fromLayer]?.[conn.fromIdx];
            const tN = this.layers[conn.toLayer]?.[conn.toIdx];
            if (!fN || !tN) continue;
            const flash = conn.flashTimer > 0 ? conn.flashTimer / 15 : 0;
            const tf = Math.min(1, flash + flashBoost);
            const cHue = conn.recurrent ? (h + 120) % 360 : conn.attention ? (h + 60) % 360 : h;
            ctx.strokeStyle = `hsla(${cHue}, ${tf > 0.5 ? 20 : 70}%, ${40 + tf * 50}%, ${conn.opacity * (1 - tf * 0.3) + tf * 0.6})`;
            ctx.lineWidth = 0.5 + conn.weight * 2.5;
            ctx.beginPath();
            if (conn.recurrent) {
                const cpx = (fN.x + tN.x) / 2 + (fN.y - tN.y) * 0.3;
                const cpy = (fN.y + tN.y) / 2 - (fN.x - tN.x) * 0.3;
                ctx.moveTo(fN.x, fN.y);
                ctx.quadraticCurveTo(cpx, cpy, tN.x, tN.y);
            } else {
                ctx.moveTo(fN.x, fN.y); ctx.lineTo(tN.x, tN.y);
            }
            ctx.stroke();
        }
    }

    /** Draw signal pulses as glowing dots traveling along connection paths. */
    _drawSignals(ctx, h) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const sig of this.signals) {
            const { fromNeuron: from, toNeuron: to, progress: t, intensity, connIdx, reverse } = sig;
            const conn = this.connections[connIdx];
            let x, y;
            if (conn?.recurrent) {
                const cpx = (from.x + to.x) / 2 + (from.y - to.y) * 0.3;
                const cpy = (from.y + to.y) / 2 - (from.x - to.x) * 0.3;
                const mt = 1 - t;
                x = mt * mt * from.x + 2 * mt * t * cpx + t * t * to.x;
                y = mt * mt * from.y + 2 * mt * t * cpy + t * t * to.y;
            } else {
                x = from.x + (to.x - from.x) * t;
                y = from.y + (to.y - from.y) * t;
            }
            const sH = reverse ? (h + 180) % 360 : h, r = 8 + intensity * 6;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, `hsla(${sH}, 100%, 85%, ${intensity * 0.8})`);
            grad.addColorStop(0.5, `hsla(${sH}, 100%, 60%, ${intensity * 0.3})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = `hsla(${sH}, 100%, 95%, ${intensity})`;
            ctx.beginPath(); ctx.arc(x, y, 2 + intensity * 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    /** Draw neuron circles with activation glow, white core, and border. */
    _drawNeurons(ctx, h, tick) {
        ctx.save();
        for (const layer of this.layers) {
            for (const nr of layer) {
                const { glowFade: glow, activation: act, dropout, phase, radius } = nr;
                const dim = dropout ? 0.3 : 1;
                const pulse = Math.sin(tick * 0.03 + phase) * 0.1 + 0.9;
                const r = radius * pulse;

                if (glow > 0.05) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    const gr = radius * (2 + glow * 4) * pulse;
                    if (this.activationStyle === 0) {
                        const g = ctx.createRadialGradient(nr.x, nr.y, 0, nr.x, nr.y, gr);
                        g.addColorStop(0, `hsla(0,0%,100%,${glow * 0.6 * dim})`);
                        g.addColorStop(0.4, `hsla(${h},80%,70%,${glow * 0.3 * dim})`);
                        g.addColorStop(1, 'transparent');
                        ctx.fillStyle = g;
                        ctx.beginPath(); ctx.arc(nr.x, nr.y, gr, 0, Math.PI * 2); ctx.fill();
                    } else if (this.activationStyle === 1) {
                        ctx.strokeStyle = `hsla(0,0%,100%,${glow * 0.7 * dim})`;
                        ctx.lineWidth = 1.5 + glow * 2;
                        ctx.beginPath(); ctx.arc(nr.x, nr.y, gr * 0.7, 0, Math.PI * 2); ctx.stroke();
                        const g = ctx.createRadialGradient(nr.x, nr.y, 0, nr.x, nr.y, gr * 0.4);
                        g.addColorStop(0, `hsla(0,0%,100%,${glow * 0.4 * dim})`);
                        g.addColorStop(1, 'transparent');
                        ctx.fillStyle = g;
                        ctx.beginPath(); ctx.arc(nr.x, nr.y, gr * 0.4, 0, Math.PI * 2); ctx.fill();
                    } else {
                        const hp = Math.sin(tick * 0.08 + phase) * 0.5 + 0.5;
                        const hr = gr * (0.8 + hp * 0.4);
                        const g = ctx.createRadialGradient(nr.x, nr.y, hr * 0.6, nr.x, nr.y, hr);
                        g.addColorStop(0, 'transparent');
                        g.addColorStop(0.5, `hsla(0,0%,100%,${glow * 0.4 * dim * hp})`);
                        g.addColorStop(1, 'transparent');
                        ctx.fillStyle = g;
                        ctx.beginPath(); ctx.arc(nr.x, nr.y, hr, 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.restore();
                }

                // Neuron body
                ctx.fillStyle = `hsla(${h},60%,${40 + glow * 50}%,${(0.3 + act * 0.7) * dim * pulse})`;
                ctx.beginPath(); ctx.arc(nr.x, nr.y, r, 0, Math.PI * 2); ctx.fill();
                // White core when activated
                if (glow > 0.2) {
                    ctx.fillStyle = `rgba(255,255,255,${glow * 0.8 * dim})`;
                    ctx.beginPath(); ctx.arc(nr.x, nr.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
                }
                // Border
                ctx.strokeStyle = `hsla(${h},50%,60%,${(0.2 + act * 0.4) * dim})`;
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(nr.x, nr.y, r, 0, Math.PI * 2); ctx.stroke();
            }
        }
        ctx.restore();
    }
}
