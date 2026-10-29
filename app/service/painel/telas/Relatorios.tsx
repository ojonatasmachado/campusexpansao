"use client";

import { partesNoFuso } from "../../lib/fuso";
import { formatDateBR, parseISODate, toISODate } from "../../lib/date";
import { useRelogioDaIgreja } from "../../lib/relogio-context";

import { plural } from "../../lib/plural";
import { useState } from "react";
import { Icon } from "../../lib/icons";

import { useTermos } from "../../lib/vocabulario-context";
import { HelpDot } from "../../HelpSystem";
import { baixarCsv } from "../../lib/csv";
import { Av, PageHead } from "../ui";
import { cargaDaSemana } from "../../modules/escalas/Escalas";
import { ROUTES } from "../comum";
import { Indicador } from "../../ui/Indicador";
import type { BoardView, ChatView, ChurchView, DecisionView, DrawerState, EnrollmentView, EventAttendanceView, EventView, FellowshipGroupView, MemberView, MinistryView, PersonView, RosterAssignmentView, TimelineEventView, VisitorView } from "../tipos";
import { numerosDaBase, numerosDoPeriodo, etapasDaCaminhada, periodoDe, anteriorDe, comparacao, type DadosSaude, type ItemPessoa, type Periodo, type Preset } from "../../modules/inicio/saude";
import { SeletorData } from "../../ui/Data";
import { JRN_STEPS } from "../caminhada";

