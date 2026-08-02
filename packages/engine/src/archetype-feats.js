const sourceSuffix = /\s+(?:APG|ACG|ARG|OA|UC|UI|ISG|UW|HA|WMH|CoP)$/i;

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
