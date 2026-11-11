---
id: I2
titulo: Fazer ações do Início navegarem
tipo: codigo
status: feita
quem: codex
desde: 2026-11-11
branch: historia/I2-acoes-inicio-navegar
depende: []
tamanho: M
---

## Por quê
As linhas, indicadores e atalhos do Início precisam abrir a unidade que resolve o problema. Uma tela genérica obrigava a pessoa a procurar de novo o dado que iniciou a ação.

## Arquivos (trilho)
- `app/service/painel/telas/Inicio.tsx`
- `app/service/ServiceExactApp.tsx` (passa visitorNotes existente ao Início)
- `app/service/modules/cuidado/`
- `docs/service-v7/historias/I2-acoes-inicio-navegar.md`
- `docs/service-v7/historias/screenshots/I2-*.png`

## Pronto quando
- Ações do Início revisadas por papel, módulo e dependência.
- Área indisponível não oferece botão, atalho nem resultado de busca.
- Nenhuma permissão ampliada.

## Inventário de ações
O destino é aberto por clique, preservando os filtros e os itens já carregados pela casca. Não foi acrescentada consulta ao banco nem permissão.

| Ação do Início | Gestão (master) | Líder de time |
|---|---|---|
| Para resolver: culto com vaga, até os três primeiros | Abre o culto exato na gaveta Panorama. | Abre o culto exato na gaveta Panorama, limitado aos times de `scopeMinistryIds`. |
| Ver todos os cultos com falta | Abre a gaveta com todas as faltas calculadas; tocar uma linha abre o Panorama daquele culto. | Só aparece se houver mais de três faltas dentro dos times visíveis; mesmos destinos filtrados. |
| Visitante sem contato há 48h | Abre a ficha do visitante elegível na rota Visitantes. | Não aparece, como antes, pois o papel não vê Visitantes. |
| Visitante cadastrado pelo link | Abre a ficha do visitante que corresponde à fila de novos cadastros por link. | Não aparece. |
| Pedido de mudança da Caminhada | Abre a folha de pedidos já filtrada por `visibleJourneyRequests`; o escopo segue a permissão existente. | Só pedidos que já chegam em `visibleJourneyRequests` para a liderança; não amplia o acesso. A linha já abria essa folha. |
| Pedido de conta | Gestão vê a linha e abre a lista de Novos cadastros. | Não aparece. |
| Pessoa sem registro de cuidado | Abre gaveta na visão Pessoas sem registro; selecionar abre a ficha exata de membro/pessoa. | Não aparece, como antes. |
| Criança sem check-in | Abre gaveta diretamente na visão Crianças sem check-in; selecionar abre a ficha associada. | Não aparece, como antes. |
| Indicador Saúde: membros, servindo em times ou em grupos | Abre a gaveta com os itens que compõem aquele indicador; selecionar abre a ficha da pessoa/membro exata. | Indicadores de Saúde não são renderizados para líder. |
| Atalho de preparação | Abre Configurações. A lista Revisar preparação só é montada para gestão com acesso a configurar, Times, Cultos e Pessoas. | Não aparece sem permissão/configuração. |
| Busca do painel: tela | Só oferece telas presentes no menu autorizado; clique abre a tela dona. | Só telas do menu do líder; não exibe Visitantes, Configurações ou módulos sem acesso. |
| Busca: pessoa/membro/time/função | Resultado abre ficha da pessoa/membro ou gaveta do time correspondente; funções levam ao time que as contém. | Usa apenas resultados das rotas que o papel vê. Times/funções seguem a mesma lista visível na rota Times; selecionar resultado abre a gaveta daquele time. |

Avaliação de experiência e Pulso da escala abrem seus próprios formulários em modal. Não são atalhos de navegação para outra tela. O bloco Comece por aqui mantém as três rotas de configuração já existentes.

## Provas pela tela
Fotos de antes e depois do Início foram medidas na primeira dobra com `__medir(24)`. A captura depois da gestão usou dados temporários para exercitar filas que não existiam no seed; o aumento é consequência desses quatro itens de fixture e não uma mudança no desenho da tela.

| Captura | Evidência visual | Medida | MD5 |
|---|---|---:|---|
| [Gestão antes](screenshots/I2-antes-gestao.png) | Início com os dados do seed | 30 ações, 103 palavras | `d5c5c2f387b95fb192c08bf7632834a8` |
| [Líder antes](screenshots/I2-antes-lider.png) | Início de Lucas; menu sem Visitantes e Configurações | 21 ações, 73 palavras | `5f2011fe0125677f84c022735e8396b7` |
| [Gestão depois, fixtures](screenshots/I2-depois-inicio-gestao-com-fixture.png) | Quatro linhas temporárias acrescentadas para testar filas/destinos | 35 ações, 172 palavras, +5 ações e +69 palavras perante o seed, por causa dos itens de teste | `7a38726328ab6446d794647fd514a156` |
| [Líder depois, cultos filtrados](screenshots/I2-depois-lider-cultos-filtrados.png) | Gaveta mostra só Louvor, o time dentro do escopo do líder | 23 ações, 98 palavras | `1e6dfd6d9865b097b61ac058562a9953` |

