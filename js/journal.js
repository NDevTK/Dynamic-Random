/**
 * @file journal.js
 * @description The constellation journal: a localStorage-backed field
 * notebook that automatically logs every universe you visit — seed, epithet,
 * blueprint, lineage generation, visit count, and when you last saw it —
 * plus the home worlds of travelers you've met (charted but unvisited).
 *
 * Press J to open it. Two views:
 *  - List: newest first; click an entry to travel back.
 *  - Observatory: the journal drawn as a star chart (observatory_chart.js) —
 *    star positions derive from seeds, lineages link into constellations,
 *    your visit order traces a faint journey line, and met-travelers' homes
 *    are hollow stars. Click any star to travel there.
 *
 * Capped at 150 entries, oldest-seen evicted first. CSP-safe: built entirely
 * with createElement/textContent.
 */

import { loreCodex } from './lore_codex.js';
import { parseLineage, toRoman } from './epoch_system.js';
import { currentSeed } from './state.js';
import { chartLayout, drawChart, hitTest } from './observatory_chart.js';

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
    _canvas: null,
    _ctx: null,
    _layout: null,
    _hovered: null,
    _view: 'list',
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
            // A met-traveler's home, now actually visited, becomes a real star
            if (existing.kind === 'met') {
                existing.kind = 'visited';
                existing.visits = 0;
                existing.epithet = loreCodex.current ? loreCodex.current.epithet : '';
                existing.blueprint = blueprintName || '';
                existing.generation = parseLineage(seed).generation;
            }
            existing.visits = (existing.visits || 0) + 1;
            existing.ts = now;
        } else {
            this._entries.push({
                seed,
                kind: 'visited',
                epithet: loreCodex.current ? loreCodex.current.epithet : '',
                blueprint: blueprintName || '',
                generation: parseLineage(seed).generation,
                visits: 1,
                ts: now,
            });
            this._evict();
        }
        this._save();
        if (this._isOpen) this._renderView();
    },

    /** Chart a traveler's home world (hollow star until you actually go). */
    recordMet(seed, travelerName) {
        if (!seed || this._entries.some((en) => en.seed === seed)) return;
        this._entries.push({
            seed,
            kind: 'met',
            metName: travelerName || '',
            generation: parseLineage(seed).generation,
            ts: Date.now(),
        });
        this._evict();
        this._save();
        if (this._isOpen) this._renderView();
    },

    _evict() {
        if (this._entries.length > MAX_ENTRIES) {
            this._entries.sort((a, b) => b.ts - a.ts);
            this._entries.length = MAX_ENTRIES;
        }
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
        this._renderView();
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

    _travelTo(seed) {
        window.location.search = '?seed=' + encodeURIComponent(seed);
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
        subtitle.style.cssText = 'margin:0 0 14px;font-size:11px;color:rgba(255,255,255,0.4);font-style:italic;';
        this._subtitle = subtitle;

        // View tabs
        const tabs = document.createElement('div');
        tabs.style.cssText = 'display:flex;gap:8px;margin-bottom:18px;';
        const makeTab = (label, view) => {
            const b = document.createElement('button');
            b.textContent = label;
            b.style.cssText =
                'padding:5px 16px;border-radius:14px;font-family:inherit;font-size:11px;cursor:pointer;' +
                'letter-spacing:2px;text-transform:uppercase;background:rgba(255,255,255,0.06);' +
                'border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);';
            b.addEventListener('click', () => { this._view = view; this._renderView(); });
            tabs.appendChild(b);
            return b;
        };
        this._tabList = makeTab('List', 'list');
        this._tabChart = makeTab('Observatory', 'chart');

        this._list = document.createElement('div');
        this._list.style.cssText = 'display:flex;flex-direction:column;gap:8px;width:min(680px,94vw);';

        this._canvas = document.createElement('canvas');
        this._canvas.style.cssText = 'display:none;border-radius:12px;background:rgba(255,255,255,0.03);' +
            'border:1px solid rgba(255,255,255,0.08);';
        this._ctx = this._canvas.getContext('2d');
        this._canvas.addEventListener('mousemove', (e) => {
            if (!this._layout) return;
            const r = this._canvas.getBoundingClientRect();
            const hit = hitTest(this._layout, e.clientX - r.left, e.clientY - r.top);
            if (hit !== this._hovered) {
                this._hovered = hit;
                this._canvas.style.cursor = hit ? 'pointer' : 'default';
                drawChart(this._ctx, this._layout, this._canvas.width, this._canvas.height, this._hovered);
            }
        });
        this._canvas.addEventListener('click', (e) => {
            if (!this._layout) return;
            const r = this._canvas.getBoundingClientRect();
            const hit = hitTest(this._layout, e.clientX - r.left, e.clientY - r.top);
            if (hit) this._travelTo(hit.entry.seed);
        });

        overlay.appendChild(title);
        overlay.appendChild(subtitle);
        overlay.appendChild(tabs);
        overlay.appendChild(this._list);
        overlay.appendChild(this._canvas);
        document.body.appendChild(overlay);
        this._overlay = overlay;
    },

    _renderView() {
        const chart = this._view === 'chart';
        this._list.style.display = chart ? 'none' : 'flex';
        this._canvas.style.display = chart ? 'block' : 'none';
        const activeCss = 'rgba(255,255,255,0.18)';
        const idleCss = 'rgba(255,255,255,0.06)';
        this._tabList.style.background = chart ? idleCss : activeCss;
        this._tabChart.style.background = chart ? activeCss : idleCss;
        if (chart) this._renderChart();
        else this._renderList();
    },

    _renderChart() {
        const visited = this._entries.filter((e) => e.kind !== 'met').length;
        const met = this._entries.length - visited;
        this._subtitle.textContent = this._entries.length
            ? `${visited} charted universe${visited === 1 ? '' : 's'}${met ? `, ${met} traveler home${met === 1 ? '' : 's'}` : ''} · click a star to travel · Esc to close`
            : 'An empty sky — universes are charted as you travel.';
        const w = Math.min(680, Math.floor(window.innerWidth * 0.94));
        const h = Math.min(460, Math.floor(window.innerHeight * 0.62));
        this._canvas.width = w;
        this._canvas.height = h;
        this._layout = chartLayout(this._entries, w, h, currentSeed);
        this._hovered = null;
        drawChart(this._ctx, this._layout, w, h, null);
    },

    _renderList() {
        const list = this._list;
        while (list.firstChild) list.removeChild(list.firstChild);

        const entries = [...this._entries].sort((a, b) => b.ts - a.ts);
        this._subtitle.textContent = entries.length
            ? `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} · click one to travel · Esc to close`
            : 'No universes charted yet — they are logged as you travel.';

        for (const en of entries) {
            const row = document.createElement('div');
            row.style.cssText =
                'display:flex;align-items:baseline;gap:12px;padding:10px 16px;border-radius:10px;cursor:pointer;' +
                'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);transition:background 0.15s;';
            row.addEventListener('mouseenter', () => { row.style.background = 'rgba(255,255,255,0.12)'; });
            row.addEventListener('mouseleave', () => { row.style.background = 'rgba(255,255,255,0.05)'; });
            row.addEventListener('click', () => this._travelTo(en.seed));

            const epithet = document.createElement('span');
            epithet.textContent = en.kind === 'met'
                ? `✦ ${en.metName ? en.metName + "'s home" : 'a traveler’s home'} — unvisited`
                : (en.epithet || '“Uncharted”');
            epithet.style.cssText = 'font-style:italic;font-size:14px;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
                + (en.kind === 'met' ? 'color:rgba(220,190,255,0.75);' : 'color:rgba(255,255,255,0.92);');

            const meta = document.createElement('span');
            const genText = en.generation > 1 ? ` · Gen ${toRoman(en.generation)}` : '';
            meta.textContent = `${en.blueprint || ''}${genText}`;
            meta.style.cssText = 'font-size:10px;color:rgba(255,220,170,0.55);white-space:nowrap;';

            const seed = document.createElement('span');
            seed.textContent = en.seed;
            seed.style.cssText = 'font-family:monospace;font-size:10px;color:rgba(255,255,255,0.45);white-space:nowrap;';

            const when = document.createElement('span');
            when.textContent = `${(en.visits || 0) > 1 ? en.visits + '× · ' : ''}${timeAgo(en.ts)}`;
            when.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.3);white-space:nowrap;';

            row.appendChild(epithet);
            row.appendChild(meta);
            row.appendChild(seed);
            row.appendChild(when);
            list.appendChild(row);
        }
    },
};
