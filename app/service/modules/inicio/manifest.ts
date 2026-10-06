/* Início do painel e do app. */
import { defineModule } from "../define";

export default defineModule({
  id: "inicio",
  liga: true,
  essencial: true,
  membro: {
    visivel: true,
    lugares: ["inicio.fila", "inicio.igreja", "painel.inicio.saude", "painel.inicio.pendencias"],
  },
  painel: {
    menu: [
      { rota: "painel", grupo: "Início", rotulo: "Início", icone: "painel", ordem: 10 },
    ],
  },
});
