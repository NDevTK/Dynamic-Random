/**
 * @file background_architectures.js
 * @description Defines various architectures for the background system.
 */

import { mouse } from './state.js';

/**
 * Base class for background architectures.
 */
export class Architecture {
    constructor() {}
    init(system) {}
    update(system) {}
    draw(system) {}
}

/**
 * Classic Cosmic architecture with stars, nebulas, and celestial objects.
 */
export class CosmicArchitecture extends Architecture {
    constructor() {
        super();
        this.stars = [];
        this.dust = [];
        this.nebulas = [];
        this.celestialObjects = [];
        this.pulsars = [];
        this.comets = [];
        this.auroraOffset = 0;
        this.constellationPath = null;
        this.lastConstellationUpdate = 0;
    }

    init(system) {
        this.generateStars(system);
        this.generateDust(system);
        this.generateNebulas(system);
        this.generateCelestialObjects(system);
        this.generatePulsars(system);
        this.generateComets(system);
    }

    generateStars(system) {
        this.stars = [];
        const count = 400;
        const starColors = ['#ffffff', '#ffe9c4', '#d4fbff', '#ffdede', '#e0ffff'];
        for (let i = 0; i < count; i++) {
            this.stars.push({
                index: i,
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                z: system.rng() * 2 + 0.5,
                size: system.rng() * 1.5 + 0.5,
                baseAlpha: system.rng() * 0.5 + 0.3,
                twinklePhase: system.rng() * Math.PI * 2,
                twinkleSpeed: system.rng() * 0.05 + 0.01,
                color: starColors[Math.floor(system.rng() * starColors.length)],
                baseVx: (system.rng() - 0.5) * 0.2,
                baseVy: (system.rng() - 0.5) * 0.2,
                vx: 0,
                vy: 0
            });
        }
    }

