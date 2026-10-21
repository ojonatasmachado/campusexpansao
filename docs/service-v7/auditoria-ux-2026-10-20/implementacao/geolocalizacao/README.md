# CEP automático, geolocalização e CPF opcional

20/10/2026. Esta etapa incorpora as decisões posteriores do usuário e substitui os trechos anteriores que ofereciam preenchimento manual de endereço no convite brasileiro.

## Jornada final

No convite brasileiro, a pessoa informa e-mail, senha, confirmação e **somente o CEP como dado de endereço**. Não pede rua, número, complemento, bairro, cidade ou estado. A consulta preenche esses dados quando a fonte os fornece, e a tela apresenta um resumo. Um link separado atende quem mora fora do Brasil, sem colocar outra pergunta obrigatória no caminho brasileiro. Não existe CPF no convite.

O servidor consulta a fonte ou reutiliza a consulta verificada da última hora. Não depende de endereço nem coordenadas enviados pelo navegador. Se a consulta falhar, libera o convite para uma nova tentativa e informa a falha. Não apresenta dados inexistentes como preenchidos. A edição brasileira do perfil também usa o CEP; os demais dados são apresentados como resultado da consulta.

CPF é voluntário e fica na edição posterior do perfil. Pode ficar vazio e pode ser removido. Valida formato e dígitos verificadores, sem afirmar validação de identidade na Receita. O documento fica em tabela separada, sem aparecer nas listas de membros ou de pessoas. As RPCs permitem somente consultar e alterar o documento da própria ficha; acesso direto pelo navegador à tabela foi negado no teste.

## Dados preservados

As consultas guardam a última resposta original do provedor, a representação normalizada, a chave consultada, a origem e o instante da consulta. A tabela de consultas é restrita ao servidor. Não inclui essa resposta original nos dados enviados ao app.

Membros e igrejas recebem latitude, longitude, origem, precisão, data da localização, bairro, rua/endereço, CEP, cidade, estado, país, código IBGE quando fornecido e um objeto normalizado de endereço. Número e complemento são preservados quando vêm da fonte, como no CNPJ; **não são inventados a partir do CEP**. A igreja também recebe os dados cadastrais do CNPJ, sem replicar o quadro de sócios na ficha; a resposta original permanece restrita na tabela de consultas.

O preenchimento é feito por trigger no salvamento do cadastro, a partir da consulta verificada. Abrange convite, RPC de perfil, configurações, assistente e inserção da igreja no bootstrap, sem exigir que cada formulário transporte coordenadas. Alterar CEP ou país não conserva coordenadas de outro endereço. Uma consulta posterior de CEP pode complementar a geolocalização que faltou na consulta de CNPJ.

A [documentação oficial da BrasilAPI](https://brasilapi.com.br/docs#tag/CEP-V2) informa que o CEP V2 retorna geolocalização e pode conter imprecisões. A localização obtida por esse caminho fica com precisão `postal_code`, apropriada para distribuição regional, sem afirmar o ponto exato da residência ou igreja. O [contrato oficial de CNPJ](https://github.com/BrasilAPI/BrasilAPI/blob/main/pages/docs/doc/cnpj.json) fornece os dados cadastrais e o endereço; a localização é complementada pela consulta do CEP quando necessário.

## Verificações realizadas

- TypeScript e testes puros de normalização de geolocalização e CPF passaram.
- Coordenadas: aceita zero legítimo, recusa pares incompletos, vazios, NaN e valores fora da faixa. Ausência de coordenadas fica nula.
- CEP real 01001-000: a API retornou bairro Sé, cidade São Paulo, UF SP, latitude e longitude. O salvamento local da ficha persistiu esses campos, origem, precisão e instante da consulta.
- Mudança para endereço de Portugal apagou coordenadas brasileiras antigas.
- Convite real no navegador: e-mail, senha, confirmação e CEP, sem preencher endereço manualmente, completou o acesso ao app.
- CPF: inserção e leitura da própria ficha, rejeição de dígitos inválidos, remoção voluntária, recusa de acesso a outra ficha e recusa de leitura direta da tabela.
- CPF preenchido pela tela foi reencontrado em um novo login. Dados usados são fixtures locais, sem consulta de CPF externo.
- CNPJ real: provedor ficou indisponível e a rota apresentou a falha, sem fabricar sucesso.
- CNPJ controlado: servidor temporário exclusivamente local substituiu somente a resposta externa do CNPJ. A rota autenticada e o banco reais persistiram bairro, número, complemento, IBGE, coordenadas, precisão e dados cadastrais na inserção de uma igreja. Este resultado não é apresentado como disponibilidade do provedor real.
- Consultas assíncronas descartam respostas antigas ao trocar o CEP/CNPJ ou sair do componente.

## Banco e publicação

Migrações `0083_service_endereco_geolocalizacao.sql` e `0084_service_documento_opcional.sql`, depois de 0081 e 0082. Aplicadas **somente no Supabase local**. Nenhum push, deploy ou alteração no banco remoto foi executado. A publicação precisa levar migrações e código juntos, pois as consultas dependem da tabela nova.

Cadastros antigos não foram geocodificados em massa. Ganham enriquecimento quando houver consulta e salvamento. Uma atualização retroativa em produção exigirá execução própria, com controle de falhas e de limites do provedor. Coordenadas ausentes não bloqueiam o endereço válido, mas permanecem explicitamente nulas.

Consolidação: `next build --webpack` passou em cópia temporária com Supabase exclusivamente local. A comparação confirmou que todos os arquivos TS, TSX e CSS do app coincidem com os da cópia compilada. ESLint sem erros, com dois avisos preexistentes de diretivas dispensáveis em ServiceExactApp. Lei 12 estática e diff passaram. Fixtures de contas, documentos, igreja, membros, times, convites, pedidos e conversa foram removidas; cache de CNPJ anterior ao teste controlado foi restaurado. A consulta pública real de CEP pode permanecer como cache técnico local.
