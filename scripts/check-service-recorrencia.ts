import assert from "node:assert/strict";
import { datasDaSerie, diasEntre, ehRepeticao, feitoDaSerie, mesesEntre, resumoDaSerie, somaMeses, TETO_SERIE } from "../app/service/lib/recorrencia";

/* semanal e a cada 15 dias, com início e fim inclusos */
assert.deepEqual(datasDaSerie("2026-11-15", "semanal", "2026-12-06"), ["2026-11-15", "2026-11-22", "2026-11-29", "2026-12-06"]);
assert.deepEqual(datasDaSerie("2026-11-15", "quinzenal", "2026-12-13"), ["2026-11-15", "2026-11-29", "2026-12-13"]);
/* virada de ano e horário de verão não mexem na data civil */
assert.deepEqual(datasDaSerie("2026-12-27", "semanal", "2027-01-10"), ["2026-12-27", "2027-01-03", "2027-01-10"]);
/* mensal: mesmo dia, último dia quando o mês é curto, sem escorregar depois */
assert.deepEqual(datasDaSerie("2027-01-31", "mensal", "2027-04-30"), ["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30"]);
assert.equal(somaMeses("2028-01-31", 1), "2028-02-29");
assert.equal(somaMeses("2026-11-15", 2), "2027-01-15");
/* fim antes do início, ou inválido: só o encontro de partida */
assert.deepEqual(datasDaSerie("2026-11-15", "semanal", "2026-11-01"), ["2026-11-15"]);
assert.deepEqual(datasDaSerie("2026-11-15", "semanal", ""), ["2026-11-15"]);
assert.deepEqual(datasDaSerie("", "semanal", "2026-12-01"), []);
/* teto */
assert.equal(datasDaSerie("2026-01-04", "semanal", "2030-01-01").length, TETO_SERIE);
/* apoio */
assert.equal(diasEntre("2026-11-15", "2026-11-22"), 7);
assert.equal(diasEntre("2026-11-22", "2026-11-15"), -7);
assert.equal(ehRepeticao("mensal"), true);
assert.equal(ehRepeticao("nao"), false);
assert.equal(resumoDaSerie(["2026-11-15", "2026-11-22"], "semanal"), "Vai criar 2 encontros, toda semana, até 22/11.");
assert.equal(resumoDaSerie(["2026-12-27", "2027-01-03"], "semanal", "cultos"), "Vai criar 2 cultos, toda semana, até 03/01/2027.");
assert.equal(resumoDaSerie(["2026-11-15"], "mensal", "reuniões"), "Vai criar 1 reunião, todo mês, até 15/11.");
assert.equal(feitoDaSerie(["2026-11-15", "2026-12-15"], "mensal", "reuniões"), "Na agenda: 2 reuniões, todo mês, até 15/12.");
assert.equal(mesesEntre("2027-01-31", "2027-04-30"), 3);
assert.equal(mesesEntre("2026-12-15", "2027-01-15"), 1);
assert.match(resumoDaSerie(datasDaSerie("2026-01-04", "semanal", "2030-01-01"), "semanal"), /máximo de uma vez é 60/);

console.log("Recorrência: semanal, 15 dias, mensal com mês curto, fim inválido, teto e resumo.");
