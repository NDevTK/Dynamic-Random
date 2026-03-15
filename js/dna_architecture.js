/**
 * @file dna_architecture.js
 * @description Animated double helix molecular visualization with base-pair connections.
 * Multiple helices twist across screen, mutating colors and structures based on seed.
 * Mouse proximity causes local mutations, gravity well unzips the helix.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class DNAArchitecture extends Architecture {
    constructor() {
        super();
        this.helices = [];
        this.floatingBases = [];
        this.basePool = [];
        this.mutationFlashes = [];
        this.enzymeParticles = [];
    }

    init(system) {
        const rng = system.rng;

        // Base pair color schemes driven by seed
        const schemes = [
            { a: [340, 80, 55], t: [50, 85, 55], g: [120, 70, 45], c: [210, 80, 55] },  // classic ATGC
            { a: [280, 90, 60], t: [30, 90, 55], g: [170, 80, 50], c: [0, 85, 55] },     // vivid
            { a: [200, 60, 70], t: [200, 80, 40], g: [200, 50, 55], c: [200, 90, 30] },   // monochrome blue
            { a: [45, 90, 60], t: [15, 85, 50], g: [75, 70, 45], c: [345, 80, 55] },      // warm
            { a: [150, 80, 55], t: [90, 70, 50], g: [180, 85, 45], c: [60, 90, 60] },     // botanical
        ];
        this.colorScheme = schemes[Math.floor(rng() * schemes.length)];
        this.bases = ['a', 't', 'g', 'c'];

        // Generate helices (each is a DNA strand crossing the screen)
        this.helices = [];
        const helixCount = 2 + Math.floor(rng() * 3);

        for (let h = 0; h < helixCount; h++) {
            const vertical = rng() > 0.4;
            const helix = {
                // Position: line from one edge to another
                startX: vertical ? (0.15 + rng() * 0.7) * system.width : -50,
                startY: vertical ? -50 : (0.15 + rng() * 0.7) * system.height,
                endX: vertical ? (0.15 + rng() * 0.7) * system.width : system.width + 50,
                endY: vertical ? system.height + 50 : (0.15 + rng() * 0.7) * system.height,
                vertical,
                twist: 0.015 + rng() * 0.02,
                radius: 25 + rng() * 35,
                speed: 0.005 + rng() * 0.01,
                phase: rng() * Math.PI * 2,
                basePairs: [],
                unzipPoint: -1, // For mouse unzipping
                drift: (rng() - 0.5) * 0.3,
                wobble: rng() * 0.5
            };

            // Generate base pairs along helix
            const length = Math.sqrt(
                Math.pow(helix.endX - helix.startX, 2) +
                Math.pow(helix.endY - helix.startY, 2)
            );
            const pairCount = Math.floor(length / 8);

            for (let i = 0; i < pairCount; i++) {
                const baseType = Math.floor(rng() * 4);
                const complement = baseType ^ 1; // A-T, G-C pairing (simplified)
                helix.basePairs.push({
                    baseType,
                    complement,
                    mutated: false,
                    mutationTime: 0,
                    brightness: 0.3 + rng() * 0.4
                });
            }

            this.helices.push(helix);
        }

        this.floatingBases = [];
        this.basePool = [];
        this.mutationFlashes = [];

        // Enzyme particles that swim around
        this.enzymeParticles = [];
        const enzymeCount = 5 + Math.floor(rng() * 8);
        for (let i = 0; i < enzymeCount; i++) {
            this.enzymeParticles.push({
                x: rng() * system.width,
                y: rng() * system.height,
                vx: (rng() - 0.5) * 1.5,
                vy: (rng() - 0.5) * 1.5,
                size: 3 + rng() * 3,
                phase: rng() * Math.PI * 2,
                hue: 60 + rng() * 40
            });
        }
    }

    _getBaseColor(baseType, alpha) {
        const key = this.bases[baseType];
        const c = this.colorScheme[key];
        return `hsla(${c[0]}, ${c[1]}%, ${c[2]}%, ${alpha})`;
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;
        const tick = system.tick;

        for (const helix of this.helices) {
            helix.phase += helix.speed * system.speedMultiplier;

            // Mouse unzipping: find closest point on helix axis
            const ax = helix.endX - helix.startX;
            const ay = helix.endY - helix.startY;
            const len = Math.sqrt(ax * ax + ay * ay) || 1;
            const t = Math.max(0, Math.min(1,
                ((mx - helix.startX) * ax + (my - helix.startY) * ay) / (len * len)
            ));
            const closestX = helix.startX + ax * t;
            const closestY = helix.startY + ay * t;
            const distToAxis = Math.sqrt(
                Math.pow(mx - closestX, 2) + Math.pow(my - closestY, 2)
            );

            if (distToAxis < 100) {
                helix.unzipPoint = t * helix.basePairs.length;
            } else {
                helix.unzipPoint = -1;
            }

            // Gravity well causes mutations
            if (system.isGravityWell && distToAxis < 200) {
                const mutIdx = Math.floor(t * helix.basePairs.length);
                for (let d = -3; d <= 3; d++) {
                    const idx = mutIdx + d;
                    if (idx >= 0 && idx < helix.basePairs.length) {
                        const bp = helix.basePairs[idx];
                        if (!bp.mutated && system.rng() < 0.05) {
                            bp.mutated = true;
                            bp.mutationTime = tick;
                            bp.baseType = Math.floor(system.rng() * 4);
                            this.mutationFlashes.push({
                                x: closestX,
                                y: closestY,
                                life: 1,
                                hue: this.colorScheme[this.bases[bp.baseType]][0]
                            });
                            // Eject floating base
                            let fb = this.basePool.length > 0 ? this.basePool.pop() : {};
                            fb.x = closestX;
                            fb.y = closestY;
                            fb.vx = (system.rng() - 0.5) * 3;
                            fb.vy = (system.rng() - 0.5) * 3;
                            fb.life = 1;
                            fb.decay = 0.01;
                            fb.baseType = bp.complement;
                            fb.size = 3;
                            this.floatingBases.push(fb);
                        }
                    }
                }
            }
        }

        // Update floating bases
        for (let i = this.floatingBases.length - 1; i >= 0; i--) {
            const fb = this.floatingBases[i];
            fb.x += fb.vx;
            fb.y += fb.vy;
            fb.vx *= 0.98;
            fb.vy *= 0.98;
            fb.life -= fb.decay;
            if (fb.life <= 0) {
                this.basePool.push(fb);
                this.floatingBases[i] = this.floatingBases[this.floatingBases.length - 1];
                this.floatingBases.pop();
            }
        }

        // Update mutation flashes
        for (let i = this.mutationFlashes.length - 1; i >= 0; i--) {
            this.mutationFlashes[i].life -= 0.03;
            if (this.mutationFlashes[i].life <= 0) {
                this.mutationFlashes.splice(i, 1);
            }
        }

        // Update enzyme particles
        for (const e of this.enzymeParticles) {
            e.phase += 0.03;
            e.x += e.vx + Math.sin(e.phase) * 0.5;
            e.y += e.vy + Math.cos(e.phase * 0.7) * 0.5;

            // Bounce off edges
            if (e.x < 0 || e.x > system.width) e.vx *= -1;
            if (e.y < 0 || e.y > system.height) e.vy *= -1;
            e.x = Math.max(0, Math.min(system.width, e.x));
            e.y = Math.max(0, Math.min(system.height, e.y));
        }

        // Cap floating bases
        while (this.floatingBases.length > 100) {
            this.basePool.push(this.floatingBases.shift());
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;

        ctx.save();

        // Draw each helix
        for (const helix of this.helices) {
            const ax = helix.endX - helix.startX;
            const ay = helix.endY - helix.startY;
            const len = Math.sqrt(ax * ax + ay * ay) || 1;
            // Direction perpendicular to helix axis
            const perpX = -ay / (len || 1);
            const perpY = ax / (len || 1);
            const pairCount = helix.basePairs.length;

            // Draw backbone strands and base pairs
            ctx.globalCompositeOperation = 'lighter';

            // Collect backbone points for both strands
            const strand1 = [];
            const strand2 = [];

            for (let i = 0; i < pairCount; i++) {
                const t = i / pairCount;
                const baseX = helix.startX + ax * t;
                const baseY = helix.startY + ay * t;

                const angle = i * helix.twist + helix.phase;
                const wobble = Math.sin(tick * 0.005 + i * 0.1) * helix.wobble;

                const cos1 = Math.cos(angle) * helix.radius;
                const sin1 = Math.sin(angle) * helix.radius;

                // Unzip effect: increase radius near mouse
                let unzipFactor = 1;
                if (helix.unzipPoint >= 0) {
                    const dist = Math.abs(i - helix.unzipPoint);
                    if (dist < 15) {
                        unzipFactor = 1 + (1 - dist / 15) * 2;
                    }
                }

                const x1 = baseX + perpX * cos1 * unzipFactor + wobble;
                const y1 = baseY + perpY * cos1 * unzipFactor + wobble;
                const x2 = baseX - perpX * cos1 * unzipFactor + wobble;
                const y2 = baseY - perpY * cos1 * unzipFactor + wobble;

                strand1.push({ x: x1, y: y1 });
                strand2.push({ x: x2, y: y2 });

                // Draw base pair connection (the "rungs")
                if (i % 3 === 0 && unzipFactor < 2) {
                    const bp = helix.basePairs[i];
                    const alpha = bp.brightness * (bp.mutated ? 0.8 : 0.4);
                    ctx.strokeStyle = this._getBaseColor(bp.baseType, alpha);
                    ctx.lineWidth = bp.mutated ? 2 : 1;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();

                    // Base pair dots at each end
                    ctx.fillStyle = this._getBaseColor(bp.baseType, alpha + 0.2);
                    ctx.beginPath();
                    ctx.arc(x1, y1, 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = this._getBaseColor(bp.complement, alpha + 0.2);
                    ctx.beginPath();
                    ctx.arc(x2, y2, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Draw backbone strands as smooth curves
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = `hsla(${this.colorScheme.a[0]}, 40%, 60%, 0.3)`;
            ctx.beginPath();
            for (let i = 0; i < strand1.length; i++) {
                if (i === 0) ctx.moveTo(strand1[i].x, strand1[i].y);
                else ctx.lineTo(strand1[i].x, strand1[i].y);
            }
            ctx.stroke();

            ctx.strokeStyle = `hsla(${this.colorScheme.c[0]}, 40%, 60%, 0.3)`;
            ctx.beginPath();
            for (let i = 0; i < strand2.length; i++) {
                if (i === 0) ctx.moveTo(strand2[i].x, strand2[i].y);
                else ctx.lineTo(strand2[i].x, strand2[i].y);
            }
            ctx.stroke();

            ctx.globalCompositeOperation = 'source-over';
        }

        // Floating bases
        ctx.globalCompositeOperation = 'lighter';
        for (const fb of this.floatingBases) {
            ctx.fillStyle = this._getBaseColor(fb.baseType, fb.life * 0.6);
            ctx.beginPath();
            ctx.arc(fb.x, fb.y, fb.size * fb.life, 0, Math.PI * 2);
            ctx.fill();
        }

        // Mutation flashes
        for (const flash of this.mutationFlashes) {
            const grad = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, 30 * flash.life);
            grad.addColorStop(0, `hsla(${flash.hue}, 90%, 70%, ${flash.life * 0.5})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(flash.x, flash.y, 30 * flash.life, 0, Math.PI * 2);
            ctx.fill();
        }

        // Enzyme particles
        for (const e of this.enzymeParticles) {
            const pulse = Math.sin(e.phase) * 0.3 + 0.7;
            ctx.fillStyle = `hsla(${e.hue}, 70%, 60%, ${0.3 * pulse})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size * pulse, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }
}
