/* Conversas entre pessoas. */
import { defineModule } from "../define";

export default defineModule({
  id: "conversas",
  liga: true,
  permissoes: ["conversas"],
  membro: {
    visivel: true,
    lugares: ["mensagens.itens"],
    telas: [
      { id: "conversas", aba: "mensagens", aviso: "mensagens" },
    ],
  },
  painel: {
    menu: [
      { rota: "conversas", grupo: "Comunicação", rotulo: "Conversas", icone: "conversas", ordem: 51, permissao: "conversas" },
    ],
  },
  densidade: [{
    tela: "Conversas do painel, 14 DMs existentes (M9)",
    tamanho: "1366×860",
    medido: { palavras: 317, acoes: 39, sobreposicoes: 0 },
    limite: { palavras: 100, acoes: 25, sobreposicoes: 0 },
    motivo: "Fora dos limites: a tela existente mantém lista e conversa lado a lado e a casca do painel. A M9 corrige somente a identidade; não oculta contatos ou mensagens para reduzir a medida. Três molduras e dois botões cheios (um desativado) também pertencem à estrutura existente. A ajuda tem espaço reservado para não cruzar o campo nem Enviar. A lista do membro mede 11 ações e 77 palavras; a conversa aberta, 9 e 32.",
  }],
});
