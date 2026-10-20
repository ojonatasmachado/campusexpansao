# Service: auditoria de UI, leitura e responsividade

## Atualização: base compartilhada corrigida

Após autorização, foram corrigidas as bases já usadas pelos módulos:

- `.m6-facts` quebra textos contínuos, incluindo e-mails, sem perder conteúdo fora do cartão.
- O grid do editor público permite encolher suas colunas; o link de acesso da equipe também se adapta. Os filhos foram conferidos, além da largura do container.
- Menu, voltar, avatar, segmentos, abas e ações compactas compartilhadas têm alvo mínimo de 44px no toque ou até 860px.
- As variáveis do tema da prévia agora ficam no canvas, preservando o contraste das legendas no tema do editor. Descrições de opções usam texto mais legível.
- O renderizador genérico `FField` fornece nomes acessíveis aos campos de texto, áreas, seletores e interruptores. Interruptores do editor da página também expõem nome e estado.
- As regras de reúso foram documentadas em `app/service/modules/README.md`.

Verificação: TypeScript, build de produção, Lei 12 estática e contraste dos temas passaram. A validação visual cobre editor e personalização em 320, 390, 768 e 1440px, nos modos claro e escuro; e-mails com texto máximo em 320, 390 e 768px; formulário genérico e controles de Escalas em 390px.

[Evidências após a correção](../../prints/ui-service-2026-10-20/depois-base/summary.json). Continuam pendentes a reorganização do Início e das Escalas, os demais controles específicos sem nomes acessíveis e o crédito com contraste baixo dentro da prévia pública. As observações abaixo descrevem a situação encontrada antes das correções.

Data: 20/10/2026. Código local, referência de commit `0dd4c58`. Análise feita com o repositório em uso simultâneo por outra sessão. Este documento substitui a revisão preliminar que havia ficado limitada ao código e às imagens antigas.

## Diagnóstico

A percepção de que o Service às vezes fica difícil de ler tem fundamento. Confirmei cortes de conteúdo no painel e no app do membro. Também há telas que cabem tecnicamente, mas exigem rolagem ou leitura demais para a pessoa encontrar a próxima ação.

A situação não é uniforme. O app do membro, nas cinco áreas principais, se adaptou bem ao aumento do texto e às larguras testadas. Os formulários recentes de tela inteira também têm uma base boa. A prioridade é corrigir os pontos específicos de quebra e simplificar a apresentação do painel, preservando essas partes que já funcionam.

O Ponte parece mais ajustado nas capturas de desktop porque contém a largura dos formulários, organiza as escolhas em blocos curtos e repete menos informações na entrada da tarefa. Isso é uma observação de composição. Não testei o Ponte ao vivo no celular, portanto não atribuo a ele uma superioridade de responsividade que as evidências não comprovam.

## O que foi acessado

Acessei o Service local pelo navegador, navegando pelos menus e botões. O navegador integrado falhou; a auditoria dinâmica foi feita em Chrome separado, controlado por Playwright, contra `http://localhost:3000/service/demo`.

| Cobertura | Observações |
| --- | ---: |
| 27 telas do painel em 320, 390, 768, 1024 e 1440px | 135 |
| 15 formulários/estados em 390, 768 e 1440px | 45 |
| Cinco áreas do membro, texto máximo, dois temas e folha do texto | 51 |
| Configurações, editor da página e dados normais no tema claro | 20 |
| Nove detalhes do membro e apresentação do app | 10 |
| Total, incluindo repetições focadas | 261 |

Foram salvos 207 PNGs, medidas de elementos, textos e resultados de acessibilidade nas verificações focadas. Usei dados longos do modo `?dados=pior` e uma rodada com os dados normais em modo claro. Painel com altura de 900px; membro, estados e verificações focadas com 844px.

As nove configurações foram abertas: Dados da igreja, Personalização, Contribuir, Congregações, Escala e presença, Turmas Kids, Entrada na igreja, Permissões e Acessos por pessoa.

No membro, abri também Meus dados, Minha família, Minha história, Nova mensagem, Mural, Oração, Contribuir, Bíblia e um curso. Não enviei mensagens nem submeti formulários de cadastro ou publicação.

## 1. Cortes confirmados que devem ser corrigidos primeiro

### Meus dados: o e-mail desaparece para a direita

**Prioridade alta. Reproduzido em 390px.**

