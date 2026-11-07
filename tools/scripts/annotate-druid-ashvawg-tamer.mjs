import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const archetypeUrl = new URL("packages/data/src/archetypes/druid-ashvawg-tamer.json", root);
const optionUrl = new URL("packages/data/src/options/druid-ashvawg-tamer-companions.json", root);
const archetype = JSON.parse(await readFile(archetypeUrl, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const bond = find("Bestial Bond");
const variant = find("Variant Companion");
const undying = find("Undying Bond");
if (![bond, variant, undying].every(Boolean)) throw new Error("Ashvawg Tamer source features were not found");

const companionDefinitions = [
  ["darkmantle", "Darkmantle", 4, 0],
  ["krenshar", "Krenshar", 4, 0],
  ["shocker-lizard", "Shocker Lizard", 4, 0],
  ["hippogriff", "Hippogriff", 4, -3],
  ["girallon", "Girallon", 10, -9],
  ["griffon", "Griffon", 10, -9],
  ["owlbear", "Owlbear", 10, -9],
  ["sea-cat", "Sea Cat", 10, -9],
  ["bulette", "Bulette", 13, -12],
  ["chimera", "Chimera", 13, -12],
  ["worg", "Worg", 9, -6],
];
const options = companionDefinitions.map(([slug, name, minimumLevel, adjustment]) => ({
  id: `ashvawg-animal-companion-${slug}`,
  groupId: "druid-ashvawg-tamer-companions",
  name,
  classIds: ["druid"],
  minimumLevel,
  prerequisites: [{ type: "feature", id: "druid-nature-bond-animal" }],
  benefit: adjustment === 0
    ? `Gain a ${name} using full Druid level as effective companion level.`
    : `Gain a ${name} using Druid level ${adjustment} as effective companion level.`,
  companionEffectiveLevelAdjustment: adjustment,
  companionRules: [
    `Effective companion level: Druid level${adjustment ? ` ${adjustment}` : ""}.`,
    "Wild Empathy can influence this companion at a -4 penalty unless you share a language.",
    "For Intelligence 3 or higher, tricks represent understood commands regardless of language.",
  ],
  source: archetype.source,
}));
await writeFile(optionUrl, `${JSON.stringify({
  id: "druid-ashvawg-tamer-companions",
  name: "Ashvawg Tamer Monstrous Companions",
  classIds: ["druid"],
  uniqueAcrossSelections: true,
  options,
  source: archetype.source,
}, null, 2)}\n`);

const wisdomDamage = {
  label: "Wisdom damage",
  diceCountByLevel: [{ level: 4, count: 1 }],
  dieSidesByLevel: [{ level: 4, sides: 4 }],
  appliedEffect: {
    name: "Bestial Bond Wisdom Damage",
    target: "wisdom",
    operation: "penalty",
    description: "Bestial Bond dealt {amount} points of Wisdom damage. Remove this tracked damage when it is healed.",
  },
};
const bondAction = (id, label, spellId, minimumLevel) => ({
  id: `ashvawg-${id}`,
  label,
  classId: "druid",
  minimumLevel,
  actionTypeByLevel: [{ level: minimumLevel, actionType: "standard" }],
  spellLikeAbility: { spellId, spellName: label, cadence: "at-will", kind: "spell-like" },
  diceRoll: { ...wisdomDamage, diceCountByLevel: [{ level: minimumLevel, count: 1 }], dieSidesByLevel: [{ level: minimumLevel, sides: 4 }] },
  confirmations: [
    { id: "animal-companion-target", label: "Target is your animal companion", requiredForActivation: true },
    { id: "wisdom-damage-applies", label: "Nothing prevents the required Wisdom damage", requiredForActivation: true },
  ],
  summary: `Cast ${label.toLowerCase()} on your animal companion and automatically roll and track the required 1d4 Wisdom damage.`,
});
bond.resourceActions = [
  bondAction("cure-serious-wounds", "Cure Serious Wounds", "cure-serious-wounds", 4),
  bondAction("neutralize-poison", "Neutralize Poison", "neutralize-poison", 4),
  bondAction("remove-disease", "Remove Disease", "remove-disease", 4),
];
undying.resourceActions = [bondAction("resurrection", "Resurrection", "resurrection", 6)];

variant.type = "core";
variant.progressionProfiles = [{
  id: "ashvawg-variant-companions",
  label: "Monstrous Companion Access",
  classId: "druid",
  columns: [{ id: "choices", label: "New choices" }, { id: "effectiveLevel", label: "Effective companion level" }],
  steps: [
    { level: 4, values: { choices: "Darkmantle, krenshar, shocker lizard; hippogriff", effectiveLevel: "Full Druid level; hippogriff uses Druid level - 3" } },
    { level: 9, values: { choices: "Worg", effectiveLevel: "Druid level - 6" } },
    { level: 10, values: { choices: "Girallon, griffon, owlbear, sea cat", effectiveLevel: "Druid level - 9" } },
    { level: 13, values: { choices: "Bulette, chimera", effectiveLevel: "Druid level - 12" } },
  ],
  summary: "The Animal Companion selector unlocks each monstrous option at its legal class level and the companion sheet applies its individual effective-level penalty.",
}];

archetype.classSkillAdditions = ["Intimidate", "Knowledge (arcana)"];
archetype.classSkillRemovals = ["Diplomacy", "Heal"];
archetype.optionGroupAugmentations = [{ targetGroupId: "ranger-animal-companions", sourceGroupId: "druid-ashvawg-tamer-companions" }];
archetype.wildShapeUseAdjustments = [{ level: 6, delta: -1 }];
archetype.wildEmpathyAdjustments = [{
  sourceFeatureId: variant.id,
  label: "Variant Companion Wild Empathy",
  classId: "druid",
  minimumLevel: 4,
  bonus: -4,
  targets: "your Ashvawg Tamer monstrous companion",
  condition: "unless you and the companion share a language",
}];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = [
  "Class-skill exchanges, all eleven level-gated monstrous companion choices and their effective-level adjustments, variant-companion Wild Empathy, Bestial Bond and Undying Bond spell-like actions with rolled persistent Wisdom damage, and the lost level-6 Wild Shape use are automated.",
];
await writeFile(archetypeUrl, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Ashvawg Tamer automation.");
