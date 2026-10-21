# Cobertura, procedência e plano de validação

20/10/2026. Complemento do [relatório](RELATORIO.md), da [galeria](index.html) e do [mapa](mapa-jornadas.html).

## O que esta entrega comprova

O inventário contém 34 módulos. O mapa reconstrói 12 jornadas e 48 momentos do código, agrupados em cinco personas. O relatório apresenta 24 achados com graus de confirmação explícitos. Pensamentos, emoções e oportunidades do mapa são hipóteses; a linha de pesquisa permanece vazia porque não foram realizadas entrevistas.

As capturas foram produzidas em Chrome/Chromium controlado pelo REA. O navegador integrado falhava na inicialização; o navegador separado permitiu abrir as telas, clicar, preencher campos, comparar tamanhos e registrar imagens e árvores de acessibilidade. Isso comprova as observações descritas, sem transformar toda leitura de código em teste funcional completo.

O arquivo [fontes.json](fontes.json) registra o commit de referência e SHA-256 de 229 arquivos locais, incluindo alterações preexistentes ainda não commitadas. O estado analisado é o workspace, não apenas o commit e não uma implantação em produção. O [manifesto](capturas/manifesto.json) registra cenário, Evidence ID, endereço inicial, viewport, locale, fuso, ações, estado e hash das imagens. Os `.txt` correspondentes guardam a árvore de acessibilidade.

## Ambientes

| Ambiente | Uso | Limite |
|---|---|---|
| localhost:3001 | Demonstração, login e formulários sem envio | A configuração habitual aponta para banco remoto; não foram realizadas gravações de funções |
| localhost:3002 | Cópia temporária do mesmo código, com Supabase local e contas de teste existentes | Sem seed, reset ou migração; login cria sessões técnicas; primeiro acesso dos membros não foi concluído |
| localhost:8765 | Documentos, mapa e protótipos desta auditoria | Interações simuladas, sem backend do Service |

O bundle bruto do REA fica fora do repositório, em `/tmp/service-ux-2026-10-20-evidence.json`. Os documentos guardam versões sanitizadas, sem valores usados para preencher senhas. As pessoas e igrejas das capturas autenticadas são fixtures locais. Não publicar a demonstração como se fossem resultados de igrejas clientes.

## Cobertura por tarefa

| Tarefa ou persona | Verificação realizada | Ainda não comprovado |
|---|---|---|
| Pastor antes de criar igreja | Entrada e escolha de cadastro vistas; Bootstrap e dependências lidos | Criar uma organização nova e concluir onboarding de ponta a ponta |
| Pastor em igreja sem programação | Login local, Início, assistente nas três fases mobile e desktop | Salvar fases, criar série, enviar convite e verificar aceite |
| Primeiro evento | Formulário, seletor de dia/mês, escolha de data e botão habilitado sem data observados | Inserção real, comportamento do banco e reaparecimento do evento entre contas |
| Gestão recorrente | Painel, menu, escalas, mural, times, visitantes, Kids, cursos, financeiro, secretaria e permissões inspecionados visualmente | Todas as ações internas de cada módulo; falhas de rede e concorrência |
| Líder de time | Login local e painel com escopo restrito | Publicar escala, resposta do voluntário e atualização da cobertura |
| Membro autenticado comum | Dois logins locais e entrada no primeiro acesso | Concluir dados obrigatórios e percorrer o restante com essas contas |
| Experiência do membro | Quatro abas, perfil, dados, destinos de tarefa/aviso, tema e extremos de texto na demonstração/fixture de liderança | Equivalência de todas as permissões com membro comum; todos os conteúdos e estados |
| Família e equipe Kids | Interface de gestão e cadeia de dependências no código | Entrega e retirada completas em aparelho, com duas contas e requisitos reais |
| Visitante e acolhimento | Gestão visual, QR/importação/convite e transferência no código | Acolhimento completo, vínculo e conta ativa com pessoa participante |
| Tesouraria e secretaria | Entradas, estados e contratos atuais; livro vazio após terminar o carregamento | Pagamento, lançamento, fechamento, impressão e conciliação completos |
| Propostas A e B | Mobile, atividade, texto, ações de confirmar/desfazer e igreja→evento→revisão→publicação simulada | Preferência e desempenho de pessoas reais; integração ao produto |
| Mapa e portal | Abertura visual, troca de jornada, filtros e ampliar/fechar imagem | Importação/exportação com arquivos externos e todos os recursos de anotação |

