// Medidor de densidade da primeira dobra (docs/service-v7/LEVEZA-2026-10-21.md).
// Cole no console da página, ou injete pelo navegador de teste, e chame
// __medir(24) no painel ou __medir(44) no app do membro. Conta ações visíveis,
// botões cheios na cor da igreja, elementos coloridos, molduras aninhadas,
// palavras, ações sobrepostas, alvos abaixo do mínimo e rolagem lateral.
window.__medir = (minAlvo = 24) => {
  const vw = innerWidth, vh = innerHeight;
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw ? r : null; };
  const rotulo = (e) => (e.innerText || e.getAttribute("aria-label") || e.tagName).trim();
  const acts = [...document.querySelectorAll("a[href],button,[role=button],[role=tab],[role=switch],input:not([type=hidden]),select,textarea,summary")].filter((e) => !e.closest("[aria-hidden=true]")).map((e) => [e, vis(e)]).filter(([, r]) => r);

  const tmp = document.createElement("div"); tmp.style.color = getComputedStyle(document.documentElement).getPropertyValue("--olive").trim(); document.body.appendChild(tmp);
  const corIgreja = getComputedStyle(tmp).color; tmp.remove();
  let elementosCor = 0, botoesCheiosCor = 0;
  document.querySelectorAll("body *").forEach((el) => {
    const r = vis(el); if (!r || r.width * r.height < 30) return;
    const s = getComputedStyle(el);
    if (s.backgroundColor === corIgreja) { elementosCor++; if (el.matches("button,a,[role=button]")) botoesCheiosCor++; }
    else if (s.color === corIgreja && el.childElementCount === 0 && el.textContent.trim()) elementosCor++;
  });

  const sobre = new Set();
  for (let i = 0; i < acts.length; i++) for (let j = i + 1; j < acts.length; j++) {
    const [a, ra] = acts[i], [b, rb] = acts[j];
    if (a.contains(b) || b.contains(a)) continue;
    const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (w > 2 && h > 2) sobre.add(`${rotulo(a).slice(0, 25)} x ${rotulo(b).slice(0, 25)}`);
  }
  /* alvo efetivo: o ::before absoluto (.help-dot, .m-head-av...) amplia a área de toque sem mudar o desenho */
  const alvo = (e, r) => { const p = getComputedStyle(e, "::before"); return p.content !== "none" && p.position === "absolute" ? [Math.max(r.width, parseFloat(p.width) || 0), Math.max(r.height, parseFloat(p.height) || 0)] : [r.width, r.height]; };
  const pequenos = acts.map(([e, r]) => [e, alvo(e, r)]).filter(([e, [w, h]]) => !e.matches("input[type=checkbox],input[type=radio]") && (w < minAlvo || h < minAlvo)).map(([e, [w, h]]) => `${rotulo(e).slice(0, 20)} ${Math.round(w)}x${Math.round(h)}`);

  const caixa = (el) => { const s = getComputedStyle(el); return (parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== "none" && parseFloat(s.borderLeftWidth) > 0) || s.boxShadow !== "none" || (s.backgroundColor !== "rgba(0, 0, 0, 0)" && el.parentElement && s.backgroundColor !== getComputedStyle(el.parentElement).backgroundColor && el.getBoundingClientRect().width > 60); };
  let molduraMaxAninhada = 0;
  document.querySelectorAll("main *, body > div *").forEach((el) => {
    if (!vis(el) || el.childElementCount === 0 || !caixa(el)) return;
    let d = 1; for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (caixa(p) && p.getBoundingClientRect().width < vw - 4) d++;
    molduraMaxAninhada = Math.max(molduraMaxAninhada, d);
  });

  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let palavrasNaDobra = 0, n;
  while ((n = tw.nextNode())) if (n.textContent.trim() && n.parentElement && vis(n.parentElement)) palavrasNaDobra += n.textContent.trim().split(/\s+/).length;

  return { acoes: acts.length, botoesCheiosCor, elementosCor, molduraMaxAninhada, palavrasNaDobra, sobreposicoes: [...sobre].slice(0, 8), nSobre: sobre.size, alvosPequenos: pequenos.length, exPequenos: pequenos.slice(0, 6), rolagemLateral: document.documentElement.scrollWidth > vw + 1 };
};
