import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";

test("later-class archetype imports preserve UTF-8 rules text", async () => {
  const directory = new URL("../packages/data/src/archetypes/", import.meta.url);
  const names = await readdir(directory);
  for (const [classId, expectedCount] of [["magus", 31], ["gunslinger", 23], ["samurai", 7]]) {
    const files = names.filter(name => name.startsWith(`${classId}-`) && name.endsWith(".json"));
    assert.equal(files.length, expectedCount, `${classId} archetype count`);
    for (const file of files) {
      const text = await readFile(new URL(file, directory), "utf8");
      assert.doesNotMatch(text, /â(?:€|€™|€”|€“)/, `${file} contains mojibake`);
      const entry = JSON.parse(text);
      assert.equal(entry.classId, classId);
      assert.ok(entry.source?.url);
      assert.ok(entry.replacements?.some(replacement => replacement.features?.length));
    }
  }
});
