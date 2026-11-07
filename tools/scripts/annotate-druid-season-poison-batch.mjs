import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const archetypeUrl = (id) => new URL(`packages/data/src/archetypes/${id}.json`, root);
const load = async (url) => JSON.parse(await readFile(url, "utf8"));
const save = (url, value) => writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
const features = (record) => record.replacements.flatMap((replacement) => replacement.features ?? []);
const named = (record, pattern) => features(record).find((feature) => pattern.test(feature.name));
const tracker = (name, targets, description, defaultRounds = 999, bonus = 0) => ({ name, targets, bonus, description, defaultRounds, fixedRounds: true });

const mantellaUrl = archetypeUrl("druid-mantella");
const mantella = await load(mantellaUrl);
const poisonAffinity = named(mantella, /^Poison Affinity/);
const toxicDiet = named(mantella, /^Toxic Diet/);
if (!poisonAffinity || !toxicDiet) throw new Error("Mantella features were not found");
mantella.resourceAdjustments = [{
  resourceId: "toxicDiet",
  label: "Toxic Diet",
  unit: "use",
  operation: "add",
  minimumLevel: 6,
  base: 3,
  perInterval: 1,
  interval: 2,
  minimum: 3,
  maximum: 10,
  refreshCadence: "day",
  dedicatedAction: true,
}];
poisonAffinity.resourceActions = [{
  id: "mantella-poisonous-wild-shape",
  label: "Assume Poisonous Wild Shape",
  classId: "druid",
  minimumLevel: 4,
  resourceId: "wildShape",
  cost: 1,
  actionTypeByLevel: [{ level: 4, actionType: "standard" }],
  confirmations: [{ id: "poison-form", label: "The selected non-elemental form has a poison ability", requiredForActivation: true }],
  activeEffect: tracker("Poisonous Wild Shape", ["self"], "Gain every poison ability of the selected wild-shape form. Elemental forms are prohibited."),
  summary: "Spend 1 wild shape use, confirm a poisonous non-elemental form, and track its poison abilities.",
}];
toxicDiet.resourceActions = [
  {
    id: "mantella-absorb-poison",
    label: "Absorb Exposed Poison",
    classId: "druid",
    minimumLevel: 6,
    resourceId: "toxicDiet",
    cost: 1,
    actionTypeByLevel: [{ level: 6, actionType: "immediate" }],
    activeEffect: tracker("Stored Poison", ["self"], "The absorbed poison is stored internally for up to 1 day and can be secreted onto all natural attacks."),
    summary: "Spend 1 daily use as an immediate action to absorb and store an encountered poison.",
  },
  {
    id: "mantella-secrete-poison",
    label: "Secrete Stored Poison",
    classId: "druid",
    minimumLevel: 6,
    resourceId: "toxicDiet",
    cost: 0,
    actionTypeByLevel: [{ level: 6, actionType: "swift" }],
    confirmations: [{ id: "stored-poison", label: "A dose of poison is currently stored", requiredForActivation: true }],
    activeEffect: tracker("Poisoned Natural Attacks", ["self"], "The stored poison becomes injury poison and is applied to all natural attacks; remove this tracker when the dose is discharged."),
    summary: "As a swift action, convert the stored dose to injury poison on all natural attacks.",
  },
];
mantella.defenseAdjustments = [{
  sourceFeatureId: toxicDiet.id,
  kind: "immunity",
  label: "Toxic Diet",
  minimumLevel: 6,
  base: 0,
  qualifier: "poison (self and animal companion)",
}];
mantella.mechanicalCoverage = "full";
mantella.mechanicalNotes = ["Poison-bearing wild shape, elemental-form exclusion, the scaling Toxic Diet pool, poison storage and secretion, and poison immunity are automated."];
await save(mantellaUrl, mantella);

