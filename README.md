# Slayer Target Planner

## Windows app

The desktop distribution is in **Slayer Target Planner - Windows**, alongside this source folder on the Desktop. Open **Slayer Target Planner.exe**. Share **Slayer Target Planner - Windows.zip**; the recipient must extract the complete folder before running the EXE. It bundles Electron and the planner, with an original sword-and-shield icon, and needs no website login or Node.js installation.

This unsigned Windows x64 build runs locally and saves preferences under `%APPDATA%/Slayer Target Planner`. Those preferences, hosting metadata and credentials are excluded from the distribution. The private hosted site's permissions are unchanged. The app does not automatically update.

## Browser copy

Double-click **Open Planner.cmd** to open the app in your default browser. You can also open `dist/index.html` directly. The application works offline, with system fonts used when web fonts are unavailable.

Select any of the 117 assignment types imported from the source workbook. Compare expected waiting times, assignment probabilities, recommended blocks, and sustainable skips. Select a master in the comparison to inspect its task plan. Use **Task inputs** to change shared requirements, representative HP and DPS multipliers.

Settings are saved in your current browser. The local file and hosted website have separate browser storage. **Export comparison** downloads a CSV. **Reset all to workbook defaults** resets the target, settings, and creature overrides.

## Data and calculation

Source: https://docs.google.com/spreadsheets/d/1HYeSbsbNKqZ2PO_eWPsYV0MXg46q9M6FnC8Ff75a_F4/edit

Snapshot: 19 November 2026. The app bundles the supplied data; it does not update automatically. Current game data has not been independently verified. The original workbook is unchanged.

Assignment types include representative monsters. To model a particular variant, choose its assignment type and adjust HP and DPS multiplier. Targets remain subject to Slayer level and explicit requirement exclusions, and are never recommended for blocking or skipping.

The model preserves the workbook's highest-weight blocks, longest-first point-balanced skips, streak multiplier of 1.775, and weighted Mortimer offers without replacement. Mortimer's three-choice scenario is optional and disabled by default. Waiting ends at the target offer; target completion time is excluded. Points balance describes repeated play and does not ensure sufficient starting points. Quest/combat access not excluded is assumed satisfied. There is no Slayer cape repeat model.

## Development

No install or build step is required. Node.js is needed only for tests and optional local serving:

```text
npm test
npm start
```

`dist/engine.js` contains the pure calculation model, `dist/preferences.js` validates stored preferences, and `dist/app.js` owns the interface and browser storage. `dist/data.js` is the data snapshot. Tests compare all 11 master scenarios with cached source results and exercise alternate targets, requirements, empty pools and probability normalisation.

`tools/extract_source.py` reads XLSX cell data using the Python standard library. `tools/prepare_data.py` converts that intermediate JSON into the catalogue and baseline test fixture. Neither executes spreadsheet formulas or updates the source workbook.

## Desktop packaging

Use Node.js 22.12+ (the initial build used the bundled Node.js 24.22.1). Run `npm ci`, then `npm run package:windows`. The pinned Electron and packager versions are in `package.json` and `package-lock.json`. Output defaults to `.desktop-build/output`; pass a new output directory to `node tools/package-windows.mjs` for a subsequent build.

The build copies an explicit allowlist into `.desktop-build/app`, removes the remote font import, adds a local-only content policy and the app icon, then packages an ASAR. The renderer has no Node.js integration and runs with context isolation and sandboxing. Source links open externally only for the workbook and RuneScape Wiki domains. The original web files remain unchanged.

`tools/package_share.py <distribution-folder> <new-zip-path>` creates file checksums and a ZIP, then verifies every archived file and ZIP CRC. The renderer and runtime include no personal profile or deployment access.
