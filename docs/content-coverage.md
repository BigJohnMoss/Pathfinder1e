# Content Coverage

This document distinguishes records present in the data bundle from systems that are fully playable in the web application.

## Current generated catalogue

- 6 selectable classes
- 7 selectable core ancestries
- 424 selectable feats
- 1,891 spells

## Playable classes

| Class | Status | Notes |
|---|---|---|
| Arcanist | Playable | Prepared arcane casting, arcane reservoir and exploits are integrated. |
| Barbarian | Playable | Core progression and rage powers are integrated. |
| Cleric | Playable chassis | Level 1–20 progression, divine prepared casting, orisons, spontaneous conversion and channel-energy feature support are integrated. Domains and deity selection remain. |
| Fighter | Playable | Core progression, bonus feats and weapon groups are integrated. |
| Monk | Playable | Core progression and relevant feat prerequisites are integrated. |
| Rogue | Playable | Core progression and rogue talents are integrated. |

## Core classes still required

| Class | Priority | Major systems required |
|---|---:|---|
| Cleric completion | 1 | domains, domain spell slots, domain powers and deity selection |
| Wizard | 2 | spellbook, arcane schools, bonded object or familiar |
| Sorcerer | 3 | spontaneous casting, bloodlines and bloodline powers |
| Paladin | 4 | smite evil, lay on hands, mercies and divine bond |
| Ranger | 5 | favored enemy, combat styles, favored terrain and limited casting |
| Bard | 6 | bardic performance, spontaneous casting and versatile performance |
| Druid | 7 | nature bond, wild shape, animal companion or domain and divine casting |

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
| Domains | Not playable |
| Bloodlines | Not playable |
| Mysteries | Not playable |
| Browser end-to-end tests | Not implemented |

## Definition of playable

A class or system is listed as playable only when it is exposed in the web interface, processed by the rules engine, validated by the data pipeline and covered by automated tests. A record merely existing in JSON does not make the corresponding system playable.
