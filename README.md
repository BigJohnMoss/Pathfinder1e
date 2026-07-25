# Pathfinder 1e Character Builder

## Install the application

The production character builder can be installed as an application after it
has been opened once over HTTPS.

- **Desktop Chrome or Edge:** open the builder, select **Install app** in the
  banner, and confirm. The builder then appears in the Start menu or application
  launcher and can create a desktop shortcut.
- **Android Chrome:** open the builder, select **Install app**, and confirm. The
  builder appears on the home screen and in the app drawer.

The installed builder opens in its own window. After the first successful load,
its application shell is cached for offline use. Character drafts continue to
use the browser's local storage, so clearing site data will remove local drafts;
export important characters before clearing browser data.

A from-scratch, data-first Pathfinder First Edition character-builder project.

## Current status

The project is working toward the **Core Character Builder** milestone. The current generated catalogue includes:

- 11 selectable classes: Arcanist, Barbarian, Bard, Cleric, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, and Wizard
- 7 selectable core ancestries
- 424 selectable feats
- 1,957 spells
- structured prerequisite checks, class progression, prepared and spontaneous spellcasting, skills, basic combat statistics, and local character persistence

Cleric, Paladin, Ranger, Sorcerer, and Wizard are complete playable Core classes through level 20. Ranger includes its complete Core spell list, favored enemies and terrains, combat styles, and both Hunter's Bond paths. Sorcerer includes its full spontaneous-casting progression, complete shared spell list, spells known, all ten Core bloodlines, each bloodline's class skill, arcana, five powers, nine automatic bonus spells, bonus-feat list, and persistent dependent choices.

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
