"use client";

/* Aniversariantes no painel: o bloco da semana no Início e a lista do mês
   (filtro por mês, time e grupo, CSV). Quem não é gestão vê só o seu escopo
   (times e grupos que lidera) e nunca a idade nem o ano de nascimento. O
   parabéns sai pelo WhatsApp da própria pessoa, com um texto curto que ela
   pode mudar antes de abrir. */
import { useState } from "react";
import { baixarCsv } from "../../lib/csv";
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { joinDot } from "../../lib/date";
import { Icon } from "../../lib/icons";
import { useTermos } from "../../lib/vocabulario-context";
import { Av, EmptyState, PageHead } from "../../painel/ui";
import {
  MENSAGEM_PADRAO, MESES, daSemana, doMes, linkWhatsapp, mensagemPara, noEscopo, primeiroNome, quandoE,
  type Aniversariante, type Escopo, type Proximo,
} from "./aniversarios";

import { Botao, botaoClasse } from "../../ui/Botao";
import { Janela } from "../../ui/Janela";
import { Acao } from "../../ui/Acao";
import { Cartao } from "../../ui/Cartao";
import { Linha } from "../../ui/Linha";
import { Campo, TextoLongo } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";
import { useServiceLocale, useTexto } from "../../lib/internacional/contexto";
import type { Text } from "../../lib/internacional/mensagens";
type Abrir = (p: Aniversariante) => void;
type Nomeado = { id: string; name: string };

const diasCurtos = (traduzirUi: Text) => [traduzirUi("dom"), traduzirUi("seg"), traduzirUi("ter"), traduzirUi("qua"), traduzirUi("qui"), traduzirUi("sex"), traduzirUi("sáb")];

/** "24/10 · sáb"; hoje e amanhã pelo nome. */
function diaDoMes(p: Proximo, traduzirUi: Text): string {
  if (p.emDias === 0) return traduzirUi("Hoje");
  if (p.emDias === 1) return traduzirUi("Amanhã");
  const [a, m, d] = p.dia.split("-").map(Number);
  return `${p.dia.slice(8, 10)}/${p.dia.slice(5, 7)} · ${diasCurtos(traduzirUi)[new Date(a, m - 1, d).getDay()]}`;
}

/** Janela do parabéns: texto curto, editável, e o WhatsApp abre com ele pronto. */
function Parabens({ p, onFechar }: { p: Proximo; onFechar: () => void }) {
  const traduzirUi = useTexto();
  const [texto, setTexto] = useState(() => mensagemPara(MENSAGEM_PADRAO, p.nome));
  const link = linkWhatsapp(p.telefone, texto.trim());
  return (
    <Janela titulo={traduzirUi("Parabéns para {nome}", { nome: primeiroNome(p.nome) })} texto={traduzirUi("O WhatsApp abre com a mensagem pronta. Mude o que quiser antes de enviar.")} aoFechar={onFechar} corpoBloco
      rodape={<>
        <Botao variante="discreto" onClick={onFechar}>{traduzirUi("Cancelar")}</Botao>
        {link && texto.trim() ? (
          <a className={botaoClasse({ variante: "principal" })} href={link} target="_blank" rel="noreferrer" onClick={onFechar}><Icon name="whatsapp" size={14} /> {traduzirUi("Abrir no WhatsApp")}</a>
        ) : (
          <Botao variante="principal" desativado>{traduzirUi("Abrir no WhatsApp")}</Botao>
        )}
      </>}>
          <Campo rotulo={traduzirUi("Mensagem")} id="aniv-parabens-msg">
            <TextoLongo rows={4} maxLength={600} value={texto} onChange={(e) => setTexto(e.target.value)} />
          </Campo>
    </Janela>
  );
}

/** Botão de parabéns; sem celular válido no cadastro, diz isso no lugar do botão. */
function BotaoParabens({ p, onClick }: { p: Proximo; onClick: () => void }) {
  const traduzirUi = useTexto();
  if (!linkWhatsapp(p.telefone, "")) return <span className="aniv-semfone">{traduzirUi("Sem celular no cadastro")}</span>;
  return <Botao compacto onClick={onClick}><Icon name="whatsapp" size={14} /> {traduzirUi("Mandar parabéns")}</Botao>;
}

