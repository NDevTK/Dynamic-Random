import { background } from './background.js';
import { postProcessing } from './post_processing.js';
import { generativeMusic } from './generative_music.js';

const FONT = "'Exo 2', sans-serif";
const PANEL_W = 280;

function el(tag, styles, text) {
  const e = document.createElement(tag);
  if (styles) e.style.cssText = styles;
  if (text !== undefined) e.textContent = text;
  return e;
}

function makeRange(min, max, step, value, onChange) {
  const input = el('input', 'width:100%;accent-color:currentColor;margin:0;');
  Object.assign(input, { type: 'range', min, max, step, value });
  input.addEventListener('input', () => onChange(parseFloat(input.value)));
  return input;
}

function makeCheckbox(checked, onChange) {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.style.cssText = 'accent-color:currentColor;';
  input.addEventListener('change', () => onChange(input.checked));
  return input;
}

function makeRow(labelText) {
  const row = el('div', 'margin-bottom:12px;');
  const label = el('label', `display:block;font-size:11px;opacity:0.7;margin-bottom:4px;font-family:${FONT};`, labelText);
  row.appendChild(label);
  return row;
}

function buildPanel() {
  const panel = el('div',
    `position:fixed;top:0;right:0;width:${PANEL_W}px;height:100%;z-index:200;` +
    'transform:translateX(100%);transition:transform .3s ease;' +
    'background:rgba(10,10,20,0.82);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);' +
    `border-left:1px solid rgba(255,255,255,0.08);color:#ddd;font-family:${FONT};` +
    'overflow-y:auto;padding:20px;box-sizing:border-box;');

  const title = el('div', 'font-size:14px;font-weight:600;margin-bottom:16px;letter-spacing:1px;', 'THEME EDITOR');
  panel.appendChild(title);

  const controls = {};

  // Hue
  const hueRow = makeRow('Hue');
  const hueSlider = makeRange(0, 360, 1, background.hue, v => {
    background.hue = v;
    background.updateThemeColors();
  });
  controls.hue = hueSlider;
  hueRow.appendChild(hueSlider);
  panel.appendChild(hueRow);

  // Monochrome
  const monoRow = makeRow('Monochrome');
  const monoCb = makeCheckbox(background.isMonochrome, v => {
    background.isMonochrome = v;
    background.updateThemeColors();
  });
  controls.mono = monoCb;
  monoRow.appendChild(monoCb);
  panel.appendChild(monoRow);

  // Dark mode
  const darkRow = makeRow('Dark mode');
  const darkCb = makeCheckbox(background.isDark, v => {
    background.isDark = v;
    background.updateThemeColors();
  });
  controls.dark = darkCb;
  darkRow.appendChild(darkCb);
  panel.appendChild(darkRow);

  // Gradient style
  const gradRow = makeRow('Gradient style');
  const gradNames = ['diagonal', 'radial', 'multi-stop', 'horizontal', 'corner'];
  const gradWrap = el('div', 'display:flex;gap:4px;flex-wrap:wrap;');
  const gradBtns = gradNames.map((name, i) => {
    const btn = el('button',
      'padding:3px 6px;font-size:10px;border:1px solid rgba(255,255,255,0.2);' +
      `background:${i === (background.gradientStyle || 0) ? 'rgba(255,255,255,0.18)' : 'transparent'};` +
      `color:#ddd;border-radius:3px;cursor:pointer;font-family:${FONT};`, name);
    btn.addEventListener('click', () => {
      background.gradientStyle = i;
      background.updateThemeColors();
      gradBtns.forEach((b, j) => {
        b.style.background = j === i ? 'rgba(255,255,255,0.18)' : 'transparent';
      });
    });
    gradWrap.appendChild(btn);
    return btn;
  });
  controls.gradBtns = gradBtns;
  gradRow.appendChild(gradWrap);
  panel.appendChild(gradRow);

  // Speed
  const speedRow = makeRow('Speed');
  const speedSlider = makeRange(0.5, 5, 0.1, background.targetSpeed, v => {
    background.targetSpeed = v;
  });
  controls.speed = speedSlider;
  speedRow.appendChild(speedSlider);
  panel.appendChild(speedRow);

  // Post-processing toggles
  const ppNames = [
    ['bloom', 'Bloom'],
    ['colorGrading', 'Color grading'],
    ['filmEmulation', 'Film emulation'],
    ['aberration', 'Aberration'],
    ['toneMapping', 'Tone mapping']
  ];
  const ppCbs = {};
  for (const [key, label] of ppNames) {
    const row = makeRow(label);
    const cb = makeCheckbox(postProcessing.activeEffects[key], v => {
      postProcessing.activeEffects[key] = v;
    });
    ppCbs[key] = cb;
    row.appendChild(cb);
    panel.appendChild(row);
  }
  controls.pp = ppCbs;

  // Blend alpha
  const blendRow = makeRow('Blend alpha');
  const blendSlider = makeRange(0, 1, 0.01, background._blendAlpha, v => {
    background._blendAlpha = v;
  });
  controls.blend = blendSlider;
  blendRow.appendChild(blendSlider);
  panel.appendChild(blendRow);

  // Music volume
  const volRow = makeRow('Music volume');
  const volSlider = makeRange(0, 1, 0.01, generativeMusic.volume, v => {
    generativeMusic.volume = v;
  });
  controls.vol = volSlider;
  volRow.appendChild(volSlider);
  panel.appendChild(volRow);

  // Reset button
  const resetRow = el('div', 'margin-top:8px;');
  const resetBtn = el('button',
    'width:100%;padding:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.06);' +
    `color:#ddd;border-radius:4px;cursor:pointer;font-family:${FONT};font-size:12px;`, 'Reset');
  resetBtn.addEventListener('click', () => resetDefaults(controls));
  resetRow.appendChild(resetBtn);
  panel.appendChild(resetRow);

  return { panel, controls };
}

