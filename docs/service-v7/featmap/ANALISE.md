# Service: análise no Featmap

Data: 20/10/2026. Análise estática do checkout local. Não certifica execução ou migrações em produção.

Análise estática de interfaces, manifestos, rotas, persistência e migrações locais. Featmap organiza a análise produzida; não faz varredura automática do código.

Escopo: 289 arquivos; 34 módulos; 12 jornadas; 55 momentos. Commit base: `3cb9c4f3e52ce021b2eafe24735931227d2237f9`. O JSON registra hashes por arquivo, incluindo alterações locais.

## Leitura dos mapas

- Funcionalidades e validação: seis áreas, 34 módulos, ações identificadas e contrato de cada módulo.
- Jornadas de ponta a ponta: etapas, ações, bastidores, hipóteses e oportunidades.
- Encontrado no código não significa testado em produção.
- Validar em execução contém riscos e divergências.
- Oportunidades propostas contém sugestões, não recursos existentes.

## Achados para revisão

### Secretaria delegada fica bloqueada no filtro de rotas

Divergência demonstrável na lógica: manifesto restringe a master/pastor sem `acessos`; podeVerRota retorna na regra restrita antes de extras.includes(rota). A migração 0078 aceita grant secretaria. Resultado esperado da função para líder com grant secretaria: false. Corrigir exige incluir o grant no contrato ou revisar o filtro. Nenhuma alteração do app foi feita.

Fontes: `app/service/modules/secretaria/manifest.ts`, `app/service/modules/registry.ts`, `supabase/migrations/0078_service_secretaria.sql`.

### Negação explícita ao pastor diverge da navegação

O ramo de rota restrita permite o papel pastor antes de consultar a matriz. can_secretaria no SQL verifica negativa explícita de service.secretaria para pastor. A interface pode oferecer rota que o banco recusa. Confirmar com uma conta de pastor e permissão negada.

Fontes: `app/service/modules/registry.ts`, `supabase/migrations/0078_service_secretaria.sql`.

### Alinhar rota da carteirinha no manifesto

Manifesto declara /service/carteirinha; a página concreta é /service/carteirinha/[codigo]. Trata-se de desalinhamento de metadados; testar o QR emitido antes de concluir que a navegação está quebrada.

Fontes: `app/service/modules/secretaria/manifest.ts`, `app/service/modules/secretaria/Carteirinha.tsx`, `app/service/carteirinha/[codigo]/page.tsx`.

### Conferir meses acima de 2000 lançamentos

useFinanceiro consulta fin_transactions com limit(2000), mas saldos vêm de RPCs separadas. A lista pode representar só parte do mês. Validar volume elevado e comunicar truncamento ou paginar.

Fontes: `app/service/modules/financeiro/dados.ts`.

### Simular falha entre lotes de publicação

PublicarEscala atualiza lotes de 300. Falha posterior não desfaz lotes anteriores; o aviso é solicitado depois das gravações. Validar publicação parcial, retomada e estado apresentado ao líder.

Fontes: `app/service/modules/escalas/PublicarEscala.tsx`.

### Conferir retry de lembrete após falha de push

O cron marca reminded_at antes de enviar push. Isso evita duplicidade, mas uma exceção posterior pode impedir nova tentativa automática para o mesmo lembrete. Validar estratégia de retry; não simulado aqui.

Fontes: `app/api/service/cron/lembretes/route.ts`.

### Falha ao ler duplicados usa lista já carregada

ImportarMembros captura falha de carregarExistentes e usa members carregados na página. Essa lista pode estar desatualizada ou incompleta para a checagem. Simular falha de rede e outro cadastro concorrente antes da importação.

Fontes: `app/service/modules/pessoas/ImportarMembros.tsx`, `app/service/lib/importar-membros.ts`.

### Conferir histórico após importação parcial

gravarImportacao tenta lotes e fallback por ficha, mas a inserção do fato em timeline_events não tem erro refletido no resumo. Validar caso de membro salvo e histórico recusado.

Fontes: `app/service/lib/importar-membros.ts`.

