/**
 * @file lightning_garden_effects.js
 * @description Electric tendrils that grow organically from the cursor like a living garden.
 * Branches fork, glow, pulse with energy, and reach toward nearby branches to form networks.
 * Clicking seeds a new growth node. Different seeds produce different growth patterns.
 *
 * Modes:
 * 0 - Electric Bonsai: Tendrils grow upward like a tree, forking naturally, with crackling energy
 * 1 - Root Network: Tendrils grow downward/outward like roots, connecting underground
 * 2 - Neural Garden: Dendrite-like growths that form synaptic connections with spark flashes
 * 3 - Coral Lightning: Organic coral-like branching that calcifies (fades to solid) over time
 * 4 - Vine Tangle: Twisting vines with leaves that curl around cursor movements
 * 5 - Circuit Trace: Right-angle circuit-board traces that route between cursor clicks
 */

const TAU = Math.PI * 2;

function _prand(seed) {
    return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
}

export class LightningGarden {
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

        // Growth nodes (branch tips that are still growing)
        this._tips = [];
        this._tipPool = [];
        this._maxTips = 80;

        // Completed segments (line data for drawing)
        this._segments = [];
        this._segmentPool = [];
        this._maxSegments = 600;

        // Spark particles
        this._sparks = [];
        this._sparkPool = [];
        this._maxSparks = 50;

        // Connection arcs (neural mode)
        this._connections = [];
        this._connPool = [];
        this._maxConnections = 30;

        // Growth parameters
        this._growthSpeed = 2;
        this._forkChance = 0.03;
        this._maxBranchDepth = 6;
        this._curviness = 0.2;
        this._upwardBias = -0.5;

        // Circuit trace endpoints (mode 5)
        this._circuitNodes = [];

        // Spawn counter for determinism
        this._spawnIdx = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.intensity = 0.5 + rng() * 0.5;
        this._tips = [];
        this._segments = [];
        this._sparks = [];
        this._connections = [];
        this._circuitNodes = [];
        this._spawnIdx = 0;

