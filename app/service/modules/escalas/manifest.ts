/* Escalas: vagas por culto, quem serve, confirmação e troca. Primeiro módulo
   extraído do painel (4.1); a tela mora em ./Escalas.tsx. */
import { defineModule } from "../define";

export default defineModule({
  id: "escalas",
  liga: true,
  depende: ["times"],
  permissoes: ["escala"],
  membro: {
    visivel: true,
    lugares: ["inicio.fila", "agenda.minha"],
    telas: [{ id: "escala", aba: "agenda", aviso: "escala", quem: (c) => c.serves }],
  },
  painel: {
    menu: [{ rota: "escalas", grupo: "Ministério", rotulo: "Escalas", icone: "escalas", ordem: 31, permissao: "escala" }],
    inicio: ["painel.inicio.pendencias"],
    config: [{ id: "operacao", rotulo: "Escala e presença", grupo: "Ministério", sub: "Regras da escala e check-in", ordem: 40 }],
  },
  avisos: [
    { tipo: "escala_nova", categoria: "escala", publico: "pessoa escalada", cartao: "acao", quando: "ao publicar a escala" },
    { tipo: "troca_pedida", categoria: "escala", publico: "destinatário da troca", cartao: "pedido", quando: "ao pedir troca" },
  ],
  rotas: [{ caminho: "/service/checkin", tipo: "qr" }],
  vocabulario: ["culto", "voluntario"],
  historico: ["serviu", "faltou", "trocou"],
  densidade: [
    {
      tela: "Escalas por time",
      tamanho: "1366×860",
      medido: { palavras: 106, acoes: 54, sobreposicoes: 0 },
      limite: { palavras: 100, acoes: 25, sobreposicoes: 0 },
      motivo: "A escala é uma grade de vagas: cada vaga vazia de cada culto do mês é o botão de escalar, e escondê-la custaria mais toques ao líder. A casca do painel (menu, busca e avatar) soma 23 das 54 ações. Antes da E1 a tela tinha 47 ações, 208 palavras e 3 molduras.",
    },
    {
      tela: "Escalas por time",
      tamanho: "390×844",
      medido: { palavras: 31, acoes: 15, sobreposicoes: 0 },
      limite: { palavras: 80, acoes: 12, sobreposicoes: 0 },
      motivo: "Um culto por vez; as 3 ações acima do teto são as duas setas entre cultos e a segunda vaga da função, que é o próprio botão de escalar.",
    },
    {
      tela: "Agenda do membro (Minha agenda)",
      tamanho: "390×844",
      medido: { palavras: 68, acoes: 15, sobreposicoes: 0 },
      limite: { palavras: 80, acoes: 12, sobreposicoes: 0 },
      motivo: "Com 3 escalas a confirmar, as 3 ações acima do teto são o Não posso de cada cartão. A recusa fica no cartão porque é uma por uma (tem motivo e avisa o líder); só a confirmação vai em lote.",
    },
  ],
});
