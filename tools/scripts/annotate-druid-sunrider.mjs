import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-sunrider.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const proficiency = features.find((feature) => /^Weapon and Armor Proficiencies/.test(feature.name));
const bond = features.find((feature) => /^Nature Bond/.test(feature.name));
const saddle = features.find((feature) => /^Born to the Saddle/.test(feature.name));
const terrain = features.find((feature) => /^Mounted Advantage/.test(feature.name));
const desert = features.find((feature) => /^Desert Born/.test(feature.name));
const concerted = features.find((feature) => /^Concerted Effort/.test(feature.name));

Object.assign(bond, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "druid-nature-bonds",
  optionChoiceIds: ["druid-nature-bond-animal"],
  progressionKey: "druid-nature-bond",
});
bond.progressionProfiles = [{
  id: "sunrider-mount-bond",
  label: "Sunrider Nature Bond",
  classId: "druid",
  columns: [{ id: "mount", label: "Required companion" }],
  steps: [{ level: 1, values: { mount: "Horse or pony animal companion" } }],
}];

saddle.progressionProfiles = [{
  id: "sunrider-born-to-saddle",
  label: "Born to the Saddle",
  classId: "druid",
  columns: [{ id: "ride", label: "Ride checks" }],
  steps: [{ level: 2, values: { ride: "While in light or no armor: automatic success on DC 15 or lower Ride tasks; no armor check penalty while riding the bonded mount" } }],
}];

terrain.resourceActions = [{
  id: "sunrider-mounted-advantage",
  label: "Track Mounted Advantage",
  classId: "druid",
  minimumLevel: 3,
  activeEffect: { name: "Mounted Advantage", targets: ["allies"], bonus: 0, description: "Allied mounts within 30 feet ignore rocky and sandy difficult terrain.", defaultRounds: 1, replaceExisting: true },
  summary: "Track the passive 30-foot allied-mount terrain aura during encounters.",
}];

const concertedTiers = [
  { level: 4, maximumLevel: 5, range: 60, benefits: "Evasion" },
  { level: 6, maximumLevel: 7, range: 90, benefits: "Evasion; +10-foot enhancement speed" },
  { level: 8, maximumLevel: 9, range: 120, benefits: "Evasion; +10-foot enhancement speed; devotion" },
  { level: 10, maximumLevel: 11, range: 120, benefits: "Evasion; +10-foot enhancement speed; devotion; multiattack" },
  { level: 12, maximumLevel: 13, range: 120, benefits: "Evasion; +10-foot enhancement speed; devotion; multiattack; +2 saves" },
  { level: 14, maximumLevel: 15, range: 120, benefits: "Evasion; +20-foot enhancement speed; devotion; multiattack; +2 saves" },
  { level: 16, maximumLevel: 17, range: 120, benefits: "Improved evasion; +20-foot enhancement speed; devotion; multiattack; +2 saves" },
  { level: 18, maximumLevel: 19, range: 120, benefits: "Improved evasion; +20-foot enhancement speed; devotion; multiattack; +2 saves; +2 dodge AC; +2 attacks" },
  { level: 20, maximumLevel: 20, range: 120, benefits: "Improved evasion; +20-foot enhancement speed; devotion; multiattack; +2 saves; +2 dodge AC; +2 attacks; DR 5/—; acid, cold, electricity, fire, and sonic resistance 10" },
];
concerted.progressionProfiles = [{
  id: "sunrider-concerted-effort",
  label: "Concerted Effort",
  classId: "druid",
  columns: [{ id: "range", label: "Aura" }, { id: "benefits", label: "Allied mount benefits" }],
  steps: concertedTiers.map((tier) => ({ level: tier.level, values: { range: `${tier.range} feet`, benefits: tier.benefits } })),
}];
concerted.resourceActions = [{
  id: "sunrider-concerted-effort",
  label: "Track Concerted Effort",
  classId: "druid",
  minimumLevel: 4,
  modeLabel: "Current aura tier",
  modes: concertedTiers.map((tier) => ({
    id: `level-${tier.level}`,
    label: `Level ${tier.level} · ${tier.range} feet`,
    minimumLevel: tier.level,
    maximumLevel: tier.maximumLevel,
    summary: tier.benefits,
    activeEffects: [{ target: "allies", bonus: 0, label: "Concerted Effort — allied mounts", description: tier.benefits }],
  })),
  activeEffect: { name: "Concerted Effort", targets: ["allies"], bonus: 0, description: "Allied mounts in the selected level-aware radius gain the listed cumulative benefits; the Sunrider's own mount always qualifies.", defaultRounds: 1, replaceExisting: true },
  summary: "Apply the exact cumulative allied-mount aura for the current Druid level.",
}];

archetype.proficiencyAdjustments = [
  { sourceFeatureId: proficiency.id, category: "weapon", operation: "add", proficiencies: ["Shortbow"] },
  { sourceFeatureId: proficiency.id, category: "weapon", operation: "remove", proficiencies: ["Scythe", "Sickle", "Quarterstaff"] },
];
archetype.conditionalModifiers = [
  { sourceFeatureId: saddle.id, label: "Born to the Saddle", condition: "Ride checks while riding the bonded mount in light or no armor; ignore armor check penalty", minimumLevel: 2, base: 0 },
  ...["Initiative", "Knowledge (geography)", "Perception", "Stealth", "Survival"].map((statistic) => ({ sourceFeatureId: desert.id, label: `Desert Born — ${statistic}`, condition: `${statistic} while in desert terrain`, minimumLevel: 4, base: 2 })),
  ...["Initiative", "Perception", "Survival"].map((statistic) => ({ sourceFeatureId: desert.id, label: `Desert Born allies — ${statistic}`, condition: `${statistic} for mounted allies within 30 feet while in desert terrain`, minimumLevel: 4, base: 1 })),
];
archetype.druidNatureBondOptionIds = ["druid-nature-bond-animal"];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Skill and weapon changes, the horse-or-pony bond lock, mounted Ride rules, terrain protection, every personal and allied Desert Born bonus, and all nine cumulative Concerted Effort aura tiers are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Sunrider automation.");
