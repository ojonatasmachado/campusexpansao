// Medidor de densidade da primeira dobra (docs/service-v7/LEVEZA-2026-10-21.md).
// Cole no console da página, ou injete pelo navegador de teste, e chame
// __medir(24) no painel ou __medir(44) no app do membro. Conta ações visíveis,
// botões cheios na cor da igreja, elementos coloridos, molduras aninhadas,
// palavras, ações sobrepostas, alvos abaixo do mínimo e rolagem lateral.
window.__medir = (minAlvo = 24) => {
  const vw = innerWidth, vh = innerHeight;
  const vis = (el) => {
    const original = el.getBoundingClientRect(), estilo = getComputedStyle(el);
    if (original.width <= 0 || original.height <= 0 || estilo.visibility === "hidden" || estilo.display === "none" || +estilo.opacity <= 0.05) return null;
    let left = Math.max(0, original.left), right = Math.min(vw, original.right), top = Math.max(0, original.top), bottom = Math.min(vh, original.bottom);
    // Conteúdo recortado por um contêiner rolável não se sobrepõe à barra externa.
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p), r = p.getBoundingClientRect();
      if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity <= 0.05) return null;
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) { left = Math.max(left, r.left + p.clientLeft); right = Math.min(right, r.left + p.clientLeft + p.clientWidth); }
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowY)) { top = Math.max(top, r.top + p.clientTop); bottom = Math.min(bottom, r.top + p.clientTop + p.clientHeight); }
    }
    return right > left && bottom > top ? { left, right, top, bottom, width: right - left, height: bottom - top } : null;
  };
  const escopo = [...document.querySelectorAll('[role="dialog"][aria-modal="true"],dialog[open]')].filter((e) => vis(e)).at(-1) ?? document.body;
  const rotulo = (e) => (e.innerText || e.getAttribute("aria-label") || e.tagName).trim();
  const acts = [...escopo.querySelectorAll("a[href],button,[role=button],[role=tab],[role=switch],[role=radio],[role=checkbox],[role=menuitem],[role=slider],[role=option],input:not([type=hidden]),select,textarea,summary")].filter((e) => !e.closest("[aria-hidden=true]")).map((e) => [e, vis(e)]).filter(([, r]) => r);

  const tmp = document.createElement("div"); tmp.style.color = getComputedStyle(document.documentElement).getPropertyValue("--olive").trim(); document.body.appendChild(tmp);
  const corIgreja = getComputedStyle(tmp).color; tmp.remove();
  let elementosCor = 0, botoesCheiosCor = 0;
  escopo.querySelectorAll("*").forEach((el) => {
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
  const pequenos = acts.map(([e]) => [e, alvo(e, e.getBoundingClientRect())]).filter(([e, [w, h]]) => !e.matches("input[type=checkbox],input[type=radio]") && (w < minAlvo || h < minAlvo)).map(([e, [w, h]]) => `${rotulo(e).slice(0, 20)} ${Math.round(w)}x${Math.round(h)}`);

  const caixa = (el) => { const s = getComputedStyle(el); return (parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== "none" && parseFloat(s.borderLeftWidth) > 0) || s.boxShadow !== "none" || (s.backgroundColor !== "rgba(0, 0, 0, 0)" && el.parentElement && s.backgroundColor !== getComputedStyle(el.parentElement).backgroundColor && el.getBoundingClientRect().width > 60); };
  let molduraMaxAninhada = 0;
  escopo.querySelectorAll("*").forEach((el) => {
    if (!vis(el) || el.childElementCount === 0 || !caixa(el)) return;
    let d = 1; for (let p = el.parentElement; p && p !== escopo && p !== document.body; p = p.parentElement) if (caixa(p) && p.getBoundingClientRect().width < vw - 4) d++;
    molduraMaxAninhada = Math.max(molduraMaxAninhada, d);
  });

  const tw = document.createTreeWalker(escopo, NodeFilter.SHOW_TEXT); let palavrasNaDobra = 0, n;
  while ((n = tw.nextNode())) if (n.textContent.trim() && n.parentElement && !n.parentElement.closest("script,style,noscript,[aria-hidden=true]") && vis(n.parentElement)) palavrasNaDobra += n.textContent.trim().split(/\s+/).length;

  return { acoes: acts.length, botoesCheiosCor, elementosCor, molduraMaxAninhada, palavrasNaDobra, sobreposicoes: [...sobre].slice(0, 8), nSobre: sobre.size, alvosPequenos: pequenos.length, exPequenos: pequenos.slice(0, 6), rolagemLateral: document.documentElement.scrollWidth > vw + 1 };
};
