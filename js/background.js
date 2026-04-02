/**
 * @file background.js
 * @description Handles the interactive, generative background system.
 */

import { mouse } from './state.js';
import { deviceSensors } from './device_sensors.js';
import { SpatialGrid } from './spatial_grid.js';
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
import { gamepadInput } from './gamepad_input.js';
import { micReactive } from './mic_reactive.js';
import { tabSync } from './tab_sync.js';
import { speechInput } from './speech_input.js';
import { cameraInput } from './camera_input.js';
import { perfMonitor } from './perf_monitor.js';
import { touchGestures } from './touch_gestures.js';
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
import { postProcessing } from './post_processing.js';
import { generativeMusic } from './generative_music.js';
import { timeline } from './timeline.js';
import { multiMonitor } from './multi_monitor.js';
import { TimeWarpArchitecture } from './time_warp_architecture.js';
import { DreamWeaverArchitecture } from './dream_weaver_architecture.js';
import { ChaosMosaicArchitecture } from './chaos_mosaic_architecture.js';
import { interactiveEffects } from './interactive_background_effects.js';
import { selectArchitecture } from './architecture_registry.js';

// All available architectures for wildcard selection
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
    () => new ChaosMosaicArchitecture()
];

// Extract constructor names from factory functions without instantiating them.
// Each factory is `() => new FooArchitecture()`, so we parse the class name from toString().
const ARCH_CONSTRUCTOR_NAMES = ALL_ARCHITECTURES.map(fn => {
    const match = fn.toString().match(/new\s+(\w+)/);
    return match ? match[1] : 'Unknown';
});

// Display-friendly names for the architecture selector UI
export const ARCH_DISPLAY_NAMES = ARCH_CONSTRUCTOR_NAMES.map(n => n.replace(/Architecture$/, ''));

class BackgroundSystem {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.architecture = new CosmicArchitecture();
        this.trail = [];
        this.trailPool = [];
        this.shockwaves = [];
        this.sparks = [];
        this.sparkPool = [];
        this.shootingStars = [];
        this.spatialGrid = null;
        this.cellSize = 150;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.rng = Math.random;

