/**
 * @file lightning_storm_architecture.js
 * @description Dramatic electrical storm with branching lightning bolts that arc between
 * cloud formations. Mouse attracts lightning strikes. Seeds change storm intensity,
 * bolt colors, cloud density, branching patterns, and thunder visual rumble.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class LightningStormArchitecture extends Architecture {
    constructor() {
        super();
        this.clouds = [];
        this.bolts = [];
        this.flashAlpha = 0;
        this.rumble = { x: 0, y: 0, intensity: 0 };
        this.ambientGlow = [];
        this.stormMode = 0;
        this.tick = 0;
    }

    init(system) {
        const rng = system.rng;

        this.stormMode = Math.floor(rng() * 6);
        // 0=classic thunderstorm, 1=ball lightning, 2=tesla coil, 3=aurora storm
        // 4=plasma storm, 5=heat lightning

        this.boltColor = Math.floor(rng() * 6);
        // 0=white-blue, 1=purple, 2=green, 3=red-orange, 4=cyan, 5=gold

        this.stormIntensity = 0.3 + rng() * 0.7;
        this.branchDepth = 2 + Math.floor(rng() * 4);
        this.branchAngleSpread = 0.3 + rng() * 0.8;
        this.boltWidth = 1.5 + rng() * 3;
        this.cloudCount = 4 + Math.floor(rng() * 6);
        this.cloudDrift = 0.1 + rng() * 0.5;
        this.flashDecay = 0.03 + rng() * 0.05;
        this.strikeInterval = 30 + Math.floor(rng() * 60);
        this.cloudOpacity = 0.3 + rng() * 0.4;

        // Generate clouds
        this.clouds = [];
        for (let i = 0; i < this.cloudCount; i++) {
            const cx = rng() * system.width;
            const cy = rng() * system.height * 0.4;
            const w = 150 + rng() * 300;
            const h = 40 + rng() * 80;
            const puffs = [];
            const puffCount = 5 + Math.floor(rng() * 6);
            for (let j = 0; j < puffCount; j++) {
                puffs.push({
                    ox: (rng() - 0.5) * w,
                    oy: (rng() - 0.5) * h * 0.5,
                    r: 30 + rng() * 60,
                    phase: rng() * Math.PI * 2,
                });
            }
            this.clouds.push({
                x: cx, y: cy, w, h, vx: (rng() - 0.5) * this.cloudDrift,
                puffs, chargeLevel: rng(), glowHue: rng() * 60,
            });
        }

        this.bolts = [];
        this.ambientGlow = [];
    }

    getBoltColor(alpha) {
        switch (this.boltColor) {
            case 0: return `rgba(200, 220, 255, ${alpha})`;
            case 1: return `rgba(180, 100, 255, ${alpha})`;
            case 2: return `rgba(100, 255, 150, ${alpha})`;
            case 3: return `rgba(255, 150, 80, ${alpha})`;
            case 4: return `rgba(80, 240, 255, ${alpha})`;
            case 5: return `rgba(255, 220, 100, ${alpha})`;
            default: return `rgba(200, 220, 255, ${alpha})`;
        }
    }

    getGlowColor(alpha) {
        switch (this.boltColor) {
            case 0: return `rgba(150, 180, 255, ${alpha})`;
            case 1: return `rgba(120, 60, 200, ${alpha})`;
            case 2: return `rgba(60, 200, 100, ${alpha})`;
            case 3: return `rgba(200, 100, 40, ${alpha})`;
            case 4: return `rgba(40, 180, 220, ${alpha})`;
            case 5: return `rgba(200, 170, 60, ${alpha})`;
            default: return `rgba(150, 180, 255, ${alpha})`;
        }
    }

    generateBolt(x1, y1, x2, y2, depth) {
        const segments = [];
        const steps = 8 + Math.floor(Math.random() * 8);
        const dx = (x2 - x1) / steps;
        const dy = (y2 - y1) / steps;
        let px = x1, py = y1;

        segments.push({ x: px, y: py });
        for (let i = 1; i < steps; i++) {
            const jitter = (1 - i / steps) * 60 + 20;
            px = x1 + dx * i + (Math.random() - 0.5) * jitter;
            py = y1 + dy * i + (Math.random() - 0.5) * jitter * 0.3;
            segments.push({ x: px, y: py });
        }
        segments.push({ x: x2, y: y2 });

        // Branches
        const branches = [];
        if (depth < this.branchDepth) {
            const branchCount = Math.floor(Math.random() * 3);
            for (let b = 0; b < branchCount; b++) {
                const si = 1 + Math.floor(Math.random() * (segments.length - 2));
                const sp = segments[si];
                const angle = Math.atan2(y2 - y1, x2 - x1) +
                    (Math.random() - 0.5) * this.branchAngleSpread * 2;
                const len = 30 + Math.random() * 80;
                const bx = sp.x + Math.cos(angle) * len;
                const by = sp.y + Math.sin(angle) * len;
                branches.push(this.generateBolt(sp.x, sp.y, bx, by, depth + 1));
            }
        }

        return { segments, branches, life: 1, decay: 0.04 + Math.random() * 0.03, width: this.boltWidth * (1 - depth * 0.2) };
    }

    strikeFromCloud(cloud, targetX, targetY) {
        if (this.bolts.length >= 15) return; // cap active bolts
        const sx = cloud.x + (Math.random() - 0.5) * cloud.w * 0.5;
        const sy = cloud.y + cloud.h * 0.3;
        const bolt = this.generateBolt(sx, sy, targetX, targetY, 0);
        this.bolts.push(bolt);
        this.flashAlpha = 0.3 + Math.random() * 0.3;

        // Thunder rumble
        this.rumble.intensity = 3 + Math.random() * 5;
    }

    update(system) {
        this.tick++;

        // Move clouds
        for (const c of this.clouds) {
            c.x += c.vx;
            if (c.x < -c.w) c.x = system.width + c.w;
            if (c.x > system.width + c.w) c.x = -c.w;
            c.chargeLevel += 0.005 * this.stormIntensity;
            for (const p of c.puffs) {
                p.phase += 0.005;
            }
        }

        // Auto-strike based on intensity
        if (this.tick % this.strikeInterval === 0 && this.clouds.length > 0) {
            const cloud = this.clouds[Math.floor(Math.random() * this.clouds.length)];
            let tx, ty;
            if (this.stormMode === 2) {
                // Tesla coil: strikes toward mouse
                tx = mouse.x + (Math.random() - 0.5) * 100;
                ty = mouse.y + (Math.random() - 0.5) * 100;
            } else if (this.stormMode === 1) {
                // Ball lightning: strikes between clouds
                const other = this.clouds[Math.floor(Math.random() * this.clouds.length)];
                tx = other.x + (Math.random() - 0.5) * 100;
                ty = other.y + (Math.random() - 0.5) * 50;
            } else if (this.stormMode === 5) {
                // Heat lightning: strikes across sky (horizontal)
                tx = Math.random() * system.width;
                ty = Math.random() * system.height * 0.3;
            } else {
                // Ground strike
                tx = Math.random() * system.width;
                ty = system.height * (0.6 + Math.random() * 0.4);
            }
            this.strikeFromCloud(cloud, tx, ty);
        }

        // Mouse attraction: nearby clouds strike toward mouse
        if (this.tick % 20 === 0) {
            for (const c of this.clouds) {
                const dist = Math.sqrt((c.x - mouse.x) ** 2 + (c.y - mouse.y) ** 2);
                if (dist < 400 && Math.random() < this.stormIntensity * 0.3) {
                    this.strikeFromCloud(c, mouse.x + (Math.random() - 0.5) * 50, mouse.y);
                }
            }
        }

        // Decay bolts (swap-remove for perf)
        for (let i = this.bolts.length - 1; i >= 0; i--) {
            this.decayBolt(this.bolts[i]);
            if (this.bolts[i].life <= 0) {
                this.bolts[i] = this.bolts[this.bolts.length - 1];
                this.bolts.pop();
            }
        }

        // Decay flash
        if (this.flashAlpha > 0) {
            this.flashAlpha -= this.flashDecay;
            if (this.flashAlpha < 0) this.flashAlpha = 0;
        }

        // Decay rumble
        if (this.rumble.intensity > 0) {
            this.rumble.x = (Math.random() - 0.5) * this.rumble.intensity;
            this.rumble.y = (Math.random() - 0.5) * this.rumble.intensity;
            this.rumble.intensity *= 0.95;
            if (this.rumble.intensity < 0.1) this.rumble.intensity = 0;
        }

        // Ambient glow particles (storm sparks)
        if (this.stormMode === 3 || this.stormMode === 4) {
            if (this.ambientGlow.length < 50 && Math.random() < 0.3) {
                this.ambientGlow.push({
                    x: Math.random() * system.width,
                    y: Math.random() * system.height * 0.5,
                    vx: (Math.random() - 0.5) * 1,
                    vy: Math.random() * 0.5,
                    life: 1, decay: 0.01 + Math.random() * 0.02,
                    size: 2 + Math.random() * 5,
                });
            }
        }
        for (let i = this.ambientGlow.length - 1; i >= 0; i--) {
            const g = this.ambientGlow[i];
            g.x += g.vx; g.y += g.vy; g.life -= g.decay;
            if (g.life <= 0) {
                this.ambientGlow[i] = this.ambientGlow[this.ambientGlow.length - 1];
                this.ambientGlow.pop();
            }
        }
    }

    decayBolt(bolt) {
        bolt.life -= bolt.decay;
        for (const branch of bolt.branches) {
            this.decayBolt(branch);
        }
    }

    drawBolt(ctx, bolt) {
        if (bolt.life <= 0) return;
        const alpha = bolt.life;

        // Glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = this.getBoltColor(1);
        ctx.shadowBlur = 15 * alpha;

        ctx.strokeStyle = this.getBoltColor(alpha);
        ctx.lineWidth = bolt.width * alpha;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
        for (let i = 1; i < bolt.segments.length; i++) {
            ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
        }
        ctx.stroke();

        // Core (brighter, thinner)
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.lineWidth = Math.max(1, bolt.width * alpha * 0.4);
        ctx.beginPath();
        ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
        for (let i = 1; i < bolt.segments.length; i++) {
            ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
        }
        ctx.stroke();
        ctx.restore();

        // Draw branches
        for (const branch of bolt.branches) {
            this.drawBolt(ctx, branch);
        }
    }

    draw(system) {
        const ctx = system.ctx;

        // Apply rumble offset
        if (this.rumble.intensity > 0) {
            ctx.save();
            ctx.translate(this.rumble.x, this.rumble.y);
        }

        // Flash overlay
        if (this.flashAlpha > 0) {
            ctx.fillStyle = this.getGlowColor(this.flashAlpha * 0.15);
            ctx.fillRect(0, 0, system.width, system.height);
        }

        // Draw clouds
        for (const c of this.clouds) {
            ctx.save();
            // Cloud glow from charge
            const chargeGlow = Math.sin(this.tick * 0.05 + c.chargeLevel * 10) * 0.1 + 0.05;
            for (const p of c.puffs) {
                const wobble = Math.sin(p.phase) * 5;
                const grad = ctx.createRadialGradient(
                    c.x + p.ox + wobble, c.y + p.oy, 0,
                    c.x + p.ox + wobble, c.y + p.oy, p.r
                );
                grad.addColorStop(0, `rgba(60, 65, 80, ${this.cloudOpacity})`);
                grad.addColorStop(0.5, `rgba(40, 45, 55, ${this.cloudOpacity * 0.7})`);
                grad.addColorStop(1, 'rgba(30, 35, 45, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(c.x + p.ox + wobble, c.y + p.oy, p.r, 0, Math.PI * 2);
                ctx.fill();

                // Underlighting from lightning
                if (chargeGlow > 0.05) {
                    const glowGrad = ctx.createRadialGradient(
                        c.x + p.ox, c.y + p.oy + p.r * 0.3, 0,
                        c.x + p.ox, c.y + p.oy + p.r * 0.3, p.r * 0.8
                    );
                    glowGrad.addColorStop(0, this.getGlowColor(chargeGlow * 0.5));
                    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = glowGrad;
                    ctx.beginPath();
                    ctx.arc(c.x + p.ox, c.y + p.oy + p.r * 0.3, p.r * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        // Draw lightning bolts
        for (const bolt of this.bolts) {
            this.drawBolt(ctx, bolt);
        }

        // Draw ambient glow particles
        if (this.ambientGlow.length > 0) {
            ctx.globalCompositeOperation = 'lighter';
            for (const g of this.ambientGlow) {
                ctx.fillStyle = this.getGlowColor(g.life * 0.4);
                ctx.beginPath();
                ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        }

        // Rain effect for classic/plasma storms
        if (this.stormMode === 0 || this.stormMode === 4) {
            ctx.strokeStyle = `rgba(150, 170, 200, 0.15)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            const rainCount = Math.floor(40 * this.stormIntensity);
            for (let i = 0; i < rainCount; i++) {
                const rx = (Math.random() * system.width * 1.2) - system.width * 0.1;
                const ry = Math.random() * system.height;
                const rlen = 10 + Math.random() * 20;
                ctx.moveTo(rx, ry);
                ctx.lineTo(rx - 2, ry + rlen);
            }
            ctx.stroke();
        }

        if (this.rumble.intensity > 0) {
            ctx.restore();
        }
    }
}