    generateDust(system) {
        this.dust = [];
        const count = 200;
        for (let i = 0; i < count; i++) {
            this.dust.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                vx: (system.rng() - 0.5) * 0.5,
                vy: (system.rng() - 0.5) * 0.5,
                size: system.rng() * 1.5,
                baseAlpha: system.rng() * 0.2 + 0.05
            });
        }
    }

    generateNebulas(system) {
        this.nebulas = [];
        const count = 6;
        for (let i = 0; i < count; i++) {
            const radius = system.rng() * 400 + 200;
            const nebulaHue = (system.hue + system.rng() * 120 - 60 + 360) % 360;
            const nebulaSat = 60 + system.rng() * 30;
            const nebulaLight = 20 + system.rng() * 15;
            const nebulaAlpha = 0.1 + system.rng() * 0.1;
            const color = `hsla(${nebulaHue}, ${nebulaSat}%, ${nebulaLight}%, ${nebulaAlpha})`;
            const sprite = document.createElement('canvas');
            sprite.width = radius * 2;
            sprite.height = radius * 2;
            const sctx = sprite.getContext('2d');
            const g = sctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
            g.addColorStop(0, color);
            g.addColorStop(1, 'transparent');
            sctx.fillStyle = g;
            sctx.beginPath();
            sctx.arc(radius, radius, radius, 0, Math.PI * 2);
            sctx.fill();

            this.nebulas.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                radius: radius,
                vx: (system.rng() - 0.5) * 0.2,
                vy: (system.rng() - 0.5) * 0.2,
                rotation: system.rng() * Math.PI * 2,
                rotationSpeed: (system.rng() - 0.5) * 0.002,
                sprite: sprite,
                pulsePhase: system.rng() * Math.PI * 2,
                pulseSpeed: system.rng() * 0.01 + 0.005
            });
        }
    }

    generateCelestialObjects(system) {
        this.celestialObjects = [];
        const galaxyCount = Math.floor(system.rng() * 3) + 2;
        for (let i = 0; i < galaxyCount; i++) {
            const size = system.rng() * 100 + 50;
            const sprite = document.createElement('canvas');
            sprite.width = size * 2;
            sprite.height = size * 2;
            const sctx = sprite.getContext('2d');
            const g = sctx.createRadialGradient(size, size, 0, size, size, size);
            const h = (system.hue + system.rng() * 60 - 30 + 360) % 360;
            g.addColorStop(0, `hsla(${h}, 70%, 80%, 0.3)`);
            g.addColorStop(0.5, `hsla(${h}, 50%, 40%, 0.1)`);
            g.addColorStop(1, 'transparent');
            sctx.fillStyle = g;
            sctx.save();
            sctx.translate(size, size);
            sctx.rotate(system.rng() * Math.PI * 2);
            sctx.scale(1, system.rng() * 0.5 + 0.3);
            sctx.beginPath();
            sctx.arc(0, 0, size, 0, Math.PI * 2);
            sctx.fill();
            sctx.restore();

            this.celestialObjects.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                z: system.rng() * 0.2 + 0.1,
                vx: (system.rng() - 0.5) * 0.05,
                vy: (system.rng() - 0.5) * 0.05,
                rotation: system.rng() * Math.PI * 2,
                rotationSpeed: (system.rng() - 0.5) * 0.001,
                sprite: sprite,
                size: size
            });
        }
    }

    generatePulsars(system) {
        this.pulsars = [];
        if (system.rng() > 0.5) {
            this.pulsars.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                z: system.rng() * 0.5 + 0.2,
                rotation: 0,
                rotationSpeed: 0.02,
                hue: system.hue,
                pulse: 0
            });
        }
    }

    generateComets(system) {
        this.comets = [];
        const cometCount = 1 + Math.floor(system.rng() * 3);
        for (let i = 0; i < cometCount; i++) {
            const angle = system.rng() * Math.PI * 2;
            const speed = 1.5 + system.rng() * 3;
            this.comets.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + system.rng() * 3,
                tailLength: 40 + system.rng() * 80,
                hue: (system.hue + system.rng() * 60) % 360,
                alpha: 0.3 + system.rng() * 0.4,
                active: false,
                timer: Math.floor(system.rng() * 300),
                lifetime: 200 + Math.floor(system.rng() * 200)
            });
        }
    }

    update(system) {
        this.auroraOffset += 0.002;
        const mx = (mouse.x - system.width / 2) * 0.05;
        const my = (mouse.y - system.height / 2) * 0.05;

        this.stars.forEach(star => {
            let wx = (star.x - mx * star.z) % (system.width + 100);
            if (wx < -50) wx += system.width + 100;
            else if (wx > system.width + 50) wx -= system.width + 100;

            let wy = (star.y - my * star.z) % (system.height + 100);
            if (wy < -50) wy += system.height + 100;
            else if (wy > system.height + 50) wy -= system.height + 100;

            const mdx = wx - mouse.x;
            const mdy = wy - mouse.y;
            const distSq = mdx * mdx + mdy * mdy;

            if (system.isGravityWell) {
                const dist = Math.sqrt(distSq);
                if (dist > 1) {
                    const ux = mdx / dist;
                    const uy = mdy / dist;
                    if (dist < 50) {
                        star.vx += ux * (50 - dist) * 0.5;
                        star.vy += uy * (50 - dist) * 0.5;
                    } else if (dist < 250) {
                        star.vx -= ux * 0.5;
                        star.vy -= uy * 0.5;
                        star.vx += -uy * 1.5;
                        star.vy += ux * 1.5;
                    }
                }
            } else if (distSq < 20000) {
                const dist = Math.sqrt(distSq);
                if (dist > 1) {
                    const push = (20000 - distSq) / 20000 * 1.5;
                    star.vx += (mdx / dist) * push;
                    star.vy += (mdy / dist) * push;
                }
            }

            // Shockwave pushing
            system.shockwaves.forEach(sw => {
                const sdx = wx - sw.x;
                const sdy = wy - sw.y;
                const sDistSq = sdx * sdx + sdy * sdy;
                const sDist = Math.sqrt(sDistSq);
                if (sDist > 1 && Math.abs(sDist - sw.radius) < 50) {
                    const push = (1 - Math.abs(sDist - sw.radius) / 50) * sw.strength;
                    star.vx += (sdx / sDist) * push * 10;
                    star.vy += (sdy / sDist) * push * 10;
                }
            });

            star.x += (star.baseVx + star.vx) * system.speedMultiplier;
            star.y += (star.baseVy + star.vy) * system.speedMultiplier;
            star.vx *= 0.95;
            star.vy *= 0.95;
        });

        this.dust.forEach(d => {
            d.x += d.vx * system.speedMultiplier;
            d.y += d.vy * system.speedMultiplier;
            if (d.x < 0) d.x += system.width;
            else if (d.x > system.width) d.x -= system.width;
            if (d.y < 0) d.y += system.height;
            else if (d.y > system.height) d.y -= system.height;
        });

        this.nebulas.forEach(n => {
            n.x += n.vx * system.speedMultiplier;
            n.y += n.vy * system.speedMultiplier;
            n.rotation += n.rotationSpeed * system.speedMultiplier;
            if (n.x < -n.radius) n.x = system.width + n.radius;
            else if (n.x > system.width + n.radius) n.x = -n.radius;
            if (n.y < -n.radius) n.y = system.height + n.radius;
            else if (n.y > system.height + n.radius) n.y = -n.radius;
        });

        this.celestialObjects.forEach(obj => {
            obj.x += obj.vx * system.speedMultiplier;
            obj.y += obj.vy * system.speedMultiplier;
            obj.rotation += obj.rotationSpeed * system.speedMultiplier;
        });

        // Update comets
        this.comets.forEach(c => {
            c.timer--;
            if (c.timer <= 0 && !c.active) {
                c.active = true;
                c.timer = c.lifetime;
                // Respawn at random edge
                const edge = Math.floor(Math.random() * 4);
                if (edge === 0) { c.x = -20; c.y = Math.random() * system.height; }
                else if (edge === 1) { c.x = system.width + 20; c.y = Math.random() * system.height; }
                else if (edge === 2) { c.x = Math.random() * system.width; c.y = -20; }
                else { c.x = Math.random() * system.width; c.y = system.height + 20; }
                const angle = Math.atan2(system.height / 2 - c.y, system.width / 2 - c.x) + (Math.random() - 0.5) * 1;
                const speed = 2 + Math.random() * 3;
                c.vx = Math.cos(angle) * speed;
                c.vy = Math.sin(angle) * speed;
            }
            if (c.active) {
                c.x += c.vx * system.speedMultiplier;
                c.y += c.vy * system.speedMultiplier;
                c.timer--;
                if (c.timer <= 0 || c.x < -100 || c.x > system.width + 100 || c.y < -100 || c.y > system.height + 100) {
                    c.active = false;
                    c.timer = 100 + Math.floor(Math.random() * 300);
                }
            }
        });
    }

    draw(system) {
        const ctx = system.ctx;
        const mx = (mouse.x - system.width / 2) * 0.05;
        const my = (mouse.y - system.height / 2) * 0.05;

        if (!system.isMonochrome) {
            this.drawAurora(system);
        }

        this.celestialObjects.forEach(obj => {
            const px = obj.x - mx * obj.z;
            const py = obj.y - my * obj.z;
            this.ctxDrawWrapped(ctx, obj.sprite, px, py, obj.size, obj.rotation, system);
        });

        this.pulsars.forEach(p => {
            p.rotation += p.rotationSpeed * system.speedMultiplier;
            p.pulse = Math.sin(system.tick * 0.1) * 0.5 + 0.5;
            const px = p.x - mx * p.z;
            const py = p.y - my * p.z;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(p.rotation);
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 2; i++) {
                ctx.rotate(Math.PI);
                const beamGlow = ctx.createLinearGradient(0, 0, 1000, 0);
                beamGlow.addColorStop(0, `hsla(${p.hue}, 100%, 80%, ${0.3 * p.pulse})`);
                beamGlow.addColorStop(1, 'transparent');
                ctx.fillStyle = beamGlow;
                ctx.fillRect(0, -2, 1000, 4);
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.restore();
        });

        // Draw comets
        ctx.globalCompositeOperation = 'lighter';
        this.comets.forEach(c => {
            if (!c.active) return;
            const fadeIn = Math.min(1, (c.lifetime - c.timer) / 30);
            const fadeOut = Math.min(1, c.timer / 30);
            const fade = Math.min(fadeIn, fadeOut);
            const speed = Math.sqrt(c.vx * c.vx + c.vy * c.vy) || 1;
            const tailX = c.x - (c.vx / speed) * c.tailLength;
            const tailY = c.y - (c.vy / speed) * c.tailLength;
            const grad = ctx.createLinearGradient(c.x, c.y, tailX, tailY);
            grad.addColorStop(0, `hsla(${c.hue}, 80%, 85%, ${c.alpha * fade})`);
            grad.addColorStop(0.3, `hsla(${c.hue}, 70%, 60%, ${c.alpha * fade * 0.5})`);
            grad.addColorStop(1, 'transparent');
            ctx.strokeStyle = grad;
            ctx.lineWidth = c.size;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();
            // Head glow
            const headGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size * 3);
            headGrad.addColorStop(0, `hsla(${c.hue}, 90%, 90%, ${0.6 * fade})`);
            headGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = headGrad;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.size * 3, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalCompositeOperation = 'source-over';

        ctx.globalCompositeOperation = 'lighter';
        const globalPulse = Math.sin(system.tick * 0.02) * 0.05 + 1.0;
        this.nebulas.forEach(n => {
            ctx.save();
            ctx.translate(n.x - mx * 0.5, n.y - my * 0.5);
            ctx.rotate(n.rotation);
            const scale = (1 + Math.sin(system.tick * n.pulseSpeed + n.pulsePhase) * 0.1) * globalPulse;
            ctx.scale(scale, scale);
            ctx.globalAlpha = 0.8 + Math.sin(system.tick * 0.01) * 0.2;
            ctx.drawImage(n.sprite, -n.radius, -n.radius);
            ctx.restore();
        });
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;

        const dustHue = (system.hue + 200) % 360;
        ctx.fillStyle = `hsla(${dustHue}, 60%, 80%, 0.8)`;
        this.dust.forEach(d => {
            ctx.globalAlpha = d.baseAlpha;
            ctx.fillRect(d.x - mx * 0.8, d.y - my * 0.8, d.size, d.size);
        });
        ctx.globalAlpha = 1.0;

        this.drawConstellations(system);

        // Optimized Star Rendering
        const isWarp = system.speedMultiplier > 5;
        if (isWarp) {
            const speedFactor = Math.min(1, (system.speedMultiplier - 5) / 15);
            ctx.strokeStyle = `hsl(${200 + speedFactor * 60}, 80%, 70%)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            this.stars.forEach(star => {
                const px = star.x - mx * star.z;
                const py = star.y - my * star.z;
                let wx = px % (system.width + 100);
                if (wx < -50) wx += system.width + 100;
                else if (wx > system.width + 50) wx -= system.width + 100;
                let wy = py % (system.height + 100);
                if (wy < -50) wy += system.height + 100;
                else if (wy > system.height + 50) wy -= system.height + 100;

                const dx = wx - system.width / 2;
                const dy = wy - system.height / 2;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const len = system.speedMultiplier * (dist / 100 + 1);
                ctx.moveTo(wx, wy);
                ctx.lineTo(wx + (dx / dist) * len, wy + (dy / dist) * len);
            });
            ctx.stroke();
        } else {
            const starColors = ['#ffffff', '#ffe9c4', '#d4fbff', '#ffdede', '#e0ffff'];
            starColors.forEach(color => {
                ctx.fillStyle = color;
                ctx.beginPath();
                this.stars.forEach(star => {
                    if (star.color !== color) return;
                    const px = star.x - mx * star.z;
                    const py = star.y - my * star.z;
                    let wx = px % (system.width + 100);
                    if (wx < -50) wx += system.width + 100;
                    else if (wx > system.width + 50) wx -= system.width + 100;
                    let wy = py % (system.height + 100);
                    if (wy < -50) wy += system.height + 100;
                    else if (wy > system.height + 50) wy -= system.height + 100;

                    const sizeMod = 1 + Math.sin(system.tick * star.twinkleSpeed * 1.5 + star.twinklePhase) * 0.3;
                    const currentSize = star.size * sizeMod;

                    // Batched arc drawing (twinkle handled by size modulation instead of alpha for speed)
                    ctx.moveTo(wx + currentSize, wy);
                    ctx.arc(wx, wy, currentSize, 0, Math.PI * 2);
                });
                ctx.fill();
            });

            // Mouse Constellations (separate pass)
            ctx.lineWidth = 1;
            this.stars.forEach(star => {
                const px = star.x - mx * star.z;
                const py = star.y - my * star.z;
                let wx = px % (system.width + 100);
                if (wx < -50) wx += system.width + 100;
                else if (wx > system.width + 50) wx -= system.width + 100;
                let wy = py % (system.height + 100);
                if (wy < -50) wy += system.height + 100;
                else if (wy > system.height + 50) wy -= system.height + 100;

                const cdx = mouse.x - wx;
                const cdy = mouse.y - wy;
                const cDistSq = cdx * cdx + cdy * cdy;
                if (cDistSq < 22500) {
                    ctx.globalAlpha = 1 - (cDistSq / 22500);
                    ctx.strokeStyle = star.color;
                    ctx.beginPath();
                    ctx.moveTo(mouse.x, mouse.y);
                    ctx.lineTo(wx, wy);
                    ctx.stroke();
                }
            });
        }
        ctx.globalAlpha = 1.0;
    }

    drawAurora(system) {
        const ctx = system.ctx;
        ctx.globalCompositeOperation = 'lighter';
        const colors = [
            `hsla(${system.hue}, 80%, 30%, 0.1)`,
            `hsla(${(system.hue + 60) % 360}, 80%, 30%, 0.1)`,
            `hsla(${(system.hue + 120) % 360}, 80%, 30%, 0.1)`
        ];
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = colors[i];
            ctx.beginPath();
            let yBase = system.height * (0.3 + i * 0.2);
            ctx.moveTo(0, system.height);
            ctx.lineTo(0, yBase);
            for (let x = 0; x <= system.width; x += 50) {
                const n = Math.sin(x * 0.002 + this.auroraOffset + i * 10) * 0.5 + Math.sin(x * 0.005) * 0.2;
                const y = yBase + n * 100;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(system.width, system.height);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    drawConstellations(system) {
        if (system.speedMultiplier > 5) return;
        const ctx = system.ctx;

        const mx = (mouse.x - system.width / 2) * 0.05;
        const my = (mouse.y - system.height / 2) * 0.05;

        // Throttle spatial grid and path updates
        if (!this.constellationPath || system.tick - this.lastConstellationUpdate > 5) {
            system.spatialGrid.clear();
            this.stars.forEach(s => system.spatialGrid.insert(s));

            this.constellationPath = new Path2D();
            for (let i = 0; i < this.stars.length; i++) {
                const s1 = this.stars[i];
                const nearby = system.spatialGrid.getNearby(s1.x, s1.y, 150);
                for (let j = 0; j < nearby.length; j++) {
                    const s2 = nearby[j];
                    if (s1.index >= s2.index) continue;
                    const dx = s1.x - s2.x;
                    const dy = s1.y - s2.y;
                    if (dx * dx + dy * dy < 22500) {
                        let p1x = (s1.x - mx * s1.z) % (system.width + 100);
                        if (p1x < -50) p1x += system.width + 100;
                        else if (p1x > system.width + 50) p1x -= system.width + 100;
                        let p1y = (s1.y - my * s1.z) % (system.height + 100);
                        if (p1y < -50) p1y += system.height + 100;
                        else if (p1y > system.height + 50) p1y -= system.height + 100;

                        let p2x = (s2.x - mx * s2.z) % (system.width + 100);
                        if (p2x < -50) p2x += system.width + 100;
                        else if (p2x > system.width + 50) p2x -= system.width + 100;
                        let p2y = (s2.y - my * s2.z) % (system.height + 100);
                        if (p2y < -50) p2y += system.height + 100;
                        else if (p2y > system.height + 50) p2y -= system.height + 100;

                        if (Math.abs(p1x - p2x) < 200 && Math.abs(p1y - p2y) < 200) {
                            this.constellationPath.moveTo(p1x, p1y);
                            this.constellationPath.lineTo(p2x, p2y);
                        }
                    }
                }
            }
            this.lastConstellationUpdate = system.tick;
        }

        ctx.strokeStyle = `rgba(255, 255, 255, 0.05)`;
        ctx.lineWidth = 1;
        ctx.stroke(this.constellationPath);
    }

    ctxDrawWrapped(ctx, sprite, x, y, size, rotation, system) {
        let wx = x % (system.width + size * 4);
        if (wx < -size * 2) wx += system.width + size * 4;
        let wy = y % (system.height + size * 4);
        if (wy < -size * 2) wy += system.height + size * 4;
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(rotation);
        ctx.drawImage(sprite, -size, -size);
        ctx.restore();
    }
}

/**
 * Digital architecture with glowing perspective grid, circuit board nodes,
 * data packets, enhanced character streams, cascade lighting, corruption
 * events, gravity well data vortex, shockwave response, and trail effects.
 */
export class DigitalArchitecture extends Architecture {
    constructor() {
        super();
        this.streams = [];
        this.nodes = [];
        this.circuitPaths = [];
        this.packets = [];
        this.offsetY = 0;
        // Interactive circuit growth
        this.maxSpawnedNodes = 60;
        this.spawnedNodeCount = 0;
        this.spawnCooldown = 0;
        // Cascade lighting
        this.cascadeQueue = [];
        this.maxCascadeDepth = 5;
        // Corruption events
        this.corruptionActive = false;
        this.corruptionTimer = 0;
        this.corruptionCooldown = 0;
        this.corruptionDuration = 0;
        // Trail effect pool
        this.trailPool = [];
        this.trailPoolSize = 120;
        this.activeTrails = 0;
        // Grid style (set during init from seed)
        this.gridStyle = 0;
        // Character sets for variety
        this.charSets = [
            '01',
            '0123456789ABCDEF',
            '\u2588\u2593\u2592\u2591\u2580\u2584\u258C\u2590',
            '\u00AB\u00BB\u2039\u203A\u2261\u2260\u2248\u221E\u2206\u03A9\u03A3\u03C0',
            '\u30A2\u30A4\u30A6\u30A8\u30AA\u30AB\u30AD\u30AF\u30B1\u30B3',
            '\u25B2\u25BC\u25C6\u25CB\u25A0\u25CF\u2756\u2740'
        ];
    }

    init(system) {
        // Seed-driven grid style: 0=standard, 1=dense neon, 2=sparse wide, 3=isometric
        this.gridStyle = Math.floor(system.rng() * 4);
        // Pick two character sets based on seed for stream variety
        this.primaryCharSet = this.charSets[Math.floor(system.rng() * this.charSets.length)];
        this.secondaryCharSet = this.charSets[Math.floor(system.rng() * this.charSets.length)];
        // Initialize trail pool
        this.trailPool = [];
        this.activeTrails = 0;
        for (let i = 0; i < this.trailPoolSize; i++) {
            this.trailPool.push({ active: false, x: 0, y: 0, alpha: 0, size: 0, hue: 0 });
        }
        this.spawnedNodeCount = 0;
        this.corruptionCooldown = Math.floor(system.rng() * 300) + 200;
        this.generateStreams(system);
        this.generateCircuitBoard(system);
    }

    /** Pick a random character from the primary or secondary set. */
    _randomChar(rng) {
        const set = rng() > 0.3 ? this.primaryCharSet : this.secondaryCharSet;
        return set[Math.floor(rng() * set.length)];
    }

    generateStreams(system) {
        this.streams = [];
        const count = 30;
        for (let i = 0; i < count; i++) {
            const chars = [];
            const len = Math.floor(system.rng() * 8) + 8;
            for (let j = 0; j < len; j++) {
                chars.push(this._randomChar(system.rng));
            }
            this.streams.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                speed: system.rng() * 5 + 2,
                chars: chars,
                opacity: system.rng() * 0.5 + 0.2,
                headBrightness: 1.0,
                glitchTimer: 0
            });
        }
    }

    generateCircuitBoard(system) {
        this.nodes = [];
        this.circuitPaths = [];
        this.packets = [];

        const nodeCount = Math.floor(system.rng() * 15) + 20;
        for (let i = 0; i < nodeCount; i++) {
            this.nodes.push(this._createNode(
                system.rng() * system.width,
                system.rng() * system.height * 0.5,
                system.rng() * 3 + 2,
                system.rng() * Math.PI * 2,
                false
            ));
        }

        this._connectNodes(system);

        // Spawn initial data packets on random paths
        const packetCount = Math.min(this.circuitPaths.length, Math.floor(system.rng() * 8) + 5);
        for (let i = 0; i < packetCount; i++) {
            const pathIdx = Math.floor(system.rng() * this.circuitPaths.length);
            this.packets.push({
                pathIndex: pathIdx,
                progress: system.rng(),
                speed: system.rng() * 0.008 + 0.003,
                size: system.rng() * 2 + 1.5,
                forward: system.rng() > 0.5,
                scattered: false,
                scatterVx: 0,
                scatterVy: 0,
                scatterTimer: 0
            });
        }
    }

    _createNode(x, y, size, pulsePhase, isSpawned) {
        return {
            x, y, size,
            pulsePhase,
            brightness: 0,
            cascadeBrightness: 0,
            cascadeDelay: 0,
            connections: [],
            spawned: isSpawned,
            flickerTimer: 0
        };
    }

    _connectNodes(system) {
        this.circuitPaths = [];
        // Reset connections
        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].connections = [];
        }
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const a = this.nodes[i];
                const b = this.nodes[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < 60000 && a.connections.length < 3 && b.connections.length < 3) {
                    const midX = b.x;
                    const midY = a.y;
                    const path = {
                        from: i,
                        to: j,
                        segments: [
                            { x1: a.x, y1: a.y, x2: midX, y2: midY },
                            { x1: midX, y1: midY, x2: b.x, y2: b.y }
                        ],
                        totalLength: Math.abs(b.x - a.x) + Math.abs(b.y - a.y),
                        flashTimer: 0
                    };
                    this.circuitPaths.push(path);
                    a.connections.push(this.circuitPaths.length - 1);
                    b.connections.push(this.circuitPaths.length - 1);
                }
            }
        }
    }

    /**
     * Returns the (x,y) position along a circuit path at the given progress [0..1].
     */
    getPositionOnPath(path, progress) {
        const seg0Len = Math.abs(path.segments[0].x2 - path.segments[0].x1) + Math.abs(path.segments[0].y2 - path.segments[0].y1);
        const total = path.totalLength;
        if (total === 0) return { x: path.segments[0].x1, y: path.segments[0].y1 };

        const dist = progress * total;
        if (dist <= seg0Len) {
            const t = seg0Len > 0 ? dist / seg0Len : 0;
            const seg = path.segments[0];
            return {
                x: seg.x1 + (seg.x2 - seg.x1) * t,
                y: seg.y1 + (seg.y2 - seg.y1) * t
            };
        } else {
            const seg1Len = total - seg0Len;
            const t = seg1Len > 0 ? (dist - seg0Len) / seg1Len : 0;
            const seg = path.segments[1];
            return {
                x: seg.x1 + (seg.x2 - seg.x1) * t,
                y: seg.y1 + (seg.y2 - seg.y1) * t
            };
        }
    }

    /** Allocate a trail from the object pool. */
    _spawnTrail(x, y, size, hue) {
        for (let i = 0; i < this.trailPoolSize; i++) {
            const t = this.trailPool[i];
            if (!t.active) {
                t.active = true;
                t.x = x;
                t.y = y;
                t.alpha = 0.6;
                t.size = size;
                t.hue = hue;
                this.activeTrails++;
                return;
            }
        }
    }

    /** Start a cascade from a given node index. */
    _startCascade(nodeIndex, brightness, depth) {
        if (depth > this.maxCascadeDepth) return;
        const node = this.nodes[nodeIndex];
        if (!node) return;
        this.cascadeQueue.push({ nodeIndex, brightness, depth, delay: depth * 4 });
    }

    update(system) {
        this.offsetY += 1 * system.speedMultiplier;

        // --- Interactive circuit growth: spawn nodes near mouse ---
        this.spawnCooldown = Math.max(0, this.spawnCooldown - 1);
        if (mouse.x > 0 && mouse.y > 0 && this.spawnCooldown <= 0 && this.spawnedNodeCount < this.maxSpawnedNodes) {
            // Only spawn if mouse is within canvas and near existing nodes
            let nearestDist = Infinity;
            let nearestIdx = -1;
            for (let i = 0; i < this.nodes.length; i++) {
                const n = this.nodes[i];
                const dx = n.x - mouse.x;
                const dy = n.y - mouse.y;
                const d = dx * dx + dy * dy;
                if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
            }
            // Spawn if mouse is within 200px of a node but not too close
            if (nearestDist > 900 && nearestDist < 40000) {
                const angle = Math.atan2(mouse.y - this.nodes[nearestIdx].y, mouse.x - this.nodes[nearestIdx].x);
                const spawnDist = Math.sqrt(nearestDist) * 0.5 + 20;
                const nx = this.nodes[nearestIdx].x + Math.cos(angle) * spawnDist;
                const ny = this.nodes[nearestIdx].y + Math.sin(angle) * spawnDist;
                if (nx > 0 && nx < system.width && ny > 0 && ny < system.height) {
                    const newNode = this._createNode(nx, ny, 2 + system.rng() * 2, system.rng() * Math.PI * 2, true);
                    newNode.brightness = 0.8;
                    this.nodes.push(newNode);
                    this.spawnedNodeCount++;
                    // Connect to nearest node
                    const newIdx = this.nodes.length - 1;
                    const a = this.nodes[nearestIdx];
                    const b = this.nodes[newIdx];
                    const midX = b.x;
                    const midY = a.y;
                    const path = {
                        from: nearestIdx,
                        to: newIdx,
                        segments: [
                            { x1: a.x, y1: a.y, x2: midX, y2: midY },
                            { x1: midX, y1: midY, x2: b.x, y2: b.y }
                        ],
                        totalLength: Math.abs(b.x - a.x) + Math.abs(b.y - a.y),
                        flashTimer: 0
                    };
                    this.circuitPaths.push(path);
                    a.connections.push(this.circuitPaths.length - 1);
                    b.connections.push(this.circuitPaths.length - 1);
                    // Spawn a packet on the new path
                    if (this.packets.length < 40) {
                        this.packets.push({
                            pathIndex: this.circuitPaths.length - 1,
                            progress: 0,
                            speed: system.rng() * 0.008 + 0.005,
                            size: system.rng() * 2 + 1.5,
                            forward: true,
                            scattered: false,
                            scatterVx: 0,
                            scatterVy: 0,
                            scatterTimer: 0
                        });
                    }
                    this.spawnCooldown = 12;
                }
            }
        }

        // --- Digital corruption events ---
        this.corruptionCooldown--;
        if (this.corruptionCooldown <= 0 && !this.corruptionActive) {
            this.corruptionActive = true;
            this.corruptionDuration = 30 + Math.floor(system.rng() * 40);
            this.corruptionTimer = this.corruptionDuration;
        }
        if (this.corruptionActive) {
            this.corruptionTimer--;
            if (this.corruptionTimer <= 0) {
                this.corruptionActive = false;
                this.corruptionCooldown = 200 + Math.floor(system.rng() * 400);
            }
            // During corruption: scramble some stream chars, flicker nodes
            const corruptIntensity = this.corruptionTimer / this.corruptionDuration;
            for (let i = 0; i < this.streams.length; i++) {
                if (system.rng() < 0.3 * corruptIntensity) {
                    const s = this.streams[i];
                    const ci = Math.floor(system.rng() * s.chars.length);
                    s.chars[ci] = this._randomChar(system.rng);
                    s.glitchTimer = 8;
                }
            }
            for (let i = 0; i < this.nodes.length; i++) {
                if (system.rng() < 0.1 * corruptIntensity) {
                    this.nodes[i].flickerTimer = 6 + Math.floor(system.rng() * 10);
                }
            }
        }

        // --- Update character streams ---
        this.streams.forEach(s => {
            s.y += s.speed * system.speedMultiplier;
            if (s.y > system.height + s.chars.length * 15) {
                s.y = -s.chars.length * 15;
                s.x = system.rng() * system.width;
                // Re-randomize some chars on reset
                for (let j = 0; j < s.chars.length; j++) {
                    if (system.rng() < 0.4) s.chars[j] = this._randomChar(system.rng);
                }
            }
            if (s.glitchTimer > 0) s.glitchTimer--;

            // Gravity well data vortex: bend streams toward mouse
            if (system.isGravityWell) {
                const dx = mouse.x - s.x;
                const dy = mouse.y - s.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 300 && dist > 1) {
                    s.x += (dx / dist) * (300 - dist) * 0.01;
                    s.speed = Math.min(s.speed + 0.05, 12);
                }
            }
        });

        // --- Update data packets ---
        this.packets.forEach(p => {
            if (p.scattered && p.scatterTimer > 0) {
                p.scatterTimer--;
                // During scatter, packet drifts off-path
                if (p.scatterTimer <= 0) {
                    p.scattered = false;
                }
                return;
            }
            let speedMod = 1;
            // Gravity well acceleration
            if (system.isGravityWell && this.circuitPaths[p.pathIndex]) {
                const pos = this.getPositionOnPath(this.circuitPaths[p.pathIndex], p.progress);
                const dx = mouse.x - pos.x;
                const dy = mouse.y - pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 250) {
                    speedMod = 1 + (250 - dist) / 100;
                }
            }
            if (p.forward) {
                p.progress += p.speed * system.speedMultiplier * speedMod;
                if (p.progress >= 1) {
                    p.progress = 1;
                    p.forward = false;
                }
            } else {
                p.progress -= p.speed * system.speedMultiplier * speedMod;
                if (p.progress <= 0) {
                    p.progress = 0;
                    p.forward = true;
                }
            }
        });

        // --- Shockwave response: flash paths, scatter packets ---
        system.shockwaves.forEach(sw => {
            for (let i = 0; i < this.circuitPaths.length; i++) {
                const path = this.circuitPaths[i];
                const mid = this.getPositionOnPath(path, 0.5);
                const dx = mid.x - sw.x;
                const dy = mid.y - sw.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (Math.abs(dist - sw.radius) < 80) {
                    path.flashTimer = 15;
                }
            }
            for (let i = 0; i < this.packets.length; i++) {
                const p = this.packets[i];
                if (p.scattered) continue;
                const cpath = this.circuitPaths[p.pathIndex];
                if (!cpath) continue;
                const pos = this.getPositionOnPath(cpath, p.progress);
                const dx = pos.x - sw.x;
                const dy = pos.y - sw.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (Math.abs(dist - sw.radius) < 100 && sw.strength > 0.1) {
                    p.scattered = true;
                    p.scatterVx = (dx / (dist || 1)) * sw.strength * 6;
                    p.scatterVy = (dy / (dist || 1)) * sw.strength * 6;
                    p.scatterTimer = 20;
                }
            }
            // Shockwave also boosts node brightness
            for (let i = 0; i < this.nodes.length; i++) {
                const node = this.nodes[i];
                const dx = node.x - sw.x;
                const dy = node.y - sw.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (Math.abs(dist - sw.radius) < 80) {
                    node.brightness = Math.min(1, node.brightness + 0.5);
                }
            }
        });

        // --- Update node brightness and cascade lighting ---
        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            const dx = node.x - mouse.x;
            const dy = node.y - mouse.y;
            const distSq = dx * dx + dy * dy;
            const mouseRadius = 40000;

            if (distSq < mouseRadius) {
                const prev = node.brightness;
                node.brightness = Math.min(1, node.brightness + 0.08);
                // Trigger cascade when node first activates
                if (prev < 0.3 && node.brightness >= 0.3) {
                    this._startCascade(i, 0.6, 0);
                }
            } else {
                node.brightness = Math.max(0, node.brightness - 0.02);
            }

            // Cascade brightness decay
            if (node.cascadeBrightness > 0) {
                node.brightness = Math.min(1, node.brightness + node.cascadeBrightness * 0.1);
                node.cascadeBrightness = Math.max(0, node.cascadeBrightness - 0.03);
            }

            // Flicker during corruption
            if (node.flickerTimer > 0) {
                node.flickerTimer--;
                node.brightness = system.rng() > 0.5 ? 1 : 0.1;
            }
        }

        // Process cascade queue
        const nextQueue = [];
        for (let i = 0; i < this.cascadeQueue.length; i++) {
            const c = this.cascadeQueue[i];
            c.delay--;
            if (c.delay <= 0) {
                const node = this.nodes[c.nodeIndex];
                if (node && node.cascadeBrightness < c.brightness) {
                    node.cascadeBrightness = c.brightness;
                    // Propagate to connected nodes
                    for (let ci = 0; ci < node.connections.length; ci++) {
                        const pathIdx = node.connections[ci];
                        const path = this.circuitPaths[pathIdx];
                        if (!path) continue;
                        const otherIdx = path.from === c.nodeIndex ? path.to : path.from;
                        if (c.depth < this.maxCascadeDepth) {
                            nextQueue.push({
                                nodeIndex: otherIdx,
                                brightness: c.brightness * 0.7,
                                depth: c.depth + 1,
                                delay: 3
                            });
                        }
                    }
                }
            } else {
                nextQueue.push(c);
            }
        }
        this.cascadeQueue = nextQueue;

        // --- Update trail pool ---
        for (let i = 0; i < this.trailPoolSize; i++) {
            const t = this.trailPool[i];
            if (t.active) {
                t.alpha -= 0.04;
                if (t.alpha <= 0) {
                    t.active = false;
                    this.activeTrails--;
                }
            }
        }

        // Decay path flash timers
        for (let i = 0; i < this.circuitPaths.length; i++) {
            if (this.circuitPaths[i].flashTimer > 0) this.circuitPaths[i].flashTimer--;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const h = system.hue;
        const centerX = system.width / 2;

        // --- Seed-driven grid style ---
        this._drawGrid(system, ctx, h, centerX);

        // --- Circuit Board Paths (with flash support) ---
        ctx.lineWidth = 1;
        for (let i = 0; i < this.circuitPaths.length; i++) {
            const path = this.circuitPaths[i];
            const flash = path.flashTimer > 0 ? path.flashTimer / 15 : 0;
            const alpha = 0.12 + flash * 0.6;
            const lightness = 40 + flash * 50;
            ctx.strokeStyle = `hsla(${h}, 80%, ${lightness}%, ${alpha})`;
            ctx.beginPath();
            for (let s = 0; s < path.segments.length; s++) {
                const seg = path.segments[s];
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
            }
            ctx.stroke();
        }

        // --- Trail effects (from pool) ---
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < this.trailPoolSize; i++) {
            const t = this.trailPool[i];
            if (!t.active) continue;
            const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.size * 3);
            grad.addColorStop(0, `hsla(${t.hue}, 100%, 80%, ${t.alpha * 0.5})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.size * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // --- Circuit Board Nodes (with glow and cascade) ---
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const pulse = Math.sin(system.tick * 0.05);
        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            const basePulse = Math.sin(system.tick * 0.03 + node.pulsePhase) * 0.3 + 0.7;
            const bright = node.brightness;
            const nodeAlpha = 0.3 + bright * 0.7;
            const glowRadius = node.size * (3 + bright * 5 + pulse * 0.5);

            // Outer glow
            if (bright > 0.05 || basePulse > 0.5) {
                const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius);
                const cascadeHueShift = node.cascadeBrightness > 0.1 ? 30 : 0;
                grad.addColorStop(0, `hsla(${(h + cascadeHueShift) % 360}, 100%, 80%, ${nodeAlpha * 0.5 * basePulse})`);
                grad.addColorStop(0.5, `hsla(${(h + cascadeHueShift) % 360}, 100%, 60%, ${nodeAlpha * 0.2 * basePulse})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Core dot
            ctx.fillStyle = `hsla(${h}, 100%, ${70 + bright * 30}%, ${nodeAlpha * basePulse})`;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.size * (1 + bright * 0.5), 0, Math.PI * 2);
            ctx.fill();
        }

        // --- Data Packets (with glow and trails) ---
        for (let i = 0; i < this.packets.length; i++) {
            const p = this.packets[i];
            const path = this.circuitPaths[p.pathIndex];
            if (!path) continue;

            let pos;
            if (p.scattered && p.scatterTimer > 0) {
                // Scattered packet drifts off-path
                const basePos = this.getPositionOnPath(path, p.progress);
                const drift = (20 - p.scatterTimer) / 20;
                pos = {
                    x: basePos.x + p.scatterVx * drift * 10,
                    y: basePos.y + p.scatterVy * drift * 10
                };
            } else {
                pos = this.getPositionOnPath(path, p.progress);
            }
            const packetPulse = Math.sin(system.tick * 0.1 + i * 2) * 0.3 + 0.7;

            // Spawn trail from pool (every few ticks)
            if (system.tick % 3 === 0 && this.activeTrails < this.trailPoolSize - 10) {
                this._spawnTrail(pos.x, pos.y, p.size, (h + 40) % 360);
            }

            // Glow around packet
            const gRad = p.size * 5;
            const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, gRad);
            grad.addColorStop(0, `hsla(${(h + 40) % 360}, 100%, 85%, ${0.6 * packetPulse})`);
            grad.addColorStop(0.4, `hsla(${(h + 40) % 360}, 100%, 60%, ${0.2 * packetPulse})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, gRad, 0, Math.PI * 2);
            ctx.fill();

            // Packet core
            ctx.fillStyle = `hsla(${(h + 40) % 360}, 100%, 90%, ${0.9 * packetPulse})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // --- Character Streams (with glowing head and corruption glitches) ---
        ctx.font = '14px monospace';
        const corruptionOffset = this.corruptionActive ? (this.corruptionTimer / this.corruptionDuration) : 0;
        this.streams.forEach(s => {
            const charCount = s.chars.length;
            for (let i = 0; i < charCount; i++) {
                const charY = s.y + i * 15;
                if (charY < -15 || charY > system.height + 15) continue;

                const isHead = (i === 0);
                const fadeProgress = i / charCount;
                // Corruption: horizontal jitter
                let drawX = s.x;
                if (s.glitchTimer > 0 || (this.corruptionActive && system.rng() < 0.15 * corruptionOffset)) {
                    drawX += (system.rng() - 0.5) * 10;
                }

                if (isHead) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    const headGlow = ctx.createRadialGradient(drawX + 4, charY, 0, drawX + 4, charY, 12);
                    headGlow.addColorStop(0, `hsla(${h}, 100%, 90%, ${s.opacity * 0.5})`);
                    headGlow.addColorStop(1, 'transparent');
                    ctx.fillStyle = headGlow;
                    ctx.fillRect(drawX - 8, charY - 12, 24, 24);
                    ctx.fillStyle = `hsla(${h}, 100%, 95%, ${Math.min(1, s.opacity + 0.6)})`;
                    ctx.fillText(s.chars[i], drawX, charY);
                    ctx.restore();
                } else {
                    const trailAlpha = s.opacity * (1 - fadeProgress * 0.7);
                    const lightness = 70 - fadeProgress * 30;
                    ctx.fillStyle = `hsla(${h}, 100%, ${lightness}%, ${trailAlpha})`;
                    ctx.fillText(s.chars[i], drawX, charY);
                }
            }
        });
    }

    /** Draw the perspective grid with seed-driven style variations. */
    _drawGrid(system, ctx, h, centerX) {
        const horizon = system.height * 0.4;

        if (this.gridStyle === 0) {
            // Standard perspective grid
            this._drawStandardGrid(system, ctx, h, centerX, horizon, 150, 0.15);
        } else if (this.gridStyle === 1) {
            // Dense neon grid - tighter spacing, brighter
            this._drawStandardGrid(system, ctx, h, centerX, horizon, 80, 0.25);
        } else if (this.gridStyle === 2) {
            // Sparse wide grid - wider spacing, more subdued
            this._drawStandardGrid(system, ctx, h, centerX, horizon, 250, 0.1);
        } else {
            // Isometric-style grid: diagonal lines
            this._drawIsometricGrid(system, ctx, h, centerX, horizon);
        }
    }

    _drawStandardGrid(system, ctx, h, centerX, horizon, spacing, alpha) {
        ctx.strokeStyle = `hsla(${h}, 100%, 50%, ${alpha})`;
        ctx.lineWidth = 1;
        for (let x = -system.width; x <= system.width * 2; x += spacing) {
            ctx.beginPath();
            for (let y = system.height; y >= horizon; y -= 40) {
                const pos = Math.pow((y - horizon) / (system.height - horizon), 2);
                let drawX = centerX + (x - centerX) * (0.1 + pos * 0.9);
                let drawY = y;
                const dx = drawX - mouse.x;
                const dy = drawY - mouse.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 40000 && distSq > 0.01) {
                    const dist = Math.sqrt(distSq);
                    const force = (200 - dist) / 200;
                    drawX += (dx / dist) * force * 40;
                    drawY += (dy / dist) * force * 40;
                }
                if (y === system.height) ctx.moveTo(drawX, drawY);
                else ctx.lineTo(drawX, drawY);
            }
            ctx.stroke();
        }
        // Horizontal grid lines
        const hLineCount = this.gridStyle === 1 ? 30 : 20;
        for (let y = 0; y <= hLineCount; y++) {
            const pos = Math.pow(y / hLineCount, 2);
            const drawYBase = horizon + pos * (system.height - horizon);
            ctx.strokeStyle = `hsla(${h}, 100%, 50%, ${pos * (alpha + 0.05)})`;
            ctx.beginPath();
            for (let x = 0; x <= system.width; x += 100) {
                let drawX = x;
                let drawY = drawYBase;
                const dx = drawX - mouse.x;
                const dy = drawY - mouse.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 40000 && distSq > 0.01) {
                    const dist = Math.sqrt(distSq);
                    const force = (200 - dist) / 200;
                    drawX += (dx / dist) * force * 40;
                    drawY += (dy / dist) * force * 40;
                }
                if (x === 0) ctx.moveTo(drawX, drawY);
                else ctx.lineTo(drawX, drawY);
            }
            ctx.stroke();
        }
    }

    _drawIsometricGrid(system, ctx, h, centerX, horizon) {
        ctx.strokeStyle = `hsla(${h}, 100%, 50%, 0.12)`;
        ctx.lineWidth = 1;
        const gridSize = 120;
        // Diagonal lines from left-top to right-bottom
        for (let offset = -system.width; offset < system.width * 2; offset += gridSize) {
            ctx.beginPath();
            let started = false;
            for (let t = 0; t <= system.height - horizon; t += 20) {
                let drawX = offset + t * 0.8;
                let drawY = horizon + t;
                const dx = drawX - mouse.x;
                const dy = drawY - mouse.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 40000 && distSq > 0.01) {
                    const dist = Math.sqrt(distSq);
                    const force = (200 - dist) / 200;
                    drawX += (dx / dist) * force * 40;
                    drawY += (dy / dist) * force * 40;
                }
                if (!started) { ctx.moveTo(drawX, drawY); started = true; }
                else ctx.lineTo(drawX, drawY);
            }
            ctx.stroke();
        }
        // Opposite diagonal
        for (let offset = -system.width; offset < system.width * 2; offset += gridSize) {
            ctx.beginPath();
            let started = false;
            for (let t = 0; t <= system.height - horizon; t += 20) {
                let drawX = offset - t * 0.8;
                let drawY = horizon + t;
                const dx = drawX - mouse.x;
                const dy = drawY - mouse.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 40000 && distSq > 0.01) {
                    const dist = Math.sqrt(distSq);
                    const force = (200 - dist) / 200;
                    drawX += (dx / dist) * force * 40;
                    drawY += (dy / dist) * force * 40;
                }
                if (!started) { ctx.moveTo(drawX, drawY); started = true; }
                else ctx.lineTo(drawX, drawY);
            }
            ctx.stroke();
        }
        // Horizontal lines
        for (let y = 0; y <= 20; y++) {
            const pos = Math.pow(y / 20, 2);
            const drawYBase = horizon + pos * (system.height - horizon);
            ctx.strokeStyle = `hsla(${h}, 100%, 50%, ${pos * 0.15})`;
            ctx.beginPath();
            ctx.moveTo(0, drawYBase);
            ctx.lineTo(system.width, drawYBase);
            ctx.stroke();
        }
    }
}

/**
 * Geometric architecture with interactive floating shards, mouse repulsion,
 * gravity well scatter, shockwave response, per-shard brightness/glow,
 * hue variation, and batched connection lines.
 */
export class GeometricArchitecture extends Architecture {
    constructor() {
        super();
        this.shards = [];
        this.connectionPath = null;
        this.lastConnectionUpdate = 0;
    }

    init(system) {
        const rng = system.rng;
        this.shards = [];
        this.magneticMode = rng() > 0.5;
        // Seed-driven visual style: 0=wireframe, 1=filled, 2=neon, 3=glass
        this.visualStyle = Math.floor(rng() * 4);
        // Connection style: 0=nearest, 1=all-in-range, 2=chain, 3=none
        this.connectionStyle = Math.floor(rng() * 4);
        this.connectionRadius = 150 + rng() * 150;
        this.connectionRadiusSq = this.connectionRadius * this.connectionRadius;
        // Background grid
        this.hasGrid = rng() > 0.6;
        this.gridSpacing = 30 + rng() * 60;
        this.gridHue = system.hue;
        // Orbit mode: some shards orbit a center point
        this.hasOrbits = rng() > 0.5;
        this.orbitCenterX = system.width * (0.3 + rng() * 0.4);
        this.orbitCenterY = system.height * (0.3 + rng() * 0.4);
        // Trail effect
        this.hasTrails = rng() > 0.6;

        const count = 40 + Math.floor(rng() * 30);
        for (let i = 0; i < count; i++) {
            const isOrbiter = this.hasOrbits && rng() > 0.5;
            this.shards.push({
                x: rng() * system.width,
                y: rng() * system.height,
                vx: (rng() - 0.5) * 1,
                vy: (rng() - 0.5) * 1,
                size: rng() * 20 + 10,
                rotation: rng() * Math.PI * 2,
                rotationSpeed: (rng() - 0.5) * 0.02,
                sides: Math.floor(rng() * 5) + 3, // 3-7 sides for more variety
                brightness: 0,
                hueOffset: (rng() - 0.5) * 60,
                innerLayers: 1 + Math.floor(rng() * 2),
                innerScale: 0.4 + rng() * 0.3,
                isOrbiter,
                orbitRadius: isOrbiter ? 100 + rng() * 200 : 0,
                orbitSpeed: isOrbiter ? (0.002 + rng() * 0.008) * (rng() > 0.5 ? 1 : -1) : 0,
                orbitPhase: rng() * Math.PI * 2,
                trailX: [],
                trailY: [],
            });
        }
    }

    update(system) {
        const mouseRepelRadius = 180;
        const mouseRepelRadiusSq = mouseRepelRadius * mouseRepelRadius;

        this.shards.forEach(s => {
            // --- Mouse repulsion ---
            const mdx = s.x - mouse.x;
            const mdy = s.y - mouse.y;
            const mDistSq = mdx * mdx + mdy * mdy;

            if (system.isGravityWell) {
                // Gravity well: dramatic scatter - push shards violently outward
                if (mDistSq < 250000 && mDistSq > 1) { // ~500px radius
                    const mDist = Math.sqrt(mDistSq);
                    const force = (500 - mDist) / 500 * 6;
                    s.vx += (mdx / mDist) * force;
                    s.vy += (mdy / mDist) * force;
                    s.brightness = Math.min(1, s.brightness + 0.15);
                    s.rotationSpeed += (mdx > 0 ? 0.01 : -0.01);
                }
            } else if (mDistSq < mouseRepelRadiusSq && mDistSq > 1) {
                // Normal mouse repulsion
                const mDist = Math.sqrt(mDistSq);
                const push = (mouseRepelRadius - mDist) / mouseRepelRadius * 2;
                s.vx += (mdx / mDist) * push;
                s.vy += (mdy / mDist) * push;
                s.brightness = Math.min(1, s.brightness + 0.05);
            }

            // --- Shockwave response ---
            system.shockwaves.forEach(sw => {
                const sdx = s.x - sw.x;
                const sdy = s.y - sw.y;
                const sDistSq = sdx * sdx + sdy * sdy;
                const sDist = Math.sqrt(sDistSq);
                if (sDist > 1 && Math.abs(sDist - sw.radius) < 60) {
                    const push = (1 - Math.abs(sDist - sw.radius) / 60) * sw.strength;
                    s.vx += (sdx / sDist) * push * 8;
                    s.vy += (sdy / sDist) * push * 8;
                    s.brightness = Math.min(1, s.brightness + 0.2);
                }
            });

            // --- Orbiting shards ---
            if (s.isOrbiter) {
                s.orbitPhase += s.orbitSpeed * system.speedMultiplier;
                const targetX = this.orbitCenterX + Math.cos(s.orbitPhase) * s.orbitRadius;
                const targetY = this.orbitCenterY + Math.sin(s.orbitPhase) * s.orbitRadius;
                s.vx += (targetX - s.x) * 0.005;
                s.vy += (targetY - s.y) * 0.005;
            }

            // --- Physics integration ---
            s.x += s.vx * system.speedMultiplier;
            s.y += s.vy * system.speedMultiplier;
            s.rotation += s.rotationSpeed * system.speedMultiplier;

            // Trail tracking
            if (this.hasTrails) {
                s.trailX.push(s.x);
                s.trailY.push(s.y);
                if (s.trailX.length > 8) {
                    s.trailX.shift();
                    s.trailY.shift();
                }
            }

            // Magnetic mode: shards align rotation to nearest neighbor
            if (this.magneticMode) {
                let nearestDist = Infinity;
                let nearestRot = s.rotation;
                for (let j = 0; j < this.shards.length; j++) {
                    const other = this.shards[j];
                    if (other === s) continue;
                    const ddx = other.x - s.x;
                    const ddy = other.y - s.y;
                    const dd = ddx * ddx + ddy * ddy;
                    if (dd < nearestDist && dd < 40000) {
                        nearestDist = dd;
                        nearestRot = other.rotation;
                    }
                }
                if (nearestDist < 40000) {
                    const diff = nearestRot - s.rotation;
                    s.rotationSpeed += Math.sin(diff) * 0.003;
                }
            }

            // Friction / damping
            s.vx *= 0.96;
            s.vy *= 0.96;
            s.rotationSpeed *= 0.995;

            // Brightness decay over time
            s.brightness = Math.max(0, s.brightness - 0.008);

            // Wrap around screen edges
            if (s.x < -s.size) s.x = system.width + s.size;
            else if (s.x > system.width + s.size) s.x = -s.size;
            if (s.y < -s.size) s.y = system.height + s.size;
            else if (s.y > system.height + s.size) s.y = -s.size;
        });
    }

    draw(system) {
        const ctx = system.ctx;
        const h = system.hue;

        // Background grid
        if (this.hasGrid) {
            ctx.strokeStyle = `hsla(${this.gridHue}, 20%, 30%, 0.04)`;
            ctx.lineWidth = 0.5;
            const offset = (system.tick * 0.15) % this.gridSpacing;
            ctx.beginPath();
            for (let x = -offset; x < system.width + this.gridSpacing; x += this.gridSpacing) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, system.height);
            }
            for (let y = -offset; y < system.height + this.gridSpacing; y += this.gridSpacing) {
                ctx.moveTo(0, y);
                ctx.lineTo(system.width, y);
            }
            ctx.stroke();
        }

        // Shard trails
        if (this.hasTrails) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineWidth = 0.5;
            for (const s of this.shards) {
                if (s.trailX.length < 2) continue;
                const shardHue = (h + s.hueOffset + 360) % 360;
                ctx.strokeStyle = `hsla(${shardHue}, 50%, 50%, 0.06)`;
                ctx.beginPath();
                ctx.moveTo(s.trailX[0], s.trailY[0]);
                for (let t = 1; t < s.trailX.length; t++) {
                    ctx.lineTo(s.trailX[t], s.trailY[t]);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // --- Batched connection lines using Path2D ---
        if (this.connectionStyle < 3) {
            if (!this.connectionPath || system.tick - this.lastConnectionUpdate > 3) {
                this.connectionPath = new Path2D();
                const radSq = this.connectionRadiusSq;
                if (this.connectionStyle === 2) {
                    // Chain: connect each to next nearest
                    for (let i = 0; i < this.shards.length - 1; i++) {
                        this.connectionPath.moveTo(this.shards[i].x, this.shards[i].y);
                        this.connectionPath.lineTo(this.shards[i + 1].x, this.shards[i + 1].y);
                    }
                } else {
                    for (let i = 0; i < this.shards.length; i++) {
                        for (let j = i + 1; j < this.shards.length; j++) {
                            const s1 = this.shards[i];
                            const s2 = this.shards[j];
                            const dx = s1.x - s2.x;
                            const dy = s1.y - s2.y;
                            if (dx * dx + dy * dy < radSq) {
                                this.connectionPath.moveTo(s1.x, s1.y);
                                this.connectionPath.lineTo(s2.x, s2.y);
                            }
                        }
                    }
                }
                this.lastConnectionUpdate = system.tick;
            }
            const connAlpha = this.visualStyle === 2 ? 0.15 : 0.08;
            ctx.strokeStyle = `hsla(${h}, 50%, 70%, ${connAlpha})`;
            ctx.lineWidth = this.visualStyle === 2 ? 0.8 : 1;
            ctx.stroke(this.connectionPath);
        }

        // --- Draw shards with per-shard brightness, hue offset, and glow ---
        this.shards.forEach(s => {
            const shardHue = (h + s.hueOffset + 360) % 360;
            const bright = s.brightness;

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rotation);

            // Glow effect for bright shards (radialGradient with 'lighter' composite)
            if (bright > 0.05) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const glowRadius = s.size * (1.5 + bright * 2);
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
                grad.addColorStop(0, `hsla(${shardHue}, 80%, 70%, ${bright * 0.4})`);
                grad.addColorStop(0.5, `hsla(${shardHue}, 80%, 50%, ${bright * 0.15})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Shard polygon
            ctx.beginPath();
            for (let i = 0; i < s.sides; i++) {
                const angle = (i / s.sides) * Math.PI * 2;
                ctx.lineTo(Math.cos(angle) * s.size, Math.sin(angle) * s.size);
            }
            ctx.closePath();

            // Fill with brightness-responsive alpha
            const fillAlpha = 0.1 + bright * 0.3;
            ctx.fillStyle = `hsla(${shardHue}, 50%, ${50 + bright * 30}%, ${fillAlpha})`;
            ctx.fill();

            // Stroke with enhanced alpha: 0.15 base + brightness * 0.4
            const strokeAlpha = 0.15 + bright * 0.4;
            ctx.strokeStyle = `hsla(${shardHue}, 60%, ${70 + bright * 20}%, ${strokeAlpha})`;
            ctx.lineWidth = 1 + bright * 0.5;
            ctx.stroke();

            // Inner inscribed polygon patterns
            for (let layer = 1; layer <= s.innerLayers; layer++) {
                const innerSize = s.size * Math.pow(s.innerScale, layer);
                const innerRot = (Math.PI / s.sides) * layer; // Rotated offset
                ctx.beginPath();
                for (let k = 0; k < s.sides; k++) {
                    const a = (k / s.sides) * Math.PI * 2 + innerRot;
                    ctx.lineTo(Math.cos(a) * innerSize, Math.sin(a) * innerSize);
                }
                ctx.closePath();
                ctx.strokeStyle = `hsla(${shardHue}, 50%, ${60 + bright * 20}%, ${(strokeAlpha * 0.5) / layer})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }

            ctx.restore();
        });
    }
}
