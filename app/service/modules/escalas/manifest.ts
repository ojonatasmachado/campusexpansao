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
});
