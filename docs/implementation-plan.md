# Slayer Target Planner implementation plan

Status: proposed implementation sequence, not implemented or verified.
Prepared: 19 November 2026.
Scope: the zero-block assumption fix, monster variant accuracy, and research recommendations 1–13. Recommendation 14 (general XP, profit and Ironman outputs) is excluded. Goal-specific drop probabilities remain included under recommendation 11.

## Outcome

Deliver an offline-capable target-hunting planner that respects actual player eligibility, distinguishes assignments from monster variants, compares valid strategies against a stated objective, and explains timing, points and uncertainty. Deliver the same calculation model in the private website, local browser copy and portable Windows app.

This document authorises no implementation, deployment or replacement of an existing release. The current EXE, ZIP, hosted audience and user settings remain available while these increments are developed. Each increment below is independently reviewable; acceptance means its stated checks have actually passed.

## Current implementation and constraints

The current application has one data snapshot in `dist/data.js`, pure calculations in `dist/engine.js`, preference validation in `dist/preferences.js`, and an interface in `dist/app.js`. A build script packages an explicit file allowlist into Electron. The source branch is `codex/windows-portable-package` and the packaged baseline is version 1.0.0. Eleven tests were recorded as passing during packaging; that is historical evidence, not validation of future changes.

Confirmed limitations from source inspection:

- `tools/prepare_data.py` assigns `blockKind: none` to Turael/Aya, Spria, Krystilia and Mazchna/Achtryn. `applyBlocks` therefore gives them no blocks regardless of the selected slot count.
- Assignment and monster properties share one creature record. Basilisks has assignment level 40 but uses Basilisk Knight HP and timing. A player can therefore appear eligible for a combat method they cannot use.
- Quest and combat access are not modelled; one manual exclusion applies across all masters. Named reward unlocks and master-specific exceptions are not distinguished.
- Blocks sort by weight, then duration. Sustainable skips sort by duration. Neither establishes an optimum for every objective or for variable Mortimer rewards.
- Points use average rewards and an optional flat streak multiplier. There is no starting balance, next-action affordability, actual streak state or hunt-time distribution.
- Mortimer is represented as two static scenarios, with an editable 20% points-modifier assumption and no progression-dependent modifier pool.
- Preferences use one unversioned application payload under the v1 storage key. Sharing exports results as CSV, not reusable profiles.

## Scope traceability

| Request | Implementation increments | Acceptance evidence |
|---|---|---|
| Zero-block fix | A, B | Regression for all affected masters; verified shared-group rules |
| Monster variant accuracy | A, C | Assignment eligibility and method eligibility tested independently |
| 1. Rules and catalogue | A, B | Sourced/versioned records, schema and parity checks |
| 2. Account profile | B, C | Skill, quest, reward, diary and master-access boundaries |
| 3. Assignment / monster / method | A, C | Explicit variants, locations and valid method selections |
| 4. Optimise actual goal | F | Small-case exhaustive oracles and labelled solver quality |
| 5. Real points and streaks | D | Legal action traces; no spending future or unavailable rewards |
| 6. Editable plans | B, E | Per-master/group lists, protected choices, action costs |
| 7. Mortimer modifiers | D, F | Verified milestones, offer/modifier probabilities and policy tests |
| 8. Task-time estimates | C | Measured rate overrides, quantities, bracelets and overhead |
| 9. Complete strategies | G | Comparable start states, stopping events and streak effects |
| 10. Probability ranges | H | Exact reference cases, reproducible simulation and censoring checks |
| 11. Multiple targets / drop goals | G, H | Goal semantics, quantity progress and appropriate drop probabilities |
| 12. Explain and compare | E, F, H | Independent scenario evaluation and attributable deltas |
| 13. Named / shared profiles | B, E, I | Migration, round trips, cross-platform import and data-version handling |

## Design decisions for implementation

