const ordinalNumber = (value) => Number(String(value).replace(/(?:st|nd|rd|th)$/i, ""));

const directPrecisionFeature = (feature) =>
  /^(?:ranged )?sneak attack(?: \([^)]+\))?(?: \+\d+d6)?$/i.test(feature?.name ?? "");

const uniqueSteps = (steps) => [...new Map(steps
  .filter((step) => Number.isInteger(step.level) && step.level >= 1 && step.level <= 20 && step.dice >= 1)
  .sort((left, right) => left.level - right.level)
  .map((step) => [step.level, step])).values()];

function explicitMilestones(text) {
  const levels = [];
  for (const match of text.matchAll(/(?:increases?|increased) by \+?1d6 at ([^.]+?)(?: levels?\b| level\b)/gi)) {
    for (const level of match[1].matchAll(/\b(\d+)(?:st|nd|rd|th)\b/gi)) levels.push(ordinalNumber(level[1]));
  }
  return [...new Set(levels)].filter((level) => level >= 1 && level <= 20).sort((left, right) => left - right);
}

function intervalProgression(text, baseLevel, milestoneLevels) {
  const beyond = text.match(/(?:increases?|increased)(?: by \+?1d6)? every (\d+) (?:\w+ )?levels? (?:beyond|after) (\d+)(?:st|nd|rd|th)/i);
  if (beyond) return { interval: Number(beyond[1]), anchor: ordinalNumber(beyond[2]) };
  const thereafter = text.match(/(?:increases?|increased) by \+?1d6(?: at \d+(?:st|nd|rd|th) level(?:,? and| and))? every (\d+) (?:\w+ )?levels? thereafter/i)
    ?? text.match(/(?:at \d+(?:st|nd|rd|th) level and )?every (\d+) (?:\w+ )?levels? thereafter/i);
  if (!thereafter) return undefined;
  return { interval: Number(thereafter[1]), anchor: milestoneLevels.at(-1) ?? baseLevel };
}

function featureDiceProgression(feature) {
  if (!directPrecisionFeature(feature)) return undefined;
  const text = `${feature.summary ?? ""} ${feature.scaling ?? ""}`.replace(/[’]/g, "'").replace(/\s+/g, " ");
  const namedDice = String(feature.name ?? "").match(/\+(\d+)d6\b/i);
  const statedDice = text.match(/(?:damage (?:is|dealt is)|dealing|deals?|gains? (?:a )?sneak attack(?: ability)?(?:[^.]{0,40})?)\s*\+?(\d+)d6\b/i)
    ?? text.match(/\b\+?(\d+)d6\b[^.]{0,80}\b(?:at|starting at)\s+(\d+)(?:st|nd|rd|th) level/i);
  const baseDice = Number(namedDice?.[1] ?? statedDice?.[1] ?? 1);
  let baseLevel = feature.level ?? 1;
  const delayed = text.match(/(?:until|starting at)\s+(\d+)(?:st|nd|rd|th) level/i)
    ?? text.match(/\b(?:damage is|damage dealt is|damage is \+|gains? (?:a )?\+?\d+d6 sneak attack)\b[^.]{0,80}\bat\s+(\d+)(?:st|nd|rd|th) level/i);
  if (delayed) baseLevel = ordinalNumber(delayed[1]);
  const milestones = explicitMilestones(text).filter((level) => level > baseLevel);
  const interval = intervalProgression(text, baseLevel, milestones);
  if (/as a rogue of the same level/i.test(text)) return Array.from({ length: 10 }, (_, index) => ({ level: index * 2 + 1, dice: index + 1 }));
  const steps = [{ level: baseLevel, dice: baseDice }];
  let dice = baseDice;
  for (const level of milestones) steps.push({ level, dice: ++dice });
  if (interval?.interval > 0) {
    for (let level = interval.anchor + interval.interval; level <= 20; level += interval.interval) {
      if (steps.some((step) => step.level === level)) continue;
      steps.push({ level, dice: ++dice });
    }
  }
  return uniqueSteps(steps);
}

function precisionCondition(feature) {
  const text = String(feature.summary ?? "");
  if (/^ranged sneak attack/i.test(feature.name ?? "")) return "With a ranged attack against a target denied Dexterity to Armor Class";
  const restrictions = [];
  if (/flanks?[^.]+denied (?:their|a|its) Dexterity|denied (?:their|a|its) Dexterity[^.]+flanks?/i.test(text)) restrictions.push("target is flanked or denied Dexterity to Armor Class");
  else restrictions.push("target qualifies for sneak attack");
  if (/cannot use sneak attack while [^.]*concealment/i.test(text)) restrictions.push("target has no concealment");
  return restrictions.join("; ");
}

