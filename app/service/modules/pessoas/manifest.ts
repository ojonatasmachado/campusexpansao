/* Pessoas (membros) e Voluntários. */
import { defineModule } from "../define";

export default defineModule({
  id: "pessoas",
  liga: true,
  permissoes: ["membros", "voluntarios"],
  membro: {
    visivel: false,
    lugares: ["busca"],
  },
  painel: {
    menu: [
      { rota: "membros", grupo: "Pessoas", rotulo: "Pessoas", icone: "membros", ordem: 20, permissao: "membros" },
    ],
    rotas: [
      { rota: "pessoas", grupo: "Pessoas", permissao: "voluntarios" },
    ],
  },
  vocabulario: ["voluntario", "caminhada"],
});
