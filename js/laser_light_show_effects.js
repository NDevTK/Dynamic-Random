/**
 * @file laser_light_show_effects.js
 * @description Sweeping laser beams that create a concert/club light show effect.
 * Beams rotate, bounce off mirrors, and create intersection glows. Cursor controls
 * a spotlight, and clicking triggers strobe bursts and beam pattern changes.
 *
 * Modes:
 * 0 - Concert Stage: Colored beams sweep from bottom, fog/haze makes beams visible
 * 1 - Disco Ball: Beams radiate from a central rotating point creating star patterns
 * 2 - Searchlight: Thick beams sweep slowly like lighthouse/prison searchlights
 * 3 - Laser Maze: Thin precise beams bounce off reflective surfaces placed randomly
 * 4 - Rave Tunnel: Parallel beams create a tunnel effect moving toward the viewer
 * 5 - Hologram Grid: Crossing beams form a 3D-looking wireframe grid that rotates
 */

const TAU = Math.PI * 2;

function _prand(seed) {
    return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
}

export class LaserLightShow {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._clickFlash = 0;

        this._beams = [];
        this._mirrors = [];

        // Rave tunnel rings
        this._tunnelRings = [];

        // Hologram grid
        this._gridRotation = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : 120;
        this.intensity = 0.5 + rng() * 0.5;
        this._beams = [];
        this._mirrors = [];
        this._tunnelRings = [];
        this._clickFlash = 0;

        const W = window.innerWidth, H = window.innerHeight;

