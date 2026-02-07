/**
 * @file background.js
 * @description Handles the interactive, generative background system.
 */

import { mouse } from './state.js';
import { SpatialGrid } from './spatial_grid.js';
import { CosmicArchitecture, DigitalArchitecture, GeometricArchitecture } from './background_architectures.js';
import { OrganicArchitecture } from './organic_architecture.js';
import { FlowArchitecture } from './flow_architecture.js';
import { AbstractArchitecture } from './abstract_architecture.js';
import { GlitchArchitecture } from './glitch_architecture.js';
import { FabricArchitecture } from './fabric_architecture.js';
import { VoxelArchitecture } from './voxel_architecture.js';
import { FractalArchitecture } from './fractal_architecture.js';

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

        // Offscreen canvas for background optimization
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: false });

        // Theme properties
        this.hue = 0;
        this.isMonochrome = false;
        this.isDark = false;
        this.gradientColors = ['#0a050d', '#120510', '#000000'];
        this.gradient = null;
        this.bgMutators = [];

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
        this.offscreenCanvas.width = this.width;
        this.offscreenCanvas.height = this.height;

        if (!this.spatialGrid) {
            this.spatialGrid = new SpatialGrid(this.width, this.height, this.cellSize);
        } else {
            this.spatialGrid.updateDimensions(this.width, this.height);
        }
        this.updateGradient();
    }

    updateGradient() {
        const ctx = this.offscreenCtx;
        this.gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
        this.gradientColors.forEach((c, i) => this.gradient.addColorStop(i / (this.gradientColors.length - 1), c));

        ctx.fillStyle = this.gradient;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    setTheme(hue, isMonochrome, seededRandom, isDark, blueprintName) {
        this.hue = hue;
        this.isMonochrome = isMonochrome;
        this.isDark = isDark;
        this.rng = seededRandom || Math.random;

        const digitalBlueprints = ['Digital', 'TechnoUtopia', 'NeonCyber'];
        const geometricBlueprints = ['Crystalline', 'GlassySea', 'Papercraft', 'ArcaneCodex'];
        const organicBlueprints = ['Organic', 'BioMechanical', 'FungalForest', 'SentientSwarm', 'CoralReef', 'GooeyMess', 'AbyssalHorror'];
        const flowBlueprints = ['Aetherial', 'PhantomEcho', 'ChronoVerse', 'QuantumFoam', 'SonicScapes', 'ChromaticAberration', 'GlassySea'];
        const abstractBlueprints = ['Painterly', 'StarForged', 'CelestialForge', 'LivingConstellation', 'StellarNursery', 'LivingInk', 'MoltenHeart', 'VolcanicForge'];
        const fabricBlueprints = ['SilkWeaver', 'CosmicWeb', 'PhantomEcho'];
        const voxelBlueprints = ['TechnoUtopia', 'Geometric', 'Digital'];
        const fractalBlueprints = ['Crystalline', 'Fractal', 'ArcaneCodex'];

        if (fabricBlueprints.includes(blueprintName) && this.rng() > 0.5) {
            this.architecture = new FabricArchitecture();
        } else if (voxelBlueprints.includes(blueprintName) && this.rng() > 0.6) {
            this.architecture = new VoxelArchitecture();
        } else if (fractalBlueprints.includes(blueprintName) && this.rng() > 0.6) {
            this.architecture = new FractalArchitecture();
        } else if (organicBlueprints.includes(blueprintName)) {
            this.architecture = new OrganicArchitecture();
        } else if (flowBlueprints.includes(blueprintName)) {
            this.architecture = new FlowArchitecture();
        } else if (abstractBlueprints.includes(blueprintName)) {
            this.architecture = new AbstractArchitecture();
        } else if (digitalBlueprints.includes(blueprintName)) {
            // Mix Digital and Glitch for variety
            this.architecture = this.rng() > 0.5 ? new GlitchArchitecture() : new DigitalArchitecture();
        } else if (geometricBlueprints.includes(blueprintName)) {
            this.architecture = new GeometricArchitecture();
        } else {
            this.architecture = new CosmicArchitecture();
        }

        // Randomize background mutators based on seed
        this.bgMutators = [];
        if (this.rng() > 0.7) this.bgMutators.push('Vignette');
        if (this.rng() > 0.8) this.bgMutators.push('Noise');
        if (this.rng() > 0.9) this.bgMutators.push('Scanlines');

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

        this.ctx.save();

        // Warp Distortion Effect (Radial Zoom)
        if (this.speedMultiplier > 2) {
            const zoom = 1 + (this.speedMultiplier - 1) * 0.002;
            this.ctx.translate(this.width / 2, this.height / 2);
            this.ctx.scale(zoom, zoom);
            this.ctx.translate(-this.width / 2, -this.height / 2);
        }

        // Draw cached gradient background
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);

        this.architecture.update(this);
        this.architecture.draw(this);
        this.drawInteractiveEffects();
        this.applyBGMutators();

        this.ctx.restore();

        requestAnimationFrame(this.loop);
    }

    applyBGMutators() {
        const ctx = this.ctx;
        if (this.bgMutators.includes('Vignette')) {
            const g = ctx.createRadialGradient(this.width/2, this.height/2, this.width/4, this.width/2, this.height/2, this.width*0.7);
            g.addColorStop(0, 'transparent');
            g.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, this.width, this.height);
        }
        if (this.bgMutators.includes('Noise')) {
            ctx.save();
            ctx.globalAlpha = 0.03;
            for(let i=0; i<10; i++) {
                const x = this.rng() * this.width;
                const y = this.rng() * this.height;
                ctx.fillStyle = '#fff';
                ctx.fillRect(x, y, 1, 1);
            }
            ctx.restore();
        }
        if (this.bgMutators.includes('Scanlines')) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for(let y=0; y<this.height; y+=4) {
                ctx.moveTo(0, y);
                ctx.lineTo(this.width, y);
            }
            ctx.stroke();
        }
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

             // Gravity Distortion (Visual Pull)
             ctx.save();
             ctx.globalCompositeOperation = 'soft-light';
             const warpGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 400);
             warpGrad.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
             warpGrad.addColorStop(1, 'transparent');
             ctx.fillStyle = warpGrad;
             ctx.beginPath();
             ctx.arc(mouse.x, mouse.y, 400, 0, Math.PI * 2);
             ctx.fill();
             ctx.restore();

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
