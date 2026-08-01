# Pathfinder 1e Character Builder Roadmap

## Completed milestone: Core Character Builder

The Core Rulebook character-building experience is implemented and protected by automated validation.

### Milestone completion criteria

- All 11 Core Rulebook classes are playable through level 20.
- The seven core ancestries remain fully selectable.
- Core feats and spells are available through the generated catalogue.
- Class features, skills, feat prerequisites, spellcasting and character progression are enforced by the rules engine.
- Weapons, armour, shields, inventory, currency and carrying capacity are supported.
- Characters can be saved, loaded, exported and printed.
- End-to-end tests cover representative martial, prepared-caster and spontaneous-caster character journeys.
- Data validation, engine tests, UI tests, browser tests and the production build run in CI.

## Completed development priorities

### 1. Core classes

All eleven Core classes are playable through level 20. Barbarian includes its
complete Damage Reduction progression. Druid includes its complete Core spell
list, both Nature Bond paths with dependent companion or domain choices, and
persistent Wild Shape use tracking.

### 2. Equipment and combat loadout

Weapons, armour, shields, inventory, currency, carrying capacity, encumbrance, damage, critical and range statistics are integrated and persistent.

### 3. Character progression workflow

The explicit level-up preview preserves prior selections and explains newly available class features, ability increases, feats and skill ranks before advancing.

### 4. Strong generated types

The generated bundle and web components consume shared TypeScript contracts for classes, ancestries, feats, spells, class features and option groups.

### 5. End-to-end coverage

Playwright covers representative martial, prepared-caster and spontaneous-caster builds, prerequisite boundaries, persistence and equipment. Chromium journeys run in CI after the production build.

### 6. Accessibility and CI hardening

Character sections expose standard tab semantics with arrow, Home, and End keyboard navigation, a skip link reaches the builder directly, and focus indicators remain visible across controls. Pull requests run one cancellable validation workflow, while pushes to `main` retain the full protection suite.

## Completed milestone: Installable Application

Deliver the existing web builder as an installable Progressive Web App (PWA) so it can be launched from a desktop application icon or a phone or tablet home-screen icon without requiring a separate native codebase.

### Completion criteria delivered

- A standards-compliant web app manifest defines the app name, short name, start URL, standalone display mode, theme and background colours, and orientation behaviour.
- Branded application icons include the required desktop and mobile sizes plus a maskable icon.
- Supported desktop browsers can install the builder and launch it in a standalone application window.
- Android users can install it from the browser and launch it from the home screen or app drawer.
- The application shell and essential generated character data remain available offline after the first successful load.
- Existing local character drafts persist across normal application updates, with versioned migrations when storage formats change.
- An update prompt or safe refresh flow prevents service-worker updates from losing unsaved work.
- Responsive layouts account for mobile safe areas, touch targets and small screens.
- Automated tests verify the manifest, service worker and offline fallback, standalone launch metadata, persistence, and representative mobile and desktop viewports.
- Installation instructions are documented in the README.

### Delivery approach

1. Add manifest metadata and production-quality icons.
2. Add service-worker caching with explicit versioning and an offline fallback.
3. Add installation guidance and safe update UX.
4. Validate desktop and Android installation behaviour.
5. Add CI checks for PWA installability and offline operation.

Native store packages for Microsoft Store or Google Play are optional later work. Use a desktop or mobile wrapper only if store distribution or operating-system-specific integration becomes necessary.

## Next milestone: Expanded Character Options

- traits — complete: all 40 sourced APG basic traits, trait-specific class-skill
  and spell choices, conditional spell modifiers, selection rules, mechanical
  bonuses, persistence, and browser coverage delivered
- archetypes and class paths — catalogue complete for all 826 published entries across
  the 18 supported classes: 825 selectors plus Totem Warrior's rage-power representation,
  with sourced rules text, reusable replacement progressions, persistence, and
  nested domain/school-power filtering. The selector is searchable, compatible
  archetypes can stack, conflicting replacements and ancestry restrictions are
  enforced, and every entry has an explicit mechanical-coverage status. Bespoke
  effects without an existing builder subsystem remain descriptive.
- subdomains - complete: all 66 unique APG subdomains, including Cloud, Wind, Caves, Metal, Feather,
  Fur, Construct, Toil, Protean, Love, Lust, Family, Home, Loss, Night, Murder,
  Undead, Catastrophe, Rage, Daemon, Demon, Devil, Ash, Smoke, Agathion, Archon,
  Azata, Restoration, Resurrection, Heroism, Honor, Memory, Thought, Inevitable,
  Freedom, Revolution, Curse, Fate, Insanity, Nightmare, Arcane, Divine,
  Leadership, Martyr, Defense, Purity, Ancestors, Souls, Language, and Wards
  selections, plus Ferocity, Resolve, Day, Light, Exploration, Trade, Decay,
  Growth, Deception, Thievery, Blood, Tactics, Ice, Oceans, Seasons, and Storms
  (including parent-specific
  outsider variants) with inherited deity eligibility,
  mechanical class skills, and complete replacement details
