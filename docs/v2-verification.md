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

Passed: TypeScript strict typecheck, deterministic catalogue regeneration and 41 Node tests (including historical workbook import fixtures). Tests cover the two original regressions, block identities/caps, explicit zero settings, eligibility OR conditions, measured timing precedence, bracelet finite boundaries, point milestones, reserve affordability, distinct weighted offers, Mortimer progression, target stopping conditions, seeded simulation/censoring, independent geometric probability, profile validation/migration/rebasing and the constrained desktop network boundary.

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
