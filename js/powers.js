/**
 * @file powers.js
 * @description This file contains the logic for player-activated powers.
 */

import { activeEffects, universeProfile, isInitialLoad } from './state.js';
import { getTick } from './state.js';
import { tagParticles } from './utils.js';

/**
 * Handles the continuous application of a player's power (e.g., holding down the mouse button).
 * @param {object} p - The particle to affect.
 * @param {number} i - The index of the particle in the array.
 * @param {object} pJS - The particles.js instance.
 * @param {string} powerName - The name of the power being used.
 * @param {object} worldMouse - The mouse coordinates.
 */
export function handleActivePower(p, i, pJS, powerName, worldMouse) {
    const dx = worldMouse.x - p.x, dy = worldMouse.y - p.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq) || 1;
    const tick = getTick();

    switch(powerName) {
        case 'comet': case 'symbiote': p.vx += dx * 0.01; p.vy += dy * 0.01; break;
        case 'forceField': case 'sculptor': if (distSq < 200*200) { const f = -10/dist; p.vx += dx * f * 0.1; p.vy += dy * f * 0.1; } break;
        case 'setOrbit': if (distSq < 200*200) { p.vx += dy * 0.015; p.vy -= dx * 0.015; } break;
        case 'shaper': if (distSq < 150*150) { p.vx += dy * 0.01; p.vy -= dx * 0.01; } break;
        case 'chainLightning': if (distSq < 200*200) { p.vx += (Math.random()-0.5)*0.5; p.vy += (Math.random()-0.5)*0.5; } break;
        case 'void': if (distSq < 100*100) { if (p.radius > 0.5) p.radius -= 0.1; else pJS.particles.array.splice(i, 1); } break;
        case 'scribe': if (distSq < 150*150) { const angle = Math.atan2(p.vy, p.vx), snappedAngle = Math.round(angle/(Math.PI/4))*(Math.PI/4), speed = Math.sqrt(p.vx*p.vx+p.vy*p.vy); p.vx = Math.cos(snappedAngle)*speed; p.vy = Math.sin(snappedAngle)*speed; } break;
        case 'glaze': if (distSq < 100*100 && p.radius < 10) p.radius += 0.1; break;
        case 'shatter': if (distSq < 150*150 && Math.random() > 0.9) { p.vx += (Math.random()-0.5)*1.5; p.vy += (Math.random()-0.5)*1.5; if (p.radius > 1) p.radius *= 0.95; } break;
        case 'refractor': if (distSq < 200*200) { p.vx += (dy / dist) * 0.2; p.vy -= (dx / dist) * 0.2; } break;
        case 'infect': if (distSq < 150*150) { p.isInfected = true; p.color = {rgb:{r:255,g:50,b:50}}; } break;
        case 'tendril': if (distSq < 20*20 && pJS.particles.array.length < pJS.particles.number.value_max) { pJS.fn.modes.pushParticles(1, worldMouse); const newP = pJS.particles.array[pJS.particles.array.length-1]; newP.vx = p.vx; newP.vy = p.vy; } break;
        case 'accelerate': if (distSq < 150*150) { p.vx *= 1.01; p.vy *= 1.01; } break;
        case 'voidRift': if (distSq < 150*150) { p.radius -= 0.05; p.vx += dx/dist * 0.05; p.vy += dy/dist * 0.05; if(p.radius <= 0) pJS.particles.array.splice(i,1); } break;
        case 'echoPulse': if(tick % 10 === 0) activeEffects.echoPulses.push({x: worldMouse.x, y: worldMouse.y, radiusSq: 250*250, maxLife: 120, life: 120}); break;
        case 'phaseZone': if(tick % 10 === 0) activeEffects.phaseZones.push({x: worldMouse.x, y: worldMouse.y, radiusSq: 150*150, maxLife: 300, life: 300}); break;
        case 'whisper': if (distSq < 200*200) { p.vx += dx * 0.001; p.vy += dy * 0.001; } break;
        case 'fade': if (distSq < 150*150) { p.fading = 100; } break;
        case 'paint': if (distSq < 150*150) { p.color = { rgb: {r: Math.random()*255, g: Math.random()*255, b: Math.random()*255 } }; p.colorLocked = true; } break;
        case 'observe': if(distSq < 150*150){ p.vx *= 0.8; p.vy *= 0.8; if(p.radius < p.radius_initial*1.5) p.radius+=0.1; } break;
        case 'quantumTunnel': if(distSq < 150*150 && Math.random()<0.01){p.x += (Math.random()-0.5)*80; p.y += (Math.random()-0.5)*80;} break;
        case 'resonate': if(distSq < 150*150){ p.vx += Math.sin(tick*0.8+p.seed)*0.1; p.vy += Math.cos(tick*0.8+p.seed)*0.1; } break;
        case 'dampen': if(distSq < 150*150){ p.vx *= 0.95; p.vy *= 0.95; } break;
        case 'smudge': if(distSq < 150*150){ if(p.radius < 15) p.radius += 0.05; p.opacity.value = Math.max(0.1, p.opacity.value*0.99); } break;
        case 'draw': if(distSq < 20*20 && pJS.particles.array.length < pJS.particles.number.value_max) { const newP = {...p, x: worldMouse.x+(Math.random()-0.5)*5, y: worldMouse.y+(Math.random()-0.5)*5}; pJS.particles.array.push(newP); tagParticles([newP], universeProfile, isInitialLoad); } break;
        case 'consume': if (distSq < 150*150) { p.isConsumed = 100; } break;
        case 'maddeningWhisper': if (distSq < 200*200) { p.vx += (Math.random() - 0.5) * 0.4; p.vy += (Math.random() - 0.5) * 0.4; } break;
        case 'smear': if (distSq < 150*150) { p.vx += (worldMouse.x - p.x) * 0.02; p.vy += (worldMouse.y - p.y) * 0.02; p.color = { rgb: { r:255, g:255, b:255 } }; } break;
        case 'dab': if (distSq < 20*20 && pJS.particles.array.length < pJS.particles.number.value_max) { const newP = pJS.fn.modes.pushParticles(1, worldMouse)[0]; if(newP) { newP.color = {rgb: {r:Math.random()*255,g:Math.random()*255,b:Math.random()*255}}; tagParticles([newP], universeProfile, isInitialLoad); } } break;
        case 'swarmFollow': if (distSq < 400*400) { p.vx += dx * 0.005; p.vy += dy * 0.005; } break;
        case 'lavaJet': if (distSq < 30*30 && pJS.particles.array.length < pJS.particles.number.value_max) { const newP = pJS.fn.modes.pushParticles(1, worldMouse)[0]; if(newP){ newP.color = {rgb:{r:255,g:50,b:0}}; newP.vx = (Math.random()-0.5)*5; newP.vy = (Math.random()-0.5)*5; tagParticles([newP], universeProfile, isInitialLoad); newP.fading = 100; } } break;
        case 'glacier': if(distSq < 200*200) { p.vx = (p.vx * 9 + 0.5) / 10; p.vy = (p.vy * 9 + 0.2) / 10; } break;
        case 'runeScribe': if(distSq < 150*150) { p.vx += dy/dist * 0.3; p.vy -= dx/dist * 0.3; if(tick % 5 === 0) p.color = {rgb:{r:200,g:100,b:255}}; } break;
        case 'gatherDust': if (distSq < 250*250) { const force = 1 / dist; p.vx += dx * force * 0.01; p.vy += dy * force * 0.01; } break;
        case 'ignite': if (distSq < 100*100) { p.color = {rgb:{r:255,g:220,b:180}}; p.radius += 0.05; } break;
        case 'lure': if (distSq < 300*300) { const force = 1 / dist; p.vx += dx * force * 0.02; p.vy += dy * force * 0.02; p.vx *= 0.99; p.vy *= 0.99; } break;
        case 'crush': if (distSq < 100*100) { p.vx += dx/dist * -0.5; p.vy += dy/dist * -0.5; if(p.radius > 0.5) p.radius -= 0.02; } break;
        case 'align': if (distSq < 200*200) { const grid = 50; p.x += (Math.round(p.x/grid)*grid - p.x)*0.1; p.y += (Math.round(p.y/grid)*grid - p.y)*0.1; } break;
        case 'regrid': if (distSq < 200*200) { const speed = Math.sqrt(p.vx*p.vx+p.vy*p.vy); const angle = Math.atan2(p.vy,p.vx); const snapped = Math.round(angle/(Math.PI/2))*(Math.PI/2); p.vx = Math.cos(snapped)*speed; p.vy = Math.sin(snapped)*speed; } break;
        case 'sporeBurst': if (distSq < 20*20 && Math.random() < 0.1 && pJS.particles.array.length < pJS.particles.number.value_max) { const newP = pJS.fn.modes.pushParticles(1, {x:p.x, y:p.y})[0]; if(newP){ newP.isInfected = true; tagParticles([newP], universeProfile, isInitialLoad); } } break;
        case 'tangle': if (distSq < 150*150) { for(const p2 of pJS.particles.array) { if(p===p2) continue; const d2Sq=Math.pow(p.x-p2.x,2)+Math.pow(p.y-p2.y,2); if(d2Sq < 2500) { p.vx -= (p2.x-p.x)*0.001; p.vy -= (p2.y-p.y)*0.001; } } } break;
        case 'ripple': if (tick % 8 === 0) { activeEffects.echoPulses.push({x: worldMouse.x, y: worldMouse.y, radiusSq: 50*50, maxLife: 60, life: 60}); } break;
        case 'freeze': if (distSq < 150*150) { p.vx *= 0.9; p.vy *= 0.9; } break;
        case 'fold': if (distSq < 150*150) { p.vx += dy/dist * 0.4; p.vy -= dx/dist * 0.4; } break;
        case 'crease': if (distSq < 150*150) { p.vx = 0; } break;
        case 'prism': if (distSq < 150*150) { p.color = {rgb:{r:Math.random()*255, g:Math.random()*255, b:Math.random()*255}}; } break;
        case 'focus': if (distSq < 150*150) { p.vx += dx/dist * 0.2; p.vy += dy/dist * 0.2; p.radius = Math.min(p.radius_initial*2, p.radius+0.05); } break;
        case 'weaveThread': if (distSq < 150*150) { for(const p2 of pJS.particles.array) { if(p === p2) continue; const d2Sq=Math.pow(p.x-p2.x,2)+Math.pow(p.y-p2.y,2); if(d2Sq < 40*40) { activeEffects.silkThreads.push({p1: p, p2: p2, life: 240}); break; } } } break;
        case 'stokeFire': if (distSq < 150*150) { p.vx *= 1.05; p.vy *= 1.05; if(p.radius < p.radius_initial * 2) p.radius += 0.05; } break;
        case 'createStar': if (distSq < 20*20 && pJS.particles.array.length < pJS.particles.number.value_max) { const newP = pJS.fn.modes.pushParticles(1, worldMouse)[0]; if(newP) { newP.life = 600; tagParticles([newP], universeProfile, isInitialLoad); } } break;
        case 'stirGoo': if (distSq < 200*200) { for(const p2 of pJS.particles.array) { if(p === p2) continue; const d2Sq=Math.pow(p.x-p2.x,2)+Math.pow(p.y-p2.y,2); if(d2Sq < 2500) { p.vx -= (p2.x-p.x)*0.005; p.vy -= (p2.y-p.y)*0.005; } } } break;
        case 'exorcise': if (distSq < 150*150) { p.vx += dx/dist * 0.5; p.vy += dy/dist * 0.5; p.opacity.value = Math.min(1, p.opacity.value + 0.01); } break;
        case 'growCoral': if (distSq < 100 * 100 && !p.isCoral) { p.isCoral = true; let closestCoral = null; let closestDistSq = Infinity; activeEffects.coral.forEach(coralP => { if (!coralP) return; const dSq = Math.pow(p.x - coralP.x, 2) + Math.pow(p.y - coralP.y, 2); if (dSq < 150*150 && dSq < closestDistSq) { closestDistSq = dSq; closestCoral = coralP; } }); activeEffects.coral.push(p); if (closestCoral) { activeEffects.coralConnections.push({ p1: p, p2: closestCoral }); } } break;
        case 'schooling': if (distSq < 300 * 300) { const force = 1 / dist; p.vx += dx * force * 0.03; p.vy += dy * force * 0.03; } break;
    }
}

