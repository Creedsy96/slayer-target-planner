# RuneLite quest import and area access — version 2.2

Implementation scope: local quest JSON import, sourced area derivation and manual overrides. The original catalogue remains at `2026-11-19.2`; additive area rules are `2026-11-19.1`. Existing manually entered quest/access fields remain overrides. No WikiSync integration, automatic game-client installation, account authentication, filesystem watching or gameplay control is added.

## Export contract evidence

- Character Export is present in the [RuneLite Plugin Hub manifest](https://github.com/runelite/plugin-hub/blob/master/plugins/character-export). The inspected hub commit was `0386dccc0a9f200127ac8180bf231a799a06e514`; its `exportQuestSnapshot` serializes a `quests` array of `{id, name, state}` with textual `NOT_STARTED`, `IN_PROGRESS`, `FINISHED` states. `basePayload` supplies `exported_at` and the plugin version, but does not identify the account. The importer ignores numeric IDs, session IDs and other payloads.
- [Character Export source](https://github.com/DZWNK/Character-Export/blob/0386dccc0a9f200127ac8180bf231a799a06e514/src/main/java/com/dzwnk/exporter/CharacterStateExporterPlugin.java) and the current README/main source at `d790a93e24c9d946949f47645b0447210b166d93` were compared. Relevant record shapes match. The documented file is `.runelite/character-exporter/<Character Name>/quests.json`.
- [OSRS MCP Companion model](https://github.com/isaachansen/runelite-json-export/blob/a418dfb38a253482eac8dca9166b2cc42cb9b2c4/src/main/java/com/osrscompanion/model/PlayerSyncData.java) uses schema 1, `lastUpdated`, `player.username`, and quest entries containing enum `name`, `displayName` and textual `state`. Its collector supplies the same three state names. Only matching quest records and provenance are kept, not bank/inventory/skills/diaries.

Names are matched with case, punctuation, spaces and enum underscores normalised against the catalogue plus area-rule quest names. Unsupported numeric states are rejected rather than guessed to be RuneLite enum ordinals. Unknown/out-of-scope quests are counted in the preview. Missing relevant quests remain unknown. A new imported snapshot replaces the old one; manual overrides are retained by default and can be explicitly replaced for incoming quests.

## Rule evidence and semantics

`data/area-access.json` owns 20 area rules, each with a primary Wiki page/revision. Raw captures are retained in `data/access-sources.json`. Tests compare every rule's revision with those captures. Do not edit `data/catalogue.json` to change area rules.

Complete-only Slayer gates cover Fossil Island/Wyvern Cave, Iorwerth/Prifddinas, Lithkren dragon wings, Myths' Guild Dungeon and post-quest monsters in Jormungand's Prison. Partial-progress gates retain unknown at the in-progress state for Darkmeyer, Meiyerditch Laboratories, Mourner Tunnels, Lighthouse, Brine Rat Cavern, Neypotzli, Vampyrium, Wyrmscraig, Poison Waste Dungeon, Abyssal Area and Keldagrim. Waterfall Dungeon and Zanaris use positive completion proof only; other entry methods remain manual. No general in-progress state is treated as proof of reaching a specific quest step.

The table distinguishes derived / manual / needs-confirmation results and links the rule source. Setting an area to Auto removes its manual override; explicit Yes/No wins over all derivation. Area access does not prove equipment, transport shortcuts, boss/key availability or repeatable combat methods. Unreviewed areas keep their manual confirmation path.

Imported quest states also feed existing task/master/variant checks. A locked chosen method does not remove its otherwise receivable assignment. Konar excludes closed locations from the secondary location roll; a task with every known location closed is unavailable. Custom location probabilities remain labelled assumptions. Explicit method-location locks apply outside Konar too.

## Verification

Passed: strict TypeScript typecheck and 57 Node tests, including 15 new quest/area tests. The existing integration initially failed both the imported-quest eligibility and Konar location oracles; both pass after wiring the resolver into those paths. Tests cover the two real exporter shapes, partial/missing states, manual precedence and clearing, atomic rejection, source timestamps, unsafe keys, invalid/future schema, aliases/duplicate conflicts, profile round trips, old profile preservation, area snapshot rebasing, explicit method locks and case-insensitive location names.

Passed browser observations using synthetic fixtures in a separate profile:

- File chooser and pasted JSON both produce a review before changing the profile.
- Manual quest conflicts preview the preserved result, and unchecking preservation previews/replaces only incoming overrides.
- Invalid quest state is rejected and the existing imported quests remain intact.
- A completed Bone Voyage derives Fossil Island access; a not-started Song of the Elves closes Iorwerth; in-progress Sins of the Father leaves Darkmeyer unknown.
- Manual area overrides survive subsequent imports. Clearing an override restores automatic access.
- Imported state and derived results survive reload. Filtering and a 375px mobile viewport work without page-wide horizontal overflow.

Live export from the user's own RuneLite character: not run. Export schemas were verified from the owning source; synthetic fixtures establish importer behaviour. Per-step quest progress is unavailable in these formats, so those rules remain conditional/manual. This release does not claim a complete audit of every area's non-quest requirements.

Passed Windows delivery checks: Electron 45.3.4 / app 2.2.0 launched from the new `Slayer Target Planner 2.2 - Windows` folder. Account & access visibly exposes the quest file picker and area-access controls; the existing desktop profile and theme were preserved. The packaged renderer matches the tested build byte-for-byte.

The share ZIP passed CRC and all 78 file comparisons. SHA-256: `d2c3af1952d529b9aa163ef98734973341de7c3b5798fbda81cfc83401e9dd34`. The folder includes area rules, catalogue, notices and updated import instructions. Its source marker points to implementation commit `7d13133`; this evidence-only documentation update does not change the packaged runtime.

Private website publication is verified by the Sites deployment result for the matching pushed source/archive; owner-only access is preserved.
