# Content Coverage

This document distinguishes records present in the data bundle from systems that are fully playable in the web application.

## Current generated catalogue

- 13 selectable classes
- 7 selectable core ancestries
- 3,447 selectable feats
- all 40 APG basic traits
- 623 selectable archetype records covering all 624 published entries for the 13 supported classes; Totem Warrior is represented by the rage-power system because it replaces no class feature
- 2,063 spells

## Playable classes

| Class | Status | Notes |
|---|---|---|
| Arcanist | Playable | Core chassis, exploits, and all 15 published archetypes are selectable with sourced replacement progressions and persistence. |
| Barbarian | Playable | Core chassis, rage powers, and 41 replacement archetypes are selectable. Totem Warrior is represented by the complete mutually exclusive totem rage-power families. |
| Bard | Playable | Core chassis, spellcasting, performance tracking, and all 73 published archetypes are selectable with sourced replacement progressions. |
| Cleric | Playable | Core chassis, domains, spellcasting, and all 35 published archetypes are selectable; nested domain-power replacements are applied to the chosen domains. |
| Druid | Playable | Core chassis, Nature Bond paths, spellcasting, Wild Shape tracking, and all 75 published archetypes are selectable with sourced replacement progressions. |
| Fighter | Playable | Core chassis, bonus feats, weapon groups, and all 67 published archetypes are selectable with sourced replacement progressions. |
| Monk | Playable | Core chassis and all 56 published archetypes are selectable with sourced replacement progressions. |
| Oracle | Playable | Core chassis, mysteries, revelations, spellcasting, and all 26 published archetypes are selectable with sourced replacement progressions. |
| Paladin | Playable | Core chassis, mercies, Divine Bond, spellcasting, and all 47 published archetypes are selectable with sourced replacement progressions. |
| Ranger | Playable | Core chassis, favored enemies and terrains, combat styles, Hunter's Bond, spellcasting, and all 62 published archetypes are selectable with sourced replacement progressions. |
| Rogue | Playable | Core chassis, rogue talents, and all 78 published archetypes are selectable with sourced replacement progressions. |
| Sorcerer | Playable | Core chassis, bloodlines, spellcasting, and all 13 published archetypes are selectable with sourced replacement progressions. |
| Wizard | Playable | Core chassis, schools, opposition schools, Arcane Bond, spellcasting, and all 35 published archetypes are selectable; nested school-power replacements are applied to the chosen school. |

All eleven Core Rulebook classes are playable. Arcanist and Oracle are the additional selectable classes.

## Selectable ancestries

- Human
- Dwarf
- Elf
- Gnome
- Half-elf
- Halfling
- Half-orc

## Feat coverage

The catalogue contains 3,447 selectable records and covers every one of the 3,442 distinct feat names in the Archives of Nethys all-source catalogue. The five additional records preserve legacy names or source-qualified variants already used by saved characters. Structured prerequisites include abilities, base attack bonus, class and caster levels, spell access, skills, ancestry, size, features, other feats and matching choices. Requirements that depend on rules the builder cannot yet evaluate remain visibly locked as manual requirements instead of being treated as satisfied. The independent all-source inventory reports zero missing feats.

## Current product systems

| System | Status |
|---|---|
| Ability scores and point buy | Playable |
| Class and ancestry selection | Playable |
| Guided level progression | Playable |
| Skills and rank budget | Playable |
| Feat eligibility and choices | Playable |
| Class option groups | Playable for supported classes |
| Prepared and spontaneous spellcasting | Playable for supported spellcasters |
| Combat statistics | Playable |
| Save, load, import, export and print | Playable |
| Equipment and inventory | Playable with persistent currency, carrying capacity, encumbrance, armour, shields, weapons, damage, critical and range statistics |
| Domains | All 33 Core Cleric domains are deity-restricted and support powers, spell lists and domain-slot usage |
| Alignment and channel energy | Cleric restrictions, polarity, dice, DC, daily uses, refresh and persistence are integrated |
| Arcane schools and bond | Core schools, opposition costs, specialist slots, familiar and bonded-item paths are integrated |
| Bloodlines | All ten Core and all ten APG Sorcerer bloodlines and their dependent choices are integrated |
| Oracle mysteries | All ten APG mysteries include granted skills, mystery spells, level-gated revelations and capstones |
| Browser end-to-end tests | Martial, prepared-caster, spontaneous-caster, prerequisite, persistence and equipment journeys run in Chromium CI |
| Multiclassing | Complete: arbitrary distinct class entries combine progression, class-specific archetypes and choices, independent spellbooks and resources, feat prerequisites, level-up previews, and save/load restoration |
| Alternate racial traits | All 50 APG options for the seven Core ancestries are selectable with replacement conflicts, derived-stat recalculation, and persistence |
| Traits | All 40 APG basic traits are playable with category restrictions, skill choices and class-aware spell choices |
| Archetypes | All 624 published archetype entries for the 13 supported classes are covered by 623 selectors plus the Totem Warrior rage-power representation. Each selector includes sourced rules text, replacement progression, level gates, nested domain/school-power filtering, and saved-character persistence. Bespoke effects that require a dedicated subsystem remain descriptive until that subsystem exists. |

## Definition of playable

A class or system is listed as playable only when it is exposed in the web interface, processed by the rules engine, validated by the data pipeline and covered by automated tests.
