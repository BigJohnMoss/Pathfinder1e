const spellNameKey = (name) => name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function spellNameKeys(name) {
  const exact = spellNameKey(name);
  const suffix = /^(.*),\s*(lesser|greater|mass)$/i.exec(name);
  if (suffix) return [exact, spellNameKey(`${suffix[2]} ${suffix[1]}`)];
  const prefix = /^(lesser|greater|mass)\s+(.+)$/i.exec(name);
  return prefix ? [exact, spellNameKey(`${prefix[2]}, ${prefix[1]}`)] : [exact];
}

export function parseClassSpellList(html) {
  const sections = html.matchAll(/<h2[^>]*>(\d+)(?:st|nd|rd|th)?-Level<\/h2>(.*?)(?=<h2|<\/span>)/gis);
  const entryPattern = /SpellDisplay\.aspx\?ItemName=([^"&]+)"[^>]*>(?:<img[^>]*>)?\s*([^<]+)(?:(?:<\/b>\s*)?<sup[^>]*>[^<]*<\/sup>\s*(?:<b>)?)*<\/a><\/b>:\s*(.*?)<br\s*\/?>/gi;
  return Array.from(sections).flatMap(([, level, section]) =>
    Array.from(section.matchAll(entryPattern), ([, itemName, name, summary]) => ({
      itemName,
      name: name.trim(),
      level: Number(level),
      summary: summary.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    })),
  );
}
