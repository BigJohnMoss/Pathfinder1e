import assert from "node:assert/strict";
import test from "node:test";
import { parseClassSpellList } from "../tools/scripts/aon-spell-list.mjs";

test("spell list import reads ordinary and source-marked spell links at their listed ranks", () => {
  const html = `<span><h2>1st-Level</h2>
    <b><a href="SpellDisplay.aspx?ItemName=Test%20Wave">Test Wave</a></b>: A small wave.<br />
    <b><a href="SpellDisplay.aspx?ItemName=Test%20Ward"><img src="pfs.gif"> Test Ward</b><sup>Y</sup><b></a></b>: A brief ward.<br />
    <h2>2nd-Level</h2>
    <b><a href="SpellDisplay.aspx?ItemName=Test%20Echo">Test Echo</b><sup>M</sup><sup title="source">Y</sup><b></a></b>: Repeat a <i>sound</i>.<br />
  </span>`;
  assert.deepEqual(parseClassSpellList(html), [
    { itemName: "Test%20Wave", name: "Test Wave", level: 1, summary: "A small wave." },
    { itemName: "Test%20Ward", name: "Test Ward", level: 1, summary: "A brief ward." },
    { itemName: "Test%20Echo", name: "Test Echo", level: 2, summary: "Repeat a sound ." },
  ]);
});
