# Complete extracted folders rejected by updater — 4.0.2

4.0.0/4.0.1 checked `fs.statSync(resources/app.asar).isFile()`. In Electron,
`node:fs` treats a valid ASAR archive as a virtual directory, so that check can
reject a complete extracted installation with the instruction to extract it.
This also explains why standalone Node/path tests and the PowerShell install
helper could succeed while the in-app update entry check failed.

Package validation now uses Electron's built-in `original-fs` for the physical
archive's file/link checks. Reads of the bundled PowerShell helper still use the
virtual filesystem; ASAR support is not disabled globally. Startup/manual checks
validate the installation before consulting the release feed, so an invalid
installation cannot be misleadingly reported as up to date.

The regression packs the current updater into a real ASAR, launches the pinned
Electron runtime without a window against separate disposable user data, proves
the virtual archive is not a regular file, and verifies successful initialization
and an up-to-date check through the fixed code. The helper remains readable inside
the archive. Existing security, download, extraction, rollback, IPC and settings
checks also passed among the 124 focused checks for this change. The runtime was
installed from the existing local Electron cache; the live Desktop app/user data
was not used by this test.

Primary reference: [Electron: treating ASAR as a normal file](https://www.electronjs.org/docs/latest/tutorial/asar-archives#treating-an-asar-archive-as-a-normal-file).
An affected installed copy will require a manual upgrade to the release containing
this fix; its old validation code cannot be repaired by extracting it again.
