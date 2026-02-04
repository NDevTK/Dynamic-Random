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

export function setPhysics(newPhysics) {
    physics = newPhysics;
}

export function setMouse(newMouse) {
    mouse = newMouse;
}

export function setLeftMouseDown(value) {
    isLeftMouseDown = value;
}

export function setRightMouseDown(value) {
    isRightMouseDown = value;
}

export function incrementTick() {
    tick++;
}

export function getTick() {
    return tick;
}

export function setUniverseState(newState) {
    universeState = newState;
}

export function setUniverseProfile(newProfile) {
    universeProfile = newProfile;
}

export function setActiveEffects(newEffects) {
    activeEffects = newEffects;
}

export function setCurrentSeed(newSeed) {
    currentSeed = newSeed;
}

export function setCataclysmInProgress(value) {
    cataclysmInProgress = value;
}

export function setInitialLoad(value) {
    isInitialLoad = value;
}

export function addActiveInterval(interval) {
    activeIntervals.push(interval);
}

export function clearActiveIntervals() {
    activeIntervals.forEach(clearInterval);
    activeIntervals = [];
}

export function setSeedCopyTimeout(timeout) {
    seedCopyTimeout = timeout;
}

export function clearSeedCopyTimeout() {
    clearTimeout(seedCopyTimeout);
}

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