/**
 * @file fractal_lightning_effects.js
 * @description Branching electric arc networks that grow from interaction points,
 * connecting to each other and the cursor with crackling energy paths. Features
 * recursive fractal branching, capacitor-style charge buildup, and chain lightning.
 *
 * Modes:
 * 0 - Arc Welder: continuous arcs from cursor that branch and fork randomly
 * 1 - Storm Front: periodic lightning strikes from top of screen toward cursor
 * 2 - Tesla Coil: cursor is a coil emitting steady branching discharges to grounded points
 * 3 - Neural Fire: lightning follows neural pathway patterns with synapse flashes
 * 4 - Chain Lightning: bolts bounce between charged nodes on the screen
 * 5 - Plasma Globe: lightning arcs from center to screen edges like a plasma ball
 */

const TAU = Math.PI * 2;

function generateBolt(x1, y1, x2, y2, detail, rng) {
    const points = [{ x: x1, y: y1 }];
    const segments = Math.max(3, Math.floor(detail));

    let midX = (x1 + x2) / 2;
    let midY = (y1 + y2) / 2;

    // Recursive midpoint displacement
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const perpX = -dy / len, perpY = dx / len;

    for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const baseX = x1 + dx * t;
        const baseY = y1 + dy * t;
        const offset = (rng() - 0.5) * len * 0.25;
        points.push({
            x: baseX + perpX * offset,
            y: baseY + perpY * offset
        });
    }
    points.push({ x: x2, y: y2 });
    return points;
}

export class FractalLightning {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 200;
        this.saturation = 80;
        this.intensity = 1;

        this._mouseX = 0;
        this._mouseY = 0;
        this._prevMouseX = 0;
        this._prevMouseY = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._rng = Math.random;

        // Active bolts
        this.bolts = [];
        this.boltPool = [];
        this.maxBolts = 20;

        // Storm mode
        this.stormTimer = 0;
        this.stormInterval = 30;

        // Tesla coil ground points
        this.groundPoints = [];

        // Neural mode
        this.neurons = [];
        this.synapses = [];
        this.synapseFlashes = [];
        this.synapseFlashPool = [];

        // Chain lightning nodes
        this.chargeNodes = [];

