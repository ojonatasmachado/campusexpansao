/* Mural: avisos da igreja para o app, com leitura e resposta. */
import { defineModule } from "../define";

export default defineModule({
  id: "mural",
  liga: true,
  permissoes: ["comunica"],
  membro: {
    visivel: true,
    lugares: ["mensagens.itens", "inicio.igreja"],
    telas: [{ id: "mural", aba: "mensagens", titulo: "Mural da igreja", aviso: "mural" }],
  },
  painel: {
    menu: [{ rota: "comunicacao", grupo: "Comunicação", rotulo: "Mural", icone: "comunicacao", ordem: 50, permissao: "comunica" }],
  },
  avisos: [{ tipo: "aviso_publicado", categoria: "mural", publico: "público escolhido na publicação", cartao: "aviso", quando: "ao publicar" }],
});
