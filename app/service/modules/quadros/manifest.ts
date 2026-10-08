/* Quadros de tarefas. */
import { defineModule } from "../define";

export default defineModule({
  id: "quadros",
  liga: true,
  permissoes: ["quadros"],
  membro: {
    visivel: true,
    lugares: ["agenda.minha", "inicio.fila"],
    telas: [
      { id: "tarefas", aba: "agenda", quem: (c) => c.serves },
    ],
  },
  painel: {
    menu: [
      { rota: "quadros", grupo: "Gestão", rotulo: "Quadros", icone: "quadros", ordem: 71, permissao: "quadros" },
    ],
  },
});
