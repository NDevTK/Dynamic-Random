/**
 * @file bioluminescent_ocean_architecture.js
 * @description Deep ocean surface simulation with bioluminescent waves, floating
 * jellyfish, plankton trails, and underwater caustics. Each seed creates a unique
 * ocean: tropical turquoise with gentle swells, arctic dark with violent waves,
 * alien ocean with bizarre colors, deep abyss with angler-fish lights, or
 * phosphorescent tide pools. Mouse creates ripples and disturbs the plankton.
 * Click creates splash impacts with spray particles.
 */

import { Architecture } from './background_architectures.js';
import { mouse, isLeftMouseDown } from './state.js';

export class BioluminescentOceanArchitecture extends Architecture {
    constructor() {
        super();
        this.waves = [];
        this.jellyfish = [];
        this.plankton = [];
        this.ripples = [];
        this.splashes = [];
        this.caustics = [];
        this.oceanStyle = 0;
        this.palette = null;
        this.waveAmplitude = 0;
        this.waveFrequency = 0;
        this.waveSpeed = 0;
        this.currentStrength = 0;
        this.tick = 0;
        this.bioGlowIntensity = 0;
        this.depthFog = 0;
        this.surfaceY = 0;
    }

    init(system) {
        const rng = system.rng;
        const w = system.width, h = system.height;

        this.oceanStyle = Math.floor(rng() * 6);
        // 0=tropical bioluminescent, 1=arctic deep, 2=alien ocean,
        // 3=deep abyss, 4=phosphorescent tide, 5=coral reef shallows

        this.waveAmplitude = 15 + rng() * 40;
        this.waveFrequency = 0.005 + rng() * 0.015;
        this.waveSpeed = 0.01 + rng() * 0.03;
        this.currentStrength = 0.2 + rng() * 0.8;
        this.bioGlowIntensity = 0.3 + rng() * 0.7;
        this.depthFog = 0.3 + rng() * 0.5;
        this.surfaceY = h * (0.15 + rng() * 0.15);

        const palettes = [
            // Tropical bioluminescent
            { water: [[0,40,60],[0,15,30]], surface: [0,80,100], bio: [[0,255,200],[50,200,255],[100,255,180]],
              jelly: [[0,200,255,0.3],[100,255,200,0.3],[200,100,255,0.3]], foam: [180,230,255] },
            // Arctic deep
            { water: [[10,15,30],[5,5,15]], surface: [20,30,50], bio: [[80,150,255],[100,200,255],[150,180,255]],
              jelly: [[100,150,255,0.2],[50,100,200,0.3],[150,200,255,0.2]], foam: [200,220,240] },
            // Alien ocean
            { water: [[30,10,40],[15,5,25]], surface: [60,20,80], bio: [[255,0,200],[200,50,255],[255,100,150]],
              jelly: [[255,50,200,0.3],[200,0,255,0.3],[255,100,100,0.3]], foam: [255,180,220] },
            // Deep abyss
            { water: [[2,2,8],[0,0,3]], surface: [5,5,15], bio: [[255,200,50],[200,255,100],[255,100,50]],
              jelly: [[255,200,0,0.2],[200,150,0,0.3],[255,100,50,0.2]], foam: [100,80,60] },
            // Phosphorescent tide
            { water: [[0,30,40],[0,10,20]], surface: [0,60,70], bio: [[0,255,100],[100,255,50],[50,255,150]],
              jelly: [[0,255,100,0.3],[100,255,0,0.3],[50,200,100,0.3]], foam: [150,255,200] },
            // Coral reef shallows
            { water: [[0,50,70],[0,30,50]], surface: [0,100,120], bio: [[255,150,50],[255,100,100],[255,200,100]],
              jelly: [[255,150,100,0.3],[255,200,50,0.3],[255,100,150,0.3]], foam: [255,240,220] },
        ];
        this.palette = palettes[this.oceanStyle];

        // Generate wave layers
        this.waves = [];
        const layerCount = 4 + Math.floor(rng() * 3);
        for (let i = 0; i < layerCount; i++) {
            this.waves.push({
                yOffset: this.surfaceY + i * (h - this.surfaceY) / layerCount,
                amplitude: this.waveAmplitude * (1 - i * 0.15),
                frequency: this.waveFrequency * (1 + i * 0.3),
                speed: this.waveSpeed * (1 - i * 0.1),
                phase: rng() * Math.PI * 2,
                depth: i / layerCount, // 0=surface, 1=deep
                secondaryAmp: 5 + rng() * 15,
                secondaryFreq: 0.01 + rng() * 0.02
            });
        }

        // Generate jellyfish
        this.jellyfish = [];
        const jellyCount = 4 + Math.floor(rng() * 8);
        for (let i = 0; i < jellyCount; i++) {
            const jc = this.palette.jelly[Math.floor(rng() * this.palette.jelly.length)];
            this.jellyfish.push({
                x: rng() * w,
                y: this.surfaceY + 50 + rng() * (h - this.surfaceY - 100),
                size: 15 + rng() * 35,
                pulsePhase: rng() * Math.PI * 2,
                pulseSpeed: 0.02 + rng() * 0.04,
                driftSpeed: 0.2 + rng() * 0.5,
                driftAngle: rng() * Math.PI * 2,
                tentacleCount: 3 + Math.floor(rng() * 6),
                tentacleLength: 30 + rng() * 60,
                color: jc,
                wobble: rng() * Math.PI * 2,
                glowPhase: rng() * Math.PI * 2
            });
        }

        // Generate plankton
        this.plankton = [];
        const planktonCount = 150 + Math.floor(rng() * 150);
        for (let i = 0; i < planktonCount; i++) {
            this.plankton.push({
                x: rng() * w,
                y: this.surfaceY + rng() * (h - this.surfaceY),
                size: 0.5 + rng() * 2,
                brightness: 0,
                maxBrightness: 0.3 + rng() * 0.7,
                exciteDecay: 0.01 + rng() * 0.03,
                driftX: (rng() - 0.5) * 0.3,
                driftY: (rng() - 0.5) * 0.2,
                phase: rng() * Math.PI * 2
            });
        }

        // Caustic light pattern nodes
        this.caustics = [];
        const causticCount = 20 + Math.floor(rng() * 20);
        for (let i = 0; i < causticCount; i++) {
            this.caustics.push({
                x: rng() * w,
                y: this.surfaceY + rng() * (h - this.surfaceY) * 0.5,
                size: 30 + rng() * 80,
                phase: rng() * Math.PI * 2,
                speed: 0.005 + rng() * 0.02,
                driftX: (rng() - 0.5) * 0.3,
                driftY: (rng() - 0.5) * 0.1
            });
        }

        this.ripples = [];
        this.splashes = [];
        this.tick = 0;
    }

