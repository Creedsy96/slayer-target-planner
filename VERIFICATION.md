# Verification

Verified on 19 November 2026.

- `npm test`: passed, 8 tests. Cached workbook results match for all 11 master scenarios (chance, averages, waiting times, full-skip counts and boundary frequencies) within 0.00001 absolute tolerance.
- All 117 creatures were targeted across all 11 master scenarios at level 99 with that target allowed. Targets were never blocked or skipped, present targets remained assignable, and expected points did not run negative.
- Covered weighted distinct-draw normalisation, empty and single-target pools, absent targets, unmet requirements, zero reward budgets, combat/timing changes, extended quantities, and stored-input validation.
- Browser checks passed: alternate target (Gargoyles), no-skip comparison, target/policy persistence across reload, Hydra level rejection, Aquanite exclusion editing, Mortimer three-choice scenario, reset, and CSV download with numeric comparison values.
- Desktop and 390 × 844 responsive layouts inspected. Mobile document width matched its viewport (no page overflow). Browser error log was empty.

Calculations reproduce the supplied snapshot; current game tables and in-game assignment behavior have not been independently verified. Browser checks used a local HTTP preview. The double-click version uses the same static files without modules or fetch requests. Browser storage may be restricted under local file URLs; the interface reports Session only if saving is unavailable.

## Windows desktop packaging

- Built with Node.js 24.22.1, Electron 45.3.4 and @electron/packager 20.3.0, pinned with a lockfile. Windows x64, app version 1.0.0, unsigned.
- 11 automated tests passed, including external-navigation restrictions and a regression for semicolons inside the offline font URL. All original model tests remain passing.
- Launched the packaged EXE from its final Desktop distribution folder. Verified its native window, embedded shield icon, local task catalogue, calculated Basilisk baseline, saved-local status, and corrected offline typography/colours by inspecting the native window.
- Inspected the ASAR allowlist: only the main process, navigation module, app manifest, icon and six static web files plus icon. No Git directory, hosting manifest, credentials or personal browser settings are included.
- The first offline launch exposed an import-stripping bug that removed only part of a font URL and invalidated CSS variables. Fixed the transform, added a reproducing regression, rebuilt and re-launched the corrected package successfully.
- No claim of testing on another person's computer or a different Windows version. No code-signing certificate is included. The hosted website and its audience were not changed.
- Final ZIP verified: 75 distribution files matched SHA-256 checksums, and ZIP CRC validation passed. Size: 151.0 MiB. Archive SHA-256: `a303c47fe0f8c5f7c22432890fbded5ba1639106296b74171331db257899310d`. Checksums are supplied both inside the folder and beside the ZIP.
