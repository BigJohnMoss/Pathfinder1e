import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const archetypeUrl = (id) => new URL(`packages/data/src/archetypes/${id}.json`, root);
const load = async (url) => JSON.parse(await readFile(url, "utf8"));
const save = (url, value) => writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
const features = (record) => record.replacements.flatMap((replacement) => replacement.features ?? []);
const named = (record, pattern) => features(record).find((feature) => pattern.test(feature.name));
const tracker = (name, targets, description, defaultRounds = 999, bonus = 0) => ({ name, targets, bonus, description, defaultRounds, fixedRounds: true });

const voice = await load(archetypeUrl("bard-voice-of-the-wild"));
const voiceFeature = named(voice, /^Bardic Performance$/);
const voiceModes = voiceFeature?.resourceActions?.find((action) => action.id === "voice-wild-song")?.modes;
if (!voiceModes?.length) throw new Error("Voice of the Wild animal-focus modes were not found");
const focusModes = (slot) => structuredClone(voiceModes).map((mode) => ({
  ...mode,
  defaultRounds: 10,
  activeEffects: mode.activeEffects?.map((effect) => ({
    ...effect,
    label: `Animal Focus ${slot} — ${mode.label}`,
    description: effect.description.replace(/Bard level/gi, "Druid level"),
  })),
}));

const feralUrl = archetypeUrl("druid-feral-shifter");
const feral = await load(feralUrl);
const animalFocus = named(feral, /^Animal Focus/);
const secondFocus = named(feral, /^Second Animal Focus/);
if (!animalFocus || !secondFocus) throw new Error("Feral Shifter focus features were not found");
feral.resourceAdjustments = [{
  resourceId: "animalFocus",
  label: "Animal Focus",
  unit: "minute",
  operation: "add",
  minimumLevel: 1,
  base: 0,
  levelMultiplier: 1,
  minimum: 0,
  refreshCadence: "day",
  dedicatedAction: true,
}];
animalFocus.resourceActions = [{
  id: "feral-shifter-animal-focus",
  label: "Activate Animal Focus",
  classId: "druid",
  minimumLevel: 1,
  resourceId: "animalFocus",
  cost: 1,
  actionTypeByLevel: [{ level: 1, actionType: "swift" }],
  modeLabel: "Animal aspect",
  modes: focusModes("Primary"),
  activeEffect: tracker("Primary Animal Focus", ["self"], "The selected primary animal aspect is active for this 1-minute increment.", 10),
  summary: "Spend 1 minute from the daily pool and apply one level-scaled Hunter animal aspect.",
}];
secondFocus.resourceActions = [{
  id: "feral-shifter-second-animal-focus",
  label: "Add Second Animal Focus",
  classId: "druid",
  minimumLevel: 9,
  resourceId: "animalFocus",
  cost: 0,
  actionTypeByLevel: [{ level: 9, actionType: "swift" }],
  confirmations: [{ id: "different-aspect", label: "This aspect differs from the active primary aspect", requiredForActivation: true }],
  modeLabel: "Second animal aspect",
  modes: focusModes("Secondary"),
  activeEffect: tracker("Secondary Animal Focus", ["self"], "The selected secondary animal aspect shares the primary focus duration.", 10),
  summary: "At 9th level, add a different second aspect without spending another minute from the pool.",
}];
feral.mechanicalCoverage = "full";
feral.mechanicalNotes = ["The level-sized daily pool, all twelve level-scaled Hunter aspects, swift activation, and the distinct second aspect at 9th level are automated."];
await save(feralUrl, feral);

