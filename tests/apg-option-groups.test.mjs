import assert from "node:assert/strict";
import test from "node:test";
import data from "../generated/pf1e-data.mjs";

test("the generated web catalogue retains every APG class option group", () => {
  const ids = new Set(data.optionGroups.map(group => group.id));
  for (const id of ["alchemist-discoveries","cavalier-orders","inquisitor-domains","witch-patrons","witch-hexes","eidolon-base-forms","eidolon-evolutions"]) assert.ok(ids.has(id), id);
});
