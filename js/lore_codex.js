/**
 * @file lore_codex.js
 * @description Procedural field guide: every universe gets a deterministic
 * epithet ("The Drowned Chandelier") and a surveyor's field note written by a
 * seeded grammar, themed to the active blueprint. Pure text generation — no
 * DOM — so the HUD just reads `loreCodex.current`.
 */

/** Map each blueprint to a lore theme bank. Unknown blueprints fall back to 'cosmic'. */
const BLUEPRINT_THEME = {
    Classical: 'cosmic', StarForged: 'cosmic', StellarNursery: 'cosmic',
    CelestialForge: 'cosmic', LivingConstellation: 'cosmic', ChronoVerse: 'temporal',
    PhantomEcho: 'temporal', HauntedRealm: 'void', VoidTouched: 'void',
    Eldritch: 'void', AbyssalHorror: 'void', QuantumFoam: 'temporal',
    Organic: 'organic', BioMechanical: 'organic', SentientSwarm: 'organic',
    FungalForest: 'organic', CoralReef: 'aquatic', AbyssalZone: 'aquatic',
    GlassySea: 'aquatic', GooeyMess: 'organic', Digital: 'digital',
    TechnoUtopia: 'digital', NeonCyber: 'digital', Crystalline: 'crystal',
    GlacialDrift: 'crystal', ArcaneCodex: 'crystal', Papercraft: 'craft',
    SilkWeaver: 'craft', Painterly: 'craft', LivingInk: 'craft',
    ChromaticAberration: 'craft', MoltenHeart: 'fire', VolcanicForge: 'fire',
    SonicScapes: 'sonic', Aetherial: 'ethereal',
};

const EPITHET_ADJ = {
    cosmic: ['Unblinking', 'Ten-Thousand-Year', 'Slow-Burning', 'Orphaned', 'Cartwheeling', 'Half-Lit'],
    temporal: ['Twice-Remembered', 'Unfinished', 'Rewound', 'Borrowed', 'Out-of-Step', 'Yesterday’s'],
    void: ['Drowned', 'Hollow', 'Unspoken', 'Inverted', 'Sleepless', 'Forgotten'],
    organic: ['Budding', 'Overgrown', 'Breathing', 'Many-Handed', 'Spored', 'Warm-Blooded'],
    aquatic: ['Tide-Locked', 'Brackish', 'Pearl-Bottomed', 'Slow-Sinking', 'Bioluminous', 'Drift-Borne'],
    digital: ['Self-Compiling', 'Checksummed', 'Overclocked', 'Mirrorless', 'Hot-Swapped', 'Procedural'],
    crystal: ['Faceted', 'Annealed', 'Prismatic', 'Frost-Veined', 'Lapidary', 'Unmelting'],
    craft: ['Hand-Folded', 'Unvarnished', 'Loose-Threaded', 'Overpainted', 'Dog-Eared', 'Freshly-Inked'],
    fire: ['Smoldering', 'Anvil-Bright', 'Cinder-Choked', 'Twice-Forged', 'Unquenched', 'Bellowed'],
    sonic: ['Resonant', 'Off-Key', 'Twelve-Toned', 'Echo-Laden', 'Tuned', 'Reverberant'],
    ethereal: ['Gossamer', 'Half-Dreamt', 'Featherweight', 'Dawn-Colored', 'Translucent', 'Hushed'],
};

const EPITHET_NOUN = {
    cosmic: ['Carousel', 'Lighthouse', 'Orrery', 'Atlas', 'Furnace', 'Procession'],
    temporal: ['Metronome', 'Palimpsest', 'Antechamber', 'Rehearsal', 'Calendar', 'Pendulum'],
    void: ['Chandelier', 'Cathedral', 'Aquifer', 'Reliquary', 'Audience', 'Door'],
    organic: ['Garden', 'Hive', 'Rookery', 'Orchard', 'Menagerie', 'Root-Cellar'],
    aquatic: ['Lagoon', 'Ballroom', 'Shipyard', 'Estuary', 'Aquarium', 'Undertow'],
    digital: ['Mainframe', 'Arcade', 'Switchboard', 'Archive', 'Bazaar', 'Compiler'],
    crystal: ['Geode', 'Conservatory', 'Chandlery', 'Vault', 'Terrarium', 'Mosaic'],
    craft: ['Atelier', 'Diorama', 'Loom', 'Sketchbook', 'Marionette', 'Bindery'],
    fire: ['Foundry', 'Hearth', 'Kiln', 'Procession', 'Crucible', 'Parade'],
    sonic: ['Choir', 'Carillon', 'Amphitheater', 'Tuning-Fork', 'Jukebox', 'Aviary'],
    ethereal: ['Veil', 'Greenhouse', 'Balloon-Field', 'Apiary', 'Cloudbank', 'Lullaby'],
};

