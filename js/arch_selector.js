/**
 * @file arch_selector.js
 * @description Visual architecture selector palette overlay.
 */

import { background, ARCH_DISPLAY_NAMES, ALL_ARCHITECTURES } from './background.js';
import { ARCH_DESCRIPTIONS } from './arch_descriptions.js';

export const archSelector = {
    overlay: null,
    grid: null,
    cards: [],

    init() {
        // Overlay container
        const overlay = document.createElement('div');
        overlay.style.cssText = [
            'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
            'z-index:200', 'background:rgba(0,0,0,0.85)', 'backdrop-filter:blur(8px)',
            'display:none', 'overflow-y:auto', 'padding:40px', 'box-sizing:border-box'
        ].join(';');
        this.overlay = overlay;

        // Close on backdrop click (outside grid)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        // Title
        const title = document.createElement('h2');
        title.textContent = 'Select Architecture';
        title.style.cssText = [
            'color:#fff', 'text-align:center', 'font-size:20px', 'margin:0 0 4px',
            "font-family:'Exo 2',sans-serif", 'font-weight:400', 'width:100%'
        ].join(';');
        overlay.appendChild(title);

        // Grid container
        const grid = document.createElement('div');
        grid.style.cssText = [
            'display:grid',
            'grid-template-columns:repeat(auto-fill,minmax(140px,1fr))',
            'gap:12px', 'max-width:1000px', 'margin:20px auto', 'width:100%'
        ].join(';');
        this.grid = grid;

        // Preview thumbnail rendering
        this._previewQueue = [];
        this._previewsRendered = false;

        // Cards
        ARCH_DISPLAY_NAMES.forEach((name, index) => {
            const card = document.createElement('button');
            card.dataset.index = String(index);
            card.style.cssText = [
                'width:100%', 'aspect-ratio:1', 'border-radius:8px',
                'background:rgba(255,255,255,0.06)', 'border:1px solid rgba(255,255,255,0.1)',
                'cursor:pointer', 'display:flex', 'flex-direction:column', 'align-items:center',
                'justify-content:center', 'text-align:center', 'font-size:11px',
                'color:rgba(255,255,255,0.7)', "font-family:'Exo 2',sans-serif",
                'transition:all 0.2s', 'padding:8px', 'box-sizing:border-box',
                'gap:4px', 'overflow:hidden', 'position:relative'
            ].join(';');

            // Preview canvas placeholder
            const preview = document.createElement('canvas');
            preview.width = 120;
            preview.height = 80;
            preview.style.cssText = 'width:100%;height:auto;border-radius:4px;opacity:0.7;';
            card.appendChild(preview);
            card.dataset.previewReady = 'false';

            // Name label
            const label = document.createElement('span');
            label.textContent = name;
            label.style.cssText = 'font-size:11px;font-weight:500;';
            card.appendChild(label);

            // Description
            const desc = document.createElement('span');
            desc.textContent = ARCH_DESCRIPTIONS[index] || '';
            desc.style.cssText = 'font-size:8px;color:rgba(255,255,255,0.4);font-style:italic;line-height:1.2;';
            card.appendChild(desc);

            card.addEventListener('mouseenter', () => {
                card.style.background = 'rgba(255,255,255,0.15)';
                card.style.borderColor = 'rgba(255,255,255,0.3)';
                card.style.transform = 'scale(1.05)';
            });
            card.addEventListener('mouseleave', () => {
                this._styleCard(card);
            });
            card.addEventListener('click', () => {
                background.selectArchitecture(index);
                this.close();
            });

            this.cards.push(card);
            grid.appendChild(card);
        });

        overlay.appendChild(grid);
        document.body.appendChild(overlay);

        // Escape key closes overlay
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.style.display !== 'none') {
                this.close();
            }
        });
    },

    _styleCard(card) {
        const idx = parseInt(card.dataset.index, 10);
        const isActive = background._currentArchIndex === idx;

        card.style.background = isActive ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.06)';
        card.style.borderColor = isActive ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)';
        card.style.transform = '';
        card.style.color = isActive ? '#fff' : 'rgba(255,255,255,0.7)';
    },

    open() {
        // Refresh active highlight before showing
        this.cards.forEach(card => this._styleCard(card));
        this.overlay.style.display = 'flex';
        this.overlay.style.flexDirection = 'column';
        this.overlay.style.alignItems = 'center';
        // Render preview thumbnails lazily (once)
        if (!this._previewsRendered) {
            this._previewsRendered = true;
            this._renderPreviews();
        }
    },

    _renderPreviews() {
        // Render a few previews per frame to avoid blocking
        let idx = 0;
        const renderBatch = () => {
            const batchEnd = Math.min(idx + 3, this.cards.length);
            for (; idx < batchEnd; idx++) {
                const card = this.cards[idx];
                const canvas = card.querySelector('canvas');
                if (!canvas || card.dataset.previewReady === 'true') continue;
                try {
                    const arch = ALL_ARCHITECTURES[idx]();
                    const miniSystem = {
                        ctx: canvas.getContext('2d'),
                        width: 120, height: 80, tick: 30,
                        hue: (idx * 37) % 360, rng: Math.random,
                        isMonochrome: false, isDark: false,
                        speedMultiplier: 1, qualityScale: 0.25,
                        offscreenCanvas: canvas, offscreenCtx: canvas.getContext('2d'),
                        canvas: canvas
                    };
                    // Fill dark background
                    miniSystem.ctx.fillStyle = '#0a0a12';
                    miniSystem.ctx.fillRect(0, 0, 120, 80);
                    arch.init(miniSystem);
                    // Run a few ticks
                    for (let t = 0; t < 5; t++) {
                        miniSystem.tick += 10;
                        arch.update(miniSystem);
                    }
                    arch.draw(miniSystem);
                    card.dataset.previewReady = 'true';
                } catch (_e) {
                    // Architecture may require features not available in mini context
                    const ctx = canvas.getContext('2d');
                    const hue = (idx * 37) % 360;
                    const grad = ctx.createLinearGradient(0, 0, 120, 80);
                    grad.addColorStop(0, `hsl(${hue}, 60%, 15%)`);
                    grad.addColorStop(1, `hsl(${(hue + 60) % 360}, 60%, 8%)`);
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, 120, 80);
                    card.dataset.previewReady = 'true';
                }
            }
            if (idx < this.cards.length) requestAnimationFrame(renderBatch);
        };
        requestAnimationFrame(renderBatch);
    },

    close() {
        this.overlay.style.display = 'none';
    },

    toggle() {
        if (this.overlay.style.display === 'none') {
            this.open();
        } else {
            this.close();
        }
    }
};
