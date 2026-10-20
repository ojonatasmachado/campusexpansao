/* Lista de cuidado (v7 4.17): quem está há semanas sem presença vai para a
   lista de quem cuida (líder do grupo, depois líder do time, depois a
   pastoral). Depende de presença registrada: sem nenhum check-in na igreja,
   o módulo não aparece (lei 6). O membro nunca vê a marcação. */
import { defineModule } from "../define";

export default defineModule({
  id: "cuidado",
  liga: true,
  depende: ["presenca"],
  painel: {
    inicio: ["painel.inicio.pendencias", "painel.inicio.saude"],
  },
  historico: ["contato_cuidado"],
});
