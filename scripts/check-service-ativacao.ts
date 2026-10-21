import assert from "node:assert/strict";
import { encontroUtil, planejarEncontros, type RascunhoEncontro } from "../app/service/modules/configuracao/ativacao";
import { ativacaoSubstituiTour } from "../app/service/modules/configuracao/setup";

const base: RascunhoEncontro = { nome: "Encontro de sexta", data: "2026-10-23", hora: "19:17", local: "Rua da Comunidade, 100", repetir: false, ate: "2026-11-13" };
const plan = (patch: Partial<RascunhoEncontro> = {}) => planejarEncontros({ ...base, ...patch }, "2026-10-20", "18:00");
assert.equal(plan().erro, undefined);
assert.equal(plan().encontros.length, 1, "não cria uma série implicitamente");
assert.equal(plan().encontros[0].hora, "19:17", "horário livre preservado");
assert.deepEqual(plan({ repetir: true }).encontros.map((e) => e.data), ["2026-10-23", "2026-10-30", "2026-11-06", "2026-11-13"]);
assert.deepEqual(plan({ data: "2026-12-25", repetir: true, ate: "2027-01-08" }).encontros.map((e) => e.data), ["2026-12-25", "2027-01-01", "2027-01-08"]);
for (const patch of [{ data: "2026-02-31" }, { data: "23 out" }, { data: "2026-10-19" }, { data: "2026-10-20", hora: "17:59" }, { hora: "24:00" }, { hora: "19h17" }, { local: " " }, { nome: " " }, { repetir: true, ate: "2026-10-23" }, { repetir: true, ate: "2028-01-01" }]) {
  assert.ok(plan(patch).erro, JSON.stringify(patch));
  assert.equal(plan(patch).encontros.length, 0, "erro não devolve lote parcial");
}
assert.equal(encontroUtil({ ...base, data: "2026-10-20", hora: "18:00" }, "2026-10-20", "18:00"), true);
assert.equal(encontroUtil({ ...base, hora: "" }, "2026-10-20", "18:00"), false);
assert.equal(encontroUtil({ ...base, local: "" }, "2026-10-20", "18:00"), false);
assert.equal(ativacaoSubstituiTour(undefined, true, true), true);
assert.equal(ativacaoSubstituiTour({ fase: 2, feitas: [1] }, false, false), true, "tour não interrompe a retomada após criar time e encontro");
assert.equal(ativacaoSubstituiTour({ concluido: true, primeiroEventoId: "encontro" }, false, false), true, "conclusão guiada não dispara outro onboarding");
assert.equal(ativacaoSubstituiTour(undefined, false, false), false, "igreja existente sem ativação guiada mantém ajuda original");
console.log("Ativação: encontro individual, horário livre, série semanal, virada de ano e pré-requisitos verificados.");
