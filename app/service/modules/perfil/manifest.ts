/* Perfil do membro: dados, senha e família. Parte da casca. */
import { defineModule } from "../define";

export default defineModule({
  id: "perfil",
  liga: true,
  essencial: true,
  membro: {
    visivel: true,
    lugares: ["perfil.linhas"],
    telas: [
      { id: "dados", aba: "perfil", titulo: "Meus dados" },
      { id: "senha", aba: "perfil", titulo: "Trocar senha" },
      { id: "familia", aba: "perfil", titulo: "Minha família" },
      { id: "minha-historia", aba: "perfil", titulo: "Minha história" },
    ],
  },
  historico: ["serviu", "trocou", "concluiu_aula", "concluiu_curso", "batizou", "entrou_grupo"],
});
