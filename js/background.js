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
        // In a real app we might want to regenerate stars to fill new space,
        // but for now just scaling is acceptable or they will just exist in the old bounds until regen.
        // Actually, let's just let them be.
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

        this.generateStars(seededRandom);
        this.generateNebulas(seededRandom);
    }

    generateStars(seededRandom) {
        this.stars = [];
        const rng = seededRandom || Math.random;
        const count = 400;
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: rng() * this.width,
                y: rng() * this.height,
                z: rng() * 2 + 0.5, // Depth factor for parallax
                size: rng() * 1.5 + 0.5,
                baseAlpha: rng() * 0.5 + 0.3,
                twinklePhase: rng() * Math.PI * 2,
                twinkleSpeed: rng() * 0.05 + 0.01
            });
        }
    }

    generateNebulas(seededRandom) {
        this.nebulas = [];
        const rng = seededRandom || Math.random;
        const count = 3;
        for (let i = 0; i < count; i++) {
            this.nebulas.push({
                x: rng() * this.width,
                y: rng() * this.height,
                radius: rng() * 300 + 200,
                color: `hsla(${this.hue + (rng() - 0.5) * 60}, 70%, 20%, 0.1)`,
                vx: (rng() - 0.5) * 0.2,
                vy: (rng() - 0.5) * 0.2
            });
        }
    }

    animate() {
        this.tick++;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw Background Gradient
        const grad = this.ctx.createLinearGradient(0, 0, this.width, this.height);
        this.gradientColors.forEach((c, i) => grad.addColorStop(i / (this.gradientColors.length - 1), c));
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Parallax Offset
        // mouse.x/y are screen coordinates
        const mx = (mouse.x - this.width / 2) * 0.05;
        const my = (mouse.y - this.height / 2) * 0.05;

        // Draw Nebulas
        this.nebulas.forEach(n => {
            n.x += n.vx;
            n.y += n.vy;

            // Wrap around
            if (n.x < -n.radius) n.x = this.width + n.radius;
            if (n.x > this.width + n.radius) n.x = -n.radius;
            if (n.y < -n.radius) n.y = this.height + n.radius;
            if (n.y > this.height + n.radius) n.y = -n.radius;

            const g = this.ctx.createRadialGradient(n.x - mx * 0.5, n.y - my * 0.5, 0, n.x - mx * 0.5, n.y - my * 0.5, n.radius);
            g.addColorStop(0, n.color);
            g.addColorStop(1, 'transparent');
            this.ctx.fillStyle = g;
            this.ctx.beginPath();
            this.ctx.arc(n.x - mx * 0.5, n.y - my * 0.5, n.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw Stars
        this.ctx.fillStyle = '#FFF';
        this.stars.forEach(star => {
            const alpha = star.baseAlpha + Math.sin(this.tick * star.twinkleSpeed + star.twinklePhase) * 0.2;
            this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

            const px = star.x - mx * star.z;
            const py = star.y - my * star.z;

            // Simple wrap logic for parallax to keep stars on screen
            // We add buffer to avoid popping
            let wx = px % (this.width + 100);
            if (wx < -50) wx += this.width + 100;
            else if (wx > this.width + 50) wx -= this.width + 100;

            let wy = py % (this.height + 100);
            if (wy < -50) wy += this.height + 100;
            else if (wy > this.height + 50) wy -= this.height + 100;

            this.ctx.beginPath();
            this.ctx.arc(wx, wy, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;

        // Shooting Stars
        if (Math.random() < 0.005) { // Chance to spawn
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
            this.ctx.lineTo(s.x - s.vx * 2, s.y - s.vy * 2); // Trail
            this.ctx.stroke();
        }

        requestAnimationFrame(this.loop);
    }
}

export const background = new BackgroundSystem();
