"use client";

import { pendenciasDeCobertura } from "../../modules/escalas/pendencias";
import { plural } from "../../lib/plural";
import { nomeComparavel } from "../../lib/pessoas";
import { useState } from "react";
import { Icon } from "../../lib/icons";
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { formatDateBR } from "../../lib/date";
import type { EnqueteElegivelView } from "../../lib/enquetes";
import type { PesquisaElegivelView } from "../../lib/pesquisas";
import { textoBuscavel, TERMOS } from "../../lib/vocabulario";
import { useTermos } from "../../lib/vocabulario-context";
import { HelpDot, SetupChecklist, type SetupCounts } from "../../HelpSystem";
import { PedidosCaminhada } from "../../modules/pessoas/PedidosCaminhada";
import { semanaDe } from "../../lib/contexto-dia";
import { type Ausente } from "../../modules/cuidado/cuidado";
import type { CriancaAusente } from "../../modules/cuidado/Cuidado";
import { usePedidosConta } from "../../modules/entrada/usePedidosConta";
import { NovosCadastros } from "../../modules/entrada/NovosCadastros";
import { numerosDaBase, type DadosSaude } from "../../modules/inicio/saude";
import { linhaDoSetup, type SetupEstado } from "../../modules/configuracao/setup";
import { termosDaRota } from "../../modules/registry";
import { REACOES_PESQUISA, ROUTES, semContato48h, visitantePeloLink } from "../comum";
import { Indicador } from "../../ui/Indicador";
import type { AnnouncementView, ChildView, DecisionView, DrawerState, EnrollmentView, EventAttendanceView, EventView, FieldDef, JourneyChangeRequestView, KidsAttendanceView, KidsClassView, MemberView, MinistryView, ModalState, PersonView, RosterAssignmentView, TimelineEventView, VisitorNoteView, VisitorView } from "../tipos";

