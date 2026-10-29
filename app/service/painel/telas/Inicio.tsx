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
import { type Ausente } from "../../modules/cuidado/cuidado";
import type { CriancaAusente } from "../../modules/cuidado/Cuidado";
import { linhaDoSetup, type SetupEstado } from "../../modules/configuracao/setup";
import { termosDaRota } from "../../modules/registry";
import { REACOES_PESQUISA, ROUTES } from "../comum";
import { Indicador } from "../../ui/Indicador";
import type { AnnouncementView, ChildView, DecisionView, DrawerState, EnrollmentView, EventAttendanceView, EventView, FieldDef, JourneyChangeRequestView, KidsAttendanceView, KidsClassView, MemberView, MinistryView, ModalState, PersonView, RosterAssignmentView, TimelineEventView, VisitorView } from "../tipos";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Cartao } from "../../ui/Cartao";
import { Linha, linhaClasse } from "../../ui/Linha";
import { Vazio } from "../../ui/Estados";
import { Janela } from "../../ui/Janela";
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
  const vagasDaSemana = contarVagasDaSemana(events, roster, ministries, scopeMinistryIds);
  const gapsDaSemana = gaps.filter((g) => g.event.eventDate >= semana.inicio && g.event.eventDate <= semana.fim && aindaVaiAcontecer(g.event.eventDate, g.event.time) && (!scopeMinistryIds || scopeMinistryIds.includes(g.ministry.id)));
  const recentAnnouncements = porPublicacao(announcements.filter(noAr)).slice(0, 3);
  /* v7 I1: "Sobre estes números" removido (lei 14). Os números que restam no Início são autoexplicativos; detalhes vivem em Relatórios. */
  const haPendenciasVisiveis = (podeAbrir("escalas") && vagasDaSemana > 0)
    || (!liderDeTime && podeAbrir("visitantes") && (visitantesSemContato > 0 || visitantesPeloLink > 0))
    || (!liderDeTime && journeyRequests.length > 0);
  return (
    <div className="content wide painel-inicio">
      <div className="ph">
        <div>
          <h1 className="ph-title">{saudacao()}, {userName?.split(" ")[0] ?? "liderança"} <HelpDot text={ct("Seu resumo da semana: próximos {cultos}, vagas em aberto na escala e o que precisa da sua atenção agora.")} /></h1>
          <p className="ph-sub">{(() => {
            /* v7 I1: semana e próximo culto sem vagas (lei 14 — vagas vivem só na fila) */
            const prox = events.filter((e) => aindaVaiAcontecer(e.eventDate, e.time, e.timeZone)).sort((a, b) => (a.eventDate + a.time).localeCompare(b.eventDate + b.time))[0];
            const linha = prox ? linhaDoPainel({ nome: prox.name, data: prox.eventDate }, todayISO()) : null;
            return linha ? `${semanaDe(todayISO())}. ${linha}.` : `${semanaDe(todayISO())}.`;
          })()}</p>
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
      {/* v7 I1: Fila "Precisa de você" — primeira coisa visível (decisão 9, LEVEZA §3A).
         Até 7 linhas-frase com seta; cada uma abre a tela que resolve.
         Ordem: prioridade descendente, depois prazo (lei 5). Botão cheio só no primeiro (lei 13). */}
      {!ativando && (() => {
        const filas: Array<{ key: string; ic: string; t: string; s: string; go: string; action: () => void; principal?: boolean; botaoPrincipal?: boolean }> = [];
        if (podeAbrir("escalas") && vagasDaSemana > 0) {
          filas.push({ key: "vagas", ic: "escalas", t: vagasDaSemana === 1 ? "1 vaga aberta na escala" : `${vagasDaSemana} vagas abertas na escala`, s: " · nesta semana", go: "Escalar", action: () => setRoute("escalas"), principal: true, botaoPrincipal: true });
        }
        if (!liderDeTime && podeAbrir("visitantes") && visitantesSemContato > 0) {
          filas.push({ key: "visitantes-contato", ic: "visitante", t: visitantesSemContato === 1 ? "1 visitante sem contato" : `${visitantesSemContato} visitantes sem contato`, s: " · há mais de 48h", go: "Ver →", action: () => setRoute("visitantes") });
        }
        if (!liderDeTime && podeAbrir("visitantes") && visitantesPeloLink > 0) {
          filas.push({ key: "visitantes-link", ic: "visitante", t: `${plural(visitantesPeloLink, "visitante")} ${visitantesPeloLink === 1 ? "se cadastrou" : "se cadastraram"} pelo link`, s: " · esperando o 1º contato", go: "Ver →", action: () => setRoute("visitantes") });
        }
        if (!liderDeTime && journeyRequests.length > 0) {
          filas.push({ key: "jornada", ic: "membros", t: journeyRequests.length === 1 ? ct("1 pedido na {caminhada}") : ct(`${journeyRequests.length} pedidos na {caminhada}`), s: " · esperando aprovação", go: "Revisar →", action: () => { const el = document.getElementById("caminhada-pendente"); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); else setRoute("membros"); } });
        }
        if (!liderDeTime && podeAbrir("membros") && novosNoMes > 0) {
          filas.push({ key: "novos-cadastros", ic: "pessoa", t: novosNoMes === 1 ? "1 novo cadastro esperando" : `${novosNoMes} novos cadastros esperando`, s: " · neste mês", go: "Ver →", action: () => setRoute("membros") });
        }
        if (!liderDeTime && cuidado && cuidado.lista.length > 0) {
          filas.push({ key: "cuidado", ic: "alerta", t: `${plural(cuidado.lista.length, "pessoa")} sem registro`, s: ` · há ${plural(cuidado.semanas, "semana")} ou mais`, go: "Ver →", action: () => setRoute("membros") });
        }
        if (!liderDeTime && cuidado && (cuidado.criancas?.length ?? 0) > 0) {
          filas.push({ key: "kids-sumindo", ic: "kids", t: `${plural(cuidado.criancas!.length, "criança")} sem check-in`, s: " · vale um contato", go: "Ver →", action: () => setRoute("criancas") });
        }
        if (filas.length > 0) {
          return (
            <>
              <h2 className="painel-sec-t">{liderDeTime ? "Para resolver no seu time" : "Precisa de você"}</h2>
              <div className="agora-list">
                {filas.slice(0, 7).map((f, i) => (
                  <div className={`agora-row${i === 0 && f.principal ? " agora-principal" : ""}`} key={f.key} role={f.botaoPrincipal ? undefined : "button"} tabIndex={f.botaoPrincipal ? undefined : 0} onClick={f.botaoPrincipal ? undefined : f.action} onKeyDown={f.botaoPrincipal ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") f.action(); }}>
                    <span className="agora-ic"><Icon name={f.ic} size={17} /></span>
                    <span className="agora-main"><span className="agora-t">{f.t}</span><span className="agora-s">{f.s}</span></span>
                    {f.botaoPrincipal ? <Botao variante="principal" compacto onClick={f.action}>{f.go}</Botao> : <span className="agora-go">{f.go}</span>}
                  </div>
                ))}
              </div>
            </>
          );
        }
        return (
          <>
            <h2 className="painel-sec-t">Precisa de você</h2>
            <div className="agora-list"><Linha><div className="mini-main"><div className="mini-title">Tudo em dia</div><div className="mini-sub">Nenhuma pendência agora.</div></div></Linha></div>
          </>
        );
      })()}
      {/* v7 I1: Saúde-resumo — 3 números de base em Indicador cartao (lei 14, prancha 2). Panorama vai para Relatórios. */}
      {gestao && !ativando && (
        <div className="kpi-row">
          <Indicador estilo="cartao" icone="membros" valor={members.length} rotulo={ct("Membros registrados")} aoAbrir={() => setRoute("membros")} rotuloAcao={`${ct("Membros registrados")}: ${members.length}. Ver a lista`} />
          <Indicador estilo="cartao" icone="escalas" valor={people.filter((p) => new Set(ministries.flatMap((t) => t.people.map((pp) => pp.personId))).has(p.id) && p.status === "ativo").length} rotulo="Servindo em times" aoAbrir={() => setRoute("pessoas")} rotuloAcao="Servindo em times. Ver a lista" />
          <Indicador estilo="cartao" icone="grupos" valor={members.filter((m) => !!m.groupId).length} rotulo={ct("Em {grupos}")} aoAbrir={() => setRoute("membros")} rotuloAcao={`${ct("Em {grupos}")}. Ver a lista`} />
        </div>
      )}
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
          Vagas e cobertura vivem agora apenas na fila "Precisa de você" (Lei 14).
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
      {journeyRequests.length > 0 && (
        <Cartao id="caminhada-pendente" className="mt-md">
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
                    <div className="mini-title">{member?.name ?? "Alguém"} <span className="text-muted">· {stepLabel}</span></div>
                    <div className="mini-sub">{formatDateBR(request.eventDate) || "sem data informada"}{request.note ? ` · ${request.note}` : ""}</div>
                  </div>
                  <div className="flex-row gap-sm">
                    <Botao variante="texto" compacto onClick={() => onRejectJourney(request)}>Rejeitar</Botao>
                    <Botao variante="secundario" compacto onClick={() => onApproveJourney(request)}>Aprovar</Botao>
                  </div>
                </div>
              );
            })}
          </div>
        </Cartao>
      )}
      {/* v7 I1: blocos "Comunicação recente" e "Crianças por turma" removidos.
          Telas donas existem (Mural e Crianças). Pendências reais já estão na fila. */}
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
    <Linha className="click" role="button" tabIndex={0} onClick={abrir} onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) abrir(); }}>
      <div className="mini-main">
        <div className="mini-title">{event.name}</div>
        <div className="mini-sub">{joinDot(event.weekday, formatDateBR(event.eventDate), event.location)}</div>
        {cobertura && cobertura.length > 0 && <Cobertura itens={cobertura} onAbrir={onAbrirVagas} compacta />}
      </div>
      <div className="mini-right flex-row items-center gap-sm">
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
    </Linha>
  );
}
