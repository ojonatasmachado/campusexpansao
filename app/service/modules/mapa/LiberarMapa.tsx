"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { avisar } from "../../lib/avisar";
import { Icon } from "../../lib/icons";
import type { Area } from "./dados";
import type { PessoaLider } from "./contexto";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Avatar } from "../../ui/Avatar";
import { Campo, Marcar } from "../../ui/Campo";
import { Etiqueta } from "../../ui/Selo";
import { Interruptor } from "../../ui/Interruptor";
import { Linha } from "../../ui/Linha";
import { Selecao } from "../../ui/Selecao";
import { confirmar } from "../../ui/confirmar";

/* Quem vê o mapa (G13, prancha P8). Duas listas: quem o pastor liberou
   (map_access) e os líderes de área, que veem a área deles sem liberação
   (G10, migração 0100). O pastor muda ou tira o acesso de qualquer um; tirar
   de um líder grava 'nenhum', que bloqueia o acesso automático. O menu do
   mapa aparece por person_grants "mapa". */

type Escopo = "cidade" | "area" | "nenhum";
type Liberacao = { person_id: string; escopo: Escopo; area_id: string | null; detalhe: "pessoas" | "numeros"; pode_mesa: boolean; pode_csv: boolean; pode_editar: boolean; created_at?: string };
const NOVA = (person_id: string, area_id: string | null = null): Liberacao => ({ person_id, escopo: area_id ? "area" : "cidade", area_id, detalhe: "pessoas", pode_mesa: true, pode_csv: false, pode_editar: false });
const PERMISSOES: [keyof Pick<Liberacao, "pode_mesa" | "pode_csv" | "pode_editar">, string][] = [
  ["pode_mesa", "Abrir Analisar"],
  ["pode_csv", "Baixar CSV com pessoas"],
  ["pode_editar", "Criar áreas e marcar lugares"],
];

