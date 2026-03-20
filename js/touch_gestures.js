/**
 * @file touch_gestures.js
 * @description Singleton for mobile touch gesture handling.
 * Tracks single-touch, pinch-zoom, rotation, swipe, long-press, and double-tap.
 */

import { mouse } from './state.js';

const SMOOTH = 0.2;

export const touchGestures = {
    pinchScale: 1.0,
    rotation: 0,
    swipeDirection: null,
    longPress: false,
    doubleTap: false,

    _touches: new Map(),
    _initialized: false,
    _initDist: null, _initAngle: null, _rawScale: 1.0, _rawRotation: 0,
    _swipeStart: null,
    _longPressTimer: null, _longPressOrigin: null,
    _lastTap: null,
    _longPressRead: false, _doubleTapRead: false,

    init() {
        if (this._initialized) return;
        this._initialized = true;
        document.addEventListener('touchstart',  (e) => this._onStart(e), { passive: false });
        document.addEventListener('touchmove',   (e) => this._onMove(e),  { passive: false });
        document.addEventListener('touchend',    (e) => this._onEnd(e),   { passive: true });
        document.addEventListener('touchcancel', (e) => this._onEnd(e),   { passive: true });
    },

    _onStart(e) {
        for (const t of e.changedTouches) this._touches.set(t.identifier, { x: t.clientX, y: t.clientY });
        if (this._touches.size === 1) {
            const t = e.changedTouches[0];
            this._swipeStart = { x: t.clientX, y: t.clientY, time: Date.now() };
            this._longPressOrigin = { x: t.clientX, y: t.clientY };
            this._longPressTimer = setTimeout(() => { this.longPress = true; this._longPressRead = false; }, 500);
        }
        if (this._touches.size >= 2) {
            e.preventDefault();
            this._cancelLongPress();
            const [a, b] = this._two();
            this._initDist = this._dist(a, b);
            this._initAngle = this._angle(a, b);
            this._rawScale = this.pinchScale;
            this._rawRotation = this.rotation;
        }
    },

    _onMove(e) {
        for (const t of e.changedTouches) this._touches.set(t.identifier, { x: t.clientX, y: t.clientY });
        if (this._touches.size === 1) {
            const [a] = this._touches.values();
            mouse.x = a.x; mouse.y = a.y;
            if (this._longPressOrigin) {
                const dx = a.x - this._longPressOrigin.x, dy = a.y - this._longPressOrigin.y;
                if (dx * dx + dy * dy > 100) this._cancelLongPress();
            }
        }
        if (this._touches.size >= 2) {
            e.preventDefault();
            const [a, b] = this._two();
            const targetScale = Math.min(3.0, Math.max(0.5, (this._dist(a, b) / this._initDist) * this._rawScale));
            this.pinchScale += (targetScale - this.pinchScale) * SMOOTH;
            const targetRot = this._rawRotation + (this._angle(a, b) - this._initAngle);
            this.rotation += (targetRot - this.rotation) * SMOOTH;
        }
    },

    _onEnd(e) {
        for (const t of e.changedTouches) this._touches.delete(t.identifier);
        if (this._touches.size < 2) { this._initDist = null; this._initAngle = null; }
        if (this._touches.size === 0) {
            this._cancelLongPress();
            if (this._swipeStart && e.changedTouches.length === 1) {
                const t = e.changedTouches[0];
                const dx = t.clientX - this._swipeStart.x, dy = t.clientY - this._swipeStart.y;
                if (Date.now() - this._swipeStart.time < 300 && Math.abs(dx) > 100 && Math.abs(dy) < 50)
                    this.swipeDirection = dx < 0 ? 'left' : 'right';
            }
            this._swipeStart = null;
            const now = Date.now(), t = e.changedTouches[0];
            if (!t) return;
            if (this._lastTap) {
                const dx = t.clientX - this._lastTap.x, dy = t.clientY - this._lastTap.y;
                if (now - this._lastTap.time < 300 && dx * dx + dy * dy < 900) {
                    this.doubleTap = true; this._doubleTapRead = false; this._lastTap = null; return;
                }
            }
            this._lastTap = { x: t.clientX, y: t.clientY, time: now };
        }
    },

    update() {
        if (this._longPressRead)  { this.longPress = false;  this._longPressRead = false; }
        if (this.longPress)  this._longPressRead = true;
        if (this._doubleTapRead) { this.doubleTap = false; this._doubleTapRead = false; }
        if (this.doubleTap)  this._doubleTapRead = true;
        // swipeDirection resets after consumer reads it (done via getter pattern using null sentinel)
    },

    reset() {
        this.pinchScale = 1.0; this.rotation = 0;
        this._rawScale = 1.0;  this._rawRotation = 0;
    },

    _cancelLongPress() {
        clearTimeout(this._longPressTimer);
        this._longPressTimer = null; this._longPressOrigin = null;
    },
    _two()         { const v = [...this._touches.values()]; return [v[0], v[1]]; },
    _dist(a, b)    { const dx = b.x - a.x, dy = b.y - a.y; return Math.sqrt(dx * dx + dy * dy); },
    _angle(a, b)   { return Math.atan2(b.y - a.y, b.x - a.x); },
};
