/* Bíblia no app do membro. */
import { defineModule } from "../define";

export default defineModule({
  id: "biblia",
  liga: true,
  membro: {
    visivel: true,
    lugares: ["caminhada.secoes"],
    telas: [
      { id: "biblia", aba: "caminhada", titulo: "Bíblia" },
    ],
  },
});
