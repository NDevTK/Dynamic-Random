/**
 * @file post_processing.js
 * @description Manages global visual filters and effects.
 */

import { ui } from './state.js';

class PostProcessingSystem {
    constructor() {
        this.container = ui.canvasContainer;
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
    }

    /**
     * Sets a specific filter value.
     * @param {string} name
     * @param {number} value
     */
    setFilter(name, value) {
        if (this.filters.hasOwnProperty(name)) {
            this.filters[name] = value;
            this.update();
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
        this.update();
    }

    /**
     * Updates the CSS filter string on the container.
     */
    update() {
        let filterString = '';
        if (this.filters.blur > 0) filterString += `blur(${this.filters.blur}px) `;
        if (this.filters.brightness !== 1) filterString += `brightness(${this.filters.brightness}) `;
        if (this.filters.contrast !== 1) filterString += `contrast(${this.filters.contrast}) `;
        if (this.filters.grayscale > 0) filterString += `grayscale(${this.filters.grayscale}) `;
        if (this.filters.hueRotate !== 0) filterString += `hue-rotate(${this.filters.hueRotate}deg) `;
        if (this.filters.invert > 0) filterString += `invert(${this.filters.invert}) `;
        if (this.filters.saturate !== 1) filterString += `saturate(${this.filters.saturate}) `;
        if (this.filters.sepia > 0) filterString += `sepia(${this.filters.sepia}) `;

        this.container.style.filter = filterString.trim();
    }

    /**
     * Toggles a CRT-style scanline overlay.
     * @param {boolean} enable
     */
    toggleScanlines(enable) {
        if (enable && !this.scanlineOverlay) {
            this.scanlineOverlay = document.createElement('div');
            this.scanlineOverlay.id = 'scanline-overlay';
            this.scanlineOverlay.style.position = 'fixed';
            this.scanlineOverlay.style.top = '0';
            this.scanlineOverlay.style.left = '0';
            this.scanlineOverlay.style.width = '100%';
            this.scanlineOverlay.style.height = '100%';
            this.scanlineOverlay.style.background = 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))';
            this.scanlineOverlay.style.backgroundSize = '100% 4px, 3px 100%';
            this.scanlineOverlay.style.pointerEvents = 'none';
            this.scanlineOverlay.style.zIndex = '100';
            document.body.appendChild(this.scanlineOverlay);
        } else if (!enable && this.scanlineOverlay) {
            this.scanlineOverlay.remove();
            this.scanlineOverlay = null;
        }
    }

    /**
     * Applies a momentary chromatic aberration effect.
     */
    glitch() {
        const originalFilter = this.container.style.filter;
        this.container.style.filter = originalFilter + ' contrast(2) hue-rotate(90deg)';
        setTimeout(() => {
            this.container.style.filter = originalFilter;
        }, 100);
    }
}

export const postProcess = new PostProcessingSystem();
