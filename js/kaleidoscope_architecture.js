/**
 * @file kaleidoscope_architecture.js
 * @description Symmetric rotating kaleidoscope patterns. Draws shapes in sectors
 * and mirrors them. Mouse position deforms the pattern. Seeds change symmetry count,
 * shapes, colors, rotation speed, and pattern complexity.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class KaleidoscopeArchitecture extends Architecture {
    constructor() {
        super();
        this.symmetry = 6;
        this.rotation = 0;
        this.rotationSpeed = 0;
        this.elements = [];
        this.trailCanvas = null;
        this.trailCtx = null;
        this.patternType = 0;
        this.colorScheme = [];
        this.zoomPulse = 0;
        this.innerRotation = 0;
    }

    init(system) {
        const rng = system.rng;

        // Seed-driven symmetry (dramatically changes the look)
        this.symmetry = [3, 4, 5, 6, 8, 10, 12][Math.floor(rng() * 7)];
        this.rotationSpeed = (rng() - 0.5) * 0.005;
        this.innerRotation = 0;

        // Pattern type
        this.patternType = Math.floor(rng() * 5);
        // 0 = geometric shapes, 1 = orbital dots, 2 = spirograph curves
        // 3 = crystalline shards, 4 = organic tendrils

        // Color scheme
        const baseHue = system.hue;
        const schemeType = Math.floor(rng() * 4);
        switch (schemeType) {
            case 0: // Analogous
                this.colorScheme = [baseHue, (baseHue + 30) % 360, (baseHue + 60) % 360];
                break;
            case 1: // Complementary
                this.colorScheme = [baseHue, (baseHue + 180) % 360, (baseHue + 90) % 360];
                break;
            case 2: // Triadic
                this.colorScheme = [baseHue, (baseHue + 120) % 360, (baseHue + 240) % 360];
                break;
            case 3: // Monochrome shifting
                this.colorScheme = [baseHue, baseHue, baseHue];
                break;
        }

        // Generate elements that will be mirrored
        this.elements = [];
        const elementCount = 8 + Math.floor(rng() * 12);
        for (let i = 0; i < elementCount; i++) {
            this.elements.push({
                distFromCenter: 50 + rng() * (Math.min(system.width, system.height) * 0.4),
                angle: rng() * (Math.PI * 2 / this.symmetry), // Only in one sector
                size: 5 + rng() * 30,
                speed: 0.001 + rng() * 0.005,
                radialSpeed: (rng() - 0.5) * 0.3,
                phase: rng() * Math.PI * 2,
                colorIdx: Math.floor(rng() * this.colorScheme.length),
                shapeType: Math.floor(rng() * 4), // 0=circle, 1=square, 2=triangle, 3=line
                pulsePhase: rng() * Math.PI * 2,
                pulseSpeed: 0.01 + rng() * 0.03,
                trailLength: Math.floor(rng() * 5),
                orbitAmplitude: rng() * 40,
                orbitFreq: 0.005 + rng() * 0.02
            });
        }

        // Trail canvas for persistence effect
        this.trailCanvas = document.createElement('canvas');
        this.trailCanvas.width = system.width;
        this.trailCanvas.height = system.height;
        this.trailCtx = this.trailCanvas.getContext('2d', { alpha: true });
    }

    update(system) {
        this.rotation += this.rotationSpeed * system.speedMultiplier;
        this.innerRotation += 0.002 * system.speedMultiplier;
        this.zoomPulse = Math.sin(system.tick * 0.003) * 0.05;

        // Update element positions
        this.elements.forEach(e => {
            e.angle += e.speed * system.speedMultiplier;
            e.distFromCenter += Math.sin(system.tick * e.orbitFreq + e.phase) * e.radialSpeed;

            // Bound distance
            const maxDist = Math.min(system.width, system.height) * 0.45;
            if (e.distFromCenter < 30) e.distFromCenter = 30;
            if (e.distFromCenter > maxDist) e.distFromCenter = maxDist;
        });
    }

    draw(system) {
        const ctx = system.ctx;
        const centerX = system.width / 2;
        const centerY = system.height / 2;
        const tick = system.tick;

        // Mouse offset for deformation
        const mOffsetX = (mouse.x - centerX) * 0.05;
        const mOffsetY = (mouse.y - centerY) * 0.05;

        // Fade trail canvas
        this.trailCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.trailCtx.fillRect(0, 0, system.width, system.height);

        // Draw to trail canvas
        const tctx = this.trailCtx;
        tctx.save();
        tctx.translate(centerX + mOffsetX, centerY + mOffsetY);
        tctx.rotate(this.rotation);
        tctx.scale(1 + this.zoomPulse, 1 + this.zoomPulse);

        // Draw each sector with mirroring
        for (let sector = 0; sector < this.symmetry; sector++) {
            const sectorAngle = (sector / this.symmetry) * Math.PI * 2;
            tctx.save();
            tctx.rotate(sectorAngle);

            // Draw mirror
            for (let mirror = 0; mirror < 2; mirror++) {
                tctx.save();
                if (mirror === 1) {
                    tctx.scale(1, -1);
                }

                this.elements.forEach(e => {
                    const pulse = 1 + Math.sin(tick * e.pulseSpeed + e.pulsePhase) * 0.3;
                    const x = Math.cos(e.angle + this.innerRotation) * e.distFromCenter;
                    const y = Math.sin(e.angle + this.innerRotation) * e.distFromCenter;
                    const size = e.size * pulse;
                    const hue = this.colorScheme[e.colorIdx];
                    const lightness = 40 + Math.sin(tick * 0.01 + e.phase) * 15;

                    tctx.fillStyle = `hsla(${hue}, 70%, ${lightness}%, 0.15)`;
                    tctx.strokeStyle = `hsla(${hue}, 80%, ${lightness + 20}%, 0.2)`;
                    tctx.lineWidth = 1;

                    switch (e.shapeType) {
                        case 0: // Circle
                            tctx.beginPath();
                            tctx.arc(x, y, size, 0, Math.PI * 2);
                            tctx.fill();
                            break;
                        case 1: // Square
                            tctx.save();
                            tctx.translate(x, y);
                            tctx.rotate(tick * 0.005 + e.phase);
                            tctx.fillRect(-size / 2, -size / 2, size, size);
                            tctx.restore();
                            break;
                        case 2: // Triangle
                            tctx.beginPath();
                            for (let v = 0; v < 3; v++) {
                                const va = (v / 3) * Math.PI * 2 + tick * 0.005;
                                const vx = x + Math.cos(va) * size;
                                const vy = y + Math.sin(va) * size;
                                if (v === 0) tctx.moveTo(vx, vy);
                                else tctx.lineTo(vx, vy);
                            }
                            tctx.closePath();
                            tctx.fill();
                            tctx.stroke();
                            break;
                        case 3: // Line from center
                            tctx.beginPath();
                            tctx.moveTo(0, 0);
                            tctx.lineTo(x, y);
                            tctx.stroke();
                            break;
                    }
                });

                tctx.restore();
            }

            tctx.restore();
        }

        // Draw pattern-specific overlays
        if (this.patternType === 2) {
            // Spirograph curves
            tctx.strokeStyle = `hsla(${this.colorScheme[0]}, 80%, 60%, 0.05)`;
            tctx.lineWidth = 1;
            tctx.beginPath();
            for (let a = 0; a < Math.PI * 2; a += 0.02) {
                const r1 = 100 + Math.sin(a * this.symmetry + tick * 0.01) * 50;
                const r2 = 50 + Math.cos(a * (this.symmetry + 1) + tick * 0.008) * 30;
                const x = Math.cos(a) * r1 + Math.cos(a * 3 + tick * 0.005) * r2;
                const y = Math.sin(a) * r1 + Math.sin(a * 3 + tick * 0.005) * r2;
                if (a === 0) tctx.moveTo(x, y);
                else tctx.lineTo(x, y);
            }
            tctx.closePath();
            tctx.stroke();
        }

        tctx.restore();

        // Composite trail canvas onto main canvas
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(this.trailCanvas, 0, 0);
        ctx.restore();

        // Center glow
        const glowRadius = 80 + Math.sin(tick * 0.02) * 20;
        const grad = ctx.createRadialGradient(
            centerX + mOffsetX, centerY + mOffsetY, 0,
            centerX + mOffsetX, centerY + mOffsetY, glowRadius
        );
        grad.addColorStop(0, `hsla(${this.colorScheme[0]}, 80%, 70%, 0.15)`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX + mOffsetX, centerY + mOffsetY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring decorations
        const ringRadius = Math.min(system.width, system.height) * 0.42;
        ctx.save();
        ctx.translate(centerX + mOffsetX, centerY + mOffsetY);
        ctx.rotate(this.rotation * -0.5);
        ctx.strokeStyle = `hsla(${this.colorScheme[1]}, 60%, 50%, 0.08)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Tick marks at symmetry points
        for (let i = 0; i < this.symmetry; i++) {
            const angle = (i / this.symmetry) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * (ringRadius - 10), Math.sin(angle) * (ringRadius - 10));
            ctx.lineTo(Math.cos(angle) * (ringRadius + 10), Math.sin(angle) * (ringRadius + 10));
            ctx.stroke();
        }
        ctx.restore();
    }
}
