/* Importação de membros contra o Supabase LOCAL, com a RLS de verdade
   (entra como a conta master do seed). Importa docs/service-v7/exemplos/,
   confere o banco, importa de novo para ver os duplicados e no fim apaga
   só as fichas que este script criou.
   Rodar: npx tsx scripts/check-importar-local.ts [arquivo.csv|.xlsx ...]
   Precisa de: supabase start + npx tsx scripts/seed-local-service.ts + migração 0072. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { conferir, dddMaisComum, lerArquivo, lerLinha, palpiteColunas, camposVazios, type Conferida } from "../app/service/lib/planilha";
import { carregarExistentes, gravarImportacao } from "../app/service/lib/importar-membros";

/* a senha das contas de teste mora no seed (importar o arquivo rodaria o seed) */
const TEST_PASSWORD = readFileSync("scripts/seed-local-service.ts", "utf8").match(/TEST_PASSWORD = "([^"]+)"/)![1];
const URL = "http://127.0.0.1:54321";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

async function main() {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: eLogin } = await c.auth.signInWithPassword({ email: "master@teste.local", password: TEST_PASSWORD });
  if (eLogin) throw eLogin;
  const sb = c.schema("service");
  const { data: igreja, error: eIg } = await sb.from("churches").select("id,organization_id").eq("name", "Igreja Teste Local").single();
  if (eIg || !igreja) throw eIg ?? new Error("rode o seed local");
  const criados: string[] = [];
  const arquivos = process.argv.slice(2).length ? process.argv.slice(2) : ["docs/service-v7/exemplos/membros-exemplo.csv", "docs/service-v7/exemplos/membros-pior-caso.csv"];

  try {
    for (const caminho of arquivos) {
      const b = readFileSync(caminho);
      const arq = await lerArquivo({ name: caminho.split("/").pop()!, size: b.length, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer });
      const mapa = palpiteColunas(arq.cabecalho);
      const ddd = dddMaisComum(arq, mapa);
      const linhas = arq.linhas.map((l, i) => lerLinha(l, i + 2, mapa, { ddd }));

      const rodada = async (completarDup: boolean) => {
        const ex = await carregarExistentes(sb, igreja.organization_id);
        assert.ok(ex.colunasNovas, "migração 0072 não aplicada no banco local");
        const conf = conferir(linhas, ex.lista);
        const g = { nova: [] as Conferida[], existe: [] as Conferida[], repete: [] as Conferida[], erro: [] as Conferida[] };
        for (const l of conf) (l.erro ? g.erro : l.repeteLinha !== null ? g.repete : l.existente ? g.existe : g.nova).push(l);
        const completar = completarDup ? g.existe.filter((l) => Object.keys(camposVazios(l.existente!.pessoa, l.valores, true)).length) : [];
        const t0 = Date.now();
        let passos = 0;
        const r = await gravarImportacao(sb, {
          organizationId: igreja.organization_id, churchId: igreja.id, novas: g.nova, completar,
          puladas: g.repete.length + g.existe.length - completar.length, comErro: g.erro, colunasNovas: true, arquivo: arq.nome,
          aoAvancar: () => { passos++; },
        });
        return { g, r, ms: Date.now() - t0, passos, completar: completar.length };
      };

      const antes = Date.now();
      const um = await rodada(false);
      console.log(`${arq.nome}: ${arq.linhas.length} linhas → ${um.r.importados} importados, ${um.r.atualizados} atualizados, ${um.r.pulados} pulados, ${um.r.falhas.length} sem entrar · ${um.ms} ms, ${um.passos} avisos de progresso`);
      assert.equal(um.r.importados, um.g.nova.length, `falhas: ${JSON.stringify(um.r.falhas.slice(0, 3))}`);
      assert.equal(um.r.falhas.length, um.g.erro.length);

      const { data: novos } = await sb.from("members").select("id,name,phone,birth,sex,marital_status,imported_at,situation,journey,since_year,postal_code,state").gte("imported_at", new Date(antes - 1000).toISOString());
      criados.push(...(novos ?? []).map((m) => m.id));
      assert.equal(novos?.length, um.r.importados);
      const { count: fatos } = await sb.from("timeline_events").select("id", { count: "exact", head: true }).eq("event_type", "importado").in("member_id", (novos ?? []).slice(0, 300).map((m) => m.id));
      assert.equal(fatos, Math.min(300, novos!.length), "fato importado na linha do tempo");
      if (arq.nome === "membros-exemplo.csv") {
        const maria = novos!.find((m) => m.name === "Maria da Silva Souza")!;
        assert.deepEqual([maria.phone, maria.birth, maria.sex, maria.marital_status, maria.since_year, maria.postal_code, maria.situation], ["(11) 98765-4321", "1990-03-05", "feminino", "casado", "2015", "01234-000", "membro"]);
        assert.equal(novos!.find((m) => m.name === "João Pereira dos Santos")!.situation, "novo");
        assert.equal(novos!.find((m) => m.name === "Ana Beatriz Lima")!.state, "SP");
        console.log("  campos da Maria, João e Ana conferidos no banco");
      }

      /* segunda vez: quem entrou agora é "já cadastrado"; completar só preenche vazio */
      const dois = await rodada(true);
      console.log(`  de novo: ${dois.r.importados} importados, ${dois.r.atualizados} atualizados, ${dois.r.pulados} pulados (já cadastradas: ${dois.g.existe.length})`);
      assert.equal(dois.g.nova.length, 0, "ninguém deveria entrar duas vezes");
      assert.equal(dois.r.atualizados, dois.completar);
    }
    console.log("ok");
  } finally {
    /* limpa só o que o script criou (o fato na linha do tempo sai junto, on delete cascade) */
    for (let i = 0; i < criados.length; i += 200) await sb.from("members").delete().in("id", criados.slice(i, i + 200));
    console.log(`limpeza: ${criados.length} fichas de teste apagadas do banco local`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
