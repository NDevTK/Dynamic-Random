/**
 * @file simulation.js
 * @description This file contains the core particle simulation and update loop.
 */

import { cataclysmInProgress, universeState, setUniverseState, isLeftMouseDown, isRightMouseDown, activeEffects, universeProfile, physics, mouse, seededRandom } from './state.js';
import { triggerCataclysm } from './cataclysms.js';
import { handleActivePower } from './powers.js';
import { getBezierXY, tagParticles } from './utils.js';
import { drawEffects } from './drawing.js';
import { incrementTick, getTick } from './state.js';
import { SpatialGrid } from './spatial_grid.js';

// --- Simulation Sub-modules ---

let particleGrid = null;

function handleEnergyAndCataclysm(pJS) {
    if (isLeftMouseDown || isRightMouseDown) {
        universeState.energy += 10;
    } else {
        universeState.energy = Math.max(0, universeState.energy - 5);
    }

    if (universeState.energy > universeState.maxEnergy && universeState.state !== 'Unstable') {
        setUniverseState({ ...universeState, state: 'Unstable' });
        triggerCataclysm(pJS);
    } else if (universeState.energy > universeState.maxEnergy * 0.95) {
        pJS.canvas.el.classList.add('shake');
    } else {
        pJS.canvas.el.classList.remove('shake');
    }
}

function prepareCanvas(pJS) {
    const trailAlpha = pJS.particles.move.trail.enable ? (universeProfile.blueprintName === 'LivingInk' || universeProfile.blueprintName === 'Painterly' ? 0.2 : 0.1) : 1;
    pJS.canvas.ctx.fillStyle = `rgba(0, 0, 0, ${trailAlpha})`;
    pJS.canvas.ctx.fillRect(0, 0, pJS.canvas.w, pJS.canvas.h);
}

function applyOngoingEffects(p, i, pJS) {
    if (p.unravelling > 0) { p.unravelling--; p.radius *= 0.98; if (p.unravelling <= 0) { pJS.particles.array.splice(i, 1); return true; } }
    if (p.isCrystalized || p.isCoral) { p.vx = 0; p.vy = 0; }
    if (p.fading > 0) { p.fading--; p.opacity.value = Math.max(0, p.opacity.value - 0.01); if (p.opacity.value <= 0) { pJS.particles.array.splice(i, 1); return true; } }
    if (p.isConsumed > 0) { p.radius *= 0.97; p.isConsumed--; if (p.isConsumed <= 0) { pJS.particles.array.splice(i, 1); return true; } }
    return false;
}

// --- Anomaly Forces ---

function applyNebulaForce(p) {
    for (const nebula of activeEffects.nebulas) {
        const dx = p.x - nebula.x;
        const dy = p.y - nebula.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < nebula.radius * nebula.radius) {
            p.vx *= 0.95;
            p.vy *= 0.95;
            if (!p.colorLocked) {
                const pColor = p.color.rgb;
                p.color.rgb = { r: (pColor.r * 9 + nebula.baseColor.h / 360 * 255) / 10, g: (pColor.g * 9 + nebula.baseColor.s / 100 * 255) / 10, b: (pColor.b * 9 + nebula.baseColor.l / 100 * 255) / 10 };
            }
        }
    }
}

function applyPulsarForce(p) {
    for (const pulsar of activeEffects.pulsars) {
        const angleToP = Math.atan2(p.y - pulsar.y, p.x - pulsar.x);
        const angleDiff = Math.abs(pulsar.angle - angleToP) % Math.PI;
        if (angleDiff < 0.1) {
            p.vx += Math.cos(pulsar.angle) * pulsar.strength * 0.1;
            p.vy += Math.sin(pulsar.angle) * pulsar.strength * 0.1;
        }
    }
}

function applyBlackHoleForce(p, i, pJS) {
    for (const hole of activeEffects.blackHoles) {
        const dx = hole.x - p.x, dy = hole.y - p.y, distSq = dx * dx + dy * dy;
        if (distSq < hole.eventHorizon * hole.eventHorizon) { pJS.particles.array.splice(i, 1); return true; }
        if (distSq < 40000) { const force = hole.mass / distSq; p.vx += dx * force; p.vy += dy * force; }
    }
    return false;
}

