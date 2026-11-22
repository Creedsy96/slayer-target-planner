# Extension rewards in account setup — 3.0.14

The Character Setup Wizard’s Slayer rewards step and Account & access now list all 29 supported task extensions. Cards follow the captured Slayer Rewards **Extend** tab order and display the in-game reward name, an explicit creature icon, point cost and extended quantity. They share the unlock cards’ two-column layout and use one column on narrow screens. The account requirement filter accepts extension names and assignment/creature names.

New characters and fresh Maxed setups display extensions off. One click records the shared assignment extension, highlighting Yes and updating the same state already used by Hunt setup and Combat methods. The setting applies to all variants and masters for that assignment through the existing setter. It does not spend points, purchase a reward in game, grant the creature unlock or infer purchases from skills/quests. Enabled extensions remain visible for review rather than disappearing like permanent area-access checks.

Existing explicit extension choices remain enabled. If an old character has an extended method but no shared assignment record, the card shows **Review** with a mixed pressed state. The existing calculation setting is preserved; one click confirms the shared extension for all variants. An explicit recorded Yes/No takes precedence. Rendering and filtering never modify the character.

Names, order, costs and quantity descriptions are generated offline from the retained `Slayer Rewards` revision 15373095 in `data/sources/slayer-rewards.json`. `tools/build_slayer_extensions.py` validates exactly one reward per extendable assignment and emits `data/slayer-extensions.json`. Fixed quantities and additive quantities (Gryphons: +80) retain their separate meanings. The source link pins the revision. Existing sourced creature frames are reused; no additional page or artwork downloads are needed. The data manifest and Windows share include the reward metadata.

These cards record the existing extension setting. Planner quantity, DPS, optimisation, extension-comparison, profile schema and saved-hunt behaviour are unchanged. A whole-task measured timing still needs the existing normal/extended measurement review. The existing selected-target extension controls remain available in Hunt setup.

## Verification

Passed: production build, strict TypeScript and 353 JavaScript tests. Eight focused regressions cover source reproduction/order and all 29 assignments, icons and fresh defaults, full wizard coverage, shared toggle state and preservation of points/unlocks, legacy review, filtering and source/quantity semantics, and a real Basilonger export/import → quantity/KPH calculation.

Browser verification uses a synthetic localhost character: the wizard shows 29 ordered extension cards, a one-click purchase remains after reload, Account & access shows the same state and filters Basilonger, and disabling the recorded purchase updates the state without spending points. Desktop two-column and narrow-screen single-column layouts are checked. Native desktop interaction and real purchases are not performed; package/source parity and ZIP checks accompany release.
