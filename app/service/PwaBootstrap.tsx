"use client";

import { useEffect } from "react";
import { guardarPedidoInstalacao } from "./lib/instalar";

/* janela, gaveta, folha ou formulário aberto: recarregar agora perderia o que
   a pessoa está digitando, então a atualização espera a próxima abertura */
const ABERTO = ".fs, .modal-bg, .drawer-bg, .m6-scrim, .m-sheet-bg";
const INTERVALO_MS = 60_000;
const VERSAO_ABERTA = process.env.NEXT_PUBLIC_SERVICE_VERSION || "local";

async function versaoPublicada(): Promise<string | null> {
  try {
    const r = await fetch(`/api/service/versao?t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return null;
    return ((await r.json()) as { versao?: string }).versao ?? null;
  } catch {
    return null;
  }
}

/* Registra o service worker (push e instalação) e guarda o pedido de instalação
   do navegador. O convite para instalar não é mais uma faixa flutuante (cobria
   o conteúdo no celular, crítica de design de 2026-10-20): no painel fica no
   menu do usuário e no app do membro é um cartão do Início (lib/instalar).

   App sempre na versão nova: o iPhone guarda o app instalado na memória e, ao
   voltar para ele, retoma a página antiga sem recarregar. Toda vez que o app
   volta a ficar visível e a cada minuto ativo, compara o identificador gravado
   no bundle com a versão publicada. Não usa a resposta atual como versão do
   código antigo que o iPhone pode ter restaurado. */
export default function PwaBootstrap() {
  useEffect(() => {
    let registro: ServiceWorkerRegistration | null = null;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js", { scope: "/service/", updateViaCache: "none" })
        .then((r) => { registro = r; })
        .catch(() => {
          /* SW é acessório (push/instalação); o app funciona sem ele */
        });
    }

    let encerrado = false;
    let conferindo = false;
    let recarregando = false;
    const conferir = async () => {
      if (document.visibilityState !== "visible" || conferindo || recarregando || encerrado) return;
      conferindo = true;
      try {
        registro?.update().catch(() => {});
        const v = await versaoPublicada();
        if (encerrado || document.visibilityState !== "visible") return;
        if (!v || v === "local" || VERSAO_ABERTA === "local" || v === VERSAO_ABERTA) return;
        // Não interromper janelas de edição nem um campo em uso. A próxima
        // checagem tenta novamente sem assumir que o bundle já foi atualizado.
        const editando = document.activeElement?.matches("input, textarea, select, [contenteditable='true']");
        if (!document.querySelector(ABERTO) && !editando) {
          recarregando = true;
          window.location.reload();
        }
      } finally {
        conferindo = false;
      }
    };
    const aoMostrar = () => { void conferir(); };
    document.addEventListener("visibilitychange", aoMostrar);
    window.addEventListener("focus", aoMostrar);
    window.addEventListener("pageshow", aoMostrar);
    window.addEventListener("online", aoMostrar);
    const intervalo = window.setInterval(aoMostrar, INTERVALO_MS);
    void conferir();

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      guardarPedidoInstalacao(event);
    };
    const onInstalled = () => guardarPedidoInstalacao(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      encerrado = true;
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoMostrar);
      window.removeEventListener("focus", aoMostrar);
      window.removeEventListener("online", aoMostrar);
      window.removeEventListener("pageshow", aoMostrar);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}
