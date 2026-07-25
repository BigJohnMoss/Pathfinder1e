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

All eleven Core classes are playable through level 20. Druid includes its complete Core spell list, both Nature Bond paths with dependent companion or domain choices, and persistent Wild Shape use tracking.

### 2. Equipment and combat loadout

Weapons, armour, shields, inventory, currency, carrying capacity, encumbrance, damage, critical and range statistics are integrated and persistent.

### 3. Character progression workflow

The explicit level-up preview preserves prior selections and explains newly available class features, ability increases, feats and skill ranks before advancing.

### 4. Strong generated types

The generated bundle and web components consume shared TypeScript contracts for classes, ancestries, feats, spells, class features and option groups.

### 5. End-to-end coverage

Playwright covers representative martial, prepared-caster and spontaneous-caster builds, prerequisite boundaries, persistence and equipment. Chromium journeys run in CI after the production build.

## Next milestone: Expanded Character Options

- traits
- archetypes
- subdomains
- expanded bloodlines
- mysteries and revelations
- discoveries, talents and similar class option systems
- favoured class bonuses

## Later milestone: Universal PF1e Builder

- multiclassing
- prestige classes
- alternate racial traits
- advanced equipment and magic items
- conditional modifiers and temporary effects
- broader sourcebook coverage

## Working rule

Future work should begin with Expanded Character Options while preserving the completed Core milestone through its validation and browser journey suites.
