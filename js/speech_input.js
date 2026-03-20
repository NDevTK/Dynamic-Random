/**
 * @file speech_input.js
 * @description Singleton input system wrapping the Web Speech Recognition API.
 * Tracks recognized words, energy decay, sentiment, word rate, and speaking state.
 * Requires user activation before listening begins; degrades gracefully when
 * the API is unavailable.
 */

const POSITIVE_WORDS = new Set([
    'happy', 'love', 'great', 'good', 'joy', 'wonderful', 'amazing', 'beautiful',
    'excellent', 'fantastic', 'awesome', 'brilliant', 'bright', 'hope', 'peace',
    'laugh', 'smile', 'nice', 'fun', 'yes', 'perfect', 'lovely', 'light', 'warm',
]);

const NEGATIVE_WORDS = new Set([
    'sad', 'dark', 'bad', 'hate', 'ugly', 'terrible', 'horrible', 'awful',
    'dreadful', 'miserable', 'depressed', 'angry', 'fear', 'hurt', 'pain',
    'wrong', 'no', 'never', 'loss', 'cold', 'dead', 'broken', 'fail',
]);

const MAX_WORDS        = 20;
const ENERGY_DECAY_SEC = 3.0;    // energy falls from 1.0 to 0 over this duration
const WORD_RATE_WINDOW = 5000;   // ms — window used for wordRate calculation

export const speechInput = {
    // --- public state ---
    active:      false,
    isSpeaking:  false,
    currentWord: '',
    words:       [],           // [{ text, confidence, timestamp, energy }]
    sentiment:   'neutral',    // 'positive' | 'negative' | 'neutral'
    wordRate:    0,            // words per second over last 5 s

    // --- private ---
    _recognition:   null,
    _lastFrameTime: null,

    // -----------------------------------------------------------------------
    // init — called during application setup; intentionally passive
    // -----------------------------------------------------------------------
    init() {
        // Nothing here by design: do not prompt for microphone permission
        // until the user explicitly calls activate().
        this._lastFrameTime = performance.now();
    },

    // -----------------------------------------------------------------------
    // activate — begin listening
    // -----------------------------------------------------------------------
    activate() {
        if (this.active) return;

        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn(
                '[speechInput] Web Speech Recognition API is not available in this browser.'
            );
            return;
        }

        this.active = true;

        const rec = new SpeechRecognition();
        rec.continuous      = true;
        rec.interimResults  = true;
        rec.lang            = 'en-US';

        // ---- event handlers ----

        rec.onstart = () => {
            this.isSpeaking = true;
        };

        rec.onspeechstart = () => {
            this.isSpeaking = true;
        };

        rec.onspeechend = () => {
            this.isSpeaking = false;
        };

        rec.onresult = (event) => {
            // Walk all new results since the last index
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result     = event.results[i];
                const transcript = result[0].transcript.trim();
                const confidence = result[0].confidence ?? 1.0;
                const isFinal    = result.isFinal;

                if (!transcript) continue;

                // Tokenise the transcript into individual words
                const tokens = transcript.split(/\s+/).filter(Boolean);

                tokens.forEach((rawToken) => {
                    const text = rawToken.toLowerCase().replace(/[^a-z']/g, '');
                    if (!text) return;

                    const entry = {
                        text,
                        confidence: isFinal ? confidence : confidence * 0.6,
                        timestamp:  Date.now(),
                        energy:     1.0,
                    };

                    this.words.push(entry);
                    if (this.words.length > MAX_WORDS) {
                        this.words.shift();
                    }

                    this.currentWord = text;
                });

                // Update derived state after processing the result
                this._updateSentiment();
                this._updateWordRate();
            }
        };

        rec.onerror = (event) => {
            // 'no-speech' and 'aborted' are routine; others are worth logging
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                console.warn('[speechInput] Recognition error:', event.error);
            }
        };

        rec.onend = () => {
            this.isSpeaking = false;
            // Auto-restart to maintain continuous listening
            if (this.active) {
                try {
                    rec.start();
                } catch (e) {
                    // start() throws if recognition is already started; ignore
                }
            }
        };

        this._recognition = rec;

        try {
            rec.start();
        } catch (e) {
            console.warn('[speechInput] Could not start recognition:', e);
        }
    },

    // -----------------------------------------------------------------------
    // deactivate — stop listening
    // -----------------------------------------------------------------------
    deactivate() {
        if (!this.active) return;
        this.active     = false;
        this.isSpeaking = false;

        if (this._recognition) {
            try {
                this._recognition.stop();
            } catch (e) {
                // ignore if already stopped
            }
            this._recognition = null;
        }
    },

    // -----------------------------------------------------------------------
    // update — call once per animation frame
    // -----------------------------------------------------------------------
    update() {
        const now   = performance.now();
        const delta = this._lastFrameTime !== null
            ? (now - this._lastFrameTime) / 1000   // seconds
            : 0;
        this._lastFrameTime = now;

        if (delta <= 0) return;

        // Decay energy for every tracked word
        const decayRate = 1.0 / ENERGY_DECAY_SEC;  // units per second

        for (const word of this.words) {
            word.energy = Math.max(0, word.energy - decayRate * delta);
        }

        // Optionally refresh wordRate each frame so callers always get a fresh value
        this._updateWordRate();
    },

    // -----------------------------------------------------------------------
    // _updateSentiment — private
    // -----------------------------------------------------------------------
    _updateSentiment() {
        let positive = 0;
        let negative = 0;

        for (const word of this.words) {
            if (POSITIVE_WORDS.has(word.text)) positive++;
            else if (NEGATIVE_WORDS.has(word.text)) negative++;
        }

        if (positive > negative) {
            this.sentiment = 'positive';
        } else if (negative > positive) {
            this.sentiment = 'negative';
        } else {
            this.sentiment = 'neutral';
        }
    },

    // -----------------------------------------------------------------------
    // _updateWordRate — private
    // -----------------------------------------------------------------------
    _updateWordRate() {
        const cutoff = Date.now() - WORD_RATE_WINDOW;
        const recent = this.words.filter(w => w.timestamp >= cutoff);
        this.wordRate = recent.length / (WORD_RATE_WINDOW / 1000);  // words/sec
    },
};
