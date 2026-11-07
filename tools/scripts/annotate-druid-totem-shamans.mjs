import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const archetypeUrl = (id) => new URL(`packages/data/src/archetypes/${id}.json`, root);
const companionsUrl = new URL("packages/data/src/options/ranger-animal-companions.json", root);
const load = async (url) => JSON.parse(await readFile(url, "utf8"));
const save = (url, value) => writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
const features = (record) => record.replacements.flatMap((replacement) => replacement.features ?? []);
const named = (record, pattern) => features(record).find((feature) => pattern.test(feature.name));
const companion = (id) => `ranger-animal-companion-${id}`;
const domain = (id) => id.startsWith("subdomain-") ? id : `domain-${id}`;
const effect = (label, target, bonus, description) => ({ target, bonus, label, description });

const sharedActionTypes = [
  { level: 2, actionType: "standard" },
  { level: 7, actionType: "move" },
  { level: 12, actionType: "swift" },
];

const configs = {
  ape: {
    companions: ["ape"], domains: ["animal", "community", "subdomain-family", "destruction", "subdomain-rage", "strength"], creature: "primates", favored: "ape or related primate", generalAdjustment: -2, favoredAdjustment: 2,
    modes: [
      ["movement", "Movement", [effect("Climb speed", "self", 0, "Gain a 20-foot climb speed."), effect("Climb checks", "skillChecks", 4, "+4 racial bonus on Climb checks.")]],
      ["senses", "Senses", [effect("Ape senses", "self", 0, "Gain low-light vision and scent.")]],
      ["natural-weapons", "Natural weapons", [effect("Ape natural weapons", "self", 0, "Gain two slam attacks (1d6 for Medium) and +2 CMB to grapple.")]],
      ["toughness", "Toughness", [effect("Natural armor", "armorClass", 2, "+2 natural armor bonus to AC."), effect("Endurance", "self", 0, "Gain Endurance while this aspect is active.")]],
    ], feats: ["diehard", "endurance", "great-fortitude", "improved-bull-rush", "toughness"],
  },
  bat: {
    companions: ["bat"], domains: ["air", "animal", "darkness", "subdomain-night", "trickery", "subdomain-deception"], creature: "bats", favored: "bat", generalAdjustment: -2, favoredAdjustment: 2,
    modes: [
      ["flight", "Flight", [effect("Bat flight", "self", 0, "Gain a 30-foot fly speed with average maneuverability.")], 5],
      ["natural-weapons", "Natural weapons", [effect("Bat bite", "self", 0, "Gain a bite attack (1d4 for Medium).")]],
      ["senses", "Senses", [effect("Blindsense", "self", 0, "Gain blindsense 20 feet.")]],
    ], feats: ["acrobatic", "agile-maneuvers", "improved-initiative", "lightning-reflexes", "skill-focus"],
  },
  bear: {
    companions: ["bear"], domains: ["animal", "earth", "protection", "strength"], creature: "bears", favored: "bear", generalAdjustment: -2, favoredAdjustment: 2,
    modes: [
      ["movement", "Movement", [effect("Land speed", "landSpeed", 10, "+10 enhancement bonus to land speed."), effect("Swim checks", "skillChecks", 4, "+4 racial bonus on Swim checks.")]],
      ["senses", "Senses", [effect("Bear senses", "self", 0, "Gain low-light vision and scent.")]],
      ["toughness", "Toughness", [effect("Natural armor", "armorClass", 2, "+2 natural armor bonus to AC."), effect("Endurance", "self", 0, "Gain Endurance while this aspect is active.")]],
      ["natural-weapons", "Natural weapons", [effect("Bear natural weapons", "self", 0, "Gain a bite (1d6), two claws (1d4), and +2 CMB to grapple.")]],
    ], feats: ["diehard", "endurance", "great-fortitude", "improved-great-fortitude", "toughness"],
  },
  boar: {
    companions: ["boar"], domains: ["animal", "destruction", "subdomain-rage", "protection", "strength"], creature: "boars and related porcine creatures", favored: "boar", generalAdjustment: -2, favoredAdjustment: 2,
    modes: [
      ["movement", "Movement", [effect("Land speed", "landSpeed", 10, "+10 enhancement bonus to land speed.")]],
      ["senses", "Senses", [effect("Boar senses", "self", 0, "Gain low-light vision and scent.")]],
      ["natural-weapons", "Natural weapons", [effect("Boar gore", "self", 0, "Gain a gore attack (1d8 for Medium) and +2 CMB to overrun.")]],
      ["toughness", "Toughness", [effect("Natural armor", "armorClass", 2, "+2 natural armor bonus to AC."), effect("Endurance", "self", 0, "Gain Endurance while this aspect is active.")]],
    ], feats: ["bleeding-critical", "blind-fight", "diehard", "improved-overrun"],
  },
  dragon: {
    companions: ["crocodile", "monitor-lizard"], domains: ["air", "animal", "destruction", "earth", "fire", "war", "water"], creature: "lizards", favored: "lizard", generalAdjustment: -4, favoredAdjustment: 0,
    modes: [
      ["flight", "Flight", [effect("Dragon flight", "self", 0, "Gain a 30-foot fly speed with average maneuverability.")], 5],
      ["senses", "Senses", [effect("Dragon senses", "self", 0, "Gain low-light vision and +4 racial bonus on Perception checks."), effect("Perception", "skillChecks", 4, "+4 racial bonus on Perception checks.")]],
      ["toughness", "Toughness", [effect("Natural armor", "armorClass", 2, "+2 natural armor bonus to AC."), effect("Endurance", "self", 0, "Gain Endurance while this aspect is active.")]],
      ["natural-weapons", "Natural weapons", [effect("Dragon natural weapons", "self", 0, "Gain a bite (1d6), two claws (1d4), and +2 CMB to grapple.")]],
    ], feats: ["combat-casting", "dazzling-display", "magical-aptitude", "skill-focus", "spell-penetration"],
  },
  eagle: {
    companions: ["bird"], domains: ["air", "animal", "nobility", "weather"], creature: "eagles, rocs, and giant eagles", favored: "eagle or roc", generalAdjustment: -2, favoredAdjustment: 2,
    modes: [
      ["flight", "Flight", [effect("Eagle flight", "self", 0, "Gain a 30-foot fly speed with average maneuverability.")], 5],
      ["senses", "Senses", [effect("Eagle senses", "self", 0, "Gain low-light vision and +4 racial bonus on Perception checks."), effect("Perception", "skillChecks", 4, "+4 racial bonus on Perception checks.")]],
      ["natural-weapons", "Natural weapons", [effect("Eagle natural weapons", "self", 0, "Gain a bite and two talons (1d4 each for Medium).")]],
    ], feats: ["flyby-attack", "improved-lightning-reflexes", "lightning-reflexes", "skill-focus", "wind-stance"],
  },
  lion: {
    companions: ["big-cat"], domains: ["animal", "glory", "nobility", "sun"], creature: "felines", favored: "feline", generalAdjustment: -2, favoredAdjustment: 2,
    modes: [
      ["movement", "Movement", [effect("Land speed", "landSpeed", 20, "+20 enhancement bonus to land speed.")]],
      ["senses", "Senses", [effect("Lion senses", "self", 0, "Gain low-light vision and scent.")]],
      ["natural-weapons", "Natural weapons", [effect("Lion natural weapons", "self", 0, "Gain a bite, two claws, rake, and +2 CMB to grapple.")]],
    ], feats: ["dodge", "lunge", "improved-iron-will", "iron-will", "skill-focus"],
  },
  saurian: {
    companions: ["dinosaur"], domains: ["animal", "destruction", "strength", "war"], creature: "reptiles and dinosaurs", favored: "reptile or dinosaur", generalAdjustment: -2, favoredAdjustment: 2,
    modes: [
      ["movement", "Movement", [effect("Land speed", "landSpeed", 10, "+10 enhancement bonus to land speed.")]],
      ["scales", "Scales", [effect("Natural armor", "armorClass", 2, "+2 natural armor bonus to AC.")]],
      ["senses", "Senses", [effect("Saurian senses", "self", 0, "Gain low-light vision and scent.")]],
      ["natural-weapons", "Natural weapons", [effect("Saurian natural weapons", "self", 0, "Gain a bite, two claws, rake, and +2 CMB to grapple.")]],
    ], feats: ["improved-overrun", "nimble-moves", "power-attack", "skill-focus", "vital-strike"],
  },
  serpent: {
    companions: ["constrictor-snake", "viper-snake"], domains: ["animal", "charm", "trickery", "water"], creature: "reptiles", favored: "snake", generalAdjustment: -2, favoredAdjustment: 2,
    modes: [
      ["movement", "Movement", [effect("Serpent movement", "self", 0, "Gain climb and swim speeds of 20 feet.")]],
      ["scales", "Scales", [effect("Natural armor", "armorClass", 2, "+2 natural armor bonus to AC.")]],
      ["senses", "Senses", [effect("Serpent senses", "self", 0, "Gain low-light vision and scent.")]],
      ["natural-weapons", "Natural weapons", [effect("Venomous bite", "self", 0, "Gain a bite (1d4), Constitution poison, and +2 CMB to grapple.")]],
    ], feats: ["combat-expertise", "improved-feint", "skill-focus", "stealthy", "strike-back"],
  },
  shark: {
    companions: ["shark"], domains: ["animal", "death", "war", "water"], creature: "rays and sharks", favored: "shark", generalAdjustment: -2, favoredAdjustment: 2,
    modes: [
      ["movement", "Movement", [effect("Aquatic movement", "self", 0, "Breathe water and gain a 30-foot swim speed.")]],
      ["senses", "Senses", [effect("Shark scent", "self", 0, "Gain scent 30 feet, increased to 90 feet in water.")]],
      ["natural-weapons", "Natural weapons", [effect("Shark bite", "self", 0, "Gain a bite attack (1d6 for Medium).")]],
      ["shark-skin", "Shark skin", [effect("Natural armor", "armorClass", 2, "+2 natural armor bonus to AC."), effect("Rough skin", "self", 0, "Creatures grappling you take 1 slashing damage each round.")]],
    ], feats: ["bleeding-critical", "improved-initiative", "lightning-reflexes", "self-sufficient", "skill-focus"],
  },
  wolf: {
    companions: ["wolf"], domains: ["animal", "community", "liberation", "travel"], creature: "canines", favored: "canine", generalAdjustment: -2, favoredAdjustment: 2,
    modes: [
      ["movement", "Movement", [effect("Land speed", "landSpeed", 20, "+20 enhancement bonus to land speed.")]],
      ["senses", "Senses", [effect("Wolf senses", "self", 0, "Gain low-light vision, scent, and +4 Survival when tracking by scent."), effect("Tracking by scent", "skillChecks", 4, "+4 racial bonus on Survival checks when tracking by scent.")]],
      ["natural-weapons", "Natural weapons", [effect("Wolf bite", "self", 0, "Gain a bite (1d4 plus trip) and +2 CMB to trip.")]],
    ], feats: ["greater-trip", "improved-trip", "mobility", "skill-focus", "spring-attack"],
  },
};