import { Acao } from "../../ui/Acao";
import { Cartao } from "../../ui/Cartao";
import { Linha, linhaClasse } from "../../ui/Linha";
import { Gaveta } from "../../ui/Janela";
import { ListaDeCuidado } from "../../modules/cuidado/Cuidado";
export function GlobalSearch({
  people,
  members,
  ministries,
  setRoute,
  setDrawer,
  telas = [],
}: {
  people: PersonView[];
  members: MemberView[];
  ministries: MinistryView[];
  setRoute: (route: keyof typeof ROUTES) => void;
  setDrawer: (drawer: DrawerState) => void;
  /* telas do menu que a pessoa vê: a busca acha pelo nome e pelos termos
     (nome interno e nome que a igreja deu, lei 7) */
  telas?: { id: string; label: string; icon: string; grupo: string }[];
}) {
  const { vocab, comTermos: ct } = useTermos();
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const termSemAcento = nomeComparavel(query);
  const results = term
    ? [
        ...telas
          .filter((tela) => {
            const nomes = [textoBuscavel(tela.label, vocab), ...termosDaRota(tela.id).flatMap((t) => [TERMOS[t].tela, vocab[t].tela, vocab[t].curto])];
            return nomes.some((n) => nomeComparavel(n).includes(termSemAcento));
          })
          .slice(0, 4)
          .map((tela) => ({
            key: `tela-${tela.id}`,
            type: "Tela",
            icon: tela.icon,
            name: ct(tela.label),
            sub: tela.grupo,
            action: () => setRoute(tela.id as keyof typeof ROUTES),
          })),
        ...members
          .filter((member) => member.name.toLowerCase().includes(term))
          .slice(0, 4)
          .map((member) => ({
            key: `member-${member.id}`,
            type: "Membro",
            icon: "membros",
            name: member.name,
            sub: member.situation,
            action: () => {
              setRoute("membros");
              setDrawer({ kind: "member", id: member.id });
            },
          })),
        ...people
          .filter((person) => person.name.toLowerCase().includes(term))
          .slice(0, 4)
          .map((person) => ({
            key: `person-${person.id}`,
            type: ct("{Voluntario}"),
            icon: "pessoa",
            name: person.name,
            sub: person.tags.join(" · ") || person.status,
            action: () => {
              setRoute("pessoas");
              setDrawer({ kind: "person", id: person.id });
            },
          })),
        ...ministries
          .filter((ministry) => ministry.name.toLowerCase().includes(term))
          .slice(0, 4)
          .map((ministry) => ({
            key: `ministry-${ministry.id}`,
            type: "Time",
            icon: "times",
            name: ministry.name,
            sub: plural(ministry.people.length, ct("{voluntario}")),
            action: () => {
              setRoute("times");
              setDrawer({ kind: "ministry", id: ministry.id });
            },
          })),
        ...(() => {
          const funcoes = new Map<string, MinistryView[]>();
          ministries.forEach((ministry) => {
            ministry.positions.forEach((position) => {
              if (!position.name.toLowerCase().includes(term)) return;
              const times = funcoes.get(position.name) ?? [];
              if (!times.some((m) => m.id === ministry.id)) times.push(ministry);
              funcoes.set(position.name, times);
            });
          });
          return Array.from(funcoes.entries()).slice(0, 6).map(([name, times]) => ({
            key: `func-${name}`,
            type: "Função",
            icon: "escalas",
            name,
            sub: times.map((m) => m.name.split(" ")[0]).join(", "),
            action: () => {
              setRoute("times");
              setDrawer({ kind: "ministry", id: times[0].id });
            },
          }));
        })(),
      ]
    : [];

  return (
    <>
      <input
        placeholder={ct("Buscar tela, membro, {voluntario}, time ou função...")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && results[0]) {
            results[0].action();
            setQuery("");
          }
          if (event.key === "Escape") setQuery("");
        }}
      />
      {term ? (
        <div className="gsearch-pop">
          {results.length === 0 ? <div className="gsearch-empty">Nada encontrado para &quot;{query}&quot;.</div> : null}
          {results.map((result) => (
            <Acao
              className="gsearch-row"
              key={result.key}
             
              onMouseDown={(event) => {
                event.preventDefault();
                result.action();
                setQuery("");
              }}
            >
              <span className="gsearch-ic"><Icon name={result.icon} size={15} /></span>
              <span className="gsearch-main"><span className="gsearch-nome">{result.name}</span><span className="gsearch-sub">{result.sub}</span></span>
              <span className="gsearch-tag">{result.type}</span>
            </Acao>
          ))}
        </div>
      ) : null}
    </>
  );
}

export const REACOES_ENQUETE = ["Ótimo", "Bom", "Neutro", "Ruim", "Péssimo"];

export function buildAvaliacaoModal(enquete: EnqueteElegivelView): NonNullable<ModalState> {
  const formFields: FieldDef[] = enquete.perguntas.map((p) => {
    if (p.tipo === "texto") return { k: p.id, label: p.texto, type: "area", req: true, ph: "Escreva aqui..." };
    if (p.tipo === "nota") {
      const max = p.escala ?? 10;
      const options = Array.from({ length: max + 1 }, (_, i) => ({ v: String(i), l: String(i) }));
      return { k: p.id, label: p.texto, type: "select", req: true, ph: "Escolha uma nota", options };
    }
    if (p.tipo === "emoji") return { k: p.id, label: p.texto, type: "select", req: true, ph: "Escolha uma reação", options: REACOES_ENQUETE.map((r) => ({ v: r, l: r })) };
    if (p.tipo === "simnao") return { k: p.id, label: p.texto, type: "select", req: true, ph: "Escolha uma opção", options: [{ v: "Sim", l: "Sim" }, { v: "Não", l: "Não" }] };
    return { k: p.id, label: p.texto, type: "select", req: true, ph: "Escolha uma opção", options: (p.opcoes ?? []).map((o) => ({ v: o, l: o })) };
  });
  return {
    eyebrow: "Avaliação de experiência",
    title: enquete.nome,
    subtitle: "Leva menos de um minuto. Ajuda sua liderança a cuidar melhor do time.",
    saveLabel: "Enviar",
    formFields,
    action: { kind: "avaliacaoResposta", enquete },
  };
}

