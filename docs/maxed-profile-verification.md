# Default Maxed profile — version 2.3

Every startup ensures the reserved `builtin-maxed` profile exists. It is selected on a fresh setup; an existing selected profile and all profile contents remain unchanged. Repeated startup/export/import retains one built-in profile without resetting its edits. Duplicates/imported copies receive ordinary independent IDs through the existing UI paths. No profile schema fields or game-data versions change.

The preset grants 99 in all 24 skills, combat 126, completed supported quests and elite diaries, positive known area/variant access and task-unlocking purchases. Recursive requirement traversal also grants nested requirements. Purchases requiring an off state to retain an assignment (Stop the Wyvern) remain off. Mortimer progression is 50, enabling all supported modifier categories and offer choices. Slayer cape repeating remains an explicit choice needing the previous assignment. Points, reserve, streak and combat defaults are not unlimited resources.

Quest points are 343, checked against the primary [Wiki quest-points page](https://oldschool.runescape.wiki/w/Quest_points) and [quest release list](https://oldschool.runescape.wiki/w/Quests/Release_dates) on 19 November 2026. The app's seven ordinary block slots follow the existing 300-QP/elite-diary calculation. Source/model restrictions on which master can assign a variant are retained.

Three new tests exercise every master/task/variant requirement, every known access key, 99/126 levels, block limits, Mortimer choices, round trips, fresh default selection, preservation/idempotency including edited Maxed profiles, and adding Maxed to all 50 existing custom profiles. Imports permit 50 custom profiles plus the reserved default; older releases reject exports containing 51 profiles.

Passed: strict TypeScript check and all 66 automated tests. Browser verification retained the existing selected synthetic profile when adding Maxed, then selected Maxed with 99 Slayer / 126 combat / 343 QP and 50 Mortimer tasks. All 38 supported quest selectors were completed and all 205 known access selectors enabled. Reload retained the Maxed selection and exactly one built-in entry. The browser test did not edit desktop player facts.

Windows version 2.3.0 packages the same generated renderer. Private website publication preserves the owner-only audience. Profile data and preset values remain local to each installation/browser.
