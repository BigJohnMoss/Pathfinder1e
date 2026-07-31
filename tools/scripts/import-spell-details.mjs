import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";

const SOURCE_COMMIT = "33f1b75b8f62b43c59b96eab6bebb45e37c29229";
const SOURCE_BASE = `https://raw.githubusercontent.com/jasontankapps/pathfinder-data-1-e/${SOURCE_COMMIT}/json/`;
const SOURCE_FILES = ["spells.json", ...Array.from({ length: 15 }, (_, index) => `spells${index + 2}.json`)];
const root = new URL("../../", import.meta.url);
const outputDirectory = new URL("packages/data/src/spell-details/", root);
const ROMAN_TO_NUMBER = { i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9" };
const NUMBER_TO_ROMAN = Object.fromEntries(Object.entries(ROMAN_TO_NUMBER).map(([roman, number]) => [number, roman]));
const MODIFIERS = new Set(["communal", "giant", "greater", "lesser", "major", "mass", "supreme"]);
const MANUAL_DETAILS = {
  "baphomets-blessing": {
    description: "You change the target's head into that of a bull. The creature's Intelligence becomes 2, and it gains a gore melee attack that it can use as a primary or secondary attack. The gore attack uses the creature's base attack bonus, and the creature gains a +2 bonus on attack and damage rolls with the gore attack. The gore attack deals 1d6 + Strength modifier damage if the target is Small, 1d8 + Strength modifier if Medium, and 2d6 + Strength modifier if Large or larger.\n\nThe affected creature retains its type, class, levels, Hit Dice, base attack bonus, base saves, hit points, and class features, and can still cast spells using its modified Intelligence. Items in the head slot meld into its body; passive bonuses continue, but activated abilities do not function.\n\nA target that fails its save is immune to other polymorph spells for the duration. Undead, incorporeal, and gaseous creatures are immune.",
    castingTime: "1 standard action", components: ["V", "M/DF (powdered bull's horn)"], range: "touch", target: "one living creature", duration: "1 round/level", savingThrow: "Fortitude negates", spellResistance: "yes",
    source: { title: "Inner Sea Gods", page: 229, url: "https://www.aonprd.com/SpellDisplay.aspx?ItemName=Baphomet%27s%20Blessing" }
  },
  "hasten-judgment": {
    description: "This potent curse weighs upon the target's soul, hastening a living creature's journey to the Boneyard upon death or weakening an undead creature's animating force. A living creature that dies during the spell's duration cannot be affected by breath of life or similar effects, and the period during which attempts to restore the target to life can succeed is reduced to 1 hour/level for raise dead, 1 day/level for resurrection, or 10 days/level for true resurrection.\n\nReincarnate and similar effects work normally. An affected undead creature cannot gain temporary hit points, and its existing channel resistance is halved while the curse persists. Creatures whose souls are separate from or merged with their bodies are unaffected.",
    castingTime: "1 standard action", components: ["V", "S", "M (2 silver pieces)"], range: "touch", target: "one living or corporeal undead creature", duration: "1 day/level", savingThrow: "Will negates", spellResistance: "yes",
    source: { title: "Planar Adventures", page: 40, url: "https://www.aonprd.com/SpellDisplay.aspx?ItemName=Hasten%20Judgment" }
  }
};

const normalizeName = (name) => name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const aliasesFor = (value) => {
  if (typeof value !== "string") return [];
  const normalized = normalizeName(value);
  if (!normalized) return [];
  const aliases = new Set([normalized]);
  const withoutParenthetical = normalizeName(value.replace(/\s*\([^)]*\)\s*$/, ""));
  if (withoutParenthetical && withoutParenthetical !== normalized) aliases.add(withoutParenthetical);
  const words = normalized.split(" ");
  const last = words.at(-1);
  if (ROMAN_TO_NUMBER[last]) aliases.add([...words.slice(0, -1), ROMAN_TO_NUMBER[last]].join(" "));
  if (NUMBER_TO_ROMAN[last]) aliases.add([...words.slice(0, -1), NUMBER_TO_ROMAN[last]].join(" "));
  if (MODIFIERS.has(last) && words.length > 1) aliases.add([last, ...words.slice(0, -1)].join(" "));
  if (MODIFIERS.has(words[0]) && words.length > 1) aliases.add([...words.slice(1), words[0]].join(" "));
  return [...aliases];
};

