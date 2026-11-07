import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const archetypeUrl = new URL("packages/data/src/archetypes/druid-survivor.json", root);
const optionUrl = new URL("packages/data/src/options/druid-survivor-traps.json", root);
const archetype = JSON.parse(await readFile(archetypeUrl, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const surprise = find("Element of Surprise");
const trap = find("Trap") ?? features.find((feature) => feature.id === "druid-survivor-ranger-trap-4");
const launch = find("Launch Trap");
if (![surprise, trap, launch].every(Boolean)) throw new Error("Survivor source features were not found");

const definitions = [
  ["alarm", "Alarm Trap", "Modifier: add a momentary loud noise equivalent to audible alarm when the underlying trap triggers.", true, true, true],
  ["burning", "Burning Trap", "Modifier for a fire trap: a failed Reflex save catches the target on fire for 1d4 rounds, dealing 1d6 fire damage at the start of each turn.", true, true, true],
  ["exploding", "Exploding Trap", "Modifier for a fire trap: adjacent squares take 1d6 + half Druid level fire damage; Reflex negates.", true, true, true],
  ["fire", "Fire Trap", "Deal 1d6 + half Druid level fire damage to the triggering creature; Reflex negates.", false, true, true],
  ["freezing", "Freezing Trap", "Deal 1d3 + one-quarter Druid level cold damage and entangle the target; Reflex halves damage and prevents it being stuck to the ground.", false, false, true],
  ["marking", "Marking Trap", "Modifier: mark a creature that fails its save with dye or scent; a scent mark reduces scent-tracking DC by 4.", true, true, true],
  ["poison", "Poison Trap", "Supernatural poison deals 1d2 Constitution damage each round for 6 rounds; an extraordinary version delivers a supplied poison.", false, true, true],
  ["sleet", "Sleet Trap", "Create a 20-foot-radius sleet storm for 1 round; icy ground persists for 1 round per Druid level.", false, false, true],
  ["snare", "Snare Trap", "Immobilize a creature that fails Reflex; Escape Artist uses the trap DC, the leash has half Druid level hit points, and Strength DC 25 bursts it.", false, true, true],
  ["swarm", "Swarm Trap", "Release a bat, rat, or spider swarm for up to 1 round per Druid level.", false, true, true],
];
const options = definitions.map(([slug, name, benefit]) => ({
  id: `survivor-trap-${slug}`,
  groupId: "druid-survivor-traps",
  name,
  classIds: ["druid"],
  minimumLevel: 4,
  prerequisites: [],
  benefit,
  source: archetype.source,
}));
await writeFile(optionUrl, `${JSON.stringify({ id: "druid-survivor-traps", name: "Survivor Ranger Traps", classIds: ["druid"], uniqueAcrossSelections: true, options, source: archetype.source }, null, 2)}\n`);

const selectableIds = options.filter((option) => option.id !== "survivor-trap-snare").map((option) => option.id);
const choiceLevels = [4, 6, 8, 10, 12, 14, 16, 18, 20];
const occurrences = choiceLevels.map((level, index) => ({
  ...(index === 0 ? trap : {}),
  id: `druid-survivor-ranger-trap-${level}`,
  name: `Ranger Trap ${index + 1}`,
  level,
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "druid-survivor-traps",
  optionChoiceIds: selectableIds,
  progressionKey: "survivor-ranger-traps",
  summary: index === 0
    ? "You automatically know Snare Trap. Choose one additional unique ranger trap; all trap controls share the Survivor's daily pool."
    : "Choose another unique ranger trap. A learned trap cannot be exchanged or selected more than once.",
}));
for (const replacement of archetype.replacements) {
  const rebuilt = [];
  for (const feature of replacement.features ?? []) {
    if (feature.id === trap.id || feature.id.startsWith("druid-survivor-ranger-trap-")) {
      if (!rebuilt.some((candidate) => candidate.id === occurrences[0].id)) rebuilt.push(...occurrences);
    } else rebuilt.push(feature);
  }
  replacement.features = rebuilt;
}
const primaryTrapFeature = occurrences[0];

const magicalRounds = Array.from({ length: 17 }, (_, index) => ({ level: index + 4, rounds: (index + 4) * 600 }));
const extraordinaryRounds = Array.from({ length: 17 }, (_, index) => ({ level: index + 4, rounds: (index + 4) * 14400 }));
const setAction = ([slug, name, benefit, modifier, extraordinary, supernatural], kind) => {
  const magical = kind === "magical";
  const option = `survivor-trap-${slug}`;
  return {
    id: `survivor-set-${slug}-${kind}`,
    label: `Set ${magical ? "magical" : "extraordinary"} ${name}`,
    classId: "druid",
    minimumLevel: 4,
    resourceId: "survivorTraps",
    cost: modifier ? 2 : 1,
    ...(slug === "snare" ? {} : { requiredOptionId: option }),
    actionTypeByLevel: [{ level: 4, actionType: "full-round" }],
    confirmations: modifier ? [{ id: "base-trap", label: `A legal base trap${["burning", "exploding"].includes(slug) ? " (Fire Trap)" : ""} is included and spends the second trap use`, requiredForActivation: true }] : undefined,
    savingThrow: slug === "alarm" ? undefined : { label: magical ? "Trap save" : "Extraordinary trap save", ability: "wisdom", base: magical ? 10 : 8, levelDivisor: 2, classId: "druid" },
    activeEffect: {
      name: `Survivor ${name}`,
      targets: ["area"],
      bonus: 0,
      description: `${benefit} ${magical ? "Magical duration is 1 hour per Druid level." : "Extraordinary duration is 1 day per Druid level and its DC is 2 lower."}`,
      defaultRoundsByLevel: magical ? magicalRounds : extraordinaryRounds,
      replaceExisting: false,
    },
    summary: `Spend ${modifier ? "two uses (one for the base trap and one for the modifier)" : "one use"}; the control calculates the ${magical ? "normal" : "-2 extraordinary"} trap DC and tracks its duration.`,
  };
};
primaryTrapFeature.resourceActions = definitions.flatMap((definition) => {
  const [, , , , extraordinary, supernatural] = definition;
  return [...(extraordinary ? [setAction(definition, "extraordinary")] : []), ...(supernatural ? [setAction(definition, "magical")] : [])];
});
primaryTrapFeature.progressionProfiles = [{
  id: "survivor-trap-progression", label: "Ranger Traps Known", classId: "druid",
  columns: [{ id: "known", label: "Total traps known" }, { id: "dc", label: "Magical trap DC" }, { id: "uses", label: "Daily pool" }],
  steps: choiceLevels.map((level, index) => ({ level, values: { known: index + 2, dc: `10 + ${Math.floor(level / 2)} + Wisdom modifier`, uses: `floor(${level} / 2) + Wisdom modifier` } })),
  summary: "Snare Trap is automatic; each selector adds one different trap. Extraordinary traps use DC 2 lower.",
}];

surprise.numericInputEffect = undefined;
surprise.resourceActions = [{
  id: "survivor-element-of-surprise", label: "Apply Element of Surprise", classId: "druid", minimumLevel: 4,
  actionTypeByLevel: [{ level: 4, actionType: "free" }],
  confirmations: [{ id: "surprise-attack", label: "The attack hit an unaware target during the surprise round", requiredForActivation: true }],
  numericInputEffect: {
    label: "Damage dealt", minimum: 1, maximum: 999, divisor: 2, maximumClassLevel: true,
    name: "Element of Surprise", target: "enemy", operation: "penalty",
    description: "The target takes a -{amount} penalty on its initiative check next round after taking {input} damage; its initiative result cannot fall below 1.", rounds: 1,
  },
  summary: "Enter damage from the qualifying attack; the tracker halves it, caps it at Druid level, and applies the exact one-round initiative penalty.",
}];

const launchModes = definitions.map(([slug, name, , modifier]) => ({
  id: `launch-${slug}`, label: name, summary: modifier ? "Launch this modifier with a legal underlying magical trap; the combined trap costs two uses." : "Launch this learned magical trap for one use.",
  ...(slug === "snare" ? {} : { requiredOptionId: `survivor-trap-${slug}` }),
}));
launch.resourceActions = [
  {
    id: "survivor-launch-standard-trap", label: "Create launched magical trap", classId: "druid", minimumLevel: 9,
    resourceId: "survivorTraps", cost: 1, actionTypeByLevel: [{ level: 9, actionType: "full-round" }],
    modeLabel: "Learned standard trap", modes: launchModes.filter((mode) => !["launch-alarm", "launch-burning", "launch-exploding", "launch-marking"].includes(mode.id)),
    confirmations: [{ id: "projectile", label: "Trap is attached to an arrow or thrown weapon and used within 60 feet", requiredForActivation: true }],
    activeEffect: { name: "Launched Survivor Trap", targets: ["area"], bonus: 0, description: "The selected magical trap is loaded on the projectile. Against a square its DC is 5 lower; against a creature the weapon deals damage and the target triggers the trap normally.", defaultRoundsByLevel: magicalRounds, replaceExisting: false },
    summary: "Spend one trap use, choose a learned standard trap, and track its one-hour-per-level loaded duration.",
  },
  {
    id: "survivor-launch-modified-trap", label: "Create launched modified magical trap", classId: "druid", minimumLevel: 9,
    resourceId: "survivorTraps", cost: 2, actionTypeByLevel: [{ level: 9, actionType: "full-round" }],
    modeLabel: "Learned modifier", modes: launchModes.filter((mode) => ["launch-alarm", "launch-burning", "launch-exploding", "launch-marking"].includes(mode.id)),
    confirmations: [
      { id: "base-trap", label: "A legal learned base trap is included", requiredForActivation: true },
      { id: "projectile", label: "Trap is attached to an arrow or thrown weapon and used within 60 feet", requiredForActivation: true },
    ],
    activeEffect: { name: "Launched Modified Survivor Trap", targets: ["area"], bonus: 0, description: "The selected modifier and its base magical trap are loaded on the projectile. Against a square its DC is 5 lower; against a creature the weapon deals damage and triggers the trap.", defaultRoundsByLevel: magicalRounds, replaceExisting: false },
    summary: "Spend two trap uses for the learned modifier plus its legal underlying magical trap.",
  },
];

archetype.classSkillAdditions = ["Stealth"];
archetype.proficiencyAdjustments = [{ sourceFeatureId: "druid-survivor-weapon-proficiencies-1", category: "weapon", operation: "add", proficiencies: ["Shortbow", "Longbow"] }];
archetype.druidNatureBondOptionIds = ["druid-nature-bond-animal"];
archetype.resourceAdjustments = [{ resourceId: "survivorTraps", label: "Ranger Traps", unit: "use", operation: "replace", minimumLevel: 4, base: 0, levelDivisor: 2, abilityModifier: "wisdom", minimum: 0, refreshCadence: "day", dedicatedAction: true }];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = [
  "Diminished spell slots, Stealth and bow proficiencies, mandatory animal companion, exact Element of Surprise initiative penalty, ten sourced ranger traps with nine permanent unique selections, daily trap scaling, extraordinary and magical DCs/durations/costs, and level-9 launched traps are automated.",
];
await writeFile(archetypeUrl, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Survivor automation.");
