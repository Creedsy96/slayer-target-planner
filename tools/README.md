# Development tools

Run commands from the project root. `build.mjs` builds the browser UI, shared
calculation core and test bundles; `serve.cjs` serves a local preview.

- `build_*.py`, `prepare_data.py` and `refresh_catalogue.py` generate retained game data.
- `capture_*.py` capture primary sources. Reuse retained sources and artwork caches;
  avoid unnecessary Wiki requests.
- Artwork/icon builders and `audit_equipment_requirements.mjs` maintain reviewed assets/data.
- `release/` contains Windows packaging, source/licence assembly, verification and ZIP creation.
- `check_git_identity.py` enforces the repository's personal Git identity.

Release commands are documented in the [project README](../README.md).
Generated bundles, artwork caches and local verification output belong under the
ignored `.desktop-build/` directory. Old packaged builds and ad hoc diagnostic
copies are disposable; keep the current deliverable on the Desktop and source history in Git.
