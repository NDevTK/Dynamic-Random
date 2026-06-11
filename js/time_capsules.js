/**
 * @file time_capsules.js
 * @description Messages in bottles. Press N to write a short note and leave
 * it in the current universe; it persists in localStorage and, whenever this
 * universe loads again, drifts across the scene as a glass bottle. Click the
 * bottle to open it — your own words, however many days later.
 *
 * The twist: departing travelers sometimes FERRY a capsule home with them.
 * The bottle vanishes from this universe and washes up in theirs — the
 * Observatory chart marks stars holding a message, so you have a reason to
 * follow a visitor to their home seed and read what you wrote somewhere else
 * entirely.
 *
 * Deterministic drift (bottle paths hash from capsule ids), CSP-safe DOM,
 * fully local — like everything else, no server. The note textarea stops
 * keydown propagation so the site's single-letter shortcuts (H, P, T, ←/→…)
 * don't fire while typing.
 */

import { currentSeed } from './state.js';
import { stringToSeed } from './utils.js';

const STORAGE_KEY = 'celestial-capsules';
const MAX_CAPSULES = 60;
const MAX_TEXT = 140;
const MAX_VISIBLE = 2;
const TAU = Math.PI * 2;

function hash01(str, salt) {
    let h = stringToSeed(String(str) + ':' + salt) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
    return h / 4294967296;
}

function timeAgo(ts) {
    const s = Math.max(1, (Date.now() - ts) / 1000);
    if (s < 90) return 'moments ago';
    if (s < 3600) return `${Math.round(s / 60)} minutes ago`;
    if (s < 86400) return `${Math.round(s / 3600)} hours ago`;
    return `${Math.round(s / 86400)} days ago`;
}

