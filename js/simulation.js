/**
 * @file simulation.js
 * @description This file contains the core particle simulation and update loop.
 */

import { cataclysmInProgress, universeState, setUniverseState, isLeftMouseDown, isRightMouseDown, activeEffects, universeProfile, physics, mouse } from './state.js';
import { triggerCataclysm } from './cataclysms.js';
import { handleActivePower } from './powers.js';
import { getBezierXY, tagParticles } from './utils.js';
import { drawEffects } from './drawing.js';
import { incrementTick, getTick } from './state.js';

/**
 * The main update loop, called on every frame.
 * This function handles particle physics, user interaction, anomalies, and cataclysms.
 */
export function update(pJS) {
    incrementTick();
    const tick = getTick();
    if (cataclysmInProgress) { requestAnimationFrame(() => update(pJS)); return; }

    // State & Energy Management
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

    const trailAlpha = pJS.particles.move.trail.enable ? (universeProfile.blueprintName === 'LivingInk' || universeProfile.blueprintName === 'Painterly' ? 0.2 : 0.1) : 1;
    pJS.canvas.ctx.fillStyle = `rgba(0, 0, 0, ${trailAlpha})`;
    pJS.canvas.ctx.fillRect(0, 0, pJS.canvas.w, pJS.canvas.h);

    const worldMouse = { ...mouse };

    // Main Particle Loop
    for(let i = pJS.particles.array.length - 1; i >= 0; i--) {
        const p = pJS.particles.array[i];
        if (!p) continue;

        let timeFactor = 1.0;
        for (const zone of activeEffects.timeDilationZones) { if (Math.pow(p.x-zone.x,2)+Math.pow(p.y-zone.y,2) < zone.radiusSq) { timeFactor = zone.timeFactor; break; } }

        const updateSteps = timeFactor > 1 ? Math.floor(timeFactor) : 1;
        for(let step=0; step < updateSteps; step++) {
            if (timeFactor < 1 && Math.random() > timeFactor) continue;

            let isPhased = universeProfile.mutators.includes('Phase Shift');
            let isStasis = false;
            for (const zone of activeEffects.phaseZones) { if (Math.pow(p.x - zone.x, 2) + Math.pow(p.y - zone.y, 2) < zone.radiusSq) { isPhased = true; break; } }
            for (const field of activeEffects.stasisFields) { if (Math.pow(p.x - field.x, 2) + Math.pow(p.y - field.y, 2) < field.r*field.r) { isStasis = true; break; } }

            // Apply ongoing effects
            if(p.unravelling > 0) { p.unravelling--; p.radius *= 0.98; if (p.unravelling <= 0) { pJS.particles.array.splice(i,1); continue; } }
            if(p.isCrystalized || isStasis || p.isCoral) { p.vx = 0; p.vy = 0; }
            if (p.fading > 0) { p.fading--; p.opacity.value = Math.max(0, p.opacity.value - 0.01); if(p.opacity.value <= 0) {pJS.particles.array.splice(i,1); continue;}}
            if (p.isConsumed > 0) { p.radius *= 0.97; p.isConsumed--; if(p.isConsumed <= 0) { pJS.particles.array.splice(i,1); continue; } }

            // Apply Anomalies
            for (const nebula of activeEffects.nebulas) { const dSq = Math.pow(p.x - nebula.x, 2) + Math.pow(p.y - nebula.y, 2); if (dSq < nebula.radius*nebula.radius) { p.vx *= 0.95; p.vy *= 0.95; if(!p.colorLocked) { const pColor = p.color.rgb; p.color.rgb = { r: (pColor.r*9+nebula.baseColor.h/360*255)/10, g: (pColor.g*9+nebula.baseColor.s/100*255)/10, b: (pColor.b*9+nebula.baseColor.l/100*255)/10 }; } } }
            for (const pulsar of activeEffects.pulsars) { const angleToP = Math.atan2(p.y-pulsar.y, p.x-pulsar.x); const angleDiff = Math.abs(pulsar.angle - angleToP) % Math.PI; if (angleDiff < 0.1) { p.vx += Math.cos(pulsar.angle) * pulsar.strength * 0.1; p.vy += Math.sin(pulsar.angle) * pulsar.strength * 0.1; }}
            for (const hole of activeEffects.blackHoles) { const dx = hole.x - p.x, dy = hole.y - p.y, distSq = dx*dx+dy*dy; if(distSq < hole.eventHorizon*hole.eventHorizon) {pJS.particles.array.splice(i,1); continue;} if(distSq < 40000){const force = hole.mass / distSq; p.vx += dx * force; p.vy += dy * force;} }
            for (const hole of activeEffects.whiteHoles) { const dx = hole.x-p.x, dy = hole.y-p.y, distSq = dx*dx+dy*dy; if (distSq < 90000) { const force = hole.strength / Math.sqrt(distSq); p.vx -= dx*force*0.1; p.vy -= dy*force*0.1; } }
            for (const web of activeEffects.cosmicWebs) { for (const node of web.nodes) { const dx = node.x - p.x; const dy = node.y - p.y; const dSq = dx*dx + dy*dy; if (dSq < 200*200) { p.vx += dx * web.strength * 0.01; p.vy += dy * web.strength * 0.01; } } }
            activeEffects.quasars.forEach(q => { if(q.isFiring) { const dx=p.x-q.x, dy=p.y-q.y, dist=Math.sqrt(dx*dx+dy*dy); const angleToP = Math.atan2(dy,dx); const angleDiff = Math.abs(q.angle - angleToP); if (angleDiff < 0.2 || angleDiff > Math.PI*2-0.2) { p.vx += Math.cos(q.angle)*q.strength/dist; p.vy += Math.sin(q.angle)*q.strength/dist; } } });
            for (const rift of activeEffects.cosmicRifts) { const dist1Sq = Math.pow(p.x-rift.x1,2)+Math.pow(p.y-rift.y1,2); if(dist1Sq < rift.width*rift.width) { p.x = rift.x2 + (Math.random()-0.5)*rift.width; p.y = rift.y2 + (Math.random()-0.5)*rift.width; } const dist2Sq = Math.pow(p.x-rift.x2,2)+Math.pow(p.y-rift.y2,2); if(dist2Sq < rift.width*rift.width) { p.x = rift.x1 + (Math.random()-0.5)*rift.width; p.y = rift.y1 + (Math.random()-0.5)*rift.width; } }
            for (const cloud of activeEffects.ionClouds) { const distSq = Math.pow(p.x-cloud.x,2)+Math.pow(p.y-cloud.y,2); if(distSq < cloud.radius*cloud.radius && Math.random() < 0.001 && !isPhased) { for(const p2 of pJS.particles.array) { if(p === p2) continue; const dist2Sq = Math.pow(cloud.x-p2.x,2)+Math.pow(cloud.y-p2.y,2); if(dist2Sq < cloud.radius*cloud.radius) { p.vx += (p2.x-p.x)*0.05; p.vy += (p2.y-p.y)*0.05; p2.vx += (p.x-p2.x)*0.05; p2.vy += (p.y-p2.y)*0.05; break; } } } }
            for (const star of activeEffects.supergiantStars) { const dx = star.x - p.x, dy = star.y - p.y, distSq = dx*dx+dy*dy; if(distSq < 250000){const force = star.mass / (distSq + 1000); p.vx += dx * force * 0.1; p.vy += dy * force * 0.1;} }
            for (const field of activeEffects.crystallineFields) { const dSq = Math.pow(p.x-field.x,2)+Math.pow(p.y-field.y,2); if(dSq < field.radius*field.radius) { p.vx *= 0.9; p.vy *= 0.9; if(tick % 10 === 0) { const snappedAngle = Math.round(Math.atan2(p.vy,p.vx)/(Math.PI/2))*(Math.PI/2); const speed = Math.sqrt(p.vx*p.vx+p.vy*p.vy); p.vx = Math.cos(snappedAngle)*speed; p.vy = Math.sin(snappedAngle)*speed; } } }
            for (const space of activeEffects.negativeSpaces) { if(Math.pow(p.x-space.x,2)+Math.pow(p.y-space.y,2) < space.radius*space.radius) { pJS.particles.array.splice(i,1); continue; } }
            for (const wind of activeEffects.stellarWinds) { p.vx += Math.cos(wind.angle) * wind.strength; p.vy += Math.sin(wind.angle) * wind.strength; }
            for (const noise of activeEffects.microwaveBackgrounds) { p.vx += (Math.random()-0.5)*noise.noise; p.vy += (Math.random()-0.5)*noise.noise; }
            for (const acc of activeEffects.particleAccelerators) { const dSq = Math.pow(p.x-acc.x,2)+Math.pow(p.y-acc.y,2); if(dSq > (acc.radius-10)*(acc.radius-10) && dSq < (acc.radius+10)*(acc.radius+10)) { p.vx *= acc.strength; p.vy *= acc.strength; } }
            for (const foam of activeEffects.spacetimeFoam) { const dSq = Math.pow(p.x-foam.x,2)+Math.pow(p.y-foam.y,2); if(dSq < foam.radius*foam.radius) { p.vx += (Math.random()-0.5)*0.5; p.vy += (Math.random()-0.5)*0.5; } }
            for (const evoid of activeEffects.echoingVoids) { const dSq = Math.pow(p.x-evoid.x,2)+Math.pow(p.y-evoid.y,2); if(dSq < evoid.radius*evoid.radius) { evoid.history.push({x:p.x, y:p.y, color:p.color.rgb}); if(evoid.history.length > 200) evoid.history.shift(); } }

            // Apply Mutators
            if (universeProfile.mutators.includes('Pulsing Particles')) { p.radius = p.radius_initial * (1 + 0.5 * Math.sin(tick * 0.05 + p.seed)); }
            if (universeProfile.mutators.includes('Unstable Particles') && Math.random() < 0.0005) { if (Math.random() > 0.5 && pJS.particles.array.length < pJS.particles.number.value_max) { pJS.fn.modes.pushParticles(1, {x:p.x, y:p.y}); } else { pJS.particles.array.splice(i,1); continue; } }
            if (universeProfile.mutators.includes('Repulsive Field') && !isPhased) { for(const p2 of pJS.particles.array) { if(p === p2) continue; const dx=p.x-p2.x, dy=p.y-p2.y, distSq=dx*dx+dy*dy; if(distSq < 2500) { p.vx += dx/distSq*2; p.vy += dy/distSq*2; } } }
            if (universeProfile.mutators.includes('Clustering') && !isPhased) { const pulse = 1.0 + 0.5 * Math.sin(tick * 0.01); for(const p2 of pJS.particles.array) { if(p === p2) continue; const dx=p.x-p2.x, dy=p.y-p2.y, distSq=dx*dx+dy*dy; if(distSq < 15000 && distSq > 100) { p.vx -= dx/distSq * 1.5 * pulse; p.vy -= dy/distSq * 1.5 * pulse; } } }
            if (universeProfile.mutators.includes('Erratic')) { p.vx += (Math.random()-0.5)*0.3; p.vy += (Math.random()-0.5)*0.3; }
            if (universeProfile.mutators.includes('Rainbow') && !p.colorLocked) { p.color = { rgb: { r: 127*(1+Math.sin(tick*0.05 + p.x*0.01)), g: 127*(1+Math.sin(tick*0.05 + p.y*0.01)), b: 127*(1+Math.sin(tick*0.05)) } }; }
            if (universeProfile.mutators.includes('Flickering')) { if(tick % Math.floor(20+p.seed*20) === 0) p.opacity.value = p.opacity.value > 0 ? 0 : pJS.particles.opacity.value; }
            for (const pocket of activeEffects.gravityPockets) { const dx=pocket.x-p.x, dy=pocket.y-p.y; if(dx*dx+dy*dy < pocket.radiusSq) { p.vx += dx * pocket.strength * 0.01; p.vy += dy * pocket.strength * 0.01; } }
            for (const wave of activeEffects.gravityWaves) { const push = Math.sin(tick * wave.frequency) * wave.strength; p.vx += Math.cos(wave.angle) * push; p.vy += Math.sin(wave.angle) * push; }
            if (universeProfile.mutators.includes('Particle Decay')) { p.opacity.value = Math.max(0, p.opacity.value - 0.0005); if (p.opacity.value === 0) { pJS.particles.array.splice(i,1); continue; } }
            if (universeProfile.mutators.includes('Elastic Collisions') && !isPhased) { for(const p2 of pJS.particles.array) { if(p === p2) continue; const dx=p.x-p2.x, dy=p.y-p2.y, distSq=dx*dx+dy*dy; if(distSq < Math.pow(p.radius+p2.radius, 2)) { const angle = Math.atan2(dy,dx); const force = 0.5 / (distSq * 0.01 + 1); p.vx += Math.cos(angle)*force; p.vy += Math.sin(angle)*force; } } }
            if (universeProfile.mutators.includes('Noisy')) { p.vx += (Math.random()-0.5)*0.2; p.vy += (Math.random()-0.5)*0.2; }
            if (universeProfile.mutators.includes('Synchronized')) { const angle = Math.sin(tick * 0.02 + p.seed * 10) * Math.PI; const speed = Math.sqrt(p.vx*p.vx+p.vy*p.vy); p.vx = Math.cos(angle)*speed; p.vy = Math.sin(angle)*speed; }
            if (universeProfile.mutators.includes('Pair Bonding') && !p.bondPartner) { for(const p2 of pJS.particles.array) { if(p === p2 || p2.bondPartner) continue; const dSq=Math.pow(p.x-p2.x,2)+Math.pow(p.y-p2.y,2); if(dSq < 2500) { p.bondPartner = p2; p2.bondPartner = p; break; } } }
            if (p.bondPartner) { const dx = p.bondPartner.x - p.x, dy = p.bondPartner.y - p.y, dSq = dx*dx+dy*dy; if(dSq > 10000) { p.bondPartner.bondPartner = null; p.bondPartner = null; } else { p.vx += dx * 0.001; p.vy += dy * 0.001; } }
            if (universeProfile.mutators.includes('Fragmenting') && Math.random() < 0.0001 && p.radius > 1 && pJS.particles.array.length < pJS.particles.number.value_max) { p.radius /= 2; const newP = pJS.fn.modes.pushParticles(1, {x:p.x, y:p.y})[0]; if(newP) { newP.radius = p.radius; tagParticles([newP], universeProfile, false); } }
            for(const sail of activeEffects.photonSails) { p.vx += Math.cos(sail.angle) * sail.strength; p.vy += Math.sin(sail.angle) * sail.strength; }
            if (universeProfile.mutators.includes('Chaotic Orbits') && pJS.particles.move.attract.enable) { p.vx += (Math.random()-0.5)*0.4; p.vy += (Math.random()-0.5)*0.4; }
            for(const tide of activeEffects.tidalForces) { const pull = (p.y - tide.y) * 0.0001 * tide.strength; p.vx += pull; }
            if (universeProfile.mutators.includes('Self-Propelled')) { const angle = p.seed; p.vx += Math.cos(angle)*0.05; p.vy += Math.sin(angle)*0.05; }
            if (universeProfile.mutators.includes('Phase Scattering') && Math.random() < 0.001) { p.opacity.value = Math.random(); }
            if (universeProfile.mutators.includes('BrownianMotion')) { p.vx += (Math.random()-0.5)*0.8; p.vy += (Math.random()-0.5)*0.8; }
            if (p.isHeavy) { for(const p2 of pJS.particles.array) { if(p === p2) continue; const dx=p.x-p2.x, dy=p.y-p2.y, dSq=dx*dx+dy*dy; if(dSq < 10000) { p2.vx += dx/dSq*p.radius; p2.vy += dy/dSq*p.radius; } } }
            if (universeProfile.mutators.includes('Choral')) { const avg_vx = pJS.particles.array.reduce((acc,p) => acc+p.vx, 0) / pJS.particles.array.length; const avg_vy = pJS.particles.array.reduce((acc,p) => acc+p.vy, 0) / pJS.particles.array.length; p.vx += (avg_vx - p.vx) * 0.001; p.vy += (avg_vy - p.vy) * 0.001; }
            if (universeProfile.mutators.includes('Carnival') && tick % 10 === 0) { p.color = {rgb:{r:Math.random()*255, g:Math.random()*255, b:Math.random()*255}}; p.radius = p.radius_initial * (0.5 + Math.random()); }
            if (universeProfile.mutators.includes('ParticleChains')) { if (!p.chainChild) { for (const p2 of pJS.particles.array) { if (p === p2 || p2.chainParent) continue; const dSq = Math.pow(p.x - p2.x, 2) + Math.pow(p.y - p2.y, 2); if (dSq < 20*20 && !p.chainParent) { p.chainChild = p2; p2.chainParent = p; break; } } } if (p.chainChild) { const dx = p.chainChild.x - p.x; const dy = p.chainChild.y - p.y; const dist = Math.sqrt(dx*dx+dy*dy); if (dist > 50) { p.chainChild.chainParent = null; p.chainChild = null; } else { const restingDist = 20; const force = (dist - restingDist) * 0.01; p.vx += dx / dist * force; p.vy += dy / dist * force; p.chainChild.vx -= dx / dist * force; p.chainChild.vy -= dy / dist * force; pJS.canvas.ctx.strokeStyle = 'rgba(200, 200, 255, 0.2)'; pJS.canvas.ctx.lineWidth = 1; pJS.canvas.ctx.beginPath(); pJS.canvas.ctx.moveTo(p.x, p.y); pJS.canvas.ctx.lineTo(p.chainChild.x, p.chainChild.y); pJS.canvas.ctx.stroke(); } } }

            for (const river of activeEffects.cosmicRivers) { for (let t = 0; t < 1; t += 0.05) { const pt = getBezierXY(t, river.x1, river.y1, river.cx1, river.cy1, river.cx2, river.cy2, river.x2, river.y2); const dSq = Math.pow(p.x - pt.x, 2) + Math.pow(p.y - pt.y, 2); if (dSq < river.width * river.width) { const nextPt = getBezierXY(t + 0.01, river.x1, river.y1, river.cx1, river.cy1, river.cx2, river.cy2, river.x2, river.y2); const riverAngle = Math.atan2(nextPt.y - pt.y, nextPt.x - pt.x); p.vx += Math.cos(riverAngle) * river.strength * 0.05; p.vy += Math.sin(riverAngle) * river.strength * 0.05; break; } } }

            // Apply Player Interaction & Global Forces
            if (!isPhased && !isStasis && !p.isCrystalized && !p.isEntangled) {
                if (isLeftMouseDown) handleActivePower(p, i, pJS, universeProfile.leftClickPower, worldMouse);
                if (isRightMouseDown) handleActivePower(p, i, pJS, universeProfile.rightClickPower, worldMouse);
                for(const well of activeEffects.gravityWells) { const dx = well.x - p.x, dy = well.y - p.y; p.vx += dx * well.strength * 0.01; p.vy += dy * well.strength * 0.01; }
            }
            if(p.isInfected) { for(const p2 of pJS.particles.array) { if(p === p2 || p2.isInfected) continue; const dx=p.x-p2.x, dy=p.y-p2.y, dSq=dx*dx+dy*dy; if(dSq < Math.pow(p.radius+p2.radius+2, 2)) { p2.isInfected=true;p2.color={rgb:{r:255,g:50,b:50}}; } } }

            if (p.radius > p.radius_initial && !universeProfile.mutators.includes('Pulsing Particles')) { p.radius -= 0.05; }
            p.vx *= physics.friction; p.vy *= physics.friction;

            // Torus Field boundary check
            if (universeProfile.mutators.includes('Torus Field')) {
                if (p.x < 0) p.x = pJS.canvas.w; if (p.x > pJS.canvas.w) p.x = 0;
                if (p.y < 0) p.y = pJS.canvas.h; if (p.y > pJS.canvas.h) p.y = 0;
            } else if (universeProfile.mutators.includes('Event Horizon')) {
                if (p.x < 0 || p.x > pJS.canvas.w || p.y < 0 || p.y > pJS.canvas.h) {
                    pJS.particles.array.splice(i, 1);
                    continue;
                }
            }
        }
    }

    // Entangled group physics
    activeEffects.entangledGroups.forEach((group, groupIndex) => {
        group.particles = group.particles.filter(p => p && pJS.particles.array.includes(p)); if(group.particles.length < 2) { activeEffects.entangledGroups.splice(groupIndex,1); return; }
        let currentCX = 0, currentCY = 0; group.particles.forEach(p => { currentCX += p.x; currentCY += p.y; }); currentCX /= group.particles.length;
        group.particles.forEach((p, pIndex) => { const initialVec = group.initialVectors[pIndex]; if(!initialVec) return; const targetX = currentCX + initialVec.x, targetY = currentCY + initialVec.y; p.vx += (targetX - p.x) * 0.05; p.vy += (targetY - p.y) * 0.05; });
    });

    // Anomaly updates
    activeEffects.whiteHoles.forEach(h => { h.tick++; if (h.tick * h.spawnRate > 1 && pJS.particles.array.length < pJS.particles.number.value_max) { h.tick=0; pJS.fn.modes.pushParticles(1, {x:h.x, y:h.y}); } });
    activeEffects.quasars.forEach(q => { q.tick++; if(q.tick > q.period) { q.tick = 0; q.isFiring = true; setTimeout(()=>q.isFiring=false, q.duration*16); } if(q.isFiring && pJS.particles.array.length < pJS.particles.number.value_max) { const newP = pJS.fn.modes.pushParticles(1, {x:q.x, y:q.y})[0]; if(newP){newP.vx = Math.cos(q.angle)*q.strength; newP.vy = Math.sin(q.angle)*q.strength; tagParticles([newP], universeProfile, false);} } });
    activeEffects.blackHoles.forEach(h => { if(h.isWandering) { h.x += (Math.random()-0.5)*0.5; h.y += (Math.random()-0.5)*0.5; if(h.x<0||h.x>pJS.canvas.w||h.y<0||h.y>pJS.canvas.h) {h.x=pJS.canvas.w/2; h.y=pJS.canvas.h/2;} } });
    activeEffects.magneticStorms.forEach(s => { s.lastFlip++; if(s.lastFlip > s.period) { s.lastFlip=0; s.attract = !s.attract; pJS.particles.move.attract.enable = s.attract; } });
    activeEffects.supergiantStars.forEach(s => { s.lastSpawn++; if(s.lastSpawn > s.period && pJS.particles.array.length < pJS.particles.number.value_max) { s.lastSpawn=0; const newP = pJS.fn.modes.pushParticles(1, {x:s.x, y:s.y})[0]; if(newP){newP.vx=(Math.random()-0.5)*5; newP.vy=(Math.random()-0.5)*5; tagParticles([newP], universeProfile, false);} } });
    activeEffects.cosmicGeysers.forEach(g => { g.tick++; if(g.tick > g.period && pJS.particles.array.length < pJS.particles.number.value_max) { g.tick=0; const newP = pJS.fn.modes.pushParticles(1, {x: g.x + (Math.random()-0.5)*g.width, y: g.y})[0]; if(newP) { newP.vy = -g.strength; tagParticles([newP], universeProfile, false); } } });
    activeEffects.temporalRifts.forEach((r, i) => { r.life--; if(r.life <= 0) { activeEffects.temporalRifts.splice(i,1); return; } if(Math.random() < 0.01 && pJS.particles.array.length < pJS.particles.number.value_max) { const newP = pJS.fn.modes.pushParticles(1, {x: r.x, y: r.y})[0]; if(newP) { newP.opacity.value = 0.5; newP.fading = 50; tagParticles([newP], universeProfile, false); } } });
    activeEffects.solarFlares.forEach(f => { f.tick++; if(f.tick > f.period) { f.tick=0; for(let i=0; i<30; i++) { if(pJS.particles.array.length < pJS.particles.number.value_max) { const newP = pJS.fn.modes.pushParticles(1, {x:pJS.canvas.w/2, y:pJS.canvas.h/2})[0]; if(newP) { newP.vx = Math.cos(f.angle)*f.strength; newP.vy = Math.sin(f.angle)*f.strength; tagParticles([newP], universeProfile, false); } } } } });
    activeEffects.spacetimeFoam.forEach((f,i) => { f.life--; if(f.life <= 0) activeEffects.spacetimeFoam.splice(i,1); });
    activeEffects.cosmicNurseries.forEach(n => { n.tick++; if(n.tick > n.period && pJS.particles.array.length < pJS.particles.number.value_max) { n.tick=0; const newP = pJS.fn.modes.pushParticles(1, {x: n.x + (Math.random()-0.5)*n.radius, y: n.y + (Math.random()-0.5)*n.radius})[0]; if(newP) { newP.vx = (Math.random()-0.5)*2; newP.vy = (Math.random()-0.5)*2; tagParticles([newP], universeProfile, false); } } });

    if (pJS.particles.array.length > pJS.particles.number.value_max) {
        pJS.particles.array.splice(0, pJS.particles.array.length - pJS.particles.number.value_max);
    }

    // --- Drawing & Final Update ---
    drawEffects(pJS.canvas.ctx);
    pJS.fn.particlesUpdate();
    pJS.fn.particlesDraw();

    requestAnimationFrame(() => update(pJS));
}