# Moon equipment and requirement coverage — 3.0.27

The unavailable Eclipse Moon tassets were caused by missing skill metadata. All nine Moon armour pieces, their New/Used versions, the three weapons and atlatl ammunition now have reviewed requirements. The optional acceptance of unknown requirements can stay off. Broken armour remains excluded from usable owned equipment.

| Equipment | Equip skill requirements |
| --- | --- |
| Blood Moon helm, chestplate and tassets | 75 Strength, 50 Defence |
| Blue Moon helm, chestplate and tassets | 75 Magic, 50 Defence |
| Eclipse Moon helm, chestplate and tassets | 75 Ranged, 50 Defence |
| Dual macuahuitl | 70 Attack, 75 Strength |
| Blue Moon spear | 70 Attack, 75 Magic |
| Eclipse atlatl | 75 Ranged, 50 Attack, 50 Strength |
| Atlatl dart | No independent equip level; the weapon retains its requirements |

The main rules come from [Moon equipment revision 15363383](https://oldschool.runescape.wiki/w/Moon_equipment?oldid=15363383), with the ammunition reviewed separately. This is equipment eligibility, not a new set-effect implementation. The existing combat adapter still declines unsupported full Eclipse burn-set calculations; base atlatl/ammunition and partial-set calculations remain available. Quest, boss-kill, diary, charge and acquisition facts still need the existing account/manual review.

The audit also added explicit reviews for newer normal-game equipment: Masori (ordinary and fortified), Virtus, Torva/Sanguine Torva, Tumeken's shadow, Osmumten's fang, Soulreaper axe, Venator bow, Voidwaker, upgraded Wilderness weapons, ancient sceptres, Warped sceptre, Zombie axe, Noxious halberd, Aranea boots, Zaryte vambraces, Amulet of rancour, Hueycoatl hide, Sunfire fanatic, Dizana's quiver, Elidinis' wards, Burning claws, Keris partisans, Dragon hunter wand, Mixed hide, Scurrius bone weapons, Nagua weapons, Avernic treads, Oathplate, Confliction gauntlets, Twinflame staff, Tome of Earth, Echo boots and Tonalztics of Ralos. Different requirements are retained for fortified Masori, Mixed hide legs, enhanced sceptres and jewelled Keris partisans.

Creation requirements are not misapplied as equip requirements: the ward's 90 Prayer/Smithing, Zombie axe's 70 Smithing, Soulreaper assembly's Magic and ammunition's Fletching are examples. Acquisition skill requirements are likewise separate from wearing gear. Reviewed entries record caveats where appropriate.

`data/equipment-requirement-reviews.json` is the authoritative overlay: 62 review groups, 118 explicit engine item IDs, page URLs and revision IDs. `src/combat/equipment.ts` preserves explicit per-ID requirements and then falls back to the pinned engine's canonical equivalent for missing cosmetic/charge variants. It does not guess requirements from names or equate different tiers. The original OSRSBox snapshot remains intact. Fully unknown entries still obey the existing conservative setting.

Audit coverage after these changes:

| Scope | Candidates | Reviewed requirements | Still unreviewed |
| --- | ---: | ---: | ---: |
| Ordinary combat candidates, with existing activity exclusions and alias deduplication | 2,232 | 2,073 | 159 (previously 318) |
| All usable combat item IDs, including activity-specific variants | 3,056 | 2,816 | 240 (previously 535) |

These are candidate/ID counts, not distinct player-owned item counts. A reviewed empty requirement map means no equipment skill level, not unrestricted access to every item. Remaining entries include newer/niche equipment, cosmetics with combat stats, activity gear and items whose independent access conditions still need review. The complete remaining lists are in `data/equipment-requirement-audit.json`, shipped with the portable app. This release does not claim every equipment gap is resolved.

To repeat the audit without network access:

```text
node tools/build.mjs
node tools/audit_equipment_requirements.mjs data/equipment-requirement-audit.json
```

Verification: build, strict TypeScript check and all 474 tests passed. Ten new regressions cover all Moon versions/weapons, every reviewed skill boundary and unknown skill, broken armour exclusion, alias inheritance, preservation of original per-ID rules, source/ID integrity, acquisition-versus-equipping distinctions, Frost dragon ranged rows, atlatl ammunition, conservative unknown handling and a deterministic full audit. Browser testing on a disposable synthetic character showed all three Moon tassets with numeric ranged DPS at Grimstone Dungeon; Eclipse was usable and selected. Both all-gear assumptions and acceptance of unknown requirements were off. The test character was removed afterward; real desktop characters were not edited. Native interaction with this release was not run.

The captured equipment source pages were fetched through bounded Wiki API requests, normally at most three named pages per call with eight seconds between calls. The initial probe retrieved five named pages in one call. No crawling was performed, and neither ordinary builds nor application use fetches these pages.
