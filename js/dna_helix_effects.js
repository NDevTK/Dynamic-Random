/**
 * @file dna_helix_effects.js
 * @description Animated double-helix strands that twist and morph based on cursor
 * position. Base pairs glow and disconnect when the cursor passes through,
 * reforming behind. Multiple helices can orbit each other.
 *
 * Modes:
 * 0 - Classic DNA: Clean double helix with glowing base pairs
 * 1 - Mutation: Base pairs randomly change color and disconnect, cursor "heals" them
 * 2 - Transcription: A "read head" travels along the helix, leaving glowing copies
 * 3 - Helix Swarm: Many small helices that orbit the cursor like electrons
 * 4 - Unraveling: Helix slowly unzips from cursor position, rewinding behind
 * 5 - Braided Streams: 3+ strands braided together, flowing like rivers
 */

const TAU = Math.PI * 2;

export class DNAHelix {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this._helices = [];
        this._hue = 180;
        this._hue2 = 320;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._intensity = 1;
        this._readHeadPos = 0; // Mode 2
        this._copies = []; // Mode 2
        this._trailCanvas = null;
        this._trailCtx = null;
    }

    configure(rng, hues) {
        this.tick = 0;
        this.mode = Math.floor(rng() * 6);
        this._copies = [];
        this._readHeadPos = 0;

        this._hue = hues.length > 0 ? hues[0].h : Math.floor(rng() * 360);
        this._hue2 = hues.length > 1 ? hues[1].h : (this._hue + 120 + Math.floor(rng() * 60)) % 360;
        this._intensity = 0.5 + rng() * 0.5;

        const W = window.innerWidth;
        const H = window.innerHeight;

        this._helices = [];

        if (this.mode === 3) {
            // Many small helices orbiting
            const count = 8 + Math.floor(rng() * 8);
            for (let i = 0; i < count; i++) {
                this._helices.push({
                    cx: W / 2 + (rng() - 0.5) * W * 0.6,
                    cy: H / 2 + (rng() - 0.5) * H * 0.6,
                    radius: 20 + rng() * 40,
                    length: 15 + Math.floor(rng() * 20),
                    twist: 0.15 + rng() * 0.2,
                    speed: 0.01 + rng() * 0.02,
                    phase: rng() * TAU,
                    orbitRadius: 50 + rng() * 150,
                    orbitSpeed: 0.003 + rng() * 0.008,
                    orbitPhase: rng() * TAU,
                    hueOffset: rng() * 60 - 30,
                    vertical: rng() > 0.5,
                    basePairs: this._generateBasePairs(rng, 15 + Math.floor(rng() * 20)),
                });
            }
        } else if (this.mode === 5) {
            // Braided: 3-5 strands that weave around each other
            const strandCount = 3 + Math.floor(rng() * 3);
            const centerX = W / 2;
            const braidAmplitude = 40 + rng() * 40;
            for (let i = 0; i < strandCount; i++) {
                this._helices.push({
                    cx: centerX,
                    cy: H / 2,
                    radius: 25 + rng() * 30,
                    length: 50 + Math.floor(rng() * 30),
                    twist: 0.08 + rng() * 0.15,
                    speed: 0.008 + rng() * 0.012,
                    phase: (i / strandCount) * TAU,
                    orbitRadius: 0,
                    orbitSpeed: 0,
                    orbitPhase: 0,
                    hueOffset: i * (360 / strandCount),
                    vertical: true,
                    basePairs: this._generateBasePairs(rng, 50 + Math.floor(rng() * 30)),
                    braidIndex: i,
                    braidCount: strandCount,
                    braidAmplitude,
                });
            }
        } else {
            // 1-3 large helices
            const count = 1 + Math.floor(rng() * 2);
            for (let i = 0; i < count; i++) {
                const vertical = rng() > 0.4;
                this._helices.push({
                    cx: vertical ? W * (0.3 + i * 0.2 + rng() * 0.2) : W / 2,
                    cy: vertical ? H / 2 : H * (0.3 + i * 0.2 + rng() * 0.2),
                    radius: 40 + rng() * 60,
                    length: 50 + Math.floor(rng() * 40),
                    twist: 0.08 + rng() * 0.12,
                    speed: 0.005 + rng() * 0.015,
                    phase: rng() * TAU,
                    orbitRadius: 0,
                    orbitSpeed: 0,
                    orbitPhase: 0,
                    hueOffset: i * 40,
                    vertical,
                    basePairs: this._generateBasePairs(rng, 50 + Math.floor(rng() * 40)),
                });
            }
        }

        // Trail canvas
        const tw = Math.ceil(W / 2);
        const th = Math.ceil(H / 2);
        if (!this._trailCanvas || this._trailCanvas.width !== tw) {
            this._trailCanvas = document.createElement('canvas');
            this._trailCanvas.width = tw;
            this._trailCanvas.height = th;
            this._trailCtx = this._trailCanvas.getContext('2d', { alpha: true });
        }
        this._trailCtx.clearRect(0, 0, tw, th);
    }

    _generateBasePairs(rng, count) {
        const pairs = [];
        const nucleotides = ['A', 'T', 'G', 'C'];
        for (let i = 0; i < count; i++) {
            const type = Math.floor(rng() * 4);
            pairs.push({
                type,
                connected: true,
                glow: 0,
                mutated: this.mode === 1 && rng() < 0.15,
            });
        }
        return pairs;
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        const clickJust = isClicking && !this._wasClicking;
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Mode 2: advance read head (modulo basePairs count, not helix object length)
        if (this.mode === 2 && this._helices.length > 0) {
            this._readHeadPos = (this._readHeadPos + 0.3) % this._helices[0].basePairs.length;
        }

        for (const helix of this._helices) {
            // Mode 3: orbit around cursor
            if (this.mode === 3 && helix.orbitRadius > 0) {
                helix.orbitPhase += helix.orbitSpeed;
                const targetX = mx + Math.cos(helix.orbitPhase) * helix.orbitRadius;
                const targetY = my + Math.sin(helix.orbitPhase) * helix.orbitRadius;
                helix.cx += (targetX - helix.cx) * 0.03;
                helix.cy += (targetY - helix.cy) * 0.03;
            }

            helix.phase += helix.speed;

            // Update base pairs
            for (let i = 0; i < helix.basePairs.length; i++) {
                const bp = helix.basePairs[i];
                bp.glow *= 0.95;

                // Calculate position of this base pair
                const t = i / helix.basePairs.length;
                let bpX, bpY;
                if (helix.vertical) {
                    bpX = helix.cx;
                    bpY = helix.cy + (t - 0.5) * helix.basePairs.length * 12;
                } else {
                    bpX = helix.cx + (t - 0.5) * helix.basePairs.length * 12;
                    bpY = helix.cy;
                }

                const dx = mx - bpX;
                const dy = my - bpY;
                const distSq = dx * dx + dy * dy;

                // Cursor proximity effects
                if (distSq < 10000) { // 100px
                    const dist = Math.sqrt(distSq);
                    const influence = 1 - dist / 100;

                    if (this.mode === 0 || this.mode === 3) {
                        bp.glow = Math.max(bp.glow, influence);
                    } else if (this.mode === 1) {
                        // Heal mutations near cursor
                        if (bp.mutated && influence > 0.5) bp.mutated = false;
                    } else if (this.mode === 4) {
                        // Unzip
                        bp.connected = false;
                        bp.glow = influence * 0.8;
                    }
                } else if (this.mode === 4) {
                    // Re-zip far from cursor
                    if (!bp.connected && distSq > 40000) bp.connected = true;
                }

                // Mode 2: read head glow
                if (this.mode === 2) {
                    const readDist = Math.abs(i - this._readHeadPos);
                    if (readDist < 3) {
                        bp.glow = Math.max(bp.glow, 1 - readDist / 3);
                    }
                }

                // Click: burst glow
                if (clickJust && distSq < 40000) {
                    bp.glow = 1;
                    if (this.mode === 1) {
                        bp.mutated = !bp.mutated;
                    }
                }
            }
        }

        // Trail persistence — draw glowing nodes to trail for all modes
        if (this._trailCtx) {
            const tc = this._trailCtx;
            const tw = this._trailCanvas.width;
            const th = this._trailCanvas.height;
            tc.globalCompositeOperation = 'destination-out';
            tc.fillStyle = 'rgba(0,0,0,0.015)';
            tc.fillRect(0, 0, tw, th);

            tc.globalCompositeOperation = 'lighter';
            for (const helix of this._helices) {
                const bpCount = helix.basePairs.length;
                for (let i = 0; i < bpCount; i += 3) { // Every 3rd for perf
                    const bp = helix.basePairs[i];
                    if (bp.glow < 0.2) continue;
                    const t = i / bpCount;
                    const twistAngle = helix.phase + i * helix.twist;
                    const sx = Math.cos(twistAngle);
                    let braidOff = 0;
                    if (this.mode === 5 && helix.braidIndex !== undefined) {
                        const braidPhase = (helix.braidIndex / helix.braidCount) * TAU;
                        braidOff = Math.sin(t * TAU * 2 + braidPhase + helix.phase) * helix.braidAmplitude;
                    }
                    let px, py;
                    if (helix.vertical) {
                        px = helix.cx + braidOff + sx * helix.radius;
                        py = helix.cy + (t - 0.5) * bpCount * 12;
                    } else {
                        px = helix.cx + (t - 0.5) * bpCount * 12;
                        py = helix.cy + braidOff + sx * helix.radius;
                    }
                    const alpha = bp.glow * 0.12;
                    tc.fillStyle = `hsla(${(this._hue + helix.hueOffset) % 360}, 70%, 60%, ${alpha})`;
                    tc.beginPath();
                    tc.arc(px / 2, py / 2, 3, 0, TAU);
                    tc.fill();
                }
            }
        }
    }

    draw(ctx, system) {
        ctx.save();

        // Trail layer
        if (this._trailCanvas) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.4 * this._intensity;
            ctx.drawImage(this._trailCanvas, 0, 0, system.width, system.height);
            ctx.globalAlpha = 1;
        }

        ctx.globalCompositeOperation = 'lighter';

        const hue1 = this._hue;
        const hue2 = this._hue2;
        const intensity = this._intensity;
        const nucleotideColors = [0, 90, 200, 300]; // ATGC hue offsets

        for (const helix of this._helices) {
            const bpCount = helix.basePairs.length;
            const spacing = 12;

            for (let i = 0; i < bpCount; i++) {
                const bp = helix.basePairs[i];
                const t = i / bpCount;
                const twistAngle = helix.phase + i * helix.twist;

                // 3D projection of helix
                const strand1X = Math.cos(twistAngle);
                const strand2X = Math.cos(twistAngle + Math.PI);
                const depth1 = (Math.sin(twistAngle) + 1) / 2;
                const depth2 = (Math.sin(twistAngle + Math.PI) + 1) / 2;

                // Mode 4: unzipped strands drift apart
                const unzipDrift = (!bp.connected && this.mode === 4) ? (1 - bp.glow) * 15 : 0;

                // Mode 5: braid weaving — each strand oscillates horizontally
                let braidOffset = 0;
                if (this.mode === 5 && helix.braidIndex !== undefined) {
                    const braidPhase = (helix.braidIndex / helix.braidCount) * TAU;
                    braidOffset = Math.sin(t * TAU * 2 + braidPhase + helix.phase) * helix.braidAmplitude;
                }

                let x1, y1, x2, y2;
                if (helix.vertical) {
                    const baseY = helix.cy + (t - 0.5) * bpCount * spacing;
                    x1 = helix.cx + braidOffset + strand1X * helix.radius - unzipDrift;
                    y1 = baseY;
                    x2 = helix.cx + braidOffset + strand2X * helix.radius + unzipDrift;
                    y2 = baseY;
                } else {
                    const baseX = helix.cx + (t - 0.5) * bpCount * spacing;
                    x1 = baseX;
                    y1 = helix.cy + braidOffset + strand1X * helix.radius - unzipDrift;
                    x2 = baseX;
                    y2 = helix.cy + braidOffset + strand2X * helix.radius + unzipDrift;
                }

                const baseHue = (hue1 + helix.hueOffset) % 360;
                const nucHue = (baseHue + nucleotideColors[bp.type]) % 360;

                // Base pair connection line
                if (bp.connected) {
                    const connAlpha = (0.08 + bp.glow * 0.25) * intensity;
                    const connHue = bp.mutated ? (nucHue + 180) % 360 : nucHue;
                    ctx.strokeStyle = `hsla(${connHue}, 60%, 55%, ${connAlpha})`;
                    ctx.lineWidth = bp.mutated ? 2 : 1;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }

                // Strand 1 node
                const alpha1 = (0.15 + depth1 * 0.3 + bp.glow * 0.4) * intensity;
                const size1 = (2 + depth1 * 2) * (1 + bp.glow * 0.5);
                ctx.fillStyle = `hsla(${baseHue}, 70%, ${55 + depth1 * 25}%, ${alpha1})`;
                ctx.beginPath();
                ctx.arc(x1, y1, size1, 0, TAU);
                ctx.fill();

                // Strand 2 node
                const alpha2 = (0.15 + depth2 * 0.3 + bp.glow * 0.4) * intensity;
                const size2 = (2 + depth2 * 2) * (1 + bp.glow * 0.5);
                ctx.fillStyle = `hsla(${(baseHue + 60) % 360}, 70%, ${55 + depth2 * 25}%, ${alpha2})`;
                ctx.beginPath();
                ctx.arc(x2, y2, size2, 0, TAU);
                ctx.fill();

                // Glow halo when active
                if (bp.glow > 0.3) {
                    ctx.fillStyle = `hsla(${nucHue}, 80%, 70%, ${bp.glow * 0.08 * intensity})`;
                    ctx.beginPath();
                    ctx.arc((x1 + x2) / 2, (y1 + y2) / 2, helix.radius * 0.8, 0, TAU);
                    ctx.fill();
                }

                // Mode 2: copy trail at read head
                if (this.mode === 2 && bp.glow > 0.5 && this._trailCtx) {
                    const tc = this._trailCtx;
                    tc.globalCompositeOperation = 'lighter';
                    tc.fillStyle = `hsla(${nucHue}, 80%, 60%, 0.15)`;
                    tc.beginPath();
                    tc.arc(x1 / 2 + 10, y1 / 2, 3, 0, TAU);
                    tc.fill();
                    tc.beginPath();
                    tc.arc(x2 / 2 + 10, y2 / 2, 3, 0, TAU);
                    tc.fill();
                }
            }

            // Draw backbone curves for strand continuity
            if (bpCount > 2) {
                ctx.lineWidth = 1.5;
                const backboneHue = (hue1 + helix.hueOffset) % 360;
                for (let strand = 0; strand < 2; strand++) {
                    ctx.strokeStyle = `hsla(${(backboneHue + strand * 60) % 360}, 50%, 55%, ${0.12 * intensity})`;
                    ctx.beginPath();
                    for (let i = 0; i < bpCount; i++) {
                        const t = i / bpCount;
                        const twistAngle = helix.phase + i * helix.twist + strand * Math.PI;
                        const strandX = Math.cos(twistAngle);

                        let px, py;
                        if (helix.vertical) {
                            px = helix.cx + strandX * helix.radius;
                            py = helix.cy + (t - 0.5) * bpCount * spacing;
                        } else {
                            px = helix.cx + (t - 0.5) * bpCount * spacing;
                            py = helix.cy + strandX * helix.radius;
                        }

                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.stroke();
                }
            }
        }

        ctx.restore();
    }
}
