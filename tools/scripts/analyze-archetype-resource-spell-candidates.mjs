import archetypes from "../../generated/pf1e-archetypes.mjs";
import data from "../../generated/pf1e-data.mjs";
import { archetypeAutomationSummary } from "../../packages/engine/src/index.js";

const limitArgument = process.argv.find((argument) => argument.startsWith("--limit="));
const limit = Math.max(1, Number(limitArgument?.split("=")[1] ?? 25));
const includeSummary = process.argv.includes("--summary");

const resourcePattern = /\b(?:spend|spending|expend|expending)\b.{0,100}\b(?:rounds?|uses?|points?|performance|song|inspiration|grit|panache|pool|fervor)\b/i;
const spellPattern = /\b(?:cast|spell-like|effects? of|functions? (?:as|like)|works? (?:as|like)|as per)\b/i;
const containerPattern = /^(?:abilities|ability descriptions|deeds|forbidden powers|revelations|special)(?:\s*\([^)]*\))?$/i;

const candidates = [];
for (const archetype of archetypes) {
  const manual = new Set(archetypeAutomationSummary(archetype, data.feats, data.spells).manual);
  for (const feature of (archetype.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    if (containerPattern.test(feature.name) || !manual.has(`${feature.name} (level ${feature.level})`)) continue;
    const summary = String(feature.summary ?? "").replace(/\s+/g, " ").trim();
    if (!resourcePattern.test(summary) || !spellPattern.test(summary)) continue;
    const row = {
      archetypeId: archetype.id,
      featureId: feature.id,
      name: feature.name,
      level: feature.level,
      sentenceCount: summary.split(/(?<=[.!?])\s+/).filter(Boolean).length,
    };
    if (includeSummary) row.summary = summary;
    candidates.push(row);
  }
}

candidates.sort((left, right) => left.sentenceCount - right.sentenceCount
  || left.archetypeId.localeCompare(right.archetypeId)
  || left.level - right.level);

console.log(JSON.stringify({
  candidateCount: candidates.length,
  shown: Math.min(limit, candidates.length),
  candidates: candidates.slice(0, limit),
}, null, 2));
