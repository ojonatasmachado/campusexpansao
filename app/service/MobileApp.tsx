"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "./lib/icons";
import { readMemberLocation, writeMemberLocation, type AgendaSeg } from "./lib/member-navigation";
import { useRelogioDaIgreja } from "./lib/relogio-context";
import { porPublicacao } from "./lib/date";
import ChurchLockup from "./ChurchLockup";
import { fatorDa, sincronizarComPerfil, useTextSize } from "./lib/text-scale";
import { TextSizeSheet } from "./TextSizeSlider";
import { useTermos } from "./lib/vocabulario-context";
import { useDestinatario } from "./lib/destinatario";
import { MuralOracao } from "./modules/oracao/Oracao";
import { modulosLigados, telasDoMembro } from "./modules/registry";
import { horaDeChegada } from "./lib/agenda";
import { linhaDoMembro, mesmoDiaDaSemana } from "./lib/contexto-dia";
import { Contribuir } from "./modules/contribuir/Contribuir";
import { contribuirPronto } from "./modules/contribuir/pix";
import { InicioV6, SheetArtigo, SheetOracao, SheetPedirAvisos } from "./membro/Inicio";
import { TabConversas, naoLidasPorConversa } from "./membro/Conversas";
import { Av, JourneyContext, M6Row, M6Sheet, MemberUiContext, UNDO_MS, chegadaDoTime } from "./membro/comum";
import { AgendaV6, SheetEvento } from "./membro/Agenda";
import { CaminhadaV6, MinhaHistoria, SheetPedidoEtapa, SheetTimes } from "./membro/Caminhada";
import { Onboarding, StepsHost } from "./membro/Onboarding";
import { CursosResumo, TabBatismo, TabCursos, minhasAulas } from "./membro/Cursos";
import { CheckinKidsHoje, TabKids, TabKidsArea } from "./membro/Kids";
import { TabVisitantes } from "./membro/Visitantes";
import { MuralV6 } from "./membro/Mural";
import { TabBiblia } from "./membro/Biblia";
import { TabPerfil } from "./membro/Perfil";
import { SheetAceiteMapa } from "./membro/AceiteMapa";
import { TERMO_MAPA_VERSAO } from "./lib/termo-mapa";
import type { JourneyActions, JourneyStep, M, MemberModule, MemberTab, MemberUi, Ministry, MobileOverlayProps, ModuleCtx, P } from "./membro/tipos";
import { Botao } from "./ui/Botao";
import { Acao } from "./ui/Acao";
import { Opcao } from "./ui/Opcao";
import { Lista, linhaClasse } from "./ui/Linha";
import { entrarComDirecao } from "./ui/movimento";
export type * from "./membro/tipos";

function TabIcon({ name, size = 18 }: { name: string; size?: number }) {
  return <Icon name={name} size={size} />;
}

/* módulo extra vem do time (ministries.app_modules, escolhido em Editar
   ministério), não do nome do time */
function hasTeamModule(person: P, ministries: Ministry[], module: string) {
  return ministries.some((m) => (m.appModules ?? []).includes(module) && m.people.some((mp) => mp.personId === person.id));
}

function isRecepPerson(person: P, ministries: Ministry[]) {
  return hasTeamModule(person, ministries, "visitantes");
}

function isKidsPerson(person: P, ministries: Ministry[]) {
  return hasTeamModule(person, ministries, "kids");
}
const MEMBER_TABS: { id: MemberTab; l: string; ic: string }[] = [
  { id: "inicio", l: "Início", ic: "inicio" },
  { id: "agenda", l: "Agenda", ic: "agenda" },
  { id: "mensagens", l: "Mensagens", ic: "conversas" },
  { id: "caminhada", l: "{Caminhada}", ic: "cursos" },
  { id: "perfil", l: "Perfil", ic: "perfil" },
];
/* barra de abas: 4 abas (lei 1). O Perfil abre pelo avatar no topo, como subtela */
const BAR_TABS = MEMBER_TABS.filter((t) => t.id !== "perfil");
/* o avatar mostra o rótulo "Perfil" no primeiro acesso; depois some */
const AVATAR_VISTO = "cex_avatar_visto";
/* gerado pelo registro de módulos (modules/registry.ts), a partir das telas de
   cada manifesto; a igreja desliga módulos em service.churches (0055) */
const membrosDoRegistro = (ligados?: Set<string>): MemberModule[] =>
  telasDoMembro(ligados).map((t) => ({ id: t.id, home: t.aba, title: t.titulo, visible: t.quem, notify: t.aviso }));
