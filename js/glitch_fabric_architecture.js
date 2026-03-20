/**
 * @file glitch_fabric_architecture.js
 * @description Woven digital textile architecture with interlocking thread patterns,
 * procedural weave structures, glitch tears, and interactive unraveling.
 * Creates the appearance of a living digital fabric being woven/unwoven.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class GlitchFabricArchitecture extends Architecture {
    constructor() {
        super();
        this.warpThreads = [];
        this.weftThreads = [];
        this.glitchZones = [];
        this.looseThreads = [];
        this.threadPool = [];
        this.weavePattern = 0;
        this.colorScheme = [];
        this.threadSpacing = 0;
        this.wavePhase = 0;
        this.tearZones = [];
        this.shimmerPhase = 0;
    }

    init(system) {
        const rng = system.rng;

        // Seed-driven weave properties
        this.weavePattern = Math.floor(rng() * 5); // 0=plain, 1=twill, 2=satin, 3=herringbone, 4=waffle
        this.threadSpacing = 8 + Math.floor(rng() * 12);
        this.wavePhase = rng() * Math.PI * 2;

        // Color schemes for threads
        const schemes = [
            // Neon circuitry
            [{ h: 180, s: 100, l: 50 }, { h: 300, s: 100, l: 50 }, { h: 60, s: 100, l: 50 }],
            // Dark denim
            [{ h: 220, s: 50, l: 25 }, { h: 210, s: 40, l: 35 }, { h: 230, s: 60, l: 20 }],
            // Golden silk
            [{ h: 40, s: 80, l: 55 }, { h: 30, s: 70, l: 45 }, { h: 50, s: 90, l: 60 }],
            // Blood/shadow
            [{ h: 0, s: 70, l: 30 }, { h: 350, s: 60, l: 20 }, { h: 15, s: 80, l: 40 }],
            // Iridescent
            [{ h: system.hue, s: 80, l: 50 }, { h: (system.hue + 60) % 360, s: 70, l: 45 }, { h: (system.hue + 180) % 360, s: 75, l: 55 }]
        ];
        this.colorScheme = schemes[Math.floor(rng() * schemes.length)];

        // Generate warp (vertical) threads
        this.warpThreads = [];
        const warpCount = Math.ceil(system.width / this.threadSpacing) + 2;
        for (let i = 0; i < warpCount; i++) {
            this.warpThreads.push({
                baseX: i * this.threadSpacing,
                tension: 0.8 + rng() * 0.2,
                phase: rng() * Math.PI * 2,
                speed: 0.005 + rng() * 0.01,
                color: this.colorScheme[Math.floor(rng() * this.colorScheme.length)],
                brightness: 0,
                waveAmp: 1 + rng() * 3,
                breakPoint: -1
            });
        }

        // Generate weft (horizontal) threads
        this.weftThreads = [];
        const weftCount = Math.ceil(system.height / this.threadSpacing) + 2;
        for (let i = 0; i < weftCount; i++) {
            this.weftThreads.push({
                baseY: i * this.threadSpacing,
                tension: 0.8 + rng() * 0.2,
                phase: rng() * Math.PI * 2,
                speed: 0.005 + rng() * 0.01,
                color: this.colorScheme[Math.floor(rng() * this.colorScheme.length)],
                brightness: 0,
                waveAmp: 1 + rng() * 3,
                breakPoint: -1
            });
        }

        this.glitchZones = [];
        this.looseThreads = [];
        this.threadPool = [];
        this.tearZones = [];
    }

    _isOverUnder(warpIdx, weftIdx) {
        switch (this.weavePattern) {
            case 0: return (warpIdx + weftIdx) % 2 === 0; // Plain
            case 1: return (warpIdx + weftIdx * 2) % 4 < 2; // Twill
            case 2: return (warpIdx + weftIdx * 3) % 5 === 0; // Satin
            case 3: { // Herringbone
                const section = Math.floor(weftIdx / 4);
                return section % 2 === 0
                    ? (warpIdx + weftIdx) % 4 < 2
                    : (warpIdx - weftIdx + 100) % 4 < 2;
            }
            case 4: return (warpIdx % 3 === 0) || (weftIdx % 3 === 0); // Waffle
            default: return (warpIdx + weftIdx) % 2 === 0;
        }
    }

    update(system) {
        const tick = system.tick;
        const mx = mouse.x;
        const my = mouse.y;
        this.shimmerPhase += 0.01;

        // Mouse proximity lights up threads
        for (let i = 0; i < this.warpThreads.length; i++) {
            const t = this.warpThreads[i];
            const dx = Math.abs(t.baseX - mx);
            if (dx < 100) {
                t.brightness = Math.min(1, t.brightness + 0.05 * (1 - dx / 100));
            } else {
                t.brightness = Math.max(0, t.brightness - 0.02);
            }
        }
        for (let i = 0; i < this.weftThreads.length; i++) {
            const t = this.weftThreads[i];
            const dy = Math.abs(t.baseY - my);
            if (dy < 100) {
                t.brightness = Math.min(1, t.brightness + 0.05 * (1 - dy / 100));
            } else {
                t.brightness = Math.max(0, t.brightness - 0.02);
            }
        }

        // Shockwave creates glitch zones and loose threads
        system.shockwaves.forEach(sw => {
            if (sw.radius < 30) {
                this.glitchZones.push({
                    x: sw.x, y: sw.y,
                    radius: 0,
                    maxRadius: 100 + system.rng() * 100,
                    speed: 3 + system.rng() * 3,
                    life: 1.0,
                    type: Math.floor(system.rng() * 3) // 0=displace, 1=colorShift, 2=dissolve
                });

                // Spawn loose threads
                for (let i = 0; i < 5; i++) {
                    this._spawnLooseThread(system, sw.x, sw.y);
                }
            }
        });

        // Update glitch zones
        for (let i = this.glitchZones.length - 1; i >= 0; i--) {
            const g = this.glitchZones[i];
            g.radius += g.speed;
            g.life = 1 - (g.radius / g.maxRadius);
            if (g.life <= 0) {
                this.glitchZones[i] = this.glitchZones[this.glitchZones.length - 1];
                this.glitchZones.pop();
            }
        }

        // Gravity well creates tear zone and unravels fabric
        if (system.isGravityWell) {
            // Create or expand tear zone at mouse
            let existingTear = null;
            for (let i = 0; i < this.tearZones.length; i++) {
                const dx = this.tearZones[i].x - mx;
                const dy = this.tearZones[i].y - my;
                if (dx * dx + dy * dy < 2500) {
                    existingTear = this.tearZones[i];
                    break;
                }
            }
            if (existingTear) {
                existingTear.size = Math.min(150, existingTear.size + 0.5);
                existingTear.life = 1.0;
            } else if (this.tearZones.length < 5) {
                this.tearZones.push({ x: mx, y: my, size: 20, life: 1.0 });
            }

            // Spawn loose threads from tear
            if (tick % 4 === 0) {
                this._spawnLooseThread(system, mx + (system.rng() - 0.5) * 40, my + (system.rng() - 0.5) * 40);
            }
        }

        // Decay tear zones
        for (let i = this.tearZones.length - 1; i >= 0; i--) {
            if (!system.isGravityWell || Math.abs(this.tearZones[i].x - mx) > 100) {
                this.tearZones[i].life -= 0.005;
                this.tearZones[i].size = Math.max(0, this.tearZones[i].size - 0.2);
                if (this.tearZones[i].life <= 0 || this.tearZones[i].size <= 0) {
                    this.tearZones.splice(i, 1);
                }
            }
        }

        // Update loose threads
        for (let i = this.looseThreads.length - 1; i >= 0; i--) {
            const lt = this.looseThreads[i];
            lt.life -= lt.decay;

            // Spring physics on segments
            for (let s = 1; s < lt.segments.length; s++) {
                const seg = lt.segments[s];
                const prev = lt.segments[s - 1];
                seg.vy += 0.05; // gravity
                seg.vx += (system.rng() - 0.5) * 0.2;
                const dx = prev.x - seg.x;
                const dy = prev.y - seg.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > lt.segLength) {
                    const pull = (dist - lt.segLength) * 0.1;
                    seg.vx += (dx / dist) * pull;
                    seg.vy += (dy / dist) * pull;
                }
                seg.vx *= 0.95;
                seg.vy *= 0.95;
                seg.x += seg.vx;
                seg.y += seg.vy;
            }

            if (lt.life <= 0) {
                this.threadPool.push(lt);
                this.looseThreads[i] = this.looseThreads[this.looseThreads.length - 1];
                this.looseThreads.pop();
            }
        }
    }

    _spawnLooseThread(system, x, y) {
        if (this.looseThreads.length >= 40) return;
        const rng = system.rng;
        const segCount = 5 + Math.floor(rng() * 8);
        const segments = [];
        let px = x, py = y;
        const angle = rng() * Math.PI * 2;
        for (let i = 0; i < segCount; i++) {
            segments.push({
                x: px, y: py,
                vx: Math.cos(angle) * (1 + rng() * 2) + (rng() - 0.5),
                vy: Math.sin(angle) * (1 + rng() * 2) + (rng() - 0.5)
            });
            px += Math.cos(angle + (rng() - 0.5) * 0.5) * 8;
            py += Math.sin(angle + (rng() - 0.5) * 0.5) * 8;
        }

        const lt = this.threadPool.length > 0 ? this.threadPool.pop() : {};
        lt.segments = segments;
        lt.segLength = 8;
        lt.color = this.colorScheme[Math.floor(rng() * this.colorScheme.length)];
        lt.life = 1.0;
        lt.decay = 0.005 + rng() * 0.01;
        lt.width = 1 + rng() * 1.5;
        this.looseThreads.push(lt);
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const mx = mouse.x;
        const my = mouse.y;

        // Draw the fabric weave
        const sp = this.threadSpacing;
        const warpCount = this.warpThreads.length;
        const weftCount = this.weftThreads.length;

        // Weft threads (horizontal - drawn first for under-pattern)
        for (let wi = 0; wi < weftCount; wi++) {
            const weft = this.weftThreads[wi];
            const baseY = weft.baseY;
            const wave = Math.sin(tick * weft.speed + weft.phase) * weft.waveAmp;
            const { h, s, l } = weft.color;
            const bright = weft.brightness;

            // Check if this thread is in a tear zone
            let inTear = false;
            for (let ti = 0; ti < this.tearZones.length; ti++) {
                const tz = this.tearZones[ti];
                if (Math.abs(baseY - tz.y) < tz.size) {
                    inTear = true;
                    break;
                }
            }
            if (inTear) continue;

            // Check glitch zones for displacement
            let glitchOffset = 0;
            let hueShift = 0;
            for (let gi = 0; gi < this.glitchZones.length; gi++) {
                const g = this.glitchZones[gi];
                const dy = Math.abs(baseY - g.y);
                if (dy < g.radius && dy > g.radius - 30) {
                    const intensity = g.life * (1 - Math.abs(dy - g.radius + 15) / 15);
                    if (g.type === 0) glitchOffset += intensity * 15;
                    else if (g.type === 1) hueShift += intensity * 60;
                }
            }

            ctx.strokeStyle = `hsla(${(h + hueShift) % 360}, ${s}%, ${l + bright * 20}%, ${0.1 + bright * 0.15})`;
            ctx.lineWidth = 1;
            ctx.beginPath();

            for (let x = 0; x <= system.width; x += sp) {
                const warpIdx = Math.floor(x / sp);
                const isOver = this._isOverUnder(warpIdx, wi);

                // Thread weave offset
                const weaveOffset = isOver ? -1.5 : 1.5;
                const shimmer = Math.sin(this.shimmerPhase + x * 0.01 + baseY * 0.01) * 0.5;
                const y = baseY + wave + weaveOffset + glitchOffset + shimmer;

                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Bright thread for higher brightness
            if (bright > 0.3) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = `hsla(${(h + hueShift) % 360}, ${s + 10}%, ${l + 30}%, ${bright * 0.1})`;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            }
        }

        // Warp threads (vertical)
        for (let wi = 0; wi < warpCount; wi++) {
            const warp = this.warpThreads[wi];
            const baseX = warp.baseX;
            const wave = Math.sin(tick * warp.speed + warp.phase) * warp.waveAmp;
            const { h, s, l } = warp.color;
            const bright = warp.brightness;

            let inTear = false;
            for (let ti = 0; ti < this.tearZones.length; ti++) {
                const tz = this.tearZones[ti];
                if (Math.abs(baseX - tz.x) < tz.size) {
                    inTear = true;
                    break;
                }
            }
            if (inTear) continue;

            let glitchOffset = 0;
            let hueShift = 0;
            for (let gi = 0; gi < this.glitchZones.length; gi++) {
                const g = this.glitchZones[gi];
                const dx = Math.abs(baseX - g.x);
                if (dx < g.radius && dx > g.radius - 30) {
                    const intensity = g.life * (1 - Math.abs(dx - g.radius + 15) / 15);
                    if (g.type === 0) glitchOffset += intensity * 15;
                    else if (g.type === 1) hueShift += intensity * 60;
                }
            }

            ctx.strokeStyle = `hsla(${(h + hueShift) % 360}, ${s}%, ${l + bright * 20}%, ${0.1 + bright * 0.15})`;
            ctx.lineWidth = 1;
            ctx.beginPath();

            for (let y = 0; y <= system.height; y += sp) {
                const weftIdx = Math.floor(y / sp);
                const isOver = this._isOverUnder(wi, weftIdx);
                const weaveOffset = isOver ? -1.5 : 1.5;
                const shimmer = Math.sin(this.shimmerPhase + baseX * 0.01 + y * 0.01) * 0.5;
                const x = baseX + wave + weaveOffset + glitchOffset + shimmer;

                if (y === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            if (bright > 0.3) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = `hsla(${(h + hueShift) % 360}, ${s + 10}%, ${l + 30}%, ${bright * 0.1})`;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            }
        }

        // Draw intersection highlights (crossover points near mouse)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let wi = 0; wi < warpCount; wi++) {
            const warp = this.warpThreads[wi];
            if (warp.brightness < 0.1) continue;
            for (let wfi = 0; wfi < weftCount; wfi++) {
                const weft = this.weftThreads[wfi];
                if (weft.brightness < 0.1) continue;
                const ix = warp.baseX;
                const iy = weft.baseY;
                const dx = ix - mx;
                const dy = iy - my;
                if (dx * dx + dy * dy < 6400) {
                    const isOver = this._isOverUnder(wi, wfi);
                    const alpha = Math.min(warp.brightness, weft.brightness) * 0.2;
                    const color = isOver ? warp.color : weft.color;
                    ctx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l + 25}%, ${alpha})`;
                    ctx.fillRect(ix - 2, iy - 2, 4, 4);
                }
            }
        }
        ctx.restore();

        // Draw tear zone void
        for (let i = 0; i < this.tearZones.length; i++) {
            const tz = this.tearZones[i];
            // Dark void where fabric is torn
            const grad = ctx.createRadialGradient(tz.x, tz.y, 0, tz.x, tz.y, tz.size);
            grad.addColorStop(0, `rgba(0, 0, 0, ${tz.life * 0.3})`);
            grad.addColorStop(0.7, `rgba(0, 0, 0, ${tz.life * 0.1})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(tz.x, tz.y, tz.size, 0, Math.PI * 2);
            ctx.fill();

            // Edge fraying glow
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const edgeGrad = ctx.createRadialGradient(tz.x, tz.y, tz.size * 0.8, tz.x, tz.y, tz.size);
            const edgeColor = this.colorScheme[0];
            edgeGrad.addColorStop(0, 'transparent');
            edgeGrad.addColorStop(0.5, `hsla(${edgeColor.h}, ${edgeColor.s}%, ${edgeColor.l}%, ${tz.life * 0.15})`);
            edgeGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = edgeGrad;
            ctx.beginPath();
            ctx.arc(tz.x, tz.y, tz.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw loose threads
        for (let i = 0; i < this.looseThreads.length; i++) {
            const lt = this.looseThreads[i];
            const { h, s, l } = lt.color;

            ctx.strokeStyle = `hsla(${h}, ${s}%, ${l + 10}%, ${lt.life * 0.4})`;
            ctx.lineWidth = lt.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(lt.segments[0].x, lt.segments[0].y);
            for (let si = 1; si < lt.segments.length; si++) {
                ctx.lineTo(lt.segments[si].x, lt.segments[si].y);
            }
            ctx.stroke();

            // Glowing tip
            if (lt.segments.length > 0) {
                const tip = lt.segments[lt.segments.length - 1];
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = `hsla(${h}, ${s}%, ${l + 20}%, ${lt.life * 0.3})`;
                ctx.beginPath();
                ctx.arc(tip.x, tip.y, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Glitch zone visual effects
        for (let i = 0; i < this.glitchZones.length; i++) {
            const g = this.glitchZones[i];
            if (g.type === 2) {
                // Dissolve: translucent ring
                ctx.strokeStyle = `rgba(255, 255, 255, ${g.life * 0.1})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 8]);
                ctx.beginPath();
                ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }
}
