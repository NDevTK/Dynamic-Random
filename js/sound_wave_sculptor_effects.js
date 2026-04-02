/**
 * @file sound_wave_sculptor_effects.js
 * @description Mouse movement generates visible sound/pressure waves that propagate
 * and interfere with each other. Fast movement = high frequency short waves, slow =
 * low frequency long waves. Clicking creates standing wave nodes or shockwaves.
 * Waves interact via constructive/destructive interference creating beautiful patterns.
 *
 * Modes:
 * 0 - Ripple Pool: circular waves spread from cursor path like stone in water
 * 1 - Standing Waves: click to place nodes, waves form stable resonant patterns
 * 2 - Doppler Shift: waves compress ahead of cursor, stretch behind (color shifts)
 * 3 - Cymatics: waves form Chladni-like geometric patterns on a virtual plate
 * 4 - Sonar Pulse: periodic pings from cursor with echo returns off screen edges
 * 5 - Oscilloscope: waves drawn as waveforms that scroll and morph
 */

export class SoundWaveSculptor {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 180;
        this.saturation = 60;

        // Wave emitters
        this.waves = [];
        this.wavePool = [];
        this.maxWaves = 40;

        // Standing wave nodes
        this.nodes = [];
        this.maxNodes = 8;

        // Mouse
        this._mx = 0;
        this._my = 0;
        this._prevMx = 0;
        this._prevMy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._moveAccum = 0;

        // Mode params
        this.waveSpeed = 3;
        this.waveDecay = 0.985;
        this.baseFreq = 0.05;
        this.colorShift = 0;
        this.emitThreshold = 15;

        // Sonar
        this.sonarInterval = 60;
        this.sonarEchoes = [];

        // Oscilloscope
        this.scopeHistory = [];
        this.scopeMax = 200;

