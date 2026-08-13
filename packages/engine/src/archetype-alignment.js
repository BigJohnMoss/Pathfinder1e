export const characterAlignments = [
  "lawful-good",
  "neutral-good",
  "chaotic-good",
  "lawful-neutral",
  "neutral",
  "chaotic-neutral",
  "lawful-evil",
  "neutral-evil",
  "chaotic-evil",
];

const alignmentLabels = {
  "lawful-good": "Lawful Good",
  "neutral-good": "Neutral Good",
  "chaotic-good": "Chaotic Good",
  "lawful-neutral": "Lawful Neutral",
  neutral: "Neutral",
  "chaotic-neutral": "Chaotic Neutral",
  "lawful-evil": "Lawful Evil",
  "neutral-evil": "Neutral Evil",
  "chaotic-evil": "Chaotic Evil",
};

export const characterAlignmentLabel = (alignment) => alignmentLabels[alignment] ?? "Unknown alignment";

const component = (alignment, value) => alignment === value || alignment.startsWith(`${value}-`) || alignment.endsWith(`-${value}`);
const withoutComponent = (value) => characterAlignments.filter((alignment) => !component(alignment, value));
const withComponent = (value) => characterAlignments.filter((alignment) => component(alignment, value));

function staticAlignmentRule(summary) {
  const text = String(summary ?? "").replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
  if (!text || /alignment must (?:match|be within one step)|within one step of (?:his|her|the) deity|alignment must match that of .*plane|in order to use [^.]+/i.test(text)) return [];
  const firstSentence = text.split(/(?<=[.!?])\s/)[0];
  if (!/\b(?:must|cannot be|can't be|may be of any|can be of any|Any\b|Only an?\b)|^(?:Lawful|Neutral|Chaotic)\b/i.test(firstSentence)) return [];
  if (/\b(?:may|can) be of any alignment\b/i.test(firstSentence)) return characterAlignments;

  const exactNames = [
    ["lawful good", "lawful-good"], ["neutral good", "neutral-good"], ["chaotic good", "chaotic-good"],
    ["lawful neutral", "lawful-neutral"], ["true neutral", "neutral"], ["chaotic neutral", "chaotic-neutral"],
    ["lawful evil", "lawful-evil"], ["neutral evil", "neutral-evil"], ["chaotic evil", "chaotic-evil"],
  ];
  const exact = exactNames.filter(([name]) => new RegExp(`\\b${name}\\b`, "i").test(firstSentence)).map(([, id]) => id);
  const categoryUnion = [];
  for (const value of ["good", "evil", "lawful", "chaotic"]) {
    if (new RegExp(`\\bAny ${value}\\b|\\bany ${value} alignment\\b`, "i").test(firstSentence)) categoryUnion.push(...withComponent(value));
  }
  if (/\bor neutral(?=\s*(?:[,.]|and\b|$))/i.test(firstSentence)) categoryUnion.push("neutral");
  if (exact.length || categoryUnion.length) return [...new Set([...exact, ...categoryUnion])];

  if (/\b(?:at least partially neutral|at least one neutral component|neutral on .* axis|Any neutral)\b/i.test(firstSentence)) return withComponent("neutral");
  if (/\b(?:nongood|non-good)\b/i.test(firstSentence)) return withoutComponent("good");
  if (/\b(?:nonevil|non-evil|cannot be (?:of )?evil|can't be (?:of )?evil)\b/i.test(firstSentence)) return withoutComponent("evil");
  if (/\b(?:nonlawful|non-lawful)\b/i.test(firstSentence)) return withoutComponent("lawful");
  for (const value of ["good", "evil", "lawful", "chaotic"]) {
    if (new RegExp(`\\bAny ${value}\\b|\\bOnly an? ${value} character\\b|\\b(?:an? |of an? )?${value} alignment\\b|\\bmust be ${value}(?: in alignment)?\\b`, "i").test(firstSentence)) return withComponent(value);
  }
  return [];
}

export function inferredArchetypeAlignmentDetails(archetype) {
  const features = (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? []);
  const rules = features.flatMap((feature) => {
    if (!/^Alignment$/i.test(feature.name ?? "")) return [];
    const allowedAlignments = staticAlignmentRule(feature.summary);
    return allowedAlignments.length ? [{ sourceFeatureId: feature.id, allowedAlignments }] : [];
  });
  return {
    rules,
    fullyAutomatedFeatureIds: rules.map((rule) => rule.sourceFeatureId),
  };
}

export function inferArchetypeAllowedAlignments(archetype) {
  const rules = inferredArchetypeAlignmentDetails(archetype).rules;
  if (!rules.length) return [];
  return rules.reduce((allowed, rule) => allowed.filter((alignment) => rule.allowedAlignments.includes(alignment)), characterAlignments);
}
