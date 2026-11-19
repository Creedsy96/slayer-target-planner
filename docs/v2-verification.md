# Version 2 verification

Date: 19 November 2026. Branch: `codex/planner-v2`, based on the existing Windows packaging branch and plan commit `e29c2ef`. Data: `2026-11-19.2`. This record distinguishes implementation, deterministic checks and actual UI observations.

## Scope and implementation

| Plan increment | Implementation | Evidence |
| --- | --- | --- |
| A: foundational fixes | Explicit master groups/slot rules; separate assignment and variant access | Four foundation regressions; locked Knight/base Basilisk browser check |
| B: catalogue/account | Revisioned sources, structured requirements, three-state facts, migration and candidate refresh | Data schema/parity/reproducibility tests; migration tests; account UI |
| C: methods | 269 variants, sourced alternative links, master restrictions, measured timing, travel, bracelets, presets | Timing/credit boundaries and catalogue checks; measured-rate browser entry |
| D: points/Mortimer | Legal ledger, setup costs, streaks, progression-dependent modifiers/options and current offer inputs | Ledger, milestone, reserve and pending-offer tests |
| E: editable profiles | Actual/proposed group lists, protected preferences, JSON profiles, comparison and rebase | Shared-list browser check; round trips, rejection and explicit-rebase tests |
| F: optimisation | Independent objective evaluation, exact small-space enumeration and bounded searches | Independent weight-versus-time oracle; search quality labels |
| G: strategies | Six comparable strategies, multiple target assignments, offer/kill/drop stopping | Current-offer, kill/drop and affordability tests; worker cancellation check |
| H: uncertainty | Seeded trials, intervals, censored means/quantiles and success curve | Geometric-CDF reference, reproducibility, censoring/monotonicity tests; browser statistics |
| I: delivery | Responsive UI, offline worker, isolated desktop, private source/deployment flow | Browser and archive/executable checks recorded below |

## Automated results

Passed: TypeScript strict typecheck, deterministic catalogue regeneration and 42 Node tests (including historical workbook import fixtures). Tests cover the two original regressions, block identities/caps, explicit zero settings, eligibility OR conditions, measured timing precedence, bracelet finite boundaries, point milestones, reserve affordability, distinct weighted offers, Mortimer progression, target stopping conditions, seeded simulation/censoring, independent geometric probability, profile validation/migration/rebasing and the constrained desktop network boundary.

Historical v1 fixture tests establish import parity only. They do not validate current mechanics. The new independent fixtures and captured source revisions own corrected rules. No coverage percentage, in-game validation or independent review is claimed.

## Browser observations

Passed in the in-app browser against the generated local build:

- v1 migration left missing points/combat/streak facts blank and preserved the original profile; duplicate profile used for UI checks.
- Level 40 and incomplete Fremennik Exiles made Basilisk Knight hunts unavailable; choosing base Basilisk produced an eligible conditional plan.
- Turael actual Cow block appeared in Spria's shared list.
- Measured 200 kills/hour entry persisted through the method form.
- Funded simulation displayed median, 90th percentile, session interval, funding exhaustion and an example trace. Full-hunt block search returned a labelled candidate.
- A long strategy comparison could be cancelled; workers are terminated on cancellation and profile changes, and stale worker replies are ignored by identity/request ID.
- JSON export and reimport created copies while preserving existing profiles.
- Mobile breakpoint displayed all profile controls and had no document-wide horizontal overflow (375px document/viewport); tables and navigation scroll within their containers. Temporary viewport override reset.
- Numeric inputs update on input, and open settings panels remain open across recalculation. Failed simulations restore the runnable controls.

Optional real hiscores service lookup: not run. Its fixed origin, validation, response cap and errors are tested with a fake fetch boundary. Browser CORS failures retain manual entry. A clean Windows account/machine without Node.js: not run.

## Explicit model limits

Mortimer modifier *categories/milestones* use captured source rules. Value rolls inside source ranges remain an estimated uniform-in-five-step scenario. Task sizes use uniform integer ranges. Full-hunt control and large block searches are bounded heuristics, with common seeded trials for search comparison; they are not certified optima. Candidate selection uncertainty is not included in the final sampling interval.

The generic Boss secondary roll has no individually mapped boss probabilities and cannot be a specific creature hunt. Its non-target completion timing is a labelled mixed-pool estimate. Directly mapped alternatives are separate variants. New alternative links/HP are sourced but full access/repeatability must be confirmed; unknown fields produce conditional results. Mortimer cape modifier repeats are explicitly unavailable. Multiple acceptable assignments are supported; overlapping variants within one assignment require choosing a preferred variant rather than silently double-counting a location union. Superior drop tables and recommendation 14 are excluded.

