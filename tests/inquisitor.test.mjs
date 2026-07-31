import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import spells from "../generated/pf1e-spells.mjs";
import { apgClassResourceMaximums, classProgression, spellsAvailableToClass } from "../packages/engine/src/index.js";
import { spontaneousSpellcastingProgression } from "../packages/engine/src/spontaneous-spellcasting.js";

const inquisitor=JSON.parse(await readFile(new URL("../packages/data/src/classes/inquisitor.json",import.meta.url),"utf8"));

test("Inquisitor reaches level 20 with judgments, bane, and seven teamwork feats",()=>{
 const progression=classProgression(inquisitor,20);
 assert.equal(progression.baseAttackBonus,15);
 assert.equal(progression.features.filter(feature=>feature.progressionKey==="inquisitor-teamwork").length,6);
 assert.ok(progression.features.some(feature=>feature.id==="inquisitor-true-judgment-20"));
 assert.deepEqual(apgClassResourceMaximums("inquisitor",20),{judgments:7,baneRounds:20});
});

test("Inquisitor spontaneously casts six spell levels from the imported list",()=>{
 const casting=spontaneousSpellcastingProgression(inquisitor,20,{abilityScore:20});
 assert.equal(casting.maximumSpellLevel,6);
 assert.ok(spellsAvailableToClass(spells,"inquisitor",6).length>=350);
});
