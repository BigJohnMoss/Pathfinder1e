const sourceSuffix = /\s+(?:APG|ACG|ARG|OA|UC|UI|ISG|UW|HA|WMH|CoP)$/i;
const choiceNumber = (value) => ({ three: 3, four: 4, five: 5, six: 6 }[String(value).toLowerCase()] ?? Number(value));

const normalizeName = (value) => String(value)
  .replace(/-\s+/g, "-")
  .replace(/\s*\*+\s*$/, "")
  .replace(sourceSuffix, "")
  .replace(/\s*\([^)]*\)\s*$/, "")
  .replace(/\s+feat$/i, "")
  .replace(/^(?:a|an|the)\s+/i, "")
  .trim()
  .toLowerCase();

const featNameMap = (feats) => {
  const result = new Map();
  for (const feat of feats ?? []) {
    const name = normalizeName(feat.name);
    result.set(name, feat.id);
    const armor = name.match(/^armor proficiency,\s*(light|medium|heavy)$/);
    if (armor) result.set(`${armor[1]} armor proficiency`, feat.id);
  }
  return result;
};

export function inferArchetypeGrantedFeats(archetype, feats) {
  const featIdByName = featNameMap(feats);
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

const ordinalLevels = (text) => {
  const value = String(text);
  const levels = [...value.matchAll(/\b(\d+)(?:st|nd|rd|th)?\s+levels?\b/gi)].map(match => Number(match[1]));
  for (const list of value.matchAll(/\b((?:\d+(?:st|nd|rd|th)?\s*(?:,\s*(?:and\s+)?|and\s+))+\d+(?:st|nd|rd|th)?)\s+levels?\b/gi)) {
    levels.push(...[...list[1].matchAll(/\d+/g)].map(match => Number(match[0])));
  }
  return [...new Set(levels)];
};

export function inferArchetypeFeatChoices(archetype, feats, maximumLevel = 20) {
  const featIdByName = featNameMap(feats);
  const choices = [];
  const addChoices = (feature, levels, limits) => {
    const featureName = feature.name.replace(/\s*\([^)]+\)\s*$/, "");
    for (const [index, level] of [...new Set(levels)].filter(value => value >= 1 && value <= maximumLevel).sort((a, b) => a - b).entries()) {
      choices.push({
        id: `${feature.id}-inferred-feat-${level}-${index + 1}`,
        name: /bonus feat/i.test(featureName) ? featureName : `${featureName} bonus feat`,
        level,
        type: "archetype",
        summary: feature.summary,
        choiceRequired: true,
        optionGroupId: "archetype-feats",
        classId: archetype.classId,
        sourceFeatureId: feature.id,
        ignoreFeatPrerequisites: /(?:need not|doesn['’]t need to|does not need to)[^.]{0,100}?prerequisites/i.test(feature.summary ?? ""),
        ...(typeof limits === "function" ? limits(level) : limits),
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
    const namedList = text.match(/\bAt\s+(\d+)(?:st|nd|rd|th)?\s+level and every\s+(\d+|three|four)\s+(?:(?:[a-z]+)\s+)?levels? thereafter,[^.]{0,100}?\b(?:gains one|can select one) of the following (?:bonus )?feats?(?: as (?:a )?bonus feat)?\s*:\s*([^.]+)/i);
    if (namedList) {
      const names = namedList[3].replace(/\s+(?:or|and)\s+/gi, ",").split(",").map(name => name.trim()).filter(Boolean);
      const ids = names.map(name => featIdByName.get(normalizeName(name)));
      if (ids.length > 1 && ids.every(Boolean)) {
        const base = Number(namedList[1]);
        const interval = choiceNumber(namedList[2]);
        addChoices(feature, Array.from({ length: 20 }, (_, index) => base + index * interval).filter(level => level <= maximumLevel), { featChoiceIds: ids });
        continue;
      }
    }
    const publishedList = text.match(/\b(?:chosen|select(?:ed)?[^.:]{0,40}) from the following list\s*:\s*([^.]+)/i);
    if (publishedList && /^Bonus (?:Item Creation )?Feats?$/i.test(feature.name ?? "") && !/must include [^.]+ prerequisite or be selected from/i.test(text)) {
      const names = publishedList[1].replace(/\s+(?:or|and)\s+/gi, ",").split(",").map(name => name.trim()).filter(Boolean);
      const baseIds = names.map(name => featIdByName.get(normalizeName(name)));
      if (baseIds.length > 1 && baseIds.every(Boolean)) {
        const opening = text.slice(0, publishedList.index);
        const recurring = opening.match(/\bevery\s+(\d+|three|four|five|six)\s+levels? thereafter/i);
        let levels = ordinalLevels(recurring ? opening.slice(0, recurring.index) : opening);
        if (recurring && levels.length) {
          const interval = choiceNumber(recurring[1]);
          const base = levels.at(-1);
          levels = [...levels, ...Array.from({ length: 20 }, (_, index) => base + (index + 1) * interval).filter(level => level <= maximumLevel)];
        }
        for (const earned of text.matchAll(/\bgains? an additional bonus feat at ([^.]+)/gi)) levels.push(...ordinalLevels(earned[1]));
        const additions = [];
        for (const match of text.slice(publishedList.index + publishedList[0].length).matchAll(/\bAt\s+(\d+)(?:st|nd|rd|th)?\s+level,[^.]{0,100}?(?:also (?:choose|select) from(?: the following feats?)?|following feats? (?:are|is) added to (?:the|this) list)\s*:\s*([^.]+)/gi)) {
          const ids = match[2].replace(/\s+(?:or|and)\s+/gi, ",").split(",").map(name => name.trim()).filter(Boolean).map(name => featIdByName.get(normalizeName(name)));
          if (ids.length && ids.every(Boolean)) additions.push({ level: Number(match[1]), ids });
        }
        for (const match of text.slice(publishedList.index + publishedList[0].length).matchAll(/\bAt\s+(\d+)(?:st|nd|rd|th)?\s+level,[^.]{0,80}?also (?:choose|select)\s+([^.]+)/gi)) {
          const ids = match[2].replace(/\s+(?:or|and)\s+/gi, ",").split(",").map(name => name.trim()).filter(Boolean).map(name => featIdByName.get(normalizeName(name)));
          if (ids.length && ids.every(Boolean) && !additions.some(item => item.level === Number(match[1]))) additions.push({ level: Number(match[1]), ids });
        }
        if (levels.length) {
          addChoices(feature, levels, level => ({ featChoiceIds: [...new Set([baseIds, ...additions.filter(item => item.level <= level).map(item => item.ids)].flat())] }));
          continue;
        }
      }
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
