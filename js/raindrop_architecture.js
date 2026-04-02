/**
 * @file raindrop_architecture.js
 * @description Rain system with multi-layer depth, clouds, puddle ripples, splash
 * particles, and lightning. Mouse acts as wind source or umbrella. Seeds change rain
 * type, intensity, direction, color scheme, cloud formation, and weather personality.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class RaindropArchitecture extends Architecture {
    constructor() {
        super();
        this.drops = [];
        this.ripples = [];
        this.ripplePool = [];
        this.splashes = [];
        this.splashPool = [];
        this.lightning = null;
        this.lightningTimer = 0;
        this.windX = 0;
        this.windTarget = 0;
        this.weatherType = 0;
        this.dropColor = '';
        this.ambientFlash = 0;
        this.puddles = [];
        this.clouds = [];
        this.cloudCanvas = null;
        this.cloudCtx = null;
        this.tick = 0;
        this.intensity = 1;
        this.intensityTarget = 1;
        this.hasThunder = false;
        this.thunderTimer = 0;
        this.mouseRepelStyle = 0;
        this.hasFogWisps = false;
        this.fogWisps = [];
        this.groundReflection = false;
    }

    init(system) {
        const rng = system.rng;

        // Weather types: 0=gentle, 1=thunderstorm, 2=neon cyberpunk, 3=golden sun rain,
        // 4=snow/ice, 5=acid rain, 6=meteor shower, 7=mist/fog
        this.weatherType = Math.floor(rng() * 8);
        this.windTarget = (rng() - 0.5) * 4;
        this.windX = this.windTarget;
        this.tick = 0;

        const dropCounts = [120, 250, 200, 130, 80, 180, 60, 60];
        const dropCount = Math.floor((dropCounts[this.weatherType] || 150) * (system.qualityScale || 1));

        // Color based on weather type
        const colors = [
            { h: 210, s: 40, l: 70 },   // gentle blue
            { h: 220, s: 30, l: 60 },   // storm grey-blue
            { h: system.hue, s: 100, l: 70 }, // neon
            { h: 45, s: 80, l: 65 },    // golden
            { h: 200, s: 10, l: 90 },   // snow white
            { h: 100, s: 90, l: 50 },   // acid green
            { h: 30, s: 100, l: 60 },   // meteor orange
            { h: 210, s: 20, l: 75 },   // mist
        ];
        this.dropColor = colors[this.weatherType] || colors[0];

        this.lightningTimer = (this.weatherType === 1) ? 50 + Math.floor(rng() * 100) : 999999;

        // Generate multi-depth drops (3 layers: far, mid, near)
        this.drops = [];
        for (let i = 0; i < dropCount; i++) {
            this.drops.push(this._createDrop(system, true, rng));
        }

        // Generate clouds
        this.clouds = [];
        const cloudCount = this.weatherType === 7 ? 8 + Math.floor(rng() * 6) : 3 + Math.floor(rng() * 5);
        for (let i = 0; i < cloudCount; i++) {
            const width = 150 + rng() * 350;
            const puffs = [];
            const puffCount = 4 + Math.floor(rng() * 6);
            for (let p = 0; p < puffCount; p++) {
                puffs.push({
                    ox: (rng() - 0.5) * width * 0.6,
                    oy: (rng() - 0.5) * 30,
                    r: 30 + rng() * 50,
                });
            }
            this.clouds.push({
                x: rng() * (system.width + 400) - 200,
                y: 20 + rng() * system.height * 0.2,
                width,
                speed: 0.1 + rng() * 0.4,
                darkness: this.weatherType === 1 ? 0.5 + rng() * 0.3 : 0.1 + rng() * 0.2,
                puffs,
            });
        }

        // Generate puddles with reactive ripple tracking
        this.puddles = [];
        const puddleCount = 5 + Math.floor(rng() * 10);
        for (let i = 0; i < puddleCount; i++) {
            this.puddles.push({
                x: rng() * system.width,
                y: system.height * (0.7 + rng() * 0.25),
                width: 50 + rng() * 150,
                height: 4 + rng() * 12,
                ripplePhase: rng() * Math.PI * 2,
                activeRipples: [],
                reflectHue: (this.dropColor.h + 20 + rng() * 40) % 360,
            });
        }

        this.ripples = [];
        this.ripplePool = [];
        this.splashes = [];
        this.splashPool = [];

        // Mouse repel style: 0=umbrella, 1=vortex, 2=freeze, 3=attract
        this.mouseRepelStyle = Math.floor(rng() * 4);
        // Intensity fluctuation (storm surges)
        this.intensity = 1;
        this.intensityTarget = 1;
        // Thunder audio cue visual
        this.hasThunder = this.weatherType === 1;
        this.thunderTimer = 0;
        // Fog wisps that drift across
        this.hasFogWisps = rng() > 0.5 && (this.weatherType === 7 || this.weatherType === 0 || this.weatherType === 1);
        this.fogWisps = [];
        if (this.hasFogWisps) {
            const wispCount = 3 + Math.floor(rng() * 5);
            for (let i = 0; i < wispCount; i++) {
                this.fogWisps.push({
                    x: rng() * (system.width + 300) - 150,
                    y: system.height * (0.4 + rng() * 0.4),
                    width: 100 + rng() * 250,
                    height: 15 + rng() * 30,
                    speed: 0.2 + rng() * 0.5,
                    alpha: 0.03 + rng() * 0.06,
                });
            }
        }
        // Ground wet reflection
        this.groundReflection = rng() > 0.4 && this.weatherType !== 4 && this.weatherType !== 6;
    }

    _createDrop(system, randomY, rng) {
        const isSnow = this.weatherType === 4;
        const isMeteor = this.weatherType === 6;
        const isMist = this.weatherType === 7;
        // Depth layer: 0=far, 1=mid, 2=near
        const depth = Math.floor(rng() * 3);
        const depthScale = 0.4 + depth * 0.3; // 0.4, 0.7, 1.0

        return {
            x: rng() * (system.width + 200) - 100,
            y: randomY ? rng() * system.height : -10 - rng() * 50,
            speed: isSnow ? (0.5 + rng() * 1.5) : isMist ? (0.3 + rng() * 0.5) : isMeteor ? (8 + rng() * 12) : (3 + rng() * 7) * depthScale,
            length: isSnow || isMist ? 0 : isMeteor ? (20 + rng() * 40) : (8 + rng() * 18) * depthScale,
            size: isSnow ? (1.5 + rng() * 3) * depthScale : isMist ? (3 + rng() * 6) : (0.8 + rng() * 1.2) * depthScale,
            alpha: (0.15 + rng() * 0.35) * depthScale,
            wobble: rng() * Math.PI * 2,
            wobbleSpeed: 0.02 + rng() * 0.04,
            depth,
            depthScale,
            isMeteor: isMeteor && rng() > 0.3,
            meteorTrail: [],
        };
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;
        const rng = system.rng;
        const isSnow = this.weatherType === 4;
        const isMist = this.weatherType === 7;
        this.tick++;

        // Intensity fluctuation (storm surges)
        if (rng() < 0.003) {
            this.intensityTarget = 0.3 + rng() * 1.2;
        }
        this.intensity += (this.intensityTarget - this.intensity) * 0.01;

        // Wind shifts
        if (rng() < 0.005) {
            this.windTarget = (rng() - 0.5) * (this.weatherType === 1 ? 8 : 4);
        }
        this.windX += (this.windTarget - this.windX) * 0.01;
        const windInfluence = (mx - system.width / 2) / system.width * 2;

        // Update fog wisps
        for (const wisp of this.fogWisps) {
            wisp.x += wisp.speed + this.windX * 0.1;
            if (wisp.x > system.width + wisp.width) wisp.x = -wisp.width;
            if (wisp.x < -wisp.width * 1.5) wisp.x = system.width;
        }

        // Move clouds
        for (const cloud of this.clouds) {
            cloud.x += cloud.speed + this.windX * 0.2;
            if (cloud.x > system.width + cloud.width) cloud.x = -cloud.width;
            if (cloud.x < -cloud.width * 1.5) cloud.x = system.width;
        }

        // Update drops
        for (let i = 0; i < this.drops.length; i++) {
            const d = this.drops[i];
            const windMult = d.depthScale;

            if (isSnow) {
                d.wobble += d.wobbleSpeed;
                d.x += Math.sin(d.wobble) * 0.5 + this.windX * 0.3 * windMult + windInfluence * 0.2;
                d.y += d.speed * system.speedMultiplier;
            } else if (isMist) {
                d.wobble += d.wobbleSpeed * 0.5;
                d.x += Math.sin(d.wobble) * 1.5 + this.windX * 0.5 + windInfluence * 0.3;
                d.y += d.speed * system.speedMultiplier;
                d.alpha = 0.05 + Math.sin(d.wobble) * 0.03;
            } else {
                d.x += (this.windX + windInfluence * 0.5) * windMult * system.speedMultiplier;
                d.y += d.speed * system.speedMultiplier;
            }

            // Meteor trail
            if (d.isMeteor) {
                d.meteorTrail.push({ x: d.x, y: d.y });
                if (d.meteorTrail.length > 15) d.meteorTrail.shift();
            }

            // Mouse interaction (style-dependent)
            const umbrellaRadius = 80 + d.depth * 20;
            const mdx = d.x - mx;
            const mdy = d.y - my;
            const mDistSq = mdx * mdx + mdy * mdy;
            if (mDistSq < umbrellaRadius * umbrellaRadius && mDistSq > 1) {
                const mDist = Math.sqrt(mDistSq);
                const force = (umbrellaRadius - mDist) / umbrellaRadius;
                if (this.mouseRepelStyle === 0) {
                    // Umbrella: push away
                    d.x += (mdx / mDist) * force * 3;
                    d.y += (mdy / mDist) * force * 2;
                } else if (this.mouseRepelStyle === 1) {
                    // Vortex: swirl around cursor
                    d.x += (-mdy / mDist) * force * 2;
                    d.y += (mdx / mDist) * force * 2;
                } else if (this.mouseRepelStyle === 2) {
                    // Freeze: slow drops near cursor
                    d.speed *= (1 - force * 0.8);
                } else {
                    // Attract: pull drops toward cursor
                    d.x -= (mdx / mDist) * force * 1.5;
                    d.y -= (mdy / mDist) * force * 1;
                }
            }

            // Reset when off screen
            if (d.y > system.height + 20 || d.x < -200 || d.x > system.width + 200) {
                // Impact effects
                if (rng() < 0.4) {
                    this._spawnRipple(d.x, system.height * (0.75 + rng() * 0.22), isSnow);
                }
                // Puddle splash
                if (!isSnow && !isMist && rng() < 0.3) {
                    for (const puddle of this.puddles) {
                        if (Math.abs(d.x - puddle.x) < puddle.width / 2 &&
                            Math.abs(d.y - puddle.y) < puddle.height * 3) {
                            puddle.activeRipples.push({ radius: 0, maxRadius: 8 + rng() * 12, speed: 0.8 });
                            break;
                        }
                    }
                }
                // Splash particles
                if (!isSnow && !isMist && rng() < 0.25) {
                    const splashCount = 2 + Math.floor(rng() * 3);
                    for (let j = 0; j < splashCount; j++) {
                        let sp = this.splashPool.length > 0 ? this.splashPool.pop() : {};
                        sp.x = d.x;
                        sp.y = system.height * (0.78 + rng() * 0.15);
                        sp.vx = (rng() - 0.5) * 3;
                        sp.vy = -rng() * 3 - 1;
                        sp.life = 1.0;
                        sp.size = 1 + rng() * 1.5;
                        sp.depth = d.depth;
                        this.splashes.push(sp);
                    }
                }
                // Meteor explosion
                if (d.isMeteor) {
                    for (let j = 0; j < 8; j++) {
                        let sp = this.splashPool.length > 0 ? this.splashPool.pop() : {};
                        sp.x = d.x; sp.y = d.y;
                        const angle = rng() * Math.PI * 2;
                        sp.vx = Math.cos(angle) * (2 + rng() * 4);
                        sp.vy = Math.sin(angle) * (2 + rng() * 4);
                        sp.life = 1.0; sp.size = 2 + rng() * 2; sp.depth = d.depth;
                        this.splashes.push(sp);
                    }
                    d.meteorTrail = [];
                }

                // Respawn at top
                d.x = rng() * (system.width + 200) - 100;
                d.y = -10 - rng() * 50;
            }
        }

        // Update ripples (swap-and-pop)
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.radius += r.speed;
            r.alpha = (1 - r.radius / r.maxRadius) * 0.3;
            if (r.radius >= r.maxRadius) {
                this.ripplePool.push(r);
                this.ripples[i] = this.ripples[this.ripples.length - 1];
                this.ripples.pop();
            }
        }

        // Update puddle active ripples
        for (const puddle of this.puddles) {
            for (let i = puddle.activeRipples.length - 1; i >= 0; i--) {
                const r = puddle.activeRipples[i];
                r.radius += r.speed;
                if (r.radius >= r.maxRadius) {
                    puddle.activeRipples.splice(i, 1);
                }
            }
        }

        // Update splashes (swap-and-pop)
        for (let i = this.splashes.length - 1; i >= 0; i--) {
            const s = this.splashes[i];
            s.x += s.vx; s.y += s.vy;
            s.vy += 0.15;
            s.life -= 0.04;
            if (s.life <= 0) {
                this.splashPool.push(s);
                this.splashes[i] = this.splashes[this.splashes.length - 1];
                this.splashes.pop();
            }
        }

        // Lightning
        if (this.ambientFlash > 0) this.ambientFlash -= 0.05;
        this.lightningTimer--;
        if (this.lightningTimer <= 0 && this.weatherType === 1) {
            this.lightning = this._generateLightning(
                system.width * (0.2 + rng() * 0.6), 0,
                system.width * (0.3 + rng() * 0.4), system.height * 0.7,
                system, 4
            );
            this.ambientFlash = 1.0;
            this.lightningTimer = 80 + Math.floor(rng() * 200);
            if (rng() > 0.5) {
                setTimeout(() => { this.ambientFlash = 0.8; }, 100);
            }
        }
        if (this.lightning) {
            this.lightning.life -= 0.1;
            if (this.lightning.life <= 0) this.lightning = null;
        }

        // Cap collections
        if (this.ripples.length > 120) this.ripples.length = 120;
        if (this.splashes.length > 80) this.splashes.length = 80;
    }

    _spawnRipple(x, y, isSnow) {
        if (this.ripples.length > 120) return;
        let r = this.ripplePool.length > 0 ? this.ripplePool.pop() : {};
        r.x = x; r.y = y;
        r.radius = 0;
        r.maxRadius = isSnow ? 5 : (8 + Math.random() * 15);
        r.speed = isSnow ? 0.3 : (0.5 + Math.random() * 1);
        r.alpha = 0.3;
        this.ripples.push(r);
    }

    _generateLightning(x1, y1, x2, y2, system, depth) {
        const segments = [];
        const points = [{ x: x1, y: y1 }];
        const steps = 8 + Math.floor(system.rng() * 6);
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            points.push({
                x: x1 + (x2 - x1) * t + (system.rng() - 0.5) * 80,
                y: y1 + (y2 - y1) * t + (system.rng() - 0.5) * 20
            });
        }
        segments.push(points);
        if (depth > 0) {
            const branchCount = Math.floor(system.rng() * 3);
            for (let b = 0; b < branchCount; b++) {
                const bp = points[Math.floor(system.rng() * (points.length - 2)) + 1];
                const branch = this._generateLightning(
                    bp.x, bp.y,
                    bp.x + (system.rng() - 0.5) * 150, bp.y + system.rng() * 100 + 30,
                    system, depth - 1
                );
                segments.push(...branch.segments);
            }
        }
        return { segments, life: 1.0 };
    }

    draw(system) {
        const ctx = system.ctx;
        const { h, s, l } = this.dropColor;
        const isSnow = this.weatherType === 4;
        const isMist = this.weatherType === 7;
        const isMeteor = this.weatherType === 6;
        const isAcid = this.weatherType === 5;

        // Ambient flash from lightning
        if (this.ambientFlash > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(200, 200, 255, ${this.ambientFlash * 0.15})`;
            ctx.fillRect(0, 0, system.width, system.height);
            ctx.restore();
        }

        // Draw clouds
        ctx.save();
        for (const cloud of this.clouds) {
            for (const puff of cloud.puffs) {
                const grad = ctx.createRadialGradient(
                    cloud.x + puff.ox, cloud.y + puff.oy, puff.r * 0.1,
                    cloud.x + puff.ox, cloud.y + puff.oy, puff.r
                );
                grad.addColorStop(0, `rgba(60, 65, 80, ${cloud.darkness})`);
                grad.addColorStop(0.6, `rgba(40, 45, 60, ${cloud.darkness * 0.5})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cloud.x + puff.ox, cloud.y + puff.oy, puff.r, 0, Math.PI * 2);
                ctx.fill();
            }
            // Lightning illumination
            if (this.ambientFlash > 0.3) {
                for (const puff of cloud.puffs) {
                    ctx.fillStyle = `rgba(180, 190, 220, ${this.ambientFlash * 0.1})`;
                    ctx.beginPath();
                    ctx.arc(cloud.x + puff.ox, cloud.y + puff.oy, puff.r * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();

        // Draw puddle reflections
        ctx.save();
        for (const p of this.puddles) {
            p.ripplePhase += 0.02;
            const shimmer = Math.sin(p.ripplePhase + this.tick * 0.01) * 0.05 + 0.1;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.width / 2);
            grad.addColorStop(0, `hsla(${p.reflectHue}, ${s}%, ${l}%, ${shimmer})`);
            grad.addColorStop(0.7, `hsla(${p.reflectHue}, ${s - 10}%, ${l - 10}%, ${shimmer * 0.5})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.width / 2, p.height, 0, 0, Math.PI * 2);
            ctx.fill();

            // Active ripples in puddle
            ctx.strokeStyle = `hsla(${p.reflectHue}, ${s}%, ${l + 15}%, 0.25)`;
            ctx.lineWidth = 0.8;
            for (const ar of p.activeRipples) {
                const arAlpha = 1 - ar.radius / ar.maxRadius;
                ctx.globalAlpha = arAlpha * 0.3;
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, ar.radius * 3, ar.radius * 0.8, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
        ctx.restore();

        // Draw ripples
        ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, 0.2)`;
        ctx.lineWidth = 1;
        for (const r of this.ripples) {
            ctx.globalAlpha = r.alpha;
            ctx.beginPath();
            ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.3, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Draw drops by depth layer (far first)
        ctx.save();
        for (let layer = 0; layer < 3; layer++) {
            if (isMist) {
                // Mist: soft large blurred dots
                for (const d of this.drops) {
                    if (d.depth !== layer) continue;
                    ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, ${d.alpha})`;
                    ctx.beginPath();
                    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (isSnow) {
                ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, 0.6)`;
                for (const d of this.drops) {
                    if (d.depth !== layer) continue;
                    ctx.globalAlpha = d.alpha;
                    ctx.beginPath();
                    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
                    ctx.fill();
                    // Snowflake cross for larger ones
                    if (d.size > 2.5 && layer === 2) {
                        ctx.strokeStyle = `hsla(${h}, ${s}%, ${l + 10}%, ${d.alpha * 0.5})`;
                        ctx.lineWidth = 0.5;
                        for (let a = 0; a < 3; a++) {
                            const angle = a * Math.PI / 3 + d.wobble;
                            ctx.beginPath();
                            ctx.moveTo(d.x + Math.cos(angle) * d.size, d.y + Math.sin(angle) * d.size);
                            ctx.lineTo(d.x - Math.cos(angle) * d.size, d.y - Math.sin(angle) * d.size);
                            ctx.stroke();
                        }
                    }
                }
            } else {
                // Rain/other: draw as streaks per layer
                const batch = new Path2D();
                const layerDrops = [];
                for (const d of this.drops) {
                    if (d.depth !== layer) continue;
                    if (d.isMeteor) {
                        layerDrops.push(d);
                        continue;
                    }
                    batch.moveTo(d.x, d.y);
                    batch.lineTo(d.x - this.windX * 0.5 * d.depthScale, d.y - d.length);
                }
                const layerAlpha = 0.15 + layer * 0.1;
                ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, ${layerAlpha})`;
                ctx.lineWidth = 0.8 + layer * 0.4;
                ctx.lineCap = 'round';
                ctx.stroke(batch);

                // Neon/acid glow
                if (this.weatherType === 2 || isAcid) {
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.strokeStyle = `hsla(${h}, 100%, 70%, ${0.05 + layer * 0.03})`;
                    ctx.lineWidth = 3 + layer;
                    ctx.stroke(batch);
                    ctx.globalCompositeOperation = 'source-over';
                }

                // Meteor trails
                for (const d of layerDrops) {
                    if (d.meteorTrail.length > 1) {
                        ctx.save();
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.beginPath();
                        ctx.moveTo(d.meteorTrail[0].x, d.meteorTrail[0].y);
                        for (let t = 1; t < d.meteorTrail.length; t++) {
                            ctx.lineTo(d.meteorTrail[t].x, d.meteorTrail[t].y);
                        }
                        ctx.strokeStyle = `hsla(${h}, 100%, 70%, 0.5)`;
                        ctx.lineWidth = d.size;
                        ctx.stroke();
                        // Bright head
                        ctx.fillStyle = `hsla(${h}, 100%, 90%, 0.8)`;
                        ctx.beginPath();
                        ctx.arc(d.x, d.y, d.size * 1.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                }
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        // Draw splashes
        ctx.fillStyle = `hsla(${h}, ${s}%, ${l + 10}%, 0.5)`;
        for (const sp of this.splashes) {
            ctx.globalAlpha = sp.life;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Draw lightning
        if (this.lightning) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (const seg of this.lightning.segments) {
                // Wide glow
                ctx.strokeStyle = `rgba(150, 150, 255, ${this.lightning.life * 0.3})`;
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(seg[0].x, seg[0].y);
                for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].x, seg[i].y);
                ctx.stroke();
                // Core
                ctx.strokeStyle = `rgba(255, 255, 255, ${this.lightning.life * 0.8})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(seg[0].x, seg[0].y);
                for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].x, seg[i].y);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Fog/atmosphere layer
        if (this.weatherType === 0 || this.weatherType === 1 || this.weatherType === 7) {
            ctx.save();
            const fogY = system.height * (isMist ? 0.3 : 0.6);
            const fogAlpha = isMist ? 0.15 : 0.1;
            const fogGrad = ctx.createLinearGradient(0, fogY, 0, system.height);
            fogGrad.addColorStop(0, 'transparent');
            fogGrad.addColorStop(1, `rgba(100, 110, 130, ${fogAlpha})`);
            ctx.fillStyle = fogGrad;
            ctx.fillRect(0, fogY, system.width, system.height - fogY);
            ctx.restore();
        }

        // Acid rain ground glow
        if (isAcid) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const acidGrad = ctx.createLinearGradient(0, system.height * 0.85, 0, system.height);
            acidGrad.addColorStop(0, 'transparent');
            acidGrad.addColorStop(1, `hsla(${h}, 90%, 30%, 0.08)`);
            ctx.fillStyle = acidGrad;
            ctx.fillRect(0, system.height * 0.85, system.width, system.height * 0.15);
            ctx.restore();
        }

        // Fog wisps
        if (this.hasFogWisps) {
            ctx.save();
            for (const wisp of this.fogWisps) {
                const grad = ctx.createRadialGradient(
                    wisp.x, wisp.y, 0,
                    wisp.x, wisp.y, wisp.width / 2
                );
                grad.addColorStop(0, `rgba(120, 130, 150, ${wisp.alpha})`);
                grad.addColorStop(0.6, `rgba(100, 110, 130, ${wisp.alpha * 0.5})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(wisp.x, wisp.y, wisp.width / 2, wisp.height, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Ground wet reflection
        if (this.groundReflection) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const refY = system.height * 0.88;
            const refGrad = ctx.createLinearGradient(0, refY, 0, system.height);
            refGrad.addColorStop(0, 'transparent');
            refGrad.addColorStop(0.3, `hsla(${h}, ${s * 0.5}%, ${l * 0.3}%, 0.03)`);
            refGrad.addColorStop(1, `hsla(${h}, ${s * 0.5}%, ${l * 0.3}%, 0.06)`);
            ctx.fillStyle = refGrad;
            ctx.fillRect(0, refY, system.width, system.height - refY);
            // Shimmer lines
            ctx.strokeStyle = `hsla(${h}, ${s}%, ${l + 10}%, 0.02)`;
            ctx.lineWidth = 0.5;
            for (let wy = refY; wy < system.height; wy += 5) {
                ctx.beginPath();
                for (let wx = 0; wx < system.width; wx += 8) {
                    const wave = Math.sin(wx * 0.03 + this.tick * 0.03 + wy * 0.05) * 1;
                    if (wx === 0) ctx.moveTo(wx, wy + wave);
                    else ctx.lineTo(wx, wy + wave);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // Mouse interaction visualization
        if (this.mouseRepelStyle === 1) {
            // Vortex: show swirl indicator
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `hsla(${h}, 50%, 60%, 0.05)`;
            ctx.lineWidth = 1;
            for (let r = 20; r < 80; r += 15) {
                ctx.beginPath();
                ctx.arc(mouse.x, mouse.y, r, this.tick * 0.05 + r * 0.1, this.tick * 0.05 + r * 0.1 + Math.PI);
                ctx.stroke();
            }
            ctx.restore();
        }
    }
}
