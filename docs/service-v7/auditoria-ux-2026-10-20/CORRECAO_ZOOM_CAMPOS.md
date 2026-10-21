# Campos no celular: proteção contra zoom automático

Em 21/10/2026, a proteção de fonte mínima foi ampliada para todos os campos do Service em telas de até 860px ou com qualquer dispositivo de toque. A regra anterior do app do membro não cobria integralmente painel, autenticação, portais e estilos locais.

A regra final da folha `evolucoes/service_app/service-app.css` mantém fonte computada e tamanho efetivo de pelo menos 16px, compensando as sete posições do zoom tipográfico. Abrange inputs de escrita, textarea, select e editores contenteditable. Checkbox, radio, range, color, campos ocultos e botões ficam fora. O título do editor preserva 20px. O zoom manual e o viewport permanecem livres.

Validação: Chrome headless, janela 390 × 844, folha real completa, seis tipos de campo em sete escalas (42 combinações), incluindo fontes inline de 11px e 12px. Todos passaram na verificação de fonte computada e efetiva de pelo menos 16px após foco. `git diff --check` passou.

Limite: foco automatizado no Chrome não reproduz o teclado e o zoom automático do Safari em um iPhone físico. Essa confirmação continua pendente; o teste comprova a cobertura da regra e o piso de fonte, sem certificar o comportamento físico do teclado.

Esta publicação contém apenas a correção de campos. O trabalho de fusos horários permanece em andamento, sem publicação nesta entrega.