Use the vocabulary in [CONTEXT.md](../CONTEXT.md). In particular, keep assignment eligibility, variant eligibility and a player's preference separate. Removing a desired variant must not silently remove a still-assignable task from the denominator.

Keep one application state owner and a pure, shared calculation core. Introduce a small TypeScript compilation/bundling step for typed records and generated browser assets; avoid a server or UI-framework rewrite. Proposed source responsibilities:

| Area | Owns |
|---|---|
| `data/` and `tools/` | Canonical records, source provenance, reviewable snapshot generation |
| `src/domain/` | Types, identifiers, goal and strategy definitions |
| `src/rules/` | Eligibility, block groups, points/streak transitions, offers and modifiers |
| `src/analysis/` | Time distributions, optimisation, strategy evaluation and simulation |
| `src/state/` | Application state, profile validation, persistence and migration |
| `src/ui/` | Forms, comparison views and explanations derived from core results |
| `desktop/` | Electron lifecycle, file/URL boundary and packaged-app integration |
| `dist/` | Generated deliverable browser assets, including local-worker support |

Use stable semantic IDs; retain aliases for old IDs. A master variation caused by progression belongs to master rules rather than a duplicate independent master. Block-list identity is explicit and distinct from master identity.

Data records carry a source, source revision/date where available, verification status and applicable exceptions. Estimated player timings are labelled estimates. Unknown rules or probabilities must not be silently converted to uniform or zero distributions.

Default planning remains offline. A requested hiscores lookup is an optional network boundary, with timeouts and manual fallback. It imports publicly available levels only; it does not infer quest, diary or unlock completion. No account login or RuneLite integration is needed for this scope.

## Increment A — Correct the two foundational accuracy defects

Suggested branch: `codex/rules-and-variants-foundation`.
Dependencies: none.

1. Add reproducing tests against the current zero-block behaviour and the assignment/variant conflation before changing either path.
2. Replace positional `master-<index>` assumptions with a stable master catalogue and explicit block-list groups. Add sourced slot eligibility and block costs, including the shared Turael/Aya/Spria group and Mortimer's separate rules. Audit caps rather than blindly reusing the current allowed range of 0–8.
3. Separate assignment records from monster-variant records and their assignment links. Keep HP and combat access on variants; keep weight and assignment quantity on the master's assignment entry.
4. Add base Basilisk and Basilisk Knight as the first reference pair. Validate the Knight's Slayer, quest and location requirements independently from receiving a Basilisk task.
5. Translate the existing snapshot without inventing missing variants. Preserve a labelled legacy timing estimate until a variant has sourced properties; unavailable variants must not appear as verified choices.
6. Keep the workbook fixture as a historical comparison, not the correctness oracle for corrected rules. Add independently calculated corrected fixtures and explain intentional differences.

Acceptance:

- Each affected master can use valid block slots; an explicit zero-slot player setting still means zero.
- A block in the shared beginner group is shared only with that group; Krystilia and other individual groups remain independent.
- A player eligible for a base Basilisk task but ineligible for Knights can receive the assignment, cannot select the Knight method as available, and gets a clear reason.
- Choosing an unavailable Knight target never silently substitutes base Basilisk kills.
- Additive variant migration preserves assignment IDs and does not change the meaning of an imported target without a visible migration note.

## Increment B — Build the verified rules catalogue and account profile

Suggested branch: `codex/catalogue-and-player-profile`.
Dependencies: A.

