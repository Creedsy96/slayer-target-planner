# Konar location model and audit — 3.0.12

The planner assumes that Konar chooses uniformly among the available locations for an assignment, as requested. The Wiki establishes the assignment pools and allowed alternatives; equal location weights are the planning assumption, not a measured Wiki probability.

Assignment probability is still its weight divided by the eligible, unblocked assignment weights. Conditional target compatibility is the number of available locations with an acceptable selected variant divided by the number of available assignment locations. The planner multiplies these probabilities. An area containing only a different creature variant stays in the denominator. Multiple acceptable variants form a union of matching areas, with the highest-priority legal target used in each area.

With both basilisk locations available, Basilisk Knights match Jormungand’s Prison (Isle of Stone), but not Fremennik Slayer Dungeon: 1/2. Ordinary basilisks match both: 2/2. Selecting a particular method location restricts the numerator, not Konar’s denominator. Confirmed entrance/assignment restrictions remove a location; unknown access remains in the pool and requires a conditional scenario. Existing restricted-account controls and manual overrides remain supported. Custom compatibility weights stay explicitly conditional and cannot create an unsupported target route.

## Complete audit

[The generated CSV](konar-location-audit.csv) records all 115 assignment/variant pairs across all 39 tasks. The 38 fixed location pools are modelled explicitly. The aggregate boss task retains its separate specific-boss roll limitation; it is not given an invented uniform boss/location distribution.

Representative all-access cases include:

| Assignment | Selected variant | Matching / total locations |
| --- | --- | --- |
| Basilisks | Basilisk Knight | 1/2 |
| Aberrant spectres | Aberrant / Deviant | 2/3; 1/3 |
| Abyssal demons | Abyssal Sire | 1/3 |
| Black dragons | Baby / regular; brutal | 3/4; 1/4 |
| Bloodveld | Regular; mutated | 4/6; 3/6 (overlap at Meiyerditch) |
| Blue dragons | Regular; baby; brutal | 5/6; 4/6; 2/6 |
| Dagannoth | Lighthouse-type; Waterbirth-type | 3/4; 1/4 |
| Hellhounds | Cerberus | 1/5 |
| Jellies | Ordinary / warped / chilled | 1/3 each |
| Kalphite | Kalphite Queen | 1/2 |
| Lesser nagua | Sulphur / frost / earthen / Amoxliatl | 1/3 each |
| Lizardmen | Shaman | 3/5 |
| Metal dragons | Iron; bronze/steel; adamant/rune | 3/4; 2/4; 1/4 |
| Mutated zygomites | Zygomite / ancient | 1/2 each |
| Nechryael | Ordinary / greater | 1/3; 2/3 |
| Red dragons | Baby/regular; brutal | 3/4; 1/4 |
| Trolls | Mountain troll / ice troll runt | 5/6; 1/6 |
| Vampyres | Vyrewatch Sentinel | 1/4 |
| Wyrms | Wyrm / wyrmling / Lava Strykewyrm | 2/4 each (overlapping pools) |

Combat and Slayer gates for the brutal-dragon Catacombs rolls are retained. Abyssal Nexus is grouped under Konar’s Abyss roll. Source areas and guide chambers are matched through reviewed names/pages, including Stronghold Slayer Cave/Dungeon and Myths’ Guild/Corsair Cove. Wyrmscraig, Tapoyauik and Meiyerditch use the retained creature spawn tables rather than assuming that ordinary and alternative variants are mutually exclusive.

The audit also restores the missing South of Mount Quidamortem troll roll and adds Frost Nagua, Earthen Nagua, Ice troll runt and Waterbirth Island dagannoth with sourced stats, forms, locations and offline icons. Existing generic Ice troll remains the different Ice Path/Trollweiss encounter. Quest-only encounters, outside-pool bosses and Dark Altar reanimation methods are not assumed repeatable Konar routes.

## Timing and actions

One parent row retains the assignment weight and block identity. Its location outcomes have their own legal creature, method, expected task quantity, timing and target status. DPS uses the assigned guide location, including multi-target pods. Non-target completion methods are chosen only from creatures in that assigned area. Saved methods are used where legal; otherwise the existing confirmed-first, low-HP completion heuristic applies locally.

Skipping and point-budget balancing operate on those outcomes. Wrong-location target assignments can be skipped or reset; keep/protect preferences still apply to the assignment. Analytical waiting time, full-cycle target KPH, completion/skip point rates, extension comparisons, boosting and Turael reset renewal equations use the same outcomes. Simulation samples the assignment then its location once, retaining that method for combat and cape history. An actual current/pending partial-compatible task still needs the existing compatibility confirmation; when its exact area is not recorded, timing is sampled conditionally within the matching/non-matching set.

The selected Konar plan shows the matching count, conditional percentage, area weights, completion creatures and actions. A disclosure contains the remaining assignments. Unknown access and custom overrides remain labelled. Gear preparation reports the current Konar area in calculation progress.

## Sources and reproduction

`data/konar-sources/konar-quo-maten.json` retains Konar revision 15408174. Existing guide spawn captures supply ordinary locations; explicit Konar alternatives establish grouped chambers. Four bounded additional creature captures are retained under `data/variant-sources/`. No requests are made during ordinary builds or app use. Artwork requests used the existing cache and an eight-second minimum interval; no task-page crawl was performed.

Run, in order:

```text
python tools/build_variant_additions.py
python tools/build_creature_guide.py
python tools/build_konar_locations.py
node tools/build.mjs
node node_modules/typescript/bin/tsc --noEmit
node --test
```

Existing character schema and base catalogue version are unchanged. Account facts, bank contents, purchases and manual methods are not migrated or reset.

## Verification

Passed: production build, strict TypeScript and 330 JavaScript tests. Regressions check every audited fraction, pool coverage and reproducibility, area aliases, access/gates, unions, location-specific completion methods, exact waiting/KPH/point equations, funded skips, reset and boosting simulation agreement, extensions, custom overrides and rendered explanations. Earlier tests expecting assumed baby-dragon compatibility now require the reviewed 3/4 fraction; base catalogue and other-master overlay isolation remain checked.

Browser QA used a synthetic character on a separate localhost origin. Konar’s comparison calculated without unconfirmed facts and the selected plan showed Basilisk Knights at 1/2, two 50% areas, the ordinary-basilisk completion and Knight target. The card layout and explicit icons were visually checked. Native desktop interaction was not repeated and no running desktop character was modified. Packaged asset/source parity, source commit, notices and ZIP integrity are checked separately during delivery.
