/**
 * @file spatial_grid.js
 * @description A spatial partitioning grid for optimizing distance-based queries.
 */

export class SpatialGrid {
    /**
     * @param {number} width - The width of the area.
     * @param {number} height - The height of the area.
     * @param {number} cellSize - The size of each grid cell.
     */
    constructor(width, height, cellSize) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.updateDimensions(width, height);
    }

    /**
     * Updates the grid dimensions.
     * @param {number} width
     * @param {number} height
     */
    updateDimensions(width, height) {
        this.width = width;
        this.height = height;
        this.cols = Math.ceil(width / this.cellSize) + 1;
        this.rows = Math.ceil(height / this.cellSize) + 1;
        this.grid = new Array(this.cols * this.rows).fill(null).map(() => []);
    }

    /**
     * Clears all cells in the grid.
     */
    clear() {
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i].length = 0;
        }
    }

    /**
     * Inserts an object into the grid based on its x and y properties.
     * @param {object} obj - The object to insert.
     */
    insert(obj) {
        let x = obj.x;
        let y = obj.y;

        // Wrap-around safety
        if (x < 0) x = (x % this.width) + this.width;
        if (x >= this.width) x = x % this.width;
        if (y < 0) y = (y % this.height) + this.height;
        if (y >= this.height) y = y % this.height;

        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);

        const idx = row * this.cols + col;
        if (this.grid[idx]) {
            this.grid[idx].push(obj);
        }
    }

    /**
     * Retrieves all objects in cells that could contain objects within the specified radius.
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     * @returns {Array<object>}
     */
    getNearby(x, y, radius) {
        const nearby = [];
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        const cellRadius = Math.ceil(radius / this.cellSize);

        for (let r = row - cellRadius; r <= row + cellRadius; r++) {
            for (let c = col - cellRadius; c <= col + cellRadius; c++) {
                let actualR = r;
                let actualC = c;

                // Wrapping logic
                if (actualR < 0) actualR = (actualR % this.rows) + this.rows;
                if (actualR >= this.rows) actualR = actualR % this.rows;
                if (actualC < 0) actualC = (actualC % this.cols) + this.cols;
                if (actualC >= this.cols) actualC = actualC % this.cols;

                const idx = actualR * this.cols + actualC;
                if (this.grid[idx]) {
                    // Using a loop instead of spread to avoid stack overflow for very large arrays
                    const cellContent = this.grid[idx];
                    for (let i = 0; i < cellContent.length; i++) {
                        nearby.push(cellContent[i]);
                    }
                }
            }
        }
        return nearby;
    }
}