/** Bloco do Início do painel: hoje e os próximos 7 dias. Sem ninguém, não aparece. */
export function AniversariantesDaSemana({ base, escopo, comIdade, onAbrir, onVerMes, podeAbrirPessoa = () => true }: {
  base: Aniversariante[];
  escopo: Escopo;
  comIdade: boolean;
  onAbrir: Abrir;
  podeAbrirPessoa?: (p: Aniversariante) => boolean;
  onVerMes: () => void;
}) {
  const traduzirUi = useTexto();
  const locale = useServiceLocale();
  const { todayISO } = useRelogioDaIgreja();
  const [parabens, setParabens] = useState<Proximo | null>(null);
  const lista = daSemana(noEscopo(base, escopo), todayISO(), comIdade);
  if (lista.length === 0) return null;
  const hoje = lista.filter((p) => p.emDias === 0).length;
  return (
    <Cartao className="aniv">
      <div className="panel-head">
        <span className="panel-title"><Icon name="presente" size={14} /> {traduzirUi("Aniversariantes da semana")}</span>
        <span className="panel-meta">{hoje ? traduzirUi("{hoje} hoje · {count, plural, =1 {# pessoa} other {# pessoas}} em 7 dias", { hoje: String(hoje), count: lista.length }) : traduzirUi("{count, plural, =1 {# pessoa} other {# pessoas}} em 7 dias", { count: lista.length })}</span>
      </div>
      <div className="panel-body flush">
        {lista.slice(0, 8).map((p) => (
          <div className="cuidado-item" key={`${p.tipo}-${p.id}`}>
            {podeAbrirPessoa(p) ? <Acao className="cuidado-nome" onClick={() => onAbrir(p)}>
              <span className="mini-title">{p.nome}</span>
              <span className={`mini-sub${p.emDias === 0 ? " aniv-hoje" : ""}`}>{joinDot(quandoE(p, traduzirUi, locale), p.idade ? traduzirUi("faz {idade} anos", { idade: String(p.idade) }) : null)}</span>
            </Acao> : <div className="cuidado-nome"><div className="mini-title">{p.nome}</div><div className={`mini-sub${p.emDias === 0 ? " aniv-hoje" : ""}`}>{joinDot(quandoE(p, traduzirUi, locale), p.idade ? traduzirUi("faz {idade} anos", { idade: String(p.idade) }) : null)}</div></div>}
            <div className="cuidado-acoes"><BotaoParabens p={p} onClick={() => setParabens(p)} /></div>
          </div>
        ))}
        <div className="aniv-rodape">
          {lista.length > 8 && <span className="mini-sub">{traduzirUi("E mais {count, plural, =1 {# pessoa} other {# pessoas}}.", { count: lista.length - 8 })}</span>}
          <Botao variante="texto" onClick={onVerMes}>{traduzirUi("Ver os aniversariantes do mês")}</Botao>
        </div>
      </div>
      {parabens && <Parabens p={parabens} onFechar={() => setParabens(null)} />}
    </Cartao>
  );
}

