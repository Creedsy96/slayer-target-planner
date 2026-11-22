# Verification

## 4.0.2 release — 22 November 2026

- Production build and TypeScript checks: passed.
- Full suite: 541 tests passed, none failed or skipped. Coverage includes the
  real Electron ASAR regression, Windows extraction/rollback, all 167 reviewed
  creature gates, custom characters, strict Konar planning and named warnings.
- Two older tests expected Cow calves to retain a generic confirmation. Their
  replacements verify derived ordinary access, deliberate restricted-account
  exclusions and genuinely unconfirmed Bryophyta methods.
- 100 ordinary creature gates derive access. The 67 special method checks retain
  named explanations; actual quest/skill/location restrictions remain enforced.
- Calculation fingerprints change with the access rules; character storage and
  schema remain unchanged. No character data was rewritten for release preparation.
- The updater validates app.asar through Electron original-fs. The real Electron
  test loads the updater/helper from a packaged ASAR against disposable data.
  4.0.0/4.0.1 copies need a manual upgrade to receive this correction.
- The broader review of every guide location/travel route remains pending outside
  this bugfix; generic/unreviewed routes are not relabelled as reviewed.

Publication passed: GitHub v4.0.2 targets cb675b610d0bedc3f29fdb42b6ecc3cc14b0611b;
its latest stable ZIP digest matches
`bdecf9c81bca4a29a6b47bacae4a1f1b9dcc7a56583ed11dea6a4c786acf5222`.
The 172.9 MiB ZIP passed CRC and all 1,482 application checksums; the clean
distribution includes 950 corresponding source files matching that revision.
The packaged updater was loaded from the actual release ASAR in the real pinned
Electron runtime against disposable data, selected the live 4.0.2 feed/digest
for 4.0.1, and reported up to date for 4.0.2 without the false extraction error.
This check did not download/install a future version or interact with live characters.
The owner-only private Site deployment succeeded for the same release revision
(deployment appgdep_6b03602a28b08191b059534bd310671d). Desktop replacement is waiting
for the running 4.0.1 app to close. No interactive UI acceptance is inferred from
automated tests.

## 4.0.1 release — 22 November 2026

- Production build and TypeScript checks: passed.
- Full suite: 530 tests passed, none failed or skipped. This includes the new
  cache-stall, late-response, cancellation, stalled-write, progress coalescing,
  prepared task-recording and worker block-review regressions.
- The prior focused browser check recovered from a deliberately stalled database
  while the all-gear calculation ran, and navigation/block explanations remained
  interactive. See [the feature record](docs/features/ui-responsiveness.md).
- Worker calculation fingerprints invalidate the old plan shape once; the version
  bump alone does not change the worker fingerprint. Character storage and schema
  stay unchanged.
- The Windows distribution uses the clean runtime/documentation/source/share
  layout introduced in 4.0.0. Release packaging verifies corresponding source,
  native/browser asset parity, all file hashes, ZIP CRC and the published digest.

Native production acceptance passed after publication: the bundled 4.0.0 Windows
helper installed the exact 4.0.1 ZIP, launched the new EXE and received its actual
4.0.1 window-ready acknowledgement. All 1,474 installed file checksums, corresponding
source, EXE metadata and the sharing ZIP matched. The Desktop has one 4.0.1 folder,
with its ZIP/checksum under share/. The verified old application/rollback copy and
duplicate packaging artifacts were recycled as requested; live character storage
was reused and was not replaced.

Windows UI control was stopped before the in-app download action, so the installer
received the local ZIP whose hash matched GitHub's published asset digest. This
verifies real installation/relaunch/startup, not an end-to-end UI-mediated download.
The anonymous live release feed selected the correct version, asset and digest.


## 4.0.0 release — 22 November 2026

- Production build and TypeScript checks: passed.
- Complete regression suite: 524 tests passed, none failed or skipped. This includes
  the updater, persistent calculations, Eclipse burn, travel/access derivation,
  gear/hunt/strategy regressions and retirement of the migrated workbook starter.
- The release check found and fixed over-invalidation of combat results by dormant
  ordinary-area overrides. Special access confirmations still invalidate them.
- Windows helper tests performed real extraction, checksum verification, folder
  replacement and rollback in disposable fixtures using the new organised layout.
  Restart/process-health boundaries in these tests are mocked.
- The packaged native 4.0.0 window opened with Maxed selected and the existing
  custom characters present. Final Settings interaction was interrupted, so its
  links are checked in the packaged UI/source rather than claimed as clicked.
- Distribution verification checks the clean root allowlist, native and browser
  asset parity, corresponding source revision/files, licences and update metadata.
  ZIP creation verifies every archived file hash and its CRC.
- Obsolete local build/diagnostic copies and the Slayer backup folder were moved
  to the Recycle Bin. Live character storage was preserved. Artwork caches remain
  to avoid unnecessary repeat Wiki requests; previous source revisions remain in Git.

The actual future-release production auto-upgrade remains untested until a newer
GitHub release exists. 3.x copies require this one manual 4.0.0 replacement.
Native observation does not establish operation on another Windows computer.

Historical evidence lives in [docs/verification](docs/verification/), beginning
with the [initial release](docs/verification/initial-release.md). Feature-specific
evidence and limitations remain in [docs/features](docs/features/).
