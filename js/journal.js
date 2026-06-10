/**
 * @file journal.js
 * @description The constellation journal: a localStorage-backed field
 * notebook that automatically logs every universe you visit — seed, epithet,
 * blueprint, lineage generation, visit count, and when you last saw it.
 * Press J to leaf through it; clicking an entry travels back to that
 * universe. Capped at 150 entries, oldest-seen evicted first.
 *
 * CSP-safe: built entirely with createElement/textContent.
 */

import { loreCodex } from './lore_codex.js';
import { parseLineage, toRoman } from './epoch_system.js';

const STORAGE_KEY = 'celestial-journal';
const MAX_ENTRIES = 150;

function timeAgo(ts) {
    const s = Math.max(1, (Date.now() - ts) / 1000);
    if (s < 90) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)}m ago`;
    if (s < 86400) return `${Math.round(s / 3600)}h ago`;
    return `${Math.round(s / 86400)}d ago`;
}

export const journal = {
    _entries: [],
    _overlay: null,
    _list: null,
    _isOpen: false,

    init() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) this._entries = parsed;
            }
        } catch (err) { /* private mode etc. — journal lives for the session */ }

        document.addEventListener('keydown', (e) => {
            const el = document.activeElement;
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
            if (e.key === 'Escape' && this._isOpen) this.close();
            else if ((e.key === 'j' || e.key === 'J') && !e.ctrlKey && !e.metaKey && !e.altKey) this.toggle();
        });
    },

    /** Log a visit. Called from universe.js after the lore is written. */
    record(seed, blueprintName) {
        if (!seed) return;
        const now = Date.now();
        const existing = this._entries.find((en) => en.seed === seed);
        if (existing) {
            existing.visits++;
            existing.ts = now;
        } else {
            this._entries.push({
                seed,
                epithet: loreCodex.current ? loreCodex.current.epithet : '',
                blueprint: blueprintName || '',
                generation: parseLineage(seed).generation,
                visits: 1,
                ts: now,
            });
            if (this._entries.length > MAX_ENTRIES) {
                this._entries.sort((a, b) => b.ts - a.ts);
                this._entries.length = MAX_ENTRIES;
            }
        }
        this._save();
        if (this._isOpen) this._renderList();
    },

    _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._entries));
        } catch (err) { /* best effort */ }
    },

    toggle() {
        if (this._isOpen) this.close();
        else this.open();
    },

    open() {
        if (!this._overlay) this._build();
        this._renderList();
        this._overlay.style.display = 'flex';
        requestAnimationFrame(() => { this._overlay.style.opacity = '1'; });
        this._isOpen = true;
    },

    close() {
        if (!this._overlay) return;
        this._overlay.style.opacity = '0';
        setTimeout(() => { this._overlay.style.display = 'none'; }, 250);
        this._isOpen = false;
    },

    _build() {
        const overlay = document.createElement('div');
        overlay.style.cssText =
            'position:fixed;inset:0;z-index:200;display:none;flex-direction:column;align-items:center;' +
            'background:rgba(5,5,10,0.82);backdrop-filter:blur(10px);opacity:0;transition:opacity 0.25s;' +
            'font-family:"Exo 2",sans-serif;overflow-y:auto;padding:48px 16px;box-sizing:border-box;cursor:default;';
        overlay.addEventListener('click', (e) => { if (e.target === overlay) this.close(); });

        const title = document.createElement('h2');
        title.textContent = 'Constellation Journal';
        title.style.cssText = 'margin:0 0 4px;font-weight:300;letter-spacing:5px;text-transform:uppercase;font-size:18px;color:rgba(255,255,255,0.9);';

        const subtitle = document.createElement('p');
        subtitle.style.cssText = 'margin:0 0 24px;font-size:11px;color:rgba(255,255,255,0.4);font-style:italic;';

        this._subtitle = subtitle;
        this._list = document.createElement('div');
        this._list.style.cssText = 'display:flex;flex-direction:column;gap:8px;width:min(680px,94vw);';

        overlay.appendChild(title);
        overlay.appendChild(subtitle);
        overlay.appendChild(this._list);
        document.body.appendChild(overlay);
        this._overlay = overlay;
    },

    _renderList() {
        const list = this._list;
        while (list.firstChild) list.removeChild(list.firstChild);

        const entries = [...this._entries].sort((a, b) => b.ts - a.ts);
        this._subtitle.textContent = entries.length
            ? `${entries.length} charted universe${entries.length === 1 ? '' : 's'} · click one to travel · Esc to close`
            : 'No universes charted yet — they are logged as you travel.';

        for (const en of entries) {
            const row = document.createElement('div');
            row.style.cssText =
                'display:flex;align-items:baseline;gap:12px;padding:10px 16px;border-radius:10px;cursor:pointer;' +
                'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);transition:background 0.15s;';
            row.addEventListener('mouseenter', () => { row.style.background = 'rgba(255,255,255,0.12)'; });
            row.addEventListener('mouseleave', () => { row.style.background = 'rgba(255,255,255,0.05)'; });
            row.addEventListener('click', () => {
                window.location.search = '?seed=' + encodeURIComponent(en.seed);
            });

            const epithet = document.createElement('span');
            epithet.textContent = en.epithet || '“Uncharted”';
            epithet.style.cssText = 'font-style:italic;font-size:14px;color:rgba(255,255,255,0.92);flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

            const meta = document.createElement('span');
            const genText = en.generation > 1 ? ` · Gen ${toRoman(en.generation)}` : '';
            meta.textContent = `${en.blueprint}${genText}`;
            meta.style.cssText = 'font-size:10px;color:rgba(255,220,170,0.55);white-space:nowrap;';

            const seed = document.createElement('span');
            seed.textContent = en.seed;
            seed.style.cssText = 'font-family:monospace;font-size:10px;color:rgba(255,255,255,0.45);white-space:nowrap;';

            const when = document.createElement('span');
            when.textContent = `${en.visits > 1 ? en.visits + '× · ' : ''}${timeAgo(en.ts)}`;
            when.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.3);white-space:nowrap;';

            row.appendChild(epithet);
            row.appendChild(meta);
            row.appendChild(seed);
            row.appendChild(when);
            list.appendChild(row);
        }
    },
};
