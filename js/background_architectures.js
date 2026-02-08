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
            const color = `hsla(${system.hue + (system.rng() - 0.5) * 100}, 80%, 25%, 0.15)`;
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
 * data packets, and enhanced character streams.
 */
export class DigitalArchitecture extends Architecture {
    constructor() {
        super();
        this.streams = [];
        this.nodes = [];
        this.circuitPaths = [];
        this.packets = [];
        this.offsetY = 0;
    }

    init(system) {
        this.generateStreams(system);
        this.generateCircuitBoard(system);
    }

    generateStreams(system) {
        this.streams = [];
        const count = 30;
        for (let i = 0; i < count; i++) {
            const chars = [];
            const len = Math.floor(system.rng() * 8) + 8;
            for (let j = 0; j < len; j++) {
                chars.push(system.rng() > 0.5 ? '1' : '0');
            }
            this.streams.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                speed: system.rng() * 5 + 2,
                chars: chars,
                opacity: system.rng() * 0.5 + 0.2,
                headBrightness: 1.0
            });
        }
    }

    generateCircuitBoard(system) {
        this.nodes = [];
        this.circuitPaths = [];
        this.packets = [];

        // Generate circuit board nodes across the upper portion of the screen
        const nodeCount = Math.floor(system.rng() * 15) + 20;
        for (let i = 0; i < nodeCount; i++) {
            this.nodes.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height * 0.5,
                size: system.rng() * 3 + 2,
                pulsePhase: system.rng() * Math.PI * 2,
                brightness: 0,
                connections: []
            });
        }

        // Connect nearby nodes with right-angle circuit paths
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const a = this.nodes[i];
                const b = this.nodes[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distSq = dx * dx + dy * dy;

                // Connect nodes within range, limit connections per node
                if (distSq < 60000 && a.connections.length < 3 && b.connections.length < 3) {
                    // Right-angle path: go horizontal first, then vertical
                    const midX = b.x;
                    const midY = a.y;
                    const path = {
                        from: i,
                        to: j,
                        segments: [
                            { x1: a.x, y1: a.y, x2: midX, y2: midY },
                            { x1: midX, y1: midY, x2: b.x, y2: b.y }
                        ],
                        totalLength: Math.abs(b.x - a.x) + Math.abs(b.y - a.y)
                    };
                    this.circuitPaths.push(path);
                    a.connections.push(this.circuitPaths.length - 1);
                    b.connections.push(this.circuitPaths.length - 1);
                }
            }
        }

        // Spawn initial data packets on random paths
        const packetCount = Math.min(this.circuitPaths.length, Math.floor(system.rng() * 8) + 5);
        for (let i = 0; i < packetCount; i++) {
            const pathIdx = Math.floor(system.rng() * this.circuitPaths.length);
            this.packets.push({
                pathIndex: pathIdx,
                progress: system.rng(),
                speed: system.rng() * 0.008 + 0.003,
                size: system.rng() * 2 + 1.5,
                forward: system.rng() > 0.5
            });
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
            // On first segment
            const t = seg0Len > 0 ? dist / seg0Len : 0;
            const seg = path.segments[0];
            return {
                x: seg.x1 + (seg.x2 - seg.x1) * t,
                y: seg.y1 + (seg.y2 - seg.y1) * t
            };
        } else {
            // On second segment
            const seg1Len = total - seg0Len;
            const t = seg1Len > 0 ? (dist - seg0Len) / seg1Len : 0;
            const seg = path.segments[1];
            return {
                x: seg.x1 + (seg.x2 - seg.x1) * t,
                y: seg.y1 + (seg.y2 - seg.y1) * t
            };
        }
    }

    update(system) {
        this.offsetY += 1 * system.speedMultiplier;

        // Update character streams
        this.streams.forEach(s => {
            s.y += s.speed * system.speedMultiplier;
            if (s.y > system.height + s.chars.length * 15) {
                s.y = -s.chars.length * 15;
                s.x = system.rng() * system.width;
            }
        });

        // Update data packets
        this.packets.forEach(p => {
            if (p.forward) {
                p.progress += p.speed * system.speedMultiplier;
                if (p.progress >= 1) {
                    p.progress = 1;
                    p.forward = false;
                }
            } else {
                p.progress -= p.speed * system.speedMultiplier;
                if (p.progress <= 0) {
                    p.progress = 0;
                    p.forward = true;
                }
            }
        });

        // Update node brightness based on mouse proximity
        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            const dx = node.x - mouse.x;
            const dy = node.y - mouse.y;
            const distSq = dx * dx + dy * dy;
            const mouseRadius = 40000; // ~200px radius

            if (distSq < mouseRadius) {
                node.brightness = Math.min(1, node.brightness + 0.08);
            } else {
                node.brightness = Math.max(0, node.brightness - 0.02);
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const h = system.hue;
        const centerX = system.width / 2;
        const horizon = system.height * 0.4;

        // --- Perspective Grid (kept as original) ---
        ctx.strokeStyle = `hsla(${h}, 100%, 50%, 0.15)`;
        ctx.lineWidth = 1;
        for (let x = -system.width; x <= system.width * 2; x += 150) {
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

        // --- Horizontal Grid Lines (kept as original) ---
        for (let y = 0; y <= 20; y++) {
            const pos = Math.pow(y / 20, 2);
            const drawYBase = horizon + pos * (system.height - horizon);
            ctx.strokeStyle = `hsla(${h}, 100%, 50%, ${pos * 0.2})`;
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

        // --- Circuit Board Paths ---
        ctx.strokeStyle = `hsla(${h}, 80%, 40%, 0.12)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < this.circuitPaths.length; i++) {
            const path = this.circuitPaths[i];
            for (let s = 0; s < path.segments.length; s++) {
                const seg = path.segments[s];
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
            }
        }
        ctx.stroke();

        // --- Circuit Board Nodes (with glow) ---
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
                grad.addColorStop(0, `hsla(${h}, 100%, 80%, ${nodeAlpha * 0.5 * basePulse})`);
                grad.addColorStop(0.5, `hsla(${h}, 100%, 60%, ${nodeAlpha * 0.2 * basePulse})`);
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

        // --- Data Packets (with glow) ---
        for (let i = 0; i < this.packets.length; i++) {
            const p = this.packets[i];
            const path = this.circuitPaths[p.pathIndex];
            if (!path) continue;

            const pos = this.getPositionOnPath(path, p.progress);
            const packetPulse = Math.sin(system.tick * 0.1 + i * 2) * 0.3 + 0.7;

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

        // --- Character Streams (with glowing head) ---
        ctx.font = '14px monospace';
        this.streams.forEach(s => {
            const charCount = s.chars.length;
            for (let i = 0; i < charCount; i++) {
                const charY = s.y + i * 15;
                if (charY < -15 || charY > system.height + 15) continue;

                const isHead = (i === 0);
                const fadeProgress = i / charCount;

                if (isHead) {
                    // Glowing head character - brighter, with lighter composite
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    // Head glow aura
                    const headGlow = ctx.createRadialGradient(s.x + 4, charY, 0, s.x + 4, charY, 12);
                    headGlow.addColorStop(0, `hsla(${h}, 100%, 90%, ${s.opacity * 0.5})`);
                    headGlow.addColorStop(1, 'transparent');
                    ctx.fillStyle = headGlow;
                    ctx.fillRect(s.x - 8, charY - 12, 24, 24);
                    // Head character
                    ctx.fillStyle = `hsla(${h}, 100%, 95%, ${Math.min(1, s.opacity + 0.6)})`;
                    ctx.fillText(s.chars[i], s.x, charY);
                    ctx.restore();
                } else {
                    // Trail characters - fade out toward tail
                    const trailAlpha = s.opacity * (1 - fadeProgress * 0.7);
                    const lightness = 70 - fadeProgress * 30;
                    ctx.fillStyle = `hsla(${h}, 100%, ${lightness}%, ${trailAlpha})`;
                    ctx.fillText(s.chars[i], s.x, charY);
                }
            }
        });
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
        this.shards = [];
        const count = 50;
        for (let i = 0; i < count; i++) {
            this.shards.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                vx: (system.rng() - 0.5) * 1,
                vy: (system.rng() - 0.5) * 1,
                size: system.rng() * 20 + 10,
                rotation: system.rng() * Math.PI * 2,
                rotationSpeed: (system.rng() - 0.5) * 0.02,
                sides: Math.floor(system.rng() * 3) + 3,
                brightness: 0,
                hueOffset: (system.rng() - 0.5) * 60
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

            // --- Physics integration ---
            s.x += s.vx * system.speedMultiplier;
            s.y += s.vy * system.speedMultiplier;
            s.rotation += s.rotationSpeed * system.speedMultiplier;

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

        // --- Batched connection lines using Path2D ---
        // Throttle connection path rebuilds for performance
        if (!this.connectionPath || system.tick - this.lastConnectionUpdate > 3) {
            this.connectionPath = new Path2D();
            for (let i = 0; i < this.shards.length; i++) {
                for (let j = i + 1; j < this.shards.length; j++) {
                    const s1 = this.shards[i];
                    const s2 = this.shards[j];
                    const dx = s1.x - s2.x;
                    const dy = s1.y - s2.y;
                    if (dx * dx + dy * dy < 40000) {
                        this.connectionPath.moveTo(s1.x, s1.y);
                        this.connectionPath.lineTo(s2.x, s2.y);
                    }
                }
            }
            this.lastConnectionUpdate = system.tick;
        }

        ctx.strokeStyle = `hsla(${h}, 50%, 70%, 0.2)`;
        ctx.lineWidth = 1;
        ctx.stroke(this.connectionPath);

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

            ctx.restore();
        });
    }
}
