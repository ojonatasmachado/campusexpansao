"use client";

/* Sistema de ajuda do Service : o "?" que explica qualquer título, KPI
   ou botão (HelpDot), o tour guiado com holofote sobre o menu real
   (Coachmark + HelpFab) e a caminhada de configuração inicial do painel
   (SetupChecklist). Fonte única : ServiceExactApp.tsx e MobileApp.tsx
   importam daqui, ninguém reimplementa um "?" ou um checklist local. */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./lib/icons";
import { useTexto } from "./lib/internacional/contexto";
import type { Text } from "./lib/internacional/mensagens";

import { Botao, BotaoIcone } from "./ui/Botao";
import { Acao } from "./ui/Acao";
/* ── HELP DOT · "?" ao lado de título, KPI ou botão ───────────────── */

/* A caixa abre FORA do cartão (portal no body, position:fixed): dentro do
   cartão ela era cortada pelo overflow dele e, perto da borda, passava da
   tela. No computador fica abaixo do "?" (ou acima, se não couber) e sempre
   dentro da tela; no celular vira uma folha legível na parte de baixo. */
const HELP_MOBILE_MAX = 640;
const HELP_W = 280;
const HELP_GAP = 8;
const HELP_MARGIN = 12;

/* Definições ficam no "?" junto do título, sem acrescentar uma ação de texto
   a cada indicador. A explicação continua disponível no teclado e no toque. */
export function HelpDot({ text }: { text: string }) {
  const traduzirUi = useTexto();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const isMobile = () => window.innerWidth <= HELP_MOBILE_MAX;

  useEffect(() => {
    if (!open) return;
    const fora = (e: Event) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const fechar = () => setOpen(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("touchstart", fora);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", fechar);
    /* rolar a página tira o "?" do lugar: no computador a caixa fecha */
    if (!isMobile()) window.addEventListener("scroll", fechar, true);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("touchstart", fora);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", fechar);
      window.removeEventListener("scroll", fechar, true);
    };
  }, [open]);

  /* posição medida depois de desenhar (precisa da altura real da caixa) */
  useLayoutEffect(() => {
    if (!open || isMobile() || !ref.current || !popRef.current) return;
    const btn = ref.current.getBoundingClientRect();
    const h = popRef.current.offsetHeight;
    const w = Math.min(HELP_W, window.innerWidth - HELP_MARGIN * 2);
    const left = Math.min(Math.max(btn.left, HELP_MARGIN), window.innerWidth - w - HELP_MARGIN);
    const cabeAbaixo = btn.bottom + HELP_GAP + h <= window.innerHeight - HELP_MARGIN;
    const top = cabeAbaixo ? btn.bottom + HELP_GAP : Math.max(HELP_MARGIN, btn.top - HELP_GAP - h);
    setPos({ left, top });
  }, [open]);

  const pop = open ? (
    <div
      ref={popRef}
      className={`help-pop help-pop-fixed${typeof window !== "undefined" && isMobile() ? " help-pop-sheet" : ""}`}
      role="dialog"
      style={pos && !isMobile() ? { left: pos.left, top: pos.top } : { visibility: isMobile() ? "visible" : "hidden" }}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
    >
      {text}
      {isMobile() && (
        <Acao className="help-pop-close" onClick={(e) => { e.stopPropagation(); setOpen(false); }}>{traduzirUi("Entendi")}</Acao>
      )}
    </div>
  ) : null;

  return (
    <span className="help-dot-wrap" ref={ref}>
      <Acao
       
        className="help-dot"
        aria-label={traduzirUi("Ajuda")}
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setPos(null); setOpen((o) => !o); }}
      >
        ?
      </Acao>
      {pop ? createPortal(pop, document.body) : null}
    </span>
  );
}

/* ── COACHMARK · tour guiado, aponta pros botões reais da sidebar ─── */

export type CoachStep = { route?: string; sel: string; texto: (traduzirUi: Text) => { t: string; s: string } };

/* Tour curto: só o caminho do domingo (pessoas, escala, agenda, aviso) e onde
   pedir ajuda. Eram 20 passos, um por item do menu; o resto do menu se explica
   pelo "?" de cada tela. O painel tira do tour o que o papel não vê. */
