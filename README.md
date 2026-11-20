# Slayer Target Planner 2.9.4

An offline-capable creature hunt planner for the private website, local browser and portable Windows app.

## Start

Open `Slayer Target Planner.exe` in the **Slayer Target Planner 2.9.4 - Windows** folder on the Desktop. The matching ZIP is inside that folder; extract the complete archive before running the shared EXE. No installation, administrator access, Node.js or site login is needed. The Windows x64 binary is unsigned.

For the browser copy, open `Open Planner.cmd` or `dist/index.html`. The private site is [Slayer Target Planner](https://slayer-target-planner-owen.heaaga.chatgpt.site). Web, local-file and desktop storage are independent; use profile JSON export/import to transfer plans.

## Reusing combat results in 2.9.4

Switching hunt targets updates hunt odds, skips and master rankings using completed combat results from the current session. It does not restart every owned-gear search or blank the unchanged guide cards. Only newly needed creature/form/location/style combinations need fresh gear work. Completion shows **Reused combat results** when saved results were supplied.

Completed gear results are retained as they arrive, so cancelling or replacing a calculation preserves finished work. Bank, combat skill, combat-setting, relevant diary and quest changes use a different cache context. The cache is bounded, lives only in memory and is absent from profile backups; restarting the app starts a fresh session. See [regression evidence and limits](docs/target-calculation-cache.md).

## Gear comparisons and calculation priority in 2.9.3

Hover or focus a gear item, or choose its **ⓘ** button, to see why it was selected and compare it with your owned alternatives in that slot. The table shows full-setup DPS, the DPS change from the displayed item, prayer bonus and all five defensive bonuses. Multi-target spells also show stack DPS. Required protection, insufficient levels, incompatible ammunition and two-handed conflicts explain unavailable alternatives. Mid-level/max examples identify their unowned baseline separately.

Comparisons run on demand in a cancellable worker and are cached until the profile or guide choices change. They hold other slots fixed; weapon swaps can choose another supported attack/spell within the same combat family. They are not full replacement-loadout searches or an incoming-damage simulation.

New profiles, imports and recalculations prepare the selected hunt creatures and guide creature before other work. The active guide is prepared first when it is open; otherwise hunt targets go first. Selected hunt assignments and masters offering them are processed first, and completed master plans appear while the remaining calculations continue. Percentages include priority preparation. See [verification and limits](docs/gear-comparisons-priority.md).

## Body and leg armour fallbacks in 2.9.2

Owned loadouts fill body and leg slots even when the available armour is not a DPS upgrade. Prayer setups prioritise prayer bonus; tank setups prioritise defensive bonuses against the creature's listed attacks. An actual DPS upgrade is retained. Candidates first favour armour without an accuracy penalty to the selected combat style; when only penalising armour is usable, the least penalising tier is considered. The displayed DPS and kill time are recalculated with the chosen armour, including any loss.

Mandatory equipment, usable quantities, skill requirements, full-set/autocast dependencies and two-handed restrictions remain enforced. A slot stays empty only when no compatible usable owned piece can be selected, with an explanation in the gear notes and empty-slot tooltip. Defensive ranking compares equipment bonuses; it is not an exact incoming-damage or survivability simulation.

The recommended tank/prayer approach now applies consistently to all three owned style cards and hunter timing. Choosing a style saves its armour priority too. **Combat methods > Armour fallback priority** can select the recommended protection plan, Defence first or Prayer bonus first. Existing profiles inherit the recommendation. See [fallback verification](docs/armour-fallback.md).

## DPS sanity fixes in 2.9.1

Bank imports and existing profile inventories now retain recognised wearable equipment and ammunition, with an omission count in import previews. **Filter by gear slot** narrows the table. Inert ammunition is removed from suggested setups; ranged weapons search compatible ammo before ranking it. Temporary Gauntlet/Barbarian Assault equipment is excluded from ordinary Slayer recommendations.

**Best in your Slots** now displays independent melee, ranged and magic alternatives. Each preserves required protection. **Use [style] for this creature** saves its preferred hunter method and displayed location without changing hunt targets. **Combat methods** exposes the same per-creature choice and a 1–9 target pod override; Settings supplies a default style.

The engine considers demonbane effects, with reviewed skill requirements for Emberlight, Scorching bow and Purging staff. **Mark of Darkness** is an explicit combat assumption. Spellbook **Auto** uses Standard plus Ancient after confirmed Desert Treasure I and Arceuus after confirmed A Kingdom Divided; explicit book selections assume access. Existing explicit selections remain in effect; choose Auto or Ancient in Settings to enable bursting on an older profile. Old profiles load normally; backups using the new combat options require 2.9.1 or later. Weapon autocast compatibility is checked: a Purging staff does not become an Ancient autocast weapon. Strongest spell tiers are selected by damage, not dataset order. Elemental weaknesses can legitimately beat a demonbane spell.

Multi-target spells show **single-target DPS**, the unchanged **one-creature kill time**, and separate **aggregate DPS**. Dust devils default to eight targets in the Catacombs pod and nine in the Wilderness Slayer Cave; smoke devils use nine in their multi-combat dungeon. Other rooms default to one unless a 1–9 pod is specified. Single-combat rooms and powered staves never gain this multiplier. Hunter estimates and simulations charge complete batches, including for a one-kill goal. These are idealised stacked-throughput estimates: use uptime, delay and travel for gathering, respawns and imperfect stacking, rather than treating them as measured rates.

Gear calculations now run in cancellable background workers. Hunt optimisation reuses prepared completion rows rather than repeating equipment searches for every block candidate. Progress names the current creature, master or block candidate and shows a completion percentage. **Recalculate** retries a cancelled/failed run. Kourend & Kebos Elite removes Karuulm hazard boots from owned and example sets. See [sanity verification](docs/gear-dps-sanity.md).

## Owned gear, DPS and Settings in 2.9.0

**Bank & gear** imports local `bank.json`, `inventory.json` and `equipment.json` snapshots from RuneLite’s [Character Export](https://runelite.net/plugin-hub/show/character-export). Include `character.json` to import base skill levels; boosted levels are ignored. Review the character folder and import preview before applying. Snapshots stay in the active local profile and travel with profile backups. No bank lookup by username or game-account credentials are involved.

Character Export does **not** export Group Storage. You can add group items manually or import an explicitly identified `group_storage` snapshot using the same `items: [{id, quantity}]` format. Group items are separate and excluded until **Include group items** is enabled. They represent gear available to borrow, not exclusive ownership.

Search an item by name or ID to add newly obtained gear. The table’s manual quantity is an absolute total for that personal/group source: zero removes availability, and **Clear manual** restores the imported quantity. Refreshing a container preserves other containers and manual quantities. Use exports taken together to avoid counting an item both in the bank and in worn equipment.

All three guide sets use the OSRS worn-equipment layout. **Best in your Slots** searches owned usable equipment for the selected creature, form, attack approach and location, enforcing necessary protection, weapon/shield constraints, ammunition and known skill requirements. It is the best found by a bounded DPS search, with full-set seeds; it is not a certified global optimum. Mid-level and max sets remain curated examples. DPS for all three uses the active profile’s actual levels and selected assumptions, rather than silently assuming 99s.

The pinned [OSRS Wiki DPS engine](https://github.com/weirdgloop/osrs-dps-calc) supplies attack rolls, max hits, attack speeds and hit distributions. Expected kill time includes misses, overkill and supported HP-dependent damage. **Settings → Combat and timing** controls offensive prayers, potions, spellbook, attack uptime and using owned-gear times throughout the hunter. Import previews enable this by default; first manual entry enables it when the profile has no combat settings. Estimates, skip/block ranking, reset/boost fillers and full simulations share these times. Uptime, between-kill delay and travel are applied separately, and legacy creature multipliers are not reapplied to calculated DPS.

Measured kills/hour and full task-duration methods retain priority. Boss/phase/switch encounters, missing required equipment and unsupported setups keep configured timing with a visible reason in the hunter and Combat methods. Continuous DPS excludes healing, movement and travel. Replenishable runes, ammunition and charges are assumed; bank quantity is not a trip-supply budget. Item quest/diary unlocks still need review. Unreviewed equipment skill requirements are excluded unless explicitly accepted in Settings. Specials are not included.

**Settings** also owns themes, animation control, optional guide sections, sidebar Quick setup and secondary navigation. Twenty reviewed ordinary entrances (21 access flags) default to Yes and are hidden from Account & access. This refers to normal members-world entrances, not every room, creature, teleport or activity. Money, tools, task and combat requirements still apply. **Restricted accounts and Leagues** exposes the original pickers and stored overrides; quest/skill-gated locations retain their usual controls. Sources and entrance caveats are listed there.

Everything works offline after loading. Item art and equipment metadata are bundled; guide selection and calculations make no Wiki requests. The new entrance review used four bounded API requests, at least eight seconds apart. See [implementation, verification and limits](docs/bank-dps-implementation.md). Application/DPS code is GPL-3.0 with corresponding source in the Windows `source/` folder; Wiki data and game artwork retain the separate terms in `THIRD_PARTY_NOTICES.txt`.

## Item icons and links in 2.8.1

Gear items, named supplies and potion alternatives have bundled inventory icons and direct Wiki links. Each choice in a compound recommendation links separately. Generic categories use a representative icon named in its hover text; spells link to their spell page. The **How these sets are chosen** disclosure explains the curated mechanics rules, tier templates and limits. Item artwork is sourced from a pinned RuneLite cache mirror, with no Wiki calls during capture or use. See `src/ui/item-art.json` for per-image provenance.

## Standalone Creature Guide in 2.8.0

Open **Creature guide** in the navigation, or use the website's `#creature-guide` link. Search 270 individual creatures, optionally filter by assignment, and select the source form/spawn where one page describes several. The mixed Boss timing scenario is excluded. The dossier shows source combat stats, defensive-bonus bars, elemental weaknesses and attack information for 584 forms.

Each selection offers an approximate fighting style and protection plan, mid-level equipment for roughly 70–85 combat stats, and a high-end example for 99s. Choose another supported approach or toggle suitable-task headgear. Required shields, special weapons, armour and supplies override ordinary upgrades. Bosses include essential mechanics and style-switch notes, with links to their specialist source where captured. These examples assume the listed item/spell/prayer unlocks; they are not a live-price, DPS or best-in-slot calculation.

Ranked location cards show basic travel diagrams, optional faster teleports with unlock caveats, cannon/multi-combat status and Wilderness risk. Change the ranking priority or select a location to update location-dependent equipment. Unknown routes and room rules remain explicitly unreviewed. Potion and trip-kit checkboxes serve as a temporary packing list; quantities depend on your trip. Guide selections persist separately from hunter profiles and do not alter targets, blocks, methods, balances or undo history.

The guide reuses existing revisioned creature captures offline. Eleven specialist pages were captured in five bounded API requests, eight seconds apart. Selection and ordinary builds make no Wiki requests. See [guide verification and limits](docs/creature-guide-verification.md). Regenerate its dataset with `python tools/build_creature_guide.py`; deliberate specialist refreshes require the explicit `--fetch` option in `tools/capture_guide_sources.py`.

## Creature artwork and interface refresh in 2.7.0

Creature names have small game-art badges throughout the planner, tasks, blocks, skips, combat methods, guidance, logs and review dialogs. All 271 supported variants are bundled in a local sprite sheet. Assignment categories use a representative creature. The artwork works offline and makes no requests to the Wiki during use; image provenance is retained in `src/ui/creature-art.json`.

Creature selectors open an illustrated search dialog. Type part of a name, browse with Up/Down, and press Enter to choose. Escape or Cancel returns without changing the selection. Focus returns to the selector after choosing, including after background calculations finish.

The six themes share updated navigation icons, target portraits, consistent controls, clearer setup/recommendation cards and improved block/skip presentation. **Saved hunts** is grouped in the hunt toolbar. Short view, dialog and hover transitions respect the system's reduced-motion preference. Compact hunt keeps the same creature badges and controls.

See [interface verification](docs/ui-refresh-verification.md) for checks and limits. Artwork is credited in `THIRD_PARTY_NOTICES.txt`; recalculating or rebuilding the app does not fetch artwork. To deliberately refresh artwork, run `python tools/build_creature_art.py` with Pillow installed, review the changed sources/assets, then rebuild.

## Strategy and reward audit in 2.6.2

Turael and Mazchna boosting now include filler tasks between milestones and start from the recorded normal streak. At streak 53 with every tenth task at Nieve, complete six filler tasks before requesting task 60. The selected panel shows the next completion reward; receiving the offer earns none. Wilderness and Mortimer counters cannot be used for normal-streak boosting.

Fillers use recorded actual blocks. Shared block groups use the proposed list with one setup payment. Filler access and methods are checked, and paid skips do not advance the schedule. Ordinary rewards use the highest milestone multiplier, with no points for the first four completions. Mortimer uses only its actual points modifier. Unknown elite-diary bonuses stay conditional; actual task recording requires confirmation.

**Long-run points / h** includes requests, combat/travel, filler rewards and the full 1,000-completion reward cycle. It describes continued point farming, not rewards received before this hunt ends. Warm-up and goal stopping events are handled in simulation. Mortimer and cape point rates require simulation instead of an unreliable analytical rate.

**Spend available points** explicitly labels the table as an **unlimited-funds offer benchmark**. Simulate for actual points, reserve and unaffordable-skip fallbacks. Results show points **earned**, **spent** and **remaining**. A kill/drop goal on the last kill receives the completion reward; stopping earlier does not. An already-observed compatible target offer stops without unnecessary setup purchases.

Pending offers use their actual master even when off the boost schedule. Under **Current assignment and cape state**, confirm partial Konar compatibility and the actual previous master when needed. Cape repeats use the last assigned task, including after a paid skip, and only the same master can repeat it. The checkbox models always accepting repeats; optimal accept/decline decisions and Mortimer cape choices remain unsupported. Existing profiles still load; missing master/location details are requested before relevant simulations.

See the [strategy audit and verification](docs/strategy-reward-audit.md) for the mathematics, sources and limits.

## Turael reset estimates in 2.6.1

The master table now includes the time to reset and complete a Turael replacement, rather than charging the full cancelled assignment. It includes both task requests and any chance of receiving a compatible target from Turael. **Target / request (incl. Turael)** averages across both request types; the selected plan shows the direct main-master chance separately.

Reset replacements use the recorded **actual** beginner block list. Automatic/proposed Turael blocks are not free purchases. Blocking a task with Turael also permits resetting that assignment from another eligible master, as described on the [Wiki](https://oldschool.runescape.wiki/w/Turael). Compatible targets and keep/protect preferences remain protected; incompatible Konar locations can be reset, and Mortimer tasks cannot be replaced. Configure fast replacement methods and travel/banking to match your route, and include reset/contact travel under seconds per reset and minutes per request.

Point rates are withheld when resets change streaks; use simulation for actual point balances, paid skips and rewards. An already-assigned resettable task is now replaced immediately in simulation. Cancelling a Wilderness task resets the Wilderness streak; the Turael completion advances the separate normal streak. See [reset math and verification](docs/turael-reset-verification.md).

## Hunt tools in 2.6

The hunt toolbar stays available while scrolling. Switch masters there, return to the comparison, or open **Compact hunt**. The Windows app shrinks to a 440 × 720 window; **Keep on top** is optional, and leaving compact mode restores the prior bounds.

Search **Look up an offered task** to see Block, Skip, Sometimes skip, Reset or Complete, with its reason, estimated time saving and point cost. Expand any task in the skip list for the same explanation. Targets and keep/protect preferences stay protected. Saved skip/avoid preferences now feed the analytical estimate as well as simulation; sustainable calculations allocate their point cost before automatic skips. A negative long-run budget is flagged and still needs funded simulation. Reset actions are separate from paid skips.

**Review & record actual list** compares proposed blocks with the recorded actual list: additions, removals, purchase cost, target chance and stationary time change. The review offers to deduct new-block costs while preserving the reserve. Uncheck deduction only when the recorded points already reflect the purchases. The planner records your in-game changes; it does not make them in RuneScape.

**Undo / Redo** restores profile changes, including methods, blocks, imports, hunt presets and task records. History contains up to 40 states for this session; it is not a persistent backup. Repeated edits of one numeric field are grouped. Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z or Ctrl+Y work outside input fields; text fields retain their normal editing shortcuts.

Use **Save hunt** for up to 30 named hunt presets within one account profile. They save targets, strategy, objective, proposed blocks, preferences, methods and the boost milestone. Loading a hunt leaves account facts, actual blocks, balances, current assignments and logs unchanged. Reusing a name offers replacement; deletion can be undone.

The **Point budget** shows affordable paid skips after setup/reserve, stationary point drift and, after simulation, the funding-exhaustion frequency and mean remaining balance. A long-run average does not guarantee the next skip is affordable.

Task lookup offers **Record completed task** and **Record paid skip**. Review the actual variant, Mortimer modifier where applicable, optional actual kills and combat duration, then review point/streak changes before recording. Completion rewards use the actual next streak milestone. Skips never credit future rewards. Task records and optional timing samples stay local and travel with profile exports. The latest 200 records are retained; the log table shows the latest 30. Undo reverses the complete recorded action in this session.

After recording actual kills and combat minutes, **Combat methods** offers a measured kills/hour suggestion for that assignment and variant. It uses total kills divided by total combat time, excludes travel/banking, and requires review before changing the method. Check that sampled equipment and locations match the method you intend to use. No RuneLite task telemetry or game account mutation is performed. Profile JSON imports retain their existing 2 MB limit; undo history is not exported.

See [implementation and verification](docs/hunt-quality-of-life.md).

## Maxed profile

Every setup includes an editable **Maxed** profile in the plan-profile selector. Fresh setups select it automatically. Existing setups keep their profiles and current selection; Maxed is added once and its later edits are preserved. Duplicate it to make an independent scenario.

It sets all skills to 99, combat to 126, all supported quests/elite diaries complete, all known area/variant access enabled, and Mortimer progression to 50 tasks. Slayer-point reward purchases start off; enable any purchased creature unlocks under Account & access. Quest points use the checked 343-point snapshot. Stop the Wyvern stays off so wyvern assignments remain available. Version 2.3.1 corrects the original built-in Maxed reward defaults once, preserving other fields and custom profiles; subsequent manual reward choices are retained. Points, reserves, streaks and combat rates remain editable planning defaults. Master/variant restrictions and unverified combat/location calculations still apply. This is a planning preset, not imported player information.

The app supports 50 custom profiles plus Maxed. A 51-profile export needs version 2.3 or later; previous versions retain their 50-profile import limit.

## RuneLite quest import and area access

In **Account & access**, choose **Choose quest JSON** or paste JSON, review the changes and apply them to the selected profile. The planner supports the named quest records from [Character Export](https://runelite.net/plugin-hub/show/character-export) and OSRS MCP Companion.

For Character Export, enable quest exporting in RuneLite, log in to the character and use the plugin's **Sync Available / Open Folder** controls. Select `quests.json` from `.runelite/character-exporter/<Character Name>/` in your user folder. The planner does not install the plugin or contact WikiSync. Files are read locally, including on the private website; only relevant quest states, source type, account name when supplied and timestamps are retained. Other account data is ignored.

The review shows old/imported/resulting states and manual conflicts. Existing manual quest overrides are kept by default; uncheck that option to replace overrides for incoming quests. A quest set to **Auto** uses its imported state. Omitted quests are unknown, not automatically incomplete. Reimporting replaces the previous imported snapshot. Source exports may omit the account name, so check the character folder. Skills, quest points, diaries, purchases and Slayer points remain unchanged.

The **Area access** table explains automatic results for 20 sourced area rules. Completion can prove access; for areas unlocked partway through a quest, an in-progress state remains unknown because RuneLite exports only three quest states. Areas without a reviewed rule also remain unknown. Set **Yes / No — manual** to override an area, or **Auto** to restore derivation. Existing area overrides are preserved. These results feed Konar's eligible location pool and explicit method-location checks; they do not remove a receivable assignment merely because your chosen monster method is unavailable.

Area rule version `2026-11-19.1` is recorded separately from the original catalogue. Existing profile files remain supported; imports using a different recorded area-rule version require explicit rebasing. See [quest/area verification](docs/quest-import-verification.md) for pinned exporter formats, rule sources and test evidence.

## Appearance

Use **Theme** in Settings to choose Woodland, Midnight, Ember, Amethyst, Daylight or High contrast. The choice applies instantly to every view and is saved on this device separately from hunt profiles. All themes work offline.

## Planning a hunt

1. Create a named profile or duplicate the illustrative example. Enter skills, quest stages, purchased unlocks, diaries, points and streaks under **Account & access**. Blank facts remain unknown. A conditional scenario can assume unknown access; it is visibly labelled.
2. Choose an assignment and desired monster variant. The catalogue has 117 assignment types, 271 variants and ten distinct masters. Receiving a Basilisk assignment does not grant Basilisk Knight access. Unsupported relationships cannot be selected as verified alternatives.
3. Record actual blocks, edit proposed lists and keep/skip/protect preferences under **Tasks & blocks**. Beginner lists are shared by Turael/Aya and Spria. Other groups remain separate. Explicit zero slots work; ordinary caps derive from quest points and the elite Lumbridge diary, while Mortimer has two.
4. Set measured kills/hour or combat minutes/task, or an effective-DPS estimate, under **Combat methods**. Travel is added once. Methods support extensions, bracelets, locations and reusable presets.
5. Choose an offer, kill-count or direct-drop stopping event and acceptable targets. The master table is a stationary offer estimate. Use **Simulate** for funded points, streaks, current tasks/offers, boosts, resets, cape policies and the full hunt. **Search blocks for full hunt goal** tests a bounded set of candidates using the selected stopping event.
6. Compare independent profiles or six strategies from the same start state. Export profiles as JSON, the master comparison as CSV, or simulation results with their profile and assumptions as JSON.

Clicking a master scrolls directly to its blocks and skip list. The selected master’s **Skip policy** shows every fully skipped assignment, any partial-skip percentages, and Turael reset tasks directly in the hunt view. Saved skip/avoid preferences are labelled; funded actions still respect the point reserve.

The original v1 storage key is retained and backed up before migration. Missing new account facts remain unknown; old exclusions become preferences, not invented quest facts. Export the original backup from **Data & sources**. Different data snapshots require explicit review and rebasing a copy before import.

## Calculation limits

Krystilia's default Black dragons completion method now uses reviewed regular Wilderness-compatible dragons. The level-227 variant has 190 HP and the Wilderness Slayer Cave variant 250 HP. Cerberus remains outside her assignment area. Issue panels distinguish target restrictions from incompatible methods on other assignments; saved method choices remain editable. The two additive variants and their pinned source are in `data/variant-additions.json` and `data/variant-sources/`.

Mortimer's **Modifier rules & ranges** button opens the full 29-task table in **Data & sources**. Every option receives one uniformly chosen unlocked modifier; values within a modifier range are equally likely in steps of five under the confirmed planning rule. The table shows valid outcome counts and conditional per-value chances. Quantity modifiers are flat kills, including negative reductions. The corrected ranges are reproducibly generated in `data/mortimer-modifiers.json` and overlaid by the shared core without changing account facts or the base catalogue. Simulations and exports identify the applied Mortimer rule version.

The **Show unavailable masters** checkbox above Master comparison filters unavailable rows and remembers the display choice on this device. When hidden, an empty result explains how to reveal the issues. If a master shows **Unavailable**, expand **Why unavailable?** beside its name. The panel names the requirement or model limitation, links its Wiki source and offers a button to the relevant account, target, method or block setting. Hover the offer estimate for a quick reason. The selected master's issue panel opens automatically. Conditional plans have an **Assumptions to review** panel. Empty unconfirmed-requirement and block-explanation dropdowns are hidden; they appear when there are actual items to review.

Regular hellhounds now use the five reviewed Konar locations automatically; Maxed does not need a custom location probability. Cerberus remains limited to Taverley. Unsupported variants and unreviewed locations still require review rather than inheriting access from Maxed.

Exact and approximate results are labelled. Small block spaces are enumerated; larger searches use bounded swaps. Stationary single-draw no-skip offer objectives have a direct solution. Funded and multi-choice policies use seeded simulation and heuristic decisions; no global optimality claim is made. Full-hunt search tests a bounded set with up to 400 search trials, then reruns the chosen candidate with the requested trial count.

Points are paid before a skip/block action and awarded after completion. A target-offer goal stops before target combat/rewards. Kill and drop goals can stop during combat. Unfinished trials remain in probability denominators; censored means and unsupported quantiles are withheld. Probability intervals include sampling uncertainty and unresolved outcomes, not model error. Base assignment quantities use a uniform integer range scenario; Mortimer modifier magnitudes use their separate five-step discrete values; configured combat rates do not model random kill-time variation.

Mortimer milestones, guaranteed modifiers and equal unlocked-type chances are sourced. Modifier magnitudes use equally likely five-step values under the confirmed planning rule, with all 29 task ranges shown in Data & sources. Mortimer cape modifier repeats are unavailable pending verification. Generic Boss secondary rolls are not mapped to individual bosses: the mixed Boss completion estimate cannot be used as a specific boss target. Directly mapped boss alternatives are listed separately. Newly sourced alternatives require access/repeatability confirmation. One preferred variant per assignment avoids an unverified union of overlapping location probabilities. Superior-spawn loot goals, general XP/profit outputs and recommendation 14 are outside this release.

## Data and attribution

Data snapshot: `2026-11-19.2`. `data/catalogue.json` is generated from revisioned Wiki captures in `data/sources/`, with the supplied workbook retained as `data/legacy.json`. Source revisions, conditional rules and qualifications are visible in the app. Wiki text is parsed as data; no Lua or spreadsheet code is executed. See `THIRD_PARTY_NOTICES.txt` and [verification](docs/v2-verification.md).

Refresh into a new candidate directory without changing active data:

```text
python tools/refresh_catalogue.py --output <new-candidate-directory> --version <new-data-version>
```

Review `review-diff.json`, source rules, migrations and tests before explicitly adopting the candidate. The app never fetches mutable rule data during a calculation. Optional public hiscores lookup imports levels only, with a timeout and manual fallback. It sends the entered RuneScape name only to the official RuneScape hiscores service.

## Development

Use Node.js 22.12+ (release build: bundled Node.js 24.22.1) and Python 3.12+.

```text
npm ci
npm run build:data
python tools/build_mortimer_modifiers.py
python tools/build_variant_additions.py
npm run typecheck
npm test
npm start
npm run package:windows -- <new-output-directory>
python tools/assemble_windows_share.py <distribution-folder>
python tools/package_share.py <distribution-folder> <new-zip-path>
```

`src/domain`, `src/rules` and `src/analysis` provide the typed shared model. `src/state` validates and migrates profiles. `src/ui` owns one application state and cancellable offline workers; generated browser assets are in `dist`. Historical v1 engines/fixtures live under `tests/fixtures/v1` and are not deployed. `desktop` contains the isolated Electron shell and a narrow, validated public-hiscores bridge. The package uses an explicit allowlist and includes no personal profiles, credentials or hosting metadata.

See [the implementation plan](docs/implementation-plan.md), [glossary](CONTEXT.md) and [release verification](docs/v2-verification.md). This implementation branch builds on the existing Windows packaging and plan commits without rewriting their history.
