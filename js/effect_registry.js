/**
 * @file effect_registry.js
 * @description Registry for interactive background effect subsystems.
 * Each entry declares the effect instance, theme tags for blueprint affinity,
 * quality threshold, and draw order priority.
 *
 * Theme tags allow the orchestrator to weight selection toward effects that
 * match the active blueprint's aesthetic, producing coherent visual combinations.
 */

import { ReactiveGrid } from './reactive_grid_effects.js';
import { DimensionalEchoes } from './dimensional_echoes.js';
import { ParticleSwarm } from './particle_swarm_effects.js';
import { MoodAtmosphere } from './mood_atmosphere.js';
import { GravitationalLens } from './gravitational_lens_effects.js';
import { SonicBloom } from './sonic_bloom_effects.js';
import { PixelAlchemy } from './pixel_alchemy_effects.js';
import { PhantomCursor } from './phantom_cursor_effects.js';
import { HarmonicResonance } from './harmonic_resonance_effects.js';
import { LivingInk } from './living_ink_effects.js';
import { QuantumWeb } from './quantum_web_effects.js';
import { TimeCrystal } from './time_crystal_effects.js';
import { BioluminescentTide } from './bioluminescent_tide_effects.js';
import { FractalLightning } from './fractal_lightning_effects.js';
import { GravityMarbles } from './gravity_marble_effects.js';
import { MagneticSand } from './magnetic_sand_effects.js';
import { DimensionalPortal } from './dimensional_portal_effects.js';
import { SoundWaveSculptor } from './sound_wave_sculptor_effects.js';
import { EmotionWeather } from './emotion_weather_effects.js';
import { GravitationalCalligraphy } from './gravitational_calligraphy_effects.js';
import { ChromaticWorms } from './chromatic_worms_effects.js';
import { VoidTentacles } from './void_tentacles_effects.js';
import { GlitchMemory } from './glitch_memory_effects.js';
import { PrismRefraction } from './prism_refraction_effects.js';
import { CosmicDust } from './cosmic_dust_effects.js';

/**
 * Blueprint-to-tag mapping. Each blueprint has a set of theme tags that describe
 * its aesthetic. Effects with matching tags are preferred during selection.
 */
export const BLUEPRINT_TAGS = {
    Classical:      ['cosmic', 'stellar', 'physics'],
    Organic:        ['organic', 'bio', 'fluid'],
    Digital:        ['digital', 'tech', 'glitch'],
    Crystalline:    ['crystal', 'geometric', 'light'],
    BioMechanical:  ['organic', 'bio', 'tech'],
    ChronoVerse:    ['temporal', 'void', 'physics'],
    VoidTouched:    ['void', 'dark', 'cosmic'],
    PhantomEcho:    ['void', 'temporal', 'ethereal'],
    Aetherial:      ['ethereal', 'fluid', 'light'],
    QuantumFoam:    ['quantum', 'physics', 'glitch'],
    SonicScapes:    ['sonic', 'harmonic', 'physics'],
    LivingInk:      ['fluid', 'painterly', 'organic'],
    Eldritch:       ['void', 'dark', 'organic'],
    Painterly:      ['painterly', 'fluid', 'light'],
    StarForged:     ['stellar', 'cosmic', 'fire'],
    ArcaneCodex:    ['geometric', 'crystal', 'dark'],
    MoltenHeart:    ['fire', 'fluid', 'dark'],
    GlacialDrift:   ['crystal', 'ethereal', 'light'],
    SentientSwarm:  ['organic', 'swarm', 'bio'],
    StellarNursery: ['stellar', 'cosmic', 'fire'],
    AbyssalZone:    ['dark', 'aquatic', 'bio'],
    TechnoUtopia:   ['tech', 'digital', 'geometric'],
    FungalForest:   ['organic', 'bio', 'dark'],
    GlassySea:      ['aquatic', 'crystal', 'light'],
    Papercraft:     ['geometric', 'light', 'painterly'],
    ChromaticAberration: ['light', 'glitch', 'painterly'],
    SilkWeaver:     ['ethereal', 'organic', 'light'],
    VolcanicForge:  ['fire', 'cosmic', 'dark'],
    LivingConstellation: ['stellar', 'cosmic', 'light'],
    GooeyMess:      ['fluid', 'organic', 'dark'],
    HauntedRealm:   ['void', 'dark', 'temporal'],
    CoralReef:      ['aquatic', 'organic', 'bio'],
    NeonCyber:      ['tech', 'digital', 'glitch'],
    AbyssalHorror:  ['dark', 'void', 'organic'],
    CelestialForge: ['stellar', 'cosmic', 'fire'],
};

/**
 * Effect registry. Each entry defines:
 * - instance: the effect object (pre-created, reusable)
 * - tags: theme affinity tags (matched against blueprint tags)
 * - minQuality: minimum quality scale to update/draw (0-1)
 * - drawOrder: lower numbers draw first (background-level effects first)
 */