function applyWhiteHoleForce(p) {
    for (const hole of activeEffects.whiteHoles) {
        const dx = hole.x - p.x, dy = hole.y - p.y, distSq = dx * dx + dy * dy;
        if (distSq < 90000) {
            const force = hole.strength / (Math.sqrt(distSq) + 0.1);
            p.vx -= dx * force * 0.1;
            p.vy -= dy * force * 0.1;
        }
    }
}

function applyCosmicWebForce(p) {
    for (const web of activeEffects.cosmicWebs) {
        for (const node of web.nodes) {
            const dx = node.x - p.x;
            const dy = node.y - p.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < 200 * 200) {
                p.vx += dx * web.strength * 0.01;
                p.vy += dy * web.strength * 0.01;
            }
        }
    }
}

function applyQuasarForce(p) {
    activeEffects.quasars.forEach(q => {
        if (q.isFiring) {
            const dx = p.x - q.x, dy = p.y - q.y, dist = Math.sqrt(dx * dx + dy * dy);
            const angleToP = Math.atan2(dy, dx);
            const angleDiff = Math.abs(q.angle - angleToP);
            if (angleDiff < 0.2 || angleDiff > Math.PI * 2 - 0.2) {
                p.vx += Math.cos(q.angle) * q.strength / dist;
                p.vy += Math.sin(q.angle) * q.strength / dist;
            }
        }
    });
}

function applyCosmicRiftForce(p) {
    for (const rift of activeEffects.cosmicRifts) {
        const dx1 = p.x - rift.x1;
        const dy1 = p.y - rift.y1;
        const dist1Sq = dx1 * dx1 + dy1 * dy1;
        if (dist1Sq < rift.width * rift.width) {
            p.x = rift.x2 + (seededRandom() - 0.5) * rift.width;
            p.y = rift.y2 + (seededRandom() - 0.5) * rift.width;
        }
        const dx2 = p.x - rift.x2;
        const dy2 = p.y - rift.y2;
        const dist2Sq = dx2 * dx2 + dy2 * dy2;
        if (dist2Sq < rift.width * rift.width) {
            p.x = rift.x1 + (seededRandom() - 0.5) * rift.width;
            p.y = rift.y1 + (seededRandom() - 0.5) * rift.width;
        }
    }
}

function applyIonCloudForce(p, pJS) {
    for (const cloud of activeEffects.ionClouds) {
        const dx = p.x - cloud.x;
        const dy = p.y - cloud.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < cloud.radius * cloud.radius && seededRandom() < 0.001) {
            const nearby = particleGrid.getNearby(cloud.x, cloud.y, cloud.radius);
            for (const p2 of nearby) {
                if (p === p2) continue;
                const dist2Sq = Math.pow(cloud.x - p2.x, 2) + Math.pow(cloud.y - p2.y, 2);
                if (dist2Sq < cloud.radius * cloud.radius) {
                    p.vx += (p2.x - p.x) * 0.05;
                    p.vy += (p2.y - p.y) * 0.05;
                    p2.vx += (p.x - p2.x) * 0.05;
                    p2.vy += (p.y - p2.y) * 0.05;
                    break;
                }
            }
        }
    }
}

function applySupergiantStarForce(p) {
    for (const star of activeEffects.supergiantStars) {
        const dx = star.x - p.x, dy = star.y - p.y, distSq = dx * dx + dy * dy;
        if (distSq < 250000) {
            const force = star.mass / (distSq + 1000);
            p.vx += dx * force * 0.1;
            p.vy += dy * force * 0.1;
        }
    }
}

function applyCrystallineFieldForce(p) {
    for (const field of activeEffects.crystallineFields) {
        const dx = p.x - field.x;
        const dy = p.y - field.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < field.radius * field.radius) {
            p.vx *= 0.9;
            p.vy *= 0.9;
            if (getTick() % 10 === 0) {
                const snappedAngle = Math.round(Math.atan2(p.vy, p.vx) / (Math.PI / 2)) * (Math.PI / 2);
                const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                p.vx = Math.cos(snappedAngle) * speed;
                p.vy = Math.sin(snappedAngle) * speed;
            }
        }
    }
}

