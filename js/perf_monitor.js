export const perfMonitor = {
  fps: 60,
  qualityScale: 1.0,
  qualityLevel: 'ultra',

  _timestamps: [],
  _frameCount: 0,
  _checksAboveThreshold: 0,

  init() {
    this._timestamps = [];
    this._frameCount = 0;
    this._checksAboveThreshold = 0;
    this.fps = 60;
    this.qualityScale = 1.0;
    this.qualityLevel = 'ultra';
  },

  update() {
    const now = performance.now();
    this._timestamps.push(now);
    if (this._timestamps.length > 60) {
      this._timestamps.shift();
    }

    if (this._timestamps.length >= 2) {
      const elapsed = this._timestamps[this._timestamps.length - 1] - this._timestamps[0];
      const rawFps = (this._timestamps.length - 1) / elapsed * 1000;
      this.fps = this.fps * (1 - 0.1) + rawFps * 0.1;
    }

    this._frameCount++;
    if (this._frameCount % 120 !== 0) return;

    const fps = this.fps;

    if (fps < 30) {
      this._checksAboveThreshold = 0;
      this.qualityLevel = 'low';
      this.qualityScale = 0.25;
    } else if (fps < 45) {
      this._checksAboveThreshold = 0;
      this.qualityLevel = 'medium';
      this.qualityScale = 0.5;
    } else if (fps < 55) {
      this._checksAboveThreshold = 0;
      this.qualityLevel = 'high';
      this.qualityScale = 0.75;
    } else {
      this._checksAboveThreshold++;
      if (this._checksAboveThreshold >= 3) {
        this.qualityLevel = 'ultra';
        this.qualityScale = 1.0;
      }
    }
  },
};
