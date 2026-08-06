import {
  archetypeReplacementBoilerplate,
  archetypeRuleCondition,
  archetypeRuleSentences,
  archetypeUnsafeSubject,
} from "./archetype-initiative.js";

const featureLabel = (feature) => String(feature.name ?? "Special defense").replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, "");
const sentenceLevel = (feature, sentence, matchIndex, matchEnd = matchIndex) => {
  const immediate = sentence.slice(matchEnd).match(/^\s+at (\d+)(?:st|nd|rd|th) level\b/i)?.[1];
  const previous = [...sentence.slice(0, matchIndex).matchAll(/\b(?:At|Starting at|Beginning at) (\d+)(?:st|nd|rd|th)(?:-level| level)?\b/gi)].at(-1)?.[1];
  return Number(immediate ?? previous ?? feature.level ?? 1);
};

const defenseSubjectUnsafe = (sentence, matchIndex) => (archetypeUnsafeSubject(sentence, matchIndex) && !/\bno creatures\b[^,.;]{0,100},\s*(?:he|she|they|you|the [a-z]+)\s*$/i.test(sentence.slice(Math.max(0, matchIndex - 140), matchIndex))) ||
  /\b(?:armor|construct|covenant ally|homunculus|inscribed item|shield|weapon)\b(?:\s+(?:also|then|it))?\s*$/i.test(sentence.slice(Math.max(0, matchIndex - 100), matchIndex)) ||
  /\b(?:attacker|enemy|opponent)\s*$/i.test(sentence.slice(Math.max(0, matchIndex - 40), matchIndex)) ||
  /\b(?:if|unless)\b[^,.;]{0,60}$|\bor\s*$/i.test(sentence.slice(Math.max(0, matchIndex - 70), matchIndex));

function activationCondition(feature, sentence, matchStart, matchEnd, summary) {
  const leading = sentence.slice(0, matchStart).match(/\b(when|whenever|while|during|as long as|if)\s+(.+?),\s*(?:(?:(?:he|she|they|it|you)(?: also)?|(?:an?|the) [^,.;]{1,60})\s*)?$/i);
  if (leading) return `${leading[1].toLowerCase()} ${leading[2]}`;
  const broadLeading = sentence.slice(0, matchStart).match(/^(?:At \d+(?:st|nd|rd|th) level,?\s*)?(when|whenever|while|during|as long as|if)\s+(.+?),/i);
  if (broadLeading) return `${broadLeading[1].toLowerCase()} ${broadLeading[2]}`;
  const direct = archetypeRuleCondition(sentence, matchEnd);
  if (direct && !/^if (?:he|she|they|it) already has\b/i.test(direct)) return direct.replace(/\s+and (?:can|may|catch|return)\b.*$/i, "").replace(/\s+in addition to\b.*$/i, "").trim();
  const withRequirement = sentence.slice(matchEnd).match(/^\s+(with (?:a|an|the|his|her|their) [^,.;]{1,60})/i)?.[1];
  if (withRequirement) return withRequirement.toLowerCase();
  const againstRequirement = sentence.slice(matchEnd).match(/\b(against (?:her|his|their|the) [^,.;]{1,80})/i)?.[1];
  if (againstRequirement) return againstRequirement.toLowerCase();
  const only = String(summary).match(/\b(?:This ability|(?:The )?[A-Z][^.]{1,60}) functions? only (while|when|in|within|during)\s+(.+?)(?=[.]|$)/i);
  if (only) return `${only[1].toLowerCase()} ${only[2]}`;
  if (/\bas (?:an?|the) (?:standard|move|swift|immediate|free|full-round) action\b/i.test(sentence) && /\b(?:rounds?|minutes?|hours?) per day\b/i.test(summary))
    return `when ${featureLabel(feature)} is active`;
  if (/\b(?:spend|expend|once per day|for (?:\d+|a number of) (?:rounds?|minutes?|hours?)|bloodrag(?:e|ing)|mutagen|polymorph)\b/i.test(sentence) || /\b(?:spend|expend)[^.]{0,100}\b(?:to gain|gains?)\b/i.test(summary))
    return `when ${featureLabel(feature)} is active`;
  return undefined;
}

