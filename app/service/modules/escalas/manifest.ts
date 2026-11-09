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
      tela: "Início do painel: Para resolver, dois cultos com falta (E3)",
      tamanho: "1366×860",
      medido: { palavras: 103, acoes: 30, sobreposicoes: 0 },
      limite: { palavras: 100, acoes: 25, sobreposicoes: 0 },
      motivo: "Fora dos limites. A captura anterior tinha 29 ações e 85 palavras com uma contagem semanal genérica. As duas linhas agora identificam data, culto e vagas em cada time e abrem o Panorama individualmente, somando uma ação. As três molduras detectadas já existiam na casca. A fila usa linhas sem moldura própria; não esconde cultos para reduzir a medição.",
    },
    {
      tela: "Início do painel: Para resolver, seis cultos e time com nome longo (E3)",
      tamanho: "1366×860",
      medido: { palavras: 231, acoes: 34, sobreposicoes: 0 },
      limite: { palavras: 100, acoes: 25, sobreposicoes: 0 },
      motivo: "Fora dos limites. O pior caso solicitado tem seis cultos com falta e o nome completo do time em cada linha. Uma linha por culto mantém data e destinatário da ação claros e acessíveis, sem truncar a lista dos 14 dias. A ajuda fixa tem seu espaço reservado na preparação. O detalhe permanece exclusivamente no Panorama, que mede 9 ações e 46 palavras com o mesmo time longo.",
    },
    {
      tela: "Agenda: Quando posso servir, lista de ausências",
      tamanho: "390×844",
      medido: { palavras: 67, acoes: 13, sobreposicoes: 0 },
      limite: { palavras: 80, acoes: 12, sobreposicoes: 0 },
      motivo: "Captura rolada até a ausência, não a primeira dobra da Agenda. A ação adicional é Remover, pedida na própria linha para retirar o bloqueio sem abrir um menu. A casca e os controles anteriores continuam visíveis. A folha de cadastro fica abaixo dos limites: 6 ações e 19 palavras.",
    },
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
