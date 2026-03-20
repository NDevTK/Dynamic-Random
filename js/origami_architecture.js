/**
 * @file origami_architecture.js
 * @description Paper-Folding Geometric Shapes background architecture.
 * Flat polygons fold along crease lines in pseudo-3D, with multiple paper styles,
 * light/shadow rendering, and interactive fold/unfold behavior driven by mouse,
 * gravity wells, shockwaves, and device tilt.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';
import { createNoise2D } from './simplex_noise.js';

const TAU = Math.PI * 2;

export class OrigamiArchitecture extends Architecture {
    constructor() {
        super();
        this.pieces = [];
        this.noise2D = null;
        this.lightAngle = 0;
        this.lightElevation = 0.6;
        this.time = 0;
        this.paperStyleIndex = 0;
        this.baseFoldComplexity = 0;
        this.driftSpeed = 0;
        this.textureLines = [];
    }

    init(system) {
        const rng = system.rng;
        this.noise2D = createNoise2D(rng);
        this.time = 0;

        // Seed-driven global parameters
        this.paperStyleIndex = Math.floor(rng() * 4);
        this.baseFoldComplexity = 3 + Math.floor(rng() * 4); // 3-6 folds per piece
        this.driftSpeed = 0.15 + rng() * 0.35;
        this.lightAngle = rng() * TAU;
        this.lightElevation = 0.4 + rng() * 0.4;

        // Generate newspaper texture lines for style 1
        this.textureLines = [];
        for (let i = 0; i < 20; i++) {
            this.textureLines.push({
                y: rng() * 1.0,
                width: 0.3 + rng() * 0.5,
                alpha: 0.03 + rng() * 0.06
            });
        }

        // Generate origami pieces
        const pieceCount = 8 + Math.floor(rng() * 8); // 8-15
        this.pieces = [];
        for (let i = 0; i < pieceCount; i++) {
            this.pieces.push(this._createPiece(system, rng));
        }

        // Sort by depth for painter's algorithm
        this.pieces.sort((a, b) => a.depth - b.depth);
    }

    _createPiece(system, rng) {
        const sides = 3 + Math.floor(rng() * 6); // 3-8 sides
        const size = 40 + rng() * 80;
        const x = rng() * system.width;
        const y = rng() * system.height;
        const depth = 0.3 + rng() * 0.7;
        const scaledSize = size * (0.5 + depth * 0.5);

        // Generate regular polygon vertices
        const angleOffset = rng() * TAU;
        const vertices = [];
        for (let i = 0; i < sides; i++) {
            const angle = angleOffset + (i / sides) * TAU;
            vertices.push({
                baseX: Math.cos(angle) * scaledSize,
                baseY: Math.sin(angle) * scaledSize,
                foldedX: 0,
                foldedY: 0
            });
        }

        // Center vertex for triangular fan faces
        vertices.push({ baseX: 0, baseY: 0, foldedX: 0, foldedY: 0 });

        // Generate fold angles for each triangular face
        const foldCount = sides; // one fold per triangular face
        const foldAngles = [];
        const targetFolds = [];
        const restFolds = [];
        for (let i = 0; i < foldCount; i++) {
            const restAngle = (rng() * 0.6 - 0.3) + rng() * 0.4;
            restFolds.push(restAngle);
            foldAngles.push(0);
            targetFolds.push(restAngle);
        }

        // Per-piece paper style (mostly follows global, with variation)
        let pieceStyle = this.paperStyleIndex;
        if (rng() < 0.25) {
            pieceStyle = Math.floor(rng() * 4);
        }

        // Piece-specific hue for metallic/tissue styles
        const pieceHue = (system.hue + rng() * 120 - 60 + 360) % 360;

        return {
            x,
            y,
            vx: (rng() - 0.5) * this.driftSpeed,
            vy: (rng() - 0.5) * this.driftSpeed,
            rotation: rng() * TAU,
            rotationSpeed: (rng() - 0.5) * 0.004,
            sides,
            vertices,
            foldAngles,
            targetFolds,
            restFolds,
            depth,
            paperStyle: pieceStyle,
            hue: pieceHue,
            foldSpeed: 0.02 + rng() * 0.04,
            size: scaledSize,
            shockTimer: 0,
            crumpleAmount: 0,
            crumpleTarget: 0
        };
    }

    _computeFoldedVertices(piece) {
        const { vertices, foldAngles, sides } = piece;
        const center = vertices[sides]; // center vertex

        // Center never moves from fold
        center.foldedX = center.baseX;
        center.foldedY = center.baseY;

        for (let i = 0; i < sides; i++) {
            const v = vertices[i];
            const fold = foldAngles[i];

            // Fold displaces the vertex perpendicular to the line from center to vertex
            // simulating a perspective foreshortening effect
            const dx = v.baseX - center.baseX;
            const dy = v.baseY - center.baseY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = -dy / dist;
            const ny = dx / dist;

            // Fold compresses along the radial direction and shifts perpendicular
            const foldFactor = Math.cos(fold);
            const liftFactor = Math.sin(fold) * 0.3;

            v.foldedX = center.baseX + dx * foldFactor + nx * liftFactor * dist;
            v.foldedY = center.baseY + dy * foldFactor + ny * liftFactor * dist * 0.5;
        }
    }

    update(system) {
        this.time += 0.016 * system.speedMultiplier;

        // Update light direction from device tilt
        if (system.deviceTilt) {
            const tiltX = system.deviceTilt.x || 0;
            const tiltY = system.deviceTilt.y || 0;
            const tiltMag = Math.sqrt(tiltX * tiltX + tiltY * tiltY);
            if (tiltMag > 0.01) {
                const tiltAngle = Math.atan2(tiltY, tiltX);
                this.lightAngle += (tiltAngle - this.lightAngle) * 0.05;
            }
        }

        // Slow ambient light rotation
        this.lightAngle += 0.001 * system.speedMultiplier;

        const mouseX = mouse.x;
        const mouseY = mouse.y;
        const shake = system.deviceShake || 0;

        for (let p = 0; p < this.pieces.length; p++) {
            const piece = this.pieces[p];

            // --- Mouse interaction: unfold/refold based on proximity ---
            const dxMouse = piece.x - mouseX;
            const dyMouse = piece.y - mouseY;
            const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
            const mouseRadius = 200;

            if (distMouse < mouseRadius) {
                const influence = 1 - distMouse / mouseRadius;
                for (let i = 0; i < piece.sides; i++) {
                    // Unfold toward flat as mouse approaches
                    piece.targetFolds[i] = piece.restFolds[i] * (1 - influence * 0.8);
                }
            } else {
                // Return to rest folds
                for (let i = 0; i < piece.sides; i++) {
                    piece.targetFolds[i] = piece.restFolds[i];
                }
            }

            // --- Gravity well: crumple toward center ---
            if (system.isGravityWell) {
                const gx = system.width * 0.5;
                const gy = system.height * 0.5;
                const dgx = gx - piece.x;
                const dgy = gy - piece.y;
                const distG = Math.sqrt(dgx * dgx + dgy * dgy) || 1;

                // Pull toward center
                const pullStrength = 0.5 * system.speedMultiplier;
                piece.vx += (dgx / distG) * pullStrength;
                piece.vy += (dgy / distG) * pullStrength;

                // Crumple: increase fold angles rapidly
                piece.crumpleTarget = Math.min(2.0, piece.crumpleTarget + 0.03 * system.speedMultiplier);
            } else {
                piece.crumpleTarget = 0;
            }

            // Interpolate crumple
            piece.crumpleAmount += (piece.crumpleTarget - piece.crumpleAmount) * 0.05;

            // Apply crumple to target folds
            if (piece.crumpleAmount > 0.01) {
                for (let i = 0; i < piece.sides; i++) {
                    piece.targetFolds[i] += piece.crumpleAmount * (((i % 2) === 0) ? 1 : -1);
                }
            }

            // --- Shockwave interaction ---
            if (system.shockwaves) {
                for (let s = 0; s < system.shockwaves.length; s++) {
                    const sw = system.shockwaves[s];
                    const dxS = piece.x - sw.x;
                    const dyS = piece.y - sw.y;
                    const distS = Math.sqrt(dxS * dxS + dyS * dyS);
                    const ringWidth = 80;
                    const ringDist = Math.abs(distS - sw.radius);

                    if (ringDist < ringWidth) {
                        const intensity = (1 - ringDist / ringWidth) * (sw.strength || 1);
                        // Sudden unfold
                        piece.shockTimer = Math.max(piece.shockTimer, intensity * 30);
                        // Push away
                        if (distS > 1) {
                            piece.vx += (dxS / distS) * intensity * 2;
                            piece.vy += (dyS / distS) * intensity * 2;
                        }
                        piece.rotationSpeed += intensity * 0.02 * (((p % 2) === 0) ? 1 : -1);
                    }
                }
            }

            // Shock timer: force unfold then refold
            if (piece.shockTimer > 0) {
                piece.shockTimer -= system.speedMultiplier;
                for (let i = 0; i < piece.sides; i++) {
                    piece.targetFolds[i] *= 0.5;
                }
            }

            // --- Device shake: jitter folds ---
            if (shake > 0.1) {
                for (let i = 0; i < piece.sides; i++) {
                    piece.targetFolds[i] += (this.noise2D(i * 3.7, this.time * 5) * shake * 0.3);
                }
            }

            // --- Interpolate fold angles toward targets ---
            const speed = piece.foldSpeed * system.speedMultiplier;
            for (let i = 0; i < piece.sides; i++) {
                piece.foldAngles[i] += (piece.targetFolds[i] - piece.foldAngles[i]) * speed;
            }

            // --- Gentle ambient fold animation ---
            for (let i = 0; i < piece.sides; i++) {
                const breathe = this.noise2D(
                    piece.x * 0.003 + i * 0.5,
                    this.time * 0.5 + piece.y * 0.003
                ) * 0.08;
                piece.foldAngles[i] += breathe * system.speedMultiplier;
            }

            // --- Drift movement ---
            piece.x += piece.vx * system.speedMultiplier;
            piece.y += piece.vy * system.speedMultiplier;
            piece.rotation += piece.rotationSpeed * system.speedMultiplier;

            // Friction
            piece.vx *= 0.995;
            piece.vy *= 0.995;
            piece.rotationSpeed *= 0.998;

            // Wrap around edges with margin
            const margin = piece.size * 1.5;
            if (piece.x < -margin) piece.x += system.width + margin * 2;
            if (piece.x > system.width + margin) piece.x -= system.width + margin * 2;
            if (piece.y < -margin) piece.y += system.height + margin * 2;
            if (piece.y > system.height + margin) piece.y -= system.height + margin * 2;

            // Compute folded vertex positions
            this._computeFoldedVertices(piece);
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const lightDirX = Math.cos(this.lightAngle);
        const lightDirY = Math.sin(this.lightAngle);

        for (let p = 0; p < this.pieces.length; p++) {
            const piece = this.pieces[p];
            const depthAlpha = 0.3 + piece.depth * 0.5;

            ctx.save();
            ctx.translate(piece.x, piece.y);
            ctx.rotate(piece.rotation);

            // Draw each triangular face
            this._drawFaces(ctx, piece, lightDirX, lightDirY, depthAlpha, system);

            // Draw crease lines
            this._drawCreases(ctx, piece, depthAlpha);

            ctx.restore();
        }
    }

    _drawFaces(ctx, piece, lightDirX, lightDirY, depthAlpha, system) {
        const { vertices, foldAngles, sides, paperStyle, hue } = piece;
        const center = vertices[sides];

        for (let i = 0; i < sides; i++) {
            const v0 = vertices[i];
            const v1 = vertices[(i + 1) % sides];

            // Compute face normal for lighting (approximated from fold angle)
            const faceAngle = foldAngles[i];
            const midX = (v0.foldedX + v1.foldedX + center.foldedX) / 3;
            const midY = (v0.foldedY + v1.foldedY + center.foldedY) / 3;

            // Face normal direction (perpendicular to fold, approximated)
            const edgeDx = v1.foldedX - v0.foldedX;
            const edgeDy = v1.foldedY - v0.foldedY;
            const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy) || 1;
            const faceNx = -edgeDy / edgeLen;
            const faceNy = edgeDx / edgeLen;

            // Light dot product
            const lightDot = faceNx * lightDirX + faceNy * lightDirY;
            // Fold angle contribution to lighting
            const foldLightBias = Math.cos(faceAngle) * 0.3;
            const brightness = 0.4 + (lightDot * 0.5 + 0.5) * 0.4 + foldLightBias;
            const clampedBrightness = Math.max(0.15, Math.min(1.0, brightness));

            // Draw the triangular face
            ctx.beginPath();
            ctx.moveTo(center.foldedX, center.foldedY);
            ctx.lineTo(v0.foldedX, v0.foldedY);
            ctx.lineTo(v1.foldedX, v1.foldedY);
            ctx.closePath();

            // Fill based on paper style
            this._applyPaperStyle(ctx, piece, clampedBrightness, depthAlpha, i, system);
            ctx.fill();

            // Shadow on fold valleys
            if (Math.abs(faceAngle) > 0.15) {
                const shadowAlpha = Math.min(0.35, Math.abs(faceAngle) * 0.3) * depthAlpha;
                if (faceAngle > 0) {
                    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
                } else {
                    ctx.fillStyle = `rgba(255, 255, 255, ${shadowAlpha * 0.4})`;
                }
                ctx.fill();
            }
        }
    }

    _applyPaperStyle(ctx, piece, brightness, depthAlpha, faceIndex, system) {
        const style = piece.paperStyle;
        const alpha = depthAlpha * 0.85;

        switch (style) {
            case 0: {
                // White origami paper
                const val = Math.floor(brightness * 245 + 10);
                ctx.fillStyle = `rgba(${val}, ${val}, ${Math.floor(val * 0.98)}, ${alpha})`;
                break;
            }
            case 1: {
                // Newspaper print: warm off-white with subtle variation
                const warmR = Math.floor(brightness * 220 + 30);
                const warmG = Math.floor(brightness * 210 + 25);
                const warmB = Math.floor(brightness * 185 + 20);
                ctx.fillStyle = `rgba(${warmR}, ${warmG}, ${warmB}, ${alpha})`;
                break;
            }
            case 2: {
                // Metallic foil: shiny colored surface
                const h = piece.hue;
                const s = 60 + brightness * 30;
                const l = Math.floor(brightness * 60 + 20);
                ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
                break;
            }
            case 3: {
                // Tissue paper: semi-transparent, soft colors
                const h = piece.hue;
                const s = 40 + brightness * 20;
                const l = Math.floor(brightness * 50 + 40);
                const tissueAlpha = alpha * 0.55;
                ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, ${tissueAlpha})`;
                break;
            }
        }
    }

    _drawCreases(ctx, piece, depthAlpha) {
        const { vertices, foldAngles, sides } = piece;
        const center = vertices[sides];

        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;

        // Batch crease lines into a single path for shadow
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const v = vertices[i];
            ctx.moveTo(center.foldedX, center.foldedY);
            ctx.lineTo(v.foldedX, v.foldedY);
        }

        // Draw shadow layer first
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.15 * depthAlpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw crease lines on top
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const v = vertices[i];
            ctx.moveTo(center.foldedX, center.foldedY);
            ctx.lineTo(v.foldedX, v.foldedY);
        }
        ctx.strokeStyle = `rgba(80, 80, 80, ${0.25 * depthAlpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.restore();

        // Draw polygon outline
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const v = vertices[i];
            if (i === 0) {
                ctx.moveTo(v.foldedX, v.foldedY);
            } else {
                ctx.lineTo(v.foldedX, v.foldedY);
            }
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(100, 100, 100, ${0.2 * depthAlpha})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // Newspaper: faint horizontal text lines on each face
        if (piece.paperStyle === 1) {
            this._drawNewspaperTexture(ctx, piece, depthAlpha);
        }

        // Metallic foil: specular highlight
        if (piece.paperStyle === 2) {
            this._drawMetallicHighlight(ctx, piece, depthAlpha);
        }
    }

    _drawNewspaperTexture(ctx, piece, depthAlpha) {
        const { vertices, sides, size } = piece;

        ctx.save();
        // Clip to polygon shape
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const v = vertices[i];
            if (i === 0) ctx.moveTo(v.foldedX, v.foldedY);
            else ctx.lineTo(v.foldedX, v.foldedY);
        }
        ctx.closePath();
        ctx.clip();

        ctx.strokeStyle = `rgba(60, 50, 40, ${0.08 * depthAlpha})`;
        ctx.lineWidth = 0.5;
        ctx.setLineDash([]);

        const lineCount = Math.min(this.textureLines.length, 12);
        for (let t = 0; t < lineCount; t++) {
            const tl = this.textureLines[t];
            const y = (tl.y - 0.5) * size * 1.6;
            ctx.globalAlpha = tl.alpha * depthAlpha;
            ctx.beginPath();
            ctx.moveTo(-size * tl.width, y);
            ctx.lineTo(size * tl.width, y);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    _drawMetallicHighlight(ctx, piece, depthAlpha) {
        const { vertices, sides, size } = piece;
        const center = vertices[sides];

        // Create a radial gradient for specular highlight
        const highlightX = center.foldedX + Math.cos(this.lightAngle) * size * 0.3;
        const highlightY = center.foldedY + Math.sin(this.lightAngle) * size * 0.3;
        const grad = ctx.createRadialGradient(
            highlightX, highlightY, 0,
            highlightX, highlightY, size * 0.6
        );
        grad.addColorStop(0, `rgba(255, 255, 255, ${0.25 * depthAlpha})`);
        grad.addColorStop(0.5, `rgba(255, 255, 255, ${0.06 * depthAlpha})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.save();
        // Clip to polygon shape
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const v = vertices[i];
            if (i === 0) ctx.moveTo(v.foldedX, v.foldedY);
            else ctx.lineTo(v.foldedX, v.foldedY);
        }
        ctx.closePath();
        ctx.clip();

        ctx.fillStyle = grad;
        ctx.fillRect(-size * 1.2, -size * 1.2, size * 2.4, size * 2.4);
        ctx.restore();
    }
}
