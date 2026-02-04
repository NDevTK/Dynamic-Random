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
        this.trail = [];
        this.trailPool = []; // Pool for trail particles to reduce GC
        this.shockwaves = [];
        this.sparks = []; // Explosion particles
        this.shootingStars = [];
        this.nebulas = [];
        this.grid = {}; // Spatial grid for constellations
        this.auroraOffset = 0;
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

        // Disable context menu for Right Click interaction (only on background)
        window.addEventListener('contextmenu', (e) => {
            if (!e.target.closest('#ui-container')) {
                e.preventDefault();
            }
        });

        // Interaction Handling
        window.addEventListener('mousedown', (e) => {
            if (e.target.closest('#ui-container')) return;

            if (e.button === 0) {
                // Left Click: Warp Drive
                this.targetSpeed = 20;
            } else if (e.button === 2) {
                // Right Click: Gravity Well
                this.isGravityWell = true;
            }
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

    noise(x) {
        // Simple superposition of sine waves for organic look
        return Math.sin(x) * 0.5 + Math.sin(x * 2.1) * 0.25 + Math.sin(x * 4.3) * 0.12;
    }

    createShockwave(x, y) {
        this.shockwaves.push({
            x, y,
            radius: 0,
            maxRadius: Math.max(this.width, this.height) * 0.8,
            speed: 10,
            strength: 2,
            alpha: 1
        });

        // Spawn Sparks
        for(let i=0; i<30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 10 + 5;
            this.sparks.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 50 + Math.random() * 30,
                maxLife: 80,
                size: Math.random() * 3 + 1,
                color: '255, 255, 200'
            });
        }
    }

    drawSparks() {
        this.ctx.globalCompositeOperation = 'lighter';
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.life--;
            s.vx *= 0.9;
            s.vy *= 0.9;

            if (s.life <= 0) {
                this.sparks.splice(i, 1);
                continue;
            }

            const alpha = s.life / s.maxLife;
            this.ctx.fillStyle = `rgba(${s.color}, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.size * alpha, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalCompositeOperation = 'source-over';
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

    updateStarGrid() {
        this.grid = {}; // Reset grid
        const cellSize = 150;

        this.stars.forEach((star, index) => {
             const col = Math.floor(star.x / cellSize);
             const row = Math.floor(star.y / cellSize);
             const key = `${col},${row}`;

             if (!this.grid[key]) this.grid[key] = [];
             this.grid[key].push(index);
        });
    }

    drawConstellations() {
        // Don't draw constellations in warp speed
        if (this.speedMultiplier > 5) return;

        this.updateStarGrid();
        this.ctx.beginPath();
        this.ctx.strokeStyle = `rgba(255, 255, 255, 0.05)`; // Very faint
        this.ctx.lineWidth = 1;

        const mx = (mouse.x - this.width / 2) * 0.05;
        const my = (mouse.y - this.height / 2) * 0.05;

        // Helper to project (duplicated logic from drawStars, but needed here)
        const getScreenPos = (s) => {
             const px = s.x - mx * s.z;
             const py = s.y - my * s.z;

             let wx = px % (this.width + 100);
             if (wx < -50) wx += this.width + 100;
             else if (wx > this.width + 50) wx -= this.width + 100;

             let wy = py % (this.height + 100);
             if (wy < -50) wy += this.height + 100;
             else if (wy > this.height + 50) wy -= this.height + 100;

             return {x: wx, y: wy};
        };

        for (const key in this.grid) {
            const [col, row] = key.split(',').map(Number);
            const cellStars = this.grid[key];

            // Check neighbors + self
            const neighborKeys = [
                key,
                `${col+1},${row}`,
                `${col},${row+1}`,
                `${col+1},${row+1}`,
                `${col-1},${row+1}`
            ];

            for (const nKey of neighborKeys) {
                 if (!this.grid[nKey]) continue;
                 const neighbors = this.grid[nKey];

                 for (const i of cellStars) {
                     for (const j of neighbors) {
                         if (i >= j && nKey === key) continue; // Avoid double check

                         const s1 = this.stars[i];
                         const s2 = this.stars[j];

                         // World distance check (fast)
                         const dx = s1.x - s2.x;
                         const dy = s1.y - s2.y;
                         if (dx*dx + dy*dy < 22500) { // 150*150
                             const p1 = getScreenPos(s1);
                             const p2 = getScreenPos(s2);

                             // Screen distance check (to handle wrapping artifacts)
                             const sdx = p1.x - p2.x;
                             const sdy = p1.y - p2.y;

                             if (sdx*sdx + sdy*sdy < 25000) {
                                 this.ctx.moveTo(p1.x, p1.y);
                                 this.ctx.lineTo(p2.x, p2.y);
                             }
                         }
                     }
                 }
            }
        }
        this.ctx.stroke();
    }

    generateNebulas(seededRandom) {
        this.nebulas = [];
        const rng = seededRandom || Math.random;
        const count = 6;
        for (let i = 0; i < count; i++) {
            const radius = rng() * 400 + 200;
            const color = `hsla(${this.hue + (rng() - 0.5) * 100}, 80%, 25%, 0.15)`;

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
                sprite: sprite,
                pulsePhase: rng() * Math.PI * 2,
                pulseSpeed: rng() * 0.01 + 0.005
            });
        }
    }

    drawAurora() {
        this.auroraOffset += 0.002;
        this.ctx.globalCompositeOperation = 'lighter';

        const colors = [
            `hsla(${this.hue}, 80%, 30%, 0.1)`,
            `hsla(${(this.hue + 60) % 360}, 80%, 30%, 0.1)`,
            `hsla(${(this.hue + 120) % 360}, 80%, 30%, 0.1)`
        ];

        for (let i = 0; i < 3; i++) {
            this.ctx.fillStyle = colors[i];
            this.ctx.beginPath();

            let yBase = this.height * (0.3 + i * 0.2);
            this.ctx.moveTo(0, this.height);
            this.ctx.lineTo(0, yBase);

            for (let x = 0; x <= this.width; x += 50) {
                // Use noise for y variation
                const n = this.noise(x * 0.002 + this.auroraOffset + i * 10);
                const y = yBase + n * 100;
                this.ctx.lineTo(x, y);
            }

            this.ctx.lineTo(this.width, this.height);
            this.ctx.fill();
        }

        this.ctx.globalCompositeOperation = 'source-over';
    }

    animate() {
        this.tick++;

        // Smoothly interpolate speed
        this.speedMultiplier += (this.targetSpeed - this.speedMultiplier) * 0.1;

        // Animated Gradient
        if (!this.isDark && this.tick % 15 === 0) {
             this.updateThemeColors();
        }

        // Draw Background Gradient
        if (this.gradient) {
            this.ctx.fillStyle = this.gradient;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // Draw Aurora
        if (!this.isMonochrome) {
            this.drawAurora();
        }

        // Mouse Trail (Pooled)
        let newTrailNode;
        if (this.trailPool.length > 0) {
            newTrailNode = this.trailPool.pop();
            newTrailNode.x = mouse.x;
            newTrailNode.y = mouse.y;
            newTrailNode.age = 0;
        } else {
            newTrailNode = { x: mouse.x, y: mouse.y, age: 0 };
        }
        this.trail.push(newTrailNode);

        // Update trail ages
        for(let i=0; i<this.trail.length; i++) {
            this.trail[i].age++;
        }

        // Remove old trails (from front, queue-like)
        while(this.trail.length > 0 && this.trail[0].age > 20) {
            this.trailPool.push(this.trail.shift());
        }

        // Render Trail with Rainbow/Theme Effect
        this.ctx.lineCap = 'round';
        if (this.trail.length > 1) {
            this.ctx.beginPath();
            // Dynamic trail color
            const trailHue = (this.tick * 2) % 360;

            for (let i = 0; i < this.trail.length - 1; i++) {
                const t = this.trail[i];
                const nextT = this.trail[i+1];

                const opacity = 1 - (t.age / 20);
                this.ctx.beginPath();
                // Vary hue slightly along the trail or over time
                this.ctx.strokeStyle = `hsla(${trailHue}, 80%, 70%, ${opacity * 0.5})`;
                this.ctx.lineWidth = (1 - t.age / 20) * 8;
                this.ctx.moveTo(t.x, t.y);
                this.ctx.lineTo(nextT.x, nextT.y);
                this.ctx.stroke();
            }
        }

        // Render Gravity Well Visual
        if (this.isGravityWell) {
             const g = this.ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 100);
             g.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
             g.addColorStop(0.3, 'rgba(20, 0, 30, 0.6)');
             g.addColorStop(0.6, 'rgba(100, 50, 150, 0.2)');
             g.addColorStop(1, 'transparent');
             this.ctx.fillStyle = g;
             this.ctx.beginPath();
             this.ctx.arc(mouse.x, mouse.y, 100, 0, Math.PI * 2);
             this.ctx.fill();

             // Spawn spiraling particles
             if (this.tick % 2 === 0) {
                 const angle = Math.random() * Math.PI * 2;
                 const dist = 100 + Math.random() * 50;
                 // Calculate velocity towards center but with a spiral offset
                 const dx = mouse.x - (mouse.x + Math.cos(angle) * dist);
                 const dy = mouse.y - (mouse.y + Math.sin(angle) * dist);
                 const d = Math.sqrt(dx*dx + dy*dy);
                 const ux = dx/d;
                 const uy = dy/d;

                 this.sparks.push({
                     x: mouse.x + Math.cos(angle) * dist,
                     y: mouse.y + Math.sin(angle) * dist,
                     vx: ux * 5 + uy * 2, // Inward + Tangential
                     vy: uy * 5 - ux * 2,
                     life: 30,
                     maxLife: 30,
                     size: 2,
                     color: '100, 200, 255'
                 });
             }
        }

        this.drawSparks();

        // Update and Draw Shockwaves
        this.ctx.lineWidth = 2;
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.speed;
            sw.alpha = 1 - (sw.radius / sw.maxRadius);

            if (sw.alpha <= 0) {
                this.shockwaves.splice(i, 1);
                continue;
            }

            this.ctx.beginPath();
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${sw.alpha * 0.3})`;
            this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Parallax Offset
        const mx = (mouse.x - this.width / 2) * 0.05;
        const my = (mouse.y - this.height / 2) * 0.05;

        // Draw Nebulas (Dynamic rotation & pulse)
        this.ctx.globalCompositeOperation = 'lighter';
        this.nebulas.forEach(n => {
            n.x += n.vx * this.speedMultiplier;
            n.y += n.vy * this.speedMultiplier;
            n.rotation += n.rotationSpeed * this.speedMultiplier;

            // Wrap around
            if (n.x < -n.radius) n.x = this.width + n.radius;
            if (n.x > this.width + n.radius) n.x = -n.radius;
            if (n.y < -n.radius) n.y = this.height + n.radius;
            if (n.y > this.height + n.radius) n.y = -n.radius;

            this.ctx.save();
            this.ctx.translate(n.x - mx * 0.5, n.y - my * 0.5);
            this.ctx.rotate(n.rotation);

            // Pulse Effect
            const scale = 1 + Math.sin(this.tick * n.pulseSpeed + n.pulsePhase) * 0.1;
            this.ctx.scale(scale, scale);

            this.ctx.drawImage(n.sprite, -n.radius, -n.radius);
            this.ctx.restore();
        });
        this.ctx.globalCompositeOperation = 'source-over';

        // Draw Dust
        // Dynamic Dust Color based on theme hue
        const dustHue = (this.hue + 200) % 360;
        this.ctx.fillStyle = `hsla(${dustHue}, 60%, 80%, 0.8)`;

        this.dust.forEach(d => {
             d.x += d.vx * this.speedMultiplier;
             d.y += d.vy * this.speedMultiplier;

             // Wrap
             if(d.x < 0) d.x += this.width;
             else if(d.x > this.width) d.x -= this.width;
             if(d.y < 0) d.y += this.height;
             else if(d.y > this.height) d.y -= this.height;

             // Interaction: Mouse (Repulsion or Gravity)
             const dx = d.x - mouse.x;
             const dy = d.y - mouse.y;
             const distSq = dx*dx + dy*dy;

             if (this.isGravityWell) {
                 if(distSq < 150000 && distSq > 100) {
                     const dist = Math.sqrt(distSq);
                     const force = (150000 - distSq) / 150000;
                     const pull = force * 3.0; // Stronger for dust

                     const ux = dx / dist;
                     const uy = dy / dist;

                     d.x -= ux * pull;
                     d.y -= uy * pull;

                     // Spiral
                     d.x += -uy * pull * 0.8;
                     d.y += ux * pull * 0.8;
                 }
             } else {
                 // Mouse Influence (Subtle Repulsion/Displace)
                 if(distSq < 10000) {
                     const dist = Math.sqrt(distSq);
                     if (dist > 1) {
                        const ux = dx / dist;
                        const uy = dy / dist;
                        d.x += ux * 0.5;
                        d.y += uy * 0.5;
                     }
                 }
             }

             this.ctx.globalAlpha = d.baseAlpha;
             this.ctx.fillRect(d.x - mx * 0.8, d.y - my * 0.8, d.size, d.size);
        });
        this.ctx.globalAlpha = 1.0;

        // Draw Constellations
        this.drawConstellations();

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

            if (this.isGravityWell) {
                 // Gravity Well Logic
                 if (distSq < 200000 && distSq > 100) { // Large range
                     const dist = Math.sqrt(distSq);
                     const force = (200000 - distSq) / 200000;
                     const pull = force * 1.5;

                     const ux = mdx / dist;
                     const uy = mdy / dist;

                     star.vx -= ux * pull; // Pull towards mouse
                     star.vy -= uy * pull;

                     // Spiral
                     star.vx += -uy * pull * 0.3;
                     star.vy += ux * pull * 0.3;
                 }
            } else {
                if (distSq < 20000) { // Repulsion range
                    const dist = Math.sqrt(distSq);
                    if (dist > 1) {
                        const force = (20000 - distSq) / 20000;
                        const push = force * 1.5; // Push strength
                        const ux = mdx / dist;
                        const uy = mdy / dist;

                        star.vx += ux * push;
                        star.vy += uy * push;
                    }
                }
            }

            // Shockwave Interaction
            this.shockwaves.forEach(sw => {
                const dx = wx - sw.x;
                const dy = wy - sw.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const distFromWave = Math.abs(dist - sw.radius);

                if (distFromWave < 100) {
                     // Using vector math optimization here too
                     if (dist > 1) {
                         const force = (100 - distFromWave) / 100 * sw.strength;
                         const ux = dx / dist;
                         const uy = dy / dist;
                         star.vx += ux * force;
                         star.vy += uy * force;
                     }
                }
            });

            // Update Star Position
            star.x += (star.baseVx + star.vx) * this.speedMultiplier;
            star.y += (star.baseVy + star.vy) * this.speedMultiplier;

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

            // WARP SPEED EFFECT & OPTIMIZATION
            const currentSize = star.size * sizeMod;

            if (this.speedMultiplier > 5) {
                this.ctx.strokeStyle = star.color;
                this.ctx.lineWidth = Math.max(1, currentSize * 0.5);
                this.ctx.beginPath();
                this.ctx.moveTo(wxNew, wyNew);

                // Streak length based on speed
                const len = this.speedMultiplier * 2;
                // Draw streak opposite to velocity
                this.ctx.lineTo(wxNew - (star.baseVx + star.vx) * len, wyNew - (star.baseVy + star.vy) * len);
                this.ctx.stroke();
            } else {
                // Normal rendering
                if (currentSize < 2) {
                    this.ctx.fillRect(wxNew, wyNew, currentSize, currentSize);
                } else {
                    this.ctx.beginPath();
                    this.ctx.arc(wxNew, wyNew, currentSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
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
