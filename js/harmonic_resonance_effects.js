/**
 * @file harmonic_resonance_effects.js
 * @description Standing wave and interference pattern system that creates mesmerizing
 * visual harmonics between the cursor and screen boundaries. Like watching sound
 * waves made visible, with constructive/destructive interference creating complex
 * evolving patterns that respond to movement.
 *
 * Modes:
 * 0 - Chladni Plates: vibration patterns like sand on metal plates, shift with cursor
 * 1 - Lissajous Web: parametric Lissajous curves that morph based on cursor position
 * 2 - Cymatics: circular standing wave patterns emanating from cursor
 * 3 - String Harmonics: plucked string vibrations between cursor and screen edges
 * 4 - Moiré Generator: overlapping rotated patterns create shifting moiré interference
 * 5 - Frequency Spectrum: cursor X controls frequency, Y controls amplitude of wave field
 */

export class HarmonicResonance {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.saturation = 70;
        this.intensity = 1;

        this._mouseX = 0;
        this._mouseY = 0;
        this._isClicking = false;
        this._rng = Math.random;

        // Chladni
        this.chladniM = 3;
        this.chladniN = 5;
        this.chladniResolution = 8;

        // Lissajous
        this.lissajousA = 3;
        this.lissajousB = 4;
        this.lissajousDelta = 0;
        this.lissajousTrails = [];
        this.lissajousCount = 3;

        // Cymatics
        this.cymaticFreqs = [];
        this.cymaticRingCount = 12;

        // String harmonics
        this.strings = [];
        this.stringCount = 5;

        // Moiré
        this.moirePatterns = [];
        this.moireCount = 2;

