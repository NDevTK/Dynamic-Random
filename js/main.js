/**
 * @file main.js
 * @description This file contains the core logic for the Celestial Canvas project.
 * It handles the main simulation loop, universe generation, user interaction,
 * and rendering of the particle system.
 */
import { universeBlueprints, mutators, anomalies } from './effects.js';

const baseConfig = { "particles": { "number": { "value": 150, "density": { "enable": true, "value_area": 800 } }, "color": { "value": "#ffffff" }, "shape": { "type": "circle", "polygon": {"nb_sides": 5}, "character": {"value": ["*"]} }, "opacity": { "value": 0.5, "random": true }, "size": { "value": 3, "random": true }, "line_linked": { "enable": false }, "move": { "enable": true, "speed": 4, "direction": "none", "straight": false, "out_mode": "out", "attract": { "enable": false }, "trail": {"enable": false, "fillColor": "#000", "length": 10} } }, "interactivity": { "detect_on": "canvas", "events": { "onhover": { "enable": true, "mode": "bubble" }, "resize": true }, "modes": { "bubble": { "distance": 200, "size": 8, "duration": 2 } } }, "retina_detect": true };

document.addEventListener('DOMContentLoaded', () => {
    // --- Global State ---
    const ui = {
        body: document.body,
        cursorGlow: document.getElementById('cursor-glow'),
        container: document.getElementById('ui-container'),
        blueprint: document.getElementById('blueprint-display'),
        seed: document.getElementById('seed-capture'),
        mutators: document.getElementById('mutator-display'),
        anomaly: document.getElementById('anomaly-display'),
        canvasContainer: document.getElementById('canvas-container')
    };

    let physics = { friction: 0.98 };
    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let isLeftMouseDown = false, isRightMouseDown = false;
    let tick = 0;

    let universeState = { energy: 0, state: 'Stable' };
    let universeProfile = {};
    let activeEffects = {};

    let currentSeed = '', cataclysmInProgress = false, isInitialLoad = true;
    let activeIntervals = [], seedCopyTimeout;

    // --- Seeding Engine ---
    /**
     * Creates a seeded pseudo-random number generator.
     * @param {number} a - The seed.
     * @returns {function(): number} A function that returns a random number between 0 and 1.
     */
    function mulberry32(a) { return function() { var t=a+=0x6D2B79F5; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; } }
    /**
     * Converts a string to a 32-bit integer seed.
     * @param {string} str - The string to convert.
     * @returns {number} A 32-bit integer seed.
     */
    function stringToSeed(str) { let h=0; for(let i=0;i<str.length;i++){h=(Math.imul(31,h)+str.charCodeAt(i))|0} return h; }
    /**
     * Generates a random, human-readable seed string.
     * @returns {string} A random seed string in the format 'WORD-WORD-NUMBER'.
     */
    function generateRandomSeed() { const w1 = ['COSMIC','ASTRAL','VOID','STAR','CHRONO','PHANTOM','CRYSTAL','DEEPSEA','BIO', 'AETHER', 'SONIC', 'QUANTUM', 'ELDRITCH', 'PAINTERLY', 'ARCANE', 'MOLTEN', 'GLACIAL', 'SWARM', 'FORGED']; const w2 = ['DRIFT','ECHO','FLARE','PULSE','SONG','WARP','VORTEX','SHARD','CURRENT','SPORE', 'VEIL', 'HUM', 'FOAM', 'INK', 'MAW', 'STROKE', 'CODEX', 'HEART', 'HIVE', 'CORE', 'RUNE']; return `${w1[Math.floor(Math.random()*w1.length)]}-${w2[Math.floor(Math.random()*w2.length)]}-${Math.floor(Math.random()*9000)+1000}`; }

    // --- Main Generation Function ---
    /**
     * Generates a new universe based on a seed.
     * This function sets up the universe's blueprint, mutators, anomalies, and aesthetics.
     * @param {object} pJS - The particles.js instance.
     * @param {string} seed - The seed string for the universe.
     */
    const generateUniverse = (pJS, seed) => {
        resetState();
        currentSeed = seed;
        const seededRandom = mulberry32(stringToSeed(seed));

        const blueprintNames = Object.keys(universeBlueprints);
        const blueprintName = blueprintNames[Math.floor(seededRandom() * blueprintNames.length)];
        const blueprint = universeBlueprints[blueprintName];

        universeProfile = {
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
        physics.friction = blueprint.aesthetic.physics.friction;

        // Apply Mutators
        const mutatorKeys = Object.keys(mutators);
        const numMutators = seededRandom() > 0.85 ? 2 : (seededRandom() > 0.4 ? 1 : 0);
        while(universeProfile.mutators.length < numMutators) {
            const mutatorName = mutatorKeys[Math.floor(seededRandom() * mutatorKeys.length)];
            if (!universeProfile.mutators.includes(mutatorName)) {
                universeProfile.mutators.push(mutatorName);
                mutators[mutatorName](pJS, seededRandom, activeEffects, physics);
            }
        }

        // Spawn Anomaly
        if (seededRandom() > 0.6) {
            const anomalyKeys = Object.keys(anomalies);
            const anomalyName = anomalyKeys[Math.floor(seededRandom() * anomalyKeys.length)];
            universeProfile.anomaly = anomalyName;
            anomalies[anomalyName](pJS, seededRandom, activeEffects);
        }

        universeState = { energy: 0, state: 'Stable', maxEnergy: 4000 + seededRandom() * 2000 };

        // Update UI
        history.replaceState(null, '', `?seed=${currentSeed}`);
        ui.blueprint.innerText = `Blueprint: ${blueprintName}`;
        ui.seed.innerText = `Seed: ${currentSeed}`;
        ui.mutators.innerText = universeProfile.mutators.length ? `Mutators: ${universeProfile.mutators.join(', ')}` : 'Mutators: None';
        ui.anomaly.innerText = universeProfile.anomaly ? `Anomaly: ${universeProfile.anomaly}` : 'Anomaly: None';
        setTimeout(() => { ui.container.classList.add('visible'); }, 500);

        pJS.fn.particlesRefresh();
        tagParticles(pJS.particles.array);

        if (isInitialLoad) {
            pJS.particles.array.forEach(p => {
                p.x = pJS.canvas.w / 2; p.y = pJS.canvas.h / 2;
                const angle = Math.random()*2*Math.PI; const force = Math.random()*20+5;
                p.vx = Math.cos(angle)*force; p.vy = Math.sin(angle)*force;
            });
            isInitialLoad = false;
        }
    };

    // --- Main Update Loop ---
    /**
     * The main update loop, called on every frame.
     * This function handles particle physics, user interaction, anomalies, and cataclysms.
     */
    const update = () => {
        tick++;
        if (cataclysmInProgress) { requestAnimationFrame(update); return; }

        // State & Energy Management
        if (isLeftMouseDown || isRightMouseDown) { universeState.energy += 10; }
        else { universeState.energy = Math.max(0, universeState.energy - 5); }

        if (universeState.energy > universeState.maxEnergy && universeState.state !== 'Unstable') {
            universeState.state = 'Unstable';
            triggerCataclysm(pJS);
        } else if (universeState.energy > universeState.maxEnergy * 0.95) {
            ui.canvasContainer.classList.add('shake');
        } else {
            ui.canvasContainer.classList.remove('shake');
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
                // New Anomaly Logic
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
                // New Mutator Logic
                if (universeProfile.mutators.includes('Particle Decay')) { p.opacity.value = Math.max(0, p.opacity.value - 0.0005); if (p.opacity.value === 0) { pJS.particles.array.splice(i,1); continue; } }
                if (universeProfile.mutators.includes('Elastic Collisions') && !isPhased) { for(const p2 of pJS.particles.array) { if(p === p2) continue; const dx=p.x-p2.x, dy=p.y-p2.y, distSq=dx*dx+dy*dy; if(distSq < Math.pow(p.radius+p2.radius, 2)) { const angle = Math.atan2(dy,dx); const force = 0.5 / (distSq * 0.01 + 1); p.vx += Math.cos(angle)*force; p.vy += Math.sin(angle)*force; } } }
                if (universeProfile.mutators.includes('Noisy')) { p.vx += (Math.random()-0.5)*0.2; p.vy += (Math.random()-0.5)*0.2; }
                if (universeProfile.mutators.includes('Synchronized')) { const angle = Math.sin(tick * 0.02 + p.seed * 10) * Math.PI; const speed = Math.sqrt(p.vx*p.vx+p.vy*p.vy); p.vx = Math.cos(angle)*speed; p.vy = Math.sin(angle)*speed; }
                if (universeProfile.mutators.includes('Pair Bonding') && !p.bondPartner) { for(const p2 of pJS.particles.array) { if(p === p2 || p2.bondPartner) continue; const dSq=Math.pow(p.x-p2.x,2)+Math.pow(p.y-p2.y,2); if(dSq < 2500) { p.bondPartner = p2; p2.bondPartner = p; break; } } }
                if (p.bondPartner) { const dx = p.bondPartner.x - p.x, dy = p.bondPartner.y - p.y, dSq = dx*dx+dy*dy; if(dSq > 10000) { p.bondPartner.bondPartner = null; p.bondPartner = null; } else { p.vx += dx * 0.001; p.vy += dy * 0.001; } }
                if (universeProfile.mutators.includes('Fragmenting') && Math.random() < 0.0001 && p.radius > 1 && pJS.particles.array.length < pJS.particles.number.value_max) { p.radius /= 2; const newP = pJS.fn.modes.pushParticles(1, {x:p.x, y:p.y})[0]; if(newP) { newP.radius = p.radius; tagParticles([newP]); } }
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
        activeEffects.quasars.forEach(q => { q.tick++; if(q.tick > q.period) { q.tick = 0; q.isFiring = true; setTimeout(()=>q.isFiring=false, q.duration*16); } if(q.isFiring && pJS.particles.array.length < pJS.particles.number.value_max) { const newP = pJS.fn.modes.pushParticles(1, {x:q.x, y:q.y})[0]; if(newP){newP.vx = Math.cos(q.angle)*q.strength; newP.vy = Math.sin(q.angle)*q.strength; tagParticles([newP]);} } });
        activeEffects.blackHoles.forEach(h => { if(h.isWandering) { h.x += (Math.random()-0.5)*0.5; h.y += (Math.random()-0.5)*0.5; if(h.x<0||h.x>pJS.canvas.w||h.y<0||h.y>pJS.canvas.h) {h.x=pJS.canvas.w/2; h.y=pJS.canvas.h/2;} } });
        activeEffects.magneticStorms.forEach(s => { s.lastFlip++; if(s.lastFlip > s.period) { s.lastFlip=0; s.attract = !s.attract; pJS.particles.move.attract.enable = s.attract; } });
        activeEffects.supergiantStars.forEach(s => { s.lastSpawn++; if(s.lastSpawn > s.period && pJS.particles.array.length < pJS.particles.number.value_max) { s.lastSpawn=0; const newP = pJS.fn.modes.pushParticles(1, {x:s.x, y:s.y})[0]; if(newP){newP.vx=(Math.random()-0.5)*5; newP.vy=(Math.random()-0.5)*5; tagParticles([newP]);} } });
        activeEffects.cosmicGeysers.forEach(g => { g.tick++; if(g.tick > g.period && pJS.particles.array.length < pJS.particles.number.value_max) { g.tick=0; const newP = pJS.fn.modes.pushParticles(1, {x: g.x + (Math.random()-0.5)*g.width, y: g.y})[0]; if(newP) { newP.vy = -g.strength; tagParticles([newP]); } } });
        activeEffects.temporalRifts.forEach((r, i) => { r.life--; if(r.life <= 0) { activeEffects.temporalRifts.splice(i,1); return; } if(Math.random() < 0.01 && pJS.particles.array.length < pJS.particles.number.value_max) { const newP = pJS.fn.modes.pushParticles(1, {x: r.x, y: r.y})[0]; if(newP) { newP.opacity.value = 0.5; newP.fading = 50; tagParticles([newP]); } } });
        activeEffects.solarFlares.forEach(f => { f.tick++; if(f.tick > f.period) { f.tick=0; for(let i=0; i<30; i++) { if(pJS.particles.array.length < pJS.particles.number.value_max) { const newP = pJS.fn.modes.pushParticles(1, {x:pJS.canvas.w/2, y:pJS.canvas.h/2})[0]; if(newP) { newP.vx = Math.cos(f.angle)*f.strength; newP.vy = Math.sin(f.angle)*f.strength; tagParticles([newP]); } } } } });
        activeEffects.spacetimeFoam.forEach((f,i) => { f.life--; if(f.life <= 0) activeEffects.spacetimeFoam.splice(i,1); });
        activeEffects.cosmicNurseries.forEach(n => { n.tick++; if(n.tick > n.period && pJS.particles.array.length < pJS.particles.number.value_max) { n.tick=0; const newP = pJS.fn.modes.pushParticles(1, {x: n.x + (Math.random()-0.5)*n.radius, y: n.y + (Math.random()-0.5)*n.radius})[0]; if(newP) { newP.vx = (Math.random()-0.5)*2; newP.vy = (Math.random()-0.5)*2; tagParticles([newP]); } } });


        if (pJS.particles.array.length > pJS.particles.number.value_max) { pJS.particles.array.splice(0, pJS.particles.array.length - pJS.particles.number.value_max); }

        // --- Drawing & Final Update ---
        drawEffects(pJS.canvas.ctx);
        pJS.fn.particlesUpdate();
        pJS.fn.particlesDraw();

        requestAnimationFrame(update);
    };

    // --- Drawing Functions ---
    /**
     * Draws all active visual effects onto the canvas.
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
     */
    function drawEffects(ctx) {
        activeEffects.nebulas.forEach(n => { const grad = ctx.createRadialGradient(n.x, n.y, n.radius/4, n.x, n.y, n.radius); grad.addColorStop(0, n.color.replace('0.15', '0.3')); grad.addColorStop(1, n.color.replace('0.15', '0')); ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(n.x, n.y, n.radius, 0, 2*Math.PI); ctx.fill(); });
        activeEffects.pulsars.forEach(p => { p.angle += 0.05; ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 2*Math.PI); ctx.fill(); for(let i=0; i<2; i++) { const angle = p.angle + i*Math.PI; const grad = ctx.createLinearGradient(p.x, p.y, p.x+Math.cos(angle)*1000, p.y+Math.sin(angle)*1000); grad.addColorStop(0, 'rgba(255,255,255,0.2)'); grad.addColorStop(1, 'rgba(255,255,255,0)'); ctx.strokeStyle=grad; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x+Math.cos(angle)*1000, p.y+Math.sin(angle)*1000); ctx.stroke(); } });
        activeEffects.blackHoles.forEach(h => { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(h.x, h.y, h.eventHorizon, 0, 2*Math.PI); ctx.fill(); const grad = ctx.createRadialGradient(h.x,h.y,h.eventHorizon,h.x,h.y,h.eventHorizon+5); grad.addColorStop(0, 'rgba(255,200,100,0.8)'); grad.addColorStop(1, 'rgba(255,200,100,0)'); ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.stroke(); });
        activeEffects.whiteHoles.forEach(h => { ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5*Math.sin(tick*0.1)})`; ctx.beginPath(); ctx.arc(h.x, h.y, 10, 0, 2*Math.PI); ctx.fill(); });
        activeEffects.wormholes.forEach((w,i) => { w.life--; if(w.life <= 0) { activeEffects.wormholes.splice(i,1); return; } ctx.strokeStyle=`rgba(150, 100, 255, ${w.life/120})`; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(w.entry.x,w.entry.y,15,0,2*Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(w.exit.x,w.exit.y,15,0,2*Math.PI); ctx.stroke(); });
        activeEffects.phaseZones.forEach((z, i) => { z.life--; if (z.life <= 0) { activeEffects.phaseZones.splice(i, 1); } ctx.strokeStyle=`rgba(180, 200, 255, ${0.1 + (z.life / z.maxLife)*0.3})`; ctx.setLineDash([15, 10]); ctx.lineWidth=2; ctx.beginPath(); ctx.arc(z.x,z.y,Math.sqrt(z.radiusSq),0,2*Math.PI); ctx.stroke(); ctx.setLineDash([]); });
        activeEffects.stasisFields.forEach((f, i) => { f.life--; if (f.life <= 0) { activeEffects.stasisFields.splice(i, 1); } ctx.strokeStyle=`rgba(255, 255, 150, ${0.1 + (f.life / f.maxLife)*0.4})`; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.95 + 0.05 * Math.sin(tick*0.1)), 0, 2*Math.PI); ctx.stroke(); });
        activeEffects.cosmicWebs.forEach(web => { ctx.strokeStyle = `rgba(180, 220, 255, 0.1)`; ctx.lineWidth = 1; for(let i=0; i<web.nodes.length; i++) { for(let j=i+1; j<web.nodes.length; j++) { ctx.beginPath(); ctx.moveTo(web.nodes[i].x, web.nodes[i].y); ctx.lineTo(web.nodes[j].x, web.nodes[j].y); ctx.stroke(); } } });
        activeEffects.quasars.forEach(q => { ctx.fillStyle='rgba(255,255,200,0.8)'; ctx.beginPath(); ctx.arc(q.x, q.y, 8, 0, 2*Math.PI); ctx.fill(); if(q.isFiring) { const grad = ctx.createLinearGradient(q.x, q.y, q.x+Math.cos(q.angle)*1000, q.y+Math.sin(q.angle)*1000); grad.addColorStop(0, 'rgba(255,255,200,0.5)'); grad.addColorStop(1, 'rgba(255,255,200,0)'); ctx.strokeStyle=grad; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x+Math.cos(q.angle)*1000, q.y+Math.sin(q.angle)*1000); ctx.stroke(); } });
        // New Drawing Logic
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

    // --- Player Interaction ---
    /**
     * Handles the continuous application of a player's power (e.g., holding down the mouse button).
     * @param {object} p - The particle to affect.
     * @param {number} i - The index of the particle in the array.
     * @param {object} pJS - The particles.js instance.
     * @param {string} powerName - The name of the power being used.
     * @param {object} worldMouse - The mouse coordinates.
     */
    function handleActivePower(p, i, pJS, powerName, worldMouse) {
        const dx = worldMouse.x - p.x, dy = worldMouse.y - p.y;
        const distSq = dx*dx + dy*dy;
        const dist = Math.sqrt(distSq) || 1;

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
            case 'draw': if(distSq < 20*20 && pJS.particles.array.length < pJS.particles.number.value_max) { const newP = {...p, x: worldMouse.x+(Math.random()-0.5)*5, y: worldMouse.y+(Math.random()-0.5)*5}; pJS.particles.array.push(newP); tagParticles([newP]); } break;
            case 'consume': if (distSq < 150*150) { p.isConsumed = 100; } break;
            case 'maddeningWhisper': if (distSq < 200*200) { p.vx += (Math.random() - 0.5) * 0.4; p.vy += (Math.random() - 0.5) * 0.4; } break;
            case 'smear': if (distSq < 150*150) { p.vx += (worldMouse.x - p.x) * 0.02; p.vy += (worldMouse.y - p.y) * 0.02; p.color = { rgb: { r:255, g:255, b:255 } }; } break;
            case 'dab': if (distSq < 20*20 && pJS.particles.array.length < pJS.particles.number.value_max) { const newP = pJS.fn.modes.pushParticles(1, worldMouse)[0]; if(newP) { newP.color = {rgb: {r:Math.random()*255,g:Math.random()*255,b:Math.random()*255}}; tagParticles([newP]); } } break;
            // New Powers
            case 'swarmFollow': if (distSq < 400*400) { p.vx += dx * 0.005; p.vy += dy * 0.005; } break;
            case 'lavaJet': if (distSq < 30*30 && pJS.particles.array.length < pJS.particles.number.value_max) { const newP = pJS.fn.modes.pushParticles(1, worldMouse)[0]; if(newP){ newP.color = {rgb:{r:255,g:50,b:0}}; newP.vx = (Math.random()-0.5)*5; newP.vy = (Math.random()-0.5)*5; tagParticles([newP]); newP.fading = 100; } } break;
            case 'glacier': if(distSq < 200*200) { p.vx = (p.vx * 9 + 0.5) / 10; p.vy = (p.vy * 9 + 0.2) / 10; } break;
            case 'runeScribe': if(distSq < 150*150) { p.vx += dy/dist * 0.3; p.vy -= dx/dist * 0.3; if(tick % 5 === 0) p.color = {rgb:{r:200,g:100,b:255}}; } break;
            case 'gatherDust': if (distSq < 250*250) { const force = 1 / dist; p.vx += dx * force * 0.01; p.vy += dy * force * 0.01; } break;
            case 'ignite': if (distSq < 100*100) { p.color = {rgb:{r:255,g:220,b:180}}; p.radius += 0.05; } break;
            case 'lure': if (distSq < 300*300) { const force = 1 / dist; p.vx += dx * force * 0.02; p.vy += dy * force * 0.02; p.vx *= 0.99; p.vy *= 0.99; } break;
            case 'crush': if (distSq < 100*100) { p.vx += dx/dist * -0.5; p.vy += dy/dist * -0.5; if(p.radius > 0.5) p.radius -= 0.02; } break;
            case 'align': if (distSq < 200*200) { const grid = 50; p.x += (Math.round(p.x/grid)*grid - p.x)*0.1; p.y += (Math.round(p.y/grid)*grid - p.y)*0.1; } break;
            case 'regrid': if (distSq < 200*200) { const speed = Math.sqrt(p.vx*p.vx+p.vy*p.vy); const angle = Math.atan2(p.vy,p.vx); const snapped = Math.round(angle/(Math.PI/2))*(Math.PI/2); p.vx = Math.cos(snapped)*speed; p.vy = Math.sin(snapped)*speed; } break;
            case 'sporeBurst': if (distSq < 20*20 && Math.random() < 0.1 && pJS.particles.array.length < pJS.particles.number.value_max) { const newP = pJS.fn.modes.pushParticles(1, {x:p.x, y:p.y})[0]; if(newP){ newP.isInfected = true; tagParticles([newP]); } } break;
            case 'tangle': if (distSq < 150*150) { for(const p2 of pJS.particles.array) { if(p===p2) continue; const d2Sq=Math.pow(p.x-p2.x,2)+Math.pow(p.y-p2.y,2); if(d2Sq < 2500) { p.vx -= (p2.x-p.x)*0.001; p.vy -= (p2.y-p.y)*0.001; } } } break;
            case 'ripple': if (tick % 8 === 0) { activeEffects.echoPulses.push({x: worldMouse.x, y: worldMouse.y, radiusSq: 50*50, maxLife: 60, life: 60}); } break;
            case 'freeze': if (distSq < 150*150) { p.vx *= 0.9; p.vy *= 0.9; } break;
            case 'fold': if (distSq < 150*150) { p.vx += dy/dist * 0.4; p.vy -= dx/dist * 0.4; } break;
            case 'crease': if (distSq < 150*150) { p.vx = 0; } break;
            case 'prism': if (distSq < 150*150) { p.color = {rgb:{r:Math.random()*255, g:Math.random()*255, b:Math.random()*255}}; } break;
            case 'focus': if (distSq < 150*150) { p.vx += dx/dist * 0.2; p.vy += dy/dist * 0.2; p.radius = Math.min(p.radius_initial*2, p.radius+0.05); } break;
            // SilkWeaver
            case 'weaveThread': if (distSq < 150*150) { for(const p2 of pJS.particles.array) { if(p === p2) continue; const d2Sq=Math.pow(p.x-p2.x,2)+Math.pow(p.y-p2.y,2); if(d2Sq < 40*40) { activeEffects.silkThreads.push({p1: p, p2: p2, life: 240}); break; } } } break;
            // VolcanicForge
            case 'stokeFire': if (distSq < 150*150) { p.vx *= 1.05; p.vy *= 1.05; if(p.radius < p.radius_initial * 2) p.radius += 0.05; } break;
            // LivingConstellation
            case 'createStar': if (distSq < 20*20 && pJS.particles.array.length < pJS.particles.number.value_max) { const newP = pJS.fn.modes.pushParticles(1, worldMouse)[0]; if(newP) { newP.life = 600; tagParticles([newP]); } } break;
            // GooeyMess
            case 'stirGoo': if (distSq < 200*200) { for(const p2 of pJS.particles.array) { if(p === p2) continue; const d2Sq=Math.pow(p.x-p2.x,2)+Math.pow(p.y-p2.y,2); if(d2Sq < 2500) { p.vx -= (p2.x-p.x)*0.005; p.vy -= (p2.y-p.y)*0.005; } } } break;
            // HauntedRealm
            case 'exorcise': if (distSq < 150*150) { p.vx += dx/dist * 0.5; p.vy += dy/dist * 0.5; p.opacity.value = Math.min(1, p.opacity.value + 0.01); } break;
            // CoralReef
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
    function handleClickPower(powerName, pJS, worldMouse) {
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
            case 'splatter': pJS.fn.modes.pushParticles(15, worldMouse); const newParticles = pJS.particles.array.slice(-15); newParticles.forEach(p => { p.color = { rgb: {r: Math.random()*255, g: Math.random()*255, b: Math.random()*255 } }; tagParticles([p]); p.radius *= 1.5; }); break;
            case 'blot': for(let i=pJS.particles.array.length-1; i>=0; i--){ const p = pJS.particles.array[i]; if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 100) pJS.particles.array.splice(i,1); } break;
            case 'gaze': for (const p of pJS.particles.array) { if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) { p.vx = 0; p.vy = 0; } } break;
            case 'realityTear': for(let i=0; i<5; i++) { if (pJS.particles.array.length < pJS.particles.number.value_max) pJS.fn.modes.pushParticles(1, {x: worldMouse.x + (Math.random()-0.5)*150, y: worldMouse.y + (Math.random()-0.5)*150}); } break;
            case 'paletteKnife': for(let i=pJS.particles.array.length-1; i>=0; i--){ const p = pJS.particles.array[i]; if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 100) { p.vx += (Math.random()-0.5)*15; p.vy += (Math.random()-0.5)*15; } } break;
            case 'wash': for(const p of pJS.particles.array) { p.colorLocked = false; p.opacity.value = Math.max(0.1, p.opacity.value - 0.2); } break;
            // New Powers
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
            // Even More New Powers
            case 'pullThreads': activeEffects.silkThreads.forEach(t => { const midX = (t.p1.x+t.p2.x)/2, midY = (t.p1.y+t.p2.y)/2; const dx=worldMouse.x-midX, dy=worldMouse.y-midY, dSq=dx*dx+dy*dy; if(dSq < 150*150) { t.p1.vx += dx*0.002; t.p1.vy += dy*0.002; t.p2.vx += dx*0.002; t.p2.vy += dy*0.002; } }); break;
            case 'quench': for(const p of pJS.particles.array) { if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) { p.vx *= 0.5; p.vy *= 0.5; if(p.radius > p.radius_initial) p.radius -= 0.1; } } break;
            case 'connectConstellation': { const inRange = []; for (const p of pJS.particles.array) { if (p.life && Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) inRange.push(p); } if(inRange.length > 1) { const p1 = inRange[Math.floor(Math.random()*inRange.length)]; let p2 = inRange[Math.floor(Math.random()*inRange.length)]; while(p1===p2) p2 = inRange[Math.floor(Math.random()*inRange.length)]; activeEffects.silkThreads.push({p1: p1, p2: p2, life: 400}); } } break;
            case 'dissolveGoo': for(const p of pJS.particles.array) { if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) { p.fading = 100; } } break;
            case 'materialize': for(const p of pJS.particles.array) { if(Math.sqrt(Math.pow(p.x-worldMouse.x,2)+Math.pow(p.y-worldMouse.y,2)) < 150) { p.opacity.value = Math.min(1, p.opacity.value + 0.1); } } break;
        }
    }

    // --- Cataclysm Logic ---
    /**
     * Triggers a universe-ending cataclysm.
     * @param {object} pJS - The particles.js instance.
     */
    function triggerCataclysm(pJS) {
        cataclysmInProgress = true;
        ui.container.classList.remove('visible');
        ui.canvasContainer.classList.remove('shake');
        const choice = universeProfile.cataclysm;
        const regen = (delay) => setTimeout(() => generateUniverse(pJS, generateRandomSeed()), delay);

        switch(choice) {
            case 'Supernova': for(const p of pJS.particles.array) { p.vx = (Math.random()-0.5)*50; p.vy = (Math.random()-0.5)*50; }; regen(2500); break;
            case 'Phase Shift': pJS.particles.array.forEach(p => p.opacity.value = 0.1); pJS.fn.particlesRefresh(); regen(3000); break;
            case 'Glitch Storm': let glitches = 0; const glitchInterval = setInterval(() => { glitches++; for(const p of pJS.particles.array) { p.x += (Math.random()-0.5)*20; p.y += (Math.random()-0.5)*20; if(Math.random() > 0.95) p.shape = ['circle', 'triangle', 'edge', 'star'][Math.floor(Math.random()*4)]; } if(glitches > 50) { clearInterval(glitchInterval); regen(1000); } }, 50); activeIntervals.push(glitchInterval); break;
            case 'Resonance Cascade': let cascades = 0; const cascadeInterval = setInterval(() => { cascades++; for(let i=pJS.particles.array.length-1; i>=0; i--) { const p = pJS.particles.array[i]; p.radius += 0.5; if(p.radius > 40) { pJS.particles.array.splice(i,1); pJS.fn.modes.pushParticles(3, {x:p.x, y:p.y}); } } if(cascades > 100) { clearInterval(cascadeInterval); regen(1000); } }, 30); activeIntervals.push(cascadeInterval); break;
            case 'Overgrowth': pJS.particles.line_linked.enable = true; let growths=0; const overgrowInterval = setInterval(() => { growths++; for(let i=0; i<5; i++) { if(pJS.particles.array.length < pJS.particles.number.value_max) { const p = pJS.particles.array[Math.floor(Math.random()*pJS.particles.array.length)]; pJS.fn.modes.pushParticles(1, {x:p.x,y:p.y}); }} if(growths > 60) { clearInterval(overgrowInterval); regen(2000); } }, 50); activeIntervals.push(overgrowInterval); break;
            case 'Time Collapse': pJS.particles.array.forEach(p => { p.vx *= -1.5; p.vy *= -1.5; }); regen(3000); break;
            case 'Total Annihilation': ui.canvasContainer.style.transition = 'filter 4s ease'; ui.canvasContainer.style.filter = 'brightness(0)'; regen(4500); break;
            case 'Causality Collapse': let ccInterval = setInterval(() => { for(const p of pJS.particles.array) { p.vx += (p.startX - p.x) * 0.02; p.vy += (p.startY - p.y) * 0.02; if(p.radius > 0.1) p.radius -= 0.1; } }, 50); activeIntervals.push(ccInterval); setTimeout(() => { clearInterval(ccInterval); regen(1000); }, 4000); break;
            case 'Great Fading': let fadeInterval = setInterval(() => { pJS.particles.array.forEach(p => p.opacity.value *= 0.95); }, 50); activeIntervals.push(fadeInterval); setTimeout(() => { clearInterval(fadeInterval); regen(1000);}, 4000); break;
            case 'False Vacuum Decay': let decayBubble = {x: pJS.canvas.w/2, y: pJS.canvas.h/2, r: 0}; let decayInterval = setInterval(() => { decayBubble.r += pJS.canvas.w * 0.01; pJS.particles.array.forEach(p => { if(Math.pow(p.x-decayBubble.x,2)+Math.pow(p.y-decayBubble.y,2) < decayBubble.r*decayBubble.r) { p.vx*=-0.5; p.vy*=-0.5; p.color = {rgb:{r:255,g:100,b:255}};} }); if (decayBubble.r > pJS.canvas.w) { clearInterval(decayInterval); regen(1000); } }, 50); activeIntervals.push(decayInterval); break;
            case 'The Great Silence': let silenceInterval = setInterval(() => { physics.friction += 0.01; if (physics.friction >= 1.2) { pJS.particles.array.forEach(p=>{p.vx=0;p.vy=0;}); clearInterval(silenceInterval); regen(2000); }}, 50); activeIntervals.push(silenceInterval); break;
            case 'The Bleed': ui.body.classList.add('cataclysm-bleed'); pJS.particles.color.value = '#000000'; pJS.particles.move.trail.enable = true; pJS.fn.particlesRefresh(); regen(5000); break;
            case 'UnseenGibbering': let gibber = 0; const gibberInterval = setInterval(() => { gibber++; for(const p of pJS.particles.array) { p.vx += (Math.random()-0.5)*2; p.vy += (Math.random()-0.5)*2; if (Math.random() > 0.99) pJS.particles.array.splice(pJS.particles.array.indexOf(p), 1); } if(gibber > 150) { clearInterval(gibberInterval); regen(1000); } }, 20); activeIntervals.push(gibberInterval); break;
            case 'CanvasWipe': let wipe = 0; const wipeInterval = setInterval(() => { wipe++; pJS.particles.array.forEach(p => { p.colorLocked = false; p.color = {rgb:{r:255,g:255,b:255}}; p.opacity.value *= 0.9; }); if(wipe > 100) { clearInterval(wipeInterval); regen(1000); } }, 20); activeIntervals.push(wipeInterval); break;
            // New Cataclysms
            case 'CoreEruption': pJS.particles.array.forEach(p => { const dx=p.x-pJS.canvas.w/2, dy=p.y-pJS.canvas.h/2, dist=Math.sqrt(dx*dx+dy*dy)||1; p.vx = dx/dist * (20 + Math.random()*20); p.vy = dy/dist * (20 + Math.random()*20); p.color = {rgb:{r:255,g:50,b:0}}; }); regen(3000); break;
            case 'DeepFreeze': physics.friction = 1.05; pJS.particles.array.forEach(p => { p.color = {rgb:{r:200,g:220,b:255}}; }); setTimeout(() => { pJS.particles.array.forEach(p => { p.vx += (Math.random()-0.5)*5; p.vy += (Math.random()-0.5)*5; if(p.radius > 1) p.radius *= 0.5; }); }, 2500); regen(3500); break;
            case 'HiveCollapse': let collapses = 0; const collapseInterval = setInterval(() => { collapses++; for(let i=pJS.particles.array.length-1; i>=0; i--) { const p = pJS.particles.array[i]; p.vx += (pJS.canvas.w/2 - p.x) * 0.005; p.vy += (pJS.canvas.h/2 - p.y) * 0.005; if(Math.random() > 0.9) pJS.particles.array.splice(i,1); } if(collapses > 120) { clearInterval(collapseInterval); regen(1000); } }, 30); activeIntervals.push(collapseInterval); break;
            case 'ForbiddenRitual': const ritualCenter = {x: pJS.canvas.w/2, y: pJS.canvas.h/2}; let ritual = 0; const ritualInterval = setInterval(() => { ritual++; pJS.particles.array.forEach(p => { const dx = ritualCenter.x - p.x, dy = ritualCenter.y - p.y, dist=Math.sqrt(dx*dx+dy*dy); p.vx += dx * 0.003; p.vy += dy * 0.003; p.vx *= 0.98; p.vy *= 0.98; if (dist < 50) {p.vx=0;p.vy=0;} p.color = {rgb:{r:200,g:50,b:255}}; }); if(ritual > 200) { pJS.particles.array.forEach(p => { p.vx = (Math.random()-0.5)*50; p.vy = (Math.random()-0.5)*50; }); clearInterval(ritualInterval); regen(2000); } }, 20); activeIntervals.push(ritualInterval); break;
            case 'ProtoStarCollapse': pJS.particles.array.forEach(p => { p.vx += (pJS.canvas.w/2 - p.x)*0.01; p.vy += (pJS.canvas.h/2 - p.y)*0.01; }); setTimeout(() => { pJS.particles.array.forEach(p => { const dx=p.x-pJS.canvas.w/2, dy=p.y-pJS.canvas.h/2, d=Math.sqrt(dx*dx+dy*dy)||1; p.vx = dx/d*30; p.vy = dy/d*30; }); }, 3000); regen(4000); break;
            case 'BenthicStorm': let storm = 0; const stormInterval = setInterval(() => { storm++; physics.friction = 0.7; pJS.particles.array.forEach(p => { p.vx += (Math.random()-0.5)*2; p.vy += (Math.random()-0.5)*2; }); if(storm > 100) { clearInterval(stormInterval); regen(1000); } }, 50); activeIntervals.push(stormInterval); break;
            case 'SystemCrash': ui.body.style.background = '#000'; pJS.particles.array.forEach(p => { p.vx=0; p.vy=0; p.shape='character'; p.character = {value:['!','@','#','$','%']}; }); pJS.fn.particlesRefresh(); regen(3000); break;
            case 'Decomposition': let decomp = 0; const decompInterval = setInterval(() => { decomp++; if(pJS.particles.array.length > 0) pJS.particles.array.splice(0, 5); if(decomp > 100) { clearInterval(decompInterval); regen(1000); } }, 50); activeIntervals.push(decompInterval); break;
            case 'Shattering': pJS.particles.array.forEach(p => { p.vx = (Math.random()-0.5)*15; p.vy = (Math.random()-0.5)*15; if (p.radius > 1) p.radius *= 0.5; }); regen(2000); break;
            case 'PaperTearCataclysm': let tear = pJS.canvas.w/2; let tearInterval = setInterval(() => { tear += 10; for(let i=pJS.particles.array.length-1; i>=0; i--) { if(Math.abs(pJS.particles.array[i].x - tear) < 10) pJS.particles.array.splice(i,1); } if(tear > pJS.canvas.w) { clearInterval(tearInterval); regen(1000); } }, 20); activeIntervals.push(tearInterval); break;
            case 'ColorBurn': let burn = 0; const burnInterval = setInterval(() => { burn++; pJS.particles.array.forEach(p => { const c = p.color.rgb; p.color.rgb = {r:Math.min(255, c.r+5), g:Math.max(0, c.g-2), b:Math.max(0, c.b-2)}; }); if(burn > 100) { clearInterval(burnInterval); regen(1000); } }, 30); activeIntervals.push(burnInterval); break;
            // New Cataclysms for new blueprints
            case 'WebCollapse': activeEffects.silkThreads.forEach(t => { t.life = 1; }); let webCollapse = 0; const webCollapseInterval = setInterval(() => { webCollapse++; activeEffects.silkThreads.forEach(t => { const midX = (t.p1.x+t.p2.x)/2, midY = (t.p1.y+t.p2.y)/2; t.p1.vx += (midX - t.p1.x) * 0.01; t.p1.vy += (midY - t.p1.y) * 0.01; t.p2.vx += (midX - t.p2.x) * 0.01; t.p2.vy += (midY - t.p2.y) * 0.01; }); if(webCollapse > 150) { clearInterval(webCollapseInterval); regen(1000); } }, 20); activeIntervals.push(webCollapseInterval); break;
            case 'GrandCooling': let cooling = 0; const coolInterval = setInterval(() => { cooling++; physics.friction *= 1.01; pJS.particles.array.forEach(p => { const c = p.color.rgb; p.color.rgb = {r:c.r*0.99, g:c.g*0.99, b:Math.min(255, c.b+1)}; }); if(cooling > 200) { clearInterval(coolInterval); regen(1000); } }, 20); activeIntervals.push(coolInterval); break;
            case 'BigRip': let rip = 0; const ripInterval = setInterval(() => { rip++; pJS.particles.array.forEach(p => { p.vx *= 1.05; p.vy *= 1.05; p.radius *= 0.99; if(p.radius < 0.1) pJS.particles.array.splice(pJS.particles.array.indexOf(p), 1); }); if(rip > 150 || pJS.particles.array.length === 0) { clearInterval(ripInterval); regen(1000); } }, 20); activeIntervals.push(ripInterval); break;
            case 'Homogenization': let homo = 0; const homoInterval = setInterval(() => { homo++; const avg_c = pJS.particles.array.reduce((acc, p) => { acc.r += p.color.rgb.r; acc.g += p.color.rgb.g; acc.b += p.color.rgb.b; return acc; }, {r:0,g:0,b:0}); avg_c.r /= pJS.particles.array.length; avg_c.g /= pJS.particles.array.length; avg_c.b /= pJS.particles.array.length; pJS.particles.array.forEach(p => { p.vx *= 0.95; p.vy *= 0.95; p.color.rgb.r = (p.color.rgb.r*9 + avg_c.r)/10; p.color.rgb.g = (p.color.rgb.g*9 + avg_c.g)/10; p.color.rgb.b = (p.color.rgb.b*9 + avg_c.b)/10; }); if(homo > 200) { clearInterval(homoInterval); regen(1000); } }, 20); activeIntervals.push(homoInterval); break;
            case 'Banishing': pJS.particles.array.forEach(p => { p.vx = (Math.random()-0.5)*5; p.vy = (Math.random()-0.5)*5 - 20; p.opacity.value = 1; }); regen(4000); break;
            case 'TidalWave': let wavePos = -100; const waveInterval = setInterval(() => { wavePos += 20; pJS.particles.array.forEach(p => { if (p.x < wavePos && p.x > wavePos - 40) { p.vx += 15; p.vy += (Math.random() - 0.5) * 5; } }); if (wavePos > pJS.canvas.w + 100) { clearInterval(waveInterval); regen(1000); } }, 20); activeIntervals.push(waveInterval); break;
        }
    }

    // --- Utility Functions ---
    /**
     * Resets the state of the universe, clearing all active effects and intervals.
     */
    function resetState(){
        activeIntervals.forEach(clearInterval);
        clearTimeout(seedCopyTimeout);
        activeIntervals = [];
        activeEffects = {
            gravityWells: [], stasisFields: [], phaseZones: [], echoPulses: [], wormholes: [],
            pulsars: [], nebulas: [], blackHoles: [], whiteHoles: [], cosmicStrings: [], cosmicWebs: [],
            gravityPockets: [], timeDilationZones: [], entangledGroups: [], gravityWaves: [], quasars: [],
            cosmicRifts: [], magneticStorms: [], ionClouds: [], supergiantStars: [],
            // New effects arrays
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

    /**
     * Adds custom properties to new particles.
     * @param {Array<object>} particles - An array of particles to tag.
     */
    function tagParticles(particles) {
        if (!particles) return;
        particles.forEach(p => {
            if (p) {
                if(p.radius_initial === undefined || isInitialLoad) p.radius_initial = p.radius;
                if(p.startX === undefined || isInitialLoad) { p.startX = p.x; p.startY = p.y; }
                if(universeProfile.mutators.includes('Dwarf & Giant')) { const newSize = Math.random() > 0.5 ? p.radius * 2 : p.radius * 0.5; p.radius = p.radius_initial = Math.max(1, newSize); }
                if(universeProfile.mutators.includes('SupernovaRemains') && Math.random() < 0.1) { p.isHeavy = true; p.radius *= 2; } else { p.isHeavy = false; }
                p.seed = Math.random() * 1000;
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

    /**
     * Sets a random gradient background for the body and canvas.
     * @param {number} hue - The base hue for the gradient.
     * @param {boolean} isMonochrome - Whether the gradient should be monochrome.
     * @param {function(): number} seededRandom - The seeded random number generator.
     * @param {boolean} isDark - Whether the gradient should be dark.
     */
    function setRandomGradient(hue, isMonochrome, seededRandom, isDark) {
        const angle=Math.floor(seededRandom()*360);
        if(isDark){
            document.body.style.background=`linear-gradient(${angle}deg, #0a050d, #120510, #000000)`;
        } else if(isMonochrome){
            document.body.style.background=`linear-gradient(${angle}deg, hsl(${hue}, 80%, 10%), hsl(${hue}, 40%, 20%), hsl(${hue}, 90%, 5%))`;
        } else {
            document.body.style.background=`linear-gradient(${angle}deg, hsl(${hue},80%,30%), hsl(${(hue+120)%360},80%,20%), hsl(${(hue+240)%360},80%,25%))`;
        }
        ui.canvasContainer.style.background = document.body.style.background;
        ui.canvasContainer.style.backgroundSize = '400% 400%';
    }

    /**
     * Converts an HSL color value to a hex string.
     * @param {number} h - The hue value (0-360).
     * @param {number} s - The saturation value (0-100).
     * @param {number} l - The lightness value (0-100).
     * @returns {string} The hex color string.
     */
    function hslToHex(h,s,l){s/=100;l/=100;let c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2,r=0,g=0,b=0;if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}r=Math.round((r+m)*255).toString(16).padStart(2,'0');g=Math.round((g+m)*255).toString(16).padStart(2,'0');b=Math.round((b+m)*255).toString(16).padStart(2,'0');return`#${r}${g}${b}`; }

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
    function getBezierXY(t, sx, sy, cp1x, cp1y, cp2x, cp2y, ex, ey) {
        const invT = (1 - t);
        const x = invT * invT * invT * sx + 3 * invT * invT * t * cp1x + 3 * invT * t * t * cp2x + t * t * t * ex;
        const y = invT * invT * invT * sy + 3 * invT * invT * t * cp1y + 3 * invT * t * t * cp2y + t * t * t * ey;
        return { x: x, y: y };
    }

    // --- Event Listeners ---
    ui.seed.addEventListener('click', () => { navigator.clipboard.writeText(window.location.href).then(() => { ui.seed.innerText = 'Copied!'; clearTimeout(seedCopyTimeout); seedCopyTimeout = setTimeout(() => ui.seed.innerText = `Seed: ${currentSeed}`, 2000); }); });
    window.addEventListener('mousemove', e => { mouse.x=e.clientX; mouse.y=e.clientY; ui.cursorGlow.style.left=`${e.clientX}px`; ui.cursorGlow.style.top=`${e.clientY}px`; });
    window.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('mousedown', e => { if (cataclysmInProgress) return; if (e.button === 0) isLeftMouseDown = true; else if (e.button === 2) isRightMouseDown = true; ui.cursorGlow.style.setProperty('--glow-color', `${pJS.particles.color.value}40`); ui.cursorGlow.classList.add('active'); });
    window.addEventListener('mouseup', e => {
        if (cataclysmInProgress) return;
        const powerName = e.button === 0 ? universeProfile.leftClickPower : universeProfile.rightClickPower;
        const clickPowers = ['supernova', 'gravityWell', 'stasisField', 'unravel', 'harvest', 'toggleLinks', 'glitch', 'crystalize', 'wormhole', 'entangle', 'decohere', 'shockwave', 'silence', 'splatter', 'blot', 'gaze', 'realityTear', 'paletteKnife', 'wash', 'disperse', 'cool', 'flashFreeze', 'polymorph', 'whiteHoleSpawn', 'pressureWave', 'overgrow', 'decompose', 'paperTear', 'smooth', 'aberrate', 'pullThreads', 'quench', 'connectConstellation', 'dissolveGoo', 'materialize'];
        if (clickPowers.includes(powerName)) { handleClickPower(powerName, pJS, mouse); }
        if (e.button === 0) isLeftMouseDown = false;
        else if (e.button === 2) isRightMouseDown = false;
        if(!isLeftMouseDown && !isRightMouseDown) ui.cursorGlow.classList.remove('active');
    });
    window.addEventListener('resize', () => { let resizeTimeout; clearTimeout(resizeTimeout); resizeTimeout = setTimeout(() => { if (pJS && currentSeed && !cataclysmInProgress) { isInitialLoad = true; generateUniverse(pJS, currentSeed); } }, 250); });

    // --- Initial Load ---
    particlesJS('particles-js', baseConfig);
    const pJS = window.pJSDom[0].pJS;
    const urlParams = new URLSearchParams(window.location.search);
    generateUniverse(pJS, urlParams.get('seed') || generateRandomSeed());
    requestAnimationFrame(update);
});