const normalizedBypass = (value) => String(value).trim().replace(/[–—-]/g, "—").replace(/\s+/g, " ");

const normalizedImmunity = (value) => String(value)
  .replace(/\s+/g, " ")
  .replace(/,\s+as well as\b.*$/i, "")
  .replace(/,?\s+and\s+(?:allies?|gains?|has|can|the ability)\b.*$/i, "")
  .replace(/,\s*(?:but|though|unless)\b.*$/i, "")
  .replace(/\s+unless\b.*$/i, "")
  .replace(/\s+as well$/i, "")
  .replace(/[,.\s]+$/, "")
  .trim();

function progression(adjustment, summary) {
  const text = String(summary ?? "");
  const rows = [{ level: adjustment.minimumLevel, bonus: adjustment.base }];
  const candidates = [];
  if (adjustment.kind === "damageReduction") {
    const bypass = adjustment.qualifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/—/g, "[–—-]");
    for (const match of text.matchAll(new RegExp(`(?:DR|damage reduction)\\s+(\\d+)\\s*\\/\\s*${bypass}\\s+at (\\d+)(?:st|nd|rd|th)(?: level)?`, "gi")))
      candidates.push({ level: Number(match[2]), bonus: Number(match[1]) });
    for (const match of text.matchAll(new RegExp(`(?:^|[.!?]\\s+)At (\\d+)(?:st|nd|rd|th) level[^.]{0,100}?(?:DR|damage reduction)\\s+(\\d+)\\s*\\/\\s*${bypass}`, "gi")))
      candidates.push({ level: Number(match[1]), bonus: Number(match[2]) });
    const increaseAt = text.match(/damage reduction increases by (\d+)(?: point)? at (\d+)(?:st|nd|rd|th)(?: level)? and every (\d+) levels? thereafter/i);
    const atAndEvery = text.match(/At (\d+)(?:st|nd|rd|th) level and every (\d+) levels? thereafter,? this damage reduction increases by (\d+)/i);
    if (increaseAt || atAndEvery) {
      const first = Number(increaseAt?.[2] ?? atAndEvery[1]);
      const interval = Number(increaseAt?.[3] ?? atAndEvery[2]);
      const increment = Number(increaseAt?.[1] ?? atAndEvery[3]);
      let bonus = adjustment.base;
      for (let level = first; level <= 20; level += interval) {
        if (level <= adjustment.minimumLevel) continue;
        bonus += increment;
        candidates.push({ level, bonus });
      }
    }
    const listedIncreases = text.match(/(?:this )?damage reduction increases by (\d+) at ([^.]+?) levels?\b/i);
    if (listedIncreases) {
      let bonus = adjustment.base;
      for (const levelMatch of listedIncreases[2].matchAll(/\d+/g)) {
        bonus += Number(listedIncreases[1]);
        candidates.push({ level: Number(levelMatch[0]), bonus });
      }
    }
  } else if (adjustment.kind === "energyResistance") {
    const energy = adjustment.qualifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const match of text.matchAll(new RegExp(`(?:increases|improves) to ${energy} resistance (\\d+) at (\\d+)(?:st|nd|rd|th)(?: level)?`, "gi")))
      candidates.push({ level: Number(match[2]), bonus: Number(match[1]) });
    for (const match of text.matchAll(new RegExp(`${energy} resistance (\\d+) at (\\d+)(?:st|nd|rd|th)(?: level)?`, "gi")))
      candidates.push({ level: Number(match[2]), bonus: Number(match[1]) });
    for (const match of text.matchAll(new RegExp(`At (\\d+)(?:st|nd|rd|th)(?:-level| level)?[^.]{0,80}?(?:(?:this |the )?${energy} resistance|this resistance|it) (?:increases|improves) to (\\d+)`, "gi")))
      candidates.push({ level: Number(match[1]), bonus: Number(match[2]) });
    for (const match of text.matchAll(new RegExp(`At (\\d+)(?:st|nd|rd|th)(?:-level| level)?[^.]{0,40}?this increases to ${energy} resistance (\\d+)`, "gi")))
      candidates.push({ level: Number(match[1]), bonus: Number(match[2]) });
  } else if (adjustment.kind === "spellResistance") {
    for (const match of text.matchAll(/At (\d+)(?:st|nd|rd|th) level[^.]{0,100}?spell resistance increases to (\d+)\s*\+/gi))
      candidates.push({ level: Number(match[1]), bonus: Number(match[2]) });
  } else if (adjustment.kind === "fortification") {
    for (const match of text.matchAll(/(?:this (?:chance )?)?increases to (\d+)% at (\d+)(?:st|nd|rd|th) level/gi))
      candidates.push({ level: Number(match[2]), bonus: Number(match[1]) });
    for (const match of text.matchAll(/At (\d+)(?:st|nd|rd|th) level,? (?:this|the chance) increases to (?:a )?(\d+)%/gi))
      candidates.push({ level: Number(match[1]), bonus: Number(match[2]) });
    for (const match of text.matchAll(/(?:and )?at (\d+)(?:st|nd|rd|th) level (?:it|this) increases to (?:a )?(\d+)%/gi))
      candidates.push({ level: Number(match[1]), bonus: Number(match[2]) });
    for (const match of text.matchAll(/(?:and )?to (\d+)% at (\d+)(?:st|nd|rd|th) level/gi))
      candidates.push({ level: Number(match[2]), bonus: Number(match[1]) });
  }
  const unique = [...new Map(candidates
    .filter((step) => step.level > adjustment.minimumLevel && step.level <= 20 && step.bonus > 0)
    .map((step) => [step.level, step])).values()].sort((left, right) => left.level - right.level);
  return unique.length ? { ...adjustment, bonusByLevel: [...rows, ...unique] } : adjustment;
}

