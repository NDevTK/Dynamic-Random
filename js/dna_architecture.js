/**
 * @file dna_architecture.js
 * @description Animated double helix molecular visualization with base-pair connections.
 * Multiple topology modes (linear, supercoiled, circular, braided, ladder).
 * 3D depth with perspective, enzyme-helix binding interactions, sequence letters,
 * replication fork animation. Mouse causes mutations and unzipping.
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
        this.topology = 0;
        this.replicationForks = [];
        this.tick = 0;
    }

    init(system) {
        const rng = system.rng;

        // Topology: 0=linear helix, 1=supercoiled, 2=circular plasmid,
        // 3=braided (triple helix), 4=ladder (denatured/flat)
        this.topology = Math.floor(rng() * 5);

        // Base pair color schemes driven by seed
        const schemes = [
            { a: [340, 80, 55], t: [50, 85, 55], g: [120, 70, 45], c: [210, 80, 55] },
            { a: [280, 90, 60], t: [30, 90, 55], g: [170, 80, 50], c: [0, 85, 55] },
            { a: [200, 60, 70], t: [200, 80, 40], g: [200, 50, 55], c: [200, 90, 30] },
            { a: [45, 90, 60], t: [15, 85, 50], g: [75, 70, 45], c: [345, 80, 55] },
            { a: [150, 80, 55], t: [90, 70, 50], g: [180, 85, 45], c: [60, 90, 60] },
            { a: [0, 0, 80], t: [0, 0, 60], g: [200, 50, 70], c: [200, 50, 50] },  // X-ray film
        ];
        this.colorScheme = schemes[Math.floor(rng() * schemes.length)];
        this.bases = ['a', 't', 'g', 'c'];
        this.baseLetters = ['A', 'T', 'G', 'C'];
        this.showLetters = rng() > 0.5;
        this.glowIntensity = 0.3 + rng() * 0.5;
        this.tick = 0;

        // Generate helices based on topology
        this.helices = [];
        if (this.topology === 2) {
            // Circular plasmid
            this._initCircularHelix(system, rng);
        } else {
            const helixCount = this.topology === 1 ? 1 + Math.floor(rng() * 2) : 2 + Math.floor(rng() * 3);
            for (let h = 0; h < helixCount; h++) {
                this._initLinearHelix(system, rng, h);
            }
        }

        this.floatingBases = [];
        this.basePool = [];
        this.mutationFlashes = [];

        // Enzyme particles that interact with helices
        this.enzymeParticles = [];
        const enzymeCount = 4 + Math.floor(rng() * 6);
        const enzymeTypes = ['polymerase', 'helicase', 'ligase', 'topoisomerase'];
        for (let i = 0; i < enzymeCount; i++) {
            this.enzymeParticles.push({
                x: rng() * system.width,
                y: rng() * system.height,
                vx: (rng() - 0.5) * 1.2,
                vy: (rng() - 0.5) * 1.2,
                size: 4 + rng() * 4,
                phase: rng() * Math.PI * 2,
                hue: 40 + rng() * 60,
                type: enzymeTypes[Math.floor(rng() * enzymeTypes.length)],
                bound: false,
                boundHelix: -1,
                boundT: 0,
                activity: 0,
            });
        }

        // Replication forks
        this.replicationForks = [];
        if (rng() > 0.5) {
            this.replicationForks.push({
                helixIndex: 0,
                position: rng() * 0.5 + 0.25,
                speed: 0.0003 + rng() * 0.0005,
                active: true,
            });
        }
    }

    _initLinearHelix(system, rng, index) {
        const vertical = rng() > 0.35;
        const helix = {
            startX: vertical ? (0.12 + index * 0.25 + rng() * 0.15) * system.width : -50,
            startY: vertical ? -50 : (0.12 + index * 0.25 + rng() * 0.15) * system.height,
            endX: vertical ? (0.12 + index * 0.25 + rng() * 0.15) * system.width : system.width + 50,
            endY: vertical ? system.height + 50 : (0.12 + index * 0.25 + rng() * 0.15) * system.height,
            vertical,
            twist: 0.012 + rng() * 0.025,
            radius: 20 + rng() * 35,
            speed: 0.004 + rng() * 0.008,
            phase: rng() * Math.PI * 2,
            basePairs: [],
            unzipPoint: -1,
            drift: (rng() - 0.5) * 0.3,
            wobble: rng() * 0.5,
            topology: this.topology,
            supercoilAmp: this.topology === 1 ? 30 + rng() * 50 : 0,
            supercoilFreq: this.topology === 1 ? 0.002 + rng() * 0.003 : 0,
        };

        const length = Math.sqrt(
            Math.pow(helix.endX - helix.startX, 2) + Math.pow(helix.endY - helix.startY, 2)
        );
        const pairCount = Math.floor(length / 8);
        for (let i = 0; i < pairCount; i++) {
            const baseType = Math.floor(rng() * 4);
            helix.basePairs.push({
                baseType,
                complement: baseType ^ 1,
                mutated: false,
                mutationTime: 0,
                brightness: 0.3 + rng() * 0.4,
                replicated: false,
            });
        }
        this.helices.push(helix);
    }

    _initCircularHelix(system, rng) {
        const cx = system.width * (0.3 + rng() * 0.4);
        const cy = system.height * (0.3 + rng() * 0.4);
        const circRadius = 80 + rng() * 120;
        const pairCount = Math.floor(circRadius * Math.PI * 2 / 6);

        const helix = {
            cx, cy, circRadius,
            isCircular: true,
            twist: 0.04 + rng() * 0.03,
            radius: 12 + rng() * 18,
            speed: 0.003 + rng() * 0.005,
            phase: rng() * Math.PI * 2,
            basePairs: [],
            unzipPoint: -1,
            wobble: rng() * 0.3,
            supercoilAmp: 0,
        };

        for (let i = 0; i < pairCount; i++) {
            const baseType = Math.floor(rng() * 4);
            helix.basePairs.push({
                baseType,
                complement: baseType ^ 1,
                mutated: false,
                mutationTime: 0,
                brightness: 0.3 + rng() * 0.4,
                replicated: false,
            });
        }
        this.helices.push(helix);
    }

    _getBaseColor(baseType, alpha) {
        const key = this.bases[baseType];
        const c = this.colorScheme[key];
        return `hsla(${c[0]}, ${c[1]}%, ${c[2]}%, ${alpha})`;
    }

    _getHelixPosition(helix, t, i) {
        if (helix.isCircular) {
            const circAngle = t * Math.PI * 2;
            const baseX = helix.cx + Math.cos(circAngle) * helix.circRadius;
            const baseY = helix.cy + Math.sin(circAngle) * helix.circRadius;
            // Perpendicular to the circle at this point
            const perpX = Math.cos(circAngle);
            const perpY = Math.sin(circAngle);
            return { baseX, baseY, perpX, perpY };
        }

        const ax = helix.endX - helix.startX;
        const ay = helix.endY - helix.startY;
        const len = Math.sqrt(ax * ax + ay * ay) || 1;
        let baseX = helix.startX + ax * t;
        let baseY = helix.startY + ay * t;

        // Supercoiling offset
        if (helix.supercoilAmp > 0) {
            const scOffset = Math.sin(t * len * helix.supercoilFreq + this.tick * 0.003) * helix.supercoilAmp;
            const perpX = -ay / len;
            const perpY = ax / len;
            baseX += perpX * scOffset;
            baseY += perpY * scOffset;
        }

        return { baseX, baseY, perpX: -ay / len, perpY: ax / len };
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;
        this.tick++;

        for (let hi = 0; hi < this.helices.length; hi++) {
            const helix = this.helices[hi];
            helix.phase += helix.speed * system.speedMultiplier;

            // Find closest point to mouse
            const pairCount = helix.basePairs.length;
            let closestDist = Infinity;
            let closestT = 0;
            // Sample every 10th point for performance
            for (let i = 0; i < pairCount; i += 10) {
                const t = i / pairCount;
                const pos = this._getHelixPosition(helix, t, i);
                const dx = mx - pos.baseX;
                const dy = my - pos.baseY;
                const dist = dx * dx + dy * dy;
                if (dist < closestDist) { closestDist = dist; closestT = t; }
            }
            closestDist = Math.sqrt(closestDist);

            if (closestDist < 100) {
                helix.unzipPoint = closestT * pairCount;
            } else {
                helix.unzipPoint = -1;
            }

            // Gravity well mutations
            if (system.isGravityWell && closestDist < 200) {
                const mutIdx = Math.floor(closestT * pairCount);
                for (let d = -3; d <= 3; d++) {
                    const idx = mutIdx + d;
                    if (idx >= 0 && idx < pairCount) {
                        const bp = helix.basePairs[idx];
                        if (!bp.mutated && system.rng() < 0.05) {
                            bp.mutated = true;
                            bp.mutationTime = this.tick;
                            bp.baseType = Math.floor(system.rng() * 4);
                            const pos = this._getHelixPosition(helix, idx / pairCount, idx);
                            this.mutationFlashes.push({
                                x: pos.baseX, y: pos.baseY, life: 1,
                                hue: this.colorScheme[this.bases[bp.baseType]][0]
                            });
                            let fb = this.basePool.length > 0 ? this.basePool.pop() : {};
                            fb.x = pos.baseX; fb.y = pos.baseY;
                            fb.vx = (system.rng() - 0.5) * 3;
                            fb.vy = (system.rng() - 0.5) * 3;
                            fb.life = 1; fb.decay = 0.01;
                            fb.baseType = bp.complement; fb.size = 3;
                            this.floatingBases.push(fb);
                        }
                    }
                }
            }
        }

        // Replication forks
        for (const fork of this.replicationForks) {
            if (!fork.active) continue;
            fork.position += fork.speed;
            if (fork.position > 1) fork.position = 0;
            const helix = this.helices[fork.helixIndex];
            if (!helix) continue;
            const idx = Math.floor(fork.position * helix.basePairs.length);
            for (let d = -2; d <= 2; d++) {
                const bi = idx + d;
                if (bi >= 0 && bi < helix.basePairs.length) {
                    helix.basePairs[bi].replicated = true;
                }
            }
        }

        // Enzyme particles
        for (const e of this.enzymeParticles) {
            e.phase += 0.03;

            if (e.bound) {
                // Slide along helix
                const helix = this.helices[e.boundHelix];
                if (helix) {
                    e.boundT += 0.002;
                    if (e.boundT > 1) { e.bound = false; e.boundT = 0; }
                    const pos = this._getHelixPosition(helix, e.boundT, 0);
                    e.x += (pos.baseX - e.x) * 0.1;
                    e.y += (pos.baseY - e.y) * 0.1;
                    e.activity = Math.min(1, e.activity + 0.02);
                }
            } else {
                e.x += e.vx + Math.sin(e.phase) * 0.5;
                e.y += e.vy + Math.cos(e.phase * 0.7) * 0.5;
                e.activity = Math.max(0, e.activity - 0.01);

                // Try to bind to nearby helix
                for (let hi = 0; hi < this.helices.length; hi++) {
                    const helix = this.helices[hi];
                    const pairCount = helix.basePairs.length;
                    for (let i = 0; i < pairCount; i += 20) {
                        const t = i / pairCount;
                        const pos = this._getHelixPosition(helix, t, i);
                        const dx = e.x - pos.baseX;
                        const dy = e.y - pos.baseY;
                        if (dx * dx + dy * dy < 400) {
                            e.bound = true;
                            e.boundHelix = hi;
                            e.boundT = t;
                            break;
                        }
                    }
                    if (e.bound) break;
                }
            }

            if (e.x < -20 || e.x > system.width + 20) e.vx *= -1;
            if (e.y < -20 || e.y > system.height + 20) e.vy *= -1;
            e.x = Math.max(-20, Math.min(system.width + 20, e.x));
            e.y = Math.max(-20, Math.min(system.height + 20, e.y));
        }

        // Update floating bases (swap-and-pop)
        for (let i = this.floatingBases.length - 1; i >= 0; i--) {
            const fb = this.floatingBases[i];
            fb.x += fb.vx; fb.y += fb.vy;
            fb.vx *= 0.98; fb.vy *= 0.98;
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
                this.mutationFlashes[i] = this.mutationFlashes[this.mutationFlashes.length - 1];
                this.mutationFlashes.pop();
            }
        }

        if (this.floatingBases.length > 100) this.floatingBases.length = 100;
    }

    draw(system) {
        const ctx = system.ctx;

        ctx.save();

        for (let hi = 0; hi < this.helices.length; hi++) {
            const helix = this.helices[hi];
            const pairCount = helix.basePairs.length;

            const strand1 = [];
            const strand2 = [];
            const strand3 = this.topology === 3 ? [] : null; // Triple helix

            for (let i = 0; i < pairCount; i++) {
                const t = i / pairCount;
                const pos = this._getHelixPosition(helix, t, i);
                const angle = i * helix.twist + helix.phase;
                const wobble = Math.sin(this.tick * 0.005 + i * 0.1) * helix.wobble;

                const cos1 = Math.cos(angle) * helix.radius;
                const sin1 = Math.sin(angle);
                // 3D depth: scale by sin component
                const depthFactor = 0.6 + sin1 * 0.4;

                let unzipFactor = 1;
                if (helix.unzipPoint >= 0) {
                    const dist = Math.abs(i - helix.unzipPoint);
                    if (dist < 15) unzipFactor = 1 + (1 - dist / 15) * 2.5;
                }

                // Replication fork opening
                for (const fork of this.replicationForks) {
                    if (fork.helixIndex === hi) {
                        const forkIdx = fork.position * pairCount;
                        const forkDist = Math.abs(i - forkIdx);
                        if (forkDist < 20) {
                            unzipFactor = Math.max(unzipFactor, 1 + (1 - forkDist / 20) * 3);
                        }
                    }
                }

                const x1 = pos.baseX + pos.perpX * cos1 * unzipFactor + wobble;
                const y1 = pos.baseY + pos.perpY * cos1 * unzipFactor + wobble;
                const x2 = pos.baseX - pos.perpX * cos1 * unzipFactor + wobble;
                const y2 = pos.baseY - pos.perpY * cos1 * unzipFactor + wobble;

                strand1.push({ x: x1, y: y1, depth: depthFactor });
                strand2.push({ x: x2, y: y2, depth: 1.4 - depthFactor });

                if (strand3) {
                    const angle3 = angle + Math.PI * 2 / 3;
                    const cos3 = Math.cos(angle3) * helix.radius * 0.8;
                    const x3 = pos.baseX + pos.perpX * cos3 * unzipFactor + wobble;
                    const y3 = pos.baseY + pos.perpY * cos3 * unzipFactor + wobble;
                    strand3.push({ x: x3, y: y3, depth: 0.8 });
                }

                // Draw base pair rungs (every 3rd)
                if (i % 3 === 0 && unzipFactor < 2) {
                    const bp = helix.basePairs[i];
                    const alpha = bp.brightness * (bp.mutated ? 0.9 : 0.5) * depthFactor;
                    const replicatedGlow = bp.replicated ? 0.3 : 0;

                    // Rung line with depth-aware width
                    ctx.strokeStyle = this._getBaseColor(bp.baseType, alpha);
                    ctx.lineWidth = (bp.mutated ? 2.5 : 1.5) * depthFactor;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();

                    // Base pair dots with glow
                    const dotSize = (2 + depthFactor) * (bp.mutated ? 1.3 : 1);
                    ctx.fillStyle = this._getBaseColor(bp.baseType, alpha + 0.3 + replicatedGlow);
                    ctx.beginPath();
                    ctx.arc(x1, y1, dotSize, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = this._getBaseColor(bp.complement, alpha + 0.3 + replicatedGlow);
                    ctx.beginPath();
                    ctx.arc(x2, y2, dotSize, 0, Math.PI * 2);
                    ctx.fill();

                    // Base letters (when enabled and near enough)
                    if (this.showLetters && i % 6 === 0 && depthFactor > 0.7) {
                        ctx.save();
                        ctx.font = `${8 * depthFactor}px monospace`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = this._getBaseColor(bp.baseType, 0.6);
                        ctx.fillText(this.baseLetters[bp.baseType], x1, y1);
                        ctx.fillStyle = this._getBaseColor(bp.complement, 0.6);
                        ctx.fillText(this.baseLetters[bp.complement], x2, y2);
                        ctx.restore();
                    }

                    // Replicated glow
                    if (bp.replicated) {
                        ctx.save();
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.fillStyle = `hsla(120, 80%, 60%, ${0.1 * depthFactor})`;
                        ctx.beginPath();
                        ctx.arc((x1 + x2) / 2, (y1 + y2) / 2, helix.radius * 1.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                }
            }

            // Draw backbone strands with depth-aware alpha
            const drawStrand = (strand, hue, baseAlpha) => {
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (let i = 0; i < strand.length; i++) {
                    if (i === 0) ctx.moveTo(strand[i].x, strand[i].y);
                    else ctx.lineTo(strand[i].x, strand[i].y);
                }
                ctx.strokeStyle = `hsla(${hue}, 50%, 60%, ${baseAlpha})`;
                ctx.stroke();

                // Glow pass
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.lineWidth = 4;
                ctx.strokeStyle = `hsla(${hue}, 60%, 50%, ${baseAlpha * 0.15 * this.glowIntensity})`;
                ctx.beginPath();
                for (let i = 0; i < strand.length; i++) {
                    if (i === 0) ctx.moveTo(strand[i].x, strand[i].y);
                    else ctx.lineTo(strand[i].x, strand[i].y);
                }
                ctx.stroke();
                ctx.restore();
            };

            drawStrand(strand1, this.colorScheme.a[0], 0.4);
            drawStrand(strand2, this.colorScheme.c[0], 0.4);
            if (strand3) drawStrand(strand3, this.colorScheme.g[0], 0.3);
        }

        // Floating bases
        ctx.globalCompositeOperation = 'lighter';
        for (const fb of this.floatingBases) {
            ctx.fillStyle = this._getBaseColor(fb.baseType, fb.life * 0.7);
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
        ctx.globalCompositeOperation = 'lighter';
        for (const e of this.enzymeParticles) {
            const pulse = Math.sin(e.phase) * 0.3 + 0.7;
            const activeGlow = e.activity;

            // Enzyme body
            ctx.fillStyle = `hsla(${e.hue}, 70%, 55%, ${(0.3 + activeGlow * 0.4) * pulse})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size * pulse, 0, Math.PI * 2);
            ctx.fill();

            // Activity glow ring
            if (e.activity > 0.1) {
                ctx.strokeStyle = `hsla(${e.hue + 30}, 80%, 70%, ${e.activity * 0.4})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.size * 2 * pulse, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Type indicator (small label)
            if (e.bound && e.activity > 0.5) {
                ctx.fillStyle = `hsla(${e.hue}, 50%, 80%, ${e.activity * 0.3})`;
                ctx.font = '7px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(e.type.substring(0, 3).toUpperCase(), e.x, e.y - e.size * 2);
            }
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }
}
