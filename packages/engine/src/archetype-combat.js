import {
  archetypeReplacementBoilerplate,
  archetypeRuleCondition,
  archetypeRuleProgression,
  archetypeRuleSentences,
  archetypeUnsafeSubject,
} from "./archetype-initiative.js";

const combatTargetOrder = ["attackRolls", "damageRolls", "armorClass", "cmb", "cmd"];
const targetLabels = {
  attackRolls: "Attack rolls",
  damageRolls: "Damage rolls",
  armorClass: "Armor Class",
  cmb: "Combat maneuver checks",
  cmd: "CMD",
};

const targetPatterns = {
  attackRolls: /\battack and damage rolls?\b|\battack rolls?\b/i,
  damageRolls: /\battack and damage rolls?\b|\bdamage rolls?\b/i,
  armorClass: /\b(?:AC|Armor Class)\b/i,
  cmb: /\b(?:CMB|combat maneuver checks?)\b/i,
  cmd: /\bCMD\b/i,
};

const bonusPattern = /\b(?:(?:gains?|receives?|has) (?:an? )?|(?:and|plus|as well as) (?:an? )?)\+(\d+) (?:(alchemical|armor|circumstance|competence|deflection|dodge|enhancement|insight|luck|morale|natural armor|profane|racial|resistance|sacred|shield|trait|untyped) )?bonus(?:es)? (?:on|to) /gi;

const targetLabel = (targets) => targets.map((target) => targetLabels[target]).join(" and ");

