# Hunt quality of life — 2.6.0

Scope: user-authorised recommendations 1–11 from the master-navigation discussion. Recommendations 12 (sensitivity comparison) and 13 (copyable summary) are outside this increment.

| Item | Implemented behaviour |
| --- | --- |
| 1. Task lookup | Search assignments/selected variants from the chosen master; get a named action and explanation. |
| 2. Master navigation | Sticky master selector, direct details focus/scroll, return to comparison. |
| 3. Skip explanations | Expand or hover full/partial skips for time saving, paid cost, foregone reward and decision rationale. |
| 4. One policy | Planner budgets explicit skips before automatic ones; displayed advice and simulation read those fractions. Targets, keep and protect prevent skips/resets. Resettable tasks do not accrue paid-skip costs. |
| 5. Block review | Actual-versus-proposed additions/removals/cost and chance/time delta before recording. Optional point deduction respects reserve. |
| 6. Undo/redo | Bounded 40-state session history across profile edits/imports and task records, numeric edit grouping, shortcuts outside editors. |
| 7. Named hunts | Up to 30 per account; hunt settings are separate from account facts, points, actual blocks and current task. |
| 8. Budget forecast | Affordable skip count after setup/reserve, stationary drift warning, funded simulation exhaustion and remaining-balance result. |
| 9. Compact mode | Reduced interface; Windows 440 × 720 bounds with optional pinning and full-window restoration. |
| 10. Task tracking | Two-stage review, actual reward/streak ledger, optional measurements, bounded 200-record log; no game API writes. |
| 11. Timing log | Weighted measured kills/hour by assignment/variant, applied to a variant method only after review. |

## Compatibility and limits

Existing schema-v2 profiles remain accepted. Optional hunt presets and task records are validated and round-trip in profile exports; there is no new account-data migration. The data catalogue and Mortimer rule versions are unchanged. Analytical results can change for existing skip/avoid preferences because their costs now participate in the analytical policy. Keep/protect also applies to reset policies. Filler tasks honour explicit preferences with automatic skips off.

Undo is session-only, not a replacement for export backups. The existing 2 MB profile import bound remains. Logs are observations entered by the user; task actions never affect RuneScape. Actual point/streak facts are required before recording. Mortimer records require an unlocked modifier and a valid actual point increment. Travel/banking is excluded from timing samples; mixed setups require user review. The simulator still uses its documented stationary/heuristic policies, quantities, locations and DPS assumptions; these features do not add a game telemetry feed or guarantee game correctness.

## Verification

Verified 19 November 2026.

- TypeScript check and production build: passed.
- Full Node suite: passed, 108 tests. New tests cover policy agreement, manual-skip budget allocation, reset/protection precedence, unaffordable skips, displayed-list simulation, block deltas and setup/reserve arithmetic, history coalescing/branching/bounds, preset isolation and round trips, real milestone rewards, Mortimer increments, invalid facts/records, timing aggregation and log bounds.
- Desktop window unit test: passed for bounds restoration, maximised state, opt-in pinning and invalid IPC arguments. The compact IPC retains the existing sender/document checks.
- Browser workflows on a separate synthetic profile: passed. Task lookup, master selector and comparison return; completion 500 → 515 points and streak 50 → 51; undo 515 → 500 and redo; 150 kills/30 combat minutes suggested 300 kills/hour and applied after review; named hunt save/load retained the account balance; block review deducted 630 from 2000 to 1370 and undo restored 2000; cancelling task recording left the balance unchanged.
- Budget simulation: passed. The 2000-point synthetic scenario showed 65 affordable skips and a completed simulation with 0% sampled funding exhaustion. This is a scenario result, not a universal guarantee.
- Compact browser layout: passed at 440 × 720; document width equalled the available viewport width (425px after the scrollbar), with no horizontal overflow. Temporary viewport override was reset. Browser error log was empty.
- Windows x64 release: launched from the final Desktop folder, existing Ember profile loaded, compact resize and pin control were exercised, and Full planner restored the original window. Native accessibility geometry became stale after window changes; a fresh screenshot and coordinate click completed restoration. No account/profile fields were edited during native verification.
- Packaged planner.js, main.cjs, preload.cjs and compact.cjs match the verified source/build byte-for-byte. The final portable distribution contains no personal profiles or private-site credentials.

No RuneLite live telemetry, in-game task assignment or second-computer Windows testing was performed. These tools record reviewed user observations and retain the existing model assumptions.
