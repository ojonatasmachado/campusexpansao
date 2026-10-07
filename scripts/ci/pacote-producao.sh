#!/usr/bin/env bash
# Junta as migrações do Service v7 (0052 em diante) num arquivo só, numa
# transação, para colar no SQL Editor do Supabase de produção. Se qualquer
# parte falhar, nada fica gravado.
# Uso: scripts/ci/pacote-producao.sh [primeira] > docs/service-v7/producao.sql
set -euo pipefail
cd "$(dirname "$0")/../.."
DESDE="${1:-0052}"
echo "-- Service v7 · migrações $DESDE em diante, numa transação só."
echo "-- Gerado por scripts/ci/pacote-producao.sh a partir de supabase/migrations/."
echo "-- Rode inteiro no SQL Editor do Supabase. Se der erro, nada é gravado:"
echo "-- copie a mensagem e não rode de novo pela metade."
echo
echo "begin;"
for f in supabase/migrations/*.sql; do
  n=$(basename "$f" | cut -c1-4)
  [[ "$n" < "$DESDE" ]] && continue
  echo
  echo "-- ═══ $(basename "$f") ═══"
  cat "$f"
done
echo
echo "commit;"
