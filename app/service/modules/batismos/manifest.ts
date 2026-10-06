/* Turmas de batismo. */
import { defineModule } from "../define";

export default defineModule({
  id: "batismos",
  liga: true,
  permissoes: ["batismos"],
  membro: {
    visivel: true,
    lugares: ["caminhada.secoes"],
    telas: [
      { id: "batismo", aba: "caminhada", titulo: "Batismo" },
    ],
  },
  painel: {
    menu: [
      { rota: "batismos", grupo: "Formação", rotulo: "Batismos", icone: "batismos", ordem: 61, permissao: "batismos" },
    ],
  },
  vocabulario: ["caminhada"],
});
