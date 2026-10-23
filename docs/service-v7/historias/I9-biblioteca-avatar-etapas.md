---
id: I9
titulo: Biblioteca, bloco C (avatar, etapas, tabela com seleção)
tipo: codigo
status: feita
quem: claude
desde: 2026-10-22
branch: historia/I9-biblioteca-avatar-etapas
depende: [I4]
tamanho: M
---

## Por quê
Avatar tem 5 definições; etapas e linha do tempo têm 4 estruturas; a tabela da prancha 3 (seleção com barra de ações em lote) não existe.
Fonte: canvas "Service, direção visual" (claude.ai/artifact/JNpxaXTN3uVPmvdLCgcdMb), pranchas 3 e 6; docs/service-v7/BIBLIOTECA.md.

## Arquivos (trilho)
- `app/service/ui/`
- `app/service/painel/ui.tsx`, `app/service/membro/comum.tsx`, `CheckIn.tsx`, `CursoDrawer.tsx`, `AulaCheckin.tsx`

## Pronto quando
- Avatar e Etapas únicos em app/service/ui, cópias removidas.
- Tabela com seleção e barra em lote em uma tela de referência (Pessoas).

## Notas
Mesmo método do I4: peça em app/service/ui, visual em biblioteca.css, galeria em /service/demo/biblioteca, troca tela a tela, regra no scripts/check-service-componentes.ts.

2026-10-23 (claude): feita. `Avatar`/`AvatarGrupo`, `Etapas` (linha, app, faixa) e `Tabela` (seleção e barra em lote) em app/service/ui, visual e movimento em biblioteca.css (mola, cascata, halo na etapa atual, barra em lote 0,5 s; tudo desliga com movimento reduzido), exemplos na galeria (bloco C). Trocados: avatares em painel/ui e membro/comum (repassam para Avatar), CheckIn, CursoDrawer, AulaCheckin, KidsCheckin, KidsCheckinClient, TopUserMenu, Quadros, Times, MapaIgreja, LiberarMapa; etapas em FichaPessoa (caminhada e histórico de contato), membro/Caminhada e ImportarMembros; tabela com seleção em Pessoas (copiar telefones, baixar planilha). Regras novas no check-service-componentes (avatar, etapas, tabela).
Verificado: galeria em 1366 e 375, claro e escuro, `?cor=%23C5805A`; Pessoas e ficha no /service/demo; tsc, eslint dos alterados, check de componentes, lei 12 e next build.
Ficou de fora: as outras `.tbl` sem seleção (Aniversariantes, Secretaria, Financeiro, Formação, Kids, Visitantes, Reuniões); CSS antigo de `.tl`, `.jrn-tl`, `.m6-step`, `.imp-step` em service-app.css (arquivo de casca, sem uso agora, apagar depois); etapas feitas do app do membro não trazem a data (o Onboarding monta o passo só com o estado, e a linha "Ver as datas de cada uma" promete o que não mostra): pede história nova; não testado em aparelho real nem com banco local.
