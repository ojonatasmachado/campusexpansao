"use client";

/* Importar membros por planilha (jornada v7). Quatro etapas na mesma tela de
   formulário: arquivo, colunas, conferir e importar. Grava nas mesmas tabelas
   do "Novo membro" (service.members) e deixa o fato "importado" na linha do
   tempo de cada pessoa nova (lei 10). A leitura e as regras ficam em
   ../../lib/planilha.ts. */

import { useId, useMemo, useRef, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { plural } from "../../lib/plural";
import { baixarCsv } from "../../lib/csv";
import { Icon } from "../../lib/icons";
import { FormScreen, FormSection, type FormScreenHandle } from "../../painel/form/FormScreen";
import { carregarExistentes, gravarImportacao, type ResumoImportacao } from "../../lib/importar-membros";
import {
  CAMPOS, MODELO, camposVazios, conferir, dddMaisComum, lerArquivo, lerLinha, palpiteColunas, telefoneSemDdd,
  type ArquivoLido, type Campo, type Conferida, type Existente, type Mapa,
} from "../../lib/planilha";
import type { ChurchView, MemberView } from "../../ServiceExactApp";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Linha } from "../../ui/Linha";
type Etapa = 1 | 2 | 3 | 4;
const ETAPAS = ["Arquivo", "Colunas", "Conferir", "Importar"] as const;
type Grupo = "nova" | "existe" | "repete" | "erro";
type Filtro = Grupo | "aviso";


function grupoDe(l: Conferida): Grupo {
  if (l.erro) return "erro";
  if (l.repeteLinha !== null) return "repete";
  if (l.existente) return "existe";
  return "nova";
}

function motivoDe(l: Conferida): string {
  if (l.erro) return "Sem nome: não entra. Coloque o nome na planilha e importe de novo.";
  if (l.repeteLinha !== null) return `Repete a linha ${l.repeteLinha} da planilha`;
  if (l.existente) return `${l.existente.pessoa.name} já tem ${l.existente.motivo === "e-mail" ? "o mesmo e-mail" : l.existente.motivo === "telefone" ? "o mesmo telefone" : l.existente.motivo === "nome" ? "o mesmo nome. A linha não tem telefone, e-mail nem nascimento para conferir" : "o mesmo nome e nascimento"}`;
  return l.avisos.length ? l.avisos.join(" · ") : "Pronta para entrar";
}

