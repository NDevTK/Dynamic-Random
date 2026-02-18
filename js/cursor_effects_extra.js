/**
 * @file cursor_effects_extra.js
 * @description 5 additional creative cursor effect styles:
 * - Quantum Superposition: ghost cursors showing possible future positions
 * - Gravity Mesh: grid of dots warped by cursor spacetime distortion
 * - Morphing Creature: procedural blob creature that follows the cursor
 * - Musical Notes: floating musical symbols with Web Audio tones
 * - Ink Calligraphy: East Asian brush-style strokes responsive to velocity
 */

import { mouse, isLeftMouseDown, isRightMouseDown } from './state.js';
import { withAlpha } from './color_palettes.js';

const TAU = Math.PI * 2;

// ═══════════════════════════════════════════════
//  STYLE: Quantum Superposition
// ═══════════════════════════════════════════════
// Shows multiple "ghost" cursors at slightly different positions,
// representing quantum uncertainty. They drift apart and snap together.
export function initQuantum(sys) {
    const count = 3 + Math.floor(sys.rng() * 4);
    sys.state.ghosts = [];
    for (let i = 0; i < count; i++) {
        sys.state.ghosts.push({
            x: mouse.x, y: mouse.y,
            vx: 0, vy: 0,
            phase: sys.rng() * TAU,
            driftSpeed: 0.5 + sys.rng() * 1.5,
            driftRadius: 15 + sys.rng() * 35,
            size: 4 + sys.rng() * 4,
            hueOffset: sys.rng() * 60,
            trail: []
        });
    }
    sys.state.collapseTimer = 0;
    sys.state.isCollapsed = false;
    sys.state.uncertaintyRadius = 20 + sys.rng() * 30;
    sys.state.entanglementLines = sys.rng() > 0.4;
    sys.state.probabilityCloud = sys.rng() > 0.5;
}

