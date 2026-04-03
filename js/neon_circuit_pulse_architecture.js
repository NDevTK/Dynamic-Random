/**
 * @file neon_circuit_pulse_architecture.js
 * @description A living circuit board where procedurally generated paths carry
 * glowing energy pulses. Mouse clicks inject pulses at nodes. Mouse hover
 * powers nearby circuits. Seed controls: circuit topology (grid/organic/radial),
 * pulse colors, node types, connection density, and animation style.
 */

import { Architecture } from './background_architectures.js';
import { mouse, isLeftMouseDown } from './state.js';

export class NeonCircuitPulseArchitecture extends Architecture {
    constructor() {
        super();
        this.nodes = [];
        this.connections = [];
        this.pulses = [];
        this.pulsePool = [];
        this.palette = [];
        this.topologyStyle = 0;
        this.pulseStyle = 0;
        this.nodeGlowPhase = 0;
        this._lastClickTime = 0;
    }

    init(system) {
        const rng = system.rng;
        const w = system.width;
        const h = system.height;

        // Topology: 0=grid, 1=organic/random, 2=radial, 3=hexagonal, 4=tree
        this.topologyStyle = Math.floor(rng() * 5);

        // Pulse visual style: 0=orb, 1=line segment, 2=spark, 3=wave
        this.pulseStyle = Math.floor(rng() * 4);

        // Color palettes
        const palettes = [
            // Classic circuit green
            [{ h: 120, s: 100, l: 50 }, { h: 140, s: 80, l: 60 }, { h: 100, s: 90, l: 45 }],
            // Cyberpunk magenta
            [{ h: 300, s: 100, l: 55 }, { h: 320, s: 90, l: 50 }, { h: 280, s: 80, l: 60 }],
            // Tron blue
            [{ h: 195, s: 100, l: 55 }, { h: 210, s: 90, l: 50 }, { h: 180, s: 80, l: 60 }],
            // Golden tech
            [{ h: 45, s: 100, l: 55 }, { h: 30, s: 90, l: 50 }, { h: 60, s: 80, l: 45 }],
            // Blood circuit
            [{ h: 0, s: 90, l: 50 }, { h: 15, s: 80, l: 45 }, { h: 345, s: 85, l: 55 }],
        ];
        this.palette = palettes[Math.floor(rng() * palettes.length)];

        // Generate nodes based on topology
        this.nodes = [];
        this.connections = [];

        if (this.topologyStyle === 0) {
            this._generateGrid(w, h, rng);
        } else if (this.topologyStyle === 1) {
            this._generateOrganic(w, h, rng);
        } else if (this.topologyStyle === 2) {
            this._generateRadial(w, h, rng);
        } else if (this.topologyStyle === 3) {
            this._generateHex(w, h, rng);
        } else {
            this._generateTree(w, h, rng);
        }

        // Initialize node properties
        for (const node of this.nodes) {
            node.energy = 0;
            node.maxEnergy = 0.5 + rng() * 0.5;
            node.size = 3 + rng() * 4;
            node.type = Math.floor(rng() * 4); // 0=normal, 1=hub, 2=capacitor, 3=relay
            node.colorIdx = Math.floor(rng() * this.palette.length);
            node.phase = rng() * Math.PI * 2;
            node.pulseRate = 0.01 + rng() * 0.03;
        }

        // Mark some nodes as hubs (bigger, brighter)
        const hubCount = 3 + Math.floor(rng() * 5);
        for (let i = 0; i < hubCount && i < this.nodes.length; i++) {
            const idx = Math.floor(rng() * this.nodes.length);
            this.nodes[idx].type = 1;
            this.nodes[idx].size = 6 + rng() * 4;
            this.nodes[idx].maxEnergy = 1.0;
        }

        this.pulses = [];
        this.pulsePool = [];
        this._lastClickTime = 0;
    }

