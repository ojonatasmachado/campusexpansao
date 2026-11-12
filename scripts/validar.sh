#!/usr/bin/env bash
# Validação objetiva de uma história ou item. O resultado válido é a saída deste script, não um resumo.
# Uso: bash scripts/validar.sh [--rapido] [--captura="--so=membro --ap=celular"] [/rota1 /rota2 ...]
#   --rapido   pula o build
#   --captura  roda tools/captura-service/isolado.ts com esses argumentos (Docker + Supabase CLI)
#   /rotas     só com `npm run dev:local` em :3000 (outra porta: PORTA=3001) (nunca `npm run dev`, que aponta para produção);
#              exige 200 direto: rota que redireciona (ex.: para o login) falha e pede --captura
# Roda localmente os passos de .github/workflows/service.yml (typecheck, leis 12 e 17, contraste,
# contratos, pacote de produção, critérios da captura, build) e acrescenta o lint dos arquivos
# alterados em relação a origin/main. "Migrações num Postgres limpo" fica só no CI.
# Rode no worktree da história: lá não existe .env.local, e o build usa o mesmo env do CI.
cd "$(dirname "$0")/.." || exit 2
porta=${PORTA:-3000}
falhas=0; rapido=0; captura=""; rotas=()
for a in "$@"; do
  case "$a" in
    --rapido) rapido=1 ;;
    --captura=*) captura="${a#--captura=}" ;;
    *) rotas+=("$a") ;;
  esac
done
registrar() { if [ "$2" -eq 0 ]; then echo "PASSOU  $1"; else echo "FALHOU  $1"; [ -n "$3" ] && echo "$3" | head -15 | sed 's/^/         /'; falhas=$((falhas+1)); fi; }
rodar() { local nome="$1"; shift; local s; s=$("$@" 2>&1); registrar "$nome" $? "$(echo "$s" | tail -10)"; }

[ ! -f .env.local ]; registrar "sem .env.local aqui (rode no worktree da história)" $? ".env.local aponta para produção; o build e as rotas ficariam com ele"

# Lint só do que a história mudou (o projeto tem erros antigos fora do Service; o CI não roda o lint inteiro).
git fetch -q origin main 2>/dev/null
if base=$(git merge-base HEAD origin/main 2>/dev/null); then
  arqs=()
  while IFS= read -r f; do [ -f "$f" ] && arqs+=("$f"); done < <( { git diff --name-only --diff-filter=ACMR "$base"; git ls-files --others --exclude-standard; } | grep -E '\.(ts|tsx|js|jsx|mjs)$' | sort -u)
  if [ ${#arqs[@]} -gt 0 ]; then
    s=$(npx eslint "${arqs[@]}" 2>&1); c=$?
    registrar "lint dos arquivos alterados (${#arqs[@]})" $c "$(echo "$s" | grep -E 'error|✖' | head -12)"
  else
    echo "AVISO   nenhum arquivo de código alterado (lint pulado)"
  fi
else
  registrar "base origin/main para o lint" 1 "sem merge-base com origin/main: rode git fetch origin main"
fi

rodar "tsc --noEmit" npx tsc --noEmit -p .
rodar "lei 12 (parte estática)" npx tsx scripts/check-service-lei12.ts
rodar "lei 17 (componentes da biblioteca)" npx tsx scripts/check-service-componentes.ts
rodar "contraste dos temas" npx tsx scripts/check-theme-contrast.ts
rodar "contraste dos gráficos" npx tsx scripts/check-graficos-contraste.ts

# Contratos: a lista vem do próprio workflow, para não divergir do CI.
contratos=$(grep -E 'for check in .*; do' .github/workflows/service.yml | sed -E 's/.*for check in (.*); do.*/\1/')
[ -n "$contratos" ]; registrar "lista de contratos lida do workflow" $? "não achei 'for check in ...; do' em .github/workflows/service.yml"
for ch in $contratos; do rodar "contrato $ch" npx tsx "scripts/check-service-${ch}.ts"; done

tmp=$(mktemp); scripts/ci/pacote-producao.sh > "$tmp" 2>&1; c=$?
if [ $c -ne 0 ]; then registrar "pacote de produção (gerador)" $c "$(tail -8 "$tmp")"
else s=$(diff -q "$tmp" docs/service-v7/producao.sql 2>&1); registrar "pacote de produção em dia" $? "$s · rode scripts/ci/pacote-producao.sh > docs/service-v7/producao.sql"; fi
rm -f "$tmp"

seg=$(git ls-files | grep -E '(^|/)\.env(\.local|\.production)?$')
[ -z "$seg" ]; registrar "nenhum .env versionado" $? "$seg"

if [ -d tools/captura-service/node_modules ]; then
  s=$(cd tools/captura-service && npm test 2>&1); registrar "critérios da captura (tools/captura-service npm test)" $? "$(echo "$s" | tail -10)"
else
  echo "PULADO  critérios da captura (rode npm ci --prefix tools/captura-service e npx playwright install chromium)"
fi

# Build com o mesmo env do CI (Supabase local), nunca com o de produção.
if [ $rapido -eq 0 ]; then s=$(env NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=ci \
  SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=ci SUPABASE_SERVICE_ROLE_KEY=ci npm run build 2>&1); registrar "build" $? "$(echo "$s" | grep -iE 'error|failed' | head -10)"; fi

if [ ${#rotas[@]} -gt 0 ]; then
  pid=$(lsof -nP -iTCP:$porta -sTCP:LISTEN -t 2>/dev/null | head -1)
  if [ -z "$pid" ]; then echo "PULADO  rotas (nada em :$porta: rode npm run dev:local)"
  elif ! ps eww -o command= -p "$pid" 2>/dev/null | grep -q 'NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321' \
    && ! ps eww -o command= -p "$(ps -o ppid= -p "$pid" | tr -d ' ')" 2>/dev/null | grep -q 'NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321'; then
    registrar "servidor em :$porta é o local" 1 "o processo $pid não tem NEXT_PUBLIC_SUPABASE_URL=127.0.0.1:54321; pare-o e suba npm run dev:local"
  else
    for r in "${rotas[@]}"; do
      corpo=$(curl -s -m 90 -w '\n%{http_code} %{redirect_url}' "http://localhost:$porta$r"); fim=$(echo "$corpo" | tail -1); cod=${fim%% *}
      [ "$cod" = "200" ] && ! echo "$corpo" | grep -qE 'Unhandled|Cookies can only|Event handlers cannot|Application error'
      registrar "rota $r (200 direto, sem erro no HTML)" $? "status $cod ${fim#* } (rota com login: valide com --captura)"
    done
  fi
fi

if [ -n "$captura" ]; then
  # shellcheck disable=SC2086
  s=$(npx tsx tools/captura-service/isolado.ts $captura 2>&1); registrar "captura isolada ($captura)" $? "$(echo "$s" | tail -12)"
fi

echo; [ $falhas -eq 0 ] && echo "RESULTADO: TUDO PASSOU" || echo "RESULTADO: $falhas VERIFICAÇÃO(ÕES) FALHARAM"
exit $falhas
