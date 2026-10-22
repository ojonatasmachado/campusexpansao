"use client";

/* Aviso do Service (BIBLIOTECA.md, pranchas 3 e 6), no lugar de window.alert (que no
   celular aparece como "campusexpansao.com diz:" e assusta quem é leigo) e do aviso
   próprio que o app do membro tinha. Sobe de baixo com a mola, fica uns segundos e
   desce sozinho; o que dá para desfazer oferece Desfazer (e fica mais tempo).
   Fora do React, num .toast-host único no body, anunciado ao leitor de tela.

     avisar("Aviso enviado.")
     avisar("Não consegui salvar agora.", "warn")
     avisar("Pedido arquivado.", "ok", { acao: { rotulo: "Desfazer", fn: desarquivar } }) */

const CHECK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

export type AvisoOpcoes = {
  /* ação que desfaz (ou abre) o que acabou de acontecer */
  acao?: { rotulo: string; fn: () => void };
  /* milissegundos na tela; padrão 3,5 s, 5 s com ação ou alerta */
  duracao?: number;
};

export function avisar(mensagem: string, tipo: "ok" | "info" | "warn" = "ok", opcoes: AvisoOpcoes = {}) {
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

  let feito = false;
  const tirar = () => {
    if (feito) return;
    feito = true;
    el.classList.remove("in");
    el.classList.add("out");
    window.setTimeout(() => el.remove(), 320);
  };
  if (opcoes.acao) {
    const { rotulo, fn } = opcoes.acao;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "toast-acao";
    b.textContent = rotulo;
    b.addEventListener("click", () => { fn(); tirar(); });
    el.append(b);
  }
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("in"));
  window.setTimeout(tirar, opcoes.duracao ?? (opcoes.acao || tipo === "warn" ? 5000 : 3500));
}