- expanded bloodlines — complete: complete Core catalogue plus all ten APG
  bloodlines: Aquatic, Boreal, Deep Earth, Dreamspun, Protean, Serpentine,
  Shadow, Starsoul, Stormborn, and Verdant
- mysteries and revelations - complete: the complete APG Oracle level 1-20
  chassis, spontaneous divine casting, all six curses, cure-or-inflict choice,
  and all ten mystery identities are playable; Battle, Bones, Flame, Heavens,
  Life, Lore, Nature, Stone, Waves, and Wind include
  complete mystery spells, selectable level-gated revelations, final
  revelations, and mystery-granted class skills
- discoveries, talents and similar class option systems - complete: the Core
  and APG rage-power and rogue-talent catalogues plus all 40 normal and greater
  Advanced Class Guide Arcanist exploits are playable, including level and
  option prerequisites, repeat limits, dependent selections, distinct energy
  choices, and mutually exclusive totem families
- favoured class bonuses - complete for the universal Core rule and the APG
  ancestry-specific rewards available to supported Core ancestry/class pairs:
  rewards can be mixed by class level, fractional rewards round down, bardic
  performance integrates with daily resources, multiclass bounds use primary
  favored-class levels, and selections persist through save/load normalization

## Later milestone: Universal PF1e Builder

- [x] multiclassing: rules-engine aggregation for independent class
  levels, BAB, saves, skill ranks, character-level feat slots, and class-tagged
  features; backward-compatible save normalization for class-level arrays;
    arbitrary distinct class-level editing with combined combat statistics, hit
    points, class skills, features, feat prerequisites, class-keyed archetypes,
    feature choices for every class entry, and a guided level-up preview that
    advances the selected class entry;
  independent spellbooks and daily slot use for every spellcasting class entry,
  secondary Bard and Druid resource tracking, highest-class caster-level
  prerequisites, and save/load restoration
- [x] prestige classes: all ten Core prestige classes have exact level caps,
  BAB/save tables, requirements, skills, and complete feature progressions;
  existing-class spellcasting advancement supports single-class and
  Mystic Theurge dual-tradition targets with persistence and UI coverage
- [x] alternate racial traits: replacement-aware selection, persistence,
  derived-stat recalculation, and all 50 APG options for the seven Core
  ancestries
- [x] advanced equipment and magic items: expanded Core weapon and armour
  choices, configurable +1 through +5 weapon/armour/shield enhancement,
  rules-based market prices, attack/damage and AC integration, and common
  resistance, deflection, and natural-armour items with non-stacking bonuses
  and save/load coverage
- [x] persisted hit points and round-based temporary effects for active play
- [x] broader sourcebook coverage: deliberately scoped additions from the
  Advanced Player's Guide and Advanced Class Guide now span traits, alternate
  racial traits, ancestry-specific favoured-class rewards, archetypes,
  subdomains, bloodlines, mysteries, revelations, exploits, class chassis,
  equipment, and the generated multi-source spell catalogue
  - [x] optional ancestry-specific favoured-class rewards for supported Core
    ancestry/class combinations, including fractional benefit summaries and
    direct bardic-performance resource integration

## Next work queue

- [x] complete spell rules and source details: replace shortened spell summaries
  with the full correct rules description for all 2,069 catalogued spells, retain
  structured casting details such as school, components, range, target, duration,
  saving throw, and spell resistance, and add a visible **Rules source** link to
  each spell detail view matching the feat catalogue experience; keep the large
  descriptions out of the initial client bundle where practical and add data,
  UI, mobile-layout, and source-link regression coverage

## Active milestone: Advanced Player's Guide Classes

Add the five remaining Advanced Player's Guide base classes—Alchemist,
Cavalier, Inquisitor, Summoner, and Witch—while preserving the completed Oracle
implementation and every existing Core, multiclass, prestige-class, archetype,
equipment, feat, spell, and installable-application workflow.

### Delivery phases

1. Shared foundations: reusable class resources, formula and familiar spellbooks,
   selectable class progressions, linked companions, and multiclass persistence.
2. Alchemist: complete level 1–20 chassis, extracts and formula book, bombs,
   mutagen, poison features, discoveries, and daily resources.
3. Cavalier: complete level 1–20 chassis, challenge, mount, orders, tactician,
   teamwork feats, banner, and greater banner.
4. Inquisitor: complete level 1–20 chassis and spellcasting, domain or
   inquisition selection, judgments, bane, teamwork feats, and Solo Tactics.
5. Witch: complete level 1–20 chassis, familiar spellbook, patrons and patron
   spells, hexes, major hexes, and grand hexes.
