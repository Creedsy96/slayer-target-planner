# DPS and gear sanity audit — 2.9.1

## Corrected behaviour

Only recognised wearable equipment/ammunition is retained from bank exports and profile inventories. Import reviews count omitted non-gear/unmodelled rows; bank tables have slot filters. Inert ammunition is removed from melee/magic and non-ammunition ranged setups. Bow/crossbow ammo is filtered for compatibility before candidate pruning. Temporary Gauntlet and Barbarian Assault equipment is excluded from ordinary Slayer recommendations. Equal-DPS choices retain useful prayer/defensive equipment.

Demonbane candidates include Emberlight, Scorching bow and Purging staff. Reviewed wield requirements are respectively 77 Attack, 77 Ranged, and 50 Attack/77 Magic; these correct gaps in the older requirement database. Mark of Darkness is optional and checks 59 Magic. Auto spellbooks derive Ancient access from completed Desert Treasure I and Arceuus combat-spell access from completed A Kingdom Divided. Quest imports now retain the latter fact, and the built-in Maxed preset gains it when previously absent without replacing a manual fact. Explicit spellbook choices remain supported. Autocast checks exclude unsupported staff/spell combinations; manual cast rotations are not presumed. Spell screening selects the strongest available spell in each damage family by its base damage rather than JSON iteration order.

The guide presents melee, ranged and magic owned sets independently. Required shields, headgear and other protection apply to each. A style/location button saves that creature's completion-method preference, preserving hunt targets. Methods and backups retain style and optional pod size. Elite Kourend & Kebos removes Karuulm hazard boots from owned and example sets.

Multi-target burst/barrage output separates single-target DPS and one-creature expected kill time from aggregate DPS. The user's planning assumptions are eight dust devils in the Catacombs pod, nine in the Wilderness Slayer Cave, and a nine-target smoke devil stack in its multi-combat dungeon. A 1–9 override supports other rooms; otherwise unreviewed pods default to one. Multi-combat confirmation is required and powered staves receive no AoE multiplier. Hunter methods use the location's matching NPC form. An unlocated dust-devil method defaults to the accessible Catacombs pod and explains that location. Task estimates and simulations charge complete batches, so a one-kill objective is not assigned one-eighth of a kill time. These are idealised batch/throughput estimates, not an exact joint distribution of independent target deaths; luring, respawns and imperfect stacks need uptime/delay allowances.

## Calculation execution

Guide/example DPS calculations run in their own cancellable worker rather than blocking interface rendering. Hunt block candidates reuse prepared rows. Per-profile combat caches avoid repeating equipment searches for the same monster/form/style/location. Cache identity includes bank, skills, settings, diary and quest facts. Weapon/spell screening precedes detailed slot refinement for four finalists per style; the bounded-search limitation remains explicit.

Workers report percentages and a current master, creature, block candidate, strategy or simulation stage. Preparation is included in simulation progress. Cancellation/error handling releases worker state; Recalculate provides a retry. Guide progress is visible rather than hidden by its standalone layout. Long worst-case searches can still take time; progress is not an ETA.

## Verification — 20 November 2026

Passed: TypeScript, offline build and all 201 JavaScript tests. The 17 added regressions cover non-gear filtering, inert/incompatible ammunition, demonbane and Mark of Darkness, spell tier selection, autocast constraints, quest-cache invalidation, pod bounds, multi/single-target distinction, complete-batch estimates and simulation, all-style protection, style/stack backup round trips, elite boots, invalid slots, temporary gear, armour tie-breaks, progress callbacks and bank slot filtering. The six existing Python parser/data checks passed.

Passed in the in-app browser using a synthetic local profile: import review retained 21 gear rows and omitted food/coins/runes; the Feet filter showed only the two owned boot items; Auto spellbooks and Mark of Darkness controls; separate style results; a Catacombs dust devil with Ice Barrage, eight-target aggregate damage and unchanged one-creature kill time; saving Magic for the creature; named calculation percentages; and completion of ten hunter plans. Native account items were not imported or edited for this check. The three cards fit within the 440-pixel browser viewport (353-pixel cards), and no browser warnings/errors were reported.

Passed: native Electron 45.3.4 / Windows x64 startup from the 2.9.1 distribution, visible named progress (including 32% during Krystilia equipment preparation), and completion of all ten plans on the existing local profile. Existing native account fields were not edited for testing.

A synthetic stress inventory containing approximately 4,000 modelled equipment entries completed Nieve preparation and 50 block evaluations in about 31.5 seconds on this machine. This is a stress observation, not an SLA or a live-bank performance measurement. Small normal fixtures completed all master calculations in the browser. Tests use deterministic model inputs; no live in-game DPS measurements were performed.

## Primary references

- https://oldschool.runescape.wiki/w/Autocast
- https://oldschool.runescape.wiki/w/Demonbane_spells
- https://oldschool.runescape.wiki/w/Emberlight
- https://oldschool.runescape.wiki/w/Scorching_bow
- https://oldschool.runescape.wiki/w/Purging_staff
- https://oldschool.runescape.wiki/w/Burst_spells (nine-target cap)
- https://oldschool.runescape.wiki/w/Karuulm_Slayer_Dungeon (elite diary exemption)

Primary-source search results were checked; no Wiki crawl or bulk refresh was used. Existing revisioned datasets and pinned engine sources remain in place. Boss phases, specials, thralls, supply/charge budgets and full movement/healing rotations remain outside automatic hunter DPS timing and retain the documented fallbacks.
