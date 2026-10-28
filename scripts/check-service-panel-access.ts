import assert from "node:assert/strict";
import { modulosLigados, navGroups, podeVerRota, rotaLigada } from "../app/service/modules/registry";
import { clearPanelLocation, panelRoute, writePanelLocation } from "../app/service/lib/panel-navigation";
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

// Um endereço nunca amplia o conjunto de telas oferecido pelo registro.
assert.equal(panelRoute("escalas", ["cultos", "escalas"], "cultos"), "escalas");
for (const value of [null, "desconhecida", "financeiro", "__proto__", "constructor", "https://outro.local", "escalas/escondida"]) {
  assert.equal(panelRoute(value, ["cultos", "escalas"], "cultos"), "cultos");
}
const location = new URL("https://igreja.local/service?origem=teste&maba=agenda&mtela=eventos&aviso=escala#semana");
const panel = writePanelLocation(location, "escalas");
assert.equal(panel.pathname, "/service");
assert.equal(panel.searchParams.get("ptela"), "escalas");
assert.equal(panel.searchParams.get("origem"), "teste");
assert.equal(panel.hash, "#semana");
for (const key of ["maba", "mtela", "aviso"]) assert.equal(panel.searchParams.has(key), false);
assert.equal(location.searchParams.get("maba"), "agenda"); // não altera o URL de origem
assert.equal(clearPanelLocation(panel).searchParams.has("ptela"), false);
assert.equal(clearPanelLocation(panel).searchParams.get("origem"), "teste");
assert.equal(panelRoute("escalas", ["cultos"], "cultos"), "cultos"); // revogação posterior
console.log("Endereços do painel: telas permitidas, inválidas e revogadas, parâmetros independentes e alternância com o membro.");
