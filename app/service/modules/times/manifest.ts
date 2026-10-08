/* Times (ministérios) e funções. */
import { defineModule } from "../define";

export default defineModule({
  id: "times",
  liga: true,
  permissoes: ["times"],
  membro: {
    visivel: true,
    lugares: ["caminhada.secoes"],
  },
  painel: {
    menu: [
      { rota: "times", grupo: "Ministério", rotulo: "Times", icone: "times", ordem: 30, permissao: "times" },
    ],
  },
  vocabulario: ["voluntario"],
});
