const sourceSuffix = /\s+(?:APG|ACG|ARG|OA|UC|UI|ISG|UW|HA|WMH|CoP)$/i;
const choiceNumber = (value) => ({ four: 4, five: 5, six: 6 }[String(value).toLowerCase()] ?? Number(value));

const normalizeName = (value) => String(value)
  .replace(sourceSuffix, "")
  .replace(/\s+feat$/i, "")
  .replace(/^(?:a|an|the)\s+/i, "")
  .trim()
  .toLowerCase();

export function inferArchetypeGrantedFeats(archetype, feats) {
  const featIdByName = new Map((feats ?? []).map(feat => [normalizeName(feat.name), feat.id]));
  const grants = [];
  const seen = new Set();
  for (const feature of (archetype?.replacements ?? []).flatMap(item => item.features ?? [])) {
    const explicit = new Set([feature.grantedFeatId, ...(feature.grantedFeatIds ?? [])].filter(Boolean));
    for (const rawSentence of String(feature.summary ?? "").replace(/\s+/g, " ").split(/(?<=[.!?])\s+/)) {
      const sentence = rawSentence.replace(/â€™|Ã¢â‚¬â„¢|ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢/g, "'");
      const gainIndex = sentence.search(/\b(?:gains?|receives?|is granted)\b/i);
      if (gainIndex < 0) continue;
      if (/\b(?:animal companion|companion|eidolon|familiar|homunculus|phantom|mount)\b/i.test(sentence.slice(0, gainIndex))) continue;
      const match = sentence.match(/\b(?:gains?|receives?|is granted)\s+(?:the\s+)?(.+?)\s+as\s+(?:an?\s+)?(?:additional\s+)?bonus feats?\b/i);
      if (!match || /\b(?:any|either|choice|chooses?|one of|for which)\b/i.test(match[1])) continue;
      const names = match[1].split(/\s*,\s*|\s+and\s+/i).map(name => name.trim()).filter(Boolean);
      const ids = names.map(name => featIdByName.get(normalizeName(name)));
      if (ids.some(id => !id)) continue;
      const statedLevel = sentence.match(/\b(?:at|upon reaching)\s+(\d+)(?:st|nd|rd|th)?\s+level\b/i);
      const level = statedLevel ? Number(statedLevel[1]) : Math.max(1, Math.trunc(feature.level ?? 1));
      for (const featId of ids) {
        if (explicit.has(featId)) continue;
        const key = `${feature.id}:${level}:${featId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        grants.push({ featureId: feature.id, featId, level });
      }
    }
  }
  return grants;
}

const ordinalLevels = (text) => [...String(text).matchAll(/\b(\d+)(?:st|nd|rd|th)?\s+level\b/gi)].map(match => Number(match[1]));

export function inferArchetypeFeatChoices(archetype, feats, maximumLevel = 20) {
  const featIdByName = new Map((feats ?? []).map(feat => [normalizeName(feat.name), feat.id]));
  const choices = [];
  const addChoices = (feature, levels, limits) => {
    for (const [index, level] of [...new Set(levels)].filter(value => value >= 1 && value <= maximumLevel).sort((a, b) => a - b).entries()) {
      choices.push({
        id: `${feature.id}-inferred-feat-${level}-${index + 1}`,
        name: `${feature.name.replace(/\s*\([^)]+\)\s*$/, "")} bonus feat`,
        level,
        type: "archetype",
        summary: feature.summary,
        choiceRequired: true,
        optionGroupId: "archetype-feats",
        classId: archetype.classId,
        sourceFeatureId: feature.id,
        ignoreFeatPrerequisites: /(?:need not|doesn't need to|does not need to) meet (?:the )?prerequisites/i.test(feature.summary ?? ""),
        ...limits,
      });
    }
  };
  for (const feature of (archetype?.replacements ?? []).flatMap(item => item.features ?? [])) {
    if (feature.optionGroupId) continue;
    const text = String(feature.summary ?? "").replace(/\s+/g, " ");
    const either = text.match(/\bgains? either ([A-Z][A-Za-z' -]+?) or ([A-Z][A-Za-z' -]+?) as (?:a )?bonus feat/i);
    if (either) {
      const ids = [either[1], either[2]].map(name => featIdByName.get(normalizeName(name)));
      if (ids.every(Boolean)) addChoices(feature, [ordinalLevels(text.slice(0, either.index + either[0].length)).at(-1) ?? feature.level ?? 1], { featChoiceIds: ids });
      continue;
    }
    if (!/\b(?:teamwork|item creation) feat as (?:a )?bonus feat/i.test(text) || /^Bonus Feats?$/i.test(feature.name ?? "")) continue;
    const featType = /item creation feat/i.test(text) ? "item-creation" : "teamwork";
    let levels = [];
    const opening = text.match(/^(.{0,120}?)(?:gains?|receives?) (?:an? |one |an additional )?(?:teamwork|item creation) feat as (?:a )?bonus feat/i);
    if (opening) levels = ordinalLevels(opening[1]);
    if (!levels.length) levels = [Math.max(1, Math.trunc(feature.level ?? 1))];
    const every = text.match(/additional (?:item creation )?(?:bonus )?feat (?:at |for )?every\s+(\d+|four|six)\s+levels? (?:thereafter|attained after\s+(\d+)(?:st|nd|rd|th)?)/i);
    if (every) {
      const interval = choiceNumber(every[1]);
      const base = Number(every[2] ?? levels[0]);
      const maximum = Number(text.match(/maximum of\s+(\d+)\s+bonus feats?/i)?.[1] ?? 20);
      levels = Array.from({ length: maximum }, (_, index) => base + index * interval).filter(level => level <= maximumLevel);
    }
    addChoices(feature, levels, { featChoiceTypes: [featType] });
  }
  return choices;
}
