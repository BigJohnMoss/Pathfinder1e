# Pathfinder 1e Character Builder Roadmap

## Current milestone: Core Character Builder

The immediate goal is to turn the existing data and rules foundation into a complete Core Rulebook character-building experience.

### Milestone completion criteria

- All 11 Core Rulebook classes are playable through level 20.
- The seven core ancestries remain fully selectable.
- Core feats and spells are available through the generated catalogue.
- Class features, skills, feat prerequisites, spellcasting and character progression are enforced by the rules engine.
- Weapons, armour, shields, inventory, currency and carrying capacity are supported.
- Characters can be saved, loaded, exported and printed.
- End-to-end tests cover representative martial, prepared-caster and spontaneous-caster character journeys.
- Data validation, engine tests, UI tests and the production build pass in CI.

## Development priorities

### 1. Core classes

Cleric and Wizard are complete. Sorcerer's level 1–20 spontaneous-casting chassis and ten Core bloodline identities are integrated. Aberrant and Abyssal have complete detailed mechanics, leaving eight Core bloodlines. Continue the remaining class systems in this order:

1. Remaining Sorcerer Core bloodline details
2. Paladin
3. Ranger
4. Bard
5. Druid

Each class is considered playable when its level progression, class features, class skills, spellcasting or combat progression, selectable options and relevant prerequisite feature IDs are integrated and tested.

### 2. Equipment and combat loadout

Add structured records and UI support for weapons, armour, shields, inventory, currency, carrying capacity, encumbrance, damage, critical and range statistics.

### 3. Character progression workflow

Add an explicit level-up flow that preserves prior selections, grants new choices at the correct level and explains newly available class features, feats, skill ranks and spell options.

### 4. Strong generated types

Replace broad generated-data casts with schema-derived or shared TypeScript contracts for classes, ancestries, feats, spells, class features and option groups.

### 5. End-to-end coverage

Add browser-level tests for representative martial, prepared-caster and spontaneous-caster builds, prerequisite boundaries, persistence and equipment.

## Later milestones

### Expanded Character Options

- traits
- archetypes
- subdomains
- expanded bloodlines
- mysteries and revelations
- discoveries, talents and similar class option systems
- favoured class bonuses

### Universal PF1e Builder

- multiclassing
- prestige classes
- alternate racial traits
- advanced equipment and magic items
- conditional modifiers and temporary effects
- broader sourcebook coverage

## Working rule

Until the Core Character Builder milestone is substantially complete, development should prioritise playable class and equipment systems over additional feat-only imports. New feats may still be added when required to complete or test a class implementation.
