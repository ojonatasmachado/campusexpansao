"use client";

/* Sistema de ajuda do Service : o "?" que explica qualquer título, KPI
   ou botão (HelpDot), o tour guiado com holofote sobre o menu real
   (Coachmark + HelpFab) e a jornada de configuração inicial do painel
   (SetupChecklist). Fonte única : ServiceExactApp.tsx e MobileApp.tsx
   importam daqui, ninguém reimplementa um "?" ou um checklist local. */

import { useEffect, useRef, useState } from "react";
import { Icon } from "./lib/icons";

/* ── HELP DOT · "?" ao lado de título, KPI ou botão ───────────────── */

export function HelpDot({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClickAway);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClickAway); window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <span className="help-dot-wrap" ref={ref}>
      <button
        type="button"
        className="help-dot"
        aria-label="Ajuda"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen((o) => !o); }}
      >
        ?
      </button>
      {open ? <div className="help-pop" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>{text}</div> : null}
    </span>
  );
}

/* ── COACHMARK · tour guiado, aponta pros botões reais da sidebar ─── */

export type CoachStep = { route?: string; sel: string; t: string; s: string };

export const TOUR_DESKTOP: CoachStep[] = [
  { route: "painel", sel: '[data-tour="painel"]', t: "Seu painel", s: "O resumo do domingo: próximos cultos, quem falta confirmar e o que precisa de atenção. A jornada de configuração inicial também aparece aqui até você terminar." },
  { route: "membros", sel: '[data-tour="membros"]', t: "Membros", s: "Toda a sua congregação. Cadastre quem faz parte, mesmo quem ainda não serve em nenhum time." },
  { route: "pessoas", sel: '[data-tour="pessoas"]', t: "Voluntários", s: "Quem já serve ativamente em algum ministério: funções, disponibilidade e engajamento." },
  { route: "times", sel: '[data-tour="times"]', t: "Times & Ministérios", s: "Louvor, Recepção, Kids... cada ministério é um time, com um líder e suas funções." },
  { route: "visitantes", sel: '[data-tour="visitantes"]', t: "Visitantes", s: "Quem visitou pela primeira vez. Acompanhe o contato até virar membro." },
  { route: "criancas", sel: '[data-tour="criancas"]', t: "Crianças", s: "Cadastro, turmas e check-in do ministério infantil, separado do restante da congregação." },
  { route: "batismos", sel: '[data-tour="batismos"]', t: "Batismos", s: "Turmas de batismo: quem vai ser batizado, quando e onde." },
  { route: "cursos", sel: '[data-tour="cursos"]', t: "Cursos & Trilhas", s: "Formações da igreja, da decisão à liderança. Cada conclusão entra na jornada da pessoa." },
  { route: "escalas", sel: '[data-tour="escalas"]', t: "Escalas", s: "Monte quem serve em cada culto. As pessoas confirmam ou recusam direto no celular." },
  { route: "reunioes", sel: '[data-tour="reunioes"]', t: "Reuniões", s: "Pauta, presença e decisões dos encontros de liderança." },
  { route: "ensaios", sel: '[data-tour="ensaios"]', t: "Ensaios", s: "Ensaios de louvor, teatro, dança... com participantes e repertório ou materiais." },
  { route: "quadros", sel: '[data-tour="quadros"]', t: "Quadros", s: "Um quadro de tarefas por time: o que fazer, quem é responsável e o prazo." },
  { route: "cultos", sel: '[data-tour="cultos"]', t: "Cultos & Agenda", s: "Seus cultos e eventos ficam aqui. Cada um pode virar uma escala." },
  { route: "comunicacao", sel: '[data-tour="comunicacao"]', t: "Comunicação", s: "Mande avisos pro time todo ou só pra um ministério específico." },
  { route: "conversas", sel: '[data-tour="conversas"]', t: "Conversas", s: "Um chat simples com seu time e sua liderança." },
  { route: "relatorios", sel: '[data-tour="relatorios"]', t: "Relatórios", s: "A saúde da igreja num lugar: crescimento, cobertura de escala, bem-estar de quem serve." },
  { route: "config", sel: '[data-tour="config"]', t: "Configurações", s: "Dados da igreja, permissões e convites pra outros líderes ficam aqui." },
  { route: "identidade", sel: '[data-tour="identidade"]', t: "Identidade & propósito", s: "Visão, valores e o chamado da igreja." },
  { route: "historia", sel: '[data-tour="historia"]', t: "Nossa história", s: "Os marcos da caminhada da igreja, em linha do tempo." },
  { sel: '[data-tour="ajuda-fab"]', t: "Sempre por perto", s: 'Ficou com dúvida depois? Clique aqui a qualquer momento pra rever este tour. E em qualquer tela, o "?" ao lado de títulos, números e botões explica o que aquilo faz.' },
];

