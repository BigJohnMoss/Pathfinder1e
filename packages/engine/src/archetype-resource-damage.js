import { resolvedArchetypeResourceAdjustments } from "./archetype-resources.js";

const featureLabel = (feature) => String(feature?.name ?? "Archetype attack").replace(/\s*\((?:Ex|Su|Sp)(?:,\s*(?:Ex|Su|Sp))*\)\s*$/i, "").trim();
const distinctSteps = (rows, key) => rows.filter((entry, index, entries) => index === 0 || entry[key] !== entries[index - 1][key]);
const levels = (minimumLevel, value) => Array.from({ length: 21 - minimumLevel }, (_, index) => ({ level: minimumLevel + index, ...value(minimumLevel + index) }));

function ownResource(archetype, feature) {
  return resolvedArchetypeResourceAdjustments(archetype).find((resource) =>
    resource.sourceFeatureId === feature.id || resource.resourceId === `archetype-${feature.id}`,
  );
}

function damageProfile(archetype, feature, summary) {
  const minimumLevel = Math.max(1, Number(feature.level ?? 1));
  if (/channel demonic energy to damage creatures of lawful and good alignment/i.test(summary)) return {
    resource: ownResource(archetype, feature),
    actionType: "standard",
    savingThrow: { label: "Fortitude", ability: "charisma", base: 10, levelDivisor: 2, classId: archetype.classId },
    combatRoll: {
      damage: {
        type: "untyped",
        diceCountByLevel: distinctSteps(levels(minimumLevel, (level) => ({ count: 1 + Math.floor((level - 1) / 2) })), "count"),
        dieSidesByLevel: [{ level: minimumLevel, sides: 6 }],
      },
      rangeByLevel: [{ level: minimumLevel, range: "30-foot-radius burst" }],
      targetSave: {
        modifier: "fortitude",
        outcome: "half-damage",
        conditionalModifiers: [{ confirmationId: "lawful-good-target", label: "Lawful good target", modifier: -2 }],
      },
      confirmations: [
        { id: "lawful-or-good-target", label: "Target is lawful or good", requiredForActivation: true },
        { id: "lawful-good-target", label: "Target is lawful good" },
      ],
      riders: [{
        name: "Sickened by Demonic Channel",
        description: "A lawful or good enemy that fails its Fortitude save is sickened.",
        minimumLevel: 9,
        duration: { kind: "dice-rounds", count: 1, sides: 6 },
      }],
    },
  };
  if (/melee touch attack that deals 1d6 points of sonic damage plus 1 point per mesmerist level/i.test(summary)) return {
    resource: ownResource(archetype, feature),
    savingThrow: { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: archetype.classId },
    combatRoll: {
      attack: { kind: "melee-touch", label: "Melee touch" },
      damage: {
        type: "sonic",
        diceCountByLevel: [{ level: minimumLevel, count: 1 }],
        dieSidesByLevel: [{ level: minimumLevel, sides: 6 }],
        flatModifierByLevel: distinctSteps(levels(minimumLevel, (level) => ({ modifier: level })), "modifier"),
      },
      rangeByLevel: [{ level: minimumLevel, range: "Melee touch" }],
      confirmations: [{ id: "compelling-voice", label: "Target is affected by Compelling Voice" }],
      targetSave: { modifier: "will", outcome: "negates-riders", requiredConfirmationId: "compelling-voice" },
      riders: [{ name: "Wounding Words penalty", description: "–2 on attack rolls, saving throws, skill checks, and ability checks. This does not stack with Concussive Spell.", requiredConfirmationId: "compelling-voice", duration: { kind: "fixed-rounds", rounds: 1 } }],
    },
  };
  if (/burst deals 1d6 points of damage \+ 1d6 additional points of damage for every 2 medium levels[^.]+beyond 3rd/i.test(summary)) return {
    resource: ownResource(archetype, feature),
    savingThrow: { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: archetype.classId },
    combatRoll: {
      damage: {
        type: "untyped",
        diceCountByLevel: distinctSteps(levels(minimumLevel, (level) => ({ count: 1 + Math.max(0, Math.floor((level - 3) / 2)) })), "count"),
        dieSidesByLevel: [{ level: minimumLevel, sides: 6 }],
      },
      rangeByLevel: [{ level: minimumLevel, range: "30-foot burst" }],
      targetSave: { modifier: "will", outcome: "half-damage" },
      confirmations: [{ id: "valid-void-targets", label: "Exclude the acting medium and aberrations", requiredForActivation: true }],
      riders: [{ name: "Confused", description: "A creature with fewer Hit Dice than half the medium's level that fails the Will save is confused.", maximumTargetHitDiceDivisor: 2, duration: { kind: "dice-rounds", count: 1, sides: 4 } }],
    },
  };
  if (/deals 1d6 points of damage per 2 skald levels/i.test(summary)) return {
    resource: ownResource(archetype, feature),
    savingThrow: { label: "Reflex", ability: "charisma", base: 10, levelDivisor: 2, classId: archetype.classId },
    modes: ["acid", "cold", "electricity", "fire"].map((type) => ({ id: type, label: `${type[0].toUpperCase()}${type.slice(1)} damage`, summary: `The breath weapon deals ${type} damage.` })),
    recipientLabel: "Breath weapon recipient",
    recipients: [{ id: "self", label: "Self" }, { id: "ally", label: "Ally" }],
    combatRoll: {
      damage: {
        type: "energy",
        usesSelectedModeAsDamageType: true,
        diceCountByLevel: distinctSteps(levels(minimumLevel, (level) => ({ count: Math.max(1, Math.floor(level / 2)) })), "count"),
        dieSidesByLevel: [{ level: minimumLevel, sides: 6 }],
      },
      rangeByLevel: [{ level: minimumLevel, range: "30-foot cone or 60-foot line" }],
      targetSave: { modifier: "reflex", outcome: "half-damage" },
      confirmations: [{ id: "draconic-rage", label: "Recipient is affected by Draconic Rage", requiredForActivation: true }],
    },
  };
  if (/spending one use of fervor to deal 1d6 points of damage to all evil outsiders/i.test(summary)) return {
    resource: { resourceId: "fervor" },
    combatRoll: {
      damage: {
        type: "aligned",
        diceCountByLevel: distinctSteps(levels(minimumLevel, (level) => ({ count: 1 + Math.max(0, Math.floor((level - 2) / 3)) })), "count"),
        dieSidesByLevel: [{ level: minimumLevel, sides: 6 }],
      },
      rangeByLevel: distinctSteps(levels(minimumLevel, (level) => ({ range: `${5 + Math.max(0, Math.floor((level - 7) / 6) + 1) * 5}-foot burst` })), "range"),
    },
  };
  if (/expends only one use of (?:his|her|their) fervor to channel energy and deals 1d6 points of damage for every 2 warpriest levels/i.test(summary)) return {
    resource: { resourceId: "fervor" },
    combatRoll: {
      damage: {
        type: "alignment",
        diceCountByLevel: distinctSteps(levels(minimumLevel, (level) => ({ count: Math.max(1, Math.floor(level / 2)) })), "count"),
        dieSidesByLevel: [{ level: minimumLevel, sides: 6 }],
      },
      rangeByLevel: [{ level: minimumLevel, range: "Channel Energy area" }],
    },
  };
  return undefined;
}

