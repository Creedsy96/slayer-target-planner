# Creature variant coverage repair — 3.0.4

Regular Blue dragon was absent because the original workbook used Baby blue dragon as its completion-time representative. Red dragons had the same problem. Separately, the alternative importer accepted only an unnumbered `hitpoints` field, silently dropping pages with fields such as `hitpoints1` and `hitpoints2`.

The catalogue now explicitly includes six ordinary forms: Blue dragon, Red dragon, Steel dragon, Black bear, Rat and Spider. The first five missing source pages were captured in two fixed API requests eight seconds apart. Steel dragon was already cached. The same cached infobox/form parser now imports alternative creatures, including their numbered Slayer requirements, and uses the source's canonical page title.

This restores 27 entries in total:

| Assignment | Restored choices |
| --- | --- |
| Blue dragons | Blue dragon; Vorkath |
| Red dragons | Red dragon |
| Metal dragons | Steel dragon |
| Bears, rats, spiders | Black bear; Rat; Spider |
| Spiritual creatures | Spiritual ranger; Spiritual mage |
| Warped creatures | Warped Terrorbird |
| Vampyres | Feral Vampyre; Vampyre Juvinate; Vyrewatch |
| Birds | Rooster; Seagull |
| Dwarves | Dwarf gang member |
| Elves | Mourner |
| Scabarites | Scarab Mage |
| Trolls | Ice troll |
| Monkeys / zombies | Monkey Zombie; Tortured gorilla; Undead one; Vorkath (also a zombie alternative) |
| Rats | Scurrius |
| Skeletons | Skeleton Mage; Skeleton fremennik |
| Hill giants | Cyclops |
| Lesser nagua | Amoxliatl |

The total is 298 variants including the mixed Boss scenario, 297 individual guides and 676 source forms. Existing variant IDs, assignment order, purchased unlocks and master weights/quantities are preserved. The compatible account-data version stays `2026-11-19.2`; variant and guide revisions advance to `2026-11-21.1`, so saved characters do not require rebasing. Canonical source names receive corrected capitalisation. Reading numbered Slayer fields also corrects Shellbane gryphon's missing level-51 requirement.

Defaults prefer forms with a listed, non-limited spawn. Scarab Mage uses level 93, Vampyre Juvinate level 54, Vyrewatch level 105, and Vorkath its post-quest level-732 / 750-HP form. Other forms remain available in the guide. Restricted and special alternatives retain explicit access/method confirmation and per-master mappings; adding a menu entry does not grant account access. Vorkath, Scurrius, Amoxliatl and the Juvinate's special finishing method retain configured full-fight timing. Vorkath retains dragonfire/venom preparation; Vyrewatch and Juvinates use appropriate vampyre equipment rather than ordinary weapons.

## Audit boundary

The audit examined all 358 retained master assignment rows and compared their cached alternatives with the generated catalogue. A regression requires every cached, active, non-superior monster alternative to remain mapped. A further review of the 70 retained task pages with explicit Monster variants sections found the missing basic forms above. This is not a claim that every quest, summoned, superior, cosmetic, minigame or uncaptured creature on the Wiki is supported. Those need individual task-credit, repeatability, location and encounter review; the generic Boss secondary roll remains unsupported for individual boss hunts.

Normal builds make no Wiki requests. Artwork reused cached originals and fetched the 27 new frames with one metadata request and globally spaced downloads (eight seconds by default, five-second minimum). `--offline` forbids artwork requests. Page capture is limited to five named baseline pages and at most three titles per request.

## Verification

Passed: production build, strict TypeScript, all 260 JavaScript tests and eight Python tests. The regressions cover ordinary forms and HP/level values, normal Blue dragon target export/import and master calculations, existing-character compatibility, numbered skill requirements, master restrictions, repeatable defaults, dragonfire equipment and special full-fight timing. They also check deterministic catalogue/guide regeneration, cached alternative completeness, source-form parsing and request-pacing guards. Browser checks confirmed four blue-dragon options in both pickers and the selected regular dragon's 105 HP / level 111 guide. Desktop and website use the same catalogue, guide data and artwork. Native interaction and live-game combat were not repeated. Publication and package checksums are recorded with the release.
