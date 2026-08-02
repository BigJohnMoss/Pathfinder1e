const abilityNames = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const numberWords = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const numericValue = (value) => numberWords[String(value).toLowerCase()] ?? Number(value);

const resourceId = (feature) => `archetype-${feature.id}`;
const resourceLabel = (feature) => String(feature.name ?? "Archetype resource").replace(/\s*\([A-Za-z, ]+\)\s*$/, "").trim();

function parseFormula(raw, minimumLevel) {
  let text = String(raw)
    .replace(/\([^)]*minimum[^)]*\)/gi, "")
    .replace(/\b(?:his|her|their|the|your)\b/gi, "")
    .replace(/\b(?:alchemist|bard|brawler|cavalier|cleric|druid|fighter|gunslinger|hunter|inquisitor|investigator|kineticist|magus|medium|mesmerist|monk|occultist|oracle|paladin|psychic|ranger|rogue|samurai|shaman|skald|slayer|sorcerer|spiritualist|summoner|swashbuckler|warpriest|witch|wizard)\b/gi, "class")
    .replace(/\s+/g, " ")
    .trim();
  const abilityEnd = text.match(/\b(?:modifier|bonus)\b/i);
  if (abilityEnd && !/^\s*\+\s*(?:(?:1\s*\/\s*2|half|twice|double) )?(?:class )?level/i.test(text.slice(abilityEnd.index + abilityEnd[0].length)))
    text = text.slice(0, abilityEnd.index + abilityEnd[0].length);
  const ability = abilityNames.find(name => new RegExp(`${name} (?:modifier|bonus)`, "i").test(text));
  const abilityMultiplier = ability && new RegExp(`(?:twice|double) (?:the )?${ability} (?:modifier|bonus)`, "i").test(text) ? 2 : 1;
  const constant = Number(text.match(/(?:^|\+)\s*(\d+)\s*(?:\+|$)/)?.[1] ?? 0);
  const hasHalfLevel = /(?:1\s*\/\s*2|half) (?:class )?level/i.test(text);
  const hasDoubleLevel = /(?:twice|double) (?:class )?level/i.test(text);
  const hasLevel = !hasHalfLevel && !hasDoubleLevel && /(?:class )?level/i.test(text);
  if (!ability && !hasHalfLevel && !hasDoubleLevel && !hasLevel && !Number.isFinite(constant)) return undefined;
  if (!ability && !hasHalfLevel && !hasDoubleLevel && !hasLevel && constant === 0) return undefined;
  return {
    base: constant,
    ...(ability ? { abilityModifier: ability } : {}),
    ...(abilityMultiplier > 1 ? { abilityMultiplier } : {}),
    ...(hasHalfLevel ? { levelDivisor: 2 } : {}),
    ...(hasDoubleLevel ? { levelMultiplier: 2 } : {}),
    ...(hasLevel ? { levelMultiplier: 1 } : {}),
    minimum: /minimum (?:of )?1|minimum 1/i.test(raw) ? 1 : 0,
    minimumLevel,
  };
}

export function inferArchetypeResourceAdjustments(archetype) {
  const inferred = [];
  const features = (archetype?.replacements ?? []).flatMap(item => item.features ?? []);
  for (const feature of features) {
    // These headings are either parser fragments or containers for subordinate
    // creature abilities, so a tracker named after the heading would mislead.
    if (/^saving throws?$/i.test(String(feature.name ?? "").trim()) || /\bfamiliar\b/i.test(String(feature.name ?? ""))) continue;
    const minimumLevel = Math.max(1, Math.trunc(feature.level ?? 1));
    const sentences = String(feature.summary ?? "").replace(/\s+/g, " ").split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      if (/(?:companion|eidolon|familiar|homunculus|phantom|mount)\b[^.]{0,100}\b(?:times|rounds|points) per day/i.test(sentence)) continue;
      const unit = /rounds? per day/i.test(sentence) ? "round" : /\bpool\b|points? in/i.test(sentence) ? "point" : "use";
      if (/\beach (?:spell-like ability|of (?:these|the following))/i.test(sentence)) continue;
      const formulaMatch = sentence.match(/(?:number|total number) of (?:times|rounds) per day equal to (.+?)(?:[,.;]|$)/i)
        ?? sentence.match(/(?:number of points in [^.]{0,60} pool|(?:begins with|has|gains?) (?:an? |the )?[a-z' -]{1,45} pool) (?:is )?equal to (.+?)(?:[,.;]|$)/i);
      let adjustment;
      if (formulaMatch) adjustment = parseFormula(formulaMatch[1], minimumLevel);
      if (!adjustment) {
        const fixed = sentence.match(/(?:can|may) (?:use|cast|channel|attempt|perform)[^.]{0,100}?\b(once|twice|\d+ times?) per day/i);
        if (fixed) adjustment = { base: fixed[1].toLowerCase() === "once" ? 1 : fixed[1].toLowerCase() === "twice" ? 2 : Number(fixed[1].match(/\d+/)?.[0]), minimumLevel, minimum: 0 };
      }
      if (!adjustment) continue;
      const perLevel = sentence.match(/once per day (?:for every|per)\s*(\d+|one|two|three|four|five|six)?\s*(?:(?:class|[a-z]+) )?levels?/i);
      if (perLevel) {
        const divisor = perLevel[1] ? numericValue(perLevel[1]) : 1;
        adjustment.base = 0;
        delete adjustment.perInterval;
        delete adjustment.interval;
        if (divisor === 1) adjustment.levelMultiplier = 1;
        else adjustment.levelDivisor = divisor;
      }
      const scaling = sentence.match(/(?:plus|and|gaining) (?:one|an) additional (?:use |time )?(?:per day )?(?:at [^.]{0,35}? and )?(?:for |at )?every\s+(\d+|one|two|three|four|five|six)\s+(?:(?:class|[a-z]+) )?levels?(?: beyond [^,.;]+| thereafter)?/i);
      if (scaling) {
        adjustment.perInterval = 1;
        adjustment.interval = numericValue(scaling[1]);
      }
      const maximum = sentence.match(/(?:maximum|total) of\s+(\d+)\s+(?:times|uses)/i);
      if (maximum) adjustment.maximum = Number(maximum[1]);
      inferred.push({
        resourceId: resourceId(feature),
        label: resourceLabel(feature),
        unit,
        operation: "replace",
        ...adjustment,
      });
      break;
    }
  }
  return inferred;
}