const seasonUrl = archetypeUrl("druid-season-sage");
const season = await load(seasonUrl);
const touch = named(season, /^Season.s Touch/);
const veil = named(season, /^Season.s Veil/);
if (!touch || !veil) throw new Error("Season Sage action features were not found");
season.resourceAdjustments = [
  {
    resourceId: "seasonsTouch",
    label: "Season's Touch",
    unit: "use",
    operation: "add",
    minimumLevel: 4,
    base: 1,
    abilityModifier: "wisdom",
    abilityMultiplier: 1,
    minimum: 1,
    refreshCadence: "day",
    dedicatedAction: true,
  },
  {
    resourceId: "seasonsVeil",
    label: "Season's Veil",
    unit: "use",
    operation: "add",
    minimumLevel: 6,
    base: 1,
    perInterval: 1,
    interval: 2,
    minimum: 1,
    maximum: 8,
    refreshCadence: "day",
    dedicatedAction: true,
  },
];
const seasonalDamageSteps = Array.from({ length: 9 }, (_, index) => ({ level: 4 + index * 2, count: 2 + index }));
const touchAction = (id, label, damageType) => ({
  id,
  label,
  classId: "druid",
  minimumLevel: 4,
  resourceId: "seasonsTouch",
  cost: 1,
  actionTypeByLevel: [{ level: 4, actionType: "standard" }],
  combatRoll: {
    attack: { kind: "melee-touch", label: "Touch attack", abilityModifier: "strength" },
    damage: { type: damageType, diceCountByLevel: seasonalDamageSteps, dieSidesByLevel: [{ level: 4, sides: 6 }] },
    rangeByLevel: [{ level: 4, range: "touch" }],
  },
  summary: `Spend 1 use, resolve the touch attack, and roll 1d6 ${damageType} damage per 2 druid levels.`,
});
touch.resourceActions = [
  {
    id: "season-sage-vernal-growth",
    label: "Use Vernal Growth",
    classId: "druid",
    minimumLevel: 4,
    resourceId: "seasonsTouch",
    cost: 1,
    actionTypeByLevel: [{ level: 4, actionType: "standard" }],
    activeEffect: tracker("Vernal Growth", ["allies"], "The touched living creature gains enlarge person even if it is not humanoid; a touched non-creature plant doubles in all dimensions. Duration is 1 minute per druid level."),
    summary: "Spend 1 use and track the level-duration enlargement effect.",
  },
  {
    id: "season-sage-summer-might",
    label: "Use Summer Might",
    classId: "druid",
    minimumLevel: 4,
    resourceId: "seasonsTouch",
    cost: 1,
    actionTypeByLevel: [{ level: 4, actionType: "standard" }],
    activeEffect: tracker("Summer Might", ["constitution"], "The touched character gains +4 enhancement to Constitution for 1 minute per druid level.", 999, 4),
    summary: "Spend 1 use and track the touched creature's +4 Constitution enhancement.",
  },
  touchAction("season-sage-autumn-rot", "Use Autumn Rot", "acid"),
  touchAction("season-sage-winter-frost", "Use Winter Frost", "cold"),
];
veil.resourceActions = [
  {
    id: "season-sage-seasons-veil",
    label: "Create Season's Veil",
    classId: "druid",
    minimumLevel: 6,
    resourceId: "seasonsVeil",
    cost: 1,
    actionTypeByLevel: [{ level: 6, actionType: "standard" }],
    modeLabel: "Season",
    modes: [
      { id: "spring", label: "Vernal Bloom", summary: "Heavy undergrowth; at level 8, plant growth can be applied as a swift action.", defaultRounds: 100 },
      { id: "summer", label: "Summer Heat", summary: "Extreme heat; at level 8, pulse 1d6 fire damage each round.", defaultRounds: 100 },
      { id: "autumn", label: "Autumn Squall", summary: "Fog, rain, and leaves grant concealment; at level 8, diminish plants can be applied as a swift action.", defaultRounds: 100 },
      { id: "winter", label: "Winter Chill", summary: "Extreme cold; at level 8, pulse 1d6 cold damage each round.", defaultRounds: 100 },
    ],
    activeEffect: tracker("Season's Veil", ["area"], "A 20-foot-radius seasonal aura (40 feet at level 10) persists in place for 10 minutes.", 100),
    summary: "Spend 1 use, choose the seasonal mode, and track the fixed 10-minute area effect.",
  },
  {
    id: "season-sage-veil-swift-effect",
    label: "Use Active Veil Effect",
    classId: "druid",
    minimumLevel: 8,
    actionTypeByLevel: [{ level: 8, actionType: "swift" }],
    confirmations: [{ id: "matching-veil", label: "The matching Season's Veil mode is active", requiredForActivation: true }],
    modeLabel: "Active veil",
    modes: [
      { id: "spring", label: "Plant Growth", summary: "Apply plant growth within Vernal Bloom.", defaultRounds: 1 },
      { id: "summer", label: "1d6 Fire", summary: "Deal 1d6 fire damage to other creatures in Summer Heat.", defaultRounds: 1 },
      { id: "autumn", label: "Diminish Plants", summary: "Apply diminish plants within Autumn Squall.", defaultRounds: 1 },
      { id: "winter", label: "1d6 Cold", summary: "Deal 1d6 cold damage to other creatures in Winter Chill.", defaultRounds: 1 },
    ],
    activeEffect: tracker("Season's Veil Swift Effect", ["area"], "Resolve the selected at-will swift effect inside the currently active matching veil.", 1),
    summary: "Resolve the matching at-will swift effect within an active veil.",
  },
];
season.mechanicalCoverage = "full";
season.mechanicalNotes = ["Both daily pools, all four touch modes with calculated damage, all veil modes and swift riders, and the inferred control weather spell-like ability are automated."];
await save(seasonUrl, season);