const keeperUrl = archetypeUrl("druid-season-keeper");
const keeper = await load(keeperUrl);
const natureBond = named(keeper, /^Nature Bond/);
const wildShape = named(keeper, /^Wild Shape/);
if (!natureBond || !wildShape) throw new Error("Season Keeper features were not found");
keeper.druidNatureBondOptionIds = ["druid-nature-bond-animal"];
keeper.requirements = [{ type: "ancestry", id: "triaxian" }];
keeper.manualRequirements = [];
keeper.wildShapeLevelAdjustment = -2;
keeper.resourceAdjustments = [{
  resourceId: "seasonalSpirit",
  label: "Seasonal Spirit Choice",
  unit: "imbuement",
  operation: "add",
  minimumLevel: 1,
  base: 1,
  minimum: 1,
  maximum: 1,
  refreshCadence: "day",
  dedicatedAction: true,
}];
const spiritModes = [
  {
    id: "summer",
    label: "Spirit of Summer",
    summary: "15-foot cooling and vigor aura; improves healing at level 3 and natural-terrain movement at levels 9 and 15.",
    defaultRounds: 999,
    activeEffects: [{ target: "allies", bonus: 0, label: "Spirit of Summer Aura", description: "Comfort in heat; at level 9 leave no natural grass/forest trail; at level 15 ignore natural-undergrowth difficult terrain." }],
  },
  {
    id: "winter",
    label: "Spirit of Winter",
    summary: "15-foot warmth and calm aura; cold resistance 10 at level 3 and 20 at level 15, plus snow and ice benefits.",
    defaultRounds: 999,
    activeEffects: [{ target: "allies", bonus: 0, label: "Spirit of Winter Aura", description: "Comfort in cold; cold resistance 10 at level 3 (20 at level 15); at level 9 leave no snow/ice trail; at level 15 ignore ice/snow difficult terrain." }],
  },
];
natureBond.resourceActions = [
  {
    id: "season-keeper-imbue-spirit",
    label: "Imbue Seasonal Spirit",
    classId: "druid",
    minimumLevel: 1,
    resourceId: "seasonalSpirit",
    cost: 1,
    actionTypeByLevel: [{ level: 1, actionType: "1-hour" }],
    modeLabel: "Spirit",
    modes: spiritModes,
    activeEffect: tracker("Seasonal Spirit", ["self"], "The chosen spirit is imbued in the animal companion until the next daily preparation.", 999),
    summary: "During daily spell preparation, choose Summer or Winter and track its companion aura.",
  },
];
const healingModes = (multiplier) => Array.from({ length: 9 }, (_, index) => {
  const spellLevel = index + 1;
  return {
    id: `spell-level-${spellLevel}`,
    label: `Level ${spellLevel} healing spell`,
    summary: `Grant fast healing 2 for ${spellLevel * multiplier} round${spellLevel * multiplier === 1 ? "" : "s"}.`,
    defaultRounds: spellLevel * multiplier,
    activeEffects: [{ target: "allies", bonus: 0, fastHealing: 2, label: "Spirit of Summer Healing", description: `Fast healing 2 from a level-${spellLevel} healing spell.` }],
  };
});
natureBond.resourceActions.push(
  {
    id: "season-keeper-summer-healing",
    label: "Apply Summer Healing Rider",
    classId: "druid",
    minimumLevel: 3,
    maximumLevel: 14,
    actionTypeByLevel: [{ level: 3, actionType: "free" }],
    confirmations: [{ id: "summer-spirit", label: "Spirit of Summer is active and a healing spell targeted an ally", requiredForActivation: true }],
    modeLabel: "Healing spell level",
    modes: healingModes(1),
    activeEffect: tracker("Summer Healing Rider", ["allies"], "Apply the selected healing spell's fast-healing rider.", 1),
    summary: "Track fast healing 2 for rounds equal to the triggering healing spell's level.",
  },
  {
    id: "season-keeper-greater-summer-healing",
    label: "Apply Greater Summer Healing Rider",
    classId: "druid",
    minimumLevel: 15,
    actionTypeByLevel: [{ level: 15, actionType: "free" }],
    confirmations: [{ id: "summer-spirit", label: "Spirit of Summer is active and a healing spell targeted an ally", requiredForActivation: true }],
    modeLabel: "Healing spell level",
    modes: healingModes(2),
    activeEffect: tracker("Greater Summer Healing Rider", ["allies"], "Apply the selected healing spell's improved fast-healing rider.", 2),
    summary: "Track fast healing 2 for twice the triggering healing spell's level in rounds.",
  },
);
const shapeAction = (id, label, confirmation, description) => ({
  id,
  label,
  classId: "druid",
  minimumLevel: 6,
  resourceId: "wildShape",
  cost: 1,
  actionTypeByLevel: [{ level: 6, actionType: "standard" }],
  confirmations: confirmation ? [{ id: confirmation.id, label: confirmation.label, requiredForActivation: true }] : undefined,
  activeEffect: tracker(label, ["self"], description),
  summary: description,
});
wildShape.resourceActions = [
  shapeAction("season-keeper-summer-plant-shape", "Assume Summer Plant Shape", { id: "summer-spirit", label: "Spirit of Summer is active" }, "Spend 1 wild shape use and resolve the plant form at full druid level."),
  shapeAction("season-keeper-winter-ice-shape", "Assume Winter Ice Elemental Shape", { id: "winter-spirit", label: "Spirit of Winter is active" }, "Spend 1 wild shape use and resolve the ice-elemental form at full druid level."),
  shapeAction("season-keeper-other-shape", "Assume Other Permitted Shape", null, "Spend 1 wild shape use and resolve a non-plant, non-elemental form at druid level –2."),
];
wildShape.progressionProfiles = [{
  id: "season-keeper-wild-shape-levels",
  label: "Seasonal Wild Shape Effective Level",
  classId: "druid",
  columns: [{ id: "general", label: "Other permitted forms" }, { id: "seasonal", label: "Matching seasonal form" }],
  steps: Array.from({ length: 15 }, (_, index) => ({ level: index + 6, values: { general: index + 4, seasonal: index + 6 } })),
  summary: "General forms use druid level –2; matching Summer plant and Winter ice-elemental forms use full druid level.",
}];
keeper.mechanicalCoverage = "full";
keeper.mechanicalNotes = ["The Triaxian ancestry requirement, animal-companion-only Nature Bond, daily seasonal choice and scaling auras, healing riders, restricted wild-shape forms, costs, and effective levels are automated."];
await save(keeperUrl, keeper);

console.log("Annotated Druid season/poison batch: Mantella, Season Keeper");
