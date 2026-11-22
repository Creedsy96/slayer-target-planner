# Rank hunts by target kills per hour — 3.0.7

**Rank plans by → Highest target kills per hour** recommends the master with the highest supported analytical `targetKillsPerHour`. It uses the existing full-task-cycle rate, including compatible target combat, intervening tasks, travel, paid skips, boosting and resets. Multiple selected assignments contribute to the combined target rate. The selected stopping goal is unchanged.

The recommended-master card highlights target creatures killed per hour. The table is sorted by the same objective. Unsupported rates are excluded from recommendations and from the available-master filter, while **Show unavailable masters** retains their explanations. If no master has a supported positive rate, the UI says so rather than recommending an arbitrary row. Mortimer's random quantity/combat modifiers and cape policies retain their existing analytical-rate limitations.

## Optimisation

The planner scores a valid positive rate as its negative value, since the existing optimiser minimises scores. It uses expected target quantity and full-cycle time, not just offer chance or waiting time. Rankings can therefore differ from the other objectives even with the same target creature.

Small pools enumerate legal block sets from zero blocks through the available capacity. Larger pools use bounded seeds and additions/removals/swaps, evaluating the real rate for every candidate. This includes empty and recorded lists, and avoids assuming that filling all block slots helps a reset or boosting schedule. Fixed proposed lists and protected targets/preferences remain respected. Large searches are explicitly heuristic, not a certified global optimum. Existing objective behaviour is retained.

For this objective, **Optimise target rate & simulate** searches the analytical rate, then runs the full-hunt simulation for the chosen plan and selected stopping goal. It does not silently switch the search to mean offer time. Finite-budget results and starting-streak effects remain simulation outputs; funded rate comparisons are still labelled unlimited-funds benchmarks.

The objective round-trips in character JSON and saved hunts. Existing saved characters keep their chosen objective; fresh/default waiting-time settings are unchanged. No schema or account-data migration is required.

## Verification

Independent fixtures check a master with slower offers but a higher kill rate, different optimal blocks for chance versus rate, exact and bounded smaller-block searches with Turael-only targets, all six strategies, unsupported/cape results, saved hunts/export/import, the primary recommendation metric, and rate-preserving full-hunt simulation with monotonic progress.

Passed: production build, strict TypeScript and all 285 JavaScript tests. The browser check completed all ten master plans for Blue dragons, selected the new option and confirmed rates sorted 40.2, 30.7, 30.3 and 23.8 with Nieve/Steve recommended. Unsupported masters retained their reasons. Changing the objective reused completed combat results. Native desktop interaction and live-game combat were not repeated. Packaged-source parity and ZIP checksums accompany the release.
