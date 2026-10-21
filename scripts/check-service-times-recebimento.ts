import assert from "node:assert/strict";
import { recebimentoAberto, podeReceberPedidos } from "../app/service/modules/times/recebimento";
assert.equal(recebimentoAberto({ people: [] }), false);
assert.equal(recebimentoAberto({ people: [], profile: { recebendoVoluntarios: "true" } }), false);
assert.equal(podeReceberPedidos({ people: [], profile: { recebendoVoluntarios: false }, recebePedidos: true }), false);
assert.equal(podeReceberPedidos({ people: [], profile: { recebendoVoluntarios: true } }), false);
assert.equal(podeReceberPedidos({ people: [], profile: { recebendoVoluntarios: true }, recebePedidos: true }), true);
console.log("Times: abertura explícita e disponibilidade verificada no servidor, sem depender de ler fichas de outras pessoas.");
