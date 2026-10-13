import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-life-channeler.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const replacement = archetype.replacements[0];
const features = replacement.features;
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const alignment = find("Alignment");
const preservation = find("Plant Preservation");
const talismans = find("Wicker Talismans");
const rampant = find("Rampant Growth");
const stored = find("Stored Life");

Object.assign(alignment, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "cleric-alignments",
  optionChoiceIds: ["alignment-lawful-neutral", "alignment-neutral", "alignment-chaotic-neutral", "alignment-neutral-evil"],
  progressionKey: "life-channeler-alignment"
});

const preservationIndex = features.indexOf(preservation);
features.splice(preservationIndex, 1,
  {
    id: "druid-nature-bond-1",
    name: "Nature Bond",
    level: 1,
    type: "selectable",
    summary: "A Life Channeler must select the domain form of Nature Bond.",
    choiceRequired: true,
    optionGroupId: "druid-nature-bonds",
    optionChoiceIds: ["druid-nature-bond-domain"],
    progressionKey: "druid-nature-bond"
  },
  {
    id: "druid-domain-1",
    name: "Plant Bond",
    level: 1,
    type: "selectable",
    summary: "Choose the Plant domain or Growth subdomain.",
    choiceRequired: true,
    optionGroupId: "cleric-domains",
    optionChoiceIds: ["domain-plant", "subdomain-growth"],
    requiredOptionId: "druid-nature-bond-domain",
    requiredOptionMessage: "Choose the Domain nature bond first",
    progressionKey: "druid-domain"
  },
  {
    ...preservation,
    resourceActions: [{
      id: "life-channeler-plant-preservation",
      label: "Perform Plant Preservation sacrifice",
      classId: "druid",
      minimumLevel: 1,
      actionTypeByLevel: [{ level: 1, actionType: "full-round" }],
      confirmations: [
        { id: "sentient-humanoid", label: "The coup de grace killed a sentient humanoid", requiredForActivation: true },
        { id: "not-summoned", label: "The victim was not summoned", requiredForActivation: true }
      ],
      spellLikeAbility: { spellId: "plant-growth", spellName: "Plant Growth (enrichment)", cadence: "at-will", kind: "spell-equivalent" },
      targetEffectRoll: {
        modifier: "none",
        effectsByLevel: [{ level: 1, name: "Plant Preservation enrichment", description: "The land centered on the sacrificed creature receives the enrichment form of plant growth. Use the Rampant Growth profile for current range, duration, and productivity.", duration: { kind: "until-ended" } }]
      },
      summary: "Resolve the ritual coup de grace as a death effect and record the persistent enrichment."
    }]
  }
);

const talismanUnlocks = [
  { spellLevel: 1, classLevel: 4 }, { spellLevel: 2, classLevel: 4 }, { spellLevel: 3, classLevel: 5 },
  { spellLevel: 4, classLevel: 7 }, { spellLevel: 5, classLevel: 9 }, { spellLevel: 6, classLevel: 11 },
  { spellLevel: 7, classLevel: 13 }, { spellLevel: 8, classLevel: 15 }, { spellLevel: 9, classLevel: 17 }
];
talismans.numericCalculations = [{
  id: "life-channeler-talisman-minimum-cr",
  label: "Wicker talisman eligibility",
  inputLabel: "Talisman spell level",
  inputMinimum: 1,
  inputMaximum: 9,
  inputDefault: 1,
  outputLabel: "Minimum victim CR",
  baseByLevel: [{ level: 4, value: 0 }],
  inputMultiplierByLevel: [{ level: 4, multiplier: 2 }],
  classId: "druid",
  summary: "The victim's CR must be at least twice the selected talisman's spell level."
}];
talismans.progressionProfiles = [{
  id: "life-channeler-wicker-talismans",
  label: "Wicker Talismans",
  classId: "druid",
  columns: [{ id: "highest", label: "Highest talisman" }, { id: "total", label: "Total talismans" }],
  steps: [
    { level: 4, values: { highest: "2nd-level", total: 2 } }, { level: 5, values: { highest: "3rd-level", total: 3 } },
    { level: 7, values: { highest: "4th-level", total: 4 } }, { level: 9, values: { highest: "5th-level", total: 5 } },
    { level: 11, values: { highest: "6th-level", total: 6 } }, { level: 13, values: { highest: "7th-level", total: 7 } },
    { level: 15, values: { highest: "8th-level", total: 8 } }, { level: 17, values: { highest: "9th-level", total: 9 } }
  ],
  summary: "Each talisman stores one creature's life energy independently and begins empty."
}];
talismans.resourceActions = talismanUnlocks.flatMap(({ spellLevel, classLevel }) => {
  const effectName = `Wicker Talisman ${spellLevel} — Full`;
  return [
    {
      id: `life-channeler-fill-talisman-${spellLevel}`,
      label: `Fill ${spellLevel}${spellLevel === 1 ? "st" : spellLevel === 2 ? "nd" : spellLevel === 3 ? "rd" : "th"}-level Talisman`,
      classId: "druid",
      minimumLevel: classLevel,
      actionTypeByLevel: [{ level: classLevel, actionType: "full-round" }],
      confirmations: [
        { id: "ritual-kill", label: "A ritual coup de grace killed a sentient, nonsummoned creature", requiredForActivation: true },
        { id: "minimum-cr", label: `The victim was CR ${spellLevel * 2} or higher`, requiredForActivation: true }
      ],
      activeEffect: { name: effectName, targets: ["self"], bonus: 0, description: `Stores one sacrifice for the ${spellLevel}${spellLevel === 1 ? "st" : spellLevel === 2 ? "nd" : spellLevel === 3 ? "rd" : "th"}-level domain spell.`, defaultRounds: 999999, fixedRounds: true, replaceExisting: true },
      summary: "Fill this initially empty talisman; filling it again replaces rather than stacks its stored energy."
    },
    {
      id: `life-channeler-cast-talisman-${spellLevel}`,
      label: `Cast Stored ${spellLevel}${spellLevel === 1 ? "st" : spellLevel === 2 ? "nd" : spellLevel === 3 ? "rd" : "th"}-level Domain Spell`,
      classId: "druid",
      minimumLevel: classLevel,
      requiredActiveEffectName: effectName,
      removeActiveEffectName: effectName,
      summary: "Consume this talisman's stored life energy to cast the selected domain spell without expending a spell slot."
    }
  ];
});