export const EFFECT_REGISTRY = [
    { instance: new MoodAtmosphere(),            tags: ['ethereal', 'dark', 'void'],           minQuality: 0.25, drawOrder: 0 },
    { instance: new HarmonicResonance(),         tags: ['sonic', 'harmonic', 'physics'],        minQuality: 0.25, drawOrder: 1 },
    { instance: new BioluminescentTide(),         tags: ['aquatic', 'bio', 'organic'],           minQuality: 0.3,  drawOrder: 2 },
    { instance: new PixelAlchemy(),              tags: ['digital', 'glitch', 'light'],          minQuality: 0.3,  drawOrder: 3 },
    { instance: new LivingInk(),                 tags: ['fluid', 'painterly', 'organic'],       minQuality: 0.3,  drawOrder: 4 },
    { instance: new QuantumWeb(),                tags: ['quantum', 'physics', 'geometric'],     minQuality: 0.25, drawOrder: 5 },
    { instance: new ReactiveGrid(),              tags: ['digital', 'geometric', 'tech'],        minQuality: 0.25, drawOrder: 6 },
    { instance: new DimensionalEchoes(),         tags: ['void', 'temporal', 'ethereal'],        minQuality: 0.3,  drawOrder: 7 },
    { instance: new TimeCrystal(),               tags: ['crystal', 'temporal', 'light'],        minQuality: 0.3,  drawOrder: 8 },
    { instance: new GravitationalLens(),         tags: ['cosmic', 'physics', 'void'],           minQuality: 0.25, drawOrder: 9 },
    { instance: new ParticleSwarm(),             tags: ['swarm', 'organic', 'bio'],             minQuality: 0.3,  drawOrder: 10 },
    { instance: new SonicBloom(),                tags: ['sonic', 'harmonic', 'light'],          minQuality: 0.3,  drawOrder: 11 },
    { instance: new FractalLightning(),          tags: ['fire', 'stellar', 'cosmic'],           minQuality: 0.3,  drawOrder: 12 },
    { instance: new GravityMarbles(),            tags: ['physics', 'crystal', 'light'],         minQuality: 0.25, drawOrder: 13 },
    { instance: new PhantomCursor(),             tags: ['void', 'temporal', 'dark'],            minQuality: 0.3,  drawOrder: 14 },
    { instance: new EmotionWeather(),            tags: ['ethereal', 'fluid', 'aquatic'],        minQuality: 0.25, drawOrder: 15 },
    { instance: new MagneticSand(),              tags: ['cosmic', 'physics', 'geometric'],      minQuality: 0.25, drawOrder: 16 },
    { instance: new SoundWaveSculptor(),         tags: ['sonic', 'harmonic', 'tech'],           minQuality: 0.3,  drawOrder: 17 },
    { instance: new DimensionalPortal(),         tags: ['void', 'cosmic', 'dark'],              minQuality: 0.3,  drawOrder: 18 },
    { instance: new GravitationalCalligraphy(),  tags: ['fluid', 'painterly', 'cosmic'],        minQuality: 0.3,  drawOrder: 19 },
    { instance: new CosmicDust(),                tags: ['cosmic', 'stellar', 'geometric'],      minQuality: 0.25, drawOrder: 20 },
    { instance: new ChromaticWorms(),            tags: ['organic', 'swarm', 'light'],           minQuality: 0.3,  drawOrder: 21 },
    { instance: new VoidTentacles(),             tags: ['void', 'dark', 'organic'],             minQuality: 0.3,  drawOrder: 22 },
    { instance: new GlitchMemory(),              tags: ['glitch', 'temporal', 'digital'],       minQuality: 0.25, drawOrder: 23 },
    { instance: new PrismRefraction(),           tags: ['light', 'crystal', 'geometric'],       minQuality: 0.3,  drawOrder: 24 },
];

// Pre-create tag Sets for O(1) intersection
for (const entry of EFFECT_REGISTRY) {
    entry._tagSet = new Set(entry.tags);
}

/**
 * Score an effect's affinity with a blueprint based on tag overlap.
 * @param {object} effectEntry - EFFECT_REGISTRY entry
 * @param {string[]} blueprintTags - Tags for the active blueprint
 * @returns {number} Affinity score (0 = no match, higher = better match)
 */
export function scoreAffinity(effectEntry, blueprintTags) {
    let score = 0;
    for (const tag of blueprintTags) {
        if (effectEntry._tagSet.has(tag)) score++;
    }
    return score;
}

/**
 * Select which effects to enable using tag-weighted shuffle.
 * Effects matching the blueprint's tags are 3x more likely to be selected.
 *
 * @param {function} rng - Seeded RNG
 * @param {string} blueprintName - Active blueprint
 * @param {number} count - How many effects to enable (6-10)
 * @returns {Set<number>} Set of enabled EFFECT_REGISTRY indices
 */
export function selectEffects(rng, blueprintName, count) {
    const bpTags = BLUEPRINT_TAGS[blueprintName] || [];

    // Build weighted index array
    const indices = [];
    const weights = [];
    let totalWeight = 0;

    for (let i = 0; i < EFFECT_REGISTRY.length; i++) {
        const affinity = scoreAffinity(EFFECT_REGISTRY[i], bpTags);
        // Base weight 1, +2 per matching tag (so 0 tags = weight 1, 3 tags = weight 7)
        const w = 1 + affinity * 2;
        indices.push(i);
        weights.push(w);
        totalWeight += w;
    }

    // Weighted selection without replacement
    const selected = new Set();
    while (selected.size < count && selected.size < EFFECT_REGISTRY.length) {
        let roll = rng() * totalWeight;
        for (let i = 0; i < indices.length; i++) {
            if (selected.has(indices[i])) continue;
            roll -= weights[i];
            if (roll <= 0) {
                selected.add(indices[i]);
                totalWeight -= weights[i];
                break;
            }
        }
    }

    return selected;
}
