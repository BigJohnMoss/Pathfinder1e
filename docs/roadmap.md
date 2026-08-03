# Pathfinder 1e Character Builder Roadmap

## Completed milestone: Core Character Builder

The Core Rulebook character-building experience is implemented and protected by automated validation.

### Milestone completion criteria

- All 11 Core Rulebook classes are playable through level 20.
- The seven core ancestries remain fully selectable.
- Core feats and spells are available through the generated catalogue.
- Class features, skills, feat prerequisites, spellcasting and character progression are enforced by the rules engine.
- Weapons, armour, shields, inventory, currency and carrying capacity are supported.
- Characters can be saved, loaded, exported and printed.
- End-to-end tests cover representative martial, prepared-caster and spontaneous-caster character journeys.
- Data validation, engine tests, UI tests, browser tests and the production build run in CI.

## Completed development priorities

### 1. Core classes

All eleven Core classes are playable through level 20. Barbarian includes its
complete Damage Reduction progression. Druid includes its complete Core spell
list, both Nature Bond paths with dependent companion or domain choices, and
persistent Wild Shape use tracking.

### 2. Equipment and combat loadout

Weapons, armour, shields, inventory, currency, carrying capacity, encumbrance, damage, critical and range statistics are integrated and persistent.

### 3. Character progression workflow

The explicit level-up preview preserves prior selections and explains newly available class features, ability increases, feats and skill ranks before advancing.

### 4. Strong generated types

The generated bundle and web components consume shared TypeScript contracts for classes, ancestries, feats, spells, class features and option groups.

### 5. End-to-end coverage

Playwright covers representative martial, prepared-caster and spontaneous-caster builds, prerequisite boundaries, persistence and equipment. Chromium journeys run in CI after the production build.

### 6. Accessibility and CI hardening

Character sections expose standard tab semantics with arrow, Home, and End keyboard navigation, a skip link reaches the builder directly, and focus indicators remain visible across controls. Pull requests run one cancellable validation workflow, while pushes to `main` retain the full protection suite.

## Completed milestone: Installable Application

Deliver the existing web builder as an installable Progressive Web App (PWA) so it can be launched from a desktop application icon or a phone or tablet home-screen icon without requiring a separate native codebase.

### Completion criteria delivered

- A standards-compliant web app manifest defines the app name, short name, start URL, standalone display mode, theme and background colours, and orientation behaviour.
- Branded application icons include the required desktop and mobile sizes plus a maskable icon.
- Supported desktop browsers can install the builder and launch it in a standalone application window.
- Android users can install it from the browser and launch it from the home screen or app drawer.
- The application shell and essential generated character data remain available offline after the first successful load.
- Existing local character drafts persist across normal application updates, with versioned migrations when storage formats change.
- An update prompt or safe refresh flow prevents service-worker updates from losing unsaved work.
- Responsive layouts account for mobile safe areas, touch targets and small screens.
- Automated tests verify the manifest, service worker and offline fallback, standalone launch metadata, persistence, and representative mobile and desktop viewports.
- Installation instructions are documented in the README.

### Delivery approach

1. Add manifest metadata and production-quality icons.
2. Add service-worker caching with explicit versioning and an offline fallback.
3. Add installation guidance and safe update UX.
4. Validate desktop and Android installation behaviour.
5. Add CI checks for PWA installability and offline operation.

Native store packages for Microsoft Store or Google Play are optional later work. Use a desktop or mobile wrapper only if store distribution or operating-system-specific integration becomes necessary.

## Next milestone: Expanded Character Options

- traits — complete: all 40 sourced APG basic traits, trait-specific class-skill
  and spell choices, conditional spell modifiers, selection rules, mechanical
  bonuses, persistence, and browser coverage delivered
- archetypes and class paths — catalogue complete for all 826 published entries across
  the 18 supported classes: 825 selectors plus Totem Warrior's rage-power representation,
  with sourced rules text, reusable replacement progressions, persistence, and
  nested domain/school-power filtering. The selector is searchable, compatible
  archetypes can stack, conflicting replacements and ancestry restrictions are
  enforced, and every entry has an explicit mechanical-coverage status. Bespoke
  effects without an existing builder subsystem remain descriptive.
