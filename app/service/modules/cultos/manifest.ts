/* Cultos e eventos da agenda. */
import { defineModule } from "../define";

export default defineModule({
  id: "cultos",
  liga: true,
  permissoes: ["cultos"],
  membro: {
    visivel: true,
    lugares: ["agenda.igreja", "inicio.igreja"],
  },
  painel: {
    menu: [
      { rota: "cultos", grupo: "Agenda", rotulo: "{Cultos} e eventos", icone: "cultos", ordem: 40, permissao: "cultos" },
    ],
  },
  vocabulario: ["culto"],
});
