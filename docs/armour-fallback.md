# Body and leg armour fallback — 2.9.2

The optimiser previously treated an empty body/leg slot as a valid offensive choice. Armour with accuracy penalties could lose to wearing nothing, and the earlier tie-break favoured prayer regardless of the recommended tank/prayer plan. The three owned guide cards also forced tank mode internally.

The search now preserves a genuine DPS upgrade, then fills body/leg slots that are not upgrades using eligible owned armour. Prayer recommendations prioritise prayer bonus, then defence. Tank recommendations prioritise equipment defensive bonuses against the creature's listed attack styles, then prayer. Style-compatible pieces without an accuracy penalty are preferred; when all owned candidates penalise that style, the least penalising tier is used. This is a transparent equipment-bonus ranking, not an exact incoming-damage/survival model.

The defensive/prayer candidate is retained outside the eight ordinary slot candidates, so a large bank does not prune it just because many items have equal offensive stats. Required equipment remains protected. Quantity, skill and unknown-requirement checks still apply, as do shield/two-handed and full-set/autocast constraints. If no compatible usable owned armour exists, the slot has an explanatory tooltip and the gear notes identify it.

Armour is completed before comparing weapon/style finalists. DPS, hit chance and expected kill time are recalculated from the resulting complete set, including any accuracy penalty. The hunter consumes the same result; it never displays a filled set while using the old unarmoured DPS. The shared recommended prayer/tank plan now feeds all three owned style cards. Choosing a style saves its armour priority; Combat methods can override it or return to the recommended plan. Existing profile backups remain readable.

Verification on 20 November 2026:

- Passed: TypeScript, offline build, all 211 JavaScript tests and six Python parser/data checks.
- Passed: ten new regressions covering tank/prayer selection, negative-accuracy armour with an actual DPS/kill-time change, ranged/magic style compatibility, preservation of DPS upgrades, mandatory Shayzien pieces, reflecting shields and two-handed restrictions, unusable/zero-quantity items, relevant incoming attack styles, large candidate pools, shared guide/hunter priority and profile validation/round trips.
- Passed in the browser with a synthetic local inventory: a prayer recommendation chose Proselyte body/legs for melee and monk robes for ranged/magic; switching to tank chose Torag's body/legs for melee. Saving Magic retained Prayer bonus first in its hunter method. Switching that override to the recommended plan preserved an independently edited pod size, then the pod size was restored to Auto. All three cards fit at 440 pixels (353-pixel cards), with no browser warnings/errors.
- Passed: Windows x64 / Electron 45.3.4 package startup showing 2.9.2 and completion of ten master calculations on the existing local profile. Native account fields were not edited and no synthetic inventory was imported there. Completion is distinct from eligibility; unavailable plans retain their requirement diagnostics.

No game DPS or incoming-damage measurement was run. The owned search remains bounded, and manual/measured methods and documented boss fallbacks retain their established precedence. All test inventories and runtime evidence stay outside source control.
