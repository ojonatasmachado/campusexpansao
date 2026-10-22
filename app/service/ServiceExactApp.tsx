"use client";

import { partesNoFuso } from "./lib/fuso";
import { RelogioProvider } from "./lib/relogio-context";
import { relogioDoFuso } from "./lib/relogio";
import { clearMemberLocation } from "./lib/member-navigation";

import { mesmoTelefone, telefoneParaGravar, variacoesTelefone } from "./lib/telefone";
import { ehNovo, nomeComparavel } from "./lib/pessoas";
import { avisar } from "./lib/avisar";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";
import { notifyPush } from "./lib/notify-push";
import { uploadServiceImage, imageExtension } from "./lib/upload-image";
import { Icon, Caret } from "./lib/icons";
import { THEME_COOKIE } from "./lib/theme";
import { vagasDaSemana } from "./modules/escalas/semana";
import { joinDot, parseISODate } from "./lib/date";
import MobileOverlay, { type MemberContactInput, type MobileOverlayProps } from "./MobileApp";
import { QRCheckinModal } from "./CheckIn";
import { comTermos, normalizarVocabulario } from "./lib/vocabulario";
import { VocabularioProvider } from "./lib/vocabulario-context";
import EventoShare from "./EventoShare";
import { ServiceAccessProvider } from "./AccessContext";
import ChurchLockup from "./ChurchLockup";
import { ORIGEM_AUTOCADASTRO } from "./modules/visitantes/autocadastro";
import TopUserMenu from "./TopUserMenu";
import { Coachmark, HelpFab, TOUR_DESKTOP, type SetupCounts } from "./HelpSystem";
import { EmptyState, RouteGroupContext } from "./painel/ui";
import { Escalas } from "./modules/escalas/Escalas";
import Financeiro from "./modules/financeiro/Financeiro";
import { ESCALA_DEFAULT } from "./modules/escalas/regras";
import { Membros, Pessoas } from "./modules/pessoas/Pessoas";
import { JRN_STEPS } from "./painel/caminhada";
import { Comunicacao } from "./modules/mural/Mural";
import { noAr } from "./modules/mural/estado";
import { friendlyWriteError } from "./painel/erros";
import { daMinhaLista, listaDeCuidado } from "./modules/cuidado/cuidado";
import { comData, escopoDe } from "./modules/aniversarios/aniversarios";
import { Aniversariantes, AniversariantesDaSemana } from "./modules/aniversarios/Aniversariantes";
import { OracaoPainel } from "./modules/oracao/OracaoPainel";
import { MapaIgreja } from "./modules/mapa/MapaIgreja";
import { Assistente } from "./modules/configuracao/Assistente";
import { medir } from "./lib/medicao";
import { MetricasInternas } from "./modules/relatorios/MetricasInternas";
import { Secretaria } from "./modules/secretaria/Secretaria";
import { ativacaoSubstituiTour, SETUP_INICIAL, type SetupEstado } from "./modules/configuracao/setup";
import { encontroUtil } from "./modules/configuracao/ativacao";
import { ROTA_GRUPO, navGroups, podeVerRota, rotaLigada } from "./modules/registry";
import { CEX_ICON_FOR, ROUTES, VISITOR_STAGES, ligadosDa, matrizComFallback, openMemberInviteWhatsapp, semContato48h, weekdayShortFromDate, writeJourneyStep } from "./painel/comum";
import { GlobalSearch, Painel } from "./painel/telas/Inicio";
import { Times } from "./painel/telas/Times";
import { Config } from "./painel/telas/Config";
import { Visitantes } from "./painel/telas/Visitantes";
import { Criancas } from "./painel/telas/Kids";
import { Batismos, CursosTrilhas, Decisoes } from "./painel/telas/Formacao";
import { Ensaios, Reunioes } from "./painel/telas/Reunioes";
import { Cultos, Espacos } from "./painel/telas/Agenda";
import { Quadros } from "./painel/telas/Quadros";
import { Conversas } from "./painel/telas/Conversas";
import { Relatorios } from "./painel/telas/Relatorios";
import { Historia, Identidade } from "./painel/telas/Identidade";
import { EntityDrawer } from "./painel/telas/FichaPessoa";
import { ServiceModal } from "./painel/telas/ServiceModal";
import type { ChurchView, DrawerState, FellowshipGroupView, JourneyChangeRequestView, JourneyStepKind, MemberView, MinistryView, ModalState, NavGroups, Props } from "./painel/tipos";
export type * from "./painel/tipos";

/* papel e permissão de cada tela : regra no registro de módulos (modules/registry.ts) */
const podeVerNav = podeVerRota;
/* telas fora do menu (atalhos internos) herdam o grupo declarado no manifesto */
const ROUTE_GROUP: Record<string, string> = ROTA_GRUPO;

const ROLE_LABEL: Record<string, string> = { master: "Pastor master", pastor: "Pastor", lider: "Líder", membro: "Membro" };

/* Marca do app: sempre ChurchLockup (logo da igreja | Service). */
function IgrejaLogo({ logoUrl, nome }: { logoUrl?: string | null; nome?: string }) {
  return <ChurchLockup logoUrl={logoUrl} name={nome} />;
}

