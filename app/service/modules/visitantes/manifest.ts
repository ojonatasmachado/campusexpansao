/* Visitantes e o funil de integração. */
import { defineModule } from "../define";

export default defineModule({
  id: "visitantes",
  liga: true,
  permissoes: ["visitantes"],
  membro: {
    visivel: true,
    lugares: ["agenda.minha", "painel.inicio.pendencias"],
    telas: [
      { id: "visitantes", aba: "agenda", titulo: "Visitantes", quem: (c) => c.isRecep },
    ],
  },
  painel: {
    menu: [
      { rota: "visitantes", grupo: "Pessoas", rotulo: "Visitantes", icone: "visitante", ordem: 21, permissao: "visitantes" },
    ],
  },
});
