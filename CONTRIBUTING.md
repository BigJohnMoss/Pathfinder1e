# Contributing

## Adding data

- Use stable kebab-case IDs.
- Put class progression in `packages/data/src/classes`.
- Put choices such as exploits and talents in `packages/data/src/options`.
- Do not place individual selectable options in the class feature list.
- Include a source title and URL.
- Run `npm run check` before opening a pull request.

## Feature occurrences

Store one occurrence for each level at which a feature is gained. For example, Sneak Attack has separate rows at levels 1, 3, 5, and so on. Each occurrence points to the same `progressionKey`.

## Copyright

Prefer structured facts, formulas, short summaries, and original paraphrases. Do not commit wholesale reproductions of copyrighted rulebook prose unless the material is clearly licensed for redistribution.
