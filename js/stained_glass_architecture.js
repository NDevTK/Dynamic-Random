/**
 * @file stained_glass_architecture.js
 * @description Dynamic stained glass window with colored panes that shift, crack,
 * and reform. Colored light rays pass through panes. Mouse creates cracks that
 * spread into new patterns. Seeds change window style (rose, gothic, abstract,
 * art deco, honeycomb, shattered), color palettes, and light behavior.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class StainedGlassArchitecture extends Architecture {
    constructor() {
        super();
        this.panes = [];
        this.leadLines = [];
        this.lightRays = [];
        this.cracks = [];
        this.style = 0;
        this.tick = 0;
        this.lightAngle = 0;
        this.lightSourceX = 0;
        this.lightSourceY = 0;
    }

    init(system) {
        const rng = system.rng;

        this.style = Math.floor(rng() * 6);
        // 0=rose window, 1=gothic arches, 2=abstract geometric, 3=art deco
        // 4=honeycomb, 5=fractured/irregular

        this.colorPalette = Math.floor(rng() * 6);
        // 0=cathedral (deep reds, blues, golds), 1=ocean (teals, aquas, greens)
        // 2=sunset (ambers, oranges, purples), 3=forest (emeralds, browns, cream)
        // 4=ice (pale blues, whites, silvers), 5=fire (reds, oranges, yellows)

        this.lightIntensity = 0.3 + rng() * 0.5;
        this.lightSpeed = 0.002 + rng() * 0.005;
        this.animateColors = rng() > 0.4;
        this.colorShiftSpeed = 0.001 + rng() * 0.003;
        this.leadWidth = 2 + rng() * 3;
        this.leadColor = rng() > 0.3 ? '#1a1a1a' : '#2a2520';
        this.glowEnabled = rng() > 0.3;
        this.paneCount = 20 + Math.floor(rng() * 40);

        this.generatePanes(system, rng);
        this.lightAngle = rng() * Math.PI * 2;
        this.lightSourceX = system.width * 0.5;
        this.lightSourceY = -100;
    }

    getPaneColor(index, rng) {
        const palettes = [
            // Cathedral
            ['#8b1a1a', '#1a3c8b', '#c4a82e', '#3d1a6b', '#8b4513', '#1a6b3d'],
            // Ocean
            ['#0e6e6e', '#1a8bab', '#2eb88c', '#0a4a6e', '#3dc4c4', '#1a4a3d'],
            // Sunset
            ['#c44d0e', '#8b2ab8', '#e6a52e', '#6b1a4a', '#c48b2e', '#a02e5a'],
            // Forest
            ['#1a6b2e', '#4a3d1a', '#8b6e3d', '#2e8b5a', '#c4b88c', '#3d6b3d'],
            // Ice
            ['#a0c4e6', '#c4dce6', '#6eabb8', '#dce6f0', '#8bbac4', '#4a8ba0'],
            // Fire
            ['#c42e0e', '#e66e1a', '#e6c42e', '#8b2a0e', '#c48b1a', '#a05a0e'],
        ];
        const palette = palettes[this.colorPalette] || palettes[0];
        return palette[index % palette.length];
    }

    generatePanes(system, rng) {
        this.panes = [];
        this.leadLines = [];
        const w = system.width, h = system.height;

        switch (this.style) {
            case 0: this.generateRoseWindow(w, h, rng); break;
            case 1: this.generateGothicArches(w, h, rng); break;
            case 2: this.generateAbstractGeo(w, h, rng); break;
            case 3: this.generateArtDeco(w, h, rng); break;
            case 4: this.generateHoneycomb(w, h, rng); break;
            case 5: this.generateFractured(w, h, rng); break;
        }
    }

    generateRoseWindow(w, h, rng) {
        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.45;
        const rings = 3 + Math.floor(rng() * 3);
        const baseSegments = 6 + Math.floor(rng() * 8);
        let colorIdx = 0;

        for (let ring = 0; ring < rings; ring++) {
            const innerR = (ring / rings) * maxR;
            const outerR = ((ring + 1) / rings) * maxR;
            const segments = baseSegments * (ring + 1);

            for (let s = 0; s < segments; s++) {
                const a1 = (s / segments) * Math.PI * 2;
                const a2 = ((s + 1) / segments) * Math.PI * 2;
                const points = [
                    { x: cx + Math.cos(a1) * innerR, y: cy + Math.sin(a1) * innerR },
                    { x: cx + Math.cos(a1) * outerR, y: cy + Math.sin(a1) * outerR },
                    { x: cx + Math.cos(a2) * outerR, y: cy + Math.sin(a2) * outerR },
                    { x: cx + Math.cos(a2) * innerR, y: cy + Math.sin(a2) * innerR },
                ];
                this.panes.push({
                    points,
                    color: this.getPaneColor(colorIdx++, rng),
                    opacity: 0.4 + rng() * 0.3,
                    hueShift: rng() * 30 - 15,
                    glowPhase: rng() * Math.PI * 2,
                });
            }
        }
    }

    generateGothicArches(w, h, rng) {
        const cols = 4 + Math.floor(rng() * 4);
        const rows = 3 + Math.floor(rng() * 3);
        const cellW = w / cols;
        const cellH = h / rows;
        let colorIdx = 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = c * cellW;
                const y = r * cellH;
                // Gothic arch shape using points
                const archHeight = cellH * 0.3;
                const midX = x + cellW / 2;
                const points = [
                    { x: x + 5, y: y + cellH - 5 },
                    { x: x + 5, y: y + archHeight },
                    { x: midX, y: y + 5 },
                    { x: x + cellW - 5, y: y + archHeight },
                    { x: x + cellW - 5, y: y + cellH - 5 },
                ];
                this.panes.push({
                    points,
                    color: this.getPaneColor(colorIdx++, rng),
                    opacity: 0.35 + rng() * 0.35,
                    hueShift: rng() * 20 - 10,
                    glowPhase: rng() * Math.PI * 2,
                });

                // Sub-divide some panes
                if (rng() > 0.5) {
                    const divY = y + cellH * (0.4 + rng() * 0.3);
                    this.leadLines.push({
                        x1: x + 5, y1: divY, x2: x + cellW - 5, y2: divY
                    });
                }
            }
        }
    }

    generateAbstractGeo(w, h, rng) {
        let colorIdx = 0;
        const count = this.paneCount;
        for (let i = 0; i < count; i++) {
            const cx = rng() * w;
            const cy = rng() * h;
            const sides = 3 + Math.floor(rng() * 5);
            const size = 30 + rng() * 120;
            const rotation = rng() * Math.PI * 2;
            const points = [];
            for (let s = 0; s < sides; s++) {
                const a = rotation + (s / sides) * Math.PI * 2;
                const r = size * (0.7 + rng() * 0.3);
                points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
            }
            this.panes.push({
                points,
                color: this.getPaneColor(colorIdx++, rng),
                opacity: 0.3 + rng() * 0.35,
                hueShift: rng() * 40 - 20,
                glowPhase: rng() * Math.PI * 2,
            });
        }
    }

    generateArtDeco(w, h, rng) {
        let colorIdx = 0;
        // Vertical strips with zigzag intersections
        const strips = 6 + Math.floor(rng() * 6);
        const stripW = w / strips;
        for (let i = 0; i < strips; i++) {
            const x = i * stripW;
            const zigCount = 3 + Math.floor(rng() * 4);
            for (let z = 0; z < zigCount; z++) {
                const y1 = (z / zigCount) * h;
                const y2 = ((z + 1) / zigCount) * h;
                const indent = rng() * stripW * 0.3;
                const points = [
                    { x: x + indent, y: y1 },
                    { x: x + stripW - indent, y: y1 },
                    { x: x + stripW - (rng() * stripW * 0.3), y: y2 },
                    { x: x + (rng() * stripW * 0.3), y: y2 },
                ];
                this.panes.push({
                    points,
                    color: this.getPaneColor(colorIdx++, rng),
                    opacity: 0.35 + rng() * 0.3,
                    hueShift: rng() * 20 - 10,
                    glowPhase: rng() * Math.PI * 2,
                });
            }
        }
    }

    generateHoneycomb(w, h, rng) {
        let colorIdx = 0;
        const hexSize = 35 + Math.floor(rng() * 30);
        const hexH = hexSize * Math.sqrt(3);
        const cols = Math.ceil(w / (hexSize * 1.5)) + 1;
        const rows = Math.ceil(h / hexH) + 1;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cx = c * hexSize * 1.5;
                const cy = r * hexH + (c % 2 === 1 ? hexH * 0.5 : 0);
                const points = [];
                for (let s = 0; s < 6; s++) {
                    const a = (s / 6) * Math.PI * 2 - Math.PI / 6;
                    points.push({
                        x: cx + Math.cos(a) * hexSize * 0.95,
                        y: cy + Math.sin(a) * hexSize * 0.95,
                    });
                }
                this.panes.push({
                    points,
                    color: this.getPaneColor(colorIdx++, rng),
                    opacity: 0.3 + rng() * 0.35,
                    hueShift: rng() * 30 - 15,
                    glowPhase: rng() * Math.PI * 2,
                });
            }
        }
    }

    generateFractured(w, h, rng) {
        let colorIdx = 0;
        // Voronoi-like shattered pattern using random points
        const points = [];
        const count = 15 + Math.floor(rng() * 25);
        for (let i = 0; i < count; i++) {
            points.push({ x: rng() * w, y: rng() * h });
        }
        // Add edge points
        for (let i = 0; i < 6; i++) {
            points.push({ x: rng() * w, y: 0 });
            points.push({ x: rng() * w, y: h });
            points.push({ x: 0, y: rng() * h });
            points.push({ x: w, y: rng() * h });
        }

        // Simple approximation: create triangular shards from center point
        for (let i = 0; i < count; i++) {
            const p = points[i];
            const angles = [];
            for (let j = 0; j < points.length; j++) {
                if (j === i) continue;
                angles.push({
                    angle: Math.atan2(points[j].y - p.y, points[j].x - p.x),
                    dist: Math.sqrt((points[j].x - p.x) ** 2 + (points[j].y - p.y) ** 2),
                    idx: j
                });
            }
            angles.sort((a, b) => a.angle - b.angle);
            // Take nearest few to form shards
            const nearest = angles.filter(a => a.dist < 250).slice(0, 6);
            if (nearest.length < 3) continue;

            for (let k = 0; k < nearest.length - 1; k++) {
                const a = nearest[k];
                const b = nearest[k + 1];
                const midDist = Math.min(a.dist, b.dist) * 0.45;
                this.panes.push({
                    points: [
                        { x: p.x, y: p.y },
                        { x: p.x + Math.cos(a.angle) * midDist, y: p.y + Math.sin(a.angle) * midDist },
                        { x: p.x + Math.cos(b.angle) * midDist, y: p.y + Math.sin(b.angle) * midDist },
                    ],
                    color: this.getPaneColor(colorIdx++, rng),
                    opacity: 0.3 + rng() * 0.4,
                    hueShift: rng() * 40 - 20,
                    glowPhase: rng() * Math.PI * 2,
                });
            }
        }
    }

    update(system) {
        this.tick++;

        // Animate light source position
        this.lightAngle += this.lightSpeed;
        this.lightSourceX = system.width / 2 + Math.cos(this.lightAngle) * system.width * 0.3;
        this.lightSourceY = -50 + Math.sin(this.lightAngle * 0.7) * 100;

        // Mouse influence on light source
        this.lightSourceX += (mouse.x - system.width / 2) * 0.2;
        this.lightSourceY += (mouse.y - system.height * 0.3) * 0.15;

        // Generate light rays periodically
        if (this.tick % 3 === 0 && this.lightRays.length < 30) {
            const angle = Math.atan2(system.height / 2 - this.lightSourceY, system.width / 2 - this.lightSourceX);
            const spread = (Math.random() - 0.5) * 1.2;
            this.lightRays.push({
                x: this.lightSourceX,
                y: this.lightSourceY,
                angle: angle + spread,
                length: 0,
                maxLength: Math.max(system.width, system.height) * 1.2,
                speed: 15 + Math.random() * 10,
                width: 2 + Math.random() * 8,
                life: 1,
                decay: 0.008 + Math.random() * 0.012,
                hue: Math.random() * 60 + system.hue,
            });
        }

        // Update light rays (swap-remove for perf)
        for (let i = this.lightRays.length - 1; i >= 0; i--) {
            const ray = this.lightRays[i];
            ray.length = Math.min(ray.length + ray.speed, ray.maxLength);
            ray.life -= ray.decay;
            if (ray.life <= 0) {
                this.lightRays[i] = this.lightRays[this.lightRays.length - 1];
                this.lightRays.pop();
            }
        }

        // Animate pane colors if enabled
        if (this.animateColors) {
            for (const pane of this.panes) {
                pane.hueShift += this.colorShiftSpeed * 10;
            }
        }

        // Cracks decay (swap-remove for perf)
        for (let i = this.cracks.length - 1; i >= 0; i--) {
            this.cracks[i].life -= 0.005;
            if (this.cracks[i].life <= 0) {
                this.cracks[i] = this.cracks[this.cracks.length - 1];
                this.cracks.pop();
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;

        // Draw panes
        for (const pane of this.panes) {
            const pts = pane.points;
            if (pts.length < 3) continue;

            ctx.save();

            // Pane fill with color
            const glowPulse = this.glowEnabled ?
                Math.sin(this.tick * 0.02 + pane.glowPhase) * 0.1 + 0.05 : 0;

            ctx.fillStyle = pane.color;
            ctx.globalAlpha = pane.opacity + glowPulse;

            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.closePath();
            ctx.fill();

            // Lead border (dark outline between panes)
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = this.leadColor;
            ctx.lineWidth = this.leadWidth;
            ctx.lineJoin = 'round';
            ctx.stroke();

            // Inner glow highlight
            if (this.glowEnabled && glowPulse > 0.05) {
                ctx.globalAlpha = glowPulse * 0.5;
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            }

            ctx.restore();
        }

        // Draw light rays passing through
        if (this.lightRays.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (const ray of this.lightRays) {
                const endX = ray.x + Math.cos(ray.angle) * ray.length;
                const endY = ray.y + Math.sin(ray.angle) * ray.length;

                const grad = ctx.createLinearGradient(ray.x, ray.y, endX, endY);
                grad.addColorStop(0, `hsla(${ray.hue}, 60%, 80%, ${ray.life * this.lightIntensity * 0.3})`);
                grad.addColorStop(0.5, `hsla(${ray.hue + 20}, 50%, 70%, ${ray.life * this.lightIntensity * 0.15})`);
                grad.addColorStop(1, `hsla(${ray.hue + 40}, 40%, 60%, 0)`);

                ctx.strokeStyle = grad;
                ctx.lineWidth = ray.width * ray.life;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(ray.x, ray.y);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Draw cracks
        if (this.cracks.length > 0) {
            ctx.save();
            ctx.strokeStyle = `rgba(255, 255, 255, 0.6)`;
            ctx.lineWidth = 1;
            for (const crack of this.cracks) {
                ctx.globalAlpha = crack.life;
                ctx.beginPath();
                ctx.moveTo(crack.segments[0].x, crack.segments[0].y);
                for (let i = 1; i < crack.segments.length; i++) {
                    ctx.lineTo(crack.segments[i].x, crack.segments[i].y);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // Light source glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const lsGrad = ctx.createRadialGradient(
            this.lightSourceX, this.lightSourceY, 0,
            this.lightSourceX, this.lightSourceY, 150
        );
        lsGrad.addColorStop(0, `rgba(255, 240, 200, ${this.lightIntensity * 0.2})`);
        lsGrad.addColorStop(1, 'rgba(255, 240, 200, 0)');
        ctx.fillStyle = lsGrad;
        ctx.beginPath();
        ctx.arc(this.lightSourceX, this.lightSourceY, 150, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