const MEMBER_MODULES: MemberModule[] = membrosDoRegistro();
const moduleTitle = (id: string) => MEMBER_MODULES.find((m) => m.id === id)?.title ?? "";
/* quantas vezes o app abriu neste aparelho: conta uma vez por carregamento (v7 4.10) */
let acessosDaSessao: number | null = null;
const contarAcesso = () => {
  if (acessosDaSessao === null) {
    try {
      acessosDaSessao = Number(localStorage.getItem("cex_acessos") ?? "0") + 1;
      localStorage.setItem("cex_acessos", String(acessosDaSessao));
    } catch { acessosDaSessao = 0; }
  }
  return acessosDaSessao;
};
const semAssinatura = () => () => {};
const estaInstalado = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function MobileMembro({
  person, member, ...rest
}: MobileOverlayProps & { person: P; member: M | null }) {
  const { todayISO, aindaVaiAcontecer, saudacao } = useRelogioDaIgreja();
  const [tab, setTab] = useState<MemberTab>("inicio");
  const [sub, setSub] = useState<string | null>(null);
  const [announcementTarget, setAnnouncementTarget] = useState<string | null>(null);
  const [cardTarget, setCardTarget] = useState<string | null>(null);
  const [agSeg, setAgSeg] = useState<AgendaSeg>("minha");
  const [chatTarget, setChatTarget] = useState<{ id: string | null; novo: boolean; n: number }>({ id: null, novo: false, n: 0 });
  const [chatAberto, setChatAberto] = useState<string | null>(null);
  const [sheetEl, setSheetEl] = useState<React.ReactNode | null>(null);
  const [toastO, setToastO] = useState<{ msg: string; action?: { label: string; fn: () => void }; id: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  /* troca de aba com direção (prancha 1): a tela nova desliza do lado de onde vem */
  const tabAnterior = useRef(tab);
  useLayoutEffect(() => {
    const ordem = MEMBER_TABS.map((t) => t.id);
    const dir = ordem.indexOf(tab) - ordem.indexOf(tabAnterior.current);
    tabAnterior.current = tab;
    entrarComDirecao(scrollRef.current, dir);
  }, [tab]);
  const [textPos] = useTextSize();
  const textScale = fatorDa(textPos);
  /* Perfil › Tamanho do texto: folha fixa embaixo; ao fechar, a linha que a
     abriu volta ao mesmo lugar da tela (o conteúdo mudou de altura atrás) */
  const [tsAberto, setTsAberto] = useState(false);
  const tsAncora = useRef<{ el: HTMLElement | null; top: number } | null>(null);
  const abrirTamanhoTexto = () => {
    const el = (document.activeElement as HTMLElement | null) ?? null;
    tsAncora.current = { el, top: el?.getBoundingClientRect().top ?? 0 };
    setTsAberto(true);
  };
  const fecharTamanhoTexto = () => {
    setTsAberto(false);
    requestAnimationFrame(() => {
      const a = tsAncora.current;
      const box = scrollRef.current;
      tsAncora.current = null;
      if (!a?.el || !box || !a.el.isConnected) return;
      const delta = a.el.getBoundingClientRect().top - a.top;
      /* a rolagem da coluna conta em pixels já ampliados pelo zoom */
      if (Math.abs(delta) >= 1) box.scrollTop += delta / (parseFloat(getComputedStyle(box).zoom) || 1);
    });
  };
  const { termo, comTermos: ct } = useTermos();
  /* pedido de oração só aparece com alguém para receber (v7 2.5) */
  const destOracao = useDestinatario("oracao");
  /* primeiro acesso termina quando a ficha tem os dados obrigatórios
     (member.contactComplete, calculado no servidor): vale em qualquer
     aparelho e não diverge entre o HTML do servidor e o do navegador */
  const [onboarded, setOnboarded] = useState<boolean>(() => !member || !!(member.firstAccessDone ?? member.contactComplete));
  const { people, ministries, events, roster, cards, boards, enrollments, courseModules = [], courseLessons = [],
          visitors, baptismClasses, announcements: avisosRecebidos, chats, chatMembers, messages, members, onReadAnnouncement, onCompleteOnboarding, onAddCardComment,
          onAdvanceVisitorStage, onRegisterVisitor, onSendMessage, onStartChat,
          organizationId, churchName, churchLogoUrl, theme, setTheme, onChangePassword, onUpdateProfile,
          journeyRequests = [], onRequestJourneyStep, onResponderEscala,
          kidsClasses = [], kidsChildren = [], childGuardians = [], kidsSessions = [], kidsAttendance = [],
          kidsEvents = [], kidsEventEnrollments = [], wallPosts = [], bibleMarks = [], onSaveBibleMark,
          missingRequirements = [], serveRequests = [], baptismCandidates = [], onEnrollCourse, onRequestBaptism, onRequestServe,
          mode, onLogout, onSwitchToPanel, readAnnouncementIds = [], churchPurpose, contribuir: contribuirCfg,
          onSaveAvailability, onRespondAnnouncement, announcementResponses = [],
          eventRsvps = [], onRespondEvent, meetings = [], rehearsals = [], paginaUrl, timelineEvents = [], fellowshipGroups = [], onMarkChatRead } = rest;
  /* Mural sempre do mais recente para o mais antigo, pela data de publicação */
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- compilador do React não está ligado; filhos dependem da identidade
  const announcements = useMemo(() => porPublicacao(avisosRecebidos), [avisosRecebidos]);
  /* curso em rascunho não aparece no app */
  const courses = rest.courses.filter((c) => c.published !== false);
  const journey: JourneyActions = {
    missing: missingRequirements, serveRequests, baptismCandidates, onEnrollCourse, onRequestBaptism, onRequestServe,
    names: { courses: courses.map((c) => ({ id: c.id, name: c.name })), events: events.map((e) => ({ id: e.id, name: e.name })) },
  };

  const isRecep = isRecepPerson(person, ministries);
  const isKids = isKidsPerson(person, ministries);
  const serves = ministries.some((m) => m.people.some((mp) => mp.personId === person.id));
  const isGuardian = childGuardians.some((g) => g.guardian_person_id === person.id);
  const ctx: ModuleCtx = { serves, isRecep, isKids, isGuardian };
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- compilador do React não está ligado; filhos dependem da identidade
  const ligadosMembro = useMemo(() => modulosLigados(rest.modulos), [rest.modulos]);
  const modulosMembro = useMemo(() => membrosDoRegistro(ligadosMembro), [ligadosMembro]);
  const subAllowed = (id: string | null) => !id || (modulosMembro.find((m) => m.id === id)?.visible(ctx) ?? false);
  /* Mural desligado na igreja: sem entrada em Mensagens nem cartão no Início (lei 6) */
  const muralOn = subAllowed("mural");
  /* Contribuir só com a chave cadastrada e o módulo ligado (lei 6) */
  const pix = subAllowed("contribuir") ? contribuirPronto(contribuirCfg) : null;
  const oracaoOn = subAllowed("oracao") && !!member;
  const pixOn = !!pix;
  const pedirOracao = member && ((destOracao && onStartChat) || oracaoOn)
    ? () => setSheetEl(<SheetOracao member={member} dest={destOracao ?? null} onStartChat={onStartChat} organizationId={organizationId} muralOn={oracaoOn} />)
    : null;

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- compilador do React não está ligado; filhos dependem da identidade
  const lidos = useMemo(() => new Set(readAnnouncementIds), [readAnnouncementIds]);
  const [lidosAgora, setLidosAgora] = useState<Set<string>>(() => new Set());
  const unreadIds = useMemo(() => new Set(announcements.filter((a) => !lidos.has(a.id) && !lidosAgora.has(a.id)).map((a) => a.id)), [announcements, lidos, lidosAgora]);
  const marcarLido = (personId: string, id: string) => {
    setLidosAgora((p) => (p.has(id) ? p : new Set(p).add(id)));
    onReadAnnouncement?.(personId, id);
  };
  const hoje = todayISO();
  /* destaque valendo: o mais recente com prazo ainda por vir (v7 4.4) */
  const [abriuEm] = useState(() => new Date().toISOString());
  const destaqueAtivo = useMemo(() => announcements.find((a) => !!a.highlight_until && a.highlight_until > abriuEm) ?? null, [announcements, abriuEm]);
  const evDate = new Map(events.map((e) => [e.id, e.eventDate]));
  const [respostas, setRespostas] = useState<Record<string, "ok" | "no">>({});
  const responderEscalaUi = (id: string, v: "ok" | "no" | null) => setRespostas((r) => {
    if (v === null) { if (!(id in r)) return r; const n = { ...r }; delete n[id]; return n; }
    return r[id] === v ? r : { ...r, [id]: v };
  });
  const pendEscala = roster.filter((r) => r.person_id === person.id && ((respostas[r.id] as string | undefined) ?? r.status) === "wait" && (evDate.get(r.event_id) ?? "") >= hoje).length;
  /* conversas não lidas (v7 4.15): lida na hora em que abre, sem esperar o servidor */
  const [conversasLidas, setConversasLidas] = useState<Record<string, string>>({});
  const naoLidas = useMemo(() => naoLidasPorConversa(chatMembers, messages, member?.id, conversasLidas), [chatMembers, messages, member?.id, conversasLidas]);
  const marcarConversaLida = (chatId: string) => {
    setConversasLidas((p) => ({ ...p, [chatId]: new Date().toISOString() }));
    onMarkChatRead?.(chatId);
  };
  const badges: Partial<Record<MemberTab, number>> = { agenda: serves ? pendEscala : 0, mensagens: (muralOn ? unreadIds.size : 0) + naoLidas.size };

  const toast = (msg: string, action?: { label: string; fn: () => void }) => setToastO({ msg, action, id: Date.now() });
  useEffect(() => {
    if (!toastO) return;
    const h = setTimeout(() => setToastO(null), toastO.action ? UNDO_MS : 3600);
    return () => clearTimeout(h);
  }, [toastO]);
  useEffect(() => { if (!cardTarget && !announcementTarget) scrollRef.current?.scrollTo({ top: 0 }); }, [tab, sub, cardTarget, announcementTarget]);

  /* v7 4.10: o atalho na tela de início é pedido no segundo acesso (contador no aparelho) */
  const acessos = useSyncExternalStore(semAssinatura, contarAcesso, () => 0);
  const instalado = useSyncExternalStore(semAssinatura, estaInstalado, () => false);
  /* aba de onde o Perfil foi aberto: o "voltar" do Perfil leva para ela */
  const [tabAntesPerfil, setTabAntesPerfil] = useState<MemberTab>("inicio");
  /* rótulo "Perfil" sob o avatar só no primeiro acesso: lido uma vez, gravado na hora */
  const [rotuloAvatar, setRotuloAvatar] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(AVATAR_VISTO)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- lido e gravado uma vez no navegador (o servidor não tem o armazenamento)
        setRotuloAvatar(true);
        localStorage.setItem(AVATAR_VISTO, "1");
      }
    } catch { /* sem armazenamento: sem rótulo */ }
  }, []);
  const go: MemberUi["go"] = (t, s = null, extra = {}) => {
    if (t === "perfil" && tab !== "perfil") setTabAntesPerfil(tab);
    /* tocar na aba ativa volta ao topo */
    if (t === tab && !s && !sub && !extra.chatId && !extra.newChat) scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setAnnouncementTarget(extra.announcementId ?? null);
    setCardTarget(extra.cardId ?? null);
    const segment = extra.agSeg ?? (extra.cardId || s === "tarefas" ? "minha" : agSeg);
    setAgSeg(segment);
    if (extra.chatId !== undefined || extra.newChat) setChatTarget((c) => ({ id: extra.chatId ?? null, novo: !!extra.newChat, n: c.n + 1 }));
    else if (t === "mensagens" && !s) setChatTarget((c) => ({ id: null, novo: false, n: c.n + 1 }));
    setChatAberto(null);
    const accepted = s && modulosMembro.some((m) => m.id === s && m.home === t && m.visible(ctx)) && (s !== "contribuir" || pix) && (s !== "oracao" || oracaoOn) ? s : null;
    const destination = t === "agenda" && accepted === "tarefas" ? null : accepted;
    setTab(t);
    setSub(destination);
    if (mode === "self") {
      const current = new URL(window.location.href);
      const next = writeMemberLocation(current, { tab: t, sub: destination, segment, announcement: extra.announcementId ?? null, card: extra.cardId ?? null });
      if (next.href !== current.href) window.history.pushState({ ...window.history.state, cexMemberFrom: { tab, sub } }, "", next.pathname + next.search + next.hash);
    }
  };
  /* Estado de navegação externo: restaura após hidratar e ao voltar/avançar.
     Pré-visualização do líder não muda o endereço nem a navegação do painel. */
  useEffect(() => {
    if (mode !== "self") return;
    const restore = () => {
      const next = readMemberLocation(new URL(window.location.href), (t, s) =>
        modulosMembro.some((m) => m.id === s && m.home === t && m.visible({ serves, isRecep, isKids, isGuardian })) && (s !== "contribuir" || pixOn) && (s !== "oracao" || oracaoOn));
      const canonical = writeMemberLocation(new URL(window.location.href), next);
      window.history.replaceState(window.history.state, "", canonical.pathname + canonical.search + canonical.hash);
      setTab(next.tab);
      setSub(next.sub);
      setAgSeg(next.segment);
      setAnnouncementTarget(next.announcement);
      setCardTarget(next.card);
      setSheetEl(null);
      setChatAberto(null);
      setChatTarget((c) => ({ id: null, novo: false, n: c.n + 1 }));
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [mode, person.id, organizationId, modulosMembro, serves, isRecep, isKids, isGuardian, pixOn, oracaoOn]);
  const abrirEvento = (eventId: string) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    const slot = roster.find((r) => r.event_id === ev.id && r.person_id === person.id);
    const ministry = slot ? ministries.find((m) => m.positions?.some((p) => p.id === slot.position_id)) : undefined;
    const rsvp = eventRsvps.find((r) => r.event_id === ev.id)?.kind ?? null;
    setSheetEl(<SheetEvento key={ev.id} ev={ev} slot={slot} ministry={ministry} rsvp={rsvp} onRespond={onRespondEvent} paginaUrl={paginaUrl} churchName={churchName} />);
  };
  /* v7 5.3: depois da primeira escala confirmada, uma vez por aparelho, se o navegador ainda não respondeu */
  const escalaConfirmada = useCallback(() => {
    try {
      if (localStorage.getItem("cex_avisos_pedidos")) return;
      if (!("Notification" in window) || Notification.permission !== "default" || !("PushManager" in window)) return;
      localStorage.setItem("cex_avisos_pedidos", "1");
    } catch { return; }
    setSheetEl(<SheetPedirAvisos organizationId={organizationId} />);
  }, [organizationId, setSheetEl]);
  /* A sugestão de notificações espera a janela de Desfazer. Ela não cobre
     o botão de desfazer nem aparece para uma confirmação cancelada. */
  useEffect(() => {
    if (!Object.values(respostas).includes("ok")) return;
    const timer = setTimeout(escalaConfirmada, UNDO_MS);
    return () => clearTimeout(timer);
  }, [respostas, escalaConfirmada]);
  /* mapa da igreja (0087): quem já era membro antes do termo responde uma vez,
     depois do primeiro acesso; a resposta (aceite ou "agora não") fica gravada */
  const aceiteMapaPedido = useRef(false);
  useEffect(() => {
    if (mode !== "self" || !onboarded || !member || aceiteMapaPedido.current) return;
    if ((member.mapConsentAt || member.mapConsentDeclinedAt) && member.mapConsentTerms === TERMO_MAPA_VERSAO) return;
    const timer = setTimeout(() => {
      aceiteMapaPedido.current = true;
      setSheetEl(<SheetAceiteMapa memberId={member.id} churchName={churchName} onDecidido={() => {}} />);
    }, 800);
    return () => clearTimeout(timer);
  }, [mode, onboarded, member, churchName]);
  const ui: MemberUi = { go, sheet: setSheetEl, toast, respostas, responderEscala: responderEscalaUi, tamanhoTexto: abrirTamanhoTexto, abrirEvento, escalaConfirmada };

  const pedirEtapa = (step: JourneyStep) => {
    const nome = { decisao: "Decisão", batismo: "Batismo", curso: "Fundamentos", integracao: termo("grupo"), time: "Servindo" }[step];
    setSheetEl(<SheetPedidoEtapa step={step} nome={nome} member={member} onRequestJourneyStep={onRequestJourneyStep} />);
  };
  const abrirTimes = () => setSheetEl(<SheetTimes person={person} member={member} ministries={ministries} members={members} people={people} />);

  /* o primeiro acesso termina na escala pendente (Agenda) ou no próximo culto (detalhe) */
  const terminarPrimeiroAcesso = () => {
    setOnboarded(true);
    if (pendEscala > 0) { go("agenda", null, { agSeg: "minha" }); return; }
    const prox = events.filter((e) => aindaVaiAcontecer(e.eventDate, e.time, e.timeZone)).sort((a, b) => (a.eventDate + a.time).localeCompare(b.eventDate + b.time))[0];
    if (prox) abrirEvento(prox.id);
  };

  if (!onboarded) {
    return (
      <div className="phone" data-ts={textPos} style={{ "--m-scale": textScale } as React.CSSProperties}>
        <div className="phone-screen">
          <div className="phone-notch" />
          <Onboarding person={person} member={member} churchName={churchName} churchLogoUrl={churchLogoUrl} organizationId={organizationId} onCompleteOnboarding={onCompleteOnboarding} onDone={terminarPrimeiroAcesso} />
        </div>
      </div>
    );
  }

  const tabTitle = ct(MEMBER_TABS.find((t) => t.id === tab)!.l);
  const subTitle = sub === "chat" ? (chatAberto ?? "Conversa") : sub ? moduleTitle(sub) : "";
  const voltar = () => {
    if (sub === "chat") { setChatTarget((c) => ({ id: null, novo: false, n: c.n + 1 })); setChatAberto(null); }
    const from = mode === "self" ? window.history.state?.cexMemberFrom : null;
    if (from?.tab === tab && from.sub === null) window.history.back();
    else go(tab);
  };

  return (
    <JourneyContext.Provider value={journey}>
    <MemberUiContext.Provider value={ui}>
    <StepsHost
      person={person} member={member} ministries={ministries} courses={courses} enrollments={enrollments} baptismClasses={baptismClasses}
      courseModules={courseModules} courseLessons={courseLessons}
      journeyRequests={journeyRequests} onOpenSub={(s) => go("caminhada", s)} onRequestStep={pedirEtapa} onServir={abrirTimes}
    >
    {(steps) => (
    <div className="phone" data-ts={textPos} style={{ "--m-scale": textScale } as React.CSSProperties}>
      <div className="phone-screen">
        <div className="phone-notch" />
        <div className="m-statusbar">
          <span>9:41</span>
          <span>{churchName || "Service"} </span>
        </div>
        <div className="m-head">
          {sub ? (
            <>
              <Acao className="m6-back" onClick={voltar}><span className="m6-back-ic"><Icon name="voltar" size={22} /></span>{tabTitle}</Acao>
              <h1 className="m-h1 sub">{subTitle}</h1>
            </>
          ) : tab === "perfil" ? (
            <>
              <Acao className="m6-back" onClick={() => go(tabAntesPerfil)}><span className="m6-back-ic"><Icon name="voltar" size={22} /></span>{ct(MEMBER_TABS.find((t) => t.id === tabAntesPerfil)!.l)}</Acao>
              <h1 className="m-h1 sub">{tabTitle}</h1>
            </>
          ) : (
            <>
              <div className="m-head-top">
                <ChurchLockup size="sm" logoUrl={churchLogoUrl} name={churchName} />
                <Acao className={`m-head-av${rotuloAvatar ? " has-l" : ""}`} onClick={() => { setRotuloAvatar(false); go("perfil"); }} aria-label="Perfil">
                  <Av name={person.name} size="sm" photoUrl={person.photoUrl} />
                  {rotuloAvatar && <span className="m-head-av-l" aria-hidden="true">Perfil</span>}
                </Acao>
              </div>
              {tab === "inicio" ? (
                <>
                  <h1 className="m-h1">{saudacao()}, {person.name.split(" ")[0]}</h1>
                  <p className="m-hsub">{(() => {
                    /* v7 4.19: o mais relevante de hoje; sem nada, a data */
                    const doDia = events.filter((e) => e.eventDate === hoje);
                    const minhaVaga = roster.find((r) => r.person_id === person.id && r.status !== "no" && doDia.some((e) => e.id === r.event_id));
                    const evServe = minhaVaga ? doDia.find((e) => e.id === minhaVaga.event_id) : undefined;
                    const timeServe = minhaVaga ? ministries.find((m) => m.positions?.some((p) => p.id === minhaVaga.position_id)) : undefined;
                    const culto = doDia.filter((e) => aindaVaiAcontecer(e.eventDate, e.time, e.timeZone)).sort((a, b) => a.time.localeCompare(b.time))[0];
                    const grupo = member?.groupId ? fellowshipGroups.find((g) => g.id === member.groupId && mesmoDiaDaSemana(g.weekday, hoje)) : undefined;
                    const aula = minhasAulas(member, courses, enrollments, courseModules, courseLessons, hoje).find(({ aula: a }) => a.lesson_date === hoje);
                    return linhaDoMembro({
                      serve: evServe ? { hora: evServe.time, chegar: horaDeChegada(evServe.time, chegadaDoTime(timeServe)) } : null,
                      culto: culto ? { nome: culto.name, hora: culto.time } : null,
                      grupo: grupo ? { nome: grupo.name, hora: grupo.time } : null,
                      aula: aula ? { nome: aula.aula.name, hora: aula.aula.lesson_time } : null,
                    }, hoje);
                  })()}</p>
                </>
              ) : (
                <h1 className="m-h1">{tabTitle}</h1>
              )}
            </>
          )}
        </div>

        {/* marco principal só no app de verdade; a prévia do líder fica dentro do painel, que já tem o seu */}
        <div className="m-scroll" ref={scrollRef} role={mode === "self" ? "main" : undefined}>
          {tab === "inicio" && (
            <InicioV6 contribuir={pix} onContribuir={() => go("caminhada", "contribuir")} person={person} member={member} ministries={ministries} members={members} people={people} events={events} roster={roster} cards={cards}
              announcements={muralOn ? announcements : []} unreadIds={unreadIds} kidsChildren={kidsChildren} childGuardians={childGuardians}
              kidsCheckin={(destaque) => <CheckinKidsHoje person={person} events={events} kidsChildren={kidsChildren} childGuardians={childGuardians} kidsClasses={kidsClasses}
                kidsSessions={kidsSessions} kidsAttendance={kidsAttendance} organizationId={organizationId} destaque={destaque} />}
              onResponderEscala={onResponderEscala} onStartChat={onStartChat}
              nextStep={steps.find((s) => s.st === "andamento" && s.acao) ?? steps.find((s) => s.st === "afazer" && s.acao && s.id !== "time") ?? null}
              inscricoes={steps.filter((s) => s.st === "afazer" && !!s.inscricao)}
              onServir={abrirTimes} ligados={ligadosMembro} acessos={acessos} instalado={instalado}
              destaque={muralOn ? destaqueAtivo : null}
              organizationId={organizationId}
              onAbrirDestaque={(a) => { setSheetEl(<SheetArtigo a={a} />); marcarLido(person.id, a.id); }} />
          )}

          {tab === "agenda" && !sub && (
            <AgendaV6 organizationId={organizationId} initialCardId={cardTarget} seg={agSeg} setSeg={(segment) => go("agenda", null, { agSeg: segment })} person={person} member={member} members={members} ministries={ministries} events={events} roster={roster}
              cards={cards} boards={boards} isRecep={isRecep} isKids={isKids} onResponderEscala={onResponderEscala}
              onStartChat={onStartChat} onAddCardComment={onAddCardComment} onSaveAvailability={onSaveAvailability}
              aulas={minhasAulas(member, courses, enrollments, courseModules, courseLessons, hoje)} meetings={meetings} rehearsals={rehearsals} rsvps={eventRsvps} />
          )}
          {tab === "agenda" && sub === "visitantes" && <div className="m6-legacy"><TabVisitantes visitors={visitors} onAdvanceVisitorStage={onAdvanceVisitorStage} onRegisterVisitor={onRegisterVisitor} /></div>}
          {tab === "agenda" && sub === "kids-sala" && (
            <div className="m6-legacy">
            <TabKids person={person} people={people} members={members} events={events} kidsClasses={kidsClasses} kidsChildren={kidsChildren}
              childGuardians={childGuardians} kidsSessions={kidsSessions} kidsAttendance={kidsAttendance} organizationId={organizationId} churchId={kidsClasses[0]?.church_id} />
            </div>
          )}

          {tab === "mensagens" && sub === "oracao" && oracaoOn && <MuralOracao organizationId={organizationId} onPedir={pedirOracao} sheet={setSheetEl} toast={toast} />}
          {tab === "mensagens" && sub === "mural" && <MuralV6 key={announcementTarget ?? "mural"} initialId={announcementTarget} announcements={announcements} unreadIds={unreadIds} person={person} onReadAnnouncement={marcarLido} responses={announcementResponses} onRespond={onRespondAnnouncement} />}
          {tab === "mensagens" && (!sub || sub === "chat") && (
            <>
              {!sub && (muralOn || oracaoOn) && (
                <div className="m6-sec0">
                  <Lista>
                    {muralOn && <Acao className={linhaClasse({ estilo: "app" })} onClick={() => go("mensagens", "mural")}>
                      <span className="m6-ic accent"><Icon name="bandeira" size={22} /></span>
                      <span className="m6-rb">
                        <span className="m6-rt">Mural da igreja</span>
                        <span className={`m6-rs m6-1l${unreadIds.size ? " m6-strong" : ""}`}>{announcements[0]?.title ?? "As publicações da igreja ficam aqui"}</span>
                      </span>
                      {unreadIds.size > 0 && <span className="m6-count">{unreadIds.size}</span>}
                    </Acao>}
                    {oracaoOn && <M6Row ic="oracao" t="Mural de oração" s="Peça oração e ore pelos pedidos da igreja" onClick={() => go("mensagens", "oracao")} cls="or-row" />}
                  </Lista>
                </div>
              )}
              <div className={sub ? "" : "m6-sec m6-conv"}>
                <TabConversas key={chatTarget.n} member={member} chats={chats} chatMembers={chatMembers} messages={messages} members={members} ministries={ministries}
                  people={people} naoLidas={naoLidas} onLida={marcarConversaLida}
                  onSendMessage={onSendMessage} onStartChat={onStartChat} openChatId={chatTarget.id} startNew={chatTarget.novo}
                  onChatOpen={(name) => { setChatAberto(name); setSub(name ? "chat" : null); }} />
              </div>
              {!sub && (
                <div className="m6-pad">
                  <Botao tamanho="toque" variante="principal" largo onClick={() => setSheetEl(
                    <div>
                      <h2 className="m6-sh">Nova mensagem</h2>
                      <Lista plano>
                        <M6Row ic="conversas" t="Falar com um líder" s="Pastor ou líder do seu time" onClick={() => { setSheetEl(null); go("mensagens", null, { newChat: true }); }} />
                        {pedirOracao && (
                          <M6Row ic="coracao" t="Pedido de oração" s={oracaoOn ? "Para a intercessão ou o mural de oração" : destOracao?.via === "intercessao" ? "Vai para quem cuida da intercessão" : "Vai para a liderança da igreja"} onClick={pedirOracao} />
                        )}
                      </Lista>
                    </div>,
                  )}><Icon name="add" size={20} />Nova mensagem</Botao>
                </div>
              )}
            </>
          )}

          {tab === "caminhada" && !sub && (
            <CaminhadaV6 steps={steps} purpose={churchPurpose} contribuir={pix}
              courses={<CursosResumo member={member} courses={courses} enrollments={enrollments} courseModules={courseModules} courseLessons={courseLessons} />} />
          )}
          {tab === "caminhada" && sub === "cursos" && (
            <div className="m6-legacy">
            <TabCursos member={member} courses={courses} enrollments={enrollments} courseModules={courseModules} courseLessons={courseLessons} />
            </div>
          )}
          {tab === "caminhada" && sub === "batismo" && <div className="m6-legacy"><TabBatismo baptismClasses={baptismClasses} memberId={member?.id ?? null} /></div>}
          {tab === "caminhada" && sub === "contribuir" && pix && <Contribuir cfg={pix} />}
          {tab === "caminhada" && sub === "biblia" && <div className="m6-legacy"><TabBiblia bibleMarks={bibleMarks} onSaveBibleMark={onSaveBibleMark} /></div>}

          {tab === "perfil" && (!sub || sub === "dados" || sub === "senha") && (
            <TabPerfil
              person={person}
              member={member}
              organizationId={organizationId}
              theme={theme}
              setTheme={setTheme}
              onChangePassword={onChangePassword}
              onUpdateProfile={onUpdateProfile}
              onLogout={mode === "self" ? onLogout : undefined}
              onSwitchToPanel={mode === "self" ? onSwitchToPanel : undefined}
              view={sub === "dados" ? "dados" : sub === "senha" ? "senha" : "home"}
              openSub={(s) => go("perfil", s)}
              contribuir={pix}
              onContribuir={() => go("caminhada", "contribuir")}
            />
          )}
          {tab === "perfil" && sub === "minha-historia" && <MinhaHistoria fatos={member ? timelineEvents.filter((f) => f.member_id === member.id) : []} />}
          {tab === "perfil" && sub === "familia" && (
            <div className="m6-legacy">
            <TabKidsArea
              checkinHoje={<CheckinKidsHoje person={person} events={events} kidsChildren={kidsChildren} childGuardians={childGuardians} kidsClasses={kidsClasses}
                kidsSessions={kidsSessions} kidsAttendance={kidsAttendance} organizationId={organizationId} />}
              person={person}
              people={people}
              kidsClasses={kidsClasses}
              kidsChildren={kidsChildren}
              childGuardians={childGuardians}
              kidsAttendance={kidsAttendance}
              kidsEvents={kidsEvents}
              kidsEventEnrollments={kidsEventEnrollments}
              wallPosts={wallPosts}
              organizationId={organizationId}
              churchId={kidsClasses[0]?.church_id}
            />
            </div>
          )}
        </div>

        <nav className="m-tab" aria-label="Navegação principal">
          {BAR_TABS.map((t) => {
            const on = tab === t.id;
            const b = badges[t.id] ?? 0;
            return (
              <Opcao key={t.id} marcada={on} aria-current={on ? "page" : undefined} onClick={() => go(t.id)}>
                <span className="ic">
                  <TabIcon name={t.ic} size={24} />
                  {b > 0 && <span className="m6-badge" aria-label={`${b} novos`}>{b}</span>}
                </span>
                <span className="m-tab-l">{ct(t.l.replace("}", ":curto}"))}</span>
              </Opcao>
            );
          })}
        </nav>

        {toastO && (
          <div className="m6-toast" key={toastO.id} role="status">
            <span>{toastO.msg}</span>
            {toastO.action && <Acao onClick={() => { toastO.action!.fn(); setToastO(null); }}>{toastO.action.label}</Acao>}
          </div>
        )}
        {sheetEl && <M6Sheet onClose={() => setSheetEl(null)}>{sheetEl}</M6Sheet>}
        {tsAberto && <TextSizeSheet onClose={fecharTamanhoTexto} />}
      </div>
    </div>
    )}
    </StepsHost>
    </MemberUiContext.Provider>
    </JourneyContext.Provider>
  );
}