Nenhum ciclo com convite, mensagem, push, pagamento ou gravação de evento foi disparado. A análise das conexões identifica o contrato esperado e suas rupturas; não afirma que todos os ciclos foram executados.

## Verificações realizadas nos artefatos

O acervo final contém 59 cenários rotulados e 86 imagens: 21 cenários da demonstração, 26 da fixture autenticada e 12 dos artefatos/protótipos. Esses números incluem verificações de documentos e tentativas incompletas; não equivalem a 59 jornadas de produto concluídas. A galeria seleciona 50 capturas finais, deixando de fora transições e tentativas inadequadas como prova. O bundle bruto contém ainda quatro registros preliminares sem rótulo, não usados na galeria.

- JavaScript inline dos três HTMLs verificado sintaticamente com `node --check`.
- Referências locais de imagens, documentos e hashes verificadas por script.
- Portal observado em 390px e desktop; filtros de persona/ambiente e abertura/fechamento da imagem executados.
- Mapa observado em desktop e navegação para a jornada do evento executada. A tabela ampla tem rolagem própria por natureza de blueprint.
- Protótipos observados em viewport mobile e com texto ampliado; confirmação/desfazer e publicação simulada executadas.
- Verificador existente `npx tsx scripts/check-theme-contrast.ts` passou para as oito famílias de neutros. Isso não certifica todos os textos, bordas, focos e estados do app; ver QUALIDADE-E-INTERNACIONAL.md.
- Não houve build de uma implementação nova nem testes de regressão do app, pois nenhum código do produto foi alterado.

Tentativas de automação com seletor ambíguo ou nome incorreto de botão foram corrigidas e repetidas. Permanecem identificadas como incompletas no manifesto; não são defeitos do produto. Login parcial, tela capturada durante compilação e livro ainda carregando não aparecem como evidência final na galeria. A falha da instrumentação de métricas na cópia isolada decorreu de configuração administrativa ausente e não foi atribuída ao Service.

## Roteiros para testar com pessoas

Rodada qualitativa inicial sugerida: pastores que nunca usaram a ferramenta, gestores recorrentes, líderes com escopo e membros que não servem em times. Incluir baixa familiaridade digital e pessoas acima de 60 anos. Não instruir qual botão usar. Uma amostra pequena serve para encontrar dificuldades, sem estimar percentuais da população.

| Persona | Tarefa sem instruir a interface | Resultado que precisa explicar |
|---|---|---|
| Pastor novo | Prepare sua igreja para o próximo encontro e convide alguém para ajudar | Onde o encontro aparece, quem pode vê-lo e qual pessoa precisa agir |
| Membro novo | Você recebeu acesso. Descubra o que acontece nesta semana e como participar | Igreja correta, próximo encontro, local/horário e resposta registrada |
| Líder | Prepare a equipe do próximo encontro e acompanhe as respostas | Quem foi convidado, quem aceitou e o que continua sem cobertura |
| Voluntário | Confirme um convite e depois descubra como resolver uma impossibilidade | Diferença entre abrir conversa, pedir troca e efetivar substituição |
| Comunicação | Avise um público sobre uma mudança e verifique o que aconteceu | Publicado, enviado, aberto e respondido não são sinônimos |
| Acolhimento | Receba um visitante e entregue o acompanhamento à pessoa responsável | Responsável, próximo contato, vínculo e acesso são visíveis |
| Família e Kids | Prepare o cadastro, entregue e retire a criança | Estado atual e verificação de retirada compreensíveis para as duas pontas |
| Tesouraria | Registre e confira uma operação no período correto | Conta, valor, competência, recorrência e fechamento entendidos |
| Secretaria | Localize um registro e prepare a saída apropriada | Livro, filtro, dado oficial e diferença entre ficha e acesso ao app |