## Delivery checks

Desktop launch, ZIP integrity and private deployment results are appended after the actual operations complete.

Passed desktop delivery checks:

- Packaged with Electron 45.3.4 / application 2.0.0. Actual EXE launched from a freshly extracted ZIP. Custom icon and full generated layout inspected; local background calculations populated all master rows.
- Duplicated a profile as `Desktop verified hunt`, restarted the extracted app and observed that same profile selected. Exported `slayer-desktop-verified-v2.json` through the native Save dialog; shared-core import validation accepted both exported profiles and the new name. Existing v1 profile remained available.
- ZIP verified 77 files against SHA-256 and passed CRC validation. Archive: 151.2 MiB. SHA-256: `1bd5671517b18dccaddc6f7ba136d64c457d241456eab37a29f61862c2fa55f3`. The clean distribution and archive contain no saved test/user profiles; those remain outside the distribution in app data. The ASAR file list was checked against the allowlist.
- Previous version 1 folder and ZIP were preserved. Source revision for final version 2 runtime: `79dbd07` (full SHA in the distribution's SOURCE-REVISION.txt).
- A separate direct file-URL browser check was blocked by the in-app browser's URL policy and was not worked around. Desktop packaged-file operation was observed through the authorised executable check. No clean-machine or physically disconnected-network test is claimed.

Private site audience was read before deployment: owner-only custom policy, one owner, no other users/groups/editors or external visitors. Publication result is retained by the Sites service for the exact pushed source commit.

Final regression: starting mid-assignment now updates the cape repeat state after that assignment completes. An independent 45% immediate-offer oracle reproduced the old 54.75% result before the fix and passes after correction. Runtime source revision is updated in the final distribution manifest.

After the cape regression fix, the final ZIP was regenerated, verified (77 files plus checksums/CRC), freshly extracted and launched again. Its archived planner bundle matches the tested generated bundle byte-for-byte. The SHA above is for this final archive.

## Version 2.1 — theme selector

Added a persistent device-level header selector with six complete palettes: Woodland (the existing default), Midnight, Ember, Amethyst, Daylight and High contrast. Theme changes apply immediately without restarting calculations or modifying hunt profiles. Browser storage failures retain the session choice; invalid saved IDs fall back to Woodland. Native form colour schemes and browser theme-colour metadata follow the selected theme.

Passed: strict TypeScript check and the existing 42-test suite. Browser checks switched every palette and inspected changed body/card/text colours, reloaded to confirm the saved choice, navigated to another view, inspected a themed dialog and checked a 375px mobile viewport without page-wide horizontal overflow. Calculation rules, data snapshot and profile format are unchanged. No new unit tests were added for this cosmetic change.

The 2.1 Windows EXE launched from its new Desktop folder with the existing profile preserved and the Theme control present. Packaged JavaScript and theme CSS matched the generated assets. The shareable ZIP verified 77 files and CRC; SHA-256: `5979df1ae67a76211cbf1504cf7cea5f136bb13d0933029e4cb0acfa9f58e746`. Previous 1.0 and 2.0 distributions remain available.

## Version 2.1.1 — Slayer skull icon

Extended the editable SVG icon with an original bone-white Slayer-style skull around the existing sword. The tip remains visible above the crown and the blade exits between the teeth. The green/gold shield and sword styling remain consistent. Regenerated the 512px PNG and seven-resolution Windows ICO (16, 24, 32, 48, 64, 128 and 256px); verified the ICO directory and embedded PNG signatures. Updated header/favicon asset URLs so browsers request the new artwork.

The [RuneLite Slayer skill icon](https://raw.githubusercontent.com/runelite/runelite/master/runelite-client/src/main/resources/skill_icons/slayer.png) served as a visual reference; its pixel asset is not bundled. The project icon remains an editable original vector illustration. This is an asset change; calculation rules and profile format are unchanged.

Verified the new artwork inside all seven EXE icon resources and matched the packaged header PNG/window ICO to the source assets. Launched Windows version 2.1.1 and visually confirmed the skull in the header and title bar, with the existing profile preserved. The ZIP passed 77 file checksums and CRC; SHA-256: `7d578cd3dc4ecc63a45c076131afe488dcd2d241628c6a2b1f8f65cbad46f72a`. Previous distributions remain available. No calculation tests were rerun for this asset-only update.
