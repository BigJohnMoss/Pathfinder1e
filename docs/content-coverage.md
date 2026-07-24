# Content Coverage

This document distinguishes records present in the data bundle from systems that are fully playable in the web application.

## Current generated catalogue

- 7 selectable classes
- 7 selectable core ancestries
- 424 selectable feats
- 1,891 spells

## Playable classes

| Class | Status | Notes |
|---|---|---|
| Arcanist | Playable | Prepared arcane casting, arcane reservoir and exploits are integrated. |
| Barbarian | Playable | Core progression and rage powers are integrated. |
| Cleric | Playable Core class | Level 1–20 divine prepared casting, orisons, spontaneous conversion, channel energy with daily tracking, deity-compatible alignment, channel polarity, 20 Core deity choices, all 33 Core domains, and dedicated domain spell preparation are integrated. |
| Fighter | Playable | Core progression, bonus feats and weapon groups are integrated. |
| Monk | Playable | Core progression and relevant feat prerequisites are integrated. |
| Rogue | Playable | Core progression and rogue talents are integrated. |
| Wizard | Playable chassis | Level 1–20 progression, the complete prepared Wizard spell list, cantrips, spellbook progression, Scribe Scroll, bonus-feat levels, all nine Core schools, opposition-school choices, familiar progression with 11 choices, and five bonded-item categories are integrated. Specialist school spell slots remain. |

## Core classes still required

| Class | Priority | Major systems required |
|---|---:|---|
| Wizard completion | 1 | reliable spell-school metadata and specialist school spell slots |
| Sorcerer | 2 | spontaneous casting, bloodlines and bloodline powers |
| Paladin | 3 | smite evil, lay on hands, mercies and divine bond |
| Ranger | 4 | favored enemy, combat styles, favored terrain and limited casting |
| Bard | 5 | bardic performance, spontaneous casting and versatile performance |
| Druid | 6 | nature bond, wild shape, animal companion or domain and divine casting |

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
| Spell preparation and slots | Playable for supported spellcasters |
| Basic combat statistics | Playable |
| Local save, load and export | Basic support |
| Equipment and inventory | Not implemented |
| Multiclassing | Not implemented |
| Archetypes | Data model planned; not playable |
| Traits | Not playable |
| Domains | All 33 Core Cleric domains are deity-restricted, display granted powers and complete spell lists, and support dedicated domain spell preparation and usage |
| Alignment | Cleric alignment is restricted to one step from the selected deity |
| Channel energy | Polarity, dice, save DC, daily uses, spending, refresh and persistence are integrated |
| Arcane schools | All nine Core Wizard schools and their powers are selectable; specialists choose two distinct legal opposition schools; school spell slots remain |
| Arcane bond | Familiar and bonded-item paths, 11 Core familiar choices, five item categories, shared progression rules, dependency clearing, and persistence are integrated |
| Bloodlines | Not playable |
| Mysteries | Not playable |
| Browser end-to-end tests | Not implemented |

## Definition of playable

A class or system is listed as playable only when it is exposed in the web interface, processed by the rules engine, validated by the data pipeline and covered by automated tests. A record merely existing in JSON does not make the corresponding system playable.