export function inferredArchetypeResourceDamageActionDetails(archetype) {
  const actions = [];
  const fullyAutomatedFeatureIds = new Set();
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    if (feature.resourceActions?.length || /^(?:Deeds|Revelations|Special)$/i.test(featureLabel(feature))) continue;
    const summary = String(feature.summary ?? "").replace(/\s+/g, " ").trim();
    const profile = damageProfile(archetype, feature, summary);
    if (!profile?.resource?.resourceId) continue;
    actions.push({
      sourceFeatureId: feature.id,
      action: {
        id: `${feature.id}-damage-roll`,
        label: `Use ${featureLabel(feature)}`,
        classId: archetype.classId,
        minimumLevel: Math.max(1, Number(feature.level ?? 1)),
        resourceId: profile.resource.resourceId,
        cost: 1,
        ...(profile.actionType ? { actionTypeByLevel: [{ level: Math.max(1, Number(feature.level ?? 1)), actionType: profile.actionType }] } : {}),
        ...(profile.modes ? { modeLabel: "Damage type", modes: profile.modes } : {}),
        ...(profile.recipients ? { recipientLabel: profile.recipientLabel, recipients: profile.recipients } : {}),
        ...(profile.savingThrow ? { savingThrow: profile.savingThrow } : {}),
        combatRoll: profile.combatRoll,
        summary,
      },
    });
    if (feature.id === "cleric-demonic-apostle-demonic-channel-su-1") actions.push({
      sourceFeatureId: feature.id,
      action: {
        id: `${feature.id}-bolster-allies`,
        label: "Bolster chaotic evil allies",
        classId: archetype.classId,
        minimumLevel: 5,
        resourceId: profile.resource.resourceId,
        cost: 1,
        actionTypeByLevel: [{ level: 5, actionType: "standard" }],
        confirmations: [{ id: "chaotic-evil-allies", label: "Chaotic evil allies are in the burst", requiredForActivation: true }],
        activeEffect: {
          name: "Demonic Channel rage",
          targets: ["allies"],
          bonus: 0,
          description: "Chaotic evil allies in the burst gain the effects of rage: +2 Strength, +2 Constitution, +2 morale bonus on Will saves, and –2 Armor Class.",
          defaultRounds: 1,
          fixedRounds: true,
          applyToAllTargets: true,
        },
        summary: "Chaotic evil allies within the 30-foot burst are affected as if targeted by rage for 1 round.",
      },
    });
    if (["cleric-demonic-apostle-demonic-channel-su-1", "medium-voice-of-the-void-void-channeler-su-3", "skald-wyrm-singer-breath-weapon-su-12"].includes(feature.id)) fullyAutomatedFeatureIds.add(feature.id);
  }
  return { actions, fullyAutomatedFeatureIds };
}

export const inferArchetypeResourceDamageActions = (archetype) => inferredArchetypeResourceDamageActionDetails(archetype).actions;
