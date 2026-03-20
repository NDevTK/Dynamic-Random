/**
 * @file help_overlay.js
 * @description Keyboard shortcut help overlay triggered by pressing '?'.
 * CSP-safe: uses only createElement / textContent / style.cssText.
 */

const SHORTCUTS = [
    { key: '?',              desc: 'Show this help' },
    { key: 'H',              desc: 'Toggle HUD' },
    { key: 'P',              desc: 'Screenshot' },
    { key: 'M',              desc: 'Toggle microphone' },
    { key: 'C',              desc: 'Toggle camera' },
    { key: 'V',              desc: 'Toggle speech input' },
    { key: 'B',              desc: 'Toggle architecture blending' },
    { key: 'F',              desc: 'Open favorites' },
    { key: 'T',              desc: 'Open theme editor' },
    { key: '\u2190 \u2192',  desc: 'Cycle architecture' },
    { key: 'Click',          desc: 'Shockwave' },
    { key: 'Right-click',    desc: 'Gravity well' },
    { key: 'Hold left-click', desc: 'Speed boost' },
    { key: 'Pinch',          desc: 'Zoom (touch)' },
    { key: 'Swipe',          desc: 'Cycle architecture (touch)' },
    { key: 'Double-tap',     desc: 'Shockwave (touch)' },
    { key: 'Long-press',     desc: 'Gravity well (touch)' },
    { key: 'Escape',         desc: 'Close overlays' }
];

export const helpOverlay = {
    /** @type {HTMLDivElement|null} */
    overlay: null,
    /** @type {boolean} */
    visible: false,

    /**
     * Build the DOM tree and append to <body>.
     * Must be called once after DOMContentLoaded.
     */
    init() {
        // --- backdrop / overlay ---
        const overlay = document.createElement('div');
        overlay.style.cssText = [
            'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
            'z-index:250', 'background:rgba(0,0,0,0.75)', 'backdrop-filter:blur(12px)',
            '-webkit-backdrop-filter:blur(12px)',
            'display:flex', 'align-items:center', 'justify-content:center',
            'opacity:0', 'pointer-events:none',
            'transition:opacity 0.25s ease',
            'padding:20px', 'box-sizing:border-box'
        ].join(';');
        this.overlay = overlay;

        // Close when clicking the backdrop (but not the panel)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.hide();
        });

        // --- panel ---
        const panel = document.createElement('div');
        panel.style.cssText = [
            'background:rgba(255,255,255,0.07)',
            'border:1px solid rgba(255,255,255,0.12)',
            'border-radius:16px',
            'padding:32px 36px 28px',
            'max-width:480px', 'width:100%',
            'max-height:85vh', 'overflow-y:auto',
            'box-shadow:0 8px 32px rgba(0,0,0,0.45)',
            "font-family:'Exo 2',sans-serif"
        ].join(';');

        // --- title ---
        const title = document.createElement('h2');
        title.textContent = 'Keyboard Shortcuts';
        title.style.cssText = [
            'color:#fff', 'text-align:center', 'font-size:18px',
            'margin:0 0 6px', 'font-weight:500', 'letter-spacing:0.5px',
            "font-family:'Exo 2',sans-serif"
        ].join(';');
        panel.appendChild(title);

        // --- subtitle ---
        const subtitle = document.createElement('p');
        subtitle.textContent = 'Press ? to toggle this overlay';
        subtitle.style.cssText = [
            'color:rgba(255,255,255,0.4)', 'text-align:center',
            'font-size:11px', 'margin:0 0 20px', 'font-weight:300',
            "font-family:'Exo 2',sans-serif"
        ].join(';');
        panel.appendChild(subtitle);

        // --- divider ---
        const divider = document.createElement('div');
        divider.style.cssText = [
            'height:1px', 'background:rgba(255,255,255,0.1)',
            'margin:0 0 16px'
        ].join(';');
        panel.appendChild(divider);

        // --- shortcut grid ---
        const grid = document.createElement('div');
        grid.style.cssText = [
            'display:grid',
            'grid-template-columns:auto 1fr',
            'gap:10px 20px',
            'align-items:center'
        ].join(';');

        for (const shortcut of SHORTCUTS) {
            // key badge
            const keyEl = document.createElement('span');
            keyEl.style.cssText = [
                'display:inline-block',
                'background:rgba(255,255,255,0.1)',
                'border:1px solid rgba(255,255,255,0.18)',
                'border-radius:6px',
                'padding:4px 10px',
                'font-size:12px',
                'color:#fff',
                'text-align:center',
                'min-width:36px',
                'white-space:nowrap',
                "font-family:'Exo 2',sans-serif",
                'font-weight:500',
                'letter-spacing:0.3px',
                'box-shadow:0 1px 3px rgba(0,0,0,0.25)'
            ].join(';');
            keyEl.textContent = shortcut.key;

            // description
            const descEl = document.createElement('span');
            descEl.style.cssText = [
                'color:rgba(255,255,255,0.7)',
                'font-size:13px',
                "font-family:'Exo 2',sans-serif",
                'font-weight:300'
            ].join(';');
            descEl.textContent = shortcut.desc;

            grid.appendChild(keyEl);
            grid.appendChild(descEl);
        }

        panel.appendChild(grid);

        // --- bottom hint ---
        const hint = document.createElement('p');
        hint.textContent = 'Press Escape or ? to close';
        hint.style.cssText = [
            'color:rgba(255,255,255,0.25)', 'text-align:center',
            'font-size:10px', 'margin:20px 0 0', 'font-weight:300',
            "font-family:'Exo 2',sans-serif"
        ].join(';');
        panel.appendChild(hint);

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        // --- keyboard listener ---
        window.addEventListener('keydown', (e) => {
            if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
                // Don't toggle if user is typing in an input / textarea
                const tag = document.activeElement && document.activeElement.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
                e.preventDefault();
                this.toggle();
            } else if (e.key === 'Escape' && this.visible) {
                e.preventDefault();
                this.hide();
            }
        });
    },

    /** Show the overlay with a fade-in. */
    show() {
        if (!this.overlay) return;
        this.visible = true;
        this.overlay.style.pointerEvents = 'auto';
        // Force reflow before transitioning opacity
        void this.overlay.offsetWidth;
        this.overlay.style.opacity = '1';
    },

    /** Hide the overlay with a fade-out. */
    hide() {
        if (!this.overlay) return;
        this.visible = false;
        this.overlay.style.opacity = '0';
        this.overlay.style.pointerEvents = 'none';
    },

    /** Toggle visibility. */
    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }
};
