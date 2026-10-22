"use client";

import { regiaoInformada } from "../lib/endereco";
import { podeReceberPedidos } from "../modules/times/recebimento";
import { listaFinalidades, type ContribuirCfg } from "../modules/contribuir/pix";
import { instalarApp, podeInstalarDireto } from "../lib/instalar";
import { Fragment, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "../lib/icons";
import { useRelogioDaIgreja } from "../lib/relogio-context";
import { formatDateBR, joinDot, somaDias } from "../lib/date";
import { plural } from "../lib/plural";
import { useTermos } from "../lib/vocabulario-context";
import { candidatosParaVaga, papelDoDestinatario, useDestinatario, type Destinatario } from "../lib/destinatario";
import { SheetPedidoOracao } from "../modules/oracao/Oracao";
import { FILA_DOBRA, ordenarFila, type EntradaFila } from "../modules/fila";
import { CartaoAniversario, aniversariosHojeNoMeuTime } from "../modules/aniversarios/CartaoDoTime";
import { videoDoLink } from "../lib/video";
import { medir, medirCartaoVisto } from "../lib/medicao";
import { Av, M6St, JourneyContext, MemberUiContext, dataLonga, realValue } from "./comum";
import { EventoRow, M6Date } from "./Agenda";
import { usePush } from "./Perfil";
import type { Announcement, Card, Child, ChildGuardian, Ev, ItemInicio, M, Ministry, P, Slot, StepView } from "./tipos";

export function EscalaCard({ slot, ev, ministry, person, member, members, onResponderEscala, onStartChat, destaque = true }: {
  slot: Slot; ev: Ev; ministry?: Ministry; person: P; member: M | null; members: M[];
  /* botão cheio só no primeiro cartão da fila do Início (lei 5) */
  destaque?: boolean;
  onResponderEscala?: (id: string, status: Slot["status"]) => Promise<boolean>;
  onStartChat?: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
}) {
  const ui = useContext(MemberUiContext);
  const [st, setStLocal] = useState<Slot["status"]>(ui.respostas[slot.id] ?? slot.status);
  /* o selo da aba Agenda acompanha a resposta na hora, não só depois de gravar */
  const setSt = (v: Slot["status"]) => { setStLocal(v); ui.responderEscala(slot.id, v === "ok" || v === "no" ? v : null); };
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const funcao = ministry?.positions?.find((p) => p.id === slot.position_id)?.name;
  const gravar = async (v: Slot["status"]): Promise<boolean> => {
    if (busy.current || !onResponderEscala) return false;
    busy.current = true;
    setSaving(true);
    try {
      const ok = await onResponderEscala(slot.id, v);
      if (!ok) { ui.toast("Não conseguimos salvar sua resposta. Tente de novo."); return false; }
      setSt(v);
      return true;
    } catch {
      ui.toast("Não conseguimos salvar sua resposta. Tente de novo.");
      return false;
    } finally { busy.current = false; setSaving(false); }
  };
  const responder = async (v: "ok" | "no") => {
    const antes = st;
    if (!await gravar(v)) return;
    ui.toast(v === "ok" ? "Presença confirmada" : "Registramos que você não pode", {
      label: "Desfazer",
      fn: () => { void gravar(antes).then((ok) => { if (ok) ui.toast("Resposta desfeita"); }); },
    });
  };
  /* troca: destinatário em cadeia, resolvido no banco (v7 2.4). Sem ninguém, sem o botão */
  const destTroca = useDestinatario("troca", ministry?.id ?? null);
  const pedirTroca = () => {
    if (!member || !destTroca || !onStartChat) return;
    ui.sheet(<SheetTroca slot={slot} ev={ev} funcao={funcao} member={member} dest={destTroca} onStartChat={onStartChat} />);
  };
  return (
    <div className="m6-card service-commitment">
      <div className="service-commitment-heading">
        <span aria-hidden="true"><M6Date iso={ev.eventDate} /></span>
        <div><div className="m6-kick">{st === "wait" ? "Escala para confirmar" : "Sua escala"}</div><div className="m6-ct">{ev.name}</div></div>
      </div>
      <ul className="m6-facts">
        <li><Icon name="agenda" size={20} /><span>{joinDot(dataLonga(ev.eventDate) || ev.weekday, ev.time)}</span></li>
        {(ministry || funcao) && <li><Icon name="times" size={20} /><span>{joinDot(ministry?.name, funcao)}</span></li>}
        {ev.location && <li><Icon name="mapapin" size={20} /><span>{ev.location}</span></li>}
      </ul>
      {saving && <p className="m6-meta" role="status">Salvando sua resposta...</p>}
      {st === "wait" && (
        <div className="m6-btns">
          <button className={`m6-btn ${destaque ? "pri" : "sec"}`} type="button" disabled={saving || !onResponderEscala} onClick={() => responder("ok")}><Icon name="ok" size={20} />Confirmar</button>
          <button className="m6-btn sec" type="button" disabled={saving || !onResponderEscala} onClick={() => responder("no")}>Não posso</button>
        </div>
      )}
      {st === "ok" && (
        <div className="m6-after">
          <M6St k="ok" ic="ok">Presença confirmada</M6St>
          {onStartChat && member && destTroca && <button type="button" className="m6-link" onClick={pedirTroca}>Pedir troca</button>}
        </div>
      )}
      {st === "no" && (
        <div className="m6-after">
          <M6St k="warn" ic="recusou">Você avisou que não pode</M6St>
          <button type="button" className="m6-link" onClick={() => responder("ok")}>Mudei de ideia</button>
        </div>
      )}
    </div>
  );
}

/* Pedir troca (M3): pede ao destinatário da cadeia ou oferece a vaga a quem
   faz a mesma função e está livre. As duas saídas abrem a conversa. */
export function SheetTroca({ slot, ev, funcao, member, dest, onStartChat }: {
  slot: Slot; ev: Ev; funcao?: string; member: M; dest: Destinatario;
  onStartChat: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
}) {
  const ui = useContext(MemberUiContext);
  const [candidatos, setCandidatos] = useState<{ member_id: string; name: string }[]>([]);
  const [enviando, setEnviando] = useState<string | null>(null);
  useEffect(() => { let vivo = true; candidatosParaVaga(slot.id).then((c) => { if (vivo) setCandidatos(c.filter((x) => x.member_id !== member.id && x.member_id !== dest.member_id)); }); return () => { vivo = false; }; }, [slot.id, member.id, dest.member_id]);
  const quando = joinDot(ev.name, dataLonga(ev.eventDate) || ev.weekday, ev.time);
  const abrir = async (alvo: string, texto: string, aviso: string) => {
    setEnviando(alvo);
    const id = await onStartChat(member.id, alvo, texto);
    setEnviando(null);
    if (!id) { ui.toast("Não foi possível enviar agora. Tente de novo."); return; }
    ui.sheet(null);
    ui.toast(aviso);
    ui.go("mensagens", null, { chatId: id });
  };
  return (
    <div>
      <h2 className="m6-sh">Pedir troca</h2>
      <div className="m6-meta">{joinDot(quando, funcao)}</div>
      <p className="m6-txt">O pedido vai para {papelDoDestinatario(dest)}. A conversa fica em Mensagens.</p>
      <div className="m6-btns">
        <button className="m6-btn pri" type="button" disabled={!!enviando} onClick={() => abrir(dest.member_id, `Oi! Preciso trocar minha escala de ${joinDot(quando, funcao)}. Pode me ajudar?`, "Pedido de troca enviado")}>
          {enviando === dest.member_id ? "Enviando..." : `Pedir a ${dest.name.split(" ")[0]}`}
        </button>
      </div>
      {candidatos.length > 0 && (
        <>
          <div className="m6-lbl" style={{ marginTop: 20 }}>Ou ofereça a vaga</div>
          <div className="m6-meta">{funcao ? `Quem também é ${funcao} e está livre nesse horário.` : "Quem faz a mesma função e está livre nesse horário."}</div>
          {candidatos.map((c) => (
            <div key={c.member_id} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
              <Av name={c.name} />
              <div className="m6-rb"><div className="m6-rt">{c.name}</div></div>
              <button className="m6-btn small sec" type="button" disabled={!!enviando} onClick={() => abrir(c.member_id, `Oi! Você pode assumir minha vaga${funcao ? ` de ${funcao}` : ""} em ${quando}? Se puder, me avise que eu combino com a liderança.`, "Vaga oferecida")}>
                {enviando === c.member_id ? "Enviando..." : "Oferecer"}
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── pedido de oração (módulo oracao) ─────────────────────────────────────────
/* só a intercessão (vai como conversa, destinatário em cadeia, v7 2.5) ou o
   mural de oração da igreja. A folha mora no módulo; aqui só a navegação. */
export function SheetOracao({ member, dest, onStartChat, organizationId, muralOn }: {
  member: M; dest: Destinatario | null; organizationId?: string; muralOn: boolean;
  onStartChat?: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
}) {
  const ui = useContext(MemberUiContext);
  return (
    <SheetPedidoOracao organizationId={organizationId} memberId={member.id} dest={dest} muralOn={muralOn} onStartChat={onStartChat}
      onVerConversa={(chatId) => { ui.sheet(null); ui.go("mensagens", null, { chatId }); }}
      onVerMural={() => { ui.sheet(null); ui.go("mensagens", "oracao"); }} />
  );
}
export const ADIADOS_KEY = "cex_inicio_adiados";
export const ouvirAdiados = (cb: () => void) => { window.addEventListener(ADIADOS_KEY, cb); return () => window.removeEventListener(ADIADOS_KEY, cb); };
export const lerAdiados = () => { try { return localStorage.getItem(ADIADOS_KEY) ?? "{}"; } catch { return "{}"; } };
export function InicioV6({ contribuir, onContribuir, person, member, ministries, members, people = [], events, roster, cards, announcements, unreadIds, kidsChildren, childGuardians, kidsCheckin, onResponderEscala, onStartChat, nextStep, inscricoes, onServir, ligados, acessos = 0, instalado = false, destaque = null, onAbrirDestaque, organizationId }: {
  /* quantas vezes a pessoa abriu o app neste aparelho e se ele já está na tela de início (v7 4.10) */
  acessos?: number; instalado?: boolean;
  /* Pix da igreja (módulo contribuir): no dia do culto vira um cartão de prioridade baixa */
  contribuir?: ContribuirCfg | null; onContribuir?: () => void;
  /* destaque da igreja (v7 4.4): o mais recente ainda valendo; abrir lê o artigo no app */
  destaque?: Announcement | null; onAbrirDestaque?: (a: Announcement) => void;
  /* medição padrão (lei 11) */
  organizationId?: string;
  person: P; member: M | null; ministries: Ministry[]; members: M[]; people?: P[]; events: Ev[]; roster: Slot[]; cards: Card[];
  announcements: Announcement[]; unreadIds: Set<string>; kidsChildren: Child[]; childGuardians: ChildGuardian[];
  kidsCheckin?: (destaque: boolean) => React.ReactNode;
  onResponderEscala?: (id: string, status: Slot["status"]) => Promise<boolean>;
  onStartChat?: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
  nextStep: StepView | null;
  /* etapas ainda não feitas com inscrição aberta (v7 4.7) */
  inscricoes: StepView[];
  onServir: () => void;
  /* módulos ligados na igreja: entrada de módulo desligado não entra na fila */
  ligados?: Set<string>;
}) {
  const { todayISO, quandoPublicado, aindaVaiAcontecer } = useRelogioDaIgreja();
  const { comTermos: ct } = useTermos();
  const ui = useContext(MemberUiContext);
  const jornada = useContext(JourneyContext);
  const pedidosPendentes = new Set(jornada.serveRequests.filter((r) => r.member_id === member?.id && r.status === "pendente").map((r) => r.ministry_id));
  const [maisFila, setMaisFila] = useState(false);
  const hoje = todayISO();
  const serve = ministries.some((m) => m.people.some((mp) => mp.personId === person.id));
  const evById = new Map(events.map((e) => [e.id, e]));
  const meusSlots = roster.filter((r) => r.person_id === person.id);
  const aConfirmar = meusSlots
    .filter((r) => r.status === "wait")
    .filter((r) => (evById.get(r.event_id)?.eventDate ?? "") >= hoje);
  /* tarefas (v7 4.6): cada tarefa aberta é um cartão enquanto estiver aberta */
  const minhasTarefas = cards.filter((c) => c.assignees.includes(person.id) && c.column_id !== "done");
  const novo = announcements.find((a) => a.urgent && unreadIds.has(a.id)) ?? announcements.find((a) => unreadIds.has(a.id));
  const meusFilhos = childGuardians.filter((g) => g.guardian_person_id === person.id).map((g) => kidsChildren.find((c) => c.id === g.child_id)).filter(Boolean) as Child[];
  const cultoHoje = events.find((e) => e.eventDate === hoje);
  const timesAbertos = ministries.filter((m) => (podeReceberPedidos(m) || pedidosPendentes.has(m.id)) && !m.people.some((mp) => mp.personId === person.id));
  const ministryOf = (slot: Slot) => ministries.find((m) => m.positions?.some((p) => p.id === slot.position_id)) ?? ministries.find((m) => m.people.some((mp) => mp.personId === person.id));
  /* v7 4.10: o que ficou fora do primeiro acesso vira cartão de prioridade baixa */
  const faltaDados = member ? [
    !realValue(member.email) && "e-mail",
    !realValue(member.phone) && "telefone",
    !regiaoInformada(member) && "região onde mora",
  ].filter(Boolean) as string[] : [];
  /* cartões adiados neste aparelho; no servidor, nenhum (o HTML começa igual) */
  const adiadosTxt = useSyncExternalStore(ouvirAdiados, lerAdiados, () => "{}");
  const adiados = useMemo(() => { try { return JSON.parse(adiadosTxt) as Record<string, string>; } catch { return {}; } }, [adiadosTxt]);
  const adiar = (id: string, dias: number) => {
    try { localStorage.setItem(ADIADOS_KEY, JSON.stringify({ ...adiados, [id]: somaDias(hoje, dias) })); } catch { /* sem armazenamento */ }
    window.dispatchEvent(new Event(ADIADOS_KEY));
  };
  const adiado = (id: string) => !!adiados[id] && adiados[id] > hoje;
  const incompleto = faltaDados.length > 0 && !adiado("dados");
  const pedirAtalho = acessos === 2 && !instalado && !adiado("atalho");
  const destOracao = useDestinatario("oracao");
  /* mural de oração ligado na igreja (módulo oracao) */
  const oracaoOn = ligados?.has("oracao") ?? false;

  /* entradas dos módulos; a casca ordena */
  const entradas: EntradaFila<ItemInicio>[] = [];
  if (meusFilhos.length > 0 && cultoHoje && kidsCheckin) entradas.push({ id: "kids-hoje", modulo: "kids", tipo: "acao", prioridade: 95, prazo: hoje, conteudo: { k: "kids" } });
  for (const slot of aConfirmar) {
    const ev = evById.get(slot.event_id);
    if (ev) entradas.push({ id: `escala-${slot.id}`, modulo: "escalas", tipo: "acao", prioridade: 90, prazo: `${ev.eventDate} ${ev.time ?? ""}`, conteudo: { k: "escala", slot, ev } });
  }
  for (const t of minhasTarefas) entradas.push({ id: `tarefa-${t.id}`, modulo: "quadros", tipo: "acao", prioridade: t.due ? 70 : 45, prazo: t.due, conteudo: { k: "tarefa", card: t } });
  if (novo) entradas.push({ id: `mural-${novo.id}`, modulo: "mural", tipo: "aviso", prioridade: novo.urgent ? 85 : 50, conteudo: { k: "mural", aviso: novo } });
  if (nextStep) entradas.push({ id: `passo-${nextStep.id}`, modulo: "inicio", tipo: "passo", prioridade: 40, conteudo: { k: "passo", step: nextStep } });
  /* inscrição aberta numa etapa que a pessoa ainda não fez (v7 4.7); se já é o próximo passo, o mesmo cartão serve */
  for (const st of inscricoes) {
    if (st.id === nextStep?.id) continue;
    entradas.push({ id: `inscricao-${st.id}`, modulo: st.id === "batismo" ? "batismos" : "cursos", tipo: "passo", prioridade: 38, conteudo: { k: "passo", step: st } });
  }
  if (incompleto) entradas.push({ id: "cadastro", modulo: "perfil", tipo: "acao", prioridade: 15, conteudo: { k: "cadastro", falta: faltaDados } });
  if (pedirAtalho) entradas.push({ id: "atalho", modulo: "inicio", tipo: "acao", prioridade: 25, conteudo: { k: "atalho" } });
  if (contribuir && onContribuir && cultoHoje && !adiado(`contribuir-${hoje}`)) entradas.push({ id: `contribuir-${hoje}`, modulo: "contribuir", tipo: "destaque", prioridade: 12, prazo: hoje, conteudo: { k: "contribuir" } });
  /* aniversário de alguém do time que a pessoa lidera (módulo aniversarios): só o nome, prioridade baixa */
  const aniversarios = aniversariosHojeNoMeuTime({ personId: person.id, membros: members, pessoas: people, times: ministries, hoje });
  if (aniversarios.length > 0 && !adiado(`aniversario-${hoje}`)) entradas.push({ id: `aniversario-${hoje}`, modulo: "aniversarios", tipo: "destaque", prioridade: 10, prazo: hoje, conteudo: { k: "aniversario", pessoas: aniversarios } });
  if (!serve && timesAbertos.length > 0) entradas.push({ id: "servir", modulo: "times", tipo: "passo", prioridade: 20, conteudo: { k: "servir", times: timesAbertos } });
  const fila = ordenarFila(entradas, ligados);
  const visiveis = maisFila ? fila : fila.slice(0, FILA_DOBRA);
  /* lei 11: card_shown dos cartões na tela (uma vez por sessão) */
  const vistosIds = visiveis.map((e) => e.id).join("|");
  useEffect(() => {
    for (const e of visiveis) medirCartaoVisto(organizationId, { id: e.id, modulo: e.modulo, tipo: e.tipo });
  }, [vistosIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const resto = fila.length - visiveis.length;

  const cartao = (e: EntradaFila<ItemInicio>, destaque: boolean) => {
    const c = e.conteudo;
    const btn = `m6-btn ${destaque ? "pri" : "sec"}`;
    switch (c.k) {
      case "kids":
        return <Fragment key={e.id}>{kidsCheckin?.(destaque)}</Fragment>;
      case "escala":
        return <EscalaCard key={e.id} slot={c.slot} ev={c.ev} ministry={ministryOf(c.slot)} person={person} member={member} members={members} onResponderEscala={onResponderEscala} onStartChat={onStartChat} destaque={destaque} />;
      case "tarefa":
        return (
          <div key={e.id} className="m6-card">
            <div className="m6-kick">Tarefa</div>
            <div className="m6-ct">{c.card.title}</div>
            <div className="m6-meta">{!c.card.due ? "Sem prazo" : c.card.due.slice(0, 10) < todayISO() ? <M6St k="warn" ic="alerta">{`Atrasada desde ${formatDateBR(c.card.due)}`}</M6St> : `Prazo · ${formatDateBR(c.card.due)}`}</div>
            <div className="m6-btns"><button className={btn} type="button" onClick={() => ui.go("agenda", null, { agSeg: "minha", cardId: c.card.id })}>Ver a tarefa</button></div>
          </div>
        );
      case "mural":
        return (
          <div key={e.id} className="m6-card">
            <div className="m6-kick"><Icon name="bandeira" size={16} />Novo no Mural</div>
            {c.aviso.urgent && <M6St k="warn" ic="alerta">Urgente</M6St>}
            <div className="m6-ct">{c.aviso.title}</div>
            {c.aviso.created_at && <div className="m6-meta">{quandoPublicado(c.aviso.created_at)}</div>}
            <div className="m6-btns"><button className={btn} type="button" onClick={() => ui.go("mensagens", "mural", { announcementId: c.aviso.id })}>Ler a publicação</button></div>
          </div>
        );
      case "passo":
        return (
          <div key={e.id} className="m6-card">
            <div className="m6-kick">{c.step.inscricao ? "Inscrições abertas" : "Seu próximo passo"}</div>
            <div className="m6-ct">{c.step.nome}</div>
            {(c.step.inscricao ?? c.step.info) && <div className="m6-meta">{c.step.inscricao ?? c.step.info}</div>}
            <div className="m6-btns"><button className={btn} type="button" onClick={() => (c.step.run ? c.step.run() : ui.go("caminhada"))}>{c.step.acao ?? ct("Ver a {caminhada}")} →</button></div>
          </div>
        );
      case "cadastro":
        return (
          <div key={e.id} className="m6-card">
            <div className="m6-kick">Seu cadastro</div>
            <div className="m6-ct">Complete seus dados</div>
            <div className="m6-meta">{`Falta ${c.falta.join(", ").replace(/, ([^,]*)$/, " e $1")}. Ajuda a igreja a cuidar de você.`}</div>
            <div className="m6-btns">
              <button className={btn} type="button" onClick={() => ui.go("perfil", "dados")}>Completar →</button>
              <button className="m6-link" type="button" data-dispensa="1" onClick={() => adiar("dados", 30)}>Agora não</button>
            </div>
          </div>
        );
      case "atalho":
        return (
          <div key={e.id} className="m6-card">
            <div className="m6-kick">Dica</div>
            <div className="m6-ct">Coloque o app na tela de início</div>
            <ul className="m6-facts">
              <li><Icon name="compartilhar" size={20} /><span><b>iPhone:</b> no Safari, toque em Compartilhar e depois em &quot;Adicionar à Tela de Início&quot;.</span></li>
              <li><Icon name="menu" size={20} /><span><b>Android:</b> no Chrome, toque no menu de três pontos e depois em &quot;Instalar app&quot;.</span></li>
            </ul>
            <div className="m6-btns">
              {podeInstalarDireto()
                ? <button className={btn} type="button" onClick={async () => { await instalarApp(); adiar("atalho", 3650); }}>Instalar</button>
                : <button className={btn} type="button" onClick={() => adiar("atalho", 3650)}>Já coloquei</button>}
              <button className="m6-link" type="button" data-dispensa="1" onClick={() => adiar("atalho", 3650)}>Agora não</button>
            </div>
          </div>
        );
      case "contribuir":
        return (
          <div key={e.id} className="m6-card">
            <div className="m6-kick">Generosidade</div>
            <div className="m6-ct">Contribuir hoje</div>
            <div className="m6-meta">{`Pix para ${listaFinalidades(contribuir!.finalidades)}.`}</div>
            <div className="m6-btns">
              <button className={btn} type="button" onClick={onContribuir}>Ver a chave Pix</button>
              <button className="m6-link" type="button" data-dispensa="1" onClick={() => adiar(e.id, 1)}>Agora não</button>
            </div>
          </div>
        );
      case "aniversario":
        return <CartaoAniversario key={e.id} pessoas={c.pessoas} destaque={destaque} onAgoraNao={() => adiar(e.id, 1)} />;
      case "servir": {
        const aguardando = c.times.some((m) => pedidosPendentes.has(m.id));
        return (
          <div key={e.id} className="m6-card">
            <div className="m6-kick">Servir</div>
            <div className="m6-ct">{aguardando ? "Seu pedido está em análise" : c.times.length === 1 ? "1 time procura pessoas" : `${c.times.length} times procuram pessoas`}</div>
            <div className="m6-meta">{c.times.filter((m) => !aguardando || pedidosPendentes.has(m.id)).slice(0, 3).map((m) => m.name).join(", ")}. {aguardando ? "A liderança vai avaliar e conversar com você." : "Veja o que cada um faz antes de decidir."}</div>
            <div className="m6-btns"><button className={btn} type="button" onClick={onServir}>{aguardando ? "Acompanhar pedido" : "Conhecer os times"}</button></div>
          </div>
        );
      }
    }
  };

  /* Da igreja: eventos dos próximos 7 dias (sem os que já estão na fila), até 3;
     sem nenhum na semana, o próximo */
  const naFila = new Set(aConfirmar.map((r) => r.event_id));
  const confirmados = new Map<string, string>();
  for (const r of meusSlots) {
    if (r.status !== "ok" || confirmados.has(r.event_id)) continue;
    const m = ministryOf(r);
    confirmados.set(r.event_id, m?.positions?.find((p) => p.id === r.position_id)?.name ?? m?.name ?? "");
  }
  const proximos = events
    .filter((e) => aindaVaiAcontecer(e.eventDate, e.time, e.timeZone) && !naFila.has(e.id))
    .sort((a, b) => (a.eventDate + a.time).localeCompare(b.eventDate + b.time));
  const fimDaSemana = somaDias(hoje, 6);
  const daSemana = proximos.filter((e) => e.eventDate <= fimDaSemana);
  const daIgreja = (daSemana.length ? daSemana : proximos.slice(0, 1)).slice(0, 3);

  /* um destaque, parado; com a fila vazia sobe para o topo */
  const cartaoDestaque = destaque && onAbrirDestaque ? <DestaqueCard a={destaque} onAbrir={() => onAbrirDestaque(destaque)} /> : null;
  return (
    <div className="service-member-home">
      {fila.length === 0 && cartaoDestaque && <div className="m6-sec0">{cartaoDestaque}</div>}
      <div className={fila.length === 0 && cartaoDestaque ? "m6-sec" : "m6-sec0"}>
        <div className="m6-lbl">Para você agora</div>
        {fila.length === 0 ? (
          <div className="service-home-clear"><div className="m6-ct">Tudo em dia</div><div className="m6-meta">Você não tem nenhuma resposta pendente agora.</div></div>
        ) : (
          visiveis.map((e, i) => (
            /* lei 11: botão do cartão = card_acted; botão marcado data-dispensa ("Agora não") = card_dismissed */
            <div key={e.id} data-cartao={e.id} onClickCapture={(ev) => {
              const b = (ev.target as HTMLElement).closest("button");
              if (!b) return;
              medir(organizationId, b.dataset.dispensa ? "card_dismissed" : "card_acted", { modulo: e.modulo, tipo: e.tipo, ref: e.id });
            }}>
              {cartao(e, i === 0)}
            </div>
          ))
        )}
        {resto > 0 && (
          <div className="m6-more"><button type="button" className="m6-link" onClick={() => setMaisFila(true)}>{`Ver mais ${plural(resto, "item", "itens")}`}</button></div>
        )}
      </div>

      <div className="m6-sec">
        <div className="service-home-heading"><h2>Na vida da igreja</h2><p>Encontros e novidades para acompanhar.</p></div>
        {fila.length > 0 && cartaoDestaque}
        {daIgreja.length > 0 ? (
          <div className="m6-list service-home-events">{daIgreja.map((ev) => <EventoRow key={ev.id} ev={ev} serve={confirmados.has(ev.id) ? confirmados.get(ev.id) : null} />)}</div>
        ) : (
          <div className="service-home-empty"><div className="m6-ct">Nenhum encontro publicado por enquanto</div><p className="m6-meta">{ct("Quando a igreja publicar os próximos {cultos} e eventos, você encontra aqui as datas, os horários e como participar.")}</p></div>
        )}
        <div className="m6-more"><button type="button" className="m6-link" onClick={() => ui.go("agenda", null, { agSeg: "igreja" })}>Ver a agenda completa →</button></div>
      </div>

      {member && ((destOracao && onStartChat) || oracaoOn) && (
        <div className="m6-sec">
          <div className="m6-card service-home-care">
            <div className="m6-ct">Podemos orar por você?</div>
            <div className="m6-meta">{oracaoOn ? "Você escolhe quem vê: só a intercessão ou o mural de oração da igreja." : `Seu pedido vai para ${destOracao?.via === "intercessao" ? "quem cuida da intercessão" : "a liderança da igreja"}, com cuidado.`}</div>
            <div className="m6-btns">
              <button className="m6-btn sec" type="button" onClick={() => ui.sheet(<SheetOracao member={member} dest={destOracao ?? null} onStartChat={onStartChat} organizationId={organizationId} muralOn={oracaoOn} />)}>
                <Icon name="coracao" size={20} />Enviar pedido de oração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pedido de notificação (v7 5.3, lei 9) ─────────────────────────────────────
export function SheetPedirAvisos({ organizationId }: { organizationId?: string }) {
  const ui = useContext(MemberUiContext);
  const { pushOn, pushBusy, pushMsg, ligarPush } = usePush(organizationId);
  return (
    <div>
      <h2 className="m6-sh">Quer saber quando for escalado?</h2>
      <p className="m6-txt">Avisamos no celular quando você for escalado, quando a igreja publicar no Mural e quando alguém falar com você. Nada chega das 22h às 7h, e dá para escolher o que receber no Perfil.</p>
      {pushOn ? (
        <div className="m6-after"><M6St k="ok" ic="ok">Notificações ligadas</M6St></div>
      ) : (
        <div className="m6-btns">
          <button className="m6-btn pri" type="button" disabled={pushBusy} onClick={ligarPush}><Icon name="sino" size={20} />Ligar notificações</button>
          <button className="m6-btn sec" type="button" onClick={() => ui.sheet(null)}>Agora não</button>
        </div>
      )}
      {pushMsg && <div className="m6-meta">{pushMsg}</div>}
    </div>
  );
}

// ── Destaque da igreja (v7 4.4) ───────────────────────────────────────────────
/* Cartão `destaque`: imagem 16:9 (com texto alternativo), título e prazo. Um
   por vez, parado, sem carrossel. Abre o artigo dentro do app. */
export function DestaqueCard({ a, onAbrir }: { a: Announcement; onAbrir: () => void }) {
  const video = videoDoLink(a.video_url);
  return (
    <button type="button" className="m6-card m6-destaque" onClick={onAbrir}>
      {a.image_url && <img className="m6-destaque-img" src={a.image_url} alt={a.image_alt ?? ""} />}
      <span className="m6-kick">{video ? "Destaque · vídeo" : "Destaque"}</span>
      <span className="m6-ct">{a.title}</span>
      {a.body && <span className="m6-meta m6-2l">{a.body}</span>}
      <span className="m6-link">{video ? "Assistir" : "Ler"} →</span>
    </button>
  );
}

export function SheetArtigo({ a }: { a: Announcement }) {
  const { quandoPublicado } = useRelogioDaIgreja();
  const video = videoDoLink(a.video_url);
  return (
    <div className="m6-artigo">
      <div className="m6-kick">{joinDot("Da igreja", a.created_at ? quandoPublicado(a.created_at) : null)}</div>
      <h2 className="m6-sh">{a.title}</h2>
      {video ? (
        <div className={`m6-video ${video.tipo}`}>
          <iframe src={video.src} title={`Vídeo: ${a.title}`} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        </div>
      ) : a.image_url ? (
        <img className="m6-destaque-img" src={a.image_url} alt={a.image_alt ?? ""} />
      ) : null}
      {a.body && <p className="m6-txt" style={{ whiteSpace: "pre-wrap" }}>{a.body}</p>}
    </div>
  );
}
