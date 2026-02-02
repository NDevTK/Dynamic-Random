/**
 * @file background.js
 * @description Handles the interactive, generative background system.
 */

import { mouse } from './state.js';

class BackgroundSystem {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.stars = [];
        this.shootingStars = [];
        this.nebulas = [];
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Theme properties
        this.hue = 0;
        this.isMonochrome = false;
        this.isDark = false;
        this.gradientColors = ['#0a050d', '#120510', '#000000'];
        this.gradient = null; // Caching gradient

        // Animation
        this.tick = 0;
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
        this.resize();
        this.loop = this.animate.bind(this);
        requestAnimationFrame(this.loop);
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.updateGradient();
    }

    updateGradient() {
        this.gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
        this.gradientColors.forEach((c, i) => this.gradient.addColorStop(i / (this.gradientColors.length - 1), c));
    }

    setTheme(hue, isMonochrome, seededRandom, isDark) {
        this.hue = hue;
        this.isMonochrome = isMonochrome;
        this.isDark = isDark;

        // Calculate gradient colors
        if (isDark) {
             this.gradientColors = ['#0a050d', '#120510', '#000000'];
        } else if (isMonochrome) {
            this.gradientColors = [
                `hsl(${hue}, 80%, 10%)`,
                `hsl(${hue}, 40%, 20%)`,
                `hsl(${hue}, 90%, 5%)`
            ];
        } else {
            this.gradientColors = [
                `hsl(${hue}, 80%, 10%)`,
                `hsl(${(hue + 120) % 360}, 80%, 5%)`,
                `hsl(${(hue + 240) % 360}, 80%, 8%)`
            ];
        }

        this.updateGradient();
        this.generateStars(seededRandom);
        this.generateNebulas(seededRandom);
    }

    generateStars(seededRandom) {
        this.stars = [];
        const rng = seededRandom || Math.random;
        const count = 400;
        const starColors = ['#ffffff', '#ffe9c4', '#d4fbff', '#ffdede', '#e0ffff']; // Added color variation

        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: rng() * this.width,
                y: rng() * this.height,
                z: rng() * 2 + 0.5, // Depth factor for parallax
                size: rng() * 1.5 + 0.5,
                baseAlpha: rng() * 0.5 + 0.3,
                twinklePhase: rng() * Math.PI * 2,
                twinkleSpeed: rng() * 0.05 + 0.01,
                color: starColors[Math.floor(rng() * starColors.length)] // Assign random color
            });
        }
    }

    generateNebulas(seededRandom) {
        this.nebulas = [];
        const rng = seededRandom || Math.random;
        const count = 3;
        for (let i = 0; i < count; i++) {
            const radius = rng() * 300 + 200;
            const color = `hsla(${this.hue + (rng() - 0.5) * 60}, 70%, 20%, 0.1)`;

            // Pre-render nebula sprite
            const sprite = document.createElement('canvas');
            sprite.width = radius * 2;
            sprite.height = radius * 2;
            const ctx = sprite.getContext('2d');
            const g = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
            g.addColorStop(0, color);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(radius, radius, radius, 0, Math.PI * 2);
            ctx.fill();

            this.nebulas.push({
                x: rng() * this.width,
                y: rng() * this.height,
                radius: radius,
                vx: (rng() - 0.5) * 0.2,
                vy: (rng() - 0.5) * 0.2,
                sprite: sprite
            });
        }
    }

    animate() {
        this.tick++;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw Background Gradient (using cached gradient)
        if (this.gradient) {
            this.ctx.fillStyle = this.gradient;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // Parallax Offset
        // mouse.x/y are screen coordinates
        const mx = (mouse.x - this.width / 2) * 0.05;
        const my = (mouse.y - this.height / 2) * 0.05;

        // Draw Nebulas (using cached sprites)
        this.nebulas.forEach(n => {
            n.x += n.vx;
            n.y += n.vy;

            // Wrap around
            if (n.x < -n.radius) n.x = this.width + n.radius;
            if (n.x > this.width + n.radius) n.x = -n.radius;
            if (n.y < -n.radius) n.y = this.height + n.radius;
            if (n.y > this.height + n.radius) n.y = -n.radius;

            this.ctx.drawImage(n.sprite, n.x - n.radius - mx * 0.5, n.y - n.radius - my * 0.5);
        });

        // Draw Stars
        this.stars.forEach(star => {
            const alpha = star.baseAlpha + Math.sin(this.tick * star.twinkleSpeed + star.twinklePhase) * 0.2;
            // Twinkle size
            const sizeMod = 1 + Math.sin(this.tick * star.twinkleSpeed * 1.5 + star.twinklePhase) * 0.3;

            this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
            this.ctx.fillStyle = star.color; // Use star color

            const px = star.x - mx * star.z;
            const py = star.y - my * star.z;

            // Simple wrap logic
            let wx = px % (this.width + 100);
            if (wx < -50) wx += this.width + 100;
            else if (wx > this.width + 50) wx -= this.width + 100;

            let wy = py % (this.height + 100);
            if (wy < -50) wy += this.height + 100;
            else if (wy > this.height + 50) wy -= this.height + 100;

            this.ctx.beginPath();
            this.ctx.arc(wx, wy, star.size * sizeMod, 0, Math.PI * 2);
            this.ctx.fill();

            // Constellation check
            const dx = mouse.x - wx;
            const dy = mouse.y - wy;
            const distSq = dx*dx + dy*dy;
            if (distSq < 22500) { // 150 * 150
                this.ctx.save();
                this.ctx.globalAlpha = 1 - (distSq / 22500);
                this.ctx.strokeStyle = star.color;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(mouse.x, mouse.y);
                this.ctx.lineTo(wx, wy);
                this.ctx.stroke();
                this.ctx.restore();
            }
        });
        this.ctx.globalAlpha = 1.0;

        // Shooting Stars
        if (Math.random() < 0.005) {
            this.shootingStars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 20 + 10,
                vy: (Math.random() - 0.5) * 20 + 10,
                life: 30,
                maxLife: 30
            });
        }

        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const s = this.shootingStars[i];
            s.x += s.vx;
            s.y += s.vy;
            s.life--;

            if (s.life <= 0) {
                this.shootingStars.splice(i, 1);
                continue;
            }

            const opacity = s.life / s.maxLife;
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(s.x, s.y);
            this.ctx.lineTo(s.x - s.vx * 2, s.y - s.vy * 2);
            this.ctx.stroke();
        }

        requestAnimationFrame(this.loop);
    }
}

export const background = new BackgroundSystem();
