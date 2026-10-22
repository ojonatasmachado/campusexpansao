# Módulo `mapa` do Service: plano

Design aprovado: canvas "Mapa da Igreja" (13 telas), https://claude.ai/artifact/JmSBiRt5QfaFqP8i9EZPm6

Dois produtos no mesmo módulo:

- **Mapa da igreja** (painel, liderança): pessoas por CEP, presença x moradores (IBGE), áreas, mesa de trabalho, pontos, rota, emergência, linha do tempo.
- **Onde** (app do membro, aba Agenda): sede, congregações e células, sempre públicas, com endereço, horário, vagas e mensagem para o líder.

---

## 1. O que já existe e será reaproveitado

| Peça | Onde | Uso no mapa |
|---|---|---|
| Endereço e coordenada do membro | `service.members` (0039, 0083): `postal_code`, `street`, `neighborhood`, `city`, `latitude`, `longitude`, `geo_precision`, `municipality_ibge` | ponto da pessoa (precisão de CEP) |
| Coordenada da igreja e congregações | `service.churches` (0083), `is_headquarters` | sede e congregações |
| Busca de CEP com cache | `/api/service/cep-lookup` → `consultarCep()` (BrasilAPI v2) → `service.address_lookups` + trigger `trg_enriquecer_endereco` | geocodificação; coordenada nunca vem do cliente |
| Grupos | `service.fellowship_groups` (0005): nome, líder, dia, hora, bairro | células no mapa (faltam endereço e lotação) |
| Permissões | `core.role_permissions`, `service.person_grants` (0043), `service.can_read` (0050), `podeVerRota` | quem vê o mapa |
| Histórico | `service.timeline_events` + triggers (0059) | linha do tempo, fatos do módulo |
| Auditoria de escrita | `audit.activity_log` (0004) | alterações em áreas e pontos |
| Mensagem | `startChatWithMember` (painel), RPC `service.start_dm` (membro) | "Mensagem", "Mandar mensagem para o líder" |
| Vocabulário | `useTermos()`, `{Grupos}` | "células", "PG", "GC" conforme a igreja |
| Tema da igreja | `themeCss()`, variáveis | todo o chrome do módulo |

**O que não existe:** PostGIS, biblioteca de mapa, consentimento do membro para o mapa, endereço e lotação de grupo, registro de leitura sensível, escopo de acesso por área.

---

## 2. Decisões técnicas

### 2.1 PostGIS: ligar
O líder que vê só a sua área precisa de filtro **no servidor** (RLS e RPC), não na tela. Isso pede `ST_Contains`, `ST_Union` (juntar bairros) e contagem por polígono. Supabase oferece a extensão `postgis`. Sem ela, o recorte por área ficaria no cliente, que é vazamento.

### 2.2 Mapa no cliente
- `maplibre-gl` + estilo OpenFreeMap claro (`positron`), com um JSON de estilo nosso em `app/service/modules/mapa/estilo.json`: água e parques em tons quentes, sem azul, rótulos discretos.
- Cluster nativo do MapLibre (`cluster: true` na fonte GeoJSON) para pessoas.
- Desenho à mão: `terra-draw` (leve, sem dependência do Mapbox). "Juntar bairros" não precisa de biblioteca: é clique em polígono + `ST_Union` no servidor.
- Prédios 3D: camada `fill-extrusion` do próprio estilo.
- Um só componente `MapaBase` (compartilhado, regra de componentes únicos), usado no painel, na mesa, no celular e no "Onde".

