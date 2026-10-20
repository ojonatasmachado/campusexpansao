"use client";

import { useEffect } from "react";

/* Janelas, gavetas e folhas do Service, num lugar só (WCAG 2.1.2, 2.4.3 e 4.1.2;
   recomendação da skill pick-ui-library sem trocar as 40 janelas por biblioteca).
   Cada fundo escuro já fecha a sua janela no clique; aqui:
   - Esc fecha a janela de cima, acionando esse mesmo clique (se o fundo não
     fecha no clique, de propósito, o Esc também não fecha);
   - Tab e Shift+Tab ficam dentro da janela de cima;
   - ao abrir, o foco vai para dentro da janela; ao fechar, volta para onde estava;
   - a janela se anuncia como diálogo para o leitor de tela;
   - ao fechar, uma cópia inerte da janela faz a animação de saída no lugar dela
     (o React já desmontou a de verdade; a cópia não recebe toque nem foco). */

const FUNDOS = ".modal-bg:not(.svc-saindo),.drawer-bg:not(.svc-saindo),.m6-scrim:not(.svc-saindo),.m-sheet-bg:not(.svc-saindo),.mob-bg:not(.mob-self):not(.svc-saindo)";
/* o que ganha animação de saída: só quando o próprio elemento sai (não quando a tela inteira troca) */
const SAEM = ".modal-bg,.drawer-bg,.drawer,.m6-scrim,.m-sheet-bg,.fs";

function animarSaida(no: Node, pai: Node, depois: Node | null) {
  if (!(no instanceof HTMLElement) || no.isConnected || !no.matches(SAEM) || no.classList.contains("svc-saindo")) return;
  if (!(pai instanceof HTMLElement) || !pai.isConnected) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const copia = no.cloneNode(true) as HTMLElement;
  copia.classList.add("svc-saindo");
  copia.setAttribute("aria-hidden", "true");
  copia.setAttribute("inert", "");
  copia.removeAttribute("id");
  copia.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  pai.insertBefore(copia, depois && depois.parentNode === pai ? depois : null);
  let feito = false;
  const tirar = () => { if (feito) return; feito = true; copia.remove(); };
  copia.addEventListener("animationend", (e) => { if (e.target === copia) tirar(); });
  window.setTimeout(tirar, 400);
}
const FOCAVEIS = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

/* a superfície da janela: dentro do fundo (janela, folha) ou logo depois dele (gaveta) */
function superficie(fundo: Element): HTMLElement | null {
  const dentro = fundo.querySelector<HTMLElement>(".modal,.m6-sheet,.m-sheet,.mob-phone-wrap");
  if (dentro) return dentro;
  const ao_lado = fundo.nextElementSibling;
  return ao_lado instanceof HTMLElement && ao_lado.matches(".drawer") ? ao_lado : null;
}

function focaveis(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>(FOCAVEIS)).filter((f) => f.offsetParent !== null || f === document.activeElement);
}

function fundoDeCima(): Element | null {
  const todos = document.querySelectorAll(FUNDOS);
  return todos.length ? todos[todos.length - 1] : null;
}

export default function DialogosAcessiveis() {
  useEffect(() => {
    /* foco de antes de cada janela, para devolver ao fechar */
    const origem = new WeakMap<Element, Element | null>();
    const abertos = new Set<Element>();

    const preparar = (fundo: Element) => {
      if (abertos.has(fundo)) return;
      abertos.add(fundo);
      origem.set(fundo, document.activeElement);
      const sup = superficie(fundo);
      if (!sup) return;
      if (!sup.getAttribute("role")) sup.setAttribute("role", "dialog");
      sup.setAttribute("aria-modal", "true");
      if (!sup.getAttribute("aria-label") && !sup.getAttribute("aria-labelledby")) {
        const titulo = sup.querySelector(".modal-title,.drawer-title,.profile-name,.m6-sh,h1,h2,h3,.ph-eyebrow");
        if (titulo?.textContent) sup.setAttribute("aria-label", titulo.textContent.trim().slice(0, 80));
      }
      /* espera a janela montar os campos (autoFocus do React vence se houver) */
      requestAnimationFrame(() => {
        if (sup.contains(document.activeElement)) return;
        const alvo = focaveis(sup)[0] ?? sup;
        if (alvo === sup && !sup.hasAttribute("tabindex")) sup.setAttribute("tabindex", "-1");
        alvo.focus({ preventScroll: true });
      });
    };

    const conferir = () => {
      document.querySelectorAll(FUNDOS).forEach(preparar);
      for (const fundo of Array.from(abertos)) {
        if (fundo.isConnected) continue;
        abertos.delete(fundo);
        const antes = origem.get(fundo);
        if (antes instanceof HTMLElement && antes.isConnected && !fundoDeCima()) antes.focus({ preventScroll: true });
      }
    };

    const obs = new MutationObserver((registros) => {
      for (const r of registros) r.removedNodes.forEach((no) => animarSaida(no, r.target, r.nextSibling));
      conferir();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    conferir();

    const tecla = (e: KeyboardEvent) => {
      const fundo = fundoDeCima();
      if (!fundo) return;
      if (e.key === "Escape") {
        if (e.defaultPrevented) return;
        /* o próprio componente já tratou o Esc (tour, menu do usuário): não fecha duas coisas */
        (fundo as HTMLElement).click();
        return;
      }
      if (e.key !== "Tab") return;
      const sup = superficie(fundo);
      if (!sup) return;
      const lista = focaveis(sup);
      if (!lista.length) { e.preventDefault(); return; }
      const primeiro = lista[0];
      const ultimo = lista[lista.length - 1];
      if (!sup.contains(document.activeElement)) { e.preventDefault(); primeiro.focus(); }
      else if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    };
    document.addEventListener("keydown", tecla);
    return () => { obs.disconnect(); document.removeEventListener("keydown", tecla); };
  }, []);
  return null;
}