function applyNegativeSpaceForce(p, i, pJS) {
    for (const space of activeEffects.negativeSpaces) {
        const dx = p.x - space.x;
        const dy = p.y - space.y;
        if (dx * dx + dy * dy < space.radius * space.radius) {
            pJS.particles.array.splice(i, 1);
            return true;
        }
    }
    return false;
}

function applyStellarWindForce(p) {
    for (const wind of activeEffects.stellarWinds) {
        p.vx += Math.cos(wind.angle) * wind.strength;
        p.vy += Math.sin(wind.angle) * wind.strength;
    }
}

function applyMicrowaveBackgroundForce(p) {
    for (const noise of activeEffects.microwaveBackgrounds) {
        p.vx += (seededRandom() - 0.5) * noise.noise;
        p.vy += (seededRandom() - 0.5) * noise.noise;
    }
}

function applyParticleAcceleratorForce(p) {
    for (const acc of activeEffects.particleAccelerators) {
        const dx = p.x - acc.x;
        const dy = p.y - acc.y;
        const dSq = dx * dx + dy * dy;
        if (dSq > (acc.radius - 10) * (acc.radius - 10) && dSq < (acc.radius + 10) * (acc.radius + 10)) {
            p.vx *= acc.strength;
            p.vy *= acc.strength;
        }
    }
}

function applySpacetimeFoamForce(p) {
    for (const foam of activeEffects.spacetimeFoam) {
        const dx = p.x - foam.x;
        const dy = p.y - foam.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < foam.radius * foam.radius) {
            p.vx += (seededRandom() - 0.5) * 0.5;
            p.vy += (seededRandom() - 0.5) * 0.5;
        }
    }
}

function applyEchoingVoidForce(p) {
    for (const evoid of activeEffects.echoingVoids) {
        const dx = p.x - evoid.x;
        const dy = p.y - evoid.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < evoid.radius * evoid.radius) {
            evoid.history.push({ x: p.x, y: p.y, color: p.color.rgb });
            if (evoid.history.length > 200) evoid.history.shift();
        }
    }
}

function applyAnomalyForces(p, i, pJS) {
    applyNebulaForce(p);
    applyPulsarForce(p);
    if (applyBlackHoleForce(p, i, pJS)) return true;
    applyWhiteHoleForce(p);
    applyCosmicWebForce(p);
    applyQuasarForce(p);
    applyCosmicRiftForce(p);
    applyIonCloudForce(p, pJS);
    applySupergiantStarForce(p);
    applyCrystallineFieldForce(p);
    if (applyNegativeSpaceForce(p, i, pJS)) return true;
    applyStellarWindForce(p);
    applyMicrowaveBackgroundForce(p);
    applyParticleAcceleratorForce(p);
    applySpacetimeFoamForce(p);
    applyEchoingVoidForce(p);
    return false;
}

// --- Mutator Forces ---

function applyPulsingParticles(p, tick) {
    if (universeProfile.mutators.includes('Pulsing Particles')) {
        p.radius = p.radius_initial * (1 + 0.5 * Math.sin(tick * 0.05 + p.seed));
    }
}

function applyUnstableParticles(p, i, pJS) {
    if (universeProfile.mutators.includes('Unstable Particles') && seededRandom() < 0.0005) {
        if (seededRandom() > 0.5 && pJS.particles.array.length < pJS.particles.number.value_max) {
            pJS.fn.modes.pushParticles(1, { x: p.x, y: p.y });
        } else {
            pJS.particles.array.splice(i, 1);
            return true;
        }
    }
    return false;
}

function applyRepulsiveField(p, pJS, isPhased) {
    if (universeProfile.mutators.includes('Repulsive Field') && !isPhased) {
        const nearby = particleGrid.getNearby(p.x, p.y, 50);
        for (const p2 of nearby) {
            if (p === p2) continue;
            const dx = p.x - p2.x, dy = p.y - p2.y, distSq = dx * dx + dy * dy;
            if (distSq < 2500) {
                p.vx += dx / distSq * 2;
                p.vy += dy / distSq * 2;
            }
        }
    }
}

function applyClustering(p, pJS, isPhased, tick) {
    if (universeProfile.mutators.includes('Clustering') && !isPhased) {
        const pulse = 1.0 + 0.5 * Math.sin(tick * 0.01);
        const nearby = particleGrid.getNearby(p.x, p.y, 125);
        for (const p2 of nearby) {
            if (p === p2) continue;
            const dx = p.x - p2.x, dy = p.y - p2.y, distSq = dx * dx + dy * dy;
            if (distSq < 15000 && distSq > 100) {
                p.vx -= dx / distSq * 1.5 * pulse;
                p.vy -= dy / distSq * 1.5 * pulse;
            }
        }
    }
}

