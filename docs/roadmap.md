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
- archetypes and class paths — catalogue complete for all 624 published entries across
  the 13 supported classes: 623 selectors plus Totem Warrior's rage-power representation,
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

- [ ] complete spell rules and source details: replace shortened spell summaries
  with the full correct rules description for all 2,069 catalogued spells, retain
  structured casting details such as school, components, range, target, duration,
  saving throw, and spell resistance, and add a visible **Rules source** link to
  each spell detail view matching the feat catalogue experience; keep the large
  descriptions out of the initial client bundle where practical and add data,
  UI, mobile-layout, and source-link regression coverage

## Working rule

Future work should be selected as a new, deliberately scoped milestone while
preserving the completed Core, Expanded Character Options, Installable
Application, and Universal builder systems through their validation and browser
journey suites.
