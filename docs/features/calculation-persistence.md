# Saved calculations — 4.0.0

Completed worker results are stored locally in IndexedDB, separately from character facts and JSON backups. Plans, guide gear, comparisons, selected methods, strategy comparisons, hunt searches and simulations can be reused after reopening. Individual completed equipment searches are saved as they arrive, so cancellation does not discard finished work. Missing work still calculates normally.

Every build derives a SHA-256 calculation version from the bundled worker. Changes to formulas, imported calculation code or bundled game data invalidate older results; appearance-only edits do not. Stable request signatures include the relevant character/setup, effective equipment, quest facts, travel capabilities, chosen creature/method and simulation seed/settings. Filenames, snapshot timestamps, character names, notes and setup progress do not invalidate calculations. A guide selection does not invalidate the hunt plan. Existing per-creature gear overrides continue to refresh the creature and dependent masters.

The interface reports Saved calculations restored after reuse. Check calculations verifies the same inputs and reuses a matching result. Cache reads are cancellable and stale completions are ignored. Errors are not saved as completed calculations. Corrupt entries are ignored; storage failures fall back to live computation and show a saving limitation. Values such as Infinity are stored through structured cloning rather than lossy JSON serialization.

Storage belongs to this browser/app installation. It is not sent to a server or included in character backups. Deleting a character removes its persistent results. The cache is disposable and bounded at 128 MiB / 10,000 entries; old calculation versions and oldest excess entries are removed. Clearing site/app data or storage eviction can require recalculation. Results need one successful calculation in this new implementation before they can be restored in later sessions.

Focused tests exercise fresh-instance restoration without a CPU worker, version/input invalidation, metadata-only reuse, partial combat restoration, cancellation, failed/corrupt storage, guide isolation and character deletion. Browser verification used a disposable localhost character: ten completed master plans returned after reload with Saved calculations restored, renaming reused them, owned Eclipse gear returned after reopening the guide without an endless loading state, and a 100-trial simulation restored its identical totals after reload. The character was removed after verification. Included in the 4.0.0 release; see the current verification record.

## Development workflow

Run focused tests for affected behaviour and build/type checks as needed during ordinary development. Run the complete suite only when preparing a release requested by the user. Batch changes locally; do not publish a release for each small change.
