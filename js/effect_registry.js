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
import { KaleidoscopeMirror } from './kaleidoscope_mirror_effects.js';
import { NeonRain } from './neon_rain_effects.js';
import { AuroraCurtain } from './aurora_curtain_effects.js';
import { LiquidMetal } from './liquid_metal_effects.js';
import { RealityFracture } from './reality_fracture_effects.js';
import { GravityStringArt } from './gravity_string_art_effects.js';
import { PixelFireflies } from './pixel_fireflies_effects.js';
import { GeometricTessellation } from './geometric_tessellation_effects.js';
import { RippleSymphony } from './ripple_symphony_effects.js';
import { MagneticTopography } from './magnetic_topography_effects.js';
import { ParticleLife } from './particle_life_effects.js';
import { Ferrofluid } from './ferrofluid_effects.js';
import { CellularAutomata } from './cellular_automata_effects.js';
import { InkDiffusion } from './ink_diffusion_effects.js';
import { TerrainErosion } from './terrain_erosion_effects.js';
import { MagneticCompassField } from './magnetic_compass_field_effects.js';
import { PendulumWave } from './pendulum_wave_effects.js';
import { DNAHelix } from './dna_helix_effects.js';
import { ParticleEcology } from './particle_ecology_effects.js';
import { MorphingGeometry } from './morphing_geometry_effects.js';
import { SonicTerrain } from './sonic_terrain_effects.js';
import { ChaosPendulum } from './chaos_pendulum_effects.js';
import { ReactionDiffusion } from './reaction_diffusion_effects.js';
import { HypnoticSpirograph } from './hypnotic_spirograph_effects.js';
import { MagneticParticleTheater } from './magnetic_particle_theater_effects.js';
import { GlitchTerrain } from './glitch_terrain_effects.js';
import { ShockwavePrism } from './shockwave_prism_effects.js';
import { FungalNetwork } from './fungal_network_effects.js';
import { CosmicJellyfish } from './cosmic_jellyfish_effects.js';
import { GravityRainbow } from './gravity_rainbow_effects.js';
import { ElectricOcean } from './electric_ocean_effects.js';
import { QuantumEntanglement } from './quantum_entanglement_effects.js';
import { WormholeTransit } from './wormhole_transit_effects.js';
import { InkSplatter } from './ink_splatter_effects.js';
import { CrystalGrowth } from './crystal_growth_effects.js';
import { PlasmaGlobe } from './plasma_globe_effects.js';
import { OrbitPlayground } from './orbit_playground_effects.js';
import { SmokeWisps } from './smoke_wisps_effects.js';
import { BouncyGeometry } from './bouncy_geometry_effects.js';
import { LaserLightShow } from './laser_light_show_effects.js';
import { GravityPainting } from './gravity_painting_effects.js';
import { MirrorDimension } from './mirror_dimension_effects.js';
import { LightningGarden } from './lightning_garden_effects.js';
import { DepthField } from './depth_field_effects.js';
import { WaveInterference } from './wave_interference_effects.js';
import { GravityCloth } from './gravity_cloth_effects.js';
import { FireworkOrchestra } from './firework_orchestra_effects.js';
import { PixelSortGlitch } from './pixel_sort_glitch_effects.js';
import { PortalVortex } from './portal_vortex_effects.js';
import { AsciiRain } from './ascii_rain_effects.js';
import { HolographicFoil } from './holographic_foil_effects.js';
import { GravitySymphony } from './gravity_symphony_effects.js';
import { NeonSpiderweb } from './neon_spiderweb_effects.js';
import { TrailBlossom } from './trail_blossom_effects.js';
import { GravityWeb } from './gravity_web_effects.js';
import { EchoRipple } from './echo_ripple_effects.js';
import { GravityEcosystem } from './gravity_ecosystem_effects.js';
import { DimensionalFabric } from './dimensional_fabric_effects.js';
import { SynapticStorm } from './synaptic_storm_effects.js';
import { TimeLapsePainter } from './time_lapse_painter_effects.js';
import { MagneticOrigami } from './magnetic_origami_effects.js';
import { GravityConstellationTrails } from './gravity_constellation_trails_effects.js';
import { DimensionalShatter } from './dimensional_shatter_effects.js';
import { SymmetryMirror } from './symmetry_mirror_effects.js';
import { LivingGeometry } from './living_geometry_effects.js';
import { ChromaticWake } from './chromatic_wake_effects.js';
import { ParticleFountain } from './particle_fountain_effects.js';
import { RuneSigils } from './rune_sigil_effects.js';
import { KiteFestival } from './kite_festival_effects.js';

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
    { instance: new KaleidoscopeMirror(),       tags: ['geometric', 'crystal', 'painterly'],   minQuality: 0.3,  drawOrder: 25 },
    { instance: new NeonRain(),                 tags: ['digital', 'tech', 'dark'],             minQuality: 0.25, drawOrder: 26 },
    { instance: new AuroraCurtain(),            tags: ['ethereal', 'light', 'cosmic'],         minQuality: 0.25, drawOrder: 27 },
    { instance: new LiquidMetal(),              tags: ['fluid', 'fire', 'crystal'],            minQuality: 0.3,  drawOrder: 28 },
    { instance: new RealityFracture(),          tags: ['glitch', 'void', 'temporal'],          minQuality: 0.25, drawOrder: 29 },
    { instance: new GravityStringArt(),       tags: ['geometric', 'harmonic', 'ethereal'],   minQuality: 0.3,  drawOrder: 30 },
    { instance: new PixelFireflies(),         tags: ['organic', 'bio', 'light'],             minQuality: 0.3,  drawOrder: 31 },
    { instance: new GeometricTessellation(),  tags: ['geometric', 'crystal', 'digital'],     minQuality: 0.3,  drawOrder: 32 },
    { instance: new RippleSymphony(),         tags: ['physics', 'harmonic', 'aquatic'],      minQuality: 0.25, drawOrder: 33 },
    { instance: new MagneticTopography(),     tags: ['cosmic', 'physics', 'geometric'],      minQuality: 0.25, drawOrder: 34 },
    { instance: new ParticleLife(),          tags: ['organic', 'swarm', 'bio'],             minQuality: 0.25, drawOrder: 35 },
    { instance: new Ferrofluid(),            tags: ['cosmic', 'dark', 'fluid'],             minQuality: 0.3,  drawOrder: 36 },
    { instance: new CellularAutomata(),      tags: ['digital', 'geometric', 'bio'],         minQuality: 0.25, drawOrder: 37 },
    { instance: new InkDiffusion(),          tags: ['fluid', 'painterly', 'organic'],       minQuality: 0.3,  drawOrder: 38 },
    { instance: new TerrainErosion(),        tags: ['cosmic', 'geometric', 'physics'],      minQuality: 0.25, drawOrder: 39 },
    { instance: new MagneticCompassField(),  tags: ['physics', 'geometric', 'cosmic'],       minQuality: 0.25, drawOrder: 40 },
    { instance: new PendulumWave(),          tags: ['physics', 'harmonic', 'geometric'],     minQuality: 0.3,  drawOrder: 41 },
    { instance: new DNAHelix(),              tags: ['organic', 'bio', 'light'],              minQuality: 0.3,  drawOrder: 42 },
    { instance: new ParticleEcology(),       tags: ['organic', 'swarm', 'bio'],              minQuality: 0.25, drawOrder: 43 },
    { instance: new MorphingGeometry(),      tags: ['geometric', 'crystal', 'ethereal'],     minQuality: 0.3,  drawOrder: 44 },
    { instance: new SonicTerrain(),          tags: ['sonic', 'physics', 'cosmic'],            minQuality: 0.25, drawOrder: 45 },
    { instance: new ChaosPendulum(),        tags: ['physics', 'harmonic', 'painterly'],      minQuality: 0.25, drawOrder: 46 },
    { instance: new ReactionDiffusion(),    tags: ['organic', 'bio', 'fluid'],               minQuality: 0.3,  drawOrder: 47 },
    { instance: new HypnoticSpirograph(),   tags: ['geometric', 'harmonic', 'light'],        minQuality: 0.3,  drawOrder: 48 },
    { instance: new MagneticParticleTheater(), tags: ['cosmic', 'geometric', 'ethereal'],    minQuality: 0.25, drawOrder: 49 },
    { instance: new GlitchTerrain(),        tags: ['digital', 'glitch', 'tech'],             minQuality: 0.3,  drawOrder: 50 },
    { instance: new ShockwavePrism(),     tags: ['light', 'crystal', 'cosmic'],            minQuality: 0.25, drawOrder: 51 },
    { instance: new FungalNetwork(),      tags: ['organic', 'bio', 'dark'],                minQuality: 0.25, drawOrder: 52 },
    { instance: new CosmicJellyfish(),    tags: ['aquatic', 'bio', 'ethereal'],            minQuality: 0.3,  drawOrder: 53 },
    { instance: new GravityRainbow(),     tags: ['light', 'painterly', 'cosmic'],          minQuality: 0.3,  drawOrder: 54 },
    { instance: new ElectricOcean(),      tags: ['aquatic', 'physics', 'dark'],            minQuality: 0.25, drawOrder: 55 },
    { instance: new QuantumEntanglement(),tags: ['quantum', 'physics', 'ethereal'],        minQuality: 0.25, drawOrder: 56 },
    { instance: new WormholeTransit(),    tags: ['void', 'cosmic', 'temporal'],            minQuality: 0.3,  drawOrder: 57 },
    { instance: new InkSplatter(),        tags: ['fluid', 'painterly', 'dark'],            minQuality: 0.3,  drawOrder: 58 },
    { instance: new CrystalGrowth(),      tags: ['crystal', 'geometric', 'light'],         minQuality: 0.25, drawOrder: 59 },
    { instance: new PlasmaGlobe(),       tags: ['fire', 'tech', 'cosmic'],                minQuality: 0.25, drawOrder: 60 },
    { instance: new OrbitPlayground(),   tags: ['cosmic', 'stellar', 'physics'],           minQuality: 0.25, drawOrder: 61 },
    { instance: new SmokeWisps(),        tags: ['fluid', 'ethereal', 'dark'],              minQuality: 0.3,  drawOrder: 62 },
    { instance: new BouncyGeometry(),    tags: ['physics', 'geometric', 'light'],          minQuality: 0.25, drawOrder: 63 },
    { instance: new LaserLightShow(),    tags: ['tech', 'digital', 'light'],               minQuality: 0.25, drawOrder: 64 },
    { instance: new GravityPainting(),   tags: ['fluid', 'painterly', 'organic'],           minQuality: 0.3,  drawOrder: 65 },
    { instance: new MirrorDimension(),   tags: ['geometric', 'crystal', 'light'],           minQuality: 0.25, drawOrder: 66 },
    { instance: new LightningGarden(),   tags: ['organic', 'bio', 'cosmic'],                minQuality: 0.3,  drawOrder: 67 },
    { instance: new DepthField(),        tags: ['cosmic', 'ethereal', 'dark'],              minQuality: 0.25, drawOrder: 68 },
    { instance: new WaveInterference(),  tags: ['physics', 'harmonic', 'quantum'],          minQuality: 0.25, drawOrder: 69 },
    { instance: new GravityCloth(),      tags: ['physics', 'geometric', 'ethereal'],        minQuality: 0.3,  drawOrder: 70 },
    { instance: new FireworkOrchestra(), tags: ['fire', 'stellar', 'light'],                minQuality: 0.25, drawOrder: 71 },
    { instance: new PixelSortGlitch(),   tags: ['glitch', 'digital', 'tech'],               minQuality: 0.25, drawOrder: 72 },
    { instance: new PortalVortex(),      tags: ['void', 'cosmic', 'dark'],                  minQuality: 0.3,  drawOrder: 73 },
    { instance: new AsciiRain(),         tags: ['digital', 'tech', 'dark'],                 minQuality: 0.25, drawOrder: 74 },
    { instance: new HolographicFoil(),   tags: ['light', 'crystal', 'ethereal'],            minQuality: 0.25, drawOrder: 75 },
    { instance: new GravitySymphony(),   tags: ['harmonic', 'cosmic', 'geometric'],         minQuality: 0.25, drawOrder: 76 },
    { instance: new NeonSpiderweb(),     tags: ['organic', 'dark', 'ethereal'],             minQuality: 0.25, drawOrder: 77 },
    { instance: new TrailBlossom(),      tags: ['organic', 'painterly', 'light'],           minQuality: 0.25, drawOrder: 78 },
    { instance: new GravityWeb(),        tags: ['organic', 'dark', 'geometric'],            minQuality: 0.25, drawOrder: 79 },
    { instance: new EchoRipple(),        tags: ['harmonic', 'physics', 'ethereal'],         minQuality: 0.25, drawOrder: 80 },
    { instance: new GravityEcosystem(),  tags: ['organic', 'swarm', 'bio'],                 minQuality: 0.25, drawOrder: 81 },
    { instance: new DimensionalFabric(), tags: ['geometric', 'physics', 'ethereal'],        minQuality: 0.25, drawOrder: 82 },
    { instance: new SynapticStorm(),     tags: ['tech', 'bio', 'light'],                    minQuality: 0.25, drawOrder: 83 },
    { instance: new TimeLapsePainter(),  tags: ['painterly', 'fluid', 'light'],             minQuality: 0.3,  drawOrder: 84 },
    { instance: new MagneticOrigami(),   tags: ['geometric', 'crystal', 'ethereal'],        minQuality: 0.3,  drawOrder: 85 },
    { instance: new GravityConstellationTrails(), tags: ['stellar', 'cosmic', 'ethereal'], minQuality: 0.25, drawOrder: 86 },
    { instance: new DimensionalShatter(),  tags: ['glitch', 'void', 'crystal'],            minQuality: 0.25, drawOrder: 87 },
    { instance: new SymmetryMirror(),      tags: ['geometric', 'crystal', 'light'],         minQuality: 0.3,  drawOrder: 88 },
    { instance: new LivingGeometry(),      tags: ['organic', 'bio', 'geometric'],           minQuality: 0.3,  drawOrder: 89 },
    { instance: new ChromaticWake(),       tags: ['light', 'painterly', 'glitch'],          minQuality: 0.25, drawOrder: 90 },
    { instance: new ParticleFountain(),    tags: ['fire', 'stellar', 'physics'],            minQuality: 0.25, drawOrder: 91 },
    { instance: new RuneSigils(),          tags: ['ethereal', 'geometric', 'dark'],          minQuality: 0.3,  drawOrder: 92 },
    { instance: new KiteFestival(),        tags: ['ethereal', 'painterly', 'geometric'],     minQuality: 0.3,  drawOrder: 93 },
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

    // Weighted selection without replacement using compacted array
    const selected = new Set();
    // Work on copies so we can compact as we select
    const remaining = indices.slice();
    const remWeights = weights.slice();
    let remCount = remaining.length;
    let remTotal = totalWeight;

    while (selected.size < count && remCount > 0) {
        let roll = rng() * remTotal;
        for (let i = 0; i < remCount; i++) {
            roll -= remWeights[i];
            if (roll <= 0) {
                selected.add(remaining[i]);
                remTotal -= remWeights[i];
                // Compact: swap with last and shrink
                remaining[i] = remaining[remCount - 1];
                remWeights[i] = remWeights[remCount - 1];
                remCount--;
                break;
            }
        }
    }

    return selected;
}
