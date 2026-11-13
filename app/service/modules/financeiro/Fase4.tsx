"use client";

/* Financeiro, fase 4 (0112): importar extrato bancário (.ofx e .csv; .pdf fica
   para depois, pendente decisão sobre biblioteca nova). Mesma forma de tela de
   `ImportarMembros.tsx` (etapas na mesma FormScreen): arquivo, colunas (só
   quando o CSV não dá pra adivinhar sozinho), conferir e importar. A leitura
   fica em ./extrato.ts; o lote grava por service.fin_importar_lote (0112),
   que já ignora o que repete (external_id único por conta). */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FormScreen, FormSection, type FormScreenHandle } from "../../painel/form/FormScreen";
import { friendlyWriteError } from "../../painel/erros";
import { avisar } from "../../lib/avisar";
import { Icon } from "../../lib/icons";
import { decodificarTexto, lerCsv } from "../../lib/planilha";
import { db, type Categoria, type Conta, type Fundo } from "./dados";
import { brl } from "./dinheiro";
import { lerExtratoCsv, lerOfx, palpiteColunasExtrato, type LinhaExtrato, type MapaExtrato, type Tabela } from "./extrato";
import type { Base } from "./Formularios";

import { Botao } from "../../ui/Botao";
import { Etapas } from "../../ui/Etapas";
import { Linha } from "../../ui/Linha";
import { Selecao } from "../../ui/Selecao";

type Etapa = 1 | 2 | 3 | 4;
const ETAPAS = ["Arquivo", "Colunas", "Conferir", "Importar"];

const ARQUIVO_VAZIO = {
  arquivoNome: "", formato: "" as "ofx" | "csv" | "", tabela: null as Tabela | null,
  mapa: { data: -1, valor: -1, descricao: -1 } as MapaExtrato, linhas: [] as LinhaExtrato[], descartadas: 0,
};

