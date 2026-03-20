/**
 * tab_sync.js
 * Singleton system for multi-tab synchronization using BroadcastChannel API.
 * Tracks active tabs via heartbeats, elects a leader (lowest tabId),
 * and provides effect/state broadcasting across tabs.
 */

const CHANNEL_NAME = 'celestial-canvas-sync';
const HEARTBEAT_INTERVAL_MS = 2000;
const TAB_PRUNE_AFTER_MS = 6000;

export const tabSync = {
    tabId: null,
    tabCount: 1,
    isLeader: true,
    sharedState: {},

    _channel: null,
    _heartbeatTimer: null,
    _pruneTimer: null,
    _activeTabs: {},   // { [tabId]: lastSeenTimestamp }
    _effectCallbacks: [],
    _supported: false,

    /**
     * Initialize the sync system. Safe to call once on page load.
     */
    init() {
        this.tabId = _generateTabId();
        this._activeTabs[this.tabId] = Date.now();

        if (typeof BroadcastChannel === 'undefined') {
            // Graceful degradation: single-tab mode
            this._supported = false;
            this.tabCount = 1;
            this.isLeader = true;
            return;
        }

        this._supported = true;
        this._channel = new BroadcastChannel(CHANNEL_NAME);
        this._channel.onmessage = (event) => this._handleMessage(event.data);

        // Announce arrival
        this._broadcast({ type: 'join', tabId: this.tabId });

        // Start heartbeat
        this._heartbeatTimer = setInterval(() => {
            this._broadcast({ type: 'heartbeat', tabId: this.tabId });
            this._pruneStaleTabs();
        }, HEARTBEAT_INTERVAL_MS);

        // Broadcast leave on tab close/navigate
        window.addEventListener('beforeunload', () => this._onUnload());
    },

    /**
     * Broadcast an effect to all other tabs.
     * @param {string} effectName
     * @param {*} data  Keep lightweight — primitives or small plain objects only.
     */
    sendEffect(effectName, data) {
        if (!this._supported) return;
        this._broadcast({ type: 'effect', tabId: this.tabId, effectName, data });
    },

    /**
     * Register a callback to receive incoming effects from other tabs.
     * @param {function} callback  Called with (effectName, data, senderTabId)
     */
    onEffect(callback) {
        if (typeof callback === 'function') {
            this._effectCallbacks.push(callback);
        }
    },

    /**
     * Send the given state object to all other tabs.
     * @param {object} stateObj  Keep lightweight.
     */
    broadcastState(stateObj) {
        if (!this._supported) return;
        Object.assign(this.sharedState, stateObj);
        this._broadcast({ type: 'sync-state', tabId: this.tabId, state: stateObj });
    },

    // ------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------

    _broadcast(message) {
        if (this._channel) {
            try {
                this._channel.postMessage(message);
            } catch {
                // Channel may have been closed; ignore silently.
            }
        }
    },

    _handleMessage(data) {
        if (!data || !data.type || !data.tabId) return;
        const { type, tabId } = data;

        switch (type) {
            case 'join':
                this._activeTabs[tabId] = Date.now();
                this._updateDerivedState();
                // Respond with a heartbeat so the joining tab knows we exist.
                this._broadcast({ type: 'heartbeat', tabId: this.tabId });
                break;

            case 'leave':
                delete this._activeTabs[tabId];
                this._updateDerivedState();
                break;

            case 'heartbeat':
                this._activeTabs[tabId] = Date.now();
                this._updateDerivedState();
                break;

            case 'sync-state':
                if (data.state && typeof data.state === 'object') {
                    Object.assign(this.sharedState, data.state);
                }
                break;

            case 'effect':
                if (data.effectName) {
                    for (const cb of this._effectCallbacks) {
                        try {
                            cb(data.effectName, data.data, tabId);
                        } catch (err) {
                            console.error('[tab_sync] Effect callback error:', err);
                        }
                    }
                }
                break;

            default:
                break;
        }
    },

    _pruneStaleTabs() {
        const now = Date.now();
        let pruned = false;
        for (const id of Object.keys(this._activeTabs)) {
            if (id !== this.tabId && now - this._activeTabs[id] > TAB_PRUNE_AFTER_MS) {
                delete this._activeTabs[id];
                pruned = true;
            }
        }
        if (pruned) this._updateDerivedState();
    },

    _updateDerivedState() {
        // Always include this tab
        this._activeTabs[this.tabId] = this._activeTabs[this.tabId] || Date.now();

        const ids = Object.keys(this._activeTabs);
        this.tabCount = ids.length;

        // Leader = alphabetically lowest tabId (deterministic across all tabs)
        ids.sort();
        this.isLeader = ids[0] === this.tabId;
    },

    _onUnload() {
        this._broadcast({ type: 'leave', tabId: this.tabId });

        if (this._heartbeatTimer !== null) {
            clearInterval(this._heartbeatTimer);
            this._heartbeatTimer = null;
        }

        if (this._channel) {
            this._channel.close();
            this._channel = null;
        }
    },
};

// ------------------------------------------------------------------
// Module-level utility (not exported)
// ------------------------------------------------------------------

function _generateTabId() {
    // Compact, collision-resistant identifier: timestamp + random suffix
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}
