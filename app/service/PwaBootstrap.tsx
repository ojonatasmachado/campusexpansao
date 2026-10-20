"use client";

import { useEffect } from "react";
import { guardarPedidoInstalacao } from "./lib/instalar";

/* Registra o service worker (push e instalação) e guarda o pedido de instalação
   do navegador. O convite para instalar não é mais uma faixa flutuante (cobria
   o conteúdo no celular, crítica de design de 2026-10-20): no painel fica no
   menu do usuário e no app do membro é um cartão do Início (lib/instalar). */
export default function PwaBootstrap() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js", { scope: "/service/" }).catch(() => {
        /* SW é acessório (push/instalação); o app funciona sem ele */
      });
    }
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      guardarPedidoInstalacao(event);
    };
    const onInstalled = () => guardarPedidoInstalacao(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}