### 2.3 Privacidade do ponto
- O servidor **nunca devolve endereço** na camada de pessoas. Devolve `id`, nome, status, grupo e coordenada **arredondada para ~100 m** (3 casas decimais). A coordenada original fica no banco, só para cálculo.
- **Por que pedir consentimento mesmo com CEP:** o ponto é aproximado (um CEP é um trecho de rua), mas continua ligado a um nome. Em alguns casos o CEP é de um único prédio ou condomínio, e aí aponta quase a casa. E ser membro de uma igreja revela convicção religiosa, que a LGPD trata como dado sensível (art. 5º, II), e o art. 11 não aceita "interesse legítimo" para dado sensível. Por isso o ponto individual pede uma escolha da pessoa. Validar com quem cuida da parte jurídica.
- **Como pedir, sem assustar** (honesto e curto, benefício primeiro, "não" fácil):
  - Tudo num momento só, junto do campo de CEP (cadastro, primeiro acesso e Perfil), sem segundo pedido depois:
    - Texto de apoio: "A igreja poderá usar seu CEP para ver em que regiões da cidade estão as pessoas que a conhecem. O CEP mostra só a rua ou o bairro, não a sua casa."
    - Sem caixa no campo. O consentimento vem no fim do cadastro, num só botão.
  - **Fim do cadastro:** tela curta com 3 itens em destaque (não escondidos no termo longo), e o termo completo num link:
    - "Seus dados ficam só com a [igreja]."
    - "A liderança pode ver seu nome e a região do seu CEP no mapa da igreja. Nunca o endereço."
    - "Você muda isso quando quiser no Perfil."
    - Botões: "Ler o termo completo" e "Concordo e continuar". O aceite grava `map_consent_at` e a versão do termo.
  - Os itens ficam visíveis na própria tela porque autorização genérica, só dentro de um termo longo, não vale para dado sensível (LGPD art. 8º §4 e art. 11). Validar o texto com o jurídico.
  - Membros que já têm cadastro: a mesma tela aparece uma vez, no próximo acesso.
  - Quem desligar no Perfil vira ponto sem nome (abaixo).
- **Sem consentimento, ponto sem nome:** a pessoa aparece no mapa da liderança como ponto anônimo (cor do status, sem nome, sem card), entra nos clusters e nos números. Nome e card só com consentimento. Onde houver menos de 3 pontos anônimos perto (cerca de 300 m), eles não aparecem soltos: só entram no número da região, para ninguém deduzir quem é.
- **Consentimento**: colunas novas `members.map_consent_at`, `map_consent_source`, `map_consent_revoked_at`. Pergunta simples no app, uma vez, com "Agora não" sem insistência, e opção de sair em Perfil. Sem consentimento a pessoa vira só ponto anônimo e entra nos **números agregados** por região; região com menos de 3 pessoas mostra "menos de 3".
- **Endereço só no modo emergência**, só para quem coordena, e cada abertura vai para `service.map_address_reveals` (quem, quando, qual família, qual emergência). Ao encerrar a emergência, a abertura fecha.
- Download de CSV também registrado (`service.map_exports`), sem endereço; telefone só de quem autorizou contato.

### 2.4 Geocodificação
- Hoje: BrasilAPI v2, precisão de CEP. Nem todo CEP volta com coordenada.
- **Fonte principal nova: CNEFE 2022 do IBGE.** É o cadastro de endereços do Censo, com CEP, latitude e longitude de cerca de 110 milhões de endereços, gratuito e oficial. No import do município, calculamos o **centro de cada CEP** (média das coordenadas dos endereços daquele CEP) e gravamos em `service.cep_centros(cep, municipio, lat, lng, enderecos)`. Resolve a maioria dos CEPs sem chamar API nenhuma.
- Ordem de busca: `cep_centros` (CNEFE) → BrasilAPI v2 (CEP criado depois de 2022) → sem coordenada, aparece na lista "localização a corrigir".
- Nominatim fica fora: a política do servidor público proíbe geocodificação em massa.
- Backfill: job que percorre membros com CEP e sem coordenada.
- Indicador no painel: "92% com localização válida" e lista de quem falta (CEP inválido ou não encontrado).

### 2.5 Dados do IBGE (Censo 2022)
Fonte: malha **definitiva** de setores censitários 2022 + "Agregados por setores censitários, resultados do universo" (população e domicílios por setor) + malha de bairros 2022.

