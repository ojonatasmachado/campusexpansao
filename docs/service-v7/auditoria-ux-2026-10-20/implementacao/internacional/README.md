# Convite, CEP e contato internacional

**Atualização posterior:** a jornada final pede apenas CEP como dado de endereço no convite brasileiro, sem campos manuais. Coordenadas, dados adicionais e CPF voluntário estão descritos em [Geolocalização e documento opcional](../geolocalizacao/README.md). As capturas abaixo incluem etapas intermediárias.

20/10/2026. Continuidade da implantação aprovada. Decisão explícita do usuário nesta etapa: **o CEP é obrigatório ao aceitar o convite no Brasil**, junto com e-mail e senha. A consulta de endereço é importante para a igreja compreender de onde vem a comunidade.

## Resultado

O convite brasileiro mantém e-mail, senha, confirmação e CEP. A API preenche rua, bairro, cidade e estado; o formulário mostra o resultado antes do aceite. A conclusão aguarda a consulta e exige cidade. Se a API não responder, a pessoa pode conferir ou preencher o endereço manualmente, mantendo o CEP obrigatório. Alterar o CEP descarta o endereço anterior e respostas atrasadas da consulta não substituem o novo valor.

“Outro país” oferece país, cidade e código postal quando houver. A busca brasileira não é aplicada nesse caminho. País passa a ser armazenado na ficha, junto com endereço e código postal. O aceite guarda o endereço informado como um conjunto, sem carregar estado ou bairro antigos de outro país. A exigência brasileira também existe no servidor, não apenas na tela.

Aniversário continua opcional. No perfil, os campos de endereço ficam reunidos em “Seu endereço”; o CEP brasileiro permanece obrigatório ao editar os dados, e a busca automática continua disponível. Fichas legadas sem país seguem a regra brasileira existente, sem conversão em massa. A ausência de região volta a aparecer como uma pendência de cadastro no Início. A região de uma ficha internacional é reconhecida pela cidade, sem exigir oito números brasileiros.

Telefone com `+` preserva o código de país. Convite, visitantes e aniversário usam a mesma conversão para WhatsApp. Formatos brasileiros legados continuam aceitos. Validação é estrutural: não confirma assinante nem conta no WhatsApp. O limite de 15 dígitos segue a [UIT, E.164 de fevereiro de 2026](https://www.itu.int/rec/dologin_pub.asp?id=T-REC-E.164-202602-I%21%21PDF-E&lang=e&type=items).

O banco também deformava números estrangeiros de 10 ou 11 dígitos; a migração `0081_service_contato_internacional.sql` corrige a função do trigger, permite códigos postais alfanuméricos e adiciona o país à ficha. Não reescreve telefones antigos, pois país perdido não pode ser inferido. A assinatura e a autorização `my_members()` da RPC de contato são preservadas. A migração foi aplicada apenas no Supabase local e precisa acompanhar o código em uma publicação futura autorizada.

## Verificações

- Testes de telefone: Brasil legado, EUA, Portugal, Itália com zero nacional, Reino Unido, limite e colisões entre país explícito e número nacional.
- Testes de região: CEP brasileiro obrigatório, legado brasileiro e cidade internacional sem código brasileiro.
- Integração local: ausência de CEP brasileiro retorna 400; senha errada libera nova tentativa; CEP, bairro, cidade e país persistem; papel existente de pastor não é substituído; segundo uso do convite é recusado; endereço de Portugal persiste sem mudar o código postal.
- Perfil local: código alfanumérico persistiu na RPC e na tela. Tentativa de alterar ficha de outra igreja foi recusada. Limite de 32 caracteres aplicado no banco.
- Consulta real de leitura: CEP 01001-000 retornou Praça da Sé, bairro Sé, São Paulo e SP, apresentados no formulário.
- Capturas locais em Chromium; erros de seletor e capturas de versões intermediárias permanecem identificados no manifesto. A primeira proposta de convite sem CEP foi substituída pela decisão acima e não representa a versão final.
- Recuperação do convite testada com rede indisponível, janela bloqueada e permissão recusada, sem enviar mensagem externa.

## Limites

Não completa tradução, fuso da igreja, moeda ou regras fiscais. Telefones estrangeiros antigos sem país explícito precisam de confirmação humana. Alteração do país pelo próprio membro depois do convite ainda não tem um controle específico. Chrome com preferência clara não prova tema claro quando há preferência escura salva. Teclado e zoom do Safari real permanecem pendentes de aparelho físico.

Dados de teste são locais. Nenhum commit, push ou deploy foi executado.

Consolidação: o build de produção com as decisões finais de CEP e CPF passou. Fixtures locais removidas. O resultado final da entrada está na etapa [Geolocalização](../geolocalizacao/index.html), que substitui os estados intermediários desta galeria.