const headingName = (line) => {
  if (typeof line !== "string") return null;
  return line.match(/^#{2,6}\s+(.+?)\s*$/)?.[1]?.replace(/[*_`]/g, "").trim()
    ?? line.match(/^::h[2-6]\[(.+?)\](?:\{.*\})?\s*$/)?.[1]?.trim()
    ?? null;
};

const parseAttributes = (directive) => {
  const attributes = {};
  const body = directive.slice(directive.indexOf("{") + 1, directive.lastIndexOf("}"));
  for (const match of body.matchAll(/([A-Za-z][A-Za-z0-9]*)=(?:"([^"]*)"|([^\s}]+))|([A-Za-z][A-Za-z0-9]*)/g)) {
    attributes[match[1] ?? match[4]] = match[2] ?? match[3] ?? true;
  }
  return attributes;
};

const amount = (value, unit) => `${value} ${unit}${String(value) === "1" ? "" : "s"}`;
const castingTime = (a) => a.ct ?? (a.ctFRA ? "1 full-round action" : a.ctIm ? "1 immediate action" : a.ctSw ? "1 swift action" : a.ctSt ? "1 standard action" : a.ctH ? amount(a.ctH, "hour") : a.ctM ? amount(a.ctM, "minute") : a.ctR ? amount(a.ctR, "round") : undefined);
const components = (a) => {
  if (a.cSpecial) return [a.cSpecial];
  const values = [];
  if (a.cV) values.push("V");
  if (a.cS) values.push("S");
  if (a.cM) values.push("M");
  if (a.cDF) values.push("DF");
  if (a.cF) values.push("F");
  if (a.cMDF) values.push("M/DF");
  for (const [key, label] of [["cMp", "M"], ["cFp", "F"], ["cMDFp", "M/DF"], ["cFDFp", "F/DF"]]) if (a[key]) values.push(`${label} (${a[key]})`);
  if (a.cText && values.length) values[values.length - 1] += "; see text";
  return values.length ? values : undefined;
};
const range = (a) => a.r ?? (a.rTouch ? "touch" : a.rPers ? "personal" : a.rClose ? "close (25 ft. + 5 ft./2 levels)" : a.rMed ? "medium (100 ft. + 10 ft./level)" : a.rLong ? "long (400 ft. + 40 ft./level)" : a.rText ? "see text" : a.rFt ? `${a.rFt} ft.` : undefined);
const duration = (a) => {
  let value = a.dur ?? (a.durR ? amount(a.durR, "round") : a.durM ? amount(a.durM, "minute") : a.durH ? amount(a.durH, "hour") : a.durC ? "concentration" : a.durCon ? `concentration${a.durCon}` : a.durI ? "instantaneous" : a.durP ? "permanent" : a.durRL ? `${a.durRL} round${String(a.durRL) === "1" ? "" : "s"}/level` : a.durML ? `${a.durML} minute${String(a.durML) === "1" ? "" : "s"}/level` : a.durHL ? `${a.durHL} hour${String(a.durHL) === "1" ? "" : "s"}/level` : a.durDL ? `${a.durDL} day${String(a.durDL) === "1" ? "" : "s"}/level` : undefined);
  if (value && (a.durD || a.drD)) value += " (D)";
  return value;
};
const APG_CLASS_CODES = { alc: "alchemist", inq: "inquisitor", sum: "summoner", wit: "witch" };
const classLevelOverlay = (attributes) => Object.fromEntries(Object.entries(APG_CLASS_CODES).flatMap(([code, classId]) => {
  const level = Number(attributes[code]);
  return Number.isInteger(level) && level >= 0 && level <= 9 ? [[classId, level]] : [];
}));
const savingThrow = (a) => {
  let value = a.save ?? (a.saveNo ? "none" : a.fort ? "Fortitude negates" : a.fortHalf ? "Fortitude half" : a.fortPartial ? "Fortitude partial" : a.refl ? "Reflex negates" : a.reflHalf ? "Reflex half" : a.reflPartial ? "Reflex partial" : a.will ? "Will negates" : a.willHalf ? "Will half" : a.willPartial ? "Will partial" : a.willDisbelief ? "Will disbelief" : undefined);
  if (value && (a.svHarmless || a.harmless)) value += " (harmless)";
  if (value && (a.svObject || a.object)) value += " (object)";
  return value;
};
const spellResistance = (a) => {
  let value = a.sr ?? (a.srY ? "yes" : a.srN ? "no" : undefined);
  if (value && (a.srHarmless || a.harmless)) value += " (harmless)";
  if (value && (a.srObject || a.object)) value += " (object)";
  return value;
};
const cleanRulesText = (lines) => lines
  .filter((line) => typeof line === "string" && !line.startsWith("::") && !headingName(line) && !/^\d+$/.test(line.trim()))
  .map((line) => line
    .replace(/‹[^/›]+\/([^›]+)›/g, (_, label) => label.replaceAll("_", " "))
    .replace(/@(?:b|strong|i|em|span)\[([^\]]+)\](?:\{[^}]*\})?/g, "$1")
    .replace(/@[A-Za-z0-9]+\[([^\]]+)\](?:\{[^}]*\})?/g, (_, label) => label.includes("/") ? label.slice(label.indexOf("/") + 1) : label)
    .replace(/[«»]/g, "")
    .trimEnd())
  .join("\n")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const sectionsFor = (record, fallbackName) => {
  if (!Array.isArray(record.description)) return [];
  const sections = [];
  let current = { name: fallbackName, lines: [] };
  for (const line of record.description) {
    const heading = headingName(line);
    if (heading) {
      if (current.lines.length) sections.push(current);
      current = { name: heading, lines: [] };
    } else current.lines.push(line);
  }
  if (current.lines.length) sections.push(current);
  return sections.filter((section) => section.lines.some((line) => typeof line === "string" && line.startsWith("::spell{")));
};