        switch (this.mode) {
            case 0:
                this._growthSpeed = 1.5 + rng() * 2;
                this._forkChance = 0.04 + rng() * 0.03;
                this._maxBranchDepth = 5 + Math.floor(rng() * 3);
                this._curviness = 0.15 + rng() * 0.15;
                this._upwardBias = -0.6 - rng() * 0.4;
                break;
            case 1:
                this._growthSpeed = 1 + rng() * 1.5;
                this._forkChance = 0.05 + rng() * 0.04;
                this._maxBranchDepth = 7 + Math.floor(rng() * 3);
                this._curviness = 0.3 + rng() * 0.2;
                this._upwardBias = 0.4 + rng() * 0.3;
                break;
            case 2:
                this._growthSpeed = 2 + rng() * 2;
                this._forkChance = 0.03 + rng() * 0.02;
                this._maxBranchDepth = 4 + Math.floor(rng() * 3);
                this._curviness = 0.4 + rng() * 0.3;
                this._upwardBias = 0;
                break;
            case 3:
                this._growthSpeed = 0.8 + rng() * 1;
                this._forkChance = 0.06 + rng() * 0.05;
                this._maxBranchDepth = 5 + Math.floor(rng() * 4);
                this._curviness = 0.2 + rng() * 0.15;
                this._upwardBias = -0.2 - rng() * 0.2;
                break;
            case 4:
                this._growthSpeed = 1 + rng() * 1.5;
                this._forkChance = 0.02 + rng() * 0.02;
                this._maxBranchDepth = 6 + Math.floor(rng() * 3);
                this._curviness = 0.5 + rng() * 0.3;
                this._upwardBias = -0.3;
                break;
            case 5:
                this._growthSpeed = 3 + rng() * 3;
                this._forkChance = 0.02 + rng() * 0.02;
                this._maxBranchDepth = 8;
                this._curviness = 0;
                this._upwardBias = 0;
                break;
        }
    }

    _pr() {
        return _prand(++this._spawnIdx * 97 + this.tick * 31);
    }

    _seedGrowth(x, y) {
        if (this._tips.length >= this._maxTips) return;
        const tipCount = this.mode === 5 ? 4 : 3 + Math.floor(this._pr() * 3);
        for (let i = 0; i < tipCount && this._tips.length < this._maxTips; i++) {
            let angle;
            if (this.mode === 5) {
                angle = (i / 4) * TAU;
            } else {
                angle = (i / tipCount) * TAU + (this._pr() - 0.5) * 0.5;
            }
            const tip = this._tipPool.length > 0 ? this._tipPool.pop() : {};
            tip.x = x; tip.y = y; tip.angle = angle;
            tip.speed = this._growthSpeed * (0.8 + this._pr() * 0.4);
            tip.depth = 0;
            tip.life = 60 + Math.floor(this._pr() * 80);
            tip.width = 2 + this._pr() * 2;
            tip.hueOffset = (this._pr() - 0.5) * 40;
            tip.energy = 1.0;
            tip._circSteps = 0;
            tip._circDir = Math.floor(this._pr() * 4);
            this._tips.push(tip);
        }
        if (this.mode === 5) {
            this._circuitNodes.push({ x, y });
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx; this._pmy = this._my;
        this._mx = mx; this._my = my;
        const dx = mx - this._pmx, dy = my - this._pmy;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);

        // Auto-seed from cursor movement
        if (this._mouseSpeed > 6 && this.tick % 20 === 0 && this._tips.length < this._maxTips * 0.5) {
            this._seedGrowth(mx, my);
        }

        // Click to seed (strong burst)
        if (isClicking && !this._wasClicking) {
            this._seedGrowth(mx, my);
            // Extra seeds for impact
            if (this.mode !== 5) {
                this._seedGrowth(mx + (this._pr() - 0.5) * 30, my + (this._pr() - 0.5) * 30);
            }
        }
        this._wasClicking = isClicking;

        const W = window.innerWidth, H = window.innerHeight;
        const dirs = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

        // Grow tips
        for (let i = this._tips.length - 1; i >= 0; i--) {
            const tip = this._tips[i];
            tip.life--;
            tip.energy *= 0.998;

            if (tip.life <= 0 || tip.x < -20 || tip.x > W + 20 || tip.y < -20 || tip.y > H + 20) {
                if (this._tipPool.length < 80) this._tipPool.push(tip);
                this._tips[i] = this._tips[this._tips.length - 1];
                this._tips.pop();
                continue;
            }

            const prevX = tip.x, prevY = tip.y;

            if (this.mode === 5) {
                // Circuit: straight lines with right-angle turns
                tip._circSteps++;
                const turnSeed = _prand(tip._circSteps * 41 + i * 73 + this.tick);
                if (tip._circSteps > 10 + Math.floor(turnSeed * 20)) {
                    tip._circDir = (tip._circDir + (turnSeed > 0.5 ? 1 : 3)) % 4;
                    tip._circSteps = 0;
                }
                tip.angle = dirs[tip._circDir];
            } else {
                // Organic growth: curve with bias
                const curveSeed = _prand(this.tick * 13 + i * 59);
                tip.angle += (curveSeed - 0.5) * this._curviness;
                tip.angle += Math.sin(tip.angle - Math.PI / 2) * this._upwardBias * 0.05;
                // Cursor attraction
                const cdx = mx - tip.x, cdy = my - tip.y;
                const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
                if (cDist < 200 && cDist > 0) {
                    const attract = (1 - cDist / 200) * 0.02;
                    tip.angle += Math.atan2(cdy, cdx) * attract - tip.angle * attract;
                }
            }

            tip.x += Math.cos(tip.angle) * tip.speed;
            tip.y += Math.sin(tip.angle) * tip.speed;

            // Record segment (pooled)
            if (this._segments.length < this._maxSegments) {
                const seg = this._segmentPool.length > 0 ? this._segmentPool.pop() : {};
                seg.x1 = prevX; seg.y1 = prevY; seg.x2 = tip.x; seg.y2 = tip.y;
                seg.width = tip.width * (0.5 + tip.energy * 0.5);
                seg.hue = (this.hue + tip.hueOffset + 360) % 360;
                seg.energy = tip.energy;
                seg.depth = tip.depth;
                seg.age = 0;
                this._segments.push(seg);
            }

            // Fork (deterministic)
            const forkSeed = _prand(this.tick * 37 + i * 91);
            if (forkSeed < this._forkChance && tip.depth < this._maxBranchDepth &&
                this._tips.length < this._maxTips) {
                const forkAngle = tip.angle + (forkSeed > this._forkChance * 0.5 ? 1 : -1) * (0.3 + this._pr() * 0.5);
                const newTip = this._tipPool.length > 0 ? this._tipPool.pop() : {};
                newTip.x = tip.x; newTip.y = tip.y; newTip.angle = forkAngle;
                newTip.speed = tip.speed * (0.7 + this._pr() * 0.2);
                newTip.depth = tip.depth + 1;
                newTip.life = Math.floor(tip.life * (0.5 + this._pr() * 0.3));
                newTip.width = tip.width * 0.7;
                newTip.hueOffset = tip.hueOffset + (this._pr() - 0.5) * 15;
                newTip.energy = tip.energy * 0.8;
                newTip._circSteps = 0;
                newTip._circDir = Math.floor(this._pr() * 4);
                this._tips.push(newTip);
            }

            // Neural connections (mode 2)
            if (this.mode === 2 && this._segments.length > 20) {
                const connSeed = _prand(this.tick * 23 + i * 67);
                if (connSeed < 0.005 && this._connections.length < this._maxConnections) {
                    const targetIdx = Math.floor(connSeed * 200) % this._segments.length;
                    const target = this._segments[targetIdx];
                    const tdx = target.x2 - tip.x, tdy = target.y2 - tip.y;
                    const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
                    if (tdist < 150 && tdist > 30) {
                        const conn = this._connPool.length > 0 ? this._connPool.pop() : {};
                        conn.x1 = tip.x; conn.y1 = tip.y;
                        conn.x2 = target.x2; conn.y2 = target.y2;
                        conn.life = 1.0;
                        conn.hue = (this.hue + tip.hueOffset) % 360;
                        this._connections.push(conn);
                        // Synapse spark
                        if (this._sparks.length < this._maxSparks) {
                            const spark = this._sparkPool.length > 0 ? this._sparkPool.pop() : {};
                            spark.x = (tip.x + target.x2) / 2;
                            spark.y = (tip.y + target.y2) / 2;
                            spark.life = 15; spark.maxLife = 15;
                            spark.size = 3 + this._pr() * 4;
                            spark.hue = conn.hue;
                            this._sparks.push(spark);
                        }
                    }
                }
            }
        }

        // Age and cull segments
        for (let i = this._segments.length - 1; i >= 0; i--) {
            const seg = this._segments[i];
            seg.age++;
            seg.energy *= 0.9995;
            if (seg.energy < 0.01) {
                if (this._segmentPool.length < 600) this._segmentPool.push(seg);
                this._segments[i] = this._segments[this._segments.length - 1];
                this._segments.pop();
            }
        }

        // Decay connections
        for (let i = this._connections.length - 1; i >= 0; i--) {
            this._connections[i].life -= 0.01;
            if (this._connections[i].life <= 0) {
                if (this._connPool.length < 30) this._connPool.push(this._connections[i]);
                this._connections[i] = this._connections[this._connections.length - 1];
                this._connections.pop();
            }
        }

        // Decay sparks
        for (let i = this._sparks.length - 1; i >= 0; i--) {
            this._sparks[i].life--;
            if (this._sparks[i].life <= 0) {
                if (this._sparkPool.length < 50) this._sparkPool.push(this._sparks[i]);
                this._sparks[i] = this._sparks[this._sparks.length - 1];
                this._sparks.pop();
            }
        }

        // Pulse energy along segments periodically
        if (this.tick % 30 === 0 && this._segments.length > 0) {
            const pulseIdx = Math.floor(_prand(this.tick * 47) * this._segments.length);
            this._segments[pulseIdx].energy = Math.min(1, this._segments[pulseIdx].energy + 0.5);
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';

        // Segments — batch glow pass then core pass for fewer state changes
        // Glow pass (only for high-energy segments)
        for (const seg of this._segments) {
            if (seg.energy <= 0.3) continue;
            const alpha = seg.energy * 0.06 * this.intensity;
            ctx.strokeStyle = `hsla(${seg.hue},70%,60%,${alpha})`;
            ctx.lineWidth = seg.width * 3;
            ctx.beginPath();
            ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2);
            ctx.stroke();
        }

        // Core pass
        for (const seg of this._segments) {
            const alpha = seg.energy * 0.2 * this.intensity;
            if (alpha < 0.005) continue;
            const lightness = 50 + Math.floor(seg.energy * 30);
            ctx.strokeStyle = `hsla(${seg.hue},80%,${lightness}%,${alpha})`;
            ctx.lineWidth = seg.width;
            ctx.beginPath();
            ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2);
            ctx.stroke();
        }

        // Neural connections (mode 2)
        if (this.mode === 2 && this._connections.length > 0) {
            ctx.lineWidth = 0.5;
            ctx.setLineDash([3, 4]);
            for (const conn of this._connections) {
                const alpha = conn.life * 0.1 * this.intensity;
                ctx.strokeStyle = `hsla(${conn.hue},60%,70%,${alpha})`;
                ctx.beginPath();
                ctx.moveTo(conn.x1, conn.y1); ctx.lineTo(conn.x2, conn.y2);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }

        // Circuit nodes (mode 5)
        if (this.mode === 5) {
            const pulse = (Math.sin(this.tick * 0.05) + 1) / 2;
            for (const node of this._circuitNodes) {
                const alpha = (0.1 + pulse * 0.08) * this.intensity;
                ctx.fillStyle = `hsla(${this.hue},80%,70%,${alpha})`;
                ctx.beginPath(); ctx.arc(node.x, node.y, 4, 0, TAU); ctx.fill();
                ctx.strokeStyle = `hsla(${this.hue},60%,60%,${alpha * 0.5})`;
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(node.x, node.y, 8 + pulse * 3, 0, TAU); ctx.stroke();
            }
        }

        // Growing tips (bright points)
        for (const tip of this._tips) {
            const alpha = tip.energy * 0.3 * this.intensity;
            const hue = (this.hue + tip.hueOffset + 360) % 360;
            ctx.fillStyle = `hsla(${hue},80%,80%,${alpha * 0.4})`;
            ctx.beginPath(); ctx.arc(tip.x, tip.y, tip.width * 3, 0, TAU); ctx.fill();
            ctx.fillStyle = `hsla(${hue},90%,90%,${alpha})`;
            ctx.beginPath(); ctx.arc(tip.x, tip.y, tip.width, 0, TAU); ctx.fill();
        }

        // Synapse sparks
        for (const spark of this._sparks) {
            const lifeRatio = spark.life / spark.maxLife;
            const alpha = lifeRatio * 0.4 * this.intensity;
            ctx.fillStyle = `hsla(${spark.hue},90%,85%,${alpha})`;
            ctx.beginPath(); ctx.arc(spark.x, spark.y, spark.size * lifeRatio, 0, TAU); ctx.fill();
        }

        // Vine leaves (mode 4) — drawn every 12th segment for performance
        if (this.mode === 4 && this._segments.length > 10) {
            for (let i = 0; i < this._segments.length; i += 12) {
                const seg = this._segments[i];
                if (seg.energy < 0.2 || seg.depth < 2) continue;
                const alpha = seg.energy * 0.1 * this.intensity;
                const leafHue = (seg.hue + 40) % 360;
                const leafSize = 3 + seg.width * 2;
                const angle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
                ctx.save();
                ctx.translate(seg.x2, seg.y2);
                ctx.rotate(angle + Math.PI / 4);
                ctx.fillStyle = `hsla(${leafHue},60%,45%,${alpha})`;
                ctx.beginPath();
                ctx.ellipse(0, 0, leafSize, leafSize * 0.4, 0, 0, TAU);
                ctx.fill();
                ctx.restore();
            }
        }

        ctx.restore();
    }
}
