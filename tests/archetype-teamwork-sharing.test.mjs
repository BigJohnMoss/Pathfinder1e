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
  inferArchetypePassiveTeamworkSharings,
  inferArchetypeFeatChoices,
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

test("the shared engine covers the wider tactician-style archetype family", () => {
  const expected = {
    "brawler-exemplar": { featureId: "brawler-exemplar-field-instruction-ex-5", levels: [[5, 1], [9, 2], [12, 3], [17, 4]] },
    "hunter-forester": { featureId: "hunter-forester-tactician-ex-3", levels: [[3, 1], [7, 2], [12, 3], [17, 4]] },
    "rogue-consigliere": { featureId: "rogue-consigliere-field-boss-ex-10", levels: [[10, 1], [14, 2], [18, 3]] },
    "slayer-vanguard": { featureId: "slayer-vanguard-tactician-ex-2", levels: [[2, 1]] },
  };
  for (const [id, rule] of Object.entries(expected)) {
    const source = archetype(id);
    const action = inferArchetypeTeamworkSharingActions(source).find(({ sourceFeatureId }) => sourceFeatureId === rule.featureId)?.action;
    assert.ok(action, id);
    assert.equal(action.featSelection.featType, "teamwork");
    assert.equal(action.activeEffect.defaultRoundsByLevel[0].rounds, id === "slayer-vanguard" ? 4 : id === "rogue-consigliere" ? 8 : id === "brawler-exemplar" ? 5 : 4);
    const resource = resolvedArchetypeResourceAdjustments(source).find(({ resourceId }) => resourceId === action.resourceId);
    assert.ok(resource, `${id} resource`);
    for (const [level, maximum] of rule.levels) {
      assert.equal(applyArchetypeResourceAdjustments({}, [source], level)[action.resourceId], maximum, `${id} level ${level}`);
    }
  }
});

test("Majordomo Delegate models scaling feats, action economy, and long-duration modes", () => {
  const source = archetype("investigator-majordomo");
  const action = inferArchetypeTeamworkSharingActions(source)[0].action;
  assert.deepEqual(action.featSelection.countByLevel, [{ level: 1, count: 1 }, { level: 7, count: 2 }, { level: 13, count: 3 }]);
  assert.equal(action.featSelection.minimumCount, 1);
  assert.deepEqual(action.actionTypeByLevel, [
    { level: 1, actionType: "standard" }, { level: 4, actionType: "move" }, { level: 10, actionType: "swift" },
  ]);
  assert.deepEqual(action.activeEffect.defaultRoundsByLevel.filter(({ level }) => [1, 10, 20].includes(level)), [
    { level: 1, rounds: 4 }, { level: 10, rounds: 13 }, { level: 20, rounds: 23 },
  ]);
  assert.deepEqual(action.modes.map(({ id, minimumLevel, featCount, actionType }) => ({ id, minimumLevel, featCount, actionType })), [
    { id: "combat", minimumLevel: undefined, featCount: undefined, actionType: undefined },
    { id: "noncombat-task", minimumLevel: 4, featCount: undefined, actionType: "10-minute" },
    { id: "until-refresh", minimumLevel: 16, featCount: 1, actionType: "1-minute" },
  ]);
  assert.equal(archetypeAutomationSummary(source, data.feats, data.spells).manual.some((entry) => entry.startsWith("Delegate")), true, "the alchemy prohibition remains honestly queued");
});

test("automatic companion teamwork sharing is inferred and removed from the manual audit", () => {
  for (const [archetypeId, classId, featureName, target] of [
    ["inquisitor-sacred-huntsmaster", "inquisitor", "Hunter Tactics", "animal-companion"],
    ["summoner-twinned-summoner", "summoner", "Teamwork Feats", "eidolon"],
  ]) {
    const source = archetype(archetypeId);
    const sharing = inferArchetypePassiveTeamworkSharings(source)[0];
    assert.equal(sharing.sharing.target, target, archetypeId);
    assert.equal(sharing.sharing.ignorePrerequisites, true, archetypeId);
    const applied = applyArchetype(characterClass(classId), source, data.classes, data.spells);
    assert.ok(applied.features.some((feature) => feature.teamworkFeatSharing?.target === target), archetypeId);
    assert.equal(archetypeAutomationSummary(source, data.feats, data.spells).manual.some((entry) => entry.startsWith(featureName)), false, archetypeId);
  }
});

test("Strategist Drill Instructor spends challenge, tracks recipients, and scales its training duration", () => {
  const source = archetype("cavalier-strategist");
  const action = inferArchetypeTeamworkSharingActions(source).find(({ sourceFeatureId }) => sourceFeatureId.includes("drill-instructor"))?.action;
  assert.ok(action);
  assert.equal(action.resourceId, "challenges");
  assert.deepEqual(action.actionTypeByLevel, [{ level: 4, actionType: "10-minute" }]);
  assert.deepEqual(action.recipients.map(({ label }) => label), ["1 ally", "2 allies", "3 allies", "4 allies"]);
  assert.deepEqual(action.activeEffect.defaultRoundsByLevel.filter(({ level }) => [4, 6, 20].includes(level)), [
    { level: 4, rounds: 120 }, { level: 6, rounds: 130 }, { level: 20, rounds: 200 },
  ]);
  assert.equal(action.confirmations[0].requiredForActivation, true);
  assert.equal(archetypeAutomationSummary(source, data.feats, data.spells).manual.some((entry) => entry.startsWith("Drill Instructor")), false);
});

test("plain bonus teamwork feats preserve recurring levels without misreading conditional alternatives", () => {
  assert.deepEqual(inferArchetypeFeatChoices(archetype("bard-averaka-arbiter"), data.feats).map(({ level }) => level), [2, 6, 10, 14, 18]);
  assert.deepEqual(inferArchetypeFeatChoices(archetype("summoner-twinned-summoner"), data.feats).map(({ level }) => level), [4, 12]);
  assert.deepEqual(inferArchetypeFeatChoices(archetype("hunter-packmaster"), data.feats), []);
  assert.deepEqual(inferArchetypeFeatChoices(archetype("spiritualist-zeitgeist-binder"), data.feats), []);
});
