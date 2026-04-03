/**
 * @file gravity_web_effects.js
 * @description Interactive effect: dynamic spiderweb that forms between anchor
 * points. Web strands vibrate when the mouse passes through them and sag under
 * gravity. Clicking creates new anchor points. Trapped "prey" particles glow
 * where mouse intersects strands. Seed controls web density, strand colors,
 * vibration intensity, and web pattern (radial/chaotic/structured).
 */

export class GravityWeb {
    constructor() {
        this.anchors = [];
        this.strands = [];
        this.trappedParticles = [];
        this.particlePool = [];
        this.maxAnchors = 20;
        this.maxStrands = 60;
        this.webStyle = 0;
        this.palette = [];
        this.vibrationDecay = 0.95;
        this.gravity = 0.02;
        this._lastClickTime = 0;
        this._clickRegistered = false;
        this._tick = 0;
    }

    configure(rng, palette) {
        // Web style: 0=radial, 1=chaotic, 2=structured grid, 3=branching
        this.webStyle = Math.floor(rng() * 4);
        this.gravity = 0.01 + rng() * 0.03;
        this.vibrationDecay = 0.92 + rng() * 0.06;

        this.palette = palette && palette.length > 0 ? palette : [
            { h: rng() * 360, s: 30 + rng() * 40, l: 60 + rng() * 20 },
            { h: rng() * 360, s: 40 + rng() * 30, l: 50 + rng() * 20 },
        ];

        // Generate initial web
        this.anchors = [];
        this.strands = [];
        this.trappedParticles = [];
        this.particlePool = [];

        // Create seed anchors along edges and some interior
        const anchorCount = 8 + Math.floor(rng() * 8);
        for (let i = 0; i < anchorCount; i++) {
            let x, y, fixed;
            if (i < 4) {
                // Corner-ish anchors (fixed)
                x = (i % 2 === 0 ? 0.1 : 0.9) * 1920 + (rng() - 0.5) * 200;
                y = (i < 2 ? 0.1 : 0.9) * 1080 + (rng() - 0.5) * 200;
                fixed = true;
            } else {
                x = rng() * 1920;
                y = rng() * 1080;
                fixed = rng() < 0.3;
            }
            this.anchors.push({ x, y, fixed, vx: 0, vy: 0 });
        }

        // Connect anchors with strands
        this._buildWeb(rng);
    }

    _buildWeb(rng) {
        this.strands = [];
        const n = this.anchors.length;

        if (this.webStyle === 0) {
            // Radial: connect all to center, then ring connections
            const cx = this.anchors.reduce((s, a) => s + a.x, 0) / n;
            const cy = this.anchors.reduce((s, a) => s + a.y, 0) / n;
            // Sort by angle from center
            const sorted = this.anchors.map((a, i) => ({
                idx: i,
                angle: Math.atan2(a.y - cy, a.x - cx)
            })).sort((a, b) => a.angle - b.angle);

            // Radial connections via midpoints
            for (let i = 0; i < sorted.length; i++) {
                const j = (i + 1) % sorted.length;
                this._addStrand(sorted[i].idx, sorted[j].idx, rng);
                // Cross connections
                if (i + 2 < sorted.length && rng() < 0.5) {
                    this._addStrand(sorted[i].idx, sorted[(i + 2) % sorted.length].idx, rng);
                }
            }
        } else if (this.webStyle === 1) {
            // Chaotic: random connections
            for (let i = 0; i < n; i++) {
                const connectionCount = 2 + Math.floor(rng() * 3);
                for (let c = 0; c < connectionCount; c++) {
                    const j = Math.floor(rng() * n);
                    if (j !== i) this._addStrand(i, j, rng);
                }
            }
        } else if (this.webStyle === 2) {
            // Structured: nearest neighbor connections
            for (let i = 0; i < n; i++) {
                const dists = [];
                for (let j = 0; j < n; j++) {
                    if (j === i) continue;
                    const dx = this.anchors[i].x - this.anchors[j].x;
                    const dy = this.anchors[i].y - this.anchors[j].y;
                    dists.push({ idx: j, d: dx * dx + dy * dy });
                }
                dists.sort((a, b) => a.d - b.d);
                const count = Math.min(3, dists.length);
                for (let c = 0; c < count; c++) {
                    this._addStrand(i, dists[c].idx, rng);
                }
            }
        } else {
            // Branching: tree-like with some loops
            const visited = new Set([0]);
            const queue = [0];
            while (queue.length > 0 && visited.size < n) {
                const current = queue.shift();
                const branchCount = 1 + Math.floor(rng() * 2);
                let added = 0;
                for (let j = 0; j < n && added < branchCount; j++) {
                    if (!visited.has(j)) {
                        this._addStrand(current, j, rng);
                        visited.add(j);
                        queue.push(j);
                        added++;
                    }
                }
            }
            // Add some loop connections
            for (let i = 0; i < 3; i++) {
                const a = Math.floor(rng() * n);
                const b = Math.floor(rng() * n);
                if (a !== b) this._addStrand(a, b, rng);
            }
        }
    }

    _addStrand(fromIdx, toIdx, rng) {
        if (this.strands.length >= this.maxStrands) return;
        // Add midpoint control points for sag/vibration
        const midpoints = 3 + Math.floor(rng() * 4);
        const points = [];
        const a = this.anchors[fromIdx];
        const b = this.anchors[toIdx];
        for (let i = 0; i <= midpoints; i++) {
            const t = i / midpoints;
            points.push({
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t,
                baseX: a.x + (b.x - a.x) * t,
                baseY: a.y + (b.y - a.y) * t,
                vy: 0,
                vibration: 0
            });
        }
        this.strands.push({
            from: fromIdx,
            to: toIdx,
            points,
            colorIdx: Math.floor(rng() * this.palette.length),
            thickness: 0.5 + rng() * 1.5,
            tension: 0.03 + rng() * 0.05
        });
    }