- subdomains - complete: all 66 unique APG subdomains, including Cloud, Wind, Caves, Metal, Feather,
  Fur, Construct, Toil, Protean, Love, Lust, Family, Home, Loss, Night, Murder,
  Undead, Catastrophe, Rage, Daemon, Demon, Devil, Ash, Smoke, Agathion, Archon,
  Azata, Restoration, Resurrection, Heroism, Honor, Memory, Thought, Inevitable,
  Freedom, Revolution, Curse, Fate, Insanity, Nightmare, Arcane, Divine,
  Leadership, Martyr, Defense, Purity, Ancestors, Souls, Language, and Wards
  selections, plus Ferocity, Resolve, Day, Light, Exploration, Trade, Decay,
  Growth, Deception, Thievery, Blood, Tactics, Ice, Oceans, Seasons, and Storms
  (including parent-specific
  outsider variants) with inherited deity eligibility,
  mechanical class skills, and complete replacement details
- expanded bloodlines — complete: complete Core catalogue plus all ten APG
  bloodlines: Aquatic, Boreal, Deep Earth, Dreamspun, Protean, Serpentine,
  Shadow, Starsoul, Stormborn, and Verdant
- mysteries and revelations - complete: the complete APG Oracle level 1-20
  chassis, spontaneous divine casting, all six curses, cure-or-inflict choice,
  and all ten mystery identities are playable; Battle, Bones, Flame, Heavens,
  Life, Lore, Nature, Stone, Waves, and Wind include
  complete mystery spells, selectable level-gated revelations, final
  revelations, and mystery-granted class skills
- discoveries, talents and similar class option systems - complete: the Core
  and APG rage-power and rogue-talent catalogues plus all 40 normal and greater
  Advanced Class Guide Arcanist exploits are playable, including level and
  option prerequisites, repeat limits, dependent selections, distinct energy
  choices, and mutually exclusive totem families
- favoured class bonuses - complete for the universal Core rule and the APG
  ancestry-specific rewards available to supported Core ancestry/class pairs:
  rewards can be mixed by class level, fractional rewards round down, bardic
  performance integrates with daily resources, multiclass bounds use primary
  favored-class levels, and selections persist through save/load normalization

## Later milestone: Universal PF1e Builder

- [x] multiclassing: rules-engine aggregation for independent class
  levels, BAB, saves, skill ranks, character-level feat slots, and class-tagged
  features; backward-compatible save normalization for class-level arrays;
    arbitrary distinct class-level editing with combined combat statistics, hit
    points, class skills, features, feat prerequisites, class-keyed archetypes,
    feature choices for every class entry, and a guided level-up preview that
    advances the selected class entry;
  independent spellbooks and daily slot use for every spellcasting class entry,
  secondary Bard and Druid resource tracking, highest-class caster-level
  prerequisites, and save/load restoration
- [x] prestige classes: all ten Core prestige classes have exact level caps,
  BAB/save tables, requirements, skills, and complete feature progressions;
  existing-class spellcasting advancement supports single-class and
  Mystic Theurge dual-tradition targets with persistence and UI coverage
- [x] alternate racial traits: replacement-aware selection, persistence,
  derived-stat recalculation, and all 50 APG options for the seven Core
  ancestries
- [x] advanced equipment and magic items: expanded Core weapon and armour
  choices, configurable +1 through +5 weapon/armour/shield enhancement,
  rules-based market prices, attack/damage and AC integration, and common
  resistance, deflection, and natural-armour items with non-stacking bonuses
  and save/load coverage
- [x] persisted hit points and round-based temporary effects for active play
- [x] broader sourcebook coverage: deliberately scoped additions from the
  Advanced Player's Guide and Advanced Class Guide now span traits, alternate
  racial traits, ancestry-specific favoured-class rewards, archetypes,
  subdomains, bloodlines, mysteries, revelations, exploits, class chassis,
  equipment, and the generated multi-source spell catalogue
  - [x] optional ancestry-specific favoured-class rewards for supported Core
    ancestry/class combinations, including fractional benefit summaries and
    direct bardic-performance resource integration

## Next work queue

- [x] complete spell rules and source details: replace shortened spell summaries
  with the full correct rules description for all 2,069 catalogued spells, retain
  structured casting details such as school, components, range, target, duration,
  saving throw, and spell resistance, and add a visible **Rules source** link to
  each spell detail view matching the feat catalogue experience; keep the large
  descriptions out of the initial client bundle where practical and add data,
  UI, mobile-layout, and source-link regression coverage

## Active milestone: Advanced Player's Guide Classes

Add the five remaining Advanced Player's Guide base classes—Alchemist,
Cavalier, Inquisitor, Summoner, and Witch—while preserving the completed Oracle
implementation and every existing Core, multiclass, prestige-class, archetype,
equipment, feat, spell, and installable-application workflow.