Medir por tarefa: primeira escolha, conclusão sem ajuda, pedidos de ajuda, erros com consequência, voltas desnecessárias e compreensão do resultado. Registrar duração como diagnóstico, sem impor um tempo arbitrário antes de estabelecer uma base. Perguntar: “O que aconteceu?” e “Quem precisa fazer alguma coisa agora?”. Comparar A e B com conteúdo equivalente e alternar a ordem de apresentação.

## Matriz técnica antes de aprovar implementação

1. **Primeiro uso:** 320, 390, 640 e desktop; igreja nova, preparada e sem programação; papel restrito; voltar, retomar e erro de envio. Cada fase mantém conteúdo e ação acessíveis. Nenhum sucesso antes do resultado real.
2. **Evento:** data ISO completa, ano, hora/dia inteiro, fuso da igreja, meia-noite e horário de verão; rascunho e publicação distintos. Criar em uma conta de teste, abrir como membro e responder; conferir a volta à gestão.
3. **Conexões:** testar convite enviado/aceito, escala publicada/respondida/trocada, mensagem aberta/respondida, visitante transferido/acolhido e inscrição/conclusão. Falha parcial preserva os sucessos e permite retomar sem duplicação.
4. **Texto e toque:** todas as sete posições de texto do produto, fonte do sistema, nomes longos e teclado aberto. Medir alvos depois da escala: 44px app e 32px painel conforme AGENTS, com o piso de 24px aplicado conforme seu contexto. Texto e ação não ficam inacessíveis.
5. **iPhone real:** Safari em aba e PWA; teclado de nome/e-mail/senha/número, rotação, voltar e fechar teclado. Registrar `visualViewport.scale`, altura visível e retângulos de campo/CTA antes, durante e depois. Preservar pinch zoom. O relato de zoom ainda está aberto.
6. **Contraste e estados:** claro/escuro, oito famílias de neutros e cores de destaque variadas; foco, erro, desabilitado, selecionado e carregamento. Verificar texto e controles reais, não apenas tokens isolados. Reproduzir o ponto branco com caminho, tema e captura específicos antes de decidir sua causa.
7. **Acessibilidade:** teclado e leitor de tela; rótulos e instruções associados; erros anunciados; foco ao abrir/fechar; retorno ao gatilho; alvo focado visível; modal sem fuga de foco. Não confundir snapshot de acessibilidade com teste completo de leitor de tela.
8. **Internacional:** países escolhidos, endereços com e sem código postal, +55/+351/+1, fusos brasileiros distintos e Lisboa, moeda e idioma independentes, nomes longos e pseudolocalização. Servidor valida o mesmo contrato. Dados existentes não são reinterpretados silenciosamente.
9. **Robustez:** offline, envio lento, repetição, falta de permissão, conteúdo removido, destinatário ausente e alteração concorrente. Diferenciar erro, sem dados, sem permissão e não configurado. Botões têm ação verificável e não há rolagem lateral involuntária.

A [WCAG 2.2 sobre tamanho mínimo de alvo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) descreve 24px com exceções; a regra do projeto é mais exigente nos casos indicados. O critério de [foco não obscurecido](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) é uma referência mínima; o produto deve também permitir compreender e concluir a tarefa com teclado aberto. A orientação cognitiva do W3C recomenda [controles com propósito compreensível](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o1-understandable/), relevante para a revisão do excesso de ações.

## Próximo trabalho executável

A primeira implementação deve limitar-se à onda 0 do relatório: tornar as três fases do assistente utilizáveis no celular, corrigir o contrato de data do evento e distinguir ausência de programação de sucesso operacional. Preservar permissões, temas, módulos e trabalho preexistente no financeiro/secretaria. Validar em banco de teste o ciclo pastor cria→membro encontra, com datas reais. Só depois integrar a direção visual escolhida e ampliar as jornadas.

Esta auditoria não altera AGENTS.md. Os oito adendos propostos no relatório são decisões de produto para revisão, sem vigência automática.