1. Audit every current master and assignment against current Wiki/Jagex sources. Record weights, base/extended quantity distributions, skills, quest stages, reward unlocks, master access, diary effects, block caps/costs and skip/reset restrictions. Resolve source disagreements in a small evidence log.
2. Replace the workbook as the live canonical source with reviewed structured data. Retain its provenance as the original import. Generate `dist/data.js`; validate unique IDs, references, non-negative weights, valid ranges, and explicit exception scope.
3. Implement player levels, quest stages, diaries, purchased rewards and master progression. Model satisfied, unsatisfied and unknown requirements separately. Unknowns produce conditional scenarios or a request to fill in that field, not an unconditional recommendation.
4. Move manual legacy exclusions into explicit player preferences/scenario overrides. Do not treat them as proof that a particular quest or unlock is absent. Evaluate actual reward applicability per master, including Mortimer exceptions.
5. Introduce a versioned profile envelope and migrate the existing v1 settings on a copy. Retain the original payload and expose a backup export. Mark old editable minimum levels as custom assumptions, not canonical rules.
6. Add a source/data version view and a reviewed refresh command that reports rule changes. Do not fetch mutable rules during a calculation or automatically reinterpret an imported profile against a different snapshot.

Acceptance:

- All current assignment types and masters have reviewed requirement coverage; gaps are visible rather than filled with convenient defaults.
- Boundary tests cover exact skill thresholds, quest stages, diary rewards and master-specific unlock exceptions.
- Requirement exclusions, purchased blocks and manual preferences show different reasons in the interface.
- Legacy exclusions and overrides survive migration; missing fields remain unknown. Corrupt input never destroys the original stored profile.
- Model evaluation is deterministic and works without a network connection.

## Increment C — Add explicit variants and completion methods

Suggested branch: `codex/monster-methods-and-timings`.
Dependencies: A, B.

1. Audit viable variants for each assignment and store separate variant requirements and task-credit rules. Cover base/stronger variants and boss alternatives where a verified mapping exists. Unsupported relationships stay unavailable with an explanation.
2. Let the player choose a desired creature separately from their preferred method for non-target tasks. Apply master location restrictions, especially Konar, to method availability and target opportunities.
3. Add timing inputs with clear precedence: measured minutes/task or kills/hour first, then the existing effective-DPS estimate. Keep provenance and units visible; never apply both measured and estimated combat time simultaneously.
4. Support per-method travel/banking, between-kill delay, per-assignment extensions, and bracelets. Use verified quantity/credit distributions rather than multiplying every task by an unexplained average. Include stop-at-first-drop behaviour where the hunt goal permits it.
5. Add reusable method presets. A full equipment picker or a replacement combat DPS calculator is not required: players can enter externally calculated DPS or measured rates.

Acceptance:

- Variant selection changes the appropriate timing and requirement checks without rewriting the assignment weight.
- An assignment can remain possible while a desired monster/location is impossible; the comparison shows both facts correctly.
- Tests cover locked locations, unsupported methods, zero/invalid rates, extensions, bracelet endpoints and task-credit quantities.
- Measured times round-trip through profiles and are labelled distinctly from generic estimates.

## Increment D — Implement points, streaks and Mortimer transitions

Suggested branch: `codex/points-and-mortimer-rules`.
Dependencies: B, C.

1. Represent the player's available points, reserve, current assignment/offer, separate streak counters and relevant master progression. If the current state is not supplied, require a stated start-at-new-offer assumption.
2. Implement pure transitions for requesting, accepting, completing, points-paid skipping, blocking and legal resetting. Award completion points only after completion; charge setup changes when made. Separate points availability from average points/hour.
3. Preserve a clearly labelled sustainable mode and add a funded mode. A sustainable plan is not presented as affordable from an unknown or empty starting balance.
4. Audit Mortimer's progression milestones, distinct weighted choices, assignment exceptions and modifier values. Represent an offer as task-plus-modifier options; derive the number of choices from progression. Retain old two/three-choice flags only as explicit hypothetical scenarios during migration.
5. Determine whether modifier category/value probabilities are verified. If only ranges are known, retain configurable assumptions and sensitivity bounds, and label affected results. Do not replace the 20% assumption with another unsupported claim of exactness.
6. Implement relevant repeat effects, including cape behaviour when selected, with any required previous-task state. Unsupported optional effects must be visibly disabled rather than silently ignored.

