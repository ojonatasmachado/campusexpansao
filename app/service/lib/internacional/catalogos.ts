import type { Locale } from "./contrato";
import type { Messages } from "./mensagens";

const loaders = {
  "pt-BR": () => import("./mensagens/pt-BR.json"),
  "en-US": () => import("./mensagens/en-US.json"),
  "es-ES": () => import("./mensagens/es-ES.json"),
} satisfies Record<Locale, () => Promise<{ default: Messages }>>;

/** Só o catálogo escolhido é passado ao cliente. */
export async function loadMessages(locale: Locale): Promise<Messages> {
  return (await loaders[locale]()).default;
}
