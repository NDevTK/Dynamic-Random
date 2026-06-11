/**
 * @file points_of_interest.js
 * @description A tiny per-frame bus that lets the multiverse notice itself.
 * Effects and architectures publish interesting positions while they update
 * (a metro train, an orrery planet, a toppling domino, a lighthouse lamp);
 * consumers — chiefly the cursor familiar, which gets curious when you go
 * idle — read them in the same frame.
 *
 * Lifecycle: background.js calls beginFrame() at the top of each animation
 * frame, before the architecture and the interactive effects update. The
 * list is capped and reused; nothing allocates per frame beyond the entries.
 */

const MAX_POINTS = 48;

export const pointsOfInterest = {
    _items: [],
    _pool: [],

    /** Clear the board for a new frame (entries return to the pool). */
    beginFrame() {
        for (const it of this._items) {
            if (this._pool.length < MAX_POINTS) this._pool.push(it);
        }
        this._items.length = 0;
    },

    /**
     * Announce something worth looking at this frame.
     * @param {number} x  screen-space x
     * @param {number} y  screen-space y
     * @param {string} kind  e.g. 'train', 'planet', 'cascade', 'beacon'
     * @param {number} weight  attraction strength (default 1)
     */
    publish(x, y, kind, weight = 1) {
        if (this._items.length >= MAX_POINTS) return;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const it = this._pool.length > 0 ? this._pool.pop() : {};
        it.x = x;
        it.y = y;
        it.kind = kind;
        it.weight = weight;
        this._items.push(it);
    },

    /**
     * The most attractive point near (x, y) within maxDist, weighted so a
     * heavy point slightly farther away can win over a light nearby one.
     * @returns {{x:number,y:number,kind:string,weight:number}|null}
     */
    nearest(x, y, maxDist) {
        const maxSq = maxDist * maxDist;
        let best = null;
        let bestScore = 0;
        for (const it of this._items) {
            const dx = it.x - x;
            const dy = it.y - y;
            const dSq = dx * dx + dy * dy;
            if (dSq > maxSq) continue;
            const score = it.weight * (1 - dSq / maxSq) + 0.001;
            if (score > bestScore) {
                bestScore = score;
                best = it;
            }
        }
        return best;
    },

    /** A uniformly random point from this frame's board (or null). */
    pick(rand) {
        if (this._items.length === 0) return null;
        return this._items[Math.floor(rand() * this._items.length)];
    },

    get count() {
        return this._items.length;
    },
};
