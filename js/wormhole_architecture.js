/**
 * @file wormhole_architecture.js
 * @description Interconnected wormhole portals that warp space and tunnel particles
 * between them. Seeds change portal count, warp intensity, color schemes, particle
 * behavior (spiral in vs. stretch through), portal shapes, and dimensional distortion
 * patterns. Cursor proximity distorts the nearest portal. Click to create temporary
 * unstable rift portals that implode dramatically.
 */

import { Architecture } from './background_architectures.js';
import { mouse, isLeftMouseDown } from './state.js';

export class WormholeArchitecture extends Architecture {
    constructor() {
        super();
        this.portals = [];
        this.particles = [];
        this.particlePool = [];
        this.distortionGrid = [];
        this.rifts = [];
        this.warpStyle = 0;
        this.colorMode = 0;
        this.baseHue = 0;
        this.spiralTightness = 0;
        this.tunnelSpeed = 0;
        this.gridCols = 0;
        this.gridRows = 0;
    }

    init(system) {
        const rng = system.rng;

        // Warp visual style
        this.warpStyle = Math.floor(rng() * 5);
        // 0 = classic spiral, 1 = stretched spaghettification, 2 = pulsing rings
        // 3 = geometric fracture, 4 = nebula clouds

        this.colorMode = Math.floor(rng() * 5);
        // 0 = void purple, 1 = electric blue, 2 = fire orange, 3 = reality-tear green, 4 = cosmic rainbow

        this.baseHue = rng() * 360;
        this.spiralTightness = 2 + rng() * 8;
        this.tunnelSpeed = 1 + rng() * 4;
        this.particleDensity = Math.floor(40 + rng() * 80);
        this.warpIntensity = 20 + rng() * 80;
        this.portalPulse = 0.01 + rng() * 0.04;

        // Generate portals — linked in pairs
        const portalCount = 2 + Math.floor(rng() * 4) * 2; // always even
        this.portals = [];
        for (let i = 0; i < portalCount; i++) {
            this.portals.push({
                x: system.width * (0.15 + rng() * 0.7),
                y: system.height * (0.15 + rng() * 0.7),
                radius: 40 + rng() * 60,
                rotation: rng() * Math.PI * 2,
                rotSpeed: (rng() - 0.5) * 0.04,
                linkedTo: i % 2 === 0 ? i + 1 : i - 1, // pair linking
                hue: (this.baseHue + i * (360 / portalCount)) % 360,
                pulsePhase: rng() * Math.PI * 2,
                depth: 0.5 + rng() * 1.5, // warp depth multiplier
                orbitAngle: rng() * Math.PI * 2,
                orbitSpeed: 0.002 + rng() * 0.008,
                orbitRadius: 30 + rng() * 80,
                baseX: system.width * (0.15 + rng() * 0.7),
                baseY: system.height * (0.15 + rng() * 0.7),
            });
        }
        // Fix last portal link if odd
        if (portalCount % 2 !== 0 && portalCount > 1) {
            this.portals[portalCount - 1].linkedTo = 0;
        }

        // Spawn particles
        this.particles = [];
        this.particlePool = [];
        for (let i = 0; i < this.particleDensity; i++) {
            this.particles.push(this._createParticle(system, rng));
        }

        // Space distortion grid for background warp
        this.gridCols = Math.ceil(system.width / 30) + 1;
        this.gridRows = Math.ceil(system.height / 30) + 1;
        this.distortionGrid = new Float32Array(this.gridCols * this.gridRows * 2);

        this.rifts = [];
    }

    _createParticle(system, rng) {
        return {
            x: rng() * system.width,
            y: rng() * system.height,
            vx: (rng() - 0.5) * 0.5,
            vy: (rng() - 0.5) * 0.5,
            size: 1 + rng() * 2,
            alpha: 0.3 + rng() * 0.7,
            hue: this.baseHue + rng() * 60,
            captured: -1, // portal index or -1
            captureProgress: 0,
            trail: []
        };
    }

    _getPortalColor(portal, alpha) {
        switch (this.colorMode) {
            case 0: return `hsla(${270 + Math.sin(portal.rotation) * 20}, 80%, 50%, ${alpha})`;
            case 1: return `hsla(${200 + Math.sin(portal.rotation) * 30}, 90%, 55%, ${alpha})`;
            case 2: return `hsla(${20 + Math.sin(portal.rotation) * 20}, 95%, 50%, ${alpha})`;
            case 3: return `hsla(${120 + Math.sin(portal.rotation) * 40}, 85%, 45%, ${alpha})`;
            case 4: return `hsla(${(portal.hue + portal.rotation * 30) % 360}, 80%, 55%, ${alpha})`;
            default: return `hsla(${portal.hue}, 70%, 50%, ${alpha})`;
        }
    }