function inferFeatureAdjustment(feature) {
  const diceByLevel = featureDiceProgression(feature);
  if (!diceByLevel) return undefined;
  const text = `${feature.summary ?? ""} ${feature.scaling ?? ""}`.replace(/\s+/g, " ");
  const rangedOnly = /^(?:ranged sneak attack|sneak shot)/i.test(feature.name ?? "") || /cannot use sneak attack with a melee attack/i.test(text);
  const range = text.match(/within (\d+) feet/i);
  const rangeIncrease = text.match(/at (\d+)(?:st|nd|rd|th) level and every (\d+)(?:st|nd|rd|th)? level thereafter, the range[^.]+increases by (\d+) feet/i);
  const maximumRangeByLevel = range && rangeIncrease ? [{ level: feature.level, range: Number(range[1]) }] : undefined;
  if (maximumRangeByLevel) {
    for (let level = Number(rangeIncrease[1]), value = Number(range[1]) + Number(rangeIncrease[3]); level <= 20; level += Number(rangeIncrease[2]), value += Number(rangeIncrease[3])) maximumRangeByLevel.push({ level, range: value });
  }
  return {
    sourceFeatureId: feature.id,
    label: feature.name.replace(/\s*\([^)]+\)\s*$/, ""),
    dieSides: 6,
    diceByLevel,
    condition: precisionCondition(feature),
    attackMode: rangedOnly ? "ranged" : "any",
    stacksAsRogueLevel: /as a rogue of the same level/i.test(text),
    ...(range ? { maximumRange: Number(range[1]) } : {}),
    ...(maximumRangeByLevel ? { maximumRangeByLevel } : {}),
    partialFeature: /familiar can also deal sneak attack damage/i.test(text),
  };
}

export function inferredArchetypePrecisionDamageDetails(archetype) {
  const adjustments = [];
  const fullyAutomatedFeatureIds = new Set();
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    const adjustment = inferFeatureAdjustment(feature);
    if (!adjustment) continue;
    adjustments.push(adjustment);
    if (!adjustment.partialFeature) fullyAutomatedFeatureIds.add(feature.id);
  }
  return { adjustments, fullyAutomatedFeatureIds };
}

export const inferArchetypePrecisionDamageAdjustments = (archetype) =>
  inferredArchetypePrecisionDamageDetails(archetype).adjustments;

export function precisionDamageAtLevel(adjustment, level) {
  return adjustment.diceByLevel.reduce((dice, step) => level >= step.level ? step.dice : dice, 0);
}

function baseClassPrecisionDamageAdjustments(characterClass) {
  const represented = new Set((characterClass.precisionDamageAdjustments ?? []).map((adjustment) => adjustment.sourceFeatureId));
  const grouped = new Map();
  for (const feature of characterClass.features ?? []) {
    if (represented.has(feature.id) || !directPrecisionFeature(feature)) continue;
    const key = feature.progressionKey ?? feature.id;
    grouped.set(key, [...(grouped.get(key) ?? []), feature]);
  }
  return [...grouped.values()].flatMap((features) => {
    const ordered = [...features].sort((left, right) => left.level - right.level);
    if (ordered.length === 1) return inferFeatureAdjustment(ordered[0]) ?? [];
    const diceByLevel = uniqueSteps(ordered.map((feature, index) => ({
      level: feature.level,
      dice: Number(String(feature.name).match(/\+(\d+)d6/i)?.[1] ?? index + 1),
    })));
    const source = ordered[0];
    return [{
      sourceFeatureId: source.id,
      label: source.name.replace(/\s*\+\d+d6\s*$/i, ""),
      dieSides: 6,
      diceByLevel,
      condition: precisionCondition(source),
      attackMode: "any",
      stacksAsRogueLevel: characterClass.id === "rogue",
    }];
  });
}

export function characterPrecisionDamageRules(characterClasses, classLevels) {
  const rules = characterClasses.flatMap((characterClass) => {
    const level = classLevels[characterClass.id] ?? 0;
    return [...baseClassPrecisionDamageAdjustments(characterClass), ...(characterClass.precisionDamageAdjustments ?? [])]
      .map((adjustment) => ({
        ...adjustment,
        id: `${characterClass.id}:${adjustment.sourceFeatureId}`,
        source: characterClass.name,
        dice: precisionDamageAtLevel(adjustment, level),
        maximumRange: adjustment.maximumRangeByLevel?.reduce((range, step) => level >= step.level ? step.range : range, adjustment.maximumRange) ?? adjustment.maximumRange,
      }))
      .filter((adjustment) => adjustment.dice > 0);
  });
  const rogueLevelRules = rules.filter((rule) => rule.stacksAsRogueLevel);
  if (rogueLevelRules.length < 2) return rules;
  const effectiveLevel = rogueLevelRules.reduce((total, rule) => total + (classLevels[rule.id.split(":")[0]] ?? 0), 0);
  const combined = {
    ...rogueLevelRules[0],
    id: rogueLevelRules.map((rule) => rule.id).join("+"),
    label: "Sneak Attack",
    source: rogueLevelRules.map((rule) => rule.source).join(" + "),
    dice: Math.ceil(effectiveLevel / 2),
  };
  return [...rules.filter((rule) => !rule.stacksAsRogueLevel), combined];
}
