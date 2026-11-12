"use client";

/* Escala de um período inteiro (1 a 12 meses). Dois passos na mesma tela de
   formulário: o que montar (times, período, cultos, vagas por função) e a
   prévia culto a culto, com avisos e troca manual. Salvar grava como
   rascunho: ninguém é avisado até "Publicar e avisar". As regras moram em
   ./periodo.ts (puro, testado em scripts/check-escala-periodo.ts). */

import { useId, useMemo, useRef, useState } from "react";
import { FormScreen, FormSection, type FormScreenHandle } from "../../painel/form/FormScreen";
import { Av } from "../../painel/ui";
import { Icon } from "../../lib/icons";
import { avisar } from "../../lib/avisar";
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { formatDateBR, joinDot, parseISODate } from "../../lib/date";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { friendlyWriteError } from "../../painel/erros";
import { useTermos } from "../../lib/vocabulario-context";
import type { Candidato } from "./candidatos";
import type { EscalaSettings } from "./regras";
import {
  avaliarPeriodo, cultosDoPeriodo, fimDoPeriodo, gerarPeriodo, linhasDaProposta, opcoesDaVaga, periodoValido, seriesDaAgenda, timesDoCulto,
  type Aviso, type CultoPlano, type EntradaPeriodo, type Proposta, type TimePlano,
} from "./periodo";
import type { ChurchView, EventView, MinistryView, PersonView, RosterAssignmentView } from "../../ServiceExactApp";

import { Botao } from "../../ui/Botao";
import { Janela } from "../../ui/Janela";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Campo, Marcar } from "../../ui/Campo";
import { SeletorData } from "../../ui/Data";
import { Vazio } from "../../ui/Estados";
import { useTexto } from "../../lib/internacional/contexto";
const DIA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIA_LONGO = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DURACOES = [1, 3, 6, 12] as const;
type Duracao = (typeof DURACOES)[number] | "datas";

