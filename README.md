# Slayer Target Planner 2.5

An offline-capable creature hunt planner for the private website, local browser and portable Windows app. The original workbook and version 1 distribution are preserved.

## Start

Open `Slayer Target Planner.exe` in the **Slayer Target Planner 2.5 - Windows** folder on the Desktop. To share it, send the matching ZIP; extract the complete folder before running the EXE. No installation, administrator access, Node.js or site login is needed. The Windows x64 binary is unsigned.

For the browser copy, open `Open Planner.cmd` or `dist/index.html`. The private site is [Slayer Target Planner](https://slayer-target-planner-owen.heaaga.chatgpt.site). Web, local-file and desktop storage are independent; use profile JSON export/import to transfer plans.

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

Use **Theme** in the header to choose Woodland, Midnight, Ember, Amethyst, Daylight or High contrast. The choice applies instantly to every view and is saved on this device separately from hunt profiles. All themes work offline.

## Planning a hunt

1. Create a named profile or duplicate the illustrative example. Enter skills, quest stages, purchased unlocks, diaries, points and streaks under **Account & access**. Blank facts remain unknown. A conditional scenario can assume unknown access; it is visibly labelled.
2. Choose an assignment and desired monster variant. The catalogue has 117 assignment types, 271 variants and ten distinct masters. Receiving a Basilisk assignment does not grant Basilisk Knight access. Unsupported relationships cannot be selected as verified alternatives.
3. Record actual blocks, edit proposed lists and keep/skip/protect preferences under **Tasks & blocks**. Beginner lists are shared by Turael/Aya and Spria. Other groups remain separate. Explicit zero slots work; ordinary caps derive from quest points and the elite Lumbridge diary, while Mortimer has two.
4. Set measured kills/hour or combat minutes/task, or an effective-DPS estimate, under **Combat methods**. Travel is added once. Methods support extensions, bracelets, locations and reusable presets.
5. Choose an offer, kill-count or direct-drop stopping event and acceptable targets. The master table is a stationary offer estimate. Use **Simulate** for funded points, streaks, current tasks/offers, boosts, resets, cape policies and the full hunt. **Search blocks for full hunt goal** tests a bounded set of candidates using the selected stopping event.
6. Compare independent profiles or six strategies from the same start state. Export profiles as JSON, the master comparison as CSV, or simulation results with their profile and assumptions as JSON.

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
python tools/package_share.py <distribution-folder> <new-zip-path>
```

`src/domain`, `src/rules` and `src/analysis` provide the typed shared model. `src/state` validates and migrates profiles. `src/ui` owns one application state and cancellable offline workers; generated browser assets are in `dist`. Historical v1 engines/fixtures live under `tests/fixtures/v1` and are not deployed. `desktop` contains the isolated Electron shell and a narrow, validated public-hiscores bridge. The package uses an explicit allowlist and includes no personal profiles, credentials or hosting metadata.

See [the implementation plan](docs/implementation-plan.md), [glossary](CONTEXT.md) and [release verification](docs/v2-verification.md). This implementation branch builds on the existing Windows packaging and plan commits without rewriting their history.