const defaults = { hue: 0, isMonochrome: false, isDark: false, gradientStyle: 0, targetSpeed: 1, blendAlpha: 0.35 };

function resetDefaults(controls) {
  background.hue = defaults.hue;
  background.isMonochrome = defaults.isMonochrome;
  background.isDark = defaults.isDark;
  background.gradientStyle = defaults.gradientStyle;
  background.targetSpeed = defaults.targetSpeed;
  background._blendAlpha = defaults.blendAlpha;
  background.updateThemeColors();

  for (const key of Object.keys(postProcessing.activeEffects)) {
    postProcessing.activeEffects[key] = false;
    if (controls.pp[key]) controls.pp[key].checked = false;
  }

  controls.hue.value = defaults.hue;
  controls.mono.checked = defaults.isMonochrome;
  controls.dark.checked = defaults.isDark;
  controls.speed.value = defaults.targetSpeed;
  controls.blend.value = defaults.blendAlpha;
  controls.vol.value = 0.08;
  generativeMusic.volume = 0.08;
  controls.gradBtns.forEach((b, j) => {
    b.style.background = j === 0 ? 'rgba(255,255,255,0.18)' : 'transparent';
  });
}

const themeEditor = {
  _panel: null,
  _open: false,

  init() {
    const { panel, controls } = buildPanel();
    this._panel = panel;
    this._controls = controls;
    document.body.appendChild(panel);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this._open) { this.close(); return; }
      if (e.key === 't' || e.key === 'T') {
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
        this.toggle();
      }
    });
  },

  toggle() { this._open ? this.close() : this.open(); },

  open() {
    if (!this._panel) return;
    this._open = true;
    this._panel.style.transform = 'translateX(0)';
  },

  close() {
    if (!this._panel) return;
    this._open = false;
    this._panel.style.transform = 'translateX(100%)';
  }
};

export { themeEditor };
