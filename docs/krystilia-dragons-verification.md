# Krystilia Black dragons correction — 2.5

Reproduction: strict Maxed with Cerberus selected correctly failed Krystilia's target-area restriction, but its issue panel also reported Black dragons / Baby black dragon outside the Wilderness. The Black dragons assignment itself was eligible (weight 4); the automatic non-target method had no valid variant to choose because the catalogue omitted regular black dragons. The first regression reproduced this before the correction. Ordinary Hellhound hunts could also be stopped by that invalid non-target method.

## Source and data correction

Retrieved the primary Black dragon Wiki page through its API, retaining revision **15286221**, timestamp **2026-08-03T12:25:01Z**, under `data/variant-sources/black-dragon.json`. It explicitly provides 190 HP for level 227 and 250 HP for the level-247 Wilderness Slayer Cave variant, and names Lava Maze Dungeon and Wilderness Slayer Cave. Existing Krystilia revision **15389119** lists Black dragons (8–16, extended 40–60, weight 4) in those areas and excludes King Black Dragon/lava dragons.

`tools/build_variant_additions.py` builds two reviewed variants from that source. The shared core applies `data/variant-additions.json` without modifying the preserved base catalogue, task weights, assignment IDs, requirements or account facts. Default automatic method selection can now choose regular black dragons for Krystilia. Explicit saved methods remain explicit. Krystilia's permitted locations are recorded per variant; an explicitly entered Taverley method cannot become Wilderness-valid merely by selecting a regular dragon. The method editor displays the master-specific location restriction.

Target method issues are listed first. Genuine issues on explicitly configured non-target methods now say Non-target method and explain that the assignment can still be offered while its selected method is incompatible. Fully skipped non-target assignments no longer report a completion-method issue. Cerberus, baby black dragons, brutal black dragons and King Black Dragon remain invalid Krystilia alternatives.

Variant rule version `2026-11-19.1` is included in the data manifest and simulation exports. Old profiles retain their methods and targets; profiles that select either new ID require this release or later. The active catalogue has 271 variants, comprising the preserved 269 plus these two additions.

## Verification

Passed strict TypeScript checking and all 89 tests, including seven new regressions for the original diagnostic, Black dragons pool membership and weight, ordinary Hellhound calculability, source HP/mappings, explicit-location rejection, preservation of incompatible saved methods, target/non-target issue ordering, full-skip diagnostics and reproducible source generation.

Passed browser observations in the synthetic Maxed profile: with Cerberus selected, Krystilia showed exactly one issue, Target method: Hellhounds → Cerberus. No Black dragons issue was present. Selecting ordinary Hellhound produced a Krystilia result with zero unconfirmed facts; Tasks & blocks showed Black dragons at weight 4 with Black dragon (level 227), estimated 8.2 combat minutes under the test inputs. No desktop player facts were edited for these observations.

The web and Windows packages use the same generated renderer. Private publication retains owner-only access and prior Windows distributions remain available.
