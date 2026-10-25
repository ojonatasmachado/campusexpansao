import assert from "node:assert/strict";
import { entregarAvisos, esvaziarFila } from "../app/lib/service-avisos";

// Banco em memória sem endpoints de push. Nenhum envio externo neste teste.
type Row = Record<string, unknown>;
function banco() {
  const tabelas: Record<string, Row[]> = {
    people: [
      { id: "br", church_id: "igreja-br", organization_id: "org", notif_off: [] },
      { id: "jp", church_id: "igreja-jp", organization_id: "org", notif_off: [] },
      { id: "off", church_id: "igreja-jp", organization_id: "org", notif_off: ["mural"] },
      { id: "estranho", church_id: "igreja-jp", organization_id: "outra", notif_off: [] },
    ],
    churches: [
      { id: "igreja-br", organization_id: "org", time_zone: "America/Sao_Paulo" },
      { id: "igreja-jp", organization_id: "org", time_zone: "Asia/Tokyo" },
    ],
    push_queue: [], push_subscriptions: [], app_events: [],
  };
  let falharFila = false;
  let falharIdioma = false;
  const idiomas: Record<string, string> = { br: "pt-BR", jp: "en-US", off: "es-ES" };
  const consultasPush: string[][] = [];
  const db = {
    async rpc(nome: string, args: { p_org: string; p_people: string[] }) {
      assert.equal(nome, "notification_locales");
      if (falharIdioma) return { data: null, error: new Error("idioma indisponível") };
      return { error: null, data: tabelas.people.filter((p) => p.organization_id === args.p_org && args.p_people.includes(String(p.id)))
        .map((p) => ({ person_id: p.id, locale_code: idiomas[String(p.id)] ?? "pt-BR" })) };
    },
    from(tabela: string) {
      const filtros: Array<(r: Row) => boolean> = [];
      let alterar: Row | undefined;
      let inserir: Row[] | undefined;
      const q = {
        select() { return q; },
        eq(k: string, v: unknown) { filtros.push((r) => r[k] === v); return q; },
        in(k: string, v: unknown[]) { filtros.push((r) => v.includes(r[k])); if (tabela === "push_subscriptions" && k === "person_id") consultasPush.push(v as string[]); return q; },
        is(k: string, v: unknown) { filtros.push((r) => (r[k] ?? null) === v); return q; },
        lte(k: string, v: string) { filtros.push((r) => String(r[k]) <= v); return q; },
        update(v: Row) { alterar = v; return q; },
        insert(v: Row[]) { inserir = v; return q; },
        then(resolve: (r: { data: Row[]; error: Error | null }) => unknown, reject?: (e: unknown) => unknown) {
          if (inserir && tabela === "push_queue" && falharFila) return Promise.resolve({ data: [], error: new Error("fila indisponível") }).then(resolve, reject);
          if (inserir) tabelas[tabela].push(...inserir.map((r, i) => ({ id: `${tabela}-${tabelas[tabela].length + i}`, ...r })));
          const linhas = tabelas[tabela].filter((r) => filtros.every((f) => f(r)));
          if (alterar) linhas.forEach((r) => Object.assign(r, alterar));
          return Promise.resolve({ data: linhas.map((r) => ({ ...r })), error: null }).then(resolve, reject);
        },
      };
      return q;
    },
  };
  return { db: db as unknown as Parameters<typeof entregarAvisos>[0], tabelas, idiomas, consultasPush, falhar: () => { falharFila = true; }, falharIdioma: () => { falharIdioma = true; } };
}

