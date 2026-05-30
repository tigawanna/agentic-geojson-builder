import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";

const MAP_ID = 4;

const LABELS = {
  6: "15km trail near Gate C (Sharks) — east entrance",
  7: "10km trail S loop near Gate C",
  8: "15km trail N loop (Huruma side, PDF)",
  9: "10km/15km junction E near Gate C",
  10: "15km trail bend at Gate C entrance",
  11: "15km trail N — east of Wangari Maathai Track",
  12: "10km trail W near ICRAF (PDF landmark)",
  13: "10km trail bend W — Gate D approach",
  14: "15km trail W near UNEP boundary (PDF)",
  15: "15km trail N loop bend (north section)",
  16: "10km ∩ 15km junction NW of Mau-Mau Caves",
  17: "15km trail N limb (north of central hub)",
  18: "Wangari Maathai Track — mid section",
  19: "Wangari Maathai Track ∩ footpath",
  20: "10km trail between Waterfall and Wangari path",
  21: "10km trail at Mau-Mau Caves (PDF)",
  22: "10km trail E of Mau-Mau Caves",
  23: "10km trail bend near Waterfall (PDF)",
  24: "10km trail along Ruaka River (E side)",
  25: "10km ∩ 15km junction — E loop",
  26: "10km trail mid E loop",
  27: "10km trail E loop near Ruaka",
  28: "10km trail E-center near river crossing",
  29: "10km trail W of Mau-Mau hub",
  30: "10km trail bend central (W of caves)",
  31: "10km trail S of Mau-Mau Caves",
  32: "10km trail toward Ranger Village",
  33: "Family Trail ∩ 10km junction (central)",
  34: "close to KFEET (PDF); near Gate D / River Cafe fork",
  35: "5km trail near River Cafe (PDF)",
  36: "5km trail S — near Sigiria Gate E (PDF)",
  37: "Family Trail start near Gate E (PDF)",
};

const dataDir = `${process.env.HOME}/.config/agentic-geojson-builder/pglite`;
const pg = new PGlite({ dataDir, extensions: { postgis } });
await pg.waitReady;

for (const [id, label] of Object.entries(LABELS)) {
  await pg.query(`UPDATE control_point SET label = $1 WHERE id = $2 AND map_id = $3`, [
    label,
    Number(id),
    MAP_ID,
  ]);
  console.log(`${id}: ${label}`);
}

const result = await pg.query(
  `SELECT COUNT(*)::int AS total, COUNT(label)::int AS labeled FROM control_point WHERE map_id = $1`,
  [MAP_ID],
);
const row = result.rows[0];
console.log(`\nLabeled ${row.labeled}/${row.total} points on map ${MAP_ID}`);
await pg.close();