        // Offscreen canvas for background optimization
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: false });

        // Transition canvas for crossfade between architectures
        this._transitionCanvas = document.createElement('canvas');
        this._transitionCtx = this._transitionCanvas.getContext('2d', { alpha: false });
        this._transitionAlpha = 0;    // 0 = old only, 1 = new only
        this._transitionActive = false;
        this._prevArchitecture = null; // outgoing architecture during transition
        this._transitionType = 'crossfade'; // 'crossfade', 'wipe', 'zoom', 'spiral'

        // Architecture blending
        this._blendArchitecture = null; // secondary architecture for blending
        this._blendCanvas = document.createElement('canvas');
        this._blendCtx = this._blendCanvas.getContext('2d', { alpha: true });
        this._blendMode = 'off';       // 'off', 'active'
        this._blendAlpha = 0.35;       // how much of secondary shows through

        // Idle / screensaver mode
        this._lastInteraction = 0;
        this._idleCycleActive = false;
        this._idleCycleInterval = 15000; // ms between auto-cycles
        this._lastIdleCycle = 0;

        // Cached scanlines path (performance optimization)
        this.cachedScanlinesPath = null;
        this.cachedScanlinesHeight = 0;

        // Cached vignette gradient
        this.cachedVignetteGradient = null;
        this.cachedVignetteWidth = 0;

        // Theme properties
        this.hue = 0;
        this.isMonochrome = false;
        this.isDark = false;
        this.gradientColors = ['#0a050d', '#120510', '#000000'];
        this.gradient = null;
        this.bgMutators = [];

        // Animation
        this.tick = 0;
        this.speedMultiplier = 1;
        this.targetSpeed = 1;

        // Interactive Modes
        this.isGravityWell = false;

        this.canvas.id = 'background-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '-1';
        this.canvas.style.pointerEvents = 'none';
    }

    init() {
        document.body.prepend(this.canvas);
        // Throttle resize to prevent canvas resize thrashing (perf fix)
        let resizeTimer = 0;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => this.resize(), 100);
        });

        window.addEventListener('contextmenu', (e) => {
            if (!e.target.closest('#ui-container')) {
                e.preventDefault();
            }
        });

        const markInteraction = () => { this._lastInteraction = performance.now(); this._idleCycleActive = false; };

        window.addEventListener('mousedown', (e) => {
            markInteraction();
            if (e.target.closest('#ui-container')) return;
            if (e.button === 0) this.targetSpeed = 20;
            else if (e.button === 2) this.isGravityWell = true;
        });

        window.addEventListener('mouseup', () => {
            this.targetSpeed = 1;
            this.isGravityWell = false;
        });

        window.addEventListener('mouseleave', () => {
            this.targetSpeed = 1;
            this.isGravityWell = false;
        });

        window.addEventListener('mousemove', markInteraction);
        window.addEventListener('keydown', markInteraction);
        window.addEventListener('touchstart', markInteraction);

        window.addEventListener('click', (e) => {
             this.createShockwave(e.clientX, e.clientY);
        });

        // Architecture cycling via arrow keys + blend toggle via 'B'
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') {
                this.cycleArchitecture(1);
            } else if (e.key === 'ArrowLeft') {
                this.cycleArchitecture(-1);
            } else if (e.key === 'b' || e.key === 'B') {
                this.toggleBlend();
            }
        });

        this._currentArchIndex = -1; // -1 = seed-selected
        this._lastInteraction = performance.now();

        // Check URL for architecture param
        const urlParams = new URLSearchParams(window.location.search);
        const archParam = urlParams.get('arch');
        if (archParam !== null) {
            const archIdx = parseInt(archParam, 10);
            if (archIdx >= 0 && archIdx < ALL_ARCHITECTURES.length) {
                this._pendingArchIndex = archIdx;
            }
        }

        this.resize();
        postProcessing.init(this);
        this.loop = this.animate.bind(this);
        requestAnimationFrame(this.loop);
    }

    cycleArchitecture(direction) {
        if (this._currentArchIndex === -1) {
            const currentName = this.architecture.constructor.name;
            this._currentArchIndex = ARCH_CONSTRUCTOR_NAMES.indexOf(currentName);
            if (this._currentArchIndex === -1) this._currentArchIndex = 0;
        }
        this._currentArchIndex = (this._currentArchIndex + direction + ALL_ARCHITECTURES.length) % ALL_ARCHITECTURES.length;
        this.forceArchitecture(ALL_ARCHITECTURES[this._currentArchIndex]);
    }

    forceArchitecture(architectureFactory) {
        // Snapshot current frame to transition canvas
        if (this.architecture && this.canvas.width > 0) {
            this._transitionCtx.drawImage(this.canvas, 0, 0);
            this._prevArchitecture = this.architecture;
            this._transitionAlpha = 0;
            this._transitionActive = true;
            // Pick random transition type
            const types = ['crossfade', 'wipe', 'zoom', 'spiral'];
            this._transitionType = types[Math.floor(Math.random() * types.length)];
        }
        this.architecture = architectureFactory();
        this.architecture.init(this);
        this._updateURLArch();
        // Record in timeline
        if (typeof timeline !== 'undefined' && timeline.record) {
            const seed = new URLSearchParams(window.location.search).get('seed') || '';
            timeline.record(seed, this._currentArchIndex);
        }
    }

    selectArchitecture(index) {
        this._currentArchIndex = ((index % ALL_ARCHITECTURES.length) + ALL_ARCHITECTURES.length) % ALL_ARCHITECTURES.length;
        this.forceArchitecture(ALL_ARCHITECTURES[this._currentArchIndex]);
    }

    // --- Architecture blending ---
    toggleBlend() {
        if (this._blendMode === 'active') {
            this._blendMode = 'off';
            this._blendArchitecture = null;
        } else {
            // Pick a random second architecture different from the current one
            let idx;
            do { idx = Math.floor(Math.random() * ALL_ARCHITECTURES.length); }
            while (idx === this._currentArchIndex && ALL_ARCHITECTURES.length > 1);
            this._blendArchitecture = ALL_ARCHITECTURES[idx]();
            this._blendArchitecture.init(this);
            this._blendMode = 'active';
        }
    }

    // --- Idle / screensaver ---
    _updateIdle(now) {
        const idleTime = now - this._lastInteraction;
        if (idleTime > 60000) { // 60s of no interaction
            if (!this._idleCycleActive) {
                this._idleCycleActive = true;
                this._lastIdleCycle = now;
            }
            if (now - this._lastIdleCycle > this._idleCycleInterval) {
                this._lastIdleCycle = now;
                // Auto-cycle to random architecture
                const idx = Math.floor(Math.random() * ALL_ARCHITECTURES.length);
                this._currentArchIndex = idx;
                this.forceArchitecture(ALL_ARCHITECTURES[idx]);
            }
        }
    }

    // --- URL architecture encoding ---
    _updateURLArch() {
        if (this._currentArchIndex < 0) return;
        const url = new URL(window.location.href);
        url.searchParams.set('arch', String(this._currentArchIndex));
        window.history.replaceState(null, '', url.toString());
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.offscreenCanvas.width = this.width;
        this.offscreenCanvas.height = this.height;
        this._transitionCanvas.width = this.width;
        this._transitionCanvas.height = this.height;
        this._blendCanvas.width = this.width;
        this._blendCanvas.height = this.height;

        if (!this.spatialGrid) {
            this.spatialGrid = new SpatialGrid(this.width, this.height, this.cellSize);
        } else {
            this.spatialGrid.updateDimensions(this.width, this.height);
        }
        // Invalidate cached scanlines on resize
        this.cachedScanlinesPath = null;
        this.updateGradient();
    }

    updateGradient() {
        const ctx = this.offscreenCtx;
        const style = this.gradientStyle || 0;

        if (style === 1) {
            // Radial gradient from center
            this.gradient = ctx.createRadialGradient(
                this.width / 2, this.height / 2, 0,
                this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
            );
        } else if (style === 2) {
            // Top-to-bottom with multi stops
            this.gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        } else if (style === 3) {
            // Horizontal sweep
            this.gradient = ctx.createLinearGradient(0, this.height / 2, this.width, this.height / 2);
        } else if (style === 4) {
            // Corner-to-corner (bottom-left to top-right)
            this.gradient = ctx.createLinearGradient(0, this.height, this.width, 0);
        } else {
            // Default diagonal
            this.gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
        }

        this.gradientColors.forEach((c, i) => this.gradient.addColorStop(i / (this.gradientColors.length - 1), c));

        ctx.fillStyle = this.gradient;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    setTheme(hue, isMonochrome, seededRandom, isDark, blueprintName) {
        this.hue = hue;
        this.isMonochrome = isMonochrome;
        this.isDark = isDark;
        this.rng = seededRandom || Math.random;

        // Architecture selection via data-driven registry (see architecture_registry.js)
        this.architecture = selectArchitecture(blueprintName, this.rng, ALL_ARCHITECTURES);

        // Randomize background mutators based on seed for more visual variety
        this.bgMutators = [];
        if (this.rng() > 0.6) this.bgMutators.push('Vignette');
        if (this.rng() > 0.8) this.bgMutators.push('Noise');
        if (this.rng() > 0.88) this.bgMutators.push('Scanlines');
        if (this.rng() > 0.85) this.bgMutators.push('ChromaticShift');
        if (this.rng() > 0.9) this.bgMutators.push('FilmGrain');

        // Seed-driven gradient style for more visual differentiation
        this.gradientStyle = Math.floor(this.rng() * 5); // 0=diagonal, 1=radial, 2=multi-stop, 3=conic-approx, 4=duotone

        // Seed-driven architecture blending (~10% of universes)
        if (this.rng() < 0.10) {
            const blendIdx = Math.floor(this.rng() * ALL_ARCHITECTURES.length);
            this._blendArchitecture = ALL_ARCHITECTURES[blendIdx]();
            this._blendAlpha = 0.15 + this.rng() * 0.25;
            this._blendMode = 'active';
        } else {
            this._blendMode = 'off';
            this._blendArchitecture = null;
        }

        // Seed-driven post-processing effects
        postProcessing.setEffects(this.rng);

        // Configure generative music for this universe
        generativeMusic.configure(this.rng, this.hue, blueprintName);

        this.updateThemeColors();
        this.architecture.init(this);
        if (this._blendArchitecture) this._blendArchitecture.init(this);
    }

    createShockwave(x, y, fromRemote) {
        // Cap shockwaves to prevent unbounded growth
        if (this.shockwaves.length >= 15) return;
        this.shockwaves.push({ x, y, radius: 0, maxRadius: Math.max(this.width, this.height) * 0.8, speed: 10, strength: 2, alpha: 1 });
        // Broadcast to other tabs (normalized coordinates)
        if (!fromRemote && tabSync.tabCount > 1) {
            tabSync.sendEffect('shockwave', { x: x / this.width, y: y / this.height });
        }
        const sparkCount = Math.min(30, 500 - this.sparks.length); // cap total sparks at 500
        for(let i=0; i<sparkCount; i++) {
            const angle = this.rng() * Math.PI * 2; const speed = this.rng() * 10 + 5;
            let spark = this.sparkPool.length > 0 ? this.sparkPool.pop() : {};
            spark.x = x; spark.y = y;
            spark.vx = Math.cos(angle) * speed; spark.vy = Math.sin(angle) * speed;
            spark.life = 50 + this.rng() * 30; spark.maxLife = 80;
            spark.size = this.rng() * 3 + 1; spark.color = '255, 255, 200';
            this.sparks.push(spark);
        }
    }

    drawSparks() {
        this.ctx.globalCompositeOperation = 'lighter';
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            s.x += s.vx; s.y += s.vy; s.life--;
            s.vx *= 0.9; s.vy *= 0.9;
            if (s.life <= 0) {
                this.sparkPool.push(s);
                this.sparks[i] = this.sparks[this.sparks.length - 1];
                this.sparks.pop();
                continue;
            }
            const alpha = s.life / s.maxLife;
            this.ctx.fillStyle = `rgba(${s.color}, ${alpha})`;
            this.ctx.beginPath(); this.ctx.arc(s.x, s.y, s.size * alpha, 0, Math.PI * 2); this.ctx.fill();
        }
        this.ctx.globalCompositeOperation = 'source-over';
    }

    updateThemeColors() {
        if (this.isDark) {
            // Even dark mode benefits from seed-driven subtle variation
            const style = this.gradientStyle || 0;
            if (style === 1) this.gradientColors = ['#000000', '#0a0510', '#050208'];
            else if (style === 3) this.gradientColors = ['#080510', '#000000', '#050510'];
            else this.gradientColors = ['#0a050d', '#120510', '#000000'];
        } else if (this.isMonochrome) {
            const l = 10 + Math.sin(this.tick * 0.005) * 3;
            this.gradientColors = [`hsl(${this.hue}, 80%, ${l}%)`, `hsl(${this.hue}, 40%, ${l*2}%)`, `hsl(${this.hue}, 90%, ${l*0.5}%)` ];
        } else {
            const shift = Math.sin(this.tick * 0.002) * 20;
            const h = this.hue + shift;
            const style = this.gradientStyle || 0;
            if (style === 1) {
                // Radial: bright center fading to dark edges
                this.gradientColors = [
                    `hsl(${h}, 60%, 12%)`,
                    `hsl(${(h + 90) % 360}, 70%, 6%)`,
                    `hsl(${(h + 180) % 360}, 80%, 3%)`
                ];
            } else if (style === 4) {
                // Duotone: two-color dramatic gradient
                this.gradientColors = [
                    `hsl(${h}, 90%, 8%)`,
                    `hsl(${(h + 180) % 360}, 90%, 6%)`,
                    `hsl(${h}, 70%, 4%)`
                ];
            } else {
                this.gradientColors = [
                    `hsl(${h}, 80%, 10%)`,
                    `hsl(${(h + 120) % 360}, 80%, 5%)`,
                    `hsl(${(h + 240) % 360}, 80%, 8%)`
                ];
            }
        }
        this.updateGradient();
    }

    animate() {
        this.tick++;
        this.speedMultiplier += (this.targetSpeed - this.speedMultiplier) * 0.1;
        const now = performance.now();

        // Apply pending architecture from URL (after first setTheme has run)
        if (this._pendingArchIndex !== undefined && this.tick > 2) {
            this.selectArchitecture(this._pendingArchIndex);
            this._pendingArchIndex = undefined;
        }

        // Idle / screensaver auto-cycle
        this._updateIdle(now);

        // Advance crossfade transition
        if (this._transitionActive) {
            this._transitionAlpha += 0.025; // ~40 frames = ~0.67s
            if (this._transitionAlpha >= 1) {
                this._transitionActive = false;
                this._prevArchitecture = null;
                this._transitionAlpha = 1;
            }
        }

        // Update generative music
        generativeMusic.update(this);

        // Expose input system data for architectures
        this.deviceTilt = deviceSensors.tilt;
        this.deviceShake = deviceSensors.shake;
        this.multiMonitorX = multiMonitor.normalizedX;
        this.gamepad = gamepadInput;
        this.mic = micReactive;
        this.tabSync = tabSync;
        this.speech = speechInput;
        this.camera = cameraInput;
        this.qualityScale = perfMonitor.qualityScale;
        this.pinchScale = touchGestures.pinchScale;
        this.touchRotation = touchGestures.rotation;

        // Touch gesture reactions
        if (touchGestures.swipeDirection) {
            this.cycleArchitecture(touchGestures.swipeDirection === 'right' ? 1 : -1);
            touchGestures.swipeDirection = null;
        }
        if (touchGestures.doubleTap) {
            this.createShockwave(mouse.x, mouse.y);
        }
        if (touchGestures.longPress) {
            this.isGravityWell = true;
        } else if (!this.isGravityWell) {
            // Don't override mouse-based gravity well
        }

        // Register multi-tab sync effect handler (once)
        if (!this._tabSyncRegistered && tabSync.tabCount > 0) {
            this._tabSyncRegistered = true;
            tabSync.onEffect((name, data) => {
                if (name === 'shockwave') {
                    this.createShockwave(data.x * this.width, data.y * this.height, true);
                }
                if (name === 'hue-sync') {
                    this.hue = data.hue;
                    this.updateThemeColors();
                }
                if (name === 'particle-migrate') {
                    for (let i = 0; i < 3; i++) {
                        this.createShockwave(data.x * this.width, data.y * this.height, true);
                    }
                }
            });
        }

        // Leader broadcasts hue to follower tabs every 120 ticks
        if (tabSync.tabCount > 1 && tabSync.isLeader && this.tick % 120 === 0) {
            tabSync.sendEffect('hue-sync', { hue: this.hue });
        }

        if (!this.isDark && this.tick % 30 === 0) this.updateThemeColors();

        this.ctx.save();

        // Warp Distortion Effect (Radial Zoom)
        if (this.speedMultiplier > 2) {
            const zoom = 1 + (this.speedMultiplier - 1) * 0.002;
            this.ctx.translate(this.width / 2, this.height / 2);
            this.ctx.scale(zoom, zoom);
            this.ctx.translate(-this.width / 2, -this.height / 2);
        }

        // Universal audio-reactive modulation — every architecture benefits
        if (micReactive.active) {
            // Bass pumps the scale
            const bassScale = 1 + micReactive.bass * 0.08;
            this.ctx.translate(this.width / 2, this.height / 2);
            this.ctx.scale(bassScale, bassScale);
            this.ctx.translate(-this.width / 2, -this.height / 2);

            // Treble shifts hue (exposed as system.audioHueShift)
            this.audioHueShift = micReactive.treble * 30;

            // Beat triggers auto-shockwave at random position
            if (micReactive.beat && this.tick % 8 === 0) {
                this.createShockwave(
                    this.width * 0.2 + this.rng() * this.width * 0.6,
                    this.height * 0.2 + this.rng() * this.height * 0.6
                );
            }

            // Volume modulates speed — use targetSpeed so lerp in animate() naturally decays
            this.targetSpeed = Math.max(this.targetSpeed, 1 + micReactive.volume * 8);
        } else {
            this.audioHueShift = 0;
        }

        // Draw cached gradient background
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);

        this.architecture.update(this);
        this.architecture.draw(this);

        // Architecture blending: draw secondary architecture on offscreen canvas and composite
        if (this._blendMode === 'active' && this._blendArchitecture) {
            const bc = this._blendCtx;
            bc.clearRect(0, 0, this.width, this.height);
            // Temporarily swap ctx so architecture draws to blend canvas
            const realCtx = this.ctx;
            this.ctx = bc;
            this._blendArchitecture.update(this);
            this._blendArchitecture.draw(this);
            this.ctx = realCtx;
            // Composite blend canvas onto main
            realCtx.save();
            realCtx.globalAlpha = this._blendAlpha;
            realCtx.globalCompositeOperation = 'lighter';
            realCtx.drawImage(this._blendCanvas, 0, 0);
            realCtx.restore();
        }

        // Transition effect: overlay snapshot of previous frame
        if (this._transitionActive && this._transitionAlpha < 1) {
            this.ctx.save();
            const t = this._transitionAlpha; // 0→1 progress
            const tt = this._transitionType;
            if (tt === 'wipe') {
                // Horizontal wipe from left to right
                const clipX = t * this.width;
                this.ctx.beginPath();
                this.ctx.rect(clipX, 0, this.width - clipX, this.height);
                this.ctx.clip();
                this.ctx.drawImage(this._transitionCanvas, 0, 0);
            } else if (tt === 'zoom') {
                // Old frame shrinks into center
                const scale = 1 - t;
                const ox = this.width * (1 - scale) / 2;
                const oy = this.height * (1 - scale) / 2;
                this.ctx.globalAlpha = 1 - t;
                this.ctx.drawImage(this._transitionCanvas, ox, oy, this.width * scale, this.height * scale);
            } else if (tt === 'spiral') {
                // Radial reveal: old frame visible outside an expanding circle
                const maxR = Math.sqrt(this.width * this.width + this.height * this.height) / 2;
                const r = t * maxR;
                this.ctx.beginPath();
                this.ctx.rect(0, 0, this.width, this.height);
                this.ctx.arc(this.width / 2, this.height / 2, r, 0, Math.PI * 2, true);
                this.ctx.clip('evenodd');
                this.ctx.drawImage(this._transitionCanvas, 0, 0);
            } else {
                // Default crossfade
                this.ctx.globalAlpha = 1 - t;
                this.ctx.drawImage(this._transitionCanvas, 0, 0);
            }
            this.ctx.restore();
        }

        this.drawInteractiveEffects();
        interactiveEffects.update(this);
        interactiveEffects.draw(this.ctx, this);
        this.applyBGMutators();
        postProcessing.apply(this.ctx, this);

        this.ctx.restore();

        requestAnimationFrame(this.loop);
    }

    applyBGMutators() {
        const ctx = this.ctx;
        if (this.bgMutators.includes('Vignette')) {
            // Cache vignette gradient (only recreate on resize)
            if (!this.cachedVignetteGradient || this.cachedVignetteWidth !== this.width) {
                this.cachedVignetteGradient = ctx.createRadialGradient(this.width/2, this.height/2, this.width/4, this.width/2, this.height/2, this.width*0.7);
                this.cachedVignetteGradient.addColorStop(0, 'transparent');
                this.cachedVignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
                this.cachedVignetteWidth = this.width;
            }
            ctx.fillStyle = this.cachedVignetteGradient;
            ctx.fillRect(0, 0, this.width, this.height);
        }
        if (this.bgMutators.includes('Noise')) {
            // Batched noise rendering: draw small random rectangles in a single path
            ctx.save();
            ctx.globalAlpha = 0.03;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            for(let i=0; i<10; i++) {
                const x = this.rng() * this.width;
                const y = this.rng() * this.height;
                ctx.rect(x, y, 1, 1);
            }
            ctx.fill();
            ctx.restore();
        }
        if (this.bgMutators.includes('Scanlines')) {
            // Cache the scanlines Path2D for performance
            if (!this.cachedScanlinesPath || this.cachedScanlinesHeight !== this.height) {
                this.cachedScanlinesPath = new Path2D();
                for(let y=0; y<this.height; y+=4) {
                    this.cachedScanlinesPath.moveTo(0, y);
                    this.cachedScanlinesPath.lineTo(this.width, y);
                }
                this.cachedScanlinesHeight = this.height;
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.stroke(this.cachedScanlinesPath);
        }
        if (this.bgMutators.includes('ChromaticShift')) {
            // Subtle color fringing at edges - draw thin colored strips
            const shift = Math.sin(this.tick * 0.01) * 2 + 2;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.015;
            // Red channel shift
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(shift, 0, this.width, this.height);
            // Blue channel shift (opposite direction)
            ctx.fillStyle = '#0000ff';
            ctx.fillRect(-shift, 0, this.width, this.height);
            ctx.restore();
        }
        if (this.bgMutators.includes('FilmGrain')) {
            // Subtle animated film grain overlay using sparse random dots
            ctx.save();
            ctx.globalAlpha = 0.04;
            const grainCount = 30;
            for (let i = 0; i < grainCount; i++) {
                const x = this.rng() * this.width;
                const y = this.rng() * this.height;
                const bright = this.rng() > 0.5;
                ctx.fillStyle = bright ? '#fff' : '#000';
                ctx.fillRect(x, y, 2, 2);
            }
            ctx.restore();
        }
    }

    drawInteractiveEffects() {
        const ctx = this.ctx;

        // Warp Speed Energy Sparks
        if (this.speedMultiplier > 5) {
            ctx.globalCompositeOperation = 'lighter';
            for(let i=0; i<3; i++) {
                const angle = this.rng() * Math.PI * 2;
                const dist = this.rng() * 100;
                let spark = this.sparkPool.length > 0 ? this.sparkPool.pop() : {};
                spark.x = this.width/2 + Math.cos(angle) * dist;
                spark.y = this.height/2 + Math.sin(angle) * dist;
                spark.vx = Math.cos(angle) * 30; spark.vy = Math.sin(angle) * 30;
                spark.life = 20; spark.maxLife = 20; spark.size = 2; spark.color = '200, 230, 255';
                this.sparks.push(spark);
            }
            ctx.globalCompositeOperation = 'source-over';
        }

        // Trail
        const speedX = (mouse.x - (this.lastMouseX || mouse.x));
        const speedY = (mouse.y - (this.lastMouseY || mouse.y));
        const speed = Math.sqrt(speedX*speedX + speedY*speedY);
        this.lastMouseX = mouse.x; this.lastMouseY = mouse.y;
        const spawnCount = Math.min(5, Math.ceil(speed * 0.5));
        for(let i=0; i<spawnCount; i++) {
            let p = this.trailPool.length > 0 ? this.trailPool.pop() : {};
            p.x = mouse.x + (this.rng() - 0.5) * 10; p.y = mouse.y + (this.rng() - 0.5) * 10;
            p.vx = (this.rng() - 0.5) * 1; p.vy = (this.rng() - 0.5) * 1;
            p.life = 1.0; p.decay = 0.02 + this.rng() * 0.03; p.size = 2 + this.rng() * 3;
            p.hue = (this.tick * 2 + this.rng() * 30) % 360;
            this.trail.push(p);
        }

        ctx.globalCompositeOperation = 'lighter';
        for(let i=this.trail.length - 1; i>=0; i--) {
            const p = this.trail[i];
            p.x += p.vx; p.y += p.vy; p.life -= p.decay;
            if (this.isGravityWell) {
                 const dx = p.x - mouse.x; const dy = p.y - mouse.y; const dist = Math.sqrt(dx*dx + dy*dy);
                 if (dist > 50 && dist < 300) { p.x -= (dx/dist) * 2; p.y -= (dy/dist) * 2; }
            }
            if (p.life <= 0) {
                this.trailPool.push(p);
                this.trail[i] = this.trail[this.trail.length - 1];
                this.trail.pop();
                continue;
            }
            ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.life})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
        }

        // Gravity Well Visual (Enhanced)
        if (this.isGravityWell) {
             const pulse = Math.sin(this.tick * 0.2) * 5;

             // Gravity Distortion (Visual Pull)
             ctx.save();
             ctx.globalCompositeOperation = 'soft-light';
             const warpGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 400);
             warpGrad.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
             warpGrad.addColorStop(1, 'transparent');
             ctx.fillStyle = warpGrad;
             ctx.beginPath();
             ctx.arc(mouse.x, mouse.y, 400, 0, Math.PI * 2);
             ctx.fill();
             ctx.restore();

             ctx.fillStyle = 'rgba(0, 0, 0, 1)';
             ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 40 + pulse, 0, Math.PI * 2); ctx.fill();

             const g = ctx.createRadialGradient(mouse.x, mouse.y, 40 + pulse, mouse.x, mouse.y, 150);
             g.addColorStop(0, 'rgba(0, 0, 0, 1)');
             g.addColorStop(0.3, 'rgba(100, 50, 255, 0.4)');
             g.addColorStop(0.6, 'rgba(50, 0, 150, 0.2)');
             g.addColorStop(1, 'transparent');
             ctx.fillStyle = g;
             ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 150, 0, Math.PI * 2); ctx.fill();

             // Swirling Accretion disk
             for(let i=0; i<2; i++) {
                 const angle = (this.tick * 0.1 + i * Math.PI) % (Math.PI * 2);
                 const x = mouse.x + Math.cos(angle) * 60;
                 const y = mouse.y + Math.sin(angle) * 20; // Elliptical
                 ctx.fillStyle = 'rgba(200, 200, 255, 0.5)';
                 ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
             }
        }

        this.drawSparks();

        // Shockwaves
        ctx.lineWidth = 2;
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.speed; sw.alpha = 1 - (sw.radius / sw.maxRadius);
            if (sw.alpha <= 0) {
                this.shockwaves[i] = this.shockwaves[this.shockwaves.length - 1];
                this.shockwaves.pop();
                continue;
            }
            ctx.beginPath(); ctx.strokeStyle = `rgba(255, 255, 255, ${sw.alpha * 0.3})`;
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2); ctx.stroke();
        }

        // Shooting Stars (seed-dependent frequency and color) — capped for performance
        if (this.shootingStars.length < 20 && this.rng() < 0.005) {
            const hue = (this.hue + this.rng() * 60) % 360;
            const isBright = this.rng() > 0.7;
            this.shootingStars.push({
                x: this.rng() * this.width, y: this.rng() * this.height,
                vx: (this.rng() - 0.5) * 20 + 10, vy: (this.rng() - 0.5) * 20 + 10,
                life: 30 + Math.floor(this.rng() * 20), maxLife: 50,
                hue, isBright,
                width: 1 + this.rng() * 2
            });
        }
        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const s = this.shootingStars[i];
            s.x += s.vx; s.y += s.vy; s.life--;
            if (s.life <= 0) {
                // Broadcast edge exit to other tabs so they can spawn arrival effects
                if (tabSync.tabCount > 1 && (s.x < 0 || s.x > this.width || s.y < 0 || s.y > this.height)) {
                    tabSync.sendEffect('particle-migrate', {
                        x: Math.max(0, Math.min(1, s.x / this.width)),
                        y: Math.max(0, Math.min(1, s.y / this.height))
                    });
                }
                this.shootingStars[i] = this.shootingStars[this.shootingStars.length - 1];
                this.shootingStars.pop();
                continue;
            }
            const opacity = s.life / s.maxLife;
            if (s.isBright) {
                ctx.strokeStyle = `hsla(${s.hue}, 80%, 80%, ${opacity})`;
            } else {
                ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            }
            ctx.lineWidth = s.width || 2;
            ctx.beginPath(); ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x - s.vx * 2, s.y - s.vy * 2); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
    }
}

export const background = new BackgroundSystem();
