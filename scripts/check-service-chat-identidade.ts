import assert from "node:assert/strict";
import { identidadeConversa, type ParticipanteConversa } from "../app/service/modules/conversas/identidade";
const dm = { id: "a", kind: "dm", name: "Nome antigo", ministry_id: null };
const participantes: ParticipanteConversa[] = [
  { chat_id: "a", member_id: "eu", name: "Maria", photo_url: "maria.png" },
  { chat_id: "a", member_id: "lider", name: "Marta Master", photo_url: "marta.png" },
  { chat_id: "outra", member_id: "terceiro", name: "Outra pessoa" },
];
assert.deepEqual(identidadeConversa(dm, participantes, "eu"), { nome: "Marta Master", fotoUrl: "marta.png" });
assert.deepEqual(identidadeConversa(dm, participantes, "lider"), { nome: "Maria", fotoUrl: "maria.png" });
assert.deepEqual(identidadeConversa(dm, participantes.slice(0, 1), "eu"), { nome: "Pessoa indisponível", fotoUrl: null });
assert.equal(identidadeConversa(dm, participantes, null).nome, "Pessoa indisponível");
assert.equal(identidadeConversa(dm, [...participantes, { chat_id: "a", member_id: "ambiguo", name: "Ambíguo" }], "eu").nome, "Pessoa indisponível");
assert.equal(identidadeConversa({ ...dm, kind: "grupo", name: "Grupo de oração" }, participantes, "eu").nome, "Grupo de oração");
assert.equal(identidadeConversa({ ...dm, kind: "grupo", name: "  " }, [], "eu").nome, "Grupo sem nome");
assert.equal(identidadeConversa({ ...dm, kind: "time", name: null, ministry_id: "louvor" }, [], "eu", [{ id: "louvor", name: "Louvor" }]).nome, "Louvor");
console.log("Chat: identidade por participante, foto, dois lados, removido, ambiguidade, grupo e canal: OK.");