function CongSwitcher({ churches, activeId, setActiveId }: { churches: ChurchView[]; activeId: string; setActiveId: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = churches.find((c) => c.id === activeId) ?? churches[0];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* o logo já está na marca logo acima: aqui é ícone. Com uma igreja só o
     seletor não finge que abre. */
  const unica = churches.length <= 1;
  const marca = <span className="cong-mark"><Icon name={active?.matriz ? "identidade" : "globo"} size={16} /></span>;
  const info = (
    <span className="cong-info">
      <span className="cong-name">{active?.nome ?? "Sua igreja"}</span>
      <span className="cong-role">{active?.matriz ? (unica ? "Matriz" : "Matriz · rede") : "Congregação"}</span>
    </span>
  );
  if (unica) return <div className="cong"><div className="cong-btn static">{marca}{info}</div></div>;

  return (
    <div className="cong" ref={ref}>
      <button className="cong-btn" type="button" onClick={() => setOpen((o) => !o)}>
        {marca}{info}
        <span className="cong-caret"><Caret /></span>
      </button>
      {open && churches.length > 1 && (
        <div className="cong-menu">
          <div className="cong-group">Matriz</div>
          {churches.filter((c) => c.matriz).map((c) => (
            <button key={c.id} className={`cong-opt ${c.id === activeId ? "on" : ""}`} type="button"
              onClick={() => { setActiveId(c.id); setOpen(false); }}>
              <span className="cong-opt-mark">
                <Icon name={c.matriz ? "identidade" : "globo"} size={14} />
              </span>
              <span className="cong-opt-info">
                <span className="cong-opt-name">{c.nome}</span>
                <span className="cong-opt-sub">{c.cidade}</span>
              </span>
            </button>
          ))}
          {churches.some((c) => !c.matriz) && (
            <>
              <div className="cong-group">Congregações</div>
              {churches.filter((c) => !c.matriz).map((c) => (
                <button key={c.id} className={`cong-opt ${c.id === activeId ? "on" : ""}`} type="button"
                  onClick={() => { setActiveId(c.id); setOpen(false); }}>
                  <span className="cong-opt-mark">
                <Icon name={c.matriz ? "identidade" : "globo"} size={14} />
              </span>
                  <span className="cong-opt-info">
                    <span className="cong-opt-name">{c.nome}</span>
                    <span className="cong-opt-sub">{c.cidade}</span>
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ServiceExactApp({
  churches,
  people,
  members,
  ministries,
  events,
  roster,
  visitorsInCare,
  visitors,
  visitorNotes,
  announcements,
  announcementReads = [],
  announcementResponses = [],
  eventRsvps = [],
  careMarks = [],
  eventAttendance = [],
  wallPosts,
  decisions,
  baptismClasses,
  baptismCandidates,
  courses,
  enrollments,
  courseModules,
  courseLessons,
  lessonAttendance,
  boards,
  cards,
  chats,
  chatMembers,
  messages,
  meetings,
  meetingActions,
  rehearsals,
  rooms,
  reservations,
  kidsClasses = [],
  kidsChildren = [],
  childGuardians = [],
  kidsSessions = [],
  kidsAttendance = [],
  kidsEvents = [],
  kidsEventEnrollments = [],
  churchIdentity = null,
  cycles = [],
  historyEntries = [],
  ministerialTitles = [],
  fellowshipGroups = [],
  tags = [],
  timelineEvents = [],
  journeyRequests = [],
  requirements = [],
  personGrants = [],
  missingRequirements = [],
  serveRequests = [],
  bibleMarks = [],
  currentRole = "master",
  permissionsMatrix = {},
  currentPersonId = null,
  textSizePerfil = null,
  enqueteElegivel = null,
  pesquisaElegivel = null,
  initialTheme = "dark",
  initialView = "gestao",
  error,
}: Props) {
  const [route, setRoute] = useState<keyof typeof ROUTES>("painel");
  /* tela nova abre do topo: sem isso, Escalas abria na altura em que o Início estava
     rolado. Layout effect roda antes dos efeitos das telas, então a rolagem até o time
     de Escalas (foco vindo da cobertura) continua valendo. */
  useLayoutEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [route]);
  /* v7 4.16: clicar num time incompleto da cobertura abre Escalas no culto e no time */
  const [escalaFoco, setEscalaFoco] = useState<{ eventId: string; timeId?: string; n: number } | null>(null);
  const abrirVagas = (eventId: string, timeId?: string) => { setEscalaFoco((f) => ({ eventId, timeId, n: (f?.n ?? 0) + 1 })); setDrawer(null); setRoute("escalas"); };
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [modal, setModal] = useState<ModalState>(null);
  /* modo desta pessoa: o servidor já resolveu (cookie cex_theme ou modo
     padrão da igreja, ver lib/theme.ts resolveMode). A troca feita no app
     grava o cookie, pra próxima página já vir no modo certo. */
  const [theme, setThemeState] = useState<"dark" | "light">(initialTheme);
  /* quem tem função de gestão alterna entre o próprio app de membro e o
     painel; a escolha fica no aparelho (cookie cex_view, lido no servidor) */
  const [view, setViewState] = useState<"app" | "gestao">(initialView);
  const setView = (next: "app" | "gestao") => {
    document.cookie = `cex_view=${next}; path=/; max-age=31536000; samesite=lax`;
    if (next === "gestao") {
      const url = clearMemberLocation(new URL(window.location.href));
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
    setViewState(next);
  };
  const setTheme = (next: "dark" | "light" | ((t: "dark" | "light") => "dark" | "light")) => {
    setThemeState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      document.cookie = `${THEME_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
      return value;
    });
  };
  const [activeChurchId, setActiveChurchId] = useState<string>(churches[0]?.id ?? "");
  const [navOpen, setNavOpen] = useState(false);
  /* no celular a busca é um ícone que abre o campo na largura toda */
  const [buscaAberta, setBuscaAberta] = useState(false);
  /* grupos do menu recolhidos (fica guardado no aparelho) */
  const [gruposFechados, setGruposFechados] = useState<string[]>([]);
  const [maisAberto, setMaisAberto] = useState(false);
  useEffect(() => {
    /* lido depois da hidratação: o servidor não tem localStorage */
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência do aparelho, só existe no navegador
    try { setGruposFechados(JSON.parse(localStorage.getItem("cex_nav_closed") ?? "[]")); } catch { /* sem armazenamento */ }
  }, []);
  const alternarGrupo = (g: string) => setGruposFechados((prev) => {
    const next = prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g];
    try { localStorage.setItem("cex_nav_closed", JSON.stringify(next)); } catch { /* sem armazenamento */ }
    return next;
  });
  const [checkinEventId, setCheckinEventId] = useState<string | null>(null);
  const [shareEventId, setShareEventId] = useState<string | null>(null);
  const [pendingChatMemberId, setPendingChatMemberId] = useState<string | null>(null);
  const startChatWithMember = (memberId: string) => {
    setDrawer(null);
    setPendingChatMemberId(memberId);
    setRoute("conversas");
  };
  useEffect(() => {
    document.body.dataset.theme = theme;
    /* barra de status do celular na cor do fundo do app (a do layout é fixa no
       escuro CE.X): segue o modo claro/escuro e a família de neutros da igreja */
    const fundo = getComputedStyle(document.body).getPropertyValue("--ink").trim();
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const antes = meta?.content;
    if (meta && fundo) meta.content = fundo;
    return () => { document.body.dataset.theme = ""; if (meta && antes) meta.content = antes; };
  }, [theme]);

  const firstChurch = churches.find((c) => c.id === activeChurchId) ?? churches[0];
  const { todayISO, horaAgoraBR, fuso } = useMemo(() => relogioDoFuso(firstChurch?.timeZone), [firstChurch?.timeZone]);
  const router = useRouter();
  /* vocabulário da igreja (lei 7): da matriz, igual à marca do app */
  const sedeVocab = churches.find((c) => c.matriz) ?? firstChurch;
  const vocab = useMemo(
    () => normalizarVocabulario(sedeVocab?.vocabulario, sedeVocab?.settings?.gruposCfg?.termoP),
    [sedeVocab?.vocabulario, sedeVocab?.settings?.gruposCfg?.termoP],
  );
  const ct = (texto: string) => comTermos(texto, vocab);

  /* tour guiado + botão de ajuda : dispara sozinho no 1º login de
     liderança (nunca pro papel "membro", que usa o app pelo celular). */
  const [showTour, setShowTour] = useState(false);
  const [tourStart, setTourStart] = useState(0);
  /* passo != null : já teve um tour incompleto (fechou a aba/atualizou no
     meio) e a pergunta de retomar ainda não foi respondida. Sem isso, toda
     visita seguinte reabria o tour do zero a partir do passo 1. */
  const [tourResumeStep, setTourResumeStep] = useState<number | null>(null);
  useEffect(() => {
    /* localStorage só existe no cliente : precisa ficar num efeito (não num
       initializer de useState) pra não divergir do HTML renderizado no
       servidor. abre a sidebar (navOpen) junto pro holofote já nascer visível. */
    if (currentRole === "membro") return;
    /* v7 4.12: igreja ainda na configuração guiada: a gestão vê "Sua igreja: fase N de 3" no Início no lugar do tour */
    const preparacao = firstChurch?.settings?.setup;
    if ((currentRole === "master" || currentRole === "pastor") && ativacaoSubstituiTour(preparacao, ministries.length === 0, events.length === 0)) return;
    let tourDone = true;
    let savedStep = 0;
    try { tourDone = localStorage.getItem("cex_tour_done") === "1"; } catch { /* segue sem tour automático */ }
    try { savedStep = Number(localStorage.getItem("cex_tour_step") || "0") || 0; } catch { /* sem passo salvo */ }
    /* passo salvo do tour antigo (20 passos) que não existe no tour atual: recomeça */
    if (savedStep >= TOUR_DESKTOP.length) savedStep = 0;
    if (!tourDone) {
      if (savedStep > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 1ª visita: precisa ler localStorage no cliente antes de decidir
        setTourResumeStep(savedStep);
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowTour(true);
        setNavOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const closeTour = () => {
    setShowTour(false);
    try { localStorage.setItem("cex_tour_done", "1"); localStorage.removeItem("cex_tour_step"); } catch { /* fecha mesmo sem conseguir gravar */ }
  };
  const saveTourStep = (i: number) => {
    try { localStorage.setItem("cex_tour_step", String(i)); } catch { /* segue sem salvar o passo atual */ }
  };
  const startTourFrom = (step: number) => {
    setTourResumeStep(null);
    setTourStart(step);
    setShowTour(true);
    setNavOpen(true);
  };
  /* lei 11: abriu pelo toque numa notificação (?aviso=<categoria>): mede e limpa o endereço */
  useEffect(() => {
    const url = new URL(window.location.href);
    const cat = url.searchParams.get("aviso");
    if (!cat) return;
    medir(firstChurch?.organizationId, "notification_opened", { modulo: cat, tipo: "aviso", ref: cat });
    url.searchParams.delete("aviso");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* v7 4.12: configuração guiada; as gravações ficam aqui, o assistente só desenha */
  const setupEstado: SetupEstado = { ...SETUP_INICIAL, ...(firstChurch?.settings?.setup ?? {}) } as SetupEstado;
  const svc = () => createServiceBrowserClient().schema("service");
  const salvarSetup = async (e: SetupEstado) => {
    if (!firstChurch) return "Nenhuma igreja foi encontrada.";
    if (e.concluido && e.primeiroEventoId) {
      const { data: encontro, error } = await svc().from("events").select("name,event_date,time,location").eq("id", e.primeiroEventoId).eq("church_id", firstChurch.id).maybeSingle();
      if (error) return friendlyWriteError(error.message);
      if (!encontro || !encontroUtil({ nome: encontro.name, data: encontro.event_date ?? "", hora: encontro.time ?? "", local: encontro.location ?? "" }, todayISO(), horaAgoraBR())) return "O encontro precisa estar na agenda com data, horário e local válidos. Confira a programação antes de concluir.";
    }
    const { data, error: readError } = await svc().from("churches").select("settings").eq("id", firstChurch.id).single();
    if (readError) return friendlyWriteError(readError.message);
    const { error } = await svc().from("churches").update({ settings: { ...data.settings, setup: e } }).eq("id", firstChurch.id);
    if (error) return friendlyWriteError(error.message);
    router.refresh();
    return null;
  };
  const setupCounts: SetupCounts = useMemo(() => ({
    igreja: [firstChurch?.nome, firstChurch?.cidade, firstChurch?.address].join("|"),
    times: ministries.length,
    cultos: events.length,
    membros: members.length,
    escalados: roster.length,
  }), [firstChurch?.nome, firstChurch?.cidade, firstChurch?.address, ministries.length, events.length, members.length, roster.length]);


  const markAnnouncementRead = async (personId: string, announcementId: string) => {
    if (!firstChurch?.organizationId) return;
    await createServiceBrowserClient().schema("service").from("announcement_reads").upsert(
      { organization_id: firstChurch.organizationId, announcement_id: announcementId, person_id: personId },
      { onConflict: "announcement_id,person_id", ignoreDuplicates: true },
    );
    router.refresh();
  };
  /* dados de contato do próprio membro (primeiro acesso e perfil): a pessoa
     (people) ele mesmo edita; a ficha de membro só pelos campos de contato,
     via função do banco (0044 update_my_member_contact) */
  /* ações da caminhada do membro (0046): a função do banco confere os
     requisitos e devolve "ok" ou o motivo */
  const journeyRpc = async (fn: string, args: Record<string, unknown>): Promise<string> => {
    const { data, error } = await createServiceBrowserClient().schema("service").rpc(fn, args);
    if (error) return "erro";
    if (data === "ok") router.refresh();
    return String(data);
  };

  const saveMemberContact = async (personId: string, memberId: string | null, data: MemberContactInput): Promise<{ error?: string }> => {
    const supabase = createServiceBrowserClient();
    if (memberId && data.cpf !== undefined) {
      const doc = await supabase.schema("service").rpc("save_my_member_cpf", { p_member: memberId, p_cpf: data.cpf });
      if (doc.error || doc.data !== "ok") return { error: doc.data === "cpf_invalido" ? "Confira os números do CPF." : "Não foi possível salvar o CPF. Tente novamente." };
    }
    const targetPerson = people.find((p) => p.id === personId);
    const cep = data.cep.trim();
    const [pessoa, ficha] = await Promise.all([
      supabase.schema("service").from("people").update({
        name: data.name.trim(),
        /* campo vazio não apaga o que já existe (o primeiro acesso só pede nome e telefone) */
        ...(data.email.trim() ? { email: data.email.trim() } : {}),
        ...(telefoneParaGravar(data.phone) ? { phone: telefoneParaGravar(data.phone) } : {}),
        meta: { ...targetPerson?.meta, birthday: data.nasc || targetPerson?.meta?.birthday, neighborhood: data.bairro || targetPerson?.meta?.neighborhood },
      }).eq("id", personId),
      memberId
        ? supabase.schema("service").rpc("update_my_member_contact", {
            p_member: memberId,
            p_name: data.name.trim(),
            p_email: data.email.trim(),
            p_phone: telefoneParaGravar(data.phone) ?? "",
            p_birth: data.nasc,
            p_postal_code: cep,
            p_street: data.rua,
            p_neighborhood: data.bairro,
            p_city: data.cidade,
            p_state: data.estado,
          })
        : Promise.resolve({ data: true, error: null }),
    ]);
    /* a função devolve false quando a ficha não é da pessoa logada */
    if (pessoa.error || ficha.error || ficha.data === false) return { error: "Não foi possível salvar seus dados. Tente de novo." };
    router.refresh();
    return {};
  };
  const changePasswordMobile = async (senha: string) => {
    const { error } = await createServiceBrowserClient().auth.updateUser({ password: senha });
    return { error: error?.message };
  };
  const addCardCommentMobile = async (cardId: string, author: string, body: string) => {
    if (!firstChurch?.organizationId) return;
    await createServiceBrowserClient().schema("service").from("card_comments").insert({
      organization_id: firstChurch.organizationId,
      card_id: cardId,
      author,
      body,
    });
    router.refresh();
  };
  const advanceVisitorStageMobile = async (visitorId: string, nextStageId: string) => {
    const sb = createServiceBrowserClient().schema("service");
    const nextStage = VISITOR_STAGES.find((s) => s.id === nextStageId);
    await sb.from("visitors").update({ stage: nextStageId }).eq("id", visitorId);
    await sb.from("visitor_notes").insert({
      organization_id: firstChurch?.organizationId,
      visitor_id: visitorId,
      body: `Avançou para "${nextStage?.name ?? nextStageId}".`,
      author: "Equipe",
      is_milestone: true,
    });
    router.refresh();
  };
  const saveBibleMarkMobile = async (book: string, chapter: number, verse: number, data: { color: string | null; note: string | null }) => {
    if (!firstChurch?.organizationId || !currentPersonId) return;
    const semConteudo = !data.color && !(data.note && data.note.trim());
    const sb = createServiceBrowserClient().schema("service");
    if (semConteudo) {
      await sb.from("bible_marks").delete()
        .eq("person_id", currentPersonId).eq("version", "acf")
        .eq("book", book).eq("chapter", chapter).eq("verse", verse);
    } else {
      await sb.from("bible_marks").upsert({
        organization_id: firstChurch.organizationId,
        person_id: currentPersonId,
        version: "acf",
        book,
        chapter,
        verse,
        color: data.color,
        note: data.note,
      }, { onConflict: "person_id,version,book,chapter,verse" });
    }
    router.refresh();
  };
  const registerVisitorMobile = async (data: { name: string; phone: string; origin: string }) => {
    if (!firstChurch?.organizationId || !firstChurch.id) return;
    await createServiceBrowserClient().schema("service").from("visitors").insert({
      organization_id: firstChurch.organizationId,
      church_id: firstChurch.id,
      name: data.name,
      phone: data.phone || null,
      origin: data.origin || null,
      stage: "novo",
      due: "1º contato",
      due_status: "soon",
    });
    router.refresh();
  };
  const sendMessageMobile = async (chatId: string, senderId: string, body: string) => {
    if (!firstChurch?.organizationId || !body.trim()) return;
    await createServiceBrowserClient().schema("service").from("messages").insert({
      organization_id: firstChurch.organizationId,
      chat_id: chatId,
      sender_id: senderId,
      body: body.trim(),
    });
    const recipients = chatMembers.filter((cm) => cm.chat_id === chatId && cm.member_id !== senderId).map((cm) => cm.member_id);
    const senderName = members.find((m) => m.id === senderId)?.name ?? "Alguém";
    notifyPush(firstChurch.organizationId, recipients, senderName, body.trim(), "mensagens");
    router.refresh();
  };
  const startChatMobile = async (selfMemberId: string, targetMemberId: string, firstMessage: string) => {
    if (!firstChurch?.organizationId || !firstChurch.id) return null;
    const sb = createServiceBrowserClient().schema("service");
    const senderName = members.find((m) => m.id === selfMemberId)?.name ?? "Alguém";
    /* conversa pela função do banco (0049): o membro não consegue criar a
       conversa direto (as regras de leitura escondem a conversa recém-criada) */
    const viaRpc = await sb.rpc("start_dm", { p_target_member: targetMemberId, p_body: firstMessage.trim() || null });
    if (!viaRpc.error && viaRpc.data) {
      if (firstMessage.trim()) notifyPush(firstChurch.organizationId, [targetMemberId], senderName, firstMessage.trim(), "mensagens");
      router.refresh();
      return viaRpc.data as string;
    }
    if (viaRpc.error && !rpcFaltando(viaRpc.error)) { avisar("Não conseguimos abrir a conversa agora.", "warn"); return null; }
    const existing = chats.find((c) => c.kind === "dm"
      && chatMembers.some((cm) => cm.chat_id === c.id && cm.member_id === selfMemberId)
      && chatMembers.some((cm) => cm.chat_id === c.id && cm.member_id === targetMemberId));
    if (existing) {
      if (firstMessage.trim()) {
        await sb.from("messages").insert({
          organization_id: firstChurch.organizationId,
          chat_id: existing.id,
          sender_id: selfMemberId,
          body: firstMessage.trim(),
        });
        notifyPush(firstChurch.organizationId, [targetMemberId], senderName, firstMessage.trim(), "mensagens");
      }
      router.refresh();
      return existing.id;
    }
    const { data: chatRow, error } = await sb.from("chats").insert({
      organization_id: firstChurch.organizationId,
      church_id: firstChurch.id,
      kind: "dm",
      name: null,
    }).select("id").single();
    if (error || !chatRow) return null;
    await sb.from("chat_members").insert([
      { organization_id: firstChurch.organizationId, chat_id: chatRow.id, member_id: selfMemberId },
      { organization_id: firstChurch.organizationId, chat_id: chatRow.id, member_id: targetMemberId },
    ]);
    if (firstMessage.trim()) {
      await sb.from("messages").insert({
        organization_id: firstChurch.organizationId,
        chat_id: chatRow.id,
        sender_id: selfMemberId,
        body: firstMessage.trim(),
      });
      notifyPush(firstChurch.organizationId, [targetMemberId], senderName, firstMessage.trim(), "mensagens");
    }
    router.refresh();
    return chatRow.id;
  };
  const notificarLiderRecusa = async (leaderPersonId: string, volunteerPersonId: string, texto: string) => {
    const leaderMember = members.find((m) => m.volunteerId === leaderPersonId);
    const volunteerMember = members.find((m) => m.volunteerId === volunteerPersonId);
    if (!leaderMember || !volunteerMember || leaderMember.id === volunteerMember.id) return;
    await startChatMobile(volunteerMember.id, leaderMember.id, texto);
  };
  const submitJourneyRequest = async (memberId: string, step: JourneyStepKind, eventDate: string, note: string) => {
    if (!firstChurch?.organizationId || !currentPersonId) return;
    await createServiceBrowserClient().schema("service").from("journey_change_requests").insert({
      organization_id: firstChurch.organizationId,
      member_id: memberId,
      step,
      event_date: eventDate || null,
      note: note.trim() || null,
      requested_by: currentPersonId,
    });
    const member = members.find((m) => m.id === memberId);
    const stepLabel = ct(JRN_STEPS.find((s) => s.kind === step)?.label ?? step);
    if (member) {
      const leaderMemberIds = responsibleLeadersFor(member, fellowshipGroups, ministries)
        .map((personId) => members.find((m) => m.volunteerId === personId)?.id)
        .filter((id): id is string => !!id);
      if (leaderMemberIds.length) {
        notifyPush(firstChurch.organizationId, leaderMemberIds, member.name, ct(`Pediu pra marcar "${stepLabel}" na {caminhada}. Aprovar?`), "caminhada");
      }
    }
    router.refresh();
  };
  const approveJourneyRequest = async (request: JourneyChangeRequestView) => {
    if (!firstChurch?.organizationId || !currentPersonId) return;
    const member = members.find((m) => m.id === request.memberId);
    if (!member) return;
    await writeJourneyStep(firstChurch.organizationId, member, request.step, request.eventDate);
    await createServiceBrowserClient().schema("service").from("journey_change_requests").update({
      status: "aprovado",
      reviewed_by: currentPersonId,
      reviewed_at: new Date().toISOString(),
    }).eq("id", request.id);
    const stepLabel = ct(JRN_STEPS.find((s) => s.kind === request.step)?.label ?? request.step);
    notifyPush(firstChurch.organizationId, [member.id], ct("{Caminhada} aprovada"), ct(`"${stepLabel}" foi confirmado na sua {caminhada}.`), "caminhada");
    router.refresh();
  };
  /* o membro responde a própria escala pela função do banco (0049); antes
     dela o update direto era barrado pelas regras de acesso */
  const responderEscala = async (assignmentId: string, status: "ok" | "no" | "wait"): Promise<boolean> => {
    try {
      const sb = createServiceBrowserClient().schema("service");
      const { data, error } = await sb.rpc("respond_my_assignment", { p_assignment: assignmentId, p_status: status });
      let salvo = !error && data === "ok";
      if (error && rpcFaltando(error)) {
        const fallback = await sb.from("roster_assignments").update({ status }).eq("id", assignmentId).select("id");
        salvo = !fallback.error && (fallback.data?.length ?? 0) > 0;
      }
      if (salvo) router.refresh();
      return salvo;
    } catch { return false; }
  };
  const salvarDisponibilidade = async (availability: Record<string, boolean>) => {
    const { data, error } = await createServiceBrowserClient().schema("service").rpc("update_my_availability", { p_availability: availability, p_org: firstChurch?.organizationId ?? null });
    if (error || data !== "ok") { avisar("Não conseguimos salvar agora. Tente de novo.", "warn"); return false; }
    router.refresh();
    return true;
  };
  const responderEvento = async (eventId: string, vai: boolean) => {
    const { data, error } = await createServiceBrowserClient().schema("service").rpc("respond_event", { p_event: eventId, p_vai: vai });
    if (error || data !== "ok") { avisar("Não conseguimos enviar sua resposta agora.", "warn"); return false; }
    router.refresh();
    return true;
  };
  const responderMural = async (announcementId: string, response: "vou" | "nao" | null) => {
    const { data, error } = await createServiceBrowserClient().schema("service").rpc("respond_announcement", { p_announcement: announcementId, p_response: response });
    if (error || data !== "ok") { avisar("Não conseguimos enviar sua resposta agora.", "warn"); return false; }
    router.refresh();
    return true;
  };
  const rejectJourneyRequest = async (request: JourneyChangeRequestView, motivo?: string) => {
    if (!firstChurch?.organizationId || !currentPersonId) return;
    await createServiceBrowserClient().schema("service").from("journey_change_requests").update({
      status: "rejeitado",
      reviewed_by: currentPersonId,
      reviewed_at: new Date().toISOString(),
    }).eq("id", request.id);
    const member = members.find((m) => m.id === request.memberId);
    const stepLabel = ct(JRN_STEPS.find((s) => s.kind === request.step)?.label ?? request.step);
    if (member) {
      notifyPush(firstChurch.organizationId, [member.id], ct("{Caminhada}"), `Seu pedido de "${stepLabel}" não foi aprovado.${motivo ? ` Motivo: ${motivo}` : ""}`, "caminhada");
    }
    router.refresh();
  };
  const activePeople = people.filter((person) => person.status === "ativo").length;
  const eu = people.find((p) => p.id === currentPersonId);
  const matrizChurch = churches.find((c) => c.matriz) ?? firstChurch;
  const paginaUrl = matrizChurch?.slug && matrizChurch.settings?.paginaCfg?.enabled ? `/${matrizChurch.slug}` : null;
  const sair = async () => {
    await createServiceBrowserClient().auth.signOut();
    router.push("/service/login");
    router.refresh();
  };
  const positionsByEvent = useMemo(() => {
    return events.flatMap((event) => {
      const eventMinistries = event.ministries.length ? new Set(event.ministries) : null;
      return ministries.flatMap((ministry) =>
        ministry.positions
          .filter((position) => !eventMinistries || eventMinistries.has(position.ministry_id))
          .map((position) => ({ event, ministry, position })),
      );
    });
  }, [events, ministries]);
  const gaps = positionsByEvent.filter(({ event, position }) =>
    roster.filter((assignment) => assignment.event_id === event.id && assignment.position_id === position.id && assignment.status !== "no").length < Math.max(1, position.need_count),
  );

  /* mescla com o padrão (allTrue/allFalse por papel) pra qualquer ação que a org
     ainda não tenha uma linha salva em core.role_permissions não "vazar" visível
     por engano : sem isso, uma chave ausente cairia no fallback `?? true`. */
  const matrizEfetiva = matrizComFallback(permissionsMatrix);
  /* serve em algum time: vale a coluna "Voluntário" da matriz */
  const souVoluntario = !!currentPersonId && ministries.some((m) => m.people.some((p) => p.personId === currentPersonId));
  const currentExtraAccess = personGrants.filter((g) => g.personId === currentPersonId).map((g) => g.code);
  const accessData = {
    organizationId: firstChurch?.organizationId ?? "",
    currentPersonId,
    requirements,
    personGrants,
    courses: courses.map((c) => ({ id: c.id, name: c.name })),
    events: events.map((e) => ({ id: e.id, name: e.name, eventDate: e.eventDate })),
    groupsLabel: firstChurch?.settings?.gruposCfg?.sigla ?? "GC",
  };

  /* perspectiva efetiva: líder real vê só os times que lidera; master/pastor
     vê tudo, sem restrição (null). */
  const podePrevisualizar = currentRole === "master" || currentRole === "pastor";
  const misteriosQueLidero = currentPersonId
    ? ministries.filter((ministry) => ministry.people.some((link) => link.personId === currentPersonId && link.isLeader)).map((ministry) => ministry.id)
    : [];
  const scopeMinistryIds: string[] | null = podePrevisualizar ? null : (currentRole === "lider" ? misteriosQueLidero : null);
  /* v7 2.8: líder sem "Pessoas e grupos" na matriz, mas com "Voluntários", vê
     Pessoas só com quem está nos times que lidera. Sem time, sem a entrada. */
  const pessoasSoDoTime = currentRole === "lider"
    && !podeVerNav("membros", currentRole, matrizEfetiva, currentExtraAccess, souVoluntario)
    && matrizEfetiva.lider?.voluntarios === true
    && misteriosQueLidero.length > 0;
  /* "presenca": a igreja já registrou algum check-in (culto ou Kids); sem isso, a Lista de cuidado não aparece (lei 6) */
  const ligados = ligadosDa(firstChurch, { presenca: eventAttendance.length > 0 || kidsAttendance.length > 0 });
  /* v7 4.17: lista de cuidado, com a presença do check-in do culto (dia do culto) */
  const semanasCuidado = { ...ESCALA_DEFAULT, ...(firstChurch?.settings?.escala ?? {}) }.cuidadoSemanas ?? 3;
  const listaCuidado = useMemo(() => {
    if (!ligados.has("cuidado")) return [];
    const diaDo = new Map(events.map((e) => [e.id, e.eventDate]));
    return listaDeCuidado({
      hoje: todayISO(), pessoas: people, membros: members, grupos: fellowshipGroups, times: ministries, marcas: careMarks, semanas: semanasCuidado,
      presencas: eventAttendance.map((a) => ({ personId: a.person_id, dia: diaDo.get(a.event_id) ?? "" })),
    });
  }, [ligados, events, people, members, fellowshipGroups, ministries, careMarks, semanasCuidado, eventAttendance, todayISO]);
  const criancasAusentes = useMemo(() => {
    if (!ligados.has("cuidado") || !kidsClasses.length) return null;
    const hoje = todayISO();
    return kidsChildren.flatMap((c) => {
      const ultima = kidsAttendance.filter((a) => a.child_id === c.id).map((a) => partesNoFuso(new Date(a.dropped_off_at), fuso).data).sort().pop();
      if (!ultima) return [];
      const semanas = Math.floor(((parseISODate(hoje)?.getTime() ?? 0) - (parseISODate(ultima)?.getTime() ?? 0)) / (7 * 86400000));
      return semanas >= semanasCuidado ? [{ id: c.id, nome: c.name, ultima, semanas }] : [];
    }).sort((a, b) => b.semanas - a.semanas);
  }, [ligados, kidsClasses, kidsChildren, kidsAttendance, semanasCuidado, todayISO, fuso]);
  const NAV_GROUPS = navGroups(ligados) as NavGroups;
  /* aniversariantes: gestão vê a igreja toda com idade; o líder, só os times e grupos que lidera, sem idade */
  const aniversariantesBase = useMemo(() => comData(members, people, ministries), [members, people, ministries]);
  const aniversariosEscopo = escopoDe(currentPersonId, podePrevisualizar, ministries, fellowshipGroups);
  const abrirAniversariante = (p: { tipo: "member" | "person"; id: string }) => setDrawer({ kind: p.tipo, id: p.id });
  const podeVerItem = (id: string) => rotaLigada(id, ligados) && (podeVerNav(id, currentRole, matrizEfetiva, currentExtraAccess, souVoluntario) || (id === "membros" && pessoasSoDoTime));
  const perspectivePersonId = currentPersonId;

  /* fila de aprovação da caminhada: Direção vê tudo; líder só vê pedidos de
     quem está no time/GC dele : mesmo espírito de escopo de Escalas/Kanban. */
  const visibleJourneyRequests = journeyRequests.filter((request) => {
    if (podePrevisualizar) return true;
    if (!currentPersonId) return false;
    const member = members.find((m) => m.id === request.memberId);
    if (!member) return false;
    return responsibleLeadersFor(member, fellowshipGroups, ministries).includes(currentPersonId);
  });

  /* membro sem nenhuma tela do painel liberada vai direto pro app, na
     própria pessoa (currentPersonId), sem passar pela casca de admin (que
     ficaria vazia pra ele, ver podeVerNav acima). Membro com liberação
     manual (Acessos por pessoa) vê o painel só com as telas liberadas.
     Só pode vir depois de todos os hooks acima (regra dos hooks : nada de
     return condicional antes deles). */
  /* telas do painel que a pessoa pode abrir (menu lateral + Configurações) */
  const rotasPermitidas = [...NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id)), "config" as const]
    .filter(podeVerItem);
  const temTelaLiberada = rotasPermitidas.length > 0;
  /* Só oferece gestão quando o registro entrega alguma tela disponível.
     Sem tela liberada, qualquer papel usa o próprio app, sem painel vazio. */
  const podeGerenciar = temTelaLiberada;
  if (!podeGerenciar || view === "app") {
    const handleLogoutSelf = async () => {
      await createServiceBrowserClient().auth.signOut();
      router.push("/service/login");
      router.refresh();
    };
    return (
      <RelogioProvider fuso={firstChurch?.timeZone}><VocabularioProvider value={vocab}>
      <MobileOverlay
        modulos={{ on: firstChurch?.modulosOn, off: firstChurch?.modulosOff }}
        textSizePerfil={textSizePerfil}
        readAnnouncementIds={announcementReads.filter((r) => r.person_id === currentPersonId).map((r) => r.announcement_id)}
        contribuir={(churches.find((c) => c.matriz) ?? firstChurch)?.settings?.contribuirCfg as MobileOverlayProps["contribuir"]}
        churchPurpose={(() => {
          const ciclo = cycles.find((c) => c.is_active);
          const titulo = churchIdentity?.purpose || churchIdentity?.mission || ciclo?.theme;
          return titulo ? { kick: ciclo ? joinDot(`Ciclo ${ciclo.year}`, ciclo.theme) : null, title: titulo, text: churchIdentity?.vision ?? ciclo?.body ?? null } : null;
        })()}
        people={people}
        members={members}
        ministries={ministries}
        events={events}
        roster={roster}
        cards={cards}
        boards={boards}
        courses={courses}
        enrollments={enrollments}
        courseModules={courseModules}
        courseLessons={courseLessons}
        visitors={visitors}
        baptismClasses={baptismClasses}
        announcements={announcements.filter(noAr)}
        chats={chats}
        chatMembers={chatMembers}
        messages={messages}
        kidsClasses={kidsClasses}
        kidsChildren={kidsChildren}
        childGuardians={childGuardians}
        kidsSessions={kidsSessions}
        kidsAttendance={kidsAttendance}
        kidsEvents={kidsEvents}
        kidsEventEnrollments={kidsEventEnrollments}
        wallPosts={wallPosts}
        bibleMarks={bibleMarks}
        onSaveBibleMark={saveBibleMarkMobile}
        onReadAnnouncement={markAnnouncementRead}
        onCompleteOnboarding={saveMemberContact}
        onAddCardComment={addCardCommentMobile}
        onAdvanceVisitorStage={advanceVisitorStageMobile}
        onRegisterVisitor={registerVisitorMobile}
        onSendMessage={sendMessageMobile}
        onStartChat={startChatMobile}
        organizationId={firstChurch?.organizationId ?? ""}
        churchName={firstChurch?.nome ?? ""}
        churchLogoUrl={firstChurch?.logoUrl ?? null}
        theme={theme}
        setTheme={setTheme}
        onChangePassword={changePasswordMobile}
        onUpdateProfile={saveMemberContact}
        journeyRequests={journeyRequests}
        onRequestJourneyStep={submitJourneyRequest}
        missingRequirements={missingRequirements}
        serveRequests={serveRequests}
        baptismCandidates={baptismCandidates}
        onEnrollCourse={(courseId) => journeyRpc("enroll_me", { p_course: courseId })}
        onRequestBaptism={(classId) => journeyRpc("request_baptism", { p_class: classId })}
        onRequestServe={(ministryId) => journeyRpc("request_to_serve", { p_ministry: ministryId })}
        onResponderEscala={responderEscala}
        onSaveAvailability={salvarDisponibilidade}
        onRespondAnnouncement={responderMural}
        announcementResponses={announcementResponses.filter((r) => r.person_id === currentPersonId)}
        eventRsvps={eventRsvps.filter((r) => r.person_id === currentPersonId)}
        onRespondEvent={responderEvento}
        meetings={meetings}
        rehearsals={rehearsals}
        paginaUrl={paginaUrl}
        timelineEvents={timelineEvents}
        fellowshipGroups={fellowshipGroups}
        onMarkChatRead={(chatId) => { void createServiceBrowserClient().schema("service").rpc("marcar_conversa_lida", { p_chat: chatId }); }}
        mode="self"
        selfPersonId={currentPersonId}
        onLogout={handleLogoutSelf}
        onClose={handleLogoutSelf}
        onSwitchToPanel={podeGerenciar ? () => setView("gestao") : undefined}
      />
      </VocabularioProvider></RelogioProvider>
    );
  }
  /* membro com telas liberadas não abre o painel numa tela que não tem
     (ex.: Início com os números da igreja): vai para a primeira liberada */
  if (currentRole === "membro" && !rotasPermitidas.includes(route)) {
    setRoute(rotasPermitidas[0]);
  }

  /* o tour só aponta para o que este papel vê no menu */
  const tourSteps = TOUR_DESKTOP.filter((st) => !st.route || (st.route === "config" ? podeVerNav("config", currentRole, matrizEfetiva, currentExtraAccess, souVoluntario) : podeVerItem(st.route)));
  /* ajuda "?": o mesmo menu no canto (computador) e na barra do topo (celular) */
  const abrirTourAjuda = () => { setShowTour(true); setNavOpen(true); };
  const abrirSetupAjuda = () => {
    try { localStorage.removeItem("cex_setup_hide"); } catch { /* segue mesmo sem conseguir gravar */ }
    setRoute("painel");
    window.dispatchEvent(new Event("cex-setup-show"));
  };

  const linkDoMenu = (item: NavGroups[number]["items"][number]) => {
    const badge = navBadge[item.id] ?? 0;
    return (
      <button key={item.id} className={`sb-link ${route === item.id ? "on" : ""}`} type="button" data-tour={item.id} onClick={() => { setRoute(item.id); if (!showTour) setNavOpen(false); }}>
        <span className="sb-ic"><Icon name={CEX_ICON_FOR[item.id] ?? item.icon} size={17} /></span>
        {ct(item.label)}
        {badge > 0 ? <span className="sb-badge">{badge}</span> : null}
      </button>
    );
  };

  /* número só quando pede ação: visitante sem contato há 48h, vaga aberta na escala */
  const navBadge: Partial<Record<keyof typeof ROUTES, number>> = {
    visitantes: visitors.filter((v) => semContato48h(v, visitorNotes)).length,
    escalas: vagasDaSemana(events, roster, ministries, scopeMinistryIds, fuso),
  };

  return (
    <RelogioProvider fuso={firstChurch?.timeZone}><VocabularioProvider value={vocab}>
    <ServiceAccessProvider value={accessData}>
    <div className="app">
      {navOpen ? <div className="sb-backdrop" onClick={() => !showTour && setNavOpen(false)} /> : null}
      <aside className={`sb${navOpen ? " open" : ""}`}>
        <div className="sb-top">
          <IgrejaLogo logoUrl={(churches.find((c) => c.matriz) ?? firstChurch)?.logoUrl} nome={(churches.find((c) => c.matriz) ?? firstChurch)?.nome} />
          <button className="sb-close" type="button" onClick={() => setNavOpen(false)} aria-label="Fechar menu">✕</button>
        </div>
        {churches.length > 1 && <CongSwitcher churches={churches} activeId={activeChurchId} setActiveId={setActiveChurchId} />}
        <nav className="sb-nav">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => podeVerItem(item.id) && !item.secundario);
            if (visibleItems.length === 0) return null;
            const fechado = gruposFechados.includes(group.group) && !visibleItems.some((i) => i.id === route);
            const solo = group.items.filter((i) => !i.secundario).length === 1;
            return (
              <div key={group.group} className={`sb-sec${fechado ? " closed" : ""}`}>
                {!solo && (
                  <button type="button" className="sb-group sb-group-btn" aria-expanded={!fechado} onClick={() => alternarGrupo(group.group)}>
                    {group.group}<Caret open={!fechado} size={13} />
                  </button>
                )}
                {!fechado && visibleItems.map(linkDoMenu)}
              </div>
            );
          })}
          {/* telas de uso ocasional: fechadas em "Mais"; abre sozinho quando a tela atual está nele */}
          {(() => {
            const grupos = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((item) => item.secundario && podeVerItem(item.id)) })).filter((g) => g.items.length > 0);
            if (!grupos.length) return null;
            const aberto = maisAberto || grupos.some((g) => g.items.some((i) => i.id === route));
            return (
              <div className={`sb-sec sb-mais${aberto ? "" : " closed"}`}>
                <button type="button" className="sb-group sb-group-btn" aria-expanded={aberto} onClick={() => setMaisAberto((v) => !v)}>
                  Mais<Caret open={aberto} size={13} />
                </button>
                {aberto && grupos.map((g) => (
                  <details className="sb-mais-grupo" name="service-mais-grupo" key={g.group} open={g.items.some((i) => i.id === route)}>
                    <summary className="sb-link" aria-label={`Mais em ${g.group}`}>
                      {g.group}<Caret open={false} size={13} />
                    </summary>
                    <div className="sb-mais-itens">{g.items.map(linkDoMenu)}</div>
                  </details>
                ))}
              </div>
            );
          })()}
        </nav>
        <div className="sb-bottom">
          {podeVerNav("config", currentRole, matrizEfetiva, currentExtraAccess, souVoluntario) && (
            <button className={`sb-link ${route === "config" ? "on" : ""}`} type="button" data-tour="config" onClick={() => { setRoute("config"); if (!showTour) setNavOpen(false); }}>
              <span className="sb-ic"><Icon name="config" size={17} /></span> Configurações
            </button>
          )}
        </div>
      </aside>

      <div className="main">
        <header className={`top${buscaAberta ? " search-open" : ""}`}>
          <button className="top-menu" type="button" onClick={() => setNavOpen(true)} aria-label="Abrir menu">
            <Icon name="menu" size={18} />
          </button>
          <div className="top-crumb">{ROUTE_GROUP[route] ?? ""}</div>
          <button className="top-search-btn" type="button" aria-label={buscaAberta ? "Fechar a busca" : "Buscar"} onClick={() => setBuscaAberta((b) => !b)}>
            <Icon name={buscaAberta ? "recusou" : "buscar"} size={18} />
          </button>
          <div className="top-search">
            <span className="si"><Icon name="buscar" size={15} /></span>
            <GlobalSearch
              people={people}
              members={members}
              ministries={ministries}
              setRoute={setRoute}
              setDrawer={setDrawer}
              telas={NAV_GROUPS.flatMap((g) => g.items.filter((item) => podeVerItem(item.id)).map((item) => ({ id: item.id, label: item.label, icon: CEX_ICON_FOR[item.id] ?? item.icon, grupo: g.group })))}
            />
          </div>
          <HelpFab lugar="barra" onTour={abrirTourAjuda} onSetup={podeVerItem("configurar") ? abrirSetupAjuda : undefined} />
          <div className="top-actions">
<TopUserMenu name={eu?.name ?? "Você"} roleLabel={ROLE_LABEL[currentRole] ?? "Liderança"} photoUrl={eu?.photoUrl} churchPageUrl={paginaUrl} onLogout={sair} onOpenApp={() => setView("app")} theme={theme} onToggleTheme={() => setTheme((t) => t === "dark" ? "light" : "dark")} />
          </div>
        </header>

        {/* marco principal para leitor de tela; display:contents não mexe no layout */}
        <main className="main-area">
        <RouteGroupContext.Provider value={ROUTE_GROUP[route] ?? null}>
        {error ? <ErrorPanel message={error} /> : null}
        {!podeVerItem(route) ? (
          <EmptyState title="Esta área não está disponível" text="Seu acesso ou os módulos da igreja não permitem abrir esta tela." action={{ label: "Abrir uma área disponível", onClick: () => setRoute(rotasPermitidas[0]) }} />
        ) : <>
        {route === "painel" ? (
          <Painel
            people={people}
            members={members}
            activePeople={activePeople}
            userName={eu?.name}
            visitantesSemContato={navBadge.visitantes ?? 0}
            visitantesPeloLink={visitors.filter((v) => v.origin === ORIGEM_AUTOCADASTRO && v.stage === "novo" && !v.reply_status && !visitorNotes.some((n) => n.visitor_id === v.id) && !semContato48h(v, visitorNotes)).length}
            // eslint-disable-next-line react-hooks/purity -- "novos este mês" precisa do relógio real
            novosNoMes={people.filter((p) => { const m = members.find((x) => x.volunteerId === p.id); return m ? ehNovo(m) : ehNovo({ createdAt: p.createdAt }); }).length}
            gaps={gaps}
            events={events}
            visitorsInCare={visitorsInCare}
            announcements={announcements}
            eventAttendance={eventAttendance}
            journeyRequests={visibleJourneyRequests}
            kidsClasses={kidsClasses}
            kidsChildren={kidsChildren}
            kidsAttendance={kidsAttendance}
            enqueteElegivel={enqueteElegivel}
            pesquisaElegivel={pesquisaElegivel}
            onApproveJourney={approveJourneyRequest}
            onRejectJourney={rejectJourneyRequest}
            setRoute={setRoute}
            podeAbrir={podeVerItem}
            setDrawer={setDrawer}
            setModal={setModal}
            setCheckinEventId={setCheckinEventId}
            setupCounts={setupCounts}
            roster={roster}
            ministries={ministries}
            scopeMinistryIds={scopeMinistryIds}
            onAbrirVagas={abrirVagas}
            currentRole={currentRole}
            visitors={visitors}
            decisions={decisions}
            timelineEvents={timelineEvents}
            enrollments={enrollments}
            setup={setupEstado}
            igrejaNova={ministries.length === 0 || events.length === 0}
            aniversarios={ligados.has("aniversarios") ? <AniversariantesDaSemana base={aniversariantesBase} escopo={aniversariosEscopo} comIdade={podePrevisualizar} onAbrir={abrirAniversariante} onVerMes={() => setRoute("aniversariantes")} /> : null}
            cuidado={ligados.has("cuidado") ? { lista: daMinhaLista(listaCuidado, currentPersonId, currentRole === "master" || currentRole === "pastor"), todos: listaCuidado, criancas: criancasAusentes, semanas: semanasCuidado } : null}
          />
        ) : null}
        {route === "membros" ? <Membros members={members} people={people} ministries={ministries} church={firstChurch} setDrawer={setDrawer} setModal={setModal} soTimes={pessoasSoDoTime ? misteriosQueLidero : null} /> : null}
        {route === "aniversariantes" ? <Aniversariantes base={aniversariantesBase} escopo={aniversariosEscopo} comIdade={podePrevisualizar} times={ministries} grupos={fellowshipGroups} onAbrir={abrirAniversariante} /> : null}
        {route === "pessoas" ? <Pessoas people={people} currentPersonId={currentPersonId} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "times" ? <Times ministries={ministries} people={people} members={members} serveRequests={serveRequests} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "times" ? <details className="teams-config"><summary>Configurações de times e requisitos</summary><Config key={firstChurch?.id} church={firstChurch} churches={churches} ministries={ministries} people={people} rooms={rooms} reservations={reservations} kidsClasses={kidsClasses} currentRole={currentRole} currentExtraAccess={currentExtraAccess} ministerialTitles={ministerialTitles} fellowshipGroups={fellowshipGroups} tags={tags} courses={courses} setModal={setModal} permissionsMatrix={permissionsMatrix} only="min" embedded /></details> : null}
        {route === "visitantes" ? <Visitantes visitors={visitors} visitorNotes={visitorNotes} people={people} church={firstChurch} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "criancas" ? <Criancas kidsChildren={kidsChildren} kidsClasses={kidsClasses} childGuardians={childGuardians} people={people} kidsEvents={kidsEvents} rooms={rooms} church={firstChurch} /> : null}
        {route === "decisoes" ? <Decisoes decisions={decisions} members={members} people={people} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "batismos" ? <Batismos baptismClasses={baptismClasses} baptismCandidates={baptismCandidates} decisions={decisions} members={members} rooms={rooms} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "cursos" ? (
          <CursosTrilhas
            courses={courses}
            enrollments={enrollments}
            courseModules={courseModules}
            courseLessons={courseLessons}
            lessonAttendance={lessonAttendance}
            members={members}
            church={firstChurch}
          />
        ) : null}
        {route === "escalas" ? <Escalas key={escalaFoco?.n ?? 0} foco={escalaFoco} gaps={gaps} roster={roster} people={people} ministries={ministries} events={events} church={firstChurch} scopeMinistryIds={scopeMinistryIds} setDrawer={setDrawer} setModal={setModal} setRoute={setRoute} setCheckinEventId={setCheckinEventId} onNotifyLeaderRecusa={notificarLiderRecusa} /> : null}
        {route === "financeiro" ? <Financeiro church={firstChurch} currentRole={currentRole} /> : null}
        {route === "reunioes" ? <Reunioes meetings={meetings} meetingActions={meetingActions} ministries={ministries} people={people} rooms={rooms} reservations={reservations} church={firstChurch} setDrawer={setDrawer} /> : null}
        {route === "ensaios" ? <Ensaios rehearsals={rehearsals} ministries={ministries} rooms={rooms} setDrawer={setDrawer} setModal={setModal} /> : null}
        {route === "espacos" ? <Espacos rooms={rooms} reservations={reservations} church={firstChurch} setModal={setModal} /> : null}
        {route === "quadros" ? <Quadros boards={boards} cards={cards} ministries={ministries} people={people} church={firstChurch} currentRole={currentRole} currentPersonId={currentPersonId} scopeMinistryIds={scopeMinistryIds} setModal={setModal} /> : null}
        {route === "cultos" ? <Cultos events={events} ministries={ministries} church={firstChurch} kidsClasses={kidsClasses} kidsSessions={kidsSessions} kidsChildren={kidsChildren} rooms={rooms} setDrawer={setDrawer} setModal={setModal} setCheckinEventId={setCheckinEventId} setShareEventId={setShareEventId} /> : null}
        {route === "comunicacao" ? <Comunicacao announcements={announcements} announcementReads={announcementReads} announcementResponses={announcementResponses} wallPosts={wallPosts} ministries={ministries} people={people} members={members} fellowshipGroups={fellowshipGroups} childGuardians={childGuardians} church={firstChurch} events={events} roster={roster} setModal={setModal} /> : null}
        {route === "oracao" ? <OracaoPainel organizationId={firstChurch?.organizationId} churches={churches} /> : null}
        {route === "mapa" && firstChurch?.organizationId ? (
          <MapaIgreja
            organizationId={firstChurch.organizationId}
            churchName={(churches.find((c) => c.matriz) ?? firstChurch).nome ?? ""}
            people={people.map((p) => ({ id: p.id, name: p.name }))}
            podeLiberar={currentRole === "master" || currentRole === "pastor"}
            onAbrirMembro={(id) => setDrawer({ kind: "member", id })}
            onMensagem={startChatWithMember}
          />
        ) : null}
        {route === "conversas" ? <Conversas chats={chats} chatMembers={chatMembers} messages={messages} ministries={ministries} members={members} church={firstChurch} currentPersonId={perspectivePersonId} scopeMinistryIds={scopeMinistryIds} pendingChatMemberId={pendingChatMemberId} onConsumePendingChatMember={() => setPendingChatMemberId(null)} /> : null}
        {route === "relatorios" ? <Relatorios people={people} members={members} ministries={ministries} events={events} boards={boards} chats={chats} visitors={visitors} roster={roster} eventAttendance={eventAttendance} fellowshipGroups={fellowshipGroups} setRoute={setRoute} church={firstChurch} /> : null}
        {route === "secretaria" && firstChurch ? <Secretaria church={firstChurch} churches={churches} members={members} people={people} kidsChildren={kidsChildren} childGuardians={childGuardians} currentPersonId={currentPersonId} /> : null}
        {route === "relatorios" && currentRole === "master" && firstChurch?.organizationId ? <div className="content wide" style={{ paddingTop: 0 }}><MetricasInternas organizationId={firstChurch.organizationId} /></div> : null}
        {route === "configurar" && firstChurch ? (
          <Assistente key={firstChurch.id}
            estado={setupEstado}
            onEstado={salvarSetup}
            igreja={{ fuso, nome: firstChurch.nome ?? "", cep: firstChurch.postalCode ?? "", endereco: firstChurch.address ?? "", bairro: firstChurch.neighborhood ?? "", cidade: firstChurch.cidade ?? "", estado: firstChurch.state ?? "" }}
            logoUrl={firstChurch.logoUrl}
            brand={{ ...((churches.find((c) => c.matriz) ?? firstChurch).settings?.brandCfg ?? {}) }}
            onSalvarDados={async (d) => {
              const { error } = await svc().from("churches").update({ time_zone: d.fuso, name: d.nome.trim(), postal_code: d.cep.replace(/\D/g, "") || null, address: d.endereco || null, neighborhood: d.bairro || null, city: d.cidade || null, state: d.estado || null }).eq("id", firstChurch.id);
              router.refresh();
              return error ? friendlyWriteError(error.message) : null;
            }}
            onLogo={async (file) => {
              const url = await uploadServiceImage(createServiceBrowserClient(), file, `${firstChurch.organizationId}/logos/${firstChurch.id}.${imageExtension(file)}`);
              await svc().from("churches").update({ logo_url: url }).eq("id", firstChurch.id);
              router.refresh();
            }}
            onRemoverLogo={async () => { await svc().from("churches").update({ logo_url: null }).eq("id", firstChurch.id); router.refresh(); }}
            onCor={async (hex) => {
              const sede = churches.find((c) => c.matriz) ?? firstChurch;
              const { error } = await svc().from("churches").update({ settings: { ...sede.settings, brandCfg: { ...(sede.settings?.brandCfg ?? {}), accent: hex } } }).eq("id", sede.id);
              router.refresh();
              return error ? friendlyWriteError(error.message) : null;
            }}
            timesExistentes={ministries.map((m) => m.name)}
            encontros={events.filter((e) => e.churchId === firstChurch.id).map((e) => ({ id: e.id, nome: e.name, data: e.eventDate, hora: e.time, local: e.location }))}
            onVerEncontro={(id) => { setRoute("cultos"); setDrawer({ kind: "event", id }); }}
            onCriarTimes={async (modelos) => {
              const ids: string[] = [];
              for (const m of modelos) {
                const found = await svc().from("ministries").select("id").eq("church_id", firstChurch.id).eq("name", m.nome).maybeSingle();
                if (found.error) { router.refresh(); return { ids, error: friendlyWriteError(found.error.message) }; }
                let id: string | undefined = found.data?.id;
                const novo = !id;
                if (!id) {
                  const { data, error } = await svc().from("ministries").insert({ organization_id: firstChurch.organizationId, church_id: firstChurch.id, name: m.nome, icon: m.icone }).select("id").single();
                  if (error || !data) { router.refresh(); return { ids, error: friendlyWriteError(error?.message ?? "") }; }
                  id = data.id;
                }
                if (!id) return { ids, error: "Não foi possível identificar o time. Confira em Times." };
                const positions = await svc().from("ministry_positions").select("name").eq("ministry_id", id);
                if (positions.error) { router.refresh(); return { ids, error: friendlyWriteError(positions.error.message) }; }
                const faltantes = m.funcoes.map((f, i) => ({ organization_id: firstChurch.organizationId, ministry_id: id, name: f.nome, need_count: f.vagas, sort_order: i })).filter((f) => !positions.data?.some((p) => p.name === f.name));
                if (faltantes.length) {
                  const { error } = await svc().from("ministry_positions").insert(faltantes);
                  if (error) {
                    const cleanup = novo ? await svc().from("ministries").delete().eq("id", id) : null;
                    router.refresh();
                    return { ids, error: cleanup?.error ? "Um time ficou incompleto. Confira suas funções em Times antes de tentar novamente." : friendlyWriteError(error.message) };
                  }
                }
                ids.push(id);
              }
              router.refresh();
              return { ids };
            }}
            onCriarCultos={async (lista) => {
              // Reconhece o resultado já gravado em uma tentativa cuja resposta se perdeu.
              if (!lista.length) return { ids: [], error: "Informe os dados do primeiro encontro." };
              if (lista.some((e) => !encontroUtil(e, todayISO(), horaAgoraBR()))) return { ids: [], error: "Confira a data, o horário e o local antes de disponibilizar o encontro." };
              const { data: existentes, error: readError } = await svc().from("events").select("id,name,event_date,time,location").eq("church_id", firstChurch.id).in("event_date", lista.map((c) => c.data)).eq("name", lista[0].nome).eq("time", lista[0].hora).eq("location", lista[0].local);
              if (readError) return { ids: [], error: friendlyWriteError(readError.message) };
              const registros = lista.map((c) => {
                const anterior = existentes?.find((e) => e.name === c.nome && e.event_date === c.data && e.time === c.hora && e.location === c.local);
                return { ...c, id: anterior?.id ?? c.id };
              });
              const novos = registros.filter((c) => !existentes?.some((e) => e.id === c.id));
              if (novos.length) {
                const { error } = await svc().from("events").upsert(novos.map((c) => ({
                  id: c.id, organization_id: firstChurch.organizationId, church_id: firstChurch.id, name: c.nome, kind: "Culto",
                  event_date: c.data, weekday: weekdayShortFromDate(c.data), time: c.hora, location: c.local, ministries: [], pede: "aviso",
                })), { onConflict: "id", ignoreDuplicates: true });
                if (error) return { ids: [], error: friendlyWriteError(error.message) };
              }
              router.refresh();
              return { ids: registros.map((c) => c.id) };
            }}
            onAtualizarEncontro={async (e) => {
              if (!encontroUtil(e, todayISO(), horaAgoraBR())) return "Confira nome, data, horário e local do encontro.";
              const original = await svc().from("events").select("id,room_id").eq("id", e.id).eq("church_id", firstChurch.id).maybeSingle();
              if (original.error) return friendlyWriteError(original.error.message);
              if (!original.data) return "O encontro não está mais disponível. Confira a agenda da igreja.";
              if (original.data.room_id) return "Este encontro tem uma sala vinculada. Confira a reserva em Espaços e salas antes de alterar seus dados.";
              const { data, error } = await svc().from("events").update({ name: e.nome, event_date: e.data, weekday: weekdayShortFromDate(e.data), time: e.hora, location: e.local }).eq("id", e.id).eq("church_id", firstChurch.id).select("id");
              if (error) return friendlyWriteError(error.message);
              if (!data?.length) return "Não foi possível atualizar o encontro. Confira seu acesso e tente novamente.";
              router.refresh();
              return null;
            }}
            onConvidar={async (nome, telefone) => {
              const tab = window.open("", "_blank");
              const variacoes = variacoesTelefone(telefone);
              const { data: cadastrados, error: readError } = await svc().from("members").select("id,name,phone").eq("church_id", firstChurch.id).in("phone", variacoes);
              if (readError) { tab?.close(); return { error: friendlyWriteError(readError.message) }; }
              const iguais = (cadastrados ?? []).filter((m) => mesmoTelefone(m.phone, telefone));
              if (iguais.length > 1) { tab?.close(); return { error: "Há mais de uma pessoa com este telefone. Confira o cadastro em Pessoas e envie o acesso pela ficha correta." }; }
              let pessoa = iguais[0];
              if (pessoa && nomeComparavel(pessoa.name) !== nomeComparavel(nome)) { tab?.close(); return { error: "Este telefone já está em outro cadastro. Confira a pessoa em Pessoas antes de enviar acesso." }; }
              if (!pessoa) {
                const { data, error } = await svc().from("members").insert({ organization_id: firstChurch.organizationId, church_id: firstChurch.id, name: nome, phone: telefoneParaGravar(telefone), situation: "membro" }).select("id,name,phone").single();
                if (error || !data) { tab?.close(); return { error: friendlyWriteError(error?.message ?? "") }; }
                pessoa = data;
              }
              const r = await openMemberInviteWhatsapp({ memberId: pessoa.id, name: pessoa.name, phone: telefone, churchName: firstChurch.nome ?? "sua igreja", template: firstChurch.settings?.acessoMsgCfg?.mensagem, tab });
              router.refresh();
              return { memberId: pessoa.id, error: r.error, alreadyHasAccess: r.alreadyHasAccess };
            }}
            onIr={(r) => setRoute(r)}
          />
        ) : null}
        {route === "config" ? <Config key={firstChurch?.id} church={firstChurch} churches={churches} ministries={ministries} people={people} rooms={rooms} reservations={reservations} kidsClasses={kidsClasses} currentRole={currentRole} currentExtraAccess={currentExtraAccess} ministerialTitles={ministerialTitles} fellowshipGroups={fellowshipGroups} tags={tags} courses={courses} setModal={setModal} permissionsMatrix={permissionsMatrix} /> : null}
        {route === "grupos" ? <Config key={firstChurch?.id} church={firstChurch} churches={churches} ministries={ministries} people={people} rooms={rooms} reservations={reservations} kidsClasses={kidsClasses} currentRole={currentRole} currentExtraAccess={currentExtraAccess} ministerialTitles={ministerialTitles} fellowshipGroups={fellowshipGroups} tags={tags} courses={courses} setModal={setModal} permissionsMatrix={permissionsMatrix} only="grupos" /> : null}
        {route === "pesquisas" ? <Config key={firstChurch?.id} church={firstChurch} churches={churches} ministries={ministries} people={people} rooms={rooms} reservations={reservations} kidsClasses={kidsClasses} currentRole={currentRole} currentExtraAccess={currentExtraAccess} ministerialTitles={ministerialTitles} fellowshipGroups={fellowshipGroups} tags={tags} courses={courses} setModal={setModal} permissionsMatrix={permissionsMatrix} only="pesquisas" /> : null}
        {route === "pagina" ? <Config key={firstChurch?.id} church={firstChurch} churches={churches} ministries={ministries} people={people} rooms={rooms} reservations={reservations} kidsClasses={kidsClasses} currentRole={currentRole} currentExtraAccess={currentExtraAccess} ministerialTitles={ministerialTitles} fellowshipGroups={fellowshipGroups} tags={tags} courses={courses} setModal={setModal} permissionsMatrix={permissionsMatrix} only="pagina" /> : null}
        {route === "identidade" ? <Identidade church={firstChurch} identity={churchIdentity} cycle={cycles.find((c) => c.is_active) ?? cycles[0]} setModal={setModal} /> : null}
        {route === "historia" ? <Historia church={firstChurch} historyEntries={historyEntries} setModal={setModal} /> : null}
        </>}
        </RouteGroupContext.Provider>
        </main>
      </div>

      <HelpFab onTour={abrirTourAjuda} onSetup={podeVerItem("configurar") ? abrirSetupAjuda : undefined} />
      {showTour ? (
        <Coachmark
          steps={tourSteps}
          go={(r) => setRoute(r as keyof typeof ROUTES)}
          onDone={closeTour}
          startAt={Math.min(tourStart, tourSteps.length - 1)}
          onStepChange={saveTourStep}
        />
      ) : null}
      {tourResumeStep !== null ? (
        <div className="coach-layer">
          <div className="coach-pop" style={{ top: "40%", left: "50%", transform: "translate(-50%, -50%)" }}>
            <div className="coach-pop-eyebrow">Tour guiado</div>
            <div className="coach-pop-t">Retomar de onde parou?</div>
            <div className="coach-pop-s">Você não terminou o tour da última vez. Parou no passo {Math.min(tourResumeStep + 1, tourSteps.length)} de {tourSteps.length}.</div>
            <div className="coach-pop-actions">
              <button className="coach-skip" type="button" onClick={closeTour}>Não, obrigado</button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-pri btn-sm" type="button" onClick={() => startTourFrom(tourResumeStep)}>Continuar</button>
            </div>
          </div>
        </div>
      ) : null}


      {checkinEventId && (() => {
        const checkinEvent = events.find((e) => e.id === checkinEventId);
        if (!checkinEvent) return null;
        return (
          <QRCheckinModal
            event={checkinEvent}
            roster={roster}
            people={people}
            ministries={ministries}
            permitirExtra={!!firstChurch?.settings?.checkinPermitirExtra}
            churchName={firstChurch?.nome}
            logoUrl={firstChurch?.logoUrl}
            onClose={() => setCheckinEventId(null)}
          />
        );
      })()}

      {shareEventId && (() => {
        const shareEvent = events.find((e) => e.id === shareEventId);
        if (!shareEvent) return null;
        return (
          <EventoShare
            event={shareEvent}
            ministries={ministries}
            churchName={firstChurch?.nome}
            logoUrl={firstChurch?.logoUrl}
            onClose={() => setShareEventId(null)}
          />
        );
      })()}

      {drawer ? (
        <EntityDrawer
          drawer={drawer}
          people={people}
          members={members}
          ministries={ministries}
          events={events}
          roster={roster}
          decisions={decisions}
          baptismClasses={baptismClasses}
          baptismCandidates={baptismCandidates}
          visitors={visitors}
          visitorNotes={visitorNotes}
          courses={courses}
          enrollments={enrollments}
          courseModules={courseModules}
          courseLessons={courseLessons}
          meetings={meetings}
          meetingActions={meetingActions}
          rehearsals={rehearsals}
          boards={boards}
          cards={cards}
          church={firstChurch}
          fellowshipGroups={fellowshipGroups}
          timelineEvents={timelineEvents}
          setDrawer={setDrawer}
          setRoute={setRoute}
          setModal={setModal}
          setShareEventId={setShareEventId}
          eventRsvps={eventRsvps}
          onAbrirVagas={abrirVagas}
          scopeMinistryIds={scopeMinistryIds}
          onStartChatWithMember={startChatWithMember}
          currentRole={currentRole}
        />
      ) : null}
      {modal ? (
        <ServiceModal
          key={`${modal.eyebrow}-${modal.title}`}
          modal={modal}
          church={firstChurch}
          people={people}
          members={members}
          ministries={ministries}
          rooms={rooms}
          currentPersonId={currentPersonId}
          currentRole={currentRole}
          onClose={() => setModal(null)}
        />
      ) : null}
    </div>
    </ServiceAccessProvider>
    </VocabularioProvider></RelogioProvider>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="content">
      <div className="panel">
        <div className="panel-head"><span className="panel-title"><Icon name="config" size={14} /> Aviso</span></div>
        <div className="panel-body"><p className="mini-sub">{message}</p></div>
      </div>
    </div>
  );
}

function responsibleLeadersFor(member: MemberView, fellowshipGroups: FellowshipGroupView[], ministries: MinistryView[]): string[] {
  const leaders = new Set<string>();
  const group = fellowshipGroups.find((g) => g.id === member.groupId);
  if (group?.leader_person_id) leaders.add(group.leader_person_id);
  if (member.volunteerId) {
    ministries.forEach((ministry) => {
      const isMember = ministry.people.some((link) => link.personId === member.volunteerId);
      if (!isMember) return;
      ministry.people.filter((link) => link.isLeader).forEach((link) => leaders.add(link.personId));
    });
  }
  return [...leaders];
}

/* função do banco ainda não criada (migração não aplicada): o app usa o caminho antigo */
function rpcFaltando(error: { code?: string; message?: string }) {
  return error.code === "PGRST202" || error.code === "42883" || /could not find the function/i.test(error.message ?? "");
}
