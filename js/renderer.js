/**
 * @file renderer.js
 * @description Handles the custom rendering of particles and effects, replacing the default particles.js renderer.
 */

import { universeProfile, activeEffects, physics } from './state.js';

/**
 * Renders the particles and effects on the canvas.
 * @param {object} pJS - The particles.js instance.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 */
export function renderParticles(pJS, ctx) {
    // Clear canvas is handled in simulation.js prepareCanvas to allow trails

    const particles = pJS.particles.array;
    const tick = Date.now() / 1000;

    // Global settings based on blueprint
    const isGlowy = universeProfile.aesthetic.glow;
    const isMonochrome = universeProfile.aesthetic.monochrome;
    const shape = pJS.particles.shape.type;

    if (isGlowy) {
        ctx.shadowBlur = 10;
        ctx.globalCompositeOperation = 'lighter';
    } else {
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // Optimization: Batch similar draw calls if possible, but particles have individual props.
    // We iterate once.

    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Skip off-screen particles (approximate)
        if (p.x < -p.radius * 2 || p.x > pJS.canvas.w + p.radius * 2 ||
            p.y < -p.radius * 2 || p.y > pJS.canvas.h + p.radius * 2) {
            continue;
        }

        let color = p.color.rgb;

        // Dynamic Color Modification based on velocity (optional, could be a blueprint setting)
        if (universeProfile.blueprintName === 'VolcanicForge' || universeProfile.blueprintName === 'MoltenHeart') {
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const redness = Math.min(255, 150 + speed * 20);
            color = { r: redness, g: Math.max(0, 100 - speed * 10), b: 0 };
        } else if (universeProfile.blueprintName === 'Cyberpunk' || universeProfile.blueprintName === 'TechnoUtopia') {
             // Neon flickering
             if (Math.random() < 0.05) {
                 ctx.fillStyle = '#fff';
             } else {
                 ctx.shadowColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
             }
        }

        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${p.opacity.value})`;
        if (isGlowy) {
            ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
        }

        ctx.beginPath();

        if (Array.isArray(shape) && shape.includes('character') || shape === 'character') {
             // Text rendering
             ctx.font = `${p.radius * 2}px monospace`;
             const char = p.character ? (Array.isArray(p.character.value) ? p.character.value[Math.floor(p.seed % p.character.value.length)] : p.character.value) : '*';
             ctx.fillText(char, p.x, p.y);
        } else if (shape === 'edge' || (Array.isArray(shape) && shape.includes('edge'))) {
            // Draw a square/diamond
            ctx.rect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
            ctx.fill();
        } else if (shape === 'triangle' || (Array.isArray(shape) && shape.includes('triangle'))) {
            drawPolygon(ctx, p.x, p.y, p.radius, 3);
            ctx.fill();
        } else if (shape === 'polygon' || (Array.isArray(shape) && shape.includes('polygon'))) {
            drawPolygon(ctx, p.x, p.y, p.radius, pJS.particles.shape.polygon.nb_sides || 5);
            ctx.fill();
        } else if (shape === 'star' || (Array.isArray(shape) && shape.includes('star'))) {
            drawStar(ctx, p.x, p.y, p.radius, 5, 0.5);
            ctx.fill();
        } else {
            // Default Circle
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.closePath();
    }

    // Reset context settings
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';

    // Line Linking (Custom)
    if (pJS.particles.line_linked.enable) {
        drawLines(pJS, ctx);
    }
}

function drawPolygon(ctx, x, y, radius, sides) {
    if (sides < 3) return;
    const a = (Math.PI * 2)/sides;
    ctx.moveTo(x + radius, y);
    for (let i = 1; i < sides; i++) {
        ctx.lineTo(x + radius * Math.cos(a*i), y + radius * Math.sin(a*i));
    }
    ctx.closePath();
}

function drawStar(ctx, cx, cy, outerRadius, spikes, innerRadiusRatio) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;
    let innerRadius = outerRadius * innerRadiusRatio;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
}

function drawLines(pJS, ctx) {
    const particles = pJS.particles.array;
    const maxDist = 150; // hardcoded for now, or get from config
    const maxDistSq = maxDist * maxDist;

    ctx.lineWidth = 1;

    // Simple O(N^2) for now - can be optimized with spatial grid if needed
    // But for < 400 particles it's usually fine.
    for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distSq = dx * dx + dy * dy;

            if (distSq <= maxDistSq) {
                const opacity = 1 - (distSq / maxDistSq);
                if (opacity > 0) {
                    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.5})`; // Default white lines
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }
    }
}
