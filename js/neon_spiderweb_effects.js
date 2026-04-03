/**
 * @file neon_spiderweb_effects.js
 * @description Procedural glowing spiderwebs with luminous dew drops that react to
 * cursor proximity. Webs tremble when the cursor passes nearby, dew drops glow and
 * drip when disturbed. Clicking breaks web strands which regenerate over time.
 *
 * Modes:
 * 0 - Classic Orb Web: Concentric rings with radial threads, symmetrical
 * 1 - Funnel Web: Dense center with spreading chaotic threads
 * 2 - Hammock Web: Horizontal sheet web with vertical support threads
 * 3 - Cobweb: Irregular tangled web with random connections
 * 4 - Dewdrop Galaxy: Many tiny webs scattered like a galaxy of gems
 * 5 - Electric Web: Neon-pulsing web strands that carry visible energy along threads
 */

const TAU = Math.PI * 2;

function _prand(seed) {
    return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
}

export class NeonSpiderweb {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Web nodes and connections
        this._nodes = [];
        this._strands = [];
        this._maxNodes = 200;

        // Dew drops sitting on strands
        this._dewDrops = [];

        // Broken strands (regenerate over time)
        this._brokenStrands = new Set();

        // Web centers (for multi-web modes)
        this._webCenters = [];

        // Energy pulses traveling along strands
        this._pulses = [];
        this._pulsePool = [];
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : 280;
        this.intensity = 0.4 + rng() * 0.6;
        this._nodes = [];
        this._strands = [];
        this._dewDrops = [];
        this._brokenStrands = new Set();
        this._pulses = [];
        this._webCenters = [];

        const W = window.innerWidth, H = window.innerHeight;

        if (this.mode === 0) {
            this._buildOrbWeb(rng, W, H);
        } else if (this.mode === 1) {
            this._buildFunnelWeb(rng, W, H);
        } else if (this.mode === 2) {
            this._buildHammockWeb(rng, W, H);
        } else if (this.mode === 3) {
            this._buildCobweb(rng, W, H);
        } else if (this.mode === 4) {
            this._buildDewdropGalaxy(rng, W, H);
        } else if (this.mode === 5) {
            this._buildElectricWeb(rng, W, H);
        }

