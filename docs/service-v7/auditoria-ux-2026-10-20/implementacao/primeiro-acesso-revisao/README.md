# Primeiro acesso · revisão de 21/10/2026

## Pastor e responsável pela igreja

Confirmado no código: onboarding/page usa AuthShell e separa pessoa com convite, pedido pendente e criação explícita de igreja (?nova=1). BootstrapChurchForm, porém, ainda usa classes genéricas field/input/btn, contrariando a regra de entradas com login-* do AGENTS §2. Cadastro contém dados básicos e CNPJ opcional, com dados institucionais recolhidos. O assistente já tem três fases progressivas: Sua igreja, Primeiro encontro e Pessoas. Endereço/logo/cor e times opcionais estão recolhidos. Não exigir todos os módulos antes do primeiro evento.

Decisão: alinhar somente o formulário de criação às classes de AuthShell, manter RPC e contrato, tratar rejeição de rede com recuperação do botão e dados preservados. Não redistribuir fases ou módulos sem nova evidência. Arquivo: app/service/onboarding/BootstrapChurchForm.tsx. Risco baixo: estilos e tratamento de falhas, sem migração. Verificar formulário, CNPJ opcional, campos de toque, claro/escuro, mobile/desktop e erro sem criar igreja real.

## Membro

Confirmado no código: convite em AuthShell pede e-mail, senha, CEP brasileiro e mostra região consultada; exterior pede país/cidade. CPF não é obrigatório. Primeiro acesso do app confirma nome/telefone e permite ajustar texto. Complete seus dados fica no Início. Depois, há destino para escala pendente ou próximo encontro; igreja vazia explica quando a programação aparecerá e mantém Tudo em dia. Consentimento do mapa existente é registrado uma vez; demo com credenciais fictícias não comprova gravação desse consentimento.

## Caminhada

A página atual já separa etapas, cursos, Bíblia, generosidade e identidade da igreja. Módulos e dependências continuam no registro. Agrupar tudo novamente sob Trajetória/Aprender/Práticas criaria níveis adicionais sem evidência de que resolvem uma tarefa concreta. Decisão: preservar as seções existentes e os quatro lugares da casca, mantendo a correção dos marcadores desta sequência. Reorganização mais ampla fica como hipótese para teste com pessoas, não como correção confirmada.

Limites desta revisão: não repete como nova evidência as gravações de ativação/convite já documentadas em implementacao/ativacao e geolocalizacao. Não certifica todas as combinações de papéis, idiomas, teclados, banco remoto ou aparelhos reais.

## Cadastro: inspeção desta entrega

Fixture temporária em /service/demo renderizou o próprio AuthShell e BootstrapChurchForm, com credenciais fictícias e sem criar conta/igreja. A demo foi restaurada antes do commit. Chromium/CDP em 320/390/1280/1600, claro/escuro: sem overflow, campos 50px de altura, fonte 17px mobile/16px desktop, CTA 52px. Dados institucionais permanecem recolhidos.

Teste interceptou e recusou a chamada bootstrap_church_org_v2 com dados sintéticos antes de chegar ao banco. Erro acessível exibido, botão reabilitado, nome preservado. Isso comprova recuperação da interface, não bootstrap real. Typecheck, lint, Lei 12 e contraste aprovados; contratos e build registrados no fechamento.

Fechamento local: os 12 contratos das jornadas e npm run build também passaram, com demo restaurada.

## Igreja sem conteúdo: nova inspeção visual

Fixture temporária sem eventos, cursos, times, mensagens, tarefas ou turmas, com jornada ainda não concluída. Inspeção das quatro abas em 320px: Início orienta a ausência de encontros e mostra próximo passo; Agenda explica o que aparecerá quando houver escala/inscrição; Mensagens explica Mural e conversas; Caminhada mantém etapas numeradas e explica que cursos aparecem quando publicados. Sem rolagem horizontal nas quatro abas. Capturas membro-vazio e JSON neste diretório. Esta evidência cobre leitura/navegação com dados sintéticos; pedidos de oração, novas conversas e marcação de etapas não foram enviados. Demo restaurada.
