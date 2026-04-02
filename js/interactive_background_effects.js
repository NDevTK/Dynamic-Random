/**
 * @file interactive_background_effects.js
 * @description Orchestrator for the interactive effects layer that runs on top of all
 * background architectures. Integrates four sub-systems (ReactiveGrid,
 * DimensionalEchoes, ParticleSwarm, MoodAtmosphere) plus the original
 * interactive effects (ripples, mouse trail, gravity field, heat map,
 * echo ghosts, constellation links).
 *
 * Each universe seed selects a unique combination of sub-systems and their
 * internal modes, producing dramatically different interactive behaviors.
 * Performance is managed via quality scaling from the perf monitor.
 */

import { mouse, isLeftMouseDown, isRightMouseDown } from './state.js';
import { ReactiveGrid } from './reactive_grid_effects.js';
import { DimensionalEchoes } from './dimensional_echoes.js';
import { ParticleSwarm } from './particle_swarm_effects.js';
import { MoodAtmosphere } from './mood_atmosphere.js';
import { GravitationalLens } from './gravitational_lens_effects.js';
import { SonicBloom } from './sonic_bloom_effects.js';
import { PixelAlchemy } from './pixel_alchemy_effects.js';
import { PhantomCursor } from './phantom_cursor_effects.js';
import { HarmonicResonance } from './harmonic_resonance_effects.js';
import { LivingInk } from './living_ink_effects.js';
import { QuantumWeb } from './quantum_web_effects.js';
import { TimeCrystal } from './time_crystal_effects.js';
import { BioluminescentTide } from './bioluminescent_tide_effects.js';
import { FractalLightning } from './fractal_lightning_effects.js';
import { GravityMarbles } from './gravity_marble_effects.js';

class InteractiveBackgroundEffects {
    constructor() {
        this.initialized = false;
        this.tick = 0;

        // Sub-systems
        this.grid = new ReactiveGrid();
        this.echoes = new DimensionalEchoes();
        this.swarm = new ParticleSwarm();
        this.atmosphere = new MoodAtmosphere();
        this.lens = new GravitationalLens();
        this.bloom = new SonicBloom();
        this.alchemy = new PixelAlchemy();
        this.phantom = new PhantomCursor();
        this.harmonics = new HarmonicResonance();
        this.ink = new LivingInk();
        this.quantum = new QuantumWeb();
        this.crystal = new TimeCrystal();
        this.biolume = new BioluminescentTide();
        this.lightning = new FractalLightning();
        this.marbles = new GravityMarbles();

        // Sub-system enable flags (set by seed)
        this.hasGrid = false;
        this.hasEchoes = false;
        this.hasSwarm = false;
        this.hasAtmosphere = false;
        this.hasLens = false;
        this.hasBloom = false;
        this.hasAlchemy = false;
        this.hasPhantom = false;
        this.hasHarmonics = false;
        this.hasInk = false;
        this.hasQuantum = false;
        this.hasCrystal = false;
        this.hasBiolume = false;
        this.hasLightning = false;
        this.hasMarbles = false;

        // Original effect toggles
        this.hasRipples = false;
        this.hasMouseTrail = false;
        this.hasGravityField = false;
        this.hasHeatMap = false;
        this.hasEchoGhosts = false;
        this.hasConstellationLinks = false;

        // Ripples
        this.ripples = [];
        this.ripplePool = [];
        this.maxRipples = 12;

        // Mouse trail
        this.trailPoints = [];
        this.maxTrailPoints = 40;
        this.trailHue = 0;
        this.trailWidth = 2;
        this.trailStyle = 0;

        // Gravity field
        this.fieldLines = [];
        this.fieldStrength = 0;
        this.fieldHue = 0;

        // Heat map - optimized with dirty tracking
        this.heatGrid = null;
        this.heatCols = 0;
        this.heatRows = 0;
        this.heatCellSize = 40;
        this.heatDecay = 0.995;
        this.heatHue = 0;
        this._heatDirtyCells = new Set();

        // Echo ghosts
        this.ghosts = [];
        this.ghostPool = [];
        this.maxGhosts = 15;
        this.ghostStyle = 0; // Base style, individual ghosts get varied styles

        // Constellation links
        this.constellationPoints = [];
        this.maxConstellationPoints = 20;
        this.constellationHue = 0;

        // Click tracking
        this._lastClickX = 0;
        this._lastClickY = 0;
        this._clickRegistered = false;

        // Quality scaling
        this._qualityScale = 1;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

        window.addEventListener('click', (e) => {
            this._lastClickX = e.clientX;
            this._lastClickY = e.clientY;
            this._clickRegistered = true;
        });
    }

