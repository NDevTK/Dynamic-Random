/**
 * @file paper_theater_architecture.js
 * @description Layered parallax paper theater / shadow puppet scene with silhouette
 * cutouts, drifting paper scraps, and depth-of-field lighting. Each seed generates
 * a completely different scene: enchanted forest, mountain sunset, space station,
 * haunted mansion, underwater reef, or abstract geometric landscape. Mouse moves
 * the "camera" for parallax depth. Click launches paper confetti bursts. Light
 * source follows the mouse creating dramatic shadow play.
 */

import { Architecture } from './background_architectures.js';
import { mouse, isLeftMouseDown } from './state.js';

export class PaperTheaterArchitecture extends Architecture {
    constructor() {
        super();
        this.layers = [];
        this.confetti = [];
        this.floatingPapers = [];
        this.lightSources = [];
        this.sceneType = 0;
        this.palette = null;
        this.tick = 0;
        this.parallaxStrength = 0;
        this.windAngle = 0;
        this.windStrength = 0;
        this.spotlightRadius = 0;
    }

    init(system) {
        const rng = system.rng;
        const w = system.width, h = system.height;

        this.sceneType = Math.floor(rng() * 6);
        // 0=enchanted forest, 1=mountain sunset, 2=space station,
        // 3=haunted mansion, 4=underwater reef, 5=abstract geometric

        this.parallaxStrength = 20 + rng() * 40;
        this.windAngle = (rng() - 0.5) * 0.3;
        this.windStrength = 0.2 + rng() * 0.5;
        this.spotlightRadius = 200 + rng() * 200;

        const palettes = [
            // Enchanted forest
            { bg: [[20,50,30],[10,30,15]], layers: [[15,40,20],[10,30,15],[5,20,10],[2,12,5]],
              accent: [80,200,80], sky: [30,60,50], particles: [[100,200,100],[200,255,150],[150,255,100]],
              light: [200,255,180] },
            // Mountain sunset
            { bg: [[80,30,20],[40,15,30]], layers: [[60,25,30],[40,15,25],[25,10,20],[15,5,15]],
              accent: [255,150,50], sky: [255,100,50], particles: [[255,200,100],[255,150,50],[255,100,0]],
              light: [255,220,150] },
            // Space station
            { bg: [[5,5,15],[10,10,25]], layers: [[20,20,35],[15,15,30],[10,10,25],[5,5,20]],
              accent: [100,150,255], sky: [0,0,10], particles: [[100,200,255],[200,200,255],[150,150,255]],
              light: [150,200,255] },
            // Haunted mansion
            { bg: [[15,10,20],[10,5,15]], layers: [[20,15,25],[15,10,20],[10,8,15],[5,3,10]],
              accent: [150,80,200], sky: [20,10,30], particles: [[200,150,255],[150,100,200],[100,80,150]],
              light: [180,150,220] },
            // Underwater reef
            { bg: [[5,25,40],[0,15,30]], layers: [[10,35,50],[5,25,40],[3,18,30],[1,10,20]],
              accent: [50,200,200], sky: [0,40,60], particles: [[100,255,255],[50,200,255],[150,255,200]],
              light: [100,220,255] },
            // Abstract geometric
            { bg: [[30,10,30],[15,5,20]], layers: [[40,15,40],[30,10,30],[20,8,25],[12,5,18]],
              accent: [255,100,200], sky: [50,20,50], particles: [[255,150,200],[200,100,255],[255,200,150]],
              light: [255,180,220] },
        ];
        this.palette = palettes[this.sceneType];

        // Generate scene layers (back to front, each with silhouette shapes)
        this.layers = [];
        const layerCount = 4 + Math.floor(rng() * 3);
        for (let i = 0; i < layerCount; i++) {
            const depth = i / (layerCount - 1); // 0=farthest, 1=closest
            const layer = {
                depth,
                parallax: depth * this.parallaxStrength,
                color: this.palette.layers[Math.min(i, this.palette.layers.length - 1)],
                shapes: [],
                yBase: h * (0.4 + depth * 0.15),
                swayPhase: rng() * Math.PI * 2,
                swaySpeed: 0.005 + rng() * 0.01,
                swayAmount: 2 + depth * 3
            };

            // Generate silhouette shapes based on scene type
            this._generateLayerShapes(layer, i, layerCount, w, h, rng);
            this.layers.push(layer);
        }

        // Floating paper scraps
        this.floatingPapers = [];
        const paperCount = 15 + Math.floor(rng() * 20);
        for (let i = 0; i < paperCount; i++) {
            this.floatingPapers.push({
                x: rng() * w,
                y: rng() * h,
                width: 5 + rng() * 15,
                height: 5 + rng() * 15,
                rotation: rng() * Math.PI * 2,
                rotSpeed: (rng() - 0.5) * 0.04,
                vx: (rng() - 0.5) * 0.5,
                vy: -0.2 - rng() * 0.3,
                wobble: rng() * Math.PI * 2,
                wobbleSpeed: 0.02 + rng() * 0.04,
                depth: 0.3 + rng() * 0.7,
                color: this.palette.particles[Math.floor(rng() * this.palette.particles.length)],
                alpha: 0.2 + rng() * 0.4,
                fold: rng() * 0.4 // how "folded" the paper looks
            });
        }

        // Static light source (follows mouse)
        this.lightSources = [{
            x: w / 2,
            y: h * 0.3,
            radius: this.spotlightRadius,
            color: this.palette.light,
            intensity: 0.3
        }];

        this.confetti = [];
        this.tick = 0;
    }

