/**
 * @file dimensional_portal_effects.js
 * @description Clicking creates swirling portals that show procedural "other dimensions"
 * inside them. Each portal renders a unique mini-scene: spiraling galaxies, geometric
 * voids, underwater depths, neon cities, or crystalline lattices. Mouse proximity makes
 * portals breathe and distort. Portals can link to each other with energy bridges.
 *
 * Modes (what's inside the portals):
 * 0 - Spiral Galaxy: rotating arms of stars and dust
 * 1 - Geometric Void: recursive shrinking polygons into infinite depth
 * 2 - Underwater Abyss: floating jellyfish-like bioluminescent forms
 * 3 - Neon Gridscape: wireframe perspective grid with glowing horizon
 * 4 - Crystal Lattice: rotating 3D crystal structure projected flat
 * 5 - Ink Cosmos: swirling ink-in-water diffusion patterns
 */

export class DimensionalPortal {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 260;
        this.saturation = 70;

        this.portals = [];
        this.portalPool = [];
        this.maxPortals = 6;
        this.bridges = [];

        this._mx = 0;
        this._my = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Mode params
        this.portalRadius = 60;
        this.breatheSpeed = 0.03;
        this.rotationSpeed = 0.01;
        this.innerComplexity = 5;
        this.glowIntensity = 0.6;
    }

    configure(rng, hues) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = hues.length > 0 ? hues[Math.floor(rng() * hues.length)].h : Math.floor(rng() * 360);
        this.saturation = 50 + Math.floor(rng() * 40);
        this.portals = [];
        this.bridges = [];

        this.portalRadius = 40 + rng() * 50;
        this.breatheSpeed = 0.02 + rng() * 0.03;
        this.rotationSpeed = 0.005 + rng() * 0.02;
        this.innerComplexity = 3 + Math.floor(rng() * 6);
        this.glowIntensity = 0.4 + rng() * 0.5;
    }

    _createPortal(x, y) {
        const portal = this.portalPool.length > 0 ? this.portalPool.pop() : {};
        portal.x = x;
        portal.y = y;
        portal.radius = this.portalRadius;
        portal.age = 0;
        portal.maxAge = 600 + Math.random() * 400;
        portal.phase = Math.random() * Math.PI * 2;
        portal.rotSpeed = this.rotationSpeed * (0.7 + Math.random() * 0.6);
        portal.hueShift = Math.random() * 60 - 30;
        portal.innerSeed = Math.random(); // unique inner scene variation
        return portal;
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._mx = mx;
        this._my = my;

        // Create portal on click
        if (isClicking && !this._wasClicking) {
            if (this.portals.length < this.maxPortals) {
                this.portals.push(this._createPortal(mx, my));
            } else {
                // Replace oldest portal
                const oldest = this.portals[0];
                this.portalPool.push(oldest);
                this.portals[0] = this.portals[this.portals.length - 1];
                this.portals.pop();
                this.portals.push(this._createPortal(mx, my));
            }
            this._rebuildBridges();
        }
        this._wasClicking = isClicking;

        // Update portals
        for (let i = this.portals.length - 1; i >= 0; i--) {
            const p = this.portals[i];
            p.age++;
            if (p.age > p.maxAge) {
                this.portalPool.push(p);
                this.portals[i] = this.portals[this.portals.length - 1];
                this.portals.pop();
                this._rebuildBridges();
            }
        }
    }

    _rebuildBridges() {
        this.bridges = [];
        for (let i = 0; i < this.portals.length; i++) {
            for (let j = i + 1; j < this.portals.length; j++) {
                const dx = this.portals[i].x - this.portals[j].x;
                const dy = this.portals[i].y - this.portals[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 500) {
                    this.bridges.push({ a: i, b: j, dist });
                }
            }
        }
    }

    _drawInnerScene(ctx, portal, radius) {
        const t = this.tick;
        const rot = t * portal.rotSpeed + portal.phase;
        const hue = (this.hue + portal.hueShift + 360) % 360;
        const sat = this.saturation;

        ctx.save();
        ctx.beginPath();
        ctx.arc(portal.x, portal.y, radius, 0, Math.PI * 2);
        ctx.clip();

        // Dark interior
        ctx.fillStyle = `hsla(${hue}, ${sat}%, 3%, 0.8)`;
        ctx.fill();

        switch (this.mode) {
            case 0: // Spiral Galaxy
                this._drawSpiralGalaxy(ctx, portal, radius, rot, hue, sat);
                break;
            case 1: // Geometric Void
                this._drawGeometricVoid(ctx, portal, radius, rot, hue, sat);
                break;
            case 2: // Underwater Abyss
                this._drawUnderwaterAbyss(ctx, portal, radius, rot, hue, sat);
                break;
            case 3: // Neon Gridscape
                this._drawNeonGridscape(ctx, portal, radius, rot, hue, sat);
                break;
            case 4: // Crystal Lattice
                this._drawCrystalLattice(ctx, portal, radius, rot, hue, sat);
                break;
            case 5: // Ink Cosmos
                this._drawInkCosmos(ctx, portal, radius, rot, hue, sat);
                break;
        }

        ctx.restore();
    }

    _drawSpiralGalaxy(ctx, portal, r, rot, hue, sat) {
        const cx = portal.x;
        const cy = portal.y;
        const arms = 2 + Math.floor(portal.innerSeed * 4);

        for (let arm = 0; arm < arms; arm++) {
            const armAngle = (arm / arms) * Math.PI * 2;
            ctx.beginPath();
            for (let i = 0; i < 60; i++) {
                const t = i / 60;
                const spiral = armAngle + t * 3 + rot;
                const dist = t * r * 0.9;
                const x = cx + Math.cos(spiral) * dist;
                const y = cy + Math.sin(spiral) * dist;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            const alpha = 0.15 + portal.innerSeed * 0.15;
            ctx.strokeStyle = `hsla(${(hue + arm * 30) % 360}, ${sat}%, 70%, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Center glow
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.3);
        grd.addColorStop(0, `hsla(${hue}, ${sat}%, 80%, 0.3)`);
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    _drawGeometricVoid(ctx, portal, r, rot, hue, sat) {
        const cx = portal.x;
        const cy = portal.y;
        const sides = 3 + Math.floor(portal.innerSeed * 5);
        const depth = this.innerComplexity;

        for (let d = 0; d < depth; d++) {
            const scale = 1 - (d / depth) * 0.85;
            const dr = r * scale;
            const drot = rot * (1 + d * 0.3) + d * 0.5;
            const alpha = (0.3 - d * 0.03);
            if (alpha <= 0) continue;

            ctx.beginPath();
            for (let i = 0; i <= sides; i++) {
                const angle = (i / sides) * Math.PI * 2 + drot;
                const x = cx + Math.cos(angle) * dr;
                const y = cy + Math.sin(angle) * dr;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = `hsla(${(hue + d * 20) % 360}, ${sat}%, 65%, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    _drawUnderwaterAbyss(ctx, portal, r, rot, hue, sat) {
        const cx = portal.x;
        const cy = portal.y;
        const t = this.tick * 0.02;
        const jellyCount = 3 + Math.floor(portal.innerSeed * 4);

        for (let j = 0; j < jellyCount; j++) {
            const jPhase = j * 2.1 + portal.innerSeed * 10;
            const jx = cx + Math.sin(t + jPhase) * r * 0.5;
            const jy = cy + Math.cos(t * 0.7 + jPhase) * r * 0.4;
            const jSize = r * (0.08 + portal.innerSeed * 0.08);

            // Bell
            ctx.beginPath();
            ctx.arc(jx, jy, jSize, Math.PI, 0);
            const bellAlpha = 0.15 + Math.sin(t * 2 + jPhase) * 0.05;
            ctx.fillStyle = `hsla(${(hue + j * 40) % 360}, ${sat}%, 65%, ${bellAlpha})`;
            ctx.fill();

            // Tentacles
            ctx.beginPath();
            for (let ten = 0; ten < 5; ten++) {
                const tx = jx - jSize + (ten / 4) * jSize * 2;
                const ty1 = jy;
                const ty2 = jy + jSize * (1.5 + Math.sin(t * 3 + ten + jPhase) * 0.5);
                ctx.moveTo(tx, ty1);
                ctx.quadraticCurveTo(
                    tx + Math.sin(t * 2 + ten) * 5, (ty1 + ty2) / 2,
                    tx + Math.sin(t + ten) * 3, ty2
                );
            }
            ctx.strokeStyle = `hsla(${(hue + j * 40) % 360}, ${sat}%, 60%, ${bellAlpha * 0.6})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }
    }

    _drawNeonGridscape(ctx, portal, r, rot, hue, sat) {
        const cx = portal.x;
        const cy = portal.y;
        const t = this.tick * 0.01;
        const gridLines = 8;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();

        // Horizontal receding lines
        for (let i = 0; i < gridLines; i++) {
            const y = cy + (i / gridLines) * r * 0.8 - r * 0.1;
            const perspScale = 0.3 + (i / gridLines) * 0.7;
            const lineWidth = r * perspScale;
            const alpha = 0.1 + (i / gridLines) * 0.15;

            ctx.strokeStyle = `hsla(${hue}, ${sat}%, 60%, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(cx - lineWidth, y);
            ctx.lineTo(cx + lineWidth, y);
            ctx.stroke();
        }

        // Vertical converging lines
        for (let i = 0; i < gridLines; i++) {
            const xOff = ((i / (gridLines - 1)) - 0.5) * r * 2;
            const alpha = 0.08 + Math.abs(i - gridLines / 2) / gridLines * 0.1;

            ctx.strokeStyle = `hsla(${(hue + 30) % 360}, ${sat}%, 55%, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(cx + xOff, cy + r * 0.7);
            ctx.lineTo(cx, cy - r * 0.3);
            ctx.stroke();
        }

        // Horizon glow
        const horizGrad = ctx.createLinearGradient(cx, cy - r * 0.1, cx, cy + r * 0.1);
        horizGrad.addColorStop(0, 'transparent');
        horizGrad.addColorStop(0.5, `hsla(${(hue + 180) % 360}, ${sat}%, 60%, 0.15)`);
        horizGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = horizGrad;
        ctx.fillRect(cx - r, cy - r * 0.1, r * 2, r * 0.2);

        // Sun
        const sunY = cy - r * 0.15 + Math.sin(t) * 5;
        const sunGrad = ctx.createRadialGradient(cx, sunY, 0, cx, sunY, r * 0.2);
        sunGrad.addColorStop(0, `hsla(${(hue + 60) % 360}, 90%, 70%, 0.3)`);
        sunGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = sunGrad;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

        ctx.restore();
    }

    _drawCrystalLattice(ctx, portal, r, rot, hue, sat) {
        const cx = portal.x;
        const cy = portal.y;
        const nodes = [];
        const gridSize = 3;

        // Generate 3D grid projected to 2D
        for (let ix = -gridSize; ix <= gridSize; ix++) {
            for (let iy = -gridSize; iy <= gridSize; iy++) {
                const spacing = r / (gridSize + 1);
                // Simple rotation
                const rx = ix * spacing * Math.cos(rot) - iy * spacing * Math.sin(rot * 0.7);
                const ry = ix * spacing * Math.sin(rot) + iy * spacing * Math.cos(rot * 0.7);
                const dist = Math.sqrt(rx * rx + ry * ry);
                if (dist < r * 0.85) {
                    nodes.push({ x: cx + rx, y: cy + ry, dist });
                }
            }
        }

        // Draw connections
        ctx.lineWidth = 0.5;
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < r / gridSize * 1.5) {
                    const alpha = 0.1 * (1 - d / (r / gridSize * 1.5));
                    ctx.strokeStyle = `hsla(${hue}, ${sat}%, 65%, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.stroke();
                }
            }
        }

        // Draw nodes
        for (const node of nodes) {
            const alpha = 0.2 * (1 - node.dist / r);
            ctx.fillStyle = `hsla(${(hue + 20) % 360}, ${sat}%, 75%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawInkCosmos(ctx, portal, r, rot, hue, sat) {
        const cx = portal.x;
        const cy = portal.y;
        const t = this.tick * 0.008;
        const blobCount = this.innerComplexity;

        for (let b = 0; b < blobCount; b++) {
            const bPhase = b * 1.7 + portal.innerSeed * 5;
            const bx = cx + Math.sin(t + bPhase) * r * 0.4;
            const by = cy + Math.cos(t * 1.3 + bPhase) * r * 0.3;
            const bRad = r * (0.15 + Math.sin(t * 0.5 + bPhase) * 0.08);

            const grad = ctx.createRadialGradient(bx, by, 0, bx, by, bRad);
            const bHue = (hue + b * 25) % 360;
            grad.addColorStop(0, `hsla(${bHue}, ${sat}%, 50%, 0.15)`);
            grad.addColorStop(0.6, `hsla(${bHue}, ${sat}%, 30%, 0.06)`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(bx, by, bRad, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    draw(ctx, system) {
        if (this.portals.length === 0) return;

        ctx.save();

        const mx = this._mx;
        const my = this._my;

        // Draw bridges between portals
        if (this.bridges.length > 0) {
            ctx.globalCompositeOperation = 'lighter';
            for (const bridge of this.bridges) {
                if (bridge.a >= this.portals.length || bridge.b >= this.portals.length) continue;
                const pa = this.portals[bridge.a];
                const pb = this.portals[bridge.b];
                const alpha = 0.08 * (1 - bridge.dist / 500);
                if (alpha <= 0) continue;

                // Animated energy bridge
                const t = this.tick * 0.05;
                const midX = (pa.x + pb.x) / 2 + Math.sin(t) * 15;
                const midY = (pa.y + pb.y) / 2 + Math.cos(t * 1.3) * 15;

                ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 65%, ${alpha})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(pa.x, pa.y);
                ctx.quadraticCurveTo(midX, midY, pb.x, pb.y);
                ctx.stroke();
            }
        }

        // Draw portals
        for (const portal of this.portals) {
            const dx = mx - portal.x;
            const dy = my - portal.y;
            const distToCursor = Math.sqrt(dx * dx + dy * dy);
            const proximity = Math.max(0, 1 - distToCursor / 300);

            // Breathing radius
            const breathe = Math.sin(this.tick * this.breatheSpeed + portal.phase) * 5;
            const r = portal.radius + breathe + proximity * 15;

            // Age fade (in/out)
            const ageFade = portal.age < 30
                ? portal.age / 30
                : portal.age > portal.maxAge - 60
                    ? (portal.maxAge - portal.age) / 60
                    : 1;

            if (ageFade <= 0) continue;

            // Outer glow ring
            ctx.globalCompositeOperation = 'lighter';
            const ringGrad = ctx.createRadialGradient(portal.x, portal.y, r * 0.8, portal.x, portal.y, r * 1.3);
            const portalHue = (this.hue + portal.hueShift + 360) % 360;
            ringGrad.addColorStop(0, `hsla(${portalHue}, ${this.saturation}%, 55%, ${0.15 * ageFade * this.glowIntensity})`);
            ringGrad.addColorStop(0.5, `hsla(${portalHue}, ${this.saturation}%, 45%, ${0.08 * ageFade})`);
            ringGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = ringGrad;
            ctx.beginPath();
            ctx.arc(portal.x, portal.y, r * 1.3, 0, Math.PI * 2);
            ctx.fill();

            // Portal rim
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = `hsla(${portalHue}, ${this.saturation}%, 65%, ${0.25 * ageFade})`;
            ctx.lineWidth = 1.5 + proximity;
            ctx.beginPath();
            ctx.arc(portal.x, portal.y, r, 0, Math.PI * 2);
            ctx.stroke();

            // Inner scene
            this._drawInnerScene(ctx, portal, r * 0.95);

            // Swirling rim particles
            ctx.globalCompositeOperation = 'lighter';
            const rimCount = 8 + Math.floor(proximity * 8);
            for (let i = 0; i < rimCount; i++) {
                const angle = (i / rimCount) * Math.PI * 2 + this.tick * portal.rotSpeed;
                const wobble = Math.sin(this.tick * 0.05 + i * 0.8) * 3;
                const px = portal.x + Math.cos(angle) * (r + wobble);
                const py = portal.y + Math.sin(angle) * (r + wobble);
                const pAlpha = 0.2 * ageFade * (0.5 + Math.sin(this.tick * 0.1 + i) * 0.5);
                ctx.fillStyle = `hsla(${(portalHue + i * 10) % 360}, ${this.saturation}%, 70%, ${pAlpha})`;
                ctx.beginPath();
                ctx.arc(px, py, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