features.push({
  id: "druid-life-channeler-leadership-6",
  name: "Leadership",
  level: 6,
  type: "archetype",
  summary: "Gain Leadership. Sacrificing one of these followers with Wicker Talismans does not penalize the Leadership score.",
  grantedFeatId: "leadership",
  progressionProfiles: [{ id: "life-channeler-leadership-exception", label: "Willing Sacrifices", classId: "druid", columns: [{ id: "rule", label: "Leadership rule" }], steps: [{ level: 6, values: { rule: "No Leadership-score penalty for sacrificing a follower through Wicker Talismans" } }] }]
});

rampant.progressionProfiles = [{
  id: "life-channeler-rampant-growth",
  label: "Rampant Growth",
  classId: "druid",
  columns: [{ id: "range", label: "Enrichment range" }, { id: "duration", label: "Duration" }, { id: "productivity", label: "Productivity" }],
  steps: [
    { level: 4, values: { range: "1 mile", duration: "1 year", productivity: "+1/3 normal" } },
    { level: 8, values: { range: "1 mile", duration: "3 years if victim CR 8+", productivity: "+1/3 normal" } },
    { level: 12, values: { range: "1 mile", duration: "3 years if victim CR 8+", productivity: "+2/3 normal if victim CR 12+" } }
  ]
}];

stored.resourceActions = [
  {
    id: "life-channeler-store-life",
    label: "Store Life in Body",
    classId: "druid",
    minimumLevel: 9,
    actionTypeByLevel: [{ level: 9, actionType: "full-round" }],
    confirmations: [
      { id: "sentient-humanoid", label: "The coup de grace killed a sentient humanoid", requiredForActivation: true },
      { id: "cr-at-least-level", label: "The victim's CR was at least the Life Channeler's Druid level", requiredForActivation: true }
    ],
    activeEffect: { name: "Stored Life", targets: ["self"], bonus: 0, description: "One creature's life energy is stored and can negate one qualifying effect; storing another replaces this energy.", defaultRounds: 999999, fixedRounds: true, replaceExisting: true },
    summary: "Store one qualifying victim's energy until it is replaced or consumed."
  },
  {
    id: "life-channeler-consume-stored-life",
    label: "Consume Stored Life",
    classId: "druid",
    minimumLevel: 9,
    requiredActiveEffectName: "Stored Life",
    removeActiveEffectName: "Stored Life",
    modeLabel: "Effect negated",
    modes: [
      { id: "death-damage", label: "Damage from a death effect", summary: "Negate the damage from the death effect." },
      { id: "death", label: "Death from a death effect", summary: "Negate death from the death effect." },
      { id: "negative-levels", label: "Negative levels", summary: "Negate the negative levels." },
      { id: "energy-drain", label: "Energy drain", summary: "Negate the energy drain." }
    ],
    summary: "No action is required; consume the stored energy to negate the selected triggering effect."
  }
];

archetype.druidNatureBondOptionIds = ["druid-nature-bond-domain"];
archetype.druidDomainIds = ["domain-plant", "subdomain-growth"];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Nongood Druid alignment, mandatory Plant/Growth bond and domain spells, Plant Preservation, every independently persistent Wicker Talisman with exact CR checks and unlock levels, Leadership, Rampant Growth scaling, and Stored Life replacement/consumption are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Life Channeler automation.");
