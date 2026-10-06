/* Permissões por papel e acessos por pessoa. Parte da casca. */
import { defineModule } from "../define";

export default defineModule({
  id: "acesso",
  liga: true,
  essencial: true,
  membro: {
    visivel: false,
    lugares: ["painel.config"],
  },
  painel: {
    config: [
      { id: "perm", rotulo: "Permissões", grupo: "Acesso", sub: "O que cada papel vê", ordem: 60 },
      { id: "acessos", rotulo: "Acessos por pessoa", grupo: "Acesso", sub: "Telas liberadas a alguém", ordem: 70 },
    ],
  },
});