export function drawQuantum(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const clicking = isLeftMouseDown || isRightMouseDown;

    // Wave function collapse on click
    if (clicking && !state.isCollapsed) {
        state.isCollapsed = true;
        state.collapseTimer = 20;
    }
    if (state.collapseTimer > 0) {
        state.collapseTimer--;
        if (state.collapseTimer <= 0) state.isCollapsed = false;
    }

    ctx.globalCompositeOperation = 'lighter';

    // Probability cloud (background uncertainty field)
    if (state.probabilityCloud && !state.isCollapsed) {
        const cloudR = state.uncertaintyRadius * (1 + 0.2 * Math.sin(sys.tick * 0.03));
        const g = ctx.createRadialGradient(mx, my, 0, mx, my, cloudR * 2);
        g.addColorStop(0, withAlpha(palette.primary[0], 0.08));
        g.addColorStop(0.5, withAlpha(palette.primary[1 % palette.primary.length], 0.04));
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(mx, my, cloudR * 2, 0, TAU);
        ctx.fill();
    }

    // Ghost cursors
    for (let i = 0; i < state.ghosts.length; i++) {
        const ghost = state.ghosts[i];

        if (state.isCollapsed) {
            // Snap to real position
            ghost.x += (mx - ghost.x) * 0.4;
            ghost.y += (my - ghost.y) * 0.4;
        } else {
            // Quantum drift: orbit around the "real" position
            ghost.phase += 0.02 + sys.mouseSpeed * 0.005;
            const driftX = Math.cos(ghost.phase + i * TAU / state.ghosts.length) * ghost.driftRadius;
            const driftY = Math.sin(ghost.phase * 1.3 + i * TAU / state.ghosts.length) * ghost.driftRadius;
            const targetX = mx + driftX;
            const targetY = my + driftY;
            ghost.x += (targetX - ghost.x) * 0.08;
            ghost.y += (targetY - ghost.y) * 0.08;
        }

        // Store trail
        ghost.trail.push({ x: ghost.x, y: ghost.y });
        if (ghost.trail.length > 12) ghost.trail.shift();

        // Draw ghost trail (probability path)
        if (ghost.trail.length > 2) {
            ctx.beginPath();
            ctx.moveTo(ghost.trail[0].x, ghost.trail[0].y);
            for (let t = 1; t < ghost.trail.length; t++) {
                ctx.lineTo(ghost.trail[t].x, ghost.trail[t].y);
            }
            ctx.strokeStyle = withAlpha(palette.primary[i % palette.primary.length], 0.1);
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw ghost cursor
        const alpha = state.isCollapsed ? 0.8 : (0.2 + 0.15 * Math.sin(sys.tick * 0.05 + ghost.phase));
        const color = palette.primary[i % palette.primary.length];
        const glow = ctx.createRadialGradient(ghost.x, ghost.y, 0, ghost.x, ghost.y, ghost.size * 2);
        glow.addColorStop(0, withAlpha(color, alpha));
        glow.addColorStop(0.5, withAlpha(color, alpha * 0.3));
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ghost.x, ghost.y, ghost.size * 2, 0, TAU);
        ctx.fill();

        // Inner bright core
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(ghost.x, ghost.y, ghost.size * 0.3, 0, TAU);
        ctx.fill();
    }

    // Entanglement lines between ghosts
    if (state.entanglementLines && !state.isCollapsed) {
        ctx.lineWidth = 0.5;
        ctx.setLineDash([3, 5]);
        for (let i = 0; i < state.ghosts.length; i++) {
            for (let j = i + 1; j < state.ghosts.length; j++) {
                const gi = state.ghosts[i];
                const gj = state.ghosts[j];
                const dist = Math.sqrt((gi.x - gj.x) ** 2 + (gi.y - gj.y) ** 2);
                if (dist < 100) {
                    ctx.strokeStyle = withAlpha(palette.accent[0], 0.15 * (1 - dist / 100));
                    ctx.beginPath();
                    ctx.moveTo(gi.x, gi.y);
                    ctx.lineTo(gj.x, gj.y);
                    ctx.stroke();
                }
            }
        }
        ctx.setLineDash([]);
    }

    // Central "true position" indicator
    const coreAlpha = state.isCollapsed ? 0.8 : 0.2;
    ctx.fillStyle = `rgba(255, 255, 255, ${coreAlpha})`;
    ctx.beginPath();
    ctx.arc(mx, my, 2, 0, TAU);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  STYLE: Gravity Mesh
// ═══════════════════════════════════════════════
// A grid of dots near the cursor that warp toward the cursor position,
// visualizing spacetime distortion like gravitational lensing.
export function initGravityMesh(sys) {
    const gridSize = 8 + Math.floor(sys.rng() * 8);
    const spacing = 14 + sys.rng() * 10;
    sys.state.gridSize = gridSize;
    sys.state.spacing = spacing;
    sys.state.warpStrength = 30 + sys.rng() * 50;
    sys.state.warpRadius = 60 + sys.rng() * 60;
    sys.state.dotSize = 1 + sys.rng() * 1.5;
    sys.state.showLines = sys.rng() > 0.3;
    sys.state.showDistortion = sys.rng() > 0.4;
    sys.state.rotSpeed = (sys.rng() - 0.5) * 0.003;
    sys.state.meshHue = sys.rng() * 360;
}

export function drawGravityMesh(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const gs = state.gridSize;
    const sp = state.spacing;
    const half = gs * sp / 2;
    const clicking = isLeftMouseDown || isRightMouseDown;
    const warpMul = clicking ? 2.5 : 1;
    const warpStr = state.warpStrength * warpMul;
    const warpR = state.warpRadius * (clicking ? 1.5 : 1);

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(sys.tick * state.rotSpeed);
    ctx.globalCompositeOperation = 'lighter';

    // Calculate distorted grid positions
    const positions = [];
    for (let gy = 0; gy < gs; gy++) {
        positions[gy] = [];
        for (let gx = 0; gx < gs; gx++) {
            let x = (gx - gs / 2 + 0.5) * sp;
            let y = (gy - gs / 2 + 0.5) * sp;

            // Apply gravitational warp
            const dist = Math.sqrt(x * x + y * y);
            if (dist > 0.1 && dist < warpR * 2) {
                const warp = warpStr / (dist + 10);
                const angle = Math.atan2(y, x);
                // Pull toward center (cursor)
                x -= Math.cos(angle) * warp;
                y -= Math.sin(angle) * warp;
                // Tangential distortion
                x += Math.cos(angle + Math.PI / 2) * warp * 0.3 * Math.sin(sys.tick * 0.02);
                y += Math.sin(angle + Math.PI / 2) * warp * 0.3 * Math.sin(sys.tick * 0.02);
            }

            positions[gy][gx] = { x, y, dist };
        }
    }

    // Draw grid lines
    if (state.showLines) {
        ctx.lineWidth = 0.5;
        // Horizontal lines
        for (let gy = 0; gy < gs; gy++) {
            ctx.beginPath();
            for (let gx = 0; gx < gs; gx++) {
                const p = positions[gy][gx];
                const distAlpha = Math.max(0, 1 - p.dist / (half * 1.2));
                gx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
            }
            const lineAlpha = 0.12 * (1 - gy / gs * 0.5);
            ctx.strokeStyle = withAlpha(palette.primary[0], lineAlpha);
            ctx.stroke();
        }
        // Vertical lines
        for (let gx = 0; gx < gs; gx++) {
            ctx.beginPath();
            for (let gy = 0; gy < gs; gy++) {
                const p = positions[gy][gx];
                gy === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
            }
            ctx.strokeStyle = withAlpha(palette.primary[0], 0.1);
            ctx.stroke();
        }
    }

    // Draw dots
    for (let gy = 0; gy < gs; gy++) {
        for (let gx = 0; gx < gs; gx++) {
            const p = positions[gy][gx];
            const distFade = Math.max(0, 1 - p.dist / (half * 1.3));
            if (distFade <= 0) continue;

            // Color by distortion amount
            const origX = (gx - gs / 2 + 0.5) * sp;
            const origY = (gy - gs / 2 + 0.5) * sp;
            const displacement = Math.sqrt((p.x - origX) ** 2 + (p.y - origY) ** 2);
            const distortionIntensity = Math.min(1, displacement / 20);

            const dotR = state.dotSize * (1 + distortionIntensity * 2) * distFade;

            if (state.showDistortion && distortionIntensity > 0.2) {
                // Glow on distorted dots
                const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, dotR * 3);
                g.addColorStop(0, withAlpha(palette.glow[0], distortionIntensity * 0.3 * distFade));
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(p.x, p.y, dotR * 3, 0, TAU);
                ctx.fill();
            }

            // Dot core
            const color = distortionIntensity > 0.5 ? palette.glow[0] : palette.primary[0];
            ctx.fillStyle = withAlpha(color, (0.3 + distortionIntensity * 0.5) * distFade);
            ctx.beginPath();
            ctx.arc(p.x, p.y, dotR, 0, TAU);
            ctx.fill();
        }
    }

    // Central mass indicator
    const centralPulse = 1 + 0.2 * Math.sin(sys.tick * 0.05);
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 10 * centralPulse);
    cg.addColorStop(0, withAlpha(palette.glow[0], 0.5));
    cg.addColorStop(0.5, withAlpha(palette.primary[0], 0.2));
    cg.addColorStop(1, 'transparent');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, 10 * centralPulse, 0, TAU);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

