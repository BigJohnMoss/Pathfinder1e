# PF1e Data Model

## Classes

A class record stores chassis data and a list of feature occurrences. A feature occurrence describes what is gained at one exact level.

## Selectable options

A selectable class feature references an `optionGroupId`. Individual options live in separate group files. This allows the UI and engine to validate minimum levels and prerequisites without mixing options into class progression.

## Archetypes

Archetypes will use three explicit operations:

- `remove`: feature IDs or occurrence IDs removed from the base class
- `modify`: targeted changes to an existing feature
- `add`: new feature occurrences

## Formula strings

Formula fields use a constrained expression syntax such as:

- `3 + floor(classLevel / 2)`
- `classLevel + constitutionModifier`
- `1 + floor((classLevel - 1) / 2)`

The engine intentionally does not use JavaScript `eval`.
