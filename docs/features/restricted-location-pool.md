# Editable restricted-account location pool — 3.0.15

**Settings → Restricted accounts and Leagues → Enable manual restrictions for any location** now opens an editable, searchable location pool immediately below the setting. The same pool appears in Account & access and the access step of character setup while enabled. It includes the existing master/requirement areas, guide location pages, extra guide encounters and saved custom location flags; the current Maxed fixture exposes 395 distinct controls.

The completed-access hiding rule no longer applies in this mode. Locations recorded or derived as Yes remain visible, editable and present after reload, independently of Show completed access. Ordinary mode retains its existing completed-check behaviour. Choices are character-local and survive exports/imports. Turning the mode off restores ordinary open-area defaults while preserving the stored values; hard-area manual overrides retain their existing meaning.

The Settings controls use the existing one-click Yes/No cards. Search filters the pool without changing facts or starting calculations. A direct button opens/focuses the account location controls. **Use automatic quest/skill facts** clears the manual location record, including physical naming aliases. Re-enabling an alias clears stale opposite overrides. A room blocked by a parent entrance shows the parent and a direct review action, rather than offering an ineffective child toggle.

Manual restrictions are applied to the guide and hunter as well as the visible controls:

- The guide removes disabled/inaccessible locations while the mode is enabled and resolves a stale selected location to an allowed alternative.
- Automatic combat timing uses an allowed room, including the correct single/multi-target context. If no location remains, guide DPS is unavailable and the hunt method explains the restriction.
- Explicit measured/manual methods in a disabled area remain invalid; no alternative measured location is silently inferred for ordinary masters.
- Ordinary-master assignments remain receivable unless their actual assignment rules exclude them. A saved completion method with no usable location requires a block/skip or a different method; the offer weight is not silently removed.
- Konar’s pool checks the legal rooms within each grouped roll. A closed boss chamber does not close other usable creatures in that roll. Lizardman Temple off reduces shaman compatibility from 3/5 to 2/5 while the Molch roll can still be completed on ordinary lizardmen. Closing every reviewed completion room removes that location roll.
- Combat cache identity includes the active location restrictions, so a previous location’s gear/DPS is not reused after a pool change. With the mode off, dormant ordinary-area choices do not invalidate combat results.

Physical entrance aliases are separate from Konar’s assignment groups. Existing quest/skill requirements, creature unlocks, bank items, point balances and purchases remain independent. The change does not alter quest completion or buy rewards. The underlying guide/source records are retained; filtering does not erase locations. No new Wiki requests or external dependencies are required.

Location-pool blockers link directly to the relevant filtered controls in Settings through the existing warning/correction interface. The profile schema and area-rule snapshot version remain compatible; older app versions may not enforce all of the new guide/room restrictions.

## Verification

Passed: production build, strict TypeScript and 370 JavaScript tests. Seventeen regressions reproduce completed-area hiding, immediate editable Settings controls, complete guide/custom-key coverage, case-normalised naming and alias resets, parent/room restrictions, stale guide selection, no-location DPS, an allowed Dust devil timing alternative, shaman/Nexus/Waterbirth Konar cases, cache invalidation, parent correction links, character round trips, filtered Settings corrections and non-target offer-weight preservation.

Browser QA uses a synthetic localhost character to enable the setting, find and disable Taverley Dungeon, verify saved state after reload with completed checks hidden, confirm the guide omits that route, and re-enable it while keeping the control visible. Settings search and the direct account-review action are checked. Native desktop interaction is not repeated; running applications and their real character files remain untouched. Distribution/source parity and ZIP integrity are checked during release packaging.
