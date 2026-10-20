"use client";

import { avisar } from "./lib/avisar";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "./lib/icons";

type BeforeInstallPromptEvent = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;

const TELAS_DE_ENTRADA = /^\/service\/(login|convite|nova-senha|onboarding)(\/|$)/;

export default function PwaBootstrap() {
  const pathname = usePathname();
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  /* no primeiro contato a pessoa ainda está conhecendo o app (e a liderança
     está no tour): o convite para instalar só aparece a partir da 2ª visita */
  const [primeiraVisita, setPrimeiraVisita] = useState(true);

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

    try {
      let visitas = Number(localStorage.getItem("cex_visitas") || "0") || 0;
      if (!sessionStorage.getItem("cex_sessao")) {
        sessionStorage.setItem("cex_sessao", "1");
        visitas += 1;
        localStorage.setItem("cex_visitas", String(visitas));
      }
      setPrimeiraVisita(visitas < 2);
    } catch {
      /* sem armazenamento não dá para contar visitas: mostra o convite */
      setPrimeiraVisita(false);
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
      avisar('No celular: toque em Compartilhar → "Adicionar à Tela de Início". No computador: ícone de instalar na barra de endereço.', "info");
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

  /* telas de entrada (login, convite, senha nova, primeiro cadastro): o aviso
     cobria o rodapé do formulário no celular, e instalar só faz sentido
     depois de entrar */
  if (installed || dismissed || primeiraVisita || TELAS_DE_ENTRADA.test(pathname ?? "")) return null;

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