    update(system) {
        this.tick++;
        const w = system.width, h = system.height;
        const mx = mouse.x, my = mouse.y;

        // Update wave phases
        for (const wave of this.waves) {
            wave.phase += wave.speed;
        }

        // Update jellyfish
        for (const jf of this.jellyfish) {
            jf.pulsePhase += jf.pulseSpeed;
            jf.wobble += 0.015;
            jf.glowPhase += 0.02;

            // Drift with current
            jf.x += Math.cos(jf.driftAngle) * jf.driftSpeed + this.currentStrength * 0.3;
            jf.y += Math.sin(jf.driftAngle) * jf.driftSpeed * 0.3;
            jf.y += Math.sin(jf.wobble) * 0.5; // gentle bobbing

            // Avoid mouse
            const dx = mx - jf.x, dy = my - jf.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                jf.x -= dx / dist * 0.5;
                jf.y -= dy / dist * 0.3;
            }

            // Wrap
            if (jf.x > w + 50) jf.x = -50;
            if (jf.x < -50) jf.x = w + 50;
            if (jf.y < this.surfaceY + 20) jf.y = this.surfaceY + 20;
            if (jf.y > h - 20) jf.y = h - 20;
        }

        // Update plankton
        for (const p of this.plankton) {
            // Drift
            p.x += p.driftX + this.currentStrength * 0.1;
            p.y += p.driftY;
            p.phase += 0.02;

            // Excite plankton near mouse (bioluminescence!)
            const dx = mx - p.x, dy = my - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                p.brightness = Math.min(p.maxBrightness, p.brightness + 0.05);
            } else {
                p.brightness = Math.max(0, p.brightness - p.exciteDecay);
            }

