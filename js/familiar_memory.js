/**
 * @file familiar_memory.js
 * @description The cursor familiar remembers you. A localStorage-backed
 * memory tracks how long you and your familiar have actually played together
 * (active cursor time, not idle tabs) across visits, names the creature once
 * on first meeting, and promotes it through growth stages:
 *
 *   hatchling → fledgling → companion → venerable → mythic
 *
 * cursor_familiar.js reads the stage to scale the creature and unlock an
 * aura at higher stages; the HUD shows "<name> the <species> · <stage>".
 * Everything stays on-device.
 */

const STORAGE_KEY = 'celestial-familiar-memory';

// Cumulative active ticks (60/s): 0, 30 min, 2 h, 8 h, 24 h
const STAGE_THRESHOLDS = [0, 108000, 432000, 1728000, 5184000];
export const STAGE_NAMES = ['hatchling', 'fledgling', 'companion', 'venerable', 'mythic'];

const SYLLABLES = ['ka', 've', 'sk', 'lu', 'mi', 'ra', 'no', 'th', 'el', 'ir',
    'os', 'ya', 'zu', 'fen', 'qui', 'br', 'um', 'ash', 'ol', 'wyn'];

/** Deterministic creature name from a numeric seed (also used by travelers.js). */
export function generateName(seedNum) {
    let lcg = (seedNum >>> 0) || 1;
    const next = () => {
        lcg = (Math.imul(lcg, 1664525) + 1013904223) >>> 0;
        return lcg / 4294967296;
    };
    const count = 2 + (next() < 0.35 ? 1 : 0);
    let name = '';
    for (let i = 0; i < count; i++) name += SYLLABLES[Math.floor(next() * SYLLABLES.length)];
    return name.charAt(0).toUpperCase() + name.slice(1);
}

export const familiarMemory = {
    loaded: false,
    name: '',
    visits: 0,
    totalActiveTicks: 0,

    _dirty: 0,

    init() {
        let data = null;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) data = JSON.parse(raw);
        } catch (err) {
            // Storage unavailable (private mode, etc.) — run as a one-visit memory
        }
        if (data && typeof data === 'object') {
            this.name = typeof data.name === 'string' ? data.name : '';
            this.visits = Number.isFinite(data.visits) ? data.visits : 0;
            this.totalActiveTicks = Number.isFinite(data.totalActiveTicks) ? data.totalActiveTicks : 0;
        }
        if (!this.name) this.name = generateName(Date.now());
        this.visits++;
        this.loaded = true;
        this._save();

        // Persist on tab hide so progress survives abrupt closes
        if (typeof document !== 'undefined' && document.addEventListener) {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') this._save();
            });
        }
    },

    /** Count one tick of genuine play (cursor moving near the familiar). */
    recordActivity() {
        if (!this.loaded) return;
        this.totalActiveTicks++;
        if (++this._dirty >= 600) this._save(); // every ~10s of activity
    },

    /** Growth stage index 0..4 from cumulative play time. */
    get stage() {
        let s = 0;
        for (let i = 0; i < STAGE_THRESHOLDS.length; i++) {
            if (this.totalActiveTicks >= STAGE_THRESHOLDS[i]) s = i;
        }
        return s;
    },

    get stageName() {
        return STAGE_NAMES[this.stage];
    },

    _save() {
        this._dirty = 0;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                name: this.name,
                visits: this.visits,
                totalActiveTicks: this.totalActiveTicks,
            }));
        } catch (err) {
            // Best effort only
        }
    },
};