        if (this.mode === 0) {
            // Concert beams from bottom
            const count = 6 + Math.floor(rng() * 6);
            for (let i = 0; i < count; i++) {
                this._beams.push({
                    originX: W * (0.1 + (i / count) * 0.8),
                    originY: H,
                    angle: -Math.PI / 2 + (rng() - 0.5) * 0.8,
                    sweepSpeed: 0.005 + rng() * 0.015,
                    sweepRange: 0.3 + rng() * 0.8,
                    width: 2 + rng() * 4,
                    hue: (this.hue + rng() * 120) % 360,
                    phase: rng() * TAU,
                    length: H * 0.6 + rng() * H * 0.4,
                });
            }
        } else if (this.mode === 1) {
            // Disco ball beams from center
            const count = 12 + Math.floor(rng() * 12);
            for (let i = 0; i < count; i++) {
                this._beams.push({
                    angle: (i / count) * TAU,
                    rotSpeed: 0.003 + rng() * 0.008,
                    width: 1 + rng() * 2,
                    hue: (this.hue + (i / count) * 360) % 360,
                    length: Math.min(W, H) * (0.3 + rng() * 0.5),
                    flicker: rng() * TAU,
                    flickerSpeed: 0.02 + rng() * 0.05,
                });
            }
        } else if (this.mode === 2) {
            // Searchlights - fewer, thicker beams
            const count = 2 + Math.floor(rng() * 3);
            for (let i = 0; i < count; i++) {
                this._beams.push({
                    originX: rng() * W,
                    originY: rng() > 0.5 ? 0 : H,
                    angle: rng() * TAU,
                    sweepSpeed: 0.002 + rng() * 0.005,
                    sweepRange: Math.PI * 0.6 + rng() * Math.PI,
                    width: 15 + rng() * 25,
                    hue: (this.hue + rng() * 40) % 360,
                    phase: rng() * TAU,
                    length: Math.max(W, H) * 1.2,
                });
            }
        } else if (this.mode === 3) {
            // Laser maze - thin beams + mirrors
            const beamCount = 3 + Math.floor(rng() * 3);
            for (let i = 0; i < beamCount; i++) {
                const side = Math.floor(rng() * 4);
                let ox, oy;
                if (side === 0) { ox = 0; oy = rng() * H; }
                else if (side === 1) { ox = W; oy = rng() * H; }
                else if (side === 2) { ox = rng() * W; oy = 0; }
                else { ox = rng() * W; oy = H; }
                this._beams.push({
                    originX: ox, originY: oy,
                    angle: Math.atan2(H / 2 - oy, W / 2 - ox) + (rng() - 0.5) * 0.5,
                    width: 1 + rng() * 1.5,
                    hue: (this.hue + rng() * 80) % 360,
                    phase: rng() * TAU,
                    sweepSpeed: 0.003 + rng() * 0.005,
                    sweepRange: 0.3,
                });
            }
            // Mirrors
            const mirrorCount = 5 + Math.floor(rng() * 5);
            for (let i = 0; i < mirrorCount; i++) {
                this._mirrors.push({
                    x: W * 0.1 + rng() * W * 0.8,
                    y: H * 0.1 + rng() * H * 0.8,
                    angle: rng() * Math.PI,
                    length: 20 + rng() * 40,
                });
            }
        } else if (this.mode === 4) {
            // Rave tunnel - concentric rings
            const ringCount = 8 + Math.floor(rng() * 6);
            for (let i = 0; i < ringCount; i++) {
                this._tunnelRings.push({
                    depth: i / ringCount,
                    sides: 4 + Math.floor(rng() * 4),
                    rotation: rng() * TAU,
                    rotSpeed: (rng() - 0.5) * 0.02,
                    hue: (this.hue + (i / ringCount) * 180) % 360,
                });
            }
        } else if (this.mode === 5) {
            // Hologram grid
            this._gridRotation = rng() * TAU;
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._mx = mx;
        this._my = my;

        if (isClicking && !this._wasClicking) {
            this._clickFlash = 1;
            // Perturb beam angles on click for dynamic pattern change
            for (const beam of this._beams) {
                if (beam.phase !== undefined) {
                    beam.phase += 0.5 + _prand(this.tick * 37) * 1.5;
                }
                if (beam.sweepSpeed !== undefined) {
                    // Temporarily boost sweep speed
                    beam._origSpeed = beam._origSpeed || beam.sweepSpeed;
                    beam.sweepSpeed = beam._origSpeed * (2 + _prand(this.tick * 53) * 2);
                }
            }
            // Inject temporary rings into rave tunnel
            if (this.mode === 4 && this._tunnelRings.length < 20) {
                this._tunnelRings.push({
                    depth: 0.01,
                    sides: 4 + Math.floor(_prand(this.tick * 71) * 6),
                    rotation: _prand(this.tick * 83) * TAU,
                    rotSpeed: (_prand(this.tick * 97) - 0.5) * 0.06,
                    hue: (this.hue + _prand(this.tick * 101) * 180) % 360,
                });
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;
        this._clickFlash *= 0.92;

        // Restore beam speeds gradually
        for (const beam of this._beams) {
            if (beam._origSpeed && beam.sweepSpeed > beam._origSpeed * 1.05) {
                beam.sweepSpeed *= 0.97;
            }
        }

        // Tunnel ring movement
        for (const ring of this._tunnelRings) {
            ring.depth -= 0.003;
            ring.rotation += ring.rotSpeed;
            if (ring.depth < -0.1) ring.depth += 1.1;
        }

        this._gridRotation += 0.003;
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const W = window.innerWidth, H = window.innerHeight;

        if (this.mode === 0) this._drawConcert(ctx, W, H);
        else if (this.mode === 1) this._drawDisco(ctx, W, H);
        else if (this.mode === 2) this._drawSearchlight(ctx, W, H);
        else if (this.mode === 3) this._drawLaserMaze(ctx, W, H);
        else if (this.mode === 4) this._drawRaveTunnel(ctx, W, H);
        else if (this.mode === 5) this._drawHologramGrid(ctx, W, H);

        // Cursor spotlight
        const spotAlpha = 0.03 * this.intensity;
        const spotGrad = ctx.createRadialGradient(this._mx, this._my, 0, this._mx, this._my, 80);
        spotGrad.addColorStop(0, `hsla(${this.hue}, 80%, 90%, ${spotAlpha})`);
        spotGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.arc(this._mx, this._my, 80, 0, TAU);
        ctx.fill();

        // Click strobe flash
        if (this._clickFlash > 0.01) {
            ctx.fillStyle = `hsla(${this.hue}, 90%, 95%, ${this._clickFlash * 0.08 * this.intensity})`;
            ctx.fillRect(0, 0, W, H);
        }

        ctx.restore();
    }

    _drawBeamLine(ctx, x1, y1, angle, width, length, hue, alpha) {
        const x2 = x1 + Math.cos(angle) * length;
        const y2 = y1 + Math.sin(angle) * length;

        // Main beam
        ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${alpha})`;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Bloom
        ctx.strokeStyle = `hsla(${hue}, 100%, 85%, ${alpha * 0.3})`;
        ctx.lineWidth = width * 3;
        ctx.stroke();
    }

    _drawConcert(ctx, W, H) {
        // Haze layer
        ctx.fillStyle = `hsla(${this.hue}, 30%, 50%, 0.01)`;
        ctx.fillRect(0, H * 0.2, W, H * 0.5);

        for (const beam of this._beams) {
            const sweep = Math.sin(this.tick * beam.sweepSpeed + beam.phase) * beam.sweepRange;
            const angle = beam.angle + sweep;

            // Mouse influence - beams slightly attracted to cursor
            const toMouse = Math.atan2(this._my - beam.originY, this._mx - beam.originX);
            const blended = angle + (toMouse - angle) * 0.1;

            const alpha = (0.15 + this._clickFlash * 0.2) * this.intensity;
            this._drawBeamLine(ctx, beam.originX, beam.originY, blended, beam.width, beam.length, beam.hue, alpha);
        }
    }

    _drawDisco(ctx, W, H) {
        const cx = W / 2, cy = H / 2;

        // Central ball glow
        const ballGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
        ballGrad.addColorStop(0, `hsla(0, 0%, 95%, 0.15)`);
        ballGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, TAU);
        ctx.fill();

        for (const beam of this._beams) {
            beam.flicker += beam.flickerSpeed;
            const flicker = (Math.sin(beam.flicker) + 1) / 2;
            if (flicker < 0.3) continue; // Some beams off at times

            const angle = beam.angle + this.tick * beam.rotSpeed;
            const alpha = flicker * 0.12 * this.intensity;
            this._drawBeamLine(ctx, cx, cy, angle, beam.width, beam.length, beam.hue, alpha);
        }
    }

    _drawSearchlight(ctx, W, H) {
        for (const beam of this._beams) {
            const sweep = Math.sin(this.tick * beam.sweepSpeed + beam.phase) * beam.sweepRange;
            const angle = beam.angle + sweep;

            // Volumetric cone
            const endX = beam.originX + Math.cos(angle) * beam.length;
            const endY = beam.originY + Math.sin(angle) * beam.length;
            const perpAngle = angle + Math.PI / 2;
            const halfWidth = beam.width;
            const endHalfWidth = beam.width * 3;

            const alpha = 0.08 * this.intensity;
            ctx.fillStyle = `hsla(${beam.hue}, 60%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(beam.originX + Math.cos(perpAngle) * halfWidth,
                beam.originY + Math.sin(perpAngle) * halfWidth);
            ctx.lineTo(endX + Math.cos(perpAngle) * endHalfWidth,
                endY + Math.sin(perpAngle) * endHalfWidth);
            ctx.lineTo(endX - Math.cos(perpAngle) * endHalfWidth,
                endY - Math.sin(perpAngle) * endHalfWidth);
            ctx.lineTo(beam.originX - Math.cos(perpAngle) * halfWidth,
                beam.originY - Math.sin(perpAngle) * halfWidth);
            ctx.closePath();
            ctx.fill();

            // Center line
            ctx.strokeStyle = `hsla(${beam.hue}, 80%, 85%, ${alpha * 1.5})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(beam.originX, beam.originY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }

    _drawLaserMaze(ctx, W, H) {
        // Draw mirrors
        for (const m of this._mirrors) {
            ctx.strokeStyle = `hsla(0, 0%, 80%, 0.08)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(m.x + Math.cos(m.angle) * m.length / 2, m.y + Math.sin(m.angle) * m.length / 2);
            ctx.lineTo(m.x - Math.cos(m.angle) * m.length / 2, m.y - Math.sin(m.angle) * m.length / 2);
            ctx.stroke();
        }

        // Trace beams with reflections
        for (const beam of this._beams) {
            const sweep = Math.sin(this.tick * beam.sweepSpeed + beam.phase) * beam.sweepRange;
            let angle = beam.angle + sweep;
            let ox = beam.originX, oy = beam.originY;
            const alpha = 0.18 * this.intensity;
            let hue = beam.hue;

            // Trace up to 5 bounces
            for (let bounce = 0; bounce < 5; bounce++) {
                let bestDist = Infinity;
                let hitMirror = null;
                let hitX = ox + Math.cos(angle) * 2000;
                let hitY = oy + Math.sin(angle) * 2000;

                // Check mirror intersections
                for (const m of this._mirrors) {
                    const hit = this._rayMirrorIntersect(ox, oy, angle, m);
                    if (hit && hit.dist < bestDist && hit.dist > 5) {
                        bestDist = hit.dist;
                        hitX = hit.x;
                        hitY = hit.y;
                        hitMirror = m;
                    }
                }

                // Draw beam segment
                const segAlpha = alpha * Math.pow(0.7, bounce);
                this._drawBeamLine(ctx, ox, oy, Math.atan2(hitY - oy, hitX - ox),
                    beam.width, bestDist < 2000 ? bestDist : 2000, hue, segAlpha);

                // Intersection glow
                if (hitMirror) {
                    ctx.fillStyle = `hsla(${hue}, 90%, 85%, ${segAlpha * 0.5})`;
                    ctx.beginPath();
                    ctx.arc(hitX, hitY, 4, 0, TAU);
                    ctx.fill();

                    // Reflect
                    const normalAngle = hitMirror.angle + Math.PI / 2;
                    const incAngle = angle - normalAngle;
                    angle = normalAngle - incAngle + Math.PI;
                    ox = hitX;
                    oy = hitY;
                    hue = (hue + 30) % 360;
                } else {
                    break;
                }
            }
        }
    }

    _rayMirrorIntersect(ox, oy, angle, mirror) {
        const dx = Math.cos(angle), dy = Math.sin(angle);
        const mx1 = mirror.x + Math.cos(mirror.angle) * mirror.length / 2;
        const my1 = mirror.y + Math.sin(mirror.angle) * mirror.length / 2;
        const mx2 = mirror.x - Math.cos(mirror.angle) * mirror.length / 2;
        const my2 = mirror.y - Math.sin(mirror.angle) * mirror.length / 2;

        const sdx = mx2 - mx1, sdy = my2 - my1;
        const denom = dx * sdy - dy * sdx;
        if (Math.abs(denom) < 0.001) return null;

        const t = ((mx1 - ox) * sdy - (my1 - oy) * sdx) / denom;
        const u = ((mx1 - ox) * dy - (my1 - oy) * dx) / denom;

        if (t > 0 && u >= 0 && u <= 1) {
            return { x: ox + dx * t, y: oy + dy * t, dist: t };
        }
        return null;
    }

    _drawRaveTunnel(ctx, W, H) {
        const cx = W / 2 + (this._mx - W / 2) * 0.1;
        const cy = H / 2 + (this._my - H / 2) * 0.1;
        const maxR = Math.max(W, H) * 0.5;

        for (const ring of this._tunnelRings) {
            const scale = Math.max(0.01, ring.depth);
            const r = maxR * scale;
            const alpha = (1 - Math.abs(ring.depth - 0.5) * 2) * 0.1 * this.intensity;
            if (alpha < 0.005 || r < 2) continue;

            ctx.strokeStyle = `hsla(${ring.hue}, 80%, 65%, ${alpha})`;
            ctx.lineWidth = 1 + (1 - scale) * 2;
            ctx.beginPath();
            for (let s = 0; s <= ring.sides; s++) {
                const a = ring.rotation + (s / ring.sides) * TAU;
                const px = cx + Math.cos(a) * r;
                const py = cy + Math.sin(a) * r * 0.7; // Slight perspective
                if (s === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Connecting lines between adjacent rings (sort in-place to avoid per-frame allocation)
        this._tunnelRings.sort((a, b) => a.depth - b.depth);
        const sorted = this._tunnelRings;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < sorted.length - 1; i++) {
            const r1 = sorted[i], r2 = sorted[i + 1];
            if (Math.abs(r1.depth - r2.depth) > 0.3) continue;
            const s1 = Math.max(0.01, r1.depth);
            const s2 = Math.max(0.01, r2.depth);
            const rad1 = maxR * s1, rad2 = maxR * s2;
            const alpha = Math.min(
                (1 - Math.abs(r1.depth - 0.5) * 2),
                (1 - Math.abs(r2.depth - 0.5) * 2)
            ) * 0.04 * this.intensity;
            if (alpha < 0.003) continue;

            ctx.strokeStyle = `hsla(${r1.hue}, 60%, 60%, ${alpha})`;
            // Connect corners
            const sides = Math.min(r1.sides, r2.sides);
            for (let s = 0; s < sides; s++) {
                const a1 = r1.rotation + (s / r1.sides) * TAU;
                const a2 = r2.rotation + (s / r2.sides) * TAU;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a1) * rad1, cy + Math.sin(a1) * rad1 * 0.7);
                ctx.lineTo(cx + Math.cos(a2) * rad2, cy + Math.sin(a2) * rad2 * 0.7);
                ctx.stroke();
            }
        }
    }

    _drawHologramGrid(ctx, W, H) {
        const cx = W / 2, cy = H / 2;
        const rot = this._gridRotation;
        const tilt = 0.6; // Perspective tilt
        const gridSize = Math.min(W, H) * 0.35;
        const divisions = 8;
        const alpha = 0.06 * this.intensity;

        // Mouse parallax
        const parallaxX = (this._mx - cx) * 0.05;
        const parallaxY = (this._my - cy) * 0.05;

        // Draw grid lines
        for (let i = 0; i <= divisions; i++) {
            const t = (i / divisions) * 2 - 1; // -1 to 1

            // Horizontal lines (rotated in 3D)
            const hue1 = (this.hue + i * 15) % 360;
            ctx.strokeStyle = `hsla(${hue1}, 80%, 65%, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();

            for (let j = 0; j <= divisions; j++) {
                const s = (j / divisions) * 2 - 1;
                // 3D rotation + perspective
                const x3d = s * gridSize;
                const y3d = t * gridSize;
                const z3d = 0;
                // Rotate Y
                const rx = x3d * Math.cos(rot) + z3d * Math.sin(rot);
                const rz = -x3d * Math.sin(rot) + z3d * Math.cos(rot);
                // Perspective
                const perspective = 1 / (1 + rz * 0.001);
                const px = cx + rx * perspective + parallaxX;
                const py = cy + y3d * tilt * perspective + parallaxY;
                if (j === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Vertical lines
            const hue2 = (this.hue + 60 + i * 15) % 360;
            ctx.strokeStyle = `hsla(${hue2}, 80%, 65%, ${alpha})`;
            ctx.beginPath();
            for (let j = 0; j <= divisions; j++) {
                const s = (j / divisions) * 2 - 1;
                const x3d = t * gridSize;
                const y3d = s * gridSize;
                const rx = x3d * Math.cos(rot);
                const rz = -x3d * Math.sin(rot);
                const perspective = 1 / (1 + rz * 0.001);
                const px = cx + rx * perspective + parallaxX;
                const py = cy + y3d * tilt * perspective + parallaxY;
                if (j === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        // Scan line moving through grid
        const scanT = (Math.sin(this.tick * 0.02) + 1) / 2;
        const scanY = cy + (scanT * 2 - 1) * gridSize * tilt + parallaxY;
        ctx.strokeStyle = `hsla(${this.hue}, 90%, 80%, ${alpha * 2})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - gridSize + parallaxX, scanY);
        ctx.lineTo(cx + gridSize + parallaxX, scanY);
        ctx.stroke();
    }
}
