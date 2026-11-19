# Empty plan details — 2.4.2

The selected-strategy card renders Why these blocks? only when the proposed block list is nonempty, and Unconfirmed requirements and modelling assumptions only when that list is nonempty. Useful issue panels remain intact. The Proposed blocks summary still says None when appropriate.

Passed strict TypeScript checking and all 82 existing tests. No new unit tests were added for this small rendering change. In the synthetic browser profile, the initial populated block explanation appeared while the zero-count requirements dropdown was absent; setting zero block slots hid both empty dropdowns. Selecting an unreviewed Konar target restored the one-item requirements dropdown while leaving the empty block explanation hidden. Test target and block-limit changes were restored afterward. Desktop player facts were not edited for testing.

Calculation rules, profiles, visibility preference, data versions and source links are unchanged. Windows and owner-private web deployment use the tested generated renderer.
