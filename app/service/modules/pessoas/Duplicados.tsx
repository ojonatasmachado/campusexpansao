"use client";

/* O11: possíveis cadastros duplicados na tela Pessoas. Uma linha de aviso
   (lei 15: não vira ação do topo) abre a lista; cada par abre a comparação,
   com a escolha de qual fica e a prévia do que vai junto, antes de juntar.
   Nada é juntado sozinho. Quem junta é a secretaria (service.juntar_fichas,
   0110); "Não são a mesma pessoa" tira o par da lista. */

import { useEffect, useMemo, useState } from "react";
import { avisar } from "../../lib/avisar";
import { plural } from "../../lib/plural";
import { formatarTelefone } from "../../lib/telefone";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { chaveDoPar, paresDuplicados, ROTULO_MOTIVO, type ParDuplicado } from "../../lib/duplicados";
import type { MemberView, MinistryView, PersonView } from "../../ServiceExactApp";
import { Botao } from "../../ui/Botao";
import { Opcao } from "../../ui/Opcao";
import { Janela } from "../../ui/Janela";
import { Linha } from "../../ui/Linha";

export type LinhaDuplicavel = { key: string; name: string; member?: MemberView; person?: PersonView; mins: MinistryView[] };
type Cadastro = LinhaDuplicavel & { chave: string; nome: string; telefones: (string | null | undefined)[]; emails: (string | null | undefined)[] };
type Previa = { escalas: number; times: number; historico: number; cursos: number; conversas: number; grupo: string | null; login_sai: boolean; login_fica: boolean; duas_contas: boolean; erro?: string };

const ERROS: Record<string, string> = {
  nao_pode: "Só quem cuida da secretaria pode juntar cadastros. Peça a quem administra a igreja.",
  invalido: "Um dos cadastros mudou ou saiu enquanto você olhava. Feche e abra de novo.",
  duas_contas: "As duas fichas têm login próprio no app, com contas diferentes. Juntar faria uma delas perder o acesso; por enquanto, deixe as duas.",
};

const comoCadastro = (l: LinhaDuplicavel): Cadastro => ({
  ...l, chave: l.key, nome: l.name,
  telefones: [l.member?.phone, l.person?.phone], emails: [l.member?.email, l.person?.email],
});

/** Linha de aviso no alto da lista, só com par para revisar. */
export function DuplicadosAviso({ linhas, organizationId, onJuntou }: { linhas: LinhaDuplicavel[]; organizationId: string; onJuntou: () => void }) {
  const [dispensados, setDispensados] = useState<Set<string> | null>(null);
  const [aberta, setAberta] = useState(false);
  const [par, setPar] = useState<ParDuplicado<Cadastro> | null>(null);

  useEffect(() => {
    let viva = true;
    void createServiceBrowserClient().schema("service").from("duplicados_dispensados").select("chave_a, chave_b").eq("organization_id", organizationId)
      .then(({ data }) => { if (viva) setDispensados(new Set((data ?? []).map((d) => `${d.chave_a}|${d.chave_b}`))); });
    return () => { viva = false; };
  }, [organizationId]);

  const pares = useMemo(() => (dispensados ? paresDuplicados(linhas.map(comoCadastro), dispensados) : []), [linhas, dispensados]);
  if (!pares.length && !aberta) return null;

  const tirar = (p: ParDuplicado<Cadastro>) => setDispensados((d) => new Set([...(d ?? []), chaveDoPar(p.a.chave, p.b.chave).join("|")]));

  return (
    <>
      {pares.length ? (
        <div className="panel-head dup-aviso" role="status">
          <span className="panel-meta">{`${plural(pares.length, "possível cadastro duplicado", "possíveis cadastros duplicados")}. Você decide se junta.`}</span>
          <Botao variante="texto" onClick={() => setAberta(true)}>Revisar</Botao>
        </div>
      ) : null}
      {aberta && !par ? (
        <Janela larga sobretitulo="Pessoas" titulo="Possíveis duplicados" texto="Mesmo e-mail, mesmo telefone ou nome parecido. Abra um par para comparar." aoFechar={() => setAberta(false)} corpoBloco>
          {pares.length ? pares.map((p) => (
            <Linha key={`${p.a.chave}|${p.b.chave}`} className="dup-linha">
              <div className="mini-main">
                <div className="mini-title">{`${p.a.nome} e ${p.b.nome}`}</div>
                <div className="mini-sub">{ROTULO_MOTIVO[p.motivo]}</div>
              </div>
              <Botao compacto onClick={() => setPar(p)}>Comparar</Botao>
            </Linha>
          )) : <p className="mini-sub">Nenhum par para revisar agora.</p>}
        </Janela>
      ) : null}
      {par ? (
        <CompararPar par={par} organizationId={organizationId} aoFechar={() => setPar(null)}
          aoDispensar={() => { tirar(par); setPar(null); }}
          aoJuntar={() => { tirar(par); setPar(null); onJuntou(); }} />
      ) : null}
    </>
  );
}

/* qual fica por padrão: quem tem login, depois quem tem ficha de membro, depois quem serve em mais times */
const peso = (c: Cadastro) => (c.person?.userId ? 100 : 0) + (c.member ? 10 : 0) + c.mins.length;

