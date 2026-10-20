/* Regras da escala de um período (app/service/modules/escalas/periodo.ts).
   Rodar: npx tsx scripts/check-escala-periodo.ts */
import assert from "node:assert/strict";
import { ESCALA_DEFAULT, type EscalaSettings } from "../app/service/modules/escalas/regras";
import {
  avaliarPeriodo, cultosDoPeriodo, datasNoPeriodo, fimDoPeriodo, gerarPeriodo, linhasDaProposta, opcoesDaVaga, periodoValido, seriesDaAgenda,
  type EntradaPeriodo, type EventoAgenda, type TimePlano,
} from "../app/service/modules/escalas/periodo";
import type { PessoaEscala } from "../app/service/modules/escalas/candidatos";

let ok = 0;
function caso(nome: string, fn: () => void) {
  try { fn(); ok++; console.log(`ok  ${nome}`); } catch (e) { console.error(`ERRO ${nome}`); throw e; }
}

const ev = (id: string, eventDate: string, extra: Partial<EventoAgenda> = {}): EventoAgenda => ({
  id, organizationId: "o", name: "Culto de domingo", kind: "Culto", eventDate, time: "19:00", slot: "dom_n", location: "Templo", ministries: [], ...extra,
});
const pessoa = (id: string, extra: Partial<PessoaEscala> = {}): PessoaEscala => ({ id, name: id, status: "ativo", availability: {}, ...extra });
const cfg = (c: Partial<EscalaSettings> = {}): EscalaSettings => ({ ...ESCALA_DEFAULT, maxPorMes: 0, ...c });

function entrada(o: { events: EventoAgenda[]; inicio: string; fim: string; pessoas: PessoaEscala[]; times: TimePlano[]; roster?: EntradaPeriodo["roster"]; cfg?: EscalaSettings; avulsos?: string[] }): EntradaPeriodo {
  const series = seriesDaAgenda(o.events);
  return {
    cultos: cultosDoPeriodo(o.events, series, o.inicio, o.fim, o.avulsos),
    times: o.times, pessoas: o.pessoas, roster: o.roster ?? [], events: o.events.map((e) => ({ id: e.id, eventDate: e.eventDate })), cfg: o.cfg ?? cfg(),
  };
}
const time = (pessoas: string[], vagas = 1, id = "t1"): TimePlano => ({ id, nome: id, pessoas, funcoes: [{ id: `${id}-f`, nome: "Função", vagas }] });

caso("período de 1, 3 e 12 meses", () => {
  assert.equal(fimDoPeriodo("2026-11-01", 1), "2026-11-30");
  assert.equal(fimDoPeriodo("2026-11-01", 3), "2027-01-31");
  assert.equal(fimDoPeriodo("2026-11-01", 12), "2027-10-31");
  assert.equal(fimDoPeriodo("2027-01-31", 1), "2027-02-27");
  assert.ok(periodoValido("2026-11-01", "2027-10-31"));
  assert.ok(!periodoValido("2026-11-01", "2027-11-01"));
  assert.ok(!periodoValido("2026-11-02", "2026-11-01"));
});

caso("datas do dia da semana no período", () => {
  /* 01/11/2026 é domingo */
  assert.deepEqual(datasNoPeriodo("2026-11-01", "2026-11-30", 0), ["2026-11-01", "2026-11-08", "2026-11-15", "2026-11-22", "2026-11-29"]);
  assert.deepEqual(datasNoPeriodo("2026-11-02", "2026-11-10", 3), ["2026-11-04"]);
});

caso("séries: culto repete, avulso não", () => {
  const s = seriesDaAgenda([
    ev("a", "2026-10-25"),
    ev("b", "2026-10-28", { name: "Vigília", kind: "Evento", time: "22:00" }),
    ev("c", "2026-10-21", { name: "Estudo", kind: "Evento", time: "20:00", slot: "qua" }),
    ev("d", "2026-10-14", { name: "Estudo", kind: "Evento", time: "20:00", slot: "qua" }),
  ]);
  assert.deepEqual(s.map((x) => x.nome), ["Culto de domingo", "Estudo"]);
});

