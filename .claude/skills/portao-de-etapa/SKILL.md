---
name: portao-de-etapa
description: Ciclo de qualidade para toda etapa ou item do Service/CE.X: implementar, validar com saída real, corrigir, validar de novo e só então avançar. Use sempre que for aplicar uma etapa do manifesto, uma história ou uma tela.
---

# Portão de etapa

Um item só está pronto quando a **saída real** de `bash scripts/validar.sh` diz "TUDO PASSOU" e todos os critérios "pronto quando" dele têm evidência. Resumo escrito não vale como validação.

## Ciclo (por item)
1. **Ler** AGENTS.md (a constituição), `docs/service-v7/REGRAS-DE-TRABALHO.md` e o arquivo da história (ou o manifesto e PROGRESSO.md, quando for etapa do manifesto). Visual novo: consultar o skill `cex-brand` e o Brand Book citado no AGENTS.md. Dúvida de produto ou de marca: PARE e pergunte; não invente regra.
2. **Critérios**: liste os "pronto quando" do item em frases verificáveis (use os da história ou do manifesto; não acrescente comportamento). Inclua casos extremos (vazio, nome longo, falha de rede, repetir a ação) e, para telas, mobile e desktop.
3. **Implementar** em commit pequeno com o número do item na mensagem, como em /service-v7.
4. **Validar** (obrigatório, nesta ordem):
   a. `bash scripts/validar.sh /rota1 /rota2` com `npm run dev:local` ligado (nunca `npm run dev`, que aponta para produção); cole a saída inteira. Tela: acrescente `--captura="--so=... --ap=..."`.
   b. Subagente `revisor` sobre o diff do item.
   c. Telas: abra as rotas no navegador (celular e desktop), confira contra o AGENTS.md/Brand Book e capture como manda `docs/service-v7/CAPTURA.md`.
5. **Corrigir** cada falha ou achado, commit, voltar ao 4. No máximo **3 voltas**; na terceira com falha, PARE e registre o bloqueio nas Notas da história (ou em Bloqueios no PROGRESSO.md, se for etapa do manifesto).
6. **Fechar o item**: história fecha no próprio arquivo (`status: feita` e uma linha em Notas, como manda REGRAS-DE-TRABALHO §4); etapa do manifesto, em PROGRESSO.md. Nos dois casos, com o commit curto e o resultado de cada critério (PASSOU, FALHOU ou NÃO VERIFICADO, com motivo).
7. **Próximo item** só com todos os critérios PASSOU e validar.sh limpo. No fim da etapa, PARE com o resumo; a próxima etapa começa com nova chamada.

## Sempre parar e perguntar
Decisão de produto ou marca em aberto; mudar a constituição (AGENTS.md); dependência nova; passo manual (Supabase, Vercel, chaves, e-mails reais); três voltas sem sucesso. Nunca mexer em produção nem enviar e-mail real.

## Relatório final (saídas reais, nunca resumo)
`git log --oneline` da etapa e `git status`; saída completa do validar.sh; critérios com resultado; o que NÃO foi verificado e por quê; se algo falhou, dizer que falhou.
