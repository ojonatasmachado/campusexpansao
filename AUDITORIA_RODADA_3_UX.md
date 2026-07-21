# Auditoria · Rodada 3 (varredura de UX ao vivo, jornada por jornada)

> Diferente das rodadas 1 e 2 (que compararam código de produção contra o protótipo
> estático), esta rodada testou o **Service rodando de verdade contra o Supabase real**,
> logado como líder (desktop) e como voluntário (mobile), clicando em cada tela do menu
> e em cada botão de criação. Foi criada uma igreja de teste ("Igreja Teste CE.X") e
> populados dados reais (ministério, sala, culto, voluntário, visitante) só onde a UI
> permitiu — em dois pontos centrais ela não permitiu, e isso é o achado mais grave
> desta rodada.
>
> Cada item foi analisado com duas lentes, como pedido: uma de **Design** (hierarquia,
> consistência visual, previsibilidade da interface) e uma de **UX/Experiência do
> Usuário** (o que a pessoa consegue de fato realizar, e o que a confunde no caminho).
> Todo achado tem ponteiro exato de arquivo:linha e foi confirmado ao vivo (print,
> texto renderizado ou consulta direta ao banco) — nada aqui é suposição de leitura de
> código isolada.

---

## 🔴 Críticos (ação central do produto não funciona)

### 1. Criar um Time/Ministério é 100% quebrado
`ServiceExactApp.tsx:10180-10188` grava em `service.ministries`:
```js
{ organization_id, church_id, name, icon, description, positions: [], people: [] }
```
A tabela real (`0005_service_foundation.sql:149-159`, confirmado contra o schema live do
Supabase) tem só `id, organization_id, church_id, name, icon, description, profile,
created_at, updated_at`. **Não existem colunas `positions` nem `people`** — elas vivem em
tabelas próprias (`ministry_positions`, `person_ministries`). Toda tentativa de "+ Novo
time" falha com o erro real do Postgres exposto na tela:
> "Could not find the 'people' column of 'ministries' in the schema cache"

- **Design:** o modal em si (nome, ícone, descrição) está bem desenhado — o problema é
  100% de integração, invisível no desenho da tela.
- **UX:** o erro aparece em vermelho dentro do próprio modal, mas em linguagem de
  banco de dados que ninguém fora de quem programou entende. Isso é pior que uma tela
  em branco: parece que o site quebrou, não que "falta preencher algo".
- **Prova:** testado ao vivo, reproduzido também via inserção direta no banco com os
  mesmos campos do código (mesmo erro). Corrigido manualmente inserindo com os nomes
  certos pra poder continuar a varredura das telas seguintes.

### 2. Criar um Culto/Evento é 100% quebrado
`ServiceExactApp.tsx:10164-10177` grava em `service.events`:
```js
{ organization_id, church_id, title, kind, event_date, time, location, room_id, recurrence, ministry_ids: [], roster: [], cronogram: [] }
```
O schema real (`0006_service_operations.sql:10-25` + `0019_service_rooms_required.sql`)
tem `name` (não `title` — e é **obrigatório**, nunca enviado), `ministries` (não
`ministry_ids`), e não tem `recorrencia`, `roster` nem `cronogram` (cronograma é a
tabela `event_schedule_items`; escala é `roster_assignments`). Erro real, visto ao vivo
na tela ao clicar "Criar na agenda":
> "Could not find the 'cronogram' column of 'events' in the schema cache"

Esta é possivelmente a ação mais importante do produto inteiro — é o item "Primeiro
culto" do próprio checklist de configuração inicial do Painel — e nunca funcionou.
- **Bônus do mesmo bug:** mesmo corrigindo os nomes, o insert de evento nunca cria uma
  linha em `service.reservations` pra reservar a sala (ao contrário de Reuniões, que faz
  isso certinho em `ServiceExactApp.tsx:3481-3492`). Ou seja, mesmo consertado, dois
  cultos no mesmo horário na mesma sala não vão se avisar.
- **Design:** o formulário (Nome, Tipo, Local, Data, Horário, Recorrência) é limpo e
  segue o mesmo padrão visual de Reuniões/Ensaios — de novo, o problema não é visual.
- **UX:** um líder que acabou de criar a conta, seguindo o checklist do próprio app
  ("Falta pouco pra sua igreja estar pronta"), vai bater nesse erro na primeira ação
  real que tentar fazer. É o pior lugar possível pra um erro técnico aparecer.

