---
id: M4
titulo: Percorrer primeiro acesso e convite de ponta a ponta
tipo: verificacao
status: feita
quem: claude
desde: 2026-11-12
branch: historia/M4-primeiro-acesso-convite
depende: []
tamanho: M
---

## Por quê
As quatro abas já foram inspecionadas em 320px numa igreja vazia, mas não há evidência de ponta a ponta de convite, aceite, senha, endereço e retorno.
Fonte: HANDOFF item 3; CONTINUIDADE.md.

## Arquivos (trilho)
- `docs/service-v7/historias/M4-primeiro-acesso-convite.md`
- `app/service/lib/internacional/contexto.tsx`
- `app/service/painel/telas/FichaPessoa.tsx`
- `docs/service-v7/historias/screenshots/M4-com-1..8-*.png`, `M4-vazia-1..8-*.png`

## Pronto quando
- Jornada completa percorrida com evidência, em igreja vazia e em igreja com conteúdo: convite, aceite, senha, endereço e retorno.

## Notas
INCERTO: conferir no código antes de começar; se já estiver feito, marcar status: feita com a evidência.
Trilho a definir na reserva.

Fechamento 12/11 (local, Playwright pela tela): jornada percorrida nas duas igrejas, 5 de 5 passos cada, 0 erro de console. Igreja Teste Local (com conteúdo, Ana) e Outra Igreja Local (vazia, Bruno): a gestão cadastra só nome e telefone em Pessoas → + Novo membro, o convite fica pendente no banco; a pessoa abre o link no celular, informa e-mail, cria e repete a senha, informa o CEP (preenche rua, bairro, cidade e UF) e aceita o termo; entra direto no Início. Banco depois do aceite: `cep=01310100 termo=convite convite=usado login=1` e `cep=30130010 termo=convite convite=usado login=1`. Sai e volta pelo `/{slug}/entrar` direto no Início; o link usado mostra "Este convite não vale mais"; a ficha da gestão mostra "liberado" e "Reenviar acesso pelo WhatsApp". Os 2 passos do primeiro acesso e o "Quase lá" não aparecem porque o convite já completa a ficha e grava o termo (`MobileApp.tsx`, `firstAccessDone ?? contactComplete`); o teste afirma a ausência. Corrigido: (1) erro de console "Encountered a script tag while rendering React component" ao ir do login da igreja para o app: saiu o `<script>` do `ServiceLocaleProvider`, o `useLayoutEffect` já põe o idioma no `<html>` (com o internacional desligado o idioma é sempre pt-BR, igual ao layout raiz; ligado, o `<html>` só muda na hidratação, e o script antigo também não rodava na navegação pelo cliente); (2) a ajuda sob "Reenviar acesso" dizia que gera convite de 7 dias, mas a API manda só o login da igreja para quem já tem acesso: agora há um texto para cada caso, e "liberado", "Reenviar" e a ajuda seguem o login de verdade (`people.user_id`, o mesmo critério da API), não só a ficha ligada (que uma junção liga sem login). Densidade (`medir-densidade.js`): Novo membro 1366 12 ações (≤25), 78 palavras (≤100), moldura 2, dentro; Início do novo membro 390 com 9/55 e vazia 7/80, dentro; convite 390 8 ações e 115 palavras (limite 80), sobreposição "INPUT x Mostrar" e 2 alvos pequenos: **fora da lei 13**. A sobreposição e os alvos vêm do campo de senha compartilhado e também aparecem no `/service/login`, anteriores à M4; o corte do texto do convite mexe no termo de consentimento e ficou como pergunta (PERGUNTAS-CLAUDE 16). Lei 16: sem tela nova. Fotos (md5): com-1 57a6f9b0, com-2 2fef584e, com-3 ba2505ed, com-4 92016b9d, com-5 a32479c6, com-6 9d8e0609, com-7 bc8abd8e, com-8 a6f670a4, vazia-1 26663e6a, vazia-2 a720575f, vazia-3 c4480375, vazia-4 9ac21131, vazia-5 cfac4f22, vazia-6 9ac21131, vazia-7 bc8abd8e, vazia-8 39a6ef2f (vazia-4/6 e com-7/vazia-7 tiradas em momentos diferentes, telas idênticas byte a byte).
