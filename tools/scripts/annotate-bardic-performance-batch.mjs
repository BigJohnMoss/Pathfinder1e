import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../packages/data/src/archetypes/", import.meta.url);
const rule = (id, name, minimumLevel, summary, actionIds, cost = 1) => ({
  id, name, minimumLevel, kind: "active", summary,
  resourceId: "bardicPerformance", cost, actionIds,
});
const tracker = (id, label, minimumLevel, summary, target = "self", bonus = 0, bonusByLevel) => ({
  id, label, minimumLevel, resourceId: "bardicPerformance", cost: 1,
  activeEffect: {
    name: label, targets: [target], bonus, ...(bonusByLevel ? { bonusByLevel } : {}),
    description: summary, defaultRounds: 999, fixedRounds: true, replaceExisting: true,
  },
  summary,
});
const saveEffect = (id, label, minimumLevel, summary, effectName, effectDescription, range, successEffect) => ({
  id, label, minimumLevel, resourceId: "bardicPerformance", cost: 1,
  actionTypeByLevel: [{ level: minimumLevel, actionType: "standard" }],
  savingThrow: { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" },
  targetEffectRoll: {
    modifier: "will",
    ...(range ? { rangeByLevel: [{ level: minimumLevel, range }] } : {}),
    effectsByLevel: [{ level: minimumLevel, name: effectName, description: effectDescription, duration: { kind: "fixed-rounds", rounds: 999 } }],
    ...(successEffect ? { successEffect } : {}),
  },
  summary,
});

const definitions = {
  "bard-averaka-arbiter": {
    rules: [
      rule("inspire-teamwork", "Inspire Teamwork", 3, "Treat allies as possessing your teamwork feats only when deciding whether you receive their bonuses; positioning and actions must still qualify.", ["averaka-inspire-teamwork"]),
      rule("ritual-of-reconciliation", "Ritual of Reconciliation", 8, "Creatures within 30 feet that can hear you attempt a Will save; on failure their attitude improves two steps while the performance and proximity continue.", ["averaka-ritual-reconciliation"]),
    ],
    actions: [
      tracker("averaka-inspire-teamwork", "Begin Inspire Teamwork", 3, "Your qualifying allies count as possessing your teamwork feats for bonuses granted to you."),
      saveEffect("averaka-ritual-reconciliation", "Begin Ritual of Reconciliation", 8, "Improve the attitudes of audible creatures within 30 feet by two steps on a failed Will save.", "Reconciled", "Attitude improves two steps; if it becomes indifferent or better, the creature stops attacking the bard and allies. Remove if it leaves 30 feet, the performance ends, or an ally attacks it.", "30 feet"),
    ],
  },
  "bard-flame-dancer": {
    rules: [
      rule("fire-dance", "Fire Dance", 1, "Roll Perform (dance or sing) each round; allies within 30 feet may use that result for fire or extreme-heat saves and ignore heatstroke fatigue while maintained.", ["flame-dancer-fire-dance"]),
      rule("song-of-the-fiery-gaze", "Song of the Fiery Gaze", 3, "Allies within 30 feet who hear the performance see through fire, fog, and smoke when normal light is sufficient.", ["flame-dancer-fiery-gaze"]),
      rule("fire-break", "Fire Break", 6, "Audible or visible allies within 30 feet gain fire resistance 20, increasing to 30 at level 11, while maintained.", ["flame-dancer-fire-break"]),
    ],
    actions: [
      tracker("flame-dancer-fire-dance", "Begin Fire Dance", 1, "Allies may substitute your Perform result for qualifying fire and heat saves and ignore heatstroke fatigue.", "allies"),
      tracker("flame-dancer-fiery-gaze", "Begin Song of the Fiery Gaze", 3, "Allies see through fire, fog, and smoke without distortion when light is sufficient.", "allies"),
      tracker("flame-dancer-fire-break", "Begin Fire Break", 6, "Allies within 30 feet gain the displayed fire resistance while the performance is maintained.", "allies", 20, [{ level: 1, bonus: 20 }, { level: 11, bonus: 30 }]),
    ],
  },
  "bard-impervious-messenger": {
    rules: [
      rule("chant-of-perfect-recall", "Chant of Perfect Recall", 1, "Memorize one page per performance round, up to half your bard level in pages (minimum 1).", ["impervious-chant-perfect-recall"]),
      rule("song-of-subterfuge", "Song of Subterfuge", 6, "Use Perform in place of saves against mind-reading; at level 18 a successful save can expose and feed false information to the diviner.", ["impervious-song-subterfuge"]),
      rule("unbroken-stride", "Unbroken Stride", 8, "Gain half bard level on four movement skills, woodland stride, and enhanced speed; level 12 improves speed and adds freedom of movement.", ["impervious-unbroken-stride"]),
    ],
    actions: [
      {
        id: "impervious-chant-perfect-recall", label: "Memorize pages", minimumLevel: 1,
        resourceId: "bardicPerformance", cost: 1,
        variableCost: { label: "Pages and performance rounds", minimum: 1, maximum: 10, maximumLevelDivisor: 2 },
        spellLikeAbility: { spellId: "memorize-page", spellName: "Memorize Page", cadence: "at-will", kind: "spell-equivalent" },
        summary: "Spend one round per page. The selector is capped at half bard level and 10 pages at level 20.",
      },
      tracker("impervious-song-subterfuge", "Begin Song of Subterfuge", 6, "Use Perform in place of saving throws against attempts to read your mind."),
      tracker("impervious-unbroken-stride", "Begin Unbroken Stride", 8, "Gain the listed movement skill, terrain, speed, and level-12 freedom-of-movement benefits."),
    ],
    skillBonusAdjustments: ["Acrobatics", "Climb", "Fly", "Ride"].map((skill) => ({ sourceFeatureId: "bard-impervious-messenger-bardic-performance-su-1", skill, minimumLevel: 8, base: 0, levelDivisor: 2, condition: "While using Unbroken Stride" })),
    landSpeedAdjustments: [{ sourceFeatureId: "bard-impervious-messenger-bardic-performance-su-1", minimumLevel: 8, bonus: 10, bonusType: "enhancement", bonusByLevel: [{ level: 8, bonus: 10 }, { level: 12, bonus: 30 }], condition: "While using Unbroken Stride", timing: "afterReduction", label: "Unbroken Stride" }],
  },
  "bard-thundercaller": {
    rules: [
      rule("thunder-call", "Thunder Call", 3, "Spend one performance round as a standard action for scaling sonic damage; Fortitude negates only the 1-round stun.", ["thundercaller-thunder-call"]),
      rule("incite-rage", "Incite Rage", 6, "One creature within 30 feet rages while it hears the performance; an unwilling target can negate and gain 24-hour immunity.", ["thundercaller-incite-rage"]),
      rule("call-lightning", "Call Lightning", 8, "Maintain a call lightning storm and call one bolt per round as a standard action.", ["thundercaller-call-lightning"]),
      rule("call-lightning-storm", "Call Lightning Storm", 14, "Maintain a call lightning storm effect and call one bolt per round as a standard action.", ["thundercaller-call-lightning-storm"]),
    ],
    actions: [
      {
        id: "thundercaller-thunder-call", label: "Use Thunder Call", minimumLevel: 3,
        resourceId: "bardicPerformance", cost: 1,
        actionTypeByLevel: [{ level: 3, actionType: "standard" }],
        savingThrow: { label: "Fortitude", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" },
        combatRoll: {
          damage: { type: "sonic", diceCountByLevel: [{ level: 3, count: 1 }, { level: 7, count: 3 }, { level: 11, count: 5 }, { level: 15, count: 7 }, { level: 19, count: 9 }], dieSidesByLevel: [{ level: 3, sides: 8 }] },
          rangeByLevel: [{ level: 3, range: "Sound burst range and 10-foot-radius spread" }],
          targetSave: { modifier: "fortitude", outcome: "negates-riders" },
          riders: [{ name: "Thunder Call stunned", description: "Stunned for 1 round after failing the Fortitude save.", duration: { kind: "fixed-rounds", rounds: 1 } }],
        },
        summary: "Deal scaling sonic damage in a sound-burst area. A successful Fortitude save negates stunning but not damage.",
      },
      saveEffect("thundercaller-incite-rage", "Begin Incite Rage", 6, "An unwilling target within 30 feet attempts a Will save; a willing target may accept the rage.", "Incited Rage", "Affected as rage while the target can hear the performance. A target with rage may rage without consuming its own rounds.", "30 feet", { name: "Incite Rage immunity", description: "Immune to this character's Incite Rage for 24 hours.", rounds: 999 }),
      { id: "thundercaller-call-lightning", label: "Begin Call Lightning", minimumLevel: 8, resourceId: "bardicPerformance", cost: 1, spellLikeAbility: { spellId: "call-lightning", spellName: "Call Lightning", cadence: "at-will", kind: "spell-equivalent" }, summary: "The storm persists while performing; spend one performance round for each maintained round and call one bolt as a standard action." },
      { id: "thundercaller-call-lightning-storm", label: "Begin Call Lightning Storm", minimumLevel: 14, resourceId: "bardicPerformance", cost: 1, spellLikeAbility: { spellId: "call-lightning-storm", spellName: "Call Lightning Storm", cadence: "at-will", kind: "spell-equivalent" }, summary: "The storm persists while performing; spend one performance round for each maintained round and call one bolt as a standard action." },
    ],
  },
};

for (const [id, definition] of Object.entries(definitions)) {
  const url = new URL(`${id}.json`, root);
  const archetype = JSON.parse(await readFile(url, "utf8"));
  const feature = archetype.replacements.flatMap((replacement) => replacement.features).find((candidate) => /^Bardic Performance(?:\s*\([^)]+\))?$/i.test(candidate.name));
  if (!feature) throw new Error(`${id} has no Bardic Performance feature`);
  feature.performanceRules = definition.rules;
  feature.resourceActions = definition.actions;
  for (const key of ["skillBonusAdjustments", "landSpeedAdjustments"]) if (definition[key]) archetype[key] = definition[key];
  await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
}

console.log(`Annotated ${Object.keys(definitions).length} Bardic Performance archetypes.`);
