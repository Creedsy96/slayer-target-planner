# Target task extensions — 3.0.8

Hunt setup shows a one-click **Extended / Not extended** control for each selected assignment with an extension in the captured catalogue. These are recorded planning settings: the application does not buy a reward, deduct Slayer points or infer purchases from account levels. Existing method extension settings are retained until an explicit assignment setting is recorded.

An explicit extension setting is shared by every variant and master for that assignment, including filler and reset tasks. Both Hunt setup and Combat methods update the same setting. Optional extension data validates and round-trips with characters and saved hunts; old characters and hunts remain readable. Purchases for creature unlocks are unchanged.

The recommendation card, target KPH cells and selected master's extension details compare **not extended** with **extended**, showing absolute and percentage changes. Detailed comparisons include each master's captured normal/extended task ranges and source links. Extending is recommended only when it increases the supported calculated rate. Unsupported analytical rates, missing extension ranges and zero gains are explained. A master offering only ordinary quantities is not given an invented extended quantity.

Each comparison changes one target extension, retaining the same blocks, gear, methods, strategy and other extension settings. With multiple targets, rates count all selected target creatures. Full combat time, bracelets, requests, travel, non-target tasks, skip funding policy and filler/reset cycles remain included. The normal and extended scenarios rebalance paid skips from clean rows; an already-balanced skip policy is not applied a second time. Marking an extension reruns the optimiser, so the resulting best block list/master can differ from this isolated comparison. Funded comparisons retain the unlimited-funds qualification.

Comparisons reuse prepared combat results and run in the worker. Extension changes leave combat identity unchanged and reuse cached gear calculations. Progress names the extension comparison stage. Comparison data is included in CSV exports and retained after full-hunt optimisation.

Measured minutes per whole task describe the selected task size; they do not establish an extended-task duration. Such methods retain their existing timing behavior, but extension comparisons request separate timing or a DPS/measured-KPH input rather than claiming extra kills at the same measured task duration. Update a whole-task measurement when changing its recorded extension state.

No additional Wiki requests are needed. Quantities and source links come from the existing captured master tables. No extension prices or purchase availability are inferred from those quantity tables.

## Verification

Passed: production build, strict TypeScript and all 294 JavaScript tests. Nine new regressions cover independent full-cycle arithmetic, fixed blocks and other targets, assignment-wide state and legacy settings, all six strategies and filler-only targets, measured-duration/unsupported safeguards, zero gains, persistence/validation/cache identity and UI recommendations. Native desktop interaction and live-game combat were not repeated.

Browser verification completed all ten master plans. Dust devils showed 67.2 normal versus 96.9 extended KPH (+29.7, +44.2%) with the same Nieve/Steve blocks. The unextended recommendation appeared; the purchase toggle changed the main ranking to 96.9 KPH, highlighted Extended and reused completed combat results. No live-game purchase was made.
