import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const archetypeUrl = new URL("packages/data/src/archetypes/druid-drovier.json", root);
const optionUrl = new URL("packages/data/src/options/drovier-domains.json", root);
const detailUrl = new URL("packages/data/src/domain-details/ultimate-magic-eagle-wolf-domains.json", root);
const load = async (url) => JSON.parse(await readFile(url, "utf8"));
const save = (url, value) => writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
const source = { title: "Ultimate Magic", page: null, url: "https://legacy.aonprd.com/ultimatemagic/spellcastingClassOptions/druid.html" };
const tracker = (label, description, effects = []) => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  label,
  summary: description,
  defaultRounds: 100,
  activeEffects: effects.length ? effects : [{ target: "allies", bonus: 0, label, description }],
});

const archetype = await load(archetypeUrl);
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const bond = features.find((feature) => /^Nature's Bond/.test(feature.name));
const aspect = features.find((feature) => /^Communal Aspect/.test(feature.name));
if (!bond || !aspect) throw new Error("Drovier features were not found");

archetype.druidNatureBondOptionIds = ["druid-nature-bond-domain"];
archetype.druidDomainIds = ["domain-animal", "domain-eagle", "domain-wolf"];
archetype.optionGroupAugmentations = [{ targetGroupId: "cleric-domains", sourceGroupId: "drovier-domains" }];
archetype.resourceAdjustments = [{
  resourceId: "communalAspectIncrements",
  label: "Communal Aspect",
  unit: "10-minute increment",
  operation: "add",
  minimumLevel: 4,
  base: 0,
  levelMultiplier: 1,
  minimum: 4,
  maximum: 20,
  atWillAtLevel: 20,
  refreshCadence: "day",
  dedicatedAction: true,
}];

const basic = [
  tracker("Frog", "+4 competence on Acrobatics and always jump with a running start.", [{ target: "allies", bonus: 4, label: "Frog Aspect", description: "+4 competence on Acrobatics; always jump with a running start.", skillIds: ["Acrobatics"] }]),
  tracker("Gorilla", "Increase unarmed damage one step and gain +4 competence on grapple and reposition checks."),
  tracker("Monkey", "+4 competence on Climb and use improvised thrown weapons as with Throw Anything.", [{ target: "allies", bonus: 4, label: "Monkey Aspect", description: "+4 competence on Climb; gain the Throw Anything benefit.", skillIds: ["Climb"] }]),
  tracker("Otter", "Gain a swim speed equal to half land speed and hold breath for 4 rounds per Constitution point."),
  tracker("Raccoon", "+2 competence on Disable Device, Sleight of Hand, and Stealth.", [{ target: "allies", bonus: 2, label: "Raccoon Aspect", description: "+2 competence on Disable Device, Sleight of Hand, and Stealth.", skillIds: ["Disable Device", "Sleight of Hand", "Stealth"] }]),
  tracker("Raptor", "Gain a +20-foot enhancement bonus to land speed.", [{ target: "landSpeed", bonus: 20, label: "Raptor Aspect", description: "+20-foot enhancement bonus to land speed." }]),
  tracker("Tree Lizard", "Gain a climb speed equal to half normal speed and the benefits of a natural climb speed."),
].map((mode) => ({ ...mode, maximumLevel: 5 }));
const greaterDescriptions = {
  Frog: "+4 competence on Acrobatics, running-start jumps, and a swim speed equal to half land speed.",
  Gorilla: "Increase unarmed damage one step; +4 competence on grapple and reposition, +2 Perception, and +1 Fortitude.",
  Monkey: "+4 competence on Climb and Acrobatics, plus the Throw Anything benefit.",
  Otter: "Gain a swim speed equal to land speed, extended breath, and cast underwater without concentration checks.",
  Raccoon: "+4 competence on Disable Device, Sleight of Hand, and Stealth.",
  Raptor: "Gain +30 feet to land speed and the Run feat benefit.",
  "Tree Lizard": "Gain a climb speed equal to half normal speed and +4 competence on Stealth.",
};
const greater = basic.map((mode) => ({
  ...mode,
  id: `${mode.id}-greater`,
  label: `${mode.label} (greater)`,
  summary: greaterDescriptions[mode.label],
  minimumLevel: 6,
  maximumLevel: undefined,
  activeEffects: [{ target: "allies", bonus: 0, label: `${mode.label} Greater Aspect`, description: greaterDescriptions[mode.label] }],
}));
const special = [
  { level: 8, label: "Aspect of the Falcon", description: "Gain the spell's Perception and ranged-attack benefits." },
  { level: 10, label: "Aspect of the Bear", description: "Gain +2 natural armor and +2 on combat maneuver checks." },
  { level: 12, label: "Aspect of the Stag", description: "Gain +2 dodge AC against attacks of opportunity and the spell's increased speed." },
  { level: 14, label: "Aspect of the Wolf", description: "Gain +4 Strength, +4 Dexterity, and +2 on trip checks." },
].map(({ level, label, description }) => ({ ...tracker(label, description), minimumLevel: level }));
aspect.resourceActions = [{
  id: "drovier-communal-aspect",
  label: "Grant Communal Aspect",
  classId: "druid",
  minimumLevel: 4,
  resourceId: "communalAspectIncrements",
  cost: 1,
  actionTypeByLevel: [{ level: 4, actionType: "standard" }],
  modeLabel: "Animal aspect",
  modes: [...basic, ...greater, ...special],
  activeEffect: { name: "Communal Aspect", targets: ["allies"], bonus: 0, description: "All allies within 30 feet gain the selected aspect for this 10-minute increment.", defaultRounds: 100, fixedRounds: true, replaceExisting: true },
  summary: "Spend one 10-minute increment to grant one selected aspect to every ally within 30 feet; choosing another aspect ends the prior one.",
}];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Animal, Eagle, and Wolf domain legality, the level-sized 10-minute Communal Aspect pool, level-gated aspect modes, replacement behavior, and the level-20 at-will capstone are automated."];

const domainGroup = {
  id: "drovier-domains",
  name: "Drovier Animal Domains",
  classIds: ["druid"],
  source,
  optionDefaults: { groupId: "drovier-domains", classIds: ["druid"], minimumLevel: 1, prerequisites: [], source },
  options: [
    { id: "domain-eagle", name: "Eagle Domain", benefit: "Gain a hawk familiar, Hawkeye, aerial evasion, and the Eagle domain spell list." },
    { id: "domain-wolf", name: "Wolf Domain", benefit: "Gain Improved Trip, Pack Tactics, and the Wolf domain spell list." },
  ],
};
const domainDetails = {
  source,
  domains: [
    {
      id: "domain-eagle",
      powers: [
        { name: "Hawk Familiar", level: 1, summary: "Gain a hawk familiar using druid level as effective wizard level; familiar-granting class levels stack." },
        { name: "Hawkeye", level: 1, summary: "As a swift action, add half druid level (minimum +1) to one ranged attack or Perception check, 3 + Wisdom modifier times per day." },
        { name: "Aerial Evasion", level: 6, summary: "Gain evasion while flying, improving to improved evasion at level 12." },
      ],
      domainSpells: ["aspect of the falcon", "eagle's splendor", "fly", "river of wind", "overland flight", "eagle aerie", "animal shapes (birds only)", "sunburst", "winds of vengeance"].map((name, index) => ({ level: index + 1, name })),
    },
    {
      id: "domain-wolf",
      powers: [
        { name: "Improved Trip", level: 1, summary: "Gain Improved Trip as a bonus feat." },
        { name: "Pack Tactics", level: 8, summary: "As a free action, designate an adjacent square for flanking until the next turn or movement; alternatively add Wisdom instead of +2 when already flanking. Uses per day equal 3 + Wisdom modifier." },
      ],
      domainSpells: ["hunter's howl", "bloodhound", "aspect of the wolf", "strong jaw", "tireless pursuers", "find the path", "animal shapes (canines only)", "phantasmal revenge", "freedom"].map((name, index) => ({ level: index + 1, name })),
    },
  ],
};

await Promise.all([save(archetypeUrl, archetype), save(optionUrl, domainGroup), save(detailUrl, domainDetails)]);
console.log("Annotated Drovier domain and Communal Aspect automation.");
