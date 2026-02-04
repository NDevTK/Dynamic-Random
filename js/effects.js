/**
 * @file effects.js
 * @description This file defines the procedural generation components for universes,
 * including blueprints, mutators, and anomalies.
 */

import { postProcess } from './post_processing.js';

/**
 * @typedef {object} UniverseBlueprint
 * @property {string[]} left - The available left-click powers.
 * @property {string[]} right - The available right-click powers.
 * @property {string[]} events - The available ambient events.
 * @property {string[]} cataclysms - The available cataclysms.
 * @property {object} aesthetic - The aesthetic properties of the universe.
 * @property {boolean} aesthetic.glow - Whether particles have a glow effect.
 * @property {boolean} aesthetic.trails - Whether particles have trails.
 * @property {string[]} aesthetic.shape - The possible shapes of particles.
 * @property {string[]} [aesthetic.chars] - The possible characters for particles (if shape is 'character').
 * @property {number} [aesthetic.sides] - The number of sides for polygon particles.
 * @property {number} [aesthetic.opacity] - The opacity of particles.
 * @property {boolean} [aesthetic.monochrome] - Whether the universe is monochrome.
 * @property {object} aesthetic.physics - The physics properties of the universe.
 * @property {boolean} aesthetic.physics.attract - Whether particles are attracted to the center.
 * @property {boolean} aesthetic.physics.straight - Whether particles move in straight lines.
 * @property {boolean} aesthetic.physics.bounce - Whether particles bounce off the walls.
 * @property {number} aesthetic.physics.friction - The friction applied to particles.
 */

/**
 * A collection of universe blueprints, each defining a unique theme for a universe.
 * @type {Object.<string, UniverseBlueprint>}
 */
