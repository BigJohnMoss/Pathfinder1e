# Content Coverage

This document distinguishes records present in the data bundle from systems that are fully playable in the web application.

## Current generated catalogue

- 8 selectable classes
- 7 selectable core ancestries
- 424 selectable feats
- 1,896 spells

## Playable classes

| Class | Status | Notes |
|---|---|---|
| Arcanist | Playable | Prepared arcane casting, arcane reservoir and exploits are integrated. |
| Barbarian | Playable | Core progression and rage powers are integrated. |
| Cleric | Playable Core class | Level 1–20 divine prepared casting, orisons, spontaneous conversion, channel energy with daily tracking, deity-compatible alignment, channel polarity, 20 Core deity choices, all 33 Core domains, and dedicated domain spell preparation are integrated. |
| Fighter | Playable | Core progression, bonus feats and weapon groups are integrated. |
| Monk | Playable | Core progression and relevant feat prerequisites are integrated. |
| Rogue | Playable | Core progression and rogue talents are integrated. |
| Sorcerer | Playable chassis | Level 1–20 spontaneous Charisma casting, complete shared Sorcerer/Wizard spell coverage, fixed spells-known progression, reusable daily slots, spell exchange milestones, Eschew Materials, ten Core bloodline identities, bloodline progression milestones, and persistence are integrated. Aberrant, Abyssal, Arcane, and Celestial include complete class skills, arcana, powers, bonus spells and bonus-feat lists; six Core bloodlines still need detailed mechanics. |
| Wizard | Playable Core class | Level 1–20 progression, complete Wizard spell coverage with school metadata, cantrips, spellbook progression, Scribe Scroll, bonus feats, all nine Core schools, two opposition-school choices with enforced two-slot preparation costs, Familiar and Bonded Object paths, and one prepared specialist-school slot at each available spell level are integrated. |

## Core classes still required

| Class | Priority | Major systems required |
|---|---:|---|
| Sorcerer completion | 1 | detailed mechanics for the remaining six Core bloodlines |
| Paladin | 2 | smite evil, lay on hands, mercies and divine bond |
| Ranger | 3 | favored enemy, combat styles, favored terrain and limited casting |
| Bard | 4 | bardic performance, spontaneous casting and versatile performance |
| Druid | 5 | nature bond, wild shape, animal companion or domain and divine casting |

## Selectable ancestries

- Human
- Dwarf
- Elf
- Gnome
- Half-elf
- Halfling
- Half-orc

## Feat coverage

The catalogue includes substantial content from:

- Core Rulebook
- Advanced Player's Guide
- Ultimate Magic
- Ultimate Combat

Feat records may reference class features belonging to classes that are not yet playable. These records remain useful data, but they will not normally become eligible until the relevant class implementation exists.

## Current product systems

| System | Status |
|---|---|
| Ability scores | Playable |
| Class and ancestry selection | Playable for supported records |
| Level progression | Playable for supported classes |
| Skills and rank budget | Playable |
| Feat eligibility and choices | Playable |
| Class option groups | Playable for supported classes |
| Prepared and spontaneous spellcasting | Playable for supported spellcasters |
| Basic combat statistics | Playable |
| Local save, load and export | Basic support |
| Equipment and inventory | Not implemented |
| Multiclassing | Not implemented |
| Archetypes | Data model planned; not playable |
| Traits | Not playable |
| Domains | All 33 Core Cleric domains are deity-restricted, display granted powers and complete spell lists, and support dedicated domain spell preparation and usage |
| Alignment | Cleric alignment is restricted to one step from the selected deity |
| Channel energy | Polarity, dice, save DC, daily uses, spending, refresh and persistence are integrated |
| Arcane schools | All nine Core Wizard schools and their powers are selectable; specialists choose two opposition schools, pay two normal preparation slots for opposition spells, and gain one school-only prepared slot at every spell level |
| Arcane bond | Familiar and bonded-item paths, 11 Core familiar choices, five item categories, shared progression rules, dependency clearing, and persistence are integrated |
| Bloodlines | Ten Core Sorcerer identities are selectable. Aberrant, Abyssal, Arcane, and Celestial have complete class skills, arcana, five powers, nine automatic bonus spells and bonus-feat lists; six detailed bloodlines remain |
| Mysteries | Not playable |
| Browser end-to-end tests | Not implemented |

## Definition of playable

A class or system is listed as playable only when it is exposed in the web interface, processed by the rules engine, validated by the data pipeline and covered by automated tests. A record merely existing in JSON does not make the corresponding system playable.
