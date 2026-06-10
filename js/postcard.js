/**
 * @file postcard.js
 * @description Press O to keep a souvenir: composes the live render layers
 * into a framed postcard PNG, captioned with the universe's field-guide
 * epithet and surveyor's note (lore_codex.js), the seed, and its epoch and
 * generation (epoch_system.js). A screenshot is data; a postcard is a story.
 */

import { currentSeed } from './state.js';
import { screenshot } from './screenshot.js';
import { loreCodex } from './lore_codex.js';
import { epochSystem, toRoman } from './epoch_system.js';

const CARD_W = 1400;
const CARD_H = 1050;
const MARGIN = 64;
const CAPTION_H = 190;

function wrapText(ctx, text, maxWidth, maxLines) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
        const probe = line ? line + ' ' + word : word;
        if (ctx.measureText(probe).width > maxWidth && line) {
            lines.push(line);
            line = word;
            if (lines.length === maxLines - 1) break;
        } else {
            line = probe;
        }
    }
    if (line && lines.length < maxLines) lines.push(line);
    return lines;
}

export const postcard = {
    _link: null,

    init() {
        this._link = document.createElement('a');
        this._link.style.display = 'none';
        document.body.appendChild(this._link);

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'o' && e.key !== 'O') return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const el = document.activeElement;
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
            this.download();
            screenshot.showFlash();
        });
    },

    compose() {
        const card = document.createElement('canvas');
        card.width = CARD_W;
        card.height = CARD_H;
        const ctx = card.getContext('2d');

        // Card stock
        ctx.fillStyle = '#0b0b12';
        ctx.fillRect(0, 0, CARD_W, CARD_H);

        // Art window: cover-fit the live composite
        const artX = MARGIN;
        const artY = MARGIN;
        const artW = CARD_W - MARGIN * 2;
        const artH = CARD_H - MARGIN * 2 - CAPTION_H;
        ctx.fillStyle = '#000';
        ctx.fillRect(artX, artY, artW, artH);
        ctx.save();
        ctx.beginPath();
        ctx.rect(artX, artY, artW, artH);
        ctx.clip();
        const srcW = window.innerWidth;
        const srcH = window.innerHeight;
        const scale = Math.max(artW / srcW, artH / srcH);
        const dw = srcW * scale;
        const dh = srcH * scale;
        const dx = artX + (artW - dw) / 2;
        const dy = artY + (artH - dh) / 2;
        for (const layer of screenshot.collectLayers()) {
            try {
                ctx.drawImage(layer, dx, dy, dw, dh);
            } catch (err) {
                console.warn('[postcard] Could not draw layer:', err.message ?? err);
            }
        }
        ctx.restore();

        // Frame: outer hairline + corner ticks
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(artX - 8.5, artY - 8.5, artW + 17, artH + CAPTION_H - 20 + 17);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        const tick = 22;
        for (const [cx, cy, sx, sy] of [
            [artX - 8, artY - 8, 1, 1],
            [artX + artW + 8, artY - 8, -1, 1],
            [artX - 8, artY + artH + CAPTION_H - 20 + 8, 1, -1],
            [artX + artW + 8, artY + artH + CAPTION_H - 20 + 8, -1, -1],
        ]) {
            ctx.beginPath();
            ctx.moveTo(cx + sx * tick, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy + sy * tick);
            ctx.stroke();
        }

        // Caption block
        const lore = loreCodex.current;
        const capY = artY + artH + 44;
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.font = 'italic 30px "Exo 2", Georgia, serif';
        ctx.fillText(lore ? lore.epithet : '“An Uncharted Reach”', artX + 4, capY);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.font = '17px "Exo 2", Georgia, serif';
        const noteLines = wrapText(ctx, lore ? lore.note : '', artW - 360, 2);
        noteLines.forEach((line, i) => ctx.fillText(line, artX + 4, capY + 32 + i * 24));

        // Provenance, bottom-right: seed · generation · epoch
        const gen = epochSystem.current.generation;
        const provenance = [
            currentSeed || 'UNKNOWN',
            gen > 1 ? `Gen ${toRoman(gen)}` : '',
            epochSystem.current.name,
        ].filter(Boolean).join('  ·  ');
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.font = '14px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(provenance, artX + artW - 4, capY + 32 + 24);
        ctx.textAlign = 'left';

        return card;
    },

    download() {
        const card = this.compose();
        card.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            this._link.href = url;
            const seed = (currentSeed || 'universe').replace(/[^\w-]/g, '');
            this._link.download = `celestial-postcard-${seed}.png`;
            this._link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, 'image/png');
    },
};
