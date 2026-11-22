# Location and route reviews — 4.1.0

Every listed guide location now resolves to one of 375 canonical, revisioned
location reviews. The index covers ordinary locations, named rooms, aliases,
quest/challenge appearances and the guide's explicit extra encounters. The review
scope is the entrance and the published transport information. It does not assert
that every teleport is owned, every charge or entry item is stocked, every room
allows a cannon, or every quest encounter is repeatable.

## Behaviour

- Location cards include expandable entrance and travel notes with the source
  revision and a Wiki link. Existing curated transport choices still use recorded
  character capabilities; published alternatives are separately labelled as
  reference information. Source descriptions provide context for smaller locations
  rather than invented teleport or walking instructions.
- Stalker Den derives access from completed Shadows of Custodia. Its northern
  entrance avoids the southern entrance's 59 Agility requirement. Mature and elder
  custodian stalkers no longer need duplicate generic confirmations.
- Tonali Cavern is gated by The Final Dawn, rather than being treated as Neypotzli
  or having its 48 Slayer room rule copied onto every Tonali creature.
- Shaman Caves is the Legends' Quest cave in Kharazi Jungle. It no longer inherits
  Lizardman travel, Shayzien protection or Xeric's Lookout recommendations.
- Actual inside-guild creatures check reviewed skills or quest points. Exterior
  Fishing/Farming Guild spawns and the Crafting Guild cow pen remain accessible
  without the interior's requirements. Brimhaven's ordinary entrance remains open;
  the axe/10 Woodcutting vine route is a separate caveat.
- Wilderness God Wars Dungeon checks 60 Strength **or** 60 Agility and does not
  inherit main-GWD faction kill-count instructions. Scorpia does not inherit other
  Wilderness bosses' diary and 50,000-coin entry gate. Ferox Enclave is treated as
  safe, while actual Wilderness locations and approaches retain PvP warnings.
- Sailing mooring requirements are kept separate from known rowboat, charter and
  fairy-ring alternatives. Unimported construction/destination steps remain named
  confirmations. The Node and Limbo are explicitly special locations, rather than
  ordinary repeatable recommendations for every character.
- A known locked or unconfirmed entrance cannot be labelled an available fallback
  walking route. Correction buttons lead to the owning account requirement or
  restricted location pool; missing teleport stock still leads to Travel settings.
- A creature Yes or completed quest proof cannot bypass a known locked/unknown
  physical route. Real manually confirmed methods without a captured spawn list
  retain their existing override, with the limitation explained.

The built-in Maxed assumption includes newly reviewed ordinary routes when no
manual choice exists. Explicit restrictions, skill/quest changes, purchased Slayer
rewards and custom character facts are preserved. Known hard failures still win.
The account and setup level fields include the newly relevant noncombat skills.
Temporary skill boosts are not automatically assumed; source notes retain their
boost/shortcut qualifications. Full-wave encounters and other special methods keep
their existing timing and confirmation requirements.

## Data and maintenance

`data/location-reviews.json` contains source context, published transport notes and
the reviewed route/access metadata. `data/location-access-reviews.json` contains
only the rule inputs and source identities needed by calculations. Long source
excerpts stay out of the calculation worker and its persistent fingerprint.

`python tools/build_location_reviews.py` deterministically regenerates the two
indexes and [the audit table](../reference/location-route-audit.csv) without network
requests. Existing captures were reused. Missing references were fetched through
sequential MediaWiki API batches of ten, with five-second gaps; no HTML scraping or
concurrent page fetching was used. The optional capture tool now reports zero
missing references and does not run during builds, startup or creature selection.
Original captures, redirects, source URLs and revisions are retained in
`data/location-sources/` and the pre-existing source folders. Wiki excerpts and
adapted data retain the CC BY-NC-SA 3.0 attribution in THIRD_PARTY_NOTICES.txt.

The creature gate audit now has 103 derived entries and 64 special confirmations.
Calculation fingerprints change with the access rules; character backup schema,
storage location and saved user facts are unchanged.

## Verification

Automated checks cover every guide form/location, explicit added encounters,
source revisions, deterministic generation, route aliases, hard quest/stat gates,
guild exteriors, alternative entrances, manually restricted areas, correction
destinations, old Maxed characters and rendered source notes. Release build,
TypeScript, complete-suite and artifact results are recorded in the root
[verification record](../../VERIFICATION.md). No interactive UI or in-game route
acceptance is inferred from these automated checks.