/**
 * Handles single-click powers.
 * @param {string} powerName - The name of the power to trigger.
 * @param {object} pJS - The particles.js instance.
 * @param {object} worldMouse - The mouse coordinates.
 */
export function handleClickPower(powerName, pJS, worldMouse) {
    switch(powerName) {
        case 'supernova': for (const p of pJS.particles.array) { const dx=p.x-worldMouse.x, dy=p.y-worldMouse.y, dist = Math.sqrt(dx*dx+dy*dy)||1; if (dist < 250) { p.vx += dx/dist*30; p.vy += dy/dist*30; } } break;
        case 'gravityWell': if (!activeEffects.gravityWells.some((w,i)=>{const dSq=Math.pow(w.x-worldMouse.x,2)+Math.pow(w.y-worldMouse.y,2); if(dSq<30*30){activeEffects.gravityWells.splice(i,1);return true;} return false;})) { activeEffects.gravityWells.push({x: worldMouse.x, y: worldMouse.y, strength: 0.2}); } break;
        case 'toggleLinks': pJS.particles.line_linked.enable = !pJS.particles.line_linked.enable; pJS.fn.particlesRefresh(); break;
        case 'harvest': for(let i=pJS.particles.array.length-1; i>=0; i--){ const p = pJS.particles.array[i], distSq = Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2); if(distSq < 100*100){ pJS.particles.array.splice(i,1); pJS.fn.modes.pushParticles(1,worldMouse); } } break;
        case 'stasisField': activeEffects.stasisFields.push({x: worldMouse.x, y: worldMouse.y, r: 150, maxLife: 300, life: 300}); break;
        case 'unravel': for(const p of pJS.particles.array) { if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) { p.unravelling = 120; } } break;
        case 'glitch': for(const p of pJS.particles.array) { if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 100) { p.x = Math.random() * pJS.canvas.w; p.y = Math.random() * pJS.canvas.h; break; } } break;
        case 'crystalize': for(const p of pJS.particles.array) { if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) { p.isCrystalized = true; p.color = {rgb:{r:200, g:220, b:255}}; } } break;
        case 'wormhole': const exitPoint = { x: Math.random() * pJS.canvas.w, y: Math.random() * pJS.canvas.h }; activeEffects.wormholes.push({entry: {...worldMouse}, exit: exitPoint, life: 120}); for(const p of pJS.particles.array){ if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 100) { p.x = exitPoint.x + (Math.random()-0.5)*50; p.y = exitPoint.y + (Math.random()-0.5)*50; } } break;
        case 'entangle': { const group = [], radiusSq = 150*150; let cX = 0, cY = 0; for (const p of pJS.particles.array) { const distSq = Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2); if (distSq < radiusSq && !p.isEntangled) { group.push(p); cX += p.x; cY += p.y; } } if (group.length > 1) { cX /= group.length; cY /= group.length; const newGroup = { particles: [], initialVectors: [] }; group.forEach(p => { p.isEntangled = true; p.colorLocked = true; p.color = {rgb:{r:180,g:255,b:180}}; newGroup.particles.push(p); newGroup.initialVectors.push({ x: p.x - cX, y: p.y - cY }); }); activeEffects.entangledGroups.push(newGroup); } break; }
        case 'decohere': for (const p of pJS.particles.array) { if (Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) { p.isEntangled = false; p.vx += (Math.random()-0.5)*10; p.vy += (Math.random()-0.5)*10; } } break;
        case 'shockwave': for (const p of pJS.particles.array) { const dx = p.x-worldMouse.x, dy=p.y-worldMouse.y, d = Math.sqrt(dx*dx+dy*dy)||1; if (d > 100 && d < 130) { p.vx += dx/d*30; p.vy += dy/d*30; } } break;
        case 'silence': for (const p of pJS.particles.array) { if (Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) { p.vx = 0; p.vy = 0; } } break;
        case 'splatter': pJS.fn.modes.pushParticles(15, worldMouse); const newParticles = pJS.particles.array.slice(-15); newParticles.forEach(p => { p.color = { rgb: {r: Math.random()*255, g: Math.random()*255, b: Math.random()*255 } }; tagParticles([p], universeProfile, isInitialLoad); p.radius *= 1.5; }); break;
        case 'blot': for(let i=pJS.particles.array.length-1; i>=0; i--){ const p = pJS.particles.array[i]; if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 100) pJS.particles.array.splice(i,1); } break;
        case 'gaze': for (const p of pJS.particles.array) { if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) { p.vx = 0; p.vy = 0; } } break;
        case 'realityTear': for(let i=0; i<5; i++) { if (pJS.particles.array.length < pJS.particles.number.value_max) pJS.fn.modes.pushParticles(1, {x: worldMouse.x + (Math.random()-0.5)*150, y: worldMouse.y + (Math.random()-0.5)*150}); } break;
        case 'paletteKnife': for(let i=pJS.particles.array.length-1; i>=0; i--){ const p = pJS.particles.array[i]; if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 100) { p.vx += (Math.random()-0.5)*15; p.vy += (Math.random()-0.5)*15; } } break;
        case 'wash': for(const p of pJS.particles.array) { p.colorLocked = false; p.opacity.value = Math.max(0.1, p.opacity.value - 0.2); } break;
        case 'disperse': for (const p of pJS.particles.array) { const dx=p.x-worldMouse.x, dy=p.y-worldMouse.y, dist = Math.sqrt(dx*dx+dy*dy)||1; if (dist < 250) { p.vx += dx/dist*15; p.vy += dy/dist*15; } } break;
        case 'cool': for(const p of pJS.particles.array) { if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) { p.vx *= 0.1; p.vy *= 0.1; p.color={rgb:{r:80,g:80,b:80}}; } } break;
        case 'flashFreeze': for(const p of pJS.particles.array) { if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) { p.vx=0; p.vy=0; p.isCrystalized = true; p.color={rgb:{r:200, g:220, b:255}}; } } break;
        case 'polymorph': for(const p of pJS.particles.array) { if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) { p.shape = ['circle', 'triangle', 'edge', 'star', 'polygon'][Math.floor(Math.random()*5)]; } } pJS.fn.particlesRefresh(); break;
        case 'whiteHoleSpawn': activeEffects.whiteHoles.push({ x: worldMouse.x, y: worldMouse.y, strength: 4 + Math.random()*8, spawnRate: 0.05 + Math.random()*0.15, tick: 0 }); break;
        case 'pressureWave': for(const p of pJS.particles.array) { const dx=p.x-worldMouse.x, dy=p.y-worldMouse.y, d=Math.sqrt(dx*dx+dy*dy)||1; if(d < 300) { p.vx += dx/d * 20; p.vy += dy/d * 20; } } break;
        case 'overgrow': for(let i=0; i<10; i++) { if(pJS.particles.array.length < pJS.particles.number.value_max) pJS.fn.modes.pushParticles(1, worldMouse); } break;
        case 'decompose': for(const p of pJS.particles.array) { if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) p.fading = 100; } break;
        case 'paperTear': for(let i=pJS.particles.array.length-1; i>=0; i--) { const p=pJS.particles.array[i]; if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 100) pJS.particles.array.splice(i,1); } break;
        case 'smooth': for(const p of pJS.particles.array) { if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) { p.vx *= 0.5; p.vy *= 0.5; } } break;
        case 'aberrate': for(const p of pJS.particles.array) { if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) { p.x += (Math.random()-0.5)*10; p.y += (Math.random()-0.5)*10; } } break;
        case 'pullThreads': activeEffects.silkThreads.forEach(t => { const midX = (t.p1.x+t.p2.x)/2, midY = (t.p1.y+t.p2.y)/2; const dx=worldMouse.x-midX, dy=worldMouse.y-midY, dSq=dx*dx+dy*dy; if(dSq < 150*150) { t.p1.vx += dx*0.002; t.p1.vy += dy*0.002; t.p2.vx += dx*0.002; t.p2.vy += dy*0.002; } }); break;
        case 'quench': for(const p of pJS.particles.array) { if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) { p.vx *= 0.5; p.vy *= 0.5; if(p.radius > p.radius_initial) p.radius -= 0.1; } } break;
        case 'connectConstellation': { const inRange = []; for (const p of pJS.particles.array) { if (p.life && Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) inRange.push(p); } if(inRange.length > 1) { const p1 = inRange[Math.floor(Math.random()*inRange.length)]; let p2 = inRange[Math.floor(Math.random()*inRange.length)]; while(p1===p2) p2 = inRange[Math.floor(Math.random()*inRange.length)]; activeEffects.silkThreads.push({p1: p1, p2: p2, life: 400}); } } break;
        case 'dissolveGoo': for(const p of pJS.particles.array) { if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) { p.fading = 100; } } break;
        case 'materialize': for(const p of pJS.particles.array) { if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) { p.opacity.value = Math.min(1, p.opacity.value + 0.1); } } break;
    }
}