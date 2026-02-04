/**
 * @file state.js
 * @description This file manages the global state for the Celestial Canvas application.
 */

export const ui = {
    body: document.body,
    cursorGlow: document.getElementById('cursor-glow'),
    canvasContainer: document.getElementById('canvas-container')
};

export let physics = { friction: 0.98 };
export let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
export let isLeftMouseDown = false, isRightMouseDown = false;
export let tick = 0;

export let universeState = { energy: 0, state: 'Stable' };
export let universeProfile = {};
export let activeEffects = {};

export let currentSeed = '', cataclysmInProgress = false, isInitialLoad = true;
export let activeIntervals = [], seedCopyTimeout;
export let seededRandom = Math.random;

/**
 * Updates the global physics configuration.
 * @param {Object} newPhysics - The new physics properties.
 */
export function setPhysics(newPhysics) {
    physics = newPhysics;
}

/**
 * Updates the global mouse position.
 * @param {Object} newMouse - The new mouse coordinates {x, y}.
 */
export function setMouse(newMouse) {
    mouse = newMouse;
}

/**
 * Sets the left mouse button pressed state.
 * @param {boolean} value - True if pressed.
 */
export function setLeftMouseDown(value) {
    isLeftMouseDown = value;
}

/**
 * Sets the right mouse button pressed state.
 * @param {boolean} value - True if pressed.
 */
export function setRightMouseDown(value) {
    isRightMouseDown = value;
}

/**
 * Increments the global simulation tick.
 */
export function incrementTick() {
    tick++;
}

/**
 * Returns the current simulation tick.
 * @returns {number} The current tick.
 */
export function getTick() {
    return tick;
}

/**
 * Updates the global universe state object.
 * @param {Object} newState - The new universe state.
 */
export function setUniverseState(newState) {
    universeState = newState;
}

/**
 * Updates the current universe blueprint profile.
 * @param {Object} newProfile - The blueprint profile object.
 */
export function setUniverseProfile(newProfile) {
    universeProfile = newProfile;
}

/**
 * Updates the active visual/interactive effects.
 * @param {Object} newEffects - The active effects registry.
 */
export function setActiveEffects(newEffects) {
    activeEffects = newEffects;
}

/**
 * Updates the current random seed string.
 * @param {string} newSeed - The new seed.
 */
export function setCurrentSeed(newSeed) {
    currentSeed = newSeed;
}

/**
 * Sets whether a cataclysmic event is currently in progress.
 * @param {boolean} value - True if active.
 */
export function setCataclysmInProgress(value) {
    cataclysmInProgress = value;
}

/**
 * Sets whether this is the initial application load.
 * @param {boolean} value - True if initial load.
 */
export function setInitialLoad(value) {
    isInitialLoad = value;
}

/**
 * Sets the seeded random number generator function.
 * @param {Function} fn - The random generator.
 */
export function setSeededRandom(fn) {
    seededRandom = fn;
}

/**
 * Adds an interval ID to the tracking list for cleanup.
 * @param {number} interval - The interval ID.
 */
export function addActiveInterval(interval) {
    activeIntervals.push(interval);
}

/**
 * Clears all active intervals and resets the tracking list.
 */
export function clearActiveIntervals() {
    activeIntervals.forEach(clearInterval);
    activeIntervals = [];
}

/**
 * Sets the timeout for seed copy notification.
 * @param {number} timeout - The timeout ID.
 */
export function setSeedCopyTimeout(timeout) {
    seedCopyTimeout = timeout;
}

/**
 * Clears the active seed copy notification timeout.
 */
export function clearSeedCopyTimeout() {
    clearTimeout(seedCopyTimeout);
}

/**
 * Resets the application state to default values.
 * Used when generating a new universe or resetting the simulation.
 */
export function resetState() {
    clearActiveIntervals();
    clearSeedCopyTimeout();
    activeEffects = {
        gravityWells: [], stasisFields: [], phaseZones: [], echoPulses: [], wormholes: [],
        pulsars: [], nebulas: [], blackHoles: [], whiteHoles: [], cosmicStrings: [], cosmicWebs: [],
        gravityPockets: [], timeDilationZones: [], entangledGroups: [], gravityWaves: [], quasars: [],
        cosmicRifts: [], magneticStorms: [], ionClouds: [], supergiantStars: [],
        photonSails: [], tidalForces: [], cosmicGeysers: [], crystallineFields: [], temporalRifts: [],
        negativeSpaces: [], stellarWinds: [], microwaveBackgrounds: [],
        silkThreads: [], solarFlares: [], particleAccelerators: [], spacetimeFoam: [], echoingVoids: [], cosmicNurseries: [],
        coral: [], coralConnections: [], cosmicRivers: []
    };
    ui.canvasContainer.style.filter='';
    ui.canvasContainer.style.transition = 'filter 1s ease';
    ui.canvasContainer.classList.remove('shake');
    ui.body.classList.remove('cataclysm-bleed');
    tick=0;
    cataclysmInProgress=false;
}