6. Summoner: complete level 1–20 chassis and spellcasting, summon-monster
   resources, and a scalable eidolon builder with base forms and evolutions.
7. Content completion: published archetypes, ancestry-specific favoured-class
   rewards, related feats, spells, equipment, complete rules text, and source
   links for all five classes.

### Completion criteria

- [x] all five classes are selectable and mechanically playable through level 20
- [x] defining class resources and dependent choices enforce their published limits
- [x] starting-class, multiclass, level-up, save/load, export, and recovery paths work
- [x] companion, familiar, eidolon, extract, prepared, and spontaneous spell data persist
- [x] class archetypes expose sourced replacement progressions and coverage status
- [x] mobile layouts remain readable and keyboard/touch accessible
- [x] representative level-20 data, engine, UI, and browser journeys pass for every class
- [x] production build, installability, offline behavior, and deployment validation pass

## Completed milestone: Builder Expansion

Expand the completed Core and APG builder through shared mechanics first, then
add later class families without weakening existing save files or mobile paths.

1. [x] Unified companion foundation: persistent, level-scaled sheets for animal
   companions, mounts, familiars, and eidolons, including current HP and the
   published advancement statistics and abilities.
2. [x] Archetype automation: connect descriptive replacement features to shared
   companion, resource, spellcasting, feat, skill, and combat mechanics.
3. [x] Favoured-class mechanics: apply every supported alternate reward directly
   to its target statistic or class resource, including fractional thresholds.
4. [x] Formula, familiar, and prepared-source acquisition: improve learn/copy,
   known, prepared, and daily-use workflows while keeping each list distinct.
5. [x] Performance: split large option and rules catalogues by active class and
   screen, virtualise long result lists, and measure mobile interaction cost.
6. [x] Browser journeys: cover representative single-class and multiclass builds
   through level 20, save/load, offline launch, and narrow touch layouts.
7. [x] Later classes: add Magus, Gunslinger, and Samurai before the Advanced
   Class Guide and Occult Adventures class families.

### Expansion completion criteria

- [x] every supported companion and alternate favoured-class reward is mechanical
- [x] partial archetypes expose an explicit automation status and no silent effects
- [x] spell-source books distinguish acquisition, preparation, and expenditure
- [x] level-20 journeys pass on desktop and narrow mobile viewports
- [x] production bundle and interaction performance remain within recorded budgets
- [x] all later-class chassis are selectable, persistent, and playable to level 20

### Later-class families delivered

- Ultimate classes: Magus, Gunslinger, and Samurai, each with defining choices,
  class resources, sourced level 1-20 features, persistence, and browser coverage.
- Advanced Class Guide hybrid classes: Bloodrager, Brawler, Hunter,
  Investigator, Shaman, Skald, Slayer, Swashbuckler, and Warpriest.
- Occult Adventures classes: Kineticist, Medium, Mesmerist, Occultist, Psychic,
  and Spiritualist, including their core selectable systems, psychic spell
  progressions, bounded resources, capstones, and level-20 browser coverage.

The generated catalogue now contains 46 playable classes, 89 option groups,
3,447 feats, 40 traits, and 2,073 spells. The production bundle remains within
the recorded client-size budget.

## Active milestone: Later-Class Content Depth

Bring the 28 APG, Ultimate, Advanced Class Guide, and Occult Adventures classes
to the same content depth as the original Core-class experience.

1. [ ] Extend the sourced archetype importer and coverage report to every later
   base and hybrid class, retaining replacements, restrictions, source links,
   automation status, search, stacking, and persistence.
2. [x] Import and validate the published Magus, Gunslinger, and Samurai
   archetype catalogues as the first reusable batch.
3. [ ] Import and validate archetypes for the five APG and nine Advanced Class
   Guide class families.
4. [ ] Import and validate archetypes for all six Occult Adventures classes.
5. [ ] Complete defining option catalogues that are currently representative,
   including arcana, deeds, orders, wild talents, tricks, focus powers,
   amplifications, disciplines, and emotional focuses.
6. [ ] Replace derived proxy spell lists with exact sourced class spell levels
   for every later spellcasting class.
7. [ ] Add level-20 desktop and narrow-mobile journeys covering archetype
   selection, dependent choices, persistence, spell use, and class resources.
8. [ ] Regenerate coverage, enforce performance budgets, pass the complete CI
   suite, and deploy the finished milestone.

### Completion criteria

- [ ] every later base and hybrid class exposes its published archetypes
- [ ] every imported archetype has explicit mechanical coverage and no silent effects
- [ ] defining class-option catalogues are complete and prerequisite-aware
- [ ] later-class spell lists use exact sourced levels rather than proxy lists
- [ ] representative archetyped builds persist and reach level 20 on desktop and mobile
- [ ] validation, UI, browser, production, offline, and performance gates pass

All work must preserve the completed Core, Expanded Character Options,
Installable Application, Universal Builder, and Builder Expansion milestones.
