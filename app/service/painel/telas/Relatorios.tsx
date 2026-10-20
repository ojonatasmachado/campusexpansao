"use client";

import { useState } from "react";
import { Icon } from "../../lib/icons";

import { useTermos } from "../../lib/vocabulario-context";
import { HelpDot } from "../../HelpSystem";
import { baixarCsv } from "../../lib/csv";
import { Av, PageHead } from "../ui";
import { cargaDaSemana } from "../../modules/escalas/Escalas";
import { Kpi, ROUTES } from "../comum";
import type { BoardView, ChatView, ChurchView, EventAttendanceView, EventView, FellowshipGroupView, MemberView, MinistryView, PersonView, RosterAssignmentView, VisitorView } from "../tipos";

export function Bars({ series, labels }: { series: number[]; labels: string[] }) {
  const max = Math.max(...series, 1);
  return <div className="bars">{series.map((value, index) => <div className="bars-col" key={labels[index] ?? index}><div className="bars-track"><div className={`bars-bar ${index === series.length - 1 ? "hi" : ""}`} style={{ transform: `translateY(${100 - (value / max) * 100}%)` }} /></div><span className="bars-x">{labels[index]}</span></div>)}</div>;
}

export function Relatorios({
  people,
  members,
  ministries,
  events,
  boards,
  chats,
  visitors,
  roster,
  eventAttendance,
  fellowshipGroups,
  confirmationRate,
  setRoute,
  church,
}: {
  people: PersonView[];
  members: MemberView[];
  ministries: MinistryView[];
  events: EventView[];
  boards: BoardView[];
  chats: ChatView[];
  visitors: VisitorView[];
  roster: RosterAssignmentView[];
  eventAttendance: EventAttendanceView[];
  fellowshipGroups: FellowshipGroupView[];
  confirmationRate: number;
  setRoute: (route: keyof typeof ROUTES) => void;
  church: ChurchView | undefined;
}) {
  const { comTermos: ct } = useTermos();
  const gruposAtivo = church?.settings?.gruposCfg?.ativo ?? true;
  const gruposSigla = church?.settings?.gruposCfg?.sigla ?? "GC";
  /* recorte das comparações: últimos 30 dias ou trimestre (90), sempre contra o período anterior de mesmo tamanho */
  const [periodo, setPeriodo] = useState<30 | 90>(30);
  const P = periodo;
  const hoje = Date.now();
  const diasAtras = (iso: string) => (hoje - new Date(iso).getTime()) / 86400000;

  /* membros na rede: delta = novos no período vs. período anterior (member.createdAt real) */
  const membrosDelta = members.filter((m) => diasAtras(m.createdAt) <= P).length - members.filter((m) => diasAtras(m.createdAt) > P && diasAtras(m.createdAt) <= 2 * P).length;

  /* retenção de visitantes: % que viraram membro, comparando uma safra madura (60-120 dias, já teve tempo real de converter) com a safra anterior (120-220 dias) */
  const retencaoAtual = visitors.length ? Math.round((visitors.filter((v) => v.stage === "membro").length / visitors.length) * 100) : 0;
  const retencaoPeriodo = (min: number, max: number) => {
    const cohort = visitors.filter((v) => diasAtras(v.created_at) >= min && diasAtras(v.created_at) < max);
    return cohort.length ? Math.round((cohort.filter((v) => v.stage === "membro").length / cohort.length) * 100) : null;
  };
  const retencaoRecente = retencaoPeriodo(60, 120);
  const retencaoAnterior = retencaoPeriodo(120, 220);
  const retencaoDelta = retencaoRecente !== null && retencaoAnterior !== null ? retencaoRecente - retencaoAnterior : null;

  /* cobertura de escala: mesma fórmula global de confirmationRate, com delta comparando eventos dos últimos 30 dias x 30 dias anteriores */
  const eventById = new Map(events.map((e) => [e.id, e]));
  const coberturaPeriodo = (min: number, max: number) => {
    const assignments = roster.filter((a) => { const ev = eventById.get(a.event_id); return ev && diasAtras(ev.eventDate) >= min && diasAtras(ev.eventDate) < max; });
    return assignments.length ? Math.round((assignments.filter((a) => a.status === "ok").length / assignments.length) * 100) : null;
  };
  const coberturaRecente = coberturaPeriodo(0, P);
  const coberturaAnterior = coberturaPeriodo(P, 2 * P);
  const coberturaDelta = coberturaRecente !== null && coberturaAnterior !== null ? coberturaRecente - coberturaAnterior : null;

  /* frequência média: check-ins reais (event_attendance) por culto nos últimos 30 dias x 30 dias anteriores */
  const cultoIds = new Set(events.filter((e) => e.kind.toLowerCase() === "culto").map((e) => e.id));
  const frequenciaPeriodo = (min: number, max: number) => {
    const cultosPeriodo = events.filter((e) => cultoIds.has(e.id) && diasAtras(e.eventDate) >= min && diasAtras(e.eventDate) < max);
    if (!cultosPeriodo.length) return null;
    const total = cultosPeriodo.reduce((sum, ev) => sum + eventAttendance.filter((a) => a.event_id === ev.id).length, 0);
    return Math.round(total / cultosPeriodo.length);
  };
  const freqRecente = frequenciaPeriodo(0, P);
  const freqAnterior = frequenciaPeriodo(P, 2 * P);
  const freqDelta = freqRecente !== null && freqAnterior !== null ? freqRecente - freqAnterior : null;
  const cultosTodos = events.filter((e) => cultoIds.has(e.id));
  const freqGeral = cultosTodos.length ? Math.round(cultosTodos.reduce((sum, ev) => sum + eventAttendance.filter((a) => a.event_id === ev.id).length, 0) / cultosTodos.length) : 0;

  const foot = (delta: number | null, unidade: string, fallback: string) => delta === null ? fallback : `${delta >= 0 ? "+" : "−"}${Math.abs(delta)}${unidade} em relação ${P === 90 ? "ao trimestre anterior" : "aos 30 dias anteriores"}`;

  /* termômetro de bem-estar sem sobreposição: carga real da semana via roster, não engajamento alto ‒
     equivalente a bemEstar() em evolucoes/service_app/relatorios.jsx:19-27, sem o override de sinais (mock-only) */
  const carga = cargaDaSemana(roster, events);
  const nivelDe = (p: PersonView): "saudavel" | "atencao" | "sobrecarga" | "afastando" => {
    const { escalas = 0, recusas = 0 } = carga[p.id] ?? {};
    /* só sinal real: pausa, recusa ou carga alta registrada na escala da semana */
    if (p.status === "pausa") return "afastando";
    if (recusas >= 2) return "afastando";
    if (escalas >= 3) return "sobrecarga";
    if (recusas === 1) return "atencao";
    return "saudavel";
  };
  const niveis = people.map((p) => ({ person: p, nivel: nivelDe(p) }));
  const contar = (n: string) => niveis.filter((v) => v.nivel === n).length;
  const NIVEL_TAG: Record<string, string> = { atencao: "Atenção", sobrecarga: "Sobrecarga", afastando: "Afastando" };
  const wellRows = niveis.filter((v) => v.nivel !== "saudavel").map(({ person, nivel }) => ({ person, cls: nivel, tag: NIVEL_TAG[nivel] }));

  /* membros cadastrados até o fim de cada um dos últimos 4 meses, terminando no mês atual */
  const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const agora = new Date();
  const mesesSerie = [3, 2, 1, 0].map((k) => new Date(agora.getFullYear(), agora.getMonth() - k + 1, 1));
  const series = mesesSerie.map((fim) => members.filter((m) => m.createdAt && new Date(m.createdAt) < fim).length);
  const serieLabels = mesesSerie.map((fim) => MES_CURTO[new Date(fim.getFullYear(), fim.getMonth() - 1, 1).getMonth()]);
  const maxMinistry = Math.max(...ministries.map((m) => m.people.length), 1);
  const gcCounts = fellowshipGroups.map((g) => ({ group: g, n: members.filter((m) => m.groupId === g.id).length }));
  const maxGc = Math.max(...gcCounts.map((x) => x.n), 1);
  const maxOps = Math.max(boards.length, chats.length, events.length, 1);
  const FUNNEL_STAGES: { id: VisitorView["stage"]; label: string }[] = [
    { id: "novo", label: "Novo" },
    { id: "contato", label: "Em contato" },
    { id: "integrando", label: "Integrando" },
    { id: "membro", label: "Virou membro" },
  ];
  const funnelCounts = FUNNEL_STAGES.map((s) => visitors.filter((v) => v.stage === s.id).length);
  const funnelMax = Math.max(...funnelCounts, 1);
  const caminhadaEtapas = ["Decisão", "Batismo", "Fundamentos", gruposSigla, "Servindo"];
  /* o relatório baixado traz os mesmos números da tela, no recorte escolhido; sem nomes de pessoas */
  const baixarRelatorio = () => {
    const recorte = P === 90 ? "Trimestre" : "Últimos 30 dias";
    const d = new Date(); const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const linhas: (string | number)[][] = [
      ["Seção", "Indicador", "Valor"],
      ["Relatório", "Igreja", church?.nome ?? ""],
      ["Relatório", "Gerado em", dia],
      ["Relatório", "Recorte", recorte],
      ["Indicadores", "Membros na rede", members.length],
      ["Indicadores", "Membros novos no recorte", members.filter((m) => diasAtras(m.createdAt) <= P).length],
      ["Indicadores", "Retenção de visitantes (%)", retencaoAtual],
      ["Indicadores", "Cobertura de escala (%)", confirmationRate],
      ["Indicadores", "Cobertura de escala no recorte (%)", coberturaRecente ?? ""],
      ["Indicadores", ct("Frequência média por {culto}"), freqRecente ?? freqGeral],
      ...serieLabels.map((l, i) => ["Crescimento de membros", l, series[i]]),
      ...FUNNEL_STAGES.map((st, i) => ["Funil de visitantes", st.label, funnelCounts[i]]),
      ...[["saudavel", "Saudável"], ["atencao", "Atenção"], ["sobrecarga", "Sobrecarga"], ["afastando", "Afastando"]].map(([k, l]) => ["Bem-estar", l, contar(k)]),
      ...ministries.map((m) => [ct("{Voluntarios} por time"), m.name, m.people.length]),
      ...caminhadaEtapas.map((st, i) => [ct("Membros por {caminhada}"), st, members.filter((m) => m.journey[i]).length]),
      ...(gruposAtivo ? gcCounts.map(({ group, n }) => [`Membros por ${gruposSigla}`, group.name, n]) : []),
    ];
    baixarCsv(`relatorio-${P === 90 ? "trimestre" : "30-dias"}-${dia}.csv`, linhas);
  };
  return (
    <div className="content wide">
      <PageHead title="Relatórios e indicadores" eyebrow="Gestão" help="A saúde da igreja num lugar: crescimento, cobertura de escala e o bem-estar de quem serve. Use o recorte de trimestre pra comparar." action={<><div className="seg" role="group" aria-label="Recorte das comparações">{([[30, "30 dias"], [90, "Trimestre"]] as const).map(([v, l]) => <button key={v} type="button" className={periodo === v ? "on" : ""} aria-pressed={periodo === v} onClick={() => setPeriodo(v)}>{l}</button>)}</div><button className="btn btn-pri" type="button" onClick={baixarRelatorio}>Baixar relatório →</button></>} />
      <div className="kpi-row"><Kpi icon="membros" label="Membros na rede" value={members.length} foot={foot(membrosDelta, " novos", "cadastrados")} help="Toda a congregação, somando todas as congregações da rede." /><Kpi icon="visitante" label="Retenção de visitantes" value={`${retencaoAtual}%`} foot={foot(retencaoDelta, "%", "viram membros")} help="De todos os visitantes, quantos completaram o caminho até virar membro." /><Kpi icon="escalas" label="Cobertura de escala" value={`${confirmationRate}%`} foot={foot(coberturaDelta, "pp", "das posições preenchidas")} help="Das vagas de escala em aberto, quantas já têm alguém confirmado." /><Kpi icon="cultos" label="Frequência média" value={freqRecente ?? freqGeral} foot={foot(freqDelta, "", ct("por {culto}"))} help={ct("Quantas pessoas em média marcam presença por {culto}.")} /></div>
      <div className="dash-3col">
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="relatorios" size={13} /> Crescimento de membros <HelpDot text="Quantos membros novos entraram nos últimos meses." /></span><span className="panel-meta">últimos meses</span></div><div className="panel-body"><div style={{ fontSize: "var(--fs-pn-32)", fontWeight: 700 }}>{members.length}<span style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)", fontWeight: 500, marginLeft: 8 }}>membros no total</span></div><div style={{ marginTop: 14 }}><Bars series={series} labels={serieLabels} /></div></div></div>
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="visitante" size={13} /> Funil de visitantes <HelpDot text="Quantos visitantes estão em cada etapa, da primeira visita até virar membro." /></span><button className="panel-link" type="button" onClick={() => setRoute("visitantes")}>Abrir</button></div><div className="panel-body flush">{FUNNEL_STAGES.map((s, i) => <div className="dist-row" key={s.id}><span className="dist-name" style={{ width: 140 }}>{s.label}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${Math.max(4, (funnelCounts[i] / funnelMax) * 100)}%` }} /></div><span className="dist-num">{funnelCounts[i]}</span></div>)}</div></div>
      </div>
      <div className="section-divide" style={{ marginTop: 28 }}><span className="num">02</span><span className="label">Termômetro de bem-estar</span><span className="line" /></div>
      <div className="well-sum">{[["saudavel", contar("saudavel"), "Saudável"], ["atencao", contar("atencao"), "Atenção"], ["sobrecarga", contar("sobrecarga"), "Sobrecarga"], ["afastando", contar("afastando"), "Afastando"]].map(([level, count, label]) => <div className="well-pill" key={level}><div className="n">{count}</div><div className="l"><span className={`well-dot ${level}`} />{label}</div></div>)}</div>
      <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="pessoa" size={13} /> Quem precisa de atenção <HelpDot text={ct("{Voluntarios} em pausa, de férias ou com engajamento abaixo da média nas últimas escalas.")} /></span><button className="panel-link" type="button" onClick={() => setRoute("pessoas")}>{ct("{Voluntarios}")}</button></div><div className="panel-body flush">{(wellRows.length ? wellRows : people.slice(0, 8).map((p) => ({ person: p, cls: "atencao", tag: "Atenção" }))).slice(0, 8).map(({ person, cls, tag }) => <div className="well-row" key={person.id}><Av name={person.name} size="md" photoUrl={person.photoUrl} /><div className="mini-main"><div className="mini-title">{person.name}</div><div className="mini-sub">{person.status !== "ativo" ? "Em pausa ou férias." : "Engajamento abaixo da média."}</div></div><div className="well-meter"><div className="well-track"><div className={`well-fill ${cls}`} style={{ width: `${person.engagement ?? 50}%` }} /></div><div className={`well-tag ${cls}`}>{tag}</div></div></div>)}</div></div>
      <div className="dash-2col" style={{ marginTop: 28 }}>
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="times" size={13} /> {ct("{Voluntarios} por time")} <HelpDot text={ct("Quantos {voluntarios} cada time tem hoje.")} /></span><button className="panel-link" type="button" onClick={() => setRoute("times")}>Times</button></div><div className="panel-body flush">{ministries.map((ministry) => <div className="dist-row" key={ministry.id}><span className="dist-name">{ministry.name}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(ministry.people.length / maxMinistry) * 100}%` }} /></div><span className="dist-num">{ministry.people.length}</span></div>)}</div></div>
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="membros" size={13} /> {ct("Membros por {caminhada}")} <HelpDot text={ct("Em qual etapa da {caminhada} (decisão, batismo, curso, GC, servindo) cada membro está.")} /></span><span className="panel-meta">{members.length} pessoas</span></div><div className="panel-body flush">{caminhadaEtapas.map((step, index) => { const count = members.filter((member) => member.journey[index]).length; return <div className="dist-row" key={step}><span className="dist-name">{step}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${members.length ? (count / members.length) * 100 : 0}%` }} /></div><span className="dist-num">{count}</span></div>; })}</div></div>
      </div>
      <div className="dash-2col" style={{ marginTop: 28 }}>
        {gruposAtivo && <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="membros" size={13} /> Membros por {gruposSigla} <HelpDot text="Quantos membros cada grupo tem hoje." /></span><span className="panel-meta">{fellowshipGroups.length} grupos</span></div><div className="panel-body flush">{gcCounts.map(({ group, n }) => <div className="dist-row" key={group.id}><span className="dist-name">{group.name}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(n / maxGc) * 100}%` }} /></div><span className="dist-num">{n}</span></div>)}{fellowshipGroups.length === 0 && <div className="empty" style={{ padding: "12px 0" }}>Nenhum grupo cadastrado ainda.</div>}</div></div>}
        <div className="panel"><div className="panel-head"><span className="panel-title"><Icon name="comunicacao" size={13} /> Operação conectada <HelpDot text="O quanto o time usa quadros de tarefas, conversas e a agenda de eventos." /></span><span className="panel-meta">Kanban & chat</span></div><div className="panel-body flush">{[["Quadros", boards.length], ["Conversas", chats.length], ["Eventos", events.length]].map(([label, count]) => <div className="dist-row" key={label}><span className="dist-name">{label}</span><div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(Number(count) / maxOps) * 100}%` }} /></div><span className="dist-num">{count}</span></div>)}</div></div>
      </div>
    </div>
  );
}
