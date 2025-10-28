/**
 * @file drawing.js
 * @description This file contains functions for drawing visual effects on the canvas.
 */

import { activeEffects, getTick, universeProfile } from './state.js';

/**
 * Draws all active visual effects onto the canvas.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 */
export function drawEffects(ctx) {
    const tick = getTick();

    // Apply a global bloom effect for certain aesthetics
    if (universeProfile.blueprintName === 'Aether' || universeProfile.blueprintName === 'VoidTouched' || universeProfile.blueprintName === 'ArcaneCodex') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.filter = 'blur(4px)';
    }

    activeEffects.nebulas.forEach(n => { const grad = ctx.createRadialGradient(n.x, n.y, n.radius/4, n.x, n.y, n.radius); grad.addColorStop(0, n.color.replace('0.15', '0.3')); grad.addColorStop(1, n.color.replace('0.15', '0')); ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(n.x, n.y, n.radius, 0, 2*Math.PI); ctx.fill(); });
    activeEffects.pulsars.forEach(p => { p.angle += 0.05; ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 2*Math.PI); ctx.fill(); for(let i=0; i<2; i++) { const angle = p.angle + i*Math.PI; const grad = ctx.createLinearGradient(p.x, p.y, p.x+Math.cos(angle)*1000, p.y+Math.sin(angle)*1000); grad.addColorStop(0, 'rgba(255,255,255,0.2)'); grad.addColorStop(1, 'rgba(255,255,255,0)'); ctx.strokeStyle=grad; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x+Math.cos(angle)*1000, p.y+Math.sin(angle)*1000); ctx.stroke(); } });
    activeEffects.blackHoles.forEach(h => { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(h.x, h.y, h.eventHorizon, 0, 2*Math.PI); ctx.fill(); const grad = ctx.createRadialGradient(h.x,h.y,h.eventHorizon,h.x,h.y,h.eventHorizon+5); grad.addColorStop(0, 'rgba(255,200,100,0.8)'); grad.addColorStop(1, 'rgba(255,200,100,0)'); ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.stroke(); });
    activeEffects.whiteHoles.forEach(h => { ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5*Math.sin(tick*0.1)})`; ctx.beginPath(); ctx.arc(h.x, h.y, 10, 0, 2*Math.PI); ctx.fill(); });
    activeEffects.wormholes.forEach((w,i) => { w.life--; if(w.life <= 0) { activeEffects.wormholes.splice(i,1); return; } ctx.strokeStyle=`rgba(150, 100, 255, ${w.life/120})`; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(w.entry.x,w.entry.y,15,0,2*Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(w.exit.x,w.exit.y,15,0,2*Math.PI); ctx.stroke(); });
    activeEffects.phaseZones.forEach((z, i) => { z.life--; if (z.life <= 0) { activeEffects.phaseZones.splice(i, 1); } ctx.strokeStyle=`rgba(180, 200, 255, ${0.1 + (z.life / z.maxLife)*0.3})`; ctx.setLineDash([15, 10]); ctx.lineWidth=2; ctx.beginPath(); ctx.arc(z.x,z.y,Math.sqrt(z.radiusSq),0,2*Math.PI); ctx.stroke(); ctx.setLineDash([]); });
    activeEffects.stasisFields.forEach((f, i) => { f.life--; if (f.life <= 0) { activeEffects.stasisFields.splice(i, 1); } ctx.strokeStyle=`rgba(255, 255, 150, ${0.1 + (f.life / f.maxLife)*0.4})`; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.95 + 0.05 * Math.sin(tick*0.1)), 0, 2*Math.PI); ctx.stroke(); });
    activeEffects.cosmicWebs.forEach(web => { ctx.strokeStyle = `rgba(180, 220, 255, 0.1)`; ctx.lineWidth = 1; for(let i=0; i<web.nodes.length; i++) { for(let j=i+1; j<web.nodes.length; j++) { ctx.beginPath(); ctx.moveTo(web.nodes[i].x, web.nodes[i].y); ctx.lineTo(web.nodes[j].x, web.nodes[j].y); ctx.stroke(); } } });
    activeEffects.quasars.forEach(q => { ctx.fillStyle='rgba(255,255,200,0.8)'; ctx.beginPath(); ctx.arc(q.x, q.y, 8, 0, 2*Math.PI); ctx.fill(); if(q.isFiring) { const grad = ctx.createLinearGradient(q.x, q.y, q.x+Math.cos(q.angle)*1000, q.y+Math.sin(q.angle)*1000); grad.addColorStop(0, 'rgba(255,255,200,0.5)'); grad.addColorStop(1, 'rgba(255,255,200,0)'); ctx.strokeStyle=grad; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x+Math.cos(q.angle)*1000, q.y+Math.sin(q.angle)*1000); ctx.stroke(); } });
    activeEffects.cosmicRifts.forEach(r => { ctx.strokeStyle=`rgba(200, 150, 255, 0.5)`; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(r.x1,r.y1,r.width,0,2*Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(r.x2,r.y2,r.width,0,2*Math.PI); ctx.stroke(); });
    activeEffects.ionClouds.forEach(c => { const grad = ctx.createRadialGradient(c.x, c.y, c.radius/2, c.x, c.y, c.radius); grad.addColorStop(0, 'rgba(200, 220, 255, 0.0)'); grad.addColorStop(1, `rgba(200, 220, 255, 0.2)`); ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, 2*Math.PI); ctx.fill(); });
    activeEffects.supergiantStars.forEach(s => { ctx.fillStyle=`rgba(255, 200, 180, ${0.5 + 0.5*Math.sin(tick*0.05)})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, 2*Math.PI); ctx.fill(); });
    activeEffects.crystallineFields.forEach(f => { ctx.strokeStyle=`rgba(180, 220, 255, 0.1)`; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(f.x,f.y,f.radius,0,2*Math.PI); ctx.stroke(); });
    activeEffects.temporalRifts.forEach(r => { ctx.strokeStyle=`rgba(255, 100, 100, ${0.1 + (r.life / r.maxLife)*0.2})`; ctx.setLineDash([5, 5]); ctx.lineWidth=1; ctx.beginPath(); ctx.arc(r.x,r.y,r.radius,0,2*Math.PI); ctx.stroke(); ctx.setLineDash([]); });
    activeEffects.negativeSpaces.forEach(s => { ctx.fillStyle=`#000`; ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, 2*Math.PI); ctx.fill(); });
    activeEffects.particleAccelerators.forEach(a => { ctx.strokeStyle=`rgba(255, 255, 100, 0.3)`; ctx.lineWidth=20; ctx.beginPath(); ctx.arc(a.x,a.y,a.radius,0,2*Math.PI); ctx.stroke(); });
    activeEffects.spacetimeFoam.forEach(f => { ctx.fillStyle=`rgba(200, 200, 255, ${0.05 + (f.life/f.maxLife)*0.1})`; ctx.beginPath(); ctx.arc(f.x,f.y,f.radius,0,2*Math.PI); ctx.fill(); });
    activeEffects.echoingVoids.forEach(e => { e.history.forEach((h,i) => { ctx.fillStyle=`rgba(${h.color.r}, ${h.color.g}, ${h.color.b}, ${i/e.history.length*0.5})`; ctx.beginPath(); ctx.arc(h.x,h.y,2,0,2*Math.PI); ctx.fill(); }); });
    activeEffects.cosmicNurseries.forEach(n => { const grad = ctx.createRadialGradient(n.x, n.y, n.radius/2, n.x, n.y, n.radius); grad.addColorStop(0, 'rgba(255, 200, 255, 0.2)'); grad.addColorStop(1, 'rgba(255, 200, 255, 0)'); ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(n.x, n.y, n.radius, 0, 2*Math.PI); ctx.fill(); });
    activeEffects.coralConnections.forEach(conn => { if (conn.p1 && conn.p2) { ctx.strokeStyle = 'rgba(200, 255, 220, 0.5)'; ctx.lineWidth = conn.p1.radius/2; ctx.beginPath(); ctx.moveTo(conn.p1.x, conn.p1.y); ctx.lineTo(conn.p2.x, conn.p2.y); ctx.stroke(); } });
    activeEffects.cosmicRivers.forEach(river => { ctx.strokeStyle = 'rgba(150, 200, 255, 0.1)'; ctx.lineWidth = river.width; ctx.beginPath(); ctx.moveTo(river.x1, river.y1); ctx.bezierCurveTo(river.cx1, river.cy1, river.cx2, river.cy2, river.x2, river.y2); ctx.stroke(); ctx.lineWidth = river.width/4; ctx.strokeStyle = 'rgba(200, 220, 255, 0.1)'; ctx.stroke(); });
}