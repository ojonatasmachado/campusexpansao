---
id: Q1
titulo: Recriar captura automática das leis 12 e 13
tipo: codigo
status: feita
quem: codex
desde: 2026-10-22
branch: historia/Q1-captura-automatica
depende: []
tamanho: G
---

## Por quê
A captura automática da lei 12 não existe em main. Ela está em stashes locais. A parte de densidade (lei 13) não roda em CI, e só existe a checagem estática scripts/check-service-lei12.ts.
Fonte: MANIFESTO.md lei 12 e seção 8; PROGRESSO.md "Para a captura final" e "Captura por etapa"; PLANO_TELA_FORMULARIO.md seção 8 e 9; DEPLOY.md seção 2.

## Arquivos (trilho)
- `tools/captura-service/`
- `scripts/check-service-lei12.ts`
- `scripts/medir-densidade.js`
- `scripts/seed-local-volume.ts`
- `docs/service-v7/PROGRESSO.md`
- `.github/workflows/service.yml`

## Pronto quando
- Um comando roda as jornadas do CAPTURA.md e falha nas regras da lei 12 e 13: alvo abaixo de 24px, contraste, rolagem lateral, erro de console, botão sem ação e densidade.
- Saída salva em prints/.
- Tabela "Captura por etapa" do PROGRESSO.md preenchida.
- Jornadas M1 a M11 e L1 a L10 da seção 8 do manifesto capturadas.

## Notas
2026-10-23, Codex. Captura recuperada seletivamente do stash, preservando-o. Sem sessões, credenciais ou snapshots no Git; sem reset/restauração destrutiva nem estado React forçado. Um comando (`npx tsx tools/captura-service/isolado.ts`) cria banco, app e sessões próprios, aplica migrações e fixtures, captura e descarta seu ambiente. Também aceita lotes por grupo, aparelho e jornada.

Critérios das leis 12/13 com testes de DOM real no CI: alvo, texto, contraste, rolagem, console/rede, efeito observável de ação, densidade, sobreposição e regressão contra referência explícita. Auditoria ausente e jornada ausente/incompleta reprovam. 26 testes passaram, typecheck e lint sem avisos; CI da revisão 7cfdb2f passou (run 40023676908). Referências antigas de componentes são resolvidas para o código atual sem inventar caminho.

Evidência autenticada em `prints/q1-verificacao-completa/`: 530 entradas no manifesto; todas M1 a M11 e L1 a L10 tentadas, 29 de 33 partes completas (todas as L em celular e desktop). M3, M4, M5 e M11 interrompidas, com erro, texto e screenshot registrados. A primeira execução consolidada (`prints/q1-consolidada/`) completou também M4. A galeria final do membro foi concluída separadamente em `prints/q1-galeria-membro/`, com 52 entradas e zero erros de grupo. A execução ampla atingiu o limite antigo de uma hora: seus erros após fechar o navegador não são falhas do produto. Limite corrigido para uma hora por grupo, aguardando encerrar o processo antes de descartar o ambiente. Recapturas dos estados afetados em `prints/q1-recaptura-estados/` e `prints/q1-permissoes-final/`. As duas abas de papéis passaram sem bloqueio. A recaptura `prints/q1-curso-final/`, sobre main ea73a3b, abriu o curso via Ver mais nos dois tamanhos: celular aprovado, desktop reprovado por molduras aninhadas.

As capturas reprovam diante das violações encontradas; não constituem aprovação da interface. A tabela Captura por etapa de PROGRESSO.md registra resultados e limites. Nenhum arquivo de tela foi alterado. Os bloqueios de retorno/perda de estado devem ser tratados na frente de telas (M3 e jornadas relacionadas), com o Claude. Q3 verifica papéis/isolamento; Q4 cobre serviços reais. Não foram comprovados aparelho físico, leitor de tela, entrega real de push, envio externo de mensagem nem famílias reais. Os bancos descartáveis foram removidos ao terminar. Artefatos são locais e ignorados pelo Git.
