/**
 * @file arch_selector.js
 * @description Visual architecture selector palette overlay.
 */

import { background } from './background.js';

const ARCH_NAMES = [
    'Cosmic', 'Digital', 'Geometric', 'Organic', 'Flow', 'Abstract', 'Glitch',
    'Fabric', 'Voxel', 'Fractal', 'Aurora', 'Firefly', 'Raindrop', 'Kaleidoscope',
    'Terrain', 'Lava', 'Life', 'Synthwave', 'Pendulum', 'Ink', 'CircuitGrowth',
    'ReactionDiffusion', 'Voronoi', 'MagneticField', 'Fluid', 'Constellation',
    'GravityPool', 'DNA', 'Topography', 'PixelSort', 'Weather', 'ShatteredMirror',
    'Mycelium', 'Interference', 'DimensionalRift', 'DeepSea', 'GlitchFabric',
    'Typography', 'Origami', 'NeuralNet', 'TidalPool', 'SpeechTypography',
    'CameraTexture', 'Cloth', 'Softbody', 'WebGPUParticle', 'WebGPUFluid',
    'Attractor', 'SacredGeometry', 'FractalExplorer', 'Spirograph', 'Truchet', 'LSystem'
];

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

        // Cards
        ARCH_NAMES.forEach((name, index) => {
            const card = document.createElement('button');
            card.dataset.index = String(index);
            card.style.cssText = [
                'width:100%', 'aspect-ratio:1', 'border-radius:8px',
                'background:rgba(255,255,255,0.06)', 'border:1px solid rgba(255,255,255,0.1)',
                'cursor:pointer', 'display:flex', 'align-items:center',
                'justify-content:center', 'text-align:center', 'font-size:11px',
                'color:rgba(255,255,255,0.7)', "font-family:'Exo 2',sans-serif",
                'transition:all 0.2s', 'padding:8px', 'box-sizing:border-box'
            ].join(';');
            card.textContent = name;

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
        const isActive = background._currentArchIndex === idx ||
            (background._currentArchIndex === -1 &&
                background.architecture &&
                ARCH_NAMES[idx] &&
                background.architecture.constructor.name.startsWith(ARCH_NAMES[idx]));

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