- Importação **por município**, só quando uma igreja do município ativa o mapa. Não carregar o Brasil inteiro.
- Script `scripts/ibge/importar-municipio.ts <codigo_ibge>`: baixa a malha da UF, recorta o município, junta a população pelo código do setor, simplifica a geometria e grava.
- Tabelas: `service.ibge_setores(codigo, municipio, geom, moradores, domicilios, area_km2)` e `service.ibge_bairros(codigo, municipio, nome, geom, moradores, area_km2)`. Dados públicos, leitura liberada a quem tem o mapa.
- **Atenção:** nem todo município tem malha de bairros no IBGE. Sem ela, a visão por bairro usa as áreas desenhadas pela igreja ou cai para setores. A tela mostra isso em linguagem simples.
- Setores com poucos domicílios têm variáveis suprimidas pelo IBGE; a população segue disponível, então a conta "1 a cada X moradores" funciona.
- Atualização: só quando o IBGE publicar nova malha. Guardar `fonte` e `ano` em cada linha; rodapé "Fonte: IBGE · Censo Demográfico 2022".

### 2.6 Pontos de interesse do OpenStreetMap
- Overpass API **uma vez por mês por município ativo**, num job, nunca a cada abertura de tela. Resultado gravado em `service.map_osm_cache` (por município e categoria). A tela lê só do nosso banco.
- Categorias e tags: escolas e praças (`amenity=school`, `leisure=park|pitch`), saúde e assistência (`amenity=clinic|hospital|social_facility`, CRAS por nome), ônibus (`highway=bus_stop`), igrejas na região (`amenity=place_of_worship`, só liderança).
- Ocultar ponto do OSM = linha em `service.map_points` com `osm_id` e `oculto = true`. Ponto manual = linha com `origem = 'manual'`.

### 2.7 Rotas
- **OpenRouteService**, plano gratuito: 2.000 trajetos e 500 "melhor ordem" por dia, chave gratuita. Folga grande para o uso de igrejas (uma rota é montada poucas vezes por semana).
- O trajeto é calculado ao salvar a rota e guardado em `map_routes.trajeto`; abrir a rota de novo não chama a API.
- Se um dia passar do limite: o próprio ORS tem plano gratuito para organizações sem fins lucrativos (10.000 trajetos/dia) ou pode ser hospedado por nós.

### 2.8 Fundo do mapa
- **OpenFreeMap**: gratuito, sem chave e sem limite de uso, atualizado toda semana com o OpenStreetMap.
- Risco: é um projeto mantido por doações, sem garantia de disponibilidade. Plano B pronto: o mesmo mapa em arquivo PMTiles (Protomaps) só do Brasil, servido do nosso armazenamento. O `MapaBase` aceita trocar a fonte por configuração, sem mudar telas.

### 2.9 Por que estas fontes

| Para quê | Escolha | Gratuita? | Alternativas avaliadas |
|---|---|---|---|
| Fundo do mapa | OpenFreeMap | sim, sem limite | MapTiler e Stadia (limite mensal, chave), Protomaps (plano B) |
| CEP → coordenada | CNEFE 2022 + BrasilAPI v2 | sim | Google e Mapbox (pagos por consulta), Nominatim (proíbe massa) |
| Moradores por região | IBGE Censo 2022 | sim | não há outra fonte oficial |
| Pontos de interesse | OpenStreetMap via Overpass | sim | Google Places (pago) |
| Trajeto e melhor ordem | OpenRouteService | sim, com cota | OSRM público (proibido em produção), GraphHopper (cota menor) |

Nenhuma dessas recebe dado de membro. Tudo que sai do nosso servidor é coordenada de lugar público ou de parada de rota, nunca nome de pessoa.

---

## 2.10 Atualização dos dados

| Dado | Quando atualiza | Como |
|---|---|---|
| Coordenada do membro | quando o CEP muda; job noturno para quem está sem coordenada | trigger existente + job |
| Cache de CEP (`address_lookups`, `cep_centros`) | CEP do CNEFE não muda até o próximo censo; resposta da BrasilAPI vale 180 dias | campo `atualizado_em` |
| Setores, bairros e população (IBGE) | só quando o IBGE publica nova malha ou novo censo; checagem anual | script de import, grava `fonte` e `ano` |
| Centros de CEP (CNEFE) | junto com o IBGE do município | mesmo script |
| Pontos do OpenStreetMap | todo mês, por município ativo | job; ponto que sumiu do OSM fica marcado "não existe mais no mapa" para a liderança revisar; pontos ocultos e manuais nunca são apagados |
| Fundo do mapa | toda semana, pelo próprio OpenFreeMap | automático |
| Trajeto de rota | ao salvar ou editar a rota | ORS, resultado guardado |
| Igrejas e células | na hora, ao editar | trigger de endereço já existente |

