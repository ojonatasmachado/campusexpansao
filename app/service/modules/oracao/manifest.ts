/* Mural de oração: o membro pede oração só para a intercessão (vai também
   como conversa) ou para o mural da igreja, com nome ou em anônimo; quem lê
   o mural marca "Orei"; quem pediu vê quantas pessoas oraram e conta quando
   Deus respondeu. Mora em Mensagens, ao lado do Mural da igreja (lei 2:
   são pessoas da igreja falando com a igreja). Quem cuida da intercessão
   modera no painel (Comunicação › Oração). Dados e regras em 0076. */
import { defineModule } from "../define";

export default defineModule({
  id: "oracao",
  liga: true,
  permissoes: ["oracao"],
  membro: {
    visivel: true,
    lugares: ["mensagens.itens"],
    telas: [{ id: "oracao", aba: "mensagens", titulo: "Mural de oração" }],
  },
  painel: {
    menu: [{ rota: "oracao", grupo: "Comunicação", rotulo: "Oração", icone: "coracao", ordem: 52, permissao: "oracao" }],
  },
});
