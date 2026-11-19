# Gear and potion item icons — 2.8.1

The guide renders named gear, potion alternatives, special supplies and recognised items in style switches as external Wiki links with local inventory icons. Spells link to their pages without pretending to be inventory items. Generic recommendations such as blessed dragonhide use representative artwork, named in the hover text, and link to the category page. Empty equipment slots remain plain text. General instructions such as a healer-management plan remain instructions.

`data/item-references.json` owns the reviewed label-to-page and representative-item mappings. `tools/build_item_art.py` resolves those names against RuneLite's pinned `cache/item/names.json`, captures missing PNGs sequentially from the same immutable GitHub commit only with `--fetch`, and produces the local atlas and provenance manifest. It makes zero Wiki requests. Ordinary builds and packaging copy the existing assets and make no artwork requests. Regeneration requires Pillow and the cached originals (or explicit `--fetch`). Each image's source URL, item ID and SHA-256 is retained in `src/ui/item-art.json`.

The **How these sets are chosen** disclosure makes the existing recommendation method explicit: handwritten creature rules override style/defence/tier templates; relative source bonuses only suggest subtypes within a style. Gear does not use a full DPS search, current prices, owned items or account unlocks. This change does not alter the recommendation algorithm or profile formats.

Verification:

- Passed: strict TypeScript, production build and 161 JavaScript tests. New tests verify atlas geometry/provenance, compound choice links, URL/text escaping, match boundaries, category-icon disclosure, and complete generated gear-icon coverage across creatures, approaches, task mode and tiers. Spells and empty slots are distinguished.
- Passed: browser Daylight equipment/potion artwork, separate links for each potion alternative, keyboard focus and independent packing checkbox. Clicking Mirror shield opened its correct Wiki page in a separate tab. No browser console errors were recorded.

- Passed: 440-pixel responsive browser layout without horizontal document overflow, and the explanation disclosure opens with the recommendation method. Packaged Windows 2.8.1 starts and displays linked inventory artwork in Ember; account fields were not edited.

Final package hashes and publication evidence are delivered separately. RuneLite's mirror provides Jagex inventory artwork; Wiki links do not imply that the example loadout was copied from that page or certified optimal.
