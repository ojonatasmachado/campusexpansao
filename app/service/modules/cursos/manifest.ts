/* Cursos e trilhas. */
import { defineModule } from "../define";

export default defineModule({
  id: "cursos",
  liga: true,
  permissoes: ["cursos"],
  membro: {
    visivel: true,
    lugares: ["caminhada.secoes", "agenda.minha", "inicio.fila"],
    telas: [
      { id: "cursos", aba: "caminhada", titulo: "Cursos", aviso: "caminhada" },
    ],
  },
  painel: {
    menu: [
      { rota: "cursos", grupo: "Formação", rotulo: "Cursos e trilhas", icone: "cursos", ordem: 60, permissao: "cursos" },
    ],
  },
  rotas: [{ caminho: "/service/aula-checkin", tipo: "qr" }],
});