function CompararPar({ par, organizationId, aoFechar, aoDispensar, aoJuntar }: { par: ParDuplicado<Cadastro>; organizationId: string; aoFechar: () => void; aoDispensar: () => void; aoJuntar: () => void }) {
  const [ficaA, setFicaA] = useState(peso(par.a) >= peso(par.b));
  const fica = ficaA ? par.a : par.b;
  const sai = ficaA ? par.b : par.a;
  /* a prévia vale para uma escolha só: trocar qual fica mostra "Vendo..." até chegar a nova */
  const [resposta, setResposta] = useState<{ sai: string; previa: Previa | null; erro: string } | null>(null);
  const previa = resposta?.sai === sai.chave ? resposta.previa : null;
  const [ocupada, setOcupada] = useState(false);
  const [erroAcao, setErro] = useState("");
  const erro = erroAcao || (resposta?.sai === sai.chave ? resposta.erro : "");

  useEffect(() => {
    let viva = true;
    void createServiceBrowserClient().schema("service")
      .rpc("juntar_previa", { p_org: organizationId, p_sai_membro: sai.member?.id ?? null, p_sai_pessoa: sai.person?.id ?? null, p_fica_pessoa: fica.person?.id ?? null })
      .then(({ data, error }) => {
        if (!viva) return;
        const d = error ? null : (data as Previa);
        setResposta({ sai: sai.chave, previa: d, erro: error ? "Não deu para ver o que vai junto agora. Confira a internet e tente de novo." : d?.erro ? ERROS[d.erro] ?? "" : "" });
      });
    return () => { viva = false; };
  }, [organizationId, fica.person?.id, sai.chave, sai.member?.id, sai.person?.id]);

  const juntar = async () => {
    setOcupada(true);
    setErro("");
    const { data, error } = await createServiceBrowserClient().schema("service").rpc("juntar_fichas", {
      p_org: organizationId, p_fica_membro: fica.member?.id ?? null, p_fica_pessoa: fica.person?.id ?? null,
      p_sai_membro: sai.member?.id ?? null, p_sai_pessoa: sai.person?.id ?? null,
    });
    setOcupada(false);
    if (error || data !== "ok") { setErro(ERROS[String(data)] ?? "Não deu para juntar agora. Nada mudou; tente de novo."); return; }
    avisar(`Cadastros juntados. Tudo ficou em ${fica.nome}.`);
    aoJuntar();
  };

  const dispensar = async () => {
    setOcupada(true);
    const sb = createServiceBrowserClient();
    const { data: u } = await sb.auth.getUser();
    const [a, b] = chaveDoPar(par.a.chave, par.b.chave);
    const { error } = await sb.schema("service").from("duplicados_dispensados").insert({ organization_id: organizationId, chave_a: a, chave_b: b, por: u.user?.id });
    setOcupada(false);
    if (error) { setErro("Não deu para guardar agora. Tente de novo."); return; }
    avisar("Certo, esse par não aparece mais.");
    aoDispensar();
  };

  const vai = previa && !previa.erro ? [
    previa.escalas ? plural(previa.escalas, "escala") : null,
    previa.times ? plural(previa.times, "time") : null,
    previa.historico ? plural(previa.historico, "fato do histórico", "fatos do histórico") : null,
    previa.cursos ? plural(previa.cursos, "curso") : null,
    previa.conversas ? plural(previa.conversas, "conversa") : null,
    previa.grupo ? `o grupo ${previa.grupo}` : null,
    previa.login_sai ? "o login no app" : null,
  ].filter(Boolean) as string[] : [];
  const lista = vai.length > 1 ? `${vai.slice(0, -1).join(", ")} e ${vai[vai.length - 1]}` : vai[0];

  return (
    <Janela larga sobretitulo="Juntar cadastros" titulo="É a mesma pessoa?" texto={`${ROTULO_MOTIVO[par.motivo][0].toUpperCase()}${ROTULO_MOTIVO[par.motivo].slice(1)}. Escolha qual ficha fica.`}
      aoFechar={aoFechar} ocupada={ocupada} corpoBloco
      rodape={<>
        <Botao onClick={dispensar} desativado={ocupada}>Não são a mesma pessoa</Botao>
        <Botao variante="principal" carregando={ocupada} desativado={!previa || !!previa.erro || previa.duas_contas} onClick={juntar}>Juntar</Botao>
      </>}>
      <div className="dup-comparar" role="radiogroup" aria-label="Qual ficha fica">
        {[par.a, par.b].map((c) => {
          const marcada = c === fica;
          return (
            <Opcao key={c.chave} role="radio" aria-checked={marcada} marcada={marcada} estilo="opt" className="dup-ficha" onClick={() => setFicaA(c === par.a)}>
              <span className="dup-fica">{marcada ? "Fica esta" : "Junta na outra"}</span>
              <span className="dup-nome">{c.nome}</span>
              <span className="dup-dado">{formatarTelefone(c.member?.phone || c.person?.phone || "") || "sem telefone"}</span>
              <span className="dup-dado">{c.member?.email || c.person?.email || "sem e-mail"}</span>
              <span className="dup-dado">{[c.member ? "ficha de membro" : null, c.mins.length ? `serve em ${c.mins.map((m) => m.name).join(", ")}` : null, c.person?.userId ? "tem login no app" : null].filter(Boolean).join(" · ") || "só o nome"}</span>
            </Opcao>
          );
        })}
      </div>
      <p className="dup-previa" aria-live="polite">
        {!previa && !erro ? "Vendo o que vai junto..." : previa && !previa.erro && !previa.duas_contas
          ? `${lista ? `Vão para ${fica.nome}: ${lista}.` : `${sai.nome} não tem escala, time nem histórico.`} O que faltar nela vem da outra ficha, que deixa de existir.`
          : null}
      </p>
      {erro || previa?.duas_contas ? <p className="fs-error" role="alert">{erro || ERROS.duas_contas}</p> : null}
    </Janela>
  );
}
