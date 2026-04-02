/**
 * @file quantum_web_effects.js
 * @description Quantum entanglement visualization - pairs of particles are "entangled"
 * so interacting with one instantly affects its partner across the screen. Creates
 * shimmering connection threads that pulse with energy transfer, probability clouds
 * that collapse on click, and superposition ghost states.
 *
 * Modes:
 * 0 - Entangled Pairs: matched particles mirror each other's reactions to cursor
 * 1 - Probability Cloud: fuzzy electron-cloud orbitals that collapse on interaction
 * 2 - Quantum Tunneling: particles teleport through barriers leaving afterimages
 * 3 - Wave Function: interference patterns ripple between entangled nodes
 * 4 - Spin Network: rotating spin states connected by twisting ribbons
 * 5 - Decoherence Cascade: stable quantum states gradually dissolve into noise
 */

const TAU = Math.PI * 2;

export class QuantumWeb {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 200;
        this.saturation = 70;
        this.intensity = 1;

        this._mouseX = 0;
        this._mouseY = 0;
        this._prevMouseX = 0;
        this._prevMouseY = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._rng = Math.random;

        // Entangled pairs
        this.pairs = [];
        this.pairCount = 6;

        // Probability cloud
        this.cloudParticles = [];
        this.collapsed = false;
        this.collapseTimer = 0;
        this.collapseX = 0;
        this.collapseY = 0;

        // Quantum tunneling
        this.tunnelers = [];
        this.barriers = [];
        this.afterimages = [];
        this.afterimagePool = [];

        // Wave function
        this.waveNodes = [];
        this.waveResolution = 80;

        // Spin network
        this.spinNodes = [];
        this.ribbons = [];