export function buildPesquisaModal(pesquisa: PesquisaElegivelView): NonNullable<ModalState> {
  const formFields: FieldDef[] = pesquisa.perguntas.map((p) => {
    const valorAnterior = pesquisa.respostasAnteriores[p.id];
    if (p.tipo === "texto") return { k: p.id, label: p.texto, type: "area", req: p.obrigatoria, ph: "Escreva aqui...", value: valorAnterior };
    if (p.tipo === "nota") {
      const max = p.escala ?? 5;
      const options = Array.from({ length: max + 1 }, (_, i) => ({ v: String(i), l: String(i) }));
      return { k: p.id, label: p.texto, type: "select", req: p.obrigatoria, ph: "Escolha uma nota", options, value: valorAnterior };
    }
    if (p.tipo === "emoji") return { k: p.id, label: p.texto, type: "select", req: p.obrigatoria, ph: "Escolha uma reação", options: REACOES_PESQUISA.map((r) => ({ v: r, l: r })), value: valorAnterior };
    if (p.tipo === "simnao") return { k: p.id, label: p.texto, type: "select", req: p.obrigatoria, ph: "Escolha uma opção", options: [{ v: "Sim", l: "Sim" }, { v: "Não", l: "Não" }], value: valorAnterior };
    return { k: p.id, label: p.texto, type: "select", req: p.obrigatoria, ph: "Escolha uma opção", options: (p.opcoes ?? []).map((o) => ({ v: o, l: o })), value: valorAnterior };
  });
  return {
    eyebrow: pesquisa.pendente ? "Pesquisa da igreja" : "Sua resposta",
    title: pesquisa.nome,
    subtitle: pesquisa.pendente ? "Leva menos de um minuto. Ajuda sua liderança a cuidar melhor do time." : "Você já respondeu. Pode rever ou atualizar quando quiser, principalmente se algo mudou.",
    saveLabel: pesquisa.pendente ? "Enviar" : "Atualizar resposta",
    formFields,
    action: { kind: "pesquisaResposta", pesquisa },
  };
}