### 3. Voluntário criado via "Enviar acesso" nunca virava membro de verdade da igreja
Já diagnosticado e corrigido nesta mesma sessão (migração `0041`): o `service_role`
não tinha permissão de escrita em `core.memberships`, então todo voluntário criado
pela liderança ficava com login funcionando mas **sem vínculo real com a igreja** —
ao entrar, caía direto em "Crie a igreja matriz" (tela de criar uma igreja nova do
zero) em vez do app dele. Registrado aqui só pra constar como causa raiz confirmada
do "abre o menu da igreja toda" relatado antes desta varredura — já aplicado em
produção.

---

## 🟠 Graves (funciona, mas mostra dado errado ou trava sem explicar)

### 4. "Primeiro contato não informado" vira frase quebrada em 3 telas
`app/service/page.tsx:829`:
```js
firstContact: row.first_contact || "Primeiro contato não informado",
```
Isso usa uma **frase inteira** como valor de fallback, em vez de string vazia. Três
telas diferentes concatenam esse valor como se fosse sempre uma data:
- `MobileApp.tsx:1825` → Perfil do voluntário: **"Voluntario · desde Primeiro contato não informado"**
- `ServiceExactApp.tsx:2337` → coluna "Membro desde" da lista de Membros
- `ServiceExactApp.tsx:9152` → drawer de detalhe: **"na casa desde Primeiro contato não informado"**

Confirmado ao vivo nas três telas (a igreja de teste tem um membro sem essa data
preenchida — o que é o caso comum, já que o formulário "+ Novo membro" nem tem esse
campo). Como a "frase de erro" agora é sempre verdadeira (truthy), os `?:` que deviam
esconder a data quando ela não existe nunca disparam.
- **Design:** quebra a hierarquia da tela — um metadado pequeno e discreto vira uma
  frase longa e chamativa, capturando atenção que devia estar no nome/foto da pessoa.
- **UX:** lê como bug de programação ("esqueceram de tratar nulo"), e aparece bem cedo
  na jornada de qualquer líder (a primeira tela de Membros que ele abre).

### 5. Campo obrigatório no onboarding do voluntário sem nenhum aviso
`MobileApp.tsx:2054`, etapa "Seus dados" do primeiro acesso: `valid: !!d.nasc` — o
campo **Aniversário** é obrigatório pra avançar, mas o rótulo não tem asterisco (o
resto do app usa esse padrão — veja qualquer modal de "+ Novo X" no desktop) e não
existe nenhuma mensagem de erro quando falta. Um voluntário real preenchendo o
primeiro acesso no celular, sem saber por quê, ficaria sem entender por que o botão
"Continuar" não sai do lugar.
- **UX:** erro silencioso é o pior tipo de erro — a pessoa não sabe se é ela, se é o
  app, ou se precisa esperar.

### 6. "Vagas em aberto" rotula errado quem só não tem disponibilidade preenchida
`ServiceExactApp.tsx:2429`:
```js
const fit = motivo ? "block" : (p.availability[event.slot] ? "good" : "busy");
```
Um voluntário sem nenhuma disponibilidade configurada (`availability: {}`, o padrão
pra quem acabou de ser cadastrado) cai automaticamente em `"busy"` → selo **"○
ocupado"** no seletor de Escalar. Testado ao vivo: um voluntário recém-criado, sem
nenhuma outra escala, apareceu como "ocupado" — mesmo a legenda do próprio modal
dizendo "Verde: disponível. Quem já está em outro time aparece travado" (ele não
está em outro time nenhum).
- **UX:** confunde "sem disponibilidade informada" com "já ocupado" — são estados
  bem diferentes pra quem está montando a escala.

### 7. Coluna "Voluntário" na matriz de Permissões nunca faz nada
`ServiceExactApp.tsx:773` (`podeVerNav`):
```js
if (currentRole === "vol") return false; // roda ANTES de checar a matriz
```
Configurações → Permissões mostra 4 colunas com toggles clicáveis (Master, Pastor,
Líder, Voluntário) — visualmente idênticas. Mas pro papel "vol", o código já decide
"sem acesso" antes mesmo de olhar pra matriz salva. Ou seja, **a coluna Voluntário é
decorativa**: dá pra clicar, salvar, e nada muda.