Caminho: menu da conta → Abrir o app → Perfil → Meus dados, usando os dados longos do demo.

O texto do e-mail começa em `x=65px` e mede `744px`, terminando em `809px` numa tela de `390px`. A linha não quebra. A captura mostra o endereço atravessando a lateral do cartão e sendo cortado pela área do app.

Isso acontece num dado pessoal que a pessoa precisa conferir. Diferentemente de uma prévia de mensagem com reticências, não existe indicação de que a informação foi resumida.

Origem: `app/service/MobileApp.tsx:1860`; estilos de `.m6-facts` em `evolucoes/service_app/service-app.css:2858`. A linha flexível não limita nem quebra esse texto contínuo.

Encaminhamento: permitir que o texto ocupe a largura disponível e quebre endereços longos; manter ícone e alinhamento sem deixar o conteúdo aumentar a largura do cartão. Conferir também bairro/cidade longos e o tamanho máximo do texto.

[Evidência visual](../../prints/ui-service-2026-10-20/390-detalhe-app-meus-dados.png) · [medidas](../../prints/ui-service-2026-10-20/390-detalhe-app-meus-dados.json).

### Página da igreja: o editor não cabe em 320px

**Prioridade alta. Reproduzido em 320px.**

Caminho: painel → Página da igreja → Publicar.

Com 16px de margem de cada lado, a área disponível tem 288px. O bloco principal mantém 350px, começa em `x=16px` e termina em `366px`. As abas, a ajuda e o cartão avançam para fora da tela. O interruptor começa em `x=295px`, tem 46px e fica parcialmente cortado.

A largura total do documento continua em 320px. Portanto, uma verificação que só compare `scrollWidth` da página com a janela passa, mesmo com conteúdo perdido. A captura confirma o corte.

Origem a revisar: grid `.pge-layout`, seus filhos e conteúdo mínimo, em `evolucoes/service_app/service-app.css:669`, junto de `app/service/PublicPageEditor.tsx`. O grid mobile usa `1fr`; é necessário conferir o dimensionamento mínimo dos filhos e da prévia, em vez de ocultar a sobra.

Encaminhamento: restringir todos os blocos à largura disponível, permitir redução das colunas e quebra dos conteúdos; manter as opções e o interruptor totalmente acessíveis. Validar 320px com nomes longos e com dados normais.

[Evidência visual](../../prints/ui-service-2026-10-20/320-foco-pagina.png) · [medidas](../../prints/ui-service-2026-10-20/320-foco-pagina.json).

## 2. Telas que cabem, mas cansam ou atrasam a ação

### Início do painel: indicadores ocupam a entrada inteira

**Prioridade média-alta. Reproduzido em 390 × 844px.**

O bloco Saúde da igreja começa em `y=234px` e mede `1028px` de altura. As pendências vêm depois dele. A Lista de cuidado começa em `y=1542px`; Pendências da escala, em torno de `y=2709px`.

A pessoa entra para resolver uma situação, mas precisa atravessar uma sequência de números antes de ver o que exige atenção. Não é falha de largura: é hierarquia e volume. O app do membro já usa uma apresentação mais orientada à próxima ação.

Encaminhamento: resumir indicadores no celular e tornar as pendências mais rápidas de encontrar, respeitando as decisões do manifesto sobre a ordem dos blocos. Se a ordem permanecer, reduzir a altura inicial da Saúde com resumo e aprofundamento sob demanda. Essa decisão exige revisar a apresentação, não apenas reduzir a fonte.

[Primeira tela](../../prints/ui-service-2026-10-20/390-inicio.png) · [posições medidas](../../prints/ui-service-2026-10-20/inicio-hierarquia.json).

### Escalas: seis ações e três formas de identificar os mesmos times

**Prioridade média-alta. Reproduzido em 390px e 768px.**

Antes das vagas aparecem Montar período, Escala extra, Delegar, QR Check-in, Baixar e Publicar e avisar. Depois vêm os eventos, o modo de geração, o resumo e uma lista de cobertura. Os nomes dos times aparecem novamente nos cabeçalhos dos cartões, onde ficam truncados.

Em 390px, essa entrada ocupa grande parte da tela antes de a pessoa trabalhar nas vagas. Em 768px, a apresentação passa para colunas com mínimo de 250px; a terceira coluna fica parcialmente fora da área visível. Existe rolagem interna intencional: isso não é estouro do documento. Ainda assim, obriga a combinar rolagem vertical e horizontal e dificulta comparar times.