        // Plasma globe
        this.globeCenter = { x: 0, y: 0 };
        this.globeRadius = 200;
        this.arcTargets = [];
    }

    configure(rng, palette) {
        this._rng = rng;
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? palette[Math.floor(rng() * palette.length)].h : 200;
        this.saturation = 60 + Math.floor(rng() * 30);
        this.intensity = 0.6 + rng() * 0.8;
        this.tick = 0;
        this.bolts = [];

        const w = window.innerWidth;
        const h = window.innerHeight;

        if (this.mode === 1) {
            this.stormInterval = 15 + Math.floor(rng() * 30);
        } else if (this.mode === 2) {
            this.groundPoints = [];
            const count = 4 + Math.floor(rng() * 4);
            for (let i = 0; i < count; i++) {
                this.groundPoints.push({
                    x: rng() * w,
                    y: h - 10 - rng() * 50,
                    charge: 0
                });
            }
        } else if (this.mode === 3) {
            this.neurons = [];
            this.synapses = [];
            const neuronCount = 12 + Math.floor(rng() * 10);
            for (let i = 0; i < neuronCount; i++) {
                this.neurons.push({
                    x: rng() * w, y: rng() * h,
                    charge: 0,
                    threshold: 0.6 + rng() * 0.3,
                    recovery: 0,
                    size: 3 + rng() * 5
                });
            }
            // Create synaptic connections
            for (let i = 0; i < neuronCount; i++) {
                const connectionCount = 1 + Math.floor(rng() * 3);
                for (let c = 0; c < connectionCount; c++) {
                    const target = Math.floor(rng() * neuronCount);
                    if (target !== i) {
                        const dx = this.neurons[i].x - this.neurons[target].x;
                        const dy = this.neurons[i].y - this.neurons[target].y;
                        if (Math.sqrt(dx * dx + dy * dy) < 300) {
                            this.synapses.push({ from: i, to: target, weight: 0.2 + rng() * 0.5 });
                        }
                    }
                }
            }
        } else if (this.mode === 4) {
            this.chargeNodes = [];
            const nodeCount = 6 + Math.floor(rng() * 6);
            for (let i = 0; i < nodeCount; i++) {
                this.chargeNodes.push({
                    x: rng() * w, y: rng() * h,
                    charge: rng(),
                    chargeRate: 0.005 + rng() * 0.01,
                    size: 4 + rng() * 6
                });
            }
        } else if (this.mode === 5) {
            this.globeCenter = { x: w / 2, y: h / 2 };
            this.globeRadius = Math.min(w, h) * 0.35;
            this.arcTargets = [];
            const arcCount = 5 + Math.floor(rng() * 4);
            for (let i = 0; i < arcCount; i++) {
                this.arcTargets.push({
                    angle: rng() * TAU,
                    angularSpeed: (rng() - 0.5) * 0.02,
                    wobble: rng() * TAU,
                    wobbleSpeed: 0.01 + rng() * 0.02
                });
            }
        }
    }

    update(mx, my, isClicking) {
        this._prevMouseX = this._mouseX;
        this._prevMouseY = this._mouseY;
        this._mouseX = mx;
        this._mouseY = my;
        const dx = mx - this._prevMouseX;
        const dy = my - this._prevMouseY;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._isClicking = isClicking;
        this.tick++;

        // Decay bolts
        for (let i = this.bolts.length - 1; i >= 0; i--) {
            this.bolts[i].life--;
            if (this.bolts[i].life <= 0) {
                this.boltPool.push(this.bolts[i]);
                this.bolts[i] = this.bolts[this.bolts.length - 1];
                this.bolts.pop();
            }
        }

        if (this.mode === 0) this._updateArcWelder();
        else if (this.mode === 1) this._updateStorm();
        else if (this.mode === 2) this._updateTeslaCoil();
        else if (this.mode === 3) this._updateNeural();
        else if (this.mode === 4) this._updateChainLightning();
        else if (this.mode === 5) this._updatePlasmaGlobe();
    }

    _spawnBolt(x1, y1, x2, y2, branches, life, width) {
        if (this.bolts.length >= this.maxBolts) return;
        const bolt = this.boltPool.length > 0 ? this.boltPool.pop() : {};
        bolt.points = generateBolt(x1, y1, x2, y2, 8, this._rng || Math.random);
        bolt.life = life || 8;
        bolt.maxLife = bolt.life;
        bolt.width = width || 1.5;
        bolt.hueOffset = (Math.random() - 0.5) * 20;
        this.bolts.push(bolt);

        // Recursive branches
        if (branches > 0 && Math.random() < 0.6) {
            const midIdx = Math.floor(bolt.points.length / 2);
            const mid = bolt.points[midIdx];
            const branchAngle = Math.atan2(y2 - y1, x2 - x1) + (Math.random() - 0.5) * 1.5;
            const branchLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * 0.4;
            this._spawnBolt(
                mid.x, mid.y,
                mid.x + Math.cos(branchAngle) * branchLen,
                mid.y + Math.sin(branchAngle) * branchLen,
                branches - 1, life ? life - 2 : 5, width * 0.6
            );
        }
    }

    _updateArcWelder() {
        if (this._mouseSpeed > 2 && this.tick % 3 === 0) {
            const angle = Math.atan2(
                this._mouseY - this._prevMouseY,
                this._mouseX - this._prevMouseX
            ) + (Math.random() - 0.5) * 2;
            const len = 40 + Math.random() * 80;
            this._spawnBolt(
                this._mouseX, this._mouseY,
                this._mouseX + Math.cos(angle) * len,
                this._mouseY + Math.sin(angle) * len,
                2, 6, 1.5
            );
        }
        if (this._isClicking && this.tick % 2 === 0) {
            for (let i = 0; i < 3; i++) {
                const angle = Math.random() * TAU;
                const len = 60 + Math.random() * 120;
                this._spawnBolt(
                    this._mouseX, this._mouseY,
                    this._mouseX + Math.cos(angle) * len,
                    this._mouseY + Math.sin(angle) * len,
                    2, 8, 2
                );
            }
        }
    }

    _updateStorm() {
        this.stormTimer++;
        if (this.stormTimer >= this.stormInterval) {
            this.stormTimer = 0;
            // Strike from top toward cursor
            const startX = this._mouseX + (Math.random() - 0.5) * 200;
            this._spawnBolt(startX, -10, this._mouseX, this._mouseY, 3, 12, 2.5);
        }
    }

    _updateTeslaCoil() {
        // Charge ground points
        for (const gp of this.groundPoints) {
            gp.charge += 0.01;
            if (gp.charge > 1) {
                gp.charge = 0;
                this._spawnBolt(this._mouseX, this._mouseY, gp.x, gp.y, 2, 8, 1.5);
            }
        }
        // Extra discharge when clicking
        if (this._isClicking && this.tick % 4 === 0) {
            const nearest = this.groundPoints.reduce((best, gp) => {
                const d = Math.hypot(gp.x - this._mouseX, gp.y - this._mouseY);
                return d < best.d ? { d, gp } : best;
            }, { d: Infinity, gp: null });
            if (nearest.gp) {
                this._spawnBolt(this._mouseX, this._mouseY, nearest.gp.x, nearest.gp.y, 3, 10, 2.5);
            }
        }
    }

    _updateNeural() {
        const mx = this._mouseX, my = this._mouseY;

        // Cursor stimulates nearby neurons
        for (const n of this.neurons) {
            if (n.recovery > 0) { n.recovery--; continue; }
            const dx = mx - n.x, dy = my - n.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
                n.charge = Math.min(1, n.charge + (1 - dist / 100) * 0.05);
            }

            // Fire when threshold reached
            if (n.charge >= n.threshold) {
                n.charge = 0;
                n.recovery = 20;
                // Propagate through synapses
                for (const syn of this.synapses) {
                    if (syn.from === this.neurons.indexOf(n)) {
                        const target = this.neurons[syn.to];
                        if (target && target.recovery === 0) {
                            target.charge = Math.min(1, target.charge + syn.weight);
                            // Synapse flash
                            const flash = this.synapseFlashPool.length > 0 ? this.synapseFlashPool.pop() : {};
                            flash.x1 = n.x; flash.y1 = n.y;
                            flash.x2 = target.x; flash.y2 = target.y;
                            flash.life = 6; flash.maxLife = 6;
                            this.synapseFlashes.push(flash);
                        }
                    }
                }
            }
            n.charge *= 0.98; // Leak
        }

        // Decay synapse flashes
        for (let i = this.synapseFlashes.length - 1; i >= 0; i--) {
            this.synapseFlashes[i].life--;
            if (this.synapseFlashes[i].life <= 0) {
                this.synapseFlashPool.push(this.synapseFlashes[i]);
                this.synapseFlashes[i] = this.synapseFlashes[this.synapseFlashes.length - 1];
                this.synapseFlashes.pop();
            }
        }
    }

    _updateChainLightning() {
        for (const node of this.chargeNodes) {
            node.charge = Math.min(1, node.charge + node.chargeRate);

            // Cursor proximity supercharges
            const dx = this._mouseX - node.x, dy = this._mouseY - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                node.charge = Math.min(1, node.charge + 0.02 * (1 - dist / 150));
            }

            // Discharge to nearest charged neighbor
            if (node.charge > 0.8) {
                let nearest = null, nearDist = Infinity;
                for (const other of this.chargeNodes) {
                    if (other === node) continue;
                    const d = Math.hypot(other.x - node.x, other.y - node.y);
                    if (d < nearDist && d < 350) {
                        nearDist = d;
                        nearest = other;
                    }
                }
                if (nearest) {
                    this._spawnBolt(node.x, node.y, nearest.x, nearest.y, 1, 6, 1);
                    node.charge = 0.1;
                    nearest.charge = Math.min(1, nearest.charge + 0.3); // Transfer charge
                }
            }
        }
    }

    _updatePlasmaGlobe() {
        // Center follows cursor slowly
        this.globeCenter.x += (this._mouseX - this.globeCenter.x) * 0.02;
        this.globeCenter.y += (this._mouseY - this.globeCenter.y) * 0.02;

        for (const arc of this.arcTargets) {
            arc.angle += arc.angularSpeed;
            arc.wobble += arc.wobbleSpeed;
        }

        // Regenerate arcs periodically
        if (this.tick % 4 === 0) {
            this.bolts = []; // Clear old arcs for fresh ones
            for (const arc of this.arcTargets) {
                const r = this.globeRadius * (0.7 + Math.sin(arc.wobble) * 0.3);
                const tx = this.globeCenter.x + Math.cos(arc.angle) * r;
                const ty = this.globeCenter.y + Math.sin(arc.angle) * r;
                this._spawnBolt(this.globeCenter.x, this.globeCenter.y, tx, ty, 1, 5, 1.2);
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw bolts (shared across modes)
        for (const bolt of this.bolts) {
            const alpha = (bolt.life / bolt.maxLife) * 0.5 * this.intensity;
            const hue = (this.hue + bolt.hueOffset + 360) % 360;

            // Glow pass
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 70%, ${alpha * 0.3})`;
            ctx.lineWidth = bolt.width * 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
            for (let i = 1; i < bolt.points.length; i++) {
                ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
            }
            ctx.stroke();

            // Core pass
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation - 20}%, 90%, ${alpha})`;
            ctx.lineWidth = bolt.width;
            ctx.beginPath();
            ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
            for (let i = 1; i < bolt.points.length; i++) {
                ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
            }
            ctx.stroke();
        }

        // Mode-specific overlays
        if (this.mode === 2) this._drawTeslaCoil(ctx);
        else if (this.mode === 3) this._drawNeural(ctx);
        else if (this.mode === 4) this._drawChargeNodes(ctx);
        else if (this.mode === 5) this._drawPlasmaGlobe(ctx);

        ctx.restore();
    }

    _drawTeslaCoil(ctx) {
        // Ground point indicators
        for (const gp of this.groundPoints) {
            const alpha = (0.1 + gp.charge * 0.3) * this.intensity;
            ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, 60%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(gp.x, gp.y, 4 + gp.charge * 3, 0, TAU);
            ctx.fill();
        }
    }

    _drawNeural(ctx) {
        // Draw neurons
        for (const n of this.neurons) {
            const chargeAlpha = (0.05 + n.charge * 0.3) * this.intensity;
            const isRecovering = n.recovery > 0;

            // Neuron body
            if (isRecovering) {
                // Bright flash during fire
                const flashAlpha = (n.recovery / 20) * 0.4 * this.intensity;
                const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size * 3);
                g.addColorStop(0, `hsla(${this.hue + 30}, 90%, 90%, ${flashAlpha})`);
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.size * 3, 0, TAU);
                ctx.fill();
            }

            ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, 70%, ${chargeAlpha})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.size * (1 + n.charge * 0.5), 0, TAU);
            ctx.fill();
        }

        // Draw synapse flashes as mini-bolts
        for (const flash of this.synapseFlashes) {
            const alpha = (flash.life / flash.maxLife) * 0.3 * this.intensity;
            ctx.strokeStyle = `hsla(${this.hue + 40}, 90%, 80%, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            // Simple jittered line
            ctx.moveTo(flash.x1, flash.y1);
            const midX = (flash.x1 + flash.x2) / 2 + (Math.random() - 0.5) * 10;
            const midY = (flash.y1 + flash.y2) / 2 + (Math.random() - 0.5) * 10;
            ctx.lineTo(midX, midY);
            ctx.lineTo(flash.x2, flash.y2);
            ctx.stroke();
        }

        // Draw synaptic connections (dim)
        ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 50%, ${0.02 * this.intensity})`;
        ctx.lineWidth = 0.5;
        for (const syn of this.synapses) {
            const from = this.neurons[syn.from];
            const to = this.neurons[syn.to];
            if (!from || !to) continue;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
        }
    }

    _drawChargeNodes(ctx) {
        for (const node of this.chargeNodes) {
            const alpha = (0.1 + node.charge * 0.4) * this.intensity;

            // Charge glow
            if (node.charge > 0.5) {
                const g = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size * 3);
                g.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, 80%, ${node.charge * 0.15 * this.intensity})`);
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size * 3, 0, TAU);
                ctx.fill();
            }

            ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.size, 0, TAU);
            ctx.fill();
        }
    }

    _drawPlasmaGlobe(ctx) {
        // Globe outline
        ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 50%, ${0.04 * this.intensity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.globeCenter.x, this.globeCenter.y, this.globeRadius, 0, TAU);
        ctx.stroke();

        // Center glow
        const g = ctx.createRadialGradient(
            this.globeCenter.x, this.globeCenter.y, 0,
            this.globeCenter.x, this.globeCenter.y, 30
        );
        g.addColorStop(0, `hsla(${this.hue}, 90%, 90%, ${0.2 * this.intensity})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.globeCenter.x, this.globeCenter.y, 30, 0, TAU);
        ctx.fill();
    }
}