    update(system) {
        const tick = system.tick;
        const rng = system.rng;
        const qualityScale = system.qualityScale || 1;

        // Update portal positions (gentle orbit)
        for (const p of this.portals) {
            p.rotation += p.rotSpeed;
            p.orbitAngle += p.orbitSpeed;
            p.x = p.baseX + Math.cos(p.orbitAngle) * p.orbitRadius;
            p.y = p.baseY + Math.sin(p.orbitAngle * 0.7) * p.orbitRadius;

            // Cursor distortion — nearest portal warps toward mouse
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 250) {
                const pull = (1 - dist / 250) * 0.03;
                p.x += dx * pull;
                p.y += dy * pull;
                p.radius += (60 - p.radius) * 0.02 * (1 - dist / 250);
            }
        }

        // Click rift
        if (isLeftMouseDown && tick % 20 === 0) {
            this.rifts.push({
                x: mouse.x, y: mouse.y,
                radius: 5, maxRadius: 80 + rng() * 60,
                life: 90, maxLife: 90,
                rotation: 0, rotSpeed: 0.1 + rng() * 0.2,
                hue: this.baseHue + rng() * 120
            });
        }

        // Update rifts
        for (let i = this.rifts.length - 1; i >= 0; i--) {
            const r = this.rifts[i];
            r.life--;
            r.rotation += r.rotSpeed;

            if (r.life > r.maxLife * 0.6) {
                // Expanding
                r.radius += (r.maxRadius - r.radius) * 0.08;
            } else {
                // Imploding
                r.radius *= 0.96;
                r.rotSpeed *= 1.03; // spin faster as it collapses
            }

            // Pull nearby particles
            for (const part of this.particles) {
                const dx = r.x - part.x;
                const dy = r.y - part.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < r.radius * 3 && dist > 5) {
                    const force = (r.radius / dist) * 0.3;
                    part.vx += (dx / dist) * force;
                    part.vy += (dy / dist) * force;
                }
            }

