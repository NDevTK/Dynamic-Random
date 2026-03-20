/**
 * @file embed_mode.js
 * @description Manages embed/iframe display mode – hides all UI chrome.
 */

const UI_SELECTORS = [
    '#ui-container',
    '.input-toolbar-container',
];

const embedMode = {
    isEmbed: false,
    _hiddenEls: [],
    _watermark: null,

    init() {
        let inIframe = false;
        try { inIframe = window !== window.top; } catch (_) { inIframe = true; }

        const params = new URLSearchParams(window.location.search);
        if (params.get('embed') === '1' || inIframe) {
            this.hideUI();
        }
    },

    hideUI() {
        if (this.isEmbed) return;
        this.isEmbed = true;
        document.body.classList.add('embed-mode');

        // Hide elements found by selector
        for (const sel of UI_SELECTORS) {
            const el = document.querySelector(sel);
            if (el) { el.style.display = 'none'; this._hiddenEls.push(el); }
        }

        // Hide dynamically-created overlays from known modules
        this._hideModuleOverlay('archSelector', 'overlay');
        this._hideModuleOverlay('favorites', '_overlay');
        this._hideModuleOverlay('helpOverlay', 'overlay');
        this._hideModuleOverlay('timeline', 'bar');

        // Inject a minimal style to catch stray high-z overlays
        const style = document.createElement('style');
        style.textContent =
            '.embed-mode .arch-selector-overlay,' +
            '.embed-mode .favorites-overlay,' +
            '.embed-mode .help-overlay,' +
            '.embed-mode .theme-editor-sidebar,' +
            '.embed-mode .timeline-filmstrip { display:none !important; }';
        document.head.appendChild(style);
        this._style = style;

        this._createWatermark();
    },

    showUI() {
        if (!this.isEmbed) return;
        this.isEmbed = false;
        document.body.classList.remove('embed-mode');

        for (const el of this._hiddenEls) {
            el.style.display = '';
        }
        this._hiddenEls = [];

        if (this._watermark) {
            this._watermark.remove();
            this._watermark = null;
        }
        if (this._style) {
            this._style.remove();
            this._style = null;
        }
    },

    /** Attempt to hide an overlay property on a global/imported module. */
    _hideModuleOverlay(globalName, prop) {
        const mod = window[globalName];
        if (mod && mod[prop]) {
            mod[prop].style.display = 'none';
            this._hiddenEls.push(mod[prop]);
        }
    },

    _createWatermark() {
        const a = document.createElement('a');
        const url = new URL(window.location.href);
        url.searchParams.delete('embed');
        a.href = url.toString();
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'Celestial Canvas';
        a.style.cssText = [
            'position:fixed',
            'bottom:6px',
            'right:8px',
            'font-family:"Exo 2",sans-serif',
            'font-size:9px',
            'color:#fff',
            'opacity:0.2',
            'text-decoration:none',
            'pointer-events:auto',
            'z-index:999999',
        ].join(';');
        document.body.appendChild(a);
        this._watermark = a;
    },
};

export { embedMode };
