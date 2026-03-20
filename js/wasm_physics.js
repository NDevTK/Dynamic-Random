/**
 * @file wasm_physics.js
 * @description Pure-JS physics engine that mimics the API a real AssemblyScript/WASM
 * module would expose. Same function signatures — swap for real WASM later without
 * changing callers. No DOM, no imports, pure math.
 */

const wasmPhysics = (() => {
    let _initialized = false;

    function init() {
        _initialized = true;
    }

    // -------------------------------------------------------------------------
    // Factory: cloth grid
    // -------------------------------------------------------------------------
    /**
     * Create a cloth grid of points and constraints.
     * @param {number} cols
     * @param {number} rows
     * @param {number} spacing   - pixel distance between adjacent points
     * @param {number} startX    - top-left X origin
     * @param {number} startY    - top-left Y origin
     * @returns {{ points: Array, constraints: Array }}
     */
    function createClothGrid(cols, rows, spacing, startX, startY) {
        const points = [];
        const constraints = [];

        // Build points
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = startX + c * spacing;
                const y = startY + r * spacing;
                points.push({
                    x,
                    y,
                    oldX: x,
                    oldY: y,
                    pinned: r === 0, // top row pinned by default
                });
            }
        }

        // Horizontal constraints
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols - 1; c++) {
                const p1Index = r * cols + c;
                const p2Index = r * cols + (c + 1);
                constraints.push({ p1Index, p2Index, restLength: spacing });
            }
        }

        // Vertical constraints
        for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < cols; c++) {
                const p1Index = r * cols + c;
                const p2Index = (r + 1) * cols + c;
                constraints.push({ p1Index, p2Index, restLength: spacing });
            }
        }

        // Diagonal shear constraints (stiffness / shape preservation)
        for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < cols - 1; c++) {
                const diagLen = spacing * Math.SQRT2;
                constraints.push({
                    p1Index: r * cols + c,
                    p2Index: (r + 1) * cols + (c + 1),
                    restLength: diagLen,
                });
                constraints.push({
                    p1Index: r * cols + (c + 1),
                    p2Index: (r + 1) * cols + c,
                    restLength: diagLen,
                });
            }
        }

        return { points, constraints };
    }

    // -------------------------------------------------------------------------
    // Factory: soft body
    // -------------------------------------------------------------------------
    /**
     * Create a soft body blob — points arranged in a circle with structural and
     * cross-constraints for pressure-based inflation.
     * @param {number} centerX
     * @param {number} centerY
     * @param {number} radius
     * @param {number} numPoints
     * @returns {{ points: Array, constraints: Array }}
     */
    function createSoftBody(centerX, centerY, radius, numPoints) {
        const points = [];
        const constraints = [];
        const TWO_PI = Math.PI * 2;

        // Perimeter points
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * TWO_PI;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            points.push({ x, y, oldX: x, oldY: y, pinned: false });
        }

        // Edge constraints (perimeter)
        const perimLen = 2 * radius * Math.sin(Math.PI / numPoints);
        for (let i = 0; i < numPoints; i++) {
            const next = (i + 1) % numPoints;
            constraints.push({ p1Index: i, p2Index: next, restLength: perimLen });
        }

        // Cross constraints: connect every point to several non-adjacent points.
        // This provides structural stiffness and couples the pressure calculation.
        const skip = Math.max(2, Math.floor(numPoints / 4));
        for (let i = 0; i < numPoints; i++) {
            for (let s = 2; s <= skip; s++) {
                const j = (i + s) % numPoints;
                if (j <= i) continue; // avoid duplicates
                const dx = points[i].x - points[j].x;
                const dy = points[i].y - points[j].y;
                const restLength = Math.sqrt(dx * dx + dy * dy);
                constraints.push({ p1Index: i, p2Index: j, restLength });
            }
        }

        return { points, constraints };
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------
    function _satisfyConstraints(points, constraints, iterations) {
        for (let iter = 0; iter < iterations; iter++) {
            for (let ci = 0; ci < constraints.length; ci++) {
                const c = constraints[ci];
                const p1 = points[c.p1Index];
                const p2 = points[c.p2Index];

                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
                const diff = (dist - c.restLength) / dist * 0.5;
                const offsetX = dx * diff;
                const offsetY = dy * diff;

                if (!p1.pinned) { p1.x += offsetX; p1.y += offsetY; }
                if (!p2.pinned) { p2.x -= offsetX; p2.y -= offsetY; }
            }
        }
    }

    function _centroid(points) {
        let cx = 0, cy = 0;
        for (let i = 0; i < points.length; i++) { cx += points[i].x; cy += points[i].y; }
        return { x: cx / points.length, y: cy / points.length };
    }

    // -------------------------------------------------------------------------
    // Verlet step — cloth
    // -------------------------------------------------------------------------
    /**
     * Advance cloth simulation one step.
     * @param {Array}  points       - mutated in place
     * @param {Array}  constraints
     * @param {number} gravity      - pixels/frame² downward acceleration
     * @param {number} damping      - velocity scale per frame (0..1)
     * @param {number} iterations   - constraint solver iterations
     */
    function stepCloth(points, constraints, gravity, damping, iterations) {
        // Verlet integrate
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p.pinned) continue;

            const vx = (p.x - p.oldX) * damping;
            const vy = (p.y - p.oldY) * damping;

            p.oldX = p.x;
            p.oldY = p.y;

            p.x += vx;
            p.y += vy + gravity;
        }

        _satisfyConstraints(points, constraints, iterations);
    }

    // -------------------------------------------------------------------------
    // Verlet step — soft body
    // -------------------------------------------------------------------------
    /**
     * Advance soft body simulation one step with internal pressure.
     * @param {Array}  points
     * @param {Array}  constraints
     * @param {number} pressure     - outward pressure force magnitude
     * @param {number} gravity
     * @param {number} damping
     * @param {number} iterations
     */
    function stepSoftBody(points, constraints, pressure, gravity, damping, iterations) {
        // Compute centroid before integration
        const cen = _centroid(points);

        // Verlet integrate + pressure force
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p.pinned) continue;

            const vx = (p.x - p.oldX) * damping;
            const vy = (p.y - p.oldY) * damping;

            // Outward pressure from centroid
            const dx = p.x - cen.x;
            const dy = p.y - cen.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const px = (dx / dist) * pressure;
            const py = (dy / dist) * pressure;

            p.oldX = p.x;
            p.oldY = p.y;

            p.x += vx + px;
            p.y += vy + py + gravity;
        }

        _satisfyConstraints(points, constraints, iterations);
    }

    // -------------------------------------------------------------------------
    // Force application
    // -------------------------------------------------------------------------
    /**
     * Apply an impulse force to all points within `radius` of (atX, atY).
     * Force falls off linearly with distance.
     * @param {Array}  points
     * @param {number} forceX
     * @param {number} forceY
     * @param {number} atX
     * @param {number} atY
     * @param {number} radius
     */
    function applyForceAt(points, forceX, forceY, atX, atY, radius) {
        const r2 = radius * radius;
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p.pinned) continue;
            const dx = p.x - atX;
            const dy = p.y - atY;
            const d2 = dx * dx + dy * dy;
            if (d2 < r2) {
                const falloff = 1 - Math.sqrt(d2) / radius;
                // Modify oldX/oldY to inject velocity into Verlet
                p.oldX -= forceX * falloff;
                p.oldY -= forceY * falloff;
            }
        }
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------
    return {
        init,
        createClothGrid,
        createSoftBody,
        stepCloth,
        stepSoftBody,
        applyForceAt,
    };
})();

export { wasmPhysics };
