# Creature Guide — 2.8.0

## Scope and ownership

The standalone navigation page uses `src/guide` for pure recommendations and `src/ui/creature-guide.ts` for rendering. Its `slayer-creature-guide-v1` preferences contain only guide selections. Account profiles, hunter targets, methods, points and history are not inputs or mutation targets. Profile undo shortcuts are ignored on this page; text editors retain native undo.

The catalogue contains 271 variants, including one mixed Boss timing scenario. The guide includes the 270 individual creatures, with 584 active combat/source forms. Source facts are separate from editorial gear and location rankings. A form's zero and negative values are preserved; unknown numeric values stay unknown. Compound max hits remain text. Inactive, unused and removed forms are excluded. The default form matches explicit variant level or catalogue HP where available. Identical-level visual forms and encounter phases are not inferred to share a farming location.

Mid-level means roughly 70–85 combat stats and practical Barrows/whip/trident-level equipment. Max means 99s with high-end examples; mandatory safety equipment can occupy otherwise stronger slots. No account affordability, current prices, exact DPS or globally optimal loadout is claimed. Boss loadouts and switch notes are starting kits, not complete encounter instruction. Wilderness examples downgrade ordinary armour but still require a deliberate risk decision for weapons, headgear and charges.

## Sources and load control

`tools/build_creature_guide.py` reads the already saved creature/variant captures and the new specialist cache. It makes no network calls and deterministically regenerates `data/creature-guide.json`. The UI links the captured page revision and gives separate source-fact and suggestion qualifications. Monster captures retain their original dates; the data is a snapshot rather than live game verification.

`tools/capture_guide_sources.py --fetch` is an explicit, bounded maintenance command. It requests at most three fixed titles per call, defaults to eight seconds between requests, rejects an interval below five seconds, skips cached titles and never follows links. This task made five Wiki API calls for thirteen fixed titles and saved eleven pages; two unavailable strategy titles were left uncaptured. No bulk monster-page refresh occurred. The app, packaging and ordinary build never call this tool.

The new snapshots cover Slayer training and strategies for Basilisk Knights, Cerberus, Kraken, Araxxor, Alchemical Hydra, Lizardman shamans, Skeletal Wyverns, Demonic gorillas, Tormented Demons and Royal Titans. Their revision IDs are in the captures and generated citations. Wiki-derived data retains the attribution and share-alike terms in `THIRD_PARTY_NOTICES.txt`.

## Verification

- Passed: strict TypeScript check, production build and 158 JavaScript tests. Eleven guide tests cover catalogue/form coverage, Black dragon spawn separation, required shields/weapons/armour, Kraken protection differences, venom/hybrid preparation, dragonfire versus wyvern/baby rules, task-only access, unknown route flags, independent state and recommendation purity. Every source form and offered approach produces both equipment tiers and supplies.
- Passed: six Python tests for nested template/link parsing, zero/negative numeric fields, source form filtering, unknown combat values, location caveats/regions, deterministic dataset reproduction and fetch pacing guards.
- Passed: browser source-form selection changes Werewolf level 88/100 HP to God Wars Dungeon level 93/92 HP. Regular Black dragon level 227 has 190 HP; Wilderness Slayer Cave level 247 has 250 HP and the risk-aware setup. Selecting Taverley updates the prepared route; switching to Ranged changes weapons and keeps required dragonfire protection.
- Passed: browser illustrated search, Kraken's Magic tank/no effective protection guidance, separate guide choice persistence, and returning to the hunter without changing its Cerberus target. Daylight and Midnight layouts were visually inspected, including the 440-pixel responsive layout with no horizontal document overflow. No browser console errors were recorded.
- Passed: every default creature has at least one listed or explicitly supplied source-backed destination. Non-default quest-only forms can honestly report no matching normal farming row.

- Passed: the packaged Windows 2.8.0 executable starts, retains the existing hunter profile and opens the standalone guide with bundled artwork and stat charts in Ember. Native account fields were not edited.

Final archive hashes and publication evidence are delivered separately from this source record. No live game/combat acceptance, independent screen-reader session, complete route walk-through or mathematical gear optimisation was performed.

## Practical limits

Location order is editorial convenience/safety, with optional cannon, multi-target and lower-requirement priorities. Cannon susceptibility and area placement are separate. Multi-combat alone does not guarantee a usable barrage stack. Unreviewed room/access facts remain unknown; the guide never borrows Maxed profile access or assumes quest completion. Optional fast travel is explicitly conditional on its stated unlock. The suggested tank/prayer type does not promise an AFK method or immunity to special attacks.
