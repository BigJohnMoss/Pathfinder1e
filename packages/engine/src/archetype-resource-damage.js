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
  if (/melee touch attack that deals 1d6 points of sonic damage plus 1 point per mesmerist level/i.test(summary)) return {
    resource: ownResource(archetype, feature),
    combatRoll: {
      attack: { kind: "melee-touch", label: "Melee touch" },
      damage: {
        type: "sonic",
        diceCountByLevel: [{ level: minimumLevel, count: 1 }],
        dieSidesByLevel: [{ level: minimumLevel, sides: 6 }],
        flatModifierByLevel: distinctSteps(levels(minimumLevel, (level) => ({ modifier: level })), "modifier"),
      },
      rangeByLevel: [{ level: minimumLevel, range: "Melee touch" }],
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
    },
  };
  if (/deals 1d6 points of damage per 2 skald levels/i.test(summary)) return {
    resource: ownResource(archetype, feature),
    savingThrow: { label: "Reflex", ability: "charisma", base: 10, levelDivisor: 2, classId: archetype.classId },
    modes: ["acid", "cold", "electricity", "fire"].map((type) => ({ id: type, label: `${type[0].toUpperCase()}${type.slice(1)} damage`, summary: `The breath weapon deals ${type} damage.` })),
    combatRoll: {
      damage: {
        type: "energy",
        usesSelectedModeAsDamageType: true,
        diceCountByLevel: distinctSteps(levels(minimumLevel, (level) => ({ count: Math.max(1, Math.floor(level / 2)) })), "count"),
        dieSidesByLevel: [{ level: minimumLevel, sides: 6 }],
      },
      rangeByLevel: [{ level: minimumLevel, range: "30-foot cone or 60-foot line" }],
      targetSave: { modifier: "reflex", outcome: "half-damage" },
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
        ...(profile.modes ? { modeLabel: "Damage type", modes: profile.modes } : {}),
        ...(profile.savingThrow ? { savingThrow: profile.savingThrow } : {}),
        combatRoll: profile.combatRoll,
        summary,
      },
    });
  }
  return { actions, fullyAutomatedFeatureIds: new Set() };
}

export const inferArchetypeResourceDamageActions = (archetype) => inferredArchetypeResourceDamageActionDetails(archetype).actions;
