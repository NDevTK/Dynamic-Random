/**
 * @file favorites.js
 * @description Manages a localStorage-backed favorites collection for seeds and architectures.
 * CSP-safe: uses only createElement/textContent/style.cssText — no innerHTML.
 */

import { currentSeed } from './state.js';
import { background, ARCH_DISPLAY_NAMES } from './background.js';

const STORAGE_KEY = 'celestial-favorites';
const MAX_FAVORITES = 50;

/**
 * Format a timestamp into a human-readable relative time string.
 * @param {number} ts - Unix timestamp in milliseconds.
 * @returns {string} Relative time such as "2h ago" or "3d ago".
 */
function relativeTime(ts) {
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    if (days < 30) return days + 'd ago';
    const months = Math.floor(days / 30);
    if (months < 12) return months + 'mo ago';
    const years = Math.floor(months / 12);
    return years + 'y ago';
}

/**
 * Build the overlay panel element tree. All DOM is constructed via
 * createElement / textContent / style.cssText — no innerHTML.
 */
function buildPanel() {
    // --- backdrop ---
    const overlay = document.createElement('div');
    overlay.style.cssText =
        'position:fixed;inset:0;z-index:250;display:none;align-items:center;justify-content:center;' +
        'background:rgba(0,0,0,0.55);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);' +
        'font-family:"Exo 2",sans-serif;';

    // --- panel ---
    const panel = document.createElement('div');
    panel.style.cssText =
        'background:rgba(15,15,30,0.85);border:1px solid rgba(255,255,255,0.12);' +
        'border-radius:16px;padding:28px 24px 20px;width:380px;max-width:92vw;' +
        'max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.5);';

    // --- header row ---
    const header = document.createElement('div');
    header.style.cssText =
        'display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;';

    const titleWrap = document.createElement('div');
    titleWrap.style.cssText = 'display:flex;align-items:center;gap:8px;';

    const star = document.createElement('span');
    star.textContent = '\u2605';
    star.style.cssText = 'font-size:22px;color:#f5c842;';

    const title = document.createElement('span');
    title.textContent = 'Favorites';
    title.style.cssText = 'font-size:20px;font-weight:700;color:#fff;letter-spacing:0.5px;';

    titleWrap.appendChild(star);
    titleWrap.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.style.cssText =
        'background:none;border:none;color:rgba(255,255,255,0.6);font-size:20px;cursor:pointer;' +
        'padding:4px 8px;border-radius:6px;transition:color 0.2s;font-family:"Exo 2",sans-serif;';
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = '#fff'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.color = 'rgba(255,255,255,0.6)'; });
    closeBtn.addEventListener('click', () => { favorites.close(); });

    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    // --- save button ---
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '\u2605  Save Current';
    saveBtn.style.cssText =
        'width:100%;padding:10px 0;margin-bottom:16px;border:1px solid rgba(245,200,66,0.4);' +
        'border-radius:10px;background:rgba(245,200,66,0.1);color:#f5c842;font-size:14px;' +
        'font-weight:600;cursor:pointer;transition:background 0.2s;font-family:"Exo 2",sans-serif;';
    saveBtn.addEventListener('mouseenter', () => { saveBtn.style.background = 'rgba(245,200,66,0.22)'; });
    saveBtn.addEventListener('mouseleave', () => { saveBtn.style.background = 'rgba(245,200,66,0.1)'; });
    saveBtn.addEventListener('click', () => {
        const archIndex = background._currentArchIndex === -1 ? 0 : background._currentArchIndex;
        const archName = ARCH_DISPLAY_NAMES[archIndex] || 'Unknown';
        favorites.add(currentSeed, archIndex, archName);
    });

    // --- scrollable list ---
    const list = document.createElement('div');
    list.style.cssText =
        'flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;' +
        'scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.15) transparent;';

    // --- empty state ---
    const empty = document.createElement('div');
    empty.textContent = 'No favorites yet. Save your first one!';
    empty.style.cssText =
        'text-align:center;color:rgba(255,255,255,0.35);padding:32px 0;font-size:14px;';

    panel.appendChild(header);
    panel.appendChild(saveBtn);
    panel.appendChild(list);
    overlay.appendChild(panel);

    // close on backdrop click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) favorites.close();
    });

    return { overlay, list, empty };
}

/**
 * Create a single favorite-item row element.
 * @param {{ seed: string, archIndex: number, archName: string, timestamp: number }} entry
 * @param {number} index - Position in the favorites array.
 * @returns {HTMLElement}
 */
