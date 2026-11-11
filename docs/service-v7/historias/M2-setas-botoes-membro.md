---
id: M2
titulo: Remover setas dos botões do app do membro
tipo: codigo
status: reservada
quem: codex
desde: 2026-11-11
branch: historia/M2-setas-botoes-membro
depende: []
tamanho: P
---

## Por quê
A regra da onda 0 diz que seta só vai em link, não em botão. O app do membro ainda tem setas em botões, como "Abrir meu curso →".
Fonte: PLANO_TELA_FORMULARIO.md ("Ficou de fora: o app do membro ainda tem setas nos botões").

## Arquivos (trilho)
- `app/service/membro/Cursos.tsx`
- `app/service/membro/Onboarding.tsx`
- `app/service/membro/Mural.tsx`
- `app/service/membro/Caminhada.tsx` (somente a linha do botão, conforme o pedido)
- `app/service/membro/Conversas.tsx`
- `app/service/membro/Visitantes.tsx`
- `app/service/membro/Inicio.tsx`
- `app/service/membro/Biblia.tsx`
- `docs/service-v7/historias/M2-setas-botoes-membro.md`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/historias/screenshots/M2-*.png`

## Pronto quando
- Nenhum botão do app do membro com seta; setas só em link.
- Outros botões com seta encontrados na varredura removidos.

## Notas
Reserva feita por codex. A varredura encontrou também `app/service/MobileApp.tsx`, reservado por G17; essa casca ficará intacta para evitar colisão. O botão da Caminhada será alterado somente na linha solicitada, apesar da sobreposição documentada com Q17.
