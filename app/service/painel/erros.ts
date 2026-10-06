/* Mensagem amigável para erro de gravação no Supabase (painel e módulos). */
export function friendlyWriteError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) return "Você não tem permissão para fazer isso nesta igreja. Fale com quem cuida do Service da sua igreja.";
  if (lower.includes("violates foreign key")) return "Algo que você escolheu foi apagado. Recarregue a página e tente de novo.";
  if (lower.includes("duplicate key")) return "Isso já está cadastrado.";
  console.error("[service] erro ao gravar:", message);
  return "Não conseguimos salvar agora. Tente de novo em instantes.";
}
