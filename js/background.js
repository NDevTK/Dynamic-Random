/**
 * @file background.js
 * @description Handles the interactive, generative background system.
 */

import { mouse } from './state.js';
import { SpatialGrid } from './spatial_grid.js';
import { CosmicArchitecture, DigitalArchitecture, GeometricArchitecture } from './background_architectures.js';

class BackgroundSystem {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.architecture = new CosmicArchitecture();
        this.trail = [];
        this.trailPool = [];
        this.shockwaves = [];
        this.sparks = [];
        this.shootingStars = [];
        this.spatialGrid = null;
        this.cellSize = 150;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.rng = Math.random;

        // Theme properties
        this.hue = 0;
        this.isMonochrome = false;
        this.isDark = false;
        this.gradientColors = ['#0a050d', '#120510', '#000000'];
        this.gradient = null;

        // Animation
        this.tick = 0;
        this.speedMultiplier = 1;
        this.targetSpeed = 1;

        // Interactive Modes
        this.isGravityWell = false;

        this.canvas.id = 'background-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '-1';
        this.canvas.style.pointerEvents = 'none';
    }

    init() {
        document.body.prepend(this.canvas);
        window.addEventListener('resize', () => this.resize());

        window.addEventListener('contextmenu', (e) => {
            if (!e.target.closest('#ui-container')) {
                e.preventDefault();
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (e.target.closest('#ui-container')) return;
            if (e.button === 0) this.targetSpeed = 20;
            else if (e.button === 2) this.isGravityWell = true;
        });

        window.addEventListener('mouseup', () => {
            this.targetSpeed = 1;
            this.isGravityWell = false;
        });

        window.addEventListener('mouseleave', () => {
            this.targetSpeed = 1;
            this.isGravityWell = false;
        });

        window.addEventListener('click', (e) => {
             this.createShockwave(e.clientX, e.clientY);
        });

        this.resize();
        this.loop = this.animate.bind(this);
        requestAnimationFrame(this.loop);
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        if (!this.spatialGrid) {
            this.spatialGrid = new SpatialGrid(this.width, this.height, this.cellSize);
        } else {
            this.spatialGrid.updateDimensions(this.width, this.height);
        }
        this.updateGradient();
    }

    updateGradient() {
        this.gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
        this.gradientColors.forEach((c, i) => this.gradient.addColorStop(i / (this.gradientColors.length - 1), c));
    }

    setTheme(hue, isMonochrome, seededRandom, isDark, blueprintName) {
        this.hue = hue;
        this.isMonochrome = isMonochrome;
        this.isDark = isDark;
        this.rng = seededRandom || Math.random;

        const digitalBlueprints = ['Digital', 'TechnoUtopia', 'NeonCyber'];
        const geometricBlueprints = ['Crystalline', 'GlassySea', 'Papercraft', 'ArcaneCodex'];

        if (digitalBlueprints.includes(blueprintName)) this.architecture = new DigitalArchitecture();
        else if (geometricBlueprints.includes(blueprintName)) this.architecture = new GeometricArchitecture();
        else this.architecture = new CosmicArchitecture();

        this.updateThemeColors();
        this.architecture.init(this);
    }

    createShockwave(x, y) {
        this.shockwaves.push({ x, y, radius: 0, maxRadius: Math.max(this.width, this.height) * 0.8, speed: 10, strength: 2, alpha: 1 });
        for(let i=0; i<30; i++) {
            const angle = this.rng() * Math.PI * 2; const speed = this.rng() * 10 + 5;
            this.sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 50 + this.rng() * 30, maxLife: 80, size: this.rng() * 3 + 1, color: '255, 255, 200' });
        }
    }

    drawSparks() {
        this.ctx.globalCompositeOperation = 'lighter';
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            s.x += s.vx; s.y += s.vy; s.life--;
            s.vx *= 0.9; s.vy *= 0.9;
            if (s.life <= 0) { this.sparks.splice(i, 1); continue; }
            const alpha = s.life / s.maxLife;
            this.ctx.fillStyle = `rgba(${s.color}, ${alpha})`;
            this.ctx.beginPath(); this.ctx.arc(s.x, s.y, s.size * alpha, 0, Math.PI * 2); this.ctx.fill();
        }
        this.ctx.globalCompositeOperation = 'source-over';
    }

    updateThemeColors() {
        if (this.isDark) this.gradientColors = ['#0a050d', '#120510', '#000000'];
        else if (this.isMonochrome) {
            const l = 10 + Math.sin(this.tick * 0.005) * 3;
            this.gradientColors = [`hsl(${this.hue}, 80%, ${l}%)`, `hsl(${this.hue}, 40%, ${l*2}%)`, `hsl(${this.hue}, 90%, ${l*0.5}%)` ];
        } else {
            const shift = Math.sin(this.tick * 0.002) * 20;
            const h = this.hue + shift;
            this.gradientColors = [`hsl(${h}, 80%, 10%)`, `hsl(${(h + 120) % 360}, 80%, 5%)`, `hsl(${(h + 240) % 360}, 80%, 8%)` ];
        }
        this.updateGradient();
    }

    animate() {
        this.tick++;
        this.speedMultiplier += (this.targetSpeed - this.speedMultiplier) * 0.1;

        if (!this.isDark && this.tick % 30 === 0) this.updateThemeColors();

        if (this.gradient) {
            this.ctx.fillStyle = this.gradient;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        this.architecture.update(this);
        this.architecture.draw(this);
        this.drawInteractiveEffects();

        requestAnimationFrame(this.loop);
    }

    drawInteractiveEffects() {
        const ctx = this.ctx;
        // Warp Speed Energy Sparks
        if (this.speedMultiplier > 5) {
            ctx.globalCompositeOperation = 'lighter';
            for(let i=0; i<3; i++) {
                const angle = this.rng() * Math.PI * 2;
                const dist = this.rng() * 100;
                this.sparks.push({
                    x: this.width/2 + Math.cos(angle) * dist,
                    y: this.height/2 + Math.sin(angle) * dist,
                    vx: Math.cos(angle) * 30, vy: Math.sin(angle) * 30,
                    life: 20, maxLife: 20, size: 2, color: '200, 230, 255'
                });
            }
            ctx.globalCompositeOperation = 'source-over';
        }

        // Trail
        const speedX = (mouse.x - (this.lastMouseX || mouse.x));
        const speedY = (mouse.y - (this.lastMouseY || mouse.y));
        const speed = Math.sqrt(speedX*speedX + speedY*speedY);
        this.lastMouseX = mouse.x; this.lastMouseY = mouse.y;
        const spawnCount = Math.min(5, Math.ceil(speed * 0.5));
        for(let i=0; i<spawnCount; i++) {
            let p = this.trailPool.length > 0 ? this.trailPool.pop() : {};
            p.x = mouse.x + (this.rng() - 0.5) * 10; p.y = mouse.y + (this.rng() - 0.5) * 10;
            p.vx = (this.rng() - 0.5) * 1; p.vy = (this.rng() - 0.5) * 1;
            p.life = 1.0; p.decay = 0.02 + this.rng() * 0.03; p.size = 2 + this.rng() * 3;
            p.hue = (this.tick * 2 + this.rng() * 30) % 360;
            this.trail.push(p);
        }

        ctx.globalCompositeOperation = 'lighter';
        for(let i=this.trail.length - 1; i>=0; i--) {
            const p = this.trail[i];
            p.x += p.vx; p.y += p.vy; p.life -= p.decay;
            if (this.isGravityWell) {
                 const dx = p.x - mouse.x; const dy = p.y - mouse.y; const dist = Math.sqrt(dx*dx + dy*dy);
                 if (dist > 50 && dist < 300) { p.x -= (dx/dist) * 2; p.y -= (dy/dist) * 2; }
            }
            if (p.life <= 0) { this.trailPool.push(this.trail.splice(i, 1)[0]); continue; }
            ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.life})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
        }

        // Gravity Well Visual (Enhanced)
        if (this.isGravityWell) {
             const pulse = Math.sin(this.tick * 0.2) * 5;
             ctx.fillStyle = 'rgba(0, 0, 0, 1)';
             ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 40 + pulse, 0, Math.PI * 2); ctx.fill();

             const g = ctx.createRadialGradient(mouse.x, mouse.y, 40 + pulse, mouse.x, mouse.y, 150);
             g.addColorStop(0, 'rgba(0, 0, 0, 1)');
             g.addColorStop(0.3, 'rgba(100, 50, 255, 0.4)');
             g.addColorStop(0.6, 'rgba(50, 0, 150, 0.2)');
             g.addColorStop(1, 'transparent');
             ctx.fillStyle = g;
             ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 150, 0, Math.PI * 2); ctx.fill();

             // Swirling Accretion disk
             for(let i=0; i<2; i++) {
                 const angle = (this.tick * 0.1 + i * Math.PI) % (Math.PI * 2);
                 const x = mouse.x + Math.cos(angle) * 60;
                 const y = mouse.y + Math.sin(angle) * 20; // Elliptical
                 ctx.fillStyle = 'rgba(200, 200, 255, 0.5)';
                 ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
             }
        }

        this.drawSparks();

        // Shockwaves
        ctx.lineWidth = 2;
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.speed; sw.alpha = 1 - (sw.radius / sw.maxRadius);
            if (sw.alpha <= 0) { this.shockwaves.splice(i, 1); continue; }
            ctx.beginPath(); ctx.strokeStyle = `rgba(255, 255, 255, ${sw.alpha * 0.3})`;
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2); ctx.stroke();
        }

        // Shooting Stars
        if (this.rng() < 0.005) {
            this.shootingStars.push({ x: this.rng() * this.width, y: this.rng() * this.height, vx: (this.rng() - 0.5) * 20 + 10, vy: (this.rng() - 0.5) * 20 + 10, life: 30, maxLife: 30 });
        }
        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const s = this.shootingStars[i];
            s.x += s.vx; s.y += s.vy; s.life--;
            if (s.life <= 0) { this.shootingStars.splice(i, 1); continue; }
            const opacity = s.life / s.maxLife;
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 2, s.y - s.vy * 2); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
    }
}

export const background = new BackgroundSystem();
