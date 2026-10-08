/* Nossa história. */
import { defineModule } from "../define";

export default defineModule({
  id: "historia",
  liga: true,
  permissoes: ["historia"],
  painel: {
    menu: [
      { rota: "historia", grupo: "Gestão", rotulo: "Nossa história", icone: "historia", ordem: 73, permissao: "historia" },
    ],
  },
  vocabulario: ["caminhada"],
});
