# Imported accounts and progressive combat timing — unreleased

These changes are queued after 4.1.0. They have not been packaged, published or
installed over the Desktop copy.

## Imported facts and access

Account and quest imports enable conservative requirements: omitted quests count
as not started, and unresolved access is unavailable. An empty, valid quest list
therefore represents no completed quests. Existing manual overrides are preserved.
Quest points use the recognised completed quest rewards; omitted rewards add zero.
Unrecognised completed quests still warn rather than inventing quest points.

Account-folder imports default unexported diaries, purchased rewards, point
balances and streaks to No/zero only when no recorded value exists. The import
notes explain these defaults, including the need to record actual Slayer points.
Missing skills or special access remain visible as warnings with a negative
assumption. These warnings do not invalidate an otherwise usable master or hunt.
Explicitly unmet target, master, quest and skill requirements remain enforced.
Manual confirmations remain editable when their underlying fact is unconfirmed;
they cannot bypass a known hard requirement.

Konar excludes quest-locked locations from her available roll pool. In particular,
an omitted/incomplete Final Dawn excludes Tonali Cavern without blocking an
otherwise valid hunt. Remaining unconfirmed location warnings name the affected
creature and location. Saved imported characters adopt the same omission policy.
The additive policy flag is included in combat cache identity.

## Background combat and hunt selection

Gear imports start a dedicated combat worker, including during character setup
and the practice tutorial. Hunt targets and the selected guide creature have
priority. The real character's worker survives tutorial navigation; the practice
character remains separate.

Interactive hunt workers use completed cached combat results immediately. While
the background search is active, unfinished automatic methods use a clearly
labelled provisional 5 DPS. Measured/manual methods and unsupported encounters
retain their configured timing. Tables refresh as results arrive and once again
when background work finishes. Provisional plan results are never stored as final
saved calculations; real creature results remain reusable between sessions.
Progress includes percentage and the current calculation.

The large current-hunt badge opens the searchable creature selector. Selecting a
creature changes that target's assignment and variant, preserving its priority,
the remaining targets and other hunt settings. Duplicate assignments are excluded.

## Equipment correction

The Elemental amulet (34428) requires Magic 59 to equip. Its crafting requirement
is not an equipment gate. The retained Wiki capture records revision 15405702 in
`data/equipment-sources/elemental-amulet.json`; the reviewed requirement and audit
are regenerated without further requests.

## Focused verification

Build and TypeScript checks passed. 161 focused tests passed across import,
quest-point, setup, equipment, cache/persistence, responsiveness, strategy,
simulation workload, Konar, access, location and travel suites. Regressions include
Magic 58/59, omitted/empty quest snapshots, preserved manual facts, editable
special confirmations, Tonali exclusion, a cold provisional worker with no gear
searches, actual background result publication and durable-cache protection.

A disposable local-browser character verified the large hunt selector, changing
to Hellhounds, continuing background progress and usable master tables before DPS
completion. Native Windows interaction and the full release suite were not run.
The user's Desktop character storage was not modified.