function applyErratic(p) {
    if (universeProfile.mutators.includes('Erratic')) {
        p.vx += (seededRandom() - 0.5) * 0.3;
        p.vy += (seededRandom() - 0.5) * 0.3;
    }
}

function applyRainbow(p, tick) {
    if (universeProfile.mutators.includes('Rainbow') && !p.colorLocked) {
        p.color = { rgb: { r: 127 * (1 + Math.sin(tick * 0.05 + p.x * 0.01)), g: 127 * (1 + Math.sin(tick * 0.05 + p.y * 0.01)), b: 127 * (1 + Math.sin(tick * 0.05)) } };
    }
}

function applyFlickering(p, pJS, tick) {
    if (universeProfile.mutators.includes('Flickering')) {
        if (tick % Math.floor(20 + p.seed * 20) === 0) {
            p.opacity.value = p.opacity.value > 0 ? 0 : pJS.particles.opacity.value;
        }
    }
}

function applyGravityPockets(p) {
    for (const pocket of activeEffects.gravityPockets) {
        const dx = pocket.x - p.x, dy = pocket.y - p.y;
        if (dx * dx + dy * dy < pocket.radiusSq) {
            p.vx += dx * pocket.strength * 0.01;
            p.vy += dy * pocket.strength * 0.01;
        }
    }
}

function applyGravityWaves(p, tick) {
    for (const wave of activeEffects.gravityWaves) {
        const push = Math.sin(tick * wave.frequency) * wave.strength;
        p.vx += Math.cos(wave.angle) * push;
        p.vy += Math.sin(wave.angle) * push;
    }
}

function applyParticleDecay(p, i, pJS) {
    if (universeProfile.mutators.includes('Particle Decay')) {
        p.opacity.value = Math.max(0, p.opacity.value - 0.0005);
        if (p.opacity.value === 0) {
            pJS.particles.array.splice(i, 1);
            return true;
        }
    }
    return false;
}

function applyElasticCollisions(p, pJS, isPhased) {
    if (universeProfile.mutators.includes('Elastic Collisions') && !isPhased) {
        const nearby = particleGrid.getNearby(p.x, p.y, 20);
        for (const p2 of nearby) {
            if (p === p2) continue;
            const dx = p.x - p2.x, dy = p.y - p2.y, distSq = dx * dx + dy * dy;
            if (distSq < Math.pow(p.radius + p2.radius, 2)) {
                const angle = Math.atan2(dy, dx);
                const force = 0.5 / (distSq * 0.01 + 1);
                p.vx += Math.cos(angle) * force;
                p.vy += Math.sin(angle) * force;
            }
        }
    }
}

function applyNoisy(p) {
    if (universeProfile.mutators.includes('Noisy')) {
        p.vx += (seededRandom() - 0.5) * 0.2;
        p.vy += (seededRandom() - 0.5) * 0.2;
    }
}

function applySynchronized(p, tick) {
    if (universeProfile.mutators.includes('Synchronized')) {
        const angle = Math.sin(tick * 0.02 + p.seed * 10) * Math.PI;
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
    }
}

function applyPairBonding(p, pJS) {
    if (universeProfile.mutators.includes('Pair Bonding') && !p.bondPartner) {
        const nearby = particleGrid.getNearby(p.x, p.y, 50);
        for (const p2 of nearby) {
            if (p === p2 || p2.bondPartner) continue;
            const dSq = Math.pow(p.x - p2.x, 2) + Math.pow(p.y - p2.y, 2);
            if (dSq < 2500) {
                p.bondPartner = p2;
                p2.bondPartner = p;
                break;
            }
        }
    }
    if (p.bondPartner) {
        const dx = p.bondPartner.x - p.x, dy = p.bondPartner.y - p.y, dSq = dx * dx + dy * dy;
        if (dSq > 10000) {
            p.bondPartner.bondPartner = null;
            p.bondPartner = null;
        } else {
            p.vx += dx * 0.001;
            p.vy += dy * 0.001;
        }
    }
}

