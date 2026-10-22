"use client";

/* Secretaria (0078): os quatro livros da igreja e a carteirinha de membro.
   Batismos e Rol nascem dos fatos e das fichas; Casamentos e Apresentações
   são lançados aqui. Filtra por ano, busca, imprime e exporta CSV. */
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { useEffect, useMemo, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { baixarCsv } from "../../lib/csv";
import { formatDateBR, joinDot } from "../../lib/date";
import { Icon } from "../../lib/icons";
import { plural } from "../../lib/plural";
import { rawAccent } from "../../lib/theme";
import { EmptyState, PageHead } from "../../painel/ui";
import type { ChildGuardianView, ChurchView, MemberView, PersonView } from "../../ServiceExactApp";
import { Carteirinha, type Marca } from "./Carteirinha";
import { FolhaDeImpressao, imprimir } from "../../painel/imprimir";
import { LANCA_A_MAO, LIVROS, REGISTRO_COLS, anoDe, anos, colunas, folhaLivro, linhasCsv, livroDe, numeroFmt, registrosDemo, textoBusca, type Livro, type Registro } from "./livros";
import { RegistroForm, type CriancaKids } from "./RegistroForm";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Linha, linhaClasse } from "../../ui/Linha";
import { Selo } from "../../ui/Selo";
import { Segmentado } from "../../ui/Segmentado";
import { Selecao } from "../../ui/Selecao";
const PAGINA = 200;

/** org de demonstração ("org-demo") não é uuid: lê e grava só na memória */
export const ehDemo = (org: string) => !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(org);

