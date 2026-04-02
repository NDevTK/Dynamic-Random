/**
 * @file post_processing.js
 * @description Seed-driven post-processing pipeline that applies visual effects
 * on top of the background canvas. Uses canvas composite modes for lightweight,
 * CSP-safe effects (no innerHTML).
 */

import { ui } from './state.js';

class PostProcessingSystem {
    constructor() {
        this.container = ui.canvasContainer;

        // Legacy CSS filter support
        this.filters = {
            blur: 0,
            brightness: 1,
            contrast: 1,
            grayscale: 0,
            hueRotate: 0,
            invert: 0,
            saturate: 1,
            sepia: 0
        };
        this.isScanlinesActive = false;
        this.scanlineOverlay = null;

        // Post-processing pipeline state
        this.initialized = false;
        this.bloomCanvas = null;
        this.bloomCtx = null;
        this.activeEffects = {
            bloom: false,
            colorGrading: false,
            filmEmulation: false,
            aberration: false,
            toneMapping: false
        };

        // Effect parameters (set by seed)
        this.colorGradingPreset = 'warm';
        this.aberrationOffset = 1;
        this.filmGrainDensity = 0.03;
        this.lightLeakPhase = 0;
        this.lightLeakAngle = 0;
    }

    /**
     * Initialize the post-processing pipeline.
     * Creates offscreen canvases for bloom etc.
     * @param {object} system - BackgroundSystem instance
     */
    init(system) {
        const scale = system.qualityScale || 1;
        const w = Math.ceil((system.width / 4) * scale);
        const h = Math.ceil((system.height / 4) * scale);

        this.bloomCanvas = document.createElement('canvas');
        this.bloomCanvas.width = w;
        this.bloomCanvas.height = h;
        this.bloomCtx = this.bloomCanvas.getContext('2d');

        this.initialized = true;
    }

    /**
     * Use the seeded RNG to determine which effects are active.
     * Called once per universe generation.
     * @param {function} rng - Seeded random function returning 0-1
     */
    setEffects(rng) {
        this.activeEffects.bloom = rng() < 0.30;
        this.activeEffects.colorGrading = rng() < 0.40;
        this.activeEffects.filmEmulation = rng() < 0.15;
        this.activeEffects.aberration = rng() < 0.20;
        this.activeEffects.toneMapping = rng() < 0.25;

        // Pick color grading preset
        const presets = ['warm', 'cool', 'vintage', 'neon', 'twilight'];
        this.colorGradingPreset = presets[Math.floor(rng() * presets.length)];

        // Aberration offset 1-2px
        this.aberrationOffset = 1 + Math.floor(rng() * 2);

        // Film grain density
        this.filmGrainDensity = 0.02 + rng() * 0.03;

        // Light leak starting phase and angle
        this.lightLeakPhase = Math.floor(rng() * 200);
        this.lightLeakAngle = rng() * Math.PI * 2;
    }

    /**
     * Apply active post-processing effects each frame.
     * @param {CanvasRenderingContext2D} ctx - Main canvas context
     * @param {object} system - BackgroundSystem instance
     */
    apply(ctx, system) {
        if (!this.initialized) return;

        const w = system.width;
        const h = system.height;

        if (this.activeEffects.toneMapping) {
            this._applyToneMapping(ctx, w, h);
        }
        if (this.activeEffects.colorGrading) {
            this._applyColorGrading(ctx, w, h, system);
        }
        if (this.activeEffects.bloom) {
            this._applyBloom(ctx, w, h, system);
        }
        if (this.activeEffects.filmEmulation) {
            this._applyFilmEmulation(ctx, w, h, system);
        }
        if (this.activeEffects.aberration) {
            this._applyAberration(ctx, w, h);
        }
    }

    // ── Bloom / Glow ──────────────────────────────────────────────────

    _applyBloom(ctx, w, h, system) {
        const bc = this.bloomCanvas;
        const bctx = this.bloomCtx;

        // Resize bloom canvas if main canvas dimensions changed
        const scale = system.qualityScale || 1;
        const bw = Math.ceil((w / 4) * scale);
        const bh = Math.ceil((h / 4) * scale);
        if (bc.width !== bw || bc.height !== bh) {
            bc.width = bw;
            bc.height = bh;
        }

        // Draw main canvas scaled down to 1/4 size (acts as blur approximation)
        bctx.clearRect(0, 0, bw, bh);
        bctx.drawImage(ctx.canvas, 0, 0, bw, bh);

        // Draw the small image back onto main canvas at full size with additive blending
        const prevAlpha = ctx.globalAlpha;
        const prevComp = ctx.globalCompositeOperation;

        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.15;
        ctx.drawImage(bc, 0, 0, w, h);

        // Second pass for softer spread
        ctx.globalAlpha = 0.08;
        ctx.drawImage(bc, 0, 0, w, h);

        ctx.globalAlpha = prevAlpha;
        ctx.globalCompositeOperation = prevComp;
    }

