import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { arcaneBondDetailOptions } from "../packages/engine/src/wizard-arcane-bond.js";

const wizard = JSON.parse(await readFile(new URL("../packages/data/src/classes/wizard.json", import.meta.url), "utf8"));
const bonds = JSON.parse(await readFile(new URL("../packages/data/src/options/wizard-arcane-bonds.json", import.meta.url), "utf8"));
const familiars = JSON.parse(await readFile(new URL("../packages/data/src/options/wizard-familiars.json", import.meta.url), "utf8"));
const objects = JSON.parse(await readFile(new URL("../packages/data/src/options/wizard-bonded-objects.json", import.meta.url), "utf8"));

test("Wizard Arcane Bond is a required choice with dependent detail features", () => {
  const bond = wizard.features.find((feature) => feature.id === "wizard-arcane-bond-1");
  assert.equal(bond.choiceRequired, true);
  assert.equal(bond.optionGroupId, "wizard-arcane-bonds");
  assert.deepEqual(
    wizard.features.filter((feature) => feature.id === "wizard-familiar-1" || feature.id === "wizard-bonded-object-1").map((feature) => [feature.id, feature.optionGroupId]),
    [["wizard-familiar-1", "wizard-familiars"], ["wizard-bonded-object-1", "wizard-bonded-objects"]]
  );
});

test("Core Arcane Bond catalogue includes complete familiar and object choices", () => {
  assert.deepEqual(bonds.options.map((option) => option.id), ["wizard-arcane-bond-familiar", "wizard-arcane-bond-object"]);
  assert.equal(familiars.options.length, 11);
  assert.equal(objects.options.length, 5);
  assert.deepEqual(objects.options.map((option) => option.id), [
    "wizard-bonded-object-amulet", "wizard-bonded-object-ring", "wizard-bonded-object-staff", "wizard-bonded-object-wand", "wizard-bonded-object-weapon"
  ]);
  const familiarBond = bonds.options.find((option) => option.id === "wizard-arcane-bond-familiar");
  assert.deepEqual(familiarBond.powers.map((power) => power.level), [1, 1, 1, 1, 3, 5, 7, 11, 13]);
  assert.equal(familiars.options.find((option) => option.id === "wizard-familiar-rat").benefit, "The master gains a +2 bonus on Fortitude saves.");
  assert.match(familiars.options.find((option) => option.id === "wizard-familiar-raven").benefit, /speak one language/);
  assert.match(objects.options.find((option) => option.id === "wizard-bonded-object-wand").benefit, /final wand charge/);
});

test("Arcane Bond filtering exposes only the selected detail path", () => {
  const familiarBond = bonds.options.find((option) => option.id === "wizard-arcane-bond-familiar");
  const objectBond = bonds.options.find((option) => option.id === "wizard-arcane-bond-object");
  assert.equal(arcaneBondDetailOptions(familiars.options, familiarBond, "wizard-arcane-bond-familiar").length, 11);
  assert.deepEqual(arcaneBondDetailOptions(familiars.options, objectBond, "wizard-arcane-bond-familiar"), []);
  assert.deepEqual(arcaneBondDetailOptions(objects.options, null, "wizard-arcane-bond-object"), []);
  assert.equal(arcaneBondDetailOptions(objects.options, objectBond, "wizard-arcane-bond-object").length, 5);
});