export const universeBlueprints = {
    // A classic space simulation with gravitational pull and explosive events.
    Classical: { left:['comet'], right:['supernova','gravityWell'], events:['binaryStars','meteorShower'], cataclysms:['Supernova'], aesthetic:{glow:true, trails:false, shape:['circle','star'], physics:{attract:true, straight:false, bounce:false, friction:0.98}} },
    // A fluid, biological environment with interactive, symbiotic particles.
    Organic: { left:['symbiote','forceField'], right:['sculptor','setOrbit'], events:['pulsingCore', 'sporeRelease'], cataclysms:['Phase Shift'], aesthetic:{glow:false, trails:true, shape:['circle'], physics:{attract:true, straight:false, bounce:false, friction:0.98}} },
    Digital: { left:['chainLightning','shaper','scribe'], right:['glitch','toggleLinks'], events:['cosmicMessage'], cataclysms:['Glitch Storm'], aesthetic:{glow:true, trails:false, shape:['character'], chars:['0','1','<','>','/','?'], physics:{attract:false, straight:true, bounce:false, friction:0.98}} },
    Crystalline: { left: ['shatter', 'refractor'], right: ['crystalize', 'glaze'], events: ['crystalGrowth'], cataclysms: ['Resonance Cascade'], aesthetic:{glow:true, trails:false, shape:['triangle', 'edge'], physics:{attract:false, straight:true, bounce:true, friction:1}} },
    BioMechanical: { left: ['infect', 'tendril'], right: ['harvest', 'toggleLinks'], events: ['neuronPulse', 'sporeRelease'], cataclysms: ['Overgrowth'], aesthetic:{glow:true, trails:true, shape:['polygon'], physics:{attract:true, straight:false, bounce:true, friction:0.96}} },
    ChronoVerse: { left: ['accelerate'], right: ['stasisField'], events: ['temporalEchoes'], cataclysms: ['Time Collapse'], aesthetic:{glow:true, trails:true, shape:['circle'], physics:{attract:false, straight:false, bounce:false, friction:0.97}} },
    VoidTouched: { left: ['voidRift','void'], right: ['unravel'], events: ['flickeringReality'], cataclysms: ['Total Annihilation'], aesthetic:{glow:true, trails:false, shape:['circle', 'edge'], monochrome:true, physics:{attract:true, straight:true, bounce:false, friction:0.98}} },
    PhantomEcho: { left: ['echoPulse'], right: ['phaseZone'], events: ['dejaVu'], cataclysms: ['Causality Collapse'], aesthetic:{glow:true, trails:false, shape:['circle'], physics:{attract:false, straight:false, bounce:false, friction:0.97}} },
    Aetherial: { left: ['whisper', 'fade'], right: ['paint', 'wormhole'], events: ['aurora'], cataclysms: ['Great Fading'], aesthetic:{glow:true, trails:true, shape:['circle'], opacity: 0.3, physics:{attract:false, straight:false, bounce:false, friction:0.99}}},
    QuantumFoam: { left: ['observe', 'quantumTunnel'], right: ['entangle', 'decohere'], events: ['probabilityFlux'], cataclysms: ['False Vacuum Decay'], aesthetic:{glow:true, trails:false, shape:['edge', 'triangle'], physics:{attract:false, straight:true, bounce:true, friction:0.99}} },
    SonicScapes: { left: ['resonate', 'dampen'], right: ['shockwave', 'silence'], events: ['ambientHum'], cataclysms: ['The Great Silence'], aesthetic:{glow:true, trails:true, shape:['edge'], opacity: 0.6, physics:{attract:false, straight:false, bounce:true, friction:0.97}} },
    LivingInk: { left: ['smudge', 'draw'], right: ['splatter', 'blot'], events: ['inkSeep'], cataclysms: ['The Bleed'], aesthetic:{glow:false, trails:true, shape:['circle'], physics:{attract:false, straight:false, bounce:false, friction:0.92}} },
    Eldritch: { left: ['consume', 'maddeningWhisper'], right: ['gaze', 'realityTear'], events: ['nonEuclideanShift'], cataclysms: ['UnseenGibbering'], aesthetic:{glow:true, trails:true, shape:['polygon'], sides: 7, monochrome: true, physics:{attract:true, straight:false, bounce:false, friction:0.95}} },
    Painterly: { left: ['smear', 'dab'], right: ['paletteKnife', 'wash'], events: ['colorBleed'], cataclysms: ['CanvasWipe'], aesthetic:{glow:false, trails:true, shape:['circle'], physics:{attract:false, straight:false, bounce:false, friction:0.9}} },
    StarForged: { left:['comet'], right:['supernova'], events:['binaryStars'], cataclysms:['Supernova'], aesthetic:{glow:true, trails:true, shape:['star'], physics:{attract:true, straight:false, bounce:false, friction:0.96}} },
    ArcaneCodex: { left:['runeScribe'], right:['polymorph'], events:['nonEuclideanShift'], cataclysms:['ForbiddenRitual'], aesthetic:{glow:true, trails:false, shape:['polygon'], sides: 5, physics:{attract:false, straight:false, bounce:true, friction:0.97}} },
    MoltenHeart: { left:['lavaJet'], right:['cool'], events:['meteorShower'], cataclysms:['CoreEruption'], aesthetic:{glow:false, trails:true, shape:['circle'], physics:{attract:false, straight:false, bounce:false, friction:0.85}} },
    GlacialDrift: { left:['glacier'], right:['flashFreeze'], events:['crystalGrowth'], cataclysms:['DeepFreeze'], aesthetic:{glow:true, trails:false, shape:['edge', 'triangle'], physics:{attract:false, straight:true, bounce:true, friction:0.99}} },
    SentientSwarm: { left:['swarmFollow'], right:['disperse'], events:['neuronPulse'], cataclysms:['HiveCollapse'], aesthetic:{glow:true, trails:false, shape:['circle'], physics:{attract:true, straight:false, bounce:false, friction:0.95}} },
    StellarNursery: { left:['gatherDust', 'ignite'], right:['supernova', 'whiteHoleSpawn'], events:['binaryStars', 'meteorShower'], cataclysms:['ProtoStarCollapse', 'Supernova'], aesthetic:{glow:true, trails:true, shape:['star', 'circle'], physics:{attract:true, straight:false, bounce:false, friction:0.98}} },
    AbyssalZone: { left:['lure', 'crush'], right:['pressureWave', 'silence'], events:['bioluminescence'], cataclysms:['BenthicStorm', 'TheGreatSilence'], aesthetic:{glow:true, trails:false, shape:['polygon'], sides:8, monochrome:true, physics:{attract:true, straight:false, bounce:false, friction:0.8}} },
    TechnoUtopia: { left:['align', 'regrid'], right:['glitch', 'toggleLinks'], events:['cosmicMessage'], cataclysms:['SystemCrash', 'GlitchStorm'], aesthetic:{glow:true, trails:false, shape:['edge', 'character'], chars:['|','_','[',']','{','}'], physics:{attract:false, straight:true, bounce:true, friction:1}} },
    FungalForest: { left:['sporeBurst', 'tangle'], right:['overgrow', 'decompose'], events:['sporeRelease', 'neuronPulse'], cataclysms:['Decomposition', 'Overgrowth'], aesthetic:{glow:false, trails:true, shape:['circle', 'polygon'], sides:3, physics:{attract:true, straight:false, bounce:false, friction:0.92}} },
    GlassySea: { left:['ripple', 'freeze'], right:['shatter', 'focus'], events:['aurora'], cataclysms:['Shattering', 'DeepFreeze'], aesthetic:{glow:true, trails:false, shape:['edge', 'triangle'], opacity:0.4, physics:{attract:false, straight:false, bounce:true, friction:0.99}} },
    Papercraft: { left:['fold', 'crease'], right:['paperTear', 'smooth'], events:['ambientHum'], cataclysms:['PaperTearCataclysm', 'CanvasWipe'], aesthetic:{glow:false, trails:false, shape:['edge'], physics:{attract:false, straight:true, bounce:false, friction:0.94}} },
    ChromaticAberration: { left:['prism', 'focus'], right:['aberrate', 'wash'], events:['colorBleed'], cataclysms:['ColorBurn', 'PhaseShift'], aesthetic:{glow:true, trails:true, shape:['circle'], physics:{attract:false, straight:false, bounce:false, friction:0.97}} },
    // New Blueprints
    SilkWeaver: { left:['weaveThread'], right:['pullThreads'], events:['neuronPulse'], cataclysms:['WebCollapse'], aesthetic:{glow:true, trails:false, shape:['circle'], physics:{attract:false, straight:false, bounce:true, friction:0.99}} },
    VolcanicForge: { left:['stokeFire'], right:['quench', 'lavaJet'], events:['meteorShower'], cataclysms:['GrandCooling', 'CoreEruption'], aesthetic:{glow:false, trails:true, shape:['star'], physics:{attract:true, straight:false, bounce:false, friction:0.9}} },
    LivingConstellation: { left:['createStar'], right:['connectConstellation'], events:['binaryStars'], cataclysms:['BigRip'], aesthetic:{glow:true, trails:false, shape:['star'], physics:{attract:false, straight:false, bounce:true, friction:0.98}} },
    GooeyMess: { left:['stirGoo'], right:['dissolveGoo'], events:['sporeRelease'], cataclysms:['Homogenization'], aesthetic:{glow:false, trails:false, shape:['circle'], physics:{attract:true, straight:false, bounce:false, friction:0.8}} },
    HauntedRealm: { left:['exorcise'], right:['materialize', 'phaseZone'], events:['flickeringReality', 'dejaVu'], cataclysms:['Banishing'], aesthetic:{glow:true, trails:true, shape:['circle'], opacity: 0.2, physics:{attract:false, straight:true, bounce:false, friction:0.99}} },
    CoralReef: { left:['growCoral'], right:['schooling'], events:['bioluminescence'], cataclysms:['TidalWave'], aesthetic:{glow:true, trails:false, shape:['polygon'], sides: 6, physics:{attract:true, straight:false, bounce:true, friction:0.92}} },
    NeonCyber: { left:['shaper'], right:['glitch'], events:['cosmicMessage'], cataclysms:['SystemCrash'], aesthetic:{glow:true, trails:true, shape:['edge'], physics:{attract:false, straight:true, bounce:true, friction:1}} },
    AbyssalHorror: { left:['tendril'], right:['consume'], events:['flickeringReality'], cataclysms:['TotalAnnihilation'], aesthetic:{glow:false, trails:true, shape:['circle'], monochrome:true, physics:{attract:true, straight:false, bounce:false, friction:0.94}} },
    CelestialForge: { left:['ignite'], right:['supernova'], events:['meteorShower'], cataclysms:['CoreEruption'], aesthetic:{glow:true, trails:true, shape:['star'], physics:{attract:true, straight:false, bounce:false, friction:0.96}} }
};

