/**
 * @file device_sensors.js
 * @description Device orientation and motion API integration.
 * Provides smoothed tilt and shake values for mobile device interaction.
 * Falls back gracefully on desktop (values remain at 0).
 */

export const deviceSensors = {
    supported: false,
    tilt: { x: 0, y: 0, z: 0 },
    shake: 0,
    _rawTilt: { x: 0, y: 0, z: 0 },
    _rawShake: 0,
    _lastAccel: { x: 0, y: 0, z: 0 },
    _smoothing: 0.15,
    _shakeDecay: 0.92,
    _initialized: false,

    async init() {
        if (this._initialized) return;
        this._initialized = true;

        // Check for DeviceOrientationEvent support
        if (!('DeviceOrientationEvent' in window)) return;

        // iOS 13+ requires permission
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const response = await DeviceOrientationEvent.requestPermission();
                if (response !== 'granted') return;
            } catch {
                return;
            }
        }

        this.supported = true;

        window.addEventListener('deviceorientation', (e) => {
            // beta: front-back tilt (-180 to 180), gamma: left-right tilt (-90 to 90)
            // alpha: compass heading (0 to 360)
            if (e.beta !== null) {
                // Normalize to -1..1 range
                this._rawTilt.x = Math.max(-1, Math.min(1, (e.gamma || 0) / 45));
                this._rawTilt.y = Math.max(-1, Math.min(1, (e.beta || 0) / 45));
                this._rawTilt.z = ((e.alpha || 0) / 180) - 1;
            }
        }, { passive: true });

        if ('DeviceMotionEvent' in window) {
            if (typeof DeviceMotionEvent.requestPermission === 'function') {
                try {
                    await DeviceMotionEvent.requestPermission();
                } catch {
                    // Motion not available, orientation still works
                }
            }

            window.addEventListener('devicemotion', (e) => {
                const accel = e.accelerationIncludingGravity;
                if (!accel) return;

                const ax = accel.x || 0;
                const ay = accel.y || 0;
                const az = accel.z || 0;

                // Detect shake as sudden acceleration change
                const dx = ax - this._lastAccel.x;
                const dy = ay - this._lastAccel.y;
                const dz = az - this._lastAccel.z;
                const shakeForce = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (shakeForce > 5) {
                    this._rawShake = Math.min(1, shakeForce / 30);
                }

                this._lastAccel.x = ax;
                this._lastAccel.y = ay;
                this._lastAccel.z = az;
            }, { passive: true });
        }
    },

    /**
     * Call once per frame to update smoothed values.
     */
    update() {
        if (!this.supported) return;

        const s = this._smoothing;
        this.tilt.x += (this._rawTilt.x - this.tilt.x) * s;
        this.tilt.y += (this._rawTilt.y - this.tilt.y) * s;
        this.tilt.z += (this._rawTilt.z - this.tilt.z) * s;

        // Shake decays over time, spikes on detection
        this.shake = Math.max(this.shake * this._shakeDecay, this._rawShake);
        this._rawShake *= 0.8;
    }
};
