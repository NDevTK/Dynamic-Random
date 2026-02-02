/**
 * @file background.js
 * @description Handles the interactive, generative background system.
 */

import { mouse } from './state.js';

class BackgroundSystem {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false }); // Optimize for no transparency
        this.stars = [];
        this.dust = [];
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
        this.updateThemeColors();
        this.generateStars(seededRandom);
        this.generateDust(seededRandom);
        this.generateNebulas(seededRandom);
    }

    updateThemeColors() {
        // Calculate gradient colors based on current tick/hue
        if (this.isDark) {
             this.gradientColors = ['#0a050d', '#120510', '#000000'];
        } else if (this.isMonochrome) {
            // Breathing lightness
            const l = 10 + Math.sin(this.tick * 0.005) * 3;
            this.gradientColors = [
                `hsl(${this.hue}, 80%, ${l}%)`,
                `hsl(${this.hue}, 40%, ${l*2}%)`,
                `hsl(${this.hue}, 90%, ${l*0.5}%)`
            ];
        } else {
            // Shifting Hue
            const shift = Math.sin(this.tick * 0.002) * 20;
            const h = this.hue + shift;
            this.gradientColors = [
                `hsl(${h}, 80%, 10%)`,
                `hsl(${(h + 120) % 360}, 80%, 5%)`,
                `hsl(${(h + 240) % 360}, 80%, 8%)`
            ];
        }
        this.updateGradient();
    }

    generateStars(seededRandom) {
        this.stars = [];
        const rng = seededRandom || Math.random;
        const count = 400;
        const starColors = ['#ffffff', '#ffe9c4', '#d4fbff', '#ffdede', '#e0ffff'];

        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: rng() * this.width,
                y: rng() * this.height,
                z: rng() * 2 + 0.5, // Depth factor for parallax
                size: rng() * 1.5 + 0.5,
                baseAlpha: rng() * 0.5 + 0.3,
                twinklePhase: rng() * Math.PI * 2,
                twinkleSpeed: rng() * 0.05 + 0.01,
                color: starColors[Math.floor(rng() * starColors.length)],
                baseVx: (rng() - 0.5) * 0.2,
                baseVy: (rng() - 0.5) * 0.2,
                vx: 0,
                vy: 0
            });
        }
    }

    generateDust(seededRandom) {
        this.dust = [];
        const rng = seededRandom || Math.random;
        const count = 200; // More dust
        for(let i=0; i<count; i++) {
             this.dust.push({
                 x: rng() * this.width,
                 y: rng() * this.height,
                 vx: (rng() - 0.5) * 0.5,
                 vy: (rng() - 0.5) * 0.5,
                 size: rng() * 1.5,
                 baseAlpha: rng() * 0.2 + 0.05
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
                rotation: rng() * Math.PI * 2,
                rotationSpeed: (rng() - 0.5) * 0.002,
                sprite: sprite
            });
        }
    }

    animate() {
        this.tick++;

        // Animated Gradient
        if (this.tick % 5 === 0) {
             this.updateThemeColors();
        }

        // Draw Background Gradient
        if (this.gradient) {
            this.ctx.fillStyle = this.gradient;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // Parallax Offset
        const mx = (mouse.x - this.width / 2) * 0.05;
        const my = (mouse.y - this.height / 2) * 0.05;

        // Draw Nebulas (Dynamic rotation)
        this.nebulas.forEach(n => {
            n.x += n.vx;
            n.y += n.vy;
            n.rotation += n.rotationSpeed;

            // Wrap around
            if (n.x < -n.radius) n.x = this.width + n.radius;
            if (n.x > this.width + n.radius) n.x = -n.radius;
            if (n.y < -n.radius) n.y = this.height + n.radius;
            if (n.y > this.height + n.radius) n.y = -n.radius;

            this.ctx.save();
            this.ctx.translate(n.x - mx * 0.5, n.y - my * 0.5);
            this.ctx.rotate(n.rotation);
            this.ctx.drawImage(n.sprite, -n.radius, -n.radius);
            this.ctx.restore();
        });

        // Draw Dust
        this.ctx.fillStyle = 'white';
        this.dust.forEach(d => {
             d.x += d.vx;
             d.y += d.vy;

             // Wrap
             if(d.x < 0) d.x += this.width;
             else if(d.x > this.width) d.x -= this.width;
             if(d.y < 0) d.y += this.height;
             else if(d.y > this.height) d.y -= this.height;

             // Mouse Influence (Subtle)
             const dx = d.x - mouse.x;
             const dy = d.y - mouse.y;
             const distSq = dx*dx + dy*dy;
             if(distSq < 10000) {
                 const angle = Math.atan2(dy, dx);
                 d.x += Math.cos(angle) * 0.5;
                 d.y += Math.sin(angle) * 0.5;
             }

             this.ctx.globalAlpha = d.baseAlpha;
             this.ctx.fillRect(d.x - mx * 0.8, d.y - my * 0.8, d.size, d.size);
        });
        this.ctx.globalAlpha = 1.0;


        // Draw Stars
        this.stars.forEach(star => {
            // Interaction: Mouse Repulsion
            const px = star.x - mx * star.z;
            const py = star.y - my * star.z;

            // Handle Wrapping for Projection calculation
            let wx = px % (this.width + 100);
            if (wx < -50) wx += this.width + 100;
            else if (wx > this.width + 50) wx -= this.width + 100;

            let wy = py % (this.height + 100);
            if (wy < -50) wy += this.height + 100;
            else if (wy > this.height + 50) wy -= this.height + 100;

            const mdx = wx - mouse.x;
            const mdy = wy - mouse.y;
            const distSq = mdx*mdx + mdy*mdy;

            if (distSq < 20000) { // Repulsion range
                const dist = Math.sqrt(distSq);
                const force = (20000 - distSq) / 20000;
                const angle = Math.atan2(mdy, mdx);
                const push = force * 1.5; // Push strength

                star.vx += Math.cos(angle) * push;
                star.vy += Math.sin(angle) * push;
            }

            // Update Star Position
            star.x += star.baseVx + star.vx;
            star.y += star.baseVy + star.vy;

            // Friction for active velocity
            star.vx *= 0.95;
            star.vy *= 0.95;

            // Rendering
            const alpha = star.baseAlpha + Math.sin(this.tick * star.twinkleSpeed + star.twinklePhase) * 0.2;
            const sizeMod = 1 + Math.sin(this.tick * star.twinkleSpeed * 1.5 + star.twinklePhase) * 0.3;

            this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
            this.ctx.fillStyle = star.color;

            // Recalculate positions with updated star.x/y for drawing
             const pxNew = star.x - mx * star.z;
            const pyNew = star.y - my * star.z;

            let wxNew = pxNew % (this.width + 100);
            if (wxNew < -50) wxNew += this.width + 100;
            else if (wxNew > this.width + 50) wxNew -= this.width + 100;

            let wyNew = pyNew % (this.height + 100);
            if (wyNew < -50) wyNew += this.height + 100;
            else if (wyNew > this.height + 50) wyNew -= this.height + 100;

            // Optimization: Use fillRect for small stars
            const currentSize = star.size * sizeMod;
            if (currentSize < 2) {
                this.ctx.fillRect(wxNew, wyNew, currentSize, currentSize);
            } else {
                this.ctx.beginPath();
                this.ctx.arc(wxNew, wyNew, currentSize, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Constellation check (using new positions)
            const cdx = mouse.x - wxNew;
            const cdy = mouse.y - wyNew;
            const cDistSq = cdx*cdx + cdy*cdy;

            if (cDistSq < 22500) {
                this.ctx.globalAlpha = 1 - (cDistSq / 22500);
                this.ctx.strokeStyle = star.color;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(mouse.x, mouse.y);
                this.ctx.lineTo(wxNew, wyNew);
                this.ctx.stroke();
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
