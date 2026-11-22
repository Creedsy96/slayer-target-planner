# Character onboarding — 3.0.0

Implemented and checked on 21 November 2026.

## Unreleased update

Setup now has seven steps, inserting Travel options after Access & quests. Existing setup progress migrates without changing saved character facts: completed setups stay complete, and an unfinished final step opens travel review. Recognised teleport stock is retained separately from gear. Completed quest/skill gates derive area access directly; known-unmet areas and quest-locked travel are omitted from setup. Partial steps and alternate routes retain manual confirmation. [Current behaviour and validation](eclipse-travel-options.md).

The original 3.0.0 record below describes that release; its manual area override and non-gear filtering statements are superseded by the changes above.

## Behaviour

Fresh storage opens a choice of a first character or Maxed. Existing v1/v2 storage avoids that modal. New-character creation offers a checked Character Setup Wizard box. Backups retain schema 2 and internal `profiles` fields; visible terminology is characters.

The wizard saves six steps: plugin installation/export, transactional file review, combat/points/streaks/diaries/prayers, purchased rewards, remaining quest/access checks, and a final unresolved-fact summary. Incomplete setup resumes after reload. Users can exit and return through Settings. Facts save immediately; hunt calculations defer during setup and start on exit. Unknown facts are not granted. Continuing the combat step accepts unset diary defaults as No. Purchased rewards start off.

Matching character, bank, inventory, equipment, quests and diaries JSON are supported, plus explicitly identified custom group storage. The bundle rejects mixed accounts/sessions, duplicate files, invalid flags, unsafe keys and oversized input before applying changes. It uses base skills, discards non-gear, preserves manual quantities and quest/area overrides, and only fills unanswered diary flags. Snapshots replace their own container. The supported elite diaries are Lumbridge & Draynor, Kourend & Kebos and Western Provinces. Quest points, Slayer points, streaks, purchases, prayers and partial quest steps still need manual input.

One-click cards highlight Yes and include icons. Unknown access stays visibly unconfirmed. Ordinary areas without hard entrance restrictions default Yes. Quest controls retain Unknown / Not started / In progress / Completed. Completed quests, confirmed access and completed diary/prayer checks hide on reload, rather than disappearing under the pointer. Settings reveals completed checks or re-enables normally open area controls for restricted accounts. Purchased rewards remain visible because they can be toggled in game.

The skippable practice tutorial covers the Basilisk Knight target, real Nieve/Duradel/Konar analytical estimates, all six strategies and full-simulation outcome meanings, a Waterfiends roll, a highlighted real Duradel skip list, a practice skip, a Basilisks roll, and the actual creature guide. Duradel is used because Nieve does not offer Waterfiends. The scripted rolls do not predict future offers. The 500-to-470 example changes no real points, bank, account facts or hunt. Copying only target and funded strategy is an explicit final option. Practice guide changes do not persist as personal guide preferences. Its illustrative guide does not run an owned-gear search. Replay from Settings.

## Area review

Rules 2026-11-21.1 retain the original 20 captured quest gates. New gates cover Crypt of Tonali, Ruins of Tapoyauik, Fremennik Isles, Slayer Tower, Slepe, Meiyerditch, Evil Chicken’s Lair and Smoke Dungeon. Skill/partial-step rules cover Ancient Cavern, Charred Dungeon, God Wars Dungeon and Troll Stronghold. Death Plateau’s ordinary entrance stays open: danger is not an unlock. Fremennik Isles ordinary task-island access derives from Fremennik Trials, rather than requiring completion of Fremennik Isles. Smoke Dungeon remains separate from open Smoke Devil Dungeon. RuneLite’s actual Sir Amik Varze quest name is recognised.

Ancient Cavern checks 35 Firemaking and Otto’s pyre-ship instruction; full Barbarian Training or Dragon Slayer II proves the step. God Wars checks 60 Strength OR 60 Agility; Troll Stronghold completion proves the normal quest route, while partial progress or the Easy Combat Achievement alternative needs confirmation. Charred Dungeon checks 60 Sailing. Tools, fees, hazard protection, teleports and individual monsters remain separate. Gated areas retain manual overrides. Older 2026-11-19.1 backups upgrade only their area-version metadata. The built-in Maxed preset fills newly introduced missing quest facts.

New entries link primary Wiki pages, with `revision: null` where an archived revision was not captured. Existing pinned revision tests remain intact. No new bulk Wiki scrape or repeated API harvest was run; cached search extracts and existing local snapshots were used. Exports cannot establish precise partial quest steps or every alternate route.

## Exporter review and sources

- [Character Export README/source](https://github.com/DZWNK/Character-Export/blob/main/README.md): installation, Sync Available/Open Folder, schemas and availability. Matching local 0.6.0 schemas were inspected without uploading private exports.
- [Combat-achievement mapping report](https://github.com/DZWNK/Character-Export/issues/4): reported incorrect task IDs/completion flags in 0.6.0. Automatic achievement unlocks are excluded and explained in the import review.
- Collection-log discoveries do not establish current ownership. Seed vault is not gear. Status/diagnostic files are not account facts. These files produce notes; their contents are not saved.
- The plugin does not export Group Storage. Manual shared gear and custom group snapshots remain optional, independent sources.
- Entrance sources live in `data/area-access.json` and `src/rules/hard-areas.ts`, including [Smoke Dungeon](https://oldschool.runescape.wiki/w/Smoke_Dungeon), [Ancient Cavern](https://oldschool.runescape.wiki/w/Ancient_Cavern), [God Wars Dungeon](https://oldschool.runescape.wiki/w/God_Wars_Dungeon), [Charred Dungeon](https://oldschool.runescape.wiki/w/Charred_Dungeon), [Troll Stronghold](https://oldschool.runescape.wiki/w/Troll_Stronghold) and [Fremennik Isles](https://oldschool.runescape.wiki/w/The_Fremennik_Isles).

## Verification

- TypeScript: passed.
- JavaScript: final full suite passed, 243/243 tests, including all nine onboarding regressions.
- Python guide parser tests: six passed.
- Regressions cover defaults/opt-out, atomic bundles, gear filtering, base levels, diary aliases/preservation, manual overrides, account/session mismatches, duplicate/unsafe input, group storage, ignored exports, backups, hard/open access, hide/reveal lifecycle, actual Waterfiends eligibility/skip, six strategy estimates, idempotent practice balance and guide rendering without a permanently pending search.
- Browser: fresh first-character choice, checked wizard default, six-file synthetic review/import, imported skills/diaries, points/streak entry, one-click Basilocked, reload/resume, practice estimates, strategy change, highlighted Waterfiends, 470 practice balance, actual Knight guide and finish preserving real 500 points and streak 50. Fresh Maxed choice, tutorial skip, reload without repeated welcome and the wizard opt-out opening Account & access also passed.
- Windows: the packaged 3.0.0 app started with the existing character list and no first-launch popup. BGM_Lolager retained its saved hunt and displayed calculation progress.
- Existing private exports: all account facts, gear, rewards and overrides survived validation; only area-version metadata changed. Private files remain ignored and unshipped.
- Limits: a fresh RuneLite plugin installation/export was not performed. Instructions and parsing were checked against upstream source and existing exports. Scripted outcomes are teaching examples and practice timing is not personal DPS. Tests do not prove every in-game route or alternate unlock.
