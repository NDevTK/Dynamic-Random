/**
 * @file kinetic_sculpture_architecture.js
 * @description Connected mechanical kinetic art: interlocking gears, pendulums,
 * cranks, cam mechanisms, and chain drives that move in mesmerizing synchronized
 * patterns. Mouse adds energy or grabs components. Seed determines mechanism type,
 * gear ratios, material appearance, and color schemes.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class KineticSculptureArchitecture extends Architecture {
    constructor() {
        super();
        this.gears = [];
        this.pendulums = [];
        this.chains = [];
        this.cranks = [];
        this.orbits = [];
        this.sculptureType = 0;
        this.materialStyle = 0;
        this.tick = 0;
        this.energy = 1;
    }

    init(system) {
        const rng = system.rng;
        const w = system.width;
        const h = system.height;

        // 0=gear train, 1=pendulum wave, 2=cam mechanism, 3=orbiting rings, 4=clockwork
        this.sculptureType = Math.floor(rng() * 5);

        // Material: 0=brass/gold, 1=chrome/silver, 2=copper/warm, 3=neon wireframe, 4=wooden/organic
        this.materialStyle = Math.floor(rng() * 5);

        this.baseHue = system.hue;
        this.tick = 0;
        this.energy = 1;

        // Color/material palettes
        const materials = [
            { fill: '#c8a84e', stroke: '#8b7028', highlight: '#ffe4a0', shadow: '#5a4012' },
            { fill: '#b8c4d0', stroke: '#6a7a8a', highlight: '#e8f0ff', shadow: '#3a4a5a' },
            { fill: '#c87040', stroke: '#8b4020', highlight: '#ffa870', shadow: '#5a2010' },
            { fill: 'transparent', stroke: `hsl(${system.hue}, 100%, 60%)`, highlight: `hsl(${system.hue}, 100%, 80%)`, shadow: `hsl(${system.hue}, 100%, 30%)` },
            { fill: '#8b6b3a', stroke: '#5a4020', highlight: '#c8a060', shadow: '#3a2810' },
        ];
        this.material = materials[this.materialStyle];

        switch (this.sculptureType) {
            case 0: this._initGearTrain(rng, w, h); break;
            case 1: this._initPendulumWave(rng, w, h); break;
            case 2: this._initCamMechanism(rng, w, h); break;
            case 3: this._initOrbitingRings(rng, w, h); break;
            case 4: this._initClockwork(rng, w, h); break;
        }
    }

    _initGearTrain(rng, w, h) {
        this.gears = [];
        const gearCount = 5 + Math.floor(rng() * 8);
        let lastX = w * 0.15;
        let lastY = h / 2 + (rng() - 0.5) * h * 0.3;
        let lastRadius = 30 + rng() * 40;
        let lastDirection = 1;

        for (let i = 0; i < gearCount; i++) {
            const radius = 20 + rng() * 50;
            const teeth = Math.max(8, Math.floor(radius * 0.5));
            const toothDepth = 4 + rng() * 6;

            // Position connected to previous gear
            let x, y;
            if (i === 0) {
                x = lastX; y = lastY;
            } else {
                const connectAngle = rng() * Math.PI * 2;
                const dist = lastRadius + radius - toothDepth * 0.5;
                x = lastX + Math.cos(connectAngle) * dist;
                y = lastY + Math.sin(connectAngle) * dist;
                // Keep on screen
                x = Math.max(radius + 10, Math.min(w - radius - 10, x));
                y = Math.max(radius + 10, Math.min(h - radius - 10, y));
            }

            const speedRatio = lastRadius / radius * lastDirection;

            this.gears.push({
                x, y, radius, teeth, toothDepth,
                angle: rng() * Math.PI * 2,
                speed: i === 0 ? 0.01 + rng() * 0.02 : 0, // Only driver gear has base speed
                speedRatio: i === 0 ? 1 : speedRatio,
                direction: i === 0 ? 1 : -lastDirection,
                hasAxle: rng() > 0.3,
                axleRadius: 3 + rng() * 5,
                spokes: rng() > 0.5 ? Math.floor(3 + rng() * 5) : 0,
                innerRing: rng() > 0.4,
                innerRadius: radius * (0.3 + rng() * 0.3),
            });

            lastX = x; lastY = y;
            lastRadius = radius;
            lastDirection = -lastDirection;
        }

        // Set driver speed
        const driverSpeed = this.gears[0].speed;
        for (let i = 1; i < this.gears.length; i++) {
            this.gears[i].speed = driverSpeed * Math.abs(this.gears[i].speedRatio);
        }
    }

    _initPendulumWave(rng, w, h) {
        this.pendulums = [];
        const count = 12 + Math.floor(rng() * 12);
        const startX = w * 0.1;
        const spacing = (w * 0.8) / count;
        const baseLength = h * 0.3 + rng() * h * 0.2;
        const lengthStep = (rng() * 0.03) + 0.01;

        for (let i = 0; i < count; i++) {
            const length = baseLength * (1 + i * lengthStep);
            this.pendulums.push({
                anchorX: startX + i * spacing,
                anchorY: h * 0.15,
                length,
                angle: (rng() - 0.5) * 0.8,
                velocity: 0,
                gravity: 0.0005 + rng() * 0.0002,
                damping: 0.9995,
                bobRadius: 6 + rng() * 8,
                hue: (this.baseHue + i * (360 / count)) % 360,
                trail: [],
            });
        }
    }

    _initCamMechanism(rng, w, h) {
        this.cranks = [];
        const crankCount = 3 + Math.floor(rng() * 4);

        for (let i = 0; i < crankCount; i++) {
            const cx = w * (0.2 + (i / crankCount) * 0.6);
            const cy = h * (0.3 + rng() * 0.4);
            const crankRadius = 30 + rng() * 50;
            const rodLength = crankRadius * (2 + rng() * 2);
            const lobes = 1 + Math.floor(rng() * 3);

            this.cranks.push({
                x: cx, y: cy,
                crankRadius,
                rodLength,
                angle: rng() * Math.PI * 2,
                speed: 0.015 + rng() * 0.02,
                lobes,
                followerX: cx, followerY: cy - rodLength,
                armWidth: 4 + rng() * 6,
                connected: i > 0 ? i - 1 : -1,
            });
        }
    }

    _initOrbitingRings(rng, w, h) {
        this.orbits = [];
        const ringCount = 4 + Math.floor(rng() * 6);

        for (let i = 0; i < ringCount; i++) {
            const radius = 40 + i * (20 + rng() * 30);
            const ballCount = 3 + Math.floor(rng() * 8);
            const balls = [];
            for (let b = 0; b < ballCount; b++) {
                balls.push({
                    angle: (b / ballCount) * Math.PI * 2,
                    size: 3 + rng() * 5,
                    hue: (this.baseHue + b * 30 + i * 60) % 360,
                });
            }

            this.orbits.push({
                cx: w / 2 + (rng() - 0.5) * 100,
                cy: h / 2 + (rng() - 0.5) * 100,
                radius,
                tiltX: 0.3 + rng() * 0.7,
                tiltY: 0.3 + rng() * 0.7,
                speed: (0.005 + rng() * 0.02) * (rng() > 0.5 ? 1 : -1),
                ringAngle: rng() * Math.PI * 2,
                ringTilt: rng() * Math.PI * 0.5,
                balls,
                lineWidth: 1 + rng() * 2,
            });
        }
    }

    _initClockwork(rng, w, h) {
        // Combined: central gear + radiating pendulums + connecting rods
        this._initGearTrain(rng, w, h);

        this.pendulums = [];
        // Add pendulums to some gears
        for (let i = 0; i < this.gears.length; i++) {
            if (rng() > 0.5) {
                this.pendulums.push({
                    anchorX: this.gears[i].x,
                    anchorY: this.gears[i].y,
                    length: this.gears[i].radius * (1.5 + rng()),
                    angle: rng() * Math.PI * 0.3,
                    velocity: 0,
                    gravity: 0.0004 + rng() * 0.0003,
                    damping: 0.9998,
                    bobRadius: 5 + rng() * 6,
                    hue: (this.baseHue + i * 50) % 360,
                    trail: [],
                    gearIndex: i,
                });
            }
        }
    }

    update(system) {
        this.tick++;

        // Mouse proximity adds energy
        const mouseDist = Math.hypot(mouse.x - system.width / 2, mouse.y - system.height / 2);
        if (mouseDist < 300) {
            this.energy = Math.min(3, this.energy + 0.01);
        } else {
            this.energy = Math.max(0.5, this.energy - 0.002);
        }

        // Update gears
        for (const gear of this.gears) {
            gear.angle += gear.speed * gear.direction * this.energy;
        }

        // Update pendulums
        for (const p of this.pendulums) {
            // If attached to gear, anchor moves
            if (p.gearIndex !== undefined && this.gears[p.gearIndex]) {
                const g = this.gears[p.gearIndex];
                p.anchorX = g.x;
                p.anchorY = g.y;
            }

            const accel = -p.gravity * Math.sin(p.angle) * this.energy;
            p.velocity += accel;
            p.velocity *= p.damping;
            p.angle += p.velocity;

            const bobX = p.anchorX + Math.sin(p.angle) * p.length;
            const bobY = p.anchorY + Math.cos(p.angle) * p.length;
            p.trail.push({ x: bobX, y: bobY });
            if (p.trail.length > 40) p.trail.shift();
        }

        // Update cranks
        for (const crank of this.cranks) {
            crank.angle += crank.speed * this.energy;
            // Cam profile with lobes
            const camOffset = crank.crankRadius * (1 + 0.3 * Math.sin(crank.angle * crank.lobes));
            crank.followerX = crank.x + Math.cos(crank.angle) * camOffset;
            crank.followerY = crank.y + Math.sin(crank.angle) * camOffset;
        }

        // Update orbiting rings
        for (const orbit of this.orbits) {
            orbit.ringAngle += orbit.speed * this.energy;
            for (const ball of orbit.balls) {
                ball.angle += orbit.speed * this.energy;
            }

            // Mouse gravitational influence
            const dmx = mouse.x - orbit.cx;
            const dmy = mouse.y - orbit.cy;
            const dist = Math.sqrt(dmx * dmx + dmy * dmy);
            if (dist < 300 && dist > 10) {
                orbit.cx += dmx * 0.002;
                orbit.cy += dmy * 0.002;
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const mat = this.material;
        const isWireframe = this.materialStyle === 3;

        // Draw connecting rods between cranks
        if (this.cranks.length > 0) {
            for (const crank of this.cranks) {
                // Draw cam disc
                ctx.save();
                ctx.translate(crank.x, crank.y);
                ctx.rotate(crank.angle);

                if (isWireframe) {
                    ctx.strokeStyle = mat.stroke;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    for (let a = 0; a < Math.PI * 2; a += 0.05) {
                        const camR = crank.crankRadius * (1 + 0.3 * Math.sin(a * crank.lobes));
                        const px = Math.cos(a) * camR;
                        const py = Math.sin(a) * camR;
                        if (a === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.stroke();
                } else {
                    ctx.fillStyle = mat.fill;
                    ctx.strokeStyle = mat.stroke;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    for (let a = 0; a < Math.PI * 2; a += 0.05) {
                        const camR = crank.crankRadius * (1 + 0.3 * Math.sin(a * crank.lobes));
                        const px = Math.cos(a) * camR;
                        const py = Math.sin(a) * camR;
                        if (a === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.restore();

                // Follower rod
                ctx.strokeStyle = mat.stroke;
                ctx.lineWidth = crank.armWidth;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(crank.followerX, crank.followerY);
                ctx.lineTo(crank.x, crank.y);
                ctx.stroke();

                // Follower head
                ctx.fillStyle = mat.highlight;
                ctx.beginPath();
                ctx.arc(crank.followerX, crank.followerY, crank.armWidth, 0, Math.PI * 2);
                ctx.fill();

                // Axle
                ctx.fillStyle = mat.shadow;
                ctx.beginPath();
                ctx.arc(crank.x, crank.y, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw gears
        for (const gear of this.gears) {
            this._drawGear(ctx, gear, isWireframe, mat);
        }

        // Draw pendulums
        for (const p of this.pendulums) {
            const bobX = p.anchorX + Math.sin(p.angle) * p.length;
            const bobY = p.anchorY + Math.cos(p.angle) * p.length;

            // Trail
            if (p.trail.length > 1) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.beginPath();
                ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let i = 1; i < p.trail.length; i++) {
                    ctx.lineTo(p.trail[i].x, p.trail[i].y);
                }
                ctx.strokeStyle = `hsla(${p.hue}, 80%, 60%, 0.2)`;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            }

            // Rod
            ctx.strokeStyle = mat.stroke;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p.anchorX, p.anchorY);
            ctx.lineTo(bobX, bobY);
            ctx.stroke();

            // Bob
            if (isWireframe) {
                ctx.strokeStyle = `hsl(${p.hue}, 100%, 60%)`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(bobX, bobY, p.bobRadius, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                const bobGrad = ctx.createRadialGradient(bobX - 2, bobY - 2, 0, bobX, bobY, p.bobRadius);
                bobGrad.addColorStop(0, mat.highlight);
                bobGrad.addColorStop(1, mat.fill);
                ctx.fillStyle = bobGrad;
                ctx.beginPath();
                ctx.arc(bobX, bobY, p.bobRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = mat.stroke;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Anchor pin
            ctx.fillStyle = mat.shadow;
            ctx.beginPath();
            ctx.arc(p.anchorX, p.anchorY, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw orbiting rings
        for (const orbit of this.orbits) {
            ctx.save();
            ctx.translate(orbit.cx, orbit.cy);

            // Ring ellipse
            ctx.strokeStyle = isWireframe ? mat.stroke : `${mat.stroke}88`;
            ctx.lineWidth = orbit.lineWidth;
            ctx.beginPath();
            ctx.ellipse(0, 0, orbit.radius * orbit.tiltX, orbit.radius * orbit.tiltY, orbit.ringTilt + orbit.ringAngle * 0.1, 0, Math.PI * 2);
            ctx.stroke();

            // Balls on ring
            for (const ball of orbit.balls) {
                const bx = Math.cos(ball.angle) * orbit.radius * orbit.tiltX * Math.cos(orbit.ringTilt);
                const by = Math.sin(ball.angle) * orbit.radius * orbit.tiltY;
                const bz = Math.cos(ball.angle) * orbit.radius * orbit.tiltX * Math.sin(orbit.ringTilt);

                // Simple depth scaling
                const depth = 1 + bz * 0.002;
                const screenSize = ball.size * depth;

                if (isWireframe) {
                    ctx.strokeStyle = `hsl(${ball.hue}, 100%, 60%)`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(bx, by, screenSize, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    const ballGrad = ctx.createRadialGradient(bx - 1, by - 1, 0, bx, by, screenSize);
                    ballGrad.addColorStop(0, `hsl(${ball.hue}, 80%, 80%)`);
                    ballGrad.addColorStop(1, `hsl(${ball.hue}, 60%, 30%)`);
                    ctx.fillStyle = ballGrad;
                    ctx.beginPath();
                    ctx.arc(bx, by, screenSize, 0, Math.PI * 2);
                    ctx.fill();

                    // Glow
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 0.3;
                    const glow = ctx.createRadialGradient(bx, by, 0, bx, by, screenSize * 3);
                    glow.addColorStop(0, `hsl(${ball.hue}, 90%, 70%)`);
                    glow.addColorStop(1, 'transparent');
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(bx, by, screenSize * 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            ctx.restore();
        }
    }

    _drawGear(ctx, gear, isWireframe, mat) {
        ctx.save();
        ctx.translate(gear.x, gear.y);
        ctx.rotate(gear.angle);

        const { radius, teeth, toothDepth } = gear;

        // Gear tooth profile
        ctx.beginPath();
        for (let i = 0; i < teeth; i++) {
            const a1 = (i / teeth) * Math.PI * 2;
            const a2 = ((i + 0.3) / teeth) * Math.PI * 2;
            const a3 = ((i + 0.5) / teeth) * Math.PI * 2;
            const a4 = ((i + 0.7) / teeth) * Math.PI * 2;

            const outerR = radius + toothDepth;
            ctx.lineTo(Math.cos(a1) * radius, Math.sin(a1) * radius);
            ctx.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
            ctx.lineTo(Math.cos(a3) * outerR, Math.sin(a3) * outerR);
            ctx.lineTo(Math.cos(a4) * radius, Math.sin(a4) * radius);
        }
        ctx.closePath();

        if (isWireframe) {
            ctx.strokeStyle = mat.stroke;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else {
            // Metallic gradient
            const gearGrad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius + toothDepth);
            gearGrad.addColorStop(0, mat.highlight);
            gearGrad.addColorStop(0.5, mat.fill);
            gearGrad.addColorStop(1, mat.shadow);
            ctx.fillStyle = gearGrad;
            ctx.fill();
            ctx.strokeStyle = mat.stroke;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Inner ring / cutouts
        if (gear.innerRing) {
            ctx.beginPath();
            ctx.arc(0, 0, gear.innerRadius, 0, Math.PI * 2);
            if (isWireframe) {
                ctx.strokeStyle = mat.stroke;
                ctx.stroke();
            } else {
                ctx.fillStyle = mat.shadow;
                ctx.fill();
            }
        }

        // Spokes
        if (gear.spokes > 0 && !isWireframe) {
            ctx.strokeStyle = mat.fill;
            ctx.lineWidth = 3;
            for (let s = 0; s < gear.spokes; s++) {
                const sa = (s / gear.spokes) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(sa) * (gear.axleRadius + 2), Math.sin(sa) * (gear.axleRadius + 2));
                ctx.lineTo(Math.cos(sa) * (gear.innerRadius || radius * 0.7), Math.sin(sa) * (gear.innerRadius || radius * 0.7));
                ctx.stroke();
            }
        }

        // Axle
        if (gear.hasAxle) {
            ctx.beginPath();
            ctx.arc(0, 0, gear.axleRadius, 0, Math.PI * 2);
            if (isWireframe) {
                ctx.strokeStyle = mat.highlight;
                ctx.lineWidth = 1;
                ctx.stroke();
            } else {
                ctx.fillStyle = mat.shadow;
                ctx.fill();
                ctx.strokeStyle = mat.stroke;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}
