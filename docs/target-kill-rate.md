# Target creatures killed per hour — 3.0.5

The hunt planner's master comparison includes **Target kills / h**, with a hover explanation. The CSV export includes both the numeric rate and its basis. This is a repeated-full-task comparison of the selected target creatures, independent of whether the current hunt stops on an offer, kill quantity or drop. It is not the standalone combat kills/hour displayed by an equipment setup, and it does not predict kills before a finite hunt stops.

For an ordinary master, expected target kills per request are `sum(probability × compatible-target fraction × expected creature kills)`. Divide by the expected full-request cycle time and multiply by 60. Cycle time includes the request, compatible target combat and travel, plus intervening task completions or paid skips. Wrong-location offers use the existing completion fallback policy and contribute no target kills. Extensions and bracelet effects use actual expected creature kills, not assignment counter decrements; measured timings, automatic combat timing, delays and batching feed the existing task duration.

For boosting, the rate covers one complete repeating completion schedule: the milestone task plus the configured number of filler tasks. Each phase accounts for paid skips that do not advance the streak. Target creatures from either master count. This long-run rate is independent of the starting streak; the adjacent offer estimate still reflects the current streak and next target opportunity.

For Turael resets, one renewal cycle starts with the selected master's request. When resetting, it also includes reset time and the replacement request/task. Compatible targets from either master count, and their full combat time is added to the existing offer-only renewal time. Original assignments that are reset contribute no combat duration or kills.

Funded rows explicitly say **Unlimited funds**: they compare the selected policy while affordable skips remain available. Finite balances, starting streaks, setup purchases and terminal hunt goals require full-hunt simulation. Conditional facts stay labelled through the row's existing warnings and the rate tooltip.

Unavailable plans, cape policies and stalled schedules have no analytical rate. Mortimer's random quantity and combat modifiers are not modelled by the existing stationary task timings, so its cell is a dash with an explanation rather than an unmodified base-quantity number. No additional combat search or simulation runs are launched to populate the column.

## Verification

Deterministic independent fixtures cover full target time versus offer-only time; intervening tasks; requests/travel; paid skip duration; extensions and slaughter bracelets; incompatible-location fallbacks; Turael and Mazchna boosting; targets on filler tasks; resets with and without replacement targets; and unavailable/modifier-dependent rates. Rendering checks cover numeric precision, funded labels, explanations and HTML escaping. Existing point rewards, ranking objectives and offer estimates are unchanged.

Passed: production build, strict TypeScript and all 269 JavaScript tests. Browser inspection confirmed the new seventh column, numeric rates and explanatory hover text. An actual comparison CSV download retained all ten master rows, rate values and calculation-basis text. Windows package checks use the same built assets; native interaction and live-game timing were not repeated.
