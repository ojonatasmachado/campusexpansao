/* Conversas entre pessoas. */
import { defineModule } from "../define";

export default defineModule({
  id: "conversas",
  liga: true,
  permissoes: ["conversas"],
  membro: {
    visivel: true,
    lugares: ["mensagens.itens"],
    telas: [
      { id: "conversas", aba: "mensagens", aviso: "mensagens" },
    ],
  },
  painel: {
    menu: [
      { rota: "conversas", grupo: "Comunicação", rotulo: "Conversas", icone: "conversas", ordem: 51, permissao: "conversas" },
    ],
  },
});
