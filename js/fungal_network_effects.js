/**
 * @file fungal_network_effects.js
 * @description A growing mycelium-like network that spreads from interaction points.
 * Nodes pulse with nutrients that visibly flow through the network. The cursor acts
 * as a nutrient source; clicks spawn new growth points that branch organically.
 *
 * Modes:
 * 0 - Mycelium Web: White/pale branching threads with nutrient pulses
 * 1 - Neural Garden: Bioluminescent network with synapse-like flashes at junctions
 * 2 - Blood Vessels: Pulsating red/purple arteries and veins with flowing cells
 * 3 - Root System: Thick roots that branch into fine rootlets, drawn with thickness
 * 4 - Circuit Traces: PCB-like orthogonal paths with signal pulses at 90-degree turns
 * 5 - Slime Mold: Physarum-like network that optimizes paths between food sources
 */

const TAU = Math.PI * 2;

export class FungalNetwork {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        this.nodes = [];
        this.edges = [];
        this.maxNodes = 300;
        this.maxEdges = 400;

        // Growth tips (active growing ends)
        this.tips = [];
        this.maxTips = 40;

        // Nutrient pulses
        this.pulses = [];
        this.pulsePool = [];
        this.maxPulses = 60;

        // Food sources for slime mold
        this._foodSources = [];
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.nodes = [];
        this.edges = [];
        this.tips = [];
        this.pulses = [];
        this._foodSources = [];
        this.intensity = 0.6 + rng() * 0.6;

        switch (this.mode) {
            case 0: this.hue = palette.length > 0 ? palette[0].h : 60; break;  // pale gold
            case 1: this.hue = palette.length > 0 ? palette[0].h : 180; break; // cyan bioluminescent
            case 2: this.hue = palette.length > 0 ? palette[0].h : 350; break; // blood red
            case 3: this.hue = palette.length > 0 ? palette[0].h : 30; break;  // earthy brown
            case 4: this.hue = palette.length > 0 ? palette[0].h : 120; break; // circuit green
            case 5: this.hue = palette.length > 0 ? palette[0].h : 50; break;  // slime yellow
        }

        // Seed initial growth points
        const W = window.innerWidth, H = window.innerHeight;
        const startCount = 3 + Math.floor(rng() * 3);
        for (let i = 0; i < startCount; i++) {
            const x = rng() * W;
            const y = rng() * H;
            this._addNode(x, y);
            this._addTip(this.nodes.length - 1, rng() * TAU);
        }

