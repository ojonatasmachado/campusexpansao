// Configuração comum da ferramenta de captura do Service. Tudo local.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const DIR_FERRAMENTA = join(dirname(fileURLToPath(import.meta.url)), "..");
export const RAIZ = join(DIR_FERRAMENTA, "..", "..");
export const BASE_URL = process.env.CAPTURA_BASE_URL || "http://localhost:3000";
export const SUPABASE_LOCAL = process.env.CAPTURA_SUPABASE_URL || "http://127.0.0.1:54321";
for (const endereco of [BASE_URL, SUPABASE_LOCAL]) {
  const u = new URL(endereco);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)) throw new Error("Captura só aceita endereços locais.");
}
export const SLUG = "igreja-teste-local";
export const SENHA = "TesteLocal123"; // senha de todas as contas de teste (scripts/seed-local-service.ts)
export const DATA = `service-${new Date().toISOString().slice(0, 10)}`;
export const SAIDA = process.env.CAPTURA_SAIDA || join(RAIZ, "prints", DATA);
export const ANTES_DIR = join(RAIZ, "prints", "service-2026-10-02");
export const AUTH_DIR = process.env.CAPTURA_AUTH_DIR || join(DIR_FERRAMENTA, ".auth");

export const CONTAS = {
  master: { email: "master@teste.local", papel: "master" },
  lider: { email: "lider@teste.local", papel: "lider" },
  membro: { email: "membro@teste.local", papel: "membro" },
  membro2: { email: "membro2@teste.local", papel: "membro" },
  outra: { email: "outra@teste.local", papel: "master (Outra Igreja Local, sem dados)" },
  novo: { email: "novo@teste.local", papel: "membro novo (ficha incompleta)" },
};

const UA_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

export const APARELHOS = {
  celular: {
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: UA_IPHONE, maxAltura: 8000, // limite de textura: 16384 px físicos
  },
  desktop: {
    viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
    maxAltura: 15000,
  },
};

export const CONTEXTO_BASE = {
  locale: "pt-BR", timezoneId: "America/Sao_Paulo", reducedMotion: "reduce", serviceWorkers: "block",
};

export const STORAGE_PADRAO = { cex_tour_done: "1", cex_install_dismiss: "1", cex_setup_hide: "1" };

// Textos de "carregando" que precisam sumir antes do print.
export const TEXTOS_CARREGANDO = ["Aguarde...", "Carregando...", "Baixando a Bíblia...", "Conferindo o seu link...", "Carregando respostas...", "Carregando o mapa...", "Salvando...", "Enviando..."];

export const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
export const slugify = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