function applyFragmenting(p, pJS) {
    if (universeProfile.mutators.includes('Fragmenting') && seededRandom() < 0.0001 && p.radius > 1 && pJS.particles.array.length < pJS.particles.number.value_max) {
        p.radius /= 2;
        const newP = pJS.fn.modes.pushParticles(1, { x: p.x, y: p.y })[0];
        if (newP) {
            newP.radius = p.radius;
            tagParticles([newP], universeProfile, false, seededRandom);
        }
    }
}

function applyPhotonSails(p) {
    for (const sail of activeEffects.photonSails) {
        p.vx += Math.cos(sail.angle) * sail.strength;
        p.vy += Math.sin(sail.angle) * sail.strength;
    }
}

function applyChaoticOrbits(p, pJS) {
    if (universeProfile.mutators.includes('Chaotic Orbits') && pJS.particles.move.attract.enable) {
        p.vx += (seededRandom() - 0.5) * 0.4;
        p.vy += (seededRandom() - 0.5) * 0.4;
    }
}

function applyTidalForces(p) {
    for (const tide of activeEffects.tidalForces) {
        const pull = (p.y - tide.y) * 0.0001 * tide.strength;
        p.vx += pull;
    }
}

function applySelfPropelled(p) {
    if (universeProfile.mutators.includes('Self-Propelled')) {
        const angle = p.seed;
        p.vx += Math.cos(angle) * 0.05;
        p.vy += Math.sin(angle) * 0.05;
    }
}

function applyPhaseScattering(p) {
    if (universeProfile.mutators.includes('Phase Scattering') && seededRandom() < 0.001) {
        p.opacity.value = seededRandom();
    }
}

function applyBrownianMotion(p) {
    if (universeProfile.mutators.includes('BrownianMotion')) {
        p.vx += (seededRandom() - 0.5) * 0.8;
        p.vy += (seededRandom() - 0.5) * 0.8;
    }
}

function applyHeavyParticles(p, pJS) {
    if (p.isHeavy) {
        const nearby = particleGrid.getNearby(p.x, p.y, 100);
        for (const p2 of nearby) {
            if (p === p2) continue;
            const dx = p.x - p2.x, dy = p.y - p2.y, dSq = dx * dx + dy * dy;
            if (dSq < 10000) {
                p2.vx += dx / dSq * p.radius;
                p2.vy += dy / dSq * p.radius;
            }
        }
    }
}

function applyChoral(p, pJS) {
    if (universeProfile.mutators.includes('Choral')) {
        const avg_vx = pJS.particles.array.reduce((acc, p) => acc + p.vx, 0) / pJS.particles.array.length;
        const avg_vy = pJS.particles.array.reduce((acc, p) => acc + p.vy, 0) / pJS.particles.array.length;
        p.vx += (avg_vx - p.vx) * 0.001;
        p.vy += (avg_vy - p.vy) * 0.001;
    }
}

function applyCarnival(p, tick) {
    if (universeProfile.mutators.includes('Carnival') && tick % 10 === 0) {
        p.color = { rgb: { r: seededRandom() * 255, g: seededRandom() * 255, b: seededRandom() * 255 } };
        p.radius = p.radius_initial * (0.5 + seededRandom());
    }
}

function applyParticleChains(p, pJS) {
    if (universeProfile.mutators.includes('ParticleChains')) {
        if (!p.chainChild) {
            const nearby = particleGrid.getNearby(p.x, p.y, 30);
            for (const p2 of nearby) {
                if (p === p2 || p2.chainParent) continue;
                const dSq = Math.pow(p.x - p2.x, 2) + Math.pow(p.y - p2.y, 2);
                if (dSq < 20 * 20 && !p.chainParent) {
                    p.chainChild = p2;
                    p2.chainParent = p;
                    break;
                }
            }
        }
        if (p.chainChild) {
            const dx = p.chainChild.x - p.x;
            const dy = p.chainChild.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 50) {
                p.chainChild.chainParent = null;
                p.chainChild = null;
            } else {
                const restingDist = 20;
                const force = (dist - restingDist) * 0.01;
                p.vx += dx / dist * force;
                p.vy += dy / dist * force;
                p.chainChild.vx -= dx / dist * force;
                p.chainChild.vy -= dy / dist * force;
                pJS.canvas.ctx.strokeStyle = 'rgba(200, 200, 255, 0.2)';
                pJS.canvas.ctx.lineWidth = 1;
                pJS.canvas.ctx.beginPath();
                pJS.canvas.ctx.moveTo(p.x, p.y);
                pJS.canvas.ctx.lineTo(p.chainChild.x, p.chainChild.y);
                pJS.canvas.ctx.stroke();
            }
        }
    }
}

