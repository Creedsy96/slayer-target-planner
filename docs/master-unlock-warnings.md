# Available masters with target unlock warnings — 3.0.11

When a selected creature needs a purchased Slayer reward, a master that otherwise supports the target remains visible and selectable with **Master available · Requires [reward]**. This applies with Show unavailable masters off and in both normal/compact master pickers. Nieve, Konar and Duradel therefore stay visible for Basilisk Knights when Basilocked is not recorded as purchased.

The warning is shown directly in the comparison and selected-master card. **Review Basilocked** (or the appropriate reward) opens Account & access, filters to that reward and focuses its control. It does not toggle ownership or spend points. The expandable explanation is labelled Requirements to review rather than Why unavailable for these rows.

Master access, task availability and calculated plans remain separate. The display classifier checks the master's own requirements, the chosen assignment/variant and compatible accessible location after considering only the missing direct purchased-task rewards. It never mutates the character or the evaluated plan. Missing levels, quests, incompatible variants/locations and blocked targets retain the existing unavailable behavior. Negative requirements such as Stop the Wyvern being off are not purchase recommendations. Alternative-route requirements retain their existing explanations.

A locked-only target is not ranked as currently obtainable: odds, KPH, block proposals/costs and point-rate figures remain pending. Selecting that master shows its warning and requirements, with no simulated or proposed hunt strategy until the unlock is confirmed. If other selected targets are currently valid, the current plan can still rank those targets and warns about the omitted locked one. An explicit conditional scenario retains its existing unknown-fact assumptions; known unpurchased rewards remain locked.

Existing available-master recommendations, account facts, purchased rewards, methods, block lists and character JSON are unchanged. Recording a purchase through the normal reward control recalculates the real plan and removes the warning. No schema or calculation changes are required.

## Verification

Nine regressions cover three Basilocked masters, known/unknown/already satisfied rewards, other account and location restrictions, mixed-target hunts, negative/alternative/block requirements, both pickers, direct correction links, all ranking objectives, filtering, escaping and preservation of the original profile/rates. Browser verification with a synthetic character confirmed Duradel, Nieve and Konar remain in a five-master comparison with Show unavailable masters unchecked. Selecting Duradel showed the warning; its review action focused Basilocked while ownership stayed off. Pending plan figures were blank. Native desktop interaction was not repeated.

Passed: production build, strict TypeScript and all 312 JavaScript tests on the final source. Packaged asset/source parity and archive checks accompany the release.
