---
id: N1
titulo: Tornar fuso, idioma e moeda explícitos
tipo: codigo
status: reservada
quem: codex
desde: 2026-10-24
branch: historia/N1-locale-moeda
depende: []
tamanho: G
---

## Por quê
O fuso da igreja já foi aplicado (2dec69c). Idioma da pessoa e moeda da igreja ainda não. Também faltam textos longos, pseudolocalização e validação no servidor com o mesmo contrato.
Fonte: HANDOFF item 6; STATUS F14; VALIDACAO.md :83; QUALIDADE-E-INTERNACIONAL.md.

## Arquivos (trilho)
- `docs/service-v7/historias/N1-fuso-idioma-moeda.md`
- `app/lib/types.ts`
- `app/service/lib/internacional/`
- `app/service/lib/server/tipos.ts`
- `app/service/lib/server/adaptadores.ts`
- `app/service/lib/server/carregar.ts`
- `supabase/migrations/0096_service_locale_currency.sql`
- `docs/service-v7/producao.sql`
- `scripts/check-service-internacional.ts`
- `scripts/check-local-internacional.ts`
- `scripts/check-local-internacional-ui.ts`
- `docs/service-v7/INTERNACIONALIZACAO.md`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `app/service/layout.tsx`
- `app/service/page.tsx`
- `app/service/painel/tipos.ts`
- `.github/workflows/service.yml`
- `scripts/internacional/`
- `app/service/lib/vocabulario.ts`
- `app/service/lib/vocabulario-context.tsx`
- `app/service/ServiceExactApp.tsx`
- `app/service/painel/telas/Config.tsx`
- `app/service/membro/Perfil.tsx`
- `app/service/MobileApp.tsx`
- `app/service/lib/text-scale.ts`
- `app/service/TextSizeSlider.tsx`
- `app/service/modules/perfil/manifest.ts`

- `app/service/login/`
- `app/service/nova-senha/`
- `app/service/convite/`
- `app/service/PasswordInput.tsx`
- `app/[slug]/entrar/page.tsx`

- `app/service/CepInput.tsx`
- `app/service/lib/termo-mapa.ts`
- `app/service/membro/AceiteMapa.tsx`
- `app/api/service/cep-lookup/route.ts`
- `app/api/service/members/accept-invite/route.ts`


- `app/api/service/`
- `app/service/painel/erros.ts`

- `app/lib/service-avisos.ts`
- `app/lib/service-avisos-texto.ts`
- `app/lib/service-mural-agendado.ts`
- `scripts/check-service-avisos-fuso.ts`

## Pronto quando
- Locale da pessoa e moeda da igreja explícitos.
- Textos longos e pseudolocalização testados.
- Servidor valida o mesmo contrato do cliente.
- Telefone, endereço exterior e CNPJ alfanumérico continuam tratados.

## Notas
ABERTO. Tipo original: codigo + decisao-do-usuario. Parte do item (idioma e moeda) depende de escolha sua: antes de codar, o agente prepara as opções e registra a resposta.
Trilho a definir na reserva.

2026-10-24, Codex. Reserva publicada após concluir Q8. Nenhum código iniciado: esta história exige escolha do usuário antes de codificar. Enviadas duas perguntas: idiomas/locales (somente pt-BR; pt-BR/pt-PT; pt-BR/en-US/es-ES com tradução completa) e moedas (BRL; BRL/EUR; BRL/EUR/USD). Proposta explícita: uma moeda por igreja, sem câmbio ou mistura de moedas e sem reinterpretação dos lançamentos existentes. Respostas recebidas em 24/10: pt-BR, en-US e es-ES com tradução da interface inteira; BRL, EUR ou USD por igreja, sem câmbio ou reinterpretação dos lançamentos. Não foram assumidas histórias D.

Inventário anterior à escolha: fuso já está em DbChurchClock/app/lib/types.ts, ChurchRow/ChurchView e toChurchView; preservar essa cadeia. Não há locale/moeda explícitos nos contratos atuais. A preferência pessoal de tamanho de texto usa service.members e RPCs próprias (0057), uma referência de fluxo de preferência, não autorização para reutilizar seu campo. Financeiro ainda formata BRL em dinheiro.ts, campos e CSV; não basta trocar o símbolo para suportar outra moeda. A auditoria de referência é auditoria-ux-2026-10-20/QUALIDADE-E-INTERNACIONAL.md, seção 4: separa idioma da pessoa, moeda da igreja e vocabulário, pede plural/interpolação e pseudolocalização com expansão de 30% a 50%. O trilho de implementação será definido depois da resposta e de conferir reservas.

Decisão registrada antes do código. Primeiro trilho técnico sem sobreposição com I10: contrato central, persistência/validação, formatação e catálogo. A I10 ainda reserva app/service/ui/, painel/comum.tsx, módulos inicio/Saude, financeiro/ e relatorios/; nenhum desses arquivos entra enquanto a reserva existir. O inventário inicial identificou 3670 ocorrências e 2600 textos distintos em 182 arquivos, antes de classificar frases dinâmicas e conteúdo da igreja. A tradução completa e a integração nas telas continuam obrigatórias; esta etapa não fecha a N1.