        if (this.mode === 5) {
            const foodCount = 5 + Math.floor(rng() * 5);
            for (let i = 0; i < foodCount; i++) {
                this._foodSources.push({
                    x: rng() * W,
                    y: rng() * H,
                    strength: 0.5 + rng() * 0.5
                });
            }
        }
    }

    _addNode(x, y) {
        if (this.nodes.length >= this.maxNodes) return -1;
        this.nodes.push({ x, y, nutrient: 0, connections: 0 });
        return this.nodes.length - 1;
    }

    _addEdge(from, to) {
        if (this.edges.length >= this.maxEdges) return;
        const n1 = this.nodes[from], n2 = this.nodes[to];
        if (!n1 || !n2) return;
        const dx = n2.x - n1.x, dy = n2.y - n1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        this.edges.push({ from, to, len, flow: 0, age: 0 });
        n1.connections++;
        n2.connections++;
    }

    _addTip(nodeIdx, angle) {
        if (this.tips.length >= this.maxTips) return;
        this.tips.push({
            nodeIdx,
            angle,
            speed: 1.5 + Math.random() * 2,
            branchProb: 0.02 + Math.random() * 0.03,
            stepCount: 0,
            maxSteps: 20 + Math.floor(Math.random() * 40)
        });
    }

    _prand(seed) {
        return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
    }

    _findNearestNode(x, y, maxDist) {
        let nearest = -1, nearDistSq = maxDist * maxDist;
        for (let i = 0; i < this.nodes.length; i++) {
            const n = this.nodes[i];
            const dx = n.x - x, dy = n.y - y;
            const dSq = dx * dx + dy * dy;
            if (dSq < nearDistSq) {
                nearDistSq = dSq;
                nearest = i;
            }
        }
        return nearest;
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        // Click spawns new growth
        if (isClicking && !this._wasClicking) {
            const ni = this._addNode(mx, my);
            if (ni >= 0) {
                const branches = 2 + Math.floor(Math.random() * 3);
                for (let b = 0; b < branches; b++) {
                    this._addTip(ni, (b / branches) * TAU + Math.random() * 0.5);
                }
                // Connect to nearest existing node
                const nearest = this._findNearestNode(mx, my, 150);
                if (nearest >= 0 && nearest !== ni) {
                    this._addEdge(ni, nearest);
                }
                // Spawn nutrient pulse
                this._spawnPulse(ni);
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Cursor feeds nearby nodes
        for (const n of this.nodes) {
            const dx = mx - n.x, dy = my - n.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 22500) { // 150px
                n.nutrient = Math.min(1, n.nutrient + 0.02 * (1 - Math.sqrt(distSq) / 150));
            }
            n.nutrient *= 0.997; // slow decay
        }

        // Grow tips
        const W = window.innerWidth, H = window.innerHeight;
        for (let i = this.tips.length - 1; i >= 0; i--) {
            const tip = this.tips[i];
            tip.stepCount++;

            if (tip.stepCount > tip.maxSteps || this.nodes.length >= this.maxNodes) {
                this.tips[i] = this.tips[this.tips.length - 1];
                this.tips.pop();
                continue;
            }

            if (this.tick % 3 !== 0) continue;

            const parent = this.nodes[tip.nodeIdx];
            if (!parent) continue;

            // Direction influenced by mode
            let angleWander = (this._prand(this.tick * 7 + i * 31) - 0.5) * 0.8;

            if (this.mode === 4) {
                // Circuit: snap to 90-degree increments
                angleWander = Math.round(angleWander * 2 / Math.PI) * (Math.PI / 2);
            }

            if (this.mode === 5) {
                // Slime mold: bias toward food
                let bestFood = null, bestDist = Infinity;
                for (const food of this._foodSources) {
                    const d = Math.hypot(food.x - parent.x, food.y - parent.y);
                    if (d < bestDist) { bestDist = d; bestFood = food; }
                }
                if (bestFood && bestDist > 20) {
                    const toFood = Math.atan2(bestFood.y - parent.y, bestFood.x - parent.x);
                    tip.angle += (toFood - tip.angle) * 0.2;
                }
            }

            tip.angle += angleWander;
            const stepLen = this.mode === 4 ? 20 : 10 + tip.speed * 5;
            const nx = parent.x + Math.cos(tip.angle) * stepLen;
            const ny = parent.y + Math.sin(tip.angle) * stepLen;

            // Bounds check
            if (nx < 0 || nx > W || ny < 0 || ny > H) {
                this.tips[i] = this.tips[this.tips.length - 1];
                this.tips.pop();
                continue;
            }

            // Check for merge with existing node
            const existing = this._findNearestNode(nx, ny, 25);
            if (existing >= 0 && existing !== tip.nodeIdx) {
                this._addEdge(tip.nodeIdx, existing);
                tip.nodeIdx = existing;
            } else {
                const newIdx = this._addNode(nx, ny);
                if (newIdx >= 0) {
                    this._addEdge(tip.nodeIdx, newIdx);
                    tip.nodeIdx = newIdx;
                }
            }

            // Branch
            if (this._prand(this.tick * 13 + i * 41) < tip.branchProb) {
                const branchAngle = tip.angle + (this._prand(this.tick + i * 97) > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.8);
                this._addTip(tip.nodeIdx, branchAngle);
            }
        }

        // Update pulses
        for (let i = this.pulses.length - 1; i >= 0; i--) {
            const p = this.pulses[i];
            p.progress += 0.03;
            if (p.progress >= 1) {
                // Arrived at destination node
                const dest = this.nodes[p.toNode];
                if (dest) {
                    dest.nutrient = Math.min(1, dest.nutrient + 0.3);
                    // Continue to connected edge
                    const nextEdges = this.edges.filter(
                        e => (e.from === p.toNode || e.to === p.toNode) && e !== p.edge
                    );
                    if (nextEdges.length > 0 && this.pulses.length < this.maxPulses) {
                        const next = nextEdges[Math.floor(this._prand(this.tick + i) * nextEdges.length)];
                        const nextTo = next.from === p.toNode ? next.to : next.from;
                        this._spawnPulseOnEdge(next, p.toNode, nextTo);
                    }
                }
                this.pulsePool.push(p);
                this.pulses[i] = this.pulses[this.pulses.length - 1];
                this.pulses.pop();
            }
        }

        // Periodic edge flow animation
        for (const e of this.edges) {
            e.age++;
            e.flow = (e.flow + 0.01) % 1;
        }

        // Spontaneous pulses from high-nutrient nodes
        if (this.tick % 20 === 0 && this.pulses.length < this.maxPulses) {
            for (let ni = 0; ni < this.nodes.length; ni++) {
                if (this.nodes[ni].nutrient > 0.5) {
                    this._spawnPulse(ni);
                    break;
                }
            }
        }
    }

    _spawnPulse(nodeIdx) {
        const connected = this.edges.filter(e => e.from === nodeIdx || e.to === nodeIdx);
        for (const edge of connected) {
            if (this.pulses.length >= this.maxPulses) break;
            const toNode = edge.from === nodeIdx ? edge.to : edge.from;
            this._spawnPulseOnEdge(edge, nodeIdx, toNode);
        }
    }

    _spawnPulseOnEdge(edge, fromNode, toNode) {
        if (this.pulses.length >= this.maxPulses) return;
        const p = this.pulsePool.length > 0 ? this.pulsePool.pop() : {};
        p.edge = edge;
        p.fromNode = fromNode;
        p.toNode = toNode;
        p.progress = 0;
        p.hueOffset = Math.random() * 30 - 15;
        this.pulses.push(p);
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw edges
        for (const e of this.edges) {
            const n1 = this.nodes[e.from], n2 = this.nodes[e.to];
            if (!n1 || !n2) continue;

            const nutrient = Math.max(n1.nutrient, n2.nutrient);
            const ageAlpha = Math.min(1, e.age / 30);
            let alpha, width, hue, lightness;

            switch (this.mode) {
                case 0: // Mycelium
                    alpha = (0.05 + nutrient * 0.15) * ageAlpha * this.intensity;
                    width = 0.5 + nutrient * 1.5;
                    hue = this.hue;
                    lightness = 70 + nutrient * 20;
                    break;
                case 1: // Neural garden
                    alpha = (0.04 + nutrient * 0.2) * ageAlpha * this.intensity;
                    width = 0.8 + nutrient;
                    hue = this.hue + nutrient * 30;
                    lightness = 50 + nutrient * 40;
                    break;
                case 2: // Blood vessels
                    alpha = (0.08 + nutrient * 0.2) * ageAlpha * this.intensity;
                    width = 1 + nutrient * 3 + Math.sin(this.tick * 0.05 + e.from) * 0.5;
                    hue = this.hue;
                    lightness = 35 + nutrient * 25;
                    break;
                case 3: // Roots
                    alpha = (0.1 + nutrient * 0.15) * ageAlpha * this.intensity;
                    width = 0.5 + (1 - n1.connections / 6) * 3;
                    hue = this.hue;
                    lightness = 30 + nutrient * 20;
                    break;
                case 4: // Circuit
                    alpha = (0.06 + nutrient * 0.25) * ageAlpha * this.intensity;
                    width = 1.5;
                    hue = this.hue;
                    lightness = 55 + nutrient * 35;
                    break;
                case 5: // Slime mold
                    alpha = (0.06 + nutrient * 0.18) * ageAlpha * this.intensity;
                    width = 1 + nutrient * 2;
                    hue = this.hue;
                    lightness = 50 + nutrient * 30;
                    break;
                default:
                    alpha = 0.1 * this.intensity;
                    width = 1;
                    hue = this.hue;
                    lightness = 60;
            }

            ctx.strokeStyle = `hsla(${hue}, 60%, ${lightness}%, ${alpha})`;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
        }

        // Draw nutrient pulses
        for (const p of this.pulses) {
            const from = this.nodes[p.fromNode];
            const to = this.nodes[p.toNode];
            if (!from || !to) continue;
            const x = from.x + (to.x - from.x) * p.progress;
            const y = from.y + (to.y - from.y) * p.progress;
            const alpha = Math.sin(p.progress * Math.PI) * 0.5 * this.intensity;
            const pulseHue = (this.hue + (p.hueOffset || 0) + 360) % 360;

            // Glow
            ctx.fillStyle = `hsla(${pulseHue}, 80%, 75%, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, TAU);
            ctx.fill();

            // Core
            ctx.fillStyle = `hsla(${pulseHue}, 90%, 85%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, TAU);
            ctx.fill();
        }

        // Draw nodes (junction points)
        for (const n of this.nodes) {
            if (n.connections < 2 && n.nutrient < 0.1) continue;
            const alpha = (0.03 + n.nutrient * 0.2) * this.intensity;
            const size = 1 + n.nutrient * 3 + (n.connections > 2 ? 1 : 0);

            if (this.mode === 1 && n.nutrient > 0.4) {
                // Neural flash
                const flashAlpha = n.nutrient * 0.15 * this.intensity;
                ctx.fillStyle = `hsla(${this.hue + 30}, 90%, 85%, ${flashAlpha})`;
                ctx.beginPath();
                ctx.arc(n.x, n.y, size * 3, 0, TAU);
                ctx.fill();
            }

            ctx.fillStyle = `hsla(${this.hue}, 60%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, size, 0, TAU);
            ctx.fill();
        }

        // Slime mold: draw food sources
        if (this.mode === 5) {
            for (const food of this._foodSources) {
                const pulse = Math.sin(this.tick * 0.03) * 0.5 + 0.5;
                ctx.fillStyle = `hsla(${this.hue + 40}, 80%, 60%, ${(0.1 + pulse * 0.1) * this.intensity})`;
                ctx.beginPath();
                ctx.arc(food.x, food.y, 5 + pulse * 3, 0, TAU);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
