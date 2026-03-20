// timeline.js – Visual history scrubber for recently visited seeds/architectures
import { ARCH_DISPLAY_NAMES } from './background.js';

const MAX_ENTRIES = 30;
const HIDE_DELAY = 5000;

function seedHue(seed) {
  const s = String(seed);
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += s.charCodeAt(i);
  return sum % 360;
}

function abbrev(name) {
  return (name || '????').slice(0, 4);
}

const timeline = {
  history: [],
  currentIndex: -1,
  bar: null,
  strip: null,
  hideTimer: null,
  visible: false,

  init() {
    const bar = document.createElement('div');
    bar.style.cssText =
      'position:fixed;bottom:70px;left:0;width:100%;height:40px;z-index:100;' +
      'background:rgba(0,0,0,0.55);display:flex;align-items:center;' +
      'font-family:"Exo 2",sans-serif;opacity:0;transition:opacity 0.35s;' +
      'pointer-events:none;overflow:hidden;';
    this.bar = bar;

    const strip = document.createElement('div');
    strip.style.cssText =
      'display:flex;align-items:center;gap:4px;padding:0 8px;' +
      'overflow-x:auto;overflow-y:hidden;width:100%;height:100%;' +
      'scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.3) transparent;';
    this.strip = strip;
    bar.appendChild(strip);

    document.body.appendChild(bar);

    bar.addEventListener('mouseenter', () => this._show());
    bar.addEventListener('mouseleave', () => this._scheduleHide());

    document.addEventListener('mousemove', (e) => {
      if (e.clientY > window.innerHeight - 100) this._show();
    });
  },

  record(seed, archIndex) {
    const last = this.history[this.history.length - 1];
    if (last && last.seed === seed && last.archIndex === archIndex) return;

    const entry = {
      seed,
      archIndex,
      archName: ARCH_DISPLAY_NAMES[archIndex] || 'Unknown',
      timestamp: Date.now(),
    };
    this.history.push(entry);
    if (this.history.length > MAX_ENTRIES) this.history.shift();
    this.currentIndex = this.history.length - 1;
    this.update();
    this._show();
    this._scheduleHide();
  },

  update() {
    const strip = this.strip;
    if (!strip) return;
    while (strip.firstChild) strip.removeChild(strip.firstChild);

    this.history.forEach((entry, i) => {
      const frame = document.createElement('div');
      const hue = seedHue(entry.seed);
      const isCurrent = i === this.currentIndex;
      frame.style.cssText =
        'min-width:50px;width:50px;height:30px;border-radius:4px;cursor:pointer;' +
        'display:flex;align-items:center;justify-content:center;flex-shrink:0;' +
        'font-size:11px;font-weight:600;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.6);' +
        'background:hsla(' + hue + ',60%,40%,0.7);' +
        'border:2px solid ' + (isCurrent ? '#fff' : 'rgba(255,255,255,0.15)') + ';' +
        'box-shadow:' + (isCurrent ? '0 0 6px rgba(255,255,255,0.5)' : 'none') + ';' +
        'transition:border-color 0.2s,box-shadow 0.2s;';

      frame.textContent = abbrev(entry.archName);
      frame.title = entry.archName + ' — seed ' + entry.seed;

      frame.addEventListener('click', () => {
        window.location.search = '?seed=' + entry.seed + '&arch=' + entry.archIndex;
      });

      frame.addEventListener('mouseenter', () => {
        if (i !== this.currentIndex) {
          frame.style.borderColor = 'rgba(255,255,255,0.6)';
        }
      });
      frame.addEventListener('mouseleave', () => {
        if (i !== this.currentIndex) {
          frame.style.borderColor = 'rgba(255,255,255,0.15)';
        }
      });

      strip.appendChild(frame);
    });

    // Scroll to current
    if (this.currentIndex >= 0) {
      const target = strip.children[this.currentIndex];
      if (target) {
        requestAnimationFrame(() => {
          target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
      }
    }
  },

  _show() {
    if (!this.bar) return;
    this.visible = true;
    this.bar.style.opacity = '1';
    this.bar.style.pointerEvents = 'auto';
    clearTimeout(this.hideTimer);
  },

  _scheduleHide() {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this._hide(), HIDE_DELAY);
  },

  _hide() {
    if (!this.bar) return;
    this.visible = false;
    this.bar.style.opacity = '0';
    this.bar.style.pointerEvents = 'none';
  },
};

export { timeline };
