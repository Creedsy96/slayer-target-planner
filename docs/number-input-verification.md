# Number input correction — 2.2.1

The previous renderer replaced a focused number input after each digit and focused the new element at the start. Browser reproduction: entering `1`, `2`, `3` in Current points displayed `321`.

The view restoration now retains the native number editor, including its caret and unfinished decimal, through shell and calculation-result renders. Numeric settings, target priorities, method fields and pending-offer fields use their full field identity. Repeated settings in Quick setup and Account retain the correct occurrence. Numbers are handled on input only, avoiding a second rebuild on blur before the next click.

Passed: strict TypeScript typecheck and 60 Node tests. Three added regressions cover editor retention across the four field families, duplicate occurrences, connected/removed fields, disclosure restoration and scroll preservation.

Passed browser observations in the existing synthetic verification profile: Current points types `123` in order; Default DPS accepts `1.5` then insertion in the middle to form `12.5`; target priority accepts `12`; Account's main Slayer field accepts `91` and retains main-form focus; Combat methods accepts `12.5` with focus retained. Live profile state and validation continue to use the existing paths. Test values are isolated from the user's desktop profile.

The data catalogue, area rules and profile schema are unchanged. Existing profile storage remains compatible. Windows packaging and private publication use the tested generated renderer.
