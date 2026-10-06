/* Relatórios e indicadores. */
import { defineModule } from "../define";

export default defineModule({
  id: "relatorios",
  liga: true,
  membro: {
    visivel: false,
    lugares: ["painel.inicio.saude"],
  },
  painel: {
    menu: [
      { rota: "relatorios", grupo: "Gestão", rotulo: "Relatórios", icone: "relatorios", ordem: 70 },
    ],
  },
});
