import fullArchetypes from "../../../generated/pf1e-archetypes.mjs";
import type { CharacterArchetype } from "../../../packages/types/src/index.js";

export const fullArchetypeCatalogue = [...fullArchetypes].sort((left, right) => left.name.localeCompare(right.name)) as CharacterArchetype[];
