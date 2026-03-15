/**
 * @file organic_architecture.js
 * @description Defines the Organic architecture with pulsing tendrils, cells,
 * nutrient flow, cell division, pheromone trails, seed-driven biomes,
 * symbiotic connections, toxin response, and bioluminescent waves.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

// ── Biome definitions keyed by index (derived from seed) ──
const BIOMES = [
    {
        name: 'coral_reef',
        nodeHueSpread: 80, cellHueSpread: 50,
        baseSaturation: 70, baseLightness: 45,
        tendrilWidth: 5, tendrilAlpha: 0.4,
        cellSpeed: 1.2, cellElongation: 0.6,
        nutrientSpeed: 1.5, nutrientSize: 2.5,
        sporeRate: 6, glowIntensity: 0.7,
        branchiness: 0.8,
        palette: [0, 30, 330, 15, 345], // warm pinks, oranges
    },
    {
        name: 'mycelium',
        nodeHueSpread: 30, cellHueSpread: 20,
        baseSaturation: 30, baseLightness: 35,
        tendrilWidth: 2, tendrilAlpha: 0.5,
        cellSpeed: 0.6, cellElongation: 0.85,
        nutrientSpeed: 0.8, nutrientSize: 1.5,
        sporeRate: 4, glowIntensity: 0.3,
        branchiness: 1.2,
        palette: [40, 60, 30, 50, 45], // earthy browns/tans
    },
    {
        name: 'neural_tissue',
        nodeHueSpread: 40, cellHueSpread: 30,
        baseSaturation: 50, baseLightness: 50,
        tendrilWidth: 1.5, tendrilAlpha: 0.3,
        cellSpeed: 0.4, cellElongation: 0.9,
        nutrientSpeed: 2.5, nutrientSize: 1.2,
        sporeRate: 10, glowIntensity: 0.9,
        branchiness: 0.6,
        palette: [220, 260, 200, 240, 210], // cool blues/purples
    },
    {
        name: 'plant_roots',
        nodeHueSpread: 50, cellHueSpread: 40,
        baseSaturation: 55, baseLightness: 38,
        tendrilWidth: 4, tendrilAlpha: 0.45,
        cellSpeed: 0.8, cellElongation: 0.75,
        nutrientSpeed: 1.0, nutrientSize: 2.0,
        sporeRate: 5, glowIntensity: 0.4,
        branchiness: 1.0,
        palette: [100, 130, 80, 120, 90], // greens
    },
    {
        name: 'blood_vessels',
        nodeHueSpread: 20, cellHueSpread: 15,
        baseSaturation: 80, baseLightness: 35,
        tendrilWidth: 3, tendrilAlpha: 0.5,
        cellSpeed: 1.8, cellElongation: 0.5,
        nutrientSpeed: 3.0, nutrientSize: 2.0,
        sporeRate: 8, glowIntensity: 0.6,
        branchiness: 0.5,
        palette: [0, 350, 10, 355, 5], // deep reds
    },
];

// ── Caps for performance ──
const MAX_SPORES = 120;
const MAX_NUTRIENTS = 200;
const MAX_CELLS = 80;
const MAX_PHEROMONE_POINTS = 60;
const MAX_TENDRILS_TO_CURSOR = 5;
const TENDRIL_REACH_DIST = 250;
const TENDRIL_CONNECT_DIST_SQ = 70000; // ~265px between nodes
const SYMBIOTIC_DIST = 50;
const SYMBIOTIC_DIST_SQ = SYMBIOTIC_DIST * SYMBIOTIC_DIST;
const DIVISION_RADIUS = 180;
const BIOLUM_PERIOD = 240; // ticks per full wave cycle
const TOXIN_ZONE_RADIUS = 200;
const TOXIN_FLEE_FORCE = 6;

export class OrganicArchitecture extends Architecture {
    constructor() {
        super();
        this.nodes = [];
        this.cells = [];
        this.spores = [];
        this.sporePool = [];
        this.nutrients = [];
        this.nutrientPool = [];
        this.tendrilEdges = []; // cached node-node edges
        this.pheromoneTrail = [];
        this.biome = BIOMES[0];
        this.biolumWaveOrigin = 0; // node index wave starts from
        this.biolumTimer = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.toxinZones = []; // from shockwaves
    }

    init(system) {
        // ── Determine biome from seed ──
        // Use first few rng calls to pick biome index deterministically
        const biomeIndex = Math.floor(system.rng() * BIOMES.length);
        this.biome = BIOMES[biomeIndex];
        const biome = this.biome;

        // ── Nodes ──
        this.nodes = [];
        const nodeCount = 28;
        for (let i = 0; i < nodeCount; i++) {
            const paletteHue = biome.palette[Math.floor(system.rng() * biome.palette.length)];
            this.nodes.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                radius: system.rng() * 40 + 20,
                pulseOffset: system.rng() * Math.PI * 2,
                hue: system.hue + paletteHue + (system.rng() - 0.5) * biome.nodeHueSpread,
                glowBoost: 0,
                biolumBright: 0, // for bioluminescent wave
                tendrilReach: 0, // 0..1 extension toward cursor
            });
        }

        // ── Pre-compute tendril edges (node-node) ──
        this._rebuildTendrilEdges(system);

        // ── Cells ──
        this.cells = [];
        const cellCount = 45;
        for (let i = 0; i < cellCount; i++) {
            this.cells.push(this._createCell(
                system.rng() * system.width,
                system.rng() * system.height,
                system.rng() * 12 + 6,
                system, false
            ));
        }

        // ── Pools ──
        this.spores = [];
        this.sporePool = [];
        this.nutrients = [];
        this.nutrientPool = [];
        this.pheromoneTrail = [];
        this.toxinZones = [];
        this.biolumTimer = 0;
        this.biolumWaveOrigin = Math.floor(system.rng() * nodeCount);
        this.lastMouseX = 0;
        this.lastMouseY = 0;
    }

    // ── Cell factory ──
    _createCell(x, y, radius, system, isDivisionChild) {
        const biome = this.biome;
        const paletteHue = biome.palette[Math.floor(system.rng() * biome.palette.length)];
        return {
            x, y,
            vx: (system.rng() - 0.5) * 2 * biome.cellSpeed,
            vy: (system.rng() - 0.5) * 2 * biome.cellSpeed,
            radius,
            hue: system.hue + paletteHue + (system.rng() - 0.5) * biome.cellHueSpread,
            noiseOffset: system.rng() * 1000,
            divisionAnim: isDivisionChild ? 1.0 : 0, // 1 -> 0 animation
            panic: 0, // toxin panic intensity
        };
    }

    // ── Tendril edge cache ──
    _rebuildTendrilEdges(system) {
        this.tendrilEdges = [];
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const n1 = this.nodes[i];
                const n2 = this.nodes[j];
                const dx = n1.x - n2.x;
                const dy = n1.y - n2.y;
                if (dx * dx + dy * dy < TENDRIL_CONNECT_DIST_SQ) {
                    this.tendrilEdges.push({ a: i, b: j });
                }
            }
        }
    }

    // ── Object pools ──
    _allocSpore() {
        return this.sporePool.length > 0
            ? this.sporePool.pop()
            : { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, radius: 0, hue: 0 };
    }
    _freeSpore(spore) { this.sporePool.push(spore); }

    _allocNutrient() {
        return this.nutrientPool.length > 0
            ? this.nutrientPool.pop()
            : { x: 0, y: 0, edgeIdx: 0, progress: 0, speed: 0, radius: 0, hue: 0, life: 0, maxLife: 0 };
    }
    _freeNutrient(n) { this.nutrientPool.push(n); }

    // ──────────────────────── UPDATE ────────────────────────
    update(system) {
        const mx = mouse.x;
        const my = mouse.y;
        const biome = this.biome;
        const tick = system.tick;

        // ── Pheromone trail from mouse movement ──
        const mouseDx = mx - this.lastMouseX;
        const mouseDy = my - this.lastMouseY;
        const mouseSpeed = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);
        if (mouseSpeed > 3 && this.pheromoneTrail.length < MAX_PHEROMONE_POINTS) {
            this.pheromoneTrail.push({ x: mx, y: my, life: 1.0 });
        }
        this.lastMouseX = mx;
        this.lastMouseY = my;

        // Fade pheromone trail
        for (let i = this.pheromoneTrail.length - 1; i >= 0; i--) {
            this.pheromoneTrail[i].life -= 0.008;
            if (this.pheromoneTrail[i].life <= 0) {
                this.pheromoneTrail.splice(i, 1);
            }
        }

        // ── Toxin zones from shockwaves ──
        if (system.shockwaves) {
            for (let si = 0; si < system.shockwaves.length; si++) {
                const sw = system.shockwaves[si];
                // Add toxin zone at shockwave center if not already tracked
                let found = false;
                for (let ti = 0; ti < this.toxinZones.length; ti++) {
                    if (Math.abs(this.toxinZones[ti].x - sw.x) < 5 &&
                        Math.abs(this.toxinZones[ti].y - sw.y) < 5) {
                        found = true;
                        this.toxinZones[ti].life = 1.0; // refresh
                        break;
                    }
                }
                if (!found && this.toxinZones.length < 8) {
                    this.toxinZones.push({ x: sw.x, y: sw.y, life: 1.0 });
                }
            }
        }
        // Fade toxin zones
        for (let i = this.toxinZones.length - 1; i >= 0; i--) {
            this.toxinZones[i].life -= 0.005;
            if (this.toxinZones[i].life <= 0) {
                this.toxinZones.splice(i, 1);
            }
        }

        // ── Bioluminescent wave timer ──
        this.biolumTimer += system.speedMultiplier;
        if (this.biolumTimer > BIOLUM_PERIOD) {
            this.biolumTimer -= BIOLUM_PERIOD;
            this.biolumWaveOrigin = Math.floor(system.rng() * this.nodes.length);
        }

        // ── Cell updates ──
        for (let ci = 0; ci < this.cells.length; ci++) {
            const c = this.cells[ci];

            // Brownian motion
            c.vx += (system.rng() - 0.5) * 0.2 * biome.cellSpeed;
            c.vy += (system.rng() - 0.5) * 0.2 * biome.cellSpeed;

            // Pheromone attraction: cells drift toward nearby trail points
            for (let pi = 0; pi < this.pheromoneTrail.length; pi++) {
                const p = this.pheromoneTrail[pi];
                const pdx = p.x - c.x;
                const pdy = p.y - c.y;
                const pdSq = pdx * pdx + pdy * pdy;
                if (pdSq < 40000 && pdSq > 1) { // 200px
                    const pd = Math.sqrt(pdSq);
                    const attraction = p.life * 0.15;
                    c.vx += (pdx / pd) * attraction;
                    c.vy += (pdy / pd) * attraction;
                }
            }

            // Toxin response: panicked flee from toxin zones
            for (let ti = 0; ti < this.toxinZones.length; ti++) {
                const tz = this.toxinZones[ti];
                const tdx = c.x - tz.x;
                const tdy = c.y - tz.y;
                const tdSq = tdx * tdx + tdy * tdy;
                const toxinR = TOXIN_ZONE_RADIUS * tz.life;
                if (tdSq < toxinR * toxinR && tdSq > 1) {
                    const td = Math.sqrt(tdSq);
                    const flee = (toxinR - td) / toxinR * TOXIN_FLEE_FORCE * tz.life;
                    c.vx += (tdx / td) * flee;
                    c.vy += (tdy / td) * flee;
                    c.panic = Math.min(1, c.panic + 0.1);
                    // Jitter for panicked movement
                    c.vx += (system.rng() - 0.5) * 3 * tz.life;
                    c.vy += (system.rng() - 0.5) * 3 * tz.life;
                }
            }
            c.panic = Math.max(0, c.panic - 0.015);

            c.x += c.vx * system.speedMultiplier;
            c.y += c.vy * system.speedMultiplier;

            // Wrap
            if (c.x < -c.radius) c.x = system.width + c.radius;
            else if (c.x > system.width + c.radius) c.x = -c.radius;
            if (c.y < -c.radius) c.y = system.height + c.radius;
            else if (c.y > system.height + c.radius) c.y = -c.radius;

            // Mouse reaction
            const dx = c.x - mx;
            const dy = c.y - my;
            const distSq = dx * dx + dy * dy;

            if (system.isGravityWell) {
                // Gravity well: cells flee dramatically + cell division
                if (distSq < 90000) { // 300px
                    const dist = Math.sqrt(distSq);
                    if (dist > 1) {
                        const force = (300 - dist) / 300;
                        c.vx += (dx / dist) * force * 3;
                        c.vy += (dy / dist) * force * 3;
                    }
                }

                // Cell division: cells near mouse split
                if (distSq < DIVISION_RADIUS * DIVISION_RADIUS &&
                    c.radius > 5 && c.divisionAnim <= 0 &&
                    this.cells.length < MAX_CELLS &&
                    system.rng() < 0.008) {
                    // Shrink parent
                    const childRadius = c.radius * 0.65;
                    c.radius *= 0.65;
                    c.divisionAnim = 1.0;
                    // Spawn child offset perpendicular to velocity
                    const angle = Math.atan2(c.vy, c.vx) + Math.PI * 0.5;
                    const offset = c.radius + childRadius + 2;
                    this.cells.push(this._createCell(
                        c.x + Math.cos(angle) * offset,
                        c.y + Math.sin(angle) * offset,
                        childRadius, system, true
                    ));
                }
            } else if (distSq < 22500) { // 150px normal repulsion
                const dist = Math.sqrt(distSq);
                if (dist > 1) {
                    const force = (150 - dist) / 150;
                    c.vx += (dx / dist) * force * 0.5;
                    c.vy += (dy / dist) * force * 0.5;
                }
            }

            // Shockwave response: scatter + trigger toxin panic
            if (system.shockwaves) {
                for (let si = 0; si < system.shockwaves.length; si++) {
                    const sw = system.shockwaves[si];
                    const sdx = c.x - sw.x;
                    const sdy = c.y - sw.y;
                    const sDistSq = sdx * sdx + sdy * sdy;
                    const sDist = Math.sqrt(sDistSq);
                    if (sDist > 1 && Math.abs(sDist - sw.radius) < 60) {
                        const push = (1 - Math.abs(sDist - sw.radius) / 60) * sw.strength;
                        c.vx += (sdx / sDist) * push * 8;
                        c.vy += (sdy / sDist) * push * 8;
                        c.panic = Math.min(1, c.panic + 0.3);
                    }
                }
            }

            // Division animation decay
            if (c.divisionAnim > 0) {
                c.divisionAnim = Math.max(0, c.divisionAnim - 0.02);
            }

            c.vx *= 0.95;
            c.vy *= 0.95;
        }

        // ── Node updates ──
        const waveProgress = this.biolumTimer / BIOLUM_PERIOD; // 0..1
        const originNode = this.nodes[this.biolumWaveOrigin];

        for (let ni = 0; ni < this.nodes.length; ni++) {
            const n = this.nodes[ni];

            // Gentle drift
            n.x += Math.sin(tick * 0.005 + n.pulseOffset) * 0.2 * system.speedMultiplier;
            n.y += Math.cos(tick * 0.005 + n.pulseOffset) * 0.2 * system.speedMultiplier;

            // Gravity well glow boost
            if (system.isGravityWell) {
                const dx = n.x - mx;
                const dy = n.y - my;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 400) {
                    n.glowBoost = Math.min(1, n.glowBoost + 0.1);
                } else {
                    n.glowBoost *= 0.95;
                }
            } else {
                n.glowBoost *= 0.95;
            }

            // ── Bioluminescent wave: compute brightness based on distance from origin ──
            if (originNode) {
                const wdx = n.x - originNode.x;
                const wdy = n.y - originNode.y;
                const wDist = Math.sqrt(wdx * wdx + wdy * wdy);
                const maxWaveDist = Math.sqrt(system.width * system.width + system.height * system.height);
                const waveFront = waveProgress * maxWaveDist;
                const distFromFront = Math.abs(wDist - waveFront);
                const waveWidth = 150;
                if (distFromFront < waveWidth) {
                    n.biolumBright = Math.max(n.biolumBright,
                        (1 - distFromFront / waveWidth) * biome.glowIntensity);
                }
            }
            n.biolumBright *= 0.97; // decay

            // ── Tendril reach toward cursor ──
            const nmx = n.x - mx;
            const nmy = n.y - my;
            const nDist = Math.sqrt(nmx * nmx + nmy * nmy);
            if (nDist < TENDRIL_REACH_DIST) {
                n.tendrilReach = Math.min(1, n.tendrilReach + 0.05);
            } else {
                n.tendrilReach = Math.max(0, n.tendrilReach - 0.03);
            }

            // ── Emit spores ──
            if (tick % biome.sporeRate === 0 && this.spores.length < MAX_SPORES) {
                const count = Math.floor(system.rng() * 2) + 2;
                for (let i = 0; i < count; i++) {
                    if (this.spores.length >= MAX_SPORES) break;
                    const spore = this._allocSpore();
                    const angle = system.rng() * Math.PI * 2;
                    const speed = system.rng() * 0.5 + 0.2;
                    spore.x = n.x + (system.rng() - 0.5) * n.radius;
                    spore.y = n.y + (system.rng() - 0.5) * n.radius;
                    spore.vx = Math.cos(angle) * speed;
                    spore.vy = Math.sin(angle) * speed;
                    spore.life = 0;
                    spore.maxLife = 40 + Math.floor(system.rng() * 40);
                    spore.radius = system.rng() * 1.5 + 0.5;
                    spore.hue = n.hue + (system.rng() - 0.5) * 30;
                    this.spores.push(spore);
                }
            }
        }

        // ── Spore updates ──
        for (let i = this.spores.length - 1; i >= 0; i--) {
            const s = this.spores[i];
            s.x += s.vx * system.speedMultiplier;
            s.y += s.vy * system.speedMultiplier;
            s.vx *= 0.98;
            s.vy *= 0.98;
            s.life++;
            if (s.life >= s.maxLife) {
                this._freeSpore(s);
                this.spores.splice(i, 1);
            }
        }

        // ── Nutrient flow: spawn along tendril edges ──
        if (tick % 3 === 0 && this.nutrients.length < MAX_NUTRIENTS && this.tendrilEdges.length > 0) {
            const edgeIdx = Math.floor(system.rng() * this.tendrilEdges.length);
            const nut = this._allocNutrient();
            const edge = this.tendrilEdges[edgeIdx];
            const nA = this.nodes[edge.a];
            nut.edgeIdx = edgeIdx;
            nut.progress = 0;
            nut.speed = (system.rng() * 0.01 + 0.005) * biome.nutrientSpeed;
            nut.radius = system.rng() * biome.nutrientSize + 0.8;
            nut.hue = nA.hue + (system.rng() - 0.5) * 20;
            nut.life = 0;
            nut.maxLife = Math.floor(1.0 / nut.speed) + 10;
            nut.x = nA.x;
            nut.y = nA.y;
            this.nutrients.push(nut);
        }

        // ── Nutrient updates ──
        for (let i = this.nutrients.length - 1; i >= 0; i--) {
            const nut = this.nutrients[i];
            nut.progress += nut.speed * system.speedMultiplier;
            nut.life++;
            if (nut.progress >= 1 || nut.life >= nut.maxLife) {
                this._freeNutrient(nut);
                this.nutrients.splice(i, 1);
                continue;
            }
            // Interpolate position along edge with bezier mid
            const edge = this.tendrilEdges[nut.edgeIdx];
            if (!edge) { this.nutrients.splice(i, 1); continue; }
            const nA = this.nodes[edge.a];
            const nB = this.nodes[edge.b];
            const t = nut.progress;
            const mt = 1 - t;
            // Quadratic bezier with animated midpoint (same as tendril draw)
            const midX = (nA.x + nB.x) / 2 + Math.sin(tick * 0.01 + edge.a) * 30;
            const midY = (nA.y + nB.y) / 2 + Math.cos(tick * 0.01 + edge.b) * 30;
            nut.x = mt * mt * nA.x + 2 * mt * t * midX + t * t * nB.x;
            nut.y = mt * mt * nA.y + 2 * mt * t * midY + t * t * nB.y;
        }

        // ── Rebuild tendril edges periodically (nodes drift slowly) ──
        if (tick % 120 === 0) {
            this._rebuildTendrilEdges(system);
        }
    }

    // ──────────────────────── DRAW ────────────────────────
    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const biome = this.biome;
        const mx = mouse.x;
        const my = mouse.y;

        // ── Pheromone trail ──
        for (let i = 0; i < this.pheromoneTrail.length; i++) {
            const p = this.pheromoneTrail[i];
            const r = 15 * p.life;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            grad.addColorStop(0, `hsla(${system.hue + 60}, 70%, 50%, ${p.life * 0.2})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Toxin zones ──
        for (let i = 0; i < this.toxinZones.length; i++) {
            const tz = this.toxinZones[i];
            const r = TOXIN_ZONE_RADIUS * tz.life;
            const grad = ctx.createRadialGradient(tz.x, tz.y, r * 0.3, tz.x, tz.y, r);
            grad.addColorStop(0, `hsla(${system.hue + 180}, 60%, 30%, ${tz.life * 0.15})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(tz.x, tz.y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Tendrils between nodes ──
        ctx.lineCap = 'round';
        for (let ei = 0; ei < this.tendrilEdges.length; ei++) {
            const edge = this.tendrilEdges[ei];
            const n1 = this.nodes[edge.a];
            const n2 = this.nodes[edge.b];
            const midX = (n1.x + n2.x) / 2 + Math.sin(tick * 0.01 + edge.a) * 30;
            const midY = (n1.y + n2.y) / 2 + Math.cos(tick * 0.01 + edge.b) * 30;

            // Bioluminescent brightness on this edge
            const edgeBiolum = Math.max(n1.biolumBright, n2.biolumBright);
            const alpha = biome.tendrilAlpha + edgeBiolum * 0.4;
            const lightness = 30 + edgeBiolum * 30;

            ctx.strokeStyle = `hsla(${system.hue}, ${biome.baseSaturation}%, ${lightness}%, ${alpha})`;
            ctx.lineWidth = biome.tendrilWidth + edgeBiolum * 2;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.quadraticCurveTo(midX, midY, n2.x, n2.y);
            ctx.stroke();
        }

        // ── Tendrils reaching toward cursor ──
        // Find closest nodes to cursor and draw bezier tendrils extending toward mouse
        const cursorTendrils = [];
        for (let i = 0; i < this.nodes.length; i++) {
            const n = this.nodes[i];
            if (n.tendrilReach > 0.01) {
                const dx = n.x - mx;
                const dy = n.y - my;
                cursorTendrils.push({ node: n, dist: Math.sqrt(dx * dx + dy * dy), idx: i });
            }
        }
        // Sort by distance, cap count
        cursorTendrils.sort((a, b) => a.dist - b.dist);
        const tendrilCount = Math.min(cursorTendrils.length, MAX_TENDRILS_TO_CURSOR);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let ti = 0; ti < tendrilCount; ti++) {
            const { node, dist } = cursorTendrils[ti];
            const reach = node.tendrilReach;
            // Endpoint: lerp from node toward cursor by reach amount
            const endX = node.x + (mx - node.x) * reach;
            const endY = node.y + (my - node.y) * reach;
            // Bezier control points with organic wobble
            const cp1x = node.x + (mx - node.x) * 0.3 + Math.sin(tick * 0.03 + node.pulseOffset) * 25;
            const cp1y = node.y + (my - node.y) * 0.3 + Math.cos(tick * 0.025 + node.pulseOffset) * 25;
            const cp2x = node.x + (mx - node.x) * 0.6 + Math.cos(tick * 0.02 + node.pulseOffset * 2) * 15;
            const cp2y = node.y + (my - node.y) * 0.6 + Math.sin(tick * 0.035 + node.pulseOffset * 2) * 15;

            const alpha = reach * 0.5 * (1 - dist / TENDRIL_REACH_DIST);
            ctx.strokeStyle = `hsla(${node.hue}, ${biome.baseSaturation + 20}%, 60%, ${alpha})`;
            ctx.lineWidth = biome.tendrilWidth * 0.7;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
            ctx.stroke();

            // Glowing tip at the tendril end
            if (reach > 0.3) {
                const tipGrad = ctx.createRadialGradient(endX, endY, 0, endX, endY, 8 * reach);
                tipGrad.addColorStop(0, `hsla(${node.hue}, 90%, 75%, ${reach * 0.6})`);
                tipGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = tipGrad;
                ctx.beginPath();
                ctx.arc(endX, endY, 8 * reach, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();

        // ── Nutrient flow particles ──
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < this.nutrients.length; i++) {
            const nut = this.nutrients[i];
            const fadeIn = Math.min(1, nut.progress * 5);
            const fadeOut = Math.min(1, (1 - nut.progress) * 5);
            const alpha = fadeIn * fadeOut * 0.8;
            // Glowing dot
            const grad = ctx.createRadialGradient(nut.x, nut.y, 0, nut.x, nut.y, nut.radius * 3);
            grad.addColorStop(0, `hsla(${nut.hue}, 80%, 70%, ${alpha})`);
            grad.addColorStop(0.5, `hsla(${nut.hue}, 80%, 55%, ${alpha * 0.4})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(nut.x, nut.y, nut.radius * 3, 0, Math.PI * 2);
            ctx.fill();
            // Core
            ctx.fillStyle = `hsla(${nut.hue}, 90%, 85%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(nut.x, nut.y, nut.radius * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // ── Nodes (bioluminescent organs with glow) ──
        for (let ni = 0; ni < this.nodes.length; ni++) {
            const n = this.nodes[ni];
            const pulse = 1 + Math.sin(tick * 0.03 + n.pulseOffset) * 0.15;
            const biolum = n.biolumBright;
            const boostedAlpha = 0.35 + n.glowBoost * 0.4 + biolum * 0.3;
            const r = n.radius * pulse;

            // Bioluminescent glow layer
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const glowR = r * (1.5 + biolum * 0.8);
            const glowGrad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
            glowGrad.addColorStop(0, `hsla(${n.hue}, ${biome.baseSaturation + 10}%, 60%, ${boostedAlpha * 0.6})`);
            glowGrad.addColorStop(0.4, `hsla(${n.hue}, ${biome.baseSaturation}%, 50%, ${boostedAlpha * 0.3})`);
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Core radial gradient
            const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r);
            grad.addColorStop(0, `hsla(${n.hue}, ${biome.baseSaturation}%, ${biome.baseLightness}%, ${boostedAlpha})`);
            grad.addColorStop(0.5, `hsla(${n.hue}, ${biome.baseSaturation}%, ${biome.baseLightness}%, ${boostedAlpha * 0.5})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Spore particles ──
        for (let i = 0; i < this.spores.length; i++) {
            const s = this.spores[i];
            const alpha = 1 - (s.life / s.maxLife);
            ctx.fillStyle = `hsla(${s.hue}, 70%, 60%, ${alpha * 0.6})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius * alpha, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Symbiotic connections (membrane bridges between close cells) ──
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < this.cells.length; i++) {
            const c1 = this.cells[i];
            for (let j = i + 1; j < this.cells.length; j++) {
                const c2 = this.cells[j];
                const dx = c1.x - c2.x;
                const dy = c1.y - c2.y;
                const dSq = dx * dx + dy * dy;
                if (dSq < SYMBIOTIC_DIST_SQ && dSq > 1) {
                    const d = Math.sqrt(dSq);
                    const closeness = 1 - d / SYMBIOTIC_DIST;
                    const alpha = closeness * 0.5;
                    const midX = (c1.x + c2.x) / 2;
                    const midY = (c1.y + c2.y) / 2;
                    // Bulging bridge
                    const perpX = -(c1.y - c2.y) / d * 8 * closeness;
                    const perpY = (c1.x - c2.x) / d * 8 * closeness;
                    const cpx = midX + perpX * Math.sin(tick * 0.05);
                    const cpy = midY + perpY * Math.sin(tick * 0.05);

                    ctx.strokeStyle = `hsla(${(c1.hue + c2.hue) / 2}, 60%, 60%, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(c1.x, c1.y);
                    ctx.quadraticCurveTo(cpx, cpy, c2.x, c2.y);
                    ctx.stroke();

                    // Small glow at bridge midpoint
                    const bgGrad = ctx.createRadialGradient(midX, midY, 0, midX, midY, 6);
                    bgGrad.addColorStop(0, `hsla(${(c1.hue + c2.hue) / 2}, 80%, 70%, ${alpha * 0.8})`);
                    bgGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = bgGrad;
                    ctx.beginPath();
                    ctx.arc(midX, midY, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();

        // ── Cells ──
        for (let ci = 0; ci < this.cells.length; ci++) {
            const c = this.cells[ci];
            const elongation = biome.cellElongation;

            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(Math.atan2(c.vy, c.vx));

            // Division animation: pinch in the middle
            if (c.divisionAnim > 0) {
                const pinch = c.divisionAnim;
                // Draw two separating lobes
                ctx.save();
                ctx.scale(1 + pinch * 0.3, 1 - pinch * 0.3);
                ctx.fillStyle = `hsla(${c.hue}, ${biome.baseSaturation}%, 50%, 0.5)`;
                ctx.beginPath();
                ctx.ellipse(0, 0, c.radius, c.radius * elongation, 0, 0, Math.PI * 2);
                ctx.fill();
                // Pinch line
                ctx.strokeStyle = `hsla(${c.hue}, 80%, 70%, ${pinch * 0.8})`;
                ctx.lineWidth = 2 * pinch;
                ctx.beginPath();
                ctx.moveTo(0, -c.radius * elongation);
                ctx.lineTo(0, c.radius * elongation);
                ctx.stroke();
                ctx.restore();
            } else {
                // Normal cell body
                const panicWobble = c.panic * Math.sin(tick * 0.3 + c.noiseOffset) * 2;
                ctx.fillStyle = `hsla(${c.hue + panicWobble * 10}, ${biome.baseSaturation + c.panic * 20}%, ${50 + c.panic * 15}%, 0.5)`;
                ctx.beginPath();
                ctx.ellipse(0, 0, c.radius + panicWobble, c.radius * elongation - panicWobble * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // Cell membrane highlight
            ctx.strokeStyle = `hsla(${c.hue}, 80%, 70%, ${0.6 + c.panic * 0.3})`;
            ctx.lineWidth = 1 + c.panic * 0.5;
            ctx.beginPath();
            ctx.ellipse(0, 0, c.radius, c.radius * elongation, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Nucleus
            ctx.fillStyle = `hsla(${c.hue}, 80%, 30%, 0.7)`;
            ctx.beginPath();
            const nX = Math.sin(tick * 0.05 + c.noiseOffset) * (c.radius * 0.2);
            ctx.arc(nX, 0, c.radius * 0.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }
}