    update(mx, my, isClicking) {
        this._tick++;
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Scale anchor positions if they were generated at different resolution
        if (this.anchors.length > 0 && this.anchors[0].x > w * 1.5) {
            for (const a of this.anchors) {
                a.x = (a.x / 1920) * w;
                a.y = (a.y / 1080) * h;
            }
            for (const s of this.strands) {
                for (const p of s.points) {
                    p.x = (p.x / 1920) * w;
                    p.y = (p.y / 1080) * h;
                    p.baseX = p.x;
                    p.baseY = p.y;
                }
            }
        }

        // Update strand physics
        for (const strand of this.strands) {
            const a = this.anchors[strand.from];
            const b = this.anchors[strand.to];
            const pts = strand.points;

            // Pin endpoints to anchors
            pts[0].x = a.x;
            pts[0].y = a.y;
            pts[pts.length - 1].x = b.x;
            pts[pts.length - 1].y = b.y;

            for (let i = 1; i < pts.length - 1; i++) {
                const p = pts[i];

                // Gravity sag
                p.vy += this.gravity;

                // Mouse interaction: vibrate nearby strands
                const dx = mx - p.x;
                const dy = my - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 80) {
                    p.vibration = Math.max(p.vibration, (1 - dist / 80) * 5);
                    // Push strand away from mouse
                    if (dist > 1) {
                        p.vy += (dy > 0 ? -1 : 1) * (1 - dist / 80) * 0.5;
                    }

                    // Trap a particle
                    if (this.trappedParticles.length < 30 && Math.random() < 0.02) {
                        let tp = this.particlePool.length > 0 ? this.particlePool.pop() : {};
                        tp.x = p.x;
                        tp.y = p.y;
                        tp.life = 1.0;
                        tp.decay = 0.015 + Math.random() * 0.02;
                        tp.size = 2 + Math.random() * 3;
                        tp.hue = this.palette[strand.colorIdx % this.palette.length].h;
                        this.trappedParticles.push(tp);
                    }
                }

                // Vibration
                if (p.vibration > 0.01) {
                    p.x += Math.sin(this._tick * 0.5 + i) * p.vibration;
                    p.vibration *= this.vibrationDecay;
                }

                // Spring tension back to base position
                p.vy += (p.baseY - p.y) * strand.tension;
                p.vy *= 0.95; // damping
                p.y += p.vy;

                // Interpolate X based on anchor positions
                const t = i / (pts.length - 1);
                p.x = a.x + (b.x - a.x) * t + (p.x - (a.x + (b.x - a.x) * t)) * 0.95;
            }
        }

        // Update trapped particles
        for (let i = this.trappedParticles.length - 1; i >= 0; i--) {
            const p = this.trappedParticles[i];
            p.life -= p.decay;
            if (p.life <= 0) {
                if (this.particlePool.length < 30) this.particlePool.push(p);
                this.trappedParticles[i] = this.trappedParticles[this.trappedParticles.length - 1];
                this.trappedParticles.pop();
            }
        }

        // Click adds new anchor + connects
        if (isClicking && !this._clickRegistered && this.anchors.length < this.maxAnchors) {
            this._clickRegistered = true;
            const newIdx = this.anchors.length;
            this.anchors.push({ x: mx, y: my, fixed: false, vx: 0, vy: 0 });

            // Connect to 2-3 nearest existing anchors
            const dists = [];
            for (let i = 0; i < newIdx; i++) {
                const dx = this.anchors[i].x - mx;
                const dy = this.anchors[i].y - my;
                dists.push({ idx: i, d: dx * dx + dy * dy });
            }
            dists.sort((a, b) => a.d - b.d);
            const connectCount = Math.min(3, dists.length);
            const rng = Math.random;
            for (let c = 0; c < connectCount; c++) {
                this._addStrand(newIdx, dists[c].idx, rng);
            }
        }
        if (!isClicking) this._clickRegistered = false;

        // Gently move non-fixed anchors
        for (const a of this.anchors) {
            if (a.fixed) continue;
            a.vy = (a.vy || 0) + 0.005;
            a.vy *= 0.99;
            a.y += a.vy;
            a.y = Math.min(h - 10, Math.max(10, a.y));
        }
    }

    draw(ctx, system) {
        // Draw strands
        for (const strand of this.strands) {
            const pts = strand.points;
            if (pts.length < 2) continue;
            const c = this.palette[strand.colorIdx % this.palette.length];
            const vibAlpha = Math.min(1, 0.15 + pts.reduce((max, p) => Math.max(max, p.vibration), 0) * 0.15);

            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.strokeStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${vibAlpha})`;
            ctx.lineWidth = strand.thickness;
            ctx.stroke();

            // Vibrating strands get a glow
            if (vibAlpha > 0.2) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = `hsla(${c.h}, ${c.s}%, ${c.l + 20}%, ${(vibAlpha - 0.15) * 0.3})`;
                ctx.lineWidth = strand.thickness + 2;
                ctx.stroke();
                ctx.globalCompositeOperation = 'source-over';
            }
        }

        // Draw anchor points
        for (const a of this.anchors) {
            const c = this.palette[0];
            ctx.beginPath();
            ctx.arc(a.x, a.y, a.fixed ? 3 : 2, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, 0.3)`;
            ctx.fill();
        }

        // Draw trapped particles
        if (this.trappedParticles.length > 0) {
            ctx.globalCompositeOperation = 'lighter';
            for (const p of this.trappedParticles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.life * 0.5})`;
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        }
    }
}
