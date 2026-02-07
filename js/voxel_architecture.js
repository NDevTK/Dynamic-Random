/**
 * @file voxel_architecture.js
 * @description Defines the Voxel architecture with a pseudo-3D rotating block environment.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class VoxelArchitecture extends Architecture {
    constructor() {
        super();
        this.voxels = [];
        this.rotationX = 0;
        this.rotationY = 0;
        this.projectionDistance = 600;
    }

    init(system) {
        this.voxels = [];
        const count = 100;
        const range = 1000;

        for (let i = 0; i < count; i++) {
            this.voxels.push({
                x: (system.rng() - 0.5) * range,
                y: (system.rng() - 0.5) * range,
                z: (system.rng() - 0.5) * range,
                size: system.rng() * 40 + 10,
                hue: (system.hue + (system.rng() - 0.5) * 60 + 360) % 360
            });
        }
    }

    update(system) {
        const mx = (mouse.x / system.width - 0.5) * 0.5;
        const my = (mouse.y / system.height - 0.5) * 0.5;

        this.rotationY += (0.005 + mx * 0.05) * system.speedMultiplier;
        this.rotationX += (0.002 + my * 0.05) * system.speedMultiplier;
    }

    draw(system) {
        const ctx = system.ctx;
        const centerX = system.width / 2;
        const centerY = system.height / 2;

        // Sort voxels by depth for proper rendering order
        const projected = this.voxels.map(v => {
            // Rotate Y
            let x1 = v.x * Math.cos(this.rotationY) - v.z * Math.sin(this.rotationY);
            let z1 = v.x * Math.sin(this.rotationY) + v.z * Math.cos(this.rotationY);

            // Rotate X
            let y2 = v.y * Math.cos(this.rotationX) - z1 * Math.sin(this.rotationX);
            let z2 = v.y * Math.sin(this.rotationX) + z1 * Math.cos(this.rotationX);

            // Perspective projection
            const scale = this.projectionDistance / (this.projectionDistance + z2);
            return {
                x: centerX + x1 * scale,
                y: centerY + y2 * scale,
                z: z2,
                size: v.size * scale,
                hue: v.hue,
                alpha: Math.max(0, Math.min(1, (z2 + 500) / 1000))
            };
        }).sort((a, b) => b.z - a.z);

        projected.forEach(v => {
            if (v.z < -this.projectionDistance) return;

            const h = v.hue;
            const s = 60;
            const l = 40 + (v.z / 1000) * 20;

            ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, ${v.alpha * 0.6})`;
            ctx.strokeStyle = `hsla(${h}, ${s}%, ${l + 20}%, ${v.alpha})`;
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.rect(v.x - v.size / 2, v.y - v.size / 2, v.size, v.size);
            ctx.fill();
            ctx.stroke();
        });
    }
}
