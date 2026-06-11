# Tests

Headless test suites for Celestial Canvas. Zero dependencies — plain Node (18+)
with lightweight DOM/canvas stubs.

```sh
node tests/run_all.mjs    # everything
node tests/registry_smoke_test.mjs   # one suite
```

| Suite | Guards |
| --- | --- |
| `registry_smoke_test` | Every registered interactive effect survives `configure` + 60 frames of `update`/`draw` with the orchestrator's real call signature, against a canvas stub that rejects non-finite dimensions like a browser. Also scans sources for architecture-style `update(system)` signatures and dead orchestrator properties. |
| `architecture_smoke_test` | Every background architecture survives `init` + 30 frames of `update`/`draw` (including a shockwave) against a stub BackgroundSystem, and `ARCH_DESCRIPTIONS` stays in sync with `ALL_ARCHITECTURES`. |
| `integrity_test` | Every blueprint power / cataclysm / ambient-event name resolves to an implementation; click-only powers are gated in `ui.js`; all mutators, anomalies, and ambient events execute cleanly on the live particle engine. |
| `engine_test` | The in-house particle engine satisfies every `pJS.*` property path used anywhere in the codebase, plus behavior: density counts, push-return, speed parity, wrap/bounce, trail fade vs clear, all shape branches, link batching, attraction, bubble hover, config isolation. Also covers the journal. |
| `lifecycle_test` | Epoch system (roman-numeral lineage round-trips, all four epochs traverse with bounded modifiers, exactly one rebirth at heat death) and familiar memory persistence/stages. |
| `overhaul_test` | Lore codex determinism/variety, all six familiar species through follow → startle → doze with finite state, MIDI message decoding, environment sensing graceful degradation. |
| `metro_test` | Metro map generator invariants across 400 seeds (octilinear geometry, stations on-line, deterministic) and 4000-frame train simulations. |
| `neural_test` | The TinyBrain recurrent MLP (deterministic, bounded, non-destructive mutation, parent-faithful crossover), the gene pool (fitness-weighted sampling, cap/eviction, persistence, stale-layout rejection, niching), **fairness** (identical behavior scores identically regardless of how much opportunity the visit offered; hovering near an idle cursor is rewarded, not punished), and **the convergence proof**: evolving through the real pool and operators against a known steering objective must cut error by >45% — it currently falls ~97% over 40 generations. |

When adding an interactive effect or a background architecture, no test
changes are needed — the smoke suites pick them up automatically from
`effect_registry.js` and `architecture_registry.js`.