function applyCosmicRivers(p) {
    for (const river of activeEffects.cosmicRivers) {
        for (let t = 0; t < 1; t += 0.05) {
            const pt = getBezierXY(t, river.x1, river.y1, river.cx1, river.cy1, river.cx2, river.cy2, river.x2, river.y2);
            const dx = p.x - pt.x;
            const dy = p.y - pt.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < river.width * river.width) {
                const nextPt = getBezierXY(t + 0.01, river.x1, river.y1, river.cx1, river.cy1, river.cx2, river.cy2, river.x2, river.y2);
                const riverAngle = Math.atan2(nextPt.y - pt.y, nextPt.x - pt.x);
                p.vx += Math.cos(riverAngle) * river.strength * 0.05;
                p.vy += Math.sin(riverAngle) * river.strength * 0.05;
                break;
            }
        }
    }
}

function applyMutatorForces(p, i, pJS, isPhased) {
    const tick = getTick();
    applyPulsingParticles(p, tick);
    if (applyUnstableParticles(p, i, pJS)) return true;
    applyRepulsiveField(p, pJS, isPhased);
    applyClustering(p, pJS, isPhased, tick);
    applyErratic(p);
    applyRainbow(p, tick);
    applyFlickering(p, pJS, tick);
    applyGravityPockets(p);
    applyGravityWaves(p, tick);
    if (applyParticleDecay(p, i, pJS)) return true;
    applyElasticCollisions(p, pJS, isPhased);
    applyNoisy(p);
    applySynchronized(p, tick);
    applyPairBonding(p, pJS);
    applyFragmenting(p, pJS);
    applyPhotonSails(p);
    applyChaoticOrbits(p, pJS);
    applyTidalForces(p);
    applySelfPropelled(p);
    applyPhaseScattering(p);
    applyBrownianMotion(p);
    applyHeavyParticles(p, pJS);
    applyChoral(p, pJS);
    applyCarnival(p, tick);
    applyParticleChains(p, pJS);
    applyCosmicRivers(p);
    return false;
}

function applyPlayerAndGlobalForces(p, i, pJS, isPhased, isStasis, worldMouse) {
    if (!isPhased && !isStasis && !p.isCrystalized && !p.isEntangled) {
        if (isLeftMouseDown) handleActivePower(p, i, pJS, universeProfile.leftClickPower, worldMouse);
        if (isRightMouseDown) handleActivePower(p, i, pJS, universeProfile.rightClickPower, worldMouse);
        for (const well of activeEffects.gravityWells) { const dx = well.x - p.x, dy = well.y - p.y; p.vx += dx * well.strength * 0.01; p.vy += dy * well.strength * 0.01; }
    }
    if (p.isInfected) {
        const nearby = particleGrid.getNearby(p.x, p.y, 20);
        for (const p2 of nearby) {
            if (p === p2 || p2.isInfected) continue;
            const dx = p.x - p2.x, dy = p.y - p2.y, dSq = dx * dx + dy * dy;
            if (dSq < Math.pow(p.radius + p2.radius + 2, 2)) {
                p2.isInfected = true;
                p2.color = { rgb: { r: 255, g: 50, b: 50 } };
            }
        }
    }

    if (p.radius > p.radius_initial && !universeProfile.mutators.includes('Pulsing Particles')) { p.radius -= 0.05; }
    p.vx *= physics.friction; p.vy *= physics.friction;
}

function handleBoundaryConditions(p, i, pJS) {
    if (universeProfile.mutators.includes('Torus Field')) {
        if (p.x < 0) p.x = pJS.canvas.w; if (p.x > pJS.canvas.w) p.x = 0;
        if (p.y < 0) p.y = pJS.canvas.h; if (p.y > pJS.canvas.h) p.y = 0;
    } else if (universeProfile.mutators.includes('Event Horizon')) {
        if (p.x < 0 || p.x > pJS.canvas.w || p.y < 0 || p.y > pJS.canvas.h) {
            pJS.particles.array.splice(i, 1);
            return true;
        }
    }
    return false;
}

