# Default Maxed profile — versions 2.3 and 2.3.1

## Current correction: 2.3.1

The user corrected the preset to start with no Slayer-point reward purchases. All 13 known rewards now explicitly start at zero, including creature unlocks and Stop the Wyvern. Maxed skills, quests, diaries and area access remain enabled; a purchased creature's assignment is still gated by its reward. The sidebar and README describe this distinction.

Existing reserved Maxed profiles without `maxedPresetVersion` receive the correction once on startup. Only the reward fields, the optional version marker and a note change; other profile settings and all custom profiles remain intact. The constructor saves this update even when the profile count is unchanged. Version 1 of the preset marker then preserves future manual purchases across reload/export/import. The storage schema and catalogue/area versions remain unchanged.

Passed: strict TypeScript checking and all 68 tests. The two new regressions failed against the prior implementation, then passed after the correction. They verify unpurchased rewards, Basilocked gating/manual activation, one-time migration, other-field preservation and later purchase persistence. Browser observations upgraded the existing synthetic Maxed profile: all 13 rewards off, 38 quests complete and 205 access facts on. Manually enabling Basilocked survived reload; the test then returned it to off. Desktop player facts were not edited for testing.

## Original 2.3 release evidence

Every startup ensures the reserved `builtin-maxed` profile exists. It is selected on a fresh setup; an existing selected profile and all profile contents remain unchanged. Repeated startup/export/import retains one built-in profile without resetting its edits. Duplicates/imported copies receive ordinary independent IDs through the existing UI paths. No profile schema fields or game-data versions change.

The preset grants 99 in all 24 skills, combat 126, completed supported quests and elite diaries, positive known area/variant access and task-unlocking purchases. Recursive requirement traversal also grants nested requirements. Purchases requiring an off state to retain an assignment (Stop the Wyvern) remain off. Mortimer progression is 50, enabling all supported modifier categories and offer choices. Slayer cape repeating remains an explicit choice needing the previous assignment. Points, reserve, streak and combat defaults are not unlimited resources.

Quest points are 343, checked against the primary [Wiki quest-points page](https://oldschool.runescape.wiki/w/Quest_points) and [quest release list](https://oldschool.runescape.wiki/w/Quests/Release_dates) on 19 November 2026. The app's seven ordinary block slots follow the existing 300-QP/elite-diary calculation. Source/model restrictions on which master can assign a variant are retained.

Three new tests exercise every master/task/variant requirement, every known access key, 99/126 levels, block limits, Mortimer choices, round trips, fresh default selection, preservation/idempotency including edited Maxed profiles, and adding Maxed to all 50 existing custom profiles. Imports permit 50 custom profiles plus the reserved default; older releases reject exports containing 51 profiles.

Passed: strict TypeScript check and all 66 automated tests. Browser verification retained the existing selected synthetic profile when adding Maxed, then selected Maxed with 99 Slayer / 126 combat / 343 QP and 50 Mortimer tasks. All 38 supported quest selectors were completed and all 205 known access selectors enabled. Reload retained the Maxed selection and exactly one built-in entry. The browser test did not edit desktop player facts.

Windows version 2.3.0 packages the same generated renderer. Private website publication preserves the owner-only audience. Profile data and preset values remain local to each installation/browser.
