# Service v7 · Passo a passo para ir ao ar

Branch: `service-v7-85m5w6` (já com o `main` de 03/10 dentro). O código está pronto; o que
falta é testar com dados de verdade, preparar o banco de produção e ligar o agendador.
A ordem importa: **o banco de produção vai antes do código**. Se o código for ao ar sem as
migrações, telas novas falham.

## 0. O que já está feito (não precisa repetir)

- Etapas 1 a 5 do manifesto, um commit por item.
- `main` mesclado no branch; a migração da aula foi renumerada de 0051 para 0067 (o `main`
  já tinha uma 0051, a do bootstrap do líder).
- Migrações 0052 a 0068 sem `select ... into` (o SQL Editor do Supabase quebra essa forma).
- Testado num Postgres limpo: as 69 migrações aplicam do zero; o pacote de produção aplica
  sobre um banco parado na 0051 e roda de novo sem erro.
- GitHub Actions (`.github/workflows/service.yml`): typecheck, lei 12 estática, contraste,
  migrações do zero, pacote de produção em dia e build, a cada envio. Passou.
- Agendador no GitHub (`.github/workflows/service-cron.yml`), parado até você configurar o
  segredo (passo 5).

## 1. No Mac: banco local e teste do app (cerca de 1 hora)

```bash
git fetch origin && git switch service-v7-85m5w6 && git pull
git stash list          # os 4 stashes antigos continuam lá; não precisa aplicar para testar
npm ci
supabase start
supabase db reset       # recria o banco local do zero com 0000 a 0068 (apaga os dados locais)
npx tsx scripts/seed-local-service.ts
npm run dev
```

Por que `db reset`: o seu banco local tem a aula gravada como versão 0051, e agora a 0051 é
a do bootstrap. Sem o reset, a CLI acha que a 0051 já rodou e pula o bootstrap.

Teste à mão, no celular (390px) e no computador, com master, líder e membro:
- App do membro: Início (fila e "Da igreja"), Agenda (Minha agenda por dia; tocar num evento
  abre a folha com Vou, Compartilhar e Adicionar ao calendário), Mensagens (não lidas),
  Perfil pelo avatar (Minha história, Notificações, Tamanho do texto).
- Primeiro acesso com uma conta nova: 2 passos.
- Painel do master: Saúde da igreja, Para resolver, Lista de cuidado (aparece depois de algum
  check-in), Escalas (cobertura por time, janela Escalar com busca e "Disponíveis"), detalhe
  do culto (aba "Para o membro"), Mural (destaque com imagem e vídeo, lembrete), Relatórios
  (Como o Service está funcionando).
- Igreja nova: o Início mostra "Sua igreja: fase 1 de 3" e o assistente cria cultos e times
  (teste também o Desfazer).
- Painel do líder: abre em "Para resolver no seu time".

Achou problema? Anote tela, passo e print; dá para corrigir numa sessão nova.

## 2. No Mac: captura final (opcional, recomendado)

Rodar `tools/captura-service` (está num dos stashes; `git stash list`) e preencher a tabela
"Captura por etapa" do `PROGRESSO.md`. Os seletores que mudaram estão em "Para a captura
final", no mesmo arquivo.

## 3. Teste do 4.2 com 5 membros acima de 60 anos

Perfil pelo avatar no topo. Se eles não acharem, volte com o resultado.

## 4. Banco de produção (Supabase)

Antes: no painel do Supabase, Database > Backups, confirme que há backup de hoje.

1. Abra `docs/service-v7/producao.sql` (0051 a 0068 numa transação só; pode rodar mesmo que a 0051 já exista, e rodar de novo não estraga nada), copie tudo, cole no
   SQL Editor e rode. Se der erro, nada é gravado: copie a mensagem e pare.
   (Se você usa a CLI ligada à produção, `supabase db push` faz o mesmo.)
2. Confira:
   ```sql
   select count(*) from information_schema.columns
   where table_schema = 'service' and (table_name, column_name) in
     (('events','pede'), ('timeline_events','ref'), ('chat_members','last_read_at'),
      ('announcements','highlight_until'), ('people','notif_off'), ('course_lessons','lesson_date'));
   ```
   Tem de dar 6.

## 5. Agendador (lembrete do aviso e resumo do Mural)

Não precisa configurar nada. O workflow `.github/workflows/service-cron.yml` roda de hora
em hora no GitHub e se identifica para o site com um token assinado pelo próprio GitHub
(OIDC), conferido em `app/lib/github-oidc.ts`: só passa chamada deste repositório, do
`main` e desse arquivo. O endereço chamado é `https://campusexpansao.vercel.app` (para usar
outro, crie a variável `SERVICE_URL` no GitHub). O `CRON_SECRET` continua aceito, se um dia
for configurado.

## 6. Pôr no ar

1. Abra (ou revise) o pull request de `service-v7-85m5w6` para `main` e confira o CI verde.
2. Merge. A Vercel publica sozinha.
3. Logo depois, em produção: entre como master, abra Início, Escalas, Mural e o app do
   membro; veja se não há tela em branco. Se houver, a Vercel tem "Instant Rollback" para a
   versão anterior (o banco novo não atrapalha a versão antiga: as migrações só acrescentam).

## 7. Depois (não bloqueia o lançamento)

- Criação de culto avulsa no estilo do assistente (4.12).
- Fato "faltou" na história (4.8), que depende do agendador.
- 14 emoji, 1 travessão e 6 cores fixas antigos (registrados na base da lei 12).
- Testar com 5 igrejas o tempo de cada fase do assistente (3, 5 e 5 minutos).
