import { todayISO } from "./date";
import { sourceText, type Text } from "./internacional/mensagens";
/* Gravação da importação de membros por planilha. Recebe o cliente do
   Supabase (schema service) de fora: a tela passa o do navegador e
   scripts/check-importar-local.ts passa um de teste contra o banco local.
   Mesmas tabelas do "Novo membro": service.members e, para quem entrou,
   o fato "importado" em service.timeline_events (lei 10). */

import type { SupabaseClient } from "@supabase/supabase-js";
import { friendlyWriteError } from "../painel/erros";
import { camposVazios, paraBanco, type Conferida, type Existente } from "./planilha";

type Banco = ReturnType<SupabaseClient["schema"]>;

export type ResumoImportacao = { importados: number; atualizados: number; pulados: number; falhas: { n: number; nome: string; motivo: string }[]; semHistorico: number };

const LOTE = 200;
const COLS_BASE = "id,name,phone,email,birth,neighborhood,street,city,state,postal_code,since_year";

/** Membros da organização, mil por vez, para achar duplicados.
    colunasNovas = a migração 0072 (sexo, estado civil, imported_at) já está no banco. */
export async function carregarExistentes(sb: Banco, organizationId: string, t: Text = sourceText): Promise<{ lista: Existente[]; colunasNovas: boolean }> {
  const buscar = async (cols: string) => {
    const lista: Existente[] = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await sb.from("members").select(cols).eq("organization_id", organizationId).order("id").range(de, de + 999);
      if (error) return { lista, error };
      lista.push(...((data ?? []) as unknown as Existente[]));
      if (!data || data.length < 1000) return { lista, error: null };
    }
  };
  const comNovas = await buscar(`${COLS_BASE},sex,marital_status`);
  if (!comNovas.error) return { lista: comNovas.lista, colunasNovas: true };
  /* só cai para as colunas antigas se o erro for coluna inexistente (antes da 0072);
     qualquer outro erro (rede, permissão) sobe, para a tela pedir que tente de novo */
  const semColuna = comNovas.error.code === "42703" || comNovas.error.code === "PGRST204" || /column .* does not exist/i.test(comNovas.error.message ?? "");
  if (!semColuna) throw new Error(friendlyWriteError(comNovas.error.message, t));
  const base = await buscar(COLS_BASE);
  if (base.error) throw new Error(friendlyWriteError(base.error.message, t));
  return { lista: base.lista, colunasNovas: false };
}

export async function gravarImportacao(sb: Banco, p: {
  organizationId: string;
  churchId: string;
  /** linhas novas (nem erro, nem repetida, nem já cadastrada) */
  novas: Conferida[];
  /** já cadastradas que vão ter os campos vazios completados */
  completar: Conferida[];
  /** contadas como puladas (repetidas e já cadastradas que ficam como estão) */
  puladas: number;
  /** linhas com erro, que não entram */
  comErro: Conferida[];
  colunasNovas: boolean;
  arquivo: string;
  aoAvancar?: (feito: number, total: number) => void;
}, t: Text = sourceText): Promise<ResumoImportacao> {
  const agora = new Date().toISOString();
  const { data: igreja, error: fusoErro } = await sb.from("churches").select("time_zone").eq("id", p.churchId).eq("organization_id", p.organizationId).single();
  if (fusoErro || !igreja) throw new Error(t("Não foi possível carregar o fuso da igreja para importar."));
  const hoje = todayISO(igreja.time_zone);
  const sortKey = Number(hoje.replace(/-/g, ""));
  const quando = hoje.split("-").reverse().join("/");
  const total = p.novas.length + p.completar.length;
  const r: ResumoImportacao = { semHistorico: 0, importados: 0, atualizados: 0, pulados: p.puladas, falhas: p.comErro.map((l) => ({ n: l.n, nome: l.valores.nome, motivo: l.erro ?? "" })) };
  let feito = 0;
  p.aoAvancar?.(feito, total);

  const ficha = (l: Conferida) => ({
    id: crypto.randomUUID(),
    organization_id: p.organizationId,
    church_id: p.churchId,
    ...paraBanco(l.valores, p.colunasNovas),
    situation: l.valores.situacao,
    journey: [0, 0, 0, 0, 0],
    ...(p.colunasNovas ? { imported_at: agora } : {}),
  });
  const fato = (memberId: string) => ({
    organization_id: p.organizationId, member_id: memberId, event_type: "importado",
    title: "Cadastro importado de planilha", body: p.arquivo, sort_key: sortKey, when_label: quando,
  });

  for (let i = 0; i < p.novas.length; i += LOTE) {
    const lote = p.novas.slice(i, i + LOTE);
    const fichas = lote.map(ficha);
    const { error } = await sb.from("members").insert(fichas);
    let gravadas = fichas.map((f) => f.id);
    if (error) {
      /* um erro derruba o lote inteiro: tenta uma por uma para salvar as outras */
      gravadas = [];
      for (let j = 0; j < fichas.length; j++) {
        const { error: e1 } = await sb.from("members").insert(fichas[j]);
        if (e1) r.falhas.push({ n: lote[j].n, nome: lote[j].valores.nome, motivo: friendlyWriteError(e1.message, t) });
        else gravadas.push(fichas[j].id);
      }
    }
    r.importados += gravadas.length;
    if (gravadas.length) {
      /* a ficha já entrou; se o fato da linha do tempo falhar, o resumo conta (não some calado) */
      const { error: eh } = await sb.from("timeline_events").insert(gravadas.map(fato));
      if (eh) r.semHistorico += gravadas.length;
    }
    feito += lote.length;
    p.aoAvancar?.(feito, total);
  }

  for (let i = 0; i < p.completar.length; i += 8) {
    const parte = p.completar.slice(i, i + 8);
    await Promise.all(parte.map(async (l) => {
      const campos = camposVazios(l.existente!.pessoa, l.valores, p.colunasNovas);
      const { error } = await sb.from("members").update(campos).eq("id", l.existente!.pessoa.id);
      if (error) r.falhas.push({ n: l.n, nome: l.valores.nome, motivo: friendlyWriteError(error.message, t) });
      else r.atualizados++;
    }));
    feito += parte.length;
    p.aoAvancar?.(feito, total);
  }
  r.falhas.sort((a, b) => a.n - b.n);
  return r;
}