export function Painel({
  people,
  members,
  userName,
  visitantesSemContato,
  visitantesPeloLink,
  visitors = [],
  visitorNotes = [],
  events,
  journeyRequests,
  enqueteElegivel,
  pesquisaElegivel,
  onApproveJourney,
  onRejectJourney,
  setRoute,
  abrirDiretorio,
  podeAbrir = () => true,
  modulosPendencias,
  setDrawer,
  setModal,
  setupCounts,
  roster,
  ministries,
  scopeMinistryIds,
  currentRole = "membro",
  cuidado = null,
  setup = null,
  igrejaNova = false,
}: {
  people: PersonView[];
  members: MemberView[];
  activePeople: number;
  userName?: string;
  visitantesSemContato: number;
  /* chegaram pelo QR/link e ainda ninguém falou com eles (antes das 48h) */
  visitantesPeloLink: number;
  novosNoMes: number;
  gaps: Array<{ event: EventView; ministry: MinistryView; position: { id: string; name: string } }>;
  events: EventView[];
  visitorsInCare: number;
  announcements: AnnouncementView[];
  eventAttendance: EventAttendanceView[];
  journeyRequests: JourneyChangeRequestView[];
  kidsClasses: KidsClassView[];
  kidsChildren: ChildView[];
  kidsAttendance: KidsAttendanceView[];
  enqueteElegivel: EnqueteElegivelView | null;
  pesquisaElegivel: PesquisaElegivelView | null;
  onApproveJourney: (request: JourneyChangeRequestView) => void | Promise<void>;
  onRejectJourney: (request: JourneyChangeRequestView) => void | Promise<void>;
  setRoute: (route: keyof typeof ROUTES) => void;
  abrirDiretorio: (route: "visitantes" | "membros" | "pessoas", filtro?: "sem-contato" | "pelo-link" | "em-grupos" | "servindo" | "membros") => void;
  podeAbrir?: (route: keyof typeof ROUTES) => boolean;
  modulosPendencias: Set<string>;
  setDrawer: (drawer: DrawerState) => void;
  setModal: (modal: ModalState) => void;
  setCheckinEventId: (id: string | null) => void;
  setupCounts: SetupCounts;
  roster: RosterAssignmentView[];
  ministries: MinistryView[];
  scopeMinistryIds: string[] | null;
  onAbrirVagas: (eventId: string, timeId?: string) => void;
  currentRole?: "master" | "pastor" | "lider" | "membro";
  visitors?: VisitorView[];
  visitorNotes?: VisitorNoteView[];
  decisions?: DecisionView[];
  timelineEvents?: TimelineEventView[];
  enrollments?: EnrollmentView[];
  /* lista de cuidado (v7 4.17): a de quem olha e a da igreja toda (para a Saúde) */
  cuidado?: { lista: Ausente[]; todos: Ausente[]; criancas: CriancaAusente[] | null; semanas: number } | null;
  /* aniversariantes da semana (módulo aniversarios), já no escopo de quem olha */
  aniversarios?: React.ReactNode;
  /* configuração guiada (v7 4.12): "Sua igreja: fase 2 de 3" no lugar do checklist */
  setup?: SetupEstado | null;
  /* sem times ou sem cultos: a configuração guiada aparece no Início */
  igrejaNova?: boolean;
}) {
  const { aindaVaiAcontecer, saudacao, todayISO, fuso } = useRelogioDaIgreja();
  const { comTermos: ct } = useTermos();
  const gestao = currentRole === "master" || currentRole === "pastor";
  const pedidosConta = usePedidosConta(gestao);
  const [pedidosAbertos, setPedidosAbertos] = useState(false);
  const [jornadaAberta, setJornadaAberta] = useState(false);
  const [cuidadoAberto, setCuidadoAberto] = useState<"adultos" | "criancas" | null>(null);
  const [coberturaAberta, setCoberturaAberta] = useState(false);
  const [pedidosResolvidos, setPedidosResolvidos] = useState<{ origem: JourneyChangeRequestView[]; ids: Set<string> } | null>(null);
  // A atualização local só vale até chegarem novas props da fonte existente.
  const pedidosJornada = pedidosResolvidos?.origem === journeyRequests
    ? journeyRequests.filter((pedido) => pedido.status === "pendente" && !pedidosResolvidos.ids.has(pedido.id))
    : journeyRequests.filter((pedido) => pedido.status === "pendente");
  const resolverPedido = async (pedido: JourneyChangeRequestView, decidir: (request: JourneyChangeRequestView) => void | Promise<void>) => {
    await decidir(pedido);
    setPedidosResolvidos((anteriores) => ({
      origem: journeyRequests,
      ids: new Set(anteriores?.origem === journeyRequests ? anteriores.ids : []).add(pedido.id),
    }));
  };
  const liderDeTime = !!scopeMinistryIds;
  const semProgramacao = !events.some((e) => aindaVaiAcontecer(e.eventDate, e.time, e.timeZone));
  const ativando = gestao && semProgramacao;
  const primeiraProgramacao = events.length === 0;
  const emPreparacao = gestao && setup && !setup.concluido && (igrejaNova || semProgramacao || setup.fase > 1 || setup.feitas.length > 0 || setup.pulou || !!setup.primeiroEventoId);
  const faltas = modulosPendencias.has("escalas") && podeAbrir("escalas")
    ? pendenciasDeCobertura(events, roster, ministries, scopeMinistryIds, fuso)
    : [];
  return (
    <div className="content wide painel-inicio">
      <div className="ph">
        <div>
          <h1 className="ph-title">{saudacao()}, {userName?.split(" ")[0] ?? "liderança"} <HelpDot text={ct("Seu resumo da semana: próximos {cultos}, vagas em aberto na escala e o que precisa da sua atenção agora.")} /></h1>
          <p className="ph-sub">{semanaDe(todayISO())}.</p>
        </div>
        {/* v7 I1: ações do topo removidas (Lei 15). A fila já contém a ação principal. */}
      </div>
      {ativando && (
        <section className="service-start-guide" aria-labelledby="service-start-title">
          <div className="ph-eyebrow">{primeiraProgramacao ? "Primeiros passos" : "Fila de ações"}</div>
          <h2 id="service-start-title">{primeiraProgramacao ? "Comece por aqui" : "Precisa de você"}</h2>
          <p>{primeiraProgramacao ? "Sua igreja ainda não tem programação. Siga os passos abaixo para começar." : "Tudo o que pede atenção agora aparece nesta fila. Resolva na ordem; cada linha leva direto à tela que resolve."}</p>
          {primeiraProgramacao && (
            <ol>
              <li><b>Identifique sua igreja</b><span>Nome, endereço e a identidade que as pessoas vão reconhecer.</span></li>
              <li><b>Prepare o encontro</b><span>Uma data e um lugar antes de organizar toda a equipe.</span></li>
              <li><b>Convide quem vai ajudar</b><span>Depois, acompanhe os acessos e as respostas.</span></li>
            </ol>
          )}
        </section>
      )}
      {/* E3: pendências do módulo Escalas, por prazo; uma linha por culto,
         até três prazos à vista e uma entrada para a lista completa. O detalhe vive no Panorama. */}
      {(() => {
        const filas: Array<{ key: string; t: string; s: string; go: string; action: () => void }> = [];
        for (const { conteudo: { evento, resumo } } of faltas.slice(0, 3)) {
          filas.push({
            key: `cobertura-${evento.id}`,
            t: `${evento.name} · ${formatDateBR(evento.eventDate)}`,
            s: ` · ${resumo}`,
            go: "Ver panorama →",
            action: () => setDrawer({ kind: "event", id: evento.id, tab: "panorama" }),
          });
        }
        if (!liderDeTime && podeAbrir("visitantes") && visitantesSemContato > 0) {
          filas.push({ key: "visitantes-contato", t: visitantesSemContato === 1 ? "1 visitante sem contato" : `${visitantesSemContato} visitantes sem contato`, s: " · há mais de 48h", go: "Ver →", action: () => { const alvos = (visitors ?? []).filter((v) => semContato48h(v, visitorNotes)); if (alvos.length === 1) { setRoute("visitantes"); setDrawer({ kind: "visitor", id: alvos[0].id }); } else abrirDiretorio("visitantes", "sem-contato"); } });
        }
        if (!liderDeTime && podeAbrir("visitantes") && visitantesPeloLink > 0) {
          filas.push({ key: "visitantes-link", t: `${plural(visitantesPeloLink, "visitante")} ${visitantesPeloLink === 1 ? "se cadastrou" : "se cadastraram"} pelo link`, s: " · esperando o 1º contato", go: "Ver →", action: () => { const alvos = (visitors ?? []).filter((v) => visitantePeloLink(v, visitorNotes)); if (alvos.length === 1) { setRoute("visitantes"); setDrawer({ kind: "visitor", id: alvos[0].id }); } else abrirDiretorio("visitantes", "pelo-link"); } });
        }
        if (pedidosJornada.length > 0) {
          filas.push({ key: "jornada", t: ct(`${plural(pedidosJornada.length, "pedido", "pedidos")} na {caminhada}`), s: " · esperando aprovação", go: "Revisar →", action: () => setJornadaAberta(true) });
        }
        if (gestao && (pedidosConta.estado !== "pronto" || pedidosConta.pedidos.length > 0)) {
          const total = pedidosConta.pedidos.length;
          const titulo = pedidosConta.estado === "carregando" ? "Carregando pedidos de conta"
            : pedidosConta.estado === "erro" ? "Não conseguimos carregar os pedidos de conta"
            : `${plural(total, "pedido", "pedidos")} de conta ${total === 1 ? "pendente" : "pendentes"}`;
          filas.push({ key: "novos-cadastros", t: titulo, s: pedidosConta.estado === "pronto" ? " · aguardando aprovação" : "", go: "Revisar →", action: () => setPedidosAbertos(true) });
        }
        if (!liderDeTime && cuidado && cuidado.lista.length > 0) {
          filas.push({ key: "cuidado", t: `${plural(cuidado.lista.length, "pessoa")} sem registro`, s: ` · há ${plural(cuidado.semanas, "semana")} ou mais`, go: "Ver →", action: () => setCuidadoAberto("adultos") });
        }
        if (!liderDeTime && cuidado && (cuidado.criancas?.length ?? 0) > 0) {
          filas.push({ key: "kids-sumindo", t: `${plural(cuidado.criancas!.length, "criança")} sem check-in`, s: " · vale um contato", go: "Ver →", action: () => setCuidadoAberto("criancas") });
        }
        if (faltas.length > 3) {
          filas.push({
            key: "cobertura-todos",
            t: `${ct("Ver todos os {cultos} com falta")} (${plural(faltas.length, ct("{culto}"))})`,
            s: "",
            go: "→",
            action: () => setCoberturaAberta(true),
          });
        }
        if (filas.length > 0) {
          return (
            <>
              <h2 className="painel-sec-t">{liderDeTime ? "Para resolver no seu time" : "Para resolver"}</h2>
              <div className="agora-list">
                {filas.map((f) => (
                  <Acao className={linhaClasse({})} key={f.key} onClick={f.action}>
                    <div className="mini-main">
                      <div className="mini-title">{f.t}</div>
                      {f.s && <div className="mini-sub">{f.s.replace(/^ · /, "")}</div>}
                    </div>
                    <span className="text-pn-14">{f.go}</span>
                  </Acao>
                ))}
              </div>
            </>
          );
        }
        if (ativando) return null;
        return (
          <>
            <h2 className="painel-sec-t">Para resolver</h2>
            <div className="agora-list"><Linha><div className="mini-main"><div className="mini-title">Tudo em dia</div><div className="mini-sub">Nenhuma pendência agora.</div></div></Linha></div>
          </>
        );
      })()}
      {gestao && pedidosAbertos && <NovosCadastros dados={pedidosConta} aoFechar={() => setPedidosAbertos(false)} />}
      {/* v7 I1: Saúde-resumo — 3 números de base via numerosDaBase() (mesma fonte de Relatórios). Indicador cartao, prancha 2. */}
      {gestao && !ativando && (() => {
        const dadosSaude: DadosSaude = { membros: members, pessoas: people, times: ministries, visitantes: [], decisoes: [], fatos: [], matriculas: [] };
        const base = numerosDaBase(dadosSaude);
        return (
          <div className="kpi-row">
            {base.map((n) => (
              <Indicador key={n.id} estilo="cartao" icone={n.id === "membros" ? "membros" : n.id === "servindo" ? "escalas" : "grupos"} valor={n.valor} rotulo={ct(n.rotulo)} aoAbrir={() => abrirDiretorio(n.id === "servindo" ? "pessoas" : "membros", n.id === "servindo" ? "servindo" : n.id === "grupos" ? "em-grupos" : "membros")} rotuloAcao={`${ct(n.rotulo)}: ${n.valor}. Ver a lista`} />
            ))}
          </div>
        );
      })()}
      {podeAbrir("configurar") && (emPreparacao ? (
        <Acao className="setup-banner" onClick={() => setRoute("configurar")}>
          <span className="setup-banner-t">{linhaDoSetup(setup)}</span>
          <span className="agora-go">{setup.feitas.length || setup.pulou ? "Continuar →" : "Começar →"}</span>
        </Acao>
      ) : (
        gestao && ["configurar", "times", "cultos", "membros"].every((r) => podeAbrir(r as keyof typeof ROUTES)) ? <details className="service-preparacao"><summary>Revisar preparação da igreja</summary><SetupChecklist counts={setupCounts} setRoute={(r) => setRoute(r as keyof typeof ROUTES)} /></details> : null
      ))}
      {/* v7 I1: KPI row removido (lei 14). Voluntários/confirmação/visitantes repetiam a fila e o saúde-resumo; agora vivem só em Relatórios. */}
      {/* v7 I1: blocos "Pendências da escala" e "Próximos cultos" removidos.
          Vagas e cobertura vivem agora apenas na fila "Para resolver" (Lei 14).
          Próximos cultos sem pendência não aparecem no Início; a tela dona é Cultos. */}
      <div className="flex-col gap-md">
          {enqueteElegivel && (
            <Cartao className="cursor-pointer" onClick={() => setModal(buildAvaliacaoModal(enqueteElegivel))}>
              <div className="panel-head"><span className="panel-title"><Icon name="estrela" size={14} /> Avaliação de experiência</span></div>
              <div className="panel-body">
                <div className="text-pn-14 text-semibold text-white mb-xs">{enqueteElegivel.nome}</div>
                <div className="text-pn-13 text-muted">Leva menos de um minuto. Ajuda sua liderança a cuidar melhor do time.</div>
              </div>
            </Cartao>
          )}
          {pesquisaElegivel && (
            <Cartao className="cursor-pointer" onClick={() => setModal(buildPesquisaModal(pesquisaElegivel))}>
              <div className="panel-head"><span className="panel-title"><Icon name="reacao" size={14} /> {pesquisaElegivel.pendente ? "Pulso da escala" : "Sua última resposta"}</span></div>
              <div className="panel-body">
                <div className="text-pn-14 text-semibold text-white mb-xs">{pesquisaElegivel.nome}</div>
                <div className="text-pn-13 text-muted">{pesquisaElegivel.pendente ? "Leva menos de um minuto. Conta como foi pra você." : "Já respondida. Toque pra rever ou atualizar quando quiser."}</div>
              </div>
            </Cartao>
          )}
      </div>
      {jornadaAberta && (
        <PedidosCaminhada
          pedidos={pedidosJornada}
          members={members}
          onApproveJourney={(pedido) => resolverPedido(pedido, onApproveJourney)}
          onRejectJourney={(pedido) => resolverPedido(pedido, onRejectJourney)}
          aoFechar={() => setJornadaAberta(false)}
        />
      )}
      {cuidadoAberto && cuidado && <Gaveta larga rotulo={cuidadoAberto === "adultos" ? "Pessoas sem registro" : "Crianças sem check-in"} aoFechar={() => setCuidadoAberto(null)}>
        <ListaDeCuidado lista={cuidado.lista} criancas={cuidado.criancas} semanas={cuidado.semanas} visaoInicial={cuidadoAberto} onAbrir={(ausente) => { setCuidadoAberto(null); setRoute(ausente.memberId ? "membros" : "pessoas"); setDrawer(ausente.memberId ? { kind: "member", id: ausente.memberId } : { kind: "person", id: ausente.personId }); }} />
      </Gaveta>}
      {coberturaAberta && <Gaveta larga rotulo={ct("{Cultos} com vaga aberta")} aoFechar={() => setCoberturaAberta(false)}>
        <div className="panel-head"><span className="panel-title">{ct("{Cultos} com vaga aberta")}</span></div>
        <div className="panel-body flush">{faltas.map(({ conteudo: { evento, resumo } }) => <Acao className={linhaClasse({})} key={evento.id} onClick={() => { setCoberturaAberta(false); setDrawer({ kind: "event", id: evento.id, tab: "panorama" }); }}><div className="mini-main"><div className="mini-title">{evento.name} · {formatDateBR(evento.eventDate)}</div><div className="mini-sub">{resumo}</div></div><span className="text-pn-14">Ver panorama →</span></Acao>)}</div>
      </Gaveta>}
      {/* v7 I1: blocos "Comunicação recente" e "Crianças por turma" removidos.
          Telas donas existem (Mural e Crianças). Pendências reais já estão na fila. */}
    </div>
  );
}
