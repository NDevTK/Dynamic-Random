/**
 * @file multi_monitor.js
 * @description Multi-monitor awareness using the Screen API.
 * Detects screen position/count and exposes offset data so effects
 * can span across monitors (e.g., a panoramic gradient shift).
 */

export const multiMonitor = {
    screenCount: 1,
    screenIndex: 0,
    screenLeft: 0,
    screenTop: 0,
    totalWidth: 0,
    totalHeight: 0,
    normalizedX: 0, // 0-1 position of this window across total screen width
    supported: false,

    init() {
        // Try modern Window Management API (requires permission)
        if ('getScreenDetails' in window) {
            this._tryScreenDetails();
        }
        // Fallback: use window.screen and screenX/screenY
        this._updateFallback();
        window.addEventListener('resize', () => this._updateFallback());
        // Periodically update in case window moves
        setInterval(() => this._updateFallback(), 5000);
    },

    async _tryScreenDetails() {
        try {
            const details = await window.getScreenDetails();
            this.supported = true;
            this.screenCount = details.screens.length;

            const update = () => {
                const screens = details.screens;
                this.screenCount = screens.length;
                // Find which screen we're on
                const wx = window.screenX + window.innerWidth / 2;
                const wy = window.screenY + window.innerHeight / 2;
                let minDist = Infinity;
                let idx = 0;
                let totalW = 0;
                let minLeft = Infinity;
                for (let i = 0; i < screens.length; i++) {
                    const s = screens[i];
                    totalW = Math.max(totalW, s.left + s.width);
                    minLeft = Math.min(minLeft, s.left);
                    const cx = s.left + s.width / 2;
                    const cy = s.top + s.height / 2;
                    const d = (wx - cx) ** 2 + (wy - cy) ** 2;
                    if (d < minDist) { minDist = d; idx = i; }
                }
                this.screenIndex = idx;
                this.screenLeft = screens[idx].left;
                this.screenTop = screens[idx].top;
                this.totalWidth = totalW - minLeft;
                this.totalHeight = Math.max(...screens.map(s => s.top + s.height));
                this.normalizedX = this.totalWidth > 0
                    ? (window.screenX - minLeft) / this.totalWidth : 0;
            };

            update();
            details.addEventListener('screenschange', update);
            window.addEventListener('resize', update);
        } catch (_e) {
            // Permission denied or not available
        }
    },

    _updateFallback() {
        if (this.supported) return; // Screen API is active
        const s = window.screen;
        this.totalWidth = s.width;
        this.totalHeight = s.height;
        this.screenLeft = window.screenX || 0;
        this.screenTop = window.screenY || 0;
        this.normalizedX = s.width > 0 ? window.screenX / s.width : 0;
    }
};
