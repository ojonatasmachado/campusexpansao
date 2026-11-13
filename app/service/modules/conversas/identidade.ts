import { sourceText, type Text } from "../../lib/internacional/mensagens";

/* Projeção mínima do participante (0105). Nunca substituir pela ficha completa. */
export type ParticipanteConversa = {
  chat_id: string;
  member_id: string;
  last_read_at?: string | null;
  name?: string | null;
  photo_url?: string | null;
};

type Conversa = { id: string; kind: string; name: string | null; ministry_id: string | null };

/** Lista e cabeçalho resolvem a mesma identidade, inclusive após atualização. */
export function identidadeConversa(
  conversa: Conversa,
  participantes: ParticipanteConversa[],
  eu: string | null | undefined,
  times: { id: string; name: string }[] = [],
  t: Text = sourceText,
): { nome: string; fotoUrl: string | null } {
  if (conversa.kind === "dm") {
    const outros = eu ? participantes.filter((p) => p.chat_id === conversa.id && p.member_id !== eu) : [];
    const outro = outros.length === 1 ? outros[0] : null;
    const nome = outro?.name?.trim();
    return nome
      ? { nome, fotoUrl: outro?.photo_url || null }
      : { nome: t("Pessoa indisponível"), fotoUrl: null };
  }
  return {
    nome: conversa.name?.trim()
      || times.find((time) => time.id === conversa.ministry_id)?.name
      || (conversa.kind === "time" ? t("Time indisponível") : t("Grupo sem nome")),
    fotoUrl: null,
  };
}
