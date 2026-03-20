import { currentSeed } from './state.js';

export const screenshot = {
  _link: null,

  init() {
    this._link = document.createElement('a');
    this._link.style.display = 'none';
    document.body.appendChild(this._link);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'P' || e.key === 'p') {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        this.download();
        this.showFlash();
      }
    });
  },

  capture() {
    return new Promise((resolve) => {
      const composite = document.createElement('canvas');
      composite.width = window.innerWidth;
      composite.height = window.innerHeight;
      const ctx = composite.getContext('2d');

      const layers = [];

      const bg = document.querySelector('#background-canvas');
      if (bg) layers.push(bg);

      const particlesContainer = document.querySelector('#particles-js');
      if (particlesContainer) {
        const pc = particlesContainer.querySelector('canvas');
        if (pc) layers.push(pc);
      }

      const overlayIds = [
        '#cursor-effects-canvas',
        '#cursor-trail-canvas',
        '#ambient-fx-canvas',
        '#warp-field-canvas',
      ];
      for (const id of overlayIds) {
        const el = document.querySelector(id);
        if (el) layers.push(el);
      }

      for (const canvas of layers) {
        try {
          ctx.drawImage(canvas, 0, 0, composite.width, composite.height);
        } catch (err) {
          console.warn('[screenshot] Could not draw layer:', err.message ?? err);
        }
      }

      composite.toBlob((blob) => resolve(blob), 'image/png');
    });
  },

  async download() {
    const blob = await this.capture();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    this._link.href = url;
    this._link.download = `celestial-${currentSeed || 'unknown'}.png`;
    this._link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  async copyToClipboard() {
    const blob = await this.capture();
    if (!blob) return Promise.reject(new Error('Capture failed'));
    return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  },

  showFlash() {
    const flash = document.createElement('div');
    flash.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;background:white;z-index:300;pointer-events:none;opacity:0;transition:opacity 150ms ease';
    document.body.appendChild(flash);
    requestAnimationFrame(() => {
      flash.style.opacity = '0.3';
      setTimeout(() => {
        flash.style.transition = 'opacity 150ms ease';
        flash.style.opacity = '0';
        setTimeout(() => flash.remove(), 150);
      }, 150);
    });
  },
};
