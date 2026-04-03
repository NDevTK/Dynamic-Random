/**
 * @file electric_ocean_effects.js
 * @description Electrified wave surface with lightning arcing between wave crests.
 * The cursor acts as a storm center that amplifies waves and attracts lightning.
 * Clicking triggers rogue waves and massive discharges.
 *
 * Modes:
 * 0 - Storm Sea: Choppy ocean surface with lightning between peaks
 * 1 - Lava Flow: Slow viscous waves of molten rock with ember sparks at crests
 * 2 - Sound Equalizer: Vertical bars that react as frequency bands
 * 3 - Plasma Membrane: Living cell membrane that undulates and sparks
 * 4 - Tectonic Plates: Ground segments that shift and crack with energy at seams
 * 5 - Digital Waveform: Glitchy oscilloscope traces with bit-crush distortion
 */

const TAU = Math.PI * 2;

export class ElectricOcean {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 200;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Wave system
        this._wavePoints = null;
        this._waveCount = 0;
        this._waveBaseY = 0;

        // Lightning bolts between crests
        this._bolts = [];
        this._boltPool = [];
        this._maxBolts = 10;

        // Sparks / embers
        this._sparks = [];
        this._sparkPool = [];
        this._maxSparks = 100;

        // Wave layers
        this._layers = [];

        // Rogue wave
        this._rogueX = -1;
        this._rogueStrength = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this._bolts = [];
        this._sparks = [];
        this._rogueX = -1;
        this._rogueStrength = 0;

        switch (this.mode) {
            case 0: this.hue = palette.length > 0 ? palette[0].h : 210; break;
            case 1: this.hue = palette.length > 0 ? palette[0].h : 15; break;
            case 2: this.hue = palette.length > 0 ? palette[0].h : 280; break;
            case 3: this.hue = palette.length > 0 ? palette[0].h : 140; break;
            case 4: this.hue = palette.length > 0 ? palette[0].h : 30; break;
            case 5: this.hue = palette.length > 0 ? palette[0].h : 120; break;
        }
        this.intensity = 0.6 + rng() * 0.5;

        const W = window.innerWidth, H = window.innerHeight;
        this._waveBaseY = H * (this.mode === 2 ? 0.5 : 0.65 + rng() * 0.15);
        this._waveCount = Math.ceil(W / 4);
        this._wavePoints = new Float32Array(this._waveCount);

