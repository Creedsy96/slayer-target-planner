# Ranged weapon and ammunition comparisons — 3.0.18

Crossbows were vulnerable to the optimiser's generic raw-stat shortlist, and weapon inspection compared a crossbow with the currently equipped weapon's ammunition. Blowpipe darts are engine equipment items in the weapon slot, so the old ammo-slot-only search never loaded them. The calculator also rejected darts placed in the planner's virtual ammo slot before it could attach them to a blowpipe.

## Weapon pool and ammunition

The search and ranged weapon inspection retain the strongest usable ordinary metal crossbow through Rune, then Dragon and higher crossbows. Ordinary metal tiers share speed and nested bolt compatibility, so the highest accuracy is the retained tier. Dorgeshuun, Hunter/Sunlight, Karil and other distinct ammunition families remain separate. Functionally equivalent cosmetic variants are deduplicated using the pinned engine's canonical IDs. The shown setup remains visible even if it is a lower-tier curated example. Higher/specialist weapons that cannot be equipped remain in inspection with an explicit requirement explanation.

Each crossbow uses its strongest available compatible non-enchanted bolt, ordered by Ranged Strength, plus **every** available compatible enchanted bolt. This includes compatible gem-tipped unenchanted bolts in the raw-damage baseline. Enchantments are not truncated to the generic eight-item armour shortlist. The engine's compatibility table prevents a Rune crossbow using dragon bolts. Each weapon/bolt combination gets its own DPS row, icon and Wiki link. Screening also evaluates all retained crossbow ammunition before choosing finalists; it does not discard a crossbow solely because its first basic-bolt setup is weaker.

Charged Toxic/Blazing, Camphor, Ironwood and Rosewood blowpipes are retained and load the strongest compatible available unpoisoned dart. Dart limits are Adamant for Camphor/Ironwood, Rune for Rosewood, and Dragon for Toxic/Blazing. Darts remain valid hand-thrown weapons in the bank; for a blowpipe they are displayed in the planner's Ammo position and passed to the engine as contained darts. Dart strength is added once, without wearing them in the engine's ammo slot. Missing darts and empty blowpipes produce no invented DPS. Curated blowpipe examples resolve their existing dart labels too. Poisoned darts and Atlatl darts are not loaded into blowpipes.

The local requirement overrides now include Zaryte (80 Ranged), Ascension crossbows (80 Ranged), Sunlight (66 Ranged and 50 Hunter), and Sailing blowpipes (45/55/65 Ranged). Iron crossbow's erroneous Attack requirement is corrected to 26 Ranged, and Dragon hunter crossbow to 70 Ranged. Hunter is editable in Account & access; character imports already retain all named skills. Other unreviewed requirements retain the existing acceptance setting.

Ranged weapon swaps may change ammunition and remove an optional off-hand for a two-handed weapon. Required creature/location shields remain mandatory. Other equipment is held fixed; a complete rebuild may give a different ranking. Enchanted-bolt auto-attack effects use the existing pinned OSRS Wiki engine, without adding special-attack rotations, bolt switching, venom DPS or new diary-proc assumptions. Existing HP-dependent DPS and full-fight timing qualifications remain applicable. Owned quantities establish availability, not sufficient supplies for an entire trip. Maxed's all-gear assumption remains separate from recorded ownership.

## Sources checked

No engine or Wiki bulk refresh was needed. Compatibility and contained-dart mechanics were checked against the retained engine source (`vendor/osrs-dps/source/src/lib/Equipment.ts` and `constants.ts`, existing commit `3da927f4280c73154fa59e4e90eb374af5123d32`). Targeted source searches on 21 November 2026 checked:

- [Crossbow ammunition and level table](https://oldschool.runescape.wiki/w/Crossbows).
- [Zaryte crossbow](https://oldschool.runescape.wiki/w/Zaryte_crossbow).
- [Hunters' sunlight crossbow](https://oldschool.runescape.wiki/w/Hunters%27_sunlight_crossbow).
- [Blowpipe ammunition table](https://oldschool.runescape.wiki/w/Blowpipe), [Ironwood](https://oldschool.runescape.wiki/w/Ironwood_blowpipe) and [Rosewood](https://oldschool.runescape.wiki/w/Rosewood_blowpipe), including its July 2026 Rune-dart upgrade.
- [Toxic blowpipe](https://oldschool.runescape.wiki/w/Toxic_blowpipe), including loaded dart strength.

The Wiki rejected direct page fetches; search-indexed primary Wiki text and the retained engine source supplied the evidence. Runtime guide selections and gear comparisons make no Wiki requests.

## Verification

Production build and strict TypeScript passed. Fifteen regressions cover tier collapsing/equip levels, bolt damage order and compatibility, every enchantment, exact paired DPS/deltas, loaded dart strength and speed, ammo inspection, missing/empty/poisoned darts, Sailing caps, optional versus required shields, curated examples, paired item links, high-HP Ruby screening, thrown-weapon crowding and Zaryte/skill explanations. All 397 JavaScript tests passed, including existing gear, bank, cache, timing and simulation regressions.

A synthetic 17-item localhost import was used in browser QA. Hellhound weapon inspection showed a Toxic blowpipe with Dragon darts at 5.416 DPS, Zaryte with Ruby dragon bolts (e) at 4.438 DPS, and separate Rune/Dragon/Armadyl/Dragon hunter rows for eligible bolts. Adamant crossbow was hidden behind the usable Rune tier. The real native app and its character files were untouched. Windows asset/source parity and ZIP integrity are checked during release packaging.
