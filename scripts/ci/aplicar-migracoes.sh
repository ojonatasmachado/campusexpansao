#!/usr/bin/env bash
# Aplica supabase/migrations em ordem num Postgres limpo (CI, v7 5.4).
# Uso: PGHOST=... PGPORT=... PGUSER=... PGPASSWORD=... scripts/ci/aplicar-migracoes.sh
# Nunca aponte para um banco de verdade: o script cria o banco "v7ci" do zero.
set -euo pipefail
cd "$(dirname "$0")/../.."
case "${PGHOST:-}" in
  localhost|127.0.0.1|/*) ;;
  *) echo "Recusado: PGHOST precisa ser local (localhost, 127.0.0.1 ou socket)."; exit 1 ;;
esac
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists v7ci" -c "create database v7ci"
psql -v ON_ERROR_STOP=1 -q -d v7ci -f scripts/ci/supabase-stub.sql
for f in supabase/migrations/*.sql; do
  if ! psql -v ON_ERROR_STOP=1 -q -d v7ci -f "$f" > /tmp/migracao.log 2>&1; then
    echo "FALHOU: $f"; tail -20 /tmp/migracao.log; exit 1
  fi
done
echo "Migrações aplicadas: $(ls supabase/migrations/*.sql | wc -l)"
