/**
 * @file gravity_sandbox_architecture.js
 * @description Mini solar system sandbox with orbiting planets, moons, asteroid belts,
 * comets, and gravitational interactions. Mouse creates gravitational disturbances.
 * Seed determines star types, planet count, orbital mechanics, ring systems, and colors.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class GravitySandboxArchitecture extends Architecture {
    constructor() {
        super();
        this.stars = [];
        this.planets = [];
        this.moons = [];
        this.asteroids = [];
        this.comets = [];
        this.trails = [];
        this.dustRings = [];
        this.systemType = 0;
        this.timeScale = 1;
        this.gravitationalConstant = 0;
    }

    init(system) {
        const rng = system.rng;
        const w = system.width;
        const h = system.height;

        // System type dramatically changes the look
        // 0=single star, 1=binary star, 2=trinary, 3=rogue planets (no star), 4=dense cluster
        this.systemType = Math.floor(rng() * 5);
        this.gravitationalConstant = 0.3 + rng() * 0.7;
        this.timeScale = 0.5 + rng() * 1.5;
        this.baseHue = system.hue;

        // Star color palettes based on seed
        const starPalettes = [
            { core: '#fffbe6', corona: '#ffaa33', flare: '#ff6600' },  // Yellow dwarf
            { core: '#e0e8ff', corona: '#6699ff', flare: '#3355cc' },  // Blue giant
            { core: '#ffe0e0', corona: '#ff4444', flare: '#cc0000' },  // Red giant
            { core: '#ffffff', corona: '#eeeeff', flare: '#aabbff' },  // White dwarf
            { core: '#ffccff', corona: '#cc66ff', flare: '#9933cc' },  // Exotic pulsar
        ];
        this.starPalette = starPalettes[Math.floor(rng() * starPalettes.length)];

        // Generate stars
        this.stars = [];
        const starCount = this.systemType === 3 ? 0 : (this.systemType === 4 ? 4 + Math.floor(rng() * 3) : this.systemType + 1);
        for (let i = 0; i < starCount; i++) {
            const orbitAngle = (i / Math.max(1, starCount)) * Math.PI * 2;
            const orbitRadius = starCount > 1 ? 60 + rng() * 40 : 0;
            const palette = starPalettes[Math.floor(rng() * starPalettes.length)];
            this.stars.push({
                x: w / 2 + Math.cos(orbitAngle) * orbitRadius,
                y: h / 2 + Math.sin(orbitAngle) * orbitRadius,
                baseX: w / 2,
                baseY: h / 2,
                orbitAngle,
                orbitRadius,
                orbitSpeed: 0.002 + rng() * 0.003,
                radius: 20 + rng() * 25,
                mass: 500 + rng() * 500,
                pulsePhase: rng() * Math.PI * 2,
                pulseSpeed: 0.02 + rng() * 0.03,
                palette,
                flareAngle: rng() * Math.PI * 2,
                flareCount: 3 + Math.floor(rng() * 5),
            });
        }

        // Generate planets
        this.planets = [];
        const planetCount = 4 + Math.floor(rng() * 8);
        for (let i = 0; i < planetCount; i++) {
            const orbitRadius = 100 + i * (40 + rng() * 60);
            const planetHue = (this.baseHue + rng() * 180) % 360;
            const hasRing = rng() > 0.7;
            const planetSize = 4 + rng() * 12;
            this.planets.push({
                orbitRadius,
                angle: rng() * Math.PI * 2,
                speed: (0.005 + rng() * 0.015) / Math.sqrt(orbitRadius / 100),
                x: 0, y: 0,
                size: planetSize,
                hue: planetHue,
                saturation: 40 + rng() * 40,
                lightness: 30 + rng() * 30,
                hasRing,
                ringInnerMult: 1.3 + rng() * 0.3,
                ringOuterMult: 1.8 + rng() * 0.8,
                ringHue: (planetHue + 30 + rng() * 60) % 360,
                ringAlpha: 0.2 + rng() * 0.3,
                eccentricity: rng() * 0.3,
                tilt: (rng() - 0.5) * 0.4,
                mass: 10 + planetSize * 5,
                trail: [],
                trailHue: planetHue,
                atmosphereAlpha: rng() * 0.3,
                atmosphereHue: (planetHue + 20) % 360,
                starIndex: Math.floor(rng() * Math.max(1, starCount)),
                pattern: Math.floor(rng() * 4), // 0=solid, 1=striped, 2=spotted, 3=gradient
            });
        }

        // Generate moons for some planets
        this.moons = [];
        for (let i = 0; i < this.planets.length; i++) {
            if (rng() > 0.5 && this.planets[i].size > 6) {
                const moonCount = 1 + Math.floor(rng() * 3);
                for (let m = 0; m < moonCount; m++) {
                    this.moons.push({
                        planetIndex: i,
                        orbitRadius: this.planets[i].size * 2 + 5 + m * 8,
                        angle: rng() * Math.PI * 2,
                        speed: 0.02 + rng() * 0.04,
                        size: 1.5 + rng() * 2.5,
                        hue: (this.planets[i].hue + 40 + rng() * 60) % 360,
                        x: 0, y: 0,
                    });
                }
            }
        }

        // Generate asteroid belt
        this.asteroids = [];
        const beltRadius = 80 + Math.floor(rng() * planetCount * 30);
        const asteroidCount = Math.floor(40 + rng() * 60);
        for (let i = 0; i < asteroidCount; i++) {
            this.asteroids.push({
                orbitRadius: beltRadius + (rng() - 0.5) * 40,
                angle: rng() * Math.PI * 2,
                speed: (0.003 + rng() * 0.007) / Math.sqrt(beltRadius / 100),
                size: 1 + rng() * 2,
                alpha: 0.3 + rng() * 0.5,
                wobble: rng() * 0.2,
                wobbleSpeed: rng() * 0.05,
            });
        }

        // Generate comets
        this.comets = [];
        const cometCount = 2 + Math.floor(rng() * 4);
        for (let i = 0; i < cometCount; i++) {
            this._spawnComet(rng, w, h);
        }

        this.tick = 0;
        this.mouseInfluence = { x: 0, y: 0, active: false };
    }

    _spawnComet(rng, w, h) {
        const angle = rng() * Math.PI * 2;
        const dist = Math.max(w, h) * 0.6;
        this.comets.push({
            x: w / 2 + Math.cos(angle) * dist,
            y: h / 2 + Math.sin(angle) * dist,
            vx: (rng() - 0.5) * 4,
            vy: (rng() - 0.5) * 4,
            size: 2 + rng() * 3,
            tail: [],
            maxTail: 30 + Math.floor(rng() * 30),
            hue: 180 + rng() * 60,
            life: 300 + Math.floor(rng() * 400),
        });
    }

    update(system) {
        this.tick++;
        const w = system.width;
        const h = system.height;
        const cx = w / 2;
        const cy = h / 2;
        const dt = this.timeScale;

        // Update star positions (binary/trinary orbits)
        for (const star of this.stars) {
            star.orbitAngle += star.orbitSpeed * dt;
            star.x = star.baseX + Math.cos(star.orbitAngle) * star.orbitRadius;
            star.y = star.baseY + Math.sin(star.orbitAngle) * star.orbitRadius;
            star.pulsePhase += star.pulseSpeed;
            star.flareAngle += 0.003;
        }

        // Update planets
        for (const planet of this.planets) {
            planet.angle += planet.speed * dt * (1 + planet.eccentricity * Math.sin(planet.angle));
            const star = this.stars[planet.starIndex] || { x: cx, y: cy };
            const r = planet.orbitRadius * (1 - planet.eccentricity * Math.cos(planet.angle));
            planet.x = star.x + Math.cos(planet.angle) * r;
            planet.y = star.y + Math.sin(planet.angle + planet.tilt) * r;

            // Mouse gravitational pull
            const dmx = mouse.x - planet.x;
            const dmy = mouse.y - planet.y;
            const dmDist = Math.sqrt(dmx * dmx + dmy * dmy);
            if (dmDist < 300 && dmDist > 20) {
                const force = 50 / (dmDist * dmDist) * this.gravitationalConstant;
                planet.x += dmx * force;
                planet.y += dmy * force;
            }

            // Trail (limit length)
            planet.trail.push({ x: planet.x, y: planet.y });
            if (planet.trail.length > 60) planet.trail.shift();
        }

        // Update moons
        for (const moon of this.moons) {
            const planet = this.planets[moon.planetIndex];
            if (!planet) continue;
            moon.angle += moon.speed * dt;
            moon.x = planet.x + Math.cos(moon.angle) * moon.orbitRadius;
            moon.y = planet.y + Math.sin(moon.angle) * moon.orbitRadius;
        }

        // Update asteroids
        for (const a of this.asteroids) {
            a.angle += a.speed * dt;
        }

        // Update comets with gravity
        for (let i = this.comets.length - 1; i >= 0; i--) {
            const c = this.comets[i];
            // Gravitational pull toward stars
            for (const star of this.stars) {
                const dx = star.x - c.x;
                const dy = star.y - c.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 10) {
                    const force = star.mass * this.gravitationalConstant / (dist * dist);
                    c.vx += (dx / dist) * force * 0.01;
                    c.vy += (dy / dist) * force * 0.01;
                }
            }

            c.x += c.vx * dt;
            c.y += c.vy * dt;
            c.tail.push({ x: c.x, y: c.y });
            if (c.tail.length > c.maxTail) c.tail.shift();
            c.life--;

            if (c.life <= 0 || c.x < -200 || c.x > w + 200 || c.y < -200 || c.y > h + 200) {
                this.comets.splice(i, 1);
                if (this.comets.length < 6) {
                    this._spawnComet(system.rng, w, h);
                }
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const cx = system.width / 2;
        const cy = system.height / 2;

        // Draw orbit paths (faint)
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = `hsl(${this.baseHue}, 30%, 40%)`;
        ctx.lineWidth = 0.5;
        for (const planet of this.planets) {
            const star = this.stars[planet.starIndex] || { x: cx, y: cy };
            ctx.beginPath();
            ctx.ellipse(star.x, star.y, planet.orbitRadius, planet.orbitRadius * (1 - planet.eccentricity * 0.5), planet.tilt, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        // Draw asteroid belt
        ctx.save();
        ctx.fillStyle = `hsla(${this.baseHue + 30}, 20%, 60%, 0.6)`;
        for (const a of this.asteroids) {
            const star = this.stars[0] || { x: cx, y: cy };
            const wobble = Math.sin(this.tick * a.wobbleSpeed) * a.wobble;
            const ax = star.x + Math.cos(a.angle) * (a.orbitRadius + wobble * 20);
            const ay = star.y + Math.sin(a.angle) * (a.orbitRadius + wobble * 20);
            ctx.globalAlpha = a.alpha;
            ctx.beginPath();
            ctx.arc(ax, ay, a.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Draw planet trails
        for (const planet of this.planets) {
            if (planet.trail.length < 2) continue;
            ctx.beginPath();
            ctx.moveTo(planet.trail[0].x, planet.trail[0].y);
            for (let i = 1; i < planet.trail.length; i++) {
                ctx.lineTo(planet.trail[i].x, planet.trail[i].y);
            }
            ctx.strokeStyle = `hsla(${planet.trailHue}, 60%, 50%, 0.15)`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw comets
        for (const c of this.comets) {
            // Tail
            if (c.tail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(c.tail[0].x, c.tail[0].y);
                for (let i = 1; i < c.tail.length; i++) {
                    ctx.lineTo(c.tail[i].x, c.tail[i].y);
                }
                const tailGrad = ctx.createLinearGradient(
                    c.tail[0].x, c.tail[0].y,
                    c.tail[c.tail.length - 1].x, c.tail[c.tail.length - 1].y
                );
                tailGrad.addColorStop(0, `hsla(${c.hue}, 80%, 70%, 0)`);
                tailGrad.addColorStop(1, `hsla(${c.hue}, 80%, 80%, 0.7)`);
                ctx.strokeStyle = tailGrad;
                ctx.lineWidth = c.size;
                ctx.stroke();
            }
            // Head
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const headGlow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size * 4);
            headGlow.addColorStop(0, `hsla(${c.hue}, 90%, 90%, 0.8)`);
            headGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = headGlow;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.size * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw stars with corona and flares
        for (const star of this.stars) {
            const pulse = 1 + Math.sin(star.pulsePhase) * 0.1;
            const r = star.radius * pulse;

            // Corona glow
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const corona = ctx.createRadialGradient(star.x, star.y, r * 0.3, star.x, star.y, r * 4);
            corona.addColorStop(0, star.palette.corona + 'aa');
            corona.addColorStop(0.4, star.palette.flare + '44');
            corona.addColorStop(1, 'transparent');
            ctx.fillStyle = corona;
            ctx.beginPath();
            ctx.arc(star.x, star.y, r * 4, 0, Math.PI * 2);
            ctx.fill();

            // Solar flares
            ctx.lineWidth = 2;
            for (let f = 0; f < star.flareCount; f++) {
                const flareA = star.flareAngle + (f / star.flareCount) * Math.PI * 2;
                const flareLen = r * (1.5 + Math.sin(this.tick * 0.05 + f * 1.3) * 0.8);
                const fx = star.x + Math.cos(flareA) * flareLen;
                const fy = star.y + Math.sin(flareA) * flareLen;
                ctx.beginPath();
                ctx.moveTo(star.x + Math.cos(flareA) * r, star.y + Math.sin(flareA) * r);
                ctx.lineTo(fx, fy);
                ctx.strokeStyle = `${star.palette.flare}88`;
                ctx.stroke();
            }
            ctx.restore();

            // Star core
            const coreGrad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, r);
            coreGrad.addColorStop(0, star.palette.core);
            coreGrad.addColorStop(0.7, star.palette.corona);
            coreGrad.addColorStop(1, star.palette.flare + '88');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(star.x, star.y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw planets
        for (const planet of this.planets) {
            // Ring behind planet
            if (planet.hasRing) {
                ctx.save();
                ctx.globalAlpha = planet.ringAlpha;
                ctx.strokeStyle = `hsla(${planet.ringHue}, 50%, 60%, ${planet.ringAlpha})`;
                ctx.lineWidth = planet.size * 0.4;
                ctx.beginPath();
                ctx.ellipse(planet.x, planet.y, planet.size * planet.ringOuterMult, planet.size * planet.ringOuterMult * 0.3, 0.3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.lineWidth = planet.size * 0.2;
                ctx.beginPath();
                ctx.ellipse(planet.x, planet.y, planet.size * planet.ringInnerMult, planet.size * planet.ringInnerMult * 0.3, 0.3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // Planet body
            const pGrad = ctx.createRadialGradient(
                planet.x - planet.size * 0.3, planet.y - planet.size * 0.3,
                planet.size * 0.1,
                planet.x, planet.y, planet.size
            );
            pGrad.addColorStop(0, `hsl(${planet.hue}, ${planet.saturation + 20}%, ${planet.lightness + 20}%)`);
            pGrad.addColorStop(1, `hsl(${planet.hue}, ${planet.saturation}%, ${planet.lightness * 0.5}%)`);
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.arc(planet.x, planet.y, planet.size, 0, Math.PI * 2);
            ctx.fill();

            // Planet surface pattern
            if (planet.pattern === 1) {
                // Striped (Jupiter-like)
                ctx.save();
                ctx.clip();
                ctx.globalAlpha = 0.2;
                for (let s = -planet.size; s < planet.size; s += planet.size * 0.3) {
                    ctx.fillStyle = `hsla(${planet.hue + 20}, 40%, ${40 + Math.sin(s) * 15}%, 0.3)`;
                    ctx.fillRect(planet.x - planet.size, planet.y + s, planet.size * 2, planet.size * 0.15);
                }
                ctx.restore();
            }

            // Atmosphere glow
            if (planet.atmosphereAlpha > 0.05) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const atmo = ctx.createRadialGradient(planet.x, planet.y, planet.size * 0.8, planet.x, planet.y, planet.size * 1.4);
                atmo.addColorStop(0, 'transparent');
                atmo.addColorStop(0.5, `hsla(${planet.atmosphereHue}, 70%, 60%, ${planet.atmosphereAlpha})`);
                atmo.addColorStop(1, 'transparent');
                ctx.fillStyle = atmo;
                ctx.beginPath();
                ctx.arc(planet.x, planet.y, planet.size * 1.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Draw moons
        for (const moon of this.moons) {
            ctx.fillStyle = `hsl(${moon.hue}, 30%, 70%)`;
            ctx.beginPath();
            ctx.arc(moon.x, moon.y, moon.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Mouse influence indicator
        const dmx = mouse.x - system.width / 2;
        const dmy = mouse.y - system.height / 2;
        const mouseDist = Math.sqrt(dmx * dmx + dmy * dmy);
        if (mouseDist < 500) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.05;
            const mouseGlow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 200);
            mouseGlow.addColorStop(0, `hsla(${this.baseHue + 180}, 80%, 60%, 0.3)`);
            mouseGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = mouseGlow;
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 200, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}