        // Wave layers (2-4 overlapping waves)
        const layerCount = 2 + Math.floor(rng() * 3);
        this._layers = [];
        for (let i = 0; i < layerCount; i++) {
            this._layers.push({
                frequency: 0.005 + rng() * 0.015,
                amplitude: 15 + rng() * 40,
                speed: 0.01 + rng() * 0.03,
                phase: rng() * TAU,
                hueShift: (rng() - 0.5) * 30,
                yOffset: i * 20 - 10,
                alpha: 0.15 - i * 0.03
            });
        }
    }

    _prand(seed) {
        return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        // Rogue wave on click
        if (isClicking && !this._wasClicking) {
            this._rogueX = mx;
            this._rogueStrength = 1;
            // Spawn sparks
            for (let i = 0; i < 15 && this._sparks.length < this._maxSparks; i++) {
                this._spawnSpark(mx, this._waveBaseY - 30);
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Decay rogue wave
        this._rogueStrength *= 0.97;

        // Compute wave heights
        for (let i = 0; i < this._waveCount; i++) {
            const x = i * 4;
            let y = 0;

            for (const layer of this._layers) {
                y += Math.sin(x * layer.frequency + this.tick * layer.speed + layer.phase) * layer.amplitude;
            }

            // Cursor influence: waves swell near cursor
            const cdx = x - mx;
            const cdist = Math.abs(cdx);
            if (cdist < 200) {
                const influence = (1 - cdist / 200);
                y -= influence * 25 * (1 + this._mouseSpeed * 0.1);
            }

            // Rogue wave
            if (this._rogueStrength > 0.01) {
                const rdx = x - this._rogueX;
                const rdist = Math.abs(rdx);
                const rogueWidth = 100 + (1 - this._rogueStrength) * 300;
                if (rdist < rogueWidth) {
                    y -= Math.cos((rdist / rogueWidth) * Math.PI) * 60 * this._rogueStrength;
                }
            }

            this._wavePoints[i] = y;
        }

        // Spawn lightning between high crests
        if (this.tick % 15 === 0 && this._bolts.length < this._maxBolts) {
            let maxH1 = 0, maxH2 = 0, maxI1 = 0, maxI2 = 0;
            for (let i = 0; i < this._waveCount; i++) {
                const h = -this._wavePoints[i]; // Higher = more negative
                if (h > maxH1) {
                    maxH2 = maxH1; maxI2 = maxI1;
                    maxH1 = h; maxI1 = i;
                } else if (h > maxH2 && Math.abs(i - maxI1) > 20) {
                    maxH2 = h; maxI2 = i;
                }
            }
            if (maxH1 > 20 && maxH2 > 15) {
                this._spawnBolt(maxI1 * 4, this._waveBaseY + this._wavePoints[maxI1],
                    maxI2 * 4, this._waveBaseY + this._wavePoints[maxI2]);
            }
        }

        // Update bolts
        for (let i = this._bolts.length - 1; i >= 0; i--) {
            this._bolts[i].life--;
            if (this._bolts[i].life <= 0) {
                this._boltPool.push(this._bolts[i]);
                this._bolts[i] = this._bolts[this._bolts.length - 1];
                this._bolts.pop();
            }
        }

        // Update sparks
        for (let i = this._sparks.length - 1; i >= 0; i--) {
            const s = this._sparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.05;
            s.life--;
            if (s.life <= 0) {
                this._sparkPool.push(s);
                this._sparks[i] = this._sparks[this._sparks.length - 1];
                this._sparks.pop();
            }
        }

        // Emit sparks at wave crests when cursor is near
        if (this._mouseSpeed > 3 && this.tick % 4 === 0) {
            const ci = Math.floor(mx / 4);
            if (ci >= 0 && ci < this._waveCount) {
                this._spawnSpark(mx, this._waveBaseY + this._wavePoints[ci]);
            }
        }
    }

    _spawnBolt(x1, y1, x2, y2) {
        const bolt = this._boltPool.length > 0 ? this._boltPool.pop() : {};
        bolt.x1 = x1; bolt.y1 = y1;
        bolt.x2 = x2; bolt.y2 = y2;
        bolt.life = 5 + Math.floor(Math.random() * 5);
        bolt.maxLife = bolt.life;
        // Generate jagged path
        const segments = 6 + Math.floor(Math.random() * 4);
        const points = [{ x: x1, y: y1 }];
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        for (let s = 1; s < segments; s++) {
            const t = s / segments;
            points.push({
                x: x1 + dx * t + (Math.random() - 0.5) * len * 0.15,
                y: y1 + dy * t + (Math.random() - 0.5) * len * 0.15
            });
        }
        points.push({ x: x2, y: y2 });
        bolt.points = points;
        this._bolts.push(bolt);
    }

    _spawnSpark(x, y) {
        if (this._sparks.length >= this._maxSparks) return;
        const s = this._sparkPool.length > 0 ? this._sparkPool.pop() : {};
        s.x = x;
        s.y = y;
        s.vx = (Math.random() - 0.5) * 4;
        s.vy = -1 - Math.random() * 4;
        s.life = 15 + Math.random() * 25;
        s.maxLife = s.life;
        s.hue = this.hue + (Math.random() - 0.5) * 30;
        s.size = 0.8 + Math.random() * 2;
        this._sparks.push(s);
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        if (this.mode === 2) this._drawEqualizer(ctx, system);
        else if (this.mode === 4) this._drawTectonic(ctx, system);
        else if (this.mode === 5) this._drawDigitalWaveform(ctx, system);
        else this._drawWaveSurface(ctx, system);

        // Lightning bolts
        for (const bolt of this._bolts) {
            const lifeRatio = bolt.life / bolt.maxLife;
            const alpha = lifeRatio * 0.4 * this.intensity;
            const boltHue = this.mode === 1 ? 40 : this.hue + 60;

            // Glow
            ctx.strokeStyle = `hsla(${boltHue}, 80%, 70%, ${alpha * 0.3})`;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
            for (let p = 1; p < bolt.points.length; p++) {
                ctx.lineTo(bolt.points[p].x, bolt.points[p].y);
            }
            ctx.stroke();

            // Core
            ctx.strokeStyle = `hsla(${boltHue}, 60%, 90%, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
            for (let p = 1; p < bolt.points.length; p++) {
                ctx.lineTo(bolt.points[p].x, bolt.points[p].y);
            }
            ctx.stroke();
        }

        // Sparks
        for (const s of this._sparks) {
            const lifeRatio = s.life / s.maxLife;
            const alpha = lifeRatio * 0.5 * this.intensity;
            ctx.fillStyle = `hsla(${s.hue}, 80%, 75%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * lifeRatio, 0, TAU);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawWaveSurface(ctx, system) {
        const H = system.height || window.innerHeight;
        const W = system.width || window.innerWidth;

        for (let li = this._layers.length - 1; li >= 0; li--) {
            const layer = this._layers[li];
            const baseY = this._waveBaseY + layer.yOffset;
            const hue = (this.hue + layer.hueShift + 360) % 360;
            const alpha = layer.alpha * this.intensity;

            // Fill from wave to bottom
            const grad = ctx.createLinearGradient(0, baseY - 40, 0, H);
            grad.addColorStop(0, `hsla(${hue}, 70%, 55%, ${alpha * 0.8})`);
            grad.addColorStop(0.3, `hsla(${hue}, 60%, 40%, ${alpha * 0.4})`);
            grad.addColorStop(1, `hsla(${hue}, 50%, 20%, ${alpha * 0.1})`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, H);

            for (let i = 0; i < this._waveCount; i++) {
                ctx.lineTo(i * 4, baseY + this._wavePoints[i]);
            }
            ctx.lineTo(W, H);
            ctx.closePath();
            ctx.fill();

            // Wave crest highlight
            ctx.strokeStyle = `hsla(${(hue + 20) % 360}, 80%, 70%, ${alpha * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < this._waveCount; i++) {
                const px = i * 4;
                const py = baseY + this._wavePoints[i];
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        // Foam / spray at crests
        if (this.mode === 0) {
            for (let i = 2; i < this._waveCount - 2; i++) {
                const dy = this._wavePoints[i - 1] - this._wavePoints[i];
                if (dy > 3) { // Rising edge = crest
                    const x = i * 4;
                    const y = this._waveBaseY + this._wavePoints[i];
                    const foamAlpha = Math.min(dy / 10, 1) * 0.08 * this.intensity;
                    ctx.fillStyle = `rgba(200, 230, 255, ${foamAlpha})`;
                    ctx.beginPath();
                    ctx.arc(x, y, 3 + dy, 0, TAU);
                    ctx.fill();
                }
            }
        }
    }

    _drawEqualizer(ctx, system) {
        const W = system.width || window.innerWidth;
        const H = system.height || window.innerHeight;
        const barCount = 64;
        const barWidth = W / barCount * 0.7;
        const gap = W / barCount * 0.3;

        for (let i = 0; i < barCount; i++) {
            const x = i * (barWidth + gap) + gap / 2;
            const waveIdx = Math.floor((i / barCount) * this._waveCount);
            const height = Math.abs(this._wavePoints[waveIdx] || 0) * 3;
            const hue = (this.hue + i * 5) % 360;
            const alpha = 0.15 * this.intensity;

            const grad = ctx.createLinearGradient(x, this._waveBaseY, x, this._waveBaseY - height);
            grad.addColorStop(0, `hsla(${hue}, 70%, 40%, ${alpha * 0.5})`);
            grad.addColorStop(1, `hsla(${(hue + 30) % 360}, 90%, 70%, ${alpha})`);

            ctx.fillStyle = grad;
            ctx.fillRect(x, this._waveBaseY - height, barWidth, height);

            // Peak indicator
            ctx.fillStyle = `hsla(${hue}, 90%, 85%, ${alpha * 0.8})`;
            ctx.fillRect(x, this._waveBaseY - height - 3, barWidth, 2);
        }
    }

    _drawTectonic(ctx, system) {
        const W = system.width || window.innerWidth;
        const plateCount = 8;
        const plateWidth = W / plateCount;

        for (let p = 0; p < plateCount; p++) {
            const x = p * plateWidth;
            const waveIdx = Math.floor((p / plateCount) * this._waveCount);
            const shift = this._wavePoints[waveIdx] || 0;

            // Plate
            const alpha = 0.06 * this.intensity;
            ctx.fillStyle = `hsla(${this.hue + p * 10}, 40%, 30%, ${alpha})`;
            ctx.fillRect(x + 2, this._waveBaseY + shift, plateWidth - 4, 200);

            // Energy at seams
            if (p > 0) {
                const prevShift = this._wavePoints[Math.floor(((p - 1) / plateCount) * this._waveCount)] || 0;
                const stress = Math.abs(shift - prevShift);
                const seamAlpha = Math.min(stress / 30, 1) * 0.2 * this.intensity;
                ctx.strokeStyle = `hsla(${this.hue + 30}, 80%, 60%, ${seamAlpha})`;
                ctx.lineWidth = 1 + stress * 0.05;
                ctx.beginPath();
                ctx.moveTo(x, this._waveBaseY + shift - 20);
                ctx.lineTo(x, this._waveBaseY + shift + 100);
                ctx.stroke();
            }
        }
    }

    _drawDigitalWaveform(ctx, system) {
        const W = system.width || window.innerWidth;
        const baseY = this._waveBaseY;

        // Main waveform
        ctx.strokeStyle = `hsla(${this.hue}, 90%, 65%, ${0.2 * this.intensity})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < this._waveCount; i++) {
            const x = i * 4;
            // Bit-crush: quantize Y values
            let y = this._wavePoints[i];
            y = Math.round(y / 8) * 8; // Quantize to 8px steps
            if (i === 0) ctx.moveTo(x, baseY + y);
            else {
                // Step function (horizontal then vertical)
                ctx.lineTo(x, baseY + this._wavePoints[i - 1]);
                ctx.lineTo(x, baseY + y);
            }
        }
        ctx.stroke();

        // Glitch segments
        if (this.tick % 10 < 3) {
            const glitchStart = Math.floor(this._prand(this.tick) * this._waveCount);
            const glitchLen = 10 + Math.floor(this._prand(this.tick + 1) * 30);
            ctx.strokeStyle = `hsla(${(this.hue + 120) % 360}, 90%, 70%, ${0.15 * this.intensity})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = glitchStart; i < Math.min(glitchStart + glitchLen, this._waveCount); i++) {
                const x = i * 4;
                const y = this._wavePoints[i] + (this._prand(this.tick * 3 + i) - 0.5) * 30;
                if (i === glitchStart) ctx.moveTo(x, baseY + y);
                else ctx.lineTo(x, baseY + y);
            }
            ctx.stroke();
        }
    }
}
