# Pinned OSRS Wiki DPS engine

Upstream: https://github.com/weirdgloop/osrs-dps-calc
Commit: `3da927f4280c73154fa59e4e90eb374af5123d32`
Code licence: GPL-3.0; see LICENSE. Application code is distributed under the compatible GPL-3.0 licence at the repository root. Game artwork and Wiki-derived data keep their separate notices and terms.

`source/src/lib`, `source/src/types`, `source/src/enums`, `source/src/utils.ts` and `source/cdn/json` are unchanged copies of the calculation source/data. The build plugin replaces unused UI image imports with empty values and indexes item aliases in memory, preserving the original first-match lookup. It sets the production/browser sanity-check flags explicitly. Damage formulas and distributions are unchanged. `entry.ts` is the local export adapter. `tools/build_dps_engine.mjs` and the root package lock reproduce runtime.js. The app does not call upstream network or scraping functions. The Windows share includes corresponding application/vendor source in `source/`, build instructions and licences.
