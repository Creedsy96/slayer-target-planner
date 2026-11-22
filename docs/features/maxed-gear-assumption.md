# Maxed equipment assumption — 3.0.6

The built-in Maxed character starts with **Assume all ordinary-game gear is available** enabled in Settings, together with automatic equipment-based hunt timing. Best in your Slots and item comparisons use that available equipment without a bank import. Actual bank snapshots, manual quantities and group items are retained separately; no invented inventory or quantities are saved.

This is an explicit scenario flag (`assumeAllGear`), not a lookup of the character name. New custom characters continue to use recorded gear. Duplicating a scenario retains its assumptions, which can be disabled in Settings. Known skill requirements, required creature/location protection, compatible ammunition and two-handed weapon conflicts still apply. Maxed can use modelled equipment whose skill requirements are unreviewed because equipment access is explicitly assumed.

Existing built-in Maxed characters receive the assumption and automatic timing once when the flag is missing. Levels, quests, diaries, bank contents, manual edits, methods, points, hunts and purchased Slayer rewards are preserved. Turning the assumption or automatic timing off is respected on later reloads. Slayer-point creature unlocks still start off for a fresh Maxed character.

The guide, Bank & gear, Settings and item comparisons disclose **All gear assumed**. Assumed comparison items are labelled **Assumed available**, never claimed as banked items. Both worker combat caches and UI equipment caches include the flag, so an assumed setup cannot leak into a bank-only character or survive disabling the assumption.

## Available equipment

The pool uses the pinned OSRS Wiki DPS engine's modelled equipment, with equivalent cosmetic/charge variants deduplicated using that engine's aliases. Charged gear, ordinary untradeables and replenishable ammunition/runes are assumed available. Temporary activities, beta/tournament items, PvP-only variants, seasonal equipment and explicitly unobtainable items are excluded from the assumed pool. Recorded inventories retain their previous behaviour.

Four fixed Wiki pages were retained through two bounded API requests eight seconds apart: [Wilderness champion amulet](https://oldschool.runescape.wiki/w/Wilderness_champion_amulet), [Demonic Pacts echo equipment](https://oldschool.runescape.wiki/w/Demonic_Pacts_League/Echo_bosses_and_echo_equipment), [Raging Echoes echo equipment](https://oldschool.runescape.wiki/w/Raging_Echoes_League/Echo_bosses_and_echo_equipment) and [Unobtainable items](https://oldschool.runescape.wiki/w/Unobtainable_items). Revisions are recorded in `data/assumed-gear-exclusions.json`. `tools/build_assumed_gear_exclusions.py` reads only these retained sources and the pinned equipment list, with no network access.

The generator reads equipment names from the overview item templates and IDs from the relevant unobtainable sections. It requires an ID and matching item name before excluding an item: historical cache IDs may have been reused for ordinary equipment such as Rogue boots and Camulet. “Have since been released” is not treated as an exclusion. The exclusion snapshot is bounded reviewed coverage, not a live catalogue of every future item or game mode.

## Verification

Regressions cover the fresh preset, empty actual inventory, each equipment slot, ordinary versus seasonal/unobtainable availability, reused IDs, custom characters named Maxed, one-time upgrades, saved bank/facts/reward preservation, opt-out persistence, invalid flag rejection, cache isolation, reflecting shields, honest comparison ownership and deterministic offline exclusion generation. Existing bank/manual-timing fixtures explicitly disable the scenario assumption so they continue to exercise real ownership constraints.

Passed: production build, strict TypeScript and all 277 JavaScript tests. Browser checks confirmed both assumption and automatic-timing controls enabled on the upgraded Maxed character, supported melee/ranged/magic guide setups without an import, and a recorded bank with zero item types/manual quantities alongside the assumption notice. Native interaction and live-game combat were not repeated. Packaging checks and release checksums are delivered with the release.