async function carregar(churchId: string): Promise<Registro[]> {
  const sb = createServiceBrowserClient().schema("service");
  const out: Registro[] = [];
  /* o PostgREST devolve até 1.000 linhas por vez */
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from("registros").select(REGISTRO_COLS).eq("church_id", churchId).order("numero").range(de, de + 999);
    if (error) throw error;
    out.push(...((data ?? []) as Registro[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export function Secretaria({ church, churches, members, people, kidsChildren, childGuardians, currentPersonId }: {
  church: ChurchView;
  churches: ChurchView[];
  members: MemberView[];
  people: PersonView[];
  kidsChildren: CriancaKids[];
  childGuardians: ChildGuardianView[];
  currentPersonId?: string | null;
}) {
  const { todayISO } = useRelogioDaIgreja();
  const demo = ehDemo(church.organizationId);
  /* a cor da igreja mora na sede (matriz); o logo, na congregação ou na sede */
  const sede = churches.find((c) => c.matriz) ?? church;
  const marca: Marca = { nome: church.nome, logoUrl: church.logoUrl ?? sede.logoUrl, cor: rawAccent(sede.settings?.brandCfg, "light"), cidade: church.cidade };
  const [regs, setRegs] = useState<Registro[] | null>(null);
  const [erro, setErro] = useState(false);
  const [livro, setLivro] = useState<Livro>("batismo");
  const [ano, setAno] = useState<number | "todos">("todos");
  const [q, setQ] = useState("");
  const [mostrar, setMostrar] = useState(PAGINA);
  const [editando, setEditando] = useState<Registro | "novo" | null>(null);
  const [cartao, setCartao] = useState<{ memberId: string | null } | null>(null);

  useEffect(() => {
    let vivo = true;
    if (demo) {
      const pior = new URLSearchParams(window.location.search).get("dados") === "pior";
      // eslint-disable-next-line react-hooks/set-state-in-effect -- demonstração: os registros vêm do endereço da página, lido no navegador
      setRegs(registrosDemo(church.organizationId, church.id, pior));
      return;
    }
    carregar(church.id).then((r) => { if (vivo) setRegs(r); }).catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, [church.id, church.organizationId, demo]);

  const doLivro = useMemo(() => (regs ?? []).filter((r) => r.livro === livro).sort((a, b) => b.numero - a.numero), [regs, livro]);
  const anosDoLivro = useMemo(() => anos(doLivro), [doLivro]);
  const visiveis = useMemo(() => {
    const termo = q.trim().toLocaleLowerCase("pt-BR");
    return doLivro.filter((r) => (ano === "todos" || anoDe(r) === ano) && (!termo || textoBusca(r).includes(termo)));
  }, [doLivro, ano, q]);
  const contagem = (id: Livro) => (regs ?? []).filter((r) => r.livro === id).length;
  const def = livroDe(livro);
  const ativos = livro === "rol" ? doLivro.filter((r) => !r.saida).length : 0;

  const trocarLivro = (id: Livro) => { setLivro(id); setAno("todos"); setMostrar(PAGINA); };
  const salvo = (r: Registro, removido = false) => {
    setRegs((atual) => {
      const sem = (atual ?? []).filter((x) => x.id !== r.id);
      if (removido) return sem;
      /* no demo o banco não numera: o próximo do livro */
      const numero = r.numero || Math.max(0, ...sem.filter((x) => x.livro === r.livro).map((x) => x.numero)) + 1;
      return [...sem, { ...r, numero }];
    });
  };
  const titulo = `${def.rotulo}${ano === "todos" ? "" : ` · ${ano}`}`;
  const arquivo = `${def.rotulo.toLowerCase().replace(/\s+/g, "-")}${ano === "todos" ? "" : `-${ano}`}.csv`;
  const ordemDoPapel = [...visiveis].sort((a, b) => a.numero - b.numero);

  const acao = livro === "rol"
    ? <Botao variante="principal" onClick={() => setCartao({ memberId: null })}>Emitir carteirinha</Botao>
    : LANCA_A_MAO.includes(livro)
      ? <Botao variante="principal" onClick={() => setEditando("novo")}>{livro === "casamento" ? "Registrar casamento" : "Registrar apresentação"}</Botao>
      : undefined;

  return (
    <div className="content wide">
      <PageHead
        title="Secretaria"
        eyebrow="Gestão"
        subtitle={regs ? (livro === "rol" ? `${plural(ativos, "membro ativo", "membros ativos")} no rol` : plural(doLivro.length, "registro")) : undefined}
        help="Os livros da igreja num lugar só. Batismos e Rol de membros se preenchem sozinhos a partir da ficha e da etapa Batismo de cada pessoa, com número de registro em sequência. Casamentos e Apresentações você registra aqui. Livro e folha são opcionais, para quem também mantém o livro de papel."
        action={acao}
      />
      <div className="toolbar">
        <Segmentado className="seg-wrap" role="tablist" aria-label="Livro">
          {LIVROS.map((l) => (
            <Opcao key={l.id} role="tab" aria-selected={livro === l.id} marcada={livro === l.id} onClick={() => trocarLivro(l.id)}>
              {l.rotulo} {regs ? <span className="seg-n">{contagem(l.id)}</span> : null}
            </Opcao>
          ))}
        </Segmentado>
      </div>
      <div className="toolbar sec-filtros">
        <div className="tb-search"><span className="si"><Icon name="buscar" size={13} /></span><input aria-label="Buscar no livro" placeholder="Buscar nome, nº ou oficiante" value={q} onChange={(e) => { setQ(e.target.value); setMostrar(PAGINA); }} /></div>
        <Selecao className="sec-ano" rotulo="Ano" valor={String(ano)} aoMudar={(v) => { setAno(v === "todos" ? "todos" : Number(v)); setMostrar(PAGINA); }}
          opcoes={[{ v: "todos", l: "Todos os anos" }, ...anosDoLivro.map((a) => ({ v: String(a), l: String(a) }))]} />
        <div className="sec-saidas">
          <Botao compacto desativado={!visiveis.length} onClick={() => imprimir("livro", livro === "casamento" || livro === "rol" ? "landscape" : "portrait")}><Icon name="documento" size={14} /> Imprimir</Botao>
          <Botao compacto desativado={!visiveis.length} onClick={() => baixarCsv(arquivo, linhasCsv(livro, ordemDoPapel))}><Icon name="baixar" size={14} /> Baixar CSV</Botao>
        </div>
      </div>

      {erro ? <EmptyState title="Não deu para abrir os livros" text="Confira a conexão e abra a Secretaria de novo. Se continuar, peça a quem cuida das permissões para conferir seu acesso." /> : null}
      {!regs && !erro ? <div className="tbl" aria-busy="true"><Linha estilo="tabela"><span className="cell-sub">Abrindo os livros...</span></Linha></div> : null}

      {regs && !erro ? (
        doLivro.length === 0 ? (
          <EmptyState title={`Nenhum registro em ${def.rotulo}`} text={def.vazio} action={LANCA_A_MAO.includes(livro) ? { label: livro === "casamento" ? "Registrar casamento" : "Registrar apresentação", onClick: () => setEditando("novo") } : undefined} />
        ) : (
          <div className="tbl sec-tbl">
            <Linha estilo="tabela" className={`head sec-tr sec-tr-${livro}`}>
              <span>Registro</span>
              {livro === "batismo" ? <><span>Oficiante</span><span>Local</span></> : null}
              {livro === "casamento" ? <><span>Oficiante</span><span>Testemunhas</span></> : null}
              {livro === "apresentacao" ? <><span>Pais</span><span>Oficiante</span></> : null}
              {livro === "rol" ? <><span>Entrada</span><span>Situação</span></> : null}
            </Linha>
            {visiveis.slice(0, mostrar).map((r) => <LinhaRegistro key={r.id} r={r} onAbrir={() => setEditando(r)} />)}
            {visiveis.length === 0 ? <EmptyState title="Nada encontrado" text="Nenhum registro com essa busca ou nesse ano. Tente limpar a busca ou escolher Todos os anos." /> : null}
            {visiveis.length > mostrar ? (
              <Linha estilo="tabela" className="sec-mais">
                <Botao compacto onClick={() => setMostrar((n) => n + PAGINA)}>Mostrar mais {Math.min(PAGINA, visiveis.length - mostrar)}</Botao>
                <span className="cell-sub">{mostrar} de {plural(visiveis.length, "registro")}</span>
              </Linha>
            ) : null}
          </div>
        )
      ) : null}

      <FolhaDeImpressao folha="livro">
        <header className="sec-papel-head">
          <div>
            <div className="sec-papel-igreja">{church.nome}</div>
            <h1 className="sec-papel-t">Livro de {titulo}</h1>
          </div>
          <div className="sec-papel-meta">{plural(ordemDoPapel.length, "registro")} · impresso em {formatDateBR(todayISO())}</div>
        </header>
        <table className="sec-papel-tbl">
          <thead><tr>{colunas(livro).map((c) => <th key={c.t}>{c.t}</th>)}</tr></thead>
          <tbody>{ordemDoPapel.map((r) => <tr key={r.id}>{colunas(livro).map((c) => <td key={c.t}>{c.v(r)}</td>)}</tr>)}</tbody>
        </table>
      </FolhaDeImpressao>

      {editando ? (
        <RegistroForm
          livro={livro}
          registro={editando === "novo" ? null : editando}
          church={church}
          demo={demo}
          members={members}
          people={people}
          kidsChildren={kidsChildren}
          childGuardians={childGuardians}
          currentPersonId={currentPersonId}
          onSalvo={salvo}
          onCarteirinha={(memberId) => { setEditando(null); setCartao({ memberId }); }}
          onClose={() => setEditando(null)}
        />
      ) : null}
      {cartao ? (
        <Carteirinha
          memberId={cartao.memberId}
          church={church}
          marca={marca}
          demo={demo}
          members={members}
          people={people}
          rol={(regs ?? []).filter((r) => r.livro === "rol")}
          currentPersonId={currentPersonId}
          onClose={() => setCartao(null)}
        />
      ) : null}
    </div>
  );
}

function LinhaRegistro({ r, onAbrir }: { r: Registro; onAbrir: () => void }) {
  const fl = folhaLivro(r);
  const sub = r.livro === "rol" ? fl : joinDot(formatDateBR(r.data), fl);
  const nome = r.livro === "casamento" ? [r.dados.noivo?.nome, r.dados.noiva?.nome].filter(Boolean).join(" e ") || r.nome : r.nome;
  return (
    <Acao className={`${linhaClasse({ estilo: "tabela" })} click sec-tr sec-tr-${r.livro}`} onClick={onAbrir}>
      <div className="sec-reg">
        <span className="sec-num" aria-label={`Registro ${r.numero}`}>{numeroFmt(r.numero)}</span>
        <div className="sec-reg-main"><div className="cell-name">{nome}</div>{sub ? <div className="cell-sub">{sub}</div> : null}</div>
      </div>
      {r.livro === "batismo" ? <><Celula t="Oficiante" v={r.oficiante} /><Celula t="Local" v={r.local} /></> : null}
      {r.livro === "casamento" ? <><Celula t="Oficiante" v={r.oficiante} /><Celula t="Testemunhas" v={(r.dados.testemunhas ?? []).join(", ")} /></> : null}
      {r.livro === "apresentacao" ? <><Celula t="Pais" v={r.dados.pais} /><Celula t="Oficiante" v={r.oficiante} /></> : null}
      {r.livro === "rol" ? (
        <>
          <Celula t="Entrada" v={joinDot(formatDateBR(r.data), r.dados.forma)} />
          <div>{r.saida ? <Selo>Saiu em {formatDateBR(r.saida)}{r.saida_motivo ? ` · ${r.saida_motivo}` : ""}</Selo> : <Selo tom="ok">Ativo</Selo>}</div>
        </>
      ) : null}
    </Acao>
  );
}

/** célula com o rótulo escondido na tabela e visível no celular (onde o cabeçalho some) */
function Celula({ t, v }: { t: string; v?: string | null }) {
  return <div className="sec-cel"><span className="sec-cel-t">{t}</span><span className={v ? "sec-cel-v" : "sec-cel-v vazio"}>{v || "Não informado"}</span></div>;
}
