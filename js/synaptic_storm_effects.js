/**
 * @file synaptic_storm_effects.js
 * @description Neural network visualization where nodes fire in cascading chain
 * reactions. Mouse triggers action potentials that propagate through the network.
 * Seed determines network topology, firing thresholds, and signal colors.
 * Each topology creates dramatically different firing patterns.
 *
 * Modes (seed-selected):
 * 0 - Hub-Spoke: central nodes broadcast to many, creates starburst waves
 * 1 - Small World: clustered with long-range shortcuts, creates localized storms
 * 2 - Grid Lattice: orderly propagation with diagonal shortcuts, wave patterns
 * 3 - Random Mesh: chaotic firing, no predictable pattern
 * 4 - Tree: hierarchical top-down cascade, waterfall-like propagation
 */

const TAU = Math.PI * 2;

export class SynapticStorm {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 200;
        this.saturation = 70;
        this._rng = Math.random;

        this.nodes = [];
        this.connections = [];
        this.signals = [];
        this.maxNodes = 80;
        this.maxSignals = 200;

        this._mouseX = 0;
        this._mouseY = 0;
        this._isClicking = false;
        this._wasClicking = false;

        this._signalSpeed = 3;
        this._signalHue = 200;
        this._signalSecondaryHue = 300;
        this._fireThreshold = 3;
        this._decayRate = 0.02;
        this._refractoryPeriod = 30;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 5);
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.saturation = 50 + rng() * 40;
        this.tick = 0;
        this._rng = rng;
        this.signals = [];

        this._signalSpeed = 2 + rng() * 4;
        this._signalHue = this.hue;
        this._signalSecondaryHue = (this.hue + 120 + rng() * 60) % 360;
        this._fireThreshold = 2 + Math.floor(rng() * 3);
        this._decayRate = 0.015 + rng() * 0.02;
        this._refractoryPeriod = 20 + Math.floor(rng() * 25);

        const W = window.innerWidth, H = window.innerHeight;
        this.nodes = [];
        this.connections = [];

        switch (this.mode) {
            case 0: this._buildHubSpoke(rng, W, H); break;
            case 1: this._buildSmallWorld(rng, W, H); break;
            case 2: this._buildGridLattice(rng, W, H); break;
            case 3: this._buildRandomMesh(rng, W, H); break;
            case 4: this._buildTree(rng, W, H); break;
        }

        // Initialize node state
        for (const node of this.nodes) {
            node.charge = 0;
            node.firing = false;
            node.refractory = 0;
            node.lastFire = -999;
            node.pulseSize = 0;
        }
    }

    _buildHubSpoke(rng, W, H) {
        const hubCount = 3 + Math.floor(rng() * 3);
        const spokesPer = 8 + Math.floor(rng() * 8);

        for (let h = 0; h < hubCount; h++) {
            const hx = W * (0.2 + rng() * 0.6);
            const hy = H * (0.2 + rng() * 0.6);
            const hubIdx = this.nodes.length;
            this.nodes.push({ x: hx, y: hy, size: 5 + rng() * 3, isHub: true, hue: this._signalHue });

            for (let s = 0; s < spokesPer && this.nodes.length < this.maxNodes; s++) {
                const angle = (s / spokesPer) * TAU + rng() * 0.3;
                const dist = 80 + rng() * 150;
                const sx = hx + Math.cos(angle) * dist;
                const sy = hy + Math.sin(angle) * dist;
                const spokeIdx = this.nodes.length;
                this.nodes.push({ x: sx, y: sy, size: 2 + rng() * 2, isHub: false, hue: this._signalSecondaryHue });
                this.connections.push({ from: hubIdx, to: spokeIdx });
                this.connections.push({ from: spokeIdx, to: hubIdx });
            }
        }

        // Connect hubs to each other
        for (let i = 0; i < hubCount - 1; i++) {
            for (let j = i + 1; j < hubCount; j++) {
                const fi = this._findHubIndex(i);
                const fj = this._findHubIndex(j);
                if (fi >= 0 && fj >= 0) {
                    this.connections.push({ from: fi, to: fj });
                    this.connections.push({ from: fj, to: fi });
                }
            }
        }
    }

    _findHubIndex(n) {
        let count = 0;
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i].isHub) {
                if (count === n) return i;
                count++;
            }
        }
        return -1;
    }

    _buildSmallWorld(rng, W, H) {
        const count = 50 + Math.floor(rng() * 30);
        const clusterCount = 3 + Math.floor(rng() * 3);

        // Create clusters
        for (let cl = 0; cl < clusterCount; cl++) {
            const cx = W * (0.15 + rng() * 0.7);
            const cy = H * (0.15 + rng() * 0.7);
            const clusterSize = Math.floor(count / clusterCount);

            for (let i = 0; i < clusterSize && this.nodes.length < this.maxNodes; i++) {
                const angle = rng() * TAU;
                const dist = rng() * 100;
                this.nodes.push({
                    x: cx + Math.cos(angle) * dist,
                    y: cy + Math.sin(angle) * dist,
                    size: 2 + rng() * 2,
                    cluster: cl,
                    hue: (this.hue + cl * 40) % 360,
                });
            }
        }

        // Connect within clusters (dense)
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                if (this.nodes[i].cluster !== this.nodes[j].cluster) continue;
                const dx = this.nodes[j].x - this.nodes[i].x;
                const dy = this.nodes[j].y - this.nodes[i].y;
                if (dx * dx + dy * dy < 8000) {
                    this.connections.push({ from: i, to: j });
                }
            }
        }

        // Long-range shortcuts (sparse)
        for (let i = 0; i < this.nodes.length; i++) {
            if (rng() < 0.15) {
                const j = Math.floor(rng() * this.nodes.length);
                if (j !== i) {
                    this.connections.push({ from: i, to: j });
                }
            }
        }
    }

    _buildGridLattice(rng, W, H) {
        const gridCols = 8 + Math.floor(rng() * 5);
        const gridRows = 5 + Math.floor(rng() * 4);
        const spacingX = W / (gridCols + 1);
        const spacingY = H / (gridRows + 1);

        for (let r = 0; r < gridRows; r++) {
            for (let c = 0; c < gridCols; c++) {
                this.nodes.push({
                    x: (c + 1) * spacingX + (rng() - 0.5) * spacingX * 0.3,
                    y: (r + 1) * spacingY + (rng() - 0.5) * spacingY * 0.3,
                    size: 2 + rng() * 2,
                    hue: (this.hue + (r + c) * 10) % 360,
                });
                const idx = r * gridCols + c;
                if (c > 0) this.connections.push({ from: idx, to: idx - 1 });
                if (r > 0) this.connections.push({ from: idx, to: idx - gridCols });
                // Diagonal shortcuts
                if (r > 0 && c > 0 && rng() < 0.3) {
                    this.connections.push({ from: idx, to: idx - gridCols - 1 });
                }
            }
        }
    }

    _buildRandomMesh(rng, W, H) {
        const count = 40 + Math.floor(rng() * 30);
        for (let i = 0; i < count; i++) {
            this.nodes.push({
                x: W * (0.05 + rng() * 0.9),
                y: H * (0.05 + rng() * 0.9),
                size: 2 + rng() * 3,
                hue: (this.hue + rng() * 60) % 360,
            });
        }

        // Connect to 2-4 nearest neighbors
        for (let i = 0; i < this.nodes.length; i++) {
            const dists = [];
            for (let j = 0; j < this.nodes.length; j++) {
                if (j === i) continue;
                const dx = this.nodes[j].x - this.nodes[i].x;
                const dy = this.nodes[j].y - this.nodes[i].y;
                dists.push({ idx: j, d: dx * dx + dy * dy });
            }
            dists.sort((a, b) => a.d - b.d);
            const connectCount = 2 + Math.floor(rng() * 3);
            for (let k = 0; k < Math.min(connectCount, dists.length); k++) {
                this.connections.push({ from: i, to: dists[k].idx });
            }
        }
    }

    _buildTree(rng, W, H) {
        const depth = 4 + Math.floor(rng() * 2);
        const branchFactor = 2 + Math.floor(rng() * 2);

        const rootX = W * 0.5;
        const rootY = H * 0.1;
        this.nodes.push({ x: rootX, y: rootY, size: 5, hue: this._signalHue, depth: 0 });

        let currentLevel = [0];
        for (let d = 1; d < depth && this.nodes.length < this.maxNodes; d++) {
            const nextLevel = [];
            for (const parentIdx of currentLevel) {
                const parent = this.nodes[parentIdx];
                const branches = Math.min(branchFactor, this.maxNodes - this.nodes.length);
                for (let b = 0; b < branches; b++) {
                    const spreadAngle = ((b / branches) - 0.5) * (Math.PI * 0.6);
                    const baseAngle = Math.PI * 0.5 + spreadAngle;
                    const dist = 60 + rng() * 40;
                    const childIdx = this.nodes.length;
                    this.nodes.push({
                        x: parent.x + Math.cos(baseAngle) * dist + (rng() - 0.5) * 30,
                        y: parent.y + dist * 0.8 + (rng() - 0.5) * 20,
                        size: Math.max(1.5, 5 - d),
                        hue: (this.hue + d * 30) % 360,
                        depth: d,
                    });
                    this.connections.push({ from: parentIdx, to: childIdx });
                    nextLevel.push(childIdx);
                }
            }
            currentLevel = nextLevel;
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._mouseX = mx;
        this._mouseY = my;

        // Click triggers firing in nearby nodes
        if (isClicking && !this._wasClicking) {
            for (const node of this.nodes) {
                const dx = node.x - mx, dy = node.y - my;
                if (dx * dx + dy * dy < 10000 && node.refractory <= 0) { // 100px radius
                    node.charge = this._fireThreshold + 1;
                }
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Mouse proximity slowly charges nodes
        for (const node of this.nodes) {
            const dx = node.x - mx, dy = node.y - my;
            const d = dx * dx + dy * dy;
            if (d < 40000 && node.refractory <= 0) { // 200px radius
                node.charge += (1 - Math.sqrt(d) / 200) * 0.05;
            }
        }

        // Random spontaneous firing
        if (this.tick % 60 === 0) {
            const idx = Math.floor(this._rng() * this.nodes.length);
            if (this.nodes[idx].refractory <= 0) {
                this.nodes[idx].charge = this._fireThreshold + 1;
            }
        }

        // Process firing
        for (let ni = 0; ni < this.nodes.length; ni++) {
            const node = this.nodes[ni];
            if (node.refractory > 0) {
                node.refractory--;
                node.pulseSize *= 0.9;
                continue;
            }

            if (node.charge >= this._fireThreshold) {
                node.firing = true;
                node.lastFire = this.tick;
                node.pulseSize = node.size * 3;
                node.refractory = this._refractoryPeriod;

                // Send signals along connections
                for (const conn of this.connections) {
                    if (conn.from !== ni) continue;
                    if (this.signals.length >= this.maxSignals) break;
                    const target = this.nodes[conn.to];
                    const dx = target.x - node.x;
                    const dy = target.y - node.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    this.signals.push({
                        x: node.x,
                        y: node.y,
                        tx: target.x,
                        ty: target.y,
                        progress: 0,
                        speed: this._signalSpeed / dist,
                        targetIdx: conn.to,
                        hue: node.hue || this._signalHue,
                    });
                }

                node.charge = 0;
            } else {
                node.firing = false;
                node.charge = Math.max(0, node.charge - this._decayRate);
                node.pulseSize *= 0.95;
            }
        }

        // Update signals
        for (let i = this.signals.length - 1; i >= 0; i--) {
            const sig = this.signals[i];
            sig.progress += sig.speed;

            if (sig.progress >= 1) {
                // Deliver charge to target node
                const target = this.nodes[sig.targetIdx];
                if (target && target.refractory <= 0) {
                    target.charge += 1;
                }
                this.signals[i] = this.signals[this.signals.length - 1];
                this.signals.pop();
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw connections (dim)
        ctx.lineWidth = 0.5;
        for (const conn of this.connections) {
            const from = this.nodes[conn.from];
            const to = this.nodes[conn.to];
            if (!from || !to) continue;

            const fromFiring = this.tick - from.lastFire < 10;
            const alpha = fromFiring ? 0.12 : 0.03;
            ctx.strokeStyle = `hsla(${from.hue || this.hue}, ${this.saturation}%, 50%, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
        }

        // Draw signals (traveling pulses)
        for (const sig of this.signals) {
            const x = sig.x + (sig.tx - sig.x) * sig.progress;
            const y = sig.y + (sig.ty - sig.y) * sig.progress;
            const alpha = 0.4 * (1 - sig.progress * 0.5);
            const size = 2 + (1 - sig.progress) * 2;

            ctx.fillStyle = `hsla(${sig.hue}, 80%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, TAU);
            ctx.fill();

            // Signal trail
            const trailX = sig.x + (sig.tx - sig.x) * Math.max(0, sig.progress - 0.15);
            const trailY = sig.y + (sig.ty - sig.y) * Math.max(0, sig.progress - 0.15);
            ctx.strokeStyle = `hsla(${sig.hue}, 70%, 60%, ${alpha * 0.3})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(trailX, trailY);
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        // Draw nodes
        for (const node of this.nodes) {
            const chargeRatio = node.charge / this._fireThreshold;
            const recentFire = this.tick - node.lastFire < 15;
            const baseAlpha = recentFire ? 0.5 : (0.1 + chargeRatio * 0.2);
            const baseLightness = recentFire ? 80 : (40 + chargeRatio * 30);

            // Node body
            ctx.fillStyle = `hsla(${node.hue || this.hue}, ${this.saturation}%, ${baseLightness}%, ${baseAlpha})`;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.size, 0, TAU);
            ctx.fill();

            // Firing pulse
            if (node.pulseSize > 0.5) {
                const pulseAlpha = (node.pulseSize / (node.size * 3)) * 0.2;
                ctx.strokeStyle = `hsla(${node.hue || this.hue}, 80%, 70%, ${pulseAlpha})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.pulseSize, 0, TAU);
                ctx.stroke();
            }

            // Charge indicator (building up)
            if (chargeRatio > 0.3 && !recentFire) {
                ctx.fillStyle = `hsla(${(node.hue || this.hue) + 60}, 90%, 75%, ${chargeRatio * 0.15})`;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size * (1 + chargeRatio), 0, TAU);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
