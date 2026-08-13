import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetype,
  applyArchetypeResourceAdjustments,
  apgClassResourceMaximums,
  archetypeAutomationSummary,
  inferArchetypeTeamworkSharingActions,
  resolvedArchetypeResourceAdjustments,
} from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((candidate) => candidate.id === id);
const characterClass = (id) => data.classes.find((candidate) => candidate.id === id);

test("teamwork-sharing archetypes receive tracked feat actions", () => {
  const tactical = inferArchetypeTeamworkSharingActions(archetype("inquisitor-tactical-leader"))[0].action;
  assert.equal(tactical.resourceId, "archetype-inquisitor-tactical-leader-tactician-ex-3");
  assert.deepEqual(tactical.featSelection.countByLevel, [{ level: 3, count: 1 }, { level: 18, count: 2 }]);
  assert.deepEqual(tactical.actionTypeByLevel, [{ level: 3, actionType: "standard" }, { level: 12, actionType: "swift" }]);
  assert.deepEqual(tactical.activeEffect.defaultRoundsByLevel.filter(({ level }) => [3, 4, 18].includes(level)), [
    { level: 3, rounds: 4 }, { level: 4, rounds: 5 }, { level: 18, rounds: 12 },
  ]);

  const holyGuide = inferArchetypeTeamworkSharingActions(archetype("paladin-holy-guide"))[0].action;
  assert.equal(holyGuide.resourceId, "smiteEvil");
  assert.equal(holyGuide.confirmations[0].requiredForActivation, true);

  const commander = inferArchetypeTeamworkSharingActions(archetype("warpriest-divine-commander"))[0].action;
  assert.deepEqual(commander.actionTypeByLevel, [{ level: 3, actionType: "standard" }, { level: 12, actionType: "swift" }]);
  assert.deepEqual(commander.activeEffect.defaultRoundsByLevel.filter(({ level }) => [3, 5, 15].includes(level)), [
    { level: 3, rounds: 4 }, { level: 5, rounds: 5 }, { level: 15, rounds: 10 },
  ]);
});

test("tactician resources scale at named levels and stack Cavalier levels", () => {
  const tacticalLeader = archetype("inquisitor-tactical-leader");
  const resource = resolvedArchetypeResourceAdjustments(tacticalLeader).find(({ resourceId }) => resourceId.endsWith("tactician-ex-3"));
  assert.deepEqual(resource.maximumByLevel, [
    { level: 3, maximum: 1 }, { level: 6, maximum: 2 }, { level: 9, maximum: 3 }, { level: 15, maximum: 4 }, { level: 18, maximum: 5 },
  ]);
  assert.deepEqual(resource.effectiveLevelClassIds, ["inquisitor", "cavalier"]);
  assert.equal(applyArchetypeResourceAdjustments({}, [tacticalLeader], 3, {}, { classId: "inquisitor", classLevels: { inquisitor: 3, cavalier: 6 } })[resource.resourceId], 3);

  const divineCommander = archetype("warpriest-divine-commander");
  const commanderResource = resolvedArchetypeResourceAdjustments(divineCommander).find(({ resourceId }) => resourceId.endsWith("battle-tactician-ex-3"));
  assert.deepEqual(commanderResource.maximumByLevel, [{ level: 3, maximum: 1 }, { level: 9, maximum: 2 }, { level: 15, maximum: 3 }]);
  assert.deepEqual(apgClassResourceMaximums("paladin", 20), { smiteEvil: 7 });
});

test("teamwork sharing is attached to features and removed from the manual audit", () => {
  for (const [archetypeId, classId, featureNames] of [
    ["inquisitor-tactical-leader", "inquisitor", ["Tactician"]],
    ["paladin-holy-guide", "paladin", ["Teamwork Feat"]],
    ["warpriest-divine-commander", "warpriest", ["Battle Tactician", "Greater Battle Tactician"]],
  ]) {
    const source = archetype(archetypeId);
    const applied = applyArchetype(characterClass(classId), source, data.classes, data.spells);
    assert.ok(applied.features.some((feature) => feature.resourceActions?.some((action) => action.featSelection?.featType === "teamwork")), archetypeId);
    const manual = archetypeAutomationSummary(source, data.feats, data.spells).manual;
    featureNames.forEach((name) => assert.equal(manual.some((entry) => entry.startsWith(name)), false, `${archetypeId}: ${name}`));
  }
});
