"use client";

import { telefoneParaWhatsapp } from "../../lib/telefone";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { Icon } from "../../lib/icons";
import { formatDateBR, joinDot, parseISODate } from "../../lib/date";
import AutocadastroPainel from "../../modules/visitantes/AutocadastroPainel";
import { HelpDot } from "../../HelpSystem";
import { Av, EmptyState, MenuMais, PageHead } from "../ui";
import { VISITOR_STAGES, nomeEtapaVisitante, semContato48h, visitantePeloLink } from "../comum";
import { Indicador } from "../../ui/Indicador";
import type { ChurchView, ContatoCfg, DrawerState, ModalState, PersonView, VisitorNoteView, VisitorView } from "../tipos";

import { Botao, botaoClasse } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Cartao } from "../../ui/Cartao";
import { Linha, linhaClasse } from "../../ui/Linha";
import { Selo } from "../../ui/Selo";
import { Segmentado } from "../../ui/Segmentado";
import { Campo, Entrada, TextoLongo } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";
import { Vazio } from "../../ui/Estados";
import { Janela } from "../../ui/Janela";
import { useTexto } from "../../lib/internacional/contexto";
import type { Text } from "../../lib/internacional/mensagens";

/* cor de destaque por tema + quem além do master pode editar, guardado em
   service.churches.settings.brandCfg (mesmo jsonb de sempre). Permite que
   cada igreja pareça uma ferramenta própria dela (logo + nome + cor), não
   um produto genérico CE.X : só "Service" continua sempre visível. */

/* canais gravados em contatoCfg.canal: o valor fica em pt-BR, só o rótulo muda */
const CANAIS = ["WhatsApp", "Ligação", "Mensagem", "Presencial"];
const rotuloCanal = (t: Text, canal: string) => ({ WhatsApp: "WhatsApp", "Ligação": t("Ligação"), Mensagem: t("Mensagem"), Presencial: t("Presencial") } as Record<string, string>)[canal] ?? canal;

export const CONTATO_CFG_DEFAULT: ContatoCfg = {
  prazoHoras: 48,
  canal: "WhatsApp",
  metaIntegracaoDias: 90,
  mensagem: "Oi {nome}! Que alegria ter você com a gente no {evento}. Somos a {igreja} e queremos te conhecer melhor. Posso te ajudar com algo essa semana?",
  abordagem: "Acolher sem pressão. Ouvir a história, oferecer oração e convidar para um Grupo de Comunhão. Sem cobrança, só cuidado genuíno.",
};

/* cartão do visitante no funil (S37): dias desde a visita, alerta de 48h sem
   contato, WhatsApp e registrar contato; a origem aparece uma vez só */