    _generateLayerShapes(layer, layerIdx, totalLayers, w, h, rng) {
        const scene = this.sceneType;
        const shapes = layer.shapes;
        const y = layer.yBase;

        if (scene === 0) {
            // Enchanted forest - trees
            const treeCount = 3 + Math.floor(rng() * 5);
            for (let t = 0; t < treeCount; t++) {
                const tx = (t / treeCount) * w + (rng() - 0.5) * (w / treeCount);
                const treeH = 80 + rng() * 200 * (1 + layerIdx * 0.3);
                const trunkW = 5 + rng() * 15;
                shapes.push({ type: 'tree', x: tx, y, height: treeH, trunkWidth: trunkW,
                    canopyWidth: trunkW * (3 + rng() * 4), canopyStyle: Math.floor(rng() * 3) });
            }
            // Ground hills
            shapes.push({ type: 'hills', amplitude: 20 + rng() * 40, frequency: 0.005 + rng() * 0.01,
                phase: rng() * Math.PI * 2 });
        } else if (scene === 1) {
            // Mountain sunset - peaks
            const peakCount = 2 + Math.floor(rng() * 3);
            for (let p = 0; p < peakCount; p++) {
                shapes.push({ type: 'mountain', x: (p / peakCount) * w + (rng() - 0.5) * (w / peakCount),
                    width: 150 + rng() * 300, height: 100 + rng() * 250 * (1 - layerIdx * 0.15) });
            }
        } else if (scene === 2) {
            // Space station - geometric structures
            const structCount = 2 + Math.floor(rng() * 4);
            for (let s = 0; s < structCount; s++) {
                shapes.push({ type: 'structure', x: rng() * w, y: y - rng() * 100,
                    width: 30 + rng() * 100, height: 50 + rng() * 150,
                    subType: Math.floor(rng() * 3) }); // 0=tower, 1=dish, 2=module
            }
        } else if (scene === 3) {
            // Haunted mansion - buildings with spires
            if (layerIdx >= totalLayers - 2) {
                shapes.push({ type: 'mansion', x: w * (0.3 + rng() * 0.4), y,
                    width: 150 + rng() * 200, height: 120 + rng() * 180,
                    spireCount: 2 + Math.floor(rng() * 3), windowCount: 3 + Math.floor(rng() * 5) });
            }
            shapes.push({ type: 'hills', amplitude: 15 + rng() * 30, frequency: 0.003 + rng() * 0.008,
                phase: rng() * Math.PI * 2 });
            // Dead trees
            const deadTrees = Math.floor(rng() * 3);
            for (let t = 0; t < deadTrees; t++) {
                shapes.push({ type: 'deadtree', x: rng() * w, y, height: 50 + rng() * 100,
                    branchCount: 3 + Math.floor(rng() * 4) });
            }
        } else if (scene === 4) {
            // Underwater reef - coral and seaweed
            const coralCount = 4 + Math.floor(rng() * 5);
            for (let c = 0; c < coralCount; c++) {
                shapes.push({ type: 'coral', x: rng() * w, y: h - rng() * 100,
                    width: 20 + rng() * 60, height: 40 + rng() * 100,
                    style: Math.floor(rng() * 3) }); // 0=brain, 1=branch, 2=fan
            }
        } else {
            // Abstract geometric - various shapes
            const geoCount = 5 + Math.floor(rng() * 8);
            for (let g = 0; g < geoCount; g++) {
                shapes.push({ type: 'geometric', x: rng() * w, y: y - rng() * 200,
                    size: 20 + rng() * 80, sides: 3 + Math.floor(rng() * 5),
                    rotation: rng() * Math.PI * 2, rotSpeed: (rng() - 0.5) * 0.003 });
            }
        }
    }

