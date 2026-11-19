# Slayer Target Planner 2.1.1

An offline-capable creature hunt planner for the private website, local browser and portable Windows app. The original workbook and version 1 distribution are preserved.

## Start

Open `Slayer Target Planner.exe` in the **Slayer Target Planner 2.1.1 - Windows** folder on the Desktop. To share it, send the matching ZIP; extract the complete folder before running the EXE. No installation, administrator access, Node.js or site login is needed. The Windows x64 binary is unsigned.

For the browser copy, open `Open Planner.cmd` or `dist/index.html`. The private site is [Slayer Target Planner](https://slayer-target-planner-owen.heaaga.chatgpt.site). Web, local-file and desktop storage are independent; use profile JSON export/import to transfer plans.

## Appearance

Use **Theme** in the header to choose Woodland, Midnight, Ember, Amethyst, Daylight or High contrast. The choice applies instantly to every view and is saved on this device separately from hunt profiles. All themes work offline.

## Planning a hunt

1. Create a named profile or duplicate the illustrative example. Enter skills, quest stages, purchased unlocks, diaries, points and streaks under **Account & access**. Blank facts remain unknown. A conditional scenario can assume unknown access; it is visibly labelled.
2. Choose an assignment and desired monster variant. The catalogue has 117 assignment types, 269 variants and ten distinct masters. Receiving a Basilisk assignment does not grant Basilisk Knight access. Unsupported relationships cannot be selected as verified alternatives.
3. Record actual blocks, edit proposed lists and keep/skip/protect preferences under **Tasks & blocks**. Beginner lists are shared by Turael/Aya and Spria. Other groups remain separate. Explicit zero slots work; ordinary caps derive from quest points and the elite Lumbridge diary, while Mortimer has two.
4. Set measured kills/hour or combat minutes/task, or an effective-DPS estimate, under **Combat methods**. Travel is added once. Methods support extensions, bracelets, locations and reusable presets.
5. Choose an offer, kill-count or direct-drop stopping event and acceptable targets. The master table is a stationary offer estimate. Use **Simulate** for funded points, streaks, current tasks/offers, boosts, resets, cape policies and the full hunt. **Search blocks for full hunt goal** tests a bounded set of candidates using the selected stopping event.
6. Compare independent profiles or six strategies from the same start state. Export profiles as JSON, the master comparison as CSV, or simulation results with their profile and assumptions as JSON.

The original v1 storage key is retained and backed up before migration. Missing new account facts remain unknown; old exclusions become preferences, not invented quest facts. Export the original backup from **Data & sources**. Different data snapshots require explicit review and rebasing a copy before import.

## Calculation limits

Exact and approximate results are labelled. Small block spaces are enumerated; larger searches use bounded swaps. Stationary single-draw no-skip offer objectives have a direct solution. Funded and multi-choice policies use seeded simulation and heuristic decisions; no global optimality claim is made. Full-hunt search tests a bounded set with up to 400 search trials, then reruns the chosen candidate with the requested trial count.

Points are paid before a skip/block action and awarded after completion. A target-offer goal stops before target combat/rewards. Kill and drop goals can stop during combat. Unfinished trials remain in probability denominators; censored means and unsupported quantiles are withheld. Probability intervals include sampling uncertainty and unresolved outcomes, not model error. Quantity rolls use a uniform integer range scenario; configured combat rates do not model random kill-time variation.

Mortimer milestones and category rolls are sourced. Within-range modifier values remain an explicit uniform-in-five-step assumption. Mortimer cape modifier repeats are unavailable pending verification. Generic Boss secondary rolls are not mapped to individual bosses: the mixed Boss completion estimate cannot be used as a specific boss target. Directly mapped boss alternatives are listed separately. Newly sourced alternatives require access/repeatability confirmation. One preferred variant per assignment avoids an unverified union of overlapping location probabilities. Superior-spawn loot goals, general XP/profit outputs and recommendation 14 are outside this release.

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
npm run typecheck
npm test
npm start
npm run package:windows -- <new-output-directory>
python tools/package_share.py <distribution-folder> <new-zip-path>
```

`src/domain`, `src/rules` and `src/analysis` provide the typed shared model. `src/state` validates and migrates profiles. `src/ui` owns one application state and cancellable offline workers; generated browser assets are in `dist`. Historical v1 engines/fixtures live under `tests/fixtures/v1` and are not deployed. `desktop` contains the isolated Electron shell and a narrow, validated public-hiscores bridge. The package uses an explicit allowlist and includes no personal profiles, credentials or hosting metadata.

See [the implementation plan](docs/implementation-plan.md), [glossary](CONTEXT.md) and [release verification](docs/v2-verification.md). This implementation branch builds on the existing Windows packaging and plan commits without rewriting their history.