        // Decoherence
        this.coherence = 1;
        this.noiseParticles = [];
    }

    configure(rng, palette) {
        this._rng = rng;
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? palette[Math.floor(rng() * palette.length)].h : 200;
        this.saturation = 50 + Math.floor(rng() * 40);
        this.intensity = 0.6 + rng() * 0.8;
        this.tick = 0;

        const w = window.innerWidth;
        const h = window.innerHeight;

        if (this.mode === 0) {
            // Entangled Pairs
            this.pairCount = 4 + Math.floor(rng() * 5);
            this.pairs = [];
            for (let i = 0; i < this.pairCount; i++) {
                const ax = rng() * w, ay = rng() * h;
                const bx = w - ax + (rng() - 0.5) * 200;
                const by = h - ay + (rng() - 0.5) * 200;
                this.pairs.push({
                    ax, ay, bx, by,
                    avx: 0, avy: 0, bvx: 0, bvy: 0,
                    energy: 0,
                    phase: rng() * TAU,
                    spin: rng() > 0.5 ? 1 : -1,
                    hueOffset: rng() * 60 - 30,
                    size: 3 + rng() * 4
                });
            }
        } else if (this.mode === 1) {
            // Probability Cloud
            this.cloudParticles = [];
            const count = 60 + Math.floor(rng() * 40);
            for (let i = 0; i < count; i++) {
                const angle = rng() * TAU;
                const radius = rng() * 150;
                this.cloudParticles.push({
                    cx: w / 2, cy: h / 2,
                    angle, radius,
                    angularSpeed: (rng() - 0.5) * 0.03,
                    radialOscSpeed: 0.01 + rng() * 0.02,
                    radialPhase: rng() * TAU,
                    baseRadius: radius,
                    size: 1 + rng() * 2,
                    orbital: Math.floor(rng() * 3) // s, p, d orbital shape
                });
            }
            this.collapsed = false;
            this.collapseTimer = 0;
        } else if (this.mode === 2) {
            // Quantum Tunneling
            this.tunnelers = [];
            this.barriers = [];
            this.afterimages = [];
            const barrierCount = 2 + Math.floor(rng() * 3);
            for (let i = 0; i < barrierCount; i++) {
                this.barriers.push({
                    x: w * (0.2 + rng() * 0.6),
                    y: 0, width: 3 + rng() * 5,
                    height: h,
                    opacity: 0.15 + rng() * 0.1
                });
            }
            const tCount = 5 + Math.floor(rng() * 5);
            for (let i = 0; i < tCount; i++) {
                this.tunnelers.push({
                    x: rng() * w, y: rng() * h,
                    vx: (rng() - 0.5) * 3, vy: (rng() - 0.5) * 3,
                    size: 2 + rng() * 3,
                    tunnelProb: 0.02 + rng() * 0.03,
                    hueOffset: rng() * 80 - 40,
                    phase: rng() * TAU
                });
            }
        } else if (this.mode === 3) {
            // Wave Function
            this.waveNodes = [];
            const nodeCount = 3 + Math.floor(rng() * 4);
            for (let i = 0; i < nodeCount; i++) {
                this.waveNodes.push({
                    x: rng() * w, y: rng() * h,
                    freq: 0.02 + rng() * 0.04,
                    amp: 0.3 + rng() * 0.5,
                    phase: rng() * TAU,
                    speed: 0.02 + rng() * 0.03
                });
            }
            this.waveResolution = 60 + Math.floor(rng() * 40);
        } else if (this.mode === 4) {
            // Spin Network
            this.spinNodes = [];
            this.ribbons = [];
            const nodeCount = 6 + Math.floor(rng() * 6);
            for (let i = 0; i < nodeCount; i++) {
                this.spinNodes.push({
                    x: rng() * w, y: rng() * h,
                    vx: (rng() - 0.5) * 0.5, vy: (rng() - 0.5) * 0.5,
                    spin: rng() > 0.5 ? 1 : -1,
                    angle: rng() * TAU,
                    angularVel: (rng() - 0.5) * 0.08,
                    size: 8 + rng() * 12
                });
            }
            // Connect nearby nodes with ribbons
            for (let i = 0; i < nodeCount; i++) {
                for (let j = i + 1; j < nodeCount; j++) {
                    if (rng() > 0.5) {
                        this.ribbons.push({ a: i, b: j, twist: rng() * TAU, twistSpeed: 0.02 + rng() * 0.03 });
                    }
                }
            }
        } else {
            // Decoherence Cascade
            this.coherence = 1;
            this.noiseParticles = [];
            const count = 40 + Math.floor(rng() * 30);
            for (let i = 0; i < count; i++) {
                this.noiseParticles.push({
                    x: rng() * w, y: rng() * h,
                    targetX: rng() * w, targetY: rng() * h,
                    coherentX: w * 0.3 + rng() * w * 0.4,
                    coherentY: h * 0.3 + rng() * h * 0.4,
                    size: 1 + rng() * 3,
                    phase: rng() * TAU,
                    speed: 0.01 + rng() * 0.02
                });
            }
        }
    }

    update(mx, my, isClicking) {
        this._prevMouseX = this._mouseX;
        this._prevMouseY = this._mouseY;
        this._mouseX = mx;
        this._mouseY = my;
        const dx = mx - this._prevMouseX;
        const dy = my - this._prevMouseY;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._isClicking = isClicking;
        this.tick++;

        if (this.mode === 0) this._updatePairs();
        else if (this.mode === 1) this._updateCloud();
        else if (this.mode === 2) this._updateTunneling();
        else if (this.mode === 3) this._updateWaveFunction();
        else if (this.mode === 4) this._updateSpinNetwork();
        else if (this.mode === 5) this._updateDecoherence();
    }

    _updatePairs() {
        const mx = this._mouseX, my = this._mouseY;
        for (const p of this.pairs) {
            // Particle A reacts to cursor
            const dax = mx - p.ax, day = my - p.ay;
            const distA = Math.sqrt(dax * dax + day * day);
            if (distA < 200 && distA > 0) {
                const force = (200 - distA) / 200 * 0.5;
                p.avx += (dax / distA) * force;
                p.avy += (day / distA) * force;
                p.energy = Math.min(1, p.energy + 0.05);
            }

            // Click: "measurement" - swap entanglement and burst energy
            if (this._isClicking && distA < 150) {
                p.energy = 1;
                p.spin *= -1; // Spin flip on measurement
                // Teleport partner to opposite position
                p.bvx += (mx - p.bx) * 0.05 * p.spin;
                p.bvy += (my - p.by) * 0.05 * p.spin;
            }

            // Entangled partner mirrors reaction (spooky action)
            p.bvx += -p.avx * 0.3 * p.spin;
            p.bvy += -p.avy * 0.3 * p.spin;

            p.ax += p.avx; p.ay += p.avy;
            p.bx += p.bvx; p.by += p.bvy;
            p.avx *= 0.92; p.avy *= 0.92;
            p.bvx *= 0.92; p.bvy *= 0.92;
            p.energy *= 0.97;

            // Soft boundary bounce
            const w = window.innerWidth, h = window.innerHeight;
            if (p.ax < 0 || p.ax > w) p.avx *= -0.8;
            if (p.ay < 0 || p.ay > h) p.avy *= -0.8;
            if (p.bx < 0 || p.bx > w) p.bvx *= -0.8;
            if (p.by < 0 || p.by > h) p.bvy *= -0.8;
            p.ax = Math.max(0, Math.min(w, p.ax));
            p.ay = Math.max(0, Math.min(h, p.ay));
            p.bx = Math.max(0, Math.min(w, p.bx));
            p.by = Math.max(0, Math.min(h, p.by));
        }
    }

    _updateCloud() {
        const mx = this._mouseX, my = this._mouseY;
        if (this._isClicking && !this.collapsed) {
            this.collapsed = true;
            this.collapseTimer = 60;
            this.collapseX = mx;
            this.collapseY = my;
        }
        if (this.collapsed) {
            this.collapseTimer--;
            if (this.collapseTimer <= 0) this.collapsed = false;
        }
        for (const p of this.cloudParticles) {
            // Follow cursor loosely
            p.cx += (mx - p.cx) * 0.01;
            p.cy += (my - p.cy) * 0.01;
            p.angle += p.angularSpeed;
            p.radius = p.baseRadius + Math.sin(this.tick * p.radialOscSpeed + p.radialPhase) * 30;
        }
    }

    _updateTunneling() {
        const w = window.innerWidth, h = window.innerHeight;
        // Click makes barriers flicker and boosts tunnel probability
        const clickBoost = this._isClicking ? 0.3 : 0;
        for (const b of this.barriers) {
            b.opacity = this._isClicking
                ? 0.05 + Math.random() * 0.1  // Flicker when clicking
                : Math.min(0.25, (b.opacity || 0.15) + 0.002); // Recover
        }

        for (const t of this.tunnelers) {
            // Cursor attraction
            const dx = this._mouseX - t.x, dy = this._mouseY - t.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200 && dist > 0) {
                t.vx += (dx / dist) * 0.1;
                t.vy += (dy / dist) * 0.1;
            }
            // Click gives tunnelers a speed burst
            if (this._isClicking && dist < 150) {
                t.vx += (dx / dist) * 0.5;
                t.vy += (dy / dist) * 0.5;
            }
            t.x += t.vx; t.y += t.vy;
            t.vx *= 0.99; t.vy *= 0.99;

            // Check barrier collision / tunneling
            for (const b of this.barriers) {
                if (t.x > b.x - b.width && t.x < b.x + b.width) {
                    if (Math.random() < t.tunnelProb + clickBoost) {
                        // Tunnel through - spawn afterimage
                        const ai = this.afterimagePool.length > 0 ? this.afterimagePool.pop() : {};
                        ai.x = t.x; ai.y = t.y; ai.life = 20; ai.maxLife = 20; ai.size = t.size;
                        this.afterimages.push(ai);
                        t.x = t.vx > 0 ? b.x + b.width + 5 : b.x - b.width - 5;
                    } else {
                        t.vx *= -0.5;
                    }
                }
            }
            // Wrap
            if (t.x < 0) t.x = w; if (t.x > w) t.x = 0;
            if (t.y < 0) t.y = h; if (t.y > h) t.y = 0;
        }
        // Decay afterimages
        for (let i = this.afterimages.length - 1; i >= 0; i--) {
            this.afterimages[i].life--;
            if (this.afterimages[i].life <= 0) {
                this.afterimagePool.push(this.afterimages[i]);
                this.afterimages[i] = this.afterimages[this.afterimages.length - 1];
                this.afterimages.pop();
            }
        }
    }

    _updateWaveFunction() {
        // Wave nodes drift slowly and respond to cursor
        const mx = this._mouseX, my = this._mouseY;
        for (const node of this.waveNodes) {
            node.phase += node.speed;
            // Nodes gently attracted toward cursor
            const dx = mx - node.x, dy = my - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0 && dist < 300) {
                node.x += (dx / dist) * 0.2;
                node.y += (dy / dist) * 0.2;
            }
            // Click: amp spike and phase reset for dramatic interference shift
            if (this._isClicking && dist < 200) {
                node.amp = Math.min(1.5, node.amp + 0.1);
                node.phase += 0.5; // Phase jolt creates visible pattern change
            } else {
                // Decay amp back to base
                node.amp *= 0.998;
                node.amp = Math.max(0.3, node.amp);
            }
        }
    }

    _updateSpinNetwork() {
        const w = window.innerWidth, h = window.innerHeight;
        for (const n of this.spinNodes) {
            const dx = this._mouseX - n.x, dy = this._mouseY - n.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150 && dist > 0) {
                n.angularVel += (dist < 80 ? 0.01 : -0.005) * n.spin;
                // Cursor gently repels nodes
                n.vx -= (dx / dist) * 0.02;
                n.vy -= (dy / dist) * 0.02;
            }
            // Click: flip spin and send angular impulse
            if (this._isClicking && dist < 120) {
                n.spin *= -1;
                n.angularVel += 0.15 * n.spin;
                // Push away from cursor
                n.vx += (n.x - this._mouseX) / dist * 1.5;
                n.vy += (n.y - this._mouseY) / dist * 1.5;
            }
            n.angle += n.angularVel;
            n.angularVel *= 0.98;
            n.x += n.vx; n.y += n.vy;
            n.vx *= 0.98; n.vy *= 0.98;
            if (n.x < 0 || n.x > w) n.vx *= -1;
            if (n.y < 0 || n.y > h) n.vy *= -1;
        }
    }

    _updateDecoherence() {
        const mx = this._mouseX, my = this._mouseY;
        // Click: force all particles into coherent state briefly
        const clickCohere = this._isClicking ? 0.15 : 0;

        for (const p of this.noiseParticles) {
            const dx = mx - p.coherentX, dy = my - p.coherentY;
            const distToCoherent = Math.sqrt(dx * dx + dy * dy);
            const localCoherence = Math.min(1, (distToCoherent < 300 ? 1 - distToCoherent / 300 : 0) + clickCohere);

            const targetX = localCoherence > 0.3 ? p.coherentX : p.targetX;
            const targetY = localCoherence > 0.3 ? p.coherentY : p.targetY;
            p.x += (targetX - p.x) * (0.01 + localCoherence * 0.06);
            p.y += (targetY - p.y) * (0.01 + localCoherence * 0.06);

            // Click: snap coherent positions toward cursor
            if (this._isClicking) {
                p.coherentX += (mx - p.coherentX) * 0.005;
                p.coherentY += (my - p.coherentY) * 0.005;
            }

            // Occasionally re-scatter decoherent particles
            if (localCoherence < 0.1 && Math.random() < 0.005) {
                p.targetX = Math.random() * window.innerWidth;
                p.targetY = Math.random() * window.innerHeight;
            }
        }
    }

    draw(ctx, system) {
        const w = system.width, h = system.height;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        if (this.mode === 0) this._drawPairs(ctx);
        else if (this.mode === 1) this._drawCloud(ctx);
        else if (this.mode === 2) this._drawTunneling(ctx, w, h);
        else if (this.mode === 3) this._drawWaveFunction(ctx, w, h);
        else if (this.mode === 4) this._drawSpinNetwork(ctx);
        else if (this.mode === 5) this._drawDecoherence(ctx);

        ctx.restore();
    }

    _drawPairs(ctx) {
        for (const p of this.pairs) {
            const hue = (this.hue + p.hueOffset + 360) % 360;
            const energyGlow = p.energy * 0.5;

            // Entanglement thread
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 60%, ${0.08 + energyGlow})`;
            ctx.lineWidth = 0.5 + p.energy * 2;
            ctx.setLineDash([4, 8 - p.energy * 6]);
            ctx.beginPath();
            // Curved connection line
            const midX = (p.ax + p.bx) / 2 + Math.sin(this.tick * 0.02 + p.phase) * 50;
            const midY = (p.ay + p.by) / 2 + Math.cos(this.tick * 0.015 + p.phase) * 50;
            ctx.moveTo(p.ax, p.ay);
            ctx.quadraticCurveTo(midX, midY, p.bx, p.by);
            ctx.stroke();
            ctx.setLineDash([]);

            // Energy pulse traveling along thread
            if (p.energy > 0.1) {
                const t = (this.tick * 0.03 + p.phase) % 1;
                const px = p.ax + (p.bx - p.ax) * t + (midX - (p.ax + p.bx) / 2) * 4 * t * (1 - t);
                const py = p.ay + (p.by - p.ay) * t + (midY - (p.ay + p.by) / 2) * 4 * t * (1 - t);
                ctx.fillStyle = `hsla(${hue}, 90%, 80%, ${p.energy * 0.6})`;
                ctx.beginPath();
                ctx.arc(px, py, 2 + p.energy * 3, 0, TAU);
                ctx.fill();
            }

            // Particle A - solid state with energy glow halo
            const sizeA = p.size + p.energy * 4;
            if (p.energy > 0.2) {
                const g = ctx.createRadialGradient(p.ax, p.ay, 0, p.ax, p.ay, sizeA * 3);
                g.addColorStop(0, `hsla(${hue}, 90%, 85%, ${p.energy * 0.25})`);
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(p.ax, p.ay, sizeA * 3, 0, TAU);
                ctx.fill();
            }
            ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, 70%, ${0.3 + energyGlow})`;
            ctx.beginPath();
            ctx.arc(p.ax, p.ay, sizeA, 0, TAU);
            ctx.fill();

            // Particle B - entangled partner with complementary glow
            const sizeB = p.size + p.energy * 4;
            const partnerHue = (hue + 180) % 360;
            if (p.energy > 0.2) {
                const g2 = ctx.createRadialGradient(p.bx, p.by, 0, p.bx, p.by, sizeB * 3);
                g2.addColorStop(0, `hsla(${partnerHue}, 90%, 85%, ${p.energy * 0.25})`);
                g2.addColorStop(1, 'transparent');
                ctx.fillStyle = g2;
                ctx.beginPath();
                ctx.arc(p.bx, p.by, sizeB * 3, 0, TAU);
                ctx.fill();
            }
            ctx.strokeStyle = `hsla(${partnerHue}, ${this.saturation}%, 70%, ${0.3 + energyGlow})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(p.bx, p.by, sizeB, 0, TAU);
            ctx.stroke();

            // Spin indicators
            const arrowLen = p.size + 4;
            const spinA = p.spin > 0 ? -1 : 1;
            ctx.strokeStyle = `hsla(${hue}, 80%, 80%, 0.25)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.ax, p.ay - arrowLen * spinA);
            ctx.lineTo(p.ax, p.ay + arrowLen * spinA);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(p.bx, p.by + arrowLen * spinA);
            ctx.lineTo(p.bx, p.by - arrowLen * spinA);
            ctx.stroke();
        }
    }

    _drawCloud(ctx) {
        const collapseProgress = this.collapsed ? 1 - this.collapseTimer / 60 : 0;

        for (const p of this.cloudParticles) {
            let x, y;
            if (this.collapsed && collapseProgress < 0.5) {
                // Collapse toward click point
                const t = collapseProgress * 2;
                const orbX = p.cx + Math.cos(p.angle) * p.radius;
                const orbY = p.cy + Math.sin(p.angle) * p.radius;
                x = orbX + (this.collapseX - orbX) * t;
                y = orbY + (this.collapseY - orbY) * t;
            } else if (this.collapsed) {
                // Expand back out
                const t = (collapseProgress - 0.5) * 2;
                x = this.collapseX + Math.cos(p.angle) * p.radius * t;
                y = this.collapseY + Math.sin(p.angle) * p.radius * t;
            } else {
                // Orbital shapes
                if (p.orbital === 0) {
                    // s-orbital: spherical
                    x = p.cx + Math.cos(p.angle) * p.radius;
                    y = p.cy + Math.sin(p.angle) * p.radius;
                } else if (p.orbital === 1) {
                    // p-orbital: figure-8
                    const r = p.radius * Math.cos(2 * p.angle);
                    x = p.cx + Math.cos(p.angle) * Math.abs(r);
                    y = p.cy + Math.sin(p.angle) * r;
                } else {
                    // d-orbital: clover
                    const r = p.radius * Math.cos(3 * p.angle) * 0.8;
                    x = p.cx + Math.cos(p.angle) * Math.abs(r);
                    y = p.cy + Math.sin(p.angle) * r;
                }
            }

            const alpha = this.collapsed ? 0.15 + collapseProgress * 0.3 : 0.08;
            ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, TAU);
            ctx.fill();
        }

        // Nucleus glow
        const nucleusX = this.collapsed ? this.collapseX : this.cloudParticles[0]?.cx || 0;
        const nucleusY = this.collapsed ? this.collapseY : this.cloudParticles[0]?.cy || 0;
        const g = ctx.createRadialGradient(nucleusX, nucleusY, 0, nucleusX, nucleusY, 20);
        g.addColorStop(0, `hsla(${this.hue}, 90%, 90%, 0.3)`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(nucleusX, nucleusY, 20, 0, TAU);
        ctx.fill();
    }

    _drawTunneling(ctx, w, h) {
        // Draw barriers
        for (const b of this.barriers) {
            const g = ctx.createLinearGradient(b.x - b.width, 0, b.x + b.width, 0);
            g.addColorStop(0, 'transparent');
            g.addColorStop(0.3, `hsla(${this.hue + 60}, 50%, 50%, ${b.opacity})`);
            g.addColorStop(0.7, `hsla(${this.hue + 60}, 50%, 50%, ${b.opacity})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.fillRect(b.x - b.width * 3, 0, b.width * 6, h);
        }

        // Draw tunnelers
        for (const t of this.tunnelers) {
            const hue = (this.hue + t.hueOffset + 360) % 360;
            // Probability wave halo
            const waveR = t.size * 4 + Math.sin(this.tick * 0.05 + t.phase) * 3;
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 60%, 0.08)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(t.x, t.y, waveR, 0, TAU);
            ctx.stroke();
            // Core
            ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, 75%, 0.4)`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.size, 0, TAU);
            ctx.fill();
        }

        // Afterimages
        for (const ai of this.afterimages) {
            const alpha = (ai.life / ai.maxLife) * 0.3;
            ctx.fillStyle = `hsla(${this.hue + 120}, 80%, 80%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(ai.x, ai.y, ai.size * (1 + (1 - ai.life / ai.maxLife) * 2), 0, TAU);
            ctx.fill();
        }
    }

    _drawWaveFunction(ctx, w, h) {
        const cellSize = Math.max(8, Math.floor(w / this.waveResolution));
        const cols = Math.ceil(w / cellSize);
        const rows = Math.ceil(h / cellSize);

        for (let cx = 0; cx < cols; cx++) {
            for (let cy = 0; cy < rows; cy++) {
                const px = cx * cellSize + cellSize / 2;
                const py = cy * cellSize + cellSize / 2;

                // Sum wave contributions from all nodes
                let realPart = 0, imagPart = 0;
                for (const node of this.waveNodes) {
                    const dx = px - node.x, dy = py - node.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const phase = dist * node.freq - this.tick * node.speed + node.phase;
                    const amplitude = node.amp / (1 + dist * 0.005);
                    realPart += Math.cos(phase) * amplitude;
                    imagPart += Math.sin(phase) * amplitude;
                }

                // Mouse node
                const mdx = px - this._mouseX, mdy = py - this._mouseY;
                const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
                const mPhase = mDist * 0.03 - this.tick * 0.04;
                const mAmp = 0.5 / (1 + mDist * 0.003);
                realPart += Math.cos(mPhase) * mAmp;
                imagPart += Math.sin(mPhase) * mAmp;

                const probability = realPart * realPart + imagPart * imagPart;
                if (probability < 0.02) continue;

                const hue = (this.hue + Math.atan2(imagPart, realPart) * 30 + 360) % 360;
                const alpha = Math.min(0.2, probability * 0.15);
                ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, 60%, ${alpha})`;
                ctx.fillRect(cx * cellSize, cy * cellSize, cellSize, cellSize);
            }
        }
    }

    _drawSpinNetwork(ctx) {
        // Draw ribbons connecting spin nodes
        for (const r of this.ribbons) {
            const a = this.spinNodes[r.a], b = this.spinNodes[r.b];
            if (!a || !b) continue;
            r.twist += r.twistSpeed;

            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 400) continue;

            const steps = Math.max(8, Math.floor(dist / 10));
            const perpX = -dy / dist, perpY = dx / dist;

            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const twist = Math.sin(t * TAU * 2 + r.twist) * 8;
                const x = a.x + dx * t + perpX * twist;
                const y = a.y + dy * t + perpY * twist;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            const alpha = (1 - dist / 400) * 0.12;
            ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 65%, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw spin nodes
        for (const n of this.spinNodes) {
            const dx = this._mouseX - n.x, dy = this._mouseY - n.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const glow = dist < 150 ? (1 - dist / 150) * 0.2 : 0;

            // Rotating spin indicator
            const x1 = n.x + Math.cos(n.angle) * n.size;
            const y1 = n.y + Math.sin(n.angle) * n.size;
            const x2 = n.x - Math.cos(n.angle) * n.size;
            const y2 = n.y - Math.sin(n.angle) * n.size;

            ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 70%, ${0.2 + glow})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
            ctx.stroke();

            // Node core
            ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, 80%, ${0.15 + glow})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, 3, 0, TAU);
            ctx.fill();

            // Spin direction arrow
            const arrowAngle = n.angle + (n.spin > 0 ? Math.PI / 2 : -Math.PI / 2);
            ctx.strokeStyle = `hsla(${this.hue + 90}, 70%, 70%, ${0.15 + glow})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.size * 0.6, arrowAngle - 0.5, arrowAngle + 0.5);
            ctx.stroke();
        }
    }

    _drawDecoherence(ctx) {
        for (const p of this.noiseParticles) {
            const dx = this._mouseX - p.coherentX, dy = this._mouseY - p.coherentY;
            const distToCoherent = Math.sqrt(dx * dx + dy * dy);
            const localCoherence = distToCoherent < 300 ? 1 - distToCoherent / 300 : 0;

            const hue = localCoherence > 0.3
                ? this.hue
                : (this.hue + Math.sin(this.tick * 0.01 + p.phase) * 60 + 360) % 360;
            const sat = localCoherence > 0.3 ? this.saturation : 30;
            const alpha = 0.05 + localCoherence * 0.2;

            ctx.fillStyle = `hsla(${hue}, ${sat}%, 65%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size + localCoherence * 2, 0, TAU);
            ctx.fill();

            // Coherent connections
            if (localCoherence > 0.4) {
                for (const q of this.noiseParticles) {
                    if (q === p) continue;
                    const qdx = p.x - q.x, qdy = p.y - q.y;
                    const qdist = Math.sqrt(qdx * qdx + qdy * qdy);
                    if (qdist < 60) {
                        ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 70%, ${(1 - qdist / 60) * 0.05})`;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
                        ctx.stroke();
                        break; // Only one connection per particle for perf
                    }
                }
            }
        }
    }
}