const sourceSpells = [];
for (const directory of ["spells", "spell-catalogues"]) {
  const url = new URL(`packages/data/src/${directory}/`, root);
  for (const filename of (await readdir(url)).filter((file) => file.endsWith(".json")).sort()) {
    const value = JSON.parse(await readFile(new URL(filename, url), "utf8"));
    sourceSpells.push(...(directory === "spells" ? [value] : value.spells));
  }
}

const records = new Map();
let sourceRecordCount = 0;
for (const filename of SOURCE_FILES) {
  const response = await fetch(`${SOURCE_BASE}${filename}`);
  if (!response.ok) throw new Error(`Unable to fetch pinned spell data ${filename}: ${response.status} ${response.statusText}`);
  const source = await response.json();
  sourceRecordCount += Object.keys(source).length;
  for (const [key, record] of Object.entries(source)) if (record?.name) records.set(key, record);
}

const variantsByAlias = new Map();
for (const [key, record] of records) {
  const sections = sectionsFor(record, record.name ?? key.replaceAll("_", " "));
  for (const section of sections) {
    const variant = { key, record, ...section };
    for (const alias of new Set([...aliasesFor(section.name), ...aliasesFor(key), ...aliasesFor(record.name)])) {
      if (!variantsByAlias.has(alias) || normalizeName(section.name) === alias) variantsByAlias.set(alias, variant);
    }
  }
}

const details = [];
const missing = [];
for (const spell of sourceSpells) {
  const variant = aliasesFor(spell.name).map((alias) => variantsByAlias.get(alias)).find(Boolean);
  if (!variant) {
    const manual = MANUAL_DETAILS[spell.id];
    if (manual) details.push({ id: spell.id, ...manual });
    else missing.push(spell);
    continue;
  }
  const directive = variant.lines.find((line) => typeof line === "string" && line.startsWith("::spell{"));
  const a = parseAttributes(directive);
  const sourceToken = typeof a.source === "string" ? a.source.split(";")[0] : undefined;
  const sourceMatch = sourceToken?.match(/^(.*)\/(\d+)$/);
  const title = sourceMatch?.[1] ?? variant.record.sources?.[0] ?? spell.source?.title ?? "Archives of Nethys";
  const page = sourceMatch ? Number(sourceMatch[2]) : spell.source?.page;
  details.push({
    id: spell.id,
    classLevelOverlay: classLevelOverlay(a),
    description: cleanRulesText(variant.lines),
    ...(castingTime(a) ? { castingTime: castingTime(a) } : {}),
    ...(components(a) ? { components: components(a) } : {}),
    ...(range(a) ? { range: range(a) } : {}),
    ...(a.target || a.targets || a.targetOrTargets ? { target: a.target ?? a.targets ?? a.targetOrTargets } : {}),
    ...(a.area || a.areaOrTarget || a.targetOrArea ? { area: a.area ?? a.areaOrTarget ?? a.targetOrArea } : {}),
    ...(a.effect ? { effect: a.effect } : {}),
    ...(duration(a) ? { duration: duration(a) } : {}),
    ...(savingThrow(a) ? { savingThrow: savingThrow(a) } : {}),
    ...(spellResistance(a) ? { spellResistance: spellResistance(a) } : {}),
    source: { title, ...(page !== undefined ? { page } : {}), url: `https://www.aonprd.com/SpellDisplay.aspx?ItemName=${encodeURIComponent(spell.name)}` }
  });
}

if (missing.length) throw new Error(`Missing full details for ${missing.length} spells:\n${missing.map((spell) => `${spell.id}: ${spell.name}`).join("\n")}`);
if (details.some((detail) => !detail.description)) throw new Error("Imported spell details include an empty description");

await mkdir(outputDirectory, { recursive: true });
await writeFile(new URL("pathfinder-data-1e.json", outputDirectory), `${JSON.stringify({
  source: { title: "Pf Data 1e spell catalogue", repository: "jasontankapps/pathfinder-data-1-e", commit: SOURCE_COMMIT, files: SOURCE_FILES, license: "Open Game License 1.0a" },
  sourceRecordCount,
  spells: details.sort((left, right) => left.id.localeCompare(right.id))
}, null, 2)}\n`);
console.log(`Imported full rules and source details for ${details.length} spells from ${sourceRecordCount} pinned OGL records.`);