async function main() {
  const RealDate = Date;
  const agora = RealDate.parse("2026-10-21T01:30:00Z");
  globalThis.Date = new Proxy(RealDate, {
    construct(target, args, newTarget) { return Reflect.construct(target, args.length ? args : [agora], newTarget); },
    get(target, key, receiver) { return key === "now" ? () => agora : Reflect.get(target, key, receiver); },
  });
  try {
    const b = banco();
    await entregarAvisos(b.db, { organizationId: "org", peopleIds: ["br", "jp", "off", "estranho", "br"], categoria: "mural", title: "Teste", body: "Teste" });
    assert.equal(b.tabelas.push_queue.length, 2);
    assert.equal(b.tabelas.push_queue.find((r) => r.person_id === "br")?.send_after, "2026-10-21T10:00:00.000Z");
    assert.equal(b.tabelas.push_queue.find((r) => r.person_id === "jp")?.send_after, "2026-10-21T02:00:00.000Z");
    assert.deepEqual(b.consultasPush, []);

    const c = banco();
    await entregarAvisos(c.db, { organizationId: "org", peopleIds: ["br", "jp"], categoria: "escala", title: "Teste", body: "Teste" });
    assert.equal(c.tabelas.push_queue.length, 1);
    assert.equal(c.tabelas.push_queue[0].person_id, "br");
    assert.deepEqual(c.consultasPush, [["jp"]]);

    const f = banco(); f.falhar();
    await assert.rejects(entregarAvisos(f.db, { organizationId: "org", peopleIds: ["br"], categoria: "escala", title: "Teste", body: "Teste" }), /fila indisponível/);
    assert.deepEqual(f.consultasPush, []);

    const q = banco();
    q.tabelas.push_queue.push(...["br", "jp", "off", "estranho"].map((p) => ({ id: p, organization_id: "org", person_id: p, categoria: "mural", title: "Teste", body: "Teste", send_after: "2026-10-20T00:00:00Z", sent_at: null })));
    await esvaziarFila(q.db);
    assert.equal(q.tabelas.push_queue.find((r) => r.id === "br")?.sent_at, null);
    assert.equal(q.tabelas.push_queue.find((r) => r.id === "br")?.send_after, "2026-10-21T10:00:00.000Z");
    assert.deepEqual(q.consultasPush, [["jp"]]);
    await esvaziarFila(q.db);
    assert.deepEqual(q.consultasPush, [["jp"]]); // não repete a linha reservada

    const envios: { title: string; body: string; url?: string }[] = [];
    const enviar: NonNullable<Parameters<typeof entregarAvisos>[2]> = async (_subs, aviso) => {
      envios.push(aviso);
      return { deadEndpoints: [] };
    };
    const assinatura = { id: "local-jp", person_id: "jp", endpoint: "https://push.invalid/local", p256dh: "local", auth_key: "local" };
    const n = banco();
    n.tabelas.push_subscriptions.push(assinatura);
    await entregarAvisos(n.db, { organizationId: "org", peopleIds: ["br", "jp", "off", "estranho"], categoria: "mural", title: "Celebração da Família", body: "fallback", bodyTemplate: "mural-lembrete" }, enviar);
    assert.equal(n.tabelas.push_queue.length, 2);
    assert.equal(n.tabelas.push_queue.find((r) => r.person_id === "jp")?.body, "You have not seen this church board post yet.");
    assert.equal(n.tabelas.push_queue.find((r) => r.person_id === "br")?.body, "Você ainda não viu esta publicação do Mural.");
    assert.equal(envios.length, 0);
    // A preferência muda durante a espera: a entrega usa o novo idioma.
    n.idiomas.jp = "es-ES";
    n.tabelas.push_queue.forEach((r) => { r.send_after = "2026-10-20T00:00:00Z"; });
    assert.equal(await esvaziarFila(n.db, "org", enviar), 1);
    assert.equal(envios[0].title, "Celebração da Família");
    assert.equal(envios[0].body, "Aún no has visto esta publicación del tablón de la iglesia.");
    assert.equal(n.tabelas.push_queue.find((r) => r.person_id === "br")?.sent_at, undefined);

    const resumo = banco();
    resumo.tabelas.push_subscriptions.push(assinatura);
    const titulos = ["Retiro Português", "Culto da Manhã", "Encontro de Jovens", "Quarta Família"];
    resumo.tabelas.push_queue.push(...titulos.map((title, i) => ({ id: `resumo-${i}`, organization_id: "org", person_id: "jp", categoria: "mural", title, body: "Conteúdo da igreja", send_after: "2026-10-20T00:00:00Z", sent_at: null })));
    envios.length = 0;
    assert.equal(await esvaziarFila(resumo.db, "org", enviar), 1);
    assert.equal(envios[0].body, "4 new posts: Retiro Português, Culto da Manhã, Encontro de Jovens and others.");
    assert.equal(await esvaziarFila(resumo.db, "org", enviar), 0);
    assert.equal(envios.length, 1);

    const livre = banco();
    livre.idiomas.jp = "es-ES";
    livre.tabelas.push_subscriptions.push(assinatura);
    envios.length = 0;
    await entregarAvisos(livre.db, { organizationId: "org", peopleIds: ["jp"], categoria: "mensagens", title: "Título da igreja", body: "Nova publicação no Mural." }, enviar);
    assert.equal(envios[0].body, "Nova publicação no Mural."); // conteúdo idêntico ao texto padrão não vira template
    assert.equal(envios[0].title, "Título da igreja");
    const falhaIdioma = banco();
    falhaIdioma.tabelas.push_queue.push({ id: "aguardando", organization_id: "org", person_id: "jp", categoria: "mural", title: "Teste", body: "Teste", body_template: "mural-novo", send_after: "2026-10-20T00:00:00Z", sent_at: null });
    falhaIdioma.falharIdioma();
    await assert.rejects(esvaziarFila(falhaIdioma.db, "org", enviar), /idioma indisponível/);
    assert.equal(falhaIdioma.tabelas.push_queue[0].sent_at, null);
    assert.deepEqual(falhaIdioma.consultasPush, []);
    console.log("Avisos: fuso por destinatário, categorias desligadas, isolamento de organização, falha da fila e reserva sem duplicação.");
    console.log("Idioma dos avisos: preferência atual na entrega, silêncio preservado, resumo único e conteúdo da igreja intocado. Envio simulado sem rede.");
  } finally { globalThis.Date = RealDate; }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