O empilhamento só entra abaixo de 768px (`max-width:767px`). Isso deixa a largura de tablet exatamente na versão mais apertada de colunas.

Encaminhamento: definir a ação principal de cada momento e agrupar as demais; reduzir repetição entre cobertura e cabeçalho; testar empilhamento ou seleção de time em larguras intermediárias; tornar qualquer continuação horizontal explícita. Não resolver diminuindo os nomes.

[390px](../../prints/ui-service-2026-10-20/390-escalas.png) · [768px](../../prints/ui-service-2026-10-20/768-escalas.png) · [formulário do período](../../prints/ui-service-2026-10-20/390-estado-montar-periodo.png).

### Visitantes: o funil vazio toma espaço no celular

**Prioridade média. Reproduzido em 390px.**

Com um visitante, as três etapas vazias continuam como cartões altos. A quarta etapa já fica abaixo da primeira tela. A pessoa precisa atravessar espaço vazio para compreender um volume muito pequeno de dados.

Encaminhamento: no celular, compactar etapas vazias, usar contadores ou oferecer Lista como apresentação inicial adequada ao volume. O funil pode continuar disponível para acompanhar movimentações.

[Evidência](../../prints/ui-service-2026-10-20/390-visitantes.png) · [alternativa Lista atual](../../prints/ui-service-2026-10-20/390-estado-visitantes-lista.png).

## 3. Leitura, contraste e toque

### Há falhas reais de contraste em Configurações

As verificações focadas com axe encontraram:

| Local | Contraste medido | Leitura |
| --- | ---: | --- |
| Personalização, legenda da prévia clara | 2,60:1 | Falha expressiva, texto de 12px |
| Personalização, descrições de opções selecionadas | 4,45:1 | Abaixo de 4,5:1, diferença pequena |
| Congregações, descrição da matriz | 4,45:1 | Mesma combinação de cores |
| Escala e presença, descrição da opção ativa | 4,45:1 | Mesma combinação de cores |
| Crédito na prévia da página pública | 3,28:1 | Texto de 11px dentro da prévia |

A legenda da prévia clara merece atenção especial: o texto escuro fica sobre uma superfície escura do editor. O último caso pertence à prévia da página pública, onde a identidade da igreja é livre; não é evidência de falha generalizada do chrome do Service.

As seis telas testadas com dados normais no modo claro não tiveram violações detectadas pelo axe. As áreas principais do membro em 390px, inclusive no tamanho máximo nos dois temas, também não tiveram violações detectadas nessa rodada. Isso não é certificação de acessibilidade completa.

[Personalização](../../prints/ui-service-2026-10-20/390-config-personalizacao.png) · [resultados medidos](../../prints/ui-service-2026-10-20/390-config-personalizacao.json).

### O painel tem controles compactos no uso pelo celular

Medidas observadas: menu 36 × 36px, voltar de formulário 36 × 36px, segmentos com 32px de altura e botões menores com 36px em alguns contextos. O botão principal dos formulários, por outro lado, tem 44px no rodapé.

Esses controles compactos não violam automaticamente o piso de 24px do painel definido no projeto. Ainda assim, estão abaixo da meta de conforto de 44px para toque e tornam a experiência menos uniforme. Vale revisar os componentes compartilhados quando o ponteiro é de toque.

Cuidado com os números brutos: o ponto de ajuda tem caixa visual de 16px, mas o CSS expande o alvo para 32px no painel e 44px no membro. Não o classifiquei como alvo efetivo de 16px.

### A leitura difícil não vem só de fonte pequena

As telas do painel usam muitos textos de apoio em 12/13px e várias camadas de cartões, bordas, contadores e rótulos. Mesmo quando o contraste passa, isso aumenta o esforço de varrer a tela. A prioridade deve ser retirar repetição, estabelecer uma hierarquia clara e dar espaço ao conteúdo principal. Aumentar todos os textos sem rever o volume apenas empurraria mais ações para baixo.

## 4. Acessibilidade funcional encontrada na mesma rodada

São problemas adicionais, separados dos cortes visuais:

