# Pathfinder 1e Character Builder

A from-scratch, data-first Pathfinder First Edition character-builder project.

## Current status

The project is working toward the **Core Character Builder** milestone. The current generated catalogue includes:

- 7 selectable classes: Arcanist, Barbarian, Cleric, Fighter, Monk, Rogue, and Wizard
- 7 selectable core ancestries
- 424 selectable feats
- 1,891 spells
- structured prerequisite checks, class progression, spell preparation, skills, basic combat statistics, and local character persistence

Cleric is a complete playable Core class through level 20. Wizard has its full level 1–20 chassis, complete prepared arcane spell list, all nine Core arcane schools with powers, specialist opposition-school choices, complete Familiar or Bonded Object Arcane Bond paths, and one tracked specialist-school slot at each available spell level. Opposition-school spells still need their two-slot preparation cost enforced.

See [the roadmap](docs/roadmap.md) for the development order and [content coverage](docs/content-coverage.md) for the distinction between data present in the repository and systems currently playable in the web application.

## What is included

- Validated JSON data with permanent IDs
- Class progression for the currently supported classes
- Separate selectable option groups
- Seven core ancestries
- A substantial sourced feat and spell catalogue
- A dependency-free rules engine for progression and prerequisite checks
- Automated data validation, engine tests, UI tests, and production builds
- A minimal Next.js web application
- GitHub Actions checks for every push and pull request

## Quick start

```bash
npm install
npm run check
npm run dev
```

The web application runs at `http://localhost:3000`.

## Repository layout

```text
apps/web/                 Next.js interface
packages/data/            Canonical PF1e JSON data
packages/engine/          Character and rules calculations
packages/types/           Shared TypeScript types
schemas/                   JSON Schemas and data contracts
tools/scripts/             Validation and generated-data scripts
tests/                     Node and UI test suites
generated/                 Build outputs
```

## Data principles

1. Every record has a permanent kebab-case ID.
2. One class feature occurrence is stored for every level at which it is gained.
3. Selectable options are stored separately from the class feature granting the choice.
4. Archetypes use structured remove/modify/add operations.
5. Source title and URL are retained on every rules record.
6. Full copied rules text should only be added when licensing permits it. The project uses concise summaries and structured mechanics.
7. A record existing in data does not automatically mean the corresponding class or system is playable; supported content is tracked separately.

See [docs/data-model.md](docs/data-model.md), [docs/roadmap.md](docs/roadmap.md), [docs/content-coverage.md](docs/content-coverage.md), and [CONTRIBUTING.md](CONTRIBUTING.md).
