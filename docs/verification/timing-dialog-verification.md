# Timing rate dialog — 2.2.2

The measured timing source previously called the generic profile-name prompt, so its input was labelled Name and accepted arbitrary text. It now uses a dedicated numeric rate dialog. Kills per hour and Combat minutes per whole task have explicit labels; the combat-time hint excludes travel/banking, which is added separately. The inline rate label follows the selected timing source too. Profile naming and data-rebase prompts are unchanged.

Passed: strict TypeScript check and 63 automated tests, including three new dialog regressions covering both unit labels, fractional numeric values, rejection/correction of zero/negative/non-finite drafts, and cancellation of invalid drafts.

Passed browser checks in the synthetic verification profile: switching to measured kills/hour opens the correctly labelled numeric prompt; zero stays open with an actionable validation message; 250.5 saves and appears in the inline Kills per hour field. Switching from DPS/zero rate to whole-task minutes opens the correctly labelled combat-time prompt. Cancelling its empty draft restores the previous DPS timing. No desktop player facts were changed for these checks.

The existing profile schema, rate bounds, calculator, data catalogue and area rules are unchanged. Windows packaging uses the tested generated renderer; private publication preserves owner-only access.
