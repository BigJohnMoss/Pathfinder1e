import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/skald-urban-skald.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const feature = archetype.replacements.flatMap((replacement) => replacement.features).find((candidate) => /^Raging Song/i.test(candidate.name));
if (!feature) throw new Error("Urban Skald has no Raging Song feature");
feature.level = 1;

const abilities = ["strength", "dexterity", "constitution"];
const labels = { strength: "Strength", dexterity: "Dexterity", constitution: "Constitution" };
const allocations = (total, minimumLevel) => {
  const units = total / 2;
  const rows = [];
  for (let strength = 0; strength <= units; strength += 1) for (let dexterity = 0; dexterity <= units - strength; dexterity += 1) {
    const constitution = units - strength - dexterity;
    const values = { strength: strength * 2, dexterity: dexterity * 2, constitution: constitution * 2 };
    const parts = abilities.filter((ability) => values[ability]).map((ability) => `${labels[ability]} +${values[ability]}`);
    rows.push({
      id: parts.map((part) => part.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/g, "")).join("-"),
      label: parts.join(", "), minimumLevel,
      summary: `Grant ${parts.join(", ")} as morale bonuses while Controlled Inspired Rage is maintained.`,
      activeEffects: abilities.filter((ability) => values[ability]).map((ability) => ({ target: ability, bonus: values[ability], label: `Controlled Inspired Rage — ${labels[ability]}`, description: `${labels[ability]} receives a +${values[ability]} morale bonus from Controlled Inspired Rage.` })),
    });
  }
  return rows;
};

feature.performanceRules = [
  { id: "controlled-inspired-rage", name: "Controlled Inspired Rage", minimumLevel: 1, kind: "active", summary: "Allocate the full scaling morale bonus among Strength, Dexterity, and Constitution in +2 increments for every affected ally.", resourceId: "ragingSongRounds", cost: 1, actionIds: ["urban-skald-controlled-rage"] },
  { id: "infuriating-mockery", name: "Infuriating Mockery", minimumLevel: 3, kind: "active", summary: "One foe within 30 feet, plus one additional foe at level 7 and every 4 levels thereafter, attempts a Will save against the maintained penalties.", resourceId: "ragingSongRounds", cost: 1, actionIds: ["urban-skald-infuriating-mockery", "urban-skald-infuriating-mockery-extra"] },
  { id: "humiliating-defamation", name: "Humiliating Defamation", minimumLevel: 10, kind: "active", summary: "A named primary target and secondary foes within 60 feet make Will saves against the maintained social isolation effects.", resourceId: "ragingSongRounds", cost: 1, actionIds: ["urban-skald-humiliating-primary", "urban-skald-humiliating-secondary"] },
];

const targetSave = (id, label, minimumLevel, cost, range, name, description) => ({
  id, label, minimumLevel, resourceId: "ragingSongRounds", cost,
  savingThrow: { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "skald" },
  targetEffectRoll: { modifier: "will", rangeByLevel: [{ level: minimumLevel, range }], effectsByLevel: [{ level: minimumLevel, name, description, duration: { kind: "fixed-rounds", rounds: 999 } }] },
  summary: description,
});

feature.resourceActions = [
  {
    id: "urban-skald-controlled-rage", label: "Begin Controlled Inspired Rage", minimumLevel: 1,
    resourceId: "ragingSongRounds", cost: 1, modeLabel: "Ability allocation",
    modes: [...allocations(2, 1), ...allocations(4, 8), ...allocations(6, 16)],
    activeEffect: { name: "Controlled Inspired Rage", targets: ["area"], bonus: 0, description: "The selected morale-bonus allocation applies to all affected allies.", defaultRounds: 999, fixedRounds: true, replaceExisting: true },
    summary: "Spend 1 raging song round to begin; continue spending one round for each round maintained.",
  },
  targetSave("urban-skald-infuriating-mockery", "Begin Infuriating Mockery", 3, 1, "30 feet", "Infuriating Mockery", "Target takes −2 AC and attack rolls, loses listed skill use, and must make concentration checks while in range and the performance is maintained."),
  targetSave("urban-skald-infuriating-mockery-extra", "Resolve additional Mockery target", 7, 0, "30 feet", "Infuriating Mockery", "Resolve one additional target unlocked at level 7 and every 4 levels thereafter; do not spend another song round for this target."),
  targetSave("urban-skald-humiliating-primary", "Begin Humiliating Defamation", 10, 1, "60 feet", "Humiliating Defamation — primary", "Primary target cannot benefit from morale bonuses or teamwork feats, treat creatures as allies, or waive saves against spells while it hears the maintained song."),
  targetSave("urban-skald-humiliating-secondary", "Resolve Defamation secondary target", 10, 0, "60 feet", "Humiliating Defamation — secondary", "Secondary target cannot treat the named primary target as an ally or target it with harmless effects while in range and the song is maintained."),
];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Urban Skald Raging Song.");