/** Tela do mês: filtro por mês, time e grupo; CSV do que está na tela. */
export function Aniversariantes({ base, escopo, comIdade, times, grupos, onAbrir, podeAbrirPessoa = () => true }: {
  base: Aniversariante[];
  escopo: Escopo;
  comIdade: boolean;
  times: Nomeado[];
  grupos: Nomeado[];
  onAbrir: Abrir;
  podeAbrirPessoa?: (p: Aniversariante) => boolean;
}) {
  const traduzirUi = useTexto();
  const { todayISO } = useRelogioDaIgreja();
  const { comTermos: ct } = useTermos();
  const hoje = todayISO();
  const ano = Number(hoje.slice(0, 4));
  const [mes, setMes] = useState(() => Number(hoje.slice(5, 7)));
  const [time, setTime] = useState("");
  const [grupo, setGrupo] = useState("");
  const [parabens, setParabens] = useState<Proximo | null>(null);
  const meus = noEscopo(base, escopo);
  /* o líder só filtra pelo que lidera */
  const timesVisiveis = escopo ? times.filter((t) => escopo.times.includes(t.id)) : times;
  const gruposVisiveis = escopo ? grupos.filter((g) => escopo.grupos.includes(g.id)) : grupos;
  const nomeTime = new Map(times.map((t) => [t.id, t.name]));
  const nomeGrupo = new Map(grupos.map((g) => [g.id, g.name]));
  const lista = doMes(meus, mes, ano, hoje, comIdade)
    .filter((p) => !time || p.times.includes(time))
    .filter((p) => !grupo || p.grupo === grupo);
  const ondeServe = (p: Proximo) => joinDot(...p.times.filter((t) => !escopo || escopo.times.includes(t)).map((t) => nomeTime.get(t)), p.grupo ? nomeGrupo.get(p.grupo) : null);
  const baixar = () => {
    const cab = ["Nome", "Dia", "Celular", "Times", ct("{Grupo}"), ...(comIdade ? ["Idade que completa"] : [])];
    const linhas = lista.map((p) => [p.nome, `${p.dia.slice(8, 10)}/${p.dia.slice(5, 7)}`, p.telefone, p.times.filter((t) => !escopo || escopo.times.includes(t)).map((t) => nomeTime.get(t) ?? "").filter(Boolean).join(", "), p.grupo ? nomeGrupo.get(p.grupo) ?? "" : "", ...(comIdade ? [p.idade ?? ""] : [])]);
    baixarCsv(`aniversariantes-${MESES[mes - 1].toLowerCase()}-${ano}.csv`, [cab, ...linhas]);
  };
  const colunas = comIdade ? "1.5fr 1.4fr 0.5fr 170px" : "1.5fr 1.4fr 170px";
  const semData = base.length === 0;
  return (
    <div className="content wide">
      <PageHead
        title={traduzirUi("Aniversariantes")}
        eyebrow={traduzirUi("Pessoas")}
        subtitle={traduzirUi("{count, plural, =1 {# pessoa} other {# pessoas}} em {mes}", { count: lista.length, mes: MESES[mes - 1].toLowerCase() })}
        help={escopo
          ? traduzirUi("Você vê quem está nos times e grupos que lidera. A data aparece sem o ano, e a idade fica só com a gestão.")
          : traduzirUi("Todo mundo com a data de aniversário no cadastro. A pessoa preenche no app, ou a gestão na ficha dela.")}
        action={lista.length > 0 ? <Botao onClick={baixar}>{traduzirUi("Baixar CSV")}</Botao> : undefined}
      />
      <div className="toolbar aniv-filtros">
        <Campo rotulo={traduzirUi("Mês")} className="aniv-filtro">
          <Selecao valor={String(mes)} aoMudar={(v) => setMes(Number(v))} opcoes={MESES.map((m, i) => ({ v: String(i + 1), l: m }))} />
        </Campo>
        {timesVisiveis.length > 1 && (
          <Campo rotulo={traduzirUi("Time")} className="aniv-filtro">
            <Selecao valor={time} aoMudar={setTime} vazio={traduzirUi("Todos os times")} opcoes={timesVisiveis.map((t) => ({ v: t.id, l: t.name }))} />
          </Campo>
        )}
        {gruposVisiveis.length > 1 && (
          <Campo rotulo={traduzirUi("{Grupo}")} className="aniv-filtro">
            <Selecao valor={grupo} aoMudar={setGrupo} vazio={traduzirUi("Todos os {grupos}")} opcoes={gruposVisiveis.map((g) => ({ v: g.id, l: g.name }))} />
          </Campo>
        )}
      </div>
      <div className="tbl">
        {lista.length > 0 && (
          <Linha estilo="tabela" className="head" style={{ gridTemplateColumns: colunas }}><span>{traduzirUi("Pessoa")}</span><span>{traduzirUi("Times e {grupo}")}</span>{comIdade && <span>{traduzirUi("Idade")}</span>}<span /></Linha>
        )}
        {lista.map((p) => (
          <Linha estilo="tabela" key={`${p.tipo}-${p.id}`} style={{ gridTemplateColumns: colunas }}>
            {podeAbrirPessoa(p) ? <Acao className="cell-person aniv-pessoa" onClick={() => onAbrir(p)}>
              <Av name={p.nome} size="md" />
              <div><div className="cell-name">{p.nome}</div><div className={`cell-sub${p.emDias === 0 ? " aniv-hoje" : ""}`}>{diaDoMes(p, traduzirUi)}</div></div>
            </Acao> : <div className="cell-person aniv-pessoa"><Av name={p.nome} size="md" /><div><div className="cell-name">{p.nome}</div><div className={`cell-sub${p.emDias === 0 ? " aniv-hoje" : ""}`}>{diaDoMes(p, traduzirUi)}</div></div></div>}
            <div className="cell-sub">{ondeServe(p)}</div>
            {comIdade && <div className="cell-sub aniv-idade">{p.idade ? traduzirUi("{idade} anos", { idade: String(p.idade) }) : ""}</div>}
            <div className="aniv-acao"><BotaoParabens p={p} onClick={() => setParabens(p)} /></div>
          </Linha>
        ))}
        {lista.length === 0 && (
          semData
            ? <EmptyState title={traduzirUi("Ninguém com aniversário no cadastro")} text={traduzirUi("A data entra quando a pessoa completa os dados no app ou quando a gestão preenche a ficha.")} />
            : <EmptyState title={traduzirUi("Nenhum aniversário em {mes}", { mes: MESES[mes - 1].toLowerCase() })} text={time || grupo ? traduzirUi("Tente outro mês ou limpe os filtros de time e {grupo}.") : traduzirUi("Tente outro mês.")} />
        )}
      </div>
      {parabens && <Parabens p={parabens} onFechar={() => setParabens(null)} />}
    </div>
  );
}
