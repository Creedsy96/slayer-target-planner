# Master selection navigation — 2.5.2

Verified 19 November 2026.

Selecting a master renders its blocks/skip panel, focuses the named details region and scrolls it to the top with a 20px margin. Motion is smooth unless the device requests reduced motion. Other renders retain their existing scroll-preservation behaviour. No calculations, catalogue or profile schema changed.

- TypeScript check, production build and 94 existing tests: passed.
- Local browser mouse selection: passed for Nieve and unavailable Mortimer; the matching details and issues rendered.
- Local browser Enter activation: passed for Konar. Read-only DOM inspection confirmed the selected panel held focus and settled at 20.39px from the viewport top.
- Windows x64 package: launched from its final 2.5.2 Desktop folder and loaded existing settings. Packaged planner.js matches the verified browser build byte-for-byte.
- Native click/scroll navigation: not run to completion. The native input tool reported user input in the window, so further interaction stopped. Browser interaction supplies navigation evidence; native startup is a separate check.

The reduced-motion branch was inspected in source; an OS reduced-motion toggle was not changed. No new automated tests were added for this small presentation change. No in-game testing was needed.
