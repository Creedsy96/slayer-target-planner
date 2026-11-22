# Turael reset correction — 2.6.1

The user reported that reset waiting times in the main master table were much slower than expected. The table had treated resettable assignments as completed at the original master. The simulator did reset them, but gave Turael an automatic block proposal without charging its setup. The current-task path also completed an already-assigned task before applying any reset policy.

## Corrected calculation

The analytical offer-time calculation uses a first-step renewal equation. Let P be the main-master target probability, R its reset probability, F the replacement target probability, Q the per-request time, S the per-reset time, and T the expected non-target replacement action time (including its request). A cycle requests the main master, then requests Turael only when a reset occurs. Its success probability is P + R×F, and its expected requests are 1 + R. Target offers stop before combat.

Expected waiting time = expected cycle minutes / (P + R×F).

The main cycle cost includes Q, completion/paid-skip time for tasks that cannot or should not be reset, and R×(S + T). T respects recorded beginner blocks, chosen methods, travel, quantities, paid preferences and early target offers. The displayed target probability is (P + R×F)/(1 + R), explicitly labelled across both request types. The direct main-master probability is also shown. This is a stationary offer-time estimate; simulation supplies finite points, streaks, cape, quantity and drop results.

Recorded actual beginner blocks now control both replacement draws and reset eligibility. Proposed/automatic filler blocks are not applied in reset mode. A resettable original task does not require its original combat method, but a replacement that must be completed does. Current assigned tasks use the reset rule before consuming their remaining kills. Compatible target offers and keep/protect preferences remain protected. Incompatible Konar locations use the same non-target completion/reset branch in estimates and simulation, and task lookup explains this conditional action.

## Rule evidence

- [Turael](https://oldschool.runescape.wiki/w/Turael), checked 19 November 2026: replacement loop, shared beginner blocks, and blocking a Turael task allowing cancellation of that assignment from another master. Own tasks cannot be replaced.
- [Slayer reward point](https://oldschool.runescape.wiki/w/Slayer_reward_point), checked the same date: Wilderness cancellation resets only that streak; Turael completions give zero points and advance normal task count.
- [Mortimer](https://oldschool.runescape.wiki/w/Mortimer), checked the same date: Turael cannot replace his tasks.

Rule text was available through indexed Wiki results; direct page retrieval was robots-restricted. The equations above are derived from the implementation’s explicit timing/probability assumptions, not quoted Wiki formulas. No catalogue or saved-profile migration was needed.

## Verification

Verified 19 November 2026.

- TypeScript check and production build: passed.
- Complete Node suite: passed, 118 tests. Ten reset regressions include independent renewal equations, simulation agreement, replacement targets, unreachable targets, incompatible Konar locations and keep/protect precedence, actual/proposed block distinctions, current-task cancellation, original/replacement method access, and normal/Wilderness streak separation.
- Independent fixture: main target probability 1/4, reset probability 1/2, an 8-minute shared task, 5-minute mean replacement, 1 minute/request and 0.5 minute/reset gives 25 minutes. The old complete-original estimate was 252 minutes. Recorded blocking of the shared Turael assignment gives 14.5 minutes and changes reset eligibility. Seeded 20,000-trial simulations matched these cases within the specified sampling tolerances.
- Controlled Maxed/Cerberus/Nieve comparison with identical blocks: original table 12.6116 hours; corrected table 1.3957 hours; corrected simulation 1.3961 hours (2,000 trials). Reoptimising blocks with the corrected objective gives 0.8946 hours.
- Browser on a separate synthetic profile: Nieve table 54 minutes versus 53 minutes over 20,000 trials. Konar table 3h 58m versus 4h 2m over 20,000 trials, with all trials reaching the goal. The horizon was raised to 10,000 offers for the rarer Konar target. Task lookup explained the 20% compatible-location condition and resetting other locations. Point-rate cells showed Use simulation; the browser error log was empty.
- Portable Windows x64: launched version 2.6.1 from its final Desktop folder and verified existing settings loaded. The packaged planner.js matches the verified browser build byte-for-byte. Native profile fields were not changed for testing.

Simulation samples can differ from analytical expectations; a 100-trial result has visibly greater noise. Both estimates retain configured combat/travel rates, uniform quantity assumptions and the documented location model. Cape/current-task, finite-point, kill and drop scenarios require simulation for their full result. No in-game or second-computer testing was performed.
