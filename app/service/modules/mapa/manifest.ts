/* Mapa da igreja (docs/service-v7/mapa/PLANO.md). Dois produtos:
   - painel: o mapa da liderança (pessoas por CEP, presença x moradores do
     IBGE, áreas, mesa de trabalho, pontos, rota, emergência, linha do tempo).
     Só master, owner e pastor veem por papel; os demais só com a liberação
     "mapa" (tela Quem vê o mapa), que diz a área e o nível de detalhe.
   - app do membro: Agenda › Onde, igrejas e células (sempre públicas).
   Dados e regras: 0087 a 0093. */
import { defineModule } from "../define";

export default defineModule({
  id: "mapa",
  liga: true,
  membro: {
    visivel: true,
    lugares: ["agenda.igreja"],
  },
  painel: {
    menu: [{ rota: "mapa", grupo: "Pessoas", rotulo: "Mapa da igreja", icone: "mapapin", ordem: 21, papeis: ["master", "pastor"], acessos: ["mapa"] }],
  },
  vocabulario: ["grupo"],
  densidade: [
    {
      tela: "Mapa da igreja",
      tamanho: "1366×860",
      medido: { palavras: 105, acoes: 45, sobreposicoes: 0 },
      limite: { palavras: 100, acoes: 25, sobreposicoes: 0 },
      motivo: "Decisão de 04/11 (mapa/PLANO.md §10): ferramentas à vista numa barra, no lugar do menu Ferramentas, e camadas que se somam num painel. A casca do painel (menu, busca e avatar) soma 24 das 45 ações e 40 das 105 palavras; o mapa em si tem 21 ações e 65 palavras. Antes da G7 a tela tinha 42 ações, 183 palavras e 1 sobreposição.",
    },
  ],
});