const nomeDoMes = (mes: string) => {
  const d = parseISODate(`${mes}-01`);
  if (!d) return mes;
  const t = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const diaCurto = (iso: string) => DIA_CURTO[parseISODate(iso)?.getDay() ?? 0];
const novoId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

async function emLotes<T>(itens: T[], tamanho: number, fn: (lote: T[]) => PromiseLike<{ error: { message: string } | null }>) {
  for (let i = 0; i < itens.length; i += tamanho) {
    const { error } = await fn(itens.slice(i, i + tamanho));
    if (error) return error;
  }
  return null;
}

type Vaga = { culto: string; timeId: string; funcaoId: string; funcao: string; time: string; atual?: string };

export function GerarPeriodo({
  ministries,
  people,
  events,
  roster,
  church,
  cfg,
  onClose,
  onSalvo,
}: {
  /** times que quem está montando pode escalar */
  ministries: MinistryView[];
  people: PersonView[];
  events: EventView[];
  roster: RosterAssignmentView[];
  church: ChurchView | undefined;
  cfg: EscalaSettings;
  onClose: () => void;
  onSalvo: (primeiroEventoId: string | null) => void;
}) {
  const traduzirUi = useTexto();

  const { todayISO } = useRelogioDaIgreja();
  const { comTermos: ct } = useTermos();
  const fid = useId();
  const telaRef = useRef<FormScreenHandle>(null);
  const hoje = todayISO();
  const comFuncoes = ministries.filter((m) => m.positions.length > 0);

  /* ── passo 1: o que montar ─────────────────────────────────────────────── */
  const [timesSel, setTimesSel] = useState<Set<string>>(() => new Set(comFuncoes.filter((m) => m.people.length > 0).map((m) => m.id)));
  const [inicio, setInicio] = useState(hoje);
  const [duracao, setDuracao] = useState<Duracao>(3);
  const [fimManual, setFimManual] = useState(fimDoPeriodo(hoje, 1));
  const fim = duracao === "datas" ? fimManual : fimDoPeriodo(inicio, duracao);
  const valido = periodoValido(inicio, fim);
  const series = useMemo(() => seriesDaAgenda(events), [events]);
  const [seriesSel, setSeriesSel] = useState<Set<string>>(() => new Set(series.map((s) => s.chave)));
  /* eventos que não se repetem e caem no período (vigília, batismo já marcados) */
  const avulsos = useMemo(() => {
    const emSerie = new Set(cultosDoPeriodo(events, series, inicio, valido ? fim : inicio).map((c) => c.eventId));
    return events.filter((e) => e.eventDate >= inicio && e.eventDate <= fim && !emSerie.has(e.id));
  }, [events, series, inicio, fim, valido]);
  const [avulsosFora, setAvulsosFora] = useState<Set<string>>(() => new Set());
  const [vagas, setVagas] = useState<Record<string, number>>(() => Object.fromEntries(comFuncoes.flatMap((m) => m.positions.map((p) => [p.id, Math.max(1, p.need_count)]))));

  const alternar = (set: Set<string>, id: string) => { const n = new Set(set); if (n.has(id)) n.delete(id); else n.add(id); return n; };

  const entrada: EntradaPeriodo | null = useMemo(() => {
    if (!valido) return null;
    const ids = new Set(people.map((p) => p.id));
    const times: TimePlano[] = comFuncoes.filter((m) => timesSel.has(m.id)).map((m) => ({
      id: m.id,
      nome: m.name,
      pessoas: [...new Set(m.people.map((l) => l.personId))].filter((id) => ids.has(id)),
      funcoes: m.positions.map((p) => ({ id: p.id, nome: p.name, vagas: vagas[p.id] ?? Math.max(1, p.need_count) })).filter((f) => f.vagas > 0),
    }));
    const escolhidas = series.filter((s) => seriesSel.has(s.chave));
    const cultos = cultosDoPeriodo(events, escolhidas, inicio, fim, avulsos.filter((e) => !avulsosFora.has(e.id)).map((e) => e.id))
      /* culto cujo time de nenhum escolhido serve fica de fora */
      .filter((c) => timesDoCulto(c, times).length > 0);
    return { cultos, times, pessoas: people, roster, events: events.map((e) => ({ id: e.id, eventDate: e.eventDate })), cfg };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valido, people, timesSel, vagas, series, seriesSel, events, inicio, fim, avulsos, avulsosFora, roster, cfg]);

  const vagasPorCulto = entrada ? entrada.times.reduce((s, t) => s + t.funcoes.reduce((x, f) => x + f.vagas, 0), 0) : 0;
  const falta = [
    timesSel.size === 0 && traduzirUi("um time"),
    !valido && (duracao === "datas" ? traduzirUi("um período de até 12 meses") : traduzirUi("a data de início")),
    valido && entrada && entrada.cultos.length === 0 && traduzirUi("pelo menos um {culto}"),
    valido && entrada && entrada.cultos.length > 0 && vagasPorCulto === 0 && traduzirUi("pelo menos uma vaga"),
  ].filter(Boolean) as string[];

  /* ── passo 2: prévia ───────────────────────────────────────────────────── */
  const [passo, setPasso] = useState<"form" | "previa">("form");
  const [montando, setMontando] = useState(false);
  const [proposta, setProposta] = useState<Proposta>({});
  const [base, setBase] = useState<EntradaPeriodo | null>(null);
  const [mesesAbertos, setMesesAbertos] = useState<Set<string>>(() => new Set());
  const [soAvisos, setSoAvisos] = useState(false);
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const verPrevia = () => {
    if (!entrada || falta.length) return;
    setMontando(true);
    /* deixa o "Montando" aparecer antes da conta (12 meses com times grandes) */
    window.setTimeout(() => {
      const p = gerarPeriodo(entrada);
      setBase(entrada);
      setProposta(p);
      setMesesAbertos(new Set(entrada.cultos.slice(0, 1).map((c) => c.data.slice(0, 7))));
      setSoAvisos(false);
      setMontando(false);
      setPasso("previa");
      document.querySelector(".fs-body")?.scrollTo({ top: 0 });
    }, 30);
  };

  const resumo = useMemo(() => (base ? avaliarPeriodo(base, proposta) : null), [base, proposta]);
  const pessoaPorId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const nome = (id: string) => pessoaPorId.get(id)?.name ?? "Pessoa";
  const timeNome = (id: string) => ministries.find((m) => m.id === id)?.name ?? "Time";

  /* avisos indexados para marcar cada culto e cada pessoa */
  const marcas = useMemo(() => {
    const porCulto = new Map<string, number>();
    const pessoaNoCulto = new Set<string>();
    const cargaMes = new Set<string>();
    for (const a of resumo?.avisos ?? []) {
      if (a.tipo === "acima_carga") cargaMes.add(`${a.pessoa}@${a.mes}`);
      if ("culto" in a) porCulto.set(a.culto, (porCulto.get(a.culto) ?? 0) + 1);
      if (a.tipo === "indisponivel" || a.tipo === "repetido") pessoaNoCulto.add(`${a.pessoa}@${a.culto}`);
    }
    if (base) for (const c of base.cultos) for (const ids of Object.values(proposta[c.chave] ?? {})) for (const p of ids) if (cargaMes.has(`${p}@${c.data.slice(0, 7)}`)) porCulto.set(c.chave, (porCulto.get(c.chave) ?? 0) + 1);
    return { porCulto, pessoaNoCulto, cargaMes };
  }, [resumo, base, proposta]);

  const meses = useMemo(() => {
    const m = new Map<string, CultoPlano[]>();
    for (const c of base?.cultos ?? []) m.set(c.data.slice(0, 7), [...(m.get(c.data.slice(0, 7)) ?? []), c]);
    return [...m.entries()];
  }, [base]);

  const trocar = (v: Vaga, nova: string | null) => {
    setProposta((prev) => {
      const doCulto = { ...(prev[v.culto] ?? {}) };
      const lista = [...(doCulto[v.funcaoId] ?? [])];
      const i = v.atual ? lista.indexOf(v.atual) : -1;
      if (i >= 0) { if (nova) lista[i] = nova; else lista.splice(i, 1); }
      else if (nova) lista.push(nova);
      doCulto[v.funcaoId] = lista;
      return { ...prev, [v.culto]: doCulto };
    });
    setVaga(null);
  };

  const salvar = async () => {
    if (!base || !resumo || salvando) return;
    if (!church?.id) { setErro(traduzirUi("Nenhuma igreja encontrada para gravar a escala.")); return; }
    setSalvando(true);
    setErro("");
    const sb = createServiceBrowserClient().schema("service");
    const org = church.organizationId;
    const idDe = new Map<string, string>();
    const novos = base.cultos.filter((c) => !c.eventId);
    const serieDe = new Map(series.map((s) => [s.chave, s]));
    for (const c of novos) idDe.set(c.chave, novoId());
    const eventosNovos = novos.map((c) => {
      const s = c.serie ? serieDe.get(c.serie) : undefined;
      return {
        id: idDe.get(c.chave), organization_id: org, church_id: church.id, name: c.nome, kind: s?.kind || "Culto", event_date: c.data, weekday: diaCurto(c.data),
        time: c.hora || null, slot: c.slot || null, location: s?.local || church.address || church.nome || null, room_id: s?.roomId ?? null, ministries: c.times,
      };
    });
    const desfazer = async () => {
      const ids = [...idDe.values()];
      if (!ids.length) return;
      await sb.from("reservations").delete().eq("source_type", "evento").in("source_id", ids);
      await sb.from("events").delete().in("id", ids);
    };
    let error = await emLotes(eventosNovos, 200, (lote) => sb.from("events").insert(lote));
    if (!error) {
      const reservas = eventosNovos.filter((e) => e.room_id).map((e) => ({
        organization_id: org, room_id: e.room_id, title: e.name, kind: "culto", reserved_date: e.event_date, start_time: e.time, source_type: "evento", source_id: e.id,
      }));
      error = await emLotes(reservas, 200, (lote) => sb.from("reservations").insert(lote));
    }
    const status = cfg.modo === "automatico" ? "ok" : "wait";
    const linhas = linhasDaProposta(base, proposta, (c) => c.eventId ?? idDe.get(c.chave) ?? null)
      .map((l) => ({ ...l, organization_id: org, status, rascunho: true }));
    if (!error) error = await emLotes(linhas, 500, (lote) => sb.from("roster_assignments").insert(lote));
    if (error) {
      await desfazer();
      setSalvando(false);
      setErro(/rascunho/i.test(error.message) ? traduzirUi("Esta versão do banco ainda não guarda a escala como rascunho. Nada foi gravado.") : traduzirUi("{erro} Nada foi gravado.", { erro: friendlyWriteError(error.message, traduzirUi) }));
      return;
    }
    avisar(traduzirUi("Rascunho salvo: {escalacoes, plural, =1 {# escalação} other {# escalações}} em {eventos, plural, =1 {# {culto}} other {# {cultos}}}. Revise e publique quando quiser.", { escalacoes: linhas.length, eventos: base.cultos.length }));
    if (telaRef.current) await telaRef.current.fechar();
    onSalvo(base.cultos.find((c) => Object.keys(proposta[c.chave] ?? {}).length)?.eventId ?? idDe.get(base.cultos[0]?.chave ?? "") ?? null);
  };

  /* ── telas ─────────────────────────────────────────────────────────────── */
  if (passo === "form") {
    const periodoTexto = valido ? traduzirUi("De {inicio} a {fim}", { inicio: formatDateBR(inicio), fim: formatDateBR(fim) }) : "";
    return (
      <FormScreen
        ref={telaRef}
        eyebrow={traduzirUi("Escalas")}
        title={traduzirUi("Montar a escala do período")}
        subtitle={ct(traduzirUi("Escolha os times, o período e os {cultos}. Você vê a escala inteira antes de salvar, e ninguém é avisado até você publicar."))}
        saveLabel={montando ? traduzirUi("Montando…") : traduzirUi("Ver prévia")}
        saving={montando}
        missing={falta}
        dirty
        onSave={verPrevia}
        onClose={onClose}
      >
        <FormSection title={traduzirUi("Times")}>
          {comFuncoes.length === 0 ? (
            <p className="fs-note">{traduzirUi("Nenhum time com funções ainda. Cadastre as funções em Times para montar a escala.")}</p>
          ) : (
            <div className="per-lista">
              {comFuncoes.map((m) => (
                <Marcar className="fs-check" key={m.id} checked={timesSel.has(m.id)} onChange={() => setTimesSel((s) => alternar(s, m.id))}>
                  <span className="per-check-txt">
                    <span className="per-check-t">{m.name}</span>
                    <span className="per-check-s">{m.people.length ? joinDot(traduzirUi("{count, plural, =1 {# pessoa} other {# pessoas}}", { count: m.people.length }), traduzirUi("{count, plural, =1 {# função} other {# funções}}", { count: m.positions.length })) : traduzirUi("Ninguém no time ainda")}</span>
                  </span>
                </Marcar>
              ))}
            </div>
          )}
        </FormSection>

        <FormSection title={traduzirUi("Período")}>
          <div className="fs-grid">
            <Campo rotulo={traduzirUi("Começa em")} obrigatorio id={`${fid}-ini`} className="half">
              <SeletorData valor={inicio} aoMudar={setInicio} />
            </Campo>
            {duracao === "datas" && (
              <Campo rotulo={traduzirUi("Termina em")} obrigatorio id={`${fid}-fim`} className="half">
                <SeletorData valor={fimManual} min={inicio} max={fimDoPeriodo(inicio || hoje, 12)} aoMudar={setFimManual} />
              </Campo>
            )}
            <div className="field">
              <div className="field-label" id={`${fid}-dur`}>{traduzirUi("Duração")}</div>
              <div className="fs-chips" role="group" aria-labelledby={`${fid}-dur`}>
                {DURACOES.map((n) => (
                  <Opcao key={n} marcada={duracao === n} estilo="seg-chip" aria-pressed={duracao === n} onClick={() => setDuracao(n)}>{traduzirUi("{count, plural, =1 {# mês} other {# meses}}", { count: n })}</Opcao>
                ))}
                <Opcao marcada={duracao === "datas"} estilo="seg-chip" aria-pressed={duracao === "datas"} onClick={() => { setFimManual(fim); setDuracao("datas"); }}>{traduzirUi("Escolher o fim")}</Opcao>
              </div>
              <div className="field-hint">{valido ? periodoTexto : traduzirUi("O período vai de 1 dia a 12 meses.")}</div>
            </div>
          </div>
        </FormSection>

        <FormSection title={ct(traduzirUi("{Cultos} que entram"))}>
          {series.length === 0 && avulsos.length === 0 ? (
            <p className="fs-note">{ct(traduzirUi("Nenhum {culto} na agenda ainda. Crie o {culto} de domingo na Agenda, ou use Escala extra para um evento avulso."))}</p>
          ) : (
            <div className="per-lista">
              {series.map((s) => {
                const n = valido ? cultosDoPeriodo(events, [s], inicio, fim) : [];
                const criar = n.filter((c) => !c.eventId).length;
                return (
                  <Marcar className="fs-check" key={s.chave} checked={seriesSel.has(s.chave)} onChange={() => setSeriesSel((x) => alternar(x, s.chave))}>
                    <span className="per-check-txt">
                      <span className="per-check-t">{s.nome}</span>
                      <span className="per-check-s">{joinDot(traduzirUi("Toda {dia}", { dia: DIA_LONGO[s.diaSemana].toLowerCase() }), s.hora, valido && traduzirUi("{count, plural, =1 {# data} other {# datas}}", { count: n.length }), criar > 0 && traduzirUi("{count, plural, =1 {{n} entra} other {{n} entram}} na agenda", { count: criar, n: String(criar) }))}</span>
                    </span>
                  </Marcar>
                );
              })}
              {avulsos.map((e) => (
                <Marcar className="fs-check" key={e.id} checked={!avulsosFora.has(e.id)} onChange={() => setAvulsosFora((x) => alternar(x, e.id))}>
                  <span className="per-check-txt">
                    <span className="per-check-t">{e.name}</span>
                    <span className="per-check-s">{joinDot(diaCurto(e.eventDate), formatDateBR(e.eventDate), e.time, traduzirUi("uma vez"))}</span>
                  </span>
                </Marcar>
              ))}
            </div>
          )}
        </FormSection>

        {entrada && entrada.times.length > 0 && (
          <FormSection title={traduzirUi("Vagas por função")}>
            <p className="fs-note" style={{ marginTop: 0 }}>{ct(traduzirUi("Quantas pessoas cada função precisa em cada {culto}. Zero deixa a função fora deste período. Não muda o cadastro do time."))}</p>
            {comFuncoes.filter((m) => timesSel.has(m.id)).map((m) => (
              <div className="per-func" key={m.id}>
                <div className="per-func-time">{m.name}</div>
                {m.positions.map((p) => (
                  <div className="per-func-row" key={p.id}>
                    <span className="per-func-nome">{p.name}</span>
                    <div className="stepper">
                      <Acao aria-label={traduzirUi("Menos uma vaga em {funcao}", { funcao: p.name })} onClick={() => setVagas((v) => ({ ...v, [p.id]: Math.max(0, (v[p.id] ?? 1) - 1) }))}>−</Acao>
                      <span aria-live="polite">{vagas[p.id] ?? 1}</span>
                      <Acao aria-label={traduzirUi("Mais uma vaga em {funcao}", { funcao: p.name })} onClick={() => setVagas((v) => ({ ...v, [p.id]: Math.min(30, (v[p.id] ?? 1) + 1) }))}>+</Acao>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {entrada.cultos.length > 0 && <div className="fs-calc ok">{traduzirUi("{eventos, plural, =1 {# {culto}} other {# {cultos}}} · {vagas, plural, =1 {# vaga} other {# vagas}} no período", { eventos: entrada.cultos.length, vagas: entrada.cultos.reduce((s, c) => s + timesDoCulto(c, entrada.times).reduce((x, t) => x + t.funcoes.reduce((y, f) => y + f.vagas, 0), 0), 0) })}</div>}
          </FormSection>
        )}
      </FormScreen>
    );
  }

  /* prévia */
  const r = resumo!;
  const semGente = r.avisos.filter((a): a is Extract<Aviso, { tipo: "sem_gente" }> => a.tipo === "sem_gente");
  const acima = r.avisos.filter((a): a is Extract<Aviso, { tipo: "acima_carga" }> => a.tipo === "acima_carga");
  const outros = r.avisos.filter((a) => a.tipo === "indisponivel" || a.tipo === "repetido").length;
  const semPessoas = r.avisos.filter((a): a is Extract<Aviso, { tipo: "sem_pessoas" }> => a.tipo === "sem_pessoas");
  const alternarMes = (mes: string) => setMesesAbertos((s) => alternar(s, mes));
  const primeiroComAviso = base?.cultos.find((c) => marcas.porCulto.has(c.chave));

  return (
    <FormScreen
      ref={telaRef}
      eyebrow={traduzirUi("Prévia · {inicio} a {fim}", { inicio: formatDateBR(base?.cultos[0]?.data), fim: formatDateBR(base?.cultos[base.cultos.length - 1]?.data) })}
      title={traduzirUi("Escala do período")}
      saveLabel={traduzirUi("Salvar rascunho")}
      saving={salvando}
      dirty
      error={erro}
      onSave={salvar}
      onClose={onClose}
    >
      <div className="per-resumo" role="status">
        <div className="per-num"><b>{base?.cultos.length ?? 0}</b><span>{ct(base?.cultos.length === 1 ? "{culto}" : "{cultos}")}</span></div>
        <div className="per-num"><b>{r.propostas + r.salvas}</b><span>{traduzirUi("de {vagas, plural, =1 {# vaga} other {# vagas}} preenchidas", { vagas: r.vagas })}</span></div>
        <div className={`per-num${r.faltam ? " falta" : ""}`}><b>{r.faltam}</b><span>{r.faltam === 1 ? traduzirUi("vaga aberta") : traduzirUi("vagas abertas")}</span></div>
      </div>
      <p className="fs-note">
        {joinDot(
          r.novos > 0 && traduzirUi("{count, plural, =1 {# {culto} novo entra} other {# {cultos} novos entram}} na agenda", { count: r.novos }),
          r.salvas > 0 && traduzirUi("{count, plural, =1 {# escalação que já existia} other {# escalações que já existiam}} ficam como estão", { count: r.salvas }),
          traduzirUi("Quem marcou que não pode, está de pausa ou de férias não entra."),
        )}
      </p>

      {(semGente.length > 0 || acima.length > 0 || outros > 0 || semPessoas.length > 0) && (
        <FormSection title={traduzirUi("Precisa de atenção")}>
          <ul className="per-avisos">
            {semPessoas.map((a) => <li key={`sp-${a.timeId}`}><Icon name="alerta" size={14} /> {traduzirUi("{time} não tem ninguém. Adicione pessoas em Times.", { time: timeNome(a.timeId) })}</li>)}
            {semGente.length > 0 && <li><Icon name="alerta" size={14} /> {traduzirUi("{vagas, plural, =1 {# vaga} other {# vagas}} sem ninguém disponível em {eventos, plural, =1 {# {culto}} other {# {cultos}}}. Toque na vaga para escolher alguém mesmo assim.", { vagas: semGente.reduce((s, a) => s + a.faltam, 0), eventos: new Set(semGente.map((a) => a.culto)).size })}</li>}
            {acima.map((a) => <li key={`ac-${a.pessoa}-${a.mes}`}><Icon name="alerta" size={14} /> {traduzirUi("{nome} serve {vezes, plural, =1 {# vez} other {# vezes}} em {mes}, acima do limite de {limite}.", { nome: nome(a.pessoa), vezes: a.vezes, mes: nomeDoMes(a.mes), limite: String(cfg.maxPorMes) })}</li>)}
            {outros > 0 && <li><Icon name="alerta" size={14} /> {traduzirUi("{count, plural, =1 {# escolha manual} other {# escolhas manuais}} com quem marcou que não pode ou já serve no mesmo {culto}.", { count: outros })}</li>}
          </ul>
          <div className="fs-chips">
            <Opcao marcada={soAvisos} estilo="chip-toggle" aria-pressed={soAvisos} onClick={() => { const v = !soAvisos; setSoAvisos(v); if (v) setMesesAbertos(new Set(meses.map(([m]) => m))); }}>{traduzirUi("Só {cultos} com aviso")}</Opcao>
            {primeiroComAviso && !soAvisos && (
              <Acao className="seg-chip" onClick={() => { const mes = primeiroComAviso.data.slice(0, 7); setMesesAbertos((s) => new Set([...s, mes])); window.setTimeout(() => document.getElementById(`per-${primeiroComAviso.chave}`)?.scrollIntoView({ block: "start", behavior: "smooth" }), 30); }}>{traduzirUi("Ir para o primeiro")}</Acao>
            )}
          </div>
        </FormSection>
      )}

      {meses.map(([mes, cultos]) => {
        const visiveis = soAvisos ? cultos.filter((c) => marcas.porCulto.has(c.chave)) : cultos;
        if (!visiveis.length) return null;
        const aberto = mesesAbertos.has(mes);
        const comAviso = cultos.filter((c) => marcas.porCulto.has(c.chave)).length;
        return (
          <section className="per-mes" key={mes}>
            <Acao className="per-mes-head" aria-expanded={aberto} onClick={() => alternarMes(mes)}>
              <span className="per-mes-t">{nomeDoMes(mes)}</span>
              <span className="per-mes-s">{joinDot(traduzirUi("{count, plural, =1 {# {culto}} other {# {cultos}}}", { count: cultos.length }), comAviso > 0 && traduzirUi("{n} com aviso", { n: String(comAviso) }))}</span>
              <Icon name="avancar" size={15} />
            </Acao>
            {aberto && visiveis.map((c) => (
              <article className={`per-culto${marcas.porCulto.has(c.chave) ? " aviso" : ""}`} key={c.chave} id={`per-${c.chave}`}>
                <header className="per-culto-head">
                  <span className="per-culto-dia">{joinDot(diaCurto(c.data), formatDateBR(c.data).slice(0, 5), c.hora)}</span>
                  <span className="per-culto-nome">{c.nome}</span>
                  {!c.eventId && <span className="per-tag">{traduzirUi("novo na agenda")}</span>}
                </header>
                {timesDoCulto(c, base!.times).map((t) => (
                  <div className="per-time" key={t.id}>
                    {base!.times.length > 1 && <div className="per-time-nome">{t.nome}</div>}
                    {t.funcoes.map((f) => {
                      const salvos = c.eventId ? roster.filter((x) => x.event_id === c.eventId && x.position_id === f.id && x.status !== "no").map((x) => x.person_id) : [];
                      const propostos = proposta[c.chave]?.[f.id] ?? [];
                      const abertas = Math.max(0, f.vagas - salvos.length - propostos.length);
                      const v = (atual?: string): Vaga => ({ culto: c.chave, timeId: t.id, funcaoId: f.id, funcao: f.nome, time: t.nome, atual });
                      return (
                        <div className="per-func-row" key={f.id}>
                          <span className="per-func-nome">{f.nome}</span>
                          <div className="per-vagas">
                            {salvos.map((p) => <span className="per-vaga salva" key={`s-${p}`} title={traduzirUi("{nome}: já estava na escala", { nome: nome(p) })}>{nome(p)}</span>)}
                            {propostos.map((p) => {
                              const atencao = marcas.pessoaNoCulto.has(`${p}@${c.chave}`) || marcas.cargaMes.has(`${p}@${c.data.slice(0, 7)}`);
                              return <Acao className={`per-vaga${atencao ? " atencao" : ""}`} key={p} title={nome(p)} aria-label={traduzirUi("{funcao}: {nome}{atencao, select, sim {, precisa de atenção} other {}}. Trocar", { funcao: f.nome, nome: nome(p), atencao: atencao ? "sim" : "nao" })} onClick={() => setVaga(v(p))}>{nome(p)}</Acao>;
                            })}
                            {Array.from({ length: abertas }).map((_, i) => (
                              <Acao className="per-vaga aberta" key={`a-${i}`} aria-label={traduzirUi("{funcao}: vaga aberta. Escolher alguém", { funcao: f.nome })} onClick={() => setVaga(v())}>{traduzirUi("Vaga aberta")}</Acao>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </article>
            ))}
          </section>
        );
      })}
      <p className="fs-note">
        <Botao variante="discreto" compacto onClick={() => setPasso("form")} desativado={salvando}><Icon name="voltar" size={14} /> {traduzirUi("Mudar times, período ou vagas")}</Botao>
      </p>

      {vaga && base && (
        <EscolherNaVaga
          vaga={vaga}
          culto={base.cultos.find((c) => c.chave === vaga.culto)!}
          opcoes={opcoesDaVaga(base, proposta, vaga.culto, vaga.timeId, vaga.funcaoId, vaga.atual).filter((c) => c.person.id !== vaga.atual)}
          cfg={cfg}
          nomeAtual={vaga.atual ? nome(vaga.atual) : undefined}
          onEscolher={(id) => trocar(vaga, id)}
          onClose={() => setVaga(null)}
        />
      )}
    </FormScreen>
  );
}

/* Troca manual na prévia: mesma lista da escala de um culto (sugeridos, outros
   e quem não pode com o motivo), mas quem marcou que não pode ou passou do
   limite pode ser escolhido de propósito: vira aviso, não bloqueio. */
function EscolherNaVaga({ vaga, culto, opcoes, cfg, nomeAtual, onEscolher, onClose }: {
  vaga: Vaga; culto: CultoPlano; opcoes: Candidato[]; cfg: EscalaSettings; nomeAtual?: string;
  onEscolher: (personId: string | null) => void; onClose: () => void;
}) {
  const traduzirUi = useTexto();

  const [busca, setBusca] = useState("");
  const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const achados = opcoes.filter((c) => !busca.trim() || sem(c.person.name).includes(sem(busca.trim())));
  const podem = achados.filter((c) => c.fit === "good");
  const comAviso = achados.filter((c) => c.fit === "busy" || (c.fit === "block" && c.motivo !== "evento"));
  const naoPodem = achados.filter((c) => c.fit === "block" && c.motivo === "evento");
  const motivo = (c: Candidato) =>
    c.fit === "busy" ? traduzirUi("Marcou que não pode neste horário ou data")
      : c.motivo === "ferias" ? traduzirUi("De férias")
        : c.motivo === "teto" ? traduzirUi("Chegou ao limite de {count, plural, =1 {# vez} other {# vezes}} no mês", { count: cfg.maxPorMes })
          : c.motivo === "folga" ? traduzirUi("Em folga: serviu há menos de {count, plural, =1 {# semana} other {# semanas}}", { count: cfg.folgaSemanas + 1 })
            : traduzirUi("Já serve neste {culto}");
  const linha = (c: Candidato, aviso?: string) => (
    <Acao className={`cand${c.motivo === "evento" ? " is-block" : ""}`} key={c.person.id} aria-disabled={c.motivo === "evento" || undefined} onClick={() => c.motivo !== "evento" && onEscolher(c.person.id)}>
      <Av name={c.person.name} size="md" />
      <div className="cand-main">
        <div className="cand-name">{c.person.name}</div>
        <div className={`cand-meta${aviso ? " cand-motivo" : ""}`}>{aviso ?? joinDot(traduzirUi("{count, plural, =1 {# vez} other {# vezes}} no período", { count: c.vezes }), c.ultima ? traduzirUi("antes, em {data}", { data: formatDateBR(c.ultima) }) : traduzirUi("ainda não serve"))}</div>
      </div>
    </Acao>
  );
  return (
    <Janela larga sobretitulo={joinDot(vaga.funcao, vaga.time)} titulo={culto.nome}
      texto={traduzirUi("{quando}{atual, select, sim {. Agora: {nome}.} other {}}", { quando: joinDot(diaCurto(culto.data), formatDateBR(culto.data), culto.hora), atual: nomeAtual ? "sim" : "nao", nome: nomeAtual ?? "" })} aoFechar={onClose} corpoBloco
      cabecalho={
        <div className="cand-tools">
          <input className="input" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={traduzirUi("Buscar pelo nome")} aria-label={traduzirUi("Buscar pelo nome")} />
        </div>
      }
      rodape={<>
        {nomeAtual && <Botao onClick={() => onEscolher(null)}>{traduzirUi("Deixar a vaga aberta")}</Botao>}
        <Botao variante="discreto" onClick={onClose}>{traduzirUi("Cancelar")}</Botao>
      </>}>
      <div className="cand-list">
          {achados.length === 0 && <Vazio titulo={busca.trim() ? traduzirUi("Ninguém com esse nome neste time.") : traduzirUi("Todo mundo do time já está nesta função. Adicione pessoas ao time em Times.")} />}
          {podem.length > 0 && <><div className="cand-grp">{traduzirUi("Livres, pela ordem do rodízio")}</div>{podem.map((c) => linha(c))}</>}
          {comAviso.length > 0 && <><div className="cand-grp">{traduzirUi("Pode escolher, mas fica com aviso")}</div>{comAviso.map((c) => linha(c, motivo(c)))}</>}
          {naoPodem.length > 0 && <><div className="cand-grp">{traduzirUi("Não podem nesta vaga")}</div>{naoPodem.map((c) => linha(c, motivo(c)))}</>}
      </div>
    </Janela>
  );
}