export function VisitanteCard({ visitor, notes, onOpen }: { visitor: VisitorView; notes: VisitorNoteView[]; onOpen: () => void }) {
  const traduzirUi = useTexto();

  const visita = parseISODate(visitor.visited_on);
  // eslint-disable-next-line react-hooks/purity -- dias desde a visita precisam do relógio real
  const dias = visita ? Math.max(0, Math.floor((Date.now() - visita.getTime()) / 86400000)) : null;
  const alerta = semContato48h(visitor, notes);
  const fone = telefoneParaWhatsapp(visitor.phone);
  return (
    <div className={`vcard${alerta ? " vcard-alerta" : ""}`}>
      <Acao className="vcard-open" onClick={onOpen}>
        <div className="vcard-top">
          <Av name={visitor.name} size="sm" />
          <div style={{ minWidth: 0 }}>
            <div className="vcard-name">{visitor.name}</div>
            <div className="vcard-when">{joinDot(dias === null ? null : dias === 0 ? traduzirUi("visitou hoje") : traduzirUi("há {count, plural, =1 {# dia} other {# dias}}", { count: dias }), visitor.origin)}</div>
          </div>
        </div>
        {alerta && <div className="vcard-alert"><Icon name="alerta" size={14} /> {traduzirUi("Sem contato há mais de 48h")}</div>}
        {!alerta && visitor.reply_status && <div className="vcard-foot">{visitor.reply_status === "respondeu" ? <span className="vcard-resp">{traduzirUi("respondeu")}</span> : <span className="vcard-noresp">{traduzirUi("sem resposta")}</span>}</div>}
      </Acao>
      <div className="vcard-acts">
        {fone && <a className={botaoClasse({ compacto: true })} href={`https://wa.me/${fone}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={14} /> WhatsApp</a>}
        <Botao compacto onClick={onOpen} aria-label={traduzirUi("Registrar contato com {nome}", { nome: visitor.name })}>{traduzirUi("Registrar")}</Botao>
      </div>
    </div>
  );
}

export function Visitantes({
  visitors,
  visitorNotes,
  people,
  church,
  setDrawer,
  setModal,
  filtroInicial = null,
  onLimparFiltro,
}: {
  visitors: VisitorView[];
  visitorNotes: VisitorNoteView[];
  people: PersonView[];
  church?: ChurchView;
  setDrawer: (drawer: DrawerState) => void;
  setModal: (modal: ModalState) => void;
  filtroInicial?: "sem-contato" | "pelo-link" | null;
  onLimparFiltro?: () => void;
}) {
  const traduzirUi = useTexto();

  const router = useRouter();
  const [view, setView] = useState<"pipe" | "list" | "painel" | "regras">(filtroInicial ? "list" : "pipe");
  const [filtro, setFiltro] = useState<"sem-contato" | "pelo-link" | null>(filtroInicial);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const cc: ContatoCfg = { ...CONTATO_CFG_DEFAULT, ...(church?.settings?.contatoCfg ?? {}) };
  const personById = new Map(people.map((person) => [person.id, person]));
  const lista = filtro === "sem-contato" ? visitors.filter((visitor) => semContato48h(visitor, visitorNotes))
    : filtro === "pelo-link" ? visitors.filter((visitor) => visitantePeloLink(visitor, visitorNotes)) : visitors;
  const contacted = lista.filter((visitor) => visitor.reply_status);
  const answered = lista.filter((visitor) => visitor.reply_status === "respondeu");
  const members = lista.filter((visitor) => visitor.stage === "membro");
  const replyRate = contacted.length ? Math.round((answered.length / contacted.length) * 100) : 0;
  const integrationRate = lista.length ? Math.round((members.length / lista.length) * 100) : 0;
  const byService = lista.reduce<Record<string, number>>((acc, visitor) => {
    const key = visitor.visited_on ? formatDateBR(visitor.visited_on) : "Sem registro";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const maxService = Math.max(...Object.values(byService), 1);

  return (
    <div className="content wide">
      <PageHead
        title={traduzirUi("Visitantes")}
        eyebrow={traduzirUi("Pessoas")}
        subtitle={traduzirUi("{count, plural, =1 {# visitante} other {# visitantes}}", { count: lista.length })}
        help={traduzirUi("Quem visitou pela primeira vez. Cada visitante tem um próximo passo e o histórico de contato; acompanhe pelas etapas do funil até virar membro.")}
        action={<><MenuMais rotulo={traduzirUi("Mais opções")} acoes={[
          { rotulo: traduzirUi("Indicadores de visitantes"), onClick: () => setView("painel") },
          { rotulo: traduzirUi("Regras de acolhimento"), onClick: () => setView("regras") },
          ...(church ? [{ rotulo: traduzirUi("QR e link de visita"), onClick: () => setQrOpen(true) }] : []),
        ]} /><Botao variante="principal" onClick={() => setModal({ eyebrow: traduzirUi("Criar"), title: traduzirUi("Novo visitante"), subtitle: traduzirUi("Quem chegou pela primeira vez. Entra no acompanhamento automaticamente."), saveLabel: traduzirUi("Registrar visitante"), formFields: [{ k:"nome", label:traduzirUi("Nome"), type:"text", req:true, ph:traduzirUi("Quem visitou") }, { k:"tel", label:traduzirUi("Telefone"), type:"text", half:true, ph:"(11) 9..." }, { k:"origem", label:traduzirUi("Como chegou"), type:"select", half:true, options:[{v:"Convite de membro",l:traduzirUi("Convite de membro")},{v:"Instagram",l:"Instagram"},{v:"Indicação",l:traduzirUi("Indicação")},{v:"Evangelismo",l:traduzirUi("Evangelismo")},{v:"Tomou decisão no culto",l:traduzirUi("Tomou decisão no culto")},{v:"Passava na rua",l:traduzirUi("Passava na rua")}] }], action: { kind: "visitor" } })}>{traduzirUi("Registrar visitante")}</Botao></>}
      />
      {filtro && <div className="panel-head" role="status"><span className="panel-meta">{traduzirUi("Filtro: {filtro}", { filtro: filtro === "sem-contato" ? traduzirUi("visitantes sem contato há mais de 48h") : traduzirUi("cadastros recebidos pelo link, aguardando contato") })}</span><Botao variante="texto" onClick={() => { setFiltro(null); onLimparFiltro?.(); }}>{traduzirUi("Limpar filtro")}</Botao></div>}
      <div className="toolbar">
        <Segmentado role="group" aria-label={traduzirUi("Acompanhamento de visitantes")}>
          <Opcao marcada={view === "pipe"} aria-pressed={view === "pipe"} onClick={() => setView("pipe")}>{traduzirUi("Funil")}</Opcao>
          <Opcao marcada={view === "list"} aria-pressed={view === "list"} onClick={() => setView("list")}>{traduzirUi("Lista")}</Opcao>
        </Segmentado>
        {(view === "painel" || view === "regras") && <span className="panel-meta">{view === "painel" ? traduzirUi("Indicadores de visitantes") : traduzirUi("Regras de acolhimento")}</span>}
      </div>
      {view === "regras" && (
        <>
          <div className="contato-banner">
            <div className="contato-pill"><span className="contato-pill-n">{cc.prazoHoras}h</span><span>{traduzirUi("1º contato")}</span></div>
            <div className="contato-main"><div className="contato-t">{traduzirUi.rich("Primeiro contato em até <em>{horas}h</em> por <em>{canal}</em> · meta de integração: <em>{dias} dias</em>", { horas: String(cc.prazoHoras), canal: rotuloCanal(traduzirUi, cc.canal), dias: String(cc.metaIntegracaoDias), em: (c) => <em>{c}</em> })}</div><div className="contato-s">{cc.abordagem}</div></div>
            <Botao compacto onClick={() => setCfgOpen(true)}>{traduzirUi("Ajustar")}</Botao>
          </div>
          <p className="ph-sub" style={{ marginTop: 10 }}>{traduzirUi("Os visitantes sem nenhum contato registrado depois desse prazo aparecem com alerta no funil, no Início e no menu.")}</p>
        </>
      )}
      {qrOpen && church && <AutocadastroPainel church={church} people={people} onClose={() => setQrOpen(false)} onRefresh={() => router.refresh()} />}
      {cfgOpen && church && <ContatoCfgModal church={church} cfg={cc} onClose={() => setCfgOpen(false)} onRefresh={() => router.refresh()} />}

      {view === "regras" ? null : view === "painel" ? (
        <div className="vpanel">
          <div className="kpi-row"><Indicador icone="visitante" rotulo={traduzirUi("Visitantes")} valor={lista.length} rodape={traduzirUi("no acompanhamento")} ajuda={traduzirUi("Todo mundo que visitou e ainda está sendo acompanhado, antes de virar membro.")} /><Indicador icone="comunicacao" rotulo={traduzirUi("Respondem o contato")} valor={contacted.length ? `${replyRate}%` : traduzirUi("Sem dados")} rodape={traduzirUi("{n} de {total} contatados", { n: String(answered.length), total: String(contacted.length) })} ajuda={traduzirUi("De quem a equipe já contatou, quantos responderam de volta.")} /><Indicador icone="ok" rotulo={traduzirUi("Integram (viram membro)")} valor={lista.length ? `${integrationRate}%` : traduzirUi("Sem dados")} rodape={traduzirUi("{n} de {total} · {integrando} em integração", { n: String(members.length), total: String(lista.length), integrando: String(lista.filter((v) => v.stage === "integrando" || v.stage === "membro").length) })} ajuda={traduzirUi("De todos os visitantes, quantos completaram o caminho até virar membro.")} /><Indicador icone="alerta" rotulo={traduzirUi("Sem resposta")} valor={lista.filter((visitor) => visitor.reply_status === "sem_resposta").length} rodape={traduzirUi("precisam de novo contato")} tom="pendente" ajuda={traduzirUi("Visitantes contatados que ainda não responderam. Vale tentar de novo.")} /></div>
          <div className="vpanel-grid">
            <Cartao><div className="panel-head"><span className="panel-title"><Icon name="cultos" size={14} /> {traduzirUi("Visitantes por culto")} <HelpDot text={traduzirUi("Em qual culto os visitantes mais chegam.")} /></span></div><div className="panel-body flush">{Object.entries(byService).map(([name, count]) => <div className="dist-row" key={name}><span className="dist-name">{name === "Sem registro" ? traduzirUi("Sem registro") : name}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(count / maxService) * 100}%` }} /></div><span className="dist-num">{count}</span></div>)}{visitors.length === 0 ? <Vazio titulo={traduzirUi("Nenhum visitante ainda.")} /> : null}</div></Cartao>
            <Cartao>
              <div className="panel-head"><span className="panel-title"><Icon name="comunicacao" size={14} /> {traduzirUi("Resposta ao 1º contato")} <HelpDot text={traduzirUi("Quantos visitantes já responderam o primeiro contato da equipe.")} /></span></div>
              <div className="panel-body">
                {(() => {
                  const semResposta = visitors.filter((v) => v.reply_status === "sem_resposta");
                  const naoContatados = visitors.filter((v) => !v.reply_status);
                  return (
                    <>
                      <div className="resp-split">
                        {answered.length > 0 && <div className="resp-seg respondeu" style={{ flex: answered.length }} title={traduzirUi("Responderam")} />}
                        {semResposta.length > 0 && <div className="resp-seg sem" style={{ flex: semResposta.length }} title={traduzirUi("Sem resposta")} />}
                        {naoContatados.length > 0 && <div className="resp-seg nao" style={{ flex: naoContatados.length }} title={traduzirUi("Ainda não contatados")} />}
                      </div>
                      <div className="resp-legend">
                        <span><i className="resp-dot respondeu" /> {traduzirUi("{n} responderam", { n: String(answered.length) })}</span>
                        <span><i className="resp-dot sem" /> {traduzirUi("{n} sem resposta", { n: String(semResposta.length) })}</span>
                        <span><i className="resp-dot nao" /> {traduzirUi("{n} a contatar", { n: String(naoContatados.length) })}</span>
                      </div>
                      <div className="dsec-title" style={{ margin: "18px 0 8px" }}>{traduzirUi("Não responderam · refazer contato")}</div>
                      {semResposta.length === 0 && <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>{traduzirUi("Ninguém sem resposta.")}</div>}
                      {semResposta.map((visitor) => {
                        const owner = visitor.responsible_id ? personById.get(visitor.responsible_id) : null;
                        return (
                          <Acao className="flag-row click" key={visitor.id} style={{ cursor: "pointer" }} onClick={() => setDrawer({ kind: "visitor", id: visitor.id })}>
                            <Av name={visitor.name} size="sm" />
                            <div className="flag-main"><div className="flag-nome">{visitor.name}</div><div className="flag-meta">{formatDateBR(visitor.visited_on) || traduzirUi("sem data")} · {owner ? traduzirUi("resp. {nome}", { nome: owner.name.split(" ")[0] }) : traduzirUi("sem dono")}</div></div>
                            <span className="vcard-noresp" style={{ marginLeft: "auto" }}>{traduzirUi("sem resposta")}</span>
                          </Acao>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </Cartao>
          </div>
        </div>
      ) : lista.length === 0 ? (
        filtro ? <EmptyState title={traduzirUi("Nenhum visitante neste filtro")} text={traduzirUi("O filtro foi mantido para você revisar a lista. Limpe o filtro para ver todos os visitantes.")} /> : <EmptyState title={traduzirUi("A primeira visita começa o acompanhamento")} text={traduzirUi("Use Registrar visitante para cadastrar quem chegou. Em Mais opções, você encontra o QR e o link para a própria pessoa preencher.")} />
      ) : view === "pipe" ? (
        <div className="pipe">
          {VISITOR_STAGES.map((stage) => {
            const items = lista.filter((visitor) => visitor.stage === stage.id);
            return <div className={`pipe-col${items.length ? "" : " vazia"}`} key={stage.id}><div className="pipe-head"><span className="pipe-dot" style={{ background: stage.color }} /><span className="pipe-name">{nomeEtapaVisitante(stage.name, traduzirUi)}</span><span className="pipe-num">{items.length}</span></div><div className="pipe-body">{items.map((visitor) => <VisitanteCard key={visitor.id} visitor={visitor} notes={visitorNotes} onOpen={() => setDrawer({ kind: "visitor", id: visitor.id })} />)}{items.length === 0 ? <Vazio titulo={traduzirUi("vazio")} /> : null}</div></div>;
          })}
        </div>
      ) : (
        <div className="tbl">
          <Linha estilo="tabela" className="head" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 120px" }}><span>{traduzirUi("Visitante")}</span><span>{traduzirUi("Etapa")}</span><span>{traduzirUi("Como chegou")}</span><span>{traduzirUi("Próximo passo")}</span><span>{traduzirUi("Visitou")}</span></Linha>
          {lista.map((visitor) => { const stage = VISITOR_STAGES.find((s) => s.id === visitor.stage); return <Acao className={`${linhaClasse({ estilo: "tabela" })} click`} key={visitor.id} style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 120px" }} onClick={() => setDrawer({ kind: "visitor", id: visitor.id })}><div className="cell-person"><Av name={visitor.name} size="md" /><div><div className="cell-name">{visitor.name}</div><div className="cell-sub">{visitor.phone}</div></div></div><div><Selo style={{ color: stage?.color, borderColor: "var(--border-2)" }}>{(stage ? nomeEtapaVisitante(stage.name, traduzirUi) : visitor.stage)}</Selo></div><div className="cell-sub">{visitor.origin || traduzirUi("Visitante")}</div><div><span className={`vcard-due ${visitor.due_status || "ok"}`}>{visitor.due || traduzirUi("sem prazo")}</span></div><div className="mini-right">{formatDateBR(visitor.visited_on) || traduzirUi("sem data")}</div></Acao>; })}
        </div>
      )}
    </div>
  );
}

export function ContatoCfgModal({ church, cfg, onClose, onRefresh }: { church: ChurchView; cfg: ContatoCfg; onClose: () => void; onRefresh: () => void }) {
  const traduzirUi = useTexto();

  const fid = useId();
  const [erro, setErro] = useState("");
  const [prazoHoras, setPrazoHoras] = useState(cfg.prazoHoras);
  const [canal, setCanal] = useState(cfg.canal);
  const [metaIntegracaoDias, setMetaIntegracaoDias] = useState(cfg.metaIntegracaoDias);
  const [mensagem, setMensagem] = useState(cfg.mensagem);
  const [abordagem, setAbordagem] = useState(cfg.abordagem);
  const [saving, setSaving] = useState(false);

  const valoresValidos = Number.isInteger(prazoHoras) && prazoHoras > 0 && Number.isInteger(metaIntegracaoDias) && metaIntegracaoDias > 0;
  const salvar = async () => {
    if (saving || !valoresValidos) return;
    setErro("");
    setSaving(true);
    const next: ContatoCfg = { prazoHoras, canal, metaIntegracaoDias, mensagem, abordagem };
    try {
      const result = await createServiceBrowserClient().schema("service").from("churches").update({ settings: { ...church.settings, contatoCfg: next } }).eq("id", church.id).select("id");
      if (result.error || !result.data?.length) { setErro(traduzirUi("Não conseguimos salvar as regras. Verifique seu acesso e tente novamente.")); return; }
      onRefresh();
      onClose();
    } catch { setErro(traduzirUi("Não conseguimos salvar agora. Tente novamente.")); }
    finally { setSaving(false); }
  };

  return (
    <Janela larga sobretitulo={traduzirUi("Líder da integração")} titulo={traduzirUi("Como acolhemos quem chega")} texto={traduzirUi("Defina o prazo e a abordagem do primeiro contato. Fica claro para a equipe e deixa visível quanto tempo leva para integrar.")} aoFechar={onClose} ocupada={saving} corpoBloco
      rodape={<>
        <Botao desativado={saving} onClick={onClose}>{traduzirUi("Cancelar")}</Botao>
        <Botao variante="principal" desativado={saving || !valoresValidos} onClick={salvar}>{saving ? traduzirUi("Salvando...") : traduzirUi("Salvar")}</Botao>
      </>}>
      <Campo rotulo={traduzirUi("Prazo do 1º contato (horas)")} className="field-half"><Entrada id={`${fid}-prazo`} type="number" min={1} step={1} value={prazoHoras} onChange={(e) => setPrazoHoras(+e.target.value)} /></Campo>
      <Campo rotulo={traduzirUi("Canal")} className="field-half">
        <Selecao id={`${fid}-canal`} valor={canal} aoMudar={setCanal} opcoes={CANAIS.map((o) => ({ v: o, l: rotuloCanal(traduzirUi, o) }))} />
      </Campo>
      <Campo rotulo={traduzirUi("Meta de integração (dias)")} className="field-half"><Entrada id={`${fid}-meta`} type="number" min={1} step={1} value={metaIntegracaoDias} onChange={(e) => setMetaIntegracaoDias(+e.target.value)} /></Campo>
      <Campo rotulo={traduzirUi("Mensagem padrão")} ajuda={traduzirUi("Use {nome}, {evento} e {igreja}: preenchemos automaticamente.", { nome: "{nome}", evento: "{evento}", igreja: "{igreja}" })}>
        <TextoLongo id={`${fid}-mensagem`} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
      </Campo>
      <Campo rotulo={traduzirUi("Abordagem / postura")}><TextoLongo id={`${fid}-abordagem`} value={abordagem} onChange={(e) => setAbordagem(e.target.value)} /></Campo>
      {!valoresValidos && <p className="fs-error" role="alert">{traduzirUi("Informe horas e dias como números inteiros maiores que zero.")}</p>}
      {erro && <p className="fs-error" role="alert">{erro}</p>}
    </Janela>
  );
}