        // Place dew drops on random strands
        const dewCount = 10 + Math.floor(rng() * 30);
        for (let i = 0; i < dewCount && this._strands.length > 0; i++) {
            const strandIdx = Math.floor(rng() * this._strands.length);
            const s = this._strands[strandIdx];
            const t = 0.2 + rng() * 0.6; // Position along strand
            this._dewDrops.push({
                strandIdx,
                t,
                x: 0, y: 0, // Computed each frame
                size: 2 + rng() * 4,
                hue: (this.hue + rng() * 60) % 360,
                brightness: 0.5 + rng() * 0.5,
                drip: 0, // How much it's dripping
                wobble: 0,
            });
        }
    }

    _buildOrbWeb(rng, W, H) {
        const cx = W * (0.3 + rng() * 0.4);
        const cy = H * (0.3 + rng() * 0.4);
        this._webCenters.push({ x: cx, y: cy });

        const radialCount = 12 + Math.floor(rng() * 12);
        const ringCount = 6 + Math.floor(rng() * 8);
        const maxR = Math.min(W, H) * (0.2 + rng() * 0.2);

        // Center node
        const centerIdx = this._nodes.length;
        this._nodes.push({ x: cx, y: cy, baseX: cx, baseY: cy, vx: 0, vy: 0 });

        // Radial nodes and connections
        for (let r = 0; r < radialCount; r++) {
            const angle = (r / radialCount) * TAU + (rng() - 0.5) * 0.1;
            let prevIdx = centerIdx;
            for (let ring = 1; ring <= ringCount; ring++) {
                const dist = (ring / ringCount) * maxR;
                const wobble = (rng() - 0.5) * 10;
                const nx = cx + Math.cos(angle) * (dist + wobble);
                const ny = cy + Math.sin(angle) * (dist + wobble);
                const nodeIdx = this._nodes.length;
                this._nodes.push({ x: nx, y: ny, baseX: nx, baseY: ny, vx: 0, vy: 0 });
                // Radial strand
                this._strands.push({ a: prevIdx, b: nodeIdx });
                prevIdx = nodeIdx;
            }
        }

        // Spiral/ring connections
        for (let ring = 1; ring <= ringCount; ring++) {
            for (let r = 0; r < radialCount; r++) {
                const idx1 = centerIdx + 1 + r * ringCount + (ring - 1);
                const idx2 = centerIdx + 1 + ((r + 1) % radialCount) * ringCount + (ring - 1);
                if (idx1 < this._nodes.length && idx2 < this._nodes.length) {
                    this._strands.push({ a: idx1, b: idx2 });
                }
            }
        }
    }

    _buildFunnelWeb(rng, W, H) {
        const cx = W * (0.3 + rng() * 0.4);
        const cy = H * (0.3 + rng() * 0.4);
        this._webCenters.push({ x: cx, y: cy });

        // Dense center cluster
        const centerNodes = 20 + Math.floor(rng() * 15);
        for (let i = 0; i < centerNodes; i++) {
            const angle = rng() * TAU;
            const dist = rng() * rng() * 80; // Concentrate near center
            this._nodes.push({
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist,
                baseX: cx + Math.cos(angle) * dist,
                baseY: cy + Math.sin(angle) * dist,
                vx: 0, vy: 0,
            });
        }

        // Spreading threads
        const spreadCount = 15 + Math.floor(rng() * 15);
        for (let i = 0; i < spreadCount; i++) {
            const angle = rng() * TAU;
            const dist = 100 + rng() * 200;
            const nx = cx + Math.cos(angle) * dist;
            const ny = cy + Math.sin(angle) * dist;
            const nodeIdx = this._nodes.length;
            this._nodes.push({ x: nx, y: ny, baseX: nx, baseY: ny, vx: 0, vy: 0 });
            // Connect to random center node
            const centerIdx = Math.floor(rng() * centerNodes);
            this._strands.push({ a: centerIdx, b: nodeIdx });
            // Maybe connect to another spread node
            if (rng() > 0.5 && nodeIdx > centerNodes) {
                this._strands.push({ a: nodeIdx - 1, b: nodeIdx });
            }
        }

        // Cross-connections in center
        for (let i = 0; i < centerNodes; i++) {
            const j = Math.floor(rng() * centerNodes);
            if (i !== j) {
                this._strands.push({ a: i, b: j });
            }
        }
    }

    _buildHammockWeb(rng, W, H) {
        const y0 = H * (0.3 + rng() * 0.3);
        const cols = 15 + Math.floor(rng() * 10);
        const rows = 8 + Math.floor(rng() * 6);
        const spacingX = W * 0.7 / cols;
        const spacingY = H * 0.3 / rows;
        const startX = W * 0.15;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const sag = Math.sin((col / (cols - 1)) * Math.PI) * 30 * (row / rows);
                const nx = startX + col * spacingX + (rng() - 0.5) * 5;
                const ny = y0 + row * spacingY + sag + (rng() - 0.5) * 5;
                this._nodes.push({ x: nx, y: ny, baseX: nx, baseY: ny, vx: 0, vy: 0 });
            }
        }

        // Horizontal strands
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols - 1; col++) {
                this._strands.push({ a: row * cols + col, b: row * cols + col + 1 });
            }
        }

        // Vertical strands
        for (let row = 0; row < rows - 1; row++) {
            for (let col = 0; col < cols; col++) {
                if (rng() > 0.3) {
                    this._strands.push({ a: row * cols + col, b: (row + 1) * cols + col });
                }
            }
        }

        // Diagonal support threads from top corners
        const topLeft = { x: startX - 20, y: y0 - 50, baseX: startX - 20, baseY: y0 - 50, vx: 0, vy: 0 };
        const topRight = { x: startX + cols * spacingX + 20, y: y0 - 50, baseX: startX + cols * spacingX + 20, baseY: y0 - 50, vx: 0, vy: 0 };
        const tl = this._nodes.length;
        this._nodes.push(topLeft);
        const tr = this._nodes.length;
        this._nodes.push(topRight);

        this._strands.push({ a: tl, b: 0 });
        this._strands.push({ a: tr, b: cols - 1 });
    }

    _buildCobweb(rng, W, H) {
        const nodeCount = 40 + Math.floor(rng() * 40);
        const cx = W * 0.5;
        const cy = H * 0.5;

        for (let i = 0; i < nodeCount; i++) {
            const angle = rng() * TAU;
            const dist = rng() * Math.min(W, H) * 0.35;
            const nx = cx + Math.cos(angle) * dist;
            const ny = cy + Math.sin(angle) * dist;
            this._nodes.push({ x: nx, y: ny, baseX: nx, baseY: ny, vx: 0, vy: 0 });
        }

        // Random connections (nearest neighbors + some random)
        for (let i = 0; i < nodeCount; i++) {
            // Connect to 2-4 nearest
            const dists = [];
            for (let j = 0; j < nodeCount; j++) {
                if (i === j) continue;
                const dx = this._nodes[i].x - this._nodes[j].x;
                const dy = this._nodes[i].y - this._nodes[j].y;
                dists.push({ idx: j, d: dx * dx + dy * dy });
            }
            dists.sort((a, b) => a.d - b.d);
            const connectCount = 2 + Math.floor(rng() * 3);
            for (let k = 0; k < connectCount && k < dists.length; k++) {
                this._strands.push({ a: i, b: dists[k].idx });
            }
        }
    }

    _buildDewdropGalaxy(rng, W, H) {
        const webCount = 5 + Math.floor(rng() * 8);
        for (let w = 0; w < webCount; w++) {
            const cx = rng() * W;
            const cy = rng() * H;
            const size = 40 + rng() * 80;
            this._webCenters.push({ x: cx, y: cy });

            const spokes = 5 + Math.floor(rng() * 6);
            const rings = 2 + Math.floor(rng() * 3);
            const centerIdx = this._nodes.length;
            this._nodes.push({ x: cx, y: cy, baseX: cx, baseY: cy, vx: 0, vy: 0 });

            for (let s = 0; s < spokes; s++) {
                const angle = (s / spokes) * TAU;
                let prevIdx = centerIdx;
                for (let r = 1; r <= rings; r++) {
                    const dist = (r / rings) * size;
                    const nx = cx + Math.cos(angle) * dist;
                    const ny = cy + Math.sin(angle) * dist;
                    const nodeIdx = this._nodes.length;
                    this._nodes.push({ x: nx, y: ny, baseX: nx, baseY: ny, vx: 0, vy: 0 });
                    this._strands.push({ a: prevIdx, b: nodeIdx });
                    prevIdx = nodeIdx;
                }
            }

            // Ring connections
            for (let r = 1; r <= rings; r++) {
                for (let s = 0; s < spokes; s++) {
                    const idx1 = centerIdx + 1 + s * rings + (r - 1);
                    const idx2 = centerIdx + 1 + ((s + 1) % spokes) * rings + (r - 1);
                    if (idx1 < this._nodes.length && idx2 < this._nodes.length) {
                        this._strands.push({ a: idx1, b: idx2 });
                    }
                }
            }
        }
    }

    _buildElectricWeb(rng, W, H) {
        // Build orb web as base, then configure for energy pulses
        this._buildOrbWeb(rng, W, H);
    }

    update(mx, my, isClicking, system) {
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._wasClicking = this._isClicking;
        this._isClicking = isClicking;
        this.tick++;

        // Click breaks nearby strands
        if (this._isClicking && !this._wasClicking) {
            for (let i = 0; i < this._strands.length; i++) {
                if (this._brokenStrands.has(i)) continue;
                const s = this._strands[i];
                const na = this._nodes[s.a];
                const nb = this._nodes[s.b];
                // Point-to-segment distance
                const midX = (na.x + nb.x) / 2;
                const midY = (na.y + nb.y) / 2;
                const dx = midX - mx;
                const dy = midY - my;
                if (dx * dx + dy * dy < 2500) { // 50px radius
                    this._brokenStrands.add(i);
                }
            }

            // Spawn energy pulse on electric web
            if (this.mode === 5 && this._strands.length > 0) {
                const strandIdx = Math.floor(Math.random() * this._strands.length);
                if (!this._brokenStrands.has(strandIdx) && this._pulses.length < 30) {
                    const p = this._pulsePool.length > 0 ? this._pulsePool.pop() : {};
                    p.strandIdx = strandIdx;
                    p.t = 0;
                    p.speed = 0.02 + Math.random() * 0.03;
                    p.hue = (this.hue + Math.random() * 60) % 360;
                    p.life = 1;
                    this._pulses.push(p);
                }
            }
        }

        // Regenerate broken strands slowly
        if (this.tick % 60 === 0 && this._brokenStrands.size > 0) {
            const arr = [...this._brokenStrands];
            this._brokenStrands.delete(arr[Math.floor(Math.random() * arr.length)]);
        }

        // Node physics: cursor proximity causes trembling
        for (const node of this._nodes) {
            const dx = node.x - mx;
            const dy = node.y - my;
            const distSq = dx * dx + dy * dy;

            if (distSq < 40000) { // 200px radius
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / 200) * 3;
                node.vx += (dx / dist) * force;
                node.vy += (dy / dist) * force;
            }

            // Spring back to base position
            node.vx += (node.baseX - node.x) * 0.05;
            node.vy += (node.baseY - node.y) * 0.05;
            node.vx *= 0.85;
            node.vy *= 0.85;
            node.x += node.vx;
            node.y += node.vy;
        }

        // Update dew drops
        for (const dew of this._dewDrops) {
            const s = this._strands[dew.strandIdx];
            if (!s) continue;
            const na = this._nodes[s.a];
            const nb = this._nodes[s.b];
            dew.x = na.x + (nb.x - na.x) * dew.t;
            dew.y = na.y + (nb.y - na.y) * dew.t;

            // Drip when disturbed
            const dx = dew.x - mx;
            const dy = dew.y - my;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
                dew.wobble = Math.min(1, dew.wobble + 0.1);
                dew.drip = Math.min(8, dew.drip + 0.05);
            } else {
                dew.wobble *= 0.95;
                dew.drip *= 0.98;
            }
        }

        // Update energy pulses (electric web mode)
        for (let i = this._pulses.length - 1; i >= 0; i--) {
            const p = this._pulses[i];
            p.t += p.speed;
            if (p.t > 1) {
                // Jump to connected strand
                const s = this._strands[p.strandIdx];
                const endNode = s.b;
                // Find connected strands
                let jumped = false;
                for (let j = 0; j < this._strands.length; j++) {
                    if (j === p.strandIdx || this._brokenStrands.has(j)) continue;
                    if (this._strands[j].a === endNode || this._strands[j].b === endNode) {
                        p.strandIdx = j;
                        p.t = this._strands[j].a === endNode ? 0 : 1;
                        p.speed = this._strands[j].a === endNode ? Math.abs(p.speed) : -Math.abs(p.speed);
                        p.life -= 0.15;
                        jumped = true;
                        break;
                    }
                }
                if (!jumped || p.life <= 0) {
                    this._pulsePool.push(p);
                    this._pulses[i] = this._pulses[this._pulses.length - 1];
                    this._pulses.pop();
                }
            } else if (p.t < 0) {
                p.t = 0;
                p.speed = Math.abs(p.speed);
                p.life -= 0.1;
                if (p.life <= 0) {
                    this._pulsePool.push(p);
                    this._pulses[i] = this._pulses[this._pulses.length - 1];
                    this._pulses.pop();
                }
            }
        }

        // Auto-spawn pulses on electric web
        if (this.mode === 5 && this.tick % 20 === 0 && this._pulses.length < 20) {
            const strandIdx = Math.floor(_prand(this.tick) * this._strands.length);
            if (!this._brokenStrands.has(strandIdx)) {
                const p = this._pulsePool.length > 0 ? this._pulsePool.pop() : {};
                p.strandIdx = strandIdx;
                p.t = 0;
                p.speed = 0.015 + _prand(this.tick + 99) * 0.025;
                p.hue = (this.hue + this.tick * 0.5) % 360;
                p.life = 1;
                this._pulses.push(p);
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalAlpha = this.intensity * 0.5;

        // Draw strands
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < this._strands.length; i++) {
            if (this._brokenStrands.has(i)) continue;
            const s = this._strands[i];
            const na = this._nodes[s.a];
            const nb = this._nodes[s.b];

            // Proximity glow
            const midX = (na.x + nb.x) / 2;
            const midY = (na.y + nb.y) / 2;
            const dx = midX - this._mx;
            const dy = midY - this._my;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const proximity = Math.max(0, 1 - dist / 300);
            const alpha = 0.05 + proximity * 0.2;

            const hue = (this.hue + proximity * 30) % 360;
            ctx.strokeStyle = `hsla(${hue}, 70%, ${50 + proximity * 30}%, ${alpha})`;
            ctx.lineWidth = 0.5 + proximity;
            ctx.beginPath();
            ctx.moveTo(na.x, na.y);
            ctx.lineTo(nb.x, nb.y);
            ctx.stroke();
        }

        // Draw energy pulses
        for (const p of this._pulses) {
            const s = this._strands[p.strandIdx];
            if (!s || this._brokenStrands.has(p.strandIdx)) continue;
            const na = this._nodes[s.a];
            const nb = this._nodes[s.b];
            const px = na.x + (nb.x - na.x) * Math.max(0, Math.min(1, p.t));
            const py = na.y + (nb.y - na.y) * Math.max(0, Math.min(1, p.t));

            const g = ctx.createRadialGradient(px, py, 0, px, py, 15);
            g.addColorStop(0, `hsla(${p.hue}, 90%, 70%, ${p.life * 0.5})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(px, py, 15, 0, TAU);
            ctx.fill();

            // Core
            ctx.fillStyle = `hsla(${p.hue}, 95%, 85%, ${p.life * 0.8})`;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, TAU);
            ctx.fill();
        }

        // Draw dew drops
        for (const dew of this._dewDrops) {
            if (this._brokenStrands.has(dew.strandIdx)) continue;
            const wobbleX = Math.sin(this.tick * 0.1 + dew.strandIdx) * dew.wobble * 3;
            const dropX = dew.x + wobbleX;
            const dropY = dew.y + dew.drip;

            // Glow
            const g = ctx.createRadialGradient(dropX, dropY, 0, dropX, dropY, dew.size * 4);
            g.addColorStop(0, `hsla(${dew.hue}, 80%, 70%, ${dew.brightness * 0.3})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(dropX, dropY, dew.size * 4, 0, TAU);
            ctx.fill();

            // Drop body
            ctx.fillStyle = `hsla(${dew.hue}, 90%, 80%, ${dew.brightness * 0.6})`;
            ctx.beginPath();
            ctx.arc(dropX, dropY, dew.size, 0, TAU);
            ctx.fill();

            // Highlight
            ctx.fillStyle = `hsla(${dew.hue}, 60%, 95%, ${dew.brightness * 0.4})`;
            ctx.beginPath();
            ctx.arc(dropX - dew.size * 0.3, dropY - dew.size * 0.3, dew.size * 0.3, 0, TAU);
            ctx.fill();
        }

        ctx.restore();
    }
}
