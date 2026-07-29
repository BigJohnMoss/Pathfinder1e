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
- archetypes and class paths — complete: reusable replacement schema plus all twelve APG
  Fighter paths: Archer, Crossbowman, Free Hand Fighter, Mobile Fighter,
  Phalanx Soldier, Polearm Master, Roughrider, Savage Warrior, Shielded Fighter,
  Two-Handed Fighter, Two-Weapon Warrior, and Weapon Master; APG Barbarian
  coverage is complete with Breaker, Brutal Pugilist, Drunken Brute,
  Elemental Kin, Hurler, Invulnerable Rager, Mounted Fury, Savage Barbarian,
  and Superstitious, while Totem Warrior is delivered through the complete,
  mutually exclusive totem rage-power families; APG Bard coverage is complete
  with Arcane Duelist, Archivist, Court Bard, Detective, Magician, Sandman,
  Savage Skald, Sea Singer, and Street Performer; APG Druid coverage is
  complete with Aquatic, Arctic, Blight, Cave, Desert, Jungle, Mountain,
  Plains, Swamp, and Urban Druid; APG Monk coverage is complete with Drunken
  Master, Hungry Ghost Monk, Ki Mystic, Monk of the Empty Hand, Monk of the
  Four Winds, Monk of the Healing Hand, Monk of the Lotus, Monk of the Sacred
  Mountain, Weapon Adept, and Zen Archer; APG Paladin coverage is complete with
  Divine Defender, Hospitaler, Sacred Servant, Shining Knight, Undead Scourge,
  and Warrior of the Holy Light; APG Ranger coverage is complete with Beast
  Master, Guide, Horse Lord, Infiltrator, Shapeshifter, Skirmisher, Spirit
  Ranger, and Urban Ranger, plus the Crossbow, Mounted Combat, Natural Weapon,
  Two-Handed Weapon, and Weapon and Shield combat styles; APG Rogue coverage is
  complete with Acrobat, Burglar, Cutpurse, Investigator, Poisoner, Rake,
  Scout, Sniper, Spy, Swashbuckler, Thug, and Trapsmith; APG Wizard coverage
  is complete with all sixteen focused arcane schools and the Air, Earth, Fire,
  and Water elemental schools, including specialist spell lists and forced
  opposition elements
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

## Working rule

Future work should be selected as a new, deliberately scoped milestone while
preserving the completed Core, Expanded Character Options, Installable
Application, and Universal builder systems through their validation and browser
journey suites.
