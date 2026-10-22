"use client";

import { resumoDaSemana, vagasDaSemana as contarVagasDaSemana } from "../../modules/escalas/semana";
import { plural } from "../../lib/plural";
import { nomeComparavel } from "../../lib/pessoas";
import { useState } from "react";
import { Icon } from "../../lib/icons";
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { formatDateBR, joinDot, paraPublico, porPublicacao } from "../../lib/date";
import type { EnqueteElegivelView } from "../../lib/enquetes";
import type { PesquisaElegivelView } from "../../lib/pesquisas";
import { textoBuscavel, TERMOS } from "../../lib/vocabulario";
import { useTermos } from "../../lib/vocabulario-context";
import { HelpDot, SetupChecklist, type SetupCounts } from "../../HelpSystem";
import { JRN_STEPS } from "../caminhada";
import { noAr } from "../../modules/mural/estado";
import { coberturaPorTime, vagasFaltando, type CoberturaTime } from "../../modules/escalas/cobertura";
import { Cobertura } from "../../modules/escalas/Cobertura";
import { linhaDoPainel, semanaDe } from "../../lib/contexto-dia";
import { SaudeDaIgreja } from "../../modules/inicio/Saude";
import { type Ausente } from "../../modules/cuidado/cuidado";
import { ListaDeCuidado, type CriancaAusente } from "../../modules/cuidado/Cuidado";
import { NovosCadastros } from "../../modules/entrada/NovosCadastros";
import { linhaDoSetup, type SetupEstado } from "../../modules/configuracao/setup";
import { termosDaRota } from "../../modules/registry";
import { Kpi, REACOES_PESQUISA, ROUTES } from "../comum";
import type { AnnouncementView, ChildView, DecisionView, DrawerState, EnrollmentView, EventAttendanceView, EventView, FieldDef, JourneyChangeRequestView, KidsAttendanceView, KidsClassView, MemberView, MinistryView, ModalState, PersonView, RosterAssignmentView, TimelineEventView, VisitorView } from "../tipos";

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
            <button
              className="gsearch-row"
              key={result.key}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                result.action();
                setQuery("");
              }}
            >
              <span className="gsearch-ic"><Icon name={result.icon} size={15} /></span>
              <span className="gsearch-main"><span className="gsearch-nome">{result.name}</span><span className="gsearch-sub">{result.sub}</span></span>
              <span className="gsearch-tag">{result.type}</span>
            </button>
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
  activePeople,
  userName,
  visitantesSemContato,
  visitantesPeloLink,
  novosNoMes,
  gaps,
  events,
  visitorsInCare,
  announcements,
  eventAttendance,
  journeyRequests,
  kidsClasses,
  kidsChildren,
  kidsAttendance,
  enqueteElegivel,
  pesquisaElegivel,
  onApproveJourney,
  onRejectJourney,
  setRoute,
  podeAbrir = () => true,
  setDrawer,
  setModal,
  setCheckinEventId,
  setupCounts,
  roster,
  ministries,
  scopeMinistryIds,
  onAbrirVagas,
  currentRole = "membro",
  visitors = [],
  decisions = [],
  timelineEvents = [],
  enrollments = [],
  cuidado = null,
  aniversarios = null,
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
  onApproveJourney: (request: JourneyChangeRequestView) => void;
  onRejectJourney: (request: JourneyChangeRequestView) => void;
  setRoute: (route: keyof typeof ROUTES) => void;
  podeAbrir?: (route: keyof typeof ROUTES) => boolean;
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
  const { aindaVaiAcontecer, saudacao, quandoPublicado, todayISO } = useRelogioDaIgreja();
  const { comTermos: ct } = useTermos();
  /* v7 4.11: gestão e pastores abrem na Saúde da igreja; líder de time, no
     "Para resolver" do seu time (vagas só dos times que lidera, sem os números da igreja toda) */
  const gestao = currentRole === "master" || currentRole === "pastor";
  const liderDeTime = !!scopeMinistryIds;
  if (scopeMinistryIds) gaps = gaps.filter((g) => scopeMinistryIds.includes(g.ministry.id));
  const semProgramacao = !events.some((e) => aindaVaiAcontecer(e.eventDate, e.time, e.timeZone));
  const ativando = gestao && semProgramacao;
  const primeiraProgramacao = events.length === 0;
  const emPreparacao = gestao && setup && !setup.concluido && (igrejaNova || semProgramacao || setup.fase > 1 || setup.feitas.length > 0 || setup.pulou || !!setup.primeiroEventoId);
  const semana = resumoDaSemana(events, roster, ministries.flatMap((m) => m.positions), scopeMinistryIds, todayISO());
  const confirmationRate = semana.taxa;
  const escaladosSemana = semana.total;
  const vagasDaSemana = contarVagasDaSemana(events, roster, ministries, scopeMinistryIds);
  const gapsDaSemana = gaps.filter((g) => g.event.eventDate >= semana.inicio && g.event.eventDate <= semana.fim && aindaVaiAcontecer(g.event.eventDate, g.event.time) && (!scopeMinistryIds || scopeMinistryIds.includes(g.ministry.id)));
  const recentAnnouncements = porPublicacao(announcements.filter(noAr)).slice(0, 3);
  const [sobreAberto, setSobreAberto] = useState(false);
  /* v7 3.6: "Sobre estes números" explica, num lugar só, cada número e painel que está na tela */
  const sobre: Array<[string, string]> = [
    [ct("{Voluntarios}"), "Pessoas que servem em algum time e estão com o status ativo, sem contar quem está em pausa ou de férias. Novos são os que chegaram à igreja nos últimos 30 dias."],
    ["Confirmação", "Das vagas com alguém escalado nesta semana, quantas já foram confirmadas no app."],
    ["Visitantes em acompanhamento", "Visitantes que ainda estão na fase de acompanhamento, antes de virarem membros. O número de Visitantes na Saúde da igreja conta só quem visitou no período escolhido."],
    ["Pendências da escala", "Funções dos próximos encontros desta semana que ainda não têm todas as vagas preenchidas."],
    [ct("Próximos {cultos}"), ct("Os próximos {cultos} ou eventos da agenda, na ordem em que vão acontecer.")],
    ...(enqueteElegivel ? [["Avaliação de experiência", "Pesquisa rápida sobre como foi servir. Aparece só quando você está elegível pra responder."] as [string, string]] : []),
    ...(pesquisaElegivel ? [["Pulso da escala", "Pesquisa da própria igreja sobre como foi servir nesta escala. Diferente da avaliação de experiência."] as [string, string]] : []),
    ...(journeyRequests.length > 0 ? [[ct("{Caminhada} pendente"), ct("Pedidos de avanço na {caminhada} (decisão, batismo, curso...) esperando aprovação da liderança.")] as [string, string]] : []),
    ["Comunicação recente", "Os últimos avisos e posts do mural enviados pra igreja."],
    ...(cuidado ? [["Lista de cuidado", `Quem já teve presença registrada e está há ${plural(cuidado.semanas, "semana")} ou mais sem nenhuma. Cada nome vai para quem cuida: líder do grupo, depois líder do time, depois a pastoral. Uma justificativa registrada tira da lista por 30 dias. A pessoa não vê nada disso.`] as [string, string]] : []),
    ...(kidsClasses.length > 0 ? [["Crianças por turma", "Quantas crianças estão em cada turma do Kids."] as [string, string], ...(cuidado ? [] : [["Crianças sumindo", "Crianças sem check-in registrado há algum tempo. Vale um contato com a família."] as [string, string]])] : []),
  ];
  const haPendenciasVisiveis = (podeAbrir("escalas") && vagasDaSemana > 0)
    || (!liderDeTime && podeAbrir("visitantes") && (visitantesSemContato > 0 || visitantesPeloLink > 0))
    || (!liderDeTime && journeyRequests.length > 0);
  return (
    <div className="content wide painel-inicio">
      <div className="ph">
        <div>
          <h1 className="ph-title">{saudacao()}, {userName?.split(" ")[0] ?? "liderança"} <HelpDot text={ct("Seu resumo da semana: próximos {cultos}, vagas em aberto na escala e o que precisa da sua atenção agora.")} /></h1>
          <p className="ph-sub">{(() => {
            /* v7 4.19: a semana e o próximo culto com o que falta na escala */
            const prox = events.filter((e) => aindaVaiAcontecer(e.eventDate, e.time, e.timeZone)).sort((a, b) => (a.eventDate + a.time).localeCompare(b.eventDate + b.time))[0];
            const linha = prox ? linhaDoPainel({ nome: prox.name, data: prox.eventDate, faltam: vagasFaltando(coberturaPorTime(prox, roster, ministries, scopeMinistryIds)) }, todayISO()) : null;
            return linha ? `${semanaDe(todayISO())}. ${linha}.` : `${semanaDe(todayISO())}.`;
          })()}</p>
        </div>
        <div className="ph-actions">
          {podeAbrir("cultos") && <button className="btn btn-sec" type="button" onClick={() => setRoute("cultos")}>Ver agenda</button>}
          {podeAbrir(emPreparacao ? "configurar" : ativando ? "cultos" : "escalas") && <button className="btn btn-pri" type="button" onClick={() => setRoute(emPreparacao ? "configurar" : ativando ? "cultos" : "escalas")}>{emPreparacao ? (setup.primeiroEventoId || setup.fase > 1 || setup.feitas.length > 0 || setup.pulou || setup.rascunho ? "Continuar preparação" : "Preparar minha igreja") : ativando ? (primeiraProgramacao ? "Preparar primeiro encontro" : "Preparar próximo encontro") : "Montar escala"}</button>}
        </div>
      </div>
      {ativando && (
        <section className="service-start-guide" aria-labelledby="service-start-title">
          <div className="ph-eyebrow">{primeiraProgramacao ? "Primeiros passos" : "Próximo encontro"}</div>
          <h2 id="service-start-title">O próximo encontro começa aqui</h2>
          <p>Ainda não há programação futura na agenda. Prepare um encontro com data, horário e local para que as pessoas saibam onde participar.</p>
          <ol><li><b>{primeiraProgramacao ? "Identifique sua igreja" : "Confira os dados da igreja"}</b><span>Nome, endereço e a identidade que as pessoas vão reconhecer.</span></li><li><b>Prepare o encontro</b><span>Uma data e um lugar antes de organizar toda a equipe.</span></li><li><b>Convide quem vai ajudar</b><span>Depois, acompanhe os acessos e as respostas.</span></li></ol>
        </section>
      )}
      {gestao && !ativando && (
        <SaudeDaIgreja
          dados={{ membros: members, pessoas: people, times: ministries, visitantes: visitors, decisoes: decisions, fatos: timelineEvents, matriculas: enrollments }}
          etapas={JRN_STEPS}
          extras={cuidado ? [{ id: "ausentes", rotulo: `Sem registro há ${plural(cuidado.semanas, "semana")} ou mais`, valor: cuidado.todos.length, itens: cuidado.todos.map((a) => (a.memberId ? { tipo: "member" as const, id: a.memberId, nome: a.nome } : { tipo: "person" as const, id: a.personId, nome: a.nome })) }] : []}
          podeAbrirPessoa={(it) => podeAbrir(it.tipo === "member" ? "membros" : "pessoas")}
          onAbrir={(it) => setDrawer({ kind: it.tipo, id: it.id })}
        />
      )}
      {haPendenciasVisiveis && <h2 className="painel-sec-t">{liderDeTime ? "Para resolver no seu time" : "Para resolver"}</h2>}
      {haPendenciasVisiveis && (
        <div className="agora-list">
          {podeAbrir("escalas") && vagasDaSemana > 0 && (
            <button type="button" className="agora-row" onClick={() => setRoute("escalas")}>
              <span className="agora-ic"><Icon name="escalas" size={17} /></span>
              <span className="agora-main"><span className="agora-t">{vagasDaSemana === 1 ? "1 vaga aberta na escala" : `${vagasDaSemana} vagas abertas na escala`}</span><span className="agora-s"> · nesta semana</span></span>
              <span className="agora-go">Escalar →</span>
            </button>
          )}
          {podeAbrir("visitantes") && !liderDeTime && visitantesSemContato > 0 && (
            <button type="button" className="agora-row" onClick={() => setRoute("visitantes")}>
              <span className="agora-ic"><Icon name="visitante" size={17} /></span>
              <span className="agora-main"><span className="agora-t">{visitantesSemContato === 1 ? "1 visitante sem contato" : `${visitantesSemContato} visitantes sem contato`}</span><span className="agora-s"> · há mais de 48h</span></span>
              <span className="agora-go">Ver →</span>
            </button>
          )}
          {podeAbrir("visitantes") && !liderDeTime && visitantesPeloLink > 0 && (
            <button type="button" className="agora-row" onClick={() => setRoute("visitantes")}>
              <span className="agora-ic"><Icon name="visitante" size={17} /></span>
              <span className="agora-main"><span className="agora-t">{`${plural(visitantesPeloLink, "visitante")} ${visitantesPeloLink === 1 ? "se cadastrou" : "se cadastraram"} pelo link`}</span><span className="agora-s"> · esperando o 1º contato</span></span>
              <span className="agora-go">Ver →</span>
            </button>
          )}
          {!liderDeTime && journeyRequests.length > 0 && (
            <button type="button" className="agora-row" onClick={() => document.getElementById("caminhada-pendente")?.scrollIntoView({ behavior: "smooth" })}>
              <span className="agora-ic"><Icon name="membros" size={17} /></span>
              <span className="agora-main"><span className="agora-t">{journeyRequests.length === 1 ? ct("1 pedido na {caminhada}") : ct(`${journeyRequests.length} pedidos na {caminhada}`)}</span><span className="agora-s"> · esperando sua aprovação</span></span>
              <span className="agora-go">Revisar →</span>
            </button>
          )}
        </div>
      )}
      {gestao && <NovosCadastros />}
      {cuidado && (cuidado.lista.length > 0 || (cuidado.criancas?.length ?? 0) > 0) && (
        <div style={{ marginBottom: 20 }}>
          <ListaDeCuidado podeAbrirPessoa={(a) => podeAbrir(a.memberId ? "membros" : "pessoas")} lista={cuidado.lista} criancas={cuidado.criancas} semanas={cuidado.semanas} onAbrir={(a) => setDrawer(a.memberId ? { kind: "member", id: a.memberId } : { kind: "person", id: a.personId })} />
        </div>
      )}
      {aniversarios}
      {podeAbrir("configurar") && (emPreparacao ? (
        <button type="button" className="setup-banner" onClick={() => setRoute("configurar")}>
          <span className="setup-banner-t">{linhaDoSetup(setup)}</span>
          <span className="agora-go">{setup.feitas.length || setup.pulou ? "Continuar →" : "Começar →"}</span>
        </button>
      ) : (
        gestao && ["configurar", "times", "cultos", "membros"].every((r) => podeAbrir(r as keyof typeof ROUTES)) ? <details className="service-preparacao"><summary>Revisar preparação da igreja</summary><SetupChecklist counts={setupCounts} setRoute={(r) => setRoute(r as keyof typeof ROUTES)} /></details> : null
      ))}
      {/* v7 3.6: cada número aparece uma vez. Vagas abertas e visitantes sem contato já estão na lista do topo e em Pendências. */}
      {!liderDeTime && !ativando && <div className="kpi-row kpi-3">
        <Kpi icon="pessoa" label={ct("{Voluntarios}")} value={activePeople} foot={joinDot(`de ${plural(people.length, "cadastrado")}`, novosNoMes ? `${plural(novosNoMes, "novo", "novos")} em 30 dias` : null)} />
        <Kpi icon="ok" label="Confirmação" value={escaladosSemana ? `${confirmationRate}%` : "·"} foot={escaladosSemana ? `de ${plural(escaladosSemana, "vaga escalada", "vagas escaladas")} nesta semana` : "ninguém escalado nesta semana"} />
        <Kpi icon="visitante" label="Visitantes em acompanhamento" value={visitorsInCare} foot={visitantesSemContato ? `${visitantesSemContato} sem contato há mais de 48h` : visitorsInCare ? "todos com contato em dia" : "nenhum visitante em acompanhamento"} />
      </div>}
      <div className="sobre-numeros"><button type="button" className="help-link" onClick={() => setSobreAberto(true)}>Sobre estes números</button></div>
      {sobreAberto && (
        <div className="modal-bg" onClick={() => setSobreAberto(false)}>
          <div className="modal" role="dialog" aria-label="Sobre estes números" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Sobre estes números</div>
              <div className="modal-sub">Como cada número e painel do Início é calculado.</div>
            </div>
            <div className="modal-body" style={{ display: "block" }}>
              <dl className="sobre-lista">
                {sobre.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
              </dl>
            </div>
            <div className="modal-foot"><button className="btn btn-pri" type="button" onClick={() => setSobreAberto(false)}>Fechar</button></div>
          </div>
        </div>
      )}
      <div className="dash-2col">
        {podeAbrir("escalas") && <div className="panel">
          <div className="panel-head">
            <span className="panel-title"><Icon name="escalas" size={14} /> Pendências da escala</span>
            <button className="btn btn-sec btn-sm" type="button" onClick={() => setRoute("escalas")}>Escalar</button>
          </div>
          <div className="panel-body flush">
            {(() => {
              /* v7 4.16: cobertura do próximo culto com vaga aberta */
              const prox = events.filter((e) => aindaVaiAcontecer(e.eventDate, e.time, e.timeZone)).sort((a, b) => (a.eventDate + a.time).localeCompare(b.eventDate + b.time))
                .map((e) => ({ e, c: coberturaPorTime(e, roster, ministries, scopeMinistryIds) }))
                .find((x) => vagasFaltando(x.c) > 0);
              return prox ? (
                <div className="mini-row">
                  <div className="mini-main">
                    <div className="mini-title">{prox.e.name} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {joinDot(prox.e.weekday, prox.e.time)}</span></div>
                    <Cobertura itens={prox.c} onAbrir={(timeId) => onAbrirVagas(prox.e.id, timeId)} />
                  </div>
                </div>
              ) : null;
            })()}
            {gapsDaSemana.slice(0, 6).map((gap) => (
              <div className="gap-row" key={`${gap.event.id}-${gap.position.id}`}>
                <div className="gap-ic wait">!</div>
                <div className="mini-main">
                  <div className="mini-title">{gap.position.name} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {gap.ministry.name}</span></div>
                  <div className="mini-sub">{joinDot(gap.event.weekday, gap.event.time)}</div>
                </div>
                <button className="btn btn-sec btn-sm" type="button" onClick={() => setRoute("escalas")}>Escalar</button>
              </div>
            ))}
            {gapsDaSemana.length === 0 && !events.some((e) => aindaVaiAcontecer(e.eventDate, e.time, e.timeZone) && vagasFaltando(coberturaPorTime(e, roster, ministries, scopeMinistryIds)) > 0) ? <div className="mini-row"><div className="mini-main"><div className="mini-title">{semProgramacao ? "Sem programação futura" : roster.length === 0 ? "Escalas ainda não preparadas" : "Sem vagas abertas nesta semana"}</div><div className="mini-sub">{semProgramacao ? "Prepare o próximo encontro antes de organizar a equipe." : roster.length === 0 ? "Ter encontros na agenda não significa que a equipe já foi escalada." : "Confira os próximos encontros para acompanhar a cobertura de cada time."}</div></div></div> : null}
          </div>
        </div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {podeAbrir("cultos") && <div className="panel">
            <div className="panel-head"><span className="panel-title"><Icon name="cultos" size={14} /> {ct("Próximos {cultos}")}</span><button className="btn btn-sec btn-sm" type="button" onClick={() => setRoute("cultos")}>Agenda</button></div>
            <div className="panel-body flush">
            {/* v7 2.9: só o que ainda vai começar, no fuso da igreja (Brasília) */}
            {(() => {
              const proximos = events.filter((e) => aindaVaiAcontecer(e.eventDate, e.time, e.timeZone)).sort((a, b) => (a.eventDate + a.time).localeCompare(b.eventDate + b.time)).slice(0, 3);
              if (proximos.length === 0) return <div className="empty" style={{ padding: "14px 16px" }}>{ct("Nenhum {culto} marcado daqui pra frente.")}</div>;
              return proximos.map((event) => (
                <MiniEvent
                  key={event.id}
                  event={event}
                  cobertura={coberturaPorTime(event, roster, ministries, scopeMinistryIds)}
                  onAbrirVagas={podeAbrir("escalas") ? (timeId) => onAbrirVagas(event.id, timeId) : undefined}
                  setDrawer={setDrawer}
                  attendanceCount={eventAttendance.filter((a) => a.event_id === event.id).length}
                  onCheckin={() => setCheckinEventId(event.id)}
                />
              ));
            })()}
            </div>
          </div>}
          {enqueteElegivel && (
            <div className="panel" style={{ cursor: "pointer" }} onClick={() => setModal(buildAvaliacaoModal(enqueteElegivel))}>
              <div className="panel-head"><span className="panel-title"><Icon name="estrela" size={14} /> Avaliação de experiência</span></div>
              <div className="panel-body">
                <div style={{ fontSize: "var(--fs-pn-14)", fontWeight: 600, color: "var(--white)", marginBottom: 4 }}>{enqueteElegivel.nome}</div>
                <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>Leva menos de um minuto. Ajuda sua liderança a cuidar melhor do time.</div>
              </div>
            </div>
          )}
          {pesquisaElegivel && (
            <div className="panel" style={{ cursor: "pointer" }} onClick={() => setModal(buildPesquisaModal(pesquisaElegivel))}>
              <div className="panel-head"><span className="panel-title"><Icon name="reacao" size={14} /> {pesquisaElegivel.pendente ? "Pulso da escala" : "Sua última resposta"}</span></div>
              <div className="panel-body">
                <div style={{ fontSize: "var(--fs-pn-14)", fontWeight: 600, color: "var(--white)", marginBottom: 4 }}>{pesquisaElegivel.nome}</div>
                <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>{pesquisaElegivel.pendente ? "Leva menos de um minuto. Conta como foi pra você." : "Já respondida. Toque pra rever ou atualizar quando quiser."}</div>
              </div>
            </div>
          )}
        </div>
      </div>
      {journeyRequests.length > 0 && (
        <div className="panel" id="caminhada-pendente" style={{ marginTop: 24 }}>
          <div className="panel-head">
            <span className="panel-title"><Icon name="membros" size={14} /> {ct("{Caminhada} pendente")}</span>
          </div>
          <div className="panel-body flush">
            {journeyRequests.map((request) => {
              const member = members.find((m) => m.id === request.memberId);
              const stepLabel = ct(JRN_STEPS.find((s) => s.kind === request.step)?.label ?? request.step);
              return (
                <div className="gap-row" key={request.id}>
                  <div className="gap-ic wait">!</div>
                  <div className="mini-main">
                    <div className="mini-title">{member?.name ?? "Alguém"} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {stepLabel}</span></div>
                    <div className="mini-sub">{formatDateBR(request.eventDate) || "sem data informada"}{request.note ? ` · ${request.note}` : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-sec btn-sm" type="button" onClick={() => onRejectJourney(request)}>Rejeitar</button>
                    <button className="btn btn-pri btn-sm" type="button" onClick={() => onApproveJourney(request)}>Aprovar</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {podeAbrir("comunicacao") && <div className="dash-2col">
        <div className="panel">
          <div className="panel-head"><span className="panel-title"><Icon name="comunicacao" size={14} /> Comunicação recente</span><button className="btn btn-sec btn-sm" type="button" onClick={() => setRoute("comunicacao")}>Ver tudo</button></div>
          <div className="panel-body flush">
            {recentAnnouncements.map((a) => (
              <button className="mini-row click" type="button" key={a.id} onClick={() => setRoute("comunicacao")}>
                <div className="mini-main">
                  <div className="mini-title">{a.title}</div>
                  <div className="mini-sub">{joinDot(paraPublico(a.audience), quandoPublicado(a.created_at))}</div>
                </div>
              </button>
            ))}
            {recentAnnouncements.length === 0 && (
              <div className="mini-row"><div className="mini-main"><div className="mini-title">Nenhum aviso ainda</div><div className="mini-sub">Publique em Comunicação</div></div></div>
            )}
          </div>
        </div>
      </div>}
      {podeAbrir("criancas") && kidsClasses.length > 0 && (
        <div className="dash-2col" style={{ marginTop: 20 }}>
          <div className="panel">
            <div className="panel-head"><span className="panel-title"><Icon name="kids" size={14} /> Crianças por turma</span><button className="btn btn-sec btn-sm" type="button" onClick={() => setRoute("criancas")}>Ver todas</button></div>
            <div className="panel-body flush">
              {kidsClasses.map((kc) => {
                const count = kidsChildren.filter((child) => child.class_id === kc.id).length;
                const max = Math.max(...kidsClasses.map((k) => kidsChildren.filter((c) => c.class_id === k.id).length), 1);
                return (
                  <div className="dist-row" key={kc.id}>
                    <span className="dist-name">{kc.name}</span>
                    <div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(count / max) * 100}%` }} /></div>
                    <span className="dist-num">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {!cuidado && <div className="panel">
            <div className="panel-head"><span className="panel-title"><Icon name="alerta" size={14} /> Crianças sumindo</span><span className="panel-meta">sem vir há mais tempo</span></div>
            <div className="panel-body flush">
              {kidsChildren
                .map((child) => {
                  const lastSeen = kidsAttendance
                    .filter((a) => a.child_id === child.id)
                    .map((a) => a.dropped_off_at)
                    .sort()
                    .pop();
                  return { child, lastSeen };
                })
                .sort((a, b) => (a.lastSeen ?? "").localeCompare(b.lastSeen ?? ""))
                .slice(0, 5)
                .map(({ child, lastSeen }) => (
                  <div className="mini-row" key={child.id}>
                    <div className="mini-main">
                      <div className="mini-title">{child.name}</div>
                      <div className="mini-sub">{lastSeen ? `Última vez em ${formatDateBR(lastSeen.slice(0, 10))}` : "Nunca fez check-in"}</div>
                    </div>
                  </div>
                ))}
              {kidsChildren.length === 0 && <div className="empty" style={{ padding: "20px 0" }}>Nenhuma criança cadastrada ainda.</div>}
            </div>
          </div>}
        </div>
      )}
    </div>
  );
}

export function MiniEvent({
  event, setDrawer, attendanceCount, onCheckin, cobertura, onAbrirVagas,
}: {
  event: EventView;
  setDrawer: (drawer: DrawerState) => void;
  attendanceCount?: number;
  onCheckin?: () => void;
  cobertura?: CoberturaTime[];
  onAbrirVagas?: (timeId: string) => void;
}) {
  /* div com papel de botão: a cobertura tem botões dentro (não pode botão dentro de botão) */
  const abrir = () => setDrawer({ kind: "event", id: event.id });
  return (
    <div className="mini-row click" role="button" tabIndex={0} onClick={abrir} onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) abrir(); }}>
      <div className="mini-main">
        <div className="mini-title">{event.name}</div>
        <div className="mini-sub">{joinDot(event.weekday, formatDateBR(event.eventDate), event.location)}</div>
        {cobertura && cobertura.length > 0 && <Cobertura itens={cobertura} onAbrir={onAbrirVagas} compacta />}
      </div>
      <div className="mini-right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span>{event.time}</span>
        {onCheckin && (
          <span
            className="painel-qr"
            role="button"
            tabIndex={0}
            title="QR check-in / presença"
            onClick={(e) => { e.stopPropagation(); onCheckin(); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onCheckin(); } }}
          >
            {!!attendanceCount && <span className="painel-qr-count">{attendanceCount}</span>}
            <Icon name="cultos" size={14} />
          </span>
        )}
      </div>
    </div>
  );
}