export function ImportarMembros({ church, members, onClose, onDone }: { church: ChurchView; members: MemberView[]; onClose: () => void; onDone: () => void }) {
  const fid = useId();
  const telaRef = useRef<FormScreenHandle>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState<Etapa>(1);
  const [arquivo, setArquivo] = useState<ArquivoLido | null>(null);
  const [mapa, setMapa] = useState<Mapa>([]);
  const [ddd, setDdd] = useState("");
  const [dupAcao, setDupAcao] = useState<"pular" | "completar">("pular");
  const [existentes, setExistentes] = useState<Existente[] | null>(null);
  const [colunasNovas, setColunasNovas] = useState(true);
  const [filtro, setFiltro] = useState<Filtro | null>(null);
  const [lendo, setLendo] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState("");
  const [progresso, setProgresso] = useState<{ feito: number; total: number } | null>(null);
  const [resumo, setResumo] = useState<ResumoImportacao | null>(null);

  const linhas = useMemo(() => (arquivo ? arquivo.linhas.map((l, i) => lerLinha(l, i + 2, mapa, { ddd })) : []), [arquivo, mapa, ddd]);
  const conferidas = useMemo(() => (existentes ? conferir(linhas, existentes) : []), [linhas, existentes]);
  const grupos = useMemo(() => {
    const g: Record<Grupo, Conferida[]> = { nova: [], existe: [], repete: [], erro: [] };
    for (const l of conferidas) g[grupoDe(l)].push(l);
    return g;
  }, [conferidas]);
  const comAviso = useMemo(() => conferidas.filter((l) => !l.erro && l.avisos.length), [conferidas]);
  const semDdd = useMemo(() => {
    const col = mapa.indexOf("telefone");
    return col < 0 || !arquivo ? 0 : arquivo.linhas.filter((l) => telefoneSemDdd(l[col] ?? "")).length;
  }, [arquivo, mapa]);
  const completaveis = useMemo(
    () => grupos.existe.filter((l) => Object.keys(camposVazios(l.existente!.pessoa, l.valores, colunasNovas)).length > 0),
    [grupos.existe, colunasNovas],
  );
  const vaiImportar = grupos.nova.length;
  const vaiAtualizar = dupAcao === "completar" ? completaveis.length : 0;

  async function escolher(arq: File | undefined) {
    if (!arq) return;
    setErro("");
    setLendo(true);
    try {
      const lido = await lerArquivo(arq);
      const palpite = palpiteColunas(lido.cabecalho);
      setArquivo(lido);
      setMapa(palpite);
      setDdd(dddMaisComum(lido, palpite));
      setExistentes(null);
    } catch (e) {
      setArquivo(null);
      setErro(e instanceof Error ? e.message : "Não conseguimos ler este arquivo.");
    } finally {
      setLendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function trocarCampo(col: number, campo: Campo | "") {
    setMapa((m) => m.map((c, i) => (i === col ? campo : c === campo && campo ? "" : c)));
  }

  async function irParaConferir() {
    setErro("");
    setLendo(true);
    try {
      const r = await carregarExistentes(createServiceBrowserClient().schema("service"), church.organizationId);
      setExistentes(r.lista);
      setColunasNovas(r.colunasNovas);
    } catch {
      /* fora da demonstração, conferir com a lista já carregada deixaria passar duplicados
         (pode estar velha ou incompleta): para e pede para tentar de novo */
      if (church.organizationId !== "org-demo") {
        setErro("Não foi possível conferir quem já está cadastrado. Confira a conexão e tente de novo.");
        setLendo(false);
        return;
      }
      setExistentes(members.map((m) => ({ id: m.id, name: m.name, phone: m.phone, email: m.email, birth: m.birth, neighborhood: m.neighborhood, street: m.street, city: m.city, state: m.state, postal_code: m.postalCode, since_year: m.sinceYear })));
      setColunasNovas(true);
    }
    setFiltro(null);
    setLendo(false);
    setEtapa(3);
  }

  async function importar() {
    if (!arquivo) return;
    setErro("");
    setEtapa(4);
    const completar = dupAcao === "completar" ? completaveis : [];
    const r = await gravarImportacao(createServiceBrowserClient().schema("service"), {
      organizationId: church.organizationId,
      churchId: church.id,
      novas: grupos.nova,
      completar,
      puladas: grupos.repete.length + grupos.existe.length - completar.length,
      comErro: grupos.erro,
      colunasNovas,
      arquivo: arquivo.nome,
      aoAvancar: (feito, total) => setProgresso({ feito, total }),
    });
    setResumo(r);
  }

  /* fechar pelo Concluir ou pelo voltar: com o resumo na tela, a lista de Pessoas atualiza */
  async function concluir() {
    if (telaRef.current) await telaRef.current.fechar();
    else fecharTela();
  }
  const fecharTela = () => { onClose(); if (resumo) onDone(); };

  const nomeMapeado = mapa.includes("nome");
  const importando = etapa === 4 && !resumo;
  const falta: string[] =
    etapa === 1 ? (arquivo ? [] : ["escolher a planilha"])
    : etapa === 2 ? (nomeMapeado ? [] : ["dizer qual coluna tem o nome"])
    : etapa === 3 ? (vaiImportar + vaiAtualizar > 0 ? [] : ["uma pessoa nova ou uma ficha para completar"])
    : [];
  const saveLabel =
    etapa === 3 ? (vaiImportar + vaiAtualizar > 0 ? `Importar ${plural(vaiImportar + vaiAtualizar, "pessoa")}` : "Importar")
    : etapa === 4 ? "Concluir"
    : lendo ? "Lendo…" : "Continuar";
  const onSave = () => {
    if (etapa === 1) setEtapa(2);
    else if (etapa === 2) void irParaConferir();
    else if (etapa === 3) void importar();
    else void concluir();
  };

  const baixarModelo = () => baixarCsv("modelo-membros.csv", MODELO, ";");
  const baixarFalhas = () => resumo && baixarCsv("linhas-que-nao-entraram.csv", [["Linha", "Nome", "Motivo"], ...resumo.falhas.map((f) => [f.n, f.nome, f.motivo])], ";");

  const exemplos = (col: number) => {
    const vals: string[] = [];
    for (const l of arquivo?.linhas ?? []) { if (l[col]) vals.push(l[col]); if (vals.length === 2) break; }
    return vals;
  };

  const LISTA_MAX = 50;
  const filtros: [Filtro, string, number][] = [
    ["nova", "Novas", grupos.nova.length],
    ["existe", "Já cadastradas", grupos.existe.length],
    ["repete", "Repetidas", grupos.repete.length],
    ["erro", "Com erro", grupos.erro.length],
    ["aviso", "Com aviso", comAviso.length],
  ];
  const filtroAtivo: Filtro = filtro ?? (grupos.erro.length ? "erro" : grupos.existe.length ? "existe" : "nova");
  const listaFiltro = filtroAtivo === "aviso" ? comAviso : grupos[filtroAtivo];

  return (
    <FormScreen
      ref={telaRef}
      eyebrow="Pessoas"
      title="Importar planilha"
      saveLabel={saveLabel}
      saving={lendo || importando}
      missing={falta}
      dirty={!!arquivo && etapa < 4}
      error={erro}
      onSave={onSave}
      onClose={fecharTela}
    >
      <ol className="imp-steps" aria-label="Etapas">
        {ETAPAS.map((rotulo, i) => {
          const n = (i + 1) as Etapa;
          const podeVoltar = n < etapa && etapa < 4;
          return (
            <li key={rotulo} className={`imp-step${n === etapa ? " on" : ""}${n < etapa ? " feito" : ""}`} aria-current={n === etapa ? "step" : undefined}>
              {podeVoltar ? (
                <Acao className="imp-step-btn" onClick={() => setEtapa(n)}><span className="imp-step-n">{n}</span>{rotulo}</Acao>
              ) : (
                <span className="imp-step-btn"><span className="imp-step-n">{n}</span>{rotulo}</span>
              )}
            </li>
          );
        })}
      </ol>

      {etapa === 1 ? (
        <FormSection title="Planilha">
          <label
            className={`imp-drop${arrastando ? " on" : ""}`}
            htmlFor={`${fid}-arq`}
            onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastando(false); void escolher(e.dataTransfer.files?.[0]); }}
          >
            <Icon name={arquivo ? "ok" : "documento"} size={22} />
            {arquivo ? (
              <>
                <span className="imp-drop-t">{arquivo.nome}</span>
                <span className="imp-drop-s">{plural(arquivo.linhas.length, "pessoa")} · {plural(arquivo.cabecalho.length, "coluna")}. Toque para trocar o arquivo.</span>
              </>
            ) : (
              <>
                <span className="imp-drop-t">{lendo ? "Lendo a planilha…" : "Escolher planilha"}</span>
                <span className="imp-drop-s">CSV ou Excel (.xlsx), até {plural(5000, "linha")}. Uma pessoa por linha, com os nomes das colunas na primeira.</span>
              </>
            )}
            <input
              ref={inputRef}
              id={`${fid}-arq`}
              className="imp-file"
              type="file"
              accept=".csv,.xlsx,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => void escolher(e.target.files?.[0])}
            />
          </label>
          <div className="imp-modelo">
            <p className="fs-note">Não tem uma planilha pronta? Baixe o modelo, preencha no Excel ou no Google Planilhas e envie aqui.</p>
            <Botao compacto onClick={baixarModelo}><Icon name="baixar" size={14} /> Baixar modelo</Botao>
          </div>
        </FormSection>
      ) : null}

      {etapa === 2 && arquivo ? (
        <FormSection title="O que tem em cada coluna">
          <p className="fs-note imp-intro">Já ligamos as colunas que reconhecemos. Confira e ajuste o que estiver errado. Só o nome é obrigatório.</p>
          <div className="tbl imp-cols">
            {arquivo.cabecalho.map((cab, col) => {
              const ex = exemplos(col);
              return (
                <Linha estilo="tabela" className="imp-col" key={col}>
                  <div className="imp-col-info">
                    <div className="cell-name">{cab}</div>
                    <div className="cell-sub">{ex.length ? ex.join(" · ") : "coluna vazia"}</div>
                  </div>
                  <select
                    className="select"
                    aria-label={`O que tem na coluna ${cab}`}
                    value={mapa[col] ?? ""}
                    onChange={(e) => trocarCampo(col, e.target.value as Campo | "")}
                  >
                    <option value="">Não importar</option>
                    {CAMPOS.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
                  </select>
                </Linha>
              );
            })}
          </div>
          {!nomeMapeado ? <p className="fs-note imp-alerta">Escolha qual coluna tem o nome da pessoa para continuar.</p> : null}
        </FormSection>
      ) : null}

      {etapa === 3 && arquivo ? (
        <>
          <FormSection title="Resultado da conferência">
            <div className="imp-nums">
              <div className="imp-num"><span className="imp-num-v">{grupos.nova.length.toLocaleString("pt-BR")}</span><span className="imp-num-l">{grupos.nova.length === 1 ? "pessoa nova" : "pessoas novas"}</span></div>
              <div className="imp-num"><span className="imp-num-v">{grupos.existe.length.toLocaleString("pt-BR")}</span><span className="imp-num-l">já {grupos.existe.length === 1 ? "cadastrada" : "cadastradas"}</span></div>
              <div className="imp-num"><span className="imp-num-v">{(grupos.erro.length + grupos.repete.length).toLocaleString("pt-BR")}</span><span className="imp-num-l">não {grupos.erro.length + grupos.repete.length === 1 ? "entra" : "entram"}</span></div>
            </div>
            {!colunasNovas && (mapa.includes("sexo") || mapa.includes("estadoCivil")) ? (
              <p className="fs-note imp-alerta">Sexo e estado civil ainda não podem ser gravados nesta versão do banco. O resto entra normalmente.</p>
            ) : null}
          </FormSection>

          {semDdd > 0 ? (
            <FormSection title="Telefones sem DDD">
              <div className="field">
                <label className="field-label" htmlFor={`${fid}-ddd`}>DDD para completar</label>
                <input id={`${fid}-ddd`} className="input imp-ddd" inputMode="numeric" maxLength={2} value={ddd} onChange={(e) => setDdd(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="11" />
                <div className="field-hint">{plural(semDdd, "telefone veio", "telefones vieram")} sem DDD. Usamos este na frente. Deixe vazio para manter como está.</div>
              </div>
            </FormSection>
          ) : null}

          {grupos.existe.length > 0 ? (
            <FormSection title="Quem já está cadastrado">
              <div className="opt-row imp-opts" role="radiogroup" aria-label="O que fazer com quem já está cadastrado">
                <Opcao role="radio" aria-checked={dupAcao === "pular"} marcada={dupAcao === "pular"} estilo="opt" onClick={() => setDupAcao("pular")}>
                  <div className="opt-t">Pular</div>
                  <div className="opt-s">A ficha atual fica como está.</div>
                </Opcao>
                <Opcao role="radio" aria-checked={dupAcao === "completar"} marcada={dupAcao === "completar"} estilo="opt" onClick={() => setDupAcao("completar")}>
                  <div className="opt-t">Completar o que falta</div>
                  <div className="opt-s">{completaveis.length ? `Preenche só campos vazios em ${plural(completaveis.length, "ficha", "fichas")}. Nada é trocado.` : "Nenhuma ficha tem campo vazio que a planilha preencha."}</div>
                </Opcao>
              </div>
            </FormSection>
          ) : null}

          <FormSection title="Linha a linha">
            <div className="fs-chips imp-filtros" role="group" aria-label="Mostrar">
              {filtros.filter(([, , n]) => n > 0).map(([id, rotulo, n]) => (
                <Opcao key={id} marcada={filtroAtivo === id} estilo="seg-chip" aria-pressed={filtroAtivo === id} onClick={() => setFiltro(id)}>
                  {rotulo} <span className="seg-n">{n.toLocaleString("pt-BR")}</span>
                </Opcao>
              ))}
            </div>
            <div className="tbl imp-lista">
              {listaFiltro.slice(0, LISTA_MAX).map((l) => (
                <Linha estilo="tabela" className="imp-linha" key={l.n}>
                  <span className="imp-linha-n">{l.n}</span>
                  <div className="imp-col-info">
                    <div className="cell-name">{l.valores.nome || "Sem nome"}</div>
                    <div className={`cell-sub${l.erro ? " imp-erro" : ""}`}>{filtroAtivo === "aviso" ? l.avisos.join(" · ") : motivoDe(l)}</div>
                  </div>
                </Linha>
              ))}
            </div>
            {listaFiltro.length > LISTA_MAX ? <p className="fs-note">Mostrando {LISTA_MAX} de {listaFiltro.length.toLocaleString("pt-BR")}. O número à esquerda é a linha na planilha.</p> : <p className="fs-note">O número à esquerda é a linha na planilha.</p>}
          </FormSection>
        </>
      ) : null}

      {etapa === 4 ? (
        <FormSection title={resumo ? "Resumo" : "Importando"}>
          {progresso ? (
            <div className="imp-prog" aria-live="polite">
              <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={progresso.total} aria-valuenow={progresso.feito} aria-label="Progresso da importação">
                <div className="bar-fill imp-prog-fill" style={{ width: `${progresso.total ? Math.round((progresso.feito / progresso.total) * 100) : 100}%` }} />
              </div>
              <p className="imp-prog-t">{resumo ? "Importação concluída." : `${progresso.feito.toLocaleString("pt-BR")} de ${plural(progresso.total, "pessoa")}. Não feche esta tela.`}</p>
            </div>
          ) : null}
          {resumo ? (
            <div className="imp-resumo">
              <p className="imp-resumo-t">{[plural(resumo.importados, "importado"), resumo.atualizados ? plural(resumo.atualizados, "atualizado") : "", plural(resumo.pulados, "pulado")].filter(Boolean).join(", ")}.</p>
              {resumo.importados ? <p className="fs-note">Quem entrou já aparece em Pessoas. O convite do app não sai sozinho: envie pela ficha de cada pessoa quando quiser.</p> : null}
              {resumo.semHistorico ? <p className="fs-note imp-alerta">{plural(resumo.semHistorico, "pessoa entrou", "pessoas entraram")}, mas sem o registro &quot;importado&quot; na linha do tempo. As fichas estão certas; só falta esse registro.</p> : null}
              {resumo.falhas.length ? (
                <div className="imp-falhas">
                  <p className="fs-note imp-alerta">{plural(resumo.falhas.length, "linha não entrou", "linhas não entraram")}. Corrija na planilha e importe só elas de novo.</p>
                  <Botao compacto onClick={baixarFalhas}><Icon name="baixar" size={14} /> Baixar a lista</Botao>
                </div>
              ) : null}
            </div>
          ) : null}
        </FormSection>
      ) : null}

      {etapa === 2 || etapa === 3 ? (
        <Botao variante="discreto" compacto className="imp-voltar" onClick={() => setEtapa((etapa - 1) as Etapa)} desativado={lendo}>
          <Icon name="voltar" size={14} /> Voltar para {ETAPAS[etapa - 2].toLowerCase()}
        </Botao>
      ) : null}
    </FormScreen>
  );
}
