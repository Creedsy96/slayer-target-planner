# Simulation workload totals — 3.0.17

The full-hunt simulator displays **Average totals per hunt**: total assigned kills, actual creatures killed, tasks completed and tasks skipped. The strategy comparison also includes mean assigned kills, tasks completed and tasks skipped. Means include every trial, including unfinished trials at their stopping point; they are not totals summed across Monte Carlo repetitions or estimates of a censored final workload. Individual trial counts are integers; averages may be fractional. The first example trace includes its exact totals even if the 40-entry action log is truncated.

## Counting rules

- Assigned kills sum the rolled counts of tasks actually taken for combat, with task extensions and quantity modifiers. A task already in progress contributes its recorded remaining count; past progress is not reconstructed. Skipped/reset offers and an offer-only target are excluded. When a kill/drop goal stops partway through a task, its full accepted count remains assigned.
- Creatures killed count only combat performed before the trial stops, including target/non-target tasks, bracelet effects and filler combat. The existing model's creature-count semantics are unchanged.
- Completed tasks increment at the existing task-completion/reward event, including zero-point and filler tasks. Finishing a kill/drop goal on the final creature counts completion; stopping earlier does not.
- Skipped tasks count successful paid skips plus Turael resets. Both components are displayed separately. Failed payments, blocked tasks and unchosen Mortimer options are not skips. A reset does not itself complete a task; its replacement can.
- An already-observed compatible target offer ends an offer goal with zero future workload. No combat or task completion is invented.

These counters use the actual trial actions, without extra random draws or changes to timing, rewards, skip policy or seed sequences. JSON simulation exports include `meanWorkload` and `exampleWorkload`, each containing `assignedKills`, `kills`, `tasksCompleted`, `tasksSkipped`, `paidSkips` and `resets`. Profiles and existing saved character files retain their schema.

## Verification

Production build and strict TypeScript passed. Twelve new deterministic/seeded regressions cover partial and exact task boundaries, direct drops, observed offers, starting remaining counts, paid/unaffordable skips, both current-task and pending-offer resets, nine-task boosting fillers, censored runs, bracelets, extensions, actual Mortimer quantity reductions, mean versus integer trial values, rendering and JSON round trips. The full suite passes 382 tests, including the existing reward/reset/cape/Konar strategy checks.

Synthetic localhost browser verification completed a 100-trial Basilisk Knight offer hunt. The results displayed 1,783.8 assigned/actual kills, 19 completed tasks and 17.7 paid skips per hunt. The example trace independently displayed 267 kills, 3 completed tasks and 4 skips. All six strategies displayed their workload columns, including 42.5 skips for the reset strategy. The real native app and character files were not altered; native interaction was not repeated. Package/source parity and ZIP integrity are checked during release packaging.
