/* Autocadastro do visitante por QR ou link (/[slug]/visita). Funções puras e
   listas fechadas: valem no servidor, no cliente e batem com a validação da
   RPC service.visitante_autocadastro (migração 0070). Mudou uma chave aqui,
   muda lá também. */
import { termoDe, type Vocabulario } from "../../lib/vocabulario";

/** O que mora em service.churches.settings.autocadastro. */
export type AutocadastroCfg = { ativo: boolean; responsavelId?: string | null };

export function lerAutocadastro(settings: unknown): AutocadastroCfg {
  const raw = (settings as { autocadastro?: Partial<AutocadastroCfg> } | null)?.autocadastro;
  return { ativo: raw?.ativo === true, responsavelId: typeof raw?.responsavelId === "string" ? raw.responsavelId : null };
}

/** Valor gravado em visitors.origin por quem veio pelo QR ou link. */
export const ORIGEM_AUTOCADASTRO = "QR/link";

export const caminhoAutocadastro = (slug: string) => `/${slug}/visita`;

export const COMO_CONHECEU = [
  { v: "instagram", l: "Instagram ou internet" },
  { v: "amigo", l: "Um amigo ou parente" },
  { v: "passando", l: "Passando pela rua" },
  { v: "evento", l: "Num evento da igreja" },
  { v: "outro", l: "Outro jeito" },
] as const;

export function interessesDe(v?: Vocabulario | null) {
  return [
    { v: "conhecer", l: "Conhecer melhor a igreja" },
    { v: "grupo", l: `Participar de um ${termoDe(v, "grupo", { minuscula: true })}` },
    { v: "oracao", l: "Receber oração" },
    { v: "servir", l: `Servir como ${termoDe(v, "voluntario", { minuscula: true })}` },
    { v: "batismo", l: "Batismo" },
    { v: "criancas", l: "Programação para crianças" },
  ];
}

export function rotuloComoConheceu(v: string | null | undefined): string | null {
  return COMO_CONHECEU.find((o) => o.v === v)?.l ?? null;
}

export function rotulosInteresses(keys: string[] | null | undefined, vocab?: Vocabulario | null): string[] {
  const all = interessesDe(vocab);
  return (keys ?? []).map((k) => all.find((o) => o.v === k)?.l).filter((l): l is string => !!l);
}

/** Só dígitos; tira o +55. Mesma regra da RPC. */
export function digitosTelefone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  return d;
}

/** Máscara enquanto digita: (11) 9 1234-5678 ou (11) 1234-5678. */
export function mascaraTelefone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
}
