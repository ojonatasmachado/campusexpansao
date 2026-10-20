# Jornadas que o Ponte tem e o Service não

Data: 2026-10-20. Complementa `COMPARATIVO_PONTE.md` (que compara por área). Aqui a unidade
é a **jornada**: quem faz, o que dispara e onde termina. Fontes: os 29 arquivos de
`ponte_rea_full/jornadas/` (Ponte capturado com conta vazia: telas e campos, não regras) e
o código do Service hoje (migrações até 0068).

Só funcionalidade. Nada de texto, marca ou visual do Ponte entra no Service.

---

## 1. Jornadas ausentes, por quem faz

### Tesoureiro (o maior buraco)

| Jornada | Passos no Ponte | Service hoje |
|---|---|---|
| Lançar entrada e despesa | valor, categoria, fundo, conta, forma de pagamento, fornecedor, vencimento | nada (sem tabela financeira) |
| Contar a oferta | valores por meio (espécie, Pix, cartão), quem contou e quem conferiu, vira lançamento | nada |
| Contas fixas e a pagar | cadastrar, aviso de vencimento, baixa | nada |
| Transferir entre contas | caixa para banco, banco para banco | nada |
| Campanha com meta | nome, meta, fundo, prazo, acompanhar | nada |
| Fechar o mês | período, gráficos, apresentação ou link para a diretoria | nada |
| Orçamento por ministério | por mês, semestre ou ano | nada |
| Importar extrato | .ofx, .csv ou .pdf, conferir, lançar | nada |

### Membro no celular

| Jornada | Passos no Ponte | Service hoje |
|---|---|---|
| **Contribuir (dízimo e oferta por Pix)** | abre Contribuir, vê e copia a chave Pix | só um lugar reservado no `MobileApp.tsx`; Pix existe apenas em evento (0058) |
| Ver pregações e salvar | lista por série, busca, link do YouTube/Spotify, "minha lista" | nada (sem tabela de pregações) |
| Ler o devocional do dia | abre o do dia | nada (se entrar, **sem** "dias seguidos": lei 10) |
| Seguir um plano de leitura | plano pronto ou próprio, um trecho por dia | Bíblia com marcação existe (`modules/biblia`), plano não |
| Mural de oração | pedido público/privado/anônimo, "orei", respondido com testemunho | pedido vira conversa; `prayer_requests` existe e não é usada |
| Convidar um amigo para a igreja | link, WhatsApp, QR em tela cheia | só compartilhar evento |
| "Quero fazer parte" | botão que vira pedido para a igreja acompanhar | trilha até virar membro existe, sem o pedido |
| Completar a ficha com percentual | o Início mostra o que falta | ficha tem pendências, sem percentual |

### Visitante e porta de entrada

| Jornada | Passos no Ponte | Service hoje |
|---|---|---|
| **Cadastrar-se sozinho por QR ou link** | QR no telão, formulário público, cai no funil | nada (o funil de 4 etapas existe, só a recepção cadastra) |
| **Entrar na igreja por link ou código único** | link ou QR da igreja, cria conta, gestor aprova (ou entra direto) | convite é sempre pessoa a pessoa; sem fila de aprovação |
| Escolher horário de atendimento pastoral | a igreja abre horários, o visitante escolhe | nada |
| Informar quem convidou e interesses | campos no cadastro | faltam os dois campos |

### Secretaria

| Jornada | Passos no Ponte | Service hoje |
|---|---|---|
| **Importar membros por planilha** | arquivo, colunas, conferir, importar | nada (`lib/csv.ts` só exporta) |
| Livros de registro | batismo, casamento, apresentação, rol de membros | batismo é fato gravado na linha do tempo, sem livro; casamento não existe |
| Documento a partir de modelo | cartas, declarações, transferência para uma pessoa | nada |
| Carteirinha de membro | busca e gera | nada |
| **Boletim da semana** | junta avisos, agenda e escala num texto para o WhatsApp | nada |
| Aviso com rascunho, agendamento e urgência | salvar sem publicar, publicar depois, marcar urgente, enviar para uma pessoa | Mural tem tipo, destaque, lembrete e leitura; faltam esses quatro |
| Ver aniversariantes | lista do mês e cartão no Início | o campo `birthday` existe, sem lista |
| Campos personalizados na ficha | criar campo ou usar modelo pronto | nada |
| Juntar cadastros duplicados | detectar e unir | nada |

