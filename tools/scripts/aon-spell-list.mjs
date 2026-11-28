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
