/* Crianças, turmas e check-in do Kids. */
import { defineModule } from "../define";

export default defineModule({
  id: "kids",
  liga: true,
  permissoes: ["kids"],
  membro: {
    visivel: true,
    lugares: ["agenda.minha", "inicio.fila"],
    telas: [
      { id: "kids-sala", aba: "agenda", titulo: "Sala do Kids", quem: (c) => c.isKids },
    ],
  },
  painel: {
    menu: [
      { rota: "criancas", grupo: "Pessoas", rotulo: "Crianças", icone: "kids", ordem: 22, permissao: "kids" },
    ],
    config: [
      { id: "kids", rotulo: "Turmas Kids", grupo: "Ministério", sub: "Turmas por idade", ordem: 50 },
    ],
  },
  rotas: [{ caminho: "/service/kids-checkin", tipo: "qr" }],
});
