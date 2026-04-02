/**
 * @file portal_architecture.js
 * @description Interdimensional portals with particle streams flowing between them.
 * Each portal is a swirling vortex with unique visual style. Particles teleport
 * between connected portal pairs. Click creates new temporary portals.
 * Seed determines portal count, connection topology, vortex style, color schemes,
 * and particle flow patterns.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class PortalArchitecture extends Architecture {
    constructor() {
        super();
        this.portals = [];
        this.streams = [];
        this.streamPool = [];
        this.ripples = [];
        this.portalStyle = 0;
        this.tick = 0;
    }

    init(system) {
        const rng = system.rng;
        const w = system.width;
        const h = system.height;

        // 0=classic swirl, 1=geometric iris, 2=fire ring, 3=electric arc, 4=liquid mirror
        this.portalStyle = Math.floor(rng() * 5);
        this.baseHue = system.hue;
        this.tick = 0;
        this.portals = [];
        this.streams = [];
        this.streamPool = [];
        this.ripples = [];

        // Portal count and connections
        const portalCount = 3 + Math.floor(rng() * 5);

        // Connection topologies: 0=pairs, 1=ring, 2=hub-spoke, 3=random
        const topology = Math.floor(rng() * 4);

        for (let i = 0; i < portalCount; i++) {
            const portalHue = (this.baseHue + i * (360 / portalCount) + rng() * 30) % 360;
            const radius = 30 + rng() * 50;
            this.portals.push({
                x: w * (0.15 + rng() * 0.7),
                y: h * (0.15 + rng() * 0.7),
                radius,
                hue: portalHue,
                rotation: rng() * Math.PI * 2,
                rotSpeed: (0.01 + rng() * 0.03) * (rng() > 0.5 ? 1 : -1),
                pulsePhase: rng() * Math.PI * 2,
                pulseSpeed: 0.02 + rng() * 0.03,
                connectedTo: -1, // Set below
                intensity: 0.5 + rng() * 0.5,
                segments: 6 + Math.floor(rng() * 10),
                depth: 3 + Math.floor(rng() * 5), // Spiral depth layers
                particleRate: 2 + Math.floor(rng() * 4),
                isTemporary: false,
                life: 0,
                wobble: rng() * 0.3,
                wobbleSpeed: 0.01 + rng() * 0.02,
            });
        }

        // Set connections based on topology
        switch (topology) {
            case 0: // Pairs
                for (let i = 0; i < portalCount - 1; i += 2) {
                    this.portals[i].connectedTo = i + 1;
                    this.portals[i + 1].connectedTo = i;
                }
                if (portalCount % 2 !== 0) {
                    this.portals[portalCount - 1].connectedTo = 0;
                }
                break;
            case 1: // Ring
                for (let i = 0; i < portalCount; i++) {
                    this.portals[i].connectedTo = (i + 1) % portalCount;
                }
                break;
            case 2: // Hub-spoke (first portal is hub)
                for (let i = 1; i < portalCount; i++) {
                    this.portals[i].connectedTo = 0;
                }
                this.portals[0].connectedTo = 1;
                break;
            case 3: // Random
                for (let i = 0; i < portalCount; i++) {
                    let target;
                    do { target = Math.floor(rng() * portalCount); } while (target === i);
                    this.portals[i].connectedTo = target;
                }
                break;
        }
    }

    update(system) {
        this.tick++;
        const w = system.width;
        const h = system.height;

        // Update portal animations
        for (let i = this.portals.length - 1; i >= 0; i--) {
            const p = this.portals[i];
            p.rotation += p.rotSpeed;
            p.pulsePhase += p.pulseSpeed;

            // Mouse interaction: portals drift toward mouse slightly
            const dmx = mouse.x - p.x;
            const dmy = mouse.y - p.y;
            const dist = Math.sqrt(dmx * dmx + dmy * dmy);
            if (dist < 200 && dist > p.radius) {
                p.x += dmx * 0.001;
                p.y += dmy * 0.001;
                p.intensity = Math.min(1.5, p.intensity + 0.005);
            } else {
                p.intensity = Math.max(0.5, p.intensity - 0.002);
            }

            // Remove temporary portals
            if (p.isTemporary) {
                p.life--;
                if (p.life <= 0) {
                    // Spawn burst on death
                    for (let s = 0; s < 10; s++) {
                        this._spawnRipple(p.x, p.y, p.hue);
                    }
                    this.portals.splice(i, 1);
                    // Fix connection indices
                    for (const portal of this.portals) {
                        if (portal.connectedTo >= i) portal.connectedTo--;
                        if (portal.connectedTo < 0 && this.portals.length > 0) portal.connectedTo = 0;
                    }
                    continue;
                }
            }

            // Emit stream particles
            if (p.connectedTo >= 0 && p.connectedTo < this.portals.length && this.tick % 3 === 0) {
                const target = this.portals[p.connectedTo];
                for (let s = 0; s < p.particleRate; s++) {
                    this._spawnStream(p, target);
                }
            }
        }

        // Update streams
        for (let i = this.streams.length - 1; i >= 0; i--) {
            const s = this.streams[i];
            s.progress += s.speed;

            if (s.progress >= 1) {
                // Arrived at destination - create ripple
                this._spawnRipple(s.targetX, s.targetY, s.hue);
                this.streamPool.push(s);
                this.streams[i] = this.streams[this.streams.length - 1];
                this.streams.pop();
                continue;
            }

            // Curved path using control point
            const t = s.progress;
            const invT = 1 - t;
            s.x = invT * invT * s.startX + 2 * invT * t * s.cpX + t * t * s.targetX;
            s.y = invT * invT * s.startY + 2 * invT * t * s.cpY + t * t * s.targetY;
        }

        // Update ripples
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.radius += r.speed;
            r.alpha -= 0.02;
            if (r.alpha <= 0) {
                this.ripples[i] = this.ripples[this.ripples.length - 1];
                this.ripples.pop();
            }
        }

        // Click creates temporary portal
        if (this.tick % 120 === 0 && this.portals.length < 12) {
            // Occasionally spawn a wandering temporary portal
            const rng = system.rng;
            if (rng() > 0.7) {
                const tempPortal = {
                    x: w * (0.1 + Math.random() * 0.8),
                    y: h * (0.1 + Math.random() * 0.8),
                    radius: 15 + Math.random() * 25,
                    hue: (this.baseHue + Math.random() * 180) % 360,
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (0.02 + Math.random() * 0.04) * (Math.random() > 0.5 ? 1 : -1),
                    pulsePhase: 0,
                    pulseSpeed: 0.03,
                    connectedTo: Math.floor(Math.random() * this.portals.length),
                    intensity: 1,
                    segments: 8,
                    depth: 3,
                    particleRate: 3,
                    isTemporary: true,
                    life: 180 + Math.floor(Math.random() * 180),
                    wobble: 0.2,
                    wobbleSpeed: 0.02,
                };
                this.portals.push(tempPortal);
            }
        }
    }

    _spawnStream(source, target) {
        if (this.streams.length > 300) return;
        let s = this.streamPool.length > 0 ? this.streamPool.pop() : {};
        const emitAngle = source.rotation + Math.random() * Math.PI * 2;
        const emitR = source.radius * 0.8;
        s.startX = source.x + Math.cos(emitAngle) * emitR;
        s.startY = source.y + Math.sin(emitAngle) * emitR;
        s.targetX = target.x + (Math.random() - 0.5) * target.radius;
        s.targetY = target.y + (Math.random() - 0.5) * target.radius;

        // Control point for curve
        const midX = (s.startX + s.targetX) / 2;
        const midY = (s.startY + s.targetY) / 2;
        const perpDist = Math.hypot(s.targetX - s.startX, s.targetY - s.startY) * 0.3;
        s.cpX = midX + (Math.random() - 0.5) * perpDist;
        s.cpY = midY + (Math.random() - 0.5) * perpDist;

        s.progress = 0;
        s.speed = 0.008 + Math.random() * 0.015;
        s.size = 1.5 + Math.random() * 2.5;
        s.hue = source.hue;
        s.x = s.startX;
        s.y = s.startY;

        this.streams.push(s);
    }

    _spawnRipple(x, y, hue) {
        if (this.ripples.length > 50) return;
        this.ripples.push({
            x, y,
            radius: 5,
            speed: 1 + Math.random() * 2,
            alpha: 0.5 + Math.random() * 0.3,
            hue,
        });
    }

    draw(system) {
        const ctx = system.ctx;

        // Draw connection lines (faint)
        ctx.save();
        ctx.globalAlpha = 0.05;
        ctx.lineWidth = 1;
        for (const p of this.portals) {
            if (p.connectedTo >= 0 && p.connectedTo < this.portals.length) {
                const target = this.portals[p.connectedTo];
                ctx.strokeStyle = `hsl(${p.hue}, 60%, 40%)`;
                ctx.setLineDash([5, 15]);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(target.x, target.y);
                ctx.stroke();
            }
        }
        ctx.setLineDash([]);
        ctx.restore();

        // Draw ripples
        for (const r of this.ripples) {
            ctx.strokeStyle = `hsla(${r.hue}, 80%, 60%, ${r.alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw streams
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const s of this.streams) {
            const alpha = Math.sin(s.progress * Math.PI); // Brightest in middle of journey
            ctx.fillStyle = `hsla(${s.hue}, 90%, 70%, ${alpha * 0.8})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Draw portals
        for (let pi = 0; pi < this.portals.length; pi++) {
            const p = this.portals[pi];
            const pulse = 1 + Math.sin(p.pulsePhase) * 0.15;
            const r = p.radius * pulse;
            const wobbleOff = Math.sin(this.tick * p.wobbleSpeed) * p.wobble;
            const tempFade = p.isTemporary ? Math.min(1, p.life / 30) : 1;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.globalAlpha = p.intensity * tempFade;

            // Outer glow
            ctx.globalCompositeOperation = 'lighter';
            const outerGlow = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 2.5);
            outerGlow.addColorStop(0, `hsla(${p.hue}, 90%, 50%, 0.3)`);
            outerGlow.addColorStop(0.5, `hsla(${p.hue}, 80%, 30%, 0.15)`);
            outerGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = outerGlow;
            ctx.beginPath();
            ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Portal based on style
            ctx.globalCompositeOperation = 'source-over';
            switch (this.portalStyle) {
                case 0: this._drawSwirlPortal(ctx, p, r, wobbleOff); break;
                case 1: this._drawIrisPortal(ctx, p, r); break;
                case 2: this._drawFirePortal(ctx, p, r); break;
                case 3: this._drawElectricPortal(ctx, p, r); break;
                case 4: this._drawMirrorPortal(ctx, p, r); break;
            }

            // Dark center (void)
            const voidGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.5);
            voidGrad.addColorStop(0, `rgba(0, 0, 0, 0.9)`);
            voidGrad.addColorStop(0.7, `hsla(${p.hue + 180}, 60%, 10%, 0.5)`);
            voidGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = voidGrad;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    _drawSwirlPortal(ctx, p, r, wobbleOff) {
        // Spiral arms
        for (let d = 0; d < p.depth; d++) {
            const layerR = r * (0.4 + d * 0.2);
            const layerAlpha = 0.6 - d * 0.1;
            ctx.strokeStyle = `hsla(${p.hue + d * 20}, 80%, ${50 + d * 10}%, ${layerAlpha})`;
            ctx.lineWidth = 3 - d * 0.5;

            for (let arm = 0; arm < 2; arm++) {
                ctx.beginPath();
                for (let t = 0; t < Math.PI * 4; t += 0.1) {
                    const spiralR = layerR * (t / (Math.PI * 4));
                    const sa = p.rotation + t + arm * Math.PI + wobbleOff;
                    const sx = Math.cos(sa) * spiralR;
                    const sy = Math.sin(sa) * spiralR;
                    if (t === 0) ctx.moveTo(sx, sy);
                    else ctx.lineTo(sx, sy);
                }
                ctx.stroke();
            }
        }

        // Ring
        ctx.strokeStyle = `hsla(${p.hue}, 90%, 60%, 0.7)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    _drawIrisPortal(ctx, p, r) {
        // Geometric iris/aperture
        const segs = p.segments;
        const openness = 0.3 + Math.sin(p.pulsePhase) * 0.2;

        for (let i = 0; i < segs; i++) {
            const a1 = p.rotation + (i / segs) * Math.PI * 2;
            const a2 = p.rotation + ((i + openness) / segs) * Math.PI * 2;

            ctx.fillStyle = `hsla(${p.hue + i * (360 / segs)}, 70%, 40%, 0.5)`;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, r, a1, a2);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = `hsla(${p.hue + i * (360 / segs)}, 90%, 60%, 0.8)`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Outer ring
        ctx.strokeStyle = `hsla(${p.hue}, 80%, 70%, 0.6)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    _drawFirePortal(ctx, p, r) {
        // Flaming ring
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const flames = 20;
        for (let i = 0; i < flames; i++) {
            const a = p.rotation + (i / flames) * Math.PI * 2;
            const flicker = Math.sin(this.tick * 0.1 + i * 1.5) * 0.3 + 0.7;
            const flameLen = r * 0.3 * flicker;
            const fx = Math.cos(a) * r;
            const fy = Math.sin(a) * r;
            const ofx = Math.cos(a) * (r + flameLen);
            const ofy = Math.sin(a) * (r + flameLen);

            const flameGrad = ctx.createLinearGradient(fx, fy, ofx, ofy);
            flameGrad.addColorStop(0, `hsla(${p.hue}, 100%, 60%, 0.8)`);
            flameGrad.addColorStop(0.5, `hsla(${p.hue + 30}, 100%, 50%, 0.4)`);
            flameGrad.addColorStop(1, 'transparent');

            ctx.strokeStyle = flameGrad;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(fx, fy);
            ctx.lineTo(ofx, ofy);
            ctx.stroke();
        }
        ctx.restore();

        // Inner ring glow
        ctx.strokeStyle = `hsla(${p.hue + 30}, 100%, 80%, 0.5)`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
        ctx.stroke();
    }

    _drawElectricPortal(ctx, p, r) {
        // Electric arcs around the portal
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const arcCount = 8;
        ctx.strokeStyle = `hsla(${p.hue}, 100%, 80%, 0.7)`;
        ctx.lineWidth = 1.5;

        for (let i = 0; i < arcCount; i++) {
            const startAngle = p.rotation + (i / arcCount) * Math.PI * 2;
            const endAngle = startAngle + (1 / arcCount) * Math.PI * 2;

            ctx.beginPath();
            let cx = Math.cos(startAngle) * r;
            let cy = Math.sin(startAngle) * r;
            ctx.moveTo(cx, cy);

            // Jagged lightning path
            const steps = 5;
            for (let s = 1; s <= steps; s++) {
                const t = s / steps;
                const ma = startAngle + (endAngle - startAngle) * t;
                const baseR = r + (Math.random() - 0.5) * r * 0.4;
                cx = Math.cos(ma) * baseR;
                cy = Math.sin(ma) * baseR;
                ctx.lineTo(cx, cy);
            }
            ctx.stroke();
        }

        // Crackling center
        for (let i = 0; i < 3; i++) {
            const a = Math.random() * Math.PI * 2;
            const len = r * 0.3 + Math.random() * r * 0.3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            let lx = 0, ly = 0;
            const segs = 4;
            for (let s = 0; s < segs; s++) {
                lx += (Math.cos(a) * len / segs) + (Math.random() - 0.5) * 10;
                ly += (Math.sin(a) * len / segs) + (Math.random() - 0.5) * 10;
                ctx.lineTo(lx, ly);
            }
            ctx.stroke();
        }
        ctx.restore();

        // Ring
        ctx.strokeStyle = `hsla(${p.hue}, 80%, 60%, 0.4)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    _drawMirrorPortal(ctx, p, r) {
        // Liquid mirror effect - concentric distorted circles
        for (let d = 0; d < p.depth; d++) {
            const layerR = r * (1 - d * 0.15);
            const wave = this.tick * 0.02 + d * 0.5;
            const hue = (p.hue + d * 15) % 360;

            ctx.strokeStyle = `hsla(${hue}, 50%, ${60 + d * 5}%, ${0.5 - d * 0.08})`;
            ctx.lineWidth = 2;
            ctx.beginPath();

            for (let a = 0; a < Math.PI * 2; a += 0.05) {
                const distort = Math.sin(a * 3 + wave) * 5 + Math.cos(a * 5 - wave * 1.3) * 3;
                const pr = layerR + distort;
                const px = Math.cos(a + p.rotation * 0.3) * pr;
                const py = Math.sin(a + p.rotation * 0.3) * pr;
                if (a === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Reflective sheen
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const sheen = ctx.createLinearGradient(-r, -r, r, r);
        sheen.addColorStop(0, 'transparent');
        sheen.addColorStop(0.4, `hsla(${p.hue}, 30%, 80%, 0.15)`);
        sheen.addColorStop(0.6, `hsla(${p.hue}, 30%, 80%, 0.15)`);
        sheen.addColorStop(1, 'transparent');
        ctx.fillStyle = sheen;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