Os jobs rodam no cron que o Service já usa (`app/api/service/cron/`), com registro de última execução e erro visível em Configurações.

---

## 3. Banco (migrações a partir de 0087)

| Migração | Conteúdo |
|---|---|
| 0087 `service_mapa_base` | `create extension postgis`; coluna `geom geography(Point)` gerada de lat/lng em `members` e `churches`; índices GiST; `members.map_consent_at`, `map_consent_source` |
| 0088 `service_grupos_local` | `fellowship_groups`: `postal_code`, `street`, `street_number`, `complement`, `latitude`, `longitude`, `geo_*`, `capacity`; reaproveita `trg_enriquecer_endereco` |
| 0089 `service_mapa_ibge` | `ibge_setores`, `ibge_bairros`, `cep_centros` + RLS de leitura |
| 0090 `service_mapa_areas_acesso` | `map_areas(id, org, nome, tipo, cor_token, responsavel_id, geom, bairros text[])`; `map_access(person_id, escopo 'cidade'\|'area', area_id, detalhe 'pessoas'\|'numeros', pode_mesa, pode_csv, pode_editar, liberado_por)`; função `service.map_scope(person)` |
| 0091 `service_mapa_rpc` | RPCs `security definer` (seção 4) |
| 0092 `service_mapa_pontos` | `map_points`, `map_osm_cache` |
| 0093 `service_mapa_rotas` | `map_routes(objetivo, paradas jsonb, ruas_da_area bool, quando, equipe uuid[])` |
| 0094 `service_mapa_emergencia` | `map_emergencies(geom, titulo, status, aberta_por, encerrada_em)`, `map_emergency_families(status, respondeu_em)`, `map_address_reveals`, `map_exports` |

Toda migração nova também entra em `docs/service-v7/producao.sql`.

`cor_token` guarda só um dos 8 acentos da paleta do mapa (`sand` … `olive`), nunca hex solto.

---

## 4. Permissões

### Quem vê o quê
| Papel | Mapa da igreja | Detalhe | Mesa e CSV | Editar áreas e pontos | Emergência |
|---|---|---|---|---|---|
| Pastor / gestão (papel com `service.mapa`) | cidade inteira | pessoas | sim | sim | coordena, vê endereço |
| Pessoa liberada (`map_access`) | cidade ou uma área | pessoas ou só números | conforme a liberação | conforme a liberação | não |
| Membro | não aparece no menu | | | | |
| Membro, aba "Onde" | igrejas e células, públicas | sem pessoas | | | |

- Sem áreas desenhadas, `escopo = 'area'` não é oferecido e a liberação vale para a cidade inteira.
- A tela "Liberar o mapa para alguém" grava em `map_access` e cria o `person_grant` `app.mapa`, para o item aparecer no menu pelo caminho que já existe (`podeVerRota`).

### Onde o recorte acontece
Nenhuma tela lê `members.latitude` direto. Tudo passa por RPCs que aplicam `map_scope()`, consentimento e arredondamento:

- `mapa_pessoas(bbox)`: pontos de quem consentiu, dentro do escopo, coordenada arredondada.
- `mapa_regioes(nivel 'bairro'|'setor'|'area')`: moradores, pessoas, "1 a cada X", grupos, classificação falta/forte/média, com mínimo de 3.
- `mapa_mesa(regioes[])`: totais + lista de pessoas (sem endereço).
- `mapa_csv(regioes[], partes[])`: gera o arquivo e grava em `map_exports`.
- `mapa_area_previa(bairros[] | geojson)`: números ao vivo enquanto a área é montada.
- `mapa_emergencia_familias(id)` e `mapa_revelar_endereco(emergencia, membro)`: este grava em `map_address_reveals` antes de devolver.
- `mapa_locais_publicos(org)`: igrejas e células com endereço, horário, líder e vagas (para o "Onde").

