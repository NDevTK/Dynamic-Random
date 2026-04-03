/**
 * @file architecture_registry.js
 * @description Data-driven registry mapping architectures to blueprint affinities.
 * Replaces the 500-line if/else chain in background.js with a declarative table.
 *
 * Each entry defines:
 * - factory: function that creates the architecture instance
 * - blueprints: array of blueprint names with affinity
 * - weight: base probability weight (higher = more likely when matched)
 */

import { CosmicArchitecture, DigitalArchitecture, GeometricArchitecture } from './background_architectures.js';
import { OrganicArchitecture } from './organic_architecture.js';
import { FlowArchitecture } from './flow_architecture.js';
import { AbstractArchitecture } from './abstract_architecture.js';
import { GlitchArchitecture } from './glitch_architecture.js';
import { FabricArchitecture } from './fabric_architecture.js';
import { VoxelArchitecture } from './voxel_architecture.js';
import { FractalArchitecture } from './fractal_architecture.js';
import { AuroraArchitecture } from './aurora_architecture.js';
import { FireflyArchitecture } from './firefly_architecture.js';
import { RaindropArchitecture } from './raindrop_architecture.js';
import { KaleidoscopeArchitecture } from './kaleidoscope_architecture.js';
import { TerrainArchitecture } from './terrain_architecture.js';
import { LavaArchitecture } from './lava_architecture.js';
import { LifeArchitecture } from './life_architecture.js';
import { SynthwaveArchitecture } from './synthwave_architecture.js';
import { PendulumArchitecture } from './pendulum_architecture.js';
import { InkArchitecture } from './ink_architecture.js';
import { CircuitGrowthArchitecture } from './circuit_growth_architecture.js';
import { ReactionDiffusionArchitecture } from './reaction_diffusion_architecture.js';
import { VoronoiArchitecture } from './voronoi_architecture.js';
import { MagneticFieldArchitecture } from './magnetic_field_architecture.js';
import { FluidArchitecture } from './fluid_architecture.js';
import { ConstellationArchitecture } from './constellation_architecture.js';
import { GravityPoolArchitecture } from './gravity_pool_architecture.js';
import { DNAArchitecture } from './dna_architecture.js';
import { TopographyArchitecture } from './topography_architecture.js';
import { PixelSortArchitecture } from './pixel_sort_architecture.js';
import { WeatherArchitecture } from './weather_architecture.js';
import { ShatteredMirrorArchitecture } from './shattered_mirror_architecture.js';
import { MyceliumArchitecture } from './mycelium_architecture.js';
import { InterferenceArchitecture } from './interference_architecture.js';
import { DimensionalRiftArchitecture } from './dimensional_rift_architecture.js';
import { DeepSeaArchitecture } from './deep_sea_architecture.js';
import { GlitchFabricArchitecture } from './glitch_fabric_architecture.js';
import { TypographyArchitecture } from './typography_architecture.js';
import { OrigamiArchitecture } from './origami_architecture.js';
import { NeuralNetArchitecture } from './neural_net_architecture.js';
import { TidalPoolArchitecture } from './tidal_pool_architecture.js';
import { SpeechTypographyArchitecture } from './speech_typography_architecture.js';
import { CameraTextureArchitecture } from './camera_texture_architecture.js';
import { ClothArchitecture } from './cloth_architecture.js';
import { SoftbodyArchitecture } from './softbody_architecture.js';
import { WebGPUParticleArchitecture } from './webgpu_particle_architecture.js';
import { WebGPUFluidArchitecture } from './webgpu_fluid_architecture.js';
import { AttractorArchitecture } from './attractor_architecture.js';
import { SacredGeometryArchitecture } from './sacred_geometry_architecture.js';
import { FractalExplorerArchitecture } from './fractal_explorer_architecture.js';
import { SpirographArchitecture } from './spirograph_architecture.js';
import { TruchetArchitecture } from './truchet_architecture.js';
import { LSystemArchitecture } from './lsystem_architecture.js';
import { FireworksArchitecture } from './fireworks_architecture.js';
import { SwarmArchitecture } from './swarm_architecture.js';
import { NeonGraffitiArchitecture } from './neon_graffiti_architecture.js';
import { GravityMarblesArchitecture } from './gravity_marbles_architecture.js';
import { PixelRainArchitecture } from './pixel_rain_architecture.js';
import { PlasmaBallArchitecture } from './plasma_ball_architecture.js';
import { MosaicArchitecture } from './mosaic_architecture.js';
import { GravityPaintArchitecture } from './gravity_paint_architecture.js';
import { WormholeArchitecture } from './wormhole_architecture.js';
import { EcosystemArchitecture } from './ecosystem_architecture.js';
import { FerrofluidArchitecture } from './ferrofluid_architecture.js';
import { CrystalCaveArchitecture } from './crystal_cave_architecture.js';
import { GlitchCityArchitecture } from './glitch_city_architecture.js';
import { BioluminescentOceanArchitecture } from './bioluminescent_ocean_architecture.js';
import { PaperTheaterArchitecture } from './paper_theater_architecture.js';
import { BubbleUniverseArchitecture } from './bubble_universe_architecture.js';
import { LightningStormArchitecture } from './lightning_storm_architecture.js';
import { StainedGlassArchitecture } from './stained_glass_architecture.js';
import { SandDuneArchitecture } from './sand_dune_architecture.js';
import { TetrisRainArchitecture } from './tetris_rain_architecture.js';
import { GravitySandboxArchitecture } from './gravity_sandbox_architecture.js';
import { AntColonyArchitecture } from './ant_colony_architecture.js';
import { RetroArcadeArchitecture } from './retro_arcade_architecture.js';
import { KineticSculptureArchitecture } from './kinetic_sculpture_architecture.js';
import { PortalArchitecture } from './portal_architecture.js';
import { TimeWarpArchitecture } from './time_warp_architecture.js';
import { DreamWeaverArchitecture } from './dream_weaver_architecture.js';
import { ChaosMosaicArchitecture } from './chaos_mosaic_architecture.js';
import { UnderwaterCausticsArchitecture } from './underwater_caustics_architecture.js';
import { ParticleTornadoArchitecture } from './particle_tornado_architecture.js';