Moeda precisa ser única na organização (rede), porque contas e lançamentos financeiros somam por organization_id e atravessam congregações. Locale pertence à conta da pessoa, separado de país, fuso e vocabulário. Persistir BRL nos dados legados e bloquear reinterpretação depois de qualquer valor financeiro. Testar concorrência entre primeira movimentação e mudança de moeda, além de leitura/escrita sem permissão.

Primeira verificação técnica: 37 casos autenticados passaram em banco descartável (cex-rls-1ff5952ff3e1, removido), incluindo locale individual, valores inválidos, isolamento, trava monetária persistente e disputa entre configuração e primeira gravação. Typecheck, lint e contrato estático de formatação passaram. Não é conclusão da história: tradução e integração ainda faltam. Trilho ampliado para instalar a infraestrutura de mensagens, configurar somente o Service e rodar o contrato novo no CI; nenhum caminho da I10 foi acrescentado.

Base de mensagens implementada com use-intl/core estável, configuração explícita por pedido/provider e somente o catálogo escolhido no cliente. Não usa extração experimental nem locale global mutável. Provider mantém a língua do conteúdo no servidor e do documento no navegador sem tornar o site público dinâmico. O catálogo inicial de 22 mensagens só verifica a base; as demais telas continuam pendentes. Passaram plural ICU 0/1/2, rich text, preservação de conteúdo por argumentos, pseudolocalização por AST, typecheck, lint, leis, contraste, 13 regressões e build de produção. Nenhum caminho reservado da I10 foi tocado.

Trilho de integração inicial: extração/verificação de mensagens, vocabulário padrão por locale, casca para passar o locale já escolhido e preferências existentes de Perfil/Configurações. Estes caminhos foram comparados à reserva I10 e não sobrepõem seus arquivos. Nomes/termos personalizados pela igreja são dados e permanecem no idioma original; traduzir apenas os padrões e as frases da interface. A ampliação ainda não inclui UI/, painel/comum, financeiro ou relatorios.

Lote parcial de integração: 244 mensagens revistas nos três idiomas (226 referenciadas no código, além das mensagens de prova). Perfil e Configurações ainda têm frases e metadados pendentes. Vocabulário padrão por locale preserva termos personalizados na leitura e na gravação. Contrato de internacionalização e comparação semântica do preparador de JSX passaram; nenhum arquivo reservado da I10 foi alterado. Preferências visuais, tradução integral, captura e integração financeira continuam pendentes.

Preferência pessoal de idioma conectada ao Perfil com Campo/Selecao compartilhados e RPC própria. Só atualiza a interface depois de a gravação responder com o locale esperado; falha deixa o idioma atual e mostra tentativa novamente. O refresh do roteador preserva o estado do app. Esta ligação ainda aguarda teste autenticado no navegador e medição de densidade; não é prova de tela concluída.

Trilho ampliado antes do código para prova autenticada da preferência pessoal em Chromium descartável (scripts/check-local-internacional-ui.ts). Reservas conferidas: I10 segue ativa, sem sobreposição com este script.

Prova de navegador ainda pendente: primeira tentativa bloqueada pela API Docker; reinício gracioso do OrbStack feito conforme autorização explícita do usuário. Projeto cex-rls-570b292ece84 removido e ausência de contêineres/volumes conferida. Segunda tentativa aplicou migrações, mas falhou no login da conta canônica antes de executar casos de idioma. Projeto cex-rls-d40073001ede descartado e ausência de contêineres conferida. Script acrescenta diagnóstico de status/código/mensagem de autenticação, sem alterar o produto. Nenhum caso de tela aprovado nessa execução. Leis 12/17 e 13 regressões de jornadas passaram no lote de 244 mensagens.

Retomada de 24/10/2026: reservas remotas conferidas, I10 continua com Claude. Nenhum arquivo do trilho da I10 foi editado. Catálogos ampliados para 272 mensagens por idioma, 255 referências literais no código: erros e confirmação do Perfil, papéis, datas civis localizadas, categorias de avisos e cabeçalhos/retornos de Configurações. A categoria Caminhada mantém o vocabulário personalizado da igreja como argumento. Tradução integral e integração financeira continuam pendentes.

Diagnóstico da prova de UI: login passou; captura revelou primeiro acesso da conta master. Com a conta canônica de membro, o modal de consentimento do mapa interceptou o seletor. Fixture da prova agora conclui os dados mínimos e registra a recusa do mapa exclusivamente no banco descartável, sem alterar fixtures compartilhadas. Script captura a falha, mede densidade nos idiomas e verifica rejeição de gravação. Uma tentativa posterior falhou na recarga do schema antes dos casos; isso não valida a UI.

Prova autenticada finalmente passou em cex-rls-9933c49519fe (descartado): seis combinações de idioma/largura com recarga e Perfil preservado, sem rolagem lateral, mais falha simulada da gravação mantendo pt-BR após recarga. Nenhum pageerror. Capturas ainda mostram a casca parcialmente em português. Medição de densidade inicial teve amostras durante entrada/hidratação; script ajustado para aguardar seletor, fontes e animações e voltar ao topo. Isso ainda não fecha a história nem valida pseudo/aparelho real.

