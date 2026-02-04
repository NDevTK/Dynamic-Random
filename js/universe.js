/**
 * @file universe.js
 * @description This file contains the logic for generating a new universe.
 */

import { universeBlueprints, mutators, anomalies } from './effects.js';
import { setUniverseProfile, setUniverseState, setCurrentSeed, setInitialLoad, setSeededRandom, resetState as resetGlobalState, activeEffects, physics, isInitialLoad } from './state.js';
import { mulberry32, stringToSeed, generateRandomSeed, hslToHex, tagParticles } from './utils.js';
import { setRandomGradient, updateUI } from './ui.js';
import { postProcess } from './post_processing.js';

/**
 * Generates a new universe based on a seed.
 * This function sets up the universe's blueprint, mutators, anomalies, and aesthetics.
 * @param {object} pJS - The particles.js instance.
 * @param {string} seed - The seed string for the universe.
 * @param {boolean} isNewSeed - Whether a new seed should be generated.
 */
export const generateUniverse = (pJS, seed, isNewSeed = false) => {
    resetGlobalState();
    postProcess.reset();
    const newSeed = isNewSeed || !seed ? generateRandomSeed() : seed;
    setCurrentSeed(newSeed);
    const seededRandom = mulberry32(stringToSeed(newSeed));
    setSeededRandom(seededRandom);

    const blueprintNames = Object.keys(universeBlueprints);
    const blueprintName = blueprintNames[Math.floor(seededRandom() * blueprintNames.length)];
    const blueprint = universeBlueprints[blueprintName];

    const profile = {
        blueprintName,
        leftClickPower: blueprint.left[Math.floor(seededRandom() * blueprint.left.length)],
        rightClickPower: blueprint.right[Math.floor(seededRandom() * blueprint.right.length)],
        ambientEvent: blueprint.events[Math.floor(seededRandom() * blueprint.events.length)],
        cataclysm: blueprint.cataclysms[Math.floor(seededRandom() * blueprint.cataclysms.length)],
        mutators: [],
        anomaly: null
    };

    // Apply Aesthetics & Physics from Blueprint
    const baseHue = seededRandom() * 360;
    setRandomGradient(baseHue, blueprint.aesthetic.monochrome, seededRandom, blueprintName === 'VoidTouched' || blueprintName === 'Eldritch');
    pJS.particles.color.value = hslToHex((baseHue + 180) % 360, 80, 70);
    pJS.particles.opacity.value = blueprint.aesthetic.opacity || 0.5;
    pJS.particles.number.value = 150; pJS.particles.number.value_max = 400;
    pJS.particles.move.speed = 1 + seededRandom() * 3;
    pJS.particles.move.trail.enable = !!blueprint.aesthetic.trails;
    pJS.particles.shape.type = blueprint.aesthetic.shape;
    if (blueprintName === 'Digital') pJS.particles.shape.character.value = blueprint.aesthetic.chars;
    if (blueprintName === 'Eldritch' || blueprintName === 'ArcaneCodex') pJS.particles.shape.polygon.nb_sides = blueprint.aesthetic.sides;
    pJS.particles.line_linked.enable = blueprintName === 'BioMechanical' || blueprintName === 'Digital';
    pJS.particles.move.attract.enable = blueprint.aesthetic.physics.attract;
    pJS.particles.move.straight = blueprint.aesthetic.physics.straight;
    pJS.particles.move.out_mode = blueprint.aesthetic.physics.bounce ? 'bounce' : 'out';

    // SPECIAL BLUEPRINT HANDLING
    if (blueprintName === 'NeonCyber') {
        postProcess.toggleScanlines(true);
        postProcess.setFilter('contrast', 1.2);
    } else if (blueprintName === 'AbyssalHorror') {
        postProcess.setFilter('brightness', 0.6);
        postProcess.setFilter('contrast', 1.5);
    } else if (blueprintName === 'CelestialForge') {
        postProcess.setFilter('blur', 1);
    }

    setUniverseProfile(profile);
    setUniverseState({ energy: 0, state: 'Stable', maxEnergy: 4000 + seededRandom() * 2000 });

    // Apply Mutators
    const mutatorKeys = Object.keys(mutators);
    const numMutators = seededRandom() > 0.85 ? 2 : (seededRandom() > 0.4 ? 1 : 0);
    while(profile.mutators.length < numMutators) {
        const mutatorName = mutatorKeys[Math.floor(seededRandom() * mutatorKeys.length)];
        if (!profile.mutators.includes(mutatorName)) {
            profile.mutators.push(mutatorName);
            mutators[mutatorName](pJS, seededRandom, activeEffects, physics);
        }
    }

    // Spawn Anomaly
    if (seededRandom() > 0.6) {
        const anomalyKeys = Object.keys(anomalies);
        const anomalyName = anomalyKeys[Math.floor(seededRandom() * anomalyKeys.length)];
        profile.anomaly = anomalyName;
        anomalies[anomalyName](pJS, seededRandom, activeEffects);
    }

    updateUI();

    pJS.fn.particlesRefresh();
    tagParticles(pJS.particles.array, profile, true, seededRandom);

    if (isInitialLoad) {
        pJS.particles.array.forEach(p => {
            p.x = pJS.canvas.w / 2; p.y = pJS.canvas.h / 2;
            const angle = seededRandom() * 2 * Math.PI; const force = seededRandom() * 20 + 5;
            p.vx = Math.cos(angle) * force; p.vy = Math.sin(angle) * force;
        });
        setInitialLoad(false);
    }
};