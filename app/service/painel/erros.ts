import { sourceText, type Text } from "../lib/internacional/mensagens";

/* Mensagem amigável para erro de gravação no Supabase (painel e módulos). */
export function friendlyWriteError(message: string, t: Text = sourceText) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) return t("Você não tem permissão para fazer isso nesta igreja. Fale com quem cuida do Service da sua igreja.");
  if (lower.includes("violates foreign key")) return t("Algo que você escolheu foi apagado. Recarregue a página e tente de novo.");
  if (lower.includes("duplicate key")) return t("Isso já está cadastrado.");
  console.error("[service] erro ao gravar:", message);
  return t("Não conseguimos salvar agora. Tente de novo em instantes.");
}
