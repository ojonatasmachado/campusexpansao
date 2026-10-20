/* Instalar o Service como app (PWA). O navegador entrega o pedido de instalação
   uma vez (beforeinstallprompt); o PwaBootstrap guarda aqui e quem oferece a
   instalação (menu do usuário no painel, cartão do Início no app) chama
   instalarApp(). Sem o pedido (iPhone, ou navegador que não oferece), mostra
   como fazer à mão. */
import { avisar } from "./avisar";

type PedidoInstalacao = Event & { prompt: () => void; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let pedido: PedidoInstalacao | null = null;

export function guardarPedidoInstalacao(e: Event | null) {
  pedido = e as PedidoInstalacao | null;
}

/** o navegador oferece o botão de instalar (Android, Chrome no computador) */
export function podeInstalarDireto() {
  return !!pedido;
}

/** já aberto como app instalado */
export function jaInstalado() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(display-mode: standalone)").matches;
}

export async function instalarApp() {
  if (!pedido) {
    avisar('No celular: toque em Compartilhar e depois em "Adicionar à Tela de Início". No computador: use o ícone de instalar na barra de endereço.', "info");
    return;
  }
  pedido.prompt();
  try { await pedido.userChoice; } catch { /* fechou sem escolher */ }
  pedido = null;
}