Trilho ampliado antes do código, após reconferir reservas remotas: MobileApp.tsx, lib/text-scale.ts e TextSizeSlider.tsx para localizar a navegação fixa do membro e as preferências de tamanho do texto. Nenhum desses caminhos pertence à I10. A ampliação não assume as histórias M nem muda comportamento, composição ou ordem de navegação.

Lote seguinte: 320 mensagens por idioma e 303 referências literais; navegação do membro e tamanho do texto localizados, incluindo rich text, saudações, plural e aria-valuetext. Prova autenticada passou em cex-rls-278c2a8c54de (descartado): três idiomas/duas larguras, cabeçalho/quatro abas/controle de texto, recarga e falha da RPC preservando o idioma. Densidade estável do membro em 390px: 10 ações, 40 a 58 palavras, 2 molduras, sem alvos pequenos/sobreposições/rolagem. Em 1366px a referência pt-BR e as traduções têm 3 molduras: limite desktop não aprovado; não é captura do painel. Tradução integral e integração financeira ainda pendentes.

Verificações finais deste lote: tsc --noEmit e build completo com configuração fictícia do CI passaram, assim como lint dos arquivos alterados (dois avisos preexistentes de img em Config), extrator, internacionalização/preparador JSX, leis 12/17, contraste e 13 regressões. docker ps confirmou ausência de contêineres cex-rls restantes. N1 segue reservada, sem PR ou merge: ainda falta tradução integral, integração financeira e capturas abrangentes/pseudo. Próxima continuação em INTERNACIONALIZACAO.md, última subseção.

Trilho ampliado em 24/10 após conferir a reserva I10: entradas de autenticação, campo de senha e provider na entrada temática. Só internacionalização dos fluxos existentes, sem assumir histórias de tela do Claude.

Autenticação localizada em 24/10: 381 mensagens completas por idioma, 363 referências. Login e recuperação usam mensagens completas; reenvio de confirmação depende de estado técnico, não de texto traduzido. Provider incluído na entrada temática. Prova Chromium em banco cex-rls-664a442f27c0 passou e descartou o projeto: seis combinações de idioma/largura no Perfil, falha de persistência e três fluxos anônimos com erros simulados, senha visível e link vencido. Nenhum e-mail enviado. Tipos, lint, contratos e leis 12/17 passaram no lote de autenticação; convite servidor acrescentado depois e será revalidado. N1 continua incompleta e sem publicação em produção.

Reservas conferidas após retomada: somente I10/Claude e N1/Codex. Ampliação para mensagens de convite, consentimento e CEP no cliente/servidor; nenhum caminho da I10 incluído.

Reservas reconferidas: ampliação para mensagens e datas dos componentes do membro e rótulos de pré-requisitos. Mudanças de internacionalização, sem assumir as histórias M reservadas ao Claude. O diretório membro não pertence à I10.

Lote convite/endereço: 433 mensagens completas por idioma, 415 fontes usadas. Cliente e servidor localizam validações de CEP/convite; consentimento usa tradutor explícito com nomes preservados. Cookie de idioma passa a / para alcançar a entrada temática, removendo o caminho antigo. Prova isolada --so-entrada passou nos três idiomas em cex-rls-abc2e9008281 (descartado), incluindo respostas reais das APIs sem aceitar convite nem enviar e-mails. Typecheck/lint, contratos de internacionalização, leis 12/17, contraste e 13 regressões passaram. A prova completa do Perfil NÃO passou na repetição: botão Listo encontrado, mas sem estabilidade para clique; não houve pageerror. Build final e typecheck final passaram com configuração fictícia em loopback 59999, sem credenciais de produção.

A pedido explícito do usuário, foi deixada a mensagem “Mensagem para o Claude, solicitada pelo usuário em 24/10/2026” em docs/service-v7/INTERNACIONALIZACAO.md. Contém o restante das telas, arquivos da I10, integração financeira, falha de estabilidade e verificações faltantes. A revisão automática rejeitou o comando novo em Agenda/Onboarding/comum por sobreposição com histórias M; o comando não executou. O usuário reafirmou a divisão original e pediu deixar a parte não concluída ao Claude. N1 continua reservada e incompleta; F1/O4/O5/O6 não iniciadas, sem PR/merge/deploy desta história.

Retomada a pedido do usuário: há trabalho livre na própria N1. Retiradas do trilho as reservas amplas membro/ e requirements.ts, que não chegaram a ser editadas, para não bloquear as histórias M do Claude. Permanecem somente Perfil/AceiteMapa já localizados. Reservas remotas conferidas (I10/Claude, N1/Codex); ampliado o trilho para mensagens de erro das APIs e o adaptador técnico painel/erros.ts, sem layout ou comportamento das histórias de tela.

Reservas novamente conferidas. Ampliação de bastidor para localizar mensagens automáticas de avisos pelo idioma do destinatário (não pelo de quem publica), sem traduzir título ou corpo escritos pela igreja. Inclui fila e testes de silêncio/isolamento; nenhum arquivo de tela ou da I10.
