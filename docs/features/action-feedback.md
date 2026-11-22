# Action feedback — 3.0.13

Failed actions now display a floating banner beside the control that initiated the action. Errors no longer depend on the user finding the message container at the top of a long page. Synchronous validation, worker failures, imports, method/preset actions and manual gear edits share this feedback. Action warnings and informational messages use the same banner with an appropriate severity. Persistent storage/load failures remain visible at the page level with a backup-export action.

Each banner contains a correction link and a dismiss button. For example, trying Simulate, full-hunt search or strategy comparison with missing current points immediately shows **Enter current points**; no worker is started. The link opens the planner’s points section, expands the disclosure and focuses/highlights the main Starting points field. It does not change the balance or start simulation automatically.

Other known validation failures resolve to normal/Wilderness/Mortimer streaks, current-task remaining count, current/previous Konar location confirmation, pending offers, cape history/modifiers, Mortimer progression, target drop rate, master selection or preset name. Failed plan requirements reuse the existing named requirement destinations, including filtered reward controls, quest stages and skill fields. Invalid input links back to its field; quest and gear import failures return to their import controls. Unknown errors offer a return to the original action instead of inventing a cause or automatically changing account facts.

The initiating route, character, control selector, duplicate-control occurrence and viewport rectangle are captured with the action. Async worker/import callbacks retain that context; a later click cannot move an earlier failure to the wrong button. Re-rendered controls are resolved again by identity. If the original view is no longer displayed, the banner uses a visible viewport fallback. Scroll and resize reposition it, and the width accounts for the scrollbar. The top-layer popover avoids clipping inside cards. An imported/profile edit continues to use the existing validation and preservation rules.

Banners persist until dismissed or a successful character edit; there is no short timeout for errors. Error/warning announcements use `role=alert`; information uses `role=status`. Appearance does not steal focus. The correction link focuses the destination; dismissal from inside the banner restores the initiating control when present. Escape dismisses it. Theme colours, reduced motion and the existing animation setting are respected. A single banner is shown at a time; persistent plan requirements remain available in their normal review sections rather than generating a toast for every unavailable master.

## Verification

Passed: production build, strict TypeScript and all 345 JavaScript tests. Fifteen focused regressions cover correction destinations, reward controls, pending/current/cape context, import and numeric errors, duplicate controls, HTML escaping, placement at viewport edges, reactive replacement, off-route fallback, accessible roles, persistent feedback, focus/expanded disclosures and Escape. The complete suite was rerun after the final correction-link and scrollbar-width refinements.

Browser QA used the separate localhost synthetic character. Checks confirmed:

- Missing points produces a banner beside each of Simulate, hunt search and strategy comparison without starting calculation work.
- The balance correction opens the closed points disclosure and focuses `points`.
- A delayed worker failure for a missing normal streak retains the Simulate origin and links to `streaks.normal`.
- Invalid trial count shows field-local feedback and its correction focuses `simulation.trials` without committing the invalid value.
- Escape dismisses the banner; appearance leaves focus at the initiating action.
- The banner remains inside a 390-pixel viewport, including its scrollbar. The normal viewport was restored after testing.
- A desktop proof image records the missing-points banner and correction link.

Native Windows interaction was not repeated. Running desktop applications and their character data were left untouched. Distribution/source parity, notices and ZIP integrity are checked during release packaging.
