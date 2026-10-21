import assert from "node:assert/strict";
import { calendarioDemo } from "../app/service/demo/datas";
import { parseISODate } from "../app/service/lib/date";
for (const hoje of ["2026-10-21", "2026-10-25", "2026-12-31", "2027-01-01", "2028-02-29"]) {
  const c = calendarioDemo(hoje);
  assert.ok(c.domingo > hoje);
  assert.equal(parseISODate(c.domingo)?.getDay(), 0);
  assert.equal(c.deslocar("2026-07-06"), c.domingo);
  assert.equal(c.deslocar("06/07/2026"), c.domingo.split("-").reverse().join("/"));
  assert.equal(c.deslocar("2026-07-06T12:00:00Z"), `${c.domingo}T12:00:00Z`);
}
assert.equal(calendarioDemo("2026-12-31").deslocar("20/07/2026"), "17/01/2027");
console.log("Demo: domingo futuro, eventos e reservas com a mesma âncora, datas brasileiras/ISO, virada de ano e ano bissexto.");
