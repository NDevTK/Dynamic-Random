/**
 * @file midi_input.js
 * @description Web MIDI input: plug in a hardware controller and play the
 * universe like an instrument. Knobs/faders (CC messages) are auto-learned
 * into 8 slots in the order you first touch them; notes strike shockwaves
 * positioned by pitch and sized by velocity; the mod wheel leans on warp.
 *
 * Consumers read per-frame state (background.js applies it like micReactive):
 *  - knobs[0..7]  : 0..1, NaN until that slot is learned
 *  - modWheel     : 0..1
 *  - pitchBend    : -1..1
 *  - drainNotes() : note-on events since last frame [{ note, velocity }]
 *
 * Follows the permission-gated input singleton pattern (mic/camera/speech):
 * nothing is requested until the user activates it from the toolbar.
 */

export const midiInput = {
    supported: typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator,
    active: false,
    deviceName: '',
    knobs: new Float32Array(8).fill(NaN),
    modWheel: 0,
    pitchBend: 0,

    _access: null,
    _ccSlots: new Map(), // cc number -> knob slot, learned in touch order
    _notes: [],

    async activate() {
        if (!this.supported) throw new Error('Web MIDI not supported');
        if (this.active) return;
        this._access = await navigator.requestMIDIAccess({ sysex: false });
        this._attachAll();
        this._access.onstatechange = () => this._attachAll();
        this.active = true;
    },

    deactivate() {
        if (this._access) {
            for (const input of this._access.inputs.values()) input.onmidimessage = null;
            this._access.onstatechange = null;
            this._access = null;
        }
        this.active = false;
        this.deviceName = '';
        this.knobs.fill(NaN);
        this._ccSlots.clear();
        this._notes.length = 0;
        this.modWheel = 0;
        this.pitchBend = 0;
    },

    _attachAll() {
        if (!this._access) return;
        const names = [];
        for (const input of this._access.inputs.values()) {
            input.onmidimessage = (e) => this._onMessage(e);
            names.push(input.name || 'MIDI device');
        }
        this.deviceName = names.join(', ');
    },

    _onMessage(e) {
        const data = e.data;
        if (!data || data.length < 2) return;
        const type = data[0] & 0xF0;
        if (type === 0x90 && data[2] > 0) {
            // Note on
            if (this._notes.length < 32) {
                this._notes.push({ note: data[1], velocity: data[2] / 127 });
            }
        } else if (type === 0xB0) {
            const cc = data[1];
            const value = data[2] / 127;
            if (cc === 1) {
                this.modWheel = value;
                return;
            }
            // Auto-learn: first 8 distinct CCs become knob slots
            let slot = this._ccSlots.get(cc);
            if (slot === undefined && this._ccSlots.size < 8) {
                slot = this._ccSlots.size;
                this._ccSlots.set(cc, slot);
            }
            if (slot !== undefined) this.knobs[slot] = value;
        } else if (type === 0xE0 && data.length >= 3) {
            // Pitch bend: 14-bit centered on 8192
            this.pitchBend = ((data[2] << 7) | data[1]) / 8192 - 1;
        }
    },

    /** Return and clear note-on events accumulated since the last frame. */
    drainNotes() {
        if (this._notes.length === 0) return this._notes;
        const out = this._notes.slice();
        this._notes.length = 0;
        return out;
    },
};