### Conferir anonimato entre papéis e respostas

Mural lê prayer_wall e gestão lê prayer_admin_list. Testar que um membro comum não obtém member_id nem nome de pedido anônimo, e que pedido só à intercessão não aparece a outro membro.

Fontes: `app/service/modules/oracao/oracao.ts`, `supabase/migrations/0076_service_mural_oracao.sql`.

### Conferir privacidade e preferência em mais de um aparelho

Testar notas bíblicas privadas, tamanho do texto, tema, opt-out de categorias, assinatura de push e logout em outro aparelho. Código contém mecanismos separados de persistência, sem comprovação de sincronização fim a fim.

Fontes: `app/service/MobileApp.tsx`, `app/service/page.tsx`, `public/service-worker.js`.

### Testar aprovação e vínculos com duas organizações

Validar conta nova, conta existente, convite vencido, código inválido, igreja com aprovação e entrada direta. Conferir tenant e pessoa vinculada depois do login e depois de aceitar pedido.

Fontes: `app/api/service/entrada/route.ts`, `app/service/participar/[codigo]/EntradaForm.tsx`, `app/lib/service-invite.ts`.

### Validar retirada com responsável sem autorização

Executar sessão real de teste: criança sem turma, responsável vinculado, terceiro não autorizado, check-in repetido e retirada repetida. Conferência humana de identidade faz parte do serviço.

Fontes: `app/service/KidsCheckin.tsx`, `app/service/lib/kids-checkin.ts`.

## Cobertura dos módulos

| Área | Módulos |
|---|---|
| 01 · Entrada e estrutura | entrada, igreja, configuracao, acesso, perfil, inicio |
| 02 · Pessoas e cuidado | pessoas, visitantes, grupos, decisoes, cuidado, aniversarios |
| 03 · Ministério e agenda | times, escalas, ensaios, reunioes, cultos, espacos, kids, quadros |
| 04 · Comunicação | mural, conversas, oracao, pesquisas, pagina |
| 05 · Formação e fé | cursos, batismos, biblia, contribuir |
| 06 · Gestão institucional | financeiro, secretaria, identidade, historia, relatorios |

## Limites

- Análise estática: não foram usadas credenciais do Service nem dados reais.
- Extração automática de tabelas e RPCs reconhece chamadas literais; chamadas dinâmicas e SQL gerado exigem leitura adicional.
- Os 34 módulos representam o registro atual. As combinações de papel, requisito, igreja e erro não foram todas executadas.
- Publicação de documentos por modelo ainda é descrita na migração 0078 como tela futura; não é listada como ação implementada.
- Financeiro é fase 1; não inferir conciliação bancária, importação OFX, orçamento ou assinatura comercial a partir dos lançamentos existentes.
- Oração anônima protege identidade no mural, mas a intercessão autorizada tem visão administrativa; não prometer anonimato absoluto.
- O relatório anterior JORNADAS_PONTE.md contém lacunas já atendidas por implementações locais posteriores.

## Artefatos

- `analise-service.json`: conteúdo autoral dos mapas e inventário técnico, sem credenciais.
- `snapshot-featmap.json`: dados devolvidos pela API após a importação e verificação.
- `INSTALACAO.md`: endereço e comandos de operação local.

## Verificação da divergência de acesso

Executada a própria função `podeVerRota` extraída de `registry.ts`, com mapas derivados dos manifestos atuais:

| Cenário | Resultado do filtro |
|---|---|
| Líder com grant secretaria | false |
| Pastor com secretaria negada na matriz | true |
| Líder com grant financeiro.ver | true |

O primeiro e o segundo resultado divergem do contrato SQL de `can_secretaria`. Isso comprova a divergência lógica local, sem afirmar exploração ou falha observada em produção. Resultado salvo em `verificacao-acesso.json`.

## Resultado da importação

Dois projetos com 321 cartões, 18 grupos de atividades, 60 colunas e cinco personas por projeto. Retorno da API conferido e segunda importação sem duplicidade. Interface visual não verificada: o navegador integrado falhou na conexão.