        // Frequency spectrum
        this.spectrumBands = 24;
        this.spectrumPhase = 0;
        this.spectrumWaveType = 0; // 0=sine, 1=saw, 2=square-ish
    }

    configure(rng, hues) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = hues.length > 0 ? hues[Math.floor(rng() * hues.length)].h : Math.floor(rng() * 360);
        this.saturation = 50 + Math.floor(rng() * 40);
        this.intensity = 0.5 + rng() * 0.8;
        this._rng = rng;

        switch (this.mode) {
            case 0: { // Chladni
                this.chladniM = 1 + Math.floor(rng() * 6);
                this.chladniN = this.chladniM + 1 + Math.floor(rng() * 4);
                this.chladniResolution = 6 + Math.floor(rng() * 6);
                break;
            }
            case 1: { // Lissajous
                this.lissajousCount = 2 + Math.floor(rng() * 4);
                this.lissajousTrails = [];
                for (let i = 0; i < this.lissajousCount; i++) {
                    this.lissajousTrails.push({
                        a: 1 + Math.floor(rng() * 6),
                        b: 1 + Math.floor(rng() * 6),
                        delta: rng() * Math.PI,
                        deltaSpeed: 0.002 + rng() * 0.008,
                        scale: 60 + rng() * 100,
                        hueOffset: i * 40,
                        points: [],
                    });
                }
                break;
            }
            case 2: { // Cymatics
                this.cymaticRingCount = 8 + Math.floor(rng() * 12);
                this.cymaticFreqs = [];
                for (let i = 0; i < 4; i++) {
                    this.cymaticFreqs.push({
                        freq: 2 + Math.floor(rng() * 8),
                        phase: rng() * Math.PI * 2,
                        speed: 0.01 + rng() * 0.03,
                        amp: 0.5 + rng() * 0.5,
                    });
                }
                break;
            }
            case 3: { // String harmonics
                this.stringCount = 3 + Math.floor(rng() * 5);
                this.strings = [];
                for (let i = 0; i < this.stringCount; i++) {
                    const isHorizontal = rng() > 0.5;
                    this.strings.push({
                        horizontal: isHorizontal,
                        position: 0.15 + rng() * 0.7, // Normalized 0-1
                        harmonic: 1 + Math.floor(rng() * 6),
                        amplitude: 20 + rng() * 40,
                        phase: rng() * Math.PI * 2,
                        phaseSpeed: 0.02 + rng() * 0.04,
                        hueOffset: i * 25,
                        decay: 0,
                        pluckLife: 0,
                    });
                }
                break;
            }
            case 4: { // Moiré
                this.moireCount = 2 + Math.floor(rng() * 2);
                this.moirePatterns = [];
                for (let i = 0; i < this.moireCount; i++) {
                    this.moirePatterns.push({
                        type: Math.floor(rng() * 3), // 0=lines, 1=circles, 2=radial
                        spacing: 8 + rng() * 15,
                        rotation: rng() * Math.PI,
                        rotSpeed: (rng() - 0.5) * 0.004,
                        offsetX: 0,
                        offsetY: 0,
                        hueOffset: i * 60,
                    });
                }
                break;
            }
            case 5: { // Frequency spectrum
                this.spectrumBands = 16 + Math.floor(rng() * 24);
                this.spectrumWaveType = Math.floor(rng() * 3);
                this.spectrumPhase = 0;
                break;
            }
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._mouseX = mx;
        this._mouseY = my;
        this._isClicking = isClicking;

        switch (this.mode) {
            case 1: this._updateLissajous(mx, my); break;
            case 2: this._updateCymatics(); break;
            case 3: this._updateStrings(mx, my, isClicking); break;
            case 4: this._updateMoire(mx, my); break;
            case 5: this._updateSpectrum(); break;
        }
    }

    _updateLissajous(mx, my) {
        const w = window.innerWidth;
        const h = window.innerHeight;

        for (const trail of this.lissajousTrails) {
            trail.delta += trail.deltaSpeed;
            // Generate points for one full period
            const pointCount = 200;
            trail.points = [];
            for (let i = 0; i < pointCount; i++) {
                const t = (i / pointCount) * Math.PI * 2;
                const x = mx + Math.sin(trail.a * t + trail.delta) * trail.scale;
                const y = my + Math.sin(trail.b * t) * trail.scale;
                trail.points.push({ x, y });
            }
        }
    }

    _updateCymatics() {
        for (const f of this.cymaticFreqs) {
            f.phase += f.speed;
        }
    }

    _updateStrings(mx, my, isClicking) {
        const w = window.innerWidth;
        const h = window.innerHeight;

        for (const s of this.strings) {
            s.phase += s.phaseSpeed;

            // "Pluck" strings near cursor
            const stringPos = s.horizontal
                ? s.position * h
                : s.position * w;
            const cursorPos = s.horizontal ? my : mx;
            const dist = Math.abs(stringPos - cursorPos);

            if (dist < 50) {
                s.pluckLife = Math.min(1, s.pluckLife + 0.05);
            } else {
                s.pluckLife = Math.max(0, s.pluckLife - 0.01);
            }

            if (isClicking && dist < 80) {
                s.pluckLife = 1;
                s.decay = 0; // Reset decay on pluck
            }

            if (s.pluckLife > 0) {
                s.decay += 0.002;
            }
        }
    }

    _updateMoire(mx, my) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const normX = mx / w - 0.5;
        const normY = my / h - 0.5;

        for (let i = 0; i < this.moirePatterns.length; i++) {
            const p = this.moirePatterns[i];
            p.rotation += p.rotSpeed;
            // Cursor influences offset for parallax
            p.offsetX = normX * (20 + i * 30);
            p.offsetY = normY * (20 + i * 30);
        }
    }

    _updateSpectrum() {
        this.spectrumPhase += 0.02;
    }

    draw(ctx, system) {
        const w = system.width;
        const h = system.height;

        switch (this.mode) {
            case 0: this._drawChladni(ctx, w, h); break;
            case 1: this._drawLissajous(ctx, w, h); break;
            case 2: this._drawCymatics(ctx, w, h); break;
            case 3: this._drawStrings(ctx, w, h); break;
            case 4: this._drawMoire(ctx, w, h); break;
            case 5: this._drawSpectrum(ctx, w, h); break;
        }
    }

    _drawChladni(ctx, w, h) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const res = this.chladniResolution;
        const mx = this._mouseX;
        const my = this._mouseY;
        // Cursor position modulates the Chladni parameters
        const m = this.chladniM + (mx / w) * 2;
        const n = this.chladniN + (my / h) * 2;
        const timePhase = this.tick * 0.008;

        const cols = Math.ceil(w / res);
        const rows = Math.ceil(h / res);

        // Only render a sampling of cells for performance
        const step = this._isClicking ? 1 : 2;

        for (let y = 0; y < rows; y += step) {
            for (let x = 0; x < cols; x += step) {
                const px = x / cols;
                const py = y / rows;

                // Chladni pattern: cos(m*pi*x)*cos(n*pi*y) - cos(n*pi*x)*cos(m*pi*y)
                const val = Math.cos(m * Math.PI * px + timePhase) *
                           Math.cos(n * Math.PI * py) -
                           Math.cos(n * Math.PI * px) *
                           Math.cos(m * Math.PI * py + timePhase);

                // Nodal lines appear where val ≈ 0
                const absVal = Math.abs(val);
                if (absVal > 0.15) continue;

                const brightness = (1 - absVal / 0.15);
                const alpha = brightness * 0.12 * this.intensity;
                const hue = (this.hue + brightness * 40 + this.tick * 0.2) % 360;

                ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, 65%, ${alpha})`;
                ctx.fillRect(x * res, y * res, res * step, res * step);
            }
        }

        ctx.restore();
    }

    _drawLissajous(ctx, w, h) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const trail of this.lissajousTrails) {
            if (trail.points.length < 2) continue;

            const hue = (this.hue + trail.hueOffset + 360) % 360;
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 65%, ${0.08 * this.intensity})`;
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(trail.points[0].x, trail.points[0].y);
            for (let i = 1; i < trail.points.length; i++) {
                ctx.lineTo(trail.points[i].x, trail.points[i].y);
            }
            ctx.closePath();
            ctx.stroke();

            // Glow at intersection points (every Nth point for performance)
            const step = Math.max(1, Math.floor(trail.points.length / 20));
            ctx.fillStyle = `hsla(${hue}, 80%, 75%, ${0.06 * this.intensity})`;
            for (let i = 0; i < trail.points.length; i += step) {
                const p = trail.points[i];
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    _drawCymatics(ctx, w, h) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const mx = this._mouseX;
        const my = this._mouseY;
        const clickBoost = this._isClicking ? 1.5 : 1;

        for (let ring = 0; ring < this.cymaticRingCount; ring++) {
            const baseR = (ring + 1) * 18 * clickBoost;

            // Compute modulated radius at each angle using frequency superposition
            const segments = 64;
            ctx.beginPath();

            for (let s = 0; s <= segments; s++) {
                const angle = (s / segments) * Math.PI * 2;
                let r = baseR;
                for (const f of this.cymaticFreqs) {
                    r += Math.sin(angle * f.freq + f.phase + ring * 0.3) * f.amp * 8;
                }

                const px = mx + Math.cos(angle) * r;
                const py = my + Math.sin(angle) * r;
                if (s === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();

            const ringT = ring / this.cymaticRingCount;
            const alpha = (1 - ringT) * 0.08 * this.intensity;
            const hue = (this.hue + ring * 8) % 360;
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 65%, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Fill every other ring faintly
            if (ring % 2 === 0) {
                ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, 55%, ${alpha * 0.2})`;
                ctx.fill();
            }
        }

        ctx.restore();
    }

    _drawStrings(ctx, w, h) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const s of this.strings) {
            const envelope = s.pluckLife * Math.max(0, 1 - s.decay);
            if (envelope < 0.01) continue;

            const hue = (this.hue + s.hueOffset + 360) % 360;
            const alpha = envelope * 0.15 * this.intensity;
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 65%, ${alpha})`;
            ctx.lineWidth = 1.5;

            const segments = 80;
            ctx.beginPath();

            if (s.horizontal) {
                const baseY = s.position * h;
                for (let i = 0; i <= segments; i++) {
                    const t = i / segments;
                    const x = t * w;
                    // Standing wave: sin(harmonic * pi * t) * sin(phase)
                    const wave = Math.sin(s.harmonic * Math.PI * t) *
                                Math.sin(s.phase) * s.amplitude * envelope;
                    const y = baseY + wave;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
            } else {
                const baseX = s.position * w;
                for (let i = 0; i <= segments; i++) {
                    const t = i / segments;
                    const y = t * h;
                    const wave = Math.sin(s.harmonic * Math.PI * t) *
                                Math.sin(s.phase) * s.amplitude * envelope;
                    const x = baseX + wave;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
            }
            ctx.stroke();

            // Draw nodes (still points) as small dots
            for (let n = 0; n <= s.harmonic; n++) {
                const t = n / s.harmonic;
                let nx, ny;
                if (s.horizontal) {
                    nx = t * w;
                    ny = s.position * h;
                } else {
                    nx = s.position * w;
                    ny = t * h;
                }
                ctx.fillStyle = `hsla(${hue}, 80%, 80%, ${alpha * 0.8})`;
                ctx.beginPath();
                ctx.arc(nx, ny, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw antinodes (maximum vibration) with glow
            for (let n = 0; n < s.harmonic; n++) {
                const t = (n + 0.5) / s.harmonic;
                let ax, ay;
                if (s.horizontal) {
                    ax = t * w;
                    ay = s.position * h;
                } else {
                    ax = s.position * w;
                    ay = t * h;
                }
                const glowAlpha = alpha * 0.4 * Math.abs(Math.sin(s.phase));
                ctx.fillStyle = `hsla(${hue}, 90%, 70%, ${glowAlpha})`;
                ctx.beginPath();
                ctx.arc(ax, ay, 4 + envelope * 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    _drawMoire(ctx, w, h) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const p of this.moirePatterns) {
            const hue = (this.hue + p.hueOffset + 360) % 360;
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 60%, ${0.03 * this.intensity})`;
            ctx.lineWidth = 0.5;

            ctx.save();
            ctx.translate(w / 2 + p.offsetX, h / 2 + p.offsetY);
            ctx.rotate(p.rotation);

            switch (p.type) {
                case 0: { // Parallel lines
                    const lineCount = Math.ceil(Math.max(w, h) / p.spacing) + 5;
                    const halfExtent = Math.max(w, h);
                    ctx.beginPath();
                    for (let i = -lineCount; i <= lineCount; i++) {
                        const y = i * p.spacing;
                        ctx.moveTo(-halfExtent, y);
                        ctx.lineTo(halfExtent, y);
                    }
                    ctx.stroke();
                    break;
                }
                case 1: { // Concentric circles
                    const maxR = Math.max(w, h) * 0.7;
                    const ringCount = Math.ceil(maxR / p.spacing);
                    for (let i = 1; i <= ringCount; i++) {
                        ctx.beginPath();
                        ctx.arc(0, 0, i * p.spacing, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    break;
                }
                case 2: { // Radial lines
                    const rayCount = Math.floor(360 / (p.spacing * 0.5));
                    const len = Math.max(w, h);
                    ctx.beginPath();
                    for (let i = 0; i < rayCount; i++) {
                        const a = (i / rayCount) * Math.PI * 2;
                        ctx.moveTo(0, 0);
                        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
                    }
                    ctx.stroke();
                    break;
                }
            }

            ctx.restore();
        }

        ctx.restore();
    }

    _drawSpectrum(ctx, w, h) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const mx = this._mouseX;
        const my = this._mouseY;
        const freqBase = 1 + (mx / w) * 8; // X controls base frequency
        const ampBase = (1 - my / h) * 40; // Y controls amplitude
        const clickBoost = this._isClicking ? 2 : 1;

        const bands = this.spectrumBands;
        const bandHeight = h / bands;

        for (let band = 0; band < bands; band++) {
            const freq = freqBase + band * 0.3;
            const amplitude = ampBase * (1 - band / bands * 0.5) * clickBoost;
            const baseY = band * bandHeight + bandHeight / 2;
            const hue = (this.hue + band * (360 / bands)) % 360;
            const alpha = 0.08 * this.intensity * (1 - band / bands * 0.3);

            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 65%, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();

            const segments = 80;
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const x = t * w;
                let wave;

                switch (this.spectrumWaveType) {
                    case 0: // Sine
                        wave = Math.sin(t * Math.PI * 2 * freq + this.spectrumPhase + band * 0.5) * amplitude;
                        break;
                    case 1: // Sawtooth approximation
                        wave = 0;
                        for (let k = 1; k <= 4; k++) {
                            wave += Math.sin(t * Math.PI * 2 * freq * k + this.spectrumPhase + band * 0.5) / k;
                        }
                        wave *= amplitude * 0.6;
                        break;
                    case 2: // Square-ish (odd harmonics)
                        wave = 0;
                        for (let k = 1; k <= 3; k += 2) {
                            wave += Math.sin(t * Math.PI * 2 * freq * k + this.spectrumPhase + band * 0.5) / k;
                        }
                        wave *= amplitude * 0.7;
                        break;
                    default:
                        wave = 0;
                }

                const y = baseY + wave;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        ctx.restore();
    }
}
