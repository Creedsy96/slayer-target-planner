# Custom-account hunt planning — 2.9.5

Investigation of a local custom account showed ten finished master calculations but an empty visible table. Combat skills and bank gear had been imported, while quest states, diary flags and quest points were unknown. Unknown assignment requirements legitimately prevent an unconditional task-pool calculation. The generic empty-table message hid the specific correction route.

Two additional planning problems were reproduced and fixed:

1. Block-capacity uncertainty gated a plan even when it used zero blocks, or a known minimum capacity was already enough. Evaluation now requires capacity confirmation only for blocks beyond confirmed capacity. Known over-capacity lists remain invalid and a universal seven-slot cap remains enforced. An automatic result using incomplete capacity is labelled as a confirmed-capacity baseline, rather than certified optimal across unknown slots. Fixed proposed lists retain their ordinary validation.
2. Automatic non-target methods selected the lowest HP/multiplier among every eligible variant, including those with unconfirmed access or repeatability. The default now chooses among fully confirmed variants when one exists; unconfirmed candidates are considered only if there is no confirmed choice. Explicit player methods and their requirements are preserved. No quest, reward, access or encounter restriction is granted by this preference.

When no plan is available, the hunt page displays a What needs attention panel even if unavailable table rows are hidden. It prefers masters with a compatible target method and confirmed master access, then fewer unresolved facts. The panel includes named requirements, links to account/block controls and existing revisioned sources. This does not alter account facts or turn on conditional assumptions.

Verification on 20 November 2026:

- Passed: TypeScript, offline build, all 234 JavaScript tests and six Python checks.
- Passed: six new regressions for zero-block baselines, genuine missing quests, uncertain versus impossible capacity, preference for a confirmed ordinary variant, explicit unconfirmed methods, and the all-hidden diagnostic panel.
- Passed: Windows x64 / Electron 45.3.4 native startup and completion of all ten master calculations using the actual custom account. After the user's approved import, the Guard dog hunt displayed Turael, Spria and Mazchna with zero unconfirmed facts, with Turael recommended at approximately 53 minutes to a target offer. This uses owned-combat timing and a zero-block baseline; it is not a measured in-game hunt time.
- Passed: the native saved-profile export matched the verified local quest snapshot (39 relevant states) and approved three diary flags. A before/after comparison found only questImport and diaries changed. Bank data, manual quest/area overrides, purchased rewards, hunt settings, points, methods and every other profile field were preserved. Personal exports and the native screenshot remain outside Git and distributions.

Quest points and purchased rewards cannot be inferred from bank gear or the supplied quest summary. They remain as recorded. Other targets may still require these facts, explicit encounter/location confirmations or a conditional scenario; the panel explains those cases. No game DPS, incoming damage or real hunt-time measurements were run. Profile schema/backups are unchanged, and the corresponding source is supplied with the Windows distribution.
