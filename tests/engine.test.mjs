import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { baseAttackBonus, savingThrow, featuresAtLevel, featuresThroughLevel } from "../packages/engine/src/index.js";
const load=async name=>JSON.parse(await readFile(new URL(`../packages/data/src/classes/${name}.json`,import.meta.url),'utf8'));
test("BAB progressions",()=>{assert.equal(baseAttackBonus('full',7),7);assert.equal(baseAttackBonus('three-quarters',7),5);assert.equal(baseAttackBonus('half',7),3);});
test("save progressions",()=>{assert.equal(savingThrow('good',1),2);assert.equal(savingThrow('good',10),7);assert.equal(savingThrow('poor',10),3);});
test("arcanist has exploit at levels 1 and 3",async()=>{const c=await load('arcanist');assert.ok(featuresAtLevel(c,1).some(f=>f.name==='Arcanist Exploit'));assert.ok(featuresAtLevel(c,3).some(f=>f.name==='Arcanist Exploit'));});
test("rogue sneak attack progression is explicit",async()=>{const c=await load('rogue');const names=featuresThroughLevel(c,5).map(f=>f.name);assert.ok(names.includes('Sneak Attack +1d6'));assert.ok(names.includes('Sneak Attack +2d6'));assert.ok(names.includes('Sneak Attack +3d6'));});
