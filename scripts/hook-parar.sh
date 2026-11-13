#!/usr/bin/env bash
# Gancho "Stop" do Claude Code: roda a validação sozinho quando houve mudança de código desde a última validação
# aprovada. Se falhar, impede o Claude de encerrar o turno (exit 2) e devolve a saída para ele corrigir.
# Proteções: não repete em loop (stop_hook_active), não roda se nada mudou, e nunca roda no checkout
# principal (ali validar.sh falha de propósito por causa do .env.local, e bloquearia toda sessão aberta lá).
cd "$(dirname "$0")/.." || exit 0

# Checkout principal (não é um worktree vinculado) ou .env.local presente: nunca valida aqui.
[ "$(git rev-parse --git-dir 2>/dev/null)" = "$(git rev-parse --git-common-dir 2>/dev/null)" ] && exit 0
[ -f .env.local ] && exit 0

entrada=$(cat)
echo "$entrada" | grep -q '"stop_hook_active": *true' && exit 0

caminhos=(app components lib supabase scripts tools docs/service-v7/producao.sql .github tsconfig.json package.json)
marca=.claude/.ultima-validacao

sujo="$(git status --porcelain -- "${caminhos[@]}" 2>/dev/null)"
[ -z "$sujo" ] && exit 0

# Estado = HEAD + hash do conteúdo que mudou (diff dos rastreados + bytes dos novos), não só a lista de nomes:
# editar de novo um arquivo que já aparecia como modificado tem que mudar o hash.
conteudo="$( { git diff HEAD -- "${caminhos[@]}" 2>/dev/null; git ls-files -o --exclude-standard -z -- "${caminhos[@]}" 2>/dev/null | xargs -0 -I{} cat {} 2>/dev/null; } | shasum | cut -c1-12)"
estado="$(git rev-parse HEAD 2>/dev/null)|$conteudo"
[ -f "$marca" ] && [ "$(cat "$marca")" = "$estado" ] && exit 0

saida=$(bash scripts/validar.sh --rapido 2>&1); c=$?
if [ $c -ne 0 ]; then
  { echo "PORTÃO DE QUALIDADE: a validação falhou. Corrija e valide de novo antes de encerrar (máximo 3 voltas; na terceira, pare e reporte)."; echo "$saida" | grep -E "^(FALHOU|AVISO|RESULTADO)|^         "; } >&2
  exit 2
fi
echo "$estado" > "$marca"
exit 0