function updateAllParticles(pJS, worldMouse) {
    for (let i = pJS.particles.array.length - 1; i >= 0; i--) {
        const p = pJS.particles.array[i];
        if (!p) continue;

        let timeFactor = 1.0;
        for (const zone of activeEffects.timeDilationZones) {
            const dx = p.x - zone.x;
            const dy = p.y - zone.y;
            if (dx * dx + dy * dy < zone.radiusSq) { timeFactor = zone.timeFactor; break; }
        }

        const updateSteps = timeFactor > 1 ? Math.floor(timeFactor) : 1;
        for (let step = 0; step < updateSteps; step++) {
            if (timeFactor < 1 && seededRandom() > timeFactor) continue;

            let isPhased = universeProfile.mutators.includes('Phase Shift');
            for (const zone of activeEffects.phaseZones) {
                const dx = p.x - zone.x;
                const dy = p.y - zone.y;
                if (dx * dx + dy * dy < zone.radiusSq) { isPhased = true; break; }
            }

            let isStasis = false;
            for (const field of activeEffects.stasisFields) {
                const dx = p.x - field.x;
                const dy = p.y - field.y;
                if (dx * dx + dy * dy < field.r * field.r) { isStasis = true; break; }
            }
            if (isStasis) { p.vx = 0; p.vy = 0; }

            if (applyOngoingEffects(p, i, pJS)) continue;
            if (applyAnomalyForces(p, i, pJS)) continue;
            if (applyMutatorForces(p, i, pJS, isPhased)) continue;
            applyPlayerAndGlobalForces(p, i, pJS, isPhased, isStasis, worldMouse);
            if (handleBoundaryConditions(p, i, pJS)) continue;
        }
    }
}

function updateEntangledGroups(pJS) {
    activeEffects.entangledGroups.forEach((group, groupIndex) => {
        group.particles = group.particles.filter(p => p && pJS.particles.array.includes(p)); if (group.particles.length < 2) { activeEffects.entangledGroups.splice(groupIndex, 1); return; }
        let currentCX = 0, currentCY = 0; group.particles.forEach(p => { currentCX += p.x; currentCY += p.y; }); currentCX /= group.particles.length;
        group.particles.forEach((p, pIndex) => { const initialVec = group.initialVectors[pIndex]; if (!initialVec) return; const targetX = currentCX + initialVec.x, targetY = currentCY + initialVec.y; p.vx += (targetX - p.x) * 0.05; p.vy += (targetY - p.y) * 0.05; });
    });
}