caso("usa o evento que já existe e cria o que falta", () => {
  const e = entrada({ events: [ev("a", "2026-11-08")], inicio: "2026-11-01", fim: "2026-11-30", pessoas: [], times: [] });
  assert.equal(e.cultos.length, 5);
  assert.equal(e.cultos.filter((c) => c.eventId).length, 1);
  assert.equal(e.cultos[1].eventId, "a");
});

caso("time com 1 pessoa: entra uma vez por culto, o resto vira aviso", () => {
  const e = entrada({ events: [ev("a", "2026-11-01")], inicio: "2026-11-01", fim: "2026-11-30", pessoas: [pessoa("ana")], times: [time(["ana"], 2)] });
  const p = gerarPeriodo(e);
  for (const c of e.cultos) assert.deepEqual(p[c.chave]["t1-f"], ["ana"]);
  const r = avaliarPeriodo(e, p);
  assert.equal(r.faltam, 5);
  assert.equal(r.avisos.filter((a) => a.tipo === "sem_gente").length, 5);
});

caso("teto por mês: ninguém passa do limite", () => {
  const e = entrada({ events: [ev("a", "2026-11-01")], inicio: "2026-11-01", fim: "2026-11-30", pessoas: [pessoa("ana"), pessoa("bia")], times: [time(["ana", "bia"])], cfg: cfg({ maxPorMes: 2 }) });
  const p = gerarPeriodo(e);
  const r = avaliarPeriodo(e, p);
  assert.ok(Object.values(r.vezes).every((n) => n <= 2));
  assert.equal(r.faltam, 1);
  assert.ok(!r.avisos.some((a) => a.tipo === "acima_carga"));
});

caso("rodízio justo: 3 pessoas em 12 domingos servem 4 vezes cada", () => {
  const e = entrada({ events: [ev("a", "2026-11-01")], inicio: "2026-11-01", fim: "2027-01-17", pessoas: [pessoa("ana"), pessoa("bia"), pessoa("cid")], times: [time(["ana", "bia", "cid"])] });
  const r = avaliarPeriodo(e, gerarPeriodo(e));
  assert.equal(e.cultos.length, 12);
  assert.deepEqual(Object.values(r.vezes).sort(), [4, 4, 4]);
});

caso("indisponível no horário ou na data não entra", () => {
  const e = entrada({
    events: [ev("a", "2026-11-01")], inicio: "2026-11-01", fim: "2026-11-15",
    pessoas: [pessoa("ana", { availability: { dom_n: false } }), pessoa("bia", { availability: { "d:2026-11-08": false } }), pessoa("cid", { status: "pausa" }), pessoa("dan", { status: "ferias" })],
    times: [time(["ana", "bia", "cid", "dan"])],
  });
  const p = gerarPeriodo(e);
  assert.deepEqual(e.cultos.map((c) => p[c.chave]?.["t1-f"] ?? []), [["bia"], [], ["bia"]]);
});

caso("folga de 1 semana: quem serviu descansa no domingo seguinte", () => {
  const e = entrada({ events: [ev("a", "2026-11-01")], inicio: "2026-11-01", fim: "2026-11-22", pessoas: [pessoa("ana"), pessoa("bia")], times: [time(["ana", "bia"])], cfg: cfg({ folgaSemanas: 1 }) });
  const p = gerarPeriodo(e);
  assert.deepEqual(e.cultos.map((c) => p[c.chave]?.["t1-f"] ?? []), [["ana"], ["bia"], ["ana"], ["bia"]]);
});

caso("escala salva é mantida e quem recusou não volta", () => {
  const e = entrada({
    events: [ev("a", "2026-11-01")], inicio: "2026-11-01", fim: "2026-11-01", pessoas: [pessoa("ana"), pessoa("bia"), pessoa("cid")], times: [time(["ana", "bia", "cid"], 2)],
    roster: [{ event_id: "a", position_id: "t1-f", person_id: "ana", status: "ok" }, { event_id: "a", position_id: "t1-f", person_id: "bia", status: "no" }],
  });
  const p = gerarPeriodo(e);
  assert.deepEqual(p["a"]["t1-f"], ["cid"]);
});

