/* Página pública da igreja. */
import { defineModule } from "../define";

export default defineModule({
  id: "pagina",
  liga: true,
  permissoes: ["igreja"],
  painel: {
    menu: [
      { rota: "pagina", grupo: "Comunicação", rotulo: "Página da igreja", icone: "globo", ordem: 53, permissao: "igreja" },
    ],
  },
});
