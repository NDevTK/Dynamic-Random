/**
 * @file tidal_pool_architecture.js
 * @description Water surface with caustics background architecture. Simulates a shallow
 * tidal pool viewed from above, with a height-field wave equation, caustic light patterns
 * projected onto a seed-determined floor, and floating debris that moves with the water.
 * Mouse creates ripples, gravity well creates a whirlpool, shockwaves burst outward.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';
import { createNoise2D, fbm2D } from './simplex_noise.js';

export class TidalPoolArchitecture extends Architecture {
    constructor() {
        super();
        // Grid dimensions (set during init)
        this.cellSize = 5;
        this.cols = 0;
        this.rows = 0;
        // Wave equation buffers
        this.current = null;
        this.previous = null;
        // Simulation parameters (seed-determined)
        this.damping = 0.97;
        this.waveSpeed = 0.4;
        // Floor type and palette
        this.floorType = 0;
        this.floorBaseColor = { r: 180, g: 160, b: 120 };
        this.floorPatternSeed = 0;
        // Floating debris
        this.debris = [];
        // Offscreen canvases
        this.offscreen = null;
        this.offCtx = null;
        this.floorCanvas = null;
        this.floorCtx = null;
        // Noise
        this.noise2D = null;
        // Previous mouse for movement detection
        this.prevMouseX = 0;
        this.prevMouseY = 0;
        // Water tint
        this.waterHue = 195;
        this.waterAlpha = 0.25;
    }

    init(system) {
        const rng = system.rng;
        const seed = Math.floor(rng() * 100000);
        this.noise2D = createNoise2D(seed);

        // Grid resolution
        this.cellSize = 4 + Math.floor(rng() * 3); // 4-6 px per cell
        this.cols = Math.ceil(system.width / this.cellSize) + 1;
        this.rows = Math.ceil(system.height / this.cellSize) + 1;
        const totalCells = this.cols * this.rows;

        // Wave buffers
        this.current = new Float32Array(totalCells);
        this.previous = new Float32Array(totalCells);

        // Seed-determined simulation parameters
        this.damping = 0.96 + rng() * 0.03; // 0.96-0.99
        this.waveSpeed = 0.3 + rng() * 0.2;

        // Water appearance
        this.waterHue = 180 + Math.floor(rng() * 40); // 180-220
        this.waterAlpha = 0.15 + rng() * 0.2;

        // Floor type: 0=sandy, 1=rocky, 2=coral, 3=mosaic tiles
        this.floorType = Math.floor(rng() * 4);
        this.floorPatternSeed = rng() * 10000;

        switch (this.floorType) {
            case 0: // Sandy - warm tan
                this.floorBaseColor = {
                    r: 180 + Math.floor(rng() * 30),
                    g: 160 + Math.floor(rng() * 25),
                    b: 110 + Math.floor(rng() * 30)
                };
                break;
            case 1: // Rocky - dark gray-brown
                this.floorBaseColor = {
                    r: 80 + Math.floor(rng() * 30),
                    g: 70 + Math.floor(rng() * 25),
                    b: 60 + Math.floor(rng() * 20)
                };
                break;
            case 2: // Coral - colorful base
                this.floorBaseColor = {
                    r: 140 + Math.floor(rng() * 40),
                    g: 100 + Math.floor(rng() * 40),
                    b: 100 + Math.floor(rng() * 40)
                };
                break;
            case 3: // Mosaic tiles - neutral base
                this.floorBaseColor = {
                    r: 120 + Math.floor(rng() * 30),
                    g: 120 + Math.floor(rng() * 30),
                    b: 130 + Math.floor(rng() * 30)
                };
                break;
        }

        // Create offscreen canvas for rendering
        this.offscreen = document.createElement('canvas');
        this.offscreen.width = system.width;
        this.offscreen.height = system.height;
        this.offCtx = this.offscreen.getContext('2d');

        // Pre-render floor pattern
        this.floorCanvas = document.createElement('canvas');
        this.floorCanvas.width = system.width;
        this.floorCanvas.height = system.height;
        this.floorCtx = this.floorCanvas.getContext('2d');
        this._renderFloor(system);

        // Generate floating debris: 5-15 objects
        this.debris = [];
        const debrisCount = 5 + Math.floor(rng() * 11);
        // Debris types from seed: 0=leaf, 1=petal, 2=fish, 3=bubble
        const debrisTypeWeights = [rng(), rng(), rng(), rng()];
        for (let i = 0; i < debrisCount; i++) {
            const typeRoll = rng();
            let dtype;
            if (typeRoll < 0.3) dtype = 0; // leaf
            else if (typeRoll < 0.55) dtype = 1; // petal
            else if (typeRoll < 0.8) dtype = 2; // fish
            else dtype = 3; // bubble

            this.debris.push({
                x: rng() * system.width,
                y: rng() * system.height,
                vx: 0,
                vy: 0,
                type: dtype,
                size: 4 + rng() * 8,
                rotation: rng() * Math.PI * 2,
                rotSpeed: (rng() - 0.5) * 0.02,
                alpha: 0.5 + rng() * 0.4,
                phase: rng() * Math.PI * 2,
                hueShift: (rng() - 0.5) * 30
            });
        }

        this.prevMouseX = 0;
        this.prevMouseY = 0;
    }

    _renderFloor(system) {
        const ctx = this.floorCtx;
        const w = system.width;
        const h = system.height;
        const { r, g, b } = this.floorBaseColor;

        // Fill base
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, w, h);

        switch (this.floorType) {
            case 0: // Sandy: noise-based grain variation
                for (let y = 0; y < h; y += 3) {
                    for (let x = 0; x < w; x += 3) {
                        const n = fbm2D(this.noise2D, x * 0.02, y * 0.02, 3);
                        const brightness = Math.floor(n * 25);
                        ctx.fillStyle = `rgb(${r + brightness}, ${g + brightness}, ${b + brightness - 5})`;
                        ctx.fillRect(x, y, 3, 3);
                    }
                }
                break;

            case 1: // Rocky: large noise patches with cracks
                for (let y = 0; y < h; y += 4) {
                    for (let x = 0; x < w; x += 4) {
                        const n1 = fbm2D(this.noise2D, x * 0.008, y * 0.008, 4);
                        const n2 = fbm2D(this.noise2D, x * 0.03 + 50, y * 0.03 + 50, 2);
                        const val = Math.floor(n1 * 35 + n2 * 15);
                        ctx.fillStyle = `rgb(${r + val}, ${g + val - 3}, ${b + val - 5})`;
                        ctx.fillRect(x, y, 4, 4);
                    }
                }
                // Dark crack lines
                ctx.strokeStyle = `rgba(${r - 30}, ${g - 30}, ${b - 30}, 0.3)`;
                ctx.lineWidth = 1;
                for (let i = 0; i < 15; i++) {
                    let cx = this.noise2D(i * 7.3, 0.5) * 0.5 * w + w * 0.25;
                    let cy = this.noise2D(0.5, i * 7.3) * 0.5 * h + h * 0.25;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    for (let s = 0; s < 20; s++) {
                        cx += this.noise2D(cx * 0.01, cy * 0.01) * 15;
                        cy += this.noise2D(cy * 0.01, cx * 0.01 + 100) * 15;
                        ctx.lineTo(cx, cy);
                    }
                    ctx.stroke();
                }
                break;

            case 2: // Coral: colorful irregular patches
                for (let y = 0; y < h; y += 5) {
                    for (let x = 0; x < w; x += 5) {
                        const n = fbm2D(this.noise2D, x * 0.012, y * 0.012, 3);
                        const patchType = Math.floor((n + 1) * 2.5) % 5;
                        let pr, pg, pb;
                        switch (patchType) {
                            case 0: pr = r + 40; pg = g - 20; pb = b - 30; break; // warm coral
                            case 1: pr = r - 30; pg = g + 30; pb = b - 10; break; // green
                            case 2: pr = r - 20; pg = g - 10; pb = b + 50; break; // blue
                            case 3: pr = r + 20; pg = g + 20; pb = b + 20; break; // light
                            default: pr = r - 10; pg = g; pb = b; break;
                        }
                        const detail = fbm2D(this.noise2D, x * 0.05 + 200, y * 0.05 + 200, 2) * 15;
                        ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, pr + detail))}, ${Math.max(0, Math.min(255, pg + detail))}, ${Math.max(0, Math.min(255, pb + detail))})`;
                        ctx.fillRect(x, y, 5, 5);
                    }
                }
                break;

            case 3: // Mosaic tiles: geometric colored squares
                const tileSize = 15 + Math.floor(this.noise2D(0, 0) * 5 + 5);
                const tileColors = [
                    [r, g, b],
                    [r + 30, g - 10, b + 20],
                    [r - 20, g + 25, b + 10],
                    [r + 10, g + 10, b + 35],
                    [r + 20, g + 20, b - 15]
                ];
                for (let ty = 0; ty < h; ty += tileSize) {
                    for (let tx = 0; tx < w; tx += tileSize) {
                        const n = this.noise2D(tx * 0.03, ty * 0.03);
                        const ci = Math.abs(Math.floor(n * tileColors.length)) % tileColors.length;
                        const [cr, cg, cb] = tileColors[ci];
                        ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, cr))}, ${Math.max(0, Math.min(255, cg))}, ${Math.max(0, Math.min(255, cb))})`;
                        ctx.fillRect(tx + 0.5, ty + 0.5, tileSize - 1, tileSize - 1);
                    }
                    // Grout lines
                    ctx.strokeStyle = `rgba(${r - 40}, ${g - 40}, ${b - 40}, 0.4)`;
                    ctx.lineWidth = 1;
                    for (let tx = 0; tx < w; tx += tileSize) {
                        ctx.beginPath();
                        ctx.moveTo(tx, 0);
                        ctx.lineTo(tx, h);
                        ctx.stroke();
                    }
                }
                for (let ty = 0; ty < h; ty += tileSize) {
                    ctx.beginPath();
                    ctx.moveTo(0, ty);
                    ctx.lineTo(w, ty);
                    ctx.stroke();
                }
                break;
        }

        // Darken floor slightly to simulate underwater depth
        ctx.fillStyle = 'rgba(0, 20, 40, 0.3)';
        ctx.fillRect(0, 0, w, h);
    }

    _idx(col, row) {
        return row * this.cols + col;
    }

    update(system) {
        const cols = this.cols;
        const rows = this.rows;
        const speed = this.waveSpeed;
        const damping = this.damping;
        const cur = this.current;
        const prev = this.previous;

        // Mouse ripple creation
        const mx = mouse.x;
        const my = mouse.y;
        const mcol = Math.floor(mx / this.cellSize);
        const mrow = Math.floor(my / this.cellSize);

        // Detect mouse movement
        const mouseDx = mx - this.prevMouseX;
        const mouseDy = my - this.prevMouseY;
        const mouseMoveDist = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);
        this.prevMouseX = mx;
        this.prevMouseY = my;

        // Create ripples from mouse movement
        if (mouseMoveDist > 2 && mcol > 1 && mcol < cols - 2 && mrow > 1 && mrow < rows - 2) {
            const rippleRadius = 3;
            const rippleStrength = Math.min(mouseMoveDist * 0.3, 8);
            for (let dr = -rippleRadius; dr <= rippleRadius; dr++) {
                for (let dc = -rippleRadius; dc <= rippleRadius; dc++) {
                    const distSq = dr * dr + dc * dc;
                    if (distSq <= rippleRadius * rippleRadius) {
                        const c = mcol + dc;
                        const r = mrow + dr;
                        if (c >= 0 && c < cols && r >= 0 && r < rows) {
                            const falloff = 1 - distSq / (rippleRadius * rippleRadius);
                            cur[this._idx(c, r)] += rippleStrength * falloff;
                        }
                    }
                }
            }
        }

        // Gravity well: whirlpool depression + spiral velocity
        if (system.isGravityWell && mcol > 2 && mcol < cols - 3 && mrow > 2 && mrow < rows - 3) {
            const whirlRadius = 12;
            for (let dr = -whirlRadius; dr <= whirlRadius; dr++) {
                for (let dc = -whirlRadius; dc <= whirlRadius; dc++) {
                    const distSq = dr * dr + dc * dc;
                    if (distSq <= whirlRadius * whirlRadius && distSq > 0) {
                        const c = mcol + dc;
                        const r = mrow + dr;
                        if (c >= 0 && c < cols && r >= 0 && r < rows) {
                            const dist = Math.sqrt(distSq);
                            const falloff = 1 - dist / whirlRadius;
                            // Depression in center
                            cur[this._idx(c, r)] -= falloff * 0.5;
                            // Spiral: shift values tangentially
                            const angle = Math.atan2(dr, dc);
                            const tangentC = Math.round(-Math.sin(angle) * 0.5);
                            const tangentR = Math.round(Math.cos(angle) * 0.5);
                            const tc = c + tangentC;
                            const tr = r + tangentR;
                            if (tc >= 0 && tc < cols && tr >= 0 && tr < rows) {
                                const transfer = cur[this._idx(c, r)] * 0.02 * falloff;
                                cur[this._idx(tc, tr)] += transfer;
                            }
                        }
                    }
                }
            }
        }

        // Shockwave: large ripple burst
        for (let si = 0; si < system.shockwaves.length; si++) {
            const sw = system.shockwaves[si];
            const swCol = Math.floor(sw.x / this.cellSize);
            const swRow = Math.floor(sw.y / this.cellSize);
            const swRadiusCells = Math.floor(sw.radius / this.cellSize);
            const ringWidth = 4;

            for (let dr = -swRadiusCells - ringWidth; dr <= swRadiusCells + ringWidth; dr++) {
                for (let dc = -swRadiusCells - ringWidth; dc <= swRadiusCells + ringWidth; dc++) {
                    const dist = Math.sqrt(dr * dr + dc * dc);
                    if (Math.abs(dist - swRadiusCells) < ringWidth) {
                        const c = swCol + dc;
                        const r = swRow + dr;
                        if (c >= 0 && c < cols && r >= 0 && r < rows) {
                            const edgeFalloff = 1 - Math.abs(dist - swRadiusCells) / ringWidth;
                            cur[this._idx(c, r)] += sw.strength * edgeFalloff * 6;
                        }
                    }
                }
            }
        }

        // Device tilt: add directional current to wave propagation
        if (system.deviceTilt) {
            const tiltX = system.deviceTilt.x || 0;
            const tiltY = system.deviceTilt.y || 0;
            if (Math.abs(tiltX) > 0.01 || Math.abs(tiltY) > 0.01) {
                for (let r = 1; r < rows - 1; r++) {
                    for (let c = 1; c < cols - 1; c++) {
                        const idx = this._idx(c, r);
                        // Shift wave energy in tilt direction
                        const shiftC = Math.sign(tiltX);
                        const shiftR = Math.sign(tiltY);
                        const neighborIdx = this._idx(
                            Math.max(0, Math.min(cols - 1, c + shiftC)),
                            Math.max(0, Math.min(rows - 1, r + shiftR))
                        );
                        cur[idx] += (cur[neighborIdx] - cur[idx]) * Math.min(Math.abs(tiltX) + Math.abs(tiltY), 0.3) * 0.1;
                    }
                }
            }
        }

        // Wave equation: next = 2*current - previous + speed*(neighbors_avg - current)
        // Then dampen. We write into 'previous' as our next buffer, then swap.
        for (let r = 1; r < rows - 1; r++) {
            for (let c = 1; c < cols - 1; c++) {
                const idx = this._idx(c, r);
                const neighbors = (
                    cur[this._idx(c - 1, r)] +
                    cur[this._idx(c + 1, r)] +
                    cur[this._idx(c, r - 1)] +
                    cur[this._idx(c, r + 1)]
                ) * 0.25;
                const next = 2 * cur[idx] - prev[idx] + speed * (neighbors - cur[idx]);
                prev[idx] = next * damping;
            }
        }

        // Reflecting edges: copy neighbor values
        for (let c = 0; c < cols; c++) {
            prev[this._idx(c, 0)] = prev[this._idx(c, 1)];
            prev[this._idx(c, rows - 1)] = prev[this._idx(c, rows - 2)];
        }
        for (let r = 0; r < rows; r++) {
            prev[this._idx(0, r)] = prev[this._idx(1, r)];
            prev[this._idx(cols - 1, r)] = prev[this._idx(cols - 2, r)];
        }

        // Swap buffers
        const temp = this.current;
        this.current = this.previous;
        this.previous = temp;

        // Update floating debris: position affected by local height gradient
        for (let i = 0; i < this.debris.length; i++) {
            const d = this.debris[i];
            const dc = Math.floor(d.x / this.cellSize);
            const dr = Math.floor(d.y / this.cellSize);

            if (dc > 0 && dc < cols - 1 && dr > 0 && dr < rows - 1) {
                const gradX = (this.current[this._idx(dc + 1, dr)] - this.current[this._idx(dc - 1, dr)]) * 0.5;
                const gradY = (this.current[this._idx(dc, dr + 1)] - this.current[this._idx(dc, dr - 1)]) * 0.5;
                d.vx += gradX * 0.8;
                d.vy += gradY * 0.8;
            }

            // Device tilt influence on debris
            if (system.deviceTilt) {
                d.vx += (system.deviceTilt.x || 0) * 0.05;
                d.vy += (system.deviceTilt.y || 0) * 0.05;
            }

            d.vx *= 0.96;
            d.vy *= 0.96;
            d.x += d.vx * system.speedMultiplier;
            d.y += d.vy * system.speedMultiplier;
            d.rotation += d.rotSpeed * system.speedMultiplier;

            // Wrap around
            if (d.x < -d.size * 2) d.x += system.width + d.size * 4;
            if (d.x > system.width + d.size * 2) d.x -= system.width + d.size * 4;
            if (d.y < -d.size * 2) d.y += system.height + d.size * 4;
            if (d.y > system.height + d.size * 2) d.y -= system.height + d.size * 4;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const offCtx = this.offCtx;
        const w = system.width;
        const h = system.height;
        const cols = this.cols;
        const rows = this.rows;
        const cellSize = this.cellSize;
        const cur = this.current;

        // Step 1: Draw floor
        offCtx.drawImage(this.floorCanvas, 0, 0);

        // Step 2: Compute and overlay caustics
        // Caustics: use height field gradient to determine light ray deflection
        // and brighten the destination cells
        offCtx.save();
        offCtx.globalCompositeOperation = 'lighter';

        const causticStrength = 0.12;
        const lightRefractScale = 3.0; // How far light shifts based on surface slope

        // Process caustics in chunks for performance - use imageData for speed
        const imageData = offCtx.getImageData(0, 0, w, h);
        const pixels = imageData.data;

        for (let r = 1; r < rows - 1; r++) {
            for (let c = 1; c < cols - 1; c++) {
                // Surface normal approximated from height gradient
                const dhdx = (cur[this._idx(c + 1, r)] - cur[this._idx(c - 1, r)]) * 0.5;
                const dhdy = (cur[this._idx(c, r + 1)] - cur[this._idx(c, r - 1)]) * 0.5;

                // Light ray destination (refracted position on floor)
                const destX = Math.floor(c * cellSize + dhdx * lightRefractScale * cellSize);
                const destY = Math.floor(r * cellSize + dhdy * lightRefractScale * cellSize);

                if (destX < 0 || destX >= w || destY < 0 || destY >= h) continue;

                // Caustic intensity: areas where light converges get brighter
                // Compute divergence of the displacement field (second derivatives)
                const d2hdx2 = cur[this._idx(c + 1, r)] - 2 * cur[this._idx(c, r)] + cur[this._idx(c - 1, r)];
                const d2hdy2 = cur[this._idx(c, r + 1)] - 2 * cur[this._idx(c, r)] + cur[this._idx(c, r - 1)];
                const convergence = -(d2hdx2 + d2hdy2);

                // Only brighten where light converges (positive convergence)
                if (convergence > 0.01) {
                    const intensity = Math.min(convergence * causticStrength * 255, 60);
                    // Apply brightness to a small area around destination
                    for (let py = destY - 1; py <= destY + 1; py++) {
                        for (let px = destX - 1; px <= destX + 1; px++) {
                            if (px >= 0 && px < w && py >= 0 && py < h) {
                                const pidx = (py * w + px) * 4;
                                pixels[pidx] = Math.min(255, pixels[pidx] + intensity * 0.9);
                                pixels[pidx + 1] = Math.min(255, pixels[pidx + 1] + intensity);
                                pixels[pidx + 2] = Math.min(255, pixels[pidx + 2] + intensity * 0.8);
                            }
                        }
                    }
                }
            }
        }

        offCtx.putImageData(imageData, 0, 0);
        offCtx.restore();

        // Step 3: Water surface tint and depth shading
        offCtx.save();
        offCtx.fillStyle = `hsla(${this.waterHue}, 60%, 30%, ${this.waterAlpha})`;
        offCtx.fillRect(0, 0, w, h);
        offCtx.restore();

        // Step 4: Surface reflection highlights (specular)
        offCtx.save();
        offCtx.globalCompositeOperation = 'lighter';
        for (let r = 2; r < rows - 2; r += 2) {
            for (let c = 2; c < cols - 2; c += 2) {
                const height = cur[this._idx(c, r)];
                if (height > 1.5) {
                    const intensity = Math.min((height - 1.5) * 0.15, 0.4);
                    const px = c * cellSize;
                    const py = r * cellSize;
                    offCtx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
                    offCtx.fillRect(px - 1, py - 1, cellSize + 2, cellSize + 2);
                }
            }
        }
        offCtx.restore();

        // Step 5: Draw floating debris onto offscreen canvas
        this._drawDebris(offCtx, system);

        // Composite to main canvas
        ctx.drawImage(this.offscreen, 0, 0);
    }

    _drawDebris(ctx, system) {
        const tick = system.tick;

        for (let i = 0; i < this.debris.length; i++) {
            const d = this.debris[i];
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rotation);
            ctx.globalAlpha = d.alpha;

            switch (d.type) {
                case 0: // Leaf - green oval
                    ctx.fillStyle = `hsl(${110 + d.hueShift}, 50%, 35%)`;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, d.size, d.size * 0.45, 0, 0, Math.PI * 2);
                    ctx.fill();
                    // Leaf vein
                    ctx.strokeStyle = `hsla(${100 + d.hueShift}, 40%, 25%, 0.5)`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(-d.size * 0.8, 0);
                    ctx.lineTo(d.size * 0.8, 0);
                    ctx.stroke();
                    break;

                case 1: // Petal - pink/white oval
                    ctx.fillStyle = `hsla(${340 + d.hueShift}, 60%, 80%, 0.8)`;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, d.size * 0.8, d.size * 0.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    // Petal gradient edge
                    ctx.fillStyle = `hsla(${350 + d.hueShift}, 70%, 70%, 0.3)`;
                    ctx.beginPath();
                    ctx.ellipse(d.size * 0.15, 0, d.size * 0.5, d.size * 0.3, 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 2: // Fish silhouette - dark shape
                    ctx.fillStyle = `rgba(30, 40, 50, ${0.4 + Math.sin(tick * 0.05 + d.phase) * 0.1})`;
                    ctx.beginPath();
                    // Body
                    ctx.ellipse(0, 0, d.size, d.size * 0.35, 0, 0, Math.PI * 2);
                    ctx.fill();
                    // Tail
                    ctx.beginPath();
                    ctx.moveTo(-d.size * 0.8, 0);
                    ctx.lineTo(-d.size * 1.3, -d.size * 0.35);
                    ctx.lineTo(-d.size * 1.3, d.size * 0.35);
                    ctx.closePath();
                    ctx.fill();
                    // Eye
                    ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
                    ctx.beginPath();
                    ctx.arc(d.size * 0.5, -d.size * 0.05, d.size * 0.08, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 3: // Bubble - white circle with highlight
                    ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.arc(0, 0, d.size * 0.5, 0, Math.PI * 2);
                    ctx.stroke();
                    // Specular highlight
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                    ctx.beginPath();
                    ctx.arc(-d.size * 0.15, -d.size * 0.15, d.size * 0.15, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }

            ctx.restore();
        }
    }
}