Testes de RLS e RPC entram em `check-local-rls` (líder fora da área não recebe ponto; membro não recebe nada; sem consentimento não vira ponto).

---

## 5. Telas e arquivos

```
app/service/modules/mapa/
  manifest.ts          id "mapa", permissao "mapa", painel.menu (Pessoas › Mapa da igreja),
                       membro.lugares ["agenda.igreja"], vocabulario ["grupo"], historico
  estilo.json          estilo OpenFreeMap ajustado
  MapaBase.tsx         wrapper MapLibre único (camadas por props)
  MapaIgreja.tsx       tela 1: visões prontas, Ferramentas, legenda simples, Comece por aqui
  PainelRegiao.tsx     bairro ou área selecionada
  CartaoPessoa.tsx     card da pessoa (painel e bottom sheet)
  Mesa.tsx             tela 2: regiões, totais, tabela, pessoas, CSV
  CriarArea.tsx        juntar bairros + desenhar à mão
  Pontos.tsx           camada e modal Adicionar ponto
  Rota.tsx             objetivo, paradas, melhor ordem, equipe
  Emergencia.tsx       área atingida, famílias, abrir endereço
  LinhaDoTempo.tsx     período e crescimento por bairro
  LiberarMapa.tsx      tela "Quem vê o mapa" (também aberta de Acessos por pessoa)
  linguagem.ts         "1 a cada X moradores", falta/forte/média (uma fonte só)
app/service/membro/Onde.tsx   aba Agenda › Onde, card da célula
scripts/ibge/importar-municipio.ts
```

Regras que valem em todas as telas: cor só por variável do tema; cor da igreja nunca dentro do mapa; `plural()`, `avisar()`, `termo("grupo")`; sem travessão; texto mínimo 12px no painel e 13px no app; alvos 32px no painel e 44px no app; `var(--safe-*)` no que é fixo na borda no celular.

**Cartões (§13):** dois cartões para `painel.inicio.pendencias`, ligados ao mapa: "3 bairros com muita gente e nenhuma célula" e "12 pessoas sem localização válida". Com `card_shown`, `card_acted`, `card_dismissed`.

**Histórico:** fatos `entrou_no_mapa` (consentiu) e `emergencia_contato` na linha do tempo da pessoa. Nada de ranking.

---

## 6. Etapas

Cada etapa sai pronta para uso e testada com a captura (`tools/captura-service/`).

| # | Etapa | Entrega | Depende de |
|---|---|---|---|
| 1 | **Fundação** | PostGIS, consentimento (pergunta no app do membro: "Aparecer no mapa da igreja?"), endereço e lotação nos grupos (editor de grupo ganha CEP), geocodificação de reserva e backfill, `MapaBase` com o estilo | nada |
| 2 | **Onde (membro)** | aba Agenda › Onde: igrejas e células perto de você, card da célula, mensagem ao líder, "Quero participar", "Como chegar" | 1 |
| 3 | **Mapa da igreja v1** | pessoas em clusters, igrejas, células, visão "Onde estão as pessoas" e "Células e cobertura", card da pessoa, busca, celular; acesso só cidade inteira; tela Liberar o mapa | 1 |
| 4 | **IBGE e presença** | importação por município, visão "Onde falta igreja", painel do bairro, legenda simples, "Comece por aqui", cartões no Início | 3 |
| 5 | **Áreas e escopo** | Criar área (juntar bairros e à mão), escopo por área na liberação, visão do líder com o resto apagado | 4 |
| 6 | **Mesa de trabalho** | uma, várias ou todas as regiões, tabelas, pessoas, CSV com registro | 4, 5 |
| 7 | **Pontos de interesse** | camadas OSM, Adicionar ponto, editar, ocultar, excluir | 3 |
| 8 | **Traçar rota** | objetivo, paradas, melhor ordem, ruas da área, enviar para a equipe | 6, 7 |
| 9 | **Emergência** | área atingida, famílias, status, abrir endereço com registro, encerrar com confirmação | 5 |
| 10 | **Linha do tempo** | período, crescimento por bairro | 4 |

