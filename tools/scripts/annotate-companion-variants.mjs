import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);

async function loadArchetype(relativePath) {
  const url = new URL(`packages/data/src/archetypes/${relativePath}`, root);
  return { url, value: JSON.parse(await readFile(url, "utf8")) };
}

const wave = await loadArchetype("cavalier-wave-rider.json");
const seafaring = wave.value.replacements.flatMap((item) => item.features ?? [])
  .find((feature) => feature.id === "cavalier-wave-rider-seafaring-companion-1");
if (!seafaring) throw new Error("Wave Rider Seafaring Companion was not found.");
Object.assign(seafaring, {
  type: "bonus-feat",
  summary: "Gain Monstrous Mount as a bonus feat, restricted to a hippocampus mount. The hippocampus otherwise advances as the Cavalier's full-level mount.",
  grantedFeatId: "monstrous-mount",
});
wave.value.companionGrants = [{
  id: "hippocampus-mount",
  kind: "mount",
  label: "Hippocampus mount",
  optionId: "wave-rider-hippocampus",
  sourceFeatureId: seafaring.id,
  minimumLevel: 1,
  rules: [
    "The hippocampus advances using the wave rider's full Cavalier level as its animal companion level.",
    "The bonus Monstrous Mount feat is restricted to a hippocampus.",
  ],
}];
wave.value.mechanicalCoverage = "full";
wave.value.mechanicalNotes = [
  "The restricted Monstrous Mount bonus feat, hippocampus grant, full-level progression, and proficiency changes are automated.",
];

const drake = await loadArchetype("ranger-drake-warden.json");
const youngDrake = drake.value.replacements.flatMap((item) => item.features ?? [])
  .find((feature) => feature.id === "ranger-drake-warden-young-drake-4");
if (!youngDrake) throw new Error("Drake Warden Young Drake was not found.");
drake.value.companionGrants = [{
  id: "young-drake",
  kind: "drake",
  label: "Young drake",
  optionId: "drake-warden-drake",
  sourceFeatureId: youngDrake.id,
  minimumLevel: 4,
  effectiveLevelAdjustment: -3,
  drakePowerLevels: [3, 7],
  drakeSizeLevels: [5],
  rules: [
    "The young drake's effective charge level equals the drake warden's Ranger level minus 3.",
    "It gains drake powers only at effective levels 3 and 7, and increases in size only at effective level 5.",
  ],
}];
drake.value.mechanicalCoverage = "full";
drake.value.mechanicalNotes = [
  "The young drake grant, Ranger-level-minus-3 progression, two drake-power unlocks, and single size increase are automated.",
];

await writeFile(wave.url, `${JSON.stringify(wave.value, null, 2)}\n`);
await writeFile(drake.url, `${JSON.stringify(drake.value, null, 2)}\n`);
console.log("Annotated Wave Rider and Drake Warden companion variants.");
