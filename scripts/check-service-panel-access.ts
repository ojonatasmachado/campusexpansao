import assert from "node:assert/strict";
import { modulosLigados, navGroups, podeVerRota, rotaLigada } from "../app/service/modules/registry";
const matrix = { lider: { painel: false, escala: false, cultos: true }, voluntario: { painel: false, escala: true } };
assert.equal(podeVerRota("painel", "lider", matrix), false);
assert.equal(podeVerRota("painel", "pastor", { pastor: { painel: false } }), false);
assert.equal(podeVerRota("painel", "master", matrix), true);
assert.equal(podeVerRota("escalas", "lider", matrix), false);
assert.equal(podeVerRota("cultos", "lider", matrix), true);
assert.equal(podeVerRota("escalas", "membro", matrix, [], true), true);
assert.equal(podeVerRota("escalas", "membro", matrix, [], false), false);
assert.equal(podeVerRota("visitantes", "membro", matrix, ["visitantes"]), true);
assert.equal(podeVerRota("financeiro", "lider", { lider: { "financeiro.ver": true } }), false);
assert.equal(podeVerRota("financeiro", "membro", matrix, ["financeiro.ver"]), true);
for (const off of [["escalas"], ["times"]]) {
 const ligados = modulosLigados({ off });
 assert.equal(rotaLigada("escalas", ligados), false);
 assert.equal(navGroups(ligados).some(g => g.items.some(i => i.id === "escalas")), false);
 // Papel privilegiado não liga módulo ou dependência desligados.
 assert.equal(rotaLigada("escalas", ligados) && podeVerRota("escalas", "master", matrix), false);
}
console.log("Painel: permissão do Início, líder, pastor, master, voluntário, acessos extras e módulos/dependências desligados.");
