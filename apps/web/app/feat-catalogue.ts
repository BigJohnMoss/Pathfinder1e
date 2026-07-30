import generatedFeats from "../../../generated/pf1e-feats.mjs";
import type { CharacterFeat } from "../../../packages/types/src/index.js";

export const fullFeatCatalogue = [...generatedFeats].sort((left, right) => left.name.localeCompare(right.name)) as CharacterFeat[];
