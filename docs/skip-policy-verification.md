# Hunt skip recommendations — 2.5.1

Verified 19 November 2026.

The selected master's hunt panel now displays all full skips and partial-skip frequencies without opening a disclosure. Lists exclude blocked, ineligible and target assignments. Saved skip/avoid preferences are labelled, Turael resets are listed separately, and unavailable plans show correction guidance. The planner and simulation algorithms and saved-profile format are unchanged.

- TypeScript check and production build: passed.
- Node test suite: passed, 94 tests. Five new regressions cover full/partial lists, targets/blocks/requirements/keep/protect, saved skip preferences, no-skip policy, reset classification and unavailable-plan guidance.
- Local browser: passed. Maxed Hellhound hunt with Nieve showed 14 full skips and Brine rats at 66.4%; switching to no skipping showed an empty-policy message, and switching back restored the list. Layout inspected in Daylight theme.
- Windows x64 package: passed. Launched the 2.5.1 EXE from its final Desktop folder; the existing Ember profile loaded and the hunt panel exposed 12 full skips and Dagannoth at 73.8%. No profile fields were edited during native verification.

Full-skip labels describe policy intent, subject to available points and reserve. Stationary estimates and explicit simulation preferences remain distinct. No in-game verification or verification on another Windows computer was performed.
