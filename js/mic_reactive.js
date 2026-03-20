/**
 * @file mic_reactive.js
 * @description Singleton microphone audio analysis system.
 * Provides frequency, waveform, and derived beat/volume values for audio-reactive visuals.
 * Does not auto-prompt for permission; requires explicit call to activate().
 * Falls back gracefully if getUserMedia is unavailable.
 */

export const micReactive = {
    active: false,
    volume: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    peak: 0,
    beat: false,
    frequencyData: new Uint8Array(0),
    waveform: new Uint8Array(0),

    _audioContext: null,
    _analyser: null,
    _source: null,
    _rollingAvg: 0,
    _rollingAvgAlpha: 0.05,
    _initialized: false,

    /**
     * No-op until the user explicitly calls activate().
     * Safe to call at startup without triggering a permission prompt.
     */
    init() {
        // Intentionally empty: activation requires explicit user gesture.
    },

    /**
     * Requests microphone access and sets up the AudioContext + AnalyserNode.
     * Must be called in response to a user gesture (click, keypress, etc.).
     * If getUserMedia is not available the method logs a warning and returns.
     */
    async activate() {
        if (this.active || this._initialized) return;
        this._initialized = true;

        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
            console.warn('[micReactive] getUserMedia is not available in this environment.');
            return;
        }

        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            console.warn('[micReactive] Microphone permission denied or unavailable:', err);
            return;
        }

        this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this._analyser = this._audioContext.createAnalyser();
        this._analyser.fftSize = 256;
        this._analyser.smoothingTimeConstant = 0.8;

        const bufferLength = this._analyser.frequencyBinCount; // 128 bins
        this.frequencyData = new Uint8Array(bufferLength);
        this.waveform = new Uint8Array(bufferLength);

        this._source = this._audioContext.createMediaStreamSource(stream);
        this._source.connect(this._analyser);

        this.active = true;
    },

    /**
     * Call once per animation frame to refresh all exposed values.
     * Has no effect when inactive.
     */
    update() {
        if (!this.active || !this._analyser) return;

        this._analyser.getByteFrequencyData(this.frequencyData);
        this._analyser.getByteTimeDomainData(this.waveform);

        const freq = this.frequencyData;
        const len = freq.length;

        // --- Volume: normalized RMS over all frequency bins ---
        let sumSq = 0;
        for (let i = 0; i < len; i++) {
            const normalized = freq[i] / 255;
            sumSq += normalized * normalized;
        }
        this.volume = Math.sqrt(sumSq / len);

        // --- Band averages (bins normalized 0-1) ---
        // Bass:   bins 0-3
        let bassSum = 0;
        for (let i = 0; i <= 3; i++) bassSum += freq[i];
        this.bass = (bassSum / 4) / 255;

        // Mid:    bins 4-15
        let midSum = 0;
        for (let i = 4; i <= 15; i++) midSum += freq[i];
        this.mid = (midSum / 12) / 255;

        // Treble: bins 16-63 (capped at buffer length)
        const trebleEnd = Math.min(63, len - 1);
        let trebleSum = 0;
        const trebleCount = trebleEnd - 16 + 1;
        for (let i = 16; i <= trebleEnd; i++) trebleSum += freq[i];
        this.treble = trebleCount > 0 ? (trebleSum / trebleCount) / 255 : 0;

        // --- Peak: max amplitude across all bins ---
        let maxVal = 0;
        for (let i = 0; i < len; i++) {
            if (freq[i] > maxVal) maxVal = freq[i];
        }
        this.peak = maxVal / 255;

        // --- Beat detection: volume spike above 1.5x rolling average ---
        this._rollingAvg += (this.volume - this._rollingAvg) * this._rollingAvgAlpha;
        this.beat = this._rollingAvg > 0 && this.volume > 1.5 * this._rollingAvg;
    }
};
