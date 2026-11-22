# Derived creature access — 4.0.2

The reported Konar failure came from a generated `variant:deviant-spectre`
confirmation, not a purchased game unlock. The catalogue generator added the same
generic access/method flag to 167 alternatives. Unknown flags could invalidate a
strict hunt through a non-target completion method.

## Reviewed rules

`data/creature-access.json` audits every one of those 167 keys against retained,
revisioned creature/area sources. [The audit table](../reference/creature-access-audit.csv)
records each creature, mode, locations, proof, remaining check and source revision.
`python tools/build_creature_access.py` regenerates both outputs without network
requests; `--output` writes a candidate JSON without changing the active files.

- 100 ordinary creature gates now follow skills, quests and available locations.
  Deviant spectres, Warped jellies, Mutated bloodvelds, Greater nechryael, brutal
  dragons, Rune/Adamant dragons, Fossil Island wyverns and many ordinary spawns
  no longer require a separate creature checkbox.
- 67 retain a specific method/route check: summoned/quest-limited creatures,
  unreviewed routes, boss-entry items, shade doors, wave encounters and similar
  facts not established by the current exports. Completed quest proofs resolve
  the applicable partial-stage routes automatically. A proof applies only to its
  reviewed route, such as Bone Voyage proving the Fossil Island zygomite route.
- Known area restrictions remain authoritative, including Bone Voyage, Dragon
  Slayer II, Monkey Madness II and the Heart of Darkness/Sailing alternatives.
  Multiple locations are alternatives; a selected method checks its own location.
  A manual Yes cannot bypass a failed known skill or quest requirement.
- Slayer level 0 means no Slayer requirement; an unimported level does not turn
  that into an unknown requirement. Assignment-specific Priest in Peril gates
  for spectres/nechryael remain separate from being able to kill them off task.
- Original keys/values are retained for saved-character compatibility. Ordinary
  derived gates ignore those legacy flags in normal mode. Restricted-account mode
  can still deliberately disable creatures, and its controls can return to known
  requirements. Known hard requirements cannot be granted by that toggle.

The known-access lists remain compatible, while normal account/setup screens omit
derived creature checkboxes. Remaining checks display the creature, named area(s)
and what cannot be derived. Unknown is labelled **Unconfirmed**, rather than No.
Completed proofs/confirmed one-time checks use the existing hide-on-next-visit
behaviour. Persistent character facts are not rewritten by this review.

## Planning and warnings

The 4.1.0 [location review](location-route-reviews.md) extends the audit to all
listed guide locations, removes the duplicate Stalker Den/Ancient Zygomite gates,
and corrects Tonali Cavern's quest owner. The current generated creature audit is
103 derived entries and 64 special confirmations. The 100/67 counts above record
the original 4.0.2 release. Reviewed physical-route requirements remain authoritative
even when a special creature method has been manually confirmed.

Konar warnings inspect individual area outcomes, so the Catacombs spectre branch
names Deviant spectres rather than an unrelated representative variant. Remaining
method issues include the creature and location and link to the account, method
or area correction. A usable master with an unresolved plan is labelled **Plan
needs attention**; actual master-access failures retain their unavailable label.

Fully skipped non-target creatures do not need a completion-method confirmation.
Assignment eligibility requirements still matter for their offer weights, and
partial skips still need a valid completion method for the tasks being kept.

## Verification

Build and TypeScript checks passed. 124 focused tests passed, covering the reported
strict Konar/Deviant case, all 167 audited keys, deterministic regeneration,
derived variants, real Slayer/quest gates, alternative locations, quest imports,
manual restrictions, saved-character compatibility, fully skipped methods,
named warnings and wizard/account rendering. The requested 4.0.2 release then passed the full 541-test suite; see the root
verification record. Retained Wiki captures were reused with zero new game-Wiki
requests. The broader review of every guide travel route is separate and remains
pending outside this creature-gate bugfix.