        // Cymatics
        this._cymaticGrid = null;
        this._cymaticCols = 0;
        this._cymaticRows = 0;
    }

    configure(rng, hues) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = hues.length > 0 ? hues[Math.floor(rng() * hues.length)].h : Math.floor(rng() * 360);
        this.saturation = 40 + Math.floor(rng() * 40);
        this.waves = [];
        this.nodes = [];
        this.sonarEchoes = [];
        this.scopeHistory = [];
        this._moveAccum = 0;

        this.waveSpeed = 2 + rng() * 3;
        this.waveDecay = 0.975 + rng() * 0.02;
        this.baseFreq = 0.03 + rng() * 0.05;
        this.colorShift = rng() * 60;
        this.emitThreshold = 10 + rng() * 20;
        this.sonarInterval = 40 + Math.floor(rng() * 40);

        // Cymatics grid
        if (this.mode === 3) {
            const cellSize = 6 + Math.floor(rng() * 4);
            this._cymaticCols = Math.ceil(window.innerWidth / cellSize);
            this._cymaticRows = Math.ceil(window.innerHeight / cellSize);
            this._cymaticCellSize = cellSize;
            this._cymaticGrid = new Float32Array(this._cymaticCols * this._cymaticRows);
            this._cymaticDamping = 0.96 + rng() * 0.03;
        }
    }

    _emitWave(x, y, freq, amp) {
        if (this.waves.length >= this.maxWaves) {
            // Recycle oldest
            const old = this.waves.shift();
            this.wavePool.push(old);
        }
        const w = this.wavePool.length > 0 ? this.wavePool.pop() : {};
        w.x = x;
        w.y = y;
        w.radius = 0;
        w.freq = freq;
        w.amp = amp;
        w.phase = 0;
        w.maxRadius = 200 + amp * 100;
        this.waves.push(w);
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._prevMx = this._mx;
        this._prevMy = this._my;
        this._mx = mx;
        this._my = my;

        const dx = mx - this._prevMx;
        const dy = my - this._prevMy;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._moveAccum += this._mouseSpeed;

        // Handle clicks
        if (isClicking && !this._wasClicking) {
            if (this.mode === 1) {
                // Place standing wave node
                this.nodes.push({ x: mx, y: my, phase: 0, freq: this.baseFreq * (1 + Math.random()) });
                if (this.nodes.length > this.maxNodes) this.nodes.shift();
            } else {
                // Shockwave
                this._emitWave(mx, my, this.baseFreq * 2, 1.5);
            }
        }
        this._wasClicking = isClicking;

        // Emit waves based on movement
        if (this._moveAccum > this.emitThreshold && this.mode !== 1) {
            this._moveAccum = 0;
            const freq = this.baseFreq * (0.5 + Math.min(this._mouseSpeed / 20, 2));
            const amp = 0.3 + Math.min(this._mouseSpeed / 30, 0.7);
            this._emitWave(mx, my, freq, amp);
        }

        // Sonar pings
        if (this.mode === 4 && this.tick % this.sonarInterval === 0) {
            this._emitWave(mx, my, this.baseFreq, 0.8);
        }

        // Update waves
        for (let i = this.waves.length - 1; i >= 0; i--) {
            const w = this.waves[i];
            w.radius += this.waveSpeed;
            w.amp *= this.waveDecay;
            w.phase += w.freq;
            if (w.amp < 0.01 || w.radius > w.maxRadius) {
                this.wavePool.push(w);
                this.waves[i] = this.waves[this.waves.length - 1];
                this.waves.pop();
            }
        }

        // Cymatics grid update
        if (this.mode === 3 && this._cymaticGrid) {
            const cols = this._cymaticCols;
            const rows = this._cymaticRows;
            const cs = this._cymaticCellSize;

            // Add wave energy at cursor
            const gx = Math.floor(mx / cs);
            const gy = Math.floor(my / cs);
            if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
                this._cymaticGrid[gy * cols + gx] += this._mouseSpeed * 0.01;
            }

            // Add wave energy from clicks
            if (isClicking) {
                const radius = 3;
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let ddx = -radius; ddx <= radius; ddx++) {
                        const nx = gx + ddx;
                        const ny = gy + dy;
                        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                            const d = Math.sqrt(ddx * ddx + dy * dy);
                            if (d <= radius) {
                                this._cymaticGrid[ny * cols + nx] += 0.05 * (1 - d / radius);
                            }
                        }
                    }
                }
            }

            // Decay
            const damp = this._cymaticDamping;
            for (let i = 0; i < this._cymaticGrid.length; i++) {
                this._cymaticGrid[i] *= damp;
            }
        }

        // Oscilloscope history
        if (this.mode === 5) {
            this.scopeHistory.push({
                y: my,
                speed: this._mouseSpeed,
                click: isClicking,
            });
            if (this.scopeHistory.length > this.scopeMax) {
                this.scopeHistory = this.scopeHistory.slice(-this.scopeMax);
            }
        }

        // Sonar echoes from edges
        if (this.mode === 4) {
            const w = window.innerWidth;
            const h = window.innerHeight;
            for (let i = this.sonarEchoes.length - 1; i >= 0; i--) {
                this.sonarEchoes[i].radius += this.waveSpeed * 0.7;
                this.sonarEchoes[i].amp *= 0.98;
                if (this.sonarEchoes[i].amp < 0.01) {
                    this.sonarEchoes[i] = this.sonarEchoes[this.sonarEchoes.length - 1];
                    this.sonarEchoes.pop();
                }
            }
            // Check waves hitting edges
            for (const wave of this.waves) {
                if (wave.radius > 5 && !wave._echoed) {
                    const hitEdge =
                        wave.x - wave.radius < 0 ||
                        wave.x + wave.radius > w ||
                        wave.y - wave.radius < 0 ||
                        wave.y + wave.radius > h;
                    if (hitEdge) {
                        wave._echoed = true;
                        // Create echo from nearest edge
                        const edges = [
                            { x: 0, y: wave.y },
                            { x: w, y: wave.y },
                            { x: wave.x, y: 0 },
                            { x: wave.x, y: h },
                        ];
                        for (const edge of edges) {
                            const edx = edge.x - wave.x;
                            const edy = edge.y - wave.y;
                            const edist = Math.sqrt(edx * edx + edy * edy);
                            if (edist < wave.radius + 20 && this.sonarEchoes.length < 20) {
                                this.sonarEchoes.push({
                                    x: edge.x, y: edge.y,
                                    radius: 0, amp: wave.amp * 0.4,
                                    hueShift: 60,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        switch (this.mode) {
            case 0: this._drawRipplePool(ctx, system); break;
            case 1: this._drawStandingWaves(ctx, system); break;
            case 2: this._drawDopplerShift(ctx, system); break;
            case 3: this._drawCymatics(ctx, system); break;
            case 4: this._drawSonar(ctx, system); break;
            case 5: this._drawOscilloscope(ctx, system); break;
        }

        ctx.restore();
    }

    _drawRipplePool(ctx, system) {
        for (const w of this.waves) {
            const alpha = w.amp * 0.3;
            if (alpha < 0.005) continue;
            const hue = (this.hue + w.radius * 0.2) % 360;
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 60%, ${alpha})`;
            ctx.lineWidth = 1 + w.amp;
            ctx.beginPath();
            ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner interference ring
            if (w.radius > 15) {
                ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 55%, ${alpha * 0.4})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.arc(w.x, w.y, w.radius * 0.6, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    _drawStandingWaves(ctx, system) {
        const w = system.width;
        const h = system.height;

        // Draw interference pattern from nodes
        if (this.nodes.length > 0) {
            const step = 8;
            for (let x = 0; x < w; x += step) {
                for (let y = 0; y < h; y += step) {
                    let totalAmp = 0;
                    for (const node of this.nodes) {
                        const dx = x - node.x;
                        const dy = y - node.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        totalAmp += Math.sin(dist * node.freq + this.tick * 0.05 + node.phase) / (1 + dist * 0.005);
                    }
                    const normalized = (totalAmp / this.nodes.length + 1) / 2;
                    if (normalized > 0.55 || normalized < 0.45) {
                        const intensity = Math.abs(normalized - 0.5) * 2;
                        const hue = (this.hue + normalized * this.colorShift) % 360;
                        const alpha = intensity * 0.15;
                        ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, 55%, ${alpha})`;
                        ctx.fillRect(x, y, step, step);
                    }
                }
            }

            // Draw node markers
            for (const node of this.nodes) {
                ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, 80%, 0.3)`;
                ctx.beginPath();
                ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    _drawDopplerShift(ctx, system) {
        const speed = this._mouseSpeed;
        const dirX = this._mx - this._prevMx;
        const dirY = this._my - this._prevMy;
        const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
        const ndx = dirX / dirLen;
        const ndy = dirY / dirLen;

        for (const w of this.waves) {
            const alpha = w.amp * 0.25;
            if (alpha < 0.005) continue;

            // Draw wave as segments with color shift based on direction
            const segments = 32;
            for (let s = 0; s < segments; s++) {
                const a1 = (s / segments) * Math.PI * 2;
                const a2 = ((s + 1) / segments) * Math.PI * 2;

                // Doppler: compress in front, stretch behind
                const segDirX = Math.cos((a1 + a2) / 2);
                const segDirY = Math.sin((a1 + a2) / 2);
                const dot = segDirX * ndx + segDirY * ndy; // -1 to 1

                const hueShift = dot * Math.min(speed * 3, 60);
                const hue = (this.hue + hueShift + this.colorShift + 360) % 360;
                const radiusMod = 1 - dot * Math.min(speed * 0.01, 0.15);

                ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 60%, ${alpha})`;
                ctx.lineWidth = 1 + w.amp * 0.5;
                ctx.beginPath();
                ctx.arc(w.x, w.y, w.radius * radiusMod, a1, a2);
                ctx.stroke();
            }
        }
    }

    _drawCymatics(ctx, system) {
        if (!this._cymaticGrid) return;
        const cols = this._cymaticCols;
        const rows = this._cymaticRows;
        const cs = this._cymaticCellSize;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const val = this._cymaticGrid[y * cols + x];
                if (Math.abs(val) < 0.005) continue;

                const intensity = Math.min(Math.abs(val), 1);
                const hue = (this.hue + val * 60 + 360) % 360;
                const alpha = intensity * 0.2;
                ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, 55%, ${alpha})`;
                ctx.fillRect(x * cs, y * cs, cs, cs);
            }
        }
    }

    _drawSonar(ctx, system) {
        // Main waves
        for (const w of this.waves) {
            const alpha = w.amp * 0.2;
            if (alpha < 0.005) continue;

            // Sweeping arc effect
            const sweep = (this.tick * 0.02) % (Math.PI * 2);
            ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 55%, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Brighter sweep segment
            ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 70%, ${alpha * 2})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(w.x, w.y, w.radius, sweep, sweep + 0.5);
            ctx.stroke();
        }

        // Echo waves (different color)
        for (const e of this.sonarEchoes) {
            const alpha = e.amp * 0.15;
            if (alpha < 0.005) continue;
            const hue = (this.hue + (e.hueShift || 0)) % 360;
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 50%, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    _drawOscilloscope(ctx, system) {
        if (this.scopeHistory.length < 2) return;
        const w = system.width;
        const h = system.height;
        const len = this.scopeHistory.length;

        // Draw as scrolling waveform across the screen
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        // Main trace
        ctx.beginPath();
        for (let i = 0; i < len; i++) {
            const x = (i / this.scopeMax) * w;
            const entry = this.scopeHistory[i];
            const waveY = entry.y + Math.sin(i * this.baseFreq * 5 + this.tick * 0.03) * (10 + entry.speed * 2);

            if (i === 0) ctx.moveTo(x, waveY);
            else ctx.lineTo(x, waveY);
        }
        ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 60%, 0.2)`;
        ctx.stroke();

        // Phosphor glow on recent part
        const recentStart = Math.max(0, len - 40);
        ctx.beginPath();
        for (let i = recentStart; i < len; i++) {
            const x = (i / this.scopeMax) * w;
            const entry = this.scopeHistory[i];
            const waveY = entry.y + Math.sin(i * this.baseFreq * 5 + this.tick * 0.03) * (10 + entry.speed * 2);
            if (i === recentStart) ctx.moveTo(x, waveY);
            else ctx.lineTo(x, waveY);
        }
        ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 75%, 0.35)`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Click markers as vertical spikes
        for (let i = 0; i < len; i++) {
            if (this.scopeHistory[i].click) {
                const x = (i / this.scopeMax) * w;
                ctx.strokeStyle = `hsla(${(this.hue + 60) % 360}, 80%, 65%, 0.15)`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
        }
    }
}
