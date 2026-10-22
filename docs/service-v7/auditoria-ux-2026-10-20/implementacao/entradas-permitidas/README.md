# Opção indisponível não aparece · 21/10/2026

Decisão explícita do usuário: áreas sem acesso não devem ter entrada visível. O fallback anterior de rota fica como defesa; a pessoa começa em uma área permitida. Evidência: resultados de entidades da busca não eram filtrados junto com os resultados de telas; card de aniversariantes verificava só módulo ligado; fichas abertas por Saúde/Cuidado não consultavam a disponibilidade da área Pessoas.

Correção: busca recebe apenas entidades de rotas disponíveis e respeita o escopo de times da lista Pessoas. Times indisponíveis também retiram funções da busca. Card de aniversariantes exige a própria rota disponível. Saúde/Cuidado/Aniversariantes mantêm informação de sua área, mas nomes viram texto quando não há acesso à ficha. Rota inicial antiga/negada escolhe uma área disponível para qualquer papel, sem mostrar a indisponível como opção. Nenhuma mudança no banco ou concessão de acesso.

Arquivos: ServiceExactApp, painel/telas/Inicio, modules/inicio/Saude e modules/cuidado/Cuidado e modules/aniversarios/Aniversariantes. AGENTS §13.3 e §13.6. A casca e os módulos permanecem. Risco: buscas deixam de mostrar resultados que antes levavam a área sem acesso. Validar resultados negados/permitidos, escopo dos times, retorno, pastor sem Início e membro com acesso extra.

Validação: matriz de fixtures por papel, módulo e escopo em validacao.json; busca negada em 320/390/1280 px nos temas reais claro/escuro, sem rolagem lateral. Saúde sem acesso à ficha mostra quatro nomes sem botões; Cuidado e aniversariantes mantêm nomes e removem botões de ficha. Nenhum envio executado. Fixtures temporárias da demo restauradas. Evidência de interface, não certificação de políticas do banco.

Typecheck, lint sem erros (dois avisos preexistentes), Lei 12, contraste, 13 contratos de jornada e build aprovados. Publicação acompanha os workflows Service e Produção, que aplica o banco antes do código.