const urushiolUrl = archetypeUrl("druid-urushiol");
const urushiol = await load(urushiolUrl);
const secretions = named(urushiol, /^Toxic Secretions/);
const immunity = named(urushiol, /^Venom Immunity/);
if (!secretions || !immunity) throw new Error("Urushiol poison features were not found");
urushiol.resourceAdjustments = [{
  resourceId: "urushiolVenom",
  label: "Urushiol Venom",
  unit: "dose",
  operation: "add",
  minimumLevel: 1,
  base: 1,
  perInterval: 1,
  interval: 2,
  minimum: 1,
  maximum: 10,
  refreshCadence: "day",
  dedicatedAction: true,
}];
const poisonEffects = (minimumLevel, damageAbility) => minimumLevel >= 14 ? [
  { level: minimumLevel, name: "Urushiol Venom", description: `1d3 ${damageAbility} damage each round; cure after 1 successful save.`, duration: { kind: "fixed-rounds", rounds: 4 } },
] : [
  { level: minimumLevel, name: "Urushiol Venom", description: `1d3 ${damageAbility} damage each round; cure after 1 successful save.`, duration: { kind: "fixed-rounds", rounds: 2 } },
  { level: 14, name: "Urushiol Venom", description: `1d3 ${damageAbility} damage each round; cure after 1 successful save.`, duration: { kind: "fixed-rounds", rounds: 4 } },
];
const poisonAction = ({ id, label, minimumLevel, cost, actionType, delivery, damageAbility = "Strength" }) => ({
  id,
  label,
  classId: "druid",
  minimumLevel,
  resourceId: "urushiolVenom",
  cost,
  actionTypeByLevel: [{ level: minimumLevel, actionType }],
  recipientLabel: "Target",
  targetEffectRoll: {
    modifier: "fortitude",
    rangeByLevel: [{ level: minimumLevel, range: delivery }],
    effectsByLevel: poisonEffects(minimumLevel, damageAbility),
  },
  savingThrow: { label: "Urushiol Venom", ability: "wisdom", base: 10, levelDivisor: 2, classId: "druid" },
  summary: `Spend ${cost} dose${cost === 1 ? "" : "s"}; Fortitude negates the ${delivery} poison, which deals ${damageAbility} damage.`,
});
secretions.resourceActions = [
  poisonAction({ id: "urushiol-injury-poison", label: "Apply Injury Venom", minimumLevel: 1, cost: 1, actionType: "standard", delivery: "weapon or natural attack", damageAbility: "Strength" }),
  poisonAction({ id: "urushiol-ingested-poison", label: "Release Ingested Venom", minimumLevel: 4, cost: 1, actionType: "immediate", delivery: "creature biting or swallowing you", damageAbility: "Strength" }),
  poisonAction({ id: "urushiol-contact-poison", label: "Apply Contact Venom", minimumLevel: 7, cost: 2, actionType: "standard", delivery: "melee touch", damageAbility: "Strength" }),
  poisonAction({ id: "urushiol-inhaled-poison", label: "Release Inhaled Venom", minimumLevel: 11, cost: 3, actionType: "standard", delivery: "20-foot-radius cloud", damageAbility: "Strength" }),
  poisonAction({ id: "urushiol-injury-poison-dexterity", label: "Apply Dexterity Injury Venom", minimumLevel: 14, cost: 2, actionType: "standard", delivery: "weapon or natural attack", damageAbility: "Dexterity" }),
  poisonAction({ id: "urushiol-injury-poison-constitution", label: "Apply Constitution Injury Venom", minimumLevel: 14, cost: 2, actionType: "standard", delivery: "weapon or natural attack", damageAbility: "Constitution" }),
  poisonAction({ id: "urushiol-contact-poison-dexterity", label: "Apply Dexterity Contact Venom", minimumLevel: 14, cost: 3, actionType: "standard", delivery: "melee touch", damageAbility: "Dexterity" }),
  poisonAction({ id: "urushiol-contact-poison-constitution", label: "Apply Constitution Contact Venom", minimumLevel: 14, cost: 3, actionType: "standard", delivery: "melee touch", damageAbility: "Constitution" }),
  poisonAction({ id: "urushiol-inhaled-poison-dexterity", label: "Release Dexterity Inhaled Venom", minimumLevel: 14, cost: 4, actionType: "standard", delivery: "20-foot-radius cloud", damageAbility: "Dexterity" }),
  poisonAction({ id: "urushiol-inhaled-poison-constitution", label: "Release Constitution Inhaled Venom", minimumLevel: 14, cost: 4, actionType: "standard", delivery: "20-foot-radius cloud", damageAbility: "Constitution" }),
];
urushiol.defenseAdjustments = [
  { sourceFeatureId: secretions.id, kind: "immunity", label: "Toxic Secretions", minimumLevel: 1, base: 0, qualifier: "his own poison" },
  { sourceFeatureId: immunity.id, kind: "immunity", label: "Venom Immunity", minimumLevel: 4, base: 0, qualifier: "poison" },
];
urushiol.mechanicalCoverage = "full";
urushiol.mechanicalNotes = ["Daily venom doses, exact delivery costs and action types, level-scaled save DCs and poison duration, alternate ability damage, and poison immunities are automated."];
await save(urushiolUrl, urushiol);

console.log("Annotated Druid low-gap action batch: Feral Shifter, Season Sage, Urushiol");