/**
 * @callback Mutator
 * @param {object} pJS - The particles.js instance.
 * @param {function(): number} seededRandom - The seeded random number generator.
 * @param {object} activeEffects - The active effects object.
 * @param {object} physics - The physics object.
 */

/**
 * A collection of mutators that can be applied to a universe to alter its properties.
 * @type {Object.<string, Mutator>}
 */
export const mutators = {
    // Reduces the friction, making particles drift more.
    'Low-Gravity': (pJS, seededRandom, activeEffects, physics) => { physics.friction *= 0.9; },
    // Greatly increases the speed of all particles.
    'Hyperspeed': (pJS) => { pJS.particles.move.speed *= 2.5; },
    'Viscous': (pJS, seededRandom, activeEffects, physics) => { physics.friction = 0.85; },
    'Inertialess': (pJS, seededRandom, activeEffects, physics) => { physics.friction = 0.6; },
    'Magnetic': (pJS) => { pJS.particles.move.attract.enable = true; pJS.particles.move.attract.rotateX = 1200; pJS.particles.move.attract.rotateY = 1200; },
    'Repulsive Field': () => { /* Handled in update loop */ },
    'Erratic': () => { /* Handled in update loop */ },
    'Torus Field': (pJS) => { pJS.particles.move.out_mode = 'out'; /* Custom handling */ },
    'Gravity Pockets': (pJS, seededRandom, { gravityPockets }) => { for(let i=0; i<3; i++) { gravityPockets.push({ x: pJS.canvas.w * seededRandom(), y: pJS.canvas.h * seededRandom(), strength: (seededRandom() - 0.5) * 0.4, radiusSq: Math.pow(100 + seededRandom() * 100, 2) }); } },
    'Time Dilation Fields': (pJS, seededRandom, { timeDilationZones }) => { for(let i=0; i<2; i++) { timeDilationZones.push({ x: pJS.canvas.w * seededRandom(), y: pJS.canvas.h * seededRandom(), timeFactor: 0.5 + seededRandom() * 1.5, radiusSq: Math.pow(120 + seededRandom() * 100, 2) }); } },
    'Clustering': () => { /* Handled in update loop */ },
    'Phase Shift': () => { /* Handled in update loop */ },
    'Gravity Waves': (pJS, seededRandom, { gravityWaves }) => { gravityWaves.push({ angle: seededRandom() * 2 * Math.PI, strength: 0.1 + seededRandom() * 0.2, frequency: 0.01 + seededRandom() * 0.02 }); },
    'Pair Bonding': () => { /* Handled in update loop */ },
    'Fragmenting': () => { /* Handled in update loop */ },
    'Photon Sails': (pJS, seededRandom, { photonSails }) => { photonSails.push({ angle: seededRandom() * Math.PI * 2, strength: 0.01 + seededRandom() * 0.03 }); },
    'Chaotic Orbits': (pJS) => { pJS.particles.move.attract.enable = true; /* Custom logic */ },
    'Inertial Dampening': (pJS, r, ae, physics) => { physics.friction = Math.min(1, physics.friction * 1.2); },
    'Tidal Forces': (pJS, seededRandom, { tidalForces }) => { tidalForces.push({ y: seededRandom() * pJS.canvas.h, strength: 0.05 + seededRandom() * 0.1 }); },
    'Self-Propelled': () => { /* Handled in update loop */ },
    'Phase Scattering': () => { /* Handled in update loop */ },
    'Reflective Edges': (pJS) => { pJS.particles.move.out_mode = 'bounce'; },
    'ParticleChains': () => { /* Handled in update loop */ },

    // ### VISUAL & AESTHETIC MUTATORS ###
    'Unstable Particles': () => { /* Handled in update loop */ },
    'Dwarf & Giant': () => { /* Handled in tagParticles */ },
    'Rainbow': () => { /* Handled in update loop */ },
    'Pulsing Particles': () => { /* Handled in update loop */ },
    'Flickering': () => { /* Handled in update loop */ },
    'Particle Decay': () => { /* Handled in update loop */ },
    'Elastic Collisions': () => { /* Handled in update loop */ },
    'Wandering Singularity': (pJS, seededRandom, { blackHoles }) => {
        const singularity = { x: pJS.canvas.w * seededRandom(), y: pJS.canvas.h * seededRandom(), mass: 50 + seededRandom()*100, eventHorizon: 5 + seededRandom()*5, isWandering: true };
        blackHoles.push(singularity);
    },
    'Noisy': () => { /* Handled in update loop */ },
    'Supermassive': (pJS) => { pJS.particles.size.value *= 2; pJS.particles.move.speed *= 0.7; },
    'Synchronized': () => { /* Handled in update loop */ },
    'Event Horizon': () => { /* Handled in update loop */ },
    'Noctilucent': (pJS) => { pJS.particles.move.trail.enable = true; pJS.particles.move.trail.length = 40; },
    'BrownianMotion': () => { /* Handled in update loop */ },
    'SupernovaRemains': () => { /* Handled in tagParticles */ },
    'Choral': () => { /* Handled in update loop */ },
    'Carnival': () => { /* Handled in update loop */ },
    'Scanlines': () => { postProcess.toggleScanlines(true); },
    'High Contrast': () => { postProcess.setFilter('contrast', 1.8); },
    'Inverted': () => { postProcess.setFilter('invert', 1); },
    'Bloom': () => { postProcess.setFilter('blur', 2); },
    'Overexposed': () => { postProcess.setFilter('brightness', 1.5); postProcess.setFilter('saturate', 2); },
};