Etapas 2 e 3 podem andar juntas depois da 1. A 7 também pode andar em paralelo com 4 a 6.

---

## 7. Decisões pendentes

1. **Consentimento dos membros que já existem.** Proposta: ninguém aparece como ponto até consentir; o app pergunta uma vez. Números agregados por região contam todo mundo (com mínimo de 3). Alternativa mais branda (aviso + opção de sair) só com aval jurídico, por ser dado sensível.
2. **Quem é "pastor / gestão"** na matriz de papéis atual: qual papel recebe `service.mapa` por padrão.
3. **Linha do tempo usa o endereço atual.** O Service não guarda histórico de mudança de endereço; quem mudou de bairro aparece onde mora hoje. Guardar o histórico a partir de agora é possível (uma tabela a mais na etapa 1).
4. **Precisão do ponto em ~100 m.** Suficiente para ver distribuição sem expor a casa.

---

## 8. Riscos

- **CEP sem coordenada**: mitigado pelo CNEFE e pelo indicador de "localização válida".
- **Cidade com CEP único** (municípios pequenos): todos os membros caem no mesmo ponto, o centro da cidade. O mapa mostra um aviso e a visão por pessoas perde sentido ali; os números da cidade continuam valendo.
- **Município sem malha de bairros no IBGE:** visão por setores ou por áreas da igreja.
- **Tamanho das geometrias:** simplificar no import; servir por município.
- **Limites de uso do OpenFreeMap, Overpass e OpenRouteService:** cache e jobs; nada disso roda a cada abertura de tela. Plano B do fundo do mapa em PMTiles.

---

## 9. O que foi construído (2026-10-21)

Todas as 10 etapas, num lote só. Nada commitado.

### Migrações (numeração final, diferente da tabela da seção 3)

| Migração | Conteúdo |
|---|---|
| 0087 `service_mapa_base` | PostGIS, ponto gerado (`geo`) em members e churches, consentimento, `cep_centros` (CNEFE), `cep_falhas`, trigger de endereço com o CNEFE, RPC `mapa_consentimento` |
| 0088 `service_grupos_local` | endereço, ponto e lotação das células; `mapa_reprocessar_ceps` |
| 0089 `service_mapa_onde` | `mapa_locais_publicos` (app do membro) |
| 0090 `service_mapa_lideranca` | `ibge_setores`, `ibge_bairros`, `map_areas`, `map_access`, `mapa_acesso`, `mapa_recorte`, `mapa_pessoas`, `mapa_totais`, `mapa_areas`, `mapa_salvar_area` |
| 0091 `service_mapa_regioes` | `mapa_regioes`, `mapa_cidade`, `mapa_area_previa`, `mapa_montar_bairros` |
| 0092 `service_mapa_ferramentas` | mesa (`mapa_mesa_pessoas`, `map_exports`), pontos (`map_points`, `map_osm_cache`, `mapa_pontos`), rotas (`map_routes`), emergência (`map_emergencies`, famílias, `map_address_reveals`), linha do tempo |

Pacote só do mapa para o SQL Editor: `docs/service-v7/mapa/producao-mapa.sql` (testado do zero num Postgres com PostGIS e rodado duas vezes sem erro). O `docs/service-v7/producao.sql` também foi regerado.

### Arquivos

- Módulo: `app/service/modules/mapa/` (manifest, MapaBase, MapaIgreja, Mesa, CriarArea, Pontos, Rota, Emergencia, LinhaDoTempo, LiberarMapa, dados, linguagem, geo, estilo, csv, rota-calculo).
- App do membro: `membro/Onde.tsx` (Agenda › Onde), `membro/AceiteMapa.tsx` (folha "Quase lá"), Perfil › Privacidade › Meu nome no mapa, aviso do CEP.
- Convite: os 3 pontos do termo e "Concordo e criar acesso"; a rota de aceite grava o consentimento.
- Células: editor com CEP, número, complemento e lugares (`modules/grupos/GrupoEditModal.tsx`); congregações passam a consultar o CEP.
- Servidor: `/api/service/mapa/rota` (OpenRouteService com reserva aproximada); cron: geocodificação de reserva e pontos do OpenStreetMap.
- Scripts: `scripts/ibge/importar-cep-centros.ts`, `scripts/ibge/importar-malha.ts`, `scripts/seed-local-mapa.ts`, `scripts/check-local-mapa.ts` (24 regras de permissão e privacidade, todas passando).
- CI: imagem do Postgres trocada por `postgis/postgis:16-3.4`.