Acceptance:

- No funded action spends more than the balance allows or violates the configured reserve. Points from a target task cannot fund earlier skips.
- Test first-completion rules, milestone boundaries, separate streaks, diary effects, reset eligibility and setup costs.
- Mortimer offers contain distinct assignment types and normalise over the verified rules. Progression thresholds change available modifiers/choices correctly.
- Test identical tasks with different modifiers: the chosen option and resulting points/quantity can differ.
- Ambiguous or unverified modifier probabilities remain visible in results and exports.

## Increment E — Deliver editable plans, named profiles and comparison foundations

Suggested branch: `codex/editable-plans-and-profiles`.
Dependencies: B, C, D.

1. Add separate actual and proposed block lists by block-list group. Allow protected tasks, fixed blocks, keep/skip preferences and method selections within rule limits. A conflicting goal or impossible user constraint reports a conflict instead of being silently removed.
2. Add named profiles with create, duplicate, rename, import and export. Export reusable configurations as versioned JSON and keep the existing result CSV. Support profile transfer between HTTP, local-file and packaged Windows contexts.
3. Show the cost of moving from the actual list to a proposed list. Do not assume free refunds or that each comparison master can be fully configured from the same points balance at once.
4. Introduce baseline-versus-proposed comparison. Evaluate each scenario independently; a scenario includes its own profile, methods, rules snapshot, goals and assumptions.
5. Add an optional hiscores adapter. In the desktop app, expose only the narrow lookup operation needed; keep renderer Node integration disabled and validate responses. Preserve a fully offline manual path and current settings when lookups fail.

Acceptance:

- Editing one master/group does not alter unrelated lists. Shared-group edits are reflected consistently.
- Profile import validates version, size, numeric bounds, IDs and rule compatibility before mutation. Duplicate IDs and unsupported future versions are rejected with an actionable message.
- Export/import preserves deliberate zeroes, exclusions and overrides. Unknown IDs are reported, not silently dropped; stored originals remain recoverable.
- Cross-platform transfer includes no credentials, caches or personal browser profile. Hiscores lookup never overwrites manually supplied quest/unlock states.

## Increment F — Optimise the selected objective and explain recommendations

Suggested branch: `codex/objective-based-optimisation`.
Dependencies: C, D, E.

1. Support distinct objectives: greatest chance per offer, minimum expected time to the selected stopping event, and minimum points expenditure within a stated time/strategy constraint. Do not merge them into an undocumented weighted score.
2. Evaluate legal block sets, skip/keep decisions, methods and offer choices jointly where they interact. Respect fixed user constraints. Re-evaluate a Mortimer offer's best choice when modifiers or points constraints change its value.
3. Implement exact single-draw reference cases first. For a fixed single target with no skips, expected waiting time is the weighted sum of non-target durations divided by target weight; blocking the largest weight is not generally the fastest choice.
4. Use exhaustive enumeration as an independent oracle on small pools. Use exact search with pruning where practical for real pools. If a search is bounded or heuristic, show best-found status, limits and any established bound; never label it globally optimal without evidence.
5. In sustainable mode, account for both time saved and points/rewards forgone. Longest-first alone is insufficient when task rewards differ. Funded policies must use the transitions from D.
6. Explain each proposed change with marginal chance, expected time and point-cost deltas under the same assumptions. Label combined effects as non-additive where appropriate.
7. Run costly searches in a bundled worker with progress and cancellation. Preserve HTTP, local-file and packaged offline operation; test worker CSP and local loading explicitly. Freeze the inputs and seed/data version for each evaluation, discard obsolete results after edits, and do not share mutable UI state with a worker.

Acceptance:

- Regression example: target weight 1, task A weight 10/time 1 minute, task B weight 1/time 100 minutes, one block and no skips. Chance optimisation blocks A; time optimisation blocks B.
- Exact small-case solutions agree with exhaustive results, including variable rewards, zero-cost edges, ties and protected tasks.
- No legal solution produces an explanation for a different configuration. Infeasible constraints are reported explicitly.
- The interface remains responsive; cancellation and rapid profile edits cannot replace a newer result with an older search.