/**
 * @callback Anomaly
 * @param {object} pJS - The particles.js instance.
 * @param {function(): number} seededRandom - The seeded random number generator.
 * @param {object} activeEffects - The active effects object.
 */

/**
 * A collection of anomalies that can be spawned in a universe to add unique interactive elements.
 * @type {Object.<string, Anomaly>}
 */
export const anomalies = {
    // A rotating object that emits powerful beams of energy.
    'Pulsar': (pJS, r, { pulsars }) => { pulsars.push({ x: pJS.canvas.w * (0.3 + r()*0.4), y: pJS.canvas.h * (0.3 + r()*0.4), angle: 0, period: 100 + Math.floor(r()*200), strength: 20 + r()*30 }); },
    // A cloud of gas and dust that slows down particles and colors them.
    'Nebula': (pJS, r, { nebulas }) => { const hue = r()*360; nebulas.push({ x: pJS.canvas.w * (0.3 + r()*0.4), y: pJS.canvas.h * (0.3 + r()*0.4), radius: 200 + r()*250, color: `hsla(${hue}, 70%, 50%, 0.15)`, baseColor: {h: hue, s: 70, l: 50} }); },
    'Black Hole': (pJS, r, { blackHoles }) => { blackHoles.push({ x: pJS.canvas.w * (0.2 + r()*0.6), y: pJS.canvas.h * (0.2 + r()*0.6), mass: 100 + r()*250, eventHorizon: 10 + r()*20 }); },
    'White Hole': (pJS, r, { whiteHoles }) => { whiteHoles.push({ x: pJS.canvas.w * (0.2 + r()*0.6), y: pJS.canvas.h * (0.2 + r()*0.6), strength: 4 + r()*8, spawnRate: 0.05 + r()*0.15, tick: 0 }); },
    'Cosmic String': (pJS, r, { cosmicStrings }) => { cosmicStrings.push({ x1: pJS.canvas.w * r(), y1: pJS.canvas.h * r(), x2: pJS.canvas.w * r(), y2: pJS.canvas.h * r(), strength: 3 + r()*7 }); },
    'Cosmic Web': (pJS, r, { cosmicWebs }) => {
        const numNodes = 5 + Math.floor(r() * 5);
        const nodes = [];
        for(let i=0; i<numNodes; i++) {
            nodes.push({ x: pJS.canvas.w * r(), y: pJS.canvas.h * r() });
        }
        cosmicWebs.push({ nodes: nodes, strength: 0.1 + r() * 0.2 });
    },
    'Quasar': (pJS, r, { quasars }) => {
        quasars.push({
            x: pJS.canvas.w * (0.1 + r() * 0.8),
            y: pJS.canvas.h * (0.1 + r() * 0.8),
            angle: r() * 2 * Math.PI,
            strength: 15 + r() * 15,
            period: 150 + r() * 150, // How often it fires
            duration: 20 + r() * 20, // How long the jet lasts
            tick: 0,
            isFiring: false
        });
    },
    'Cosmic Rift': (pJS, r, { cosmicRifts }) => {
        cosmicRifts.push({
            x1: pJS.canvas.w * (0.1 + r()*0.2), y1: pJS.canvas.h * (0.1 + r()*0.8),
            x2: pJS.canvas.w * (0.7 + r()*0.2), y2: pJS.canvas.h * (0.1 + r()*0.8),
            width: 20
        });
    },
    'Magnetic Storm': (pJS, r, { magneticStorms }) => {
        magneticStorms.push({ lastFlip: 0, period: 100 + r()*200, attract: true });
    },
    'Ion Cloud': (pJS, r, { ionClouds }) => {
        ionClouds.push({ x: pJS.canvas.w * r(), y: pJS.canvas.h * r(), radius: 150 + r()*100 });
    },
    'Supergiant Star': (pJS, r, { supergiantStars }) => {
        supergiantStars.push({ x: pJS.canvas.w * r(), y: pJS.canvas.h * r(), radius: 50 + r()*30, mass: 200 + r()*200, lastSpawn: 0, period: 50 + r()*50 });
    },
    'Cosmic Geyser': (pJS, r, { cosmicGeysers }) => {
        cosmicGeysers.push({ x: pJS.canvas.w * r(), y: pJS.canvas.h, strength: 5 + r()*10, period: 200 + r()*200, tick: 0, width: 50 + r()*50 });
    },
    'Crystalline Field': (pJS, r, { crystallineFields }) => {
        crystallineFields.push({ x: pJS.canvas.w * r(), y: pJS.canvas.h * r(), radius: 150 + r()*150, strength: 0.1 + r()*0.2 });
    },
    'Temporal Rift': (pJS, r, { temporalRifts }) => {
        temporalRifts.push({ x: pJS.canvas.w * r(), y: pJS.canvas.h * r(), radius: 100 + r()*50, life: 600, maxLife: 600 });
    },
    'Negative Space': (pJS, r, { negativeSpaces }) => {
        negativeSpaces.push({ x: pJS.canvas.w * r(), y: pJS.canvas.h * r(), radius: 80 + r()*80 });
    },
    'Stellar Wind': (pJS, r, { stellarWinds }) => {
        stellarWinds.push({ angle: r() * Math.PI*2, strength: 0.05 + r()*0.1 });
    },
    'Microwave Background': (pJS, r, { microwaveBackgrounds }) => {
        microwaveBackgrounds.push({ noise: 0.05 + r()*0.1 });
    },
    'Solar Flare': (pJS, r, { solarFlares }) => {
        solarFlares.push({ angle: r() * Math.PI*2, strength: 10 + r()*10, period: 200 + r()*200, tick: 0 });
    },
    'Particle Accelerator': (pJS, r, { particleAccelerators }) => {
        particleAccelerators.push({ x: pJS.canvas.w * r(), y: pJS.canvas.h * r(), radius: 100 + r()*100, strength: 1.05 + r()*0.1 });
    },
    'Spacetime Foam': (pJS, r, { spacetimeFoam }) => {
        for(let i=0; i<10; i++) {
            spacetimeFoam.push({ x: pJS.canvas.w * r(), y: pJS.canvas.h * r(), radius: 20 + r()*20, life: 100 + r()*200 });
        }
    },
    'Echoing Void': (pJS, r, { echoingVoids }) => {
        echoingVoids.push({ x: pJS.canvas.w * r(), y: pJS.canvas.h * r(), radius: 150 + r()*100, history: [], tick: 0 });
    },
    'Cosmic Nursery': (pJS, r, { cosmicNurseries }) => {
        cosmicNurseries.push({ x: pJS.canvas.w * r(), y: pJS.canvas.h * r(), radius: 100 + r()*100, period: 100 + r()*100, tick: 0 });
    },
    'CosmicRiver': (pJS, r, { cosmicRivers }) => {
        const y1 = pJS.canvas.h * (0.2 + r() * 0.6);
        const y2 = pJS.canvas.h * (0.2 + r() * 0.6);
        cosmicRivers.push({
            x1: 0, y1: y1,
            cx1: pJS.canvas.w * 0.25, cy1: y1 + (r() - 0.5) * 200,
            cx2: pJS.canvas.w * 0.75, cy2: y2 + (r() - 0.5) * 200,
            x2: pJS.canvas.w, y2: y2,
            strength: 0.5 + r() * 1.0,
            width: 30 + r() * 40
        });
    }
};