export function Coachmark({ steps, go, onDone }: { steps: CoachStep[]; go?: (route: string) => void; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[i];

  useEffect(() => {
    if (!step) return;
    if (step.route) go?.(step.route);
    const measure = () => {
      const el = step.sel ? document.querySelector<HTMLElement>(step.sel) : null;
      const visible = el && (el.offsetWidth || el.offsetHeight);
      setRect(visible ? el!.getBoundingClientRect() : null);
    };
    const raf1 = requestAnimationFrame(() => {
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
        <div className="coach-pop-eyebrow">Passo {i + 1} de {steps.length}</div>
        <div className="coach-pop-t">{step.t}</div>
        <div className="coach-pop-s">{step.s}</div>
        <div className="coach-pop-actions">
          <button className="coach-skip" type="button" onClick={onDone}>Pular tour</button>
          <div style={{ flex: 1 }} />
          {i > 0 ? <button className="btn btn-sec btn-sm" type="button" onClick={prev}>Voltar</button> : null}
          <button className="btn btn-pri btn-sm" type="button" onClick={next}>{i < steps.length - 1 ? "Próximo →" : "Concluir"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── HELP FAB · botão flutuante de ajuda, sempre por perto ────────── */

export function HelpFab({ onTour, onSetup }: { onTour: () => void; onSetup: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  return (
    <div className="help-fab-wrap" ref={ref}>
      {open ? (
        <div className="help-fab-menu">
          <button type="button" onClick={() => { setOpen(false); onTour(); }}><Icon name="pendente" size={14} className="ic" /> Rever o tour guiado</button>
          <button type="button" onClick={() => { setOpen(false); onSetup(); }}><Icon name="identidade" size={14} className="ic" /> Ver o que falta configurar</button>
        </div>
      ) : null}
      <button className="help-fab" type="button" data-tour="ajuda-fab" title="Ajuda" onClick={() => setOpen((o) => !o)}>?</button>
    </div>
  );
}

/* ── SETUP CHECKLIST · jornada de configuração inicial (painel) ───── */

export type SetupCounts = { igreja: string; times: number; cultos: number; membros: number; escalados: number };

type SetupItem = { id: string; ic: string; t: string; s: string; done: (base: SetupCounts, atual: SetupCounts) => boolean; route: string };

const SETUP_ITENS: SetupItem[] = [
  { id: "igreja", ic: "identidade", t: "Dados da igreja", s: "Nome, cidade e endereço aparecem no login e nos comunicados.", done: (b, a) => a.igreja !== b.igreja, route: "config" },
  { id: "time", ic: "times", t: "Primeiro time / ministério", s: "Louvor, Recepção, Kids... cada ministério tem líder e funções.", done: (b, a) => a.times > b.times, route: "times" },
  { id: "culto", ic: "cultos", t: "Primeiro culto", s: "O culto vira uma linha na agenda e depois uma escala.", done: (b, a) => a.cultos > b.cultos, route: "cultos" },
  { id: "membro", ic: "membros", t: "Primeiro membro", s: "A congregação inteira entra aqui, sirva ou não em um time.", done: (b, a) => a.membros > b.membros, route: "membros" },
  { id: "escala", ic: "escalas", t: "Primeira escala", s: "Coloque alguém pra servir num culto e veja a confirmação chegar.", done: (b, a) => a.escalados > b.escalados, route: "escalas" },
];

const BASELINE_KEY = "cex_setup_baseline";
const HIDE_KEY = "cex_setup_hide";

export function SetupChecklist({ counts, setRoute }: { counts: SetupCounts; setRoute: (route: string) => void }) {
  /* hidden/baseline nascem com valor neutro (igual no servidor e no cliente,
     antes da hidratação) e só recebem o que está salvo no localStorage
     depois, num useEffect — ler localStorage direto no useState causava
     hydration mismatch (SSR não tem localStorage, cliente tem), reproduzível
     em todo load pra quem já tinha usado o Service antes. */
  const [hidden, setHidden] = useState(false);
  const [baseline, setBaseline] = useState<SetupCounts>(counts);

  useEffect(() => {
    try {
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

  return (
    <div className="setup-card">
      <div className="setup-head">
        <div>
          <div className="setup-eyebrow">
            Configuração inicial
            <HelpDot text="Um checklist da jornada básica pra deixar sua igreja rodando. Cada item leva pra tela de verdade, pode fazer na ordem que quiser." />
          </div>
          <div className="setup-title">Falta pouco pra sua igreja estar pronta</div>
        </div>
        <button className="setup-close" type="button" onClick={hide} title="Esconder por agora">✕</button>
      </div>
      <div className="setup-bar"><div className="setup-bar-fill" style={{ width: `${pct}%` }} /></div>
      <div className="setup-list">
        {SETUP_ITENS.map((it) => {
          const ok = it.done(baseline, counts);
          return (
            <button key={it.id} type="button" className={`setup-item${ok ? " ok" : ""}`} onClick={() => !ok && setRoute(it.route)}>
              <span className="setup-item-check">{ok ? "✓" : <Icon name={it.ic} size={14} />}</span>
              <span className="setup-item-main"><b>{it.t}</b><small>{it.s}</small></span>
              {!ok ? <span className="setup-item-go">Fazer →</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
