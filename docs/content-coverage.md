# Content Coverage

This document distinguishes records present in the data bundle from systems that are fully playable in the web application.

## Current generated catalogue

- 13 selectable classes
- 7 selectable core ancestries
- 427 selectable feats
- all 40 APG basic traits
- all twelve APG Fighter archetypes with complete level 1-20 feature replacements
- 2,063 spells

## Playable classes

| Class | Status | Notes |
|---|---|---|
| Arcanist | Playable | Prepared arcane casting, arcane reservoir, and all 40 normal and greater Advanced Class Guide exploits are integrated with level and exploit prerequisites. |
| Barbarian | Playable | Core progression plus the complete Core and APG rage-power catalogues are integrated, including prerequisites, repeat limits, distinct energy choices, and mutually exclusive totem families. |
| Bard | Playable | Level 1–20 Core chassis and spell list plus all nine APG archetypes, their replacement progressions, off-list bonus spells, bonded objects, familiars, and persistent performance-round tracking are integrated. |
| Cleric | Playable Core class | Level 1–20 prepared casting, channel energy, deity-compatible alignment, Core deities and domains, and domain spell slots are integrated. |
| Druid | Playable | Level 1–20 prepared casting, complete Core spell list, both Nature Bond paths, all ten APG archetypes with their domain, familiar, class-skill and delayed Wild Shape rules, and persistent Wild Shape tracking are integrated. |
| Fighter | Playable | Core progression, bonus feats and weapon groups are integrated. |
| Monk | Playable | Core progression plus all ten APG archetypes, their complete replacement progressions, granted feats, and Four Winds spirit-aspect choice are integrated. |
| Oracle | Playable APG class | Level 1-20 spontaneous divine casting, all six curses, cure-or-inflict choice, all ten mysteries, mystery spells, revelations and capstones are integrated. |
| Paladin | Playable Core class | Level 1–20 martial and divine progression, mercies, Divine Bond and the complete Core Paladin spell list are integrated. |
| Ranger | Playable Core class | Level 1–20 progression, favored enemies and terrains, combat styles, both Hunter's Bond paths and the complete Core Ranger spell list are integrated. |
| Rogue | Playable | Core progression plus the complete Core and APG rogue-talent catalogues are integrated. |
| Sorcerer | Playable Core class | Level 1–20 spontaneous casting and all ten Core bloodlines with dependent choices and persistence are integrated. |
| Wizard | Playable Core class | Level 1–20 prepared casting, Core schools, opposition preparation, Arcane Bond paths and specialist slots are integrated. |

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

The catalogue contains all 167 Core Rulebook feats, all 118 Advanced Player's Guide feats, 54 Ultimate Magic feats, and 88 Ultimate Combat feats. Structured prerequisites include abilities, base attack bonus, class and caster levels, skills, ancestry, size, features, other feats and matching choices. Ultimate Magic and Ultimate Combat expansion continues in validated feat-tree batches.

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
| Archetypes | All twelve APG Fighter, nine APG Barbarian, nine APG Bard, ten APG Druid, and ten APG Monk archetypes are playable through level 20; Totem Warrior is represented by the complete mutually exclusive totem rage-power families |

## Definition of playable

A class or system is listed as playable only when it is exposed in the web interface, processed by the rules engine, validated by the data pipeline and covered by automated tests.
