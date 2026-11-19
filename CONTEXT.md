# Slayer Target Planner

Vocabulary for planning Slayer assignments and creature hunts. These terms distinguish game rules from player preferences and planning estimates.

## Language

**Assignment type**:
The category a Slayer master assigns, such as Basilisks. Several monster variants can satisfy the same assignment type.
_Avoid_: Creature, monster, variant when referring to the assignment category.

**Monster variant**:
A particular creature that can satisfy an assignment, such as a Basilisk Knight. It has its own combat properties, access requirements and drops.
_Avoid_: Assignment type, representative monster when referring to an explicitly chosen creature.

**Task offer**:
The choices presented when requesting an assignment. An offer can contain one assignment or several distinct choices, each potentially carrying a modifier.
_Avoid_: Completed task, kill.

**Assigned task**:
An accepted assignment with a quantity, applicable location restrictions and modifiers. Accepting it and completing it are separate actions.

**Completion method**:
The monster variant, location and combat approach used to complete an assigned task, including travel, banking and quantity-changing equipment.

**Eligibility**:
Whether the player can use a master, receive an assignment, or use a particular completion method. These are separate questions; an unmet method requirement does not necessarily remove its assignment from the offer pool.

**Requirement**:
A game condition for eligibility, such as a skill level, quest state or purchased unlock. Missing player information is unknown, not automatically satisfied or unsatisfied.
_Avoid_: Preference, block when referring to a game condition.

**Block list**:
Assignments excluded through a master's in-game blocking system. Masters can share a block list where the rules specify a shared group.
_Avoid_: Requirement exclusions, skip list.

**Task preference**:
A player's instruction to keep, skip, protect or avoid an eligible assignment. It does not change the game's underlying assignment eligibility.

**Hunt goal**:
The event that finishes a plan: receiving an acceptable opportunity, completing a quantity of target kills, or obtaining a specified item. An acceptable opportunity must permit the desired monster variant and location.
_Avoid_: Target alone when the stopping event matters.

**Optimisation objective**:
The measure used to compare valid plans, such as assignment chance, expected waiting time or points expenditure. An objective does not replace a hunt goal or relax its requirements.

**Strategy**:
A rule for choosing the next legal action from the player's current situation, including master, points, streaks and current offer or assignment.

**Sustainable strategy**:
A strategy whose expected points expenditure is funded by expected rewards over repeated play. Sustainability does not guarantee the player can afford its next skip.

**Funded strategy**:
A strategy whose individual actions respect the player's available points and configured reserve. Rewards become spendable after the corresponding completion.

**Boosting**:
Completing assignments with a filler master and switching for selected streak milestones, subject to the applicable streak rules.
_Avoid_: Resetting, skipping when referring to milestone point boosting.

**Resetting**:
Replacing an assignment through an eligible reset action, including any resulting streak change. It is distinct from a points-paid skip.

**Data snapshot**:
A dated collection of sourced game rules and monster properties. Player overrides and estimated timings are separate from the snapshot.

**Plan profile**:
A saved collection of player information, preferences, methods, block lists and planning assumptions. It does not contain login credentials.
