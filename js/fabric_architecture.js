/**
 * @file fabric_architecture.js
 * @description Defines the Fabric architecture with a reactive, connecting mesh.
 * Features always-visible grid, ripple waves, vortex gravity wells, shockwave response,
 * displacement-based coloring, glow nodes at intersections, mesh tearing and repair,
 * wind forces, pin anchors, and seed-driven variation.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class FabricArchitecture extends Architecture {
    constructor() {
        super();
        this.nodes = [];
        this.rows = 25;
        this.cols = 25;
        this.elasticity = 0.04;
        this.damping = 0.92;
        this.waveSpeed = 0.25;
        this.ripples = [];
        this.clickWaves = [];
        this.prevMouseX = 0;
        this.prevMouseY = 0;
        this.mouseSpeed = 0;
        this.time = 0;

        // Tearing
        this.torn = new Set();
        this.tornFlashes = []; // {key, x, y, time}

        // Wind
        this.windAngle = 0;
        this.windStrength = 0;
        this.windTargetAngle = 0;
        this.windTargetStrength = 0;
        this.windChangeTimer = 0;

        // Repair
        this.repairQueue = []; // {key, tornAt}

        // Seed-driven parameters (set in init)
        this.baseHueShift = 0;
        this.meshTightness = 1.0;
    }

    init(system) {
        this.nodes = [];
        this.torn = new Set();
        this.tornFlashes = [];
        this.repairQueue = [];

        // Seed variation: derive fabric personality from rng
        const rng = system.rng;
        this.elasticity = 0.03 + rng() * 0.03;       // 0.03 - 0.06
        this.damping = 0.89 + rng() * 0.06;           // 0.89 - 0.95
        this.waveSpeed = 0.18 + rng() * 0.14;         // 0.18 - 0.32
        this.meshTightness = 0.85 + rng() * 0.3;      // 0.85 - 1.15
        this.baseHueShift = rng() * 60 - 30;          // -30 to +30
        this.tearThreshold = 2.5 + rng() * 1.5;       // 2.5x - 4x rest length multiplier

        // Wind initial state from seed
        this.windAngle = rng() * Math.PI * 2;
        this.windStrength = 0.2 + rng() * 0.4;
        this.windTargetAngle = this.windAngle;
        this.windTargetStrength = this.windStrength;
        this.windChangeTimer = 0;

        const spacingX = system.width / (this.cols - 1);
        const spacingY = system.height / (this.rows - 1);

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const x = c * spacingX;
                const y = r * spacingY;
                // Determine pin strength: corners strongest, edges moderate
                let pinStrength = 0;
                const isCorner = (r === 0 || r === this.rows - 1) && (c === 0 || c === this.cols - 1);
                const isEdge = r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1;
                if (isCorner) {
                    pinStrength = 0.85;
                } else if (isEdge && (c % 4 === 0 || r % 4 === 0)) {
                    pinStrength = 0.4 + rng() * 0.2;
                }

                this.nodes.push({
                    baseX: x,
                    baseY: y,
                    x: x,
                    y: y,
                    vx: 0,
                    vy: 0,
                    row: r,
                    col: c,
                    displacement: 0,
                    pinStrength: pinStrength
                });
            }
        }

        // Pre-compute rest lengths for tearing checks
        this.restLengthH = spacingX * this.meshTightness;
        this.restLengthV = spacingY * this.meshTightness;
        this.restLengthD = Math.sqrt(spacingX * spacingX + spacingY * spacingY) * this.meshTightness;

        this.prevMouseX = mouse.x;
        this.prevMouseY = mouse.y;
        this.ripples = [];
        this.clickWaves = [];
    }

    _edgeKey(r1, c1, r2, c2) {
        // Canonical ordering so we get consistent keys
        if (r1 < r2 || (r1 === r2 && c1 < c2)) {
            return `${r1},${c1}-${r2},${c2}`;
        }
        return `${r2},${c2}-${r1},${c1}`;
    }

    getNode(r, c) {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return null;
        return this.nodes[r * this.cols + c];
    }

    update(system) {
        this.time += 0.016 * system.speedMultiplier;
        const mx = mouse.x;
        const my = mouse.y;
        const interactionRadius = 220;

        // Track mouse speed for ripple intensity
        const mdx = mx - this.prevMouseX;
        const mdy = my - this.prevMouseY;
        this.mouseSpeed = Math.sqrt(mdx * mdx + mdy * mdy);
        this.prevMouseX = mx;
        this.prevMouseY = my;

        // --- Wind update ---
        this.windChangeTimer -= 0.016 * system.speedMultiplier;
        if (this.windChangeTimer <= 0) {
            this.windTargetAngle += (system.rng() - 0.5) * Math.PI * 0.8;
            this.windTargetStrength = 0.1 + system.rng() * 0.6;
            this.windChangeTimer = 2 + system.rng() * 4;
        }
        // Smoothly interpolate wind
        this.windAngle += (this.windTargetAngle - this.windAngle) * 0.02;
        this.windStrength += (this.windTargetStrength - this.windStrength) * 0.02;
        const windX = Math.cos(this.windAngle) * this.windStrength;
        const windY = Math.sin(this.windAngle) * this.windStrength;

        // --- Repair torn connections ---
        const now = this.time;
        for (let i = this.repairQueue.length - 1; i >= 0; i--) {
            const entry = this.repairQueue[i];
            if (now - entry.tornAt > 10) {
                // Repair this connection
                this.torn.delete(entry.key);
                // Add a bright flash at the midpoint
                const parts = entry.key.split('-');
                const [r1, c1] = parts[0].split(',').map(Number);
                const [r2, c2] = parts[1].split(',').map(Number);
                const n1 = this.getNode(r1, c1);
                const n2 = this.getNode(r2, c2);
                if (n1 && n2) {
                    this.tornFlashes.push({
                        x: (n1.x + n2.x) * 0.5,
                        y: (n1.y + n2.y) * 0.5,
                        time: now,
                        isRepair: true
                    });
                }
                this.repairQueue.splice(i, 1);
            }
        }

        // --- Update torn flashes ---
        for (let i = this.tornFlashes.length - 1; i >= 0; i--) {
            if (now - this.tornFlashes[i].time > 0.6) {
                this.tornFlashes.splice(i, 1);
            }
        }

        // Generate continuous ripples from mouse movement
        if (this.mouseSpeed > 2) {
            this.ripples.push({
                x: mx,
                y: my,
                radius: 0,
                maxRadius: 350 + this.mouseSpeed * 3,
                speed: 3 + this.mouseSpeed * 0.15,
                strength: Math.min(this.mouseSpeed * 0.8, 15),
                alpha: 1.0
            });
            if (this.ripples.length > 20) {
                this.ripples.shift();
            }
        }

        // Update ripples
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const rip = this.ripples[i];
            rip.radius += rip.speed * system.speedMultiplier;
            rip.alpha = 1.0 - (rip.radius / rip.maxRadius);
            if (rip.radius > rip.maxRadius) {
                this.ripples.splice(i, 1);
            }
        }

        // Update click waves
        for (let i = this.clickWaves.length - 1; i >= 0; i--) {
            const wave = this.clickWaves[i];
            wave.radius += wave.speed * system.speedMultiplier;
            wave.alpha = 1.0 - (wave.radius / wave.maxRadius);
            if (wave.radius > wave.maxRadius) {
                this.clickWaves.splice(i, 1);
            }
        }

        // Physics update for each node
        const ambientTime = this.time;
        this.nodes.forEach(n => {
            // Elastic force back to base position
            const elasticMul = 1 + n.pinStrength * 4; // pinned nodes spring back much harder
            const ex = (n.baseX - n.x) * this.elasticity * elasticMul;
            const ey = (n.baseY - n.y) * this.elasticity * elasticMul;
            n.vx += ex;
            n.vy += ey;

            // Wind force (pinned nodes resist wind more)
            const windResist = 1 - n.pinStrength * 0.8;
            // Add subtle per-node variation so it looks organic
            const windPhase = n.row * 0.3 + n.col * 0.2 + ambientTime * 0.7;
            const windWobble = Math.sin(windPhase) * 0.3 + 0.7;
            n.vx += windX * windResist * windWobble * 0.5;
            n.vy += windY * windResist * windWobble * 0.5;

            // Mouse push interaction
            const dx = n.x - mx;
            const dy = n.y - my;
            const distSq = dx * dx + dy * dy;

            if (system.isGravityWell) {
                // Gravity well / vortex: spiral pull
                const dist = Math.sqrt(distSq) || 1;
                if (dist < 350) {
                    const normalizedDist = dist / 350;
                    const pullStrength = (1 - normalizedDist) * 12 * system.speedMultiplier;
                    const tangentStrength = (1 - normalizedDist * normalizedDist) * 8 * system.speedMultiplier;

                    const ux = dx / dist;
                    const uy = dy / dist;

                    n.vx -= ux * pullStrength;
                    n.vy -= uy * pullStrength;

                    n.vx += -uy * tangentStrength;
                    n.vy += ux * tangentStrength;

                    if (dist < 30) {
                        const repel = (30 - dist) * 2;
                        n.vx += ux * repel;
                        n.vy += uy * repel;
                    }
                }
            } else {
                // Normal mouse push
                if (distSq < interactionRadius * interactionRadius && distSq > 1) {
                    const dist = Math.sqrt(distSq);
                    const force = (interactionRadius - dist) / interactionRadius;
                    const pushStrength = force * force * 12 * system.speedMultiplier;
                    n.vx += (dx / dist) * pushStrength;
                    n.vy += (dy / dist) * pushStrength;
                }
            }

            // Ripple forces
            for (const rip of this.ripples) {
                const rdx = n.baseX - rip.x;
                const rdy = n.baseY - rip.y;
                const rDist = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
                const ringDist = Math.abs(rDist - rip.radius);
                const ringWidth = 60;
                if (ringDist < ringWidth) {
                    const ringForce = (1 - ringDist / ringWidth) * rip.strength * rip.alpha;
                    n.vx += (rdx / rDist) * ringForce * 0.5;
                    n.vy += (rdy / rDist) * ringForce * 0.5;
                }
            }

            // Click wave forces
            for (const wave of this.clickWaves) {
                const wdx = n.baseX - wave.x;
                const wdy = n.baseY - wave.y;
                const wDist = Math.sqrt(wdx * wdx + wdy * wdy) || 1;
                const ringDist = Math.abs(wDist - wave.radius);
                const ringWidth = 80;
                if (ringDist < ringWidth) {
                    const ringForce = (1 - ringDist / ringWidth) * wave.strength * wave.alpha;
                    n.vx += (wdx / wDist) * ringForce * 0.6;
                    n.vy += (wdy / wDist) * ringForce * 0.6;
                }
            }

            // Shockwave response
            if (system.shockwaves) {
                for (const sw of system.shockwaves) {
                    const sdx = n.baseX - sw.x;
                    const sdy = n.baseY - sw.y;
                    const sDist = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
                    const ringDist = Math.abs(sDist - sw.radius);
                    if (ringDist < 60) {
                        const push = (1 - ringDist / 60) * sw.strength * 8;
                        n.vx += (sdx / sDist) * push;
                        n.vy += (sdy / sDist) * push;
                    }
                }
            }

            // Apply velocity and damping
            // Pinned nodes get extra damping
            const effectiveDamping = this.damping * (1 - n.pinStrength * 0.15);
            n.x += n.vx * system.speedMultiplier;
            n.y += n.vy * system.speedMultiplier;
            n.vx *= effectiveDamping;
            n.vy *= effectiveDamping;

            // Calculate displacement magnitude for coloring
            const dispX = n.x - n.baseX;
            const dispY = n.y - n.baseY;
            n.displacement = Math.sqrt(dispX * dispX + dispY * dispY);
        });

        // Wave propagation: each node transfers force to neighbors (skip torn connections)
        const propagation = this.waveSpeed;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const n = this.getNode(r, c);
                const neighborCoords = [
                    [r - 1, c],
                    [r + 1, c],
                    [r, c - 1],
                    [r, c + 1]
                ];
                for (const [nr, nc] of neighborCoords) {
                    const nb = this.getNode(nr, nc);
                    if (!nb) continue;
                    // Skip torn connections
                    const key = this._edgeKey(r, c, nr, nc);
                    if (this.torn.has(key)) continue;

                    const fdx = (n.x - n.baseX) - (nb.x - nb.baseX);
                    const fdy = (n.y - n.baseY) - (nb.y - nb.baseY);
                    nb.vx += fdx * propagation * 0.25;
                    nb.vy += fdy * propagation * 0.25;
                }
            }
        }

        // --- Tearing check ---
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const n = this.getNode(r, c);
                // Check right neighbor
                if (c < this.cols - 1) {
                    const key = this._edgeKey(r, c, r, c + 1);
                    if (!this.torn.has(key)) {
                        const nb = this.getNode(r, c + 1);
                        const dx = n.x - nb.x;
                        const dy = n.y - nb.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > this.restLengthH * this.tearThreshold) {
                            this.torn.add(key);
                            this.repairQueue.push({ key, tornAt: now });
                            this.tornFlashes.push({
                                x: (n.x + nb.x) * 0.5,
                                y: (n.y + nb.y) * 0.5,
                                time: now,
                                isRepair: false
                            });
                        }
                    }
                }
                // Check bottom neighbor
                if (r < this.rows - 1) {
                    const key = this._edgeKey(r, c, r + 1, c);
                    if (!this.torn.has(key)) {
                        const nb = this.getNode(r + 1, c);
                        const dx = n.x - nb.x;
                        const dy = n.y - nb.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > this.restLengthV * this.tearThreshold) {
                            this.torn.add(key);
                            this.repairQueue.push({ key, tornAt: now });
                            this.tornFlashes.push({
                                x: (n.x + nb.x) * 0.5,
                                y: (n.y + nb.y) * 0.5,
                                time: now,
                                isRepair: false
                            });
                        }
                    }
                }
            }
        }

        // Spawn click wave on left-click shockwaves
        if (system.shockwaves) {
            for (const sw of system.shockwaves) {
                if (sw.radius < 5) {
                    const alreadyTracked = this.clickWaves.some(
                        w => Math.abs(w.x - sw.x) < 5 && Math.abs(w.y - sw.y) < 5
                    );
                    if (!alreadyTracked) {
                        this.clickWaves.push({
                            x: sw.x,
                            y: sw.y,
                            radius: 0,
                            maxRadius: Math.max(system.width, system.height) * 0.7,
                            speed: 6,
                            strength: 20,
                            alpha: 1.0
                        });
                        if (this.clickWaves.length > 8) {
                            this.clickWaves.shift();
                        }
                    }
                }
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const baseHue = (system.hue + this.baseHueShift + 360) % 360;
        const now = this.time;

        // Draw mesh lines
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const i = r * this.cols + c;
                const n = this.nodes[i];

                // Connect to right neighbor
                if (c < this.cols - 1) {
                    const key = this._edgeKey(r, c, r, c + 1);
                    if (!this.torn.has(key)) {
                        const next = this.nodes[i + 1];
                        const avgDisp = (n.displacement + next.displacement) * 0.5;
                        const alpha = this._lineAlpha(avgDisp);
                        const hue = this._displacementHue(baseHue, avgDisp);
                        const lightness = this._displacementLightness(avgDisp);

                        ctx.strokeStyle = `hsla(${hue}, 60%, ${lightness}%, ${alpha})`;
                        ctx.lineWidth = this._lineWidth(avgDisp);
                        ctx.beginPath();
                        ctx.moveTo(n.x, n.y);
                        ctx.lineTo(next.x, next.y);
                        ctx.stroke();
                    }
                }

                // Connect to bottom neighbor
                if (r < this.rows - 1) {
                    const key = this._edgeKey(r, c, r + 1, c);
                    if (!this.torn.has(key)) {
                        const next = this.nodes[i + this.cols];
                        const avgDisp = (n.displacement + next.displacement) * 0.5;
                        const alpha = this._lineAlpha(avgDisp);
                        const hue = this._displacementHue(baseHue, avgDisp);
                        const lightness = this._displacementLightness(avgDisp);

                        ctx.strokeStyle = `hsla(${hue}, 60%, ${lightness}%, ${alpha})`;
                        ctx.lineWidth = this._lineWidth(avgDisp);
                        ctx.beginPath();
                        ctx.moveTo(n.x, n.y);
                        ctx.lineTo(next.x, next.y);
                        ctx.stroke();
                    }
                }

                // Draw diagonal connections for denser web feel
                if (c < this.cols - 1 && r < this.rows - 1) {
                    const diagNode = this.nodes[i + this.cols + 1];
                    const avgDisp = (n.displacement + diagNode.displacement) * 0.5;
                    if (avgDisp > 2) {
                        // Diagonals also respect tearing (use approximate check)
                        const ddx = n.x - diagNode.x;
                        const ddy = n.y - diagNode.y;
                        const dDist = Math.sqrt(ddx * ddx + ddy * ddy);
                        if (dDist < this.restLengthD * this.tearThreshold) {
                            const alpha = Math.min(avgDisp * 0.008, 0.15);
                            const hue = this._displacementHue(baseHue, avgDisp);
                            ctx.strokeStyle = `hsla(${hue}, 50%, 55%, ${alpha})`;
                            ctx.lineWidth = 0.5;
                            ctx.beginPath();
                            ctx.moveTo(n.x, n.y);
                            ctx.lineTo(diagNode.x, diagNode.y);
                            ctx.stroke();
                        }
                    }
                }
            }
        }

        // Draw torn flash effects
        ctx.globalCompositeOperation = 'lighter';
        for (const flash of this.tornFlashes) {
            const age = now - flash.time;
            const flashAlpha = Math.max(0, 1 - age / 0.6);
            const flashRadius = flash.isRepair ? 8 + age * 20 : 5 + age * 30;
            const flashHue = flash.isRepair ? (baseHue + 120) % 360 : (baseHue + 60) % 360;
            const flashLightness = flash.isRepair ? 80 : 90;

            ctx.fillStyle = `hsla(${flashHue}, 100%, ${flashLightness}%, ${flashAlpha * 0.7})`;
            ctx.beginPath();
            ctx.arc(flash.x, flash.y, flashRadius, 0, Math.PI * 2);
            ctx.fill();

            // Outer halo
            ctx.fillStyle = `hsla(${flashHue}, 80%, 70%, ${flashAlpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(flash.x, flash.y, flashRadius * 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // Draw glow nodes at intersections
        ctx.globalCompositeOperation = 'lighter';
        for (const n of this.nodes) {
            const disp = n.displacement;
            const baseGlow = 0.04;
            const dispGlow = Math.min(disp * 0.02, 0.5);
            const glowAlpha = baseGlow + dispGlow;
            const glowRadius = 1.5 + Math.min(disp * 0.12, 5);
            const hue = this._displacementHue(baseHue, disp);
            const lightness = 50 + Math.min(disp * 1.5, 40);

            ctx.fillStyle = `hsla(${hue}, 70%, ${lightness}%, ${glowAlpha})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();

            // Extra glow halo for highly displaced nodes
            if (disp > 8) {
                const haloAlpha = Math.min((disp - 8) * 0.008, 0.2);
                const haloRadius = glowRadius + disp * 0.2;
                ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${haloAlpha})`;
                ctx.beginPath();
                ctx.arc(n.x, n.y, haloRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw pin indicator on pinned nodes (subtle anchor dot)
            if (n.pinStrength > 0.3) {
                const pinAlpha = 0.1 + n.pinStrength * 0.15;
                ctx.fillStyle = `hsla(${(baseHue + 180) % 360}, 50%, 70%, ${pinAlpha})`;
                ctx.beginPath();
                ctx.arc(n.baseX, n.baseY, 2 + n.pinStrength * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalCompositeOperation = 'source-over';

        // Draw ripple rings for visual feedback
        ctx.globalCompositeOperation = 'lighter';
        for (const rip of this.ripples) {
            if (rip.alpha <= 0) continue;
            const ringAlpha = rip.alpha * 0.15;
            const hue = (baseHue + rip.radius * 0.3) % 360;
            ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${ringAlpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw click wave rings
        for (const wave of this.clickWaves) {
            if (wave.alpha <= 0) continue;
            const ringAlpha = wave.alpha * 0.25;
            const hue = (baseHue + 30 + wave.radius * 0.2) % 360;
            ctx.strokeStyle = `hsla(${hue}, 80%, 65%, ${ringAlpha})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
            ctx.stroke();

            if (wave.alpha > 0.3) {
                ctx.strokeStyle = `hsla(${hue}, 90%, 80%, ${ringAlpha * 0.6})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(wave.x, wave.y, wave.radius * 0.95, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Draw vortex effect if gravity well is active
        if (system.isGravityWell) {
            this._drawVortex(ctx, system, baseHue);
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    // Compute line alpha: always visible at rest, brighter when displaced
    _lineAlpha(displacement) {
        const base = 0.09;
        const dispBoost = Math.min(displacement * 0.012, 0.35);
        return base + dispBoost;
    }

    // Compute hue shift based on displacement
    _displacementHue(baseHue, displacement) {
        return (baseHue + displacement * 2.5) % 360;
    }

    // Compute lightness based on displacement
    _displacementLightness(displacement) {
        return 45 + Math.min(displacement * 1.2, 35);
    }

    // Compute line width based on displacement
    _lineWidth(displacement) {
        return 0.8 + Math.min(displacement * 0.04, 1.5);
    }

    // Draw a visual vortex/funnel overlay at the mouse position with event horizon
    _drawVortex(ctx, system, baseHue) {
        const mx = mouse.x;
        const my = mouse.y;
        const time = this.time;

        // Event horizon ring
        const eventHorizonRadius = 45 + Math.sin(time * 2) * 5;
        const ehPulse = 0.5 + Math.sin(time * 4) * 0.2;
        ctx.strokeStyle = `hsla(${(baseHue + 180) % 360}, 100%, 80%, ${ehPulse * 0.4})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(mx, my, eventHorizonRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Second event horizon ring (slightly larger, offset phase)
        ctx.strokeStyle = `hsla(${(baseHue + 200) % 360}, 90%, 70%, ${ehPulse * 0.25})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mx, my, eventHorizonRadius + 8 + Math.sin(time * 3) * 3, 0, Math.PI * 2);
        ctx.stroke();

        // Distortion lines radiating inward
        const lineCount = 16;
        for (let i = 0; i < lineCount; i++) {
            const angle = (i / lineCount) * Math.PI * 2 + time * 1.5;
            const innerR = eventHorizonRadius + 5;
            const outerR = 150 + Math.sin(time * 2 + i) * 30;
            const wobble = Math.sin(time * 3 + i * 1.7) * 15;

            const x1 = mx + Math.cos(angle) * innerR;
            const y1 = my + Math.sin(angle) * innerR;
            const midAngle = angle + wobble * 0.01;
            const midR = (innerR + outerR) * 0.5;
            const xMid = mx + Math.cos(midAngle) * midR + Math.sin(time + i) * wobble * 0.3;
            const yMid = my + Math.sin(midAngle) * midR + Math.cos(time + i) * wobble * 0.3;
            const x2 = mx + Math.cos(angle) * outerR;
            const y2 = my + Math.sin(angle) * outerR;

            const distLineAlpha = 0.06 + Math.sin(time * 2 + i * 0.5) * 0.03;
            const distHue = (baseHue + i * 15 + time * 10) % 360;
            ctx.strokeStyle = `hsla(${distHue}, 70%, 55%, ${distLineAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(xMid, yMid, x2, y2);
            ctx.stroke();
        }

        // Draw spiral arms
        const armCount = 4;
        for (let arm = 0; arm < armCount; arm++) {
            const armOffset = (arm / armCount) * Math.PI * 2;
            ctx.beginPath();
            const steps = 60;
            for (let s = 0; s < steps; s++) {
                const t = s / steps;
                const radius = t * 300;
                const angle = armOffset + t * Math.PI * 4 + time * 3;
                const px = mx + Math.cos(angle) * radius;
                const py = my + Math.sin(angle) * radius;
                if (s === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            const spiralAlpha = 0.12 + Math.sin(time * 2 + arm) * 0.04;
            const spiralHue = (baseHue + arm * 25 + time * 20) % 360;
            ctx.strokeStyle = `hsla(${spiralHue}, 80%, 60%, ${spiralAlpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Central glow
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, 80);
        const centerHue = (baseHue + 40) % 360;
        grad.addColorStop(0, `hsla(${centerHue}, 90%, 70%, 0.25)`);
        grad.addColorStop(0.3, `hsla(${centerHue}, 85%, 55%, 0.1)`);
        grad.addColorStop(0.5, `hsla(${centerHue}, 80%, 50%, 0.06)`);
        grad.addColorStop(1, `hsla(${centerHue}, 70%, 40%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mx, my, 80, 0, Math.PI * 2);
        ctx.fill();
    }
}
