# Content Coverage

This document distinguishes records present in the data bundle from systems that are fully playable in the web application.

## Current generated catalogue

- 12 selectable classes
- 7 selectable core ancestries
- 424 selectable feats
- all 40 APG basic traits
- 2,048 spells

## Playable classes

| Class | Status | Notes |
|---|---|---|
| Arcanist | Playable | Prepared arcane casting, arcane reservoir and exploits are integrated. |
| Barbarian | Playable | Core progression and rage powers are integrated. |
| Bard | Playable Core class | Level 1–20 chassis, complete Core spell list, performance milestones, Versatile Performance choices and persistent performance-round tracking are integrated. |
| Cleric | Playable Core class | Level 1–20 prepared casting, channel energy, deity-compatible alignment, Core deities and domains, and domain spell slots are integrated. |
| Druid | Playable Core class | Level 1–20 prepared casting, complete Core spell list, both Nature Bond paths with dependent choices, and persistent Wild Shape tracking are integrated. |
| Fighter | Playable | Core progression, bonus feats and weapon groups are integrated. |
| Monk | Playable | Core progression and relevant feat prerequisites are integrated. |
| Paladin | Playable Core class | Level 1–20 martial and divine progression, mercies, Divine Bond and the complete Core Paladin spell list are integrated. |
| Ranger | Playable Core class | Level 1–20 progression, favored enemies and terrains, combat styles, both Hunter's Bond paths and the complete Core Ranger spell list are integrated. |
| Rogue | Playable | Core progression and rogue talents are integrated. |
| Sorcerer | Playable Core class | Level 1–20 spontaneous casting and all ten Core bloodlines with dependent choices and persistence are integrated. |
| Wizard | Playable Core class | Level 1–20 prepared casting, Core schools, opposition preparation, Arcane Bond paths and specialist slots are integrated. |

All eleven Core Rulebook classes are playable. Arcanist is the additional selectable class.

## Selectable ancestries

- Human
- Dwarf
- Elf
- Gnome
- Half-elf
- Halfling
- Half-orc

## Feat coverage

The catalogue contains sourced feats from the Core Rulebook, Advanced Player's Guide, Ultimate Magic and Ultimate Combat. Structured prerequisites include abilities, base attack bonus, class and caster levels, skills, ancestry, size, features, other feats and matching choices.

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
| Bloodlines | All ten Core Sorcerer bloodlines and their dependent choices are integrated |
| Browser end-to-end tests | Martial, prepared-caster, spontaneous-caster, prerequisite, persistence and equipment journeys run in Chromium CI |
| Multiclassing | Planned |
| Traits | Playable basic subset with category restrictions, skill choices and class-aware spell choices |
| Archetypes | Planned |

## Definition of playable

A class or system is listed as playable only when it is exposed in the web interface, processed by the rules engine, validated by the data pipeline and covered by automated tests.