caso("mesma pessoa não serve em dois times no mesmo culto", () => {
  const e = entrada({ events: [ev("a", "2026-11-01")], inicio: "2026-11-01", fim: "2026-11-01", pessoas: [pessoa("ana")], times: [time(["ana"], 1, "t1"), time(["ana"], 1, "t2")] });
  const p = gerarPeriodo(e);
  assert.deepEqual(p["a"], { "t1-f": ["ana"] });
});

caso("ajuste manual: avisos de carga, indisponível e repetido", () => {
  const e = entrada({ events: [ev("a", "2026-11-01")], inicio: "2026-11-01", fim: "2026-11-15", pessoas: [pessoa("ana", { availability: { dom_n: false } }), pessoa("bia")], times: [time(["ana", "bia"]), time(["ana", "bia"], 1, "t2")], cfg: cfg({ maxPorMes: 2 }) });
  const p = gerarPeriodo(e);
  for (const c of e.cultos) p[c.chave] = { "t1-f": ["bia"], "t2-f": ["bia"] };
  p[e.cultos[0].chave]["t2-f"] = ["ana"];
  const tipos = avaliarPeriodo(e, p).avisos.map((a) => a.tipo).sort();
  assert.deepEqual(tipos, ["acima_carga", "indisponivel", "repetido", "repetido"]);
  const op = opcoesDaVaga(e, p, e.cultos[1].chave, "t1", "t1-f", "bia");
  assert.equal(op.find((c) => c.person.id === "ana")?.fit, "busy");
});

caso("40 pessoas, 12 meses, 3 cultos por semana: rápido e equilibrado", () => {
  const ids = Array.from({ length: 40 }, (_, i) => `p${i}`);
  const events = [ev("dm", "2026-11-01", { name: "Manhã", time: "09:00", slot: "dom_m" }), ev("dn", "2026-11-01"), ev("qa", "2026-11-04", { name: "Quarta", time: "20:00", slot: "qua" })];
  const times: TimePlano[] = [
    { id: "lv", nome: "Louvor", pessoas: ids.slice(0, 20), funcoes: [{ id: "voz", nome: "Voz", vagas: 3 }, { id: "ins", nome: "Instrumento", vagas: 3 }] },
    { id: "rc", nome: "Recepção", pessoas: ids.slice(15), funcoes: [{ id: "porta", nome: "Porta", vagas: 4 }] },
  ];
  const t0 = Date.now();
  const e = entrada({ events, inicio: "2026-11-01", fim: fimDoPeriodo("2026-11-01", 12), pessoas: ids.map((id) => pessoa(id)), times, cfg: cfg({ maxPorMes: 4 }) });
  const p = gerarPeriodo(e);
  const r = avaliarPeriodo(e, p);
  const ms = Date.now() - t0;
  assert.ok(e.cultos.length >= 156, `cultos: ${e.cultos.length}`);
  assert.ok(ms < 3000, `demorou ${ms}ms`);
  assert.ok(!r.avisos.some((a) => a.tipo === "acima_carga" || a.tipo === "repetido"));
  /* a justiça se mede dentro de quem disputa as mesmas vagas: só Louvor (p0 a p14) e só Recepção (p20 a p39) */
  for (const grupo of [ids.slice(0, 15), ids.slice(20)]) {
    const v = grupo.map((id) => r.vezes[id] ?? 0);
    /* time saturado bate no teto do mês; meses de 4 ou 5 domingos dão até meio teto de diferença no ano */
    assert.ok(Math.max(...v) - Math.min(...v) <= 6, `vezes de ${Math.min(...v)} a ${Math.max(...v)}`);
  }
  const linhas = linhasDaProposta(e, p, (c) => c.eventId ?? c.chave);
  assert.equal(linhas.length, r.propostas);
  console.log(`    ${e.cultos.length} cultos, ${r.propostas} pessoas propostas, ${r.faltam} vagas abertas, ${ms}ms`);
});

console.log(`\n${ok} casos ok`);
