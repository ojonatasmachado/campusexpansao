/* Pesquisas e enquetes. */
import { defineModule } from "../define";

export default defineModule({
  id: "pesquisas",
  liga: true,
  permissoes: ["comunica"],
  membro: {
    visivel: true,
    lugares: ["inicio.fila"],
  },
  painel: {
    menu: [
      { rota: "pesquisas", grupo: "Comunicação", rotulo: "Pesquisas", icone: "lista", ordem: 52, permissao: "comunica" },
    ],
  },
});