    _generateGrid(w, h, rng) {
        const spacing = 60 + rng() * 40;
        const jitter = 10 + rng() * 15;
        const cols = Math.floor(w / spacing) + 1;
        const rows = Math.floor(h / spacing) + 1;
        const nodeMap = new Map();

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (rng() < 0.15) continue; // Skip some nodes for variety
                const x = c * spacing + (rng() - 0.5) * jitter;
                const y = r * spacing + (rng() - 0.5) * jitter;
                const node = { x, y, connections: [] };
                nodeMap.set(`${r},${c}`, this.nodes.length);
                this.nodes.push(node);
            }
        }

        // Connect adjacent nodes
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const key = `${r},${c}`;
                if (!nodeMap.has(key)) continue;
                const idx = nodeMap.get(key);

                for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
                    const nkey = `${r + dr},${c + dc}`;
                    if (nodeMap.has(nkey) && rng() < 0.7) {
                        const nIdx = nodeMap.get(nkey);
                        this.connections.push({ from: idx, to: nIdx });
                        this.nodes[idx].connections.push(this.connections.length - 1);
                        this.nodes[nIdx].connections.push(this.connections.length - 1);
                    }
                }
            }
        }
    }

    _generateOrganic(w, h, rng) {
        const count = 40 + Math.floor(rng() * 40);
        for (let i = 0; i < count; i++) {
            this.nodes.push({
                x: rng() * w,
                y: rng() * h,
                connections: []
            });
        }

        // Connect nearby nodes (Delaunay-like)
        const maxDist = 150 + rng() * 100;
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const dx = this.nodes[i].x - this.nodes[j].x;
                const dy = this.nodes[i].y - this.nodes[j].y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < maxDist && rng() < 0.4) {
                    this.connections.push({ from: i, to: j });
                    this.nodes[i].connections.push(this.connections.length - 1);
                    this.nodes[j].connections.push(this.connections.length - 1);
                }
            }
        }
    }

    _generateRadial(w, h, rng) {
        const cx = w / 2;
        const cy = h / 2;
        const rings = 4 + Math.floor(rng() * 4);
        const maxRadius = Math.min(w, h) * 0.45;

        // Center node
        this.nodes.push({ x: cx, y: cy, connections: [] });

        let prevRingStart = 0;
        for (let ring = 1; ring <= rings; ring++) {
            const r = (ring / rings) * maxRadius;
            const nodesInRing = 6 + Math.floor(ring * (3 + rng() * 3));
            const ringStart = this.nodes.length;

            for (let i = 0; i < nodesInRing; i++) {
                const angle = (i / nodesInRing) * Math.PI * 2 + rng() * 0.3;
                const jitter = rng() * 15;
                this.nodes.push({
                    x: cx + Math.cos(angle) * (r + jitter),
                    y: cy + Math.sin(angle) * (r + jitter),
                    connections: []
                });

                // Connect to adjacent in ring
                if (i > 0) {
                    this.connections.push({ from: this.nodes.length - 1, to: this.nodes.length - 2 });
                    this.nodes[this.nodes.length - 1].connections.push(this.connections.length - 1);
                    this.nodes[this.nodes.length - 2].connections.push(this.connections.length - 1);
                }
            }
            // Close ring
            if (nodesInRing > 2) {
                this.connections.push({ from: ringStart, to: this.nodes.length - 1 });
                this.nodes[ringStart].connections.push(this.connections.length - 1);
                this.nodes[this.nodes.length - 1].connections.push(this.connections.length - 1);
            }

            // Connect to previous ring
            for (let i = ringStart; i < this.nodes.length; i++) {
                const prevEnd = ring === 1 ? 1 : ringStart;
                let bestDist = Infinity, bestIdx = prevRingStart;
                for (let j = prevRingStart; j < prevEnd; j++) {
                    const dx = this.nodes[i].x - this.nodes[j].x;
                    const dy = this.nodes[i].y - this.nodes[j].y;
                    const d = dx * dx + dy * dy;
                    if (d < bestDist) { bestDist = d; bestIdx = j; }
                }
                if (rng() < 0.5) {
                    this.connections.push({ from: i, to: bestIdx });
                    this.nodes[i].connections.push(this.connections.length - 1);
                    this.nodes[bestIdx].connections.push(this.connections.length - 1);
                }
            }
            prevRingStart = ringStart;
        }
    }

    _generateHex(w, h, rng) {
        const size = 50 + rng() * 30;
        const hexH = size * Math.sqrt(3);
        const cols = Math.floor(w / (size * 1.5)) + 2;
        const rows = Math.floor(h / hexH) + 2;
        const nodeMap = new Map();

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (rng() < 0.1) continue;
                const offset = (r % 2) * size * 0.75;
                const x = c * size * 1.5 + offset;
                const y = r * hexH * 0.5;
                nodeMap.set(`${r},${c}`, this.nodes.length);
                this.nodes.push({ x, y, connections: [] });
            }
        }

        // Connect hex neighbors
        const neighbors = [[0, 1], [1, 0], [-1, 1]];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const key = `${r},${c}`;
                if (!nodeMap.has(key)) continue;
                const idx = nodeMap.get(key);
                for (const [dr, dc] of neighbors) {
                    const nkey = `${r + dr},${c + dc}`;
                    if (nodeMap.has(nkey) && rng() < 0.75) {
                        const nIdx = nodeMap.get(nkey);
                        this.connections.push({ from: idx, to: nIdx });
                        this.nodes[idx].connections.push(this.connections.length - 1);
                        this.nodes[nIdx].connections.push(this.connections.length - 1);
                    }
                }
            }
        }
    }

    _generateTree(w, h, rng) {
        // Fractal tree from center bottom
        const startX = w * (0.3 + rng() * 0.4);
        const startY = h * 0.9;
        this.nodes.push({ x: startX, y: startY, connections: [] });
        this._growBranch(0, -Math.PI / 2, 120 + rng() * 80, 5 + Math.floor(rng() * 3), rng);
    }

    _growBranch(parentIdx, angle, length, depth, rng) {
        if (depth <= 0 || this.nodes.length > 200) return;

        const parent = this.nodes[parentIdx];
        const x = parent.x + Math.cos(angle) * length;
        const y = parent.y + Math.sin(angle) * length;
        const nodeIdx = this.nodes.length;
        this.nodes.push({ x, y, connections: [] });
        this.connections.push({ from: parentIdx, to: nodeIdx });
        this.nodes[parentIdx].connections.push(this.connections.length - 1);
        this.nodes[nodeIdx].connections.push(this.connections.length - 1);

        const branches = 2 + (rng() < 0.3 ? 1 : 0);
        const spread = 0.3 + rng() * 0.5;
        for (let i = 0; i < branches; i++) {
            const branchAngle = angle + (i - (branches - 1) / 2) * spread + (rng() - 0.5) * 0.3;
            this._growBranch(nodeIdx, branchAngle, length * (0.6 + rng() * 0.2), depth - 1, rng);
        }
    }

    update(system) {
        this.nodeGlowPhase += 0.02;
        const mx = mouse.x;
        const my = mouse.y;

        // Mouse proximity powers nearby nodes
        for (const node of this.nodes) {
            const dx = mx - node.x;
            const dy = my - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                node.energy = Math.min(node.maxEnergy, node.energy + (1 - dist / 150) * 0.05);
            }
            // Natural decay
            node.energy *= 0.995;

            // Hub nodes periodically emit pulses
            if (node.type === 1 && node.energy > 0.3 && system.tick % 60 === 0 && this.pulses.length < 200) {
                this._emitPulse(node, system.rng);
            }
        }

        // Click injects a burst of energy
        if (isLeftMouseDown && performance.now() - this._lastClickTime > 200) {
            this._lastClickTime = performance.now();
            let closest = null, closestDist = Infinity;
            for (const node of this.nodes) {
                const dx = mx - node.x;
                const dy = my - node.y;
                const d = dx * dx + dy * dy;
                if (d < closestDist) { closestDist = d; closest = node; }
            }
            if (closest && closestDist < 10000) {
                closest.energy = closest.maxEnergy;
                // Emit pulses from clicked node
                for (let i = 0; i < Math.min(closest.connections.length, 5); i++) {
                    this._emitPulse(closest, system.rng);
                }
            }
        }

        // Update pulses
        for (let i = this.pulses.length - 1; i >= 0; i--) {
            const p = this.pulses[i];
            p.progress += p.speed * system.speedMultiplier;
            if (p.progress >= 1) {
                // Arrive at destination node - energize it and maybe continue
                const destNode = this.nodes[p.to];
                if (destNode) {
                    destNode.energy = Math.min(destNode.maxEnergy, destNode.energy + 0.3);
                    // Chain reaction: relay nodes forward the pulse
                    if ((destNode.type === 3 || destNode.energy > 0.5) && p.hops < 5 && this.pulses.length < 200) {
                        this._emitPulse(destNode, system.rng, p.hops + 1, p.colorIdx);
                    }
                }
                if (this.pulsePool.length < 200) this.pulsePool.push(p);
                this.pulses[i] = this.pulses[this.pulses.length - 1];
                this.pulses.pop();
            }
        }
    }

    _emitPulse(node, rng, hops = 0, colorIdx) {
        if (node.connections.length === 0) return;
        const connIdx = node.connections[Math.floor(rng() * node.connections.length)];
        const conn = this.connections[connIdx];
        if (!conn) return;
        const fromIdx = this.nodes.indexOf(node);
        const toIdx = conn.from === fromIdx ? conn.to : conn.from;

        let p = this.pulsePool.length > 0 ? this.pulsePool.pop() : {};
        p.from = fromIdx;
        p.to = toIdx;
        p.progress = 0;
        p.speed = 0.015 + rng() * 0.025;
        p.size = 3 + rng() * 3;
        p.colorIdx = colorIdx !== undefined ? colorIdx : Math.floor(rng() * this.palette.length);
        p.hops = hops;
        this.pulses.push(p);
    }

    draw(system) {
        const ctx = system.ctx;

        // Draw connections
        ctx.lineWidth = 1;
        for (const conn of this.connections) {
            const a = this.nodes[conn.from];
            const b = this.nodes[conn.to];
            if (!a || !b) continue;
            const energy = Math.max(a.energy, b.energy);
            const c = this.palette[a.colorIdx || 0];
            const alpha = 0.05 + energy * 0.2;
            ctx.strokeStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }

        // Draw nodes
        for (const node of this.nodes) {
            const c = this.palette[node.colorIdx];
            const baseAlpha = 0.15 + node.energy * 0.6;
            const pulse = Math.sin(node.phase + this.nodeGlowPhase * (node.pulseRate * 100)) * 0.1;
            const alpha = Math.min(1, baseAlpha + pulse);
            const size = node.size * (1 + node.energy * 0.5);

            // Glow
            if (node.energy > 0.1 || node.type === 1) {
                ctx.globalCompositeOperation = 'lighter';
                const g = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 4);
                g.addColorStop(0, `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha * 0.3})`);
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(node.x, node.y, size * 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
            }

            // Core
            ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha})`;
            ctx.beginPath();
            if (node.type === 1) {
                // Hub: diamond shape
                ctx.moveTo(node.x, node.y - size);
                ctx.lineTo(node.x + size, node.y);
                ctx.lineTo(node.x, node.y + size);
                ctx.lineTo(node.x - size, node.y);
                ctx.closePath();
            } else if (node.type === 2) {
                // Capacitor: square
                ctx.rect(node.x - size / 2, node.y - size / 2, size, size);
            } else {
                ctx.arc(node.x, node.y, size / 2, 0, Math.PI * 2);
            }
            ctx.fill();
        }

        // Draw pulses
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.pulses) {
            const from = this.nodes[p.from];
            const to = this.nodes[p.to];
            if (!from || !to) continue;

            const x = from.x + (to.x - from.x) * p.progress;
            const y = from.y + (to.y - from.y) * p.progress;
            const c = this.palette[p.colorIdx];
            const alpha = 0.7 + Math.sin(p.progress * Math.PI) * 0.3;

            if (this.pulseStyle === 0) {
                // Orb
                const g = ctx.createRadialGradient(x, y, 0, x, y, p.size * 3);
                g.addColorStop(0, `hsla(${c.h}, ${c.s}%, ${Math.min(100, c.l + 20)}%, ${alpha})`);
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(x, y, p.size * 3, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.pulseStyle === 1) {
                // Line segment
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const nx = dx / (len || 1);
                const ny = dy / (len || 1);
                ctx.strokeStyle = `hsla(${c.h}, ${c.s}%, ${c.l + 15}%, ${alpha})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x - nx * 8, y - ny * 8);
                ctx.lineTo(x + nx * 8, y + ny * 8);
                ctx.stroke();
            } else if (this.pulseStyle === 2) {
                // Spark
                ctx.fillStyle = `hsla(${c.h}, ${c.s}%, 90%, ${alpha})`;
                ctx.fillRect(x - 1, y - 1, 3, 3);
                // Spark trail
                const prevX = from.x + (to.x - from.x) * Math.max(0, p.progress - 0.1);
                const prevY = from.y + (to.y - from.y) * Math.max(0, p.progress - 0.1);
                ctx.strokeStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha * 0.4})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(x, y);
                ctx.stroke();
            } else {
                // Wave
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const angle = Math.atan2(dy, dx);
                const perpX = -Math.sin(angle);
                const perpY = Math.cos(angle);
                const wave = Math.sin(p.progress * Math.PI * 4) * 5;
                ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l + 10}%, ${alpha})`;
                ctx.beginPath();
                ctx.arc(x + perpX * wave, y + perpY * wave, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalCompositeOperation = 'source-over';
    }
}
