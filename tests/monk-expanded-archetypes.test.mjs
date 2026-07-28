import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

for (const [file, expected, removed] of [
  ["monk-drunken-master", ["drunken-master-drunken-ki-3","drunken-master-drunken-strength-5","drunken-master-drunken-courage-11","drunken-master-drunken-resilience-13","drunken-master-firewater-breath-19"], ["monk-still-mind-3","monk-purity-of-body-5","monk-diamond-body-11","monk-diamond-soul-13","monk-empty-body-19"]],
  ["monk-hungry-ghost", ["hungry-ghost-punishing-kick-1","hungry-ghost-steal-ki-5","hungry-ghost-life-funnel-7","hungry-ghost-life-from-stone-11","hungry-ghost-sipping-demon-13"], ["monk-stunning-fist-1","monk-purity-of-body-5","monk-wholeness-of-body-7","monk-diamond-body-11","monk-diamond-soul-13"]],
  ["monk-ki-mystic", ["ki-mystic-ki-mystic-3","ki-mystic-mystic-insight-5","ki-mystic-mystic-visions-11","ki-mystic-mystic-prescience-13","ki-mystic-mystic-persistence-19"], ["monk-still-mind-3","monk-purity-of-body-5","monk-diamond-body-11","monk-diamond-soul-13","monk-empty-body-19"]],
  ["monk-empty-hand", ["empty-hand-improvised-flurry-1","empty-hand-versatile-improvisation-3","empty-hand-ki-weapons-5","empty-hand-greater-ki-weapons-11"], ["monk-flurry-of-blows-1","monk-still-mind-3","monk-purity-of-body-5","monk-diamond-body-11"]],
  ["monk-healing-hand", ["healing-hand-ancient-healing-hand-7","healing-hand-ki-sacrifice-11","healing-hand-ki-sacrifice-15","healing-hand-true-sacrifice-20"], ["monk-wholeness-of-body-7","monk-diamond-body-11","monk-quivering-palm-15","monk-perfect-self-20"]],
  ["monk-lotus", ["lotus-touch-of-serenity-1","lotus-touch-of-surrender-12","lotus-touch-of-peace-15","lotus-learned-master-17"], ["monk-stunning-fist-1","monk-abundant-step-12","monk-quivering-palm-15","monk-tongue-of-sun-and-moon-17"]]
]) test(`${file} exposes its complete APG progression`, async () => {
  const monk = await load("../packages/data/src/classes/monk.json");
  const archetype = await load(`../packages/data/src/archetypes/${file}.json`);
  const ids = featuresThroughLevel(applyArchetype(monk, archetype), 20).map((feature) => feature.id);
  for (const id of expected) assert.ok(ids.includes(id));
  for (const id of removed) assert.ok(!ids.includes(id));
});
