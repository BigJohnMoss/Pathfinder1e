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
  ["monk-lotus", ["lotus-touch-of-serenity-1","lotus-touch-of-surrender-12","lotus-touch-of-peace-15","lotus-learned-master-17"], ["monk-stunning-fist-1","monk-abundant-step-12","monk-quivering-palm-15","monk-tongue-of-sun-and-moon-17"]],
  ["monk-four-winds", ["four-winds-elemental-fist-1","four-winds-slow-time-12","four-winds-aspect-master-17","four-winds-immortality-20"], ["monk-stunning-fist-1","monk-abundant-step-12","monk-timeless-body-17","monk-perfect-self-20"]],
  ["monk-sacred-mountain", ["sacred-mountain-iron-monk-2","sacred-mountain-bastion-stance-4","sacred-mountain-iron-limb-defense-5","sacred-mountain-adamantine-monk-9","sacred-mountain-vow-of-silence-17"], ["monk-evasion-2","monk-slow-fall-4","monk-high-jump-5","monk-improved-evasion-9","monk-tongue-of-sun-and-moon-17"]],
  ["monk-weapon-adept", ["weapon-adept-perfect-strike-1","weapon-adept-way-weapon-master-2","weapon-adept-way-weapon-master-6","weapon-adept-evasion-9","weapon-adept-uncanny-initiative-17","weapon-adept-pure-power-20"], ["monk-stunning-fist-1","monk-evasion-2","monk-improved-evasion-9","monk-timeless-body-17","monk-perfect-self-20"]],
  ["monk-zen-archer", ["zen-archer-bow-flurry-1","zen-archer-perfect-strike-1","zen-archer-way-bow-2","zen-archer-way-bow-6","zen-archer-zen-archery-3","zen-archer-point-blank-master-3","zen-archer-ki-arrows-5","zen-archer-reflexive-shot-9","zen-archer-trick-shot-11","zen-archer-ki-focus-bow-17"], ["monk-flurry-of-blows-1","monk-stunning-fist-1","monk-evasion-2","monk-maneuver-training-3","monk-still-mind-3","monk-purity-of-body-5","monk-improved-evasion-9","monk-diamond-body-11","monk-tongue-of-sun-and-moon-17"]]
]) test(`${file} exposes its complete APG progression`, async () => {
  const monk = await load("../packages/data/src/classes/monk.json");
  const archetype = await load(`../packages/data/src/archetypes/${file}.json`);
  const ids = featuresThroughLevel(applyArchetype(monk, archetype), 20).map((feature) => feature.id);
  for (const id of expected) assert.ok(ids.includes(id));
  for (const id of removed) assert.ok(!ids.includes(id));
});

test("Monk of the Four Winds exposes every spirit aspect", async () => {
  const aspects = await load("../packages/data/src/options/four-winds-aspects.json");
  assert.deepEqual(aspects.options.map((option) => option.id), ["four-winds-aspect-carp","four-winds-aspect-ki-rin","four-winds-aspect-monkey","four-winds-aspect-oni","four-winds-aspect-owl","four-winds-aspect-tiger"]);
});