    /**
     * Extract hue values from palette for sub-system configuration.
     * Palette is { primary: string[], accent: string[], glow: string[], bg: string }.
     * Colors are hsla() strings.
     */
    _extractHues(palette) {
        const hues = [];
        const parse = (str) => {
            if (!str) return null;
            const m = str.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)/);
            return m ? { h: parseInt(m[1], 10), s: parseInt(m[2], 10), l: parseInt(m[3], 10) } : null;
        };
        if (palette && palette.primary) {
            for (const c of palette.primary) {
                const parsed = parse(c);
                if (parsed) hues.push(parsed);
            }
        }
        if (palette && palette.accent) {
            for (const c of palette.accent) {
                const parsed = parse(c);
                if (parsed) hues.push(parsed);
            }
        }
        return hues;
    }

    /**
     * Configure effects based on seeded RNG and palette.
     * Each seed enables 2-4 sub-systems plus 1-3 original effects.
     */
    configure(rng, palette) {
        this.tick = 0;
        this.ripples = [];
        this.trailPoints = [];
        this.ghosts = [];
        this.constellationPoints = [];
        this._heatDirtyCells.clear();

        // Normalize palette into array of {h} objects for sub-systems
        const hues = this._extractHues(palette);

        // --- Enable sub-systems based on seed ---
        // Pick 5-8 sub-systems from 15 available using a shuffle to guarantee diversity
        const subsystems = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
        // Fisher-Yates shuffle with seeded rng
        for (let i = subsystems.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [subsystems[i], subsystems[j]] = [subsystems[j], subsystems[i]];
        }
        const enableCount = 5 + Math.floor(rng() * 4); // 5, 6, 7, or 8
        const enabledSet = new Set(subsystems.slice(0, enableCount));
        this.hasGrid = enabledSet.has(0);
        this.hasEchoes = enabledSet.has(1);
        this.hasSwarm = enabledSet.has(2);
        this.hasAtmosphere = enabledSet.has(3);
        this.hasLens = enabledSet.has(4);
        this.hasBloom = enabledSet.has(5);
        this.hasAlchemy = enabledSet.has(6);
        this.hasPhantom = enabledSet.has(7);
        this.hasHarmonics = enabledSet.has(8);
        this.hasInk = enabledSet.has(9);
        this.hasQuantum = enabledSet.has(10);
        this.hasCrystal = enabledSet.has(11);
        this.hasBiolume = enabledSet.has(12);
        this.hasLightning = enabledSet.has(13);
        this.hasMarbles = enabledSet.has(14);

        // Configure enabled sub-systems with normalized hue array
        if (this.hasGrid) this.grid.configure(rng, hues);
        if (this.hasEchoes) this.echoes.configure(rng, hues);
        if (this.hasSwarm) this.swarm.configure(rng, hues);
        if (this.hasAtmosphere) this.atmosphere.configure(rng, hues);
        if (this.hasLens) this.lens.configure(rng, hues);
        if (this.hasBloom) this.bloom.configure(rng, hues);
        if (this.hasAlchemy) this.alchemy.configure(rng, hues);
        if (this.hasPhantom) this.phantom.configure(rng, hues);
        if (this.hasHarmonics) this.harmonics.configure(rng, hues);
        if (this.hasInk) this.ink.configure(rng, hues);
        if (this.hasQuantum) this.quantum.configure(rng, hues);
        if (this.hasCrystal) this.crystal.configure(rng, hues);
        if (this.hasBiolume) this.biolume.configure(rng, hues);
        if (this.hasLightning) this.lightning.configure(rng, hues);
        if (this.hasMarbles) this.marbles.configure(rng, hues);

        // --- Original effects (1-3 active) ---
        this.hasRipples = rng() > 0.35;
        this.hasMouseTrail = rng() > 0.5;
        this.hasGravityField = rng() > 0.75;
        this.hasHeatMap = rng() > 0.7;
        this.hasEchoGhosts = rng() > 0.55;
        this.hasConstellationLinks = rng() > 0.65;

        // Parameterize original effects
        this.trailHue = hues.length > 0 ? hues[0].h : 200;
        this.trailWidth = 1 + rng() * 4;
        this.trailStyle = Math.floor(rng() * 4);
        this.fieldStrength = 0.5 + rng() * 1.5;
        this.fieldHue = hues.length > 1 ? hues[1].h : 120;
        this.heatHue = hues.length > 2 ? hues[2].h : 0;
        this.heatDecay = 0.992 + rng() * 0.006;
        this.ghostStyle = Math.floor(rng() * 3);
        this.constellationHue = hues.length > 0 ? hues[0].h : 60;

        this.rippleColor = `hsla(${this.trailHue}, 70%, 60%,`;
        this.rippleSpeed = 3 + rng() * 5;
        this.rippleMaxRadius = 80 + rng() * 120;

        // Initialize heat grid
        this.heatCols = Math.ceil(window.innerWidth / this.heatCellSize);
        this.heatRows = Math.ceil(window.innerHeight / this.heatCellSize);
        this.heatGrid = new Float32Array(this.heatCols * this.heatRows);

        // Generate gravity field lines
        if (this.hasGravityField) {
            this.fieldLines = [];
            const lineCount = 6 + Math.floor(rng() * 10);
            for (let i = 0; i < lineCount; i++) {
                this.fieldLines.push({
                    angle: (i / lineCount) * Math.PI * 2,
                    length: 50 + rng() * 150,
                    width: 0.5 + rng() * 1.5,
                    phase: rng() * Math.PI * 2,
                    speed: 0.02 + rng() * 0.04,
                });
            }
        }
    }

    /**
     * Update all active interactive effects. Called each frame from background.animate().
     */
    update(system) {
        this.tick++;
        this._qualityScale = system.qualityScale || 1;
        const mx = mouse.x;
        const my = mouse.y;
        const isClicking = isLeftMouseDown || isRightMouseDown;

        // Track mouse speed for velocity-responsive effects
        const dx = mx - (this._prevMx || mx);
        const dy = my - (this._prevMy || my);
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._prevMx = mx;
        this._prevMy = my;

        // Handle clicks
        if (this._clickRegistered) {
            this._clickRegistered = false;

            if (this.hasRipples && this.ripples.length < this.maxRipples) {
                const ripple = this.ripplePool.length > 0 ? this.ripplePool.pop() : {};
                ripple.x = this._lastClickX;
                ripple.y = this._lastClickY;
                ripple.radius = 0;
                ripple.alpha = 0.6;
                ripple.hue = (this.trailHue + Math.random() * 60 - 30 + 360) % 360;
                this.ripples.push(ripple);
            }

            if (this.hasConstellationLinks) {
                this.constellationPoints.push({
                    x: this._lastClickX,
                    y: this._lastClickY,
                    life: 300,
                    alpha: 0.5,
                });
                if (this.constellationPoints.length > this.maxConstellationPoints) {
                    // Swap-and-pop first element (O(1) vs shift's O(n))
                    this.constellationPoints[0] = this.constellationPoints[this.constellationPoints.length - 1];
                    this.constellationPoints.pop();
                }
            }
        }

        // Update ripples
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.radius += this.rippleSpeed;
            r.alpha = Math.max(0, 1 - r.radius / this.rippleMaxRadius) * 0.4;
            if (r.radius > this.rippleMaxRadius) {
                this.ripplePool.push(r);
                this.ripples[i] = this.ripples[this.ripples.length - 1];
                this.ripples.pop();
            }
        }

        // Mouse trail with click burst
        if (this.hasMouseTrail) {
            this.trailPoints.push({ x: mx, y: my, tick: this.tick });
            // Click spawns radial burst of trail points
            if (this._clickRegistered) {
                const burstCount = 6;
                for (let i = 0; i < burstCount; i++) {
                    const angle = (i / burstCount) * Math.PI * 2;
                    this.trailPoints.push({
                        x: mx + Math.cos(angle) * 20,
                        y: my + Math.sin(angle) * 20,
                        tick: this.tick,
                    });
                }
            }
            // Trim excess with slice instead of repeated shift() to avoid O(n^2) churn
            if (this.trailPoints.length > this.maxTrailPoints + 10) {
                this.trailPoints = this.trailPoints.slice(-this.maxTrailPoints);
            }
        }

        // Heat map - optimized: only update dirty cells, batch decay
        if (this.hasHeatMap && this.heatGrid) {
            const hx = Math.floor(mx / this.heatCellSize);
            const hy = Math.floor(my / this.heatCellSize);
            if (hx >= 0 && hx < this.heatCols && hy >= 0 && hy < this.heatRows) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = hx + dx;
                        const ny = hy + dy;
                        if (nx >= 0 && nx < this.heatCols && ny >= 0 && ny < this.heatRows) {
                            const idx = ny * this.heatCols + nx;
                            const dist = Math.abs(dx) + Math.abs(dy);
                            this.heatGrid[idx] = Math.min(1,
                                this.heatGrid[idx] + (dist === 0 ? 0.05 : 0.02));
                            this._heatDirtyCells.add(idx);
                        }
                    }
                }
            }
            // Decay only dirty cells instead of entire grid
            if (this.tick % 2 === 0) {
                const toRemove = [];
                for (const idx of this._heatDirtyCells) {
                    this.heatGrid[idx] *= this.heatDecay;
                    if (this.heatGrid[idx] < 0.005) {
                        this.heatGrid[idx] = 0;
                        toRemove.push(idx);
                    }
                }
                for (const idx of toRemove) {
                    this._heatDirtyCells.delete(idx);
                }
            }
        }

        // Echo ghosts
        // Echo ghosts - spawn rate scales with cursor speed
        const ghostInterval = Math.max(2, 6 - Math.floor(this._mouseSpeed || 0));
        if (this.hasEchoGhosts && this.tick % ghostInterval === 0 && this.ghosts.length < this.maxGhosts) {
            const ghost = this.ghostPool.length > 0 ? this.ghostPool.pop() : {};
            ghost.x = mx;
            ghost.y = my;
            ghost.life = 30;
            ghost.maxLife = 30;
            ghost.size = 8 + Math.random() * 12;
            ghost.style = Math.floor(Math.random() * 3); // Per-ghost style variety
            ghost.hueOffset = Math.random() * 40 - 20; // Per-ghost color
            this.ghosts.push(ghost);
        }

        for (let i = this.ghosts.length - 1; i >= 0; i--) {
            this.ghosts[i].life--;
            if (this.ghosts[i].life <= 0) {
                this.ghostPool.push(this.ghosts[i]);
                this.ghosts[i] = this.ghosts[this.ghosts.length - 1];
                this.ghosts.pop();
            }
        }

        // Constellation lifetimes (swap-and-pop instead of splice for O(1) removal)
        for (let i = this.constellationPoints.length - 1; i >= 0; i--) {
            const cp = this.constellationPoints[i];
            cp.life--;
            cp.alpha = Math.min(0.5, cp.life / 100);
            if (cp.life <= 0) {
                this.constellationPoints[i] = this.constellationPoints[this.constellationPoints.length - 1];
                this.constellationPoints.pop();
            }
        }

        // Update sub-systems (skip at very low quality, use same thresholds as draw)
        const q = this._qualityScale;
        if (this.hasAtmosphere && q > 0.25) this.atmosphere.update(mx, my, isClicking);
        if (this.hasGrid && q > 0.25) this.grid.update(mx, my, isClicking, q);
        if (this.hasEchoes && q > 0.3) this.echoes.update(mx, my, isClicking);
        if (this.hasSwarm && q > 0.3) this.swarm.update(mx, my, isClicking);
        if (this.hasLens && q > 0.25) this.lens.update(mx, my, isClicking);
        if (this.hasBloom && q > 0.3) this.bloom.update(mx, my, isClicking);
        if (this.hasAlchemy && q > 0.3) this.alchemy.update(mx, my, isClicking);
        if (this.hasPhantom && q > 0.3) this.phantom.update(mx, my, isClicking);
        if (this.hasHarmonics && q > 0.25) this.harmonics.update(mx, my, isClicking);
        if (this.hasInk && q > 0.3) this.ink.update(mx, my, isClicking);
        if (this.hasQuantum && q > 0.25) this.quantum.update(mx, my, isClicking);
        if (this.hasCrystal && q > 0.3) this.crystal.update(mx, my, isClicking);
        if (this.hasBiolume && q > 0.3) this.biolume.update(mx, my, isClicking);
        if (this.hasLightning && q > 0.3) this.lightning.update(mx, my, isClicking);
        if (this.hasMarbles && q > 0.25) this.marbles.update(mx, my, isClicking);
    }

    /**
     * Draw all active interactive effects onto the background canvas.
     */
    draw(ctx, system) {
        if (!this.initialized) return;

        const w = system.width;
        const h = system.height;
        const q = this._qualityScale;

        // Draw sub-systems (mood atmosphere first as it's usually a background-level effect)
        if (this.hasAtmosphere && q > 0.25) this.atmosphere.draw(ctx, system);
        if (this.hasHarmonics && q > 0.25) this.harmonics.draw(ctx, system);
        if (this.hasBiolume && q > 0.3) this.biolume.draw(ctx, system);
        if (this.hasAlchemy && q > 0.3) this.alchemy.draw(ctx, system);
        if (this.hasInk && q > 0.3) this.ink.draw(ctx, system);
        if (this.hasQuantum && q > 0.25) this.quantum.draw(ctx, system);
        if (this.hasGrid && q > 0.25) this.grid.draw(ctx, system);
        if (this.hasEchoes && q > 0.3) this.echoes.draw(ctx, system);
        if (this.hasCrystal && q > 0.3) this.crystal.draw(ctx, system);
        if (this.hasLens && q > 0.25) this.lens.draw(ctx, system);
        if (this.hasSwarm && q > 0.3) this.swarm.draw(ctx, system);
        if (this.hasBloom && q > 0.3) this.bloom.draw(ctx, system);
        if (this.hasLightning && q > 0.3) this.lightning.draw(ctx, system);
        if (this.hasMarbles && q > 0.25) this.marbles.draw(ctx, system);
        if (this.hasPhantom && q > 0.3) this.phantom.draw(ctx, system);

        // --- Original effects below ---

        // Heat map
        if (this.hasHeatMap && this.heatGrid && this._heatDirtyCells.size > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            // Only draw dirty cells instead of scanning entire grid
            for (const idx of this._heatDirtyCells) {
                const heat = this.heatGrid[idx];
                if (heat < 0.01) continue;
                const x = (idx % this.heatCols);
                const y = Math.floor(idx / this.heatCols);
                const alpha = heat * 0.15;
                const lightness = 40 + heat * 30;
                ctx.fillStyle = `hsla(${this.heatHue + heat * 60}, 80%, ${lightness}%, ${alpha})`;
                ctx.fillRect(x * this.heatCellSize, y * this.heatCellSize,
                    this.heatCellSize, this.heatCellSize);
            }
            ctx.restore();
        }

        // Gravity field lines
        if (this.hasGravityField) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const mx = mouse.x;
            const my = mouse.y;
            for (const line of this.fieldLines) {
                const a = line.angle + Math.sin(this.tick * line.speed + line.phase) * 0.3;
                const len = line.length + Math.sin(this.tick * 0.02 + line.phase) * 20;

                const x1 = mx + Math.cos(a) * 15;
                const y1 = my + Math.sin(a) * 15;
                const x2 = mx + Math.cos(a) * len;
                const y2 = my + Math.sin(a) * len;

                const grad = ctx.createLinearGradient(x1, y1, x2, y2);
                grad.addColorStop(0, `hsla(${this.fieldHue}, 60%, 60%, 0.2)`);
                grad.addColorStop(1, 'transparent');
                ctx.strokeStyle = grad;
                ctx.lineWidth = line.width;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Echo ghosts with per-ghost style variety
        if (this.hasEchoGhosts) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (const ghost of this.ghosts) {
                const alpha = (ghost.life / ghost.maxLife) * 0.2;
                const size = ghost.size * (1 - ghost.life / ghost.maxLife) + ghost.size * 0.5;
                const ghostHue = (this.trailHue + (ghost.hueOffset || 0) + 360) % 360;
                ctx.strokeStyle = `hsla(${ghostHue}, 50%, 60%, ${alpha})`;
                ctx.lineWidth = 1;

                const style = ghost.style !== undefined ? ghost.style : this.ghostStyle;
                if (style === 0) {
                    ctx.beginPath();
                    ctx.arc(ghost.x, ghost.y, size, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (style === 1) {
                    ctx.beginPath();
                    ctx.arc(ghost.x, ghost.y, size, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(ghost.x, ghost.y, size * 0.5, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(ghost.x - size, ghost.y);
                    ctx.lineTo(ghost.x + size, ghost.y);
                    ctx.moveTo(ghost.x, ghost.y - size);
                    ctx.lineTo(ghost.x, ghost.y + size);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        // Mouse trail ribbon
        if (this.hasMouseTrail && this.trailPoints.length > 2) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineWidth = this.trailWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (this.trailStyle === 3) {
                for (let i = 1; i < this.trailPoints.length; i++) {
                    const alpha = i / this.trailPoints.length;
                    const hue = (this.trailHue + i * 8) % 360;
                    ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${alpha * 0.3})`;
                    ctx.beginPath();
                    ctx.moveTo(this.trailPoints[i - 1].x, this.trailPoints[i - 1].y);
                    ctx.lineTo(this.trailPoints[i].x, this.trailPoints[i].y);
                    ctx.stroke();
                }
            } else if (this.trailStyle === 1) {
                for (let i = 0; i < this.trailPoints.length; i += 2) {
                    const alpha = i / this.trailPoints.length;
                    ctx.fillStyle = `hsla(${this.trailHue}, 60%, 60%, ${alpha * 0.3})`;
                    ctx.beginPath();
                    ctx.arc(this.trailPoints[i].x, this.trailPoints[i].y, this.trailWidth, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                ctx.beginPath();
                ctx.moveTo(this.trailPoints[0].x, this.trailPoints[0].y);
                for (let i = 1; i < this.trailPoints.length; i++) {
                    ctx.lineTo(this.trailPoints[i].x, this.trailPoints[i].y);
                }
                ctx.strokeStyle = `hsla(${this.trailHue}, 60%, 60%, 0.25)`;
                ctx.stroke();
            }
            ctx.restore();
        }

        // Click ripples with per-ripple color variety
        if (this.hasRipples) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineWidth = 1.5;
            for (const r of this.ripples) {
                const rHue = r.hue !== undefined ? r.hue : this.trailHue;
                ctx.strokeStyle = `hsla(${rHue}, 70%, 60%, ${r.alpha})`;
                ctx.beginPath();
                ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
                ctx.stroke();
                if (r.radius > 10) {
                    ctx.strokeStyle = `hsla(${rHue}, 70%, 60%, ${r.alpha * 0.5})`;
                    ctx.beginPath();
                    ctx.arc(r.x, r.y, r.radius * 0.6, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        // Constellation links with glow on recent points
        if (this.hasConstellationLinks && this.constellationPoints.length > 1) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineWidth = 0.5;

            for (let i = 0; i < this.constellationPoints.length; i++) {
                const p1 = this.constellationPoints[i];
                for (let j = i + 1; j < this.constellationPoints.length; j++) {
                    const p2 = this.constellationPoints[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 90000) {
                        const dist = Math.sqrt(distSq);
                        const alpha = Math.min(p1.alpha, p2.alpha) * (1 - dist / 300) * 0.3;
                        ctx.strokeStyle = `hsla(${this.constellationHue}, 50%, 70%, ${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
                // Star dot with glow for new points
                const freshness = p1.life > 250 ? (p1.life - 250) / 50 : 0;
                const dotAlpha = p1.alpha * 0.6;
                if (freshness > 0) {
                    // Fresh star glow
                    ctx.fillStyle = `hsla(${this.constellationHue}, 80%, 85%, ${dotAlpha * freshness * 0.5})`;
                    ctx.beginPath();
                    ctx.arc(p1.x, p1.y, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = `hsla(${this.constellationHue}, 60%, 80%, ${dotAlpha})`;
                ctx.beginPath();
                ctx.arc(p1.x, p1.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }
}

export const interactiveEffects = new InteractiveBackgroundEffects();