### Delivery phases

1. Shared foundations: reusable class resources, formula and familiar spellbooks,
   selectable class progressions, linked companions, and multiclass persistence.
2. Alchemist: complete level 1–20 chassis, extracts and formula book, bombs,
   mutagen, poison features, discoveries, and daily resources.
3. Cavalier: complete level 1–20 chassis, challenge, mount, orders, tactician,
   teamwork feats, banner, and greater banner.
4. Inquisitor: complete level 1–20 chassis and spellcasting, domain or
   inquisition selection, judgments, bane, teamwork feats, and Solo Tactics.
5. Witch: complete level 1–20 chassis, familiar spellbook, patrons and patron
   spells, hexes, major hexes, and grand hexes.
6. Summoner: complete level 1–20 chassis and spellcasting, summon-monster
   resources, and a scalable eidolon builder with base forms and evolutions.
7. Content completion: published archetypes, ancestry-specific favoured-class
   rewards, related feats, spells, equipment, complete rules text, and source
   links for all five classes.

### Completion criteria

- [x] all five classes are selectable and mechanically playable through level 20
- [x] defining class resources and dependent choices enforce their published limits
- [x] starting-class, multiclass, level-up, save/load, export, and recovery paths work
- [x] companion, familiar, eidolon, extract, prepared, and spontaneous spell data persist
- [x] class archetypes expose sourced replacement progressions and coverage status
- [x] mobile layouts remain readable and keyboard/touch accessible
- [x] representative level-20 data, engine, UI, and browser journeys pass for every class
- [x] production build, installability, offline behavior, and deployment validation pass

## Completed milestone: Builder Expansion

Expand the completed Core and APG builder through shared mechanics first, then
add later class families without weakening existing save files or mobile paths.

1. [x] Unified companion foundation: persistent, level-scaled sheets for animal
   companions, mounts, familiars, and eidolons, including current HP and the
   published advancement statistics and abilities.
2. [x] Archetype automation: connect descriptive replacement features to shared
   companion, resource, spellcasting, feat, skill, and combat mechanics.
3. [x] Favoured-class mechanics: apply every supported alternate reward directly
   to its target statistic or class resource, including fractional thresholds.
4. [x] Formula, familiar, and prepared-source acquisition: improve learn/copy,
   known, prepared, and daily-use workflows while keeping each list distinct.
5. [x] Performance: split large option and rules catalogues by active class and
   screen, virtualise long result lists, and measure mobile interaction cost.
6. [x] Browser journeys: cover representative single-class and multiclass builds
   through level 20, save/load, offline launch, and narrow touch layouts.
7. [x] Later classes: add Magus, Gunslinger, and Samurai before the Advanced
   Class Guide and Occult Adventures class families.

### Expansion completion criteria

- [x] every supported companion and alternate favoured-class reward is mechanical
- [x] partial archetypes expose an explicit automation status and no silent effects
- [x] spell-source books distinguish acquisition, preparation, and expenditure
- [x] level-20 journeys pass on desktop and narrow mobile viewports
- [x] production bundle and interaction performance remain within recorded budgets
- [x] all later-class chassis are selectable, persistent, and playable to level 20

### Later-class families delivered

- Ultimate classes: Magus, Gunslinger, and Samurai, each with defining choices,
  class resources, sourced level 1-20 features, persistence, and browser coverage.
- Advanced Class Guide hybrid classes: Bloodrager, Brawler, Hunter,
  Investigator, Shaman, Skald, Slayer, Swashbuckler, and Warpriest.
- Occult Adventures classes: Kineticist, Medium, Mesmerist, Occultist, Psychic,
  and Spiritualist, including their core selectable systems, psychic spell
  progressions, bounded resources, capstones, and level-20 browser coverage.

The generated catalogue now contains 46 playable classes, 89 option groups,
3,447 feats, 40 traits, and 2,758 spells. The production bundle remains within
the recorded client-size budget.

## Completed milestone: Later-Class Content Depth

Bring the 28 APG, Ultimate, Advanced Class Guide, and Occult Adventures classes
to the same content depth as the original Core-class experience.

1. [x] Extend the sourced archetype importer and coverage report to every later
   base and hybrid class, retaining replacements, restrictions, source links,
   automation status, search, stacking, and persistence.
2. [x] Import and validate the published Magus, Gunslinger, and Samurai
   archetype catalogues as the first reusable batch.
