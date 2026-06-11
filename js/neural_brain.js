/**
 * @file neural_brain.js
 * @description A tiny multilayer perceptron — the whole "ML library" of the
 * project, in plain JS. Travelers (travelers.js) use one as a steering brain:
 * inputs describe what they sense (cursor, points of interest, walls, their
 * own motion, an internal rhythm), outputs are urges (steer, dwell,
 * sociability). Genomes are flat Float arrays, so they serialize to
 * localStorage and mutate trivially — neuroevolution without dependencies.
 *
 * Layout: IN → tanh(H) → tanh(OUT), weights then biases per layer:
 *   [ W_ih (IN×H) | b_h (H) | W_ho (H×OUT) | b_o (OUT) ]
 */

export class TinyBrain {
    /**
     * @param {number} inN
     * @param {number} hidN
     * @param {number} outN
     * @param {number[]|Float32Array} genome - flat weights, length genomeSize(...)
     */
    constructor(inN, hidN, outN, genome) {
        this.inN = inN;
        this.hidN = hidN;
        this.outN = outN;
        this.genome = Float32Array.from(genome);
        if (this.genome.length !== TinyBrain.genomeSize(inN, hidN, outN)) {
            throw new Error(`genome length ${this.genome.length} != ${TinyBrain.genomeSize(inN, hidN, outN)}`);
        }
        this._hidden = new Float32Array(hidN);
        this._out = new Float32Array(outN);
    }

    static genomeSize(inN, hidN, outN) {
        return inN * hidN + hidN + hidN * outN + outN;
    }

    /** Random genome, weights in [-1, 1] from the given RNG. */
    static randomGenome(rng, inN, hidN, outN) {
        const g = new Float32Array(TinyBrain.genomeSize(inN, hidN, outN));
        for (let i = 0; i < g.length; i++) g[i] = rng() * 2 - 1;
        return g;
    }

    /** Uniform crossover: each weight comes from either parent with p=0.5. */
    static crossover(a, b, rng) {
        const g = Float32Array.from(a);
        for (let i = 0; i < g.length; i++) {
            if (rng() < 0.5) g[i] = b[i];
        }
        return g;
    }

    /** Mean absolute weight difference — used for diversity niching. */
    static distance(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
        return sum / a.length;
    }

    /**
     * Mutated copy of a genome: each weight jitters with probability `rate`,
     * and occasionally one weight takes a large jolt (escape local habits).
     */
    static mutate(genome, rng, rate = 0.12, amount = 0.35) {
        const g = Float32Array.from(genome);
        for (let i = 0; i < g.length; i++) {
            if (rng() < rate) g[i] += (rng() * 2 - 1) * amount;
        }
        if (rng() < 0.35) {
            const i = Math.floor(rng() * g.length);
            g[i] = rng() * 2 - 1;
        }
        return g;
    }

    /**
     * Forward pass. Returns the output array (reused — copy if you keep it).
     * @param {number[]|Float32Array} inputs - length inN
     */
    think(inputs) {
        const g = this.genome;
        const { inN, hidN, outN } = this;
        let w = 0;
        for (let h = 0; h < hidN; h++) {
            let sum = 0;
            for (let i = 0; i < inN; i++) sum += inputs[i] * g[w + h * inN + i];
            this._hidden[h] = Math.tanh(sum + g[inN * hidN + h]);
        }
        w = inN * hidN + hidN;
        for (let o = 0; o < outN; o++) {
            let sum = 0;
            for (let h = 0; h < hidN; h++) sum += this._hidden[h] * g[w + o * hidN + h];
            this._out[o] = Math.tanh(sum + g[w + hidN * outN + o]);
        }
        return this._out;
    }
}
