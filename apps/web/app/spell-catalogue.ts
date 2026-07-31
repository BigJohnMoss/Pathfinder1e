import generatedSpells from "../../../generated/pf1e-spells.mjs";
import type { CharacterSpell } from "../../../packages/types/src/index.js";

export const fullSpellCatalogue = generatedSpells as CharacterSpell[];