/**
 * Architecture registry. Each entry maps a factory to the blueprints it pairs well with.
 * `weight` controls how likely this architecture is to be chosen when the blueprint matches
 * (higher = more likely). The selection algorithm collects all matching entries, weights them,
 * and picks one via seeded RNG.
 */
export const ARCHITECTURE_REGISTRY = [
    { factory: () => new ConstellationArchitecture(), blueprints: ['Classical', 'StarForged', 'LivingConstellation', 'StellarNursery', 'CelestialForge', 'VoidTouched'], weight: 1 },
    { factory: () => new GravityPoolArchitecture(), blueprints: ['GlassySea', 'Aetherial', 'CoralReef', 'AbyssalZone', 'GlacialDrift'], weight: 1 },
    { factory: () => new DNAArchitecture(), blueprints: ['BioMechanical', 'Organic', 'FungalForest', 'SentientSwarm', 'CoralReef'], weight: 1 },
    { factory: () => new TopographyArchitecture(), blueprints: ['Classical', 'VolcanicForge', 'MoltenHeart', 'GlacialDrift', 'Papercraft'], weight: 1 },
    { factory: () => new PixelSortArchitecture(), blueprints: ['NeonCyber', 'Digital', 'ChromaticAberration', 'TechnoUtopia'], weight: 1 },
    { factory: () => new WeatherArchitecture(), blueprints: ['Aetherial', 'GlacialDrift', 'AbyssalZone', 'Classical', 'HauntedRealm'], weight: 1 },
    { factory: () => new ShatteredMirrorArchitecture(), blueprints: ['Crystalline', 'GlassySea', 'VoidTouched', 'GlacialDrift', 'Eldritch', 'PhantomEcho'], weight: 1 },
    { factory: () => new MyceliumArchitecture(), blueprints: ['FungalForest', 'Organic', 'BioMechanical', 'CoralReef', 'SentientSwarm', 'GooeyMess'], weight: 1 },
    { factory: () => new InterferenceArchitecture(), blueprints: ['QuantumFoam', 'SonicScapes', 'ChromaticAberration', 'Aetherial', 'Eldritch'], weight: 1 },
    { factory: () => new DimensionalRiftArchitecture(), blueprints: ['VoidTouched', 'PhantomEcho', 'Eldritch', 'ChronoVerse', 'AbyssalHorror', 'HauntedRealm'], weight: 1 },
    { factory: () => new DeepSeaArchitecture(), blueprints: ['AbyssalZone', 'CoralReef', 'AbyssalHorror', 'GlassySea', 'GlacialDrift'], weight: 1 },
    { factory: () => new GlitchFabricArchitecture(), blueprints: ['SilkWeaver', 'NeonCyber', 'Digital', 'TechnoUtopia', 'Papercraft'], weight: 1 },
    { factory: () => new TypographyArchitecture(), blueprints: ['Classical', 'TechnoUtopia', 'NeonCyber', 'ChronoVerse', 'Eldritch', 'Aetherial'], weight: 1 },
    { factory: () => new OrigamiArchitecture(), blueprints: ['Papercraft', 'Crystalline', 'GlacialDrift', 'SilkWeaver', 'Classical'], weight: 1 },
    { factory: () => new NeuralNetArchitecture(), blueprints: ['TechnoUtopia', 'NeonCyber', 'BioMechanical', 'QuantumFoam', 'SentientSwarm'], weight: 1 },
    { factory: () => new TidalPoolArchitecture(), blueprints: ['CoralReef', 'GlassySea', 'AbyssalZone', 'AbyssalHorror', 'Classical'], weight: 1 },
    { factory: () => new SpeechTypographyArchitecture(), blueprints: ['Classical', 'SonicScapes', 'Eldritch', 'ChronoVerse', 'Aetherial'], weight: 0.8 },
    { factory: () => new CameraTextureArchitecture(), blueprints: ['NeonCyber', 'Digital', 'TechnoUtopia', 'BioMechanical', 'ChromaticAberration'], weight: 0.8 },
    { factory: () => new ClothArchitecture(), blueprints: ['SilkWeaver', 'Papercraft', 'GlacialDrift', 'Aetherial'], weight: 1 },
    { factory: () => new SoftbodyArchitecture(), blueprints: ['GooeyMess', 'Organic', 'AbyssalHorror', 'FungalForest', 'SentientSwarm'], weight: 1 },
    { factory: () => new WebGPUParticleArchitecture(), blueprints: ['StarForged', 'CelestialForge', 'StellarNursery', 'LivingConstellation'], weight: 1 },
    { factory: () => new WebGPUFluidArchitecture(), blueprints: ['LivingInk', 'Painterly', 'ChromaticAberration', 'GooeyMess', 'Aetherial'], weight: 1 },
    { factory: () => new AttractorArchitecture(), blueprints: ['QuantumFoam', 'VoidTouched', 'ChronoVerse', 'Eldritch', 'PhantomEcho', 'StarForged'], weight: 1 },
    { factory: () => new SacredGeometryArchitecture(), blueprints: ['ArcaneCodex', 'Crystalline', 'Classical', 'Eldritch', 'Aetherial', 'Papercraft'], weight: 1 },
    { factory: () => new FractalExplorerArchitecture(), blueprints: ['QuantumFoam', 'Eldritch', 'ChromaticAberration', 'VoidTouched'], weight: 1 },
    { factory: () => new SpirographArchitecture(), blueprints: ['SonicScapes', 'ChronoVerse', 'Classical', 'Papercraft', 'GlacialDrift', 'Crystalline'], weight: 1 },
    { factory: () => new TruchetArchitecture(), blueprints: ['Digital', 'QuantumFoam', 'Papercraft', 'Crystalline', 'NeonCyber'], weight: 1 },
    { factory: () => new LSystemArchitecture(), blueprints: ['FungalForest', 'Organic', 'CoralReef', 'BioMechanical', 'Classical'], weight: 1 },
    { factory: () => new FireworksArchitecture(), blueprints: ['CelestialForge', 'StarForged', 'StellarNursery', 'LivingConstellation', 'NeonCyber', 'Classical'], weight: 1 },
    { factory: () => new SwarmArchitecture(), blueprints: ['SentientSwarm', 'BioMechanical', 'Organic', 'FungalForest', 'CoralReef', 'HauntedRealm'], weight: 1 },
    { factory: () => new NeonGraffitiArchitecture(), blueprints: ['NeonCyber', 'Painterly', 'LivingInk', 'TechnoUtopia', 'ChromaticAberration'], weight: 1 },
    { factory: () => new GravityMarblesArchitecture(), blueprints: ['Crystalline', 'GlassySea', 'VolcanicForge', 'MoltenHeart', 'GooeyMess', 'Papercraft'], weight: 1 },
    { factory: () => new PixelRainArchitecture(), blueprints: ['Digital', 'NeonCyber', 'TechnoUtopia', 'ArcaneCodex', 'ChronoVerse', 'Eldritch'], weight: 1 },
    { factory: () => new PlasmaBallArchitecture(), blueprints: ['StarForged', 'CelestialForge', 'VolcanicForge', 'MoltenHeart', 'NeonCyber', 'Eldritch', 'QuantumFoam'], weight: 1 },
    { factory: () => new MosaicArchitecture(), blueprints: ['Papercraft', 'Crystalline', 'GlassySea', 'ArcaneCodex', 'Classical'], weight: 1 },
    { factory: () => new GravityPaintArchitecture(), blueprints: ['Painterly', 'LivingInk', 'ChromaticAberration', 'GooeyMess', 'Aetherial', 'MoltenHeart'], weight: 1 },
    { factory: () => new WormholeArchitecture(), blueprints: ['VoidTouched', 'PhantomEcho', 'QuantumFoam', 'ChronoVerse', 'Eldritch', 'AbyssalHorror'], weight: 1 },
    { factory: () => new EcosystemArchitecture(), blueprints: ['SentientSwarm', 'Organic', 'BioMechanical', 'FungalForest', 'CoralReef', 'AbyssalZone'], weight: 1 },
    { factory: () => new FerrofluidArchitecture(), blueprints: ['MoltenHeart', 'VolcanicForge', 'StarForged', 'VoidTouched', 'CelestialForge', 'GooeyMess', 'AbyssalHorror'], weight: 1 },
    { factory: () => new CrystalCaveArchitecture(), blueprints: ['Crystalline', 'GlacialDrift', 'GlassySea', 'ArcaneCodex', 'Eldritch', 'AbyssalZone'], weight: 1 },
    { factory: () => new GlitchCityArchitecture(), blueprints: ['NeonCyber', 'TechnoUtopia', 'Digital', 'HauntedRealm', 'ChronoVerse', 'SonicScapes'], weight: 1 },
    { factory: () => new BioluminescentOceanArchitecture(), blueprints: ['AbyssalZone', 'CoralReef', 'AbyssalHorror', 'GlassySea', 'Aetherial', 'GlacialDrift'], weight: 1 },
    { factory: () => new PaperTheaterArchitecture(), blueprints: ['Papercraft', 'Classical', 'HauntedRealm', 'Painterly', 'SilkWeaver', 'LivingInk'], weight: 1 },
    { factory: () => new BubbleUniverseArchitecture(), blueprints: ['GlassySea', 'Aetherial', 'CoralReef', 'GooeyMess', 'GlacialDrift', 'Organic', 'AbyssalZone'], weight: 1 },
    { factory: () => new LightningStormArchitecture(), blueprints: ['StarForged', 'CelestialForge', 'VolcanicForge', 'VoidTouched', 'NeonCyber', 'Eldritch', 'HauntedRealm'], weight: 1 },
    { factory: () => new StainedGlassArchitecture(), blueprints: ['Crystalline', 'ArcaneCodex', 'Classical', 'Papercraft', 'GlassySea', 'Eldritch', 'Painterly'], weight: 1 },
    { factory: () => new SandDuneArchitecture(), blueprints: ['VolcanicForge', 'MoltenHeart', 'Classical', 'GlacialDrift', 'AbyssalZone', 'StarForged'], weight: 1 },
    { factory: () => new TetrisRainArchitecture(), blueprints: ['Digital', 'NeonCyber', 'TechnoUtopia', 'Papercraft', 'ChromaticAberration', 'QuantumFoam'], weight: 1 },
    { factory: () => new GravitySandboxArchitecture(), blueprints: ['StarForged', 'CelestialForge', 'StellarNursery', 'LivingConstellation', 'Classical', 'QuantumFoam'], weight: 1 },
    { factory: () => new AntColonyArchitecture(), blueprints: ['FungalForest', 'SentientSwarm', 'Organic', 'BioMechanical', 'CoralReef', 'GooeyMess', 'HauntedRealm'], weight: 1 },
    { factory: () => new RetroArcadeArchitecture(), blueprints: ['NeonCyber', 'Digital', 'TechnoUtopia', 'Papercraft', 'Classical', 'ChromaticAberration'], weight: 1 },
    { factory: () => new KineticSculptureArchitecture(), blueprints: ['ChronoVerse', 'Classical', 'Papercraft', 'SonicScapes', 'StarForged', 'CelestialForge', 'Crystalline'], weight: 1 },
    { factory: () => new PortalArchitecture(), blueprints: ['VoidTouched', 'PhantomEcho', 'QuantumFoam', 'Eldritch', 'ChronoVerse', 'AbyssalHorror', 'HauntedRealm'], weight: 1 },
    { factory: () => new TimeWarpArchitecture(), blueprints: ['ChronoVerse', 'PhantomEcho', 'VoidTouched', 'QuantumFoam', 'Eldritch', 'StarForged', 'CelestialForge'], weight: 1 },
    { factory: () => new DreamWeaverArchitecture(), blueprints: ['Aetherial', 'Painterly', 'PhantomEcho', 'HauntedRealm', 'LivingInk', 'VoidTouched', 'GlacialDrift', 'Classical'], weight: 1 },
    { factory: () => new ChaosMosaicArchitecture(), blueprints: ['QuantumFoam', 'Digital', 'ArcaneCodex', 'Eldritch', 'NeonCyber', 'TechnoUtopia', 'SentientSwarm'], weight: 1 },
    { factory: () => new UnderwaterCausticsArchitecture(), blueprints: ['AbyssalZone', 'CoralReef', 'GlassySea', 'AbyssalHorror', 'GlacialDrift', 'Aetherial', 'MoltenHeart', 'VolcanicForge'], weight: 1 },
    { factory: () => new ParticleTornadoArchitecture(), blueprints: ['VoidTouched', 'StarForged', 'CelestialForge', 'StellarNursery', 'VolcanicForge', 'MoltenHeart', 'Aetherial', 'GlacialDrift', 'HauntedRealm'], weight: 1 },
    { factory: () => new ReactionDiffusionArchitecture(), blueprints: ['Organic', 'BioMechanical', 'FungalForest', 'CoralReef', 'QuantumFoam', 'SentientSwarm', 'GooeyMess'], weight: 1 },
    { factory: () => new VoronoiArchitecture(), blueprints: ['Crystalline', 'GlassySea', 'ArcaneCodex', 'Papercraft', 'Eldritch', 'AbyssalZone'], weight: 1 },
    { factory: () => new MagneticFieldArchitecture(), blueprints: ['StarForged', 'CelestialForge', 'StellarNursery', 'VolcanicForge', 'MoltenHeart', 'SonicScapes'], weight: 1 },
    { factory: () => new FluidArchitecture(), blueprints: ['LivingInk', 'Painterly', 'Aetherial', 'GooeyMess', 'ChromaticAberration', 'PhantomEcho'], weight: 1 },
    { factory: () => new PendulumArchitecture(), blueprints: ['ChronoVerse', 'PhantomEcho', 'SonicScapes', 'GlacialDrift', 'Classical', 'Papercraft'], weight: 0.9 },
    { factory: () => new InkArchitecture(), blueprints: ['Painterly', 'LivingInk', 'ChromaticAberration', 'GooeyMess', 'Aetherial'], weight: 1 },
    { factory: () => new CircuitGrowthArchitecture(), blueprints: ['Digital', 'TechnoUtopia', 'BioMechanical', 'NeonCyber', 'ArcaneCodex'], weight: 1 },
    { factory: () => new LavaArchitecture(), blueprints: ['VolcanicForge', 'MoltenHeart', 'GooeyMess', 'AbyssalHorror', 'AbyssalZone'], weight: 1.2 },
    { factory: () => new LifeArchitecture(), blueprints: ['SentientSwarm', 'BioMechanical', 'Organic', 'FungalForest', 'CoralReef', 'QuantumFoam'], weight: 1.2 },
    { factory: () => new SynthwaveArchitecture(), blueprints: ['NeonCyber', 'TechnoUtopia', 'Digital', 'SonicScapes', 'ChromaticAberration'], weight: 1.3 },
    { factory: () => new AuroraArchitecture(), blueprints: ['Aetherial', 'GlacialDrift', 'AbyssalZone', 'VoidTouched', 'StarForged'], weight: 1 },
    { factory: () => new FireflyArchitecture(), blueprints: ['Organic', 'FungalForest', 'SentientSwarm', 'CoralReef', 'HauntedRealm', 'AbyssalHorror'], weight: 1.2 },
    { factory: () => new RaindropArchitecture(), blueprints: ['Aetherial', 'GlacialDrift', 'Painterly', 'LivingInk', 'AbyssalZone'], weight: 0.9 },
    { factory: () => new KaleidoscopeArchitecture(), blueprints: ['ChromaticAberration', 'ArcaneCodex', 'Crystalline', 'QuantumFoam', 'Eldritch'], weight: 1 },
    { factory: () => new TerrainArchitecture(), blueprints: ['Classical', 'StarForged', 'StellarNursery', 'CelestialForge', 'VolcanicForge', 'MoltenHeart'], weight: 1 },
    { factory: () => new FabricArchitecture(), blueprints: ['SilkWeaver', 'PhantomEcho'], weight: 1 },
    { factory: () => new VoxelArchitecture(), blueprints: ['TechnoUtopia', 'Digital'], weight: 0.8 },
    { factory: () => new FractalArchitecture(), blueprints: ['Crystalline', 'ArcaneCodex'], weight: 0.8 },
    // Broad fallback architectures (match many blueprints with lower weight)
    { factory: () => new OrganicArchitecture(), blueprints: ['Organic', 'BioMechanical', 'FungalForest', 'SentientSwarm', 'CoralReef', 'GooeyMess', 'AbyssalHorror'], weight: 0.6 },
    { factory: () => new FlowArchitecture(), blueprints: ['Aetherial', 'PhantomEcho', 'ChronoVerse', 'QuantumFoam', 'SonicScapes', 'ChromaticAberration', 'GlassySea'], weight: 0.6 },
    { factory: () => new AbstractArchitecture(), blueprints: ['Painterly', 'StarForged', 'CelestialForge', 'LivingConstellation', 'StellarNursery', 'LivingInk', 'MoltenHeart', 'VolcanicForge'], weight: 0.5 },
    { factory: () => new DigitalArchitecture(), blueprints: ['Digital', 'TechnoUtopia', 'NeonCyber'], weight: 0.5 },
    { factory: () => new GeometricArchitecture(), blueprints: ['Crystalline', 'GlassySea', 'Papercraft', 'ArcaneCodex'], weight: 0.5 },
    { factory: () => new GlitchArchitecture(), blueprints: ['Digital', 'NeonCyber', 'TechnoUtopia'], weight: 0.6 },
    { factory: () => new CosmicArchitecture(), blueprints: ['Classical', 'StarForged', 'StellarNursery', 'CelestialForge', 'LivingConstellation'], weight: 0.4 },
];

