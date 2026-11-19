# Mortimer modifier rules — 2.4

Confirmed scope: every generated task option has one modifier; unlocked types are equally likely; valid values within a range are equally likely with the source's five-unit increments, as explicitly confirmed by the user on 19 November 2026. Type probabilities and value probabilities are separate. A five-type/three-value point range therefore gives 20% for the point type and 1/3 per value conditional on that type.

## Source evidence

- The currently retrieved Wiki API response was revision **15404466**, timestamp **2026-11-17T16:54:38Z**, exactly matching the pinned `data/sources/mortimer.json`. It says every task has a modifier, types have equal chances, and values increase in increments of five. Its table labels the numeric bounds as proposed minimum/maximum values.
- Jagex's [Meet Mortimer: Your Newest Slayer Master](https://secure.runescape.com/m=news/meet-mortimer-your-newest-slayer-master?oldschool=1), 27 July 2026, independently confirms guaranteed modifiers, equal type probabilities, five-step values, flat quantity changes and the updated 0/0/15/25/40 unlock thresholds plus third choice at 50. The updated Venator superior bonus is 200–300%; this explicit update supersedes the older 50–100% row lower in that article and matches the pinned Wiki row.
- The equally weighted **within-range** model is recorded as the user's confirmed planning rule. It is not misattributed to an additional explicit Jagex probability statement. `data/mortimer-modifiers.json` retains this provenance, both source URLs and the Wiki revision.

## Corrections and implementation

The old parser read compact `-15-30` as `[-15, +30]` for six low-level assignments. A mismatched Dark beast label fell back to a negative quantity range even though the source says +30 to +80. The new strict generator matches all 29 task identities without workbook fallbacks, normalises reductions to `[-30, -15]`, parses all five modifier columns, and preserves N/A cells.

The shared core applies this versioned range file over the preserved base catalogue. Original source snapshots/IDs, account requirements, base quantities, task weights and profile schema stay intact. Non-Mortimer masters are unchanged. `dist/data-manifest.json` and simulation exports identify Mortimer rules `2026-11-19.1`. Historical Mortimer results need recalculation after these range corrections.

The sampler uniformly chooses one unlocked category and one valid five-step value. Quantity/point values affect the existing simulation; other bonus values are recorded in traces without implementing XP, clue or superior-loot hunting. N/A means no numeric range is published; it does not invent an exclusion/reroll rule against the user's equal-unlocked-type instruction. Explicit pending/current Mortimer records without a modifier fail with a corrective message. The old speculative distribution blocker is removed. Existing heuristic-policy and Mortimer cape-repeat limitations remain.

## Verification

Passed strict TypeScript checking and 82 automated tests, including eight new modifier tests. Reproduced the old sign/fallback and distribution-blocker failures before the correction. Tested all category thresholds, every published value at its equal-probability interval, both range endpoints, negative reductions, extended-task adjustments, Dark beasts, the Venator update, guaranteed modifiers, invalid manual records, task coverage, source reproducibility and non-Mortimer parity.

Passed browser checks in the synthetic local Maxed profile: Mortimer calculated with zero unconfirmed facts for Crawling hands. Its summary showed five unlocked types at 20% each. A 100-trial simulation completed and displayed the new rule-version/probability note. The range button opened all 29 rows; Crawling hands showed four reduction outcomes at 25% each, and Dark beasts showed +30 to +80 with eleven outcomes. Wiki and Jagex links targeted the owning sources. No desktop player facts were edited for testing.

Windows 2.4.0 and the private website use the same generated renderer/rules. All previous Windows distributions are retained; sharing remains owner-only on the website.