Fotos dos destinos após o clique:

| Clique exercitado | Destino aberto | MD5 |
|---|---|---|
| Visitante sem contato | [Ficha do visitante 48h](screenshots/I2-depois-visitante-sem-contato.png) | `ae2958bffa05be4c48411d41cecd3b13` |
| Cadastro pelo link | [Ficha do visitante do link](screenshots/I2-depois-visitante-link.png) | `65a62b4263dbc152ae41fc64c24376f6` |
| Pessoas sem registro | [Gaveta de cuidado, adultos](screenshots/I2-depois-cuidado-adultos.png) | `9b12cd4a2f5ca6e359fc0b477c42ca30` |
| Crianças sem check-in | [Gaveta de cuidado, crianças](screenshots/I2-depois-cuidado-criancas.png) | `9e9f1b7661187908b1242b9ee7f3adb4` |
| Ver todas as faltas | [Gaveta com quatro cultos](screenshots/I2-depois-folha-cultos-com-falta.png) | `224a63a9f22961e0781512bbe977154e` |
| Escolher culto da gaveta | [Panorama do culto escolhido](screenshots/I2-depois-panorama-do-culto.png) | `4e68fc4c6657dda7160667e953cde0ca` |
| Indicador Saúde: membros | [Gaveta com membros do indicador](screenshots/I2-depois-saude-membros.png) | `dbb75f3162374d4eba193b27c0765abf` |
| Selecionar membro | [Ficha de Ana Brandão](screenshots/I2-depois-ficha-do-membro.png) | `b21e15d00e3329cfdbdb7ae88cffedf5` |
| Busca do líder: selecionar Louvor | [Gaveta do time Louvor](screenshots/I2-depois-busca-time-lider.png) | `c8481df696737c380c5cb48c0d939232` |

Na tela da gestão, a busca foi conferida no código e pelo clique nas entradas existentes: os resultados de pessoas/membros e times abrem o registro exato; funções abrem o time que as contém; as telas vêm de `telas` já filtradas pelo menu autorizado. No líder, a consulta de “Recepção” retorna o time que também aparece na rota Times, e “Louvor” abre a gaveta da equipe escolhida. A lista não revela rotas sem acesso e nenhuma permissão foi ampliada. No seed local não havia pedido de conta nem pedido da Caminhada para fotografar; os caminhos foram conferidos nas linhas da casca: conta só para gestão via Q15, Caminhada na folha Q16 usando a lista filtrada já fornecida.

As fixtures locais de visitantes, cuidado e cobertura foram removidas depois das fotos. Saída da limpeza: `visitors=0 events=0 eventAttendance=0 kidsAttendance=0 kidsSessions=0 children=0 kidsClasses=0`. Nenhuma senha foi alterada e o banco não foi resetado.

## Validação
- `npx tsc --noEmit -p .`: passou.
- `eslint` nos três arquivos de código tocados: passou sem erros.
- `scripts/check-service-componentes.ts`: passou.
- `scripts/check-theme-contrast.ts`: passou nas oito famílias e dois modos.
- `scripts/check-service-lei12.ts`: passou.
- `scripts/check-graficos-contraste.ts`: 0 falhas e 32 avisos esperados.
- Contratos Service: internacional, fuso, avisos-fuso, ativacao, civil-date, cnpj, demo-datas, endereco, geo-cpf, member-navigation, panel-access, semana, cobertura, chat-identidade, telefone e times-recebimento passaram.
- `npm --prefix tools/captura-service test`: 20/26 passaram; 6 testes Playwright falharam ao iniciar Chromium no sandbox (`MachPortRendezvousServer ... Permission denied (1100)`). As capturas manuais da história foram abertas e inspecionadas.
- `npx tsx scripts/historias.ts`: após remover o rascunho duplicado `I1-inicio-precisa-de-voce.md`, I1 desapareceu da lista; I2 permanece como a história deste branch.
- Servidor local encerrado; porta 3137 livre.

## Notas
O rascunho I1 duplicado foi removido. I2 fica fora do trilho de PENDENTES, que é atualizado no fechamento e não reserva arquivo.
