---
id: M2
titulo: Remover setas dos botões do app do membro
tipo: codigo
status: livre
quem:
desde:
branch:
depende: []
tamanho: P
---

## Por quê
A regra da onda 0 diz que seta só vai em link, não em botão. O app do membro ainda tem setas em botões, como "Abrir meu curso →".
Fonte: PLANO_TELA_FORMULARIO.md ("Ficou de fora: o app do membro ainda tem setas nos botões").

## Arquivos (trilho)
- `app/service/membro/Cursos.tsx`

## Pronto quando
- Nenhum botão do app do membro com seta; setas só em link.
- Outros botões com seta encontrados na varredura removidos.

## Notas
ABERTO. Ver membro/Cursos.tsx:271. Os outros botões com seta ainda precisam ser listados por varredura.