import { Botao } from "../../ui/Botao";
import { Opcao } from "../../ui/Opcao";
import { Cartao } from "../../ui/Cartao";
import { Segmentado } from "../../ui/Segmentado";
import { Vazio } from "../../ui/Estados";
import { Barras, Distribuicao } from "../../ui/Graficos";
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
  setRoute,
  setDrawer,
  church,
  decisions = [],
  timelineEvents = [],
  enrollments = [],
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
  setRoute: (route: keyof typeof ROUTES) => void;
  setDrawer?: (drawer: DrawerState) => void;
  church: ChurchView | undefined;
  decisions?: DecisionView[];
  timelineEvents?: TimelineEventView[];
  enrollments?: EnrollmentView[];
}) {
  const { aindaVaiAcontecer, todayISO, fuso } = useRelogioDaIgreja();
  const { comTermos: ct } = useTermos();
  const gruposAtivo = church?.settings?.gruposCfg?.ativo ?? true;
  const gruposSigla = church?.settings?.gruposCfg?.sigla ?? "GC";
  /* recorte das comparações: últimos 30 dias ou trimestre (90), sempre contra o período anterior de mesmo tamanho */
  const [periodo, setPeriodo] = useState<30 | 90>(30);
  const P = periodo;
  /* "agora" fixado quando a tela abre: os recortes não mudam a cada renderização */
  const [hoje] = useState(() => Date.now());
  const diasAtras = (iso: string) => (hoje - new Date(iso).getTime()) / 86400000;

  /* membros na rede: delta = novos no período vs. período anterior (member.createdAt real) */
  const membrosDelta = members.filter((m) => diasAtras(m.createdAt) >= 0 && diasAtras(m.createdAt) < P).length - members.filter((m) => diasAtras(m.createdAt) >= P && diasAtras(m.createdAt) < 2 * P).length;

  /* Conversão dos cadastros no recorte escolhido; não mistura o total histórico
     com a comparação de outra safra. Sem visitantes, não há taxa calculável. */
  const retencaoPeriodo = (min: number, max: number) => {
    const cohort = visitors.filter((v) => diasAtras(v.created_at) >= min && diasAtras(v.created_at) < max);
    return cohort.length ? Math.round((cohort.filter((v) => v.stage === "membro").length / cohort.length) * 100) : null;
  };
  const retencaoAtual = retencaoPeriodo(0, P);
  const retencaoAnterior = retencaoPeriodo(P, 2 * P);
  const retencaoDelta = retencaoAtual !== null && retencaoAnterior !== null ? retencaoAtual - retencaoAnterior : null;

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
    const cultosPeriodo = events.filter((e) => cultoIds.has(e.id) && !aindaVaiAcontecer(e.eventDate, e.time, e.timeZone) && diasAtras(e.eventDate) >= min && diasAtras(e.eventDate) < max);
    if (!cultosPeriodo.length) return null;
    const total = cultosPeriodo.reduce((sum, ev) => sum + eventAttendance.filter((a) => a.event_id === ev.id).length, 0);
    return Math.round(total / cultosPeriodo.length);
  };
  const freqRecente = frequenciaPeriodo(0, P);
  const freqAnterior = frequenciaPeriodo(P, 2 * P);
  const freqDelta = freqRecente !== null && freqAnterior !== null ? freqRecente - freqAnterior : null;

  const foot = (delta: number | null, unidade: string, fallback: string) => delta === null ? fallback : `${delta >= 0 ? "+" : "−"}${Math.abs(delta)}${unidade} em relação ${P === 90 ? "ao trimestre anterior" : "aos 30 dias anteriores"}`;

  /* termômetro de bem-estar sem sobreposição: carga real da semana via roster, não engajamento alto ‒
     equivalente a bemEstar() em evolucoes/service_app/relatorios.jsx:19-27, sem o override de sinais (mock-only) */
  const carga = cargaDaSemana(roster, events, todayISO());
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
  const wellRows = niveis.filter((v) => v.nivel !== "saudavel").map(({ person, nivel }) => ({ person, cls: nivel }));

  /* membros cadastrados até o fim de cada um dos últimos 4 meses, terminando no mês atual */
  const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const agora = parseISODate(todayISO())!;
  const mesesSerie = [3, 2, 1, 0].map((k) => new Date(agora.getFullYear(), agora.getMonth() - k + 1, 1));
  const series = mesesSerie.map((fim) => members.filter((m) => m.createdAt && partesNoFuso(new Date(m.createdAt), fuso).data < toISODate(fim)).length);
  const serieLabels = mesesSerie.map((fim) => MES_CURTO[new Date(fim.getFullYear(), fim.getMonth() - 1, 1).getMonth()]);
  const maxMinistry = Math.max(...ministries.map((m) => m.people.length), 1);
  const gcCounts = fellowshipGroups.map((g) => ({ group: g, n: members.filter((m) => m.groupId === g.id).length }));
  const maxGc = Math.max(...gcCounts.map((x) => x.n), 1);

  /* v7 I1: Números de base e panorama completo migrados do Início (lei 14).
     Os 3 números de base ficam visíveis sempre; período/comparação/etapas sob demanda. */
  const dadosSaude: DadosSaude = {
    membros: members,
    pessoas: people,
    times: ministries,
    visitantes: visitors,
    decisoes: decisions ?? [],
    fatos: timelineEvents ?? [],
    matriculas: enrollments ?? [],
  };
  const SAUDE_PRESETS: { v: Preset; l: string }[] = [
    { v: "30", l: "30 dias" },
    { v: "90", l: "90 dias" },
    { v: "365", l: "12 meses" },
    { v: "datas", l: "Datas" },
  ];
  const [saudePreset, setSaudePreset] = useState<Preset>("30");
  const [saudeDatas, setSaudeDatas] = useState<Periodo>(() => periodoDe("30", undefined, todayISO()));
  const [saudePanorama, setSaudePanorama] = useState(false);
  const saudePeriodo = periodoDe(saudePreset, saudeDatas, todayISO());
  const saudeAnt = anteriorDe(saudePeriodo);
  const saudeDias = Math.round((new Date(`${saudePeriodo.fim}T12:00:00Z`).getTime() - new Date(`${saudePeriodo.ini}T12:00:00Z`).getTime()) / 86400000) + 1;
  const baseNums = numerosDaBase(dadosSaude);
  const abrirListaBase = (item: ItemPessoa) => {
    if (item.tipo === "member") { setRoute("membros"); setDrawer?.({ kind: "member", id: item.id }); }
    else if (item.tipo === "person") { setRoute("pessoas"); setDrawer?.({ kind: "person", id: item.id }); }
    else if (item.tipo === "visitor") { setRoute("visitantes"); setDrawer?.({ kind: "visitor", id: item.id }); }
    else if (item.tipo === "decision") { setRoute("decisoes"); setDrawer?.({ kind: "decision", id: item.id }); }
    else { setRoute("membros"); }
  };
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
    const dia = todayISO();
    const linhas: (string | number)[][] = [
      ["Seção", "Indicador", "Valor"],
      ["Relatório", "Igreja", church?.nome ?? ""],
      ["Relatório", "Gerado em", dia],
      ["Relatório", "Recorte", recorte],
      ["Indicadores", "Membros na rede", members.length],
      ["Indicadores", "Membros novos no recorte", members.filter((m) => diasAtras(m.createdAt) >= 0 && diasAtras(m.createdAt) < P).length],
      ["Indicadores", "Visitantes convertidos no recorte (%)", retencaoAtual ?? "Sem dados"],
      ["Indicadores", "Confirmações de escala (%)", coberturaRecente ?? "Sem dados"],
      ["Indicadores", ct("Média de check-ins por {culto}"), freqRecente ?? "Sem dados"],
      /* v7 I1: números de base via numerosDaBase() — mesma fonte da tela (lei 14) */
      ...baseNums.map((n) => ["Números de base" as const, ct(n.rotulo), n.valor]),
      ...serieLabels.map((l, i) => ["Crescimento de membros", l, series[i]]),
      ...FUNNEL_STAGES.map((st, i) => ["Funil de visitantes", st.label, funnelCounts[i]]),
      ...[["saudavel", "Sem pendência registrada"], ["atencao", "Uma recusa"], ["sobrecarga", "Três ou mais escalas"], ["afastando", "Pausa ou duas recusas"]].map(([k, l]) => ["Escala da semana", l, contar(k)]),
      ...ministries.map((m) => [ct("{Voluntarios} por time"), m.name, m.people.length]),
      ...caminhadaEtapas.map((st, i) => [ct("Membros por {caminhada}"), st, members.filter((m) => m.journey[i]).length]),
      ...(gruposAtivo ? gcCounts.map(({ group, n }) => [`Membros por ${gruposSigla}`, group.name, n]) : []),
    ];
    baixarCsv(`relatorio-${P === 90 ? "trimestre" : "30-dias"}-${dia}.csv`, linhas);
  };
  return (
    <div className="content wide">
      <PageHead title="Relatórios e indicadores" eyebrow="Gestão" help="A saúde da igreja num lugar: crescimento, cobertura de escala e registros de quem serve. Use o recorte de trimestre pra comparar." action={<><Segmentado role="group" aria-label="Recorte das comparações">{([[30, "30 dias"], [90, "Trimestre"]] as const).map(([v, l]) => <Opcao key={v} marcada={periodo === v} aria-pressed={periodo === v} onClick={() => setPeriodo(v)}>{l}</Opcao>)}</Segmentado><Botao variante="principal" onClick={baixarRelatorio}>Baixar relatório →</Botao></>} />
      <div className="kpi-row"><Indicador icone="visitante" rotulo="Visitantes que viraram membros" valor={retencaoAtual === null ? "Sem dados" : `${retencaoAtual}%`} rodape={foot(retencaoDelta, " pp", retencaoAtual === null ? "nenhum visitante no recorte" : "dos cadastrados no recorte")} ajuda="Percentual dos visitantes cadastrados no período escolhido que estão na etapa de membro. Cadastros recentes ainda podem estar no início da jornada." /><Indicador icone="escalas" rotulo="Confirmações de escala" valor={coberturaRecente === null ? "Sem dados" : `${coberturaRecente}%`} rodape={foot(coberturaDelta, " pp", coberturaRecente === null ? "nenhuma escala no recorte" : "das vagas escaladas no recorte")} ajuda="Das pessoas escaladas nos eventos do período escolhido, quantas confirmaram. Não mede vagas ainda sem uma pessoa escalada." /><Indicador icone="cultos" rotulo="Média de check-ins" valor={freqRecente ?? "Sem dados"} rodape={foot(freqDelta, "", freqRecente === null ? ct("nenhum {culto} no recorte") : ct("por {culto} no recorte"))} ajuda={ct("Check-ins registrados divididos pelo número de {cultos} no período. Zero check-ins não comprova ausência de pessoas.")} /></div>
      {/* v7 I1: Números de base migrados do Início (lei 14). Indicador cartao, cada número abre a lista. Sem duplicar "Membros na rede". */}
      <div className="section-divide"><span className="num">01</span><span className="label">Números de base</span><span className="line" /></div>
      <div className="kpi-row">
        {baseNums.map((n) => (
          <Indicador key={n.id} estilo="cartao" icone={n.id === "membros" ? "membros" : n.id === "servindo" ? "escalas" : "grupos"} valor={n.valor} rotulo={ct(n.rotulo)}
            aoAbrir={n.itens.length ? () => abrirListaBase(n.itens[0]) : undefined}
            rotuloAcao={`${ct(n.rotulo)}: ${n.valor}. Ver a lista`} />
        ))}
      </div>
      <div className="saude-head">
        <Botao variante="texto" onClick={() => setSaudePanorama((v) => !v)}>
          {saudePanorama ? "Recolher panorama" : "Ver panorama completo"} →
        </Botao>
      </div>
      {saudePanorama && (
        <>
          <div className="saude-datas">
            <Segmentado className="seg-sm" role="radiogroup" aria-label="Período">
              {SAUDE_PRESETS.map((p) => (
                <Opcao key={p.v} role="radio" aria-checked={saudePreset === p.v} marcada={saudePreset === p.v} onClick={() => setSaudePreset(p.v)}>{p.l}</Opcao>
              ))}
            </Segmentado>
            {saudePreset === "datas" && (
              <div className="saude-datas-range">
                <div>De <SeletorData rotulo="De" valor={saudeDatas.ini} aoMudar={(v) => setSaudeDatas((d) => ({ ...d, ini: v }))} /></div>
                <div>até <SeletorData rotulo="Até" valor={saudeDatas.fim} aoMudar={(v) => setSaudeDatas((d) => ({ ...d, fim: v }))} /></div>
              </div>
            )}
          </div>
          <div className="saude-grp">{`De ${formatDateBR(saudePeriodo.ini)} a ${formatDateBR(saudePeriodo.fim)}`}<span className="saude-grp-s">{` · comparado a ${formatDateBR(saudeAnt.ini)} a ${formatDateBR(saudeAnt.fim)}`}</span></div>
          <div className="kpi-row">
            {numerosDoPeriodo(dadosSaude, saudePeriodo).map((n) => {
              const cmp = comparacao(n.valor, n.anterior, saudeDias);
              const mudou = n.anterior !== undefined && n.anterior !== n.valor;
              return (
                <Indicador key={n.id} estilo="numero" valor={n.valor} rotulo={ct(n.rotulo)}
                  rodape={cmp && mudou ? cmp : undefined}
                  aoAbrir={n.itens.length ? () => abrirListaBase(n.itens[0]) : undefined}
                  rotuloAcao={`${ct(n.rotulo)}: ${n.valor}${cmp ? `, ${cmp}` : ""}. Ver a lista`} />
              );
            })}
          </div>
          <div className="saude-grp">{ct("Etapas da {caminhada}")}<span className="saude-grp-s"> · membros que já fizeram cada uma</span></div>
          <div className="kpi-row">
            {etapasDaCaminhada(members, JRN_STEPS.map((s) => ({ label: ct(s.label) }))).map((n) => (
              <Indicador key={n.id} estilo="numero" valor={n.valor} rotulo={n.rotulo}
                aoAbrir={n.itens.length ? () => abrirListaBase(n.itens[0]) : undefined}
                rotuloAcao={`${n.rotulo}: ${n.valor}. Ver a lista`} />
            ))}
          </div>
        </>
      )}
      <div className="dash-3col">
        <Cartao><div className="panel-head"><span className="panel-title"><Icon name="relatorios" size={13} /> Crescimento de membros <HelpDot text="Quantos membros novos entraram nos últimos meses." /></span><span className="panel-meta">últimos meses</span></div><div className="panel-body"><div style={{ fontSize: "var(--fs-pn-32)", fontWeight: 700 }}>{members.length}<span style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)", fontWeight: 500, marginLeft: 8 }}>membros no total</span></div><div style={{ marginTop: 14 }}><Barras rotulo="Membros novos por mês" serie={series} rotulos={serieLabels} /></div></div></Cartao>
        <Cartao><div className="panel-head"><span className="panel-title"><Icon name="visitante" size={13} /> Funil de visitantes <HelpDot text="Quantos visitantes estão em cada etapa, da primeira visita até virar membro." /></span><Botao variante="texto" onClick={() => setRoute("visitantes")}>Abrir</Botao></div><div className="panel-body flush"><Distribuicao funil max={funnelMax} itens={FUNNEL_STAGES.map((s, i) => ({ id: s.id, rotulo: s.label, valor: funnelCounts[i] }))} /></div></Cartao>
      </div>
      <div className="section-divide" style={{ marginTop: 28 }}><span className="num">02</span><span className="label">Situação da escala na semana</span><span className="line" /></div>
      <div className="well-sum">{[["saudavel", contar("saudavel"), "Sem pendência registrada"], ["atencao", contar("atencao"), "Uma recusa"], ["sobrecarga", contar("sobrecarga"), "Três ou mais escalas"], ["afastando", contar("afastando"), "Pausa ou duas recusas"]].map(([level, count, label]) => <div className="well-pill" key={level}><div className="n">{count}</div><div className="l"><span className={`well-dot ${level}`} />{label}</div></div>)}</div>
      <Cartao>
        <div className="panel-head"><span className="panel-title"><Icon name="pessoa" size={13} /> Registros para conferir <HelpDot text="Pausas, recusas e quantidade de escalas registradas nesta semana. Esses fatos não medem bem-estar nem dedicação da pessoa." /></span><Botao variante="texto" onClick={() => setRoute("pessoas")}>{ct("{Voluntarios}")}</Botao></div>
        <div className="panel-body flush">
          {wellRows.length === 0 && <Vazio titulo="Nenhuma pendência identificada nos registros da semana." />}
          {wellRows.slice(0, 8).map(({ person, cls }) => {
            const dado = carga[person.id] ?? { escalas: 0, recusas: 0 };
            return <div className="well-row" key={person.id}><Av name={person.name} size="md" photoUrl={person.photoUrl} /><div className="mini-main"><div className="mini-title">{person.name}</div><div className="mini-sub">{person.status === "pausa" ? "Pausa informada no cadastro." : `${plural(dado.escalas, "escala")} e ${plural(dado.recusas, "recusa")} nesta semana.`}</div></div><span className={`well-tag ${cls}`}>Conferir</span></div>;
          })}
        </div>
      </Cartao>
      <div className="dash-2col" style={{ marginTop: 28 }}>
        <Cartao><div className="panel-head"><span className="panel-title"><Icon name="times" size={13} /> {ct("{Voluntarios} por time")} <HelpDot text={ct("Quantos {voluntarios} cada time tem hoje.")} /></span><Botao variante="texto" onClick={() => setRoute("times")}>Times</Botao></div><div className="panel-body flush"><Distribuicao max={maxMinistry} itens={ministries.map((ministry) => ({ id: ministry.id, rotulo: ministry.name, valor: ministry.people.length }))} /></div></Cartao>
        <Cartao><div className="panel-head"><span className="panel-title"><Icon name="membros" size={13} /> {ct("Membros por {caminhada}")} <HelpDot text={ct("Em qual etapa da {caminhada} (decisão, batismo, curso, GC, servindo) cada membro está.")} /></span><span className="panel-meta">{members.length} pessoas</span></div><div className="panel-body flush"><Distribuicao max={members.length} itens={caminhadaEtapas.map((step, index) => ({ id: step, rotulo: step, valor: members.filter((member) => member.journey[index]).length }))} /></div></Cartao>
      </div>
      <div className="dash-2col" style={{ marginTop: 28 }}>
        {gruposAtivo && <Cartao><div className="panel-head"><span className="panel-title"><Icon name="membros" size={13} /> Membros por {gruposSigla} <HelpDot text="Quantos membros cada grupo tem hoje." /></span><span className="panel-meta">{fellowshipGroups.length} grupos</span></div><div className="panel-body flush"><Distribuicao max={maxGc} itens={gcCounts.map(({ group, n }) => ({ id: group.id, rotulo: group.name, valor: n }))} />{fellowshipGroups.length === 0 && <Vazio titulo="Nenhum grupo cadastrado ainda." />}</div></Cartao>}
        <Cartao><div className="panel-head"><span className="panel-title"><Icon name="comunicacao" size={13} /> Operação conectada <HelpDot text="O quanto o time usa quadros de tarefas, conversas e a agenda de eventos." /></span><span className="panel-meta">Kanban & chat</span></div><div className="panel-body flush"><Distribuicao max={maxOps} itens={([["Quadros", boards.length], ["Conversas", chats.length], ["Eventos", events.length]] as const).map(([label, count]) => ({ id: label, rotulo: label, valor: count }))} /></div></Cartao>
      </div>
    </div>
  );
}
