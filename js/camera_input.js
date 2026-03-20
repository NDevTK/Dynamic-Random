/**
 * @file camera_input.js
 * @description Singleton webcam input system for video capture and pixel sampling.
 * Provides per-frame brightness, dominant hue, motion level, a per-region color grid,
 * and a silhouette brightness map derived from the webcam feed.
 * Falls back gracefully when getUserMedia is not available.
 */

// Sampling grid dimensions
const GRID_COLS = 16;
const GRID_ROWS = 12;

// Offscreen canvas dimensions (half of the requested video resolution)
const CANVAS_W = 160;
const CANVAS_H = 120;

export const cameraInput = {
    // --- Public state ---
    active:       false,
    brightness:   0,
    dominantHue:  0,
    motionLevel:  0,
    colorGrid:    [],   // GRID_ROWS x GRID_COLS array of { r, g, b, brightness }
    silhouette:   [],   // GRID_ROWS x GRID_COLS array of 0-1 brightness values
    videoWidth:   0,
    videoHeight:  0,

    // --- Private ---
    _video:           null,
    _canvas:          null,
    _ctx:             null,
    _stream:          null,
    _prevPixels:      null,   // Uint8ClampedArray of previous frame RGBA data
    _frameCount:      0,
    _initialized:     false,

    /**
     * Call once at startup. Does nothing until activate() is called.
     */
    init() {
        if (this._initialized) return;
        this._initialized = true;
        // Pre-populate grids with default values so consumers never read undefined
        this._resetGrids();
    },

    /**
     * Request webcam access and begin capturing frames.
     * Safe to call multiple times; does nothing if already active.
     */
    async activate() {
        if (this.active) return;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('[cameraInput] getUserMedia is not available in this environment.');
            return;
        }

        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width:      320,
                    height:     240,
                    facingMode: 'user',
                },
            });
        } catch (err) {
            console.warn('[cameraInput] Could not access webcam:', err.message ?? err);
            return;
        }

        // Hidden video element — appended to body so the browser actually decodes frames
        const video = document.createElement('video');
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        video.muted      = true;
        video.autoplay   = true;
        video.style.cssText = (
            'position:fixed;top:0;left:0;' +
            'width:1px;height:1px;opacity:0;pointer-events:none;'
        );
        video.srcObject = stream;
        document.body.appendChild(video);

        await new Promise((resolve) => {
            video.addEventListener('loadedmetadata', resolve, { once: true });
        });
        video.play().catch(() => {});

        // Offscreen canvas for pixel sampling
        const canvas = document.createElement('canvas');
        canvas.width  = CANVAS_W;
        canvas.height = CANVAS_H;

        this._video   = video;
        this._canvas  = canvas;
        this._ctx     = canvas.getContext('2d', { willReadFrequently: true });
        this._stream  = stream;
        this._prevPixels  = null;
        this._frameCount  = 0;
        this.videoWidth   = video.videoWidth  || 320;
        this.videoHeight  = video.videoHeight || 240;
        this.active       = true;
    },

    /**
     * Stop capturing, release the media stream, and remove the video element.
     */
    deactivate() {
        if (!this.active) return;

        if (this._stream) {
            for (const track of this._stream.getTracks()) {
                track.stop();
            }
            this._stream = null;
        }

        if (this._video && this._video.parentNode) {
            this._video.pause();
            this._video.srcObject = null;
            this._video.parentNode.removeChild(this._video);
        }

        this._video      = null;
        this._canvas     = null;
        this._ctx        = null;
        this._prevPixels = null;
        this.active      = false;
        this._resetGrids();
        this.brightness  = 0;
        this.dominantHue = 0;
        this.motionLevel = 0;
        this.videoWidth  = 0;
        this.videoHeight = 0;
    },

    /**
     * Call once per animation frame.
     * Only performs the full pixel-sampling pass every 3rd frame for performance.
     */
    update() {
        if (!this.active || !this._video || this._video.readyState < 2) return;

        this._frameCount++;
        if (this._frameCount % 3 !== 0) return;

        const ctx = this._ctx;

        // Draw current video frame scaled down to the offscreen canvas
        ctx.drawImage(this._video, 0, 0, CANVAS_W, CANVAS_H);

        let imageData;
        try {
            imageData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
        } catch (_e) {
            // Cross-origin / security errors; bail silently
            return;
        }
        const pixels = imageData.data; // Uint8ClampedArray, RGBA

        // --- Motion (vs previous frame) ---
        let motionSum = 0;
        const totalPixels = CANVAS_W * CANVAS_H;

        if (this._prevPixels && this._prevPixels.length === pixels.length) {
            for (let i = 0; i < pixels.length; i += 4) {
                const dr = pixels[i]     - this._prevPixels[i];
                const dg = pixels[i + 1] - this._prevPixels[i + 1];
                const db = pixels[i + 2] - this._prevPixels[i + 2];
                // Perceived-luminance weighted diff, normalised to 0-1
                motionSum += (Math.abs(dr) * 0.299 + Math.abs(dg) * 0.587 + Math.abs(db) * 0.114) / 255;
            }
            this.motionLevel = Math.min(1, motionSum / totalPixels * 5); // scale up; motion is subtle
        } else {
            this.motionLevel = 0;
        }

        // Reuse previous frame buffer instead of allocating a new one each time
        if (!this._prevPixels || this._prevPixels.length !== pixels.length) {
            this._prevPixels = new Uint8ClampedArray(pixels.length);
        }
        this._prevPixels.set(pixels);

        // --- Per-region sampling (GRID_COLS x GRID_ROWS) ---
        const cellW = CANVAS_W / GRID_COLS;
        const cellH = CANVAS_H / GRID_ROWS;

        let totalBrightness = 0;

        // Hue histogram with 36 buckets (10-degree bands)
        const hueHistogram = new Float32Array(36);

        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                // Sample the centre pixel of each cell
                const px = Math.floor(col * cellW + cellW * 0.5);
                const py = Math.floor(row * cellH + cellH * 0.5);
                const idx = (py * CANVAS_W + px) * 4;

                const r = pixels[idx]     / 255;
                const g = pixels[idx + 1] / 255;
                const b = pixels[idx + 2] / 255;

                // Perceived brightness (standard luminance coefficients)
                const lum = r * 0.299 + g * 0.587 + b * 0.114;

                totalBrightness += lum;

                // RGB -> HSL hue
                const hue = this._rgbToHue(r, g, b);
                if (hue >= 0) {
                    const bucket = Math.floor(hue / 10) % 36;
                    hueHistogram[bucket] += lum; // weight by brightness so grey pixels don't dominate
                }

                const gridIdx = row * GRID_COLS + col;
                this.colorGrid[gridIdx] = {
                    r:          Math.round(r * 255),
                    g:          Math.round(g * 255),
                    b:          Math.round(b * 255),
                    brightness: lum,
                };
                this.silhouette[gridIdx] = lum;
            }
        }

        // --- Overall brightness ---
        this.brightness = totalBrightness / (GRID_COLS * GRID_ROWS);

        // --- Dominant hue ---
        let maxWeight = -1;
        let dominantBucket = 0;
        for (let i = 0; i < 36; i++) {
            if (hueHistogram[i] > maxWeight) {
                maxWeight      = hueHistogram[i];
                dominantBucket = i;
            }
        }
        this.dominantHue = dominantBucket * 10 + 5; // centre of the winning bucket (0–360)
    },

    // --- Private helpers ---

    /**
     * Convert normalised RGB (0-1 each) to hue (0-360).
     * Returns -1 for achromatic colours (greyscale) where hue is undefined.
     */
    _rgbToHue(r, g, b) {
        const max  = Math.max(r, g, b);
        const min  = Math.min(r, g, b);
        const delta = max - min;

        if (delta < 0.01) return -1; // achromatic

        let hue;
        if (max === r) {
            hue = ((g - b) / delta) % 6;
        } else if (max === g) {
            hue = (b - r) / delta + 2;
        } else {
            hue = (r - g) / delta + 4;
        }

        hue = hue * 60;
        if (hue < 0) hue += 360;
        return hue;
    },

    /**
     * Fill colorGrid and silhouette with neutral defaults.
     */
    _resetGrids() {
        const count = GRID_COLS * GRID_ROWS;
        this.colorGrid = [];
        this.silhouette = [];
        for (let i = 0; i < count; i++) {
            this.colorGrid.push({ r: 0, g: 0, b: 0, brightness: 0 });
            this.silhouette.push(0);
        }
    },
};