function rulesFromSentence(feature, sentence, summary) {
  const results = [];
  const bypassPattern = "(?:adamantine|bludgeoning|chaotic|cold iron|epic|evil|good|lawful|magic|piercing|silver|slashing|[–—-])(?:\\s+(?:and|or)\\s+(?:adamantine|bludgeoning|chaotic|cold iron|epic|evil|good|lawful|magic|piercing|silver|slashing))?";
  const damageReduction = new RegExp(`\\b(?:gains?|has)\\s+(?:DR|damage reduction)\\s+(\\d+)\\s*\\/\\s*(${bypassPattern})`, "ig");
  for (const match of sentence.matchAll(damageReduction)) {
    if (defenseSubjectUnsafe(sentence, match.index)) continue;
    const qualifier = normalizedBypass(match[2]);
    if (!qualifier || qualifier.length > 40) continue;
    const condition = activationCondition(feature, sentence, match.index, match.index + match[0].length, summary);
    results.push(progression({
      sourceFeatureId: feature.id,
      kind: "damageReduction",
      label: featureLabel(feature),
      minimumLevel: sentenceLevel(feature, sentence, match.index, match.index + match[0].length),
      base: Number(match[1]),
      qualifier,
      ...(condition ? { condition } : {}),
    }, summary));
  }

  const energyResistance = /\b(?:gains?|has)\s+(acid|cold|electricity|fire|sonic) resistance(?: equal to)?\s+(\d+|(?:his|her|their) (?:(?:class|[a-z]+) )?level)\b/ig;
  for (const match of sentence.matchAll(energyResistance)) {
    if (defenseSubjectUnsafe(sentence, match.index)) continue;
    const levelFormula = /level/i.test(match[2]);
    const condition = activationCondition(feature, sentence, match.index, match.index + match[0].length, summary);
    results.push(progression({
      sourceFeatureId: feature.id,
      kind: "energyResistance",
      label: featureLabel(feature),
      minimumLevel: sentenceLevel(feature, sentence, match.index, match.index + match[0].length),
      base: levelFormula ? 0 : Number(match[2]),
      ...(levelFormula ? { levelMultiplier: 1 } : {}),
      qualifier: match[1].toLowerCase(),
      ...(condition ? { condition } : {}),
    }, summary));
  }

  const spellResistance = /\b(?:gains?|has) spell resistance(?: equal to)?\s+(\d+)(?:\s*\+\s*(?:his|her|their|the)?\s*(?:(class|character|[a-z]+) )?level)?\b/ig;
  for (const match of sentence.matchAll(spellResistance)) {
    if (defenseSubjectUnsafe(sentence, match.index)) continue;
    const condition = activationCondition(feature, sentence, match.index, match.index + match[0].length, summary);
    results.push(progression({
      sourceFeatureId: feature.id,
      kind: "spellResistance",
      label: featureLabel(feature),
      minimumLevel: sentenceLevel(feature, sentence, match.index, match.index + match[0].length),
      base: Number(match[1]),
      ...(match[2] ? { levelMultiplier: 1, ...(match[2].toLowerCase() === "character" ? { usesCharacterLevel: true } : {}) } : {}),
      qualifier: "spell resistance",
      ...(condition ? { condition } : {}),
    }, summary));
  }
  const immunity = /\b(?:(?:he|she|they|it) (?:becomes?|is) immune to|(?:he|she|they|it) gains? immunity to|(?:and |becomes? )immunity to)\s*([^.;]{1,180})/ig;
  for (const match of sentence.matchAll(immunity)) {
    if (defenseSubjectUnsafe(sentence, match.index)) continue;
    const milestone = match[1].match(/\s+at (\d+)(?:st|nd|rd|th) level\s*$/i)?.[1];
    const qualifier = normalizedImmunity(match[1].replace(/\s+at \d+(?:st|nd|rd|th) level\s*$/i, ""));
    if (!qualifier || qualifier.length > 120 || /\b(?:if|whether)\b/i.test(qualifier)) continue;
    const condition = activationCondition(feature, sentence, match.index, match.index + match[0].length, summary);
    results.push({
      sourceFeatureId: feature.id,
      kind: "immunity",
      label: featureLabel(feature),
      minimumLevel: Number(milestone ?? sentenceLevel(feature, sentence, match.index, match.index + match[0].length)),
      base: 0,
      qualifier: qualifier.toLowerCase(),
      ...(condition ? { condition } : {}),
    });
  }
  const evasion = /\b(?:gains?|has)\s+(improved evasion|evasion)\b/ig;
  for (const match of sentence.matchAll(evasion)) {
    if (defenseSubjectUnsafe(sentence, match.index)) continue;
    const condition = activationCondition(feature, sentence, match.index, match.index + match[0].length, summary);
    results.push({
      sourceFeatureId: feature.id,
      kind: /^improved/i.test(match[1]) ? "improvedEvasion" : "evasion",
      label: featureLabel(feature),
      minimumLevel: sentenceLevel(feature, sentence, match.index, match.index + match[0].length),
      base: 0,
      qualifier: match[1].toLowerCase(),
      ...(condition ? { condition } : {}),
    });
  }
  const compactImprovedEvasion = /\b(improved evasion)\s+(with (?:a|an|the) [^,.;]{1,60})/ig;
  for (const match of sentence.matchAll(compactImprovedEvasion)) {
    if (defenseSubjectUnsafe(sentence, match.index) || !results.some((row) => row.kind === "evasion")) continue;
    results.push({
      sourceFeatureId: feature.id,
      kind: "improvedEvasion",
      label: featureLabel(feature),
      minimumLevel: sentenceLevel(feature, sentence, match.index, match.index + match[0].length),
      base: 0,
      qualifier: "improved evasion",
      condition: match[2].toLowerCase(),
    });
  }
  const uncannyDodge = /\b(?:gains?|has|receives?)\s+(?:the )?(improved uncanny dodge|uncanny dodge)\b/ig;
  for (const match of sentence.matchAll(uncannyDodge)) {
    const prefix = sentence.slice(0, match.index);
    if (defenseSubjectUnsafe(sentence, match.index) || /\b(?:does not|doesn't|may)\s*$/i.test(prefix.slice(-16)) || (/^improved/i.test(match[1]) && /\bif\b[^.;]{0,160}\balready (?:has|possesses)\b/i.test(prefix))) continue;
    const condition = activationCondition(feature, sentence, match.index, match.index + match[0].length, summary);
    results.push({
      sourceFeatureId: feature.id,
      kind: /^improved/i.test(match[1]) ? "improvedUncannyDodge" : "uncannyDodge",
      label: featureLabel(feature),
      minimumLevel: sentenceLevel(feature, sentence, match.index, match.index + match[0].length),
      base: 0,
      qualifier: match[1].toLowerCase(),
      ...(condition ? { condition } : {}),
    });
  }
  const fortification = /\b(?:gains?|has)\s+(?:a )?(\d+)% chance to negate (?:(?:the )?extra damage from )?(critical hits?(?: and (?:sneak attacks?|precision damage))?)/ig;
  for (const match of sentence.matchAll(fortification)) {
    if (defenseSubjectUnsafe(sentence, match.index)) continue;
    const condition = activationCondition(feature, sentence, match.index, match.index + match[0].length, summary);
    results.push(progression({
      sourceFeatureId: feature.id,
      kind: "fortification",
      label: featureLabel(feature),
      minimumLevel: sentenceLevel(feature, sentence, match.index, match.index + match[0].length),
      base: Number(match[1]),
      qualifier: match[2].toLowerCase(),
      ...(condition ? { condition } : {}),
    }, summary));
  }
  const concealment = /\b(?:gains?|has|benefits? from)\s+(?:a )?(?:(\d+)% )?(total )?concealment\b/ig;
  for (const match of sentence.matchAll(concealment)) {
    if (defenseSubjectUnsafe(sentence, match.index)) continue;
    const condition = activationCondition(feature, sentence, match.index, match.index + match[0].length, summary);
    results.push({
      sourceFeatureId: feature.id,
      kind: "concealment",
      label: featureLabel(feature),
      minimumLevel: sentenceLevel(feature, sentence, match.index, match.index + match[0].length),
      base: Number(match[1] ?? (match[2] ? 50 : 20)),
      qualifier: match[2] ? "total concealment" : "concealment",
      ...(condition ? { condition } : {}),
    });
  }
  const missChance = /\b(?:gains?|has|benefits? from)\s+(?:a )?(\d+)% miss chance\b/ig;
  for (const match of sentence.matchAll(missChance)) {
    if (defenseSubjectUnsafe(sentence, match.index)) continue;
    const condition = activationCondition(feature, sentence, match.index, match.index + match[0].length, summary);
    results.push({
      sourceFeatureId: feature.id,
      kind: "missChance",
      label: featureLabel(feature),
      minimumLevel: sentenceLevel(feature, sentence, match.index, match.index + match[0].length),
      base: Number(match[1]),
      qualifier: "miss chance",
      ...(condition ? { condition } : {}),
    });
  }
  if (/uncanny dodge/i.test(feature.name ?? "") && /\bcannot be caught flat-footed\b[^.]{0,160}\b(?:nor does (?:he|she|the [a-z]+)|(?:he|she|the [a-z]+) does not|(?:he|she|the [a-z]+) doesn't) lose (?:his|her|their) Dexterity bonus to AC\b/i.test(sentence)) results.push({
    sourceFeatureId: feature.id,
    kind: "uncannyDodge",
    label: featureLabel(feature),
    minimumLevel: Number(feature.level ?? 1),
    base: 0,
    qualifier: "uncanny dodge",
  });
  if (/improved uncanny dodge/i.test(feature.name ?? "") && /\bcan no longer be flanked\b/i.test(sentence)) results.push({
    sourceFeatureId: feature.id,
    kind: "improvedUncannyDodge",
    label: featureLabel(feature),
    minimumLevel: Number(feature.level ?? 1),
    base: 0,
    qualifier: "improved uncanny dodge",
  });
  return results;
}

const ruleIsEntireFeature = (parsedSentenceIndexes, sentences) => sentences.every((sentence, index) =>
  parsedSentenceIndexes.has(index) || archetypeReplacementBoilerplate(sentence) ||
  (!/\d|\b(?:can|gains?|has|resistance|damage reduction|DR|level|action|spell|attack|damage|save|skill|immune)\b/i.test(sentence)),
);

export function inferredArchetypeDefenseDetails(archetype) {
  const adjustments = [];
  const fullyAutomatedFeatureIds = new Set();
  for (const replacement of archetype?.replacements ?? []) for (const feature of replacement.features ?? []) {
    const summary = String(feature.summary ?? "");
    if (/\b(?:one of the following|from the following list|selects? (?:one|an?|from))\b/i.test(summary)) continue;
    if (/\b[A-Z][A-Za-z' -]{2,50}\s*(?:\((?:Ex|Su|Sp)\))?\s*:\s*[^.]{0,350}\b(?:spell resistance|damage reduction|\bDR\b|resistance)\b/i.test(summary)) continue;
    const sentences = archetypeRuleSentences(summary);
    const parsedSentenceIndexes = new Set();
    let contextLevel = Number(feature.level ?? 1);
    for (const [index, sentence] of sentences.entries()) {
      const announcedLevel = [...sentence.matchAll(/\b(?:At|Starting at|Beginning at) (\d+)(?:st|nd|rd|th)(?:-level| level)?\b/gi)].at(-1)?.[1];
      if (announcedLevel) contextLevel = Number(announcedLevel);
      const rules = rulesFromSentence({ ...feature, level: contextLevel }, sentence, summary);
      if (rules.length) parsedSentenceIndexes.add(index);
      adjustments.push(...rules);
    }
    const featureAdjustments = adjustments.filter((adjustment) => adjustment.sourceFeatureId === feature.id);
    const hasUnparsedImmunity = /\b(?:immune|immunity)\b/i.test(summary) && !featureAdjustments.some((adjustment) => adjustment.kind === "immunity");
    const hasUnparsedMechanics = /\+\d+[^.]{0,80}\bbonus\b|\bbonus (?:on|to)|\bpenalty\b|\b(?:attack|saving throw|skill)\b|\b(?:chance|no longer|not subject)\b/i.test(summary);
    if (parsedSentenceIndexes.size && ruleIsEntireFeature(parsedSentenceIndexes, sentences) && !hasUnparsedImmunity && !hasUnparsedMechanics && !/\b(?:spend|expend)[^.]{0,100}\b|\b(?:standard|swift|immediate|move|full-round) action\b|\bonce per (?:day|week)\b|\buntil\b/i.test(summary)) fullyAutomatedFeatureIds.add(feature.id);
  }
  for (const adjustment of adjustments.filter((row) => row.kind === "improvedEvasion" && !row.condition)) {
    const basic = adjustments.find((row) => row.sourceFeatureId === adjustment.sourceFeatureId && row.kind === "evasion" && row.condition);
    if (basic) adjustment.condition = basic.condition;
  }
  for (const adjustment of adjustments.filter((row) => row.kind === "improvedUncannyDodge" && !row.condition)) {
    const basic = adjustments.find((row) => row.sourceFeatureId === adjustment.sourceFeatureId && row.kind === "uncannyDodge" && row.condition);
    if (basic) adjustment.condition = basic.condition;
  }
  for (const adjustment of adjustments.filter((row) => row.kind === "concealment" && !row.condition)) {
    const earlier = adjustments.find((row) => row.sourceFeatureId === adjustment.sourceFeatureId && row.kind === "concealment" && row.minimumLevel < adjustment.minimumLevel && row.condition);
    if (earlier) adjustment.condition = earlier.condition;
  }
  const grouped = new Map();
  for (const adjustment of adjustments) {
    const key = JSON.stringify([adjustment.sourceFeatureId, adjustment.kind, adjustment.qualifier, adjustment.condition]);
    const previous = grouped.get(key);
    if (previous && adjustment.kind === "concealment" && adjustment.minimumLevel !== previous.minimumLevel) {
      const steps = [...(previous.bonusByLevel ?? [{ level: previous.minimumLevel, bonus: previous.base }]), { level: adjustment.minimumLevel, bonus: adjustment.base }]
        .sort((left, right) => left.level - right.level);
      grouped.set(key, { ...previous, minimumLevel: steps[0].level, base: steps[0].bonus, bonusByLevel: [...new Map(steps.map((step) => [step.level, step])).values()] });
      continue;
    }
    if (!previous || adjustment.minimumLevel < previous.minimumLevel || (adjustment.minimumLevel === previous.minimumLevel && (adjustment.bonusByLevel?.length ?? 0) > (previous.bonusByLevel?.length ?? 0))) grouped.set(key, adjustment);
  }
  const unique = [...grouped.values()].map((adjustment) => {
    if (adjustment.kind !== "energyResistance") return adjustment;
    const immunityLevel = [...grouped.values()].find((row) => row.sourceFeatureId === adjustment.sourceFeatureId && row.kind === "immunity" && row.qualifier === adjustment.qualifier)?.minimumLevel;
    return immunityLevel && immunityLevel > adjustment.minimumLevel ? { ...adjustment, maximumLevel: immunityLevel - 1 } : adjustment;
  });
  return { adjustments: unique, fullyAutomatedFeatureIds };
}

export const inferArchetypeDefenseAdjustments = (archetype) => inferredArchetypeDefenseDetails(archetype).adjustments;

export function archetypeDefenseAdjustments(archetype) {
  const explicit = archetype?.defenseAdjustments ?? [];
  return [...explicit, ...inferArchetypeDefenseAdjustments(archetype).filter((adjustment) =>
    !explicit.some((row) => row.sourceFeatureId && row.sourceFeatureId === adjustment.sourceFeatureId && row.kind === adjustment.kind && row.qualifier === adjustment.qualifier),
  )];
}

const valueAtLevel = (adjustment, classLevel, characterLevel) => adjustment.bonusByLevel
  ?.filter((step) => step.level <= classLevel)
  .at(-1)?.bonus ?? adjustment.base + (adjustment.levelMultiplier ?? 0) * (adjustment.usesCharacterLevel ? characterLevel : classLevel);

export function archetypeDefenses(archetypes = [], classLevels = {}) {
  const characterLevel = Object.values(classLevels).reduce((total, level) => total + Math.max(0, Number(level) || 0), 0);
  const defenses = archetypes.flatMap((archetype) => {
    const classLevel = Math.max(0, Number(classLevels[archetype.classId]) || 0);
    return archetypeDefenseAdjustments(archetype)
      .filter((adjustment) => classLevel >= (adjustment.minimumLevel ?? 1) && classLevel <= (adjustment.maximumLevel ?? 20))
      .map((adjustment) => ({ ...adjustment, value: valueAtLevel(adjustment, classLevel, characterLevel), source: archetype.name }));
  });
  return defenses.filter((defense) =>
    (defense.kind !== "evasion" || !defenses.some((other) => other.kind === "improvedEvasion" && other.source === defense.source && (!other.condition || other.condition === defense.condition))) &&
    (defense.kind !== "uncannyDodge" || !defenses.some((other) => other.kind === "improvedUncannyDodge" && other.source === defense.source && (!other.condition || other.condition === defense.condition))),
  );
}
