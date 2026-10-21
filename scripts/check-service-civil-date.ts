import assert from "node:assert/strict";
import { isCivilDate } from "../app/service/lib/date";

// Um evento precisa de uma data civil completa, sem rollover silencioso.
for (const value of ["2026-10-20", "2027-01-01", "2028-02-29", "2026-12-31"]) {
  assert.equal(isCivilDate(value), true, value);
}
for (const value of ["", "20 out", "20/10/2026", "2026-02-29", "2026-02-31", "2026-13-01", "2026-00-01", "2026-10-00", "2026-04-31", "2026-10-20T00:00:00Z"]) {
  assert.equal(isCivilDate(value), false, value);
}
console.log("Datas civis: ano, virada de ano, ano bissexto e datas inválidas verificados.");
