/**
 * @file gamepad_input.js
 * @description Gamepad API integration.
 * Provides normalized stick, trigger, and button values from a connected gamepad.
 * Falls back gracefully when no Gamepad API is available (all values stay at defaults).
 * Uses the standard gamepad mapping.
 */

export const gamepadInput = {
    connected: false,
    leftStick: { x: 0, y: 0 },
    rightStick: { x: 0, y: 0 },
    triggers: { left: 0, right: 0 },
    buttons: {
        a: false,
        b: false,
        x: false,
        y: false,
        lb: false,
        rb: false,
        start: false,
        select: false,
        dpadUp: false,
        dpadDown: false,
        dpadLeft: false,
        dpadRight: false,
    },

    _deadzone: 0.15,
    _gamepadIndex: null,
    _initialized: false,

    /**
     * Call once at startup to register gamepad connection events.
     */
    init() {
        if (this._initialized) return;
        this._initialized = true;

        if (!('getGamepads' in navigator)) return;

        window.addEventListener('gamepadconnected', (e) => {
            // Use the first connected gamepad unless one is already active
            if (this._gamepadIndex === null) {
                this._gamepadIndex = e.gamepad.index;
                this.connected = true;
            }
        });

        window.addEventListener('gamepaddisconnected', (e) => {
            if (e.gamepad.index === this._gamepadIndex) {
                this._gamepadIndex = null;
                this.connected = false;
                this._resetState();
            }
        });
    },

    /**
     * Call once per frame to poll the current gamepad state.
     */
    update() {
        if (!('getGamepads' in navigator)) return;

        const gamepads = navigator.getGamepads();

        // If a specific gamepad was connected, prefer it; otherwise scan for any active pad
        let pad = this._gamepadIndex !== null ? gamepads[this._gamepadIndex] : null;

        if (!pad) {
            // Try to pick up a gamepad that may have connected without a fired event
            for (let i = 0; i < gamepads.length; i++) {
                if (gamepads[i]) {
                    pad = gamepads[i];
                    this._gamepadIndex = pad.index;
                    this.connected = true;
                    break;
                }
            }
        }

        if (!pad) {
            if (this.connected) {
                this.connected = false;
                this._resetState();
            }
            return;
        }

        this.connected = true;

        // --- Axes ---
        // Standard mapping: axes[0]=leftX, axes[1]=leftY, axes[2]=rightX, axes[3]=rightY
        this.leftStick.x  = this._applyDeadzone(pad.axes[0] ?? 0);
        this.leftStick.y  = this._applyDeadzone(pad.axes[1] ?? 0);
        this.rightStick.x = this._applyDeadzone(pad.axes[2] ?? 0);
        this.rightStick.y = this._applyDeadzone(pad.axes[3] ?? 0);

        // --- Triggers ---
        // Standard mapping: buttons[6]=LT, buttons[7]=RT
        this.triggers.left  = pad.buttons[6] ? pad.buttons[6].value : 0;
        this.triggers.right = pad.buttons[7] ? pad.buttons[7].value : 0;

        // --- Face buttons & extras ---
        // Standard mapping:
        //   0=A, 1=B, 2=X, 3=Y
        //   4=LB, 5=RB
        //   8=Select/Back, 9=Start
        //   12=DpadUp, 13=DpadDown, 14=DpadLeft, 15=DpadRight
        const b = pad.buttons;
        this.buttons.a          = this._pressed(b[0]);
        this.buttons.b          = this._pressed(b[1]);
        this.buttons.x          = this._pressed(b[2]);
        this.buttons.y          = this._pressed(b[3]);
        this.buttons.lb         = this._pressed(b[4]);
        this.buttons.rb         = this._pressed(b[5]);
        this.buttons.select     = this._pressed(b[8]);
        this.buttons.start      = this._pressed(b[9]);
        this.buttons.dpadUp     = this._pressed(b[12]);
        this.buttons.dpadDown   = this._pressed(b[13]);
        this.buttons.dpadLeft   = this._pressed(b[14]);
        this.buttons.dpadRight  = this._pressed(b[15]);
    },

    /**
     * Trigger rumble on the active gamepad if the vibrationActuator API is available.
     * @param {number} duration   Duration in milliseconds.
     * @param {number} strongMag  Strong motor magnitude, 0–1 (default 1).
     * @param {number} weakMag    Weak motor magnitude, 0–1 (default 0.5).
     */
    vibrate(duration = 200, strongMag = 1, weakMag = 0.5) {
        if (this._gamepadIndex === null) return;

        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const pad = gamepads[this._gamepadIndex];
        if (!pad) return;

        if (pad.vibrationActuator && typeof pad.vibrationActuator.playEffect === 'function') {
            pad.vibrationActuator.playEffect('dual-rumble', {
                startDelay: 0,
                duration,
                weakMagnitude: weakMag,
                strongMagnitude: strongMag,
            });
        }
    },

    // --- Private helpers ---

    _applyDeadzone(val) {
        return Math.abs(val) < this._deadzone ? 0 : val;
    },

    _pressed(button) {
        if (!button) return false;
        return typeof button === 'object' ? button.pressed : button === 1;
    },

    _resetState() {
        this.leftStick.x        = 0;
        this.leftStick.y        = 0;
        this.rightStick.x       = 0;
        this.rightStick.y       = 0;
        this.triggers.left      = 0;
        this.triggers.right     = 0;
        for (const key of Object.keys(this.buttons)) {
            this.buttons[key] = false;
        }
    },
};
