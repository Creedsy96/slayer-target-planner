# Project and Windows folder layout

The project keeps application code under `src/`, retained source data under `data/`,
native Windows code under `desktop/`, browser output under `dist/`, regression
tests under `tests/` and pinned engine code under `vendor/`. Documentation is
indexed in `docs/README.md`; Windows release tools live in `tools/release/`.
Root configuration, package manifests, licence and entry scripts remain at their
conventional locations. `.desktop-build/` is ignored scratch space, not an archive
of previous releases or character backups.

The shared Windows folder has this layout:

```text
Slayer Target Planner 4.0.0 - Windows/
  Slayer Target Planner.exe
  READ ME.txt
  [required Electron DLL, PAK, BIN and runtime data files]
  locales/                  Electron language resources
  resources/                app.asar and internal update/checksum metadata
  documentation/            licences, notices and exact source revision
    dependency-licences/
    electron/
  source/                   complete corresponding source and original data
  share/                    the matching ZIP and checksum, on distributed copies
```

Do not relocate Electron's runtime libraries independently of its EXE. Original
game/art JSON is included once under `source/`; the runtime reads bundled data
from `resources/app.asar`. No bank, character export or app storage is included.
The share ZIP excludes the `share/` directory to avoid recursive packaging. Its
external checksum verifies the complete ZIP, while `resources/SHA256SUMS.txt`
verifies application contents. The updater expects this same layout and places
its downloaded sharing copy under `share/` after installation.

Character storage remains outside the application folder under Electron's
unchanged user-data location. Git preserves source revisions, not local
characters. Cleanup removes obsolete build and backup copies while preserving
the live character storage.

Maxed is the only supplied default character. Startup retires Default workbook
and the unchanged v1 starter named Imported workbook profile, recognised by its
migration metadata. Renamed workbook hunts and ordinary imported/custom characters
are retained. If the retired starter was selected, Maxed replaces it.
