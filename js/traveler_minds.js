/**
 * @file traveler_minds.js
 * @description The traveler gene pool. When a visitor departs, their brain
 * genome is scored by how the visit actually went (time spent near your
 * cursor, points of interest watched, staying on screen, moving like a
 * living thing) and the best minds are kept in localStorage. New travelers
 * are usually mutated offspring of past well-received visitors — so over
 * your sessions, the multiverse's visitors evolve toward personalities you
 * engage with. Fresh random "immigrant" minds keep the pool diverse.
 */

const STORAGE_KEY = 'celestial-traveler-minds';
const MAX_ENTRIES = 12;

export const travelerMinds = {
    /** @type {{ g: number[], f: number, gen: number }[]} */
    _entries: [],
    _loaded: false,

    load() {
        if (this._loaded) return;
        this._loaded = true;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    this._entries = parsed.filter((e) => e && Array.isArray(e.g) && Number.isFinite(e.f));
                }
            }
        } catch (err) { /* private mode etc. — evolution lives for the session */ }
    },

    /**
     * A parent mind to descend from, fitness-weighted, or null when the pool
     * is empty (the caller spawns a fresh random immigrant).
     * @param {function} rand
     * @param {number} genomeLength - reject stale entries from older layouts
     */
    sample(rand, genomeLength) {
        this.load();
        const fit = this._entries.filter((e) => e.g.length === genomeLength);
        if (fit.length === 0) return null;
        let total = 0;
        for (const e of fit) total += Math.max(0.05, e.f);
        let roll = rand() * total;
        for (const e of fit) {
            roll -= Math.max(0.05, e.f);
            if (roll <= 0) return e;
        }
        return fit[fit.length - 1];
    },

    /**
     * Record a departed visitor's mind and how the visit went.
     * Niching: a mind nearly identical to a stored one (mean |Δw| below the
     * threshold) replaces it only if fitter, instead of filling the pool with
     * clones — premature convergence is how toy GAs quietly stop evolving.
     */
    record(genome, fitness, generation) {
        this.load();
        const entry = {
            g: Array.from(genome, (v) => Math.round(v * 1000) / 1000),
            f: Math.round(fitness * 1000) / 1000,
            gen: generation,
        };
        const NICHE_DIST = 0.06;
        let twinIdx = -1;
        for (let i = 0; i < this._entries.length; i++) {
            const e = this._entries[i];
            if (e.g.length !== entry.g.length) continue;
            let sum = 0;
            for (let k = 0; k < e.g.length; k++) sum += Math.abs(e.g[k] - entry.g[k]);
            if (sum / e.g.length < NICHE_DIST) { twinIdx = i; break; }
        }
        if (twinIdx >= 0) {
            if (entry.f > this._entries[twinIdx].f) this._entries[twinIdx] = entry;
        } else {
            this._entries.push(entry);
        }
        // Keep the strongest minds; ties resolved toward newer entries
        if (this._entries.length > MAX_ENTRIES) {
            this._entries.sort((a, b) => a.f - b.f);
            this._entries.splice(0, this._entries.length - MAX_ENTRIES);
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._entries));
        } catch (err) { /* best effort */ }
    },

    get size() {
        this.load();
        return this._entries.length;
    },
};
