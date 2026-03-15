/**
 * @file voxel_architecture.js
 * @description Pseudo-3D rotating block environment with mouse-interactive voxels,
 * explosion effects, orbital formations, and hover highlighting. Seed determines
 * formation shape, color palette, rotation speed, and block arrangement.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class VoxelArchitecture extends Architecture {
    constructor() {
        super();
        this.voxels = [];
        this.debris = [];
        this.debrisPool = [];
        this.rotationX = 0;
        this.rotationY = 0;
        this.projectionDistance = 600;
        this.formation = 0;
        this.colorMode = 0;
        this.baseRotSpeedY = 0;
        this.baseRotSpeedX = 0;
        this.hoveredVoxel = -1;
        this.pulsePhase = 0;
        this.explosionWaves = [];
    }

    init(system) {
        const rng = system.rng;

        this.formation = Math.floor(rng() * 6);
        // 0=random cloud, 1=cube lattice, 2=sphere, 3=torus, 4=helix, 5=pyramid
        this.colorMode = Math.floor(rng() * 5);
        // 0=hue gradient, 1=monochrome, 2=complementary, 3=rainbow position, 4=temperature
        this.baseRotSpeedY = 0.003 + rng() * 0.008;
        this.baseRotSpeedX = 0.001 + rng() * 0.005;
        this.pulsePhase = rng() * Math.PI * 2;

        this.voxels = [];
        const range = 400;

        switch (this.formation) {
            case 0: // Random cloud
            {
                const count = 80 + Math.floor(rng() * 60);
                for (let i = 0; i < count; i++) {
                    this._addVoxel(system, rng,
                        (rng() - 0.5) * range * 2,
                        (rng() - 0.5) * range * 2,
                        (rng() - 0.5) * range * 2,
                        rng() * 30 + 8
                    );
                }
                break;
            }
            case 1: // Cube lattice
            {
                const gridSize = 4 + Math.floor(rng() * 3);
                const spacing = range * 2 / gridSize;
                for (let x = 0; x < gridSize; x++) {
                    for (let y = 0; y < gridSize; y++) {
                        for (let z = 0; z < gridSize; z++) {
                            if (rng() > 0.3) {
                                this._addVoxel(system, rng,
                                    (x - gridSize / 2) * spacing + (rng() - 0.5) * 10,
                                    (y - gridSize / 2) * spacing + (rng() - 0.5) * 10,
                                    (z - gridSize / 2) * spacing + (rng() - 0.5) * 10,
                                    spacing * 0.6
                                );
                            }
                        }
                    }
                }
                break;
            }
            case 2: // Sphere
            {
                const count = 100 + Math.floor(rng() * 50);
                for (let i = 0; i < count; i++) {
                    const phi = Math.acos(2 * rng() - 1);
                    const theta = rng() * Math.PI * 2;
                    const r = range * (0.6 + rng() * 0.4);
                    this._addVoxel(system, rng,
                        r * Math.sin(phi) * Math.cos(theta),
                        r * Math.sin(phi) * Math.sin(theta),
                        r * Math.cos(phi),
                        8 + rng() * 20
                    );
                }
                break;
            }
            case 3: // Torus
            {
                const count = 120;
                const majorR = range * 0.7;
                const minorR = range * 0.3;
                for (let i = 0; i < count; i++) {
                    const u = rng() * Math.PI * 2;
                    const v = rng() * Math.PI * 2;
                    const noise = (rng() - 0.5) * 30;
                    this._addVoxel(system, rng,
                        (majorR + (minorR + noise) * Math.cos(v)) * Math.cos(u),
                        (majorR + (minorR + noise) * Math.cos(v)) * Math.sin(u),
                        (minorR + noise) * Math.sin(v),
                        8 + rng() * 15
                    );
                }
                break;
            }
            case 4: // Helix
            {
                const count = 100;
                for (let i = 0; i < count; i++) {
                    const t = (i / count) * Math.PI * 6;
                    const r = range * 0.5;
                    const strand = i % 2;
                    const offset = strand * Math.PI;
                    this._addVoxel(system, rng,
                        Math.cos(t + offset) * r + (rng() - 0.5) * 20,
                        (i / count - 0.5) * range * 2,
                        Math.sin(t + offset) * r + (rng() - 0.5) * 20,
                        10 + rng() * 15
                    );
                }
                break;
            }
            case 5: // Pyramid
            {
                const layers = 5 + Math.floor(rng() * 3);
                const spacing = 60;
                for (let layer = 0; layer < layers; layer++) {
                    const layerSize = layers - layer;
                    for (let x = 0; x < layerSize; x++) {
                        for (let z = 0; z < layerSize; z++) {
                            if (rng() > 0.2) {
                                this._addVoxel(system, rng,
                                    (x - layerSize / 2) * spacing,
                                    (layers / 2 - layer) * spacing,
                                    (z - layerSize / 2) * spacing,
                                    spacing * 0.8
                                );
                            }
                        }
                    }
                }
                break;
            }
        }

        this.debris = [];
        this.debrisPool = [];
        this.explosionWaves = [];
    }

    _addVoxel(system, rng, x, y, z, size) {
        this.voxels.push({
            x, y, z, size,
            baseX: x, baseY: y, baseZ: z,
            vx: 0, vy: 0, vz: 0,
            hue: this._getVoxelHue(system, rng, x, y, z),
            brightness: 0,
            pulseOffset: rng() * Math.PI * 2,
            alive: true
        });
    }

    _getVoxelHue(system, rng, x, y, z) {
        const baseHue = system.hue || 200;
        switch (this.colorMode) {
            case 0: return (baseHue + (rng() - 0.5) * 60 + 360) % 360;
            case 1: return baseHue;
            case 2: return rng() > 0.5 ? baseHue : (baseHue + 180) % 360;
            case 3: {
                const dist = Math.sqrt(x * x + y * y + z * z);
                return (dist * 0.5 + baseHue) % 360;
            }
            case 4: return y > 0 ? 20 + rng() * 30 : 200 + rng() * 40;
            default: return baseHue;
        }
    }

    _project(v, centerX, centerY) {
        // Rotate Y
        const cosY = Math.cos(this.rotationY);
        const sinY = Math.sin(this.rotationY);
        const x1 = v.x * cosY - v.z * sinY;
        const z1 = v.x * sinY + v.z * cosY;

        // Rotate X
        const cosX = Math.cos(this.rotationX);
        const sinX = Math.sin(this.rotationX);
        const y2 = v.y * cosX - z1 * sinX;
        const z2 = v.y * sinX + z1 * cosX;

        const scale = this.projectionDistance / (this.projectionDistance + z2);
        return {
            x: centerX + x1 * scale,
            y: centerY + y2 * scale,
            z: z2,
            size: v.size * scale,
            scale
        };
    }

    update(system) {
        const mx = (mouse.x / system.width - 0.5);
        const my = (mouse.y / system.height - 0.5);
        const tick = system.tick;

        // Mouse-influenced rotation
        this.rotationY += (this.baseRotSpeedY + mx * 0.03) * system.speedMultiplier;
        this.rotationX += (this.baseRotSpeedX + my * 0.02) * system.speedMultiplier;
        this.pulsePhase += 0.02;

        const centerX = system.width / 2;
        const centerY = system.height / 2;

        // Find hovered voxel
        this.hoveredVoxel = -1;
        let bestDist = 60;
        for (let i = 0; i < this.voxels.length; i++) {
            const v = this.voxels[i];
            if (!v.alive) continue;
            const p = this._project(v, centerX, centerY);
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < p.size && dist < bestDist) {
                bestDist = dist;
                this.hoveredVoxel = i;
            }
        }

        // Update voxel brightness (hover highlight)
        for (let i = 0; i < this.voxels.length; i++) {
            const v = this.voxels[i];
            if (i === this.hoveredVoxel) {
                v.brightness = Math.min(1, v.brightness + 0.1);
            } else {
                v.brightness = Math.max(0, v.brightness - 0.03);
            }

            // Gravity well: explode nearby voxels
            if (system.isGravityWell && v.alive) {
                const p = this._project(v, centerX, centerY);
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    v.alive = false;
                    // Spawn debris
                    for (let d = 0; d < 4; d++) {
                        let debris = this.debrisPool.length > 0 ? this.debrisPool.pop() : {};
                        debris.x = v.x;
                        debris.y = v.y;
                        debris.z = v.z;
                        debris.vx = (system.rng() - 0.5) * 15;
                        debris.vy = (system.rng() - 0.5) * 15;
                        debris.vz = (system.rng() - 0.5) * 15;
                        debris.size = v.size * (0.2 + system.rng() * 0.3);
                        debris.hue = v.hue;
                        debris.life = 1;
                        debris.decay = 0.015 + system.rng() * 0.01;
                        this.debris.push(debris);
                    }
                    this.explosionWaves.push({
                        x: p.x, y: p.y,
                        radius: 0, maxRadius: 120,
                        life: 1, hue: v.hue
                    });
                }
            }

            // Respawn dead voxels after delay
            if (!v.alive) {
                v.respawnTimer = (v.respawnTimer || 0) + 1;
                if (v.respawnTimer > 180) {
                    v.alive = true;
                    v.respawnTimer = 0;
                    v.x = v.baseX;
                    v.y = v.baseY;
                    v.z = v.baseZ;
                }
            }

            // Orbital bob animation
            const bob = Math.sin(tick * 0.01 + v.pulseOffset) * 5;
            if (v.alive) {
                v.y = v.baseY + bob;
            }
        }

        // Update debris
        for (let i = this.debris.length - 1; i >= 0; i--) {
            const d = this.debris[i];
            d.x += d.vx;
            d.y += d.vy;
            d.z += d.vz;
            d.vx *= 0.97;
            d.vy *= 0.97;
            d.vz *= 0.97;
            d.life -= d.decay;
            if (d.life <= 0) {
                this.debrisPool.push(d);
                this.debris[i] = this.debris[this.debris.length - 1];
                this.debris.pop();
            }
        }

        // Update explosion waves
        for (let i = this.explosionWaves.length - 1; i >= 0; i--) {
            const w = this.explosionWaves[i];
            w.radius += 4;
            w.life = 1 - w.radius / w.maxRadius;
            if (w.life <= 0) {
                this.explosionWaves.splice(i, 1);
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const centerX = system.width / 2;
        const centerY = system.height / 2;
        const tick = system.tick;

        // Sort all renderable items by depth
        const items = [];

        for (let i = 0; i < this.voxels.length; i++) {
            const v = this.voxels[i];
            if (!v.alive) continue;
            const p = this._project(v, centerX, centerY);
            if (p.z < -this.projectionDistance) continue;
            items.push({ type: 'voxel', p, v, idx: i });
        }

        for (const d of this.debris) {
            const p = this._project(d, centerX, centerY);
            if (p.z < -this.projectionDistance) continue;
            items.push({ type: 'debris', p, d });
        }

        items.sort((a, b) => b.p.z - a.p.z);

        ctx.save();

        // Draw items back to front
        for (const item of items) {
            if (item.type === 'voxel') {
                const { p, v, idx } = item;
                const pulse = Math.sin(this.pulsePhase + v.pulseOffset) * 0.15 + 1;
                const size = p.size * pulse;
                const depthFade = Math.max(0, Math.min(1, (p.z + 500) / 1000));
                const l = 30 + (p.z / 1000) * 15 + v.brightness * 25;
                const s = this.colorMode === 1 ? 30 : 60;

                // Shadow
                if (size > 5) {
                    ctx.fillStyle = `rgba(0, 0, 0, ${depthFade * 0.15})`;
                    ctx.fillRect(
                        p.x - size / 2 + 3,
                        p.y - size / 2 + 3,
                        size, size
                    );
                }

                // Main face
                ctx.fillStyle = `hsla(${v.hue}, ${s}%, ${l}%, ${depthFade * 0.7})`;
                ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);

                // Edge highlights (pseudo 3D)
                if (size > 8) {
                    // Top edge (lighter)
                    ctx.fillStyle = `hsla(${v.hue}, ${s}%, ${l + 15}%, ${depthFade * 0.5})`;
                    ctx.fillRect(p.x - size / 2, p.y - size / 2, size, 3);
                    // Left edge (lighter)
                    ctx.fillRect(p.x - size / 2, p.y - size / 2, 3, size);
                    // Bottom edge (darker)
                    ctx.fillStyle = `hsla(${v.hue}, ${s}%, ${l - 10}%, ${depthFade * 0.5})`;
                    ctx.fillRect(p.x - size / 2, p.y + size / 2 - 2, size, 2);
                }

                // Border
                ctx.strokeStyle = `hsla(${v.hue}, ${s}%, ${l + 20}%, ${depthFade * 0.8})`;
                ctx.lineWidth = 1;
                ctx.strokeRect(p.x - size / 2, p.y - size / 2, size, size);

                // Hover glow
                if (v.brightness > 0.05) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    const glowR = size * 1.5;
                    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
                    grad.addColorStop(0, `hsla(${v.hue}, 90%, 70%, ${v.brightness * 0.3})`);
                    grad.addColorStop(1, 'transparent');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            } else {
                // Debris
                const { p, d } = item;
                const depthFade = Math.max(0, Math.min(1, (p.z + 500) / 1000));
                const alpha = d.life * depthFade * 0.8;
                ctx.fillStyle = `hsla(${d.hue}, 70%, 60%, ${alpha})`;
                ctx.fillRect(
                    p.x - p.size / 2,
                    p.y - p.size / 2,
                    p.size * d.life,
                    p.size * d.life
                );
            }
        }

        // Draw explosion waves (2D screen space)
        ctx.globalCompositeOperation = 'lighter';
        for (const w of this.explosionWaves) {
            ctx.strokeStyle = `hsla(${w.hue}, 80%, 70%, ${w.life * 0.4})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';

        ctx.restore();
    }
}