// ═══════════════════════════════════════════════
//  STYLE: Morphing Creature
// ═══════════════════════════════════════════════
// A procedurally-generated blob creature with eyes and appendages
// that follows the cursor with personality-driven behavior.
export function initCreature(sys) {
    const rng = sys.rng;
    sys.state.body = {
        x: mouse.x, y: mouse.y,
        vx: 0, vy: 0,
        angle: 0,
        size: 15 + rng() * 15,
        wobblePhase: 0,
        wobbleFreq: 0.05 + rng() * 0.05,
        wobbleAmp: 0.1 + rng() * 0.2,
        blobPoints: 8 + Math.floor(rng() * 6),
        blobPhases: [],
        followSpeed: 0.03 + rng() * 0.05,
        springiness: 0.1 + rng() * 0.15,
        damping: 0.8 + rng() * 0.15
    };
    for (let i = 0; i < sys.state.body.blobPoints; i++) {
        sys.state.body.blobPhases.push({
            phase: rng() * TAU,
            speed: 0.02 + rng() * 0.04,
            amp: 0.1 + rng() * 0.3
        });
    }

    // Eyes
    const eyeCount = 1 + Math.floor(rng() * 3); // 1-3 eyes
    sys.state.eyes = [];
    for (let i = 0; i < eyeCount; i++) {
        sys.state.eyes.push({
            offsetAngle: (TAU / eyeCount) * i + (rng() - 0.5) * 0.5 - Math.PI / 2,
            offsetDist: sys.state.body.size * (0.2 + rng() * 0.3),
            size: 3 + rng() * 4,
            pupilSize: 0.3 + rng() * 0.3,
            blinkPhase: rng() * 100,
            blinkInterval: 80 + Math.floor(rng() * 120),
            lookX: 0, lookY: 0
        });
    }

    // Appendages (tentacles/feet)
    const appendageCount = 2 + Math.floor(rng() * 4);
    sys.state.appendages = [];
    for (let i = 0; i < appendageCount; i++) {
        const segments = 4 + Math.floor(rng() * 4);
        const pts = [];
        for (let j = 0; j < segments; j++) pts.push({ x: 0, y: 0, vx: 0, vy: 0 });
        sys.state.appendages.push({
            points: pts,
            baseAngle: (TAU / appendageCount) * i + Math.PI / 2,
            length: sys.state.body.size * (0.8 + rng() * 0.8),
            stiffness: 0.08 + rng() * 0.1,
            damping: 0.8 + rng() * 0.12,
            width: 2 + rng() * 3,
            waveFreq: 0.05 + rng() * 0.08,
            waveAmp: 2 + rng() * 5,
            color: sys.palette.primary[i % sys.palette.primary.length]
        });
    }

    sys.state.personality = rng(); // 0=shy, 1=energetic
    sys.state.expression = 'neutral';
    sys.state.expressionTimer = 0;
}