    // ── Color Grading ─────────────────────────────────────────────────

    _applyColorGrading(ctx, w, h, system) {
        const prevAlpha = ctx.globalAlpha;
        const prevComp = ctx.globalCompositeOperation;

        let color;
        let alpha;
        let compositeOp = 'source-over';

        switch (this.colorGradingPreset) {
            case 'warm':
                color = 'rgba(255, 140, 50, 1)';
                alpha = 0.03;
                compositeOp = 'multiply';
                break;
            case 'cool':
                color = 'rgba(50, 100, 255, 1)';
                alpha = 0.03;
                compositeOp = 'multiply';
                break;
            case 'vintage':
                color = 'rgba(180, 150, 100, 1)';
                alpha = 0.04;
                compositeOp = 'multiply';
                break;
            case 'neon':
                color = 'rgba(255, 255, 255, 1)';
                alpha = 0.03;
                compositeOp = 'overlay';
                break;
            case 'twilight':
                color = 'rgba(120, 50, 180, 1)';
                alpha = 0.03;
                compositeOp = 'multiply';
                break;
            default:
                color = 'rgba(255, 140, 50, 1)';
                alpha = 0.03;
                compositeOp = 'multiply';
        }

        // For neon, boost saturation with overlay + vivid color
        if (this.colorGradingPreset === 'neon') {
            ctx.globalCompositeOperation = 'overlay';
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, w, h);
        } else {
            ctx.globalCompositeOperation = compositeOp;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, w, h);
        }

        ctx.globalAlpha = prevAlpha;
        ctx.globalCompositeOperation = prevComp;
    }

    // ── Film Emulation ────────────────────────────────────────────────

    _applyFilmEmulation(ctx, w, h, system) {
        const prevAlpha = ctx.globalAlpha;
        const prevComp = ctx.globalCompositeOperation;
        const tick = system.tick || 0;
        const rng = system.rng || Math.random;

        // ─ Grain: batch random dots using two pre-set fills (perf: avoid per-pixel fillStyle changes) ─
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.04;
        const grainCount = Math.floor(w * h * this.filmGrainDensity * 0.001);
        const halfGrain = grainCount >> 1;
        // Batch white grains
        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.beginPath();
        for (let i = 0; i < halfGrain; i++) {
            ctx.rect(rng() * w, rng() * h, 1.5, 1.5);
        }
        ctx.fill();
        // Batch black grains
        ctx.fillStyle = 'rgb(0,0,0)';
        ctx.beginPath();
        for (let i = 0; i < grainCount - halfGrain; i++) {
            ctx.rect(rng() * w, rng() * h, 1.5, 1.5);
        }
        ctx.fill();

        // ─ Vignette: darken edges with cached radial gradient (perf: avoid recreating every frame) ─
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.12;
        if (!this._filmVigGrad || this._filmVigW !== w || this._filmVigH !== h) {
            this._filmVigGrad = ctx.createRadialGradient(
                w / 2, h / 2, Math.min(w, h) * 0.3,
                w / 2, h / 2, Math.max(w, h) * 0.75
            );
            this._filmVigGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            this._filmVigGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
            this._filmVigW = w;
            this._filmVigH = h;
        }
        ctx.fillStyle = this._filmVigGrad;
        ctx.fillRect(0, 0, w, h);

        // ─ Light leak: bright gradient streak fading in/out over ~200 frames ─
        const leakCycle = 200;
        const leakProgress = ((tick + this.lightLeakPhase) % leakCycle) / leakCycle;
        // Fade envelope: sine curve peaking at 0.5
        const leakIntensity = Math.sin(leakProgress * Math.PI);
        if (leakIntensity > 0.05) {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = leakIntensity * 0.08;
            const angle = this.lightLeakAngle;
            const cx = w * (0.3 + 0.4 * Math.cos(angle));
            const cy = h * (0.3 + 0.4 * Math.sin(angle));
            const leakGrad = ctx.createRadialGradient(
                cx, cy, 0,
                cx, cy, Math.max(w, h) * 0.5
            );
            leakGrad.addColorStop(0, 'rgba(255, 200, 100, 1)');
            leakGrad.addColorStop(0.5, 'rgba(255, 100, 50, 0.5)');
            leakGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
            ctx.fillStyle = leakGrad;
            ctx.fillRect(0, 0, w, h);
        }

        ctx.globalAlpha = prevAlpha;
        ctx.globalCompositeOperation = prevComp;
    }

    // ── Chromatic Aberration ──────────────────────────────────────────

    _applyAberration(ctx, w, h) {
        const prevComp = ctx.globalCompositeOperation;
        const prevAlpha = ctx.globalAlpha;
        const offset = this.aberrationOffset;

        // Red channel: draw canvas offset to the left
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.06;
        ctx.drawImage(ctx.canvas, -offset, 0);

        // Blue channel: draw canvas offset to the right
        ctx.globalAlpha = 0.06;
        ctx.drawImage(ctx.canvas, offset, 0);

        ctx.globalAlpha = prevAlpha;
        ctx.globalCompositeOperation = prevComp;
    }

    // ── Tone Mapping (S-curve contrast) ───────────────────────────────

    _applyToneMapping(ctx, w, h) {
        const prevComp = ctx.globalCompositeOperation;
        const prevAlpha = ctx.globalAlpha;

        // Overlay a mid-gray fill to create an S-curve contrast enhancement
        // overlay composite: darkens darks, lightens lights around mid-gray
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = 'rgb(128, 128, 128)';
        ctx.fillRect(0, 0, w, h);

        ctx.globalAlpha = prevAlpha;
        ctx.globalCompositeOperation = prevComp;
    }

    // ── Legacy CSS Filter API ─────────────────────────────────────────

    /**
     * Sets a specific CSS filter value.
     * @param {string} name
     * @param {number} value
     */
    setFilter(name, value) {
        if (this.filters.hasOwnProperty(name)) {
            this.filters[name] = value;
            this._updateCSSFilters();
        }
    }

    /**
     * Resets all filters and effects.
     */
    reset() {
        this.filters = {
            blur: 0, brightness: 1, contrast: 1, grayscale: 0,
            hueRotate: 0, invert: 0, saturate: 1, sepia: 0
        };
        this.toggleScanlines(false);
        this._updateCSSFilters();

        // Reset pipeline effects
        this.activeEffects = {
            bloom: false,
            colorGrading: false,
            filmEmulation: false,
            aberration: false,
            toneMapping: false
        };
    }

    /**
     * Updates the CSS filter string on the container.
     */
    _updateCSSFilters() {
        let filterString = '';
        if (this.filters.blur > 0) filterString += 'blur(' + this.filters.blur + 'px) ';
        if (this.filters.brightness !== 1) filterString += 'brightness(' + this.filters.brightness + ') ';
        if (this.filters.contrast !== 1) filterString += 'contrast(' + this.filters.contrast + ') ';
        if (this.filters.grayscale > 0) filterString += 'grayscale(' + this.filters.grayscale + ') ';
        if (this.filters.hueRotate !== 0) filterString += 'hue-rotate(' + this.filters.hueRotate + 'deg) ';
        if (this.filters.invert > 0) filterString += 'invert(' + this.filters.invert + ') ';
        if (this.filters.saturate !== 1) filterString += 'saturate(' + this.filters.saturate + ') ';
        if (this.filters.sepia > 0) filterString += 'sepia(' + this.filters.sepia + ') ';

        this.container.style.filter = filterString.trim();
    }

    // Keep backward-compatible alias
    update() {
        this._updateCSSFilters();
    }

    /**
     * Toggles a CRT-style scanline overlay.
     * CSP-safe: uses createElement + style properties, no innerHTML.
     * @param {boolean} enable
     */
    toggleScanlines(enable) {
        if (enable && !this.scanlineOverlay) {
            const el = document.createElement('div');
            el.id = 'scanline-overlay';
            el.style.position = 'fixed';
            el.style.top = '0';
            el.style.left = '0';
            el.style.width = '100%';
            el.style.height = '100%';
            el.style.background = 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))';
            el.style.backgroundSize = '100% 4px, 3px 100%';
            el.style.pointerEvents = 'none';
            el.style.zIndex = '100';
            this.scanlineOverlay = el;
            document.body.appendChild(el);
        } else if (!enable && this.scanlineOverlay) {
            this.scanlineOverlay.remove();
            this.scanlineOverlay = null;
        }
    }

    /**
     * Applies a momentary chromatic aberration CSS glitch effect.
     */
    glitch() {
        const originalFilter = this.container.style.filter;
        this.container.style.filter = originalFilter + ' contrast(2) hue-rotate(90deg)';
        setTimeout(() => {
            this.container.style.filter = originalFilter;
        }, 100);
    }
}

// Singleton instance
const instance = new PostProcessingSystem();

// Primary export (new API name)
export const postProcessing = instance;

// Backward-compatible alias for existing imports
export const postProcess = instance;