- Dados da igreja: dez campos sem associação de nome acessível detectada.
- Novo membro: um campo sem nome acessível detectado.
- Nova trilha: um campo e dois seletores sem nomes acessíveis detectados.
- Interruptores sem nome acessível em Página da igreja e Escala e presença; um botão sem nome no formulário de time.
- Mural do membro: uma região rolável que o axe indica como não acessível por foco de teclado.

Os rótulos podem estar visíveis e ainda assim não estar associados ao controle para leitor de tela. Não se deve resolver isso adicionando mais texto visual ao formulário.

## 5. O que funcionou bem

- Nenhuma das 135 observações das telas principais aumentou a largura total do documento. Os cortes encontrados mostram por que também é preciso medir os filhos.
- As cinco áreas principais do membro se reorganizaram sem conteúdo ultrapassando a janela nas larguras testadas, tanto no texto padrão quanto na rodada ampliada. O e-mail em Meus dados é uma exceção confirmada em uma subtela.
- A escala máxima de texto manteve legibilidade e navegação no membro. Mostra menos conteúdo por tela, como esperado, sem exigir redução da fonte.
- Formulários recentes têm coluna única no celular, título claro, botão principal no rodapé e conteúdo rolável próprio. Novo membro, Nova publicação e Montar período já possuem uma estrutura consistente.
- Pessoas transforma os registros em apresentação adequada ao celular e preserva os nomes longos na amostra.
- Contribuir, Bíblia, curso, família e nova mensagem não apresentaram estouro geométrico nas verificações feitas em 390px.
- Não foram registradas exceções JavaScript de página na varredura geral do painel.

## 6. Comparação útil com o Ponte

A captura de Montar escala do Ponte apresenta uma sequência curta: ministério, início, dias, horário, pessoas e período. O conteúdo permanece numa largura de leitura contida no desktop. No Service, o formulário de período já se aproxima desse padrão, mas a tela que dá acesso a ele reúne muita operação ao mesmo tempo.

O aprendizado aplicável é conter a largura, reduzir escolhas simultâneas e mostrar a próxima ação com clareza. Isso pode ser feito com Inter, os temas da igreja e os componentes atuais do Service. As capturas não justificam copiar a marca, as cores, a fonte ou a estrutura de navegação do Ponte.

[Referência Ponte](../../ponte_rea_full/screenshots/14_escalas/escalas_montar.png).

## Ordem recomendada para correção

1. Corrigir o e-mail em Meus dados e o dimensionamento do editor em 320px. São perdas comprovadas de conteúdo.
2. Corrigir contraste e nomes acessíveis dos controles compartilhados. São falhas objetivas e pontuais.
3. Reduzir a altura inicial da Saúde no celular e reorganizar as ações de Escalas. São os maiores ganhos de compreensão na amostra.
4. Rever a apresentação das Escalas em tablet e do funil com poucos visitantes no celular.
5. Uniformizar alvos de toque e repetir a auditoria com teclado aberto e aparelho real.

## Limites e material entregue

A análise é do demo local do código atual, não da produção autenticada. O demo contém eventos antigos, áreas vazias e módulos que consultam dados adicionais. Financeiro, por exemplo, ficou sem dados carregados em parte da rodada; não considero validados seus saldos, listas cheias ou estados de erro. Kids não foi testado com famílias reais e volume representativo nesta rodada.

Não foram testados celular físico, teclado virtual real, instalação PWA, zoom de navegador a 200%, todas as cores possíveis, todos os papéis nem todas as jornadas de gravação. O teste de tamanho máximo do texto é a preferência do app, não equivale a zoom de navegador.

Três tentativas de abrir um botão genérico de novo registro na Secretaria não encontraram esse botão no livro exibido. Isso é uma limitação do roteiro, não um defeito do produto.

O axe detecta apenas parte dos problemas. Contagens brutas de overflow incluem carrosséis intencionais; contagens de texto cortado incluem reticências legítimas. As conclusões acima foram conferidas nas imagens e no código, não derivadas apenas dessas contagens.

[Índice das evidências e reprodução](../../prints/ui-service-2026-10-20/LEIA-ME.md). A pasta `prints/` é ignorada pelo Git nesta cópia: as evidências estão disponíveis localmente e precisam ser preservadas à parte se forem compartilhadas com outra máquina. A etapa original de auditoria não alterou o produto. As correções posteriores estão descritas no início deste documento; não houve commit nem push.
