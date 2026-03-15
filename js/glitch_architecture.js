/**
 * @file glitch_architecture.js
 * @description Defines the Glitch architecture with multiple seed-driven glitch modes,
 * chromatic aberration, smear trails, screen tears, gravity corruption, cursor corruption,
 * and periodic glitch burst events.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

// Glitch mode constants
const MODE_DATA_MOSH   = 0;
const MODE_CRT         = 1;
const MODE_VHS         = 2;
const MODE_DIGITAL_RAIN = 3;
const MODE_PIXEL_DISSOLVE = 4;
const NUM_MODES = 5;

// Pool limits
const MAX_BLOCKS = 80;
const MAX_TEARS = 20;
const MAX_SMEARS = 200;
const MAX_CORRUPTION_ZONES = 8;
const MAX_STATIC_PARTICLES = 120;
const MAX_RAIN_COLUMNS = 60;
const MAX_DISSOLVE_CELLS = 150;

export class GlitchArchitecture extends Architecture {
    constructor() {
        super();
        this.blocks = [];
        this.smears = [];
        this.tears = [];
        this.corruptionZones = [];
        this.staticParticles = [];
        this.rainColumns = [];
        this.dissolveCells = [];
        this.glitchTimer = 0;
        this.chromaticFrames = 0;
        this.burstFrames = 0;
        this.burstTimer = 0;
        this.screenShakeX = 0;
        this.screenShakeY = 0;
        this.glitchMode = 0;
        this.gravityCorruptionRadius = 0;
        this.gravityCorruptionX = 0;
        this.gravityCorruptionY = 0;
        this.gravityCorruptionLife = 0;
        this.crtCurvature = 0;
        this.vhsTrackingOffset = 0;
        this.vhsTrackingDir = 1;
    }

    init(system) {
        // Seed-driven mode selection
        this.glitchMode = Math.floor(system.rng() * NUM_MODES);

        // Seed-driven parameters
        const seedVariance = system.rng();
        const blockCount = Math.floor(20 + seedVariance * 50); // 20-70
        const baseSpeed = 1 + system.rng() * 5;               // 1-6
        const sizeScale = 0.5 + system.rng() * 1.5;           // 0.5-2.0
        const hueSpread = 20 + system.rng() * 100;            // 20-120

        this.crtCurvature = 0.002 + system.rng() * 0.006;
        this.vhsTrackingOffset = 0;
        this.vhsTrackingDir = system.rng() > 0.5 ? 1 : -1;

        // Init blocks
        this.blocks = [];
        const count = Math.min(blockCount, MAX_BLOCKS);
        for (let i = 0; i < count; i++) {
            this.blocks.push(this._createBlock(system, baseSpeed, sizeScale, hueSpread));
        }

        // Init other arrays
        this.smears = [];
        this.tears = [];
        this.corruptionZones = [];
        this.staticParticles = [];
        this.dissolveCells = [];

        // Init rain columns for digital rain mode
        this.rainColumns = [];
        if (this.glitchMode === MODE_DIGITAL_RAIN) {
            const colCount = Math.min(Math.floor(15 + system.rng() * 30), MAX_RAIN_COLUMNS);
            for (let i = 0; i < colCount; i++) {
                this.rainColumns.push({
                    x: system.rng() * system.width,
                    y: system.rng() * system.height,
                    speed: 1 + system.rng() * 4,
                    charCount: Math.floor(5 + system.rng() * 20),
                    hue: (system.hue + system.rng() * 40 - 20 + 360) % 360,
                    alpha: 0.3 + system.rng() * 0.5,
                    charWidth: 8 + Math.floor(system.rng() * 8)
                });
            }
        }

        // Init dissolve cells for pixel dissolve mode
        if (this.glitchMode === MODE_PIXEL_DISSOLVE) {
            const cellCount = Math.min(Math.floor(40 + system.rng() * 80), MAX_DISSOLVE_CELLS);
            for (let i = 0; i < cellCount; i++) {
                this.dissolveCells.push({
                    x: system.rng() * system.width,
                    y: system.rng() * system.height,
                    size: 4 + system.rng() * 20,
                    life: 30 + system.rng() * 120,
                    maxLife: 30 + system.rng() * 120,
                    hue: (system.hue + system.rng() * hueSpread - hueSpread / 2 + 360) % 360,
                    driftX: (system.rng() - 0.5) * 2,
                    driftY: system.rng() * 2 + 0.5
                });
            }
        }

        this.chromaticFrames = 0;
        this.burstFrames = 0;
        this.burstTimer = Math.floor(60 + system.rng() * 180);
        this.glitchTimer = 0;
        this.gravityCorruptionLife = 0;
        this.gravityCorruptionRadius = 0;
        this.screenShakeX = 0;
        this.screenShakeY = 0;
    }

    _createBlock(system, baseSpeed, sizeScale, hueSpread) {
        const isVertical = system.rng() > 0.75;
        return {
            x: system.rng() * system.width,
            y: system.rng() * system.height,
            w: (system.rng() * 150 + 30) * sizeScale,
            h: (system.rng() * 25 + 4) * sizeScale,
            vx: (system.rng() - 0.5) * baseSpeed * 2,
            vy: (system.rng() - 0.5) * baseSpeed * 0.5,
            hue: (system.hue + (system.rng() - 0.5) * hueSpread + 360) % 360,
            alpha: system.rng() * 0.35 + 0.15,
            isVertical,
            prevX: 0,
            prevY: 0,
            smearCooldown: 0
        };
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;
        const spd = system.speedMultiplier;

        // --- Update blocks ---
        for (let i = 0; i < this.blocks.length; i++) {
            const b = this.blocks[i];
            b.prevX = b.x;
            b.prevY = b.y;

            if (b.isVertical) {
                b.y += b.vx * spd;
                b.x += b.vy * spd;
                if (b.y < -b.w) b.y = system.height;
                else if (b.y > system.height + b.w) b.y = -b.w;
                if (b.x < -b.h) b.x = system.width;
                else if (b.x > system.width + b.h) b.x = -b.h;
            } else {
                b.x += b.vx * spd;
                b.y += b.vy * spd;
                if (b.x < -b.w) b.x = system.width;
                else if (b.x > system.width + b.w) b.x = -b.w;
                if (b.y < -b.h) b.y = system.height;
                else if (b.y > system.height + b.h) b.y = -b.h;
            }

            // Mode-specific movement tweaks
            if (this.glitchMode === MODE_DATA_MOSH && system.rng() < 0.04) {
                // Data moshing: blocks randomly jump and duplicate their position
                b.x = system.rng() * system.width;
                b.w = b.w * (0.5 + system.rng());
            } else if (this.glitchMode === MODE_VHS && system.rng() < 0.015) {
                // VHS: horizontal offset jitter
                b.x += (system.rng() - 0.5) * 60;
            } else if (this.glitchMode === MODE_CRT && system.rng() < 0.01) {
                // CRT: occasional vertical roll
                b.y += system.rng() * 40 - 20;
            }

            // Random horizontal jumps
            if (system.rng() < 0.015) {
                b.x = system.rng() * system.width;
            }

            // Smear trail generation
            if (b.smearCooldown > 0) {
                b.smearCooldown--;
            } else {
                const moved = Math.abs(b.x - b.prevX) + Math.abs(b.y - b.prevY);
                if (moved > 3 && this.smears.length < MAX_SMEARS) {
                    this.smears.push({
                        x: b.prevX,
                        y: b.prevY,
                        w: b.isVertical ? b.h : b.w,
                        h: b.isVertical ? b.w : b.h,
                        hue: b.hue,
                        alpha: b.alpha * 0.5,
                        life: 12 + Math.floor(system.rng() * 12)
                    });
                    b.smearCooldown = 2;
                }
            }

            // Gravity well response: sustained expanding corruption
            if (system.isGravityWell) {
                const dx = b.x + b.w / 2 - mx;
                const dy = b.y + b.h / 2 - my;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 350) {
                    const force = (350 - dist) / 350;
                    b.vx += (dx / (dist || 1)) * force * 6;
                    b.vy += (dy / (dist || 1)) * force * 3;
                    b.vx = Math.max(-15, Math.min(15, b.vx));
                    b.vy = Math.max(-10, Math.min(10, b.vy));
                    b.alpha = Math.min(0.9, b.alpha + 0.05);
                    b.hue = (b.hue + 5) % 360;
                }

                // Set gravity corruption zone
                this.gravityCorruptionX = mx;
                this.gravityCorruptionY = my;
                this.gravityCorruptionRadius = Math.min(this.gravityCorruptionRadius + 4, 300);
                this.gravityCorruptionLife = 40;
            }

            // Shockwave response
            if (system.shockwaves) {
                for (let s = 0; s < system.shockwaves.length; s++) {
                    const sw = system.shockwaves[s];
                    const sdx = b.x + b.w / 2 - sw.x;
                    const sdy = b.y + b.h / 2 - sw.y;
                    const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
                    if (Math.abs(sDist - sw.radius) < 100) {
                        b.x += (system.rng() - 0.5) * 120;
                        b.y += (system.rng() - 0.5) * 60;
                        b.vx = (system.rng() - 0.5) * 14;
                    }
                }
            }

            // Dampen velocities slowly
            b.vx *= 0.995;
            b.vy *= 0.995;
        }

        // --- Update smear trails ---
        for (let i = this.smears.length - 1; i >= 0; i--) {
            this.smears[i].life--;
            this.smears[i].alpha *= 0.88;
            if (this.smears[i].life <= 0) {
                this.smears.splice(i, 1);
            }
        }

        // --- Update screen tears ---
        for (let i = this.tears.length - 1; i >= 0; i--) {
            this.tears[i].life--;
            if (this.tears[i].life <= 0) {
                this.tears.splice(i, 1);
            }
        }

        // Generate new tears
        if (system.rng() < 0.08 && this.tears.length < MAX_TEARS) {
            const tearCount = Math.floor(system.rng() * 3) + 1;
            for (let i = 0; i < tearCount && this.tears.length < MAX_TEARS; i++) {
                this.tears.push({
                    y: system.rng() * system.height,
                    h: system.rng() * 6 + 1,
                    offset: (system.rng() - 0.5) * 50,
                    life: Math.floor(system.rng() * 8) + 2,
                    intensity: 0.3 + system.rng() * 0.7
                });
            }
        }

        // --- Glitch burst events ---
        this.burstTimer--;
        if (this.burstTimer <= 0) {
            this.burstFrames = Math.floor(8 + system.rng() * 15);
            this.burstTimer = Math.floor(90 + system.rng() * 250);
            // Trigger many tears during burst
            for (let i = 0; i < 8 && this.tears.length < MAX_TEARS; i++) {
                this.tears.push({
                    y: system.rng() * system.height,
                    h: system.rng() * 10 + 2,
                    offset: (system.rng() - 0.5) * 100,
                    life: Math.floor(system.rng() * 12) + 4,
                    intensity: 0.6 + system.rng() * 0.4
                });
            }
        }

        // Screen shake during burst
        if (this.burstFrames > 0) {
            this.burstFrames--;
            const shakeIntensity = this.burstFrames * 0.8;
            this.screenShakeX = (system.rng() - 0.5) * shakeIntensity;
            this.screenShakeY = (system.rng() - 0.5) * shakeIntensity;
            this.chromaticFrames = Math.max(this.chromaticFrames, this.burstFrames);
        } else {
            this.screenShakeX *= 0.7;
            this.screenShakeY *= 0.7;
            if (Math.abs(this.screenShakeX) < 0.1) this.screenShakeX = 0;
            if (Math.abs(this.screenShakeY) < 0.1) this.screenShakeY = 0;
        }

        // --- Periodic chromatic glitch timer ---
        this.glitchTimer--;
        if (this.glitchTimer <= 0) {
            this.glitchTimer = Math.floor(system.rng() * 40) + 12;
            this.chromaticFrames = Math.max(this.chromaticFrames, 3);
        }
        if (this.chromaticFrames > 0) this.chromaticFrames--;

        // --- Gravity corruption decay ---
        if (this.gravityCorruptionLife > 0) {
            this.gravityCorruptionLife--;
            if (!system.isGravityWell) {
                this.gravityCorruptionRadius *= 0.94;
            }
        } else {
            this.gravityCorruptionRadius *= 0.9;
        }

        // --- Update static particles for gravity corruption ---
        for (let i = this.staticParticles.length - 1; i >= 0; i--) {
            this.staticParticles[i].life--;
            if (this.staticParticles[i].life <= 0) {
                this.staticParticles.splice(i, 1);
            }
        }
        // Spawn static in gravity corruption zone
        if (this.gravityCorruptionRadius > 10) {
            const spawnCount = Math.min(6, MAX_STATIC_PARTICLES - this.staticParticles.length);
            for (let i = 0; i < spawnCount; i++) {
                const angle = system.rng() * Math.PI * 2;
                const r = system.rng() * this.gravityCorruptionRadius;
                this.staticParticles.push({
                    x: this.gravityCorruptionX + Math.cos(angle) * r,
                    y: this.gravityCorruptionY + Math.sin(angle) * r,
                    size: 1 + system.rng() * 5,
                    life: Math.floor(3 + system.rng() * 10),
                    bright: system.rng() > 0.5
                });
            }
        }

        // --- VHS tracking wobble ---
        if (this.glitchMode === MODE_VHS) {
            this.vhsTrackingOffset += this.vhsTrackingDir * (0.3 + system.rng() * 0.5) * spd;
            if (Math.abs(this.vhsTrackingOffset) > 15) {
                this.vhsTrackingDir *= -1;
            }
            if (system.rng() < 0.02) {
                this.vhsTrackingOffset += (system.rng() - 0.5) * 30;
            }
        }

        // --- Update rain columns ---
        if (this.glitchMode === MODE_DIGITAL_RAIN) {
            for (let i = 0; i < this.rainColumns.length; i++) {
                const col = this.rainColumns[i];
                col.y += col.speed * spd;
                if (col.y > system.height + col.charCount * 14) {
                    col.y = -col.charCount * 14;
                    col.x = system.rng() * system.width;
                }
            }
        }

        // --- Update dissolve cells ---
        if (this.glitchMode === MODE_PIXEL_DISSOLVE) {
            for (let i = 0; i < this.dissolveCells.length; i++) {
                const cell = this.dissolveCells[i];
                cell.life--;
                cell.x += cell.driftX * spd;
                cell.y += cell.driftY * spd;
                if (cell.life <= 0) {
                    // Respawn
                    cell.x = system.rng() * system.width;
                    cell.y = system.rng() * system.height;
                    cell.life = cell.maxLife;
                    cell.size = 4 + system.rng() * 20;
                }
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const mx = mouse.x;
        const my = mouse.y;
        const w = system.width;
        const h = system.height;

        ctx.save();

        // Apply screen shake
        if (this.screenShakeX !== 0 || this.screenShakeY !== 0) {
            ctx.translate(this.screenShakeX, this.screenShakeY);
        }

        // ====== SMEAR TRAILS (drawn behind blocks) ======
        for (let i = 0; i < this.smears.length; i++) {
            const s = this.smears[i];
            if (s.alpha < 0.01) continue;
            ctx.fillStyle = `hsla(${s.hue}, 70%, 45%, ${s.alpha})`;
            ctx.fillRect(s.x, s.y, s.w, s.h);
        }

        // ====== BLOCKS ======
        const isBurstActive = this.burstFrames > 0;
        for (let i = 0; i < this.blocks.length; i++) {
            const b = this.blocks[i];
            const isGlitched = (this.glitchTimer < 8 && system.rng() < 0.4) || isBurstActive;

            // Mouse displacement
            const dx = b.x + b.w / 2 - mx;
            const dy = b.y + b.h / 2 - my;
            const distSq = dx * dx + dy * dy;
            const offset = distSq < 40000 ? (1 - Math.sqrt(distSq) / 200) * 60 : 0;

            let drawX = b.isVertical ? b.x + offset : b.x + offset;
            let drawY = b.y;
            let drawW = b.isVertical ? b.h : b.w;
            let drawH = b.isVertical ? b.w : b.h;

            if (isGlitched && system.rng() < 0.6) {
                // Glitched block: random color, displaced, size variation
                const glitchHue = system.rng() > 0.3
                    ? b.hue
                    : (system.hue + system.rng() * 360) % 360;
                const bright = system.rng() > 0.4;
                ctx.fillStyle = bright
                    ? `hsla(${glitchHue}, 100%, ${60 + system.rng() * 30}%, ${0.6 + system.rng() * 0.4})`
                    : '#fff';
                ctx.fillRect(
                    drawX + (system.rng() - 0.5) * 80,
                    drawY + (system.rng() - 0.5) * 40,
                    drawW * (0.5 + system.rng() * 1.5),
                    drawH * (0.3 + system.rng() * 1.5)
                );
            } else {
                ctx.fillStyle = `hsla(${b.hue}, 80%, 50%, ${b.alpha})`;
                ctx.fillRect(drawX, drawY, drawW, drawH);

                // Mode-specific block decoration
                if (this.glitchMode === MODE_DATA_MOSH && system.rng() < 0.3) {
                    // Repeated/shifted copy
                    ctx.fillStyle = `hsla(${b.hue}, 90%, 60%, ${b.alpha * 0.4})`;
                    ctx.fillRect(drawX + drawW * 0.3, drawY + 2, drawW * 0.7, drawH);
                } else if (this.glitchMode === MODE_CRT) {
                    // Scanline over block
                    ctx.fillStyle = `rgba(0,0,0,0.2)`;
                    for (let sy = drawY; sy < drawY + drawH; sy += 3) {
                        ctx.fillRect(drawX, sy, drawW, 1);
                    }
                }
            }
        }

        // ====== SCREEN TEAR EFFECTS ======
        for (let i = 0; i < this.tears.length; i++) {
            const tear = this.tears[i];
            ctx.fillStyle = `hsla(${system.hue}, 60%, 50%, ${0.1 * tear.intensity})`;
            ctx.fillRect(tear.offset, tear.y, w, tear.h);

            // Draw a bright tear line
            ctx.fillStyle = `rgba(255,255,255,${0.15 * tear.intensity})`;
            ctx.fillRect(0, tear.y, w, 1);

            // Displace a strip by drawing offset colored rectangles
            ctx.fillStyle = `hsla(${(system.hue + 60) % 360}, 80%, 60%, ${0.08 * tear.intensity})`;
            ctx.fillRect(tear.offset * 1.5, tear.y - 1, w, tear.h + 2);
        }

        // ====== MODE-SPECIFIC EFFECTS ======
        this._drawModeEffects(system, ctx, tick, mx, my, w, h);

        // ====== CHROMATIC ABERRATION (mouse-reactive RGB separation) ======
        {
            // Base chromatic intensity from glitch timer
            let chromaBase = this.chromaticFrames > 0 ? 0.04 + this.chromaticFrames * 0.03 : 0;
            if (isBurstActive) chromaBase += 0.06;

            // Mouse-reactive: aberration direction and intensity based on mouse relative to center
            const relMX = (mx - w / 2) / (w / 2);   // -1 to 1
            const relMY = (my - h / 2) / (h / 2);   // -1 to 1
            const mouseDist = Math.sqrt(relMX * relMX + relMY * relMY);
            const mouseChroma = Math.min(mouseDist * 0.03, 0.05);

            const totalIntensity = chromaBase + mouseChroma;
            if (totalIntensity > 0.005) {
                const offsetX = relMX * totalIntensity * 150;
                const offsetY = relMY * totalIntensity * 80;

                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = `rgba(255, 0, 0, ${totalIntensity})`;
                ctx.fillRect(offsetX, offsetY, w, h);
                ctx.fillStyle = `rgba(0, 255, 0, ${totalIntensity * 0.5})`;
                ctx.fillRect(-offsetX * 0.5, -offsetY * 0.5, w, h);
                ctx.fillStyle = `rgba(0, 0, 255, ${totalIntensity})`;
                ctx.fillRect(-offsetX, -offsetY, w, h);
                ctx.globalCompositeOperation = 'source-over';
            }
        }

        // ====== INTERACTIVE DATA CORRUPTION AROUND CURSOR ======
        {
            const corruptRadius = 100;
            const corruptCount = 15;
            ctx.save();
            for (let i = 0; i < corruptCount; i++) {
                const angle = system.rng() * Math.PI * 2;
                const r = system.rng() * corruptRadius;
                const cx = mx + Math.cos(angle) * r;
                const cy = my + Math.sin(angle) * r;
                const cw = 3 + system.rng() * 25;
                const ch = 1 + system.rng() * 6;
                const proximity = 1 - (r / corruptRadius);
                const alpha = proximity * 0.25;
                if (system.rng() > 0.5) {
                    ctx.fillStyle = `hsla(${(system.hue + system.rng() * 60) % 360}, 100%, ${50 + system.rng() * 40}%, ${alpha})`;
                } else {
                    const v = Math.floor(system.rng() * 255);
                    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * 0.8})`;
                }
                ctx.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
            }
            // Thin corruption lines near cursor
            ctx.strokeStyle = `hsla(${system.hue}, 80%, 70%, 0.15)`;
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                const ly = my + (system.rng() - 0.5) * corruptRadius;
                ctx.beginPath();
                ctx.moveTo(mx - corruptRadius * 0.5, ly);
                ctx.lineTo(mx + corruptRadius * 0.5, ly);
                ctx.stroke();
            }
            ctx.restore();
        }

        // ====== GRAVITY WELL CORRUPTION ZONE ======
        if (this.gravityCorruptionRadius > 5) {
            ctx.save();
            // Static noise particles
            for (let i = 0; i < this.staticParticles.length; i++) {
                const p = this.staticParticles[i];
                const bright = p.bright ? 255 : Math.floor(system.rng() * 150);
                const a = (p.life / 12) * 0.6;
                ctx.fillStyle = `rgba(${bright},${bright},${bright},${a})`;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }

            // Corruption ring
            const gcr = this.gravityCorruptionRadius;
            ctx.strokeStyle = `hsla(${(system.hue + 180) % 360}, 100%, 60%, ${0.15 * (this.gravityCorruptionLife / 40)})`;
            ctx.lineWidth = 2 + system.rng() * 3;
            ctx.beginPath();
            ctx.arc(this.gravityCorruptionX, this.gravityCorruptionY, gcr, 0, Math.PI * 2);
            ctx.stroke();

            // Inner corruption bands
            const bandCount = Math.min(6, Math.floor(gcr / 30));
            for (let i = 0; i < bandCount; i++) {
                const bandR = gcr * (0.3 + (i / bandCount) * 0.7);
                const bandY = this.gravityCorruptionY - bandR * 0.3 + system.rng() * bandR * 0.6;
                const bandW = bandR * 2;
                const bandH = 2 + system.rng() * 4;
                ctx.fillStyle = `hsla(${(system.hue + i * 30) % 360}, 90%, 50%, ${0.1 + system.rng() * 0.1})`;
                ctx.fillRect(this.gravityCorruptionX - bandW / 2 + (system.rng() - 0.5) * 20, bandY, bandW, bandH);
            }
            ctx.restore();
        }

        // ====== MODE-SPECIFIC OVERLAY ======
        if (this.glitchMode === MODE_CRT) {
            // CRT scanlines overlay
            ctx.fillStyle = 'rgba(0,0,0,0.06)';
            for (let y = 0; y < h; y += 3) {
                ctx.fillRect(0, y, w, 1);
            }
            // CRT vignette
            const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.75);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, 'rgba(0,0,0,0.3)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        } else if (this.glitchMode === MODE_VHS) {
            // VHS bottom tracking bar
            const barH = 6 + Math.abs(this.vhsTrackingOffset) * 0.5;
            const barY = h - barH - 10 + this.vhsTrackingOffset * 0.5;
            ctx.fillStyle = `rgba(255,255,255,0.06)`;
            ctx.fillRect(0, barY, w, barH);
            // VHS noise band at top
            if (system.rng() < 0.3) {
                ctx.fillStyle = `rgba(255,255,255,0.04)`;
                ctx.fillRect(0, system.rng() * 30, w, 2 + system.rng() * 4);
            }
        }

        // ====== BURST FLASH ======
        if (isBurstActive && this.burstFrames > 8) {
            ctx.fillStyle = `rgba(255,255,255,${0.03 * (this.burstFrames - 8)})`;
            ctx.fillRect(0, 0, w, h);
        }

        ctx.restore();
    }

    _drawModeEffects(system, ctx, tick, mx, my, w, h) {
        switch (this.glitchMode) {
            case MODE_DATA_MOSH:
                this._drawDataMosh(system, ctx, tick, w, h);
                break;
            case MODE_CRT:
                this._drawCRT(system, ctx, tick, w, h);
                break;
            case MODE_VHS:
                this._drawVHS(system, ctx, tick, w, h);
                break;
            case MODE_DIGITAL_RAIN:
                this._drawDigitalRain(system, ctx, tick, w, h);
                break;
            case MODE_PIXEL_DISSOLVE:
                this._drawPixelDissolve(system, ctx, tick, w, h);
                break;
        }
    }

    _drawDataMosh(system, ctx, tick, w, h) {
        // Data moshing: horizontal strip repetitions and color bleeds
        const stripCount = 3 + Math.floor(system.rng() * 4);
        for (let i = 0; i < stripCount; i++) {
            const sy = system.rng() * h;
            const sh = 2 + system.rng() * 15;
            const sx = system.rng() * w * 0.5;
            const sw = 50 + system.rng() * 200;
            const dx = sx + (system.rng() - 0.5) * 100;
            ctx.fillStyle = `hsla(${(system.hue + system.rng() * 50) % 360}, 70%, 50%, ${0.06 + system.rng() * 0.08})`;
            ctx.fillRect(dx, sy, sw, sh);
            // "Repeated" strip echo
            ctx.fillStyle = `hsla(${(system.hue + 20) % 360}, 60%, 45%, 0.04)`;
            ctx.fillRect(dx + sw * 0.1, sy + sh, sw * 0.9, sh * 0.6);
        }

        // Block duplication artifacts
        if (tick % 4 === 0) {
            for (let i = 0; i < 2; i++) {
                const ax = system.rng() * w;
                const ay = system.rng() * h;
                const aw = 20 + system.rng() * 80;
                const ah = 10 + system.rng() * 30;
                ctx.fillStyle = `hsla(${system.hue}, 50%, 40%, 0.05)`;
                ctx.fillRect(ax, ay, aw, ah);
                ctx.fillRect(ax + aw * 0.3, ay + 2, aw, ah); // shifted copy
            }
        }
    }

    _drawCRT(system, ctx, tick, w, h) {
        // Phosphor glow lines
        if (tick % 3 === 0) {
            const glowY = (tick * 2.5) % (h + 40) - 20;
            ctx.fillStyle = `rgba(100,255,100,0.025)`;
            ctx.fillRect(0, glowY, w, 20);
        }

        // Electron beam flicker
        if (system.rng() < 0.15) {
            const flickerY = system.rng() * h;
            ctx.fillStyle = `hsla(${system.hue}, 40%, 70%, 0.04)`;
            ctx.fillRect(0, flickerY, w, 1);
        }

        // Color fringing on random horizontal bands
        if (tick % 8 === 0) {
            const bandY = system.rng() * h;
            const bandH = 2 + system.rng() * 6;
            ctx.fillStyle = `rgba(255,0,0,0.03)`;
            ctx.fillRect(2, bandY, w, bandH);
            ctx.fillStyle = `rgba(0,0,255,0.03)`;
            ctx.fillRect(-2, bandY, w, bandH);
        }
    }

    _drawVHS(system, ctx, tick, w, h) {
        // VHS tracking lines
        const trackY = ((tick * 1.5 + this.vhsTrackingOffset * 10) % (h + 80)) - 40;
        ctx.fillStyle = `rgba(255,255,255,0.03)`;
        ctx.fillRect(0, trackY, w, 30);

        // Horizontal noise bands
        const noiseBands = 2 + Math.floor(system.rng() * 3);
        for (let i = 0; i < noiseBands; i++) {
            const ny = system.rng() * h;
            const nh = 1 + system.rng() * 3;
            const nOffset = (system.rng() - 0.5) * 20;
            ctx.fillStyle = `rgba(255,255,255,${0.03 + system.rng() * 0.05})`;
            ctx.fillRect(nOffset, ny, w, nh);
        }

        // Color bleed at bottom
        const bleedH = 15 + Math.abs(this.vhsTrackingOffset);
        ctx.fillStyle = `hsla(${system.hue}, 60%, 50%, 0.03)`;
        ctx.fillRect(0, h - bleedH, w, bleedH);

        // Sporadic horizontal tearing
        if (system.rng() < 0.1) {
            const tearY = system.rng() * h;
            const tearOffset = (system.rng() - 0.5) * 40;
            ctx.fillStyle = `hsla(${system.hue}, 80%, 60%, 0.06)`;
            ctx.fillRect(tearOffset, tearY, w, 2);
        }
    }

    _drawDigitalRain(system, ctx, tick, w, h) {
        // Draw falling character columns
        ctx.save();
        for (let i = 0; i < this.rainColumns.length; i++) {
            const col = this.rainColumns[i];
            const charH = 14;
            for (let j = 0; j < col.charCount; j++) {
                const cy = col.y - j * charH;
                if (cy < -charH || cy > h + charH) continue;
                const fade = 1 - (j / col.charCount);
                const alpha = col.alpha * fade;
                if (alpha < 0.02) continue;

                // Draw as small rectangles (pseudo-characters, avoids font rendering cost)
                const isHead = j === 0;
                if (isHead) {
                    ctx.fillStyle = `hsla(${col.hue}, 100%, 90%, ${alpha})`;
                } else {
                    ctx.fillStyle = `hsla(${col.hue}, 80%, 55%, ${alpha})`;
                }
                // Pseudo-character: small block pattern
                const cx = col.x;
                const cw = col.charWidth;
                const pattern = Math.floor(system.rng() * 4);
                if (pattern === 0) {
                    ctx.fillRect(cx, cy, cw, charH - 2);
                } else if (pattern === 1) {
                    ctx.fillRect(cx, cy, cw * 0.6, charH - 2);
                    ctx.fillRect(cx + cw * 0.4, cy + charH * 0.3, cw * 0.6, charH * 0.4);
                } else if (pattern === 2) {
                    ctx.fillRect(cx + cw * 0.2, cy, cw * 0.6, charH - 2);
                } else {
                    ctx.fillRect(cx, cy, cw, 2);
                    ctx.fillRect(cx, cy + charH - 4, cw, 2);
                    ctx.fillRect(cx, cy, 2, charH - 2);
                }
            }
        }

        // Background corruption streaks
        if (tick % 5 === 0) {
            const streakCount = 3 + Math.floor(system.rng() * 4);
            for (let i = 0; i < streakCount; i++) {
                const sx = system.rng() * w;
                ctx.fillStyle = `hsla(${system.hue}, 100%, 70%, 0.04)`;
                ctx.fillRect(sx, 0, 1, h);
            }
        }
        ctx.restore();
    }

    _drawPixelDissolve(system, ctx, tick, w, h) {
        // Draw dissolving pixel cells
        for (let i = 0; i < this.dissolveCells.length; i++) {
            const cell = this.dissolveCells[i];
            const lifeRatio = cell.life / cell.maxLife;
            const alpha = lifeRatio * 0.4;
            if (alpha < 0.01) continue;

            ctx.fillStyle = `hsla(${cell.hue}, 70%, 50%, ${alpha})`;

            // As life decreases, the cell "dissolves" into smaller fragments
            if (lifeRatio > 0.6) {
                ctx.fillRect(cell.x, cell.y, cell.size, cell.size);
            } else if (lifeRatio > 0.3) {
                // Fragment into quarters
                const half = cell.size / 2;
                const gap = (1 - lifeRatio) * 4;
                ctx.fillRect(cell.x - gap, cell.y - gap, half, half);
                ctx.fillRect(cell.x + half + gap, cell.y - gap, half, half);
                ctx.fillRect(cell.x - gap, cell.y + half + gap, half, half);
                ctx.fillRect(cell.x + half + gap, cell.y + half + gap, half, half);
            } else {
                // Tiny scattered particles
                const count = 4;
                const spread = cell.size * (1 + (1 - lifeRatio) * 3);
                for (let j = 0; j < count; j++) {
                    const px = cell.x + cell.size / 2 + (system.rng() - 0.5) * spread;
                    const py = cell.y + cell.size / 2 + (system.rng() - 0.5) * spread;
                    ctx.fillRect(px, py, 2, 2);
                }
            }
        }

        // Occasional dissolve wave
        if (tick % 60 < 3) {
            const waveY = (tick % 300) / 300 * h;
            ctx.fillStyle = `hsla(${system.hue}, 50%, 50%, 0.04)`;
            ctx.fillRect(0, waveY - 5, w, 10);
        }
    }
}
