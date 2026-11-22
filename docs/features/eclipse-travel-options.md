# Eclipse Moon burn and travel options — 4.0.0

Implemented locally on 22 November 2026. No desktop package, GitHub release or website publication was made for these changes.

## Eclipse burn

The complete helm, chestplate, tassets and Eclipse atlatl enable a 20% burn trial per accurate attack, including accurate zero-damage hits. Each accepted stack deals ten damage over forty game ticks, one damage every four ticks. Five independent stacks can coexist; a failed application at the cap does not refresh them. Missing pieces or another weapon retain ordinary direct damage. Engine burn-immunity metadata and known immune NPC IDs suppress the additional damage.

`src/combat/eclipse.ts` adds the effect outside the unchanged pinned Wiki calculation source. Sustained burn DPS solves the capped proc process for three- and four-tick attacks. Finite-fight kill time uses 2,048 seeded paired trials and the exact direct-hit expectation as a control variate. Each target starts without burns; residual damage is discarded at death. This kill time is an estimate, with its standard error shown in the assumptions. It is distinct from HP divided by sustained DPS. Phase-based bosses retain their existing timing fallback. The gear search seeds the complete set so individual slot ranking cannot discard its combined effect. Calculated hunter methods consume its kill time; measured timing still takes priority.

Primary sources: [Eclipse Moon armour, revision 15347390](https://oldschool.runescape.wiki/w/Eclipse_Moon_armour?oldid=15347390), [Burn, revision 15410099](https://oldschool.runescape.wiki/w/Burn?oldid=15410099). The captured public pages are in `data/travel-sources/`. The adapter exports accurate hits from the original distribution, because the engine's flattened single-hitsplat view loses accuracy flags.

## Character travel

The catalogue models 38 common networks, destinations, reusable items and consumable/charged teleports. Settings and the seven-step setup sequence share the same character-specific choices. Unlimited confirmations disappear immediately when enabled; Show confirmed travel reveals them for correction. Consumable and charged options remain visible. Explicit No overrides automatic detection until reset. General network access does not imply repaired fairy rings, mounted POH items or separate pendant destinations.

Imports preserve an allowlist of raw teleport item IDs in a separate `travelItems` container field. Gear remains filtered as before. Placeholders, zero quantities, arbitrary non-gear items and unselected group storage do not grant stock. Previously confirmed unlimited items remain learned; charged stock follows the latest container snapshot. Detection uses bank, inventory and equipment evidence. Existing banks may need one new import for non-gear or original charged IDs that older imports discarded.

Monkey Madness II proves access to a reclaimable royal seed pod. Song of the Elves proves the Prifddinas destination, but a charged/rechargeable crystal or eternal item still needs stock or confirmation. A depleted seed is explicitly labelled as requiring recharge and fees. Known unmet completion gates disable destinations; partial Fairy Tale II access remains manually confirmable. All other unprovable house installations, destination steps, supplies and charges retain manual controls. The built-in Maxed character assumes these modeled travel capabilities unless overridden.

Location cards list available routes first, then other curated alternatives with setup explanations and source links. Common Slayer dungeons have specific teleports and walking routes; locations without a reviewed transport retain a labelled ordinary approach and their existing source. Rankings remain editorial: routes do not invent measured travel minutes or replace user-entered travel time. Kalphite Cave has the direct Desert amulet 4 route, BIQ approach and Shantay walk; the Lair has the distinct BIQ/rope route. Only known Wilderness/PvP locations or their approaches show a red PvP badge.

## Entrance facts and migration

Fully determined quest/skill entrances follow their owning facts, without an additional area confirmation. Ordinary legacy Yes/No area records are retained but do not override hard facts. Restricted-account mode can deny access already granted by quests or skills, and cannot grant known-unmet gates. Partial stages and alternate routes retain manual confirmation. Known-unmet areas and teleports are omitted from setup, and remain reviewable through their owning account facts and Settings. Correction links point to those facts rather than a hidden area card. Grimstone entrance checks 87 Sailing.

Setup progress accepts both the old six-step and new seven-step records. Completed setups stay completed; an unfinished old final step opens Travel options. Character backup schema remains 2, with optional travel and teleport-stock fields. No existing character files or running desktop app data were modified during development.

## Verification

The original burn/travel implementation passed 491 tests and browser checks before the user changed the verification policy. Subsequent changes use focused checks only; full-suite testing is reserved for a requested release. Focused coverage includes full/partial sets, accuracy flags, immune targets, finite-fight truncation, hunter timing, stock filtering, group exclusion, manual overrides, quest gates, route/PvP output and setup migration. Build and TypeScript checks pass. Browser QA used disposable localhost characters and confirmed full-set DPS/TTK, imported crystal detection, immediate unlimited-item hiding and consumable persistence after reload. Included in the 4.0.0 release; see the current verification record.