const combatUnsafeSubject = (sentence, matchIndex) => {
  if (archetypeUnsafeSubject(sentence, matchIndex)) return true;
  const prefix = sentence.slice(Math.max(0, matchIndex - 140), matchIndex);
  return /\b(?:each|all|the|his|her|their)?\s*(?:animals?|armies|army|cohorts?|followers?|opponents?|plants?|units?)(?:\s+[a-z'\u2019-]+){0,7}\s*$/i.test(prefix);
};

function conditionFromSegment(sentence, bonus, segment, targetMatches) {
  const shared = archetypeRuleCondition(sentence, bonus.index + bonus[0].length);
  const first = targetMatches.toSorted((left, right) => left.index - right.index)[0];
  const last = targetMatches.toSorted((left, right) => right.end - left.end)[0];
  const before = segment.slice(0, first.index).replace(/^(?:all|both)\s+/i, "").trim();
  const after = segment.slice(last.end).trim().replace(/^(?:and|or)\s+/i, "");
  const trailing = after.match(/^((?:made )?(?:with|using|against|while|when|whenever|during|within|if|as long as|from|for|in melee with|in combat with|to(?: resist| avoid)?))\s+(.+?)(?=,?\s+and (?:an? \+\d|the|he|she|they)|;|[.]|$)/i);
  const appliesOnly = after.match(/^(?:that )?applies? only (?:on|when|against)\s+(.+?)(?=;|[.]|$)/i);
  const subjectRestriction = sentence.slice(0, bonus.index).match(/\b(wielding|wearing|using|armed with)\s+(.+?)\s+(?:gains?|receives?|has)\s*$/i);
  const chosenRestriction = sentence.slice(0, bonus.index).match(/\bchooses?\s+(.+?)\s+and\s+(?:gains?|receives?|has)\s*$/i);
  if (shared && appliesOnly) return `${shared}; only on ${appliesOnly[1]}`;
  if (shared && /^(?:(?:At|Beginning at) \d+(?:st|nd|rd|th) level,?\s*)?(?:when|whenever|while|during|within|if|as long as)\b/i.test(sentence)) return shared;
  if (appliesOnly) return `only on ${appliesOnly[1]}`;
  if (trailing) return `${trailing[1].toLowerCase()} ${trailing[2]}`;
  if (shared) return shared;
  if (subjectRestriction) return `while ${subjectRestriction[1].toLowerCase()} ${subjectRestriction[2]}`;
  if (chosenRestriction) return `with the chosen ${chosenRestriction[1]}`;
  if (!before || /^(?:(?:(?:his|her|their)\s+)?(?:touch|flat-footed)|(?:a|an|the|all|both|and|or|attack|damage|weapon))\s*$/i.test(before)) return undefined;
  if (/^ranged$/i.test(before)) return "with ranged attacks";
  if (/^melee$/i.test(before)) return "with melee attacks";
  if (/^(?:weapon|weapon-based)$/i.test(before)) return "with weapons";
  if (/^natural(?: weapon)?$/i.test(before)) return "with natural weapons";
  return before.toLowerCase();
}

function cleanCondition(condition) {
  if (!condition) return undefined;
  const cleaned = String(condition)
    .split(/,\s+(?:as well as|and (?:also )?(?:on )?)(?:an? )?\+\d+\b/i, 1)[0]
    .split(/\s+and (?:an? )?\+\d+\s+(?:[a-z-]+ )?bonus\b/i, 1)[0]
    .split(/,\s+(?:improving|increasing)\b/i, 1)[0]
    .trim()
    .replace(/[;,]+$/, "");
  if (!cleaned || cleaned.length > 250 || /\bLeader gains\b|sacred\/profane/i.test(cleaned)) return undefined;
  if (/^(?:a single|the|her|his|their|it|for \d+ rounds?)$/i.test(cleaned)) return undefined;
  return cleaned;
}

function sentenceAdjustments(feature, sentence) {
  const bonuses = [...sentence.matchAll(bonusPattern)];
  const adjustments = bonuses.flatMap((bonus, index) => {
    if (combatUnsafeSubject(sentence, bonus.index)) return [];
    const nextIndex = bonuses[index + 1]?.index ?? sentence.length;
    const segment = sentence.slice(bonus.index + bonus[0].length, nextIndex).split(/;|[.]/, 1)[0];
    const targetMatches = combatTargetOrder.flatMap((target) => {
      const match = targetPatterns[target].exec(segment);
      return match ? [{ target, index: match.index, end: match.index + match[0].length }] : [];
    });
    if (!targetMatches.length) return [];
    const targets = combatTargetOrder.filter((target) => targetMatches.some((match) => match.target === target));
    const armorMatch = targetMatches.find((match) => match.target === "armorClass");
    const armorPrefix = armorMatch ? segment.slice(0, armorMatch.index) : "";
    const armorClassParts = /flat-footed\s*$/i.test(armorPrefix) ? ["flatFooted"] : /touch\s*$/i.test(armorPrefix) ? ["touch"] : undefined;
    const condition = cleanCondition(conditionFromSegment(sentence, bonus, segment, targetMatches));
    return [{
      sourceFeatureId: feature.id,
      label: armorClassParts?.[0] === "touch" ? targetLabel(targets).replace("Armor Class", "Touch Armor Class") : armorClassParts?.[0] === "flatFooted" ? targetLabel(targets).replace("Armor Class", "Flat-footed Armor Class") : targetLabel(targets),
      combatTargets: targets,
      ...(armorClassParts ? { armorClassParts } : {}),
      minimumLevel: Number(sentence.slice(0, bonus.index).match(/\b(?:At|Beginning at) (\d+)(?:st|nd|rd|th) level\b/i)?.[1] ?? feature.level ?? 1),
      base: Number(bonus[1]),
      ...(bonus[2] ? { bonusType: bonus[2].toLowerCase().replace("natural armor", "natural-armor") } : {}),
      ...(condition ? { condition } : {}),
    }];
  });
  const sharedCondition = adjustments.findLast((adjustment) => adjustment.condition)?.condition;
  return sharedCondition && adjustments.length > 1
    ? adjustments.map((adjustment) => adjustment.condition ? adjustment : { ...adjustment, condition: sharedCondition })
    : adjustments;
}

function narrativeLeadSentence(sentence) {
  const withoutLevel = sentence.replace(/^(?:At|Beginning at) \d+(?:st|nd|rd|th) level,?\s*/i, "");
  return !/\d|\b(?:armor class|attack|bonus|can|check|damage|DC|feet?|gains?|immune|immunity|level|may|must|penalty|rank|receives?|resistance|roll|round|save|skill|spell|speed|times? per|uses?)\b/i.test(withoutLevel);
}

function directCombatRuleSentence(sentence, parsedCount) {
  const withoutLevel = sentence.replace(/^(?:At|Beginning at) \d+(?:st|nd|rd|th) level,?\s*/i, "");
  const verbIndex = withoutLevel.search(/\b(?:gains?|receives?|has)\b/i);
  const subject = verbIndex >= 0 ? withoutLevel.slice(0, verbIndex).trim() : "";
  const direct = /^(?:he|she|they|it|(?:an?|the)\s+(?:[a-z'\u2019-]+\s+){0,4}[a-z'\u2019-]+)$/i.test(subject);
  const numericBonuses = sentence.match(/\+\d+ (?:[a-z-]+ )?bonus(?:es)?\b/gi)?.length ?? 0;
  return direct && numericBonuses === parsedCount &&
    !/\b(?:can|may|spends?|uses?|becomes? immune|is unaffected|cannot exceed|however|extra attack|critical|for each|equal to|initiative|saving throws?|skill checks?|speed|up to a maximum bonus equal to)\b/i.test(sentence);
}

function combatRuleProgression(adjustment, summary) {
  const progressed = archetypeRuleProgression(adjustment, summary, /\b(?:attack|damage|AC|Armor Class|CMB|CMD|combat maneuver)\b/i);
  if (!progressed.bonusByLevel || progressed.bonusByLevel.length < 2 || adjustment.combatTargets.length !== 1) return progressed;
  const target = adjustment.combatTargets[0];
  const targetPattern = target === "attackRolls" ? "attack(?: rolls?)?" : target === "damageRolls" ? "damage(?: rolls?)?" : target === "armorClass" ? "(?:AC|Armor Class)" : target === "cmb" ? "(?:CMB|combat maneuver checks?)" : "CMD";
  const maximum = Number(String(summary).match(new RegExp(`maximum[^.]{0,160}?\\+(\\d+) (?:on|to) ${targetPattern}`, "i"))?.[1] ?? 0);
  if (!maximum || progressed.bonusByLevel.at(-1).bonus >= maximum) return progressed;
  const steps = [...progressed.bonusByLevel];
  const interval = steps[1].level - steps[0].level;
  const increment = steps[1].bonus - steps[0].bonus;
  if (interval < 1 || increment < 1) return progressed;
  while (steps.at(-1).level + interval <= 20 && steps.at(-1).bonus < maximum)
    steps.push({ level: steps.at(-1).level + interval, bonus: Math.min(maximum, steps.at(-1).bonus + increment) });
  return { ...progressed, maximum, bonusByLevel: steps };
}

export function inferredArchetypeCombatModifierDetails(archetype) {
  const adjustments = [];
  const fullyAutomatedFeatureIds = new Set();
  for (const replacement of archetype?.replacements ?? []) {
    for (const feature of replacement.features ?? []) {
      if (/^(?:Deeds?|Bonus Feats?|Revelations?)$/i.test(feature.name ?? "")) continue;
      if (/\b(?:choose|chooses|chosen|select|selects|selected) (?:one|a|an|from)|\bone of the (?:following|options)|\bfollowing (?:abilities|benefits|options)\b/i.test(feature.summary ?? "")) continue;
      if (/\bcan spend\b[^.]{0,120}\bto gain\b|\beither\b[^.]{0,250}\bor\b|\b[A-Z][A-Za-z\u2019' -]+ \((?:Ex|Su|Sp)\)\s*:/i.test(feature.summary ?? "")) continue;
      if ((String(feature.summary ?? "").match(/Leader gains/gi)?.length ?? 0) >= 3) continue;
      const sentences = archetypeRuleSentences(feature.summary);
      const parsed = sentences.flatMap((sentence, index) =>
        sentenceAdjustments(feature, sentence).map((adjustment) => ({
          index,
          adjustment: combatRuleProgression(adjustment, feature.summary),
        })),
      );
      const safeParsed = parsed.filter(({ index, adjustment }) =>
        adjustment.condition || /^(?:(?:At|Beginning at) \d+(?:st|nd|rd|th) level,?\s*)?(?:(?:he|she|they|it)|(?:an?|the)\s+[a-z])/i.test(sentences[index]),
      );
      const unique = [...new Map(safeParsed.map((entry) => [JSON.stringify(entry.adjustment), entry])).values()];
      adjustments.push(...unique.map(({ adjustment }) => adjustment));
      const parsedBySentence = new Map();
      for (const entry of unique) parsedBySentence.set(entry.index, (parsedBySentence.get(entry.index) ?? 0) + 1);
      const hasScheduledProgression = unique.some(({ adjustment }) => adjustment.bonusByLevel || adjustment.interval);
      const firstParsedIndex = unique.length ? Math.min(...unique.map(({ index }) => index)) : -1;
      const hasOtherMechanics = (parsedIndex) => sentences.some((sentence, index) =>
        index !== parsedIndex &&
        !archetypeReplacementBoilerplate(sentence) &&
        !narrativeLeadSentence(sentence) &&
        !(hasScheduledProgression && /\b(?:this|the|these) bonus(?:es)?\b[^.]{0,100}\b(?:increases?|improves?)\b/i.test(sentence)),
      );
      for (const entry of unique) {
        if (!entry.adjustment.condition && (!directCombatRuleSentence(sentences[entry.index], parsedBySentence.get(entry.index)) || hasOtherMechanics(entry.index)))
          entry.adjustment.condition = `when ${String(feature.name ?? "this feature").replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, "")} applies`;
      }
      const remaining = sentences.filter((sentence, index) =>
        !archetypeReplacementBoilerplate(sentence) &&
        !(parsedBySentence.has(index) && directCombatRuleSentence(sentence, parsedBySentence.get(index))) &&
        !(index < firstParsedIndex && narrativeLeadSentence(sentence)) &&
        !(hasScheduledProgression && /\b(?:this|the|these) bonus(?:es)?\b[^.]{0,100}\b(?:increases?|improves?)\b/i.test(sentence)),
      );
      if (unique.length && remaining.length === 0) fullyAutomatedFeatureIds.add(feature.id);
    }
  }
  return { adjustments, fullyAutomatedFeatureIds };
}

export function inferArchetypeCombatModifierAdjustments(archetype) {
  return inferredArchetypeCombatModifierDetails(archetype).adjustments;
}

export function archetypeCombatModifierAdjustments(archetype) {
  if ((archetype?.mechanicalCoverage ?? "partial") === "full") return [];
  const explicit = archetype?.conditionalModifiers ?? [];
  const normalized = (value) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return inferArchetypeCombatModifierAdjustments(archetype).filter((item) =>
    !explicit.some((row) =>
      (row.sourceFeatureId && row.sourceFeatureId === item.sourceFeatureId && normalized(row.label) === normalized(item.label)) ||
      (normalized(row.label) === normalized(item.label) && normalized(row.condition) === normalized(item.condition))),
  );
}
