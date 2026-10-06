/* Grupos (células, GCs). */
import { defineModule } from "../define";

export default defineModule({
  id: "grupos",
  liga: true,
  permissoes: ["membros"],
  membro: {
    visivel: true,
    lugares: ["caminhada.secoes"],
  },
  painel: {
    menu: [
      { rota: "grupos", grupo: "Pessoas", rotulo: "Grupos", icone: "casais", ordem: 23, permissao: "membros" },
    ],
  },
});