3. [x] Import and validate archetypes for the five APG and nine Advanced Class
   Guide class families.
4. [x] Import and validate archetypes for all six Occult Adventures classes.
5. [x] Complete defining option catalogues that are currently representative,
   including arcana, deeds, orders, wild talents, tricks, focus powers,
   amplifications, disciplines, and emotional focuses.
6. [x] Replace derived proxy spell lists with exact sourced class spell levels
   for every later spellcasting class.
7. [x] Add level-20 desktop and narrow-mobile journeys covering archetype
   selection, dependent choices, persistence, spell use, and class resources.
8. [x] Regenerate coverage, enforce performance budgets, pass the complete CI
   suite, and deploy the finished milestone.

### Completion criteria

- [x] every later base and hybrid class exposes its published archetypes
- [x] every imported archetype has explicit mechanical coverage and no silent effects
- [x] defining class-option catalogues are complete and prerequisite-aware
- [x] later-class spell lists use exact sourced levels rather than proxy lists
- [x] representative archetyped builds persist and reach level 20 on desktop and mobile
- [x] validation, UI, browser, production, offline, and performance gates pass

## Completed milestone: Combat Simulation Foundations

Turn the Actions tab into a practical at-table dice roller while retaining the
existing hit-point, round, and temporary-effect tools.

1. [x] Add a reusable validated dice engine for bounded dice pools, expressions,
   modifiers, and natural d20 outcomes.
2. [x] Roll attacks and weapon damage directly from equipped items using the
   character's calculated attack and damage modifiers.
3. [x] Roll initiative, Fortitude, Reflex, Will, and every calculated skill from
   the current character sheet, including active bonuses.
4. [x] Add a custom dice pool with common die sizes and a signed modifier.
5. [x] Keep a readable, clearable session history showing formulas, individual
   dice, totals, and natural 1 or natural 20 results.
6. [x] Verify the complete interaction path at desktop and narrow-mobile
   viewports with no horizontal overflow.

### Completion criteria

- [x] all rolls apply the displayed character modifier
- [x] equipped weapon attacks and damage use their calculated sheet values
- [x] dice inputs are bounded and invalid expressions are rejected
- [x] roll results are announced accessibly and retain the latest 20 entries
- [x] engine, UI, browser, production, offline, and performance gates pass

All work must preserve the completed Core, Expanded Character Options,
Installable Application, Universal Builder, and Builder Expansion milestones.

## Completed milestone: Combat Target Resolution

Extend the combat dice foundation from raw totals into clear rules-aware attack
outcomes.

1. [x] Add a bounded target Armor Class control beside equipped attacks.
2. [x] Resolve ordinary attacks as hits or misses while respecting automatic
   natural 1 misses and natural 20 hits.
3. [x] Parse each equipped weapon's threat range and identify critical threats.
4. [x] Retain the target and outcome in roll history without automatically
   applying damage.
5. [x] Cover desktop and narrow-mobile target-resolution journeys.

### Completion criteria

- [x] attack totals are compared against the chosen Armor Class
- [x] natural attack outcomes follow PF1e automatic hit and miss rules
- [x] expanded weapon threat ranges are recognized
- [x] target resolution remains readable and usable on mobile

## Completed milestone: Critical Confirmation

Complete the Pathfinder 1e critical-hit workflow after target resolution.

1. [x] Automatically roll confirmation when an equipped weapon threatens a
   critical hit.
2. [x] Resolve the confirmation against the same target Armor Class with the
   same calculated attack modifier.
3. [x] Report confirmed and unconfirmed results separately while preserving the
   original attack roll.
4. [x] Show the weapon's critical damage multiplier without automatically
   applying damage.
5. [x] Add deterministic regression coverage for confirmation rules and UI.

## Completed expansion: Shared Archetype Class-Skill Automation

Apply standard class-skill changes directly from authoritative archetype rules
text when a hand-authored structured override is not present.

1. [x] Recognize standard additions, removals, replacements, and “instead of”
   wording across the archetype catalogue.
2. [x] Normalize ability annotations and grouped Craft, Perform, Profession, and
   Knowledge skill names to builder skill groups.
3. [x] Exclude companion, familiar, eidolon, and homunculus skill lists from the
   player character's class skills.
4. [x] Apply inferred changes through the existing archetype stacking engine and
   expose them in the automation summary.
5. [x] Add engine and browser regression coverage across multiple classes and rule
   phrasings.

## Completed expansion: Shared Archetype Proficiency Automation