Curiosamente existe um mecanismo paralelo que **funciona de verdade** — "Acessos por
pessoa" (mesma tela, aba ao lado), que libera telas extras pessoa a pessoa e é checado
*antes* do bloqueio de "vol" (`extraAccess.includes(itemId)` roda primeiro). Ter dois
sistemas de permissão lado a lado — um funcional, um decorativo, sem nenhuma explicação
de qual vale — é exatamente o tipo de "jornada duplicada" citado.

### 8. Seção "01" nunca aparece em Identidade & propósito
`ServiceExactApp.tsx:8067-8113`: a seção de Missão/Propósito/Visão só renderiza
quando já tem dado preenchido, e não é numerada. "Valores" já nasce com o rótulo
"02" e "Tema do ciclo" com "03" (`8093`, `8111`). Numa igreja nova (o estado em que
o próprio checklist do Painel incentiva o líder a estar), a tela salta direto pra
"02 Valores" sem nunca mostrar um "01" — parece conteúdo faltando, não uma seção
condicional.

---

## 🟡 Moderados (confuso, mas não impede o uso)

### 9. Membros × Voluntários × Times: três fontes que se sobrepõem sem deixar isso claro
"Voluntários" promete "Quem serve, em quais times e funções" no subtítulo, mas na
prática lista **toda** a tabela `service.people` — testado ao vivo, o dono da igreja
(sem servir em nenhum time, "sem tags") aparece na lista como se servisse. Membros e
Voluntários compartilham pessoas em comum (a mesma pessoa pode estar nas duas), mas
não há nenhum link cruzado visível entre as duas telas explicando a diferença — só o
texto de ajuda ("?") no cabeçalho, que exige o usuário clicar pra descobrir.

### 10. Onboarding do voluntário sempre pede dados que o líder já cadastrou
Bairro pré-preenche corretamente quando o líder já informou (`member?.neighborhood`,
`MobileApp.tsx:2010`), mas telefone e data de nascimento não têm o mesmo tratamento —
o voluntário acaba redigitando dados que, em muitos casos, já estavam no cadastro
feito pela liderança.

---

## Não são bugs (checado e descartado nesta rodada)

- **"Montar escala →" no Painel parecendo não navegar**: o código
  (`ServiceExactApp.tsx:2048`) chama `setRoute("escalas")` corretamente — o clique
  que pareceu não funcionar foi falha da ferramenta de automação usada nesta
  varredura, não do produto. Confirmado lendo o código; não incluído como achado.
- **Onboarding "travado" no passo 2 mesmo com data preenchida**: mesma causa —
  clique de automação não registrou; via clique direto (JS) o passo avançou
  normalmente. O achado real que sobrou dessa investigação é o nº 5 (falta de aviso
  de campo obrigatório), que é comportamento do próprio app, não da ferramenta.
- **Rótulo "Pastor Master" na matriz de Permissões**: não é erro de texto duplicado —
  é o nome intencional do papel mais alto (`ServiceExactApp.tsx:6216`), equivalente a
  "pastor titular/sênior".
- **"Templo principal" com 0 reservas**: consistente com os dados de teste (a sala
  foi criada e o culto ligado a ela por script direto no banco, sem passar pela
  reserva) — não é um bug observado no produto, é reflexo de como o dado de teste foi
  semeado.

---

## Metodologia desta rodada

Login real como líder (`master`) numa igreja de teste criada no Supabase de produção,
e como voluntário (`vol`) com onboarding completo. Todas as 19 telas do menu do
desktop (Painel, Membros, Voluntários, Times & Ministérios, Visitantes, Crianças,
Batismos, Cursos & Trilhas, Escalas, Reuniões, Ensaios, Quadros, Cultos & Agenda,
Comunicação, Conversas, Relatórios, Configurações com as 12 sub-abas, Identidade,
Nossa história) e as 6 abas do app do voluntário (Início, Escala, Tarefas, Chat,
Cursos, Perfil) + onboarding completo. Cada ação de "+ Novo/Criar" foi testada; onde
falhou, o erro real do Postgres foi confirmado reproduzindo a mesma chamada direto no
banco, e o schema real foi conferido via `supabase gen types` (fonte de verdade —
não as migrations lidas isoladamente, que já divergiam entre si por causa de ALTER
TABLEs posteriores).
