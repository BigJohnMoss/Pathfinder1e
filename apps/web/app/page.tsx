import arcanist from "../../../packages/data/src/classes/arcanist.json";
import barbarian from "../../../packages/data/src/classes/barbarian.json";
import fighter from "../../../packages/data/src/classes/fighter.json";
import rogue from "../../../packages/data/src/classes/rogue.json";
const classes=[arcanist,barbarian,fighter,rogue];
export default function Home(){return <main><header><p className="eyebrow">PATHFINDER FIRST EDITION</p><h1>Character Builder Foundation</h1><p>A validated, Git-native rules database and progression engine.</p></header><section className="grid">{classes.map(c=><article key={c.id}><h2>{c.name}</h2><dl><div><dt>Hit Die</dt><dd>d{c.hitDie}</dd></div><div><dt>BAB</dt><dd>{c.babProgression}</dd></div><div><dt>Skill ranks</dt><dd>{c.skillRanksPerLevel} + Int</dd></div><div><dt>Feature rows</dt><dd>{c.features.length}</dd></div></dl><h3>Level 1</h3><ul>{c.features.filter(f=>f.level===1).map(f=><li key={f.id}>{f.name}</li>)}</ul></article>)}</section></main>}
