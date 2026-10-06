/* Identidade e propósito. */
import { defineModule } from "../define";

export default defineModule({
  id: "identidade",
  liga: true,
  permissoes: ["identidade"],
  membro: {
    visivel: true,
    lugares: ["caminhada.secoes"],
  },
  painel: {
    menu: [
      { rota: "identidade", grupo: "Gestão", rotulo: "Identidade e propósito", icone: "identidade", ordem: 72, permissao: "identidade" },
    ],
  },
});