            // Ambient twinkle
            if (p.brightness < 0.05 && Math.random() < 0.001) {
                p.brightness = p.maxBrightness * 0.3;
            }

            // Wrap
            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;
            if (p.y < this.surfaceY) p.y = h;
            if (p.y > h) p.y = this.surfaceY;
        }

        // Update caustics
        for (const c of this.caustics) {
            c.phase += c.speed;
            c.x += c.driftX;
            c.y += c.driftY;
            if (c.x < -100) c.x = w + 100;
            if (c.x > w + 100) c.x = -100;
        }

        // Update ripples
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            this.ripples[i].radius += 1.5;
            this.ripples[i].alpha -= 0.01;
            if (this.ripples[i].alpha <= 0) this.ripples.splice(i, 1);
        }

        // Mouse creates ripples on surface
        if (my < this.surfaceY + 100 && my > this.surfaceY - 30 && this.tick % 8 === 0) {
            if (this.ripples.length < 20) {
                this.ripples.push({ x: mx, y: this.surfaceY, radius: 5, alpha: 0.5 });
            }
        }

        // Update splashes
        for (let i = this.splashes.length - 1; i >= 0; i--) {
            const s = this.splashes[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.15; // gravity
            s.life -= 0.02;
            if (s.life <= 0) this.splashes.splice(i, 1);
        }
    }

    _getWaveY(x, wave) {
        return wave.yOffset +
            Math.sin(x * wave.frequency + wave.phase) * wave.amplitude +
            Math.sin(x * wave.secondaryFreq + wave.phase * 1.5) * wave.secondaryAmp;
    }

    draw(system) {
        const ctx = system.ctx;
        const w = system.width, h = system.height;
        const pal = this.palette;

        // Deep water gradient
        const waterGrad = ctx.createLinearGradient(0, this.surfaceY, 0, h);
        waterGrad.addColorStop(0, `rgb(${pal.water[0].join(',')})`);
        waterGrad.addColorStop(1, `rgb(${pal.water[1].join(',')})`);
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, this.surfaceY - 10, w, h - this.surfaceY + 10);

        // Caustic light patterns
        ctx.globalCompositeOperation = 'lighter';
        for (const c of this.caustics) {
            const intensity = (Math.sin(c.phase) + 1) * 0.5 * 0.08;
            const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size);
            grad.addColorStop(0, `rgba(${pal.surface[0]+50},${pal.surface[1]+50},${pal.surface[2]+50}, ${intensity})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw jellyfish
        for (const jf of this.jellyfish) {
            const pulse = Math.sin(jf.pulsePhase);
            const bodyW = jf.size * (0.8 + pulse * 0.2);
            const bodyH = jf.size * (0.6 + pulse * 0.15);
            const glowA = (Math.sin(jf.glowPhase) + 1) * 0.5 * 0.3 + 0.1;

            // Glow aura
            const jGrad = ctx.createRadialGradient(jf.x, jf.y, 0, jf.x, jf.y, jf.size * 2);
            jGrad.addColorStop(0, `rgba(${jf.color[0]},${jf.color[1]},${jf.color[2]}, ${glowA})`);
            jGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = jGrad;
            ctx.beginPath();
            ctx.arc(jf.x, jf.y, jf.size * 2, 0, Math.PI * 2);
            ctx.fill();

            // Bell (dome)
            ctx.fillStyle = `rgba(${jf.color[0]},${jf.color[1]},${jf.color[2]}, ${jf.color[3] || 0.3})`;
            ctx.beginPath();
            ctx.ellipse(jf.x, jf.y, bodyW, bodyH, 0, Math.PI, 0);
            ctx.fill();

            // Inner highlight
            ctx.fillStyle = `rgba(${Math.min(255,jf.color[0]+80)},${Math.min(255,jf.color[1]+80)},${Math.min(255,jf.color[2]+80)}, 0.2)`;
            ctx.beginPath();
            ctx.ellipse(jf.x, jf.y - bodyH * 0.2, bodyW * 0.5, bodyH * 0.4, 0, Math.PI, 0);
            ctx.fill();

            // Tentacles
            ctx.strokeStyle = `rgba(${jf.color[0]},${jf.color[1]},${jf.color[2]}, ${(jf.color[3] || 0.3) * 0.6})`;
            ctx.lineWidth = 1.5;
            for (let t = 0; t < jf.tentacleCount; t++) {
                const tentStartX = jf.x + (t - jf.tentacleCount / 2) * (bodyW * 2 / jf.tentacleCount);
                ctx.beginPath();
                ctx.moveTo(tentStartX, jf.y);
                let tx = tentStartX, ty = jf.y;
                const segments = 8;
                for (let s = 1; s <= segments; s++) {
                    const progress = s / segments;
                    tx = tentStartX + Math.sin(jf.wobble + t * 1.5 + s * 0.5) * 10 * progress;
                    ty = jf.y + progress * jf.tentacleLength * (0.8 + pulse * 0.2);
                    ctx.lineTo(tx, ty);
                }
                ctx.stroke();

                // Tentacle tip glow
                ctx.fillStyle = `rgba(${jf.color[0]},${jf.color[1]},${jf.color[2]}, ${glowA * 0.5})`;
                ctx.beginPath();
                ctx.arc(tx, ty, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw plankton (bioluminescence)
        for (const p of this.plankton) {
            if (p.brightness < 0.01) continue;
            const bio = pal.bio[Math.floor(p.phase) % pal.bio.length];
            const a = p.brightness * this.bioGlowIntensity;

            // Glow
            const pGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
            pGrad.addColorStop(0, `rgba(${bio.join(',')}, ${a})`);
            pGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `rgba(${bio.join(',')}, ${a * 1.5})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // Draw wave layers (front to back for depth)
        for (let i = this.waves.length - 1; i >= 0; i--) {
            const wave = this.waves[i];
            const depth = wave.depth;
            const alpha = 0.1 + depth * 0.15;

            ctx.beginPath();
            ctx.moveTo(0, h);
            for (let x = 0; x <= w; x += 4) {
                const wy = this._getWaveY(x, wave);
                ctx.lineTo(x, wy);
            }
            ctx.lineTo(w, h);
            ctx.closePath();

            const waveColor = pal.water[0];
            ctx.fillStyle = `rgba(${waveColor[0] + depth * 20},${waveColor[1] + depth * 10},${waveColor[2] + depth * 10}, ${alpha})`;
            ctx.fill();

            // Surface foam on top wave
            if (i === 0) {
                ctx.strokeStyle = `rgba(${pal.foam.join(',')}, 0.15)`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (let x = 0; x <= w; x += 4) {
                    const wy = this._getWaveY(x, wave);
                    if (x === 0) ctx.moveTo(x, wy);
                    else ctx.lineTo(x, wy);
                }
                ctx.stroke();
            }
        }

        // Ripples
        ctx.globalCompositeOperation = 'lighter';
        for (const ripple of this.ripples) {
            ctx.beginPath();
            ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${pal.bio[0].join(',')}, ${ripple.alpha * 0.4})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Splashes
        for (const s of this.splashes) {
            ctx.fillStyle = `rgba(${pal.foam.join(',')}, ${s.life})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // Depth fog at bottom
        const fogGrad = ctx.createLinearGradient(0, h - 100, 0, h);
        fogGrad.addColorStop(0, 'transparent');
        fogGrad.addColorStop(1, `rgba(${pal.water[1].join(',')}, ${this.depthFog})`);
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, h - 100, w, 100);
    }

    onShockwave(x, y) {
        // Create splash
        for (let i = 0; i < 15; i++) {
            const angle = -Math.PI * Math.random();
            const speed = 2 + Math.random() * 5;
            this.splashes.push({
                x, y: Math.min(y, this.surfaceY + 20),
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 1
            });
        }
        // Excite nearby plankton
        for (const p of this.plankton) {
            const dx = x - p.x, dy = y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200) {
                p.brightness = p.maxBrightness;
            }
        }
        // Big ripple
        this.ripples.push({ x, y: this.surfaceY, radius: 5, alpha: 0.8 });
    }
}