## Increment G — Compare complete strategies and multiple hunt goals

Suggested branch: `codex/strategy-and-hunt-goals`.
Dependencies: D, F.

1. Compare completion without skipping, sustainable skipping, spending banked points, filler/master milestone boosting and legal reset strategies. Include setup changes and travel. Distinguish resetting from boosting and preserve master-specific restrictions.
2. Start every comparison from the same supplied points, streaks, current-task state and goal. Report completion time, points used/remaining, setup cost and unresolved assumptions.
3. Support any-of target sets and explicit priorities. All acceptable targets remain protected. User priority is not an alteration to the game's assignment weights.
4. Add target-kill quantity goals and selected-item drop goals. Track progress across tasks and use variant-, location-, modifier- and on/off-task-specific rates where applicable. This is a hunt calculator, not the excluded general profit/XP suite.
5. Model the full loop for kill/drop goals: requesting, choosing, completing target kills, rewards, and obtaining subsequent tasks. An offer-only goal still stops before target combat.

Acceptance:

- Comparisons with different stopping events cannot be shown as equivalent rankings.
- Changing the initial streak or banked points can change the best funded strategy while leaving assignment weights unchanged.
- Tests cover overlapping target assignments/variants without double counting, an unavailable member of a target set, repeated target tasks, and goals with no reachable success state.
- Drop probability calculations distinguish fixed kill counts from random task lengths; they do not substitute average kills into a nonlinear probability formula.
- Missing relevant drop mechanics produce an explicit limitation or unavailable goal result rather than a confident estimate.

## Increment H — Add distributions, session probabilities and scenario explanations

Suggested branch: `codex/hunt-probabilities-and-comparisons`.
Dependencies: F, G.

1. Calculate exact offer-count distributions for stationary reference policies. Use seeded simulation for the richer points-, modifier- and strategy-dependent process, including task-duration assumptions.
2. Show mean where resolved, median, 90th-percentile time, chance of success by a selected time, and probability of running short of points. Distinguish random hunt outcomes from uncertainty in DPS, travel or unknown rules.
3. Set explicit simulation size, runtime and horizon limits. Report unfinished probability and sampling uncertainty. Do not average only successful trials and call that the unconditional expected time; percentiles beyond the resolved probability mass remain unavailable.
4. Add side-by-side profiles, a success-over-time chart and a points trajectory/distribution. Both scenarios use the same estimation method; use reproducible comparable simulation streams where useful.
5. Add what-if comparisons for an additional usable block slot, quest/unlock changes and different timing estimates. Apply the full changed scenario rather than re-labelling the baseline result.

Acceptance:

- Simulation agrees within stated statistical tolerances with analytical small cases and reaches repeatable results for a fixed seed.
- Success probabilities are bounded and monotonic over time; impossible goals and censored runs stay explicit.
- Long-tail cases do not falsely appear faster after hitting a simulation cap.
- Every recommendation, chart and export identifies its goal, data version, assumptions and exact versus simulated/approximate status.

## Increment I — Finish the interface and release both editions

Suggested branch: `codex/planner-v2-delivery`.
Dependencies: A–H.