            if (r.life <= 0 || r.radius < 2) {
                this.rifts[i] = this.rifts[this.rifts.length - 1];
                this.rifts.pop();
            }
        }

        // Update distortion grid
        if (qualityScale > 0.4) {
            for (let row = 0; row < this.gridRows; row++) {
                for (let col = 0; col < this.gridCols; col++) {
                    const idx = (row * this.gridCols + col) * 2;
                    const gx = col * 30;
                    const gy = row * 30;
                    let ox = 0, oy = 0;

                    for (const p of this.portals) {
                        const dx = gx - p.x;
                        const dy = gy - p.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) + 1;
                        if (dist < p.radius * 5) {
                            const strength = (p.radius * p.depth * this.warpIntensity) / (dist * dist) * 10;
                            ox += (-dx / dist) * strength;
                            oy += (-dy / dist) * strength;
                        }
                    }

                    this.distortionGrid[idx] = ox;
                    this.distortionGrid[idx + 1] = oy;
                }
            }
        }

        // Update particles
        for (const part of this.particles) {
            // Portal gravity
            for (let pi = 0; pi < this.portals.length; pi++) {
                const p = this.portals[pi];
                const dx = p.x - part.x;
                const dy = p.y - part.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < p.radius * 4) {
                    // Spiral toward portal
                    const force = (p.radius / (dist + 10)) * 0.05;
                    const angle = Math.atan2(dy, dx);
                    // Add tangential force for spiral
                    part.vx += Math.cos(angle + this.spiralTightness * 0.1) * force;
                    part.vy += Math.sin(angle + this.spiralTightness * 0.1) * force;

                    // Capture: teleport to linked portal
                    if (dist < p.radius * 0.5 && part.captured === -1) {
                        part.captured = pi;
                        part.captureProgress = 0;
                    }
                }
            }

            // Teleportation animation
            if (part.captured >= 0) {
                part.captureProgress += 0.05 * this.tunnelSpeed;
                if (part.captureProgress >= 1) {
                    const src = this.portals[part.captured];
                    const dest = this.portals[src.linkedTo];
                    if (dest) {
                        // Emerge from linked portal
                        const exitAngle = rng() * Math.PI * 2;
                        const exitDist = dest.radius * (1 + rng());
                        part.x = dest.x + Math.cos(exitAngle) * exitDist;
                        part.y = dest.y + Math.sin(exitAngle) * exitDist;
                        part.vx = Math.cos(exitAngle) * 2;
                        part.vy = Math.sin(exitAngle) * 2;
                    }
                    part.captured = -1;
                    part.trail = [];
                }
            } else {
                part.x += part.vx;
                part.y += part.vy;
                part.vx *= 0.995;
                part.vy *= 0.995;

                // Wrap around screen
                if (part.x < -20) part.x = system.width + 20;
                if (part.x > system.width + 20) part.x = -20;
                if (part.y < -20) part.y = system.height + 20;
                if (part.y > system.height + 20) part.y = -20;
            }

            // Trail
            part.trail.push({ x: part.x, y: part.y });
            if (part.trail.length > 15) part.trail.shift();
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const qualityScale = system.qualityScale || 1;

        // Draw distorted grid lines for space warp
        if (qualityScale > 0.4) {
            ctx.save();
            ctx.globalAlpha = 0.06;
            ctx.strokeStyle = this._getPortalColor(this.portals[0] || { rotation: 0, hue: this.baseHue }, 1);
            ctx.lineWidth = 0.5;

            for (let row = 0; row < this.gridRows - 1; row++) {
                ctx.beginPath();
                for (let col = 0; col < this.gridCols; col++) {
                    const idx = (row * this.gridCols + col) * 2;
                    const x = col * 30 + this.distortionGrid[idx];
                    const y = row * 30 + this.distortionGrid[idx + 1];
                    col === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // Draw portals
        for (const p of this.portals) {
            const pulse = Math.sin(tick * this.portalPulse + p.pulsePhase) * 0.2 + 0.8;
            const r = p.radius * pulse;

            // Outer glow
            const outerGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
            outerGrad.addColorStop(0, this._getPortalColor(p, 0.15));
            outerGrad.addColorStop(0.5, this._getPortalColor(p, 0.05));
            outerGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = outerGrad;
            ctx.fillRect(p.x - r * 3, p.y - r * 3, r * 6, r * 6);

            // Event horizon
            const eventGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            eventGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
            eventGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.7)');
            eventGrad.addColorStop(0.85, this._getPortalColor(p, 0.8));
            eventGrad.addColorStop(1, this._getPortalColor(p, 0));
            ctx.fillStyle = eventGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();

            // Spiral arms
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalCompositeOperation = 'lighter';
            const armCount = this.warpStyle === 3 ? 6 : 3;
            for (let a = 0; a < armCount; a++) {
                ctx.rotate((Math.PI * 2) / armCount);
                ctx.strokeStyle = this._getPortalColor(p, 0.3 * pulse);
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (let t = 0; t < 1; t += 0.02) {
                    const spiralR = t * r * 1.5;
                    const spiralAngle = t * this.spiralTightness;
                    const sx = Math.cos(spiralAngle) * spiralR;
                    const sy = Math.sin(spiralAngle) * spiralR;
                    t === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
                }
                ctx.stroke();
            }
            ctx.restore();

            // Connection line between linked portals
            const linked = this.portals[p.linkedTo];
            if (linked && p.linkedTo > this.portals.indexOf(p)) {
                ctx.save();
                ctx.globalAlpha = 0.05 + Math.sin(tick * 0.02) * 0.03;
                ctx.strokeStyle = this._getPortalColor(p, 1);
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 15]);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(linked.x, linked.y);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
        }

        // Draw rifts
        for (const r of this.rifts) {
            const lifeRatio = r.life / r.maxLife;

            ctx.save();
            ctx.translate(r.x, r.y);
            ctx.rotate(r.rotation);

            // Rift glow
            const riftGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r.radius * 2);
            riftGrad.addColorStop(0, `hsla(${r.hue}, 90%, 60%, ${lifeRatio * 0.6})`);
            riftGrad.addColorStop(0.5, `hsla(${r.hue}, 80%, 40%, ${lifeRatio * 0.2})`);
            riftGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = riftGrad;
            ctx.fillRect(-r.radius * 2, -r.radius * 2, r.radius * 4, r.radius * 4);

            // Tear shape
            ctx.fillStyle = `rgba(0, 0, 0, ${lifeRatio * 0.9})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, r.radius, r.radius * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = `hsla(${r.hue}, 100%, 70%, ${lifeRatio})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.restore();
        }

        // Draw particles
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const part of this.particles) {
            if (part.captured >= 0) {
                // Stretching toward portal effect
                const portal = this.portals[part.captured];
                const progress = part.captureProgress;
                const alpha = 1 - progress;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = `hsla(${part.hue}, 70%, 60%, 1)`;
                const stretchX = part.x + (portal.x - part.x) * progress;
                const stretchY = part.y + (portal.y - part.y) * progress;
                ctx.beginPath();
                ctx.arc(stretchX, stretchY, part.size * (1 - progress * 0.5), 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Trail
                if (part.trail.length > 2 && qualityScale > 0.4) {
                    ctx.strokeStyle = `hsla(${part.hue}, 60%, 50%, 0.15)`;
                    ctx.lineWidth = part.size * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(part.trail[0].x, part.trail[0].y);
                    for (let j = 1; j < part.trail.length; j++) {
                        ctx.lineTo(part.trail[j].x, part.trail[j].y);
                    }
                    ctx.stroke();
                }

                ctx.globalAlpha = part.alpha;
                ctx.fillStyle = `hsla(${part.hue}, 70%, 65%, 1)`;
                ctx.beginPath();
                ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
}
