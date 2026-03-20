/**
 * @file tidal_pool_architecture.js
 * @description Water surface with caustics. Height-field wave equation with caustic light
 * patterns on a seed-determined floor, floating debris, ripple physics, and whirlpool effects.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';
import { createNoise2D, fbm2D } from './simplex_noise.js';

export class TidalPoolArchitecture extends Architecture {
    constructor() {
        super();
        this.cellSize = 5;
        this.cols = 0;
        this.rows = 0;
        this.current = null;
        this.previous = null;
        this.damping = 0.97;
        this.waveSpeed = 0.4;
        this.floorType = 0;
        this.floorBase = { r: 180, g: 160, b: 120 };
        this.debris = [];
        this.offscreen = null;
        this.offCtx = null;
        this.floorCanvas = null;
        this.floorCtx = null;
        this.noise2D = null;
        this.prevMX = 0;
        this.prevMY = 0;
        this.waterHue = 195;
        this.waterAlpha = 0.25;
    }

    init(system) {
        const rng = system.rng;
        this.noise2D = createNoise2D(Math.floor(rng() * 100000));
        this.cellSize = 4 + Math.floor(rng() * 3);
        this.cols = Math.ceil(system.width / this.cellSize) + 1;
        this.rows = Math.ceil(system.height / this.cellSize) + 1;
        this.current = new Float32Array(this.cols * this.rows);
        this.previous = new Float32Array(this.cols * this.rows);
        this.damping = 0.96 + rng() * 0.03;
        this.waveSpeed = 0.3 + rng() * 0.2;
        this.waterHue = 180 + Math.floor(rng() * 40);
        this.waterAlpha = 0.15 + rng() * 0.2;
        this.floorType = Math.floor(rng() * 4);

        const bases = [
            [180, 30, 160, 25, 110, 30], // sandy
            [80, 30, 70, 25, 60, 20],    // rocky
            [140, 40, 100, 40, 100, 40],  // coral
            [120, 30, 120, 30, 130, 30]   // mosaic
        ];
        const b = bases[this.floorType];
        this.floorBase = { r: b[0] + Math.floor(rng() * b[1]), g: b[2] + Math.floor(rng() * b[3]), b: b[4] + Math.floor(rng() * b[5]) };

        this.offscreen = document.createElement('canvas');
        this.offscreen.width = system.width;
        this.offscreen.height = system.height;
        this.offCtx = this.offscreen.getContext('2d');
        this.floorCanvas = document.createElement('canvas');
        this.floorCanvas.width = system.width;
        this.floorCanvas.height = system.height;
        this.floorCtx = this.floorCanvas.getContext('2d');
        this._renderFloor(system);

        this.debris = [];
        const count = 5 + Math.floor(rng() * 11);
        for (let i = 0; i < count; i++) {
            const roll = rng();
            this.debris.push({
                x: rng() * system.width, y: rng() * system.height, vx: 0, vy: 0,
                type: roll < 0.3 ? 0 : roll < 0.55 ? 1 : roll < 0.8 ? 2 : 3,
                size: 4 + rng() * 8, rotation: rng() * Math.PI * 2,
                rotSpeed: (rng() - 0.5) * 0.02, alpha: 0.5 + rng() * 0.4,
                phase: rng() * Math.PI * 2, hueShift: (rng() - 0.5) * 30
            });
        }
        this.prevMX = 0;
        this.prevMY = 0;
    }

    _renderFloor(system) {
        const ctx = this.floorCtx;
        const w = system.width, h = system.height;
        const { r, g, b } = this.floorBase;
        const clamp = (v) => Math.max(0, Math.min(255, v));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(0, 0, w, h);

        if (this.floorType === 0) { // Sandy
            for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) {
                const n = Math.floor(fbm2D(this.noise2D, x * 0.02, y * 0.02, 3) * 25);
                ctx.fillStyle = `rgb(${r + n},${g + n},${b + n - 5})`;
                ctx.fillRect(x, y, 3, 3);
            }
        } else if (this.floorType === 1) { // Rocky
            for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
                const v = Math.floor(fbm2D(this.noise2D, x * 0.008, y * 0.008, 4) * 35 + fbm2D(this.noise2D, x * 0.03 + 50, y * 0.03 + 50, 2) * 15);
                ctx.fillStyle = `rgb(${r + v},${g + v - 3},${b + v - 5})`;
                ctx.fillRect(x, y, 4, 4);
            }
            ctx.strokeStyle = `rgba(${r - 30},${g - 30},${b - 30},0.3)`;
            ctx.lineWidth = 1;
            for (let i = 0; i < 15; i++) {
                let cx = this.noise2D(i * 7.3, 0.5) * 0.5 * w + w * 0.25;
                let cy = this.noise2D(0.5, i * 7.3) * 0.5 * h + h * 0.25;
                ctx.beginPath(); ctx.moveTo(cx, cy);
                for (let s = 0; s < 20; s++) { cx += this.noise2D(cx * 0.01, cy * 0.01) * 15; cy += this.noise2D(cy * 0.01, cx * 0.01 + 100) * 15; ctx.lineTo(cx, cy); }
                ctx.stroke();
            }
        } else if (this.floorType === 2) { // Coral
            const colors = [[r + 40, g - 20, b - 30], [r - 30, g + 30, b - 10], [r - 20, g - 10, b + 50], [r + 20, g + 20, b + 20], [r - 10, g, b]];
            for (let y = 0; y < h; y += 5) for (let x = 0; x < w; x += 5) {
                const ci = Math.floor((fbm2D(this.noise2D, x * 0.012, y * 0.012, 3) + 1) * 2.5) % 5;
                const d = fbm2D(this.noise2D, x * 0.05 + 200, y * 0.05 + 200, 2) * 15;
                const [cr, cg, cb] = colors[ci];
                ctx.fillStyle = `rgb(${clamp(cr + d)},${clamp(cg + d)},${clamp(cb + d)})`;
                ctx.fillRect(x, y, 5, 5);
            }
        } else { // Mosaic tiles
            const ts = 15 + Math.floor(this.noise2D(0, 0) * 5 + 5);
            const tc = [[r, g, b], [r + 30, g - 10, b + 20], [r - 20, g + 25, b + 10], [r + 10, g + 10, b + 35], [r + 20, g + 20, b - 15]];
            for (let ty = 0; ty < h; ty += ts) for (let tx = 0; tx < w; tx += ts) {
                const ci = Math.abs(Math.floor(this.noise2D(tx * 0.03, ty * 0.03) * tc.length)) % tc.length;
                ctx.fillStyle = `rgb(${clamp(tc[ci][0])},${clamp(tc[ci][1])},${clamp(tc[ci][2])})`;
                ctx.fillRect(tx + 0.5, ty + 0.5, ts - 1, ts - 1);
            }
            ctx.strokeStyle = `rgba(${r - 40},${g - 40},${b - 40},0.4)`;
            ctx.lineWidth = 1;
            for (let tx = 0; tx < w; tx += ts) { ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx, h); ctx.stroke(); }
            for (let ty = 0; ty < h; ty += ts) { ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(w, ty); ctx.stroke(); }
        }
        ctx.fillStyle = 'rgba(0,20,40,0.3)';
        ctx.fillRect(0, 0, w, h);
    }

    _idx(c, r) { return r * this.cols + c; }

    _addRipple(cur, col, row, radius, strength) {
        const cols = this.cols, rows = this.rows;
        for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) {
            const dSq = dr * dr + dc * dc;
            if (dSq > radius * radius) continue;
            const c = col + dc, r = row + dr;
            if (c >= 0 && c < cols && r >= 0 && r < rows)
                cur[this._idx(c, r)] += strength * (1 - dSq / (radius * radius));
        }
    }

    update(system) {
        const cols = this.cols, rows = this.rows;
        const cur = this.current, prev = this.previous;
        const mx = mouse.x, my = mouse.y;
        const mcol = Math.floor(mx / this.cellSize), mrow = Math.floor(my / this.cellSize);
        const mdx = mx - this.prevMX, mdy = my - this.prevMY;
        const moveDist = Math.sqrt(mdx * mdx + mdy * mdy);
        this.prevMX = mx; this.prevMY = my;

        // Mouse ripples
        if (moveDist > 2 && mcol > 1 && mcol < cols - 2 && mrow > 1 && mrow < rows - 2)
            this._addRipple(cur, mcol, mrow, 3, Math.min(moveDist * 0.3, 8));

        // Gravity well whirlpool
        if (system.isGravityWell && mcol > 2 && mcol < cols - 3 && mrow > 2 && mrow < rows - 3) {
            const wr = 12;
            for (let dr = -wr; dr <= wr; dr++) for (let dc = -wr; dc <= wr; dc++) {
                const dSq = dr * dr + dc * dc;
                if (dSq > wr * wr || dSq === 0) continue;
                const c = mcol + dc, r = mrow + dr;
                if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
                const dist = Math.sqrt(dSq), falloff = 1 - dist / wr;
                cur[this._idx(c, r)] -= falloff * 0.5;
                const ang = Math.atan2(dr, dc);
                const tc = c + Math.round(-Math.sin(ang) * 0.5), tr = r + Math.round(Math.cos(ang) * 0.5);
                if (tc >= 0 && tc < cols && tr >= 0 && tr < rows)
                    cur[this._idx(tc, tr)] += cur[this._idx(c, r)] * 0.02 * falloff;
            }
        }

        // Shockwaves
        for (let si = 0; si < system.shockwaves.length; si++) {
            const sw = system.shockwaves[si];
            const sc = Math.floor(sw.x / this.cellSize), sr = Math.floor(sw.y / this.cellSize);
            const swR = Math.floor(sw.radius / this.cellSize), rw = 4;
            for (let dr = -swR - rw; dr <= swR + rw; dr++) for (let dc = -swR - rw; dc <= swR + rw; dc++) {
                const dist = Math.sqrt(dr * dr + dc * dc);
                if (Math.abs(dist - swR) >= rw) continue;
                const c = sc + dc, r = sr + dr;
                if (c >= 0 && c < cols && r >= 0 && r < rows)
                    cur[this._idx(c, r)] += sw.strength * (1 - Math.abs(dist - swR) / rw) * 6;
            }
        }

        // Device tilt current
        if (system.deviceTilt) {
            const tx = system.deviceTilt.x || 0, ty = system.deviceTilt.y || 0;
            if (Math.abs(tx) > 0.01 || Math.abs(ty) > 0.01) {
                const tiltStr = Math.min(Math.abs(tx) + Math.abs(ty), 0.3) * 0.1;
                const sc = Math.sign(tx), sr = Math.sign(ty);
                for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
                    const idx = this._idx(c, r);
                    const ni = this._idx(Math.max(0, Math.min(cols - 1, c + sc)), Math.max(0, Math.min(rows - 1, r + sr)));
                    cur[idx] += (cur[ni] - cur[idx]) * tiltStr;
                }
            }
        }

        // Wave equation
        for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
            const idx = this._idx(c, r);
            const avg = (cur[this._idx(c - 1, r)] + cur[this._idx(c + 1, r)] + cur[this._idx(c, r - 1)] + cur[this._idx(c, r + 1)]) * 0.25;
            prev[idx] = (2 * cur[idx] - prev[idx] + this.waveSpeed * (avg - cur[idx])) * this.damping;
        }

        // Reflecting edges
        for (let c = 0; c < cols; c++) { prev[this._idx(c, 0)] = prev[this._idx(c, 1)]; prev[this._idx(c, rows - 1)] = prev[this._idx(c, rows - 2)]; }
        for (let r = 0; r < rows; r++) { prev[this._idx(0, r)] = prev[this._idx(1, r)]; prev[this._idx(cols - 1, r)] = prev[this._idx(cols - 2, r)]; }

        // Swap buffers
        this.current = this.previous;
        this.previous = cur;

        // Update debris
        for (let i = 0; i < this.debris.length; i++) {
            const d = this.debris[i];
            const dc = Math.floor(d.x / this.cellSize), dr = Math.floor(d.y / this.cellSize);
            if (dc > 0 && dc < cols - 1 && dr > 0 && dr < rows - 1) {
                d.vx += (this.current[this._idx(dc + 1, dr)] - this.current[this._idx(dc - 1, dr)]) * 0.4;
                d.vy += (this.current[this._idx(dc, dr + 1)] - this.current[this._idx(dc, dr - 1)]) * 0.4;
            }
            if (system.deviceTilt) { d.vx += (system.deviceTilt.x || 0) * 0.05; d.vy += (system.deviceTilt.y || 0) * 0.05; }
            d.vx *= 0.96; d.vy *= 0.96;
            d.x += d.vx * system.speedMultiplier;
            d.y += d.vy * system.speedMultiplier;
            d.rotation += d.rotSpeed * system.speedMultiplier;
            if (d.x < -d.size * 2) d.x += system.width + d.size * 4;
            if (d.x > system.width + d.size * 2) d.x -= system.width + d.size * 4;
            if (d.y < -d.size * 2) d.y += system.height + d.size * 4;
            if (d.y > system.height + d.size * 2) d.y -= system.height + d.size * 4;
        }
    }

    draw(system) {
        const ctx = system.ctx, oc = this.offCtx;
        const w = system.width, h = system.height;
        const cols = this.cols, rows = this.rows, cs = this.cellSize, cur = this.current;

        // Floor
        oc.drawImage(this.floorCanvas, 0, 0);

        // Caustics via imageData
        const imgData = oc.getImageData(0, 0, w, h);
        const px = imgData.data;
        const refract = 3.0, cStr = 0.12;
        for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
            const dhdx = (cur[this._idx(c + 1, r)] - cur[this._idx(c - 1, r)]) * 0.5;
            const dhdy = (cur[this._idx(c, r + 1)] - cur[this._idx(c, r - 1)]) * 0.5;
            const dx = Math.floor(c * cs + dhdx * refract * cs), dy = Math.floor(r * cs + dhdy * refract * cs);
            if (dx < 0 || dx >= w || dy < 0 || dy >= h) continue;
            const conv = -(cur[this._idx(c + 1, r)] - 2 * cur[this._idx(c, r)] + cur[this._idx(c - 1, r)]
                + cur[this._idx(c, r + 1)] - 2 * cur[this._idx(c, r)] + cur[this._idx(c, r - 1)]);
            if (conv > 0.01) {
                const inten = Math.min(conv * cStr * 255, 60);
                for (let py = dy - 1; py <= dy + 1; py++) for (let pxo = dx - 1; pxo <= dx + 1; pxo++) {
                    if (pxo >= 0 && pxo < w && py >= 0 && py < h) {
                        const pi = (py * w + pxo) * 4;
                        px[pi] = Math.min(255, px[pi] + inten * 0.9);
                        px[pi + 1] = Math.min(255, px[pi + 1] + inten);
                        px[pi + 2] = Math.min(255, px[pi + 2] + inten * 0.8);
                    }
                }
            }
        }
        oc.putImageData(imgData, 0, 0);

        // Water tint
        oc.fillStyle = `hsla(${this.waterHue},60%,30%,${this.waterAlpha})`;
        oc.fillRect(0, 0, w, h);

        // Surface highlights
        oc.save();
        oc.globalCompositeOperation = 'lighter';
        for (let r = 2; r < rows - 2; r += 2) for (let c = 2; c < cols - 2; c += 2) {
            const ht = cur[this._idx(c, r)];
            if (ht > 1.5) {
                oc.fillStyle = `rgba(255,255,255,${Math.min((ht - 1.5) * 0.15, 0.4)})`;
                oc.fillRect(c * cs - 1, r * cs - 1, cs + 2, cs + 2);
            }
        }
        oc.restore();

        // Debris
        this._drawDebris(oc, system);
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
            if (d.type === 0) { // Leaf
                ctx.fillStyle = `hsl(${110 + d.hueShift},50%,35%)`;
                ctx.beginPath(); ctx.ellipse(0, 0, d.size, d.size * 0.45, 0, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = `hsla(${100 + d.hueShift},40%,25%,0.5)`;
                ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-d.size * 0.8, 0); ctx.lineTo(d.size * 0.8, 0); ctx.stroke();
            } else if (d.type === 1) { // Petal
                ctx.fillStyle = `hsla(${340 + d.hueShift},60%,80%,0.8)`;
                ctx.beginPath(); ctx.ellipse(0, 0, d.size * 0.8, d.size * 0.5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = `hsla(${350 + d.hueShift},70%,70%,0.3)`;
                ctx.beginPath(); ctx.ellipse(d.size * 0.15, 0, d.size * 0.5, d.size * 0.3, 0, 0, Math.PI * 2); ctx.fill();
            } else if (d.type === 2) { // Fish
                ctx.fillStyle = `rgba(30,40,50,${0.4 + Math.sin(tick * 0.05 + d.phase) * 0.1})`;
                ctx.beginPath(); ctx.ellipse(0, 0, d.size, d.size * 0.35, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.moveTo(-d.size * 0.8, 0); ctx.lineTo(-d.size * 1.3, -d.size * 0.35); ctx.lineTo(-d.size * 1.3, d.size * 0.35); ctx.closePath(); ctx.fill();
                ctx.fillStyle = 'rgba(200,200,200,0.5)';
                ctx.beginPath(); ctx.arc(d.size * 0.5, -d.size * 0.05, d.size * 0.08, 0, Math.PI * 2); ctx.fill();
            } else { // Bubble
                ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 0.8;
                ctx.beginPath(); ctx.arc(0, 0, d.size * 0.5, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.beginPath(); ctx.arc(-d.size * 0.15, -d.size * 0.15, d.size * 0.15, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }
    }
}
