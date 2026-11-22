# Target changes reuse combat results — 2.9.4

Changing a hunt target previously terminated its worker and destroyed the optimiser cache. The UI also discarded the guide results even though its creature, bank and combat inputs were unchanged. This made a target change repeat the full bank search and guide preparation.

Completed owned-combat searches now stream back to a session-only cache before the worker finishes. Replacement plan, guide and simulation jobs receive matching completed results. Cancellation retains already received results; obsolete worker responses are still rejected by worker/job identity. Each cache context holds at most 500 entries with least-recently-used eviction, and at most three combat-input contexts are retained. Returned results and snapshots are cloned so consumers cannot change stored calculations. No cache data is added to profile JSON, local storage or release contents.

Context identity includes bank state, combat skills/settings, the relevant diary and quest states. Hunt goals, points, names and method preferences do not globally invalidate combat. The per-result key covers creature, form, effective combat family and tank/prayer priority, on-task state, location and pod override. Explicit and inherited tank/prayer choices share a key when their behaviour is equivalent; different protection priorities remain separate. Changed bank/skill/spell/prayer/diary/quest inputs cannot restore a stale context.

Hunt odds, block/skip choices, completion-method selection and master rankings must still update for a new target. Those calculations reuse matching combat results and calculate only new combinations. An assignment that stops being a target can legitimately choose a different default completion variant. Unchanged guide cards remain available, and a matching guide worker already running is preserved. A ready guide is not needlessly prepared again by the plan worker. Initial imports/profile changes still prioritise selected creatures as before.

Verification on 20 November 2026:

- Passed: TypeScript, offline build, all 228 JavaScript tests and six Python checks.
- Passed: the actual bundled-worker regression restarts workers between requests. Its cold run makes 134 owned-combat searches, switching from hellhounds to gargoyles makes one search for the newly selected non-target hellhound completion variant, and switching back makes zero. Updated plans equal independent cold-run plans, including all timings and rewards.
- Passed: six new regressions cover restart reuse, semantic style/priority keys, cancellation with partial results, inventory/skill invalidation against cold results, other combat-input invalidation, bounded eviction and mutation isolation.
- Passed in the local browser with the synthetic Bank DPS verification profile: switching the hunt from hellhounds to gargoyles preserved all three Dust devil guide cards. Completion displayed Reused combat results. Switching back immediately reported Updating hunt odds / reusing completed combat results.

The cache is in memory and bounded; app restarts, evicted entries and genuinely new combinations require calculations. In-progress work that has not returned a result is interrupted rather than resumed mid-search. No live in-game DPS or damage-taken measurement was run.