// Precompute a Set per entry for O(1) blueprint lookup
for (const entry of ARCHITECTURE_REGISTRY) {
    entry._blueprintSet = new Set(entry.blueprints);
}

/**
 * Master list of all architecture factories for wildcard selection, cycling, and blending.
 * This is the single source of truth — background.js re-exports it.
 */
export const ALL_ARCHITECTURES = [
    () => new CosmicArchitecture(),
    () => new DigitalArchitecture(),
    () => new GeometricArchitecture(),
    () => new OrganicArchitecture(),
    () => new FlowArchitecture(),
    () => new AbstractArchitecture(),
    () => new GlitchArchitecture(),
    () => new FabricArchitecture(),
    () => new VoxelArchitecture(),
    () => new FractalArchitecture(),
    () => new AuroraArchitecture(),
    () => new FireflyArchitecture(),
    () => new RaindropArchitecture(),
    () => new KaleidoscopeArchitecture(),
    () => new TerrainArchitecture(),
    () => new LavaArchitecture(),
    () => new LifeArchitecture(),
    () => new SynthwaveArchitecture(),
    () => new PendulumArchitecture(),
    () => new InkArchitecture(),
    () => new CircuitGrowthArchitecture(),
    () => new ReactionDiffusionArchitecture(),
    () => new VoronoiArchitecture(),
    () => new MagneticFieldArchitecture(),
    () => new FluidArchitecture(),
    () => new ConstellationArchitecture(),
    () => new GravityPoolArchitecture(),
    () => new DNAArchitecture(),
    () => new TopographyArchitecture(),
    () => new PixelSortArchitecture(),
    () => new WeatherArchitecture(),
    () => new ShatteredMirrorArchitecture(),
    () => new MyceliumArchitecture(),
    () => new InterferenceArchitecture(),
    () => new DimensionalRiftArchitecture(),
    () => new DeepSeaArchitecture(),
    () => new GlitchFabricArchitecture(),
    () => new TypographyArchitecture(),
    () => new OrigamiArchitecture(),
    () => new NeuralNetArchitecture(),
    () => new TidalPoolArchitecture(),
    () => new SpeechTypographyArchitecture(),
    () => new CameraTextureArchitecture(),
    () => new ClothArchitecture(),
    () => new SoftbodyArchitecture(),
    () => new WebGPUParticleArchitecture(),
    () => new WebGPUFluidArchitecture(),
    () => new AttractorArchitecture(),
    () => new SacredGeometryArchitecture(),
    () => new FractalExplorerArchitecture(),
    () => new SpirographArchitecture(),
    () => new TruchetArchitecture(),
    () => new LSystemArchitecture(),
    () => new FireworksArchitecture(),
    () => new SwarmArchitecture(),
    () => new NeonGraffitiArchitecture(),
    () => new GravityMarblesArchitecture(),
    () => new PixelRainArchitecture(),
    () => new PlasmaBallArchitecture(),
    () => new MosaicArchitecture(),
    () => new GravityPaintArchitecture(),
    () => new WormholeArchitecture(),
    () => new EcosystemArchitecture(),
    () => new FerrofluidArchitecture(),
    () => new CrystalCaveArchitecture(),
    () => new GlitchCityArchitecture(),
    () => new BioluminescentOceanArchitecture(),
    () => new PaperTheaterArchitecture(),
    () => new BubbleUniverseArchitecture(),
    () => new LightningStormArchitecture(),
    () => new StainedGlassArchitecture(),
    () => new SandDuneArchitecture(),
    () => new TetrisRainArchitecture(),
    () => new GravitySandboxArchitecture(),
    () => new AntColonyArchitecture(),
    () => new RetroArcadeArchitecture(),
    () => new KineticSculptureArchitecture(),
    () => new PortalArchitecture(),
    () => new TimeWarpArchitecture(),
    () => new DreamWeaverArchitecture(),
    () => new ChaosMosaicArchitecture(),
    () => new UnderwaterCausticsArchitecture(),
    () => new ParticleTornadoArchitecture()
];

