import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import spells from "../generated/pf1e-spells.mjs";
import { classProgression, spellcastingProgression, spellsAvailableToClass, witchPatronSpells } from "../packages/engine/src/index.js";

const witch=JSON.parse(await readFile(new URL("../packages/data/src/classes/witch.json",import.meta.url),"utf8"));
const hexes=JSON.parse(await readFile(new URL("../packages/data/src/options/witch-hexes.json",import.meta.url),"utf8"));

test("Witch reaches level 20 with eleven hex selections",()=>{
 const progression=classProgression(witch,20);
 assert.equal(progression.baseAttackBonus,10);
 assert.equal(progression.features.filter(feature=>feature.progressionKey==="witch-hexes").length,11);
 assert.ok(hexes.options.some(option=>option.minimumLevel===10));
 assert.ok(hexes.options.some(option=>option.minimumLevel===18));
});

test("Witch prepares all nine spell levels from its imported familiar list",()=>{
 const casting=spellcastingProgression(witch,20,{abilityScore:20});
 assert.equal(casting.maximumSpellLevel,9);
 assert.ok(spellsAvailableToClass(spells,"witch",9).length>=900);
});

test("every APG Witch patron automatically grants nine familiar spells",async()=>{
 const patrons=JSON.parse(await readFile(new URL("../packages/data/src/options/witch-patrons.json",import.meta.url),"utf8"));
 assert.equal(patrons.options.length,12);
 for(const patron of patrons.options) assert.equal(witchPatronSpells(spells,patron,20).length,9,patron.name);
});
