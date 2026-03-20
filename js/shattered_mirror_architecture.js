/**
 * @file shattered_mirror_architecture.js
 * @description Shattered mirror/glass architecture with reflective shards that fracture,
 * drift, and catch light dynamically. Mouse interaction causes shattering cascades,
 * and shards reflect colors from the palette creating prismatic effects.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class ShatteredMirrorArchitecture extends Architecture {
    constructor() {
        super();
        this.shards = [];
        this.cracks = [];
        this.reflections = [];
        this.lightAngle = 0;
        this.shatterCooldown = 0;
        this.ambientDrift = 0;
        this.palette = [];
        this.crackStyle = 0;
        this.shardShape = 0;
    }

    init(system) {
        const rng = system.rng;

        // Seed-driven visual style
        this.crackStyle = Math.floor(rng() * 4); // 0=spider, 1=linear, 2=radial, 3=organic
        this.shardShape = Math.floor(rng() * 3); // 0=triangular, 1=irregular, 2=rectangular
        this.lightAngle = rng() * Math.PI * 2;
        this.ambientDrift = 0.0005 + rng() * 0.002;

        // Palette: 3-5 reflective colors from seed
        const baseHue = system.hue;
        const palettes = [
            // Icy mirrors
            () => [
                { h: 190 + rng() * 30, s: 40, l: 75 },
                { h: 210 + rng() * 20, s: 30, l: 85 },
                { h: 220 + rng() * 30, s: 50, l: 65 },
                { h: 180 + rng() * 20, s: 20, l: 90 }
            ],
            // Stained glass
            () => [
                { h: baseHue, s: 80, l: 55 },
                { h: (baseHue + 60) % 360, s: 75, l: 50 },
                { h: (baseHue + 180) % 360, s: 70, l: 45 },
                { h: (baseHue + 240) % 360, s: 85, l: 60 },
                { h: (baseHue + 120) % 360, s: 65, l: 55 }
            ],
            // Dark obsidian
            () => [
                { h: 260 + rng() * 30, s: 30, l: 20 },
                { h: 280 + rng() * 40, s: 40, l: 30 },
                { h: 300 + rng() * 20, s: 50, l: 40 },
                { h: 0, s: 0, l: 15 }
            ],
            // Golden/amber
            () => [
                { h: 35 + rng() * 15, s: 80, l: 60 },
                { h: 45 + rng() * 20, s: 70, l: 70 },
                { h: 25 + rng() * 10, s: 90, l: 50 },
                { h: 55 + rng() * 15, s: 60, l: 75 }
            ]
        ];
        this.palette = palettes[Math.floor(rng() * palettes.length)]();

        // Generate initial shards
        this.shards = [];
        const shardCount = 40 + Math.floor(rng() * 40);
        for (let i = 0; i < shardCount; i++) {
            this._createShard(system, rng() * system.width, rng() * system.height, false);
        }

        // Generate initial crack lines
        this.cracks = [];
        const crackCount = 3 + Math.floor(rng() * 5);
        for (let i = 0; i < crackCount; i++) {
            this._createCrackLine(system);
        }

        this.reflections = [];
    }

    _createShard(system, x, y, isFragment) {
        const rng = system.rng;
        const color = this.palette[Math.floor(rng() * this.palette.length)];
        const size = isFragment ? (5 + rng() * 15) : (15 + rng() * 60);
        const vertices = this._generateShardVertices(rng, size);

        this.shards.push({
            x, y,
            vx: isFragment ? (rng() - 0.5) * 4 : (rng() - 0.5) * 0.3,
            vy: isFragment ? (rng() - 0.5) * 4 : (rng() - 0.5) * 0.3,
            rotation: rng() * Math.PI * 2,
            rotSpeed: (rng() - 0.5) * (isFragment ? 0.08 : 0.003),
            size,
            vertices,
            color,
            reflectAlpha: 0.05 + rng() * 0.2,
            edgeAlpha: 0.1 + rng() * 0.3,
            specularPhase: rng() * Math.PI * 2,
            specularSpeed: 0.01 + rng() * 0.03,
            isFragment,
            life: isFragment ? (40 + rng() * 60) : -1,
            maxLife: isFragment ? 100 : -1,
            depth: rng() * 0.5 + 0.5,
            shimmer: rng() * Math.PI * 2
        });
    }

    _generateShardVertices(rng, size) {
        const verts = [];
        if (this.shardShape === 0) {
            // Triangular shards
            const count = 3;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i + (rng() - 0.5) * 0.8;
                const r = size * (0.5 + rng() * 0.5);
                verts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
            }
        } else if (this.shardShape === 1) {
            // Irregular polygons (4-6 sides)
            const count = 4 + Math.floor(rng() * 3);
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i + (rng() - 0.5) * 0.6;
                const r = size * (0.4 + rng() * 0.6);
                verts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
            }
        } else {
            // Rectangular/trapezoidal
            const w = size * (0.3 + rng() * 0.7);
            const h = size * (0.3 + rng() * 0.7);
            const skew = (rng() - 0.5) * size * 0.3;
            verts.push({ x: -w + skew, y: -h });
            verts.push({ x: w + skew, y: -h });
            verts.push({ x: w - skew, y: h });
            verts.push({ x: -w - skew, y: h });
        }
        return verts;
    }

    _createCrackLine(system) {
        const rng = system.rng;
        const startX = rng() * system.width;
        const startY = rng() * system.height;
        const segments = [];
        let x = startX, y = startY;
        const segCount = 8 + Math.floor(rng() * 15);
        let angle = rng() * Math.PI * 2;

        for (let i = 0; i < segCount; i++) {
            angle += (rng() - 0.5) * 1.2;
            const len = 10 + rng() * 40;
            const nx = x + Math.cos(angle) * len;
            const ny = y + Math.sin(angle) * len;
            segments.push({ x1: x, y1: y, x2: nx, y2: ny });

            // Branch
            if (rng() < 0.3) {
                const branchAngle = angle + (rng() > 0.5 ? 1 : -1) * (0.5 + rng() * 0.8);
                const branchLen = 5 + rng() * 20;
                segments.push({
                    x1: nx, y1: ny,
                    x2: nx + Math.cos(branchAngle) * branchLen,
                    y2: ny + Math.sin(branchAngle) * branchLen
                });
            }

            x = nx;
            y = ny;
        }

        this.cracks.push({
            segments,
            alpha: 0.05 + rng() * 0.15,
            width: 0.5 + rng() * 1.5,
            shimmerPhase: rng() * Math.PI * 2,
            shimmerSpeed: 0.005 + rng() * 0.02
        });
    }

    update(system) {
        this.lightAngle += this.ambientDrift;
        this.shatterCooldown = Math.max(0, this.shatterCooldown - 1);

        const mx = mouse.x;
        const my = mouse.y;

        // Shatter on click shockwave interaction
        if (system.shockwaves.length > 0 && this.shatterCooldown <= 0) {
            system.shockwaves.forEach(sw => {
                if (sw.radius < 50) {
                    // Create fragment shards at impact
                    for (let i = 0; i < 8; i++) {
                        this._createShard(system, sw.x + (system.rng() - 0.5) * 60, sw.y + (system.rng() - 0.5) * 60, true);
                    }
                    // Create new crack from impact point
                    const rng = system.rng;
                    const segs = [];
                    let x = sw.x, y = sw.y;
                    let angle = rng() * Math.PI * 2;
                    for (let i = 0; i < 6; i++) {
                        angle += (rng() - 0.5) * 1.5;
                        const len = 15 + rng() * 30;
                        const nx = x + Math.cos(angle) * len;
                        const ny = y + Math.sin(angle) * len;
                        segs.push({ x1: x, y1: y, x2: nx, y2: ny });
                        x = nx; y = ny;
                    }
                    this.cracks.push({
                        segments: segs, alpha: 0.3, width: 1.5,
                        shimmerPhase: rng() * Math.PI * 2, shimmerSpeed: 0.02
                    });
                    this.shatterCooldown = 15;
                }
            });
        }

        // Update shards
        for (let i = this.shards.length - 1; i >= 0; i--) {
            const s = this.shards[i];

            // Mouse interaction: push shards away
            const dx = s.x - mx;
            const dy = s.y - my;
            const distSq = dx * dx + dy * dy;
            if (distSq < 40000 && distSq > 1) {
                const dist = Math.sqrt(distSq);
                const force = (200 - dist) / 200 * 0.8;
                s.vx += (dx / dist) * force;
                s.vy += (dy / dist) * force;
            }

            // Gravity well: attract and spin shards
            if (system.isGravityWell && distSq < 250000) {
                const dist = Math.sqrt(distSq);
                if (dist > 30) {
                    s.vx -= (dx / dist) * 1.5;
                    s.vy -= (dy / dist) * 1.5;
                    s.rotSpeed += 0.002;
                }
            }

            s.x += s.vx * system.speedMultiplier;
            s.y += s.vy * system.speedMultiplier;
            s.rotation += s.rotSpeed * system.speedMultiplier;
            s.vx *= 0.98;
            s.vy *= 0.98;

            // Fragment life
            if (s.isFragment) {
                s.life--;
                if (s.life <= 0) {
                    this.shards[i] = this.shards[this.shards.length - 1];
                    this.shards.pop();
                    continue;
                }
            }

            // Wrap
            if (s.x < -s.size * 2) s.x += system.width + s.size * 4;
            else if (s.x > system.width + s.size * 2) s.x -= system.width + s.size * 4;
            if (s.y < -s.size * 2) s.y += system.height + s.size * 4;
            else if (s.y > system.height + s.size * 2) s.y -= system.height + s.size * 4;
        }

        // Update reflections (light spots that move across shards)
        if (system.tick % 8 === 0 && this.reflections.length < 20) {
            const shard = this.shards[Math.floor(system.rng() * this.shards.length)];
            if (shard && !shard.isFragment) {
                this.reflections.push({
                    x: shard.x + (system.rng() - 0.5) * shard.size,
                    y: shard.y + (system.rng() - 0.5) * shard.size,
                    size: 3 + system.rng() * 8,
                    life: 1.0,
                    decay: 0.015 + system.rng() * 0.02,
                    color: this.palette[Math.floor(system.rng() * this.palette.length)]
                });
            }
        }
        for (let i = this.reflections.length - 1; i >= 0; i--) {
            this.reflections[i].life -= this.reflections[i].decay;
            if (this.reflections[i].life <= 0) {
                this.reflections[i] = this.reflections[this.reflections.length - 1];
                this.reflections.pop();
            }
        }

        // Fade crack alpha slowly
        for (let i = this.cracks.length - 1; i >= 0; i--) {
            const c = this.cracks[i];
            if (c.alpha > 0.15) c.alpha -= 0.001;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;

        // Draw crack network first (below shards)
        for (let ci = 0; ci < this.cracks.length; ci++) {
            const crack = this.cracks[ci];
            const shimmer = Math.sin(tick * crack.shimmerSpeed + crack.shimmerPhase) * 0.5 + 0.5;

            ctx.strokeStyle = `rgba(200, 220, 255, ${crack.alpha * (0.5 + shimmer * 0.5)})`;
            ctx.lineWidth = crack.width;
            ctx.beginPath();
            for (let i = 0; i < crack.segments.length; i++) {
                const seg = crack.segments[i];
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
            }
            ctx.stroke();

            // Bright edge highlight
            ctx.strokeStyle = `rgba(255, 255, 255, ${crack.alpha * shimmer * 0.3})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        // Draw shards
        const lightX = Math.cos(this.lightAngle) * 0.5;
        const lightY = Math.sin(this.lightAngle) * 0.5;

        for (let i = 0; i < this.shards.length; i++) {
            const s = this.shards[i];
            const alpha = s.isFragment ? (s.life / s.maxLife) : 1;

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rotation);

            // Specular highlight based on light angle and shard rotation
            const specular = Math.abs(Math.sin(s.rotation + this.lightAngle + tick * s.specularSpeed + s.specularPhase));
            const specBoost = specular * specular * specular; // Sharp highlight

            // Shard fill with depth-based color
            const { h, s: sat, l } = s.color;
            const shimmerVal = Math.sin(tick * 0.02 + s.shimmer) * 5;

            ctx.beginPath();
            for (let v = 0; v < s.vertices.length; v++) {
                const vert = s.vertices[v];
                if (v === 0) ctx.moveTo(vert.x, vert.y);
                else ctx.lineTo(vert.x, vert.y);
            }
            ctx.closePath();

            // Glass-like fill
            ctx.fillStyle = `hsla(${h}, ${sat}%, ${l + shimmerVal}%, ${s.reflectAlpha * alpha * (0.5 + specBoost * 0.8)})`;
            ctx.fill();

            // Bright specular highlight on surface
            if (specBoost > 0.3) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = `rgba(255, 255, 255, ${specBoost * 0.15 * alpha})`;
                ctx.fill();
                ctx.restore();
            }

            // Edge glow
            ctx.strokeStyle = `hsla(${h}, ${sat + 10}%, ${l + 20}%, ${s.edgeAlpha * alpha * (0.5 + specBoost * 0.5)})`;
            ctx.lineWidth = 1 + specBoost;
            ctx.stroke();

            // Inner reflection line (diagonal across the shard for glass effect)
            if (!s.isFragment && s.vertices.length >= 3) {
                const v0 = s.vertices[0];
                const v1 = s.vertices[Math.floor(s.vertices.length / 2)];
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.03 + specBoost * 0.08})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(v0.x * 0.6, v0.y * 0.6);
                ctx.lineTo(v1.x * 0.6, v1.y * 0.6);
                ctx.stroke();
            }

            ctx.restore();
        }

        // Draw floating light reflections
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < this.reflections.length; i++) {
            const r = this.reflections[i];
            const { h, s: sat, l } = r.color;
            const grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.size);
            grad.addColorStop(0, `hsla(${h}, ${sat}%, ${l + 20}%, ${r.life * 0.4})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