Apply standard weapon, armor, and shield proficiency changes directly from
authoritative archetype rules text when a hand-authored override is absent.

1. [x] Recognize proficiency grants, losses, replacements, and explicit
   non-proficiency wording across the archetype catalogue.
2. [x] Normalize simple and martial weapons, firearms, armor weights, shields,
   tower-shield exceptions, named weapons, and choice-based martial weapons.
3. [x] Exclude companion, familiar, eidolon, homunculus, and mount proficiency
   rules from the player character's calculated chassis.
4. [x] Apply inferred changes through the existing archetype stacking engine and
   expose each grant or loss in the automation summary.
5. [x] Add catalogue-audit, engine, desktop, and narrow-mobile regression
   coverage across multiple classes and rule phrasings.

## Completed expansion: Shared Archetype Skill-Rank Progression

Apply explicit skill ranks per level directly from authoritative archetype rules
text when a hand-authored progression override is absent.

1. [x] Recognize fixed `Skill Ranks per Level` values and additive bonus-rank
   wording.
2. [x] Exclude companion, eidolon, familiar, homunculus, phantom, and mount
   progressions from the player character's chassis.
3. [x] Apply fixed and additive changes through the existing level and multiclass
   progression calculations.
4. [x] Expose the calculated progression in the archetype automation summary and
   generated coverage report.
5. [x] Add full-catalogue, engine, desktop, and narrow-mobile regression
   coverage.

## Completed expansion: Shared Archetype Resource Automation

Turn standard daily-use wording in authoritative archetype features into bounded
character resources when a hand-authored structured override is absent.

1. [x] Recognize fixed uses and pools based on class level, half or double class
   level, ability modifiers, and common interval progressions and caps.
2. [x] Exclude malformed headings, subordinate-creature pools, and multi-ability
   containers that cannot safely map to one player-character tracker.
3. [x] Connect inferred resources to existing spend, refresh-day, save/load, and
   level-change clamping behavior.
4. [x] Surface readable labels, units, controls, and automation status in the
   Features tab on desktop and narrow mobile.
5. [x] Add formula, catalogue-safety, persistence, and browser regression tests.

## Completed expansion: Shared Archetype Fixed Feat Grants

Apply exact bonus feats from authoritative archetype feature text when a
hand-authored structured grant is absent.

1. [x] Match exact feat names, common source suffixes, and multiple fixed grants
   against the complete feat catalogue.
2. [x] Preserve the level stated in each sentence, including multiple feat
   unlocks embedded in one replacement feature.
3. [x] Exclude companion-owned grants and wording that requires an unrestricted
   or either/or feat choice.
4. [x] Feed inferred feats into supported combat, save, skill, hit-point, and
   equipment calculations and show the result in automation status.
5. [x] Add catalogue, engine, desktop, and narrow-mobile regression coverage.

## Completed expansion: Shared Archetype Restricted Feat Choices

Convert common restricted bonus-feat wording into earned Features-tab selectors
when no hand-authored choice progression exists.

1. [x] Recognize exact either/or choices and reusable teamwork and item-creation
   feat categories.
2. [x] Expand published fixed and interval progressions into separate level-aware
   choice slots through level 20.
3. [x] Preserve prerequisite requirements and only bypass them when the rules
   text explicitly does so.
4. [x] Apply selected feat mechanics, include choices in completion guidance,
   and persist selections across save/load on desktop and mobile.
5. [x] Exclude companion-owned, unrestricted, and ambiguous list-modification
   wording for later dedicated automation.

## Completed expansion: Named Archetype Feat Lists

Convert recurring published feat lists into earned, level-aware selectors.

1. [x] Recognize named feat lists with fixed recurring level intervals through
   level 20.
2. [x] Resolve list entries to the feat catalogue, including feats whose rules
   text names a parenthetical sub-choice.
3. [x] Carry typed feat details such as a Skill Focus skill into calculated feat
   bonuses and saved character state.
4. [x] Cover the Id Rager and eight animal-shaman progressions with catalogue
   regression tests.

## Completed expansion: Level-Expanding Archetype Feat Lists

Automate published feat lists whose available options increase at later class
levels.

1. [x] Parse fixed, irregular, and recurring feat-slot levels through level 20.
2. [x] Add later option-list expansions only to slots at or above their stated
   unlock level.
3. [x] Normalize source suffixes, asterisks, split hyphens, and alternate armor
   proficiency naming against the feat catalogue.
