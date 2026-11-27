import loadArchetypeChunks from "../../../generated/pf1e-archetype-loaders.mjs";
import type { CharacterArchetype } from "../../../packages/types/src/index.js";

export async function loadFullArchetypeCatalogue(): Promise<CharacterArchetype[]> {
  const chunks = await Promise.all(loadArchetypeChunks.map((loadChunk) => loadChunk()));
  return chunks.flatMap((chunk) => chunk.default).sort((left, right) => left.name.localeCompare(right.name));
}
