# Pathfinder 1e Character Builder

A from-scratch, data-first Pathfinder First Edition character-builder project.

## What is included

- Validated JSON data with permanent IDs
- Class progression for Arcanist, Barbarian, Fighter, and Rogue
- Separate selectable option groups
- Human ancestry, starter feats, and starter spells
- A dependency-free rules engine for class progression and prerequisite checks
- Automated data validation and tests
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
tests/                     Node test suite
generated/                 Build outputs
```

## Data principles

1. Every record has a permanent kebab-case ID.
2. One class feature occurrence is stored for every level at which it is gained.
3. Selectable options are stored separately from the class feature granting the choice.
4. Archetypes use structured remove/modify/add operations.
5. Source title and URL are retained on every rules record.
6. Full copied rules text should only be added when licensing permits it. The starter data uses concise summaries and structured mechanics.

See [docs/data-model.md](docs/data-model.md) and [CONTRIBUTING.md](CONTRIBUTING.md).
