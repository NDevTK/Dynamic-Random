/**
 * @file interactive_background_effects.js
 * @description Orchestrator for the interactive effects layer that runs on top of all
 * background architectures. Uses a data-driven registry (effect_registry.js) to manage
 * the effect sub-systems with tag-based blueprint affinity selection.
 *
 * Each universe seed selects 6-10 sub-systems weighted by thematic affinity with the
 * active blueprint, producing coherent interactive behaviors. Sub-systems are iterated
 * via arrays instead of individual flags for maintainability.
 *
 * Cursor presence is provided by the cursor familiar (cursor_familiar.js): a seeded
 * companion creature with follow/doze/startle behavior. It replaced the old generic
 * inline effects (click ripples, mouse-trail ribbon, gravity field lines, heat map,
 * echo ghosts, constellation links), which overlapped with the dedicated
 * cursor_trails.js / cursor_effects.js layers without adding character.
 */

import { mouse, isLeftMouseDown, isRightMouseDown } from './state.js';
import { EFFECT_REGISTRY, selectEffects } from './effect_registry.js';
import { cursorFamiliar } from './cursor_familiar.js';
import { travelers } from './travelers.js';
import { timeCapsules } from './time_capsules.js';

class InteractiveBackgroundEffects {
    constructor() {
        this.initialized = false;
        this.tick = 0;

        // Active sub-system indices (from EFFECT_REGISTRY), set per seed
        this._activeIndices = [];
        // Sorted draw order for active effects
        this._drawOrder = [];

        // Quality scaling
        this._qualityScale = 1;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
    }

    /**
     * Extract hue values from palette for sub-system configuration.
     */
    _extractHues(palette) {
        const hues = [];
        const parse = (str) => {
            if (!str) return null;
            const m = str.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)/);
            return m ? { h: parseInt(m[1], 10), s: parseInt(m[2], 10), l: parseInt(m[3], 10) } : null;
        };
        if (palette && palette.primary) {
            for (const c of palette.primary) {
                const parsed = parse(c);
                if (parsed) hues.push(parsed);
            }
        }
        if (palette && palette.accent) {
            for (const c of palette.accent) {
                const parsed = parse(c);
                if (parsed) hues.push(parsed);
            }
        }
        return hues;
    }

    /**
     * Configure effects based on seeded RNG, palette, and blueprint name.
     * Uses tag-based affinity to select thematically coherent sub-systems.
     */
    configure(rng, palette, blueprintName) {
        this.tick = 0;

        const hues = this._extractHues(palette);

        // --- Select sub-systems via tag-weighted selection ---
        const enableCount = 6 + Math.floor(rng() * 5); // 6-10
        const enabledSet = selectEffects(rng, blueprintName || '', enableCount);

        this._activeIndices = [...enabledSet];
        // Sort by drawOrder for consistent rendering
        this._drawOrder = [...this._activeIndices].sort(
            (a, b) => EFFECT_REGISTRY[a].drawOrder - EFFECT_REGISTRY[b].drawOrder
        );

        // Configure each enabled sub-system
        for (const idx of this._activeIndices) {
            EFFECT_REGISTRY[idx].instance.configure(rng, hues);
        }

        // Every universe hatches a cursor familiar, sets a visiting schedule
        // for travelers, and surfaces any capsules resting here
        cursorFamiliar.configure(rng, hues, blueprintName);
        travelers.configure(rng, hues, blueprintName);
        timeCapsules.onUniverse();
    }

    /**
     * Update all active interactive effects.
     */
    update(system) {
        this.tick++;
        this._qualityScale = system.qualityScale || 1;
        const mx = mouse.x;
        const my = mouse.y;
        const isClicking = isLeftMouseDown || isRightMouseDown;

        // Update active sub-systems via registry. Each one is quarantined:
        // a throwing effect is disabled for this universe instead of killing
        // the background animation loop for the whole session.
        const q = this._qualityScale;
        for (let k = this._activeIndices.length - 1; k >= 0; k--) {
            const idx = this._activeIndices[k];
            const entry = EFFECT_REGISTRY[idx];
            if (q > entry.minQuality) {
                try {
                    entry.instance.update(mx, my, isClicking);
                } catch (err) {
                    this._quarantine(idx, err);
                }
            }
        }

        timeCapsules.update(mx, my, isClicking);
        travelers.update(mx, my, isClicking);
        cursorFamiliar.update(mx, my, isClicking);
    }

    /**
     * Draw all active interactive effects onto the background canvas.
     */
    draw(ctx, system) {
        if (!this.initialized) return;

        const q = this._qualityScale;

        // Draw sub-systems in draw-order (iterate a snapshot so quarantine
        // removal during the loop stays safe)
        for (const idx of [...this._drawOrder]) {
            const entry = EFFECT_REGISTRY[idx];
            if (q > entry.minQuality) {
                try {
                    entry.instance.draw(ctx, system);
                } catch (err) {
                    this._rescueContext(ctx);
                    this._quarantine(idx, err);
                }
            }
        }

        // Bottles in the water, then visitors, then the player's familiar on top
        timeCapsules.draw(ctx, system);
        travelers.draw(ctx, system);
        cursorFamiliar.draw(ctx, system);
    }

    /** Remove a misbehaving effect for the rest of this universe. */
    _quarantine(idx, err) {
        const name = EFFECT_REGISTRY[idx].instance.constructor.name;
        console.warn(`[interactiveEffects] Disabled "${name}" after error:`, err);
        this._activeIndices = this._activeIndices.filter((i) => i !== idx);
        this._drawOrder = this._drawOrder.filter((i) => i !== idx);
    }

    /** A throwing draw may leave save()s/composites unbalanced; reset the basics. */
    _rescueContext(ctx) {
        for (let i = 0; i < 8; i++) ctx.restore(); // no-op once the stack is empty
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }
}

export const interactiveEffects = new InteractiveBackgroundEffects();
