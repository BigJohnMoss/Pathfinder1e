import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-aerie-protector.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const bond = find("Nature Bond");
const empathy = find("Wild Empathy");
const skyStone = find("Sky and Stone");
const wind = find("Wind at Her Back");
const wildShape = find("Wild Shape");
const inWind = find("In the Wind");

Object.assign(bond, { type: "selectable", choiceRequired: true, optionGroupId: "druid-nature-bonds", optionChoiceIds: ["druid-nature-bond-animal", "druid-nature-bond-domain"], progressionKey: "druid-nature-bond" });
empathy.resourceActions = [
  { id: "aerie-protector-empathy-flying", label: "Wild Empathy — Flying Animal", classId: "druid", minimumLevel: 1, diceRoll: { label: "Wild Empathy check", diceCountByLevel: [{ level: 1, count: 1 }], dieSidesByLevel: [{ level: 1, sides: 20 }], modifierInputLabel: "Druid level + Charisma modifier + 4", targetDcInputLabel: "Animal attitude DC", outcomesByMargin: [{ minimumMargin: 0, label: "attitude improves" }], failureLabel: "attitude unchanged" }, summary: "Influence a flying animal with the +4 archetype bonus." },
  { id: "aerie-protector-empathy-other", label: "Wild Empathy — Other Animal", classId: "druid", minimumLevel: 1, diceRoll: { label: "Wild Empathy check", diceCountByLevel: [{ level: 1, count: 1 }], dieSidesByLevel: [{ level: 1, sides: 20 }], modifierInputLabel: "Druid level + Charisma modifier − 4", targetDcInputLabel: "Animal attitude DC", outcomesByMargin: [{ minimumMargin: 0, label: "attitude improves" }], failureLabel: "attitude unchanged" }, summary: "Influence a nonflying animal with the mandatory −4 penalty." }
];
skyStone.progressionProfiles = [{ id: "aerie-protector-sky-stone", label: "Sky and Stone", classId: "druid", columns: [{ id: "bonus", label: "Geography and Survival" }, { id: "tracking", label: "Tracking" }], steps: Array.from({ length: 10 }, (_, index) => { const level = (index + 1) * 2; return { level, values: { bonus: `+${Math.floor(level / 2)}`, tracking: "Cannot be tracked in mountains or at high altitude" } }; }) }];
wind.progressionProfiles = [{ id: "aerie-protector-wind-back", label: "Wind at Her Back", classId: "druid", columns: [{ id: "bonus", label: "Bonus" }, { id: "applies", label: "Applies to" }], steps: [{ level: 4, values: { bonus: "+4", applies: "CMD and saves vs altitude/air pressure/wind; Reflex vs electricity damage" } }] }];
wildShape.progressionProfiles = [{ id: "aerie-protector-wild-shape", label: "Aerie Protector Wild Shape", classId: "druid", columns: [{ id: "flying", label: "Flying animal" }, { id: "other", label: "Other legal form" }], steps: [{ level: 6, values: { flying: "Druid level + 2", other: "Druid level − 2" } }] }];
wildShape.resourceActions = [
  { id: "aerie-protector-flying-wild-shape", label: "Use Flying-Animal Wild Shape", classId: "druid", minimumLevel: 6, resourceId: "wildShape", cost: 1, actionTypeByLevel: [{ level: 6, actionType: "standard" }], confirmations: [{ id: "flying-animal", label: "Selected form is an animal with a fly speed", requiredForActivation: true }], activeEffect: { name: "Aerie Protector Flying Wild Shape", targets: ["self"], bonus: 0, description: "Assume a flying animal form at effective Druid level +2.", defaultRoundsByLevel: Array.from({ length: 15 }, (_, i) => ({ level: i + 6, rounds: (i + 8) * 600 })), replaceExisting: true }, summary: "Spend one adjusted Wild Shape use with the flying-animal effective-level bonus." },
  { id: "aerie-protector-other-wild-shape", label: "Use Other Wild Shape", classId: "druid", minimumLevel: 6, resourceId: "wildShape", cost: 1, actionTypeByLevel: [{ level: 6, actionType: "standard" }], confirmations: [{ id: "legal-form", label: "Selected form is legal at effective Druid level −2", requiredForActivation: true }], activeEffect: { name: "Aerie Protector Wild Shape", targets: ["self"], bonus: 0, description: "Assume a legal form at effective Druid level −2.", defaultRoundsByLevel: Array.from({ length: 15 }, (_, i) => ({ level: i + 6, rounds: (i + 4) * 600 })), replaceExisting: true }, summary: "Spend one adjusted Wild Shape use at the reduced effective level." }
];
inWind.progressionProfiles = [{ id: "aerie-protector-in-wind", label: "In the Wind", classId: "druid", columns: [{ id: "speeds", label: "Wild Shape speeds" }, { id: "flight", label: "Flying maneuverability" }], steps: [{ level: 9, values: { speeds: "Climb and fly +10 feet", flight: "Improve by one category" } }] }];
inWind.resourceActions = [{ id: "aerie-protector-track-in-wind", label: "Track In the Wind", classId: "druid", minimumLevel: 9, requiredActiveEffectName: "Aerie Protector Flying Wild Shape", activeEffect: { name: "In the Wind", targets: ["self"], bonus: 0, description: "While Wild Shaped, climb and fly speeds increase by 10 feet; flying maneuverability improves by one category.", defaultRounds: 1, replaceExisting: true }, summary: "Record the movement upgrade while a qualifying Wild Shape effect is active." }];

archetype.druidNatureBondOptionIds = ["druid-nature-bond-animal", "druid-nature-bond-domain"];
archetype.druidAnimalCompanionIds = ["ranger-animal-companion-bird", "ranger-animal-companion-bat"];
archetype.druidDomainIds = ["domain-air", "domain-eagle", "domain-earth", "domain-mountain", "domain-weather"];
archetype.optionGroupAugmentations = [
  { targetGroupId: "cleric-domains", sourceGroupId: "drovier-domains" },
  { targetGroupId: "cleric-domains", sourceGroupId: "aerie-protector-domains" }
];
archetype.wildShapeUseAdjustments = [{ level: 6, delta: -1 }];
archetype.skillBonusAdjustments = ["Knowledge (geography)", "Survival"].map((skill) => ({ sourceFeatureId: skyStone.id, skill, minimumLevel: 2, base: 0, levelDivisor: 2, condition: "checks involving mountainous terrain or high altitude" }));
archetype.conditionalModifiers = [
  { sourceFeatureId: wind.id, label: "Wind at Her Back — CMD and saves", condition: "CMD or saving throws against high altitude, air pressure, or strong wind that moves the Aerie Protector or impedes flight", minimumLevel: 4, base: 4 },
  { sourceFeatureId: wind.id, label: "Wind at Her Back — electricity", condition: "Reflex saves against effects that deal electricity damage", minimumLevel: 4, base: 4 }
];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Proficiency changes, flying-companion and five-domain Nature Bond restrictions, both Wild Empathy cases, mountain skill scaling and track immunity, Wind at Her Back defenses, reduced and flying-animal Wild Shape paths, and In the Wind movement upgrades are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Aerie Protector automation.");
