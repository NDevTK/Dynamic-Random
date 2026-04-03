export const perfMonitor = {
  fps: 60,
  qualityScale: 1.0,
  qualityLevel: 'ultra',

  _buffer: new Float64Array(64),
  _bufferIndex: 0,
  _bufferCount: 0,
  _frameCount: 0,
  _checksAboveThreshold: 0,

  init() {
    this._buffer = new Float64Array(64);
    this._bufferIndex = 0;
    this._bufferCount = 0;
    this._frameCount = 0;
    this._checksAboveThreshold = 0;
    this.fps = 60;
    this.qualityScale = 1.0;
    this.qualityLevel = 'ultra';
  },

  update() {
    const now = performance.now();
    this._buffer[this._bufferIndex] = now;
    this._bufferIndex = (this._bufferIndex + 1) & 63; // mod 64
    if (this._bufferCount < 64) this._bufferCount++;

    if (this._bufferCount >= 2) {
      const oldest = this._buffer[(this._bufferIndex - this._bufferCount + 64) & 63];
      const elapsed = now - oldest;
      const rawFps = (this._bufferCount - 1) / elapsed * 1000;
      this.fps = this.fps * 0.9 + rawFps * 0.1;
    }

    this._frameCount++;
    // Check more frequently (every 60 frames) for faster reaction to drops
    if (this._frameCount % 60 !== 0) return;

    const fps = this.fps;

    if (fps < 25) {
      this._checksAboveThreshold = 0;
      this.qualityLevel = 'low';
      this.qualityScale = 0.25;
    } else if (fps < 40) {
      this._checksAboveThreshold = 0;
      this.qualityLevel = 'medium';
      this.qualityScale = 0.5;
    } else if (fps < 52) {
      this._checksAboveThreshold = 0;
      this.qualityLevel = 'high';
      this.qualityScale = 0.75;
    } else {
      this._checksAboveThreshold++;
      // Require sustained good FPS before upgrading quality back
      if (this._checksAboveThreshold >= 5) {
        this.qualityLevel = 'ultra';
        this.qualityScale = 1.0;
      }
    }
  },
};
