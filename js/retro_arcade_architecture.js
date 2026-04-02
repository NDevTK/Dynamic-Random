/**
 * @file retro_arcade_architecture.js
 * @description Self-playing retro game aesthetics as animated backgrounds.
 * Seed picks between game modes: space invaders, breakout, snake, asteroids, pong.
 * Each has distinct visual style, physics, and particle effects.
 * Mouse influences game elements. CRT scanline and pixel aesthetics.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class RetroArcadeArchitecture extends Architecture {
    constructor() {
        super();
        this.gameMode = 0;
        this.entities = [];
        this.projectiles = [];
        this.particles = [];
        this.particlePool = [];
        this.score = 0;
        this.tick = 0;
        this.pixelSize = 4;
        this.crtEffect = true;
        this.palette = [];
    }

    init(system) {
        const rng = system.rng;

        // 0=space invaders, 1=breakout, 2=snake, 3=asteroids, 4=pong
        this.gameMode = Math.floor(rng() * 5);
        this.pixelSize = 3 + Math.floor(rng() * 3);
        this.crtEffect = rng() > 0.3;
        this.score = 0;
        this.tick = 0;
        this.entities = [];
        this.projectiles = [];
        this.particles = [];
        this.particlePool = [];

        // Retro color palettes
        const palettes = [
            ['#00ff00', '#33ff33', '#66ff66', '#003300'],  // Monochrome green
            ['#ff6600', '#ffcc00', '#ff0066', '#330011'],  // Warm arcade
            ['#00ccff', '#0066ff', '#ff00ff', '#000033'],  // Neon blue
            ['#ffffff', '#aaaaaa', '#555555', '#111111'],  // Grayscale
            ['#ff0000', '#ffff00', '#00ff00', '#0000ff'],  // Classic RGB
            ['#e0f8cf', '#86c06c', '#306850', '#071821'],  // GameBoy
        ];
        this.palette = palettes[Math.floor(rng() * palettes.length)];

        switch (this.gameMode) {
            case 0: this._initInvaders(system); break;
            case 1: this._initBreakout(system); break;
            case 2: this._initSnake(system); break;
            case 3: this._initAsteroids(system); break;
            case 4: this._initPong(system); break;
        }
    }

    _initInvaders(system) {
        const rng = system.rng;
        const cols = 8 + Math.floor(rng() * 5);
        const rows = 3 + Math.floor(rng() * 4);
        const spacing = 40 + Math.floor(rng() * 20);
        const startX = (system.width - cols * spacing) / 2;

        this.invaderDir = 1;
        this.invaderSpeed = 0.5 + rng() * 0.5;
        this.invaderDropTimer = 0;
        this.playerX = system.width / 2;
        this.shootTimer = 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this.entities.push({
                    type: 'invader',
                    x: startX + c * spacing,
                    y: 60 + r * spacing,
                    w: 24, h: 18,
                    row: r,
                    alive: true,
                    frame: 0,
                });
            }
        }
    }

    _initBreakout(system) {
        const rng = system.rng;
        const cols = 10 + Math.floor(rng() * 6);
        const rows = 4 + Math.floor(rng() * 4);
        const brickW = (system.width - 40) / cols;
        const brickH = 15 + Math.floor(rng() * 10);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const hue = ((r * 40 + c * 15) + system.hue) % 360;
                this.entities.push({
                    type: 'brick',
                    x: 20 + c * brickW, y: 50 + r * (brickH + 3),
                    w: brickW - 2, h: brickH,
                    hue, alive: true,
                    hits: r < 2 ? 2 : 1,
                });
            }
        }

        this.ball = {
            x: system.width / 2, y: system.height * 0.7,
            vx: (rng() > 0.5 ? 1 : -1) * (2 + rng() * 2),
            vy: -(3 + rng() * 2),
            size: 4 + Math.floor(rng() * 3),
        };
        this.paddleX = system.width / 2;
        this.paddleW = 60 + Math.floor(rng() * 40);
    }

    _initSnake(system) {
        const rng = system.rng;
        const gridSize = this.pixelSize * 3;
        this.snakeGridSize = gridSize;
        const startX = Math.floor(system.width / 2 / gridSize) * gridSize;
        const startY = Math.floor(system.height / 2 / gridSize) * gridSize;

        this.snake = [
            { x: startX, y: startY },
            { x: startX - gridSize, y: startY },
            { x: startX - gridSize * 2, y: startY },
        ];
        this.snakeDir = { x: gridSize, y: 0 };
        this.snakeTimer = 0;
        this.snakeSpeed = 4 + Math.floor(rng() * 4);

        // Place food
        this.food = { x: 0, y: 0 };
        this._placeFood(system);

        // AI target points for auto-play
        this.aiTarget = null;
    }

    _placeFood(system) {
        const gridSize = this.snakeGridSize;
        this.food.x = Math.floor(Math.random() * (system.width / gridSize)) * gridSize;
        this.food.y = Math.floor(Math.random() * (system.height / gridSize)) * gridSize;
    }

    _initAsteroids(system) {
        const rng = system.rng;
        this.ship = {
            x: system.width / 2, y: system.height / 2,
            vx: 0, vy: 0,
            angle: -Math.PI / 2,
            thrust: false,
        };

        const asteroidCount = 5 + Math.floor(rng() * 5);
        for (let i = 0; i < asteroidCount; i++) {
            this._spawnAsteroid(system, rng, 'large');
        }
        this.asteroidShootTimer = 0;
        this.shipAIAngle = 0;
    }

    _spawnAsteroid(system, rng, size) {
        const sizes = { large: 30, medium: 18, small: 10 };
        const r = sizes[size] || 30;
        const angle = rng() * Math.PI * 2;
        // Generate irregular asteroid shape
        const vertices = [];
        const numVerts = 7 + Math.floor(rng() * 5);
        for (let i = 0; i < numVerts; i++) {
            const va = (i / numVerts) * Math.PI * 2;
            const vr = r * (0.7 + rng() * 0.6);
            vertices.push({ angle: va, radius: vr });
        }
        this.entities.push({
            type: 'asteroid',
            x: rng() * system.width,
            y: rng() * system.height,
            vx: Math.cos(angle) * (0.5 + rng() * 1.5),
            vy: Math.sin(angle) * (0.5 + rng() * 1.5),
            radius: r,
            size,
            rotation: rng() * Math.PI * 2,
            rotSpeed: (rng() - 0.5) * 0.03,
            vertices,
        });
    }

    _initPong(system) {
        const rng = system.rng;
        this.pongBall = {
            x: system.width / 2, y: system.height / 2,
            vx: (rng() > 0.5 ? 1 : -1) * (3 + rng() * 2),
            vy: (rng() - 0.5) * 4,
            size: 6 + Math.floor(rng() * 4),
            trail: [],
        };
        this.paddle1Y = system.height / 2;
        this.paddle2Y = system.height / 2;
        this.paddleH = 60 + Math.floor(rng() * 40);
        this.paddleW = 8 + Math.floor(rng() * 6);
        this.pongScore = [0, 0];
    }

    _spawnExplosion(x, y, count, hue) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            let p = this.particlePool.length > 0 ? this.particlePool.pop() : {};
            p.x = x; p.y = y;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.life = 30 + Math.random() * 30;
            p.maxLife = p.life;
            p.size = 2 + Math.random() * 3;
            p.hue = hue;
            this.particles.push(p);
        }
    }

    update(system) {
        this.tick++;
        switch (this.gameMode) {
            case 0: this._updateInvaders(system); break;
            case 1: this._updateBreakout(system); break;
            case 2: this._updateSnake(system); break;
            case 3: this._updateAsteroids(system); break;
            case 4: this._updatePong(system); break;
        }

        // Update explosion particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx; p.y += p.vy;
            p.vx *= 0.96; p.vy *= 0.96;
            p.life--;
            if (p.life <= 0) {
                this.particlePool.push(p);
                this.particles[i] = this.particles[this.particles.length - 1];
                this.particles.pop();
            }
        }
    }

    _updateInvaders(system) {
        // Move invaders
        let hitEdge = false;
        const aliveInvaders = this.entities.filter(e => e.alive);
        for (const inv of aliveInvaders) {
            inv.x += this.invaderSpeed * this.invaderDir;
            inv.frame = Math.floor(this.tick / 30) % 2;
            if (inv.x < 20 || inv.x + inv.w > system.width - 20) hitEdge = true;
        }
        if (hitEdge) {
            this.invaderDir *= -1;
            for (const inv of aliveInvaders) inv.y += 15;
        }

        // Respawn if all dead
        if (aliveInvaders.length === 0) this._initInvaders(system);

        // Auto-play: move player and shoot
        this.playerX += (mouse.x - this.playerX) * 0.05;
        this.shootTimer++;
        if (this.shootTimer > 20) {
            this.shootTimer = 0;
            this.projectiles.push({ x: this.playerX, y: system.height - 60, vy: -6 });
        }

        // Invaders occasionally shoot back
        if (this.tick % 60 === 0 && aliveInvaders.length > 0) {
            const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
            this.projectiles.push({ x: shooter.x + shooter.w / 2, y: shooter.y + shooter.h, vy: 3, enemy: true });
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.y += proj.vy;
            if (proj.y < -10 || proj.y > system.height + 10) {
                this.projectiles.splice(i, 1);
                continue;
            }
            // Collision with invaders
            if (!proj.enemy) {
                for (const inv of this.entities) {
                    if (inv.alive && proj.x > inv.x && proj.x < inv.x + inv.w && proj.y > inv.y && proj.y < inv.y + inv.h) {
                        inv.alive = false;
                        this.projectiles.splice(i, 1);
                        this.score += 10;
                        this._spawnExplosion(inv.x + inv.w / 2, inv.y + inv.h / 2, 12, 120);
                        break;
                    }
                }
            }
        }
    }

    _updateBreakout(system) {
        const b = this.ball;
        // Paddle follows mouse
        this.paddleX += (mouse.x - this.paddleX) * 0.08;

        b.x += b.vx;
        b.y += b.vy;

        // Wall bounces
        if (b.x < b.size || b.x > system.width - b.size) b.vx *= -1;
        if (b.y < b.size) b.vy *= -1;

        // Paddle bounce
        const paddleY = system.height - 40;
        if (b.y + b.size > paddleY && b.y - b.size < paddleY + 12 &&
            b.x > this.paddleX - this.paddleW / 2 && b.x < this.paddleX + this.paddleW / 2) {
            b.vy = -Math.abs(b.vy);
            b.vx += (b.x - this.paddleX) * 0.1;
        }

        // Reset if ball goes below
        if (b.y > system.height + 20) {
            b.x = system.width / 2;
            b.y = system.height * 0.7;
            b.vy = -Math.abs(b.vy);
        }

        // Brick collision
        for (const brick of this.entities) {
            if (!brick.alive) continue;
            if (b.x + b.size > brick.x && b.x - b.size < brick.x + brick.w &&
                b.y + b.size > brick.y && b.y - b.size < brick.y + brick.h) {
                brick.hits--;
                if (brick.hits <= 0) {
                    brick.alive = false;
                    this._spawnExplosion(brick.x + brick.w / 2, brick.y + brick.h / 2, 8, brick.hue);
                    this.score += 5;
                }
                b.vy *= -1;
                break;
            }
        }

        // Respawn bricks if all destroyed
        if (!this.entities.some(e => e.alive)) this._initBreakout(system);
    }

    _updateSnake(system) {
        this.snakeTimer++;
        if (this.snakeTimer < this.snakeSpeed) return;
        this.snakeTimer = 0;

        const gs = this.snakeGridSize;
        const head = this.snake[0];

        // Simple AI: head toward food
        const dx = this.food.x - head.x;
        const dy = this.food.y - head.y;

        if (Math.abs(dx) > Math.abs(dy)) {
            this.snakeDir = { x: dx > 0 ? gs : -gs, y: 0 };
        } else {
            this.snakeDir = { x: 0, y: dy > 0 ? gs : -gs };
        }

        // Slight randomness to make it more interesting
        if (Math.random() < 0.1) {
            const dirs = [{ x: gs, y: 0 }, { x: -gs, y: 0 }, { x: 0, y: gs }, { x: 0, y: -gs }];
            this.snakeDir = dirs[Math.floor(Math.random() * dirs.length)];
        }

        const newHead = { x: head.x + this.snakeDir.x, y: head.y + this.snakeDir.y };

        // Wrap around
        if (newHead.x < 0) newHead.x = system.width - gs;
        if (newHead.x >= system.width) newHead.x = 0;
        if (newHead.y < 0) newHead.y = system.height - gs;
        if (newHead.y >= system.height) newHead.y = 0;

        // Check self collision
        const selfHit = this.snake.some(s => s.x === newHead.x && s.y === newHead.y);
        if (selfHit) {
            // Reset snake
            this._spawnExplosion(head.x, head.y, 20, 0);
            this._initSnake(system);
            return;
        }

        this.snake.unshift(newHead);

        // Check food
        if (Math.abs(newHead.x - this.food.x) < gs && Math.abs(newHead.y - this.food.y) < gs) {
            this.score += 10;
            this._placeFood(system);
            this._spawnExplosion(this.food.x, this.food.y, 10, 120);
        } else {
            this.snake.pop();
        }

        // Cap snake length for performance
        if (this.snake.length > 100) this.snake.pop();
    }

    _updateAsteroids(system) {
        const ship = this.ship;

        // Auto-pilot: aim at nearest asteroid
        let nearest = null;
        let nearDist = Infinity;
        for (const e of this.entities) {
            if (e.type !== 'asteroid') continue;
            const d = Math.hypot(e.x - ship.x, e.y - ship.y);
            if (d < nearDist) { nearDist = d; nearest = e; }
        }

        if (nearest) {
            const targetAngle = Math.atan2(nearest.y - ship.y, nearest.x - ship.x);
            let angleDiff = targetAngle - ship.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            ship.angle += angleDiff * 0.05;
        }

        // Mouse influence on ship direction
        const mouseAngle = Math.atan2(mouse.y - ship.y, mouse.x - ship.x);
        let mDiff = mouseAngle - ship.angle;
        while (mDiff > Math.PI) mDiff -= Math.PI * 2;
        while (mDiff < -Math.PI) mDiff += Math.PI * 2;
        ship.angle += mDiff * 0.02;

        // Thrust
        ship.vx += Math.cos(ship.angle) * 0.05;
        ship.vy += Math.sin(ship.angle) * 0.05;
        ship.vx *= 0.99; ship.vy *= 0.99;
        ship.x += ship.vx; ship.y += ship.vy;

        // Wrap
        if (ship.x < 0) ship.x = system.width;
        if (ship.x > system.width) ship.x = 0;
        if (ship.y < 0) ship.y = system.height;
        if (ship.y > system.height) ship.y = 0;

        // Auto-shoot
        this.asteroidShootTimer++;
        if (this.asteroidShootTimer > 15 && nearest) {
            this.asteroidShootTimer = 0;
            this.projectiles.push({
                x: ship.x + Math.cos(ship.angle) * 15,
                y: ship.y + Math.sin(ship.angle) * 15,
                vx: Math.cos(ship.angle) * 6 + ship.vx,
                vy: Math.sin(ship.angle) * 6 + ship.vy,
                life: 60,
            });
        }

        // Update asteroids
        for (const e of this.entities) {
            if (e.type !== 'asteroid') continue;
            e.x += e.vx; e.y += e.vy;
            e.rotation += e.rotSpeed;
            if (e.x < -50) e.x = system.width + 50;
            if (e.x > system.width + 50) e.x = -50;
            if (e.y < -50) e.y = system.height + 50;
            if (e.y > system.height + 50) e.y = -50;
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx; p.y += p.vy;
            p.life--;
            if (p.life <= 0) { this.projectiles.splice(i, 1); continue; }

            // Collision with asteroids
            for (let j = this.entities.length - 1; j >= 0; j--) {
                const e = this.entities[j];
                if (e.type !== 'asteroid') continue;
                if (Math.hypot(p.x - e.x, p.y - e.y) < e.radius) {
                    this._spawnExplosion(e.x, e.y, 15, 30);
                    this.score += 20;
                    // Split into smaller
                    if (e.size === 'large') {
                        for (let k = 0; k < 2; k++) this._spawnAsteroid(system, Math.random, 'medium');
                    } else if (e.size === 'medium') {
                        for (let k = 0; k < 2; k++) this._spawnAsteroid(system, Math.random, 'small');
                    }
                    this.entities.splice(j, 1);
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
        }

        // Respawn asteroids if none left
        if (!this.entities.some(e => e.type === 'asteroid')) {
            for (let i = 0; i < 5; i++) this._spawnAsteroid(system, system.rng, 'large');
        }
    }

    _updatePong(system) {
        const b = this.pongBall;
        b.x += b.vx; b.y += b.vy;

        // Top/bottom bounce
        if (b.y < b.size || b.y > system.height - b.size) b.vy *= -1;

        // Paddle AI
        this.paddle1Y += (b.y - this.paddle1Y) * 0.04;
        this.paddle2Y += (mouse.y - this.paddle2Y) * 0.06;

        // Left paddle collision
        if (b.x - b.size < 30 + this.paddleW && b.y > this.paddle1Y - this.paddleH / 2 && b.y < this.paddle1Y + this.paddleH / 2) {
            b.vx = Math.abs(b.vx) * 1.02;
            b.vy += (b.y - this.paddle1Y) * 0.1;
            this._spawnExplosion(b.x, b.y, 5, 200);
        }
        // Right paddle collision
        if (b.x + b.size > system.width - 30 - this.paddleW && b.y > this.paddle2Y - this.paddleH / 2 && b.y < this.paddle2Y + this.paddleH / 2) {
            b.vx = -Math.abs(b.vx) * 1.02;
            b.vy += (b.y - this.paddle2Y) * 0.1;
            this._spawnExplosion(b.x, b.y, 5, 120);
        }

        // Score and reset
        if (b.x < -20 || b.x > system.width + 20) {
            if (b.x < -20) this.pongScore[1]++;
            else this.pongScore[0]++;
            this._spawnExplosion(b.x, b.y, 20, 0);
            b.x = system.width / 2;
            b.y = system.height / 2;
            b.vx = (Math.random() > 0.5 ? 1 : -1) * 3;
            b.vy = (Math.random() - 0.5) * 4;
        }

        // Speed cap
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > 12) {
            b.vx = (b.vx / speed) * 12;
            b.vy = (b.vy / speed) * 12;
        }

        // Trail
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 20) b.trail.shift();
    }

    draw(system) {
        const ctx = system.ctx;
        const w = system.width;
        const h = system.height;

        switch (this.gameMode) {
            case 0: this._drawInvaders(ctx, system); break;
            case 1: this._drawBreakout(ctx, system); break;
            case 2: this._drawSnake(ctx, system); break;
            case 3: this._drawAsteroids(ctx, system); break;
            case 4: this._drawPong(ctx, system); break;
        }

        // Draw particles (shared across all modes)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${alpha})`;
            ctx.fillRect(
                Math.floor(p.x / this.pixelSize) * this.pixelSize,
                Math.floor(p.y / this.pixelSize) * this.pixelSize,
                this.pixelSize, this.pixelSize
            );
        }
        ctx.restore();

        // CRT scanline overlay
        if (this.crtEffect) {
            ctx.save();
            ctx.globalAlpha = 0.06;
            ctx.fillStyle = '#000';
            for (let y = 0; y < h; y += 3) {
                ctx.fillRect(0, y, w, 1);
            }
            // CRT vignette
            ctx.globalAlpha = 1;
            const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.8);
            vig.addColorStop(0, 'transparent');
            vig.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }

        // Score display
        ctx.save();
        ctx.fillStyle = this.palette[0];
        ctx.font = `${this.pixelSize * 4}px monospace`;
        ctx.globalAlpha = 0.5;
        ctx.fillText(`SCORE: ${this.score}`, 20, 30);
        ctx.restore();
    }

    _drawInvaders(ctx, system) {
        const ps = this.pixelSize;

        // Draw invaders as pixel art
        for (const inv of this.entities) {
            if (!inv.alive) continue;
            ctx.fillStyle = this.palette[inv.row % this.palette.length];

            // Simple invader pixel pattern
            const pattern = inv.frame === 0
                ? [[0,1,0,0,0,1,0],[0,0,1,1,1,0,0],[0,1,1,1,1,1,0],[1,0,1,1,1,0,1],[1,1,1,1,1,1,1],[0,1,0,0,0,1,0]]
                : [[0,1,0,0,0,1,0],[1,0,1,1,1,0,1],[1,1,1,1,1,1,1],[0,1,1,1,1,1,0],[0,1,0,0,0,1,0],[1,0,0,0,0,0,1]];

            for (let r = 0; r < pattern.length; r++) {
                for (let c = 0; c < pattern[r].length; c++) {
                    if (pattern[r][c]) {
                        ctx.fillRect(inv.x + c * ps, inv.y + r * ps, ps, ps);
                    }
                }
            }
        }

        // Draw player ship
        ctx.fillStyle = this.palette[0];
        const px = this.playerX;
        const py = system.height - 60;
        ctx.fillRect(px - ps * 3, py, ps * 7, ps * 2);
        ctx.fillRect(px - ps, py - ps * 2, ps * 3, ps * 2);
        ctx.fillRect(px, py - ps * 3, ps, ps);

        // Draw projectiles
        for (const proj of this.projectiles) {
            ctx.fillStyle = proj.enemy ? this.palette[2] || '#ff0000' : this.palette[0];
            ctx.fillRect(proj.x - ps / 2, proj.y, ps, ps * 3);
        }
    }

    _drawBreakout(ctx, system) {
        // Draw bricks
        for (const brick of this.entities) {
            if (!brick.alive) continue;
            ctx.fillStyle = `hsl(${brick.hue}, 80%, ${50 + brick.hits * 15}%)`;
            ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
            // Highlight
            ctx.fillStyle = `hsla(${brick.hue}, 80%, 80%, 0.3)`;
            ctx.fillRect(brick.x, brick.y, brick.w, 2);
        }

        // Draw paddle
        ctx.fillStyle = this.palette[0];
        ctx.fillRect(this.paddleX - this.paddleW / 2, system.height - 40, this.paddleW, 12);

        // Draw ball with glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const bg = ctx.createRadialGradient(this.ball.x, this.ball.y, 0, this.ball.x, this.ball.y, this.ball.size * 4);
        bg.addColorStop(0, `${this.palette[0]}88`);
        bg.addColorStop(1, 'transparent');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.size * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = this.palette[0];
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.size, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawSnake(ctx, system) {
        const gs = this.snakeGridSize;

        // Draw snake body with gradient
        for (let i = this.snake.length - 1; i >= 0; i--) {
            const s = this.snake[i];
            const alpha = 0.3 + (i / this.snake.length) * 0.7;
            const hue = (120 + i * 3) % 360;
            ctx.fillStyle = i === 0 ? this.palette[0] : `hsla(${hue}, 80%, 50%, ${alpha})`;
            ctx.fillRect(s.x, s.y, gs - 1, gs - 1);
        }

        // Draw food with pulsing glow
        const pulse = Math.sin(this.tick * 0.1) * 0.3 + 0.7;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const fg = ctx.createRadialGradient(this.food.x + gs / 2, this.food.y + gs / 2, 0, this.food.x + gs / 2, this.food.y + gs / 2, gs * 3);
        fg.addColorStop(0, `rgba(255, 50, 50, ${0.5 * pulse})`);
        fg.addColorStop(1, 'transparent');
        ctx.fillStyle = fg;
        ctx.fillRect(this.food.x - gs * 2, this.food.y - gs * 2, gs * 5, gs * 5);
        ctx.restore();
        ctx.fillStyle = `hsl(0, 100%, ${50 + pulse * 20}%)`;
        ctx.fillRect(this.food.x, this.food.y, gs - 1, gs - 1);

        // Grid overlay (subtle)
        ctx.save();
        ctx.globalAlpha = 0.03;
        ctx.strokeStyle = this.palette[0];
        ctx.lineWidth = 0.5;
        for (let x = 0; x < system.width; x += gs) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, system.height); ctx.stroke();
        }
        for (let y = 0; y < system.height; y += gs) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(system.width, y); ctx.stroke();
        }
        ctx.restore();
    }

    _drawAsteroids(ctx, system) {
        ctx.strokeStyle = this.palette[0];
        ctx.lineWidth = 1.5;

        // Draw asteroids
        for (const e of this.entities) {
            if (e.type !== 'asteroid') continue;
            ctx.save();
            ctx.translate(e.x, e.y);
            ctx.rotate(e.rotation);
            ctx.beginPath();
            for (let i = 0; i < e.vertices.length; i++) {
                const v = e.vertices[i];
                const vx = Math.cos(v.angle) * v.radius;
                const vy = Math.sin(v.angle) * v.radius;
                if (i === 0) ctx.moveTo(vx, vy);
                else ctx.lineTo(vx, vy);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }

        // Draw ship
        const ship = this.ship;
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, -8);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-10, 8);
        ctx.closePath();
        ctx.stroke();

        // Thrust flame
        ctx.fillStyle = this.palette[2] || this.palette[0];
        ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        ctx.beginPath();
        ctx.moveTo(-6, -3);
        ctx.lineTo(-15 - Math.random() * 8, 0);
        ctx.lineTo(-6, 3);
        ctx.fill();
        ctx.restore();

        // Draw projectiles
        ctx.fillStyle = this.palette[0];
        for (const p of this.projectiles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawPong(ctx, system) {
        const b = this.pongBall;

        // Center line
        ctx.save();
        ctx.strokeStyle = this.palette[0];
        ctx.globalAlpha = 0.2;
        ctx.setLineDash([10, 10]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(system.width / 2, 0);
        ctx.lineTo(system.width / 2, system.height);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Paddles
        ctx.fillStyle = this.palette[0];
        ctx.fillRect(20, this.paddle1Y - this.paddleH / 2, this.paddleW, this.paddleH);
        ctx.fillRect(system.width - 20 - this.paddleW, this.paddle2Y - this.paddleH / 2, this.paddleW, this.paddleH);

        // Ball trail
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < b.trail.length; i++) {
            const t = b.trail[i];
            const alpha = (i / b.trail.length) * 0.4;
            ctx.fillStyle = `hsla(${(this.tick + i * 10) % 360}, 100%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, b.size * (i / b.trail.length), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Ball
        ctx.fillStyle = this.palette[0];
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();

        // Glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size * 6);
        glow.addColorStop(0, `${this.palette[0]}44`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size * 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Scores
        ctx.save();
        ctx.fillStyle = this.palette[0];
        ctx.globalAlpha = 0.3;
        ctx.font = '60px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(this.pongScore[0]), system.width * 0.25, 80);
        ctx.fillText(String(this.pongScore[1]), system.width * 0.75, 80);
        ctx.restore();
    }
}