export function drawCreature(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const body = state.body;

    // Physics: follow cursor with spring behavior
    const dx = mx - body.x;
    const dy = my - body.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    body.vx += dx * body.followSpeed;
    body.vy += dy * body.followSpeed;
    body.vx *= body.damping;
    body.vy *= body.damping;
    body.x += body.vx;
    body.y += body.vy;

    // Face toward movement direction
    if (Math.abs(body.vx) + Math.abs(body.vy) > 0.5) {
        const targetAngle = Math.atan2(body.vy, body.vx);
        let angleDiff = targetAngle - body.angle;
        while (angleDiff > Math.PI) angleDiff -= TAU;
        while (angleDiff < -Math.PI) angleDiff += TAU;
        body.angle += angleDiff * 0.1;
    }

    body.wobblePhase += body.wobbleFreq;

    // Expression
    if (dist > 200 && state.personality < 0.5) state.expression = 'scared';
    else if (dist < 30) state.expression = 'happy';
    else if (isLeftMouseDown) state.expression = 'excited';
    else state.expression = 'neutral';

    ctx.save();
    ctx.translate(body.x, body.y);
    ctx.rotate(body.angle);

    // --- Draw appendages ---
    for (const app of state.appendages) {
        const pts = app.points;
        const segLen = app.length / pts.length;

        // Physics chain
        pts[0].x = Math.cos(app.baseAngle) * body.size * 0.8;
        pts[0].y = Math.sin(app.baseAngle) * body.size * 0.8;

        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1];
            const p = pts[i];
            const wave = Math.sin(sys.tick * app.waveFreq + i * 0.8) * app.waveAmp;
            const targetAngle = app.baseAngle + wave * 0.1;
            const targetX = prev.x + Math.cos(targetAngle) * segLen;
            const targetY = prev.y + Math.sin(targetAngle) * segLen + wave;

            p.vx += (targetX - p.x) * app.stiffness;
            p.vy += (targetY - p.y) * app.stiffness;
            p.vx *= app.damping;
            p.vy *= app.damping;
            p.x += p.vx;
            p.y += p.vy;
        }

        // Draw appendage
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
            const xc = (pts[i].x + pts[i + 1].x) / 2;
            const yc = (pts[i].y + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }

        for (let w = app.width; w > 0.3; w -= 1) {
            ctx.lineWidth = w;
            ctx.strokeStyle = withAlpha(app.color, (w / app.width) * 0.5);
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // Tip glow
        const tip = pts[pts.length - 1];
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 4);
        g.addColorStop(0, withAlpha(app.color, 0.4));
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(tip.x, tip.y, 4, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    // --- Draw body (blobby shape) ---
    const blobPts = body.blobPoints;
    ctx.beginPath();
    for (let i = 0; i <= blobPts; i++) {
        const angle = (TAU / blobPts) * i;
        const bp = body.blobPhases[i % blobPts];
        const wobble = 1 + Math.sin(body.wobblePhase + bp.phase + sys.tick * bp.speed) * bp.amp;
        const breathe = 1 + Math.sin(sys.tick * 0.03) * 0.05;
        const r = body.size * wobble * breathe;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(px, py);
        else {
            const prevAngle = (TAU / blobPts) * (i - 1);
            const prevBp = body.blobPhases[(i - 1) % blobPts];
            const prevWobble = 1 + Math.sin(body.wobblePhase + prevBp.phase + sys.tick * prevBp.speed) * prevBp.amp;
            const prevR = body.size * prevWobble * breathe;
            const cpAngle = (prevAngle + angle) / 2;
            const cpR = (prevR + r) / 2 * 1.05;
            ctx.quadraticCurveTo(
                Math.cos(cpAngle) * cpR,
                Math.sin(cpAngle) * cpR,
                px, py
            );
        }
    }
    ctx.closePath();

    // Body fill
    const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, body.size * 1.2);
    bodyGrad.addColorStop(0, withAlpha(palette.primary[0], 0.6));
    bodyGrad.addColorStop(0.7, withAlpha(palette.primary[1 % palette.primary.length], 0.4));
    bodyGrad.addColorStop(1, withAlpha(palette.primary[0], 0.1));
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Body outline glow
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = withAlpha(palette.glow[0], 0.2);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';

    // --- Draw eyes ---
    for (const eye of state.eyes) {
        const ex = Math.cos(eye.offsetAngle) * eye.offsetDist;
        const ey = Math.sin(eye.offsetAngle) * eye.offsetDist;

        // Blink check
        const blinkCycle = (sys.tick + eye.blinkPhase) % eye.blinkInterval;
        const isBlinking = blinkCycle < 5;
        const blinkScale = isBlinking ? Math.max(0.1, 1 - (blinkCycle / 5)) : 1;

        // Eye white
        ctx.fillStyle = `rgba(220, 230, 255, 0.8)`;
        ctx.beginPath();
        ctx.ellipse(ex, ey, eye.size, eye.size * blinkScale, 0, 0, TAU);
        ctx.fill();

        if (!isBlinking) {
            // Pupil looks toward cursor (in local space, cursor is at angle 0)
            const lookDist = Math.min(dist * 0.01, eye.size * 0.4);
            const px = ex - Math.cos(body.angle) * lookDist + lookDist;
            const py = ey - Math.sin(body.angle) * lookDist;

            ctx.fillStyle = palette.primary[0];
            ctx.beginPath();
            ctx.arc(px, py, eye.size * eye.pupilSize, 0, TAU);
            ctx.fill();

            // Pupil highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(px - eye.size * 0.15, py - eye.size * 0.15, eye.size * 0.12, 0, TAU);
            ctx.fill();
        }
    }

    // Expression overlay
    if (state.expression === 'happy') {
        ctx.strokeStyle = withAlpha(palette.glow[0], 0.3);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, body.size * 0.2, body.size * 0.3, 0, Math.PI);
        ctx.stroke();
    }

    ctx.restore();
}

