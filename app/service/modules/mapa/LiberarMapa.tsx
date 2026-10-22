"use client";

import { useCallback, useEffect, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { avisar } from "../../lib/avisar";
import { Icon } from "../../lib/icons";
import { plural } from "../../lib/plural";
import type { Area } from "./dados";
import type { PessoaLider } from "./contexto";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Campo, Marcar } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";
/* Quem vê o mapa (tela 4 do design). O mapa só aparece no menu de quem o
   pastor liberar (person_grants "mapa"), com a área e o nível de detalhe
   gravados em map_access. Sem áreas desenhadas, a pessoa vê a cidade inteira. */

type Liberacao = { person_id: string; escopo: "cidade" | "area"; area_id: string | null; detalhe: "pessoas" | "numeros"; pode_mesa: boolean; pode_csv: boolean; pode_editar: boolean };
const NOVA = (person_id: string): Liberacao => ({ person_id, escopo: "cidade", area_id: null, detalhe: "pessoas", pode_mesa: true, pode_csv: false, pode_editar: false });
const iniciais = (n: string) => n.split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();

export function LiberarMapa({ org, people, areas, onVoltar }: { org: string; people: PessoaLider[]; areas: Area[]; onVoltar: () => void }) {
  const db = () => createServiceBrowserClient().schema("service");
  const [lista, setLista] = useState<Liberacao[]>([]);
  const [edit, setEdit] = useState<Liberacao | null>(null);
  const [nova, setNova] = useState("");
  const [salvando, setSalvando] = useState(false);
  const nome = (id: string) => people.find((p) => p.id === id)?.name ?? "Pessoa";
  const carregar = useCallback(async () => {
    const { data } = await db().from("map_access").select("person_id, escopo, area_id, detalhe, pode_mesa, pode_csv, pode_editar").eq("organization_id", org);
    setLista((data ?? []) as Liberacao[]);
  }, [org]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga do servidor ao abrir
  useEffect(() => { carregar(); }, [carregar]);

  const resumo = (l: Liberacao) => `${l.escopo === "area" ? areas.find((a) => a.id === l.area_id)?.nome ?? "Uma área" : "Cidade inteira"} · ${l.detalhe === "pessoas" ? "pessoas" : "só números"}`;
  const salvar = async () => {
    if (!edit) return;
    if (edit.escopo === "area" && !edit.area_id) { avisar("Escolha a área.", "warn"); return; }
    setSalvando(true);
    const { data: eu } = await createServiceBrowserClient().auth.getUser();
    const { data: quem } = await db().from("people").select("id").eq("organization_id", org).eq("user_id", eu.user?.id ?? "").maybeSingle();
    const r1 = await db().from("map_access").upsert({ ...edit, organization_id: org, area_id: edit.escopo === "area" ? edit.area_id : null, liberado_por: quem?.id ?? null }, { onConflict: "person_id" });
    const r2 = await db().from("person_grants").upsert({ organization_id: org, person_id: edit.person_id, grant_code: "mapa", granted_by: quem?.id ?? null }, { onConflict: "person_id,grant_code", ignoreDuplicates: true });
    setSalvando(false);
    if (r1.error || r2.error) { avisar("Não foi possível salvar o acesso.", "warn"); return; }
    avisar("Acesso salvo.");
    setEdit(null);
    carregar();
  };
  const tirar = async (personId: string) => {
    const r1 = await db().from("map_access").delete().eq("person_id", personId);
    const r2 = await db().from("person_grants").delete().eq("person_id", personId).eq("grant_code", "mapa");
    if (r1.error || r2.error) { avisar("Não foi possível tirar o acesso.", "warn"); return; }
    avisar("O mapa saiu do menu dessa pessoa.");
    setEdit(null);
    carregar();
  };
  const semAcesso = people.filter((p) => !lista.some((l) => l.person_id === p.id));

  return (
    <div className="content mesa">
      <header className="mesa-cab">
        <div>
          <Botao variante="discreto" compacto onClick={onVoltar}><Icon name="voltar" size={14} />Mapa da igreja</Botao>
          <div className="mp-sobre" style={{ marginTop: 10 }}>Acesso · Mapa da igreja</div>
          <h1 className="mesa-titulo">Quem vê o mapa</h1>
          <p className="mp-texto" style={{ marginTop: 6 }}>O mapa só aparece no menu de quem você liberar. Pastores e quem administra a igreja já veem tudo.</p>
        </div>
      </header>
      <div className="mesa-corpo">
        <section className="mesa-caixa mesa-lado" style={{ padding: 16, gap: 8 }}>
          {lista.length === 0 && <p className="mp-fraco">Ninguém além da liderança principal ainda.</p>}
          {lista.map((l) => (
            <Acao key={l.person_id} className="mp-visao" aria-pressed={edit?.person_id === l.person_id} style={{ display: "flex", gap: 12, alignItems: "center" }} onClick={() => setEdit(l)}>
              <span className="mp-av" style={{ width: 36, height: 36, borderRadius: 18 }}>{iniciais(nome(l.person_id))}</span>
              <span style={{ marginTop: 0 }}><b>{nome(l.person_id)}</b><span>{resumo(l)}</span></span>
            </Acao>
          ))}
          <div style={{ marginTop: 8 }}>
            <Campo rotulo="Liberar para alguém" id="lm-nova">
              <Selecao valor={nova} aoMudar={(v) => { setNova(v); if (v) setEdit(NOVA(v)); }} vazio="Escolher pessoa"
                opcoes={semAcesso.map((p) => ({ v: p.id, l: p.name }))} />
            </Campo>
          </div>
          <p className="mp-fraco">A igreja tem {plural(areas.length, "área desenhada", "áreas desenhadas")}. {areas.length ? "" : "Sem áreas, quem recebe o mapa vê a cidade inteira."}</p>
        </section>

        {edit && (
          <section className="mesa-caixa mesa-principal" style={{ padding: 24, gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span className="mp-av" style={{ width: 48, height: 48, borderRadius: 24, fontSize: "var(--fs-pn-16)" }}>{iniciais(nome(edit.person_id))}</span>
              <h2 className="mp-titulo" style={{ flex: 1 }}>{nome(edit.person_id)}</h2>
            </div>
            <fieldset className="mesa-fs">
              <legend className="mp-pergunta">O que essa pessoa vê</legend>
              <div className="mesa-opcoes">
                <Marcar tipo="radio" className="mp-visao" name="lm-escopo" checked={edit.escopo === "cidade"} onChange={() => setEdit({ ...edit, escopo: "cidade", area_id: null })}><b>A cidade inteira</b><span>Para pastores e coordenação.</span></Marcar>
                <Marcar tipo="radio" className="mp-visao" name="lm-escopo" disabled={!areas.length} checked={edit.escopo === "area"} onChange={() => setEdit({ ...edit, escopo: "area", area_id: areas[0]?.id ?? null })}><b>Uma área</b><span>{areas.length ? "O resto do mapa fica apagado." : "Desenhe uma área no mapa primeiro."}</span>
                  {edit.escopo === "area" && <div style={{ marginTop: 10 }}><Selecao rotulo="Área" valor={edit.area_id ?? ""} aoMudar={(v) => setEdit({ ...edit, area_id: v })} opcoes={areas.map((a) => ({ v: a.id, l: a.nome }))} /></div>}</Marcar>
              </div>
            </fieldset>
            <fieldset className="mesa-fs">
              <legend className="mp-pergunta">Nível de detalhe</legend>
              <div className="mesa-opcoes">
                <Marcar tipo="radio" className="mp-visao" name="lm-det" checked={edit.detalhe === "pessoas"} onChange={() => setEdit({ ...edit, detalhe: "pessoas" })}><b>Pessoas uma a uma</b><span>Ponto no mapa, nome, situação e célula. Nunca o endereço.</span></Marcar>
                <Marcar tipo="radio" className="mp-visao" name="lm-det" checked={edit.detalhe === "numeros"} onChange={() => setEdit({ ...edit, detalhe: "numeros" })}><b>Só números por bairro</b><span>Bairros coloridos e totais, sem nomes.</span></Marcar>
              </div>
            </fieldset>
            <fieldset className="mesa-fs">
              <legend className="mp-pergunta">Também pode</legend>
              <Marcar className="mp-linha" lado="direita" checked={edit.pode_mesa} onChange={(e) => setEdit({ ...edit, pode_mesa: e.target.checked })}>Abrir a mesa de trabalho</Marcar>
              <Marcar className="mp-linha" lado="direita" checked={edit.pode_csv} onChange={(e) => setEdit({ ...edit, pode_csv: e.target.checked })}>Baixar CSV com pessoas</Marcar>
              <Marcar className="mp-linha" lado="direita" checked={edit.pode_editar} onChange={(e) => setEdit({ ...edit, pode_editar: e.target.checked })}>Criar áreas e adicionar pontos</Marcar>
            </fieldset>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              {lista.some((l) => l.person_id === edit.person_id) && <Botao variante="perigo" onClick={() => tirar(edit.person_id)}>Tirar o mapa do menu</Botao>}
              <span style={{ flex: 1 }} />
              <Botao onClick={() => { setEdit(null); setNova(""); }}>Cancelar</Botao>
              <Botao variante="principal" desativado={salvando} onClick={salvar}>Salvar acesso</Botao>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
