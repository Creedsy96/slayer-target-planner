# Consistent Creature guide sidebar — 3.0.25

A legacy standalone-guide screen rule hid the character picker, character actions, quick setup and saved-state indicator, while changing sidebar padding and navigation margins. A separate mobile rule also hid the actions and changed navigation spacing. The guide now uses the same on-screen sidebar rules as the rest of the app. The route class remains for the separate print layout; print styling and guide content layouts are unchanged. Quick setup continues to follow the existing display setting, and mobile retains the normal shared responsive hiding of quick setup and the saved-state indicator.

## Verification

Before the change, synthetic browser QA reproduced the issue: the normal desktop sidebar showed character/actions/saved controls, with **20px 16px** padding and **24px -4px** navigation margins. The guide hid those controls, used **16px 16px 20px** padding, and changed the navigation margins to **0px -4px**.

After the change, normal and guide pages matched on desktop: character/actions/saved controls visible, quick setup following its saved Off setting, **20px 16px** padding and **24px -4px** navigation margins. At a **390 × 844** mobile viewport, normal and guide pages both retained the character and actions, used **14px** padding and **13px 0px 0px** navigation margins, and followed the shared mobile quick/saved visibility rules. The viewport was reset to normal afterwards. The guide's character picker was enabled and browser error logs were empty. QA used the synthetic **Unlock warning QA** character; native apps and real character data were untouched.

Production build, strict TypeScript and all **448 JavaScript tests** passed; this CSS fix is verified through the reproduced before/after rendered browser behaviour rather than a test that repeats CSS selectors. Packaged asset/source parity and ZIP integrity are checked during release assembly. Native live-app interaction and print rendering were not run.