1. Organise the interface around profile, desired creature/goal, current setup and comparison. Use searchable assignment/variant selectors, clear eligibility reasons, protected-task controls and a concise explanation of the recommended plan.
2. Test keyboard operation, readable mobile layouts and accessible charts. Keep deeper timing and probability settings expandable. Never hide essential assumptions behind a tooltip alone.
3. Finalise profile migrations and import/export compatibility. Preserve old payloads before upgrading storage; use one profile schema across web and desktop while keeping their storage independent. Data refreshes show a change preview and do not silently replace an active plan's snapshot.
4. Update the packaging allowlist for generated assets, workers, local icons and catalogue provenance. Retain offline fonts and Electron isolation. If lookup requires changing the current `connect-src 'none'` policy, allow only the chosen boundary; avoid broad network permission changes.
5. Build a versioned Windows folder and ZIP with the custom icon, README, third-party notices and SHA-256 checksums. Keep the current v1.0.0 distribution available. Do not include any test profiles, user settings, credentials or hosting files.
6. Publish the matching private website only as an implementation delivery step, preserving its audience. Record the exact source revision, dataset version and artifact checksums. Do not describe unsigned desktop binaries as signed or verified by a publisher certificate.

Release acceptance:

- Required unit, data, migration and regression checks pass for the release source. Preserve independent oracles instead of merely regenerating expected answers from the implementation under test.
- Browser checks exercise changed targets, locked variants, profile transfer, strategy changes, points exhaustion, simulations, cancellation and offline operation.
- Launch the actual packaged EXE from a newly extracted ZIP, inspect its icon/layout, change and persist a profile, and verify desktop exports. Where available, test a clean Windows account/machine without Node.js installed; otherwise record that limit.
- The archived file checksums match, CRC validation passes, and package inspection confirms the private-data exclusions.
- Validate that preserved v1 settings can still be recovered and that the existing private site audience has not changed.

## Delivery order and scope boundaries

Implement sequentially in the order A → B → C → D → E → F → G → H → I. Treat each increment as a coherent branch/review, with tests and documentation included. Keep the existing hosted-source branch and the current Windows-packaging branch history intact; identify any unmerged base explicitly. No published history rewriting is required.

The first useful corrective release can follow A–C once its migration and delivery checks pass. The next release can follow D–F with funded planning and improved optimisation. G–I completes the requested full scope. Version numbers should be selected during implementation according to actual profile/data compatibility, rather than promised before migrations are designed.

No full loot/profit dashboard, general XP training suite, Ironman banked XP, gameplay automation, account authentication, RuneLite plugin, cloud profile storage or installer/code-signing project is included. Those are separate decisions. No calendar completion estimate is asserted before the catalogue and Mortimer probability audit establish the actual work.

## Sources and investigation gates

Use competitor calculators for interaction ideas, not as an authority for game mechanics:

- [OSRS Tools](https://www.osrstools.net/tools/slayer-calculator): editable blocks, marginal impact and boosting comparisons.
- [Seismic Slayer Task Planner](https://seismic80.github.io/slayer-calculator/): explicit kill variants, presets and timing inputs.
- [Bils Slayer Calculator](https://www.bilsservices.com/tools/slayer): requirements and per-task context.
- [OSRSmath](https://osrsmath.com/calculators/slayer/): eligibility and extra-block comparisons.
- [OSRS Portal](https://osrsportal.com/slayer): task-size and drop-goal presentation.

Rule audit starting points:

- [Slayer rewards](https://oldschool.runescape.wiki/w/Slayer_rewards): per-master lists and the shared beginner list.
- [Basilisk assignments](https://oldschool.runescape.wiki/w/Slayer_task/Basilisks) and [Basilisk Knights](https://oldschool.runescape.wiki/w/Basilisk_Knight): assignment versus creature eligibility. The Knight page specifies level 60 Slayer and The Fremennik Exiles.
- [Mortimer](https://oldschool.runescape.wiki/w/Mortimer), [Mortimer strategies](https://oldschool.runescape.wiki/w/Mortimer/Strategies), and relevant Jagex update/change records: progression, modifier pools and master-specific rules. Distinguish live rules from older proposal/history sections, which can show different milestones.

Before coding those rules, capture the relevant source revision and reconcile conflicts. Exact modifier probability claims, variant/location mappings and shared-block exceptions need evidence; an unresolved value remains an explicit assumption and must not be used to claim an exact optimum.
