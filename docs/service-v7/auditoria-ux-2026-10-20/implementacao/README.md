# Aplicação da direção editorial no Service

20/10/2026. Direção autorizada: Comunidade editorial como base, Agenda e ação para compromissos. Esta entrega implementa os inícios, o primeiro uso e as ligações de aviso/tarefa. Não representa a conclusão dos 24 achados da auditoria.

## Comportamento implementado

- Início do membro com a primeira ação em destaque, demais entradas separadas por divisórias e programação real da igreja com datas visíveis. Sem tarefa, “Tudo em dia” explica que não há resposta pendente. Sem programação, o texto distingue ausência de encontro publicado.
- Escala com data como ponto de orientação, mantendo confirmação, recusa, desfazer e destinatário da troca existentes.
- Gestão sem programação com preparação do próximo encontro como ação principal. Estados de escala distinguem falta de programação, falta de preparação e ausência de vagas abertas. Contadores sem visitantes não dizem que todos receberam contato.
- Preparação da igreja em seção expansível no painel recorrente. O checklist deixa de ocupar o centro da primeira tela, e não aparece ao líder sem responsabilidade de gestão.
- Assistente com corpo próprio, sem herdar a regra mobile que escondia o checklist antigo. Endereço, logo/cor e modelos de times são opcionais e expansíveis. Nenhum modelo de time vem selecionado. Séries começam com horizonte de 30 dias, em vez do fim do ano, e a data final é validada. Encerrar abre a agenda para conferir o resultado.
- Nome da igreja antes do CNPJ no cadastro. Consulta institucional mantida em seção opcional, com os mesmos contratos de gravação existentes.
- Evento com campo nativo de data completa, ano explícito, data e horário obrigatórios. Validação anterior ao insert recusa data incompleta ou impossível. Horário é normalizado para HH:MM. O seletor de aniversário permanece separado e compatível com dados antigos.
- Aviso do Início abre a publicação correspondente, com caminho para voltar à lista. Apenas publicações que aparecem na área visível geram o registro existente de visualização; abrir a lista não marca todas. O texto esclarece que visualização não equivale a resposta.
- Tarefa do Início abre a tarefa correspondente na Agenda, expandida e focada, carregando comentários e preservando a filtragem por responsável.
- Rótulos ligados aos campos do primeiro acesso, perfil e assistente; CEP aceita id e nome acessível. Campos nas áreas escaladas do membro mantêm piso visual de 16px, e ações selecionadas mantêm o piso de toque após escala. Zoom do navegador continua disponível.

## Validação executada

| Verificação | Resultado |
|---|---|
| TypeScript, `npx tsc --noEmit --pretty false` | Passou |
| ESLint dos arquivos alterados | Sem erros; quatro avisos preexistentes no Início do membro, sobre parâmetros não usados e imagens |
| `npx tsx scripts/check-service-civil-date.ts` | Passou: data completa, virada de ano, ano bissexto e datas impossíveis |
| `npx tsx scripts/check-theme-contrast.ts` | Passou para as oito famílias e os acentos testados pelo verificador existente |
| `git diff --check` | Passou |
| Assistente em 320/390px | Formulários das três fases disponíveis; inspeção visual em navegador controlado |
| Painel desktop, 1440px | Preparação expansível, resumo e próximas ações visíveis |
| Evento sem data/horário | Botão desabilitado, com indicação do que falta |
| Evento com ano seguinte | 10/01/2027 representado integralmente e botão habilitado após preencher horário |
| Gravação e descoberta entre papéis | Gestão criou pela interface; banco local confirmou 2026-10-25, 19:30 e endereço; membro comum abriu o mesmo evento |
| Claro e maior texto, 375px | Evento e ações inspecionados visualmente, sem corte observado na captura |
| Menor texto, 375px | Primeiro acesso inspecionado após ajuste dos pisos de campos e associação de rótulos |
| Aviso e tarefa | Aviso específico aberto, duas outras publicações permaneceram não vistas; tarefa específica aberta e expandida |

As imagens e estados de cada tentativa estão em `capturas/manifesto.json`. Tentativas com seletor inadequado ou com primeiro acesso ainda pendente estão registradas como incompletas, sem serem oferecidas como prova de sucesso. Capturas anteriores a ajustes finais de apresentação também são preservadas para rastreabilidade.

O teste de gravação foi feito exclusivamente no Supabase local em 127.0.0.1:54321. Para verificar o membro após o primeiro acesso, o telefone de uma fixture foi temporariamente preenchido e depois restaurado. O evento criado para o teste foi removido. A ausência do evento e a restauração do telefone foram conferidas por consulta. Não houve convite, mensagem, pagamento ou notificação externa. A produção não foi alterada.

Os hashes em `fontes.json` identificam a versão desta implementação. A auditoria anterior mantém sua própria fotografia do código; seus achados descrevem aquele momento.

## Limites e continuidade

Não foi realizado build de produção nem teste completo de todos os módulos. Os testes visuais usam Chromium; o zoom automático com teclado em Safari/PWA de iPhone continua exigindo aparelho real. A regra de piso após escala reduz um fator verificável, mas não prova que o relato de zoom esteja resolvido. A causa do ponto branco relatado também não foi conclusivamente reproduzida.

Continuam previstos no relatório: país/fuso/moeda e endereços internacionais, telefone internacional, horário livre no assistente de séries, recuperação completa entre pessoas, revisão dos demais módulos e testes de usabilidade. O cadastro continua com contratos brasileiros; mover CNPJ para uma seção opcional não equivale a internacionalizar o produto.

As quatro abas, ChurchLockup, Inter, temas da igreja, registro de módulos e permissões foram mantidos. Nenhuma migração ou dependência foi adicionada. As alterações de financeiro/secretaria já presentes no workspace foram preservadas. Estilos estão na folha própria carregada pelo Service, conforme a arquitetura documentada em modules/README.md; o site público não recebe os overrides desta entrega.

Nenhum commit, push ou deploy foi realizado.
