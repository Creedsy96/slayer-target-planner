# Strategy and point-reward audit — 2.6.2

Requested: audit the remaining strategies, especially Turael boosting and points. Baseline: 2.6.1, commit ada6aa9708ddb3d4b6fd7130979830b4818c32b9. Catalogue, area and Mortimer-range versions are unchanged.

## Findings

| Component | Correction |
| --- | --- |
| Both boosting strategies | The table omitted filler tasks. A periodic completion-count model now includes requests, combat/travel and the starting streak. |
| Filler blocks/access | Unpurchased automatic proposals are no longer granted. Recorded actual lists are used; shared groups use the main proposed list and one setup payment. Access and methods are checked. |
| Counter compatibility | Table and simulation both require a normal-streak milestone master. |
| Pending offers | Off-schedule options use their actual master and reward rules before the planned schedule resumes. |
| Ordinary/sustainable/funded timing | Incompatible locations use the simulation's non-target completion method. Point rates include request overhead. |
| Funded estimates | The table is explicitly an unlimited-funds benchmark; finite-wallet simulation supplies the actual result. |
| Terminal rewards | Goals on the task's last kill receive the completion reward once; mid-task stops and offered targets receive no future reward. |
| Observed offer goal | A known compatible target stops before unnecessary setup purchases or requests. |
| Mortimer | Actual modifiers, unlocked categories and valid increments are checked. A mean cannot become a received reward. Milestone multiplication remains inapplicable; modifier-aware point rates require simulation. |
| Diary bonuses | Unknown bonuses are explicit. Conditional scenarios state the completed-diary assumption; actual task logging requires confirmation. |
| Cape | Last-assigned history includes paid skips, source master and retained Konar compatibility. Missing starting details require confirmation. Always-accept is explicit; optimal choices and Mortimer cape choices remain unsupported. |
| Advanced editor | Disclosure state survives temporarily missing worker results. |

## Independent mathematics

For completion-count phase s, let T be target-offer probability, U paid-skip probability, V = 1−T−U completion probability and C expected request/action minutes before a target offer. Skips keep the same phase:

E[s] = C[s] + U[s] E[s] + V[s] E[s+1].

Rearrange to E[s] = C[s]/(1−U[s]) + V[s]/(1−U[s]) E[s+1], then solve around the configured period. The same recurrence gives expected requests and skips. A stationary skip stall withholds the analytical estimate; actual-wallet simulation can complete unaffordable skips.

Point-farming rates separately cover 1,000 completed tasks, both masters and request overhead. The ordinary 1.775 factor is asymptotic. A fresh 1,000-task streak earns base × 1,771 because its first four completions earn zero. Established cycles earn base × 1,775. Bonuses do not stack.

Independent fixture: 2-minute fillers, a 100-minute milestone task and one minute/request. A guaranteed target at every tenth master takes 9×3 + 1 = 28 minutes to be offered, not one minute. Completing it takes 128 minutes and earns the task-10 reward. At streak 53, six fillers precede task 60. Off-schedule actual tasks use their real next completion index.

For 49 Mazchna tasks and an 18-point master at task 50, an established streak earns 660 points. A fresh streak earns 636 because four Mazchna completions award zero. This distinguishes the Wiki's farming-cycle example from initial warm-up.

## Rule checks

Checked 19 November 2026 through indexed primary Wiki pages; direct retrieval was robots-restricted.

- [Slayer reward point](https://oldschool.runescape.wiki/w/Slayer_reward_point): warm-up, milestone bonuses, long-run factor, counter separation and boosting examples.
- [Mazchna](https://oldschool.runescape.wiki/w/Mazchna): six base points and access requirements.
- [Slayer Master](https://oldschool.runescape.wiki/w/Slayer_Master): Mortimer modifier-only points, no milestone multiplication or normal-counter contribution.
- [Slayer cape](https://oldschool.runescape.wiki/w/Slayer_cape): same-master repeat, last assigned task after skipping, and Konar location retention.

Equations and numerical fixtures are independent derivations, not quoted Wiki formulas. Previously confirmed uniform Mortimer modifiers and five-step values are preserved.

## Verification

- Passed: strict TypeScript check, production build and all 141 automated tests. The regressions include independent deterministic reward totals, periodic boosting versus seeded simulation, finite-wallet conservation for all six strategies, completion boundaries, actual offers and cape history.
- Passed: browser checks with 20,000 trials each for Nieve/Cerberus. Turael boosting estimated 19h39m and simulated 19h47m; Mazchna boosting estimated 30h2m and simulated 30h13m. Starting normal streak was 53. Earned/spent/remaining balances conserved points. Funded simulation respected the reserve; missing cape history produced actionable guidance.
- Passed: advanced disclosure stays open through worker refresh. Browser console contained no errors during these checks.
- Passed: Windows 2.6.2 packaging and byte parity between the packaged planner and verified production build. Native startup displayed the 2.6.2 footer and loaded the existing profile without editing account fields.
- Not run: live gameplay and another computer. Publication and share-archive checksums are delivered separately from this source record.

## Limits

Analytical time stops at a compatible offer from a fresh request. Configured methods and uniform quantities remain assumptions. Simulate existing assignments/offers, cape, finite points, kill/drop goals and warm-up rewards. Boost point rates assume continued completion, not stopping on the target offer. Mortimer choice and block searches remain heuristics. No live-game or cross-computer result is inferred from this audit.
