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

- traits — in progress: all 40 sourced APG basic traits, trait-specific class-skill
  and spell choices, conditional spell modifiers, selection rules, mechanical
  bonuses, persistence, and browser coverage delivered
- archetypes — in progress: reusable replacement schema and complete APG Fighter Archer
- subdomains - in progress: APG schema plus Cloud, Wind, Caves, and Metal
  selections with inherited deity eligibility and complete replacement details
- expanded bloodlines
- mysteries and revelations
- discoveries, talents and similar class option systems
- favoured class bonuses - in progress: base +1 hit point or +1 skill rank
  allocation is mechanical, level-bounded, persistent, and covered in the UI

## Later milestone: Universal PF1e Builder

- multiclassing
- prestige classes
- alternate racial traits
- advanced equipment and magic items
- [x] persisted hit points and round-based temporary effects for active play
- broader sourcebook coverage

## Working rule

Future work should proceed through Expanded Character Options, beginning with
traits, while preserving the completed Core and Installable Application
milestones through their validation and browser journey suites.
