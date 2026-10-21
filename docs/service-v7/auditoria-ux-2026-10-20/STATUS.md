# Estado da implementação

Atualizado em 21/10/2026. O relatório original é a fotografia do diagnóstico; os documentos em `implementacao/` registram as mudanças e suas verificações. Não interpretar o relatório original como descrição integral da versão alterada.

| Achado | Estado atual | Evidência e continuação |
|---|---|---|
| F01 Assistente mobile | Corrigido e percorrido | Formulários em 320/390 px, `implementacao/ativacao/` |
| F02 Data de evento | Corrigido e gravado localmente | Data civil completa, ano, horário, edição e descoberta pelo membro |
| F03 Endereço no convite | Ajustado conforme decisão do usuário | CEP obrigatório no Brasil, sem pedir outros campos de endereço; caminho exterior separado, `implementacao/geolocalizacao/` |
| F04 Igreja sem programação | Corrigido e percorrido | Primeira ação prepara o primeiro encontro; não afirma escala coberta |
| F05 Ativação | Corrigido no fluxo principal | Evento primeiro, times opcionais, retomada, confirmação do resultado real, `implementacao/ativacao/` |
| F06 Hierarquia do início | Implementada | Primeira ação em destaque, demais com divisórias; revisão em texto maior ainda requer mais cenários |
| F07 App sem pendências | Implementado | Tudo em dia e encontros reais; sem conteúdo fabricado |
| F08 Destino de avisos | Implementado e percorrido | Publicação exata, link restaurável, lembrete com destino; resumo mantém a lista |
| F09 Registro de leitura | Implementado e verificado | Só publicações que aparecem na área visível geram visualização; sem equivaler a resposta |
| F10 Painel misturado | Melhorado parcialmente | Ativação recolhível, resumo semanal, indicadores factuais sem ranking; outras repetições mantêm revisão aberta |
| F11 Rotina e configuração | Melhorado parcialmente | Times com ajustes avançados recolhidos; Visitantes separa rotina de regras/indicadores/QR; Crianças sem ação duplicada de evento; Financeiro mantém revisão por relevância aberta |
| F12 Caminhada | Melhorada parcialmente | Curso ganhou saída para aulas; sem 0 de 0; preservada a organização prevista nos manifestos |
| F13 Times recebendo pedidos | Implementado e verificado localmente | Abertura explícita, líder e vínculo válidos, requisitos, pedido e aprovação separados, `implementacao/times/` |
| F14 Internacionalização | Parcial | Telefone, endereço exterior e CNPJ alfanumérico; fuso, idioma e moeda ainda não tornam o produto internacionalizado por inteiro |
| F15 Zoom ao digitar | Mitigação implementada | Piso de 16 px após escala; zoom do navegador preservado; falta teclado de Safari/PWA em aparelho real |
| F16 Acessibilidade | Parcial | Campos rotulados, pisos, temas e testes visuais; não há certificação de todos os módulos ou leitores de tela |
| F17 Superfícies e identidade | Parcial | Direção editorial aplicada ao início e compromissos; temas, Inter e marca preservados |
| F18 Ponto branco | Não reproduzido conclusivamente | Não foi atribuída causa sem evidência; exige reprodução do estado específico |
| F19 Conexão entre pessoas | Parcialmente verificada | Gestão publica evento, membro encontra; convite e pedido de time percorridos; confirmação, desfazer e recusa persistidos e vistos pelo líder; destinatário de troca validado, conversa completa de troca ainda requer cenário próprio |
| F20 Inferências sobre presença | Corrigidos os textos e indicadores identificados | Sem registro não é ausência comprovada; pausa e recusas são fatos, sem diagnóstico de pessoas |
| F21 Demonstração antiga | Corrigida | Datas relativas, histórico separado, local coerente com comunicado; continua sendo demonstração sintética |
| F22 Retorno e recarga | Implementado no app, com limites | Aba, subtela e alvo de aviso/tarefa; não persiste formulário, posição de leitura, conversa ou folha aberta |
| F23 Zero e ausência de dados | Corrigidos os casos identificados | Sem denominador mostra Sem dados; funil zero sem barra; erro financeiro sem saldo falso e zero legítimo verificado em conta de leitura; outras áreas exigem revisão contínua |
| F24 Direção e restrições | Proposta e aplicação documentadas | Duas propostas, mapa de jornadas, decisões e limites explícitos, sem substituir as regras do AGENTS.md |

## Regras adicionais decididas durante a execução

CEP é exigido ao aceitar convite no Brasil. Não pedir rua, número ou complemento à pessoa nesse fluxo. Latitude, longitude, bairro, cidade, estado, país, IBGE e demais dados disponíveis são preservados da consulta verificada. Coordenadas de CEP são aproximadas e podem estar ausentes. CPF é opcional em edição posterior do próprio perfil, em armazenamento separado, e pode ser removido.

## Publicação

A entrega principal foi publicada em 21/10/2026, commit 14be743, após autorização do usuário. Migrações 0081 a 0085 confirmadas no banco remoto; deploy de produção READY e CI aprovado. O registro está em PUBLICACAO.md. As fixtures temporárias das etapas de convite, times, geolocalização e CPF foram removidas, com restauração dos dados anteriores usados nos testes.

## Ordem de continuação

1. Navegação com conta autenticada local verificada: destino direto do membro e retorno à gestão após recarga. Seguir ampliando as combinações de papel e módulos.
2. Percorrer a cadeia de escala: líder prepara, pessoa confirma ou recusa, gestão vê a mudança, troca chega ao destinatário correto.
3. Ampliar a revisão visual dos módulos e dos estados vazios, com fonte mínima/máxima, claro/escuro e teclado.
4. Tratar fuso e calendário como decisão da igreja, incluindo UI, rotas e banco; não presumir que mudar um formatador resolve o produto inteiro.
5. Validar com pessoas representativas e aparelho real os problemas de compreensão, zoom e o ponto branco que a automação não comprovou.
