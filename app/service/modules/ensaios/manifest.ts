/* Ensaios dos times. */
import { defineModule } from "../define";

export default defineModule({
  id: "ensaios",
  liga: true,
  depende: ["times"],
  permissoes: ["ensaios"],
  membro: {
    visivel: true,
    lugares: ["agenda.minha"],
  },
  painel: {
    menu: [
      { rota: "ensaios", grupo: "Ministério", rotulo: "Ensaios", icone: "ensaios", ordem: 32, permissao: "ensaios" },
    ],
  },
});