for (const [totem, config] of Object.entries(configs)) {
  const url = archetypeUrl(`druid-${totem}-shaman`);
  const record = await load(url);
  const transformation = named(record, /^Totem Transformation/);
  const summons = named(record, /^Totemic Summons/);
  const wildShape = named(record, /^Wild Shape/);
  if (!transformation || !summons || !wildShape) throw new Error(`${record.id} is missing a shared shaman feature`);

  record.druidNatureBondOptionIds = ["druid-nature-bond-animal", "druid-nature-bond-domain"];
  record.druidAnimalCompanionIds = config.companions.map(companion);
  record.druidDomainIds = config.domains.map(domain);
  record.wildShapeLevelAdjustment = config.generalAdjustment;
  record.resourceAdjustments = [{
    resourceId: "totemTransformation",
    label: "Totem Transformation",
    unit: "minute",
    operation: "add",
    minimumLevel: 2,
    base: 0,
    levelMultiplier: 1,
    minimum: 0,
    refreshCadence: "day",
    dedicatedAction: true,
  }];

  transformation.resourceActions = [
    {
      id: `${totem}-shaman-totem-transformation`,
      label: "Activate Totem Transformation",
      resourceId: "totemTransformation",
      cost: 1,
      classId: "druid",
      minimumLevel: 2,
      actionTypeByLevel: sharedActionTypes,
      modeLabel: "Aspect",
      modes: config.modes.map(([id, label, activeEffects, minimumLevel]) => ({
        id, label, summary: activeEffects.map((entry) => entry.description).join(" "), ...(minimumLevel ? { minimumLevel } : {}), defaultRounds: 10, activeEffects,
      })),
      summary: "Spend 1 minute of Totem Transformation and apply the selected aspect for 10 rounds.",
    },
    {
      id: `${totem}-shaman-speak-with-animals`,
      label: `Speak with ${config.creature}`,
      classId: "druid",
      minimumLevel: 2,
      actionTypeByLevel: [{ level: 2, actionType: "standard" }],
      spellLikeAbility: { spellId: "speak-with-animals", spellName: "Speak with Animals", cadence: "at-will", kind: "spell-equivalent" },
      confirmations: [{ id: "totem-creature", label: `The target is one of the permitted ${config.creature}`, requiredForActivation: true }],
      summary: `At-will speak with animals, restricted to ${config.creature}.`,
    },
  ];

  summons.resourceActions = [{
    id: `${totem}-shaman-totemic-summons`,
    label: "Resolve Totemic Summons",
    classId: "druid",
    minimumLevel: 5,
    actionTypeByLevel: [{ level: 5, actionType: "standard" }],
    confirmations: [{ id: "totem-summon", label: `The summon creates ${config.creature}`, requiredForActivation: true }],
    modeLabel: "Template adjustment",
    modes: [
      { id: "young", label: "Young (spell level -1)", summary: "Apply the young template and reduce the required summon spell level by 1." },
      { id: "normal", label: "Normal", summary: "Use the normal summon spell level." },
      { id: "advanced", label: "Advanced (spell level +1)", summary: "Apply the advanced template and increase the required summon spell level by 1." },
      { id: "giant", label: "Giant (spell level +1)", summary: "Apply the giant template and increase the required summon spell level by 1." },
      { id: "advanced-giant", label: "Advanced + giant (spell level +2)", summary: "Apply both templates and increase the required summon spell level by 2." },
    ],
    activeEffect: {
      name: `${record.name} Totemic Summons`, targets: ["area"], bonus: 0, defaultRounds: 1, fixedRounds: true,
      description: `Summoned ${config.creature} gain temporary hit points equal to your druid level; track their summon duration separately.`,
    },
    summary: `Cast summon nature's ally as a standard action for ${config.creature}; summoned creatures gain temporary hit points equal to druid level.`,
  }];

  wildShape.resourceActions = [{
    id: `${totem}-shaman-wild-shape`,
    label: "Assume Shaman Wild Shape",
    classId: "druid",
    minimumLevel: 6,
    resourceId: "wildShape",
    cost: 1,
    actionTypeByLevel: [{ level: 6, actionType: "standard" }],
    modeLabel: "Form type",
    modes: [
      { id: "totem-form", label: `Favored ${config.favored} form`, summary: `Use druid level ${config.favoredAdjustment >= 0 ? "+" : ""}${config.favoredAdjustment}.`, defaultRounds: 999, activeEffects: [effect("Favored wild shape", "self", 0, `Resolve wild shape at druid level ${config.favoredAdjustment >= 0 ? "+" : ""}${config.favoredAdjustment}.`)] },
      { id: "other-form", label: "Other permitted form", summary: `Use druid level ${config.generalAdjustment}.`, defaultRounds: 999, activeEffects: [effect("Adjusted wild shape", "self", 0, `Resolve wild shape at druid level ${config.generalAdjustment}.`)] },
    ],
    summary: "Spend 1 wild shape use and track the correct effective druid level for the selected form.",
  }];
  wildShape.progressionProfiles = [{
    id: `${totem}-shaman-wild-shape-levels`, label: "Wild Shape Effective Level", classId: "druid",
    columns: [{ id: "other", label: "Other forms" }, { id: "favored", label: `Favored ${config.favored}` }],
    steps: Array.from({ length: 15 }, (_, index) => {
      const level = index + 6;
      return { level, values: { other: Math.max(1, level + config.generalAdjustment), favored: Math.max(1, level + config.favoredAdjustment) } };
    }),
    summary: "Effective druid levels used by normal and totem-favored wild shape forms.",
  }];

  // Ape and Bear were already authored with three explicit slots. The other
  // shamans intentionally keep the published level-9 recurring wording so the
  // shared feat-choice inference creates the 9th/13th/17th-level slots.
  if (new Set(["ape", "bear", "boar"]).has(totem)) {
    const replacement = record.replacements.find((entry) => entry.features?.some((feature) => /^Bonus Feat$/.test(feature.name))) ?? record.replacements[0];
    for (const level of [9, 13, 17]) {
      let feature = features(record).find((entry) => /^Bonus Feat$/.test(entry.name) && entry.level === level);
      if (!feature) {
        feature = { id: `druid-${totem}-shaman-bonus-feat-${level}`, name: "Bonus Feat", level, type: "archetype", summary: `At ${level}th level, a ${totem} shaman gains another feat from the totem bonus feat list.` };
        replacement.features.push(feature);
      }
      feature.choiceRequired = true;
      feature.optionGroupId = "archetype-feats";
      feature.featChoiceIds = config.feats;
    }
  } else {
    for (const replacement of record.replacements) {
      replacement.features = (replacement.features ?? []).filter((feature) => !(/^Bonus Feat$/.test(feature.name) && [13, 17].includes(feature.level)));
    }
    const bonusFeature = features(record).find((feature) => /^Bonus Feat$/.test(feature.name));
    if (!bonusFeature) throw new Error(`${record.id} is missing its recurring bonus-feat feature`);
    delete bonusFeature.choiceRequired;
    delete bonusFeature.optionGroupId;
    delete bonusFeature.featChoiceIds;
  }

  if (totem === "dragon") {
    const bite = named(record, /^Dragon Bite/);
    bite.resourceActions = [{
      id: "dragon-shaman-dragon-bite", label: "Apply Dragon Bite Energy", classId: "druid", minimumLevel: 8,
      modeLabel: "Energy type", modes: ["acid", "cold", "electricity", "fire"].map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1), summary: `Add 1d6 ${id} damage to bite attacks.`, defaultRounds: 999 })),
      activeEffect: { name: "Dragon Bite", targets: ["weaponDamageRolls"], bonus: 0, defaultRounds: 999, description: "The bite deals +1d6 damage of the selected energy type; roll the extra die with each bite hit." },
      summary: "Choose the energy type and track the +1d6 energy damage on bite attacks.",
    }];
  }

  record.mechanicalCoverage = "full";
  record.mechanicalNotes = [
    "Nature Bond restrictions, Wild Empathy, daily transformation minutes, aspect modes, at-will animal speech, template-aware summons, effective wild-shape levels, and all bonus-feat slots are automated.",
  ];
  await save(url, record);
}

