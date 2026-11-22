# Unavailable-master checkbox — 2.4.1

Restored Show unavailable masters above Master comparison, with an unavailable count and visible/total count. Existing users initially retain the all-masters display; the checkbox preference is saved separately on each device. Toggling filters the view without changing profiles or recomputing plans. Hiding the selected unavailable master selects an available one where possible; otherwise its detail panel is hidden and an actionable empty state is shown. Issue explanations remain attached to unavailable rows when shown again.

Passed: strict TypeScript checking and all 82 existing tests. No new unit tests were added for this small view preference. Browser checks in the synthetic local profile showed 10 rows with the checkbox on, 4 available rows with it off, remembered the off state after reload, selected an available row after hiding the previously selected unavailable one, and displayed the empty-state guidance when no masters were available. Re-enabling showed all 10 rows and their issue panels. The checkbox was returned to on for the screenshot.

Calculation rules, data/rule versions, profile JSON and themes are unchanged. The Windows package uses the same generated renderer; private publication preserves owner-only access.