export const TOUR_DESKTOP: CoachStep[] = [
  { route: "painel", sel: '[data-tour="painel"]', texto: (traduzirUi) => ({ t: traduzirUi("Seu painel"), s: traduzirUi("O que precisa de você agora, em ordem. Cada linha leva à tela que resolve.") }) },
  { route: "membros", sel: '[data-tour="membros"]', texto: (traduzirUi) => ({ t: traduzirUi("Pessoas"), s: traduzirUi("Membros, visitantes, crianças e {grupos}. Cada pessoa tem a sua {caminhada} e o seu histórico.") }) },
  { route: "escalas", sel: '[data-tour="escalas"]', texto: (traduzirUi) => ({ t: traduzirUi("Escalas"), s: traduzirUi("Monte quem serve em cada {culto}. As pessoas confirmam ou recusam direto no celular.") }) },
  { route: "cultos", sel: '[data-tour="cultos"]', texto: (traduzirUi) => ({ t: traduzirUi("{Cultos} e eventos"), s: traduzirUi("A agenda da igreja. Cada {culto} pode virar uma escala.") }) },
  { route: "comunicacao", sel: '[data-tour="comunicacao"]', texto: (traduzirUi) => ({ t: traduzirUi("Mural"), s: traduzirUi("Avisos para a igreja toda ou só para um time, com lembrete para quem não viu.") }) },
  { route: "config", sel: '[data-tour="config"]', texto: (traduzirUi) => ({ t: traduzirUi("Configurações"), s: traduzirUi("Dados da igreja, cores do app, permissões e convites para outros líderes.") }) },
  { sel: '[data-tour="ajuda-fab"]', texto: (traduzirUi) => ({ t: traduzirUi("Sempre por perto"), s: traduzirUi('Rever este tour fica aqui. Em qualquer tela, o "?" ao lado de títulos, números e botões explica o que aquilo faz.') }) },
];