function buildItem(entry, index) {
    const row = document.createElement('div');
    row.style.cssText =
        'display:flex;align-items:center;justify-content:space-between;padding:10px 12px;' +
        'border-radius:10px;background:rgba(255,255,255,0.04);cursor:pointer;' +
        'transition:background 0.2s;';
    row.addEventListener('mouseenter', () => { row.style.background = 'rgba(255,255,255,0.09)'; });
    row.addEventListener('mouseleave', () => { row.style.background = 'rgba(255,255,255,0.04)'; });

    // left: info block
    const info = document.createElement('div');
    info.style.cssText = 'display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;';

    const archLabel = document.createElement('span');
    archLabel.textContent = entry.archName;
    archLabel.style.cssText =
        'font-size:14px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';

    const meta = document.createElement('span');
    const seedDisplay = entry.seed.length > 8 ? entry.seed.slice(0, 8) + '\u2026' : entry.seed;
    meta.textContent = seedDisplay + '  \u00b7  ' + relativeTime(entry.timestamp);
    meta.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.4);';

    info.appendChild(archLabel);
    info.appendChild(meta);

    // right: delete button
    const delBtn = document.createElement('button');
    delBtn.textContent = '\u00d7';
    delBtn.style.cssText =
        'background:none;border:none;color:rgba(255,255,255,0.3);font-size:18px;cursor:pointer;' +
        'padding:2px 6px;border-radius:4px;transition:color 0.2s;flex-shrink:0;margin-left:8px;' +
        'font-family:"Exo 2",sans-serif;';
    delBtn.addEventListener('mouseenter', () => { delBtn.style.color = '#ff6b6b'; });
    delBtn.addEventListener('mouseleave', () => { delBtn.style.color = 'rgba(255,255,255,0.3)'; });
    delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        favorites.remove(index);
    });

    // clicking the row loads the favorite
    row.addEventListener('click', () => {
        window.location.search = '?seed=' + entry.seed + '&arch=' + entry.archIndex;
    });

    row.appendChild(info);
    row.appendChild(delBtn);
    return row;
}

// ─── Singleton ──────────────────────────────────────────────────────────────

const favorites = {
    _data: [],
    _overlay: null,
    _list: null,
    _empty: null,
    _isOpen: false,

    /**
     * Load persisted favorites from localStorage and install keyboard listener.
     */
    init() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) this._data = JSON.parse(raw);
        } catch (_) {
            this._data = [];
        }

        const els = buildPanel();
        this._overlay = els.overlay;
        this._list = els.list;
        this._empty = els.empty;
        document.body.appendChild(this._overlay);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._isOpen) {
                this.close();
                return;
            }
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
            if (e.key === 'f' || e.key === 'F') {
                if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                    this.toggle();
                }
            }
        });
    },

    /**
     * Persist the current _data array to localStorage.
     */
    _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
        } catch (_) { /* quota errors, etc. */ }
    },

    /**
     * Re-render the list contents from _data.
     */
    _render() {
        while (this._list.firstChild) {
            this._list.removeChild(this._list.firstChild);
        }
        if (this._data.length === 0) {
            this._list.appendChild(this._empty);
            return;
        }
        // newest first
        for (let i = this._data.length - 1; i >= 0; i--) {
            this._list.appendChild(buildItem(this._data[i], i));
        }
    },

    /**
     * Add a favorite entry.
     * @param {string} seed
     * @param {number} archIndex
     * @param {string} archName
     */
    add(seed, archIndex, archName) {
        this._data.push({
            seed: String(seed),
            archIndex: Number(archIndex),
            archName: String(archName),
            timestamp: Date.now()
        });
        // trim to MAX_FAVORITES (oldest first, so remove from front)
        while (this._data.length > MAX_FAVORITES) {
            this._data.shift();
        }
        this._save();
        if (this._isOpen) this._render();
    },

    /**
     * Remove a favorite by its index in the underlying array.
     * @param {number} index
     */
    remove(index) {
        if (index >= 0 && index < this._data.length) {
            this._data.splice(index, 1);
            this._save();
            if (this._isOpen) this._render();
        }
    },

    /**
     * Return a copy of all favorites.
     * @returns {Array<{seed: string, archIndex: number, archName: string, timestamp: number}>}
     */
    getAll() {
        return this._data.slice();
    },

    /**
     * Toggle the panel open/closed.
     */
    toggle() {
        if (this._isOpen) this.close();
        else this.open();
    },

    /**
     * Show the favorites panel overlay.
     */
    open() {
        this._render();
        this._overlay.style.display = 'flex';
        this._isOpen = true;
    },

    /**
     * Hide the favorites panel overlay.
     */
    close() {
        this._overlay.style.display = 'none';
        this._isOpen = false;
    }
};

export { favorites };
