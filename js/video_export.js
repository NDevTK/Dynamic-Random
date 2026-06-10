/**
 * @file video_export.js
 * @description Record the living canvas to a downloadable WebM clip using
 * canvas.captureStream + MediaRecorder. Both render layers (the background
 * system canvas and the particles.js canvas) are composited into one export
 * canvas per frame while recording. Press R or use the ⏺ toolbar button;
 * recording stops on a second press or automatically at 30 seconds.
 */

import { background } from './background.js';
import { currentSeed } from './state.js';

const MAX_SECONDS = 30;

export const videoExport = {
    supported: typeof window !== 'undefined'
        && !!window.MediaRecorder
        && !!HTMLCanvasElement.prototype.captureStream,
    recording: false,

    _canvas: null,
    _ctx: null,
    _recorder: null,
    _chunks: [],
    _badge: null,
    _badgeText: null,
    _startedAt: 0,
    _rafId: 0,

    init() {
        if (!this.supported) return;
        document.addEventListener('keydown', (e) => {
            const el = document.activeElement;
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
            if (e.key === 'r' || e.key === 'R') this.toggle();
        });
    },

    toggle() {
        if (this.recording) this.stop();
        else this.start();
    },

    start() {
        if (this.recording || !this.supported) return;

        const w = window.innerWidth;
        const h = window.innerHeight;
        if (!this._canvas) {
            this._canvas = document.createElement('canvas');
            this._ctx = this._canvas.getContext('2d');
        }
        this._canvas.width = w;
        this._canvas.height = h;

        const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
            .find(m => MediaRecorder.isTypeSupported(m));
        if (!mime) return;

        const stream = this._canvas.captureStream(60);
        this._chunks = [];
        this._recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
        this._recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) this._chunks.push(e.data);
        };
        this._recorder.onstop = () => this._download(mime);
        this._recorder.start(1000);

        this.recording = true;
        this._startedAt = performance.now();
        this._showBadge();
        this._composite();
    },

    stop() {
        if (!this.recording) return;
        this.recording = false;
        cancelAnimationFrame(this._rafId);
        this._hideBadge();
        if (this._recorder && this._recorder.state !== 'inactive') this._recorder.stop();
    },

    /** Per-frame: stack the render layers into the export canvas. */
    _composite() {
        if (!this.recording) return;
        const ctx = this._ctx;
        const w = this._canvas.width;
        const h = this._canvas.height;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        if (background.canvas && background.canvas.width > 0) {
            ctx.drawImage(background.canvas, 0, 0, w, h);
        }
        const pCanvas = document.querySelector('#particles-js canvas');
        if (pCanvas && pCanvas.width > 0) {
            ctx.drawImage(pCanvas, 0, 0, w, h);
        }

        const elapsed = (performance.now() - this._startedAt) / 1000;
        if (this._badgeText) {
            this._badgeText.textContent = `REC ${elapsed.toFixed(0)}s · R to stop`;
        }
        if (elapsed >= MAX_SECONDS) {
            this.stop();
            return;
        }
        this._rafId = requestAnimationFrame(() => this._composite());
    },

    _download(mime) {
        if (this._chunks.length === 0) return;
        const blob = new Blob(this._chunks, { type: mime });
        this._chunks = [];
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const seed = (currentSeed || 'universe').replace(/[^\w-]/g, '');
        a.download = `celestial-${seed}.webm`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    },

    _showBadge() {
        if (!this._badge) {
            const badge = document.createElement('div');
            badge.style.cssText =
                'position:fixed;top:12px;left:12px;z-index:102;display:flex;align-items:center;gap:7px;' +
                'padding:5px 12px;border-radius:14px;background:rgba(10,10,14,0.7);' +
                'border:1px solid rgba(255,80,80,0.5);font-family:"Exo 2",sans-serif;' +
                'font-size:11px;color:rgba(255,200,200,0.95);pointer-events:none;';
            const dot = document.createElement('span');
            dot.style.cssText =
                'width:8px;height:8px;border-radius:50%;background:#ff4d4d;' +
                'animation:recBlink 1.2s ease-in-out infinite;';
            const style = document.createElement('style');
            style.textContent = '@keyframes recBlink{0%,100%{opacity:1}50%{opacity:0.25}}';
            document.head.appendChild(style);
            this._badgeText = document.createElement('span');
            badge.appendChild(dot);
            badge.appendChild(this._badgeText);
            this._badge = badge;
        }
        this._badgeText.textContent = 'REC 0s · R to stop';
        document.body.appendChild(this._badge);
    },

    _hideBadge() {
        if (this._badge && this._badge.parentNode) this._badge.remove();
    },
};
