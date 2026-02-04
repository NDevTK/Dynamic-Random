/**
 * @file utils.js
 * @description This file contains utility functions for the Celestial Canvas application.
 */

/**
 * Creates a seeded pseudo-random number generator.
 * @param {number} a - The seed.
 * @returns {function(): number} A function that returns a random number between 0 and 1.
 */
export function mulberry32(a) { return function() { var t=a+=0x6D2B79F5; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; } }

/**
 * Converts a string to a 32-bit integer seed.
 * @param {string} str - The string to convert.
 * @returns {number} A 32-bit integer seed.
 */
export function stringToSeed(str) { let h=0; for(let i=0;i<str.length;i++){h=(Math.imul(31,h)+str.charCodeAt(i))|0} return h; }

/**
 * Generates a random, human-readable seed string.
 * @returns {string} A random seed string in the format 'WORD-WORD-NUMBER'.
 */
export function generateRandomSeed() { const w1 = ['COSMIC','ASTRAL','VOID','STAR','CHRONO','PHANTOM','CRYSTAL','DEEPSEA','BIO', 'AETHER', 'SONIC', 'QUANTUM', 'ELDRITCH', 'PAINTERLY', 'ARCANE', 'MOLTEN', 'GLACIAL', 'SWARM', 'FORGED']; const w2 = ['DRIFT','ECHO','FLARE','PULSE','SONG','WARP','VORTEX','SHARD','CURRENT','SPORE', 'VEIL', 'HUM', 'FOAM', 'INK', 'MAW', 'STROKE', 'CODEX', 'HEART', 'HIVE', 'CORE', 'RUNE']; return `${w1[Math.floor(Math.random()*w1.length)]}-${w2[Math.floor(Math.random()*w2.length)]}-${Math.floor(Math.random()*9000)+1000}`; }

/**
 * Converts an HSL color value to a hex string.
 * @param {number} h - The hue value (0-360).
 * @param {number} s - The saturation value (0-100).
 * @param {number} l - The lightness value (0-100).
 * @returns {string} The hex color string.
 */
export function hslToHex(h,s,l){s/=100;l/=100;let c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2,r=0,g=0,b=0;if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}r=Math.round((r+m)*255).toString(16).padStart(2,'0');g=Math.round((g+m)*255).toString(16).padStart(2,'0');b=Math.round((b+m)*255).toString(16).padStart(2,'0');return`#${r}${g}${b}`; }

/**
 * Calculates the X and Y coordinates for a point on a cubic Bezier curve.
 * @param {number} t - The position on the curve (0-1).
 * @param {number} sx - The starting X coordinate.
 * @param {number} sy - The starting Y coordinate.
 * @param {number} cp1x - The first control point's X coordinate.
 * @param {number} cp1y - The first control point's Y coordinate.
 * @param {number} cp2x - The second control point's X coordinate.
 * @param {number} cp2y - The second control point's Y coordinate.
 * @param {number} ex - The ending X coordinate.
 * @param {number} ey - The ending Y coordinate.
 * @returns {{x: number, y: number}} The coordinates of the point on the curve.
 */
export function getBezierXY(t, sx, sy, cp1x, cp1y, cp2x, cp2y, ex, ey) {
    const invT = (1 - t);
    const x = invT * invT * invT * sx + 3 * invT * invT * t * cp1x + 3 * invT * t * t * cp2x + t * t * t * ex;
    const y = invT * invT * invT * sy + 3 * invT * invT * t * cp1y + 3 * invT * t * t * cp2y + t * t * t * ey;
    return { x: x, y: y };
}

/**
 * Adds custom properties to new particles.
 * @param {Array<object>} particles - An array of particles to tag.
 * @param {object} universeProfile - The current universe profile.
 * @param {boolean} isInitialLoad - Whether this is the initial load.
 * @param {function} seededRandom - The seeded random number generator.
 */
export function tagParticles(particles, universeProfile, isInitialLoad, seededRandom = Math.random) {
    if (!particles) return;
    particles.forEach(p => {
        if (p) {
            if(p.radius_initial === undefined || isInitialLoad) p.radius_initial = p.radius;
            if(p.startX === undefined || isInitialLoad) { p.startX = p.x; p.startY = p.y; }
            if(universeProfile.mutators.includes('Dwarf & Giant')) { const newSize = seededRandom() > 0.5 ? p.radius * 2 : p.radius * 0.5; p.radius = p.radius_initial = Math.max(1, newSize); }
            if(universeProfile.mutators.includes('SupernovaRemains') && seededRandom() < 0.1) { p.isHeavy = true; p.radius *= 2; } else { p.isHeavy = false; }
            p.seed = seededRandom() * 1000;
            p.isCrystalized = false;
            p.isInfected = false;
            p.unravelling = 0;
            p.fading = 0;
            p.colorLocked = false;
            p.isEntangled = false;
            p.isConsumed = 0;
            p.bondPartner = null; // For Pair Bonding mutator
            p.isCoral = false;
            p.isStatic = false;
            p.chainParent = null;
            p.chainChild = null;
        }
    });
}