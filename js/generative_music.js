/* generative_music.js – CSP-safe generative ambient soundtrack (Web Audio API) */

const generativeMusic = (() => {
  let ctx = null, master = null, nodes = [], lfos = [], delayFeedback = null;
  let _volume = 0.08, _muted = false, _active = false;
  let rootFreq = 130.81, intervals = [0, 7, 12], filterBase = 800, lfoRates = [0.03, 0.05];
  let configured = false, started = false;

  const SCALES = {
    major:      [0, 2, 4, 5, 7, 9, 11],
    lydian:     [0, 2, 4, 6, 7, 9, 11],
    minor:      [0, 2, 3, 5, 7, 8, 10],
    dorian:     [0, 2, 3, 5, 7, 9, 10],
    pentatonic: [0, 2, 4, 7, 9]
  };

  const ROOT_NOTES = [65.41,69.30,73.42,77.78,82.41,87.31,92.50,98.00,103.83,110.00,
    116.54,123.47,130.81,138.59,146.83,155.56,164.81,174.61,185.00,196.00,
    207.65,220.00,233.08,246.94,261.63];

  function ensureContext() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      return true;
    } catch { return false; }
  }

  function initOnInteraction() {
    if (ctx) return;
    const handler = () => {
      if (ensureContext()) {
        document.removeEventListener('click', handler);
        document.removeEventListener('keydown', handler);
        if (started && configured) buildGraph();
      }
    };
    document.addEventListener('click', handler);
    document.addEventListener('keydown', handler);
  }

  function pickScale(hue) {
    hue = ((hue % 360) + 360) % 360;
    if (hue < 60 || hue >= 330) return 'major,lydian'.split(',')[Math.random() < 0.5 ? 0 : 1];
    if (hue < 150) return 'pentatonic';
    if (hue < 270) return 'minor,dorian'.split(',')[Math.random() < 0.5 ? 0 : 1];
    return 'pentatonic';
  }

  function buildGraph() {
    if (!ctx || _active) return;
    const now = ctx.currentTime;
    const waveforms = ['sine', 'triangle', 'sawtooth'];

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = filterBase; filter.Q.value = 2;
    filter.connect(master);
    nodes.push({ node: filter, type: 'filter' });

    // Feedback delay reverb
    const delay = ctx.createDelay(1.0); delay.delayTime.value = 0.37;
    const fb = ctx.createGain(); fb.gain.value = 0.45;
    delay.connect(fb); fb.connect(delay); delay.connect(master);
    delayFeedback = fb;
    nodes.push({ node: delay, type: 'delay' }, { node: fb, type: 'fb' });
    const sendGain = ctx.createGain(); sendGain.gain.value = 0.3;
    sendGain.connect(delay);
    nodes.push({ node: sendGain, type: 'send' });

    // Oscillators
    intervals.forEach((semi, i) => {
      const osc = ctx.createOscillator();
      osc.type = waveforms[i % waveforms.length];
      osc.frequency.value = rootFreq * Math.pow(2, semi / 12);
      const g = ctx.createGain();
      g.gain.value = 0;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(1 / intervals.length, now + 2);
      osc.connect(g);
      g.connect(filter);
      g.connect(sendGain);
      osc.start(now);
      nodes.push({ node: osc, type: 'osc', gain: g });
    });

    // LFO → filter cutoff
    const lfo1 = ctx.createOscillator();
    lfo1.type = 'sine';
    lfo1.frequency.value = lfoRates[0];
    const lfo1Gain = ctx.createGain();
    lfo1Gain.gain.value = filterBase * 0.4;
    lfo1.connect(lfo1Gain);
    lfo1Gain.connect(filter.frequency);
    lfo1.start(now);
    lfos.push(lfo1, lfo1Gain);

    // LFO → detune shimmer
    const lfo2 = ctx.createOscillator();
    lfo2.type = 'sine';
    lfo2.frequency.value = lfoRates[1];
    const lfo2Gain = ctx.createGain();
    lfo2Gain.gain.value = 8;
    lfo2.connect(lfo2Gain);
    nodes.filter(n => n.type === 'osc').forEach(n => lfo2Gain.connect(n.node.detune));
    lfo2.start(now);
    lfos.push(lfo2, lfo2Gain);

    // Fade in master
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(_muted ? 0 : _volume, now + 2);
    _active = true;
  }

  function teardownGraph() {
    if (!ctx || !_active) return;
    const now = ctx.currentTime;
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 2);
    setTimeout(() => {
      nodes.forEach(n => { try { if (n.node.stop) n.node.stop(); n.node.disconnect(); } catch {} });
      lfos.forEach(n => { try { if (n.stop) n.stop(); n.disconnect(); } catch {} });
      nodes = []; lfos = []; delayFeedback = null;
      _active = false;
    }, 2200);
  }

  return {
    get active() { return _active; },
    get volume() { return _volume; },
    set volume(v) {
      _volume = Math.max(0, Math.min(1, v));
      if (ctx && master && _active && !_muted) {
        master.gain.setTargetAtTime(_volume, ctx.currentTime, 0.3);
      }
    },
    get muted() { return _muted; },
    set muted(m) {
      _muted = !!m;
      if (ctx && master && _active) {
        master.gain.setTargetAtTime(_muted ? 0 : _volume, ctx.currentTime, 0.3);
      }
    },

    init() { initOnInteraction(); },

    configure(rng, hue, blueprintName) {
      const r = typeof rng === 'function' ? rng : Math.random;
      const rootIdx = Math.floor(r() * ROOT_NOTES.length);
      rootFreq = ROOT_NOTES[rootIdx];
      const scaleName = pickScale(hue);
      const scale = SCALES[scaleName];
      const base = scale[Math.floor(r() * scale.length)];
      const third = scale[Math.floor(r() * scale.length)];
      const fifth = scale[Math.min(scale.length - 1, Math.floor(r() * scale.length))];
      intervals = [base, third, fifth];
      filterBase = 400 + r() * 1200;
      lfoRates = [0.01 + r() * 0.09, 0.02 + r() * 0.08];
      configured = true;
    },

    start() {
      started = true;
      if (!ensureContext()) { initOnInteraction(); return; }
      if (configured) buildGraph();
    },

    stop() {
      started = false;
      teardownGraph();
    },

    update(system) {
      if (!_active || !ctx || !system) return;
      const filterNode = nodes.find(n => n.type === 'filter');
      if (!filterNode) return;
      const speed = system.speedMultiplier || 1;
      let cutoff = filterBase;
      if (speed > 5) {
        cutoff = filterBase + (speed - 5) * 200;
        if (delayFeedback) delayFeedback.gain.setTargetAtTime(
          Math.min(0.7, 0.45 + (speed - 5) * 0.03), ctx.currentTime, 0.5);
      } else if (delayFeedback) {
        delayFeedback.gain.setTargetAtTime(0.45, ctx.currentTime, 0.5);
      }
      filterNode.node.frequency.setTargetAtTime(
        Math.min(cutoff, 6000), ctx.currentTime, 0.5);
    }
  };
})();

export { generativeMusic };
