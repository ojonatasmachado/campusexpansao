/* Espaços, salas e reservas. */
import { defineModule } from "../define";

export default defineModule({
  id: "espacos",
  liga: true,
  permissoes: ["cultos"],
  painel: {
    menu: [
      { rota: "espacos", grupo: "Agenda", rotulo: "Espaços e salas", icone: "espacos", ordem: 41, permissao: "cultos" },
    ],
  },
});