const SURVEYORS = [
    'the Cartographer Adrift', 'Survey Barge “Second Thoughts”', 'an unmanned lantern probe',
    'the Sisters of the Measured Mile', 'a retired comet-courier', 'the Bureau of Improbable Weather',
    'deep-field monk-astronomers', 'the lighthouse keeper at Relay 9',
];

const OBSERVATIONS = {
    cosmic: [
        'Stars here set in pairs, out of politeness.',
        'Gravity files a complaint roughly every third orbit.',
        'The nebulae rearrange themselves when nobody charts them.',
    ],
    temporal: [
        'Echoes arrive a few seconds before their sounds.',
        'Local clocks agree only on the hour of dusk.',
        'Yesterday is visible from high ground.',
    ],
    void: [
        'The dark is load-bearing; do not lean on it.',
        'Something counts along with you, half a beat late.',
        'Lanterns burn here, but their light arrives reluctantly.',
    ],
    organic: [
        'The undergrowth rearranges itself toward warm voices.',
        'Spores log every visitor; the census is never wrong.',
        'Do not prune anything that hums.',
    ],
    aquatic: [
        'The tide goes out once a year and comes back curious.',
        'Bioluminescence spells short words after midnight.',
        'Depth is negotiable; bring a flexible ruler.',
    ],
    digital: [
        'The skyline recompiles at dawn with no downtime.',
        'Packets migrate south along the old bus routes.',
        'A checksum error in sector 9 is now a public fountain.',
    ],
    crystal: [
        'Every surface keeps a copy of the light it has seen.',
        'Frost grows in perfect quotations of nearby shapes.',
        'Handle the silence carefully; it is faceted.',
    ],
    craft: [
        'The horizon is hemmed, not finished.',
        'Paint dries here into weather.',
        'Folded corners of the sky still show pencil marks.',
    ],
    fire: [
        'The forges sing shift-songs in eleven-hour days.',
        'Ash falls upward on feast days.',
        'Magma keeps appointments; eruptions are merely punctual.',
    ],
    sonic: [
        'Architecture is just frozen reverb here.',
        'The wind rehearses; premieres are seasonal.',
        'Every canyon returns your call within three business days.',
    ],
    ethereal: [
        'Clouds graze in herds and answer to whistles.',
        'Morning is optional but well attended.',
        'Light pools in low places like rain.',
    ],
};

const VERDICTS = [
    'Habitability: pending appeal.', 'Recommended visit length: one held breath.',
    'Charted, reluctantly.', 'Survey incomplete; surveyor enchanted.',
    'Filed under: do not wake.', 'Status: louder than documented.',
    'Approved for dreams and short layovers.', 'Re-survey scheduled for never, fondly.',
];

function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
}

export const loreCodex = {
    /** @type {{ epithet: string, note: string } | null} */
    current: null,

    /**
     * Generate deterministic lore for a universe. Call once per generation.
     * @param {function} rng - seeded RNG
     * @param {string} blueprintName
     * @returns {{ epithet: string, note: string }}
     */
    generate(rng, blueprintName) {
        const theme = BLUEPRINT_THEME[blueprintName] || 'cosmic';
        const epithet = `“The ${pick(rng, EPITHET_ADJ[theme])} ${pick(rng, EPITHET_NOUN[theme])}”`;
        const note = `Logged by ${pick(rng, SURVEYORS)}. ${pick(rng, OBSERVATIONS[theme])} ${pick(rng, VERDICTS)}`;
        this.current = { epithet, note };
        return this.current;
    },
};