export const timeCapsules = {
    _entries: [],
    _active: [],          // drifting bottle agents in the current universe
    _tick: 0,
    _wasClicking: false,
    _writeOverlay: null,
    _readOverlay: null,
    _loaded: false,

    load() {
        if (this._loaded) return;
        this._loaded = true;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) this._entries = parsed.filter((e) => e && e.seed && e.text);
            }
        } catch (err) { /* private mode — capsules live for the session */ }
    },

    _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._entries));
        } catch (err) { /* best effort */ }
    },

    init() {
        this.load();
        document.addEventListener('keydown', (e) => {
            const el = document.activeElement;
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
            if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey && !e.altKey) {
                this._openWrite();
            } else if (e.key === 'Escape') {
                this._closeOverlays();
            }
        });
    },

    /** Leave a note in the current universe. Returns the capsule. */
    leave(text) {
        this.load();
        const trimmed = String(text || '').trim().slice(0, MAX_TEXT);
        if (!trimmed || !currentSeed) return null;
        const cap = {
            id: Date.now().toString(36) + '-' + ((Math.random() * 1e9) | 0).toString(36),
            seed: currentSeed,
            writtenIn: currentSeed,
            text: trimmed,
            writtenAt: Date.now(),
            carriedBy: null,
            found: false,
        };
        this._entries.push(cap);
        this._evict();
        this._save();
        this.onUniverse(); // the bottle appears immediately
        return cap;
    },

    _evict() {
        if (this._entries.length <= MAX_CAPSULES) return;
        // Opened capsules go first, then the oldest unopened
        this._entries.sort((a, b) => (a.found === b.found ? a.writtenAt - b.writtenAt : a.found ? -1 : 1));
        this._entries.splice(0, this._entries.length - MAX_CAPSULES);
    },

    /** Seeds that currently hold an unopened capsule (Observatory markers). */
    capsuleSeeds() {
        this.load();
        const set = new Set();
        for (const c of this._entries) {
            if (!c.found) set.add(c.seed);
        }
        return set;
    },

    /**
     * A departing traveler may carry one capsule from this universe to their
     * home world. Consumes NO randomness when there is nothing to carry.
     * @param {function} rand - the caller's deterministic RNG
     * @returns {object|null} the ferried capsule
     */
    ferryWith(rand, travelerName, homeSeed) {
        this.load();
        if (!homeSeed || homeSeed === currentSeed) return null;
        const candidates = this._entries.filter((c) => !c.found && c.seed === currentSeed);
        if (candidates.length === 0) return null;
        if (rand() >= 0.5) return null;
        const cap = candidates[Math.floor(rand() * candidates.length)];
        cap.seed = homeSeed;
        cap.carriedBy = travelerName || 'a traveler';
        this._save();
        this.onUniverse(); // it left with them — stop drifting here
        return cap;
    },

    /** Rebuild the drifting bottles for the (new) current universe. */
    onUniverse() {
        this.load();
        this._active = [];
        this._tick = 0;
        const here = this._entries.filter((c) => !c.found && c.seed === currentSeed);
        for (let i = 0; i < here.length && this._active.length < MAX_VISIBLE; i++) {
            const cap = here[i];
            this._active.push({
                cap,
                baseY: 0.58 + hash01(cap.id, 'y') * 0.3,
                phase: hash01(cap.id, 'p') * 4000,
                speed: 0.25 + hash01(cap.id, 's') * 0.25,
                bobF: 0.015 + hash01(cap.id, 'b') * 0.02,
                dir: hash01(cap.id, 'd') < 0.5 ? 1 : -1,
                x: 0, y: 0, rot: 0, glow: 0,
            });
        }
    },

    update(mx, my, isClicking) {
        this._tick++;
        const w = Math.max(1, window.innerWidth);
        const h = Math.max(1, window.innerHeight);
        const clicked = isClicking && !this._wasClicking;
        this._wasClicking = isClicking;

        for (let i = this._active.length - 1; i >= 0; i--) {
            const a = this._active[i];
            const t = this._tick + a.phase;
            const span = w + 200;
            const prog = (t * a.speed) % span;
            a.x = a.dir > 0 ? prog - 100 : w + 100 - prog;
            a.y = a.baseY * h + Math.sin(t * a.bobF) * 7;
            a.rot = Math.sin(t * a.bobF * 0.7) * 0.16 * a.dir;

            const dx = mx - a.x;
            const dy = my - a.y;
            const near = dx * dx + dy * dy < 90 * 90;
            a.glow += ((near ? 1 : 0) - a.glow) * 0.1;

            if (clicked && dx * dx + dy * dy < 55 * 55) {
                a.cap.found = true;
                this._save();
                this._active.splice(i, 1);
                this._openRead(a.cap);
            }
        }
    },

    draw(ctx, system) {
        for (const a of this._active) {
            ctx.save();
            ctx.translate(a.x, a.y);

            if (a.glow > 0.03) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = `rgba(180, 220, 200, ${a.glow * 0.18})`;
                ctx.beginPath();
                ctx.arc(0, 0, 34, 0, TAU);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
            }

            // Drifting on unseen water: a soft shadow beneath
            ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
            ctx.beginPath();
            ctx.ellipse(0, 12, 16, 3.5, 0, 0, TAU);
            ctx.fill();

            ctx.rotate(a.rot);
            // Glass body
            ctx.fillStyle = 'rgba(150, 200, 190, 0.34)';
            ctx.strokeStyle = `rgba(200, 235, 225, ${0.55 + a.glow * 0.4})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(-11, -5.5, 22, 11, 5) : ctx.rect(-11, -5.5, 22, 11);
            ctx.fill();
            ctx.stroke();
            // Neck + cork
            ctx.fillStyle = 'rgba(150, 200, 190, 0.34)';
            ctx.fillRect(11, -2.5, 5, 5);
            ctx.fillStyle = 'rgba(160, 120, 80, 0.95)';
            ctx.fillRect(16, -2.5, 3, 5);
            // The rolled note inside
            ctx.fillStyle = 'rgba(235, 220, 180, 0.95)';
            ctx.save();
            ctx.rotate(-0.18);
            ctx.fillRect(-7, -2.5, 11, 5);
            ctx.restore();
            // Glass highlight
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-8, -3.4);
            ctx.lineTo(3, -3.4);
            ctx.stroke();
            ctx.restore();
        }
    },

    /** Provenance line for an opened capsule. */
    _provenance(cap) {
        const when = timeAgo(cap.writtenAt);
        if (cap.carriedBy) {
            return `Written ${when} in ${cap.writtenIn} — carried here by ${cap.carriedBy}.`;
        }
        return cap.writtenIn === cap.seed
            ? `You left this here, ${when}.`
            : `Written ${when} in ${cap.writtenIn}.`;
    },

    // ── Overlays (CSP-safe: createElement/textContent only) ──────────────────
    _card() {
        const overlay = document.createElement('div');
        overlay.style.cssText =
            'position:fixed;inset:0;z-index:210;display:flex;align-items:center;justify-content:center;' +
            'background:rgba(5,5,10,0.7);backdrop-filter:blur(8px);font-family:"Exo 2",sans-serif;';
        const card = document.createElement('div');
        card.style.cssText =
            'width:min(420px,92vw);padding:22px 24px;border-radius:14px;background:rgba(16,16,24,0.95);' +
            'border:1px solid rgba(255,255,255,0.14);display:flex;flex-direction:column;gap:12px;';
        overlay.appendChild(card);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) this._closeOverlays(); });
        return { overlay, card };
    },

    _button(label) {
        const b = document.createElement('button');
        b.textContent = label;
        b.style.cssText =
            'padding:7px 18px;border-radius:14px;font-family:inherit;font-size:11px;cursor:pointer;' +
            'letter-spacing:2px;text-transform:uppercase;background:rgba(255,255,255,0.1);' +
            'border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.85);';
        return b;
    },

    _openWrite() {
        if (!currentSeed) return;
        this._closeOverlays();
        const { overlay, card } = this._card();

        const title = document.createElement('div');
        title.textContent = 'Leave a message in this universe';
        title.style.cssText = 'font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.85);';

        const hint = document.createElement('div');
        hint.textContent = `It will drift in ${currentSeed} until someone opens it — or a traveler carries it home.`;
        hint.style.cssText = 'font-size:11px;font-style:italic;color:rgba(255,255,255,0.4);line-height:1.5;';

        const input = document.createElement('textarea');
        input.maxLength = MAX_TEXT;
        input.rows = 3;
        input.placeholder = 'To whoever finds this…';
        input.style.cssText =
            'resize:none;padding:10px;border-radius:8px;background:rgba(255,255,255,0.06);' +
            'border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.92);' +
            'font-family:inherit;font-size:13px;line-height:1.5;outline:none;';
        // The site is full of single-letter shortcuts; while writing, none of
        // them may fire. All shortcut listeners are bubble-phase on
        // document/window, so stopping propagation here silences every one.
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Escape') this._closeOverlays();
        });

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
        const seal = this._button('Seal it');
        seal.addEventListener('click', () => {
            if (this.leave(input.value)) this._closeOverlays();
        });
        const cancel = this._button('Cancel');
        cancel.addEventListener('click', () => this._closeOverlays());
        row.appendChild(cancel);
        row.appendChild(seal);

        card.appendChild(title);
        card.appendChild(hint);
        card.appendChild(input);
        card.appendChild(row);
        document.body.appendChild(overlay);
        this._writeOverlay = overlay;
        input.focus();
    },

    _openRead(cap) {
        this._closeOverlays();
        const { overlay, card } = this._card();

        const title = document.createElement('div');
        title.textContent = 'A message in a bottle';
        title.style.cssText = 'font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.85);';

        const text = document.createElement('div');
        text.textContent = `“${cap.text}”`;
        text.style.cssText = 'font-size:15px;font-style:italic;color:rgba(255,250,230,0.95);line-height:1.6;';

        const prov = document.createElement('div');
        prov.textContent = this._provenance(cap);
        prov.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.45);';

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:flex-end;';
        const keep = this._button('Keep');
        keep.addEventListener('click', () => this._closeOverlays());
        row.appendChild(keep);

        card.appendChild(title);
        card.appendChild(text);
        card.appendChild(prov);
        card.appendChild(row);
        document.body.appendChild(overlay);
        this._readOverlay = overlay;
    },

    _closeOverlays() {
        if (this._writeOverlay) { this._writeOverlay.remove(); this._writeOverlay = null; }
        if (this._readOverlay) { this._readOverlay.remove(); this._readOverlay = null; }
    },
};
