/* Decisões por Jesus. */
import { defineModule } from "../define";

export default defineModule({
  id: "decisoes",
  liga: true,
  permissoes: ["decisoes"],
  membro: {
    visivel: false,
    lugares: ["painel.inicio.saude"],
  },
  painel: {
    menu: [
      { rota: "decisoes", grupo: "Pessoas", rotulo: "Decisões", secundario: true, icone: "decisoes", ordem: 24, permissao: "decisoes" },
    ],
  },
  vocabulario: ["caminhada"],
});
