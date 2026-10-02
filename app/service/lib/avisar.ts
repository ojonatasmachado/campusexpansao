"use client";

/* Aviso amigável no lugar de window.alert (que no celular aparece como
   "campusexpansao.com diz:" e assusta quem é leigo). Usa o .toast-host /
   .toast que já existe em service.css e some sozinho.
   Uso: avisar("Aviso enviado.")  ·  avisar("Não consegui salvar agora.", "warn") */
const CHECK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

export function avisar(mensagem: string, tipo: "ok" | "info" | "warn" = "ok") {
  if (typeof document === "undefined") return;
  let host = document.querySelector<HTMLDivElement>(".toast-host");
  if (!host) {
    host = document.createElement("div");
    host.className = "toast-host";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = tipo === "ok" ? "toast" : `toast toast-${tipo}`;
  const ic = document.createElement("span");
  ic.className = "toast-ic";
  if (tipo === "warn") ic.textContent = "!";
  else ic.innerHTML = CHECK;
  const msg = document.createElement("span");
  msg.className = "toast-msg";
  msg.textContent = mensagem;
  el.append(ic, msg);
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("in"));
  window.setTimeout(() => {
    el.classList.remove("in");
    window.setTimeout(() => el.remove(), 320);
  }, tipo === "warn" ? 5000 : 3500);
}