// ═══════════════════════════════════════════════
//  STYLE: Musical Notes
// ═══════════════════════════════════════════════
// Emits musical note symbols and sine-wave trails.
// Notes float away with physics. Visual "sound waves" emanate from cursor.
export function initMusical(sys) {
    sys.state.notes = [];
    sys.state.pool = [];
    sys.state.maxNotes = 40 + Math.floor(sys.rng() * 30);
    sys.state.emitRate = 3 + Math.floor(sys.rng() * 3);
    sys.state.noteChars = ['\u266A', '\u266B', '\u2669', '\u266C', '\u2660'];
    sys.state.waves = [];
    sys.state.staffLines = sys.rng() > 0.5;
    sys.state.waveStyle = Math.floor(sys.rng() * 3);
    sys.state.fontSize = 12 + Math.floor(sys.rng() * 10);
    sys.state.buoyancy = -0.3 - sys.rng() * 0.5;
}

export function drawMusical(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const speed = sys.mouseSpeed;

    // Emit notes based on movement
    const emitCount = Math.min(state.emitRate, Math.ceil(speed * 0.2));
    for (let i = 0; i < emitCount && state.notes.length < state.maxNotes; i++) {
        const n = state.pool.length > 0 ? state.pool.pop() : {};
        n.x = mx + (sys.rng() - 0.5) * 15;
        n.y = my + (sys.rng() - 0.5) * 15;
        n.vx = (sys.rng() - 0.5) * 3 + (mouse.x - sys.prevMouse.x) * 0.2;
        n.vy = state.buoyancy + (sys.rng() - 0.5) * 1;
        n.life = 1.0;
        n.decay = 0.008 + sys.rng() * 0.015;
        n.char = state.noteChars[Math.floor(sys.rng() * state.noteChars.length)];
        n.rotation = (sys.rng() - 0.5) * 0.5;
        n.rotSpeed = (sys.rng() - 0.5) * 0.03;
        n.size = state.fontSize * (0.7 + sys.rng() * 0.6);
        n.hue = (sys.tick * 2 + sys.rng() * 60) % 360;
        n.wobblePhase = sys.rng() * TAU;
        state.notes.push(n);
    }

    // Sound waves from cursor
    if (speed > 2 && sys.tick % 8 === 0) {
        state.waves.push({
            x: mx, y: my,
            radius: 5,
            maxRadius: 40 + speed * 2,
            alpha: 0.5,
            hue: (sys.tick * 2) % 360
        });
    }

    ctx.globalCompositeOperation = 'lighter';

    // Draw sound waves
    for (let i = state.waves.length - 1; i >= 0; i--) {
        const w = state.waves[i];
        w.radius += 2;
        w.alpha = Math.max(0, 1 - w.radius / w.maxRadius) * 0.3;

        if (w.alpha <= 0) {
            state.waves.splice(i, 1);
            continue;
        }

        if (state.waveStyle === 0) {
            // Circular waves
            ctx.strokeStyle = withAlpha(palette.primary[0], w.alpha);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(w.x, w.y, w.radius, 0, TAU);
            ctx.stroke();
        } else if (state.waveStyle === 1) {
            // Sine wave rings
            ctx.strokeStyle = withAlpha(palette.primary[0], w.alpha);
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let a = 0; a < TAU; a += 0.05) {
                const waveR = w.radius + Math.sin(a * 8 + sys.tick * 0.1) * 3;
                const px = w.x + Math.cos(a) * waveR;
                const py = w.y + Math.sin(a) * waveR;
                a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        } else {
            // Pulsing arcs
            for (let a = 0; a < 4; a++) {
                const startAngle = (TAU / 4) * a + sys.tick * 0.02;
                ctx.strokeStyle = withAlpha(palette.primary[a % palette.primary.length], w.alpha);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(w.x, w.y, w.radius, startAngle, startAngle + Math.PI * 0.3);
                ctx.stroke();
            }
        }
    }

    // Draw floating notes
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = state.notes.length - 1; i >= 0; i--) {
        const n = state.notes[i];
        n.x += n.vx;
        n.y += n.vy;
        n.vy += state.buoyancy * 0.02;
        n.vx *= 0.99;
        n.vy *= 0.99;
        n.life -= n.decay;
        n.rotation += n.rotSpeed;

        // Gentle wobble
        n.x += Math.sin(sys.tick * 0.03 + n.wobblePhase) * 0.3;

        if (n.life <= 0) {
            state.pool.push(n);
            state.notes[i] = state.notes[state.notes.length - 1];
            state.notes.pop();
            continue;
        }

        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.rotate(n.rotation);
        ctx.font = `${n.size}px serif`;

        // Glow behind note
        ctx.fillStyle = withAlpha(palette.primary[0], n.life * 0.3);
        ctx.fillText(n.char, 1, 1);

        // Main note
        ctx.fillStyle = `hsla(${n.hue}, 80%, 70%, ${n.life * 0.8})`;
        ctx.fillText(n.char, 0, 0);

        ctx.restore();
    }

    // Staff lines near cursor (if enabled)
    if (state.staffLines) {
        ctx.strokeStyle = withAlpha(palette.primary[0], 0.08);
        ctx.lineWidth = 0.5;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(mx - 40, my + i * 8);
            ctx.lineTo(mx + 40, my + i * 8);
            ctx.stroke();
        }
    }

    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  STYLE: Ink Calligraphy
