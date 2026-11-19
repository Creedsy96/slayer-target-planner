# Creature artwork and interface refresh — 2.7.0

## Scope

Presentation and creature selection only. Existing profiles, game data, timing methods and calculation rules retain their formats. The 271 creature frames come from 253 Wiki image files identified in the cached creature pages. Each manifest entry records the creature page, image page, image timestamp and hash of the downloaded image before cropping/scaling. Assignment badges use representative variants; Boss uses the Slayer category icon.

The build copies one local sprite atlas to the website and Windows package. Icons are decorative and hidden from assistive technology; readable names remain present. Name matching prefers the longest full name, escapes text and excludes form editors, native option text, SVG and code. Native creature selects remain the form/state owner while illustrated search controls dispatch the existing change event.

## Verification

- Passed: strict TypeScript check, production build and 147 automated tests. New checks cover complete artwork coverage, atlas geometry, source attribution, escaping and whole-name matching, picker focus, and committing a selection after a worker replaces the underlying control. Stale or disabled options cannot be committed. Entrance animations run on route changes, not routine profile edits.
- Passed: browser checks of illustrated search, no-match feedback, Enter selection, Escape cancellation with a non-empty search, Undo, and focus return. Escape left zero open dialogs and returned focus to the assignment selector. Creature badges were visually checked in target controls, task tables, completion methods, proposed blocks and requirement guidance. No browser console errors were recorded.
- Passed: Daylight, Woodland and High contrast browser layouts, Ember Windows layout, and Windows compact mode at its actual 440-pixel window width. The full Windows planner was observed again after compact mode. Native account fields were not edited for these tests.
- Passed: local Windows startup from the 2.7.0 package. Final archive hashes and site/release publication are delivered separately from this source record.

## Limits

The selectors were manually checked through browser and Windows accessibility surfaces; no independent screen-reader session was run. Reduced-motion behavior is implemented with the system media query and CSS; OS preferences were not changed for testing. Artwork represents source images, not every visual spawn or recolour. The full-page refresh preserves existing modelling limits documented in the strategy audit.
