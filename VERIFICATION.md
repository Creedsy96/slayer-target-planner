# Verification

Verified on 19 November 2026.

- `npm test`: passed, 8 tests. Cached workbook results match for all 11 master scenarios (chance, averages, waiting times, full-skip counts and boundary frequencies) within 0.00001 absolute tolerance.
- All 117 creatures were targeted across all 11 master scenarios at level 99 with that target allowed. Targets were never blocked or skipped, present targets remained assignable, and expected points did not run negative.
- Covered weighted distinct-draw normalisation, empty and single-target pools, absent targets, unmet requirements, zero reward budgets, combat/timing changes, extended quantities, and stored-input validation.
- Browser checks passed: alternate target (Gargoyles), no-skip comparison, target/policy persistence across reload, Hydra level rejection, Aquanite exclusion editing, Mortimer three-choice scenario, reset, and CSV download with numeric comparison values.
- Desktop and 390 × 844 responsive layouts inspected. Mobile document width matched its viewport (no page overflow). Browser error log was empty.

Calculations reproduce the supplied snapshot; current game tables and in-game assignment behavior have not been independently verified. Browser checks used a local HTTP preview. The double-click version uses the same static files without modules or fetch requests. Browser storage may be restricted under local file URLs; the interface reports Session only if saving is unavailable.