### Decisões tomadas sem consulta

- **Quem vê por papel:** master e pastor (e o dono da conta). Líder só com a liberação em "Quem vê o mapa".
- **Coordenar emergência:** quem vê a cidade inteira e pode editar (master, pastor ou liberação equivalente).
- **Situação no mapa:** só "Membro" e "Novo na igreja", que é o que o cadastro tem. Visitantes não têm CEP no Service e "afastado" não existe como dado; ficaram de fora em vez de inventar.
- **Entrada na igreja (linha do tempo):** ano de "membro desde" ou data do cadastro.
- **Percorrer a área (rota):** contorno da área com paradas nos trechos, não cada rua.
- **Endereço do ponto de interesse manual:** clicar no mapa; o endereço digitado é só texto de apoio (não geocodifica).

### Para ligar em produção

1. Aplicar `docs/service-v7/mapa/producao-mapa.sql` no SQL Editor (precisa da extensão PostGIS, que o Supabase oferece).
2. Por município da igreja: baixar do IBGE o CNEFE 2022 e rodar `scripts/ibge/importar-cep-centros.ts`; baixar a malha de setores 2022 e os agregados e rodar `scripts/ibge/importar-malha.ts` (instruções no topo de cada script).
3. Opcional: `ORS_API_KEY` na Vercel (trajeto pelas ruas; sem ela a rota usa a conta aproximada).
4. Opcional: `NEXT_PUBLIC_MAPA_ESTILO` para trocar o fundo do mapa (plano B do OpenFreeMap).

### Não verificado

- Overpass (OpenStreetMap) ao vivo: os servidores públicos estavam lotados durante o teste; o job tenta um servidor reserva e repete na próxima rodada.
- Importação do IBGE com arquivos reais: o site do IBGE não abriu daqui; os scripts leem as colunas documentadas (CD_SETOR, v0001, CEP, LATITUDE, LONGITUDE) e avisam se faltar alguma.
- Celular de verdade (testado só no navegador em tamanho de celular).
- Cartões no Início do painel (§13) não foram feitos; os insights ficam no "Comece por aqui" do mapa.

### Revisão de segurança (2026-10-21) e o que mudou

- Região, prévia de área e linha do tempo: 1 ou 2 pessoas viram "menos de 3" e não saem números que permitam deduzir o total ("1 a cada", "vezes"). Prévia de área recusa área menor que 0,05 km² e respeita o recorte de quem desenha.
- Linha do tempo conta só quem está dentro do recorte.
- Áreas: só quem vê a cidade inteira e pode editar cria ou muda (um líder com área não aumenta o próprio recorte); responsável e liberações só da mesma igreja; apagar área apaga a liberação presa a ela.
- Rotas: só quem criou e quem vê a cidade inteira leem; equipe só da mesma igreja; na Visita a mensagem para a equipe não leva nomes.
- Emergência: área até 30 km²; abrir a lista de famílias e baixar o CSV também ficam registrados; a situação só muda para família da área.
- Consentimento: a liderança não consegue gravar nem apagar o aceite de ninguém pela ficha (trigger); só a pessoa (função) ou o servidor no convite. Termo novo (versão diferente) pergunta de novo.
- Rota no servidor: exige acesso ao mapa da igreja e tem limite por pessoa.
- CSV protegido contra fórmula no Excel; fila de geocodificação não trava em CEP inválido.
- O termo agora diz que a liderança também vê célula e ministérios (o que a mesa de trabalho mostra).
- `scripts/check-local-mapa.ts`: 32 regras, todas passando.