    update(system) {
        this.tick++;
        const w = system.width, h = system.height;

        // Move light to mouse
        const ls = this.lightSources[0];
        ls.x += (mouse.x - ls.x) * 0.06;
        ls.y += (mouse.y - ls.y) * 0.06;

        // Sway layers
        for (const layer of this.layers) {
            layer.swayPhase += layer.swaySpeed;
        }

        // Update floating papers
        for (const paper of this.floatingPapers) {
            paper.wobble += paper.wobbleSpeed;
            paper.rotation += paper.rotSpeed;
            paper.x += paper.vx + Math.sin(paper.wobble) * this.windStrength;
            paper.y += paper.vy;

            // Wrap
            if (paper.y < -30) { paper.y = h + 30; paper.x = Math.random() * w; }
            if (paper.x < -30) paper.x = w + 30;
            if (paper.x > w + 30) paper.x = -30;
        }

        // Update geometric rotation (scene type 5)
        if (this.sceneType === 5) {
            for (const layer of this.layers) {
                for (const shape of layer.shapes) {
                    if (shape.type === 'geometric' && shape.rotSpeed) {
                        shape.rotation += shape.rotSpeed;
                    }
                }
            }
        }

        // Update confetti
        for (let i = this.confetti.length - 1; i >= 0; i--) {
            const c = this.confetti[i];
            c.x += c.vx;
            c.y += c.vy;
            c.vy += 0.05; // gravity
            c.vx *= 0.99;
            c.rotation += c.rotSpeed;
            c.life -= 0.008;
            if (c.life <= 0) this.confetti.splice(i, 1);
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const w = system.width, h = system.height;
        const px = (mouse.x - w / 2) / w;
        const py = (mouse.y - h / 2) / h;
        const ls = this.lightSources[0];
        const pal = this.palette;

        // Background sky with subtle gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, `rgb(${pal.bg[0].join(',')})`);
        skyGrad.addColorStop(1, `rgb(${pal.bg[1].join(',')})`);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Spotlight / light source glow
        ctx.globalCompositeOperation = 'lighter';
        const spotGrad = ctx.createRadialGradient(ls.x, ls.y, 0, ls.x, ls.y, ls.radius);
        spotGrad.addColorStop(0, `rgba(${ls.color.join(',')}, ${ls.intensity})`);
        spotGrad.addColorStop(0.5, `rgba(${ls.color.join(',')}, ${ls.intensity * 0.3})`);
        spotGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.arc(ls.x, ls.y, ls.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // Draw layers back to front
        for (const layer of this.layers) {
            const offsetX = px * layer.parallax;
            const offsetY = py * layer.parallax * 0.3;
            const sway = Math.sin(layer.swayPhase) * layer.swayAmount;
            const lc = layer.color;

            ctx.save();
            ctx.translate(offsetX + sway, offsetY);

            // Fill everything below layer base as solid silhouette
            ctx.fillStyle = `rgb(${lc.join(',')})`;

            // Draw shapes
            for (const shape of layer.shapes) {
                this._drawShape(ctx, shape, layer, w, h, lc);
            }

            // Ground fill for this layer
            ctx.fillStyle = `rgb(${lc.join(',')})`;
            ctx.fillRect(-50, layer.yBase, w + 100, h - layer.yBase + 50);

            // Depth-based haze
            if (layer.depth < 0.5) {
                ctx.fillStyle = `rgba(${pal.bg[1].join(',')}, ${(0.5 - layer.depth) * 0.3})`;
                ctx.fillRect(-50, 0, w + 100, h);
            }

            ctx.restore();
        }

        // Draw floating paper scraps
        for (const paper of this.floatingPapers) {
            const ppx = px * paper.depth * this.parallaxStrength;
            ctx.save();
            ctx.translate(paper.x + ppx, paper.y);
            ctx.rotate(paper.rotation);

            // Paper with fold effect
            ctx.globalAlpha = paper.alpha;
            ctx.fillStyle = `rgb(${paper.color.join(',')})`;
            ctx.beginPath();
            ctx.moveTo(-paper.width / 2, -paper.height / 2);
            ctx.lineTo(paper.width / 2, -paper.height / 2);
            ctx.lineTo(paper.width / 2 - paper.fold * paper.width, paper.height / 2);
            ctx.lineTo(-paper.width / 2, paper.height / 2);
            ctx.closePath();
            ctx.fill();

            // Fold line shadow
            if (paper.fold > 0.1) {
                ctx.strokeStyle = `rgba(0,0,0,0.2)`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(paper.width / 2, -paper.height / 2);
                ctx.lineTo(paper.width / 2 - paper.fold * paper.width, paper.height / 2);
                ctx.stroke();
            }

            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // Draw confetti
        for (const c of this.confetti) {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rotation);
            ctx.globalAlpha = c.life;
            ctx.fillStyle = `rgb(${c.color.join(',')})`;
            ctx.fillRect(-c.width / 2, -c.height / 2, c.width, c.height);
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // Subtle paper texture overlay
        if (this.tick % 2 === 0) {
            ctx.fillStyle = `rgba(255,255,255,0.008)`;
            for (let i = 0; i < 30; i++) {
                const rx = Math.random() * w;
                const ry = Math.random() * h;
                ctx.fillRect(rx, ry, 1, 1);
            }
        }
    }

    _drawShape(ctx, shape, layer, w, h, lc) {
        ctx.fillStyle = `rgb(${lc.join(',')})`;

        if (shape.type === 'tree') {
            // Trunk
            ctx.fillRect(shape.x - shape.trunkWidth / 2, shape.y - shape.height, shape.trunkWidth, shape.height);
            // Canopy
            if (shape.canopyStyle === 0) {
                // Round canopy
                ctx.beginPath();
                ctx.arc(shape.x, shape.y - shape.height, shape.canopyWidth / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (shape.canopyStyle === 1) {
                // Triangular (pine)
                ctx.beginPath();
                ctx.moveTo(shape.x, shape.y - shape.height - shape.canopyWidth * 0.8);
                ctx.lineTo(shape.x + shape.canopyWidth / 2, shape.y - shape.height * 0.3);
                ctx.lineTo(shape.x - shape.canopyWidth / 2, shape.y - shape.height * 0.3);
                ctx.closePath();
                ctx.fill();
            } else {
                // Multi-layer
                for (let c = 0; c < 3; c++) {
                    const cy = shape.y - shape.height + c * shape.canopyWidth * 0.2;
                    const cw = shape.canopyWidth * (1 - c * 0.2);
                    ctx.beginPath();
                    ctx.arc(shape.x, cy, cw / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (shape.type === 'mountain') {
            ctx.beginPath();
            ctx.moveTo(shape.x - shape.width / 2, layer.yBase);
            ctx.lineTo(shape.x, layer.yBase - shape.height);
            ctx.lineTo(shape.x + shape.width / 2, layer.yBase);
            ctx.closePath();
            ctx.fill();
        } else if (shape.type === 'hills') {
            ctx.beginPath();
            ctx.moveTo(-50, h);
            for (let x = -50; x <= w + 50; x += 5) {
                const hy = layer.yBase + Math.sin(x * shape.frequency + shape.phase) * shape.amplitude;
                ctx.lineTo(x, hy);
            }
            ctx.lineTo(w + 50, h);
            ctx.closePath();
            ctx.fill();
        } else if (shape.type === 'mansion') {
            // Main building
            ctx.fillRect(shape.x - shape.width / 2, shape.y - shape.height, shape.width, shape.height);
            // Spires
            for (let s = 0; s < shape.spireCount; s++) {
                const sx = shape.x - shape.width / 2 + (s + 0.5) * (shape.width / shape.spireCount);
                const spireH = shape.height * (0.3 + Math.random() * 0.4);
                ctx.beginPath();
                ctx.moveTo(sx - 8, shape.y - shape.height);
                ctx.lineTo(sx, shape.y - shape.height - spireH);
                ctx.lineTo(sx + 8, shape.y - shape.height);
                ctx.closePath();
                ctx.fill();
            }
            // Glowing windows
            ctx.fillStyle = `rgba(${this.palette.accent.join(',')}, 0.15)`;
            for (let wi = 0; wi < shape.windowCount; wi++) {
                const wx = shape.x - shape.width / 3 + wi * (shape.width * 0.6 / shape.windowCount);
                const wy = shape.y - shape.height * 0.7;
                ctx.fillRect(wx, wy, 8, 12);
            }
            ctx.fillStyle = `rgb(${lc.join(',')})`;
        } else if (shape.type === 'deadtree') {
            ctx.strokeStyle = `rgb(${lc.join(',')})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(shape.x, shape.y);
            ctx.lineTo(shape.x, shape.y - shape.height);
            ctx.stroke();
            for (let b = 0; b < shape.branchCount; b++) {
                const by = shape.y - shape.height * (0.3 + b * 0.2);
                const dir = b % 2 === 0 ? 1 : -1;
                ctx.beginPath();
                ctx.moveTo(shape.x, by);
                ctx.lineTo(shape.x + dir * (20 + b * 10), by - 15 - b * 5);
                ctx.stroke();
            }
        } else if (shape.type === 'coral') {
            if (shape.style === 0) {
                // Brain coral
                ctx.beginPath();
                ctx.arc(shape.x, shape.y - shape.height / 2, shape.width / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (shape.style === 1) {
                // Branching coral
                ctx.lineWidth = 4;
                ctx.strokeStyle = `rgb(${lc.join(',')})`;
                const drawBranch = (x, y, angle, len, depth) => {
                    if (depth <= 0 || len < 5) return;
                    const ex = x + Math.cos(angle) * len;
                    const ey = y + Math.sin(angle) * len;
                    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
                    drawBranch(ex, ey, angle - 0.4, len * 0.7, depth - 1);
                    drawBranch(ex, ey, angle + 0.4, len * 0.7, depth - 1);
                };
                drawBranch(shape.x, shape.y, -Math.PI / 2, shape.height * 0.4, 4);
            } else {
                // Fan coral
                ctx.beginPath();
                ctx.moveTo(shape.x, shape.y);
                ctx.arc(shape.x, shape.y, shape.height, -Math.PI * 0.8, -Math.PI * 0.2);
                ctx.closePath();
                ctx.fill();
            }
        } else if (shape.type === 'structure') {
            if (shape.subType === 0) {
                // Tower
                ctx.fillRect(shape.x - shape.width / 2, shape.y - shape.height, shape.width, shape.height);
                // Antenna
                ctx.fillRect(shape.x - 2, shape.y - shape.height - 30, 4, 30);
            } else if (shape.subType === 1) {
                // Satellite dish
                ctx.beginPath();
                ctx.arc(shape.x, shape.y - shape.height / 2, shape.width / 2, Math.PI, 0);
                ctx.fill();
                ctx.fillRect(shape.x - 3, shape.y - shape.height / 2, 6, shape.height / 2);
            } else {
                // Module
                ctx.fillRect(shape.x - shape.width / 2, shape.y - shape.height, shape.width, shape.height);
                ctx.beginPath();
                ctx.arc(shape.x, shape.y - shape.height, shape.width / 2, Math.PI, 0);
                ctx.fill();
            }
        } else if (shape.type === 'geometric') {
            ctx.save();
            ctx.translate(shape.x, shape.y);
            ctx.rotate(shape.rotation);
            ctx.beginPath();
            for (let i = 0; i <= shape.sides; i++) {
                const angle = (i / shape.sides) * Math.PI * 2;
                const gx = Math.cos(angle) * shape.size;
                const gy = Math.sin(angle) * shape.size;
                if (i === 0) ctx.moveTo(gx, gy);
                else ctx.lineTo(gx, gy);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    onShockwave(x, y) {
        // Confetti burst
        const pal = this.palette.particles;
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            this.confetti.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 3,
                width: 3 + Math.random() * 8,
                height: 3 + Math.random() * 8,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.2,
                color: pal[Math.floor(Math.random() * pal.length)],
                life: 1
            });
        }
    }
}
