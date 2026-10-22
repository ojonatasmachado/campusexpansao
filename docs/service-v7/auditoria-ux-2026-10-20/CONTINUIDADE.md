# Continuidade · 21/10/2026

## Última entrega e publicação

Cadastro da primeira igreja: `dfadcb4095b149f49e0b8c20e8328ab61e4c6992`. Código em main e fix/service-fuso-20261021. CI `39706851217` e `39706851463`: success. Prévia `dpl_5vNXbrzDFKMP3CAgac8duYVzpgh8`: READY. Como o push gerou só prévia, foi solicitado redeploy do mesmo commit com target production: `dpl_GREw2iPqz5qJPdUUJ75TtXHmG4uo`. Estado de produção confirmado: READY, com campusexpansao.com.br e www.campusexpansao.com.br associados.

Worktree `/tmp/cex-fuso-release-20261021`, branch `fix/service-fuso-20261021`. Workspace principal preservado. Base integrada antes das entregas: `ea8b7a0` (mapa e atualização do app instalado).

## Entregas desta retomada

| Entrega | Commit | CI success | Produção READY |
| --- | --- | --- | --- |
| Marcadores pendentes da Caminhada | `00e03a3` | `39705162659`, `39705163589` | `dpl_5LkNgN8ScXvafGyXdkkXRx1nY9Ti` |
| Menu Mais por área | `0c703c1` | `39705617034`, `39705617291` | `dpl_A2khtKaab1MVsahmm3iq4qU9kgq9` |
| Compositor, público explícito, revisão e minutos do agendamento | `9bf601e` | `39706374624`, `39706374664` | `dpl_DuHifx2hV4dA7qc1LnnfDEYSjitL` |
| Cadastro da primeira igreja em AuthShell/login-* | `dfadcb4` | `39706851217`, `39706851463` | `dpl_GREw2iPqz5qJPdUUJ75TtXHmG4uo` |

## Arquivos e evidências

- Caminhada: `app/service/membro/Caminhada.tsx`, `evolucoes/service_app/service-app.css`; documentação/capturas em `implementacao/acompanhamento`.
- Menu: `app/service/ServiceExactApp.tsx`, CSS do Service; `implementacao/menu-mais` contém decisão, capturas e interações.
- Mural: `app/service/modules/mural/Mural.tsx`, CSS do Service; `implementacao/mural-compositor` contém revisão de público, agendamento 22:22 e rascunho com público removido.
- Cadastro: `app/service/onboarding/BootstrapChurchForm.tsx`; `implementacao/primeiro-acesso-revisao` contém matriz e teste de recuperação de falha sem criar igreja real.
- STATUS atualizado por entrega. Nenhuma migração foi criada nesta retomada.

## Testes executados

Em cada entrega de código: typecheck, lint dos componentes alterados, Lei 12, contraste, os 12 contratos do CI e build. No ajuste posterior dos minutos do Mural, repetidos typecheck, lint, Lei 12, fuso/avisos e build. CI também validou migrações e pacote SQL. Lint de ServiceExactApp teve zero erros e dois avisos preexistentes de eslint-disable.

Chromium/CDP: Caminhada 320/390, claro/escuro, escala 1 e 23/17, sem marcador pendente vazio ou overflow. Três dígitos cabem no marcador em teste sintético de DOM. Menu 320/390/1280/1600, temas, Enter e rota Secretaria. Mural: editar 320/390/1280/1600, revisar 320/390/1280, ambos temas; retorno preserva preenchimento, público removido bloqueia revisão, agendamento mantém 22:22. Cadastro 320/390/1280/1600 nos dois temas: campos 50px, CTA 52px, fontes mobile 17px e desktop 16px. Falha de rede interceptada: botão reabilita e dados ficam.

Igreja sem conteúdo: as quatro abas do membro inspecionadas em 320px, sem overflow e com orientação. Fixture sem eventos/cursos/times/conversas; consentimento do mapa já decidido para isolar a jornada. Nenhuma ação de envio foi executada. Todas as fixtures temporárias da demo foram restauradas antes dos commits.

## Decisões e próximos cenários

Manter sequência de ativação existente (igreja, encontro, pessoas) e casca do membro. Caminhada já separa etapas, cursos, Bíblia e práticas; agrupar novamente em novos níveis permanece hipótese para teste com pessoas. Não há mudança estrutural adicional aprovada por evidência desta retomada.

Próximo trabalho útil: matriz autenticada adicional de papéis/módulos, Safari/PWA em dispositivo com teclado e fonte do sistema, idiomas/moedas/regras locais. A auditoria ampla permanece parcial conforme STATUS. Não repetir como evidência nova as gravações locais anteriores já documentadas em ativacao/geolocalizacao/times.

## Limitações

Navegador integrado falhou com `missing field sandboxPolicy`; fallback foi Chromium local/CDP. Não houve certificação com leitor de tela ou aparelhos reais. Demos/credenciais fictícias não validam gravação real, upload, notificações ou permissões no banco. Recuperação do cadastro foi testada interceptando a chamada antes do banco. Os contratos e CI cobrem suas verificações descritas, não toda combinação de estado do produto.

## Comandos de retomada

`git status --short`, `git fetch origin`, comparar origin/main antes de editar. `npx tsc --noEmit`; `npx eslint <componente>`; `npx tsx scripts/check-service-lei12.ts`; `npx tsx scripts/check-theme-contrast.ts`. Contratos em .github/workflows/service.yml. Build local usa variáveis fictícias do CI; dependências precisam estar no próprio worktree (Turbopack rejeita symlink externo). Não incluir alterações do workspace principal.

Fechamento: quatro entregas de código publicadas, todos os CI listados em success e produção final READY. Este registro e a nova evidência de igreja vazia são atualização documental posterior ao último commit de código; não mudam comportamento de produção.
