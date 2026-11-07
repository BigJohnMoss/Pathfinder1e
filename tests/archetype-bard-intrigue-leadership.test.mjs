import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetypeResourceAdjustments,
  archetypeAutomationSummary,
  archetypeConditionalModifiers,
} from "../packages/engine/src/index.js";

const ids = ["bard-buccaneer", "bard-ringleader-ag", "bard-ringleader-ui", "bard-hatharat-agent"];
const record = (id) => archetypes.find((candidate) => candidate.id === id);
const features = (id) => record(id).replacements.flatMap((replacement) => replacement.features ?? []);
const named = (id, pattern) => features(id).find((candidate) => pattern.test(candidate.name));

test("all four intrigue and leadership Bards are fully automated", () => {
  for (const id of ids) {
    assert.equal(record(id).mechanicalCoverage, "full", id);
    assert.deepEqual(archetypeAutomationSummary(record(id), data.feats, data.spells).manual, [], id);
  }
});

test("Buccaneer corrects feature levels and scales Knock Out uses", () => {
  const source = record("bard-buccaneer");
  assert.equal(named(source.id, /^Song of Surrender/).level, 4);
  assert.equal(named(source.id, /^Mass Song of Surrender/).level, 16);
  assert.equal(named(source.id, /^Song of Surrender/).resourceActions[0].savingThrow.levelDivisor, 2);
  assert.equal(applyArchetypeResourceAdjustments({}, [source], 5).buccaneerKnockOut, 1);
  assert.equal(applyArchetypeResourceAdjustments({}, [source], 11).buccaneerKnockOut, 2);
  assert.equal(applyArchetypeResourceAdjustments({}, [source], 17).buccaneerKnockOut, 3);
});

test("Ringleader AG automates plans, contingencies, and level-aware triggers", () => {
  const source = record("bard-ringleader-ag");
  const plan = named(source.id, /^Cunning Plan/);
  assert.deepEqual(plan.resourceActions.find(({ id }) => id === "ringleader-ag-trigger-plan").actionTypeByLevel.map(({ actionType }) => actionType), ["move", "swift", "immediate"]);
  assert.equal(named(source.id, /^Countless Contingencies/).resourceActions.find(({ id }) => id === "ringleader-ag-extend-plan").cost, 2);
  assert.equal(named(source.id, /^Sinister Mien/).resourceActions.find(({ id }) => id === "ringleader-ag-dazzling-display").modes.at(-1).label, "120-foot radius");
  assert.equal(archetypeConditionalModifiers([source], { bard: 2 })[0].bonus, 2);
});

test("Ringleader UI tracks enhanced competence and every Prepared use", () => {
  const source = record("bard-ringleader-ui");
  assert.equal(named(source.id, /^Bardic Performance$/).resourceActions.length, 2);
  assert.equal(named(source.id, /^Inspired Plan/).resourceActions.length, 2);
  assert.equal(archetypeConditionalModifiers([source], { bard: 2 })[0].bonus, 4);
  assert.equal(applyArchetypeResourceAdjustments({}, [source], 5).ringleaderPrepared, 1);
  assert.equal(applyArchetypeResourceAdjustments({}, [source], 20).ringleaderPrepared, 4);
});

test("Hatharat Agent exposes all favor tiers and Intelligence-based social modifiers", () => {
  const source = record("bard-hatharat-agent");
  const favor = named(source.id, /^Called Favor/).resourceActions[0];
  assert.equal(favor.modes.length, 4);
  assert.equal(favor.modes.find(({ id }) => id === "specialist").minimumLevel, 7);
  const modifiers = archetypeConditionalModifiers([source], { bard: 2 }, { intelligence: 3 });
  assert.equal(modifiers.length, 15);
  assert.ok(modifiers.every(({ bonus }) => bonus === 3));
  assert.equal(named(source.id, /^Bardic Performance$/).resourceActions[0].id, "hatharat-master-of-manipulation");
});