// ── overlay principal (desktop) ───────────────────────────────────────────────

export default function MobileOverlay(props: MobileOverlayProps) {
  const { comTermos: ct } = useTermos();
  const { people, members, onClose, mode = "preview", selfPersonId, onLogout, onSwitchToPanel, textSizePerfil } = props;
  const isSelf = mode === "self";
  /* o aparelho segue o tamanho guardado no perfil (só no app da própria pessoa) */
  useEffect(() => { if (isSelf) sincronizarComPerfil(textSizePerfil); }, [isSelf, textSizePerfil]);

  const personas = isSelf ? [] : people.filter((p) => p.status === "ativo").slice(0, 3);
  const [idx, setIdx] = useState(0);

  const person = isSelf ? (people.find((p) => p.id === selfPersonId) ?? null) : (personas[idx] ?? people[0]);
  const member = person
    ? (members.find((m) => m.volunteerId === person.id) ?? null)
    : null;

  const closeAction = isSelf ? onLogout ?? onClose : onClose;
  const closeLabel = isSelf ? "Sair" : "← Voltar ao painel";

  if (!person) {
    return (
      <div className="mob-bg" onClick={isSelf ? undefined : onClose}>
        <div className="mob-side" onClick={(e) => e.stopPropagation()}>
          <div className="mob-side-eyebrow">{ct("App do {voluntario}")}</div>
          <h3>{isSelf ? "Cadastro não encontrado" : ct("Nenhum {voluntario} ativo")}</h3>
          <p>
            {isSelf
              ? "Não encontramos seu cadastro de pessoa nesta igreja. Fale com a liderança."
              : ct("Cadastre {voluntarios} em Pessoas para pré-visualizar o app deles aqui.")}
          </p>
          <Botao variante="discreto" compacto className="mob-close" onClick={closeAction}>{closeLabel}</Botao>
          {isSelf && onSwitchToPanel && <Botao variante="discreto" compacto className="mob-close mob-to-panel" onClick={onSwitchToPanel}>Gerenciar →</Botao>}
        </div>
      </div>
    );
  }

  return (
    <div className={`mob-bg${isSelf ? " mob-self" : ""}`} onClick={isSelf ? undefined : onClose}>
      <div className="mob-side" onClick={(e) => e.stopPropagation()}>
        {!isSelf && (
          <>
            <div className="mob-side-eyebrow">Mesma conta · outra superfície</div>
            <h3>
              O app do <span className="ol">membro</span>
            </h3>
            <p>
              O membro acompanha a {ct("{caminhada}")}, confirma escala, resolve tarefas do quadro,
              conversa com o time e o líder, faz cursos e pede oração, tudo pelo celular.
            </p>

            <div className="mob-persona">
              <div className="mob-persona-t">Pré-visualizar como</div>
              {personas.map((p, i) => {
                const m = members.find((m) => m.volunteerId === p.id);
                return (
                  <Acao
                    key={p.id}
                    className={`mob-persona-opt ${i === idx ? "on" : ""}`}
                    onClick={() => setIdx(i)}
                  >
                    <Av name={p.name} size="sm" photoUrl={p.photoUrl} />
                    <div>
                      <b>{p.name}</b>
                      <small>
                        {m ? "Membro" : ct("{Voluntario}")}
                        {p.tags.length > 0 ? ` · ${p.tags[0]}` : ""}
                      </small>
                    </div>
                    {i === idx && <span className="mob-persona-chk"><Icon name="ok" size={14} /></span>}
                  </Acao>
                );
              })}
              <div className="mob-persona-hint">
                {ct("O {voluntario}")} da Recepção vê o módulo de visitantes no lugar de Cursos.
              </div>
            </div>
          </>
        )}

        <Botao variante="discreto" compacto className="mob-close" onClick={closeAction}>{closeLabel}</Botao>
        {isSelf && onSwitchToPanel && <Botao variante="discreto" compacto className="mob-close mob-to-panel" onClick={onSwitchToPanel}>Gerenciar →</Botao>}
      </div>

      <div className="mob-phone-wrap" onClick={(e) => e.stopPropagation()}>
        <MobileMembro key={person.id} {...props} person={person} member={member} />
      </div>
    </div>
  );
}