4. [x] Automate Gendarme, Crusader, Elemental Annihilator, Brazen Disciple, and
   Divine Guardian progressions without weakening their published lists.
5. [x] Verify selection and save/load behavior on desktop and narrow mobile.

## Completed expansion: Hybrid Archetype Feat Families

Automate published bonus-feat rules that combine named options, prerequisite-
derived families, and nonstandard feature names.

1. [x] Include every catalogue feat that directly names a published prerequisite
   alongside explicitly listed options.
2. [x] Preserve compound feat names containing “and” while parsing prose lists.
3. [x] Recognize bonus-feat progressions embedded in named archetype features and
   apply explicit prerequisite waivers.
4. [x] Automate Undying Word, Urban Hunter, Cloaked Wolf, Tempered Champion, and
   Wave Warden progressions through level 20.
5. [x] Verify prerequisite-derived selection and persistence on desktop and
   narrow mobile.

## Completed expansion: Archetype Feats in Existing Class Slots

Allow published archetype feats to replace an existing class choice without
creating additional selections.

1. [x] Represent feat alternatives as option-group augmentations with level and
   prerequisite rules.
2. [x] Feed selected alternatives into calculated feat effects and typed feat
   details.
3. [x] Remove unavailable alternatives automatically when an archetype changes.
4. [x] Automate Fire Bomber, Pack Hunter, Steel Hound, Skulking Slayer, and
   Butterfly Blade substitutions.
5. [x] Verify slot counts and save/load behavior on desktop and narrow mobile.

## Completed expansion: Core and Replacement Bonus-Feat Chassis

Make class bonus-feat progressions selectable and let archetypes replace or
expand those lists without losing the original earned slots.

1. [x] Add level-aware Monk, Warpriest, and Swashbuckler bonus-feat selectors.
2. [x] Apply each class's published prerequisite handling, including Monk
   waivers and Warpriest class-level substitutions.
3. [x] Retain earned class slots when an archetype replaces their option list.
4. [x] Automate Hamatulatsu Master, Hellcat, and Disenchanter replacement lists
   and their later-level expansions.
5. [x] Automate Buccaneer and Daring Infiltrator additions to existing lists.
6. [x] Verify replacement, expansion, selection, and save/load behavior on
   desktop and narrow mobile.

## Completed expansion: Brawler Bonus-Feat Chassis

Restore the Brawler's published bonus combat feat progression and allow
archetypes to expand its choices without creating extra feat slots.

1. [x] Add selectable Brawler bonus combat feat slots at levels 2, 5, 8, 11,
   14, 17, and 20.
2. [x] Count Brawler levels as Fighter and Monk levels when checking feat
   prerequisites.
3. [x] Recognize named additions to an existing class bonus-feat list.
4. [x] Add Constructed Pugilist's Craft Magic Arms and Armor, Master Craftsman,
   and Skill Focus choices while retaining normal combat-feat choices.
5. [x] Verify catalogue inference and desktop/narrow-mobile save and load.

## Active milestone: Archetype Mechanical Depth

Convert the remaining partially automated archetypes into complete mechanical
experiences by expanding reusable builder subsystems instead of adding isolated
one-off controls.

1. [x] Establish an authoritative automation baseline in generated coverage and
   update user-facing documentation to the current 46-class, 1,195-archetype,
   3,447-feat, and 2,758-spell catalogue.
2. [x] Classify partial archetypes by missing subsystem: resource, companion,
   spell-list, selectable progression, combat statistic, skill, feat, or manual
   narrative effect.
3. [x] Automate the highest-reuse resource and selectable-progression patterns,
   beginning with classes that currently have no fully automated archetypes.
4. [x] Automate shared spell-list, spell-slot, companion, and familiar
   replacement patterns and migrate every matching archetype.
5. [x] Automate shared combat-statistic, proficiency, feat, and skill replacement
   patterns and migrate every matching archetype.
6. [x] Add archetyped level-20 desktop and narrow-mobile regression journeys for
   each newly supported subsystem, including save/load and multiclass paths.
7. [x] Regenerate coverage, enforce a reduced partial-automation baseline, pass
   the complete CI suite, and deploy the milestone.

### Completion criteria

- [x] every partial archetype names its exact remaining manual effects
- [x] reusable mechanical patterns are automated consistently across classes
- [x] coverage checks prevent regressions from full to partial automation
- [x] representative archetyped builds persist on desktop and narrow mobile
- [x] validation, UI, browser, production, offline, and performance gates pass
