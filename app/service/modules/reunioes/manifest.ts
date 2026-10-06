/* Reuniões e pautas. */
import { defineModule } from "../define";

export default defineModule({
  id: "reunioes",
  liga: true,
  permissoes: ["reunioes"],
  membro: {
    visivel: true,
    lugares: ["agenda.minha"],
  },
  painel: {
    menu: [
      { rota: "reunioes", grupo: "Ministério", rotulo: "Reuniões", icone: "reunioes", ordem: 33, permissao: "reunioes" },
    ],
  },
});
