import assert from "node:assert/strict";
import { pendenciasDeCobertura } from "../app/service/modules/escalas/pendencias";
import { modulosDoInicio, modulosLigados } from "../app/service/modules/registry";

const agora = new Date("2026-11-09T15:00:00Z");
const fuso = "America/Sao_Paulo";
const times = [
  { id: "louvor", name: "Louvor", positions: [{ id: "voz", need_count: 2 }] },
  { id: "recepcao", name: "Recepção", positions: [{ id: "porta", need_count: 1 }] },
];
const evento = (id: string, eventDate: string, time = "19:00", ministries: string[] = []) => ({ id, eventDate, time, ministries });
const eventos = [
  evento("fora", "2026-11-23"), evento("ultimo", "2026-11-22"),
  evento("passou", "2026-11-08"), evento("ja-comecou", "2026-11-09", "08:00"),
  evento("primeiro", "2026-11-11"), evento("completo", "2026-11-12"),
  evento("sem-hora", "2026-11-09", ""), evento("so-louvor", "2026-11-13", "19:00", ["louvor"]),
];
const vagas = [
  { event_id: "primeiro", position_id: "voz", status: "wait" },
  { event_id: "primeiro", position_id: "porta", status: "no" },
  ...["voz", "voz", "porta"].map((position_id) => ({ event_id: "completo", position_id, status: "ok" })),
];
const medir = (escopo?: string[] | null) => pendenciasDeCobertura(eventos, vagas, times, escopo, fuso, agora);
const filas = medir();
assert.deepEqual(filas.map((p) => p.conteudo.evento.id), ["sem-hora", "primeiro", "so-louvor", "ultimo"]);
assert.equal(filas.find((p) => p.conteudo.evento.id === "primeiro")?.conteudo.resumo, "1 vaga em Louvor · 1 vaga em Recepção");
assert.equal(filas.find((p) => p.conteudo.evento.id === "so-louvor")?.conteudo.resumo, "2 vagas em Louvor");
assert(medir(["recepcao"]).every((p) => !p.conteudo.resumo.includes("Louvor")));
assert(!medir(["recepcao"]).some((p) => p.conteudo.evento.id === "so-louvor"));
assert.deepEqual(medir([]), []);
assert.deepEqual(pendenciasDeCobertura([], [], times, null, fuso, agora), []);
assert.deepEqual(pendenciasDeCobertura([evento("sem-time", "2026-11-11")], [], [], null, fuso, agora), []);
assert(filas.every((p) => p.modulo === "escalas" && p.tipo === "acao" && p.prioridade === 80));
assert(modulosDoInicio("painel.inicio.pendencias").has("escalas"));
assert(!modulosDoInicio("painel.inicio.pendencias", modulosLigados({ off: ["escalas"] })).has("escalas"));
assert(!modulosDoInicio("painel.inicio.pendencias", modulosLigados({ off: ["times"] })).has("escalas"));
// Às 01h UTC ainda é o dia anterior na igreja; os limites são civis, não UTC.
assert.equal(pendenciasDeCobertura([evento("local", "2026-11-08", "23:00")], [], times, null, fuso, new Date("2026-11-09T01:00:00Z")).length, 1);
console.log("Cobertura: 14 dias civis, hora/fuso, ordem, completo/vazio, recusa, plural, times do culto, escopo, registro e dependência: OK.");