export function Coachmark({ steps, go, onDone, startAt = 0, onStepChange }: { steps: CoachStep[]; go?: (route: string) => void; onDone: () => void; startAt?: number; onStepChange?: (i: number) => void }) {
  const traduzirUi = useTexto();
  const [i, setI] = useState(startAt);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[i];

  useEffect(() => {
    onStepChange?.(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  useEffect(() => {
    if (!step) return;
    if (step.route) go?.(step.route);
    const measure = () => {
      const el = step.sel ? document.querySelector<HTMLElement>(step.sel) : null;
      const visible = el && (el.offsetWidth || el.offsetHeight);
      setRect(visible ? el!.getBoundingClientRect() : null);
    };
    const raf1 = requestAnimationFrame(() => {
      /* rola o item real pra dentro da área visível (sidebar tem seu
         próprio scroll) antes de medir : sem isso, um item mais abaixo na
         lista fica com coordenadas fora da tela e o holofote acaba pousando
         em cima de outro menu que por acaso está na mesma posição. */
      const el = step.sel ? document.querySelector<HTMLElement>(step.sel) : null;
      if (el && (el.offsetWidth || el.offsetHeight)) el.scrollIntoView({ block: "center", inline: "nearest" });
      const raf2 = requestAnimationFrame(measure);
      cleanups.push(() => cancelAnimationFrame(raf2));
    });
    const cleanups = [() => cancelAnimationFrame(raf1)];
    window.addEventListener("resize", measure);
    return () => { cleanups.forEach((f) => f()); window.removeEventListener("resize", measure); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onDone(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!step) return null;
  const textoPasso = step.texto(traduzirUi);
  const next = () => (i < steps.length - 1 ? setI(i + 1) : onDone());
  const prev = () => i > 0 && setI(i - 1);
  const pad = 8;
  const spotStyle = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : { top: "46%", left: "46%", width: 0, height: 0, opacity: 0 };
  const popW = 320;
  let popTop = rect ? rect.top + rect.height + pad + 14 : window.innerHeight / 2 - 90;
  const popLeft = rect ? Math.min(Math.max(rect.left, 16), window.innerWidth - popW - 16) : window.innerWidth / 2 - popW / 2;
  if (rect && popTop + 190 > window.innerHeight) popTop = Math.max(16, rect.top - 190 - pad);

  return (
    <div className="coach-layer">
      <div className="coach-spot" style={spotStyle} />
      <div className="coach-pop" style={{ top: popTop, left: popLeft }}>
        <div className="coach-pop-eyebrow">{traduzirUi("Passo {atual} de {total}", { atual: String(i + 1), total: String(steps.length) })}</div>
        <div className="coach-pop-t">{textoPasso.t}</div>
        <div className="coach-pop-s">{textoPasso.s}</div>
        <div className="coach-pop-actions">
          <Botao variante="discreto" compacto onClick={onDone}>{traduzirUi("Pular tour")}</Botao>
          <div style={{ flex: 1 }} />
          {i > 0 ? <Botao compacto onClick={prev}>{traduzirUi("Voltar")}</Botao> : null}
          <Botao variante="principal" compacto onClick={next}>{i < steps.length - 1 ? traduzirUi("Próximo →") : traduzirUi("Concluir")}</Botao>
        </div>
      </div>
    </div>
  );
}

/* ── HELP FAB · botão de ajuda, sempre por perto ──────────────────── */

/* lugar "barra": na barra do topo, para não cobrir conteúdo (v7 2.11, celular;
   Q25, também no computador). "flutuante" (canto de baixo) existe no componente
   mas o CSS não mostra mais em nenhuma largura: cobria conteúdo real em telas
   com lista longa (Q24). Mantido só para não travar um uso futuro que precise
   dele de novo com código já pronto. */
export function HelpFab({ onTour, onSetup, lugar = "barra" }: { onTour: () => void; onSetup?: () => void; lugar?: "flutuante" | "barra" }) {
  const traduzirUi = useTexto();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  return (
    <div className={`help-fab-wrap ${lugar === "barra" ? "na-barra" : "flutuante"}`} ref={ref}>
      {open ? (
        <div className="help-fab-menu">
          <Acao onClick={() => { setOpen(false); onTour(); }}><Icon name="pendente" size={14} className="ic" /> {traduzirUi("Rever o tour guiado")}</Acao>
          {onSetup && <Acao onClick={() => { setOpen(false); onSetup(); }}><Icon name="identidade" size={14} className="ic" /> {traduzirUi("Ver o que falta configurar")}</Acao>}
        </div>
      ) : null}
      <Acao className="help-fab" data-tour={lugar === "barra" ? "ajuda-fab" : undefined} title={traduzirUi("Ajuda")} aria-label={traduzirUi("Ajuda")} aria-expanded={open} onClick={() => setOpen((o) => !o)}>?</Acao>
    </div>
  );
}

/* ── SETUP CHECKLIST · caminhada de configuração inicial (painel) ───── */

export type SetupCounts = { igreja: string; times: number; cultos: number; membros: number; escalados: number };

type SetupItem = { id: string; ic: string; texto: (traduzirUi: Text) => { t: string; s: string }; done: (base: SetupCounts, atual: SetupCounts) => boolean; route: string };

const SETUP_ITENS: SetupItem[] = [
  /* lê os dados de verdade: o item fica feito quando a igreja já tem aquilo */
  { id: "igreja", ic: "identidade", texto: (traduzirUi) => ({ t: traduzirUi("Dados da igreja"), s: traduzirUi("Nome, cidade e endereço aparecem no login e nas publicações.") }), done: (_b, a) => a.igreja.split("|").every(Boolean), route: "config" },
  { id: "time", ic: "times", texto: (traduzirUi) => ({ t: traduzirUi("Primeiro time"), s: traduzirUi("Louvor, Recepção, Kids... cada time tem líder e funções.") }), done: (_b, a) => a.times > 0, route: "times" },
  { id: "culto", ic: "cultos", texto: (traduzirUi) => ({ t: traduzirUi("Primeiro {culto}"), s: traduzirUi("O {culto} vira uma linha na agenda e depois uma escala.") }), done: (_b, a) => a.cultos > 0, route: "cultos" },
  { id: "membro", ic: "membros", texto: (traduzirUi) => ({ t: traduzirUi("Primeiro membro"), s: traduzirUi("A congregação inteira entra aqui, sirva ou não em um time.") }), done: (_b, a) => a.membros > 1, route: "membros" },
  { id: "escala", ic: "escalas", texto: (traduzirUi) => ({ t: traduzirUi("Primeira escala"), s: traduzirUi("Coloque alguém pra servir num {culto} e veja a confirmação chegar.") }), done: (_b, a) => a.escalados > 0, route: "escalas" },
];

const BASELINE_KEY = "cex_setup_baseline";
const HIDE_KEY = "cex_setup_hide";

export function SetupChecklist({ counts, setRoute }: { counts: SetupCounts; setRoute: (route: string) => void }) {
  const traduzirUi = useTexto();
  /* hidden/baseline nascem com valor neutro (igual no servidor e no cliente,
     antes da hidratação) e só recebem o que está salvo no localStorage
     depois, num useEffect — ler localStorage direto no useState causava
     hydration mismatch (SSR não tem localStorage, cliente tem), reproduzível
     em todo load pra quem já tinha usado o Service antes. */
  const [hidden, setHidden] = useState(false);
  const [baseline, setBaseline] = useState<SetupCounts>(counts);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência do navegador lida depois de montar (comentário acima: evita diferença na hidratação)
      setHidden(localStorage.getItem(HIDE_KEY) === "1");
    } catch { /* localStorage indisponível : segue visível */ }
    try {
      const raw = localStorage.getItem(BASELINE_KEY);
      if (raw) {
        setBaseline(JSON.parse(raw) as SetupCounts);
      } else {
        localStorage.setItem(BASELINE_KEY, JSON.stringify(counts));
      }
    } catch { /* localStorage indisponível : segue sem baseline salva */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onShow = () => setHidden(false);
    window.addEventListener("cex-setup-show", onShow);
    return () => window.removeEventListener("cex-setup-show", onShow);
  }, []);

  const done = SETUP_ITENS.filter((it) => it.done(baseline, counts));
  const pct = Math.round((done.length / SETUP_ITENS.length) * 100);
  if (hidden || done.length === SETUP_ITENS.length) return null;

  const hide = () => { try { localStorage.setItem(HIDE_KEY, "1"); } catch { /* segue escondido só nesta sessão */ } setHidden(true); };

  const proximo = SETUP_ITENS.find((it) => !it.done(baseline, counts));
  return (
    <>
    <Acao className="setup-line" onClick={() => proximo && setRoute(proximo.route)}>
      <span>{traduzirUi.rich("Configuração <b>{feitos} de {total}</b>", { b: (chunks) => <b>{chunks}</b>, feitos: String(done.length), total: String(SETUP_ITENS.length) })}</span>
      <span className="setup-line-go">{traduzirUi("Continuar →")}</span>
    </Acao>
    <div className="setup-card">
      <div className="setup-head">
        <div>
          <div className="setup-eyebrow">
            {traduzirUi("Configuração inicial")}
            <HelpDot text={traduzirUi("Um checklist básico pra deixar sua igreja rodando. Cada item leva pra tela de verdade, pode fazer na ordem que quiser.")} />
          </div>
          <div className="setup-title">{traduzirUi("Falta pouco pra sua igreja estar pronta")}</div>
        </div>
        <BotaoIcone className="setup-close" onClick={hide} title={traduzirUi("Esconder por agora")} rotulo={traduzirUi("Esconder por agora")}>✕</BotaoIcone>
      </div>
      <div className="setup-bar"><div className="setup-bar-fill" style={{ transform: `translateX(${pct - 100}%)` }} /></div>
      <div className="setup-list">
        {SETUP_ITENS.map((it) => {
          const ok = it.done(baseline, counts);
          const textoItem = it.texto(traduzirUi);
          return (
            <Acao key={it.id} className={`setup-item${ok ? " ok" : ""}`} onClick={() => !ok && setRoute(it.route)}>
              <span className="setup-item-check">{ok ? <Icon name="ok" size={14} /> : <Icon name={it.ic} size={14} />}</span>
              <span className="setup-item-main"><b>{textoItem.t}</b><small>{textoItem.s}</small></span>
              {!ok ? <span className="setup-item-go">{traduzirUi("Fazer →")}</span> : null}
            </Acao>
          );
        })}
      </div>
    </div>
    </>
  );
}