export function ImportarExtrato({ org, churchId, contas, categorias, fundos, onClose, onDone }: Base & {
  contas: Conta[];
  categorias: Categoria[];
  fundos: Fundo[];
}) {
  const fid = useId();
  const telaRef = useRef<FormScreenHandle>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contasBanco = useMemo(() => contas.filter((c) => c.active), [contas]);
  const fundosAtivos = useMemo(() => fundos.filter((f) => f.active), [fundos]);

  const [etapa, setEtapa] = useState<Etapa>(1);
  const [conta, setConta] = useState(contasBanco[0]?.id ?? "");
  /* tudo que vem de um arquivo lido mora num objeto só: trocar de arquivo (ou falhar
     ao ler um novo) troca ou limpa tudo de uma vez, nunca deixa pedaço do anterior. */
  const [arq, setArq] = useState(ARQUIVO_VAZIO);
  const [existentes, setExistentes] = useState<Set<string> | null>(null);
  const [categoriaDespesa, setCategoriaDespesa] = useState("");
  const [categoriaEntrada, setCategoriaEntrada] = useState("");
  const [fundo, setFundo] = useState(fundosAtivos.find((f) => f.is_default)?.id ?? fundosAtivos[0]?.id ?? "");
  const [lendo, setLendo] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<{ total: number; gravados: number } | null>(null);

  const { arquivoNome, formato, tabela, mapa, linhas, descartadas } = arq;
  const catsDespesa = categorias.filter((c) => c.kind === "despesa" && c.active);
  const catsEntrada = categorias.filter((c) => c.kind === "entrada" && c.active);
  const temDespesa = linhas.some((l) => l.kind === "despesa");
  const temEntrada = linhas.some((l) => l.kind === "entrada");
  const colunasOk = mapa.data >= 0 && mapa.valor >= 0 && mapa.descricao >= 0;

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro("");
    setLendo(true);
    setArq(ARQUIVO_VAZIO); // começa limpo: nada do arquivo anterior atravessa pra esse
    setExistentes(null);
    try {
      const texto = decodificarTexto(await arquivo.arrayBuffer());
      const nome = arquivo.name.toLowerCase();
      if (nome.endsWith(".ofx")) {
        const { linhas: lidas, descartadas: fora } = lerOfx(texto);
        setArq({ ...ARQUIVO_VAZIO, arquivoNome: arquivo.name, formato: "ofx", linhas: lidas, descartadas: fora });
        setEtapa(3);
      } else if (nome.endsWith(".csv")) {
        const t = lerCsv(texto);
        const m = palpiteColunasExtrato(t.cabecalho);
        if (m.data >= 0 && m.valor >= 0 && m.descricao >= 0) {
          const { linhas: lidas, descartadas: fora } = lerExtratoCsv(t, m);
          setArq({ arquivoNome: arquivo.name, formato: "csv", tabela: t, mapa: m, linhas: lidas, descartadas: fora });
          setEtapa(3);
        } else {
          setArq({ ...ARQUIVO_VAZIO, arquivoNome: arquivo.name, formato: "csv", tabela: t, mapa: m });
          setEtapa(2);
        }
      } else {
        throw new Error("Esse arquivo não é .ofx nem .csv.");
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler esse arquivo.");
    } finally {
      setLendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function aplicarMapa(campo: keyof MapaExtrato, col: number) {
    setArq((a) => ({ ...a, mapa: { ...a.mapa, [campo]: col } }));
    setErro("");
  }

  function irParaConferir() {
    if (!tabela) return;
    try {
      const { linhas: lidas, descartadas: fora } = lerExtratoCsv(tabela, mapa);
      setArq((a) => ({ ...a, linhas: lidas, descartadas: fora }));
      setEtapa(3);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler essa planilha com essas colunas.");
    }
  }

  /* quem já foi importado nessa conta (mesmo external_id): não conta como "novo", e o lote
     ignoraria de qualquer jeito (índice único), mas a pessoa vê antes de confirmar. Some pro
     "carregando" (null) assim que a conta ou a leitura muda, pra nunca mostrar a contagem de
     uma conta ou um arquivo que não são mais os escolhidos. */
  useEffect(() => {
    if (etapa !== 3 || !conta) return;
    let vivo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- conta ou linhas mudaram; a contagem da escolha anterior não vale mais
    setExistentes(null);
    const ids = linhas.map((l) => l.external_id).filter((v): v is string => !!v);
    if (!ids.length) { setExistentes(new Set()); return; }
    db().from("fin_transactions").select("external_id").eq("account_id", conta).in("external_id", ids).then(({ data, error }) => {
      if (!vivo) return;
      if (error) { setErro("Não foi possível conferir o que já tinha sido importado nessa conta. Tente de novo."); setExistentes(new Set()); return; }
      setExistentes(new Set((data ?? []).map((r) => r.external_id as string)));
    });
    return () => { vivo = false; };
  }, [etapa, conta, linhas]);

  const novas = existentes ? linhas.filter((l) => !(l.external_id && existentes.has(l.external_id))) : [];
  const jaImportadas = existentes ? linhas.length - novas.length : 0;

  async function importar() {
    setErro("");
    setSalvando(true);
    const payload = novas.map((l) => ({
      external_id: l.external_id, data: l.data, valor_cents: l.valor_cents, descricao: l.descricao, kind: l.kind,
      category_id: l.kind === "despesa" ? categoriaDespesa : categoriaEntrada, fund_id: fundo,
    }));
    const { data, error } = await db().rpc("fin_importar_lote", {
      p_org: org, p_church: churchId, p_conta: conta, p_formato: formato, p_arquivo: arquivoNome, p_linhas: payload,
    });
    setSalvando(false);
    const linha = data?.[0] as { batch_id: string; imported_rows: number } | undefined;
    if (error || !linha) { setErro(friendlyWriteError(error?.message ?? "Não foi possível importar o extrato.")); return; }
    setResultado({ total: linhas.length, gravados: linha.imported_rows });
    setEtapa(4);
    avisar(`${linha.imported_rows} ${linha.imported_rows === 1 ? "lançamento importado" : "lançamentos importados"}.`);
  }

  async function concluir() {
    if (telaRef.current) await telaRef.current.fechar();
    else fecharTela();
  }
  const fecharTela = () => { onClose(); if (resultado) onDone(); };

  const faltaCategoria = temDespesa && !categoriaDespesa ? "categoria de despesa" : temEntrada && !categoriaEntrada ? "categoria de entrada" : "";
  const falta: string[] =
    etapa === 1 ? [!conta && "a conta do extrato", !arquivoNome && "o arquivo"].filter(Boolean) as string[]
    : etapa === 2 ? (colunasOk ? [] : ["as três colunas (data, valor e descrição)"])
    : etapa === 3 ? [existentes === null && "carregar", !fundo && "o fundo", faltaCategoria, novas.length === 0 && "pelo menos um lançamento novo"].filter((x): x is string => !!x)
    : [];
  const saveLabel =
    etapa === 3 ? (novas.length > 0 ? `Importar ${novas.length} ${novas.length === 1 ? "lançamento" : "lançamentos"}` : "Importar")
    : etapa === 4 ? "Concluir"
    : lendo ? "Lendo…" : "Continuar";
  const onSave = () => {
    if (etapa === 1) { if (formato === "csv") { if (colunasOk) irParaConferir(); else setEtapa(2); } else setEtapa(3); }
    else if (etapa === 2) irParaConferir();
    else if (etapa === 3) void importar();
    else void concluir();
  };
  /* o OFX nunca passa pela etapa de colunas (não tem o que mapear): a faixa de etapas não
     deixa ir lá de propósito, pra não abrir uma tela vazia sem saída. */
  const podeIrPara = (n: number) => !(n === 2 && formato === "ofx");

  return (
    <FormScreen ref={telaRef} eyebrow="Financeiro" title="Importar extrato" saveLabel={saveLabel}
      saving={lendo || salvando} missing={falta} dirty={!!arquivoNome && etapa < 4} error={erro} onSave={onSave} onClose={fecharTela}>
      <Etapas estilo="faixa" rotulo="Etapas" className="imp-etapas"
        aoEscolher={etapa < 4 ? (id) => { const n = Number(id); if (podeIrPara(n)) setEtapa(n as Etapa); } : undefined}
        itens={ETAPAS.map((rotulo, i) => ({ id: String(i + 1), titulo: rotulo, estado: i + 1 < etapa ? "feito" : i + 1 === etapa ? "atual" : "futuro" }))} />

      {etapa === 1 ? (
        <FormSection title="Arquivo">
          <Selecao id={`${fid}-conta`} rotulo="Conta do extrato" valor={conta} aoMudar={setConta}
            opcoes={contasBanco.map((c) => ({ v: c.id, l: c.name }))} vazio={contasBanco.length ? undefined : "Cadastre uma conta primeiro"} />
          <label className={`imp-drop${arrastando ? " on" : ""}`} htmlFor={`${fid}-arq`}
            onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastando(false); void escolher(e.dataTransfer.files?.[0]); }}>
            <Icon name={arquivoNome ? "ok" : "documento"} size={22} />
            {arquivoNome ? (
              <>
                <span className="imp-drop-t">{arquivoNome}</span>
                <span className="imp-drop-s">{linhas.length} lançamento{linhas.length === 1 ? "" : "s"} · {formato.toUpperCase()}. Toque para trocar o arquivo.</span>
              </>
            ) : (
              <>
                <span className="imp-drop-t">{lendo ? "Lendo o arquivo…" : "Escolher extrato"}</span>
                <span className="imp-drop-s">.ofx ou .csv, exportado do banco.</span>
              </>
            )}
            <input ref={inputRef} id={`${fid}-arq`} className="imp-file" type="file" accept=".ofx,.csv,text/csv"
              onChange={(e) => void escolher(e.target.files?.[0])} />
          </label>
        </FormSection>
      ) : null}

      {etapa === 2 && tabela ? (
        <FormSection title="Qual coluna é qual">
          <p className="fs-note imp-intro">Não reconhecemos todas as colunas sozinhos. Escolha qual tem a data, o valor e a descrição.</p>
          <div className="tbl imp-cols">
            {([["data", "Data"], ["valor", "Valor"], ["descricao", "Descrição"]] as const).map(([campo, rotulo]) => (
              <Linha estilo="tabela" className="imp-col" key={campo}>
                <div className="imp-col-info"><div className="cell-name">{rotulo}</div></div>
                <Selecao rotulo={`Coluna da ${rotulo.toLowerCase()}`} valor={String(mapa[campo])}
                  aoMudar={(v) => aplicarMapa(campo, Number(v))} vazio="Escolha a coluna"
                  opcoes={tabela.cabecalho.map((c, i) => ({ v: String(i), l: c }))} />
              </Linha>
            ))}
          </div>
        </FormSection>
      ) : null}

      {etapa === 3 ? (
        <>
          <FormSection title="Resultado da leitura">
            <div className="imp-nums">
              <div className="imp-num"><span className="imp-num-v">{novas.length.toLocaleString("pt-BR")}</span><span className="imp-num-l">{novas.length === 1 ? "lançamento novo" : "lançamentos novos"}</span></div>
              {jaImportadas > 0 && <div className="imp-num"><span className="imp-num-v">{jaImportadas.toLocaleString("pt-BR")}</span><span className="imp-num-l">já importado{jaImportadas === 1 ? "" : "s"}</span></div>}
            </div>
            {existentes === null ? <p className="fs-note">Conferindo o que já foi importado…</p> : null}
            {descartadas > 0 ? <p className="fs-note imp-alerta">{descartadas} linha{descartadas === 1 ? "" : "s"} do arquivo não tinha{descartadas === 1 ? "" : "m"} data e valor que déssemos pra entender (ex.: linha de saldo) e ficaram de fora.</p> : null}
          </FormSection>

          <FormSection title="Categoria e fundo">
            {temDespesa && (
              <Selecao id={`${fid}-cd`} rotulo="Categoria das despesas" valor={categoriaDespesa} aoMudar={setCategoriaDespesa}
                vazio="Escolha" opcoes={catsDespesa.map((c) => ({ v: c.id, l: c.name }))} />
            )}
            {temEntrada && (
              <Selecao id={`${fid}-ce`} rotulo="Categoria das entradas" valor={categoriaEntrada} aoMudar={setCategoriaEntrada}
                vazio="Escolha" opcoes={catsEntrada.map((c) => ({ v: c.id, l: c.name }))} />
            )}
            <Selecao id={`${fid}-f`} rotulo="Fundo" valor={fundo} aoMudar={setFundo} opcoes={fundosAtivos.map((f) => ({ v: f.id, l: f.name }))} />
            <p className="fs-note">Vale para todos os lançamentos deste extrato; edite um lançamento por vez depois, se precisar separar por categoria diferente.</p>
          </FormSection>

          <FormSection title="Lançamentos">
            <div className="tbl imp-lista">
              {linhas.slice(0, 50).map((l) => {
                const jaTem = !!(l.external_id && existentes?.has(l.external_id));
                return (
                  <Linha estilo="tabela" className="imp-linha" key={l.chave}>
                    <span className="fin-data">{l.data.slice(8, 10)}/{l.data.slice(5, 7)}</span>
                    <div className="imp-col-info">
                      <div className="cell-name">{l.descricao || "Sem descrição"}</div>
                      <div className="cell-sub">{jaTem ? "Já importado antes" : l.kind === "despesa" ? "Despesa" : "Entrada"}</div>
                    </div>
                    <span className={`fin-num${l.kind === "despesa" ? " fin-saida" : ""}`}>{brl(l.kind === "despesa" ? -l.valor_cents : l.valor_cents, true)}</span>
                  </Linha>
                );
              })}
            </div>
            {linhas.length > 50 ? <p className="fs-note">Mostrando 50 de {linhas.length.toLocaleString("pt-BR")}.</p> : null}
          </FormSection>
        </>
      ) : null}

      {etapa === 4 ? (
        <FormSection title="Resumo">
          {resultado ? (
            <div className="imp-resumo">
              <p className="imp-resumo-t">{resultado.gravados} de {resultado.total} lançamento{resultado.total === 1 ? "" : "s"} importado{resultado.gravados === 1 ? "" : "s"}.</p>
              {resultado.total - resultado.gravados > 0 ? <p className="fs-note">{resultado.total - resultado.gravados} já tinham sido importados antes e não entraram de novo.</p> : null}
            </div>
          ) : null}
        </FormSection>
      ) : null}

      {etapa === 2 || etapa === 3 ? (
        <Botao variante="discreto" compacto className="imp-voltar" onClick={() => setEtapa((e) => (e === 3 && formato === "ofx" ? 1 : ((e - 1) as Etapa)))} desativado={lendo}>
          <Icon name="voltar" size={14} /> Voltar
        </Botao>
      ) : null}
    </FormScreen>
  );
}
