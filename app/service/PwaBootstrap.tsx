"use client";

import { useEffect, useState } from "react";
import { Icon } from "./lib/icons";

type BeforeInstallPromptEvent = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export default function PwaBootstrap() {
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js", { scope: "/service/" }).catch(() => {
        /* SW é acessório (push/instalação); o app funciona sem ele */
      });
    }

    try {
      setDismissed(localStorage.getItem("cex_install_dismiss") === "1");
    } catch {
      setDismissed(false);
    }

    if (window.matchMedia?.("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferredPrompt = event as BeforeInstallPromptEvent;
      setInstallable(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallable(false);
      deferredPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const instalar = async () => {
    if (!deferredPrompt) {
      window.alert('No celular: toque em Compartilhar → "Adicionar à Tela de Início".\nNo desktop: ícone de instalar na barra de endereço.');
      return;
    }
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch {
      /* usuário fechou o prompt sem escolher */
    }
    deferredPrompt = null;
    setInstallable(false);
  };

  const dispensar = () => {
    setDismissed(true);
    try {
      localStorage.setItem("cex_install_dismiss", "1");
    } catch {
      /* localStorage indisponível, só não persiste a dispensa */
    }
  };

  if (installed || dismissed) return null;

  return (
    <div className="pwa-banner">
      <span className="pwa-banner-ic"><Icon name="baixar" size={18} /></span>
      <div className="pwa-banner-main">
        <b>Instale o Service</b>
        <small>Adicione à tela inicial e use como app, abre rápido e recebe notificações.</small>
      </div>
      <button className="btn btn-pri btn-sm" type="button" onClick={instalar}>
        {installable ? "Instalar" : "Como instalar"}
      </button>
      <button className="pwa-banner-x" type="button" onClick={dispensar} aria-label="Dispensar">✕</button>
    </div>
  );
}
