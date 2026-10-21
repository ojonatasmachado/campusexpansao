"use client";

import { useEffect } from "react";
import { guardarPedidoInstalacao } from "./lib/instalar";

/* janela, gaveta, folha ou formulário aberto: recarregar agora perderia o que
   a pessoa está digitando, então a atualização espera a próxima abertura */
const ABERTO = ".fs, .modal-bg, .drawer-bg, .m6-scrim, .m-sheet-bg";
const INTERVALO_MIN_MS = 30_000;

async function versaoPublicada(): Promise<string | null> {
  try {
    const r = await fetch("/api/service/versao", { cache: "no-store" });
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
   volta a ficar visível, pergunta ao servidor a versão publicada; se mudou desde
   que abriu, recarrega (e o service worker também procura a versão nova). */
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

    let versaoAberta: string | null = null;
    let ultimaChecagem = 0;
    versaoPublicada().then((v) => { versaoAberta = v; });
    const conferir = async () => {
      if (document.visibilityState !== "visible") return;
      const agora = Date.now();
      if (agora - ultimaChecagem < INTERVALO_MIN_MS) return;
      ultimaChecagem = agora;
      registro?.update().catch(() => {});
      const v = await versaoPublicada();
      if (!v || v === "local") return;
      if (!versaoAberta) { versaoAberta = v; return; }
      if (v !== versaoAberta && !document.querySelector(ABERTO)) window.location.reload();
    };
    /* bfcache do Safari: a página volta inteira da memória, sem rodar nada */
    const aoMostrar = (e: PageTransitionEvent) => { if (e.persisted) { ultimaChecagem = 0; conferir(); } };
    document.addEventListener("visibilitychange", conferir);
    window.addEventListener("focus", conferir);
    window.addEventListener("pageshow", aoMostrar);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      guardarPedidoInstalacao(event);
    };
    const onInstalled = () => guardarPedidoInstalacao(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      document.removeEventListener("visibilitychange", conferir);
      window.removeEventListener("focus", conferir);
      window.removeEventListener("pageshow", aoMostrar);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}