// Display-friendly names derived from constructor names
export const ARCH_CONSTRUCTOR_NAMES = ALL_ARCHITECTURES.map(fn => {
    const match = fn.toString().match(/new\s+(\w+)/);
    return match ? match[1] : 'Unknown';
});
export const ARCH_DISPLAY_NAMES = ARCH_CONSTRUCTOR_NAMES.map(n => n.replace(/Architecture$/, ''));

/**
 * Select an architecture based on blueprint name using weighted random selection.
 * 20% wildcard chance picks from ALL_ARCHITECTURES regardless of blueprint match.
 *
 * @param {string} blueprintName - The active blueprint name
 * @param {function} rng - Seeded RNG function
 * @returns {object} Architecture instance
 */
export function selectArchitecture(blueprintName, rng) {
    // 20% wildcard: completely random architecture for maximum diversity
    if (rng() < 0.20) {
        return ALL_ARCHITECTURES[Math.floor(rng() * ALL_ARCHITECTURES.length)]();
    }

    // Collect all matching entries with their weights
    const candidates = [];
    let totalWeight = 0;

    for (const entry of ARCHITECTURE_REGISTRY) {
        if (entry._blueprintSet.has(blueprintName)) {
            candidates.push(entry);
            totalWeight += entry.weight;
        }
    }

    // If no matches, fall back to random from all architectures
    if (candidates.length === 0) {
        return ALL_ARCHITECTURES[Math.floor(rng() * ALL_ARCHITECTURES.length)]();
    }

    // Weighted random selection
    let roll = rng() * totalWeight;
    for (const candidate of candidates) {
        roll -= candidate.weight;
        if (roll <= 0) {
            return candidate.factory();
        }
    }

    // Safety fallback (shouldn't reach here due to floating point)
    return candidates[candidates.length - 1].factory();
}