// ═══════════════════════════════════════════════
// East Asian brush calligraphy style. Stroke width varies with speed.
// Leaves beautiful ink marks that slowly dissipate. Splatter on direction changes.
export function initInkBrush(sys) {
    sys.state.strokes = [];
    sys.state.maxStrokes = 200 + Math.floor(sys.rng() * 100);
    sys.state.splatters = [];
    sys.state.pool = [];
    sys.state.minWidth = 1 + sys.rng() * 2;
    sys.state.maxWidth = 8 + sys.rng() * 10;
    sys.state.inkStyle = Math.floor(sys.rng() * 4);
    // 0 = black ink, 1 = colored ink, 2 = gold on dark, 3 = watercolor
    sys.state.prevAngle = 0;
    sys.state.inkHue = sys.rng() * 360;
    sys.state.dryBrush = sys.rng() > 0.5;
    sys.state.splatChance = 0.05 + sys.rng() * 0.1;
}

export function drawInkBrush(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const speed = sys.mouseSpeed;
    const clicking = isLeftMouseDown;

    if (speed > 1) {
        // Width inversely proportional to speed (slow = thick, fast = thin)
        const width = state.maxWidth - Math.min(state.maxWidth - state.minWidth, speed * 0.5);
        const angle = Math.atan2(my - sys.prevMouse.y, mx - sys.prevMouse.x);

        // Detect direction changes for splatters
        let angleDiff = Math.abs(angle - state.prevAngle);
        if (angleDiff > Math.PI) angleDiff = TAU - angleDiff;
        if (angleDiff > 0.5 && speed > 3 && sys.rng() < state.splatChance) {
            // Splatter!
            const splatCount = 3 + Math.floor(sys.rng() * 5);
            for (let i = 0; i < splatCount; i++) {
                state.splatters.push({
                    x: mx + (sys.rng() - 0.5) * 20,
                    y: my + (sys.rng() - 0.5) * 20,
                    size: 1 + sys.rng() * 4,
                    life: 1.0,
                    decay: 0.005 + sys.rng() * 0.01
                });
            }
        }
        state.prevAngle = angle;

        // Store stroke point
        state.strokes.push({
            x: mx, y: my,
            width,
            life: 1.0,
            decay: 0.002 + sys.rng() * 0.003,
            pressure: clicking ? 1.5 : 1.0,
            speed
        });

        while (state.strokes.length > state.maxStrokes) {
            state.strokes.shift();
        }
    }

    // Draw strokes
    for (let i = state.strokes.length - 1; i >= 0; i--) {
        const s = state.strokes[i];
        s.life -= s.decay;
        if (s.life <= 0) {
            state.strokes.splice(i, 1);
            continue;
        }
    }

    // Render connected stroke segments
    if (state.strokes.length > 1) {
        for (let i = 1; i < state.strokes.length; i++) {
            const prev = state.strokes[i - 1];
            const cur = state.strokes[i];

            const w = cur.width * cur.pressure * cur.life;
            let color;

            switch (state.inkStyle) {
                case 0: // Black ink
                    color = `rgba(20, 15, 10, ${cur.life * 0.7})`;
                    break;
                case 1: // Colored ink
                    color = `hsla(${state.inkHue + cur.speed * 2}, 60%, 30%, ${cur.life * 0.6})`;
                    break;
                case 2: // Gold
                    color = `rgba(${180 + Math.floor(cur.life * 75)}, ${150 + Math.floor(cur.life * 50)}, ${50}, ${cur.life * 0.7})`;
                    break;
                case 3: // Watercolor
                    color = withAlpha(palette.primary[i % palette.primary.length], cur.life * 0.3);
                    break;
            }

            // Dry brush effect: skip some rendering
            if (state.dryBrush && w < state.maxWidth * 0.4 && sys.rng() > 0.6) continue;

            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(0.5, w);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(cur.x, cur.y);
            ctx.stroke();

            // Edge feathering for thick strokes
            if (w > 4 && state.inkStyle !== 0) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = withAlpha(palette.glow[0], cur.life * 0.05);
                ctx.lineWidth = w * 1.5;
                ctx.stroke();
                ctx.globalCompositeOperation = 'source-over';
            }
        }
    }

    // Draw splatters
    for (let i = state.splatters.length - 1; i >= 0; i--) {
        const sp = state.splatters[i];
        sp.life -= sp.decay;
        if (sp.life <= 0) {
            state.splatters.splice(i, 1);
            continue;
        }

        let splatColor;
        switch (state.inkStyle) {
            case 0: splatColor = `rgba(20, 15, 10, ${sp.life * 0.6})`; break;
            case 1: splatColor = `hsla(${state.inkHue}, 50%, 25%, ${sp.life * 0.5})`; break;
            case 2: splatColor = `rgba(200, 170, 50, ${sp.life * 0.5})`; break;
            case 3: splatColor = withAlpha(palette.primary[0], sp.life * 0.3); break;
        }

        ctx.fillStyle = splatColor;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size * sp.life, 0, TAU);
        ctx.fill();
    }

    // Brush tip indicator
    if (speed < 0.5) {
        const tipPulse = 0.5 + 0.5 * Math.sin(sys.tick * 0.05);
        ctx.fillStyle = `rgba(100, 80, 60, ${0.2 * tipPulse})`;
        ctx.beginPath();
        ctx.arc(mx, my, state.maxWidth * 0.5, 0, TAU);
        ctx.fill();
    }
}

// ═══════════════════════════════════════════════
//  EXPORTED STYLES MAP
// ═══════════════════════════════════════════════
export const EXTRA_CURSOR_STYLES = {
    quantum:      { init: initQuantum, draw: drawQuantum },
    gravityMesh:  { init: initGravityMesh, draw: drawGravityMesh },
    creature:     { init: initCreature, draw: drawCreature },
    musical:      { init: initMusical, draw: drawMusical },
    inkBrush:     { init: initInkBrush, draw: drawInkBrush }
};