function updateAnomalies(pJS) {
    activeEffects.whiteHoles.forEach(h => { h.tick++; if (h.tick * h.spawnRate > 1 && pJS.particles.array.length < pJS.particles.number.value_max) { h.tick = 0; pJS.fn.modes.pushParticles(1, { x: h.x, y: h.y }); } });
    activeEffects.quasars.forEach(q => { q.tick++; if (q.tick > q.period) { q.tick = 0; q.isFiring = true; setTimeout(() => q.isFiring = false, q.duration * 16); } if (q.isFiring && pJS.particles.array.length < pJS.particles.number.value_max) { const newP = pJS.fn.modes.pushParticles(1, { x: q.x, y: q.y })[0]; if (newP) { newP.vx = Math.cos(q.angle) * q.strength; newP.vy = Math.sin(q.angle) * q.strength; tagParticles([newP], universeProfile, false, seededRandom); } } });
    activeEffects.blackHoles.forEach(h => { if (h.isWandering) { h.x += (seededRandom() - 0.5) * 0.5; h.y += (seededRandom() - 0.5) * 0.5; if (h.x < 0 || h.x > pJS.canvas.w || h.y < 0 || h.y > pJS.canvas.h) { h.x = pJS.canvas.w / 2; h.y = pJS.canvas.h / 2; } } });
    activeEffects.magneticStorms.forEach(s => { s.lastFlip++; if (s.lastFlip > s.period) { s.lastFlip = 0; s.attract = !s.attract; pJS.particles.move.attract.enable = s.attract; } });
    activeEffects.supergiantStars.forEach(s => { s.lastSpawn++; if (s.lastSpawn > s.period && pJS.particles.array.length < pJS.particles.number.value_max) { s.lastSpawn = 0; const newP = pJS.fn.modes.pushParticles(1, { x: s.x, y: s.y })[0]; if (newP) { newP.vx = (seededRandom() - 0.5) * 5; newP.vy = (seededRandom() - 0.5) * 5; tagParticles([newP], universeProfile, false, seededRandom); } } });
    activeEffects.cosmicGeysers.forEach(g => { g.tick++; if (g.tick > g.period && pJS.particles.array.length < pJS.particles.number.value_max) { g.tick = 0; const newP = pJS.fn.modes.pushParticles(1, { x: g.x + (seededRandom() - 0.5) * g.width, y: g.y })[0]; if (newP) { newP.vy = -g.strength; tagParticles([newP], universeProfile, false, seededRandom); } } });
    activeEffects.temporalRifts.forEach((r, i) => { r.life--; if (r.life <= 0) { activeEffects.temporalRifts.splice(i, 1); return; } if (seededRandom() < 0.01 && pJS.particles.array.length < pJS.particles.number.value_max) { const newP = pJS.fn.modes.pushParticles(1, { x: r.x, y: r.y })[0]; if (newP) { newP.opacity.value = 0.5; newP.fading = 50; tagParticles([newP], universeProfile, false, seededRandom); } } });
    activeEffects.solarFlares.forEach(f => { f.tick++; if (f.tick > f.period) { f.tick = 0; for (let i = 0; i < 30; i++) { if (pJS.particles.array.length < pJS.particles.number.value_max) { const newP = pJS.fn.modes.pushParticles(1, { x: pJS.canvas.w / 2, y: pJS.canvas.h / 2 })[0]; if (newP) { newP.vx = Math.cos(f.angle) * f.strength; newP.vy = Math.sin(f.angle) * f.strength; tagParticles([newP], universeProfile, false, seededRandom); } } } } });
    activeEffects.spacetimeFoam.forEach((f, i) => { f.life--; if (f.life <= 0) activeEffects.spacetimeFoam.splice(i, 1); });
    activeEffects.cosmicNurseries.forEach(n => { n.tick++; if (n.tick > n.period && pJS.particles.array.length < pJS.particles.number.value_max) { n.tick = 0; const newP = pJS.fn.modes.pushParticles(1, { x: n.x + (seededRandom() - 0.5) * n.radius, y: n.y + (seededRandom() - 0.5) * n.radius })[0]; if (newP) { newP.vx = (seededRandom() - 0.5) * 2; newP.vy = (seededRandom() - 0.5) * 2; tagParticles([newP], universeProfile, false, seededRandom); } } });
}

function enforceParticleLimit(pJS) {
    if (pJS.particles.array.length > pJS.particles.number.value_max) {
        pJS.particles.array.splice(0, pJS.particles.array.length - pJS.particles.number.value_max);
    }
}

/**
 * The main update loop, called on every frame.
 * This function handles particle physics, user interaction, anomalies, and cataclysms.
 */
export function update(pJS) {
    incrementTick();
    if (cataclysmInProgress) {
        requestAnimationFrame(() => update(pJS));
        return;
    }

    if (!particleGrid) {
        particleGrid = new SpatialGrid(pJS.canvas.w, pJS.canvas.h, 150);
    } else if (particleGrid.width !== pJS.canvas.w || particleGrid.height !== pJS.canvas.h) {
        particleGrid.updateDimensions(pJS.canvas.w, pJS.canvas.h);
    }

    particleGrid.clear();
    for (let i = 0; i < pJS.particles.array.length; i++) {
        particleGrid.insert(pJS.particles.array[i]);
    }

    handleEnergyAndCataclysm(pJS);
    prepareCanvas(pJS);

    const worldMouse = { ...mouse };
    updateAllParticles(pJS, worldMouse);

    updateEntangledGroups(pJS);
    updateAnomalies(pJS);
    enforceParticleLimit(pJS);

    drawEffects(pJS.canvas.ctx);
    pJS.fn.particlesUpdate();
    pJS.fn.particlesDraw();

    requestAnimationFrame(() => update(pJS));
}