const companionOptions = {
  ape: ["Ape", "A strong climbing primate companion.", "Medium; speed 30 ft., climb 30 ft.; bite and two claws; low-light vision and scent."],
  bat: ["Bat", "A flying nocturnal companion with blindsense.", "Diminutive; fly speed and blindsense; bite; low-light vision."],
  bear: ["Bear", "A durable ursine companion with powerful claws.", "Small; speed 40 ft.; bite and two claws; low-light vision and scent."],
  boar: ["Boar", "A sturdy charging companion with a gore attack.", "Small; speed 40 ft.; gore; ferocity, low-light vision, and scent."],
  crocodile: ["Crocodile", "An amphibious grappling companion.", "Small; swim speed; bite and tail slap; grab, hold breath, low-light vision."],
  "monitor-lizard": ["Monitor Lizard", "A climbing reptilian companion with a venomous bite.", "Small; climb and swim speeds; bite; low-light vision and scent."],
  "big-cat": ["Cat (Big)", "A lion or tiger companion built for pouncing attacks.", "Medium; speed 40 ft.; bite and two claws; low-light vision and scent."],
  dinosaur: ["Dinosaur", "A selectable saurian companion represented by the appropriate published dinosaur profile.", "Choose a legal dinosaur companion profile; use its listed size, movement, attacks, senses, and advancement."],
};
const companionCatalogue = await load(companionsUrl);
for (const [id, [name, benefit, summary]] of Object.entries(companionOptions)) {
  const optionId = companion(id);
  const value = {
    id: optionId,
    groupId: "ranger-animal-companions",
    name,
    classIds: ["druid"],
    minimumLevel: 1,
    prerequisites: [{ type: "class-level", classId: "druid", minimum: 1 }],
    benefit,
    powers: [{ name: "Starting Statistics", level: 1, summary }],
    source: { title: "Archives of Nethys", page: null, url: "https://www.aonprd.com/ClassDisplay.aspx?ItemName=Companion" },
  };
  const existingIndex = companionCatalogue.options.findIndex((option) => option.id === optionId);
  if (existingIndex >= 0) companionCatalogue.options[existingIndex] = value;
  else companionCatalogue.options.push(value);
}
await save(companionsUrl, companionCatalogue);

console.log(`Annotated ${Object.keys(configs).length} Druid totem shamans and completed their companion choices.`);
