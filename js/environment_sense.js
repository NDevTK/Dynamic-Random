/**
 * @file environment_sense.js
 * @description The canvas adapts to the machine and human running it:
 *  - prefers-reduced-motion → calm mode (warp/idle churn are clamped)
 *  - Battery Status API → quality cap while unplugged and low
 *  - Screen Wake Lock → the screensaver idle-cycle keeps the display awake
 *
 * Consumers read `reducedMotion` and `qualityCap`; background.js folds the
 * cap into its per-frame qualityScale and asks for the wake lock when the
 * idle auto-cycle engages.
 */

export const environmentSense = {
    reducedMotion: false,
    qualityCap: 1,
    wakeLockHeld: false,

    _wakeLock: null,
    _battery: null,

    init() {
        if (typeof window.matchMedia === 'function') {
            const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.reducedMotion = mq.matches;
            const onChange = () => { this.reducedMotion = mq.matches; };
            if (mq.addEventListener) mq.addEventListener('change', onChange);
        }

        if (navigator.getBattery) {
            navigator.getBattery().then((battery) => {
                this._battery = battery;
                const evaluate = () => {
                    // Unplugged and below 20%: halve the budget. Below 8%: quarter it.
                    this.qualityCap = battery.charging ? 1
                        : battery.level < 0.08 ? 0.25
                        : battery.level < 0.2 ? 0.5
                        : 1;
                };
                battery.addEventListener('levelchange', evaluate);
                battery.addEventListener('chargingchange', evaluate);
                evaluate();
            }).catch(() => { /* battery info unavailable */ });
        }

        // Re-acquire the wake lock when returning to a visible tab mid-screensaver
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.wakeLockHeld) {
                this._wakeLock = null;
                this.wakeLockHeld = false;
            }
        });
    },

    async requestWakeLock() {
        if (this.wakeLockHeld || !('wakeLock' in navigator)) return;
        try {
            this._wakeLock = await navigator.wakeLock.request('screen');
            this.wakeLockHeld = true;
            this._wakeLock.addEventListener('release', () => {
                this.wakeLockHeld = false;
                this._wakeLock = null;
            });
        } catch (err) {
            // Denied (e.g. low battery or hidden document) — fine, just don't hold it
            this.wakeLockHeld = false;
        }
    },

    releaseWakeLock() {
        if (this._wakeLock) {
            this._wakeLock.release().catch(() => {});
            this._wakeLock = null;
        }
        this.wakeLockHeld = false;
    },
};