export function LiberarMapa({ org, people, areas, onVoltar }: { org: string; people: PessoaLider[]; areas: Area[]; onVoltar: () => void }) {
  const db = () => createServiceBrowserClient().schema("service");
  const [lista, setLista] = useState<Liberacao[]>([]);
  const [edit, setEdit] = useState<Liberacao | null>(null);
  const [nova, setNova] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [inicial, setInicial] = useState("");
  const nome = (id: string) => people.find((p) => p.id === id)?.name ?? "Pessoa";
  const carregar = useCallback(async () => {
    const { data } = await db().from("map_access").select("person_id, escopo, area_id, detalhe, pode_mesa, pode_csv, pode_editar, created_at").eq("organization_id", org);
    setLista((data ?? []) as Liberacao[]);
  }, [org]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga do servidor ao abrir
  useEffect(() => { carregar(); }, [carregar]);

  /* líderes de área: quem é responsável por ao menos uma área */
  const areasDe = useMemo(() => {
    const m = new Map<string, Area[]>();
    for (const a of areas) if (a.responsavel_id) m.set(a.responsavel_id, [...(m.get(a.responsavel_id) ?? []), a]);
    return m;
  }, [areas]);
  const linhaDe = (id: string) => lista.find((l) => l.person_id === id);
  const liberados = lista.filter((l) => l.escopo !== "nenhum" && !areasDe.has(l.person_id));
  const lideres = [...areasDe.keys()].sort((a, b) => nome(a).localeCompare(nome(b), "pt-BR"));
  const nomeArea = (id: string | null) => areas.find((a) => a.id === id)?.nome ?? "Uma área";

  const resumo = (l: Liberacao) => (l.escopo === "nenhum" ? "Sem acesso" : `${l.escopo === "area" ? nomeArea(l.area_id) : "Cidade inteira"} · ${l.detalhe === "pessoas" ? "pessoas" : "só números"}`);
  const resumoLider = (id: string) => { const l = linhaDe(id); return l ? resumo(l) : `${(areasDe.get(id) ?? []).map((a) => a.nome).join(", ")} · pessoas`; };
  const abrir = (id: string) => { setNova(""); const l = linhaDe(id); const e = l && l.escopo !== "nenhum" ? l : NOVA(id, areasDe.get(id)?.[0]?.id ?? null); setEdit(e); setInicial(JSON.stringify(e)); };
  /* cor da linha do líder: a da área que ele vê de fato (a da liberação, se houver) */
  const corDe = (id: string) => { const l = linhaDe(id); return (l?.escopo === "area" ? areas.find((a) => a.id === l.area_id)?.cor : undefined) ?? areasDe.get(id)?.[0]?.cor ?? "terra"; };

  const salvar = async () => {
    if (!edit) return;
    if (edit.escopo === "area" && !edit.area_id) { avisar("Escolha a área.", "warn"); return; }
    setSalvando(true);
    const { data: eu } = await createServiceBrowserClient().auth.getUser();
    const { data: quem } = await db().from("people").select("id").eq("organization_id", org).eq("user_id", eu.user?.id ?? "").maybeSingle();
    const linha = { person_id: edit.person_id, escopo: edit.escopo, detalhe: edit.detalhe, pode_mesa: edit.pode_mesa, pode_csv: edit.pode_csv, pode_editar: edit.pode_editar };
    const r1 = await db().from("map_access").upsert({ ...linha, organization_id: org, area_id: edit.escopo === "area" ? edit.area_id : null, liberado_por: quem?.id ?? null }, { onConflict: "person_id" });
    const r2 = r1.error ? r1 : await db().from("person_grants").upsert({ organization_id: org, person_id: edit.person_id, grant_code: "mapa", granted_by: quem?.id ?? null }, { onConflict: "person_id,grant_code", ignoreDuplicates: true });
    setSalvando(false);
    if (r1.error || r2.error) { avisar("Não foi possível salvar o acesso. Tente de novo.", "warn"); return; }
    avisar("Acesso salvo.");
    setEdit(null);
    carregar();
  };

  /* tirar: de quem é líder de área grava 'nenhum' (senão o acesso automático volta) */
  const tirar = async (personId: string) => {
    const ok = await confirmar({ titulo: `Tirar o mapa de ${nome(personId)}?`, texto: "O mapa sai do menu dessa pessoa. Dá para liberar de novo depois.", acao: "Tirar o acesso" });
    if (!ok) return;
    const r1 = areasDe.has(personId)
      ? await db().from("map_access").upsert({ person_id: personId, organization_id: org, escopo: "nenhum", area_id: null }, { onConflict: "person_id" })
      : await db().from("map_access").delete().eq("person_id", personId);
    const r2 = r1.error ? r1 : await db().from("person_grants").delete().eq("person_id", personId).eq("grant_code", "mapa");
    if (r1.error || r2.error) { avisar("Não foi possível tirar o acesso. Tente de novo.", "warn"); return; }
    avisar("O mapa saiu do menu dessa pessoa.");
    setEdit(null);
    carregar();
  };

  /* líder com liberação própria: apagar a linha devolve o acesso automático (as áreas dele) */
  const automatico = async (personId: string) => {
    const r1 = await db().from("map_access").delete().eq("person_id", personId);
    const r2 = r1.error ? r1 : await db().from("person_grants").upsert({ organization_id: org, person_id: personId, grant_code: "mapa" }, { onConflict: "person_id,grant_code", ignoreDuplicates: true });
    if (r1.error || r2.error) { avisar("Não foi possível voltar ao acesso automático. Tente de novo.", "warn"); return; }
    avisar("Voltou a ver as áreas que cuida.");
    setEdit(null);
    carregar();
  };

  const semAcesso = people.filter((p) => !lista.some((l) => l.person_id === p.id && l.escopo !== "nenhum") && !areasDe.has(p.id));
  const lider = edit ? areasDe.get(edit.person_id) : undefined;
  const atual = edit ? linhaDe(edit.person_id) : undefined;
  const nomesLider = lider?.map((a) => a.nome).join(", ") ?? "";
  const porque = !edit ? "" : lider
    ? !atual ? `Vê o mapa porque é responsável por ${nomesLider}.`
      : atual.escopo === "nenhum" ? `É responsável por ${nomesLider}, mas o acesso foi tirado.`
      : `Responsável por ${nomesLider}. Liberado pelo pastor: ${resumo(atual)}.`
    : atual ? "Liberado pelo pastor." : "Ainda não vê o mapa.";
  const podeTirar = !!edit && (lider ? atual?.escopo !== "nenhum" : !!atual);
  /* líder no automático: só grava se o pastor mudou algo (senão viraria liberação fixa de uma área só) */
  const semMudanca = !!edit && !!lider && !atual && JSON.stringify(edit) === inicial;
  const podeAutomatico = !!edit && !!lider && !!atual && atual.escopo !== "nenhum";

  return (
    <div className="content mesa mapa-cores">
      <header className="mesa-cab">
        <div>
          <Botao variante="discreto" compacto onClick={onVoltar}><Icon name="voltar" size={14} />Mapa da igreja</Botao>
          <div className="mp-sobre lm-sobre">Acesso ao mapa</div>
          <h1 className="mesa-titulo">Quem vê o mapa</h1>
          <p className="mp-texto lm-intro">Só quem o pastor liberar vê o mapa. Quem é responsável por uma área vê só a dela.</p>
        </div>
      </header>
      <div className="mesa-corpo">
        <section className="mesa-caixa mesa-lado lm-lista">
          <h2 className="lm-grupo">Liberados pelo pastor</h2>
          {liberados.length === 0 && <p className="mp-fraco">Ninguém ainda.</p>}
          {liberados.map((l) => (
            <Acao key={l.person_id} className="mp-visao lm-pessoa" aria-pressed={edit?.person_id === l.person_id} onClick={() => abrir(l.person_id)}>
              <Avatar nome={nome(l.person_id)} tamanho="sm" />
              <span><b>{nome(l.person_id)}</b><span>{resumo(l)}</span></span>
            </Acao>
          ))}
          <h2 className="lm-grupo">Líderes de área</h2>
          {lideres.length === 0 && <p className="mp-fraco">Nenhuma área tem responsável ainda.</p>}
          {lideres.map((id) => (
            <Acao key={id} className="mp-visao lm-pessoa" aria-pressed={edit?.person_id === id} onClick={() => abrir(id)}>
              <Avatar nome={nome(id)} tamanho="sm" />
              <span><b>{nome(id)}</b><span className="lm-area"><span className={`pm-amostra cor-${corDe(id)}`} aria-hidden="true" />{resumoLider(id)}</span></span>
            </Acao>
          ))}
          <div className="lm-nova">
            <Campo rotulo="Liberar para alguém" id="lm-nova">
              <Selecao valor={nova} aoMudar={(v) => { setNova(v); if (v) setEdit(NOVA(v)); }} vazio="Escolher pessoa"
                opcoes={semAcesso.map((p) => ({ v: p.id, l: p.name }))} />
            </Campo>
            <p className="mp-fraco">Pastores e quem administra a igreja já veem tudo e não aparecem aqui.</p>
          </div>
        </section>

        {edit && (
          <section className="mesa-caixa mesa-principal lm-detalhe">
            <div className="lm-quem">
              <Avatar nome={nome(edit.person_id)} tamanho="md" />
              <div>
                <div className="lm-quem-linha">
                  <h2 className="mp-titulo">{nome(edit.person_id)}</h2>
                  {lider ? <Etiqueta destaque>Líder de área</Etiqueta> : atual ? <Etiqueta>Liberado pelo pastor</Etiqueta> : null}
                </div>
                <p className="mp-fraco">{porque}</p>
              </div>
            </div>
            <fieldset className="mesa-fs">
              <legend className="mp-pergunta">O que vê</legend>
              <div className="mesa-opcoes">
                <Marcar tipo="radio" className="mp-visao" name="lm-escopo" checked={edit.escopo === "cidade"} onChange={() => setEdit({ ...edit, escopo: "cidade", area_id: null })}><b>A cidade inteira</b><span>Para pastores e coordenação.</span></Marcar>
                <Marcar tipo="radio" className="mp-visao" name="lm-escopo" disabled={!areas.length} checked={edit.escopo === "area"} onChange={() => setEdit({ ...edit, escopo: "area", area_id: lider?.[0]?.id ?? areas[0]?.id ?? null })}><b>Só uma área</b><span>{areas.length ? "O resto do mapa fica apagado." : "Desenhe uma área no mapa primeiro."}</span>
                  {edit.escopo === "area" && <div className="lm-area-campo"><Selecao rotulo="Área" valor={edit.area_id ?? ""} aoMudar={(v) => setEdit({ ...edit, area_id: v })} opcoes={areas.map((a) => ({ v: a.id, l: a.nome }))} /></div>}</Marcar>
              </div>
            </fieldset>
            <fieldset className="mesa-fs">
              <legend className="mp-pergunta">Nível de detalhe</legend>
              <div className="mesa-opcoes">
                <Marcar tipo="radio" className="mp-visao" name="lm-det" checked={edit.detalhe === "pessoas"} onChange={() => setEdit({ ...edit, detalhe: "pessoas" })}><b>Pessoas uma a uma</b><span>Ponto, nome, situação e grupo. Nunca o endereço.</span></Marcar>
                <Marcar tipo="radio" className="mp-visao" name="lm-det" checked={edit.detalhe === "numeros"} onChange={() => setEdit({ ...edit, detalhe: "numeros" })}><b>Só números por bairro</b><span>Presença e totais, sem nomes.</span></Marcar>
              </div>
            </fieldset>
            <fieldset className="mesa-fs lm-perms">
              <legend className="mp-pergunta">Também pode</legend>
              {PERMISSOES.map(([k, rotulo]) => (
                <Linha key={k} estilo="config">
                  <span id={`lm-${k}`}>{rotulo}</span>
                  <Interruptor rotuloId={`lm-${k}`} ligado={edit[k]} onClick={() => setEdit({ ...edit, [k]: !edit[k] })} />
                </Linha>
              ))}
              <p className="mp-fraco">Escolher o responsável de uma área continua só com o pastor e a administração.</p>
            </fieldset>
            <div className="lm-pe">
              {podeTirar && <Botao variante="perigo" onClick={() => tirar(edit.person_id)}>Tirar o acesso</Botao>}
              {podeAutomatico && <Botao variante="discreto" onClick={() => automatico(edit.person_id)}>Voltar ao automático</Botao>}
              <span className="lm-espaco" />
              <Botao onClick={() => { setEdit(null); setNova(""); }}>Cancelar</Botao>
              <Botao variante="principal" desativado={salvando || semMudanca} onClick={salvar}>{salvando ? "Salvando..." : "Salvar acesso"}</Botao>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