### Líderes e gestão

| Jornada | Passos no Ponte | Service hoje |
|---|---|---|
| **Montar escala de um período inteiro** | ministério, dias da semana, pessoas por culto, 1 a 12 meses, prévia | `gerarAuto` preenche um culto por vez |
| Programação que se repete | semanal, quinzenal, mensal, com cor e público | só os cultos iniciais saem em série |
| Evento com ciclo de vida | rascunho, inscrições abertas/encerradas, em andamento, finalizado, cancelado; vários dias; capa | 0058 cobre presença e inscrição com valor; faltam status, vários dias e capa |
| Publicar o estudo da semana para os grupos | título, versículo, texto ou PDF, perguntas, grupos de destino | nada |
| Grupo completo | auxiliares, endereço fixo ou itinerante, capacidade, ativo | grupo tem só nome, líder, dia, hora e bairro |
| Discipulado 1 a 1 | designar discipulador, trilha, ver quem está sem | Caminhada e lista de cuidado cobrem parte; falta o par |
| Plano de aula do Kids | aula do dia com versículo, objetivo, atividade, professores | nada (só turmas e check-in) |
| Professor do curso | cadastro de professores, "quem dá" no curso | nada |
| Publicar pregação ou devocional | tipo, série, link, notas, agendar | nada |
| Convocar assembleia | modo, quórum, pauta, presença, ata | Reuniões tem pauta e ata; falta o resto |
| Mandato com prazo | cargo, duração, aviso antes de vencer | título ministerial sem prazo |
| Patrimônio | bem com código, local, responsável, estado, valor; importar | nada |
| Relatório do mês para imprimir | escolher o mês, abas, imprimir ou link | só 30/90 dias e CSV |
| Trilha de auditoria | quem fez o quê, com busca | o banco grava (`audit.activity_log`), sem tela |
| Assinar o plano do Service | fim do teste, escolher plano, pagar | tabelas em `billing`, sem tela |

---

## 2. Não fazer (fere o manifesto)

- Devocional ou leitura com **dias seguidos** e contagem de lidos (lei 10).
- Menu com 28 itens à vista (leis 1 e 2): tudo acima entra como módulo em lugar que já existe.

---

## 3. As 10 que mais pesam, em ordem

Critério: o quanto a falta aparece numa venda ou no uso semanal, e o tamanho do trabalho.

| # | Jornada | Por quê | Tamanho |
|---|---|---|---|
| 1 | Contribuir por Pix no app | é o que o membro mais faria toda semana; lugar já reservado | pequeno (chave Pix da igreja + tela) |
| 2 | Visitante se cadastra sozinho por QR | alimenta o funil que já existe sem a recepção | pequeno (formulário público + rota) |
| 3 | Entrada por link único da igreja, com aprovação | porta de entrada de gente nova; hoje é convite a convite | médio |
| 4 | Importar membros por planilha | primeira barreira para trocar de sistema | médio |
| 5 | Financeiro, fase 1: lançamentos, categorias, fundos, contas, contagem de oferta | o módulo que mais decide a compra | grande |
| 6 | Escala de um período inteiro | o líder hoje monta culto por culto | médio (reaproveita `gerarAuto`) |
| 7 | Boletim da semana para o WhatsApp | rotina semanal da secretaria; dados já existem | pequeno |
| 8 | Mural de oração | tabela já existe | pequeno |
| 9 | Aniversariantes | campo já existe | pequeno |
| 10 | Secretaria: livros de registro e carteirinha | dia a dia de igreja tradicional; batismo já é fato gravado | médio |

Depois: pregações e conteúdo com salvos, estudo da semana nos grupos, programação que se
repete, evento com ciclo de vida, plano de aula do Kids, atendimento pastoral com horários,
assembleia, patrimônio, relatório do mês, auditoria, tela de assinatura.

**Pacote rápido** (pequenos, pouco banco novo): itens 1, 2, 7, 8 e 9. Dá para fazer numa
rodada só, cada um como módulo pelo registro (lei 3).
