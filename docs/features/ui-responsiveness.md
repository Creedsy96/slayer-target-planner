# UI responsiveness — unreleased

The 4.0.0 renderer called `blockImpacts` every time it drew the selected master,
including while the explanation was collapsed. Each impact called `evaluate`
without prepared task rows, allowing fresh equipment searches on the renderer.
The block-review dialog evaluated its before/after plans twice, and task-record
dialogs prepared combat rows again. These were synchronous UI paths despite the
main hunt calculation using a worker.

Block deltas and the compact block-review summary now travel with worker-produced
plans. The worker reuses the prepared methods after resetting policy fields;
changing blocks does not require another equipment search for each delta. Drawing
or opening the explanation only formats these results. Task recording reuses its
reviewed row, with existing profile-change checks guarding the dialog. Applying
measured timing uses the configured method rather than preparing every task.

Saved-result lookup and combat-cache restoration share a 1.5-second deadline.
If storage does not answer, one live worker starts and reports the fallback;
late storage responses cannot overwrite it or start another worker. Cancellation
also prevents the fallback. A finished calculation is displayed before waiting
for its persistent write, so stalled storage cannot hold the UI at completion.
Worker progress is limited to approximately 20 updates/second, with the latest
pending update flushed before completion. Background redraws coalesce once per
animation frame. User actions retain their immediate rendering path.

## Verification — 22 November 2026

- Production build and TypeScript checks passed.
- 46 focused tests passed: responsiveness regressions, persistent calculations,
  hunt actions, guide priority and combat-cache reuse. The full suite was not run;
  it remains reserved for a requested release.
- New regressions cover a cache read that never resolves, a stuck combat lookup,
  late cached success, cancellation, a permanently stalled write, progress storms,
  worker/standalone block-review equivalence and zero equipment searches when
  recording a prepared task.
- A disposable browser preview deliberately prevented IndexedDB from opening,
  with the Maxed all-gear assumption and Hellhound target. It left the cache
  wait, started named calculation progress, and populated four master plans while
  Settings navigation, the UI response probe and the expanded block explanation
  remained interactive. The probe observed two tasks over 50 ms, with a maximum
  of 155 ms including startup; this is a single local observation, not a general
  latency guarantee.

The reported native character database was not modified or diagnosed directly.
The screenshot's cache-wait state is consistent with the unbounded storage wait;
the synthetic test proves recovery from that failure mode. These source changes
are queued for the next release; the published/Desktop 4.0.0 package is unchanged.
