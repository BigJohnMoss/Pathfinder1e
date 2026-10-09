import { readFile, writeFile } from "node:fs/promises";

const archetypeUrl = new URL("../../packages/data/src/archetypes/druid-skinshaper.json", import.meta.url);
const archetype = JSON.parse(await readFile(archetypeUrl, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const skinshaping = features.find((feature) => /^Skinshaping/.test(feature.name));
const flashmorph = features.find((feature) => /^Flashmorph/.test(feature.name));
if (!skinshaping || !flashmorph) throw new Error("Skinshaper features were not found");

const abilities = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const abilityLabels = Object.fromEntries(abilities.map((ability) => [ability, ability.slice(0, 3).replace(/^./, (letter) => letter.toUpperCase())]));
const distributions = (increments) => {
  const results = [];
  const visit = (index, remaining, values) => {
    if (index === abilities.length) {
      if (remaining === 0) results.push([...values]);
      return;
    }
    for (let value = 0; value <= Math.min(2, remaining); value += 1) visit(index + 1, remaining - value, [...values, value]);
  };
  visit(0, increments, []);
  return results;
};
const enhancementTiers = [
  { level: 6, maximumLevel: 9, increments: 1 },
  { level: 10, maximumLevel: 13, increments: 2 },
  { level: 14, maximumLevel: 17, increments: 3 },
  { level: 18, maximumLevel: 20, increments: 4 },
];
const enhancementModes = [{
  id: "skinshaping-no-enhancement",
  label: "No enhancement bonus",
  minimumLevel: 4,
  maximumLevel: 5,
  summary: "Skinshaping gains enhancement bonuses beginning at 6th level.",
}];
for (const tier of enhancementTiers) {
  for (const values of distributions(tier.increments)) {
    const entries = abilities.map((ability, index) => ({ ability, increments: values[index] })).filter((entry) => entry.increments > 0);
    enhancementModes.push({
      id: `skinshaping-${tier.level}-${values.join("-")}`,
      label: entries.map(({ ability, increments }) => `${abilityLabels[ability]} +${increments * 2}`).join(" / "),
      minimumLevel: tier.level,
      maximumLevel: tier.maximumLevel,
      summary: "Legal +2 enhancement-bonus distribution; no ability exceeds +4.",
      activeEffects: entries.map(({ ability, increments }) => ({
        target: ability,
        bonus: increments * 2,
        label: `Skinshaping ${ability}`,
        description: `Skinshaping enhancement bonus to ${ability}.`,
      })),
    });
  }
}

const durationByLevel = Array.from({ length: 17 }, (_, index) => ({ level: index + 4, rounds: (index + 4) * 600 }));
const skills = [
  "Acrobatics", "Appraise", "Bluff", "Climb", "Craft", "Diplomacy", "Disable Device", "Disguise", "Escape Artist", "Fly", "Handle Animal", "Heal", "Intimidate",
  "Knowledge (arcana)", "Knowledge (dungeoneering)", "Knowledge (engineering)", "Knowledge (geography)", "Knowledge (history)", "Knowledge (local)", "Knowledge (nature)", "Knowledge (nobility)", "Knowledge (planes)", "Knowledge (religion)",
  "Linguistics", "Perception", "Perform", "Profession", "Ride", "Sense Motive", "Sleight of Hand", "Spellcraft", "Stealth", "Survival", "Swim", "Use Magic Device",
];

skinshaping.resourceActions = [{
  id: "skinshaper-assume-humanoid-form",
  label: "Assume Humanoid Form",
  classId: "druid",
  minimumLevel: 4,
  resourceId: "skinshapingUses",
  cost: 1,
  modeLabel: "Enhancement distribution",
  modes: enhancementModes,
  actionTypeByLevel: [{ level: 4, actionType: "standard" }, { level: 13, actionType: "swift" }],
  activeEffect: {
    name: "Skinshaping",
    targets: ["self"],
    bonus: 0,
    description: "Small or Medium humanoid form via alter self. Grants Improved Unarmed Strike and monk unarmed damage using druid level − 3.",
    grantedFeatIds: ["improved-unarmed-strike"],
    defaultRounds: 999,
    defaultRoundsByLevel: durationByLevel,
    fixedRounds: true,
    replaceExisting: true,
  },
  summary: "Assume a familiar Small or Medium humanoid form for 1 hour per druid level; at 13th level this becomes a swift action.",
}, {
  id: "skinshaper-form-trait",
  label: "Apply Form Trait",
  classId: "druid",
  minimumLevel: 8,
  requiredActiveEffectName: "Skinshaping",
  modeLabel: "Trait present on assumed form",
  modes: [
    ["darkvision-90", "Darkvision 90 feet"], ["low-light-vision", "Low-light vision"], ["scent", "Scent"],
    ["climb-60", "Climb 60 feet"], ["fly-60-good", "Fly 60 feet (good)"], ["swim-60", "Swim 60 feet"],
    ["ferocity", "Ferocity"], ["orc-ferocity", "Orc ferocity"], ["hold-breath", "Hold breath"], ["aquatic-amphibious", "Aquatic subtype and amphibious"],
  ].map(([id, label]) => ({ id: `skinshaping-trait-${id}`, label, summary: `Copy ${label} from the assumed form.`, activeEffects: [{ target: "self", bonus: 0, label: `Skinshaping trait — ${label}`, description: `The assumed form grants ${label}.` }] })),
  actionTypeByLevel: [{ level: 8, actionType: "free" }],
  activeEffect: { name: "Skinshaping Form Trait", targets: ["self"], bonus: 0, description: "Tracks the copied movement, sense, or racial form trait.", defaultRounds: 999, defaultRoundsByLevel: durationByLevel, fixedRounds: true, replaceExisting: true },
  summary: "Apply one listed ability actually possessed by the assumed humanoid form; reactivate to change the tracked trait.",
}, {
  id: "skinshaper-racial-memory",
  label: "Apply Racial Memory",
  classId: "druid",
  minimumLevel: 12,
  requiredActiveEffectName: "Skinshaping",
  modeLabel: "Racial ability present on assumed form",
  modes: ["Defensive training", "Hatred", "Poison use", "Sneak attack +2d6", "Stability", "Weapon familiarity", "Racial languages"].map((label) => ({
    id: `skinshaping-memory-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
    label,
    summary: `Copy ${label} from the assumed form's racial memory.`,
    activeEffects: [{ target: "self", bonus: 0, label: `Skinshaping racial memory — ${label}`, description: `The assumed form grants ${label}.` }],
  })),
  actionTypeByLevel: [{ level: 12, actionType: "free" }],
  activeEffect: { name: "Skinshaping Racial Memory", targets: ["self"], bonus: 0, description: "Tracks the racial memory copied from the assumed humanoid form.", defaultRounds: 999, defaultRoundsByLevel: durationByLevel, fixedRounds: true, replaceExisting: true },
  summary: "Apply a listed racial ability or languages actually possessed by the assumed form.",
}, {
  id: "skinshaper-racial-skill-bonus",
  label: "Apply Racial Skill Bonus",
  classId: "druid",
  minimumLevel: 16,
  requiredActiveEffectName: "Skinshaping",
  modeLabel: "Bonus on assumed form",
  modes: [1, 2, 3, 4].map((bonus) => ({ id: `skinshaping-skill-${bonus}`, label: `+${bonus}`, summary: `Apply the form's +${bonus} racial bonus to the selected skill.`, activeEffects: [{ target: "skillChecks", bonus, label: "Skinshaping racial skill bonus", description: `Racial skill bonus copied from the assumed form, capped at +4.` }] })),
  actionTypeByLevel: [{ level: 16, actionType: "free" }],
  activeEffect: { name: "Skinshaping Racial Skill", targets: ["self"], bonus: 0, skillOptions: skills, description: "Tracks a non-variable racial skill bonus from the assumed humanoid form.", defaultRounds: 999, defaultRoundsByLevel: durationByLevel, fixedRounds: true, replaceExisting: true },
  summary: "Choose a non-variable racial skill bonus actually possessed by the form, capped at +4.",
}];

archetype.resourceAdjustments = [{
  resourceId: "skinshapingUses",
  label: "Skinshaping",
  unit: "use",
  operation: "add",
  minimumLevel: 4,
  base: 0,
  maximumByLevel: [4, 6, 8, 10, 12, 14, 16, 18].map((level, index) => ({ level, maximum: index + 1 })),
  atWillAtLevel: 20,
  refreshCadence: "day",
  dedicatedAction: true,
}];
archetype.unarmedDamageProgressions = [{
  sourceFeatureId: skinshaping.id,
  classId: "druid",
  minimumLevel: 4,
  levelAdjustment: -3,
  requiredActiveEffectName: "Skinshaping",
  grantsImprovedUnarmedStrike: true,
}];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = [
  "Skinshaping uses, at-will level, duration, Flashmorph action speed, all legal enhancement distributions, copied form traits, racial memory, racial skill bonuses, and conditional monk unarmed damage are automated.",
];

await writeFile(archetypeUrl, `${JSON.stringify(archetype, null, 2)}\n`);
console.log(`Annotated Skinshaper automation with ${enhancementModes.length} legal enhancement distributions.`);
