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
    {
      tela: "Mapa da igreja (painel no celular)",
      tamanho: "390×844",
      medido: { palavras: 11, acoes: 14, sobreposicoes: 0 },
      limite: { palavras: 80, acoes: 12, sobreposicoes: 0 },
      motivo: "G16: a casca do painel no celular (menu, busca, ajuda e avatar) soma 4 ações; o mapa tem busca, Camadas, 3D, minha posição, o \"i\" dos créditos do mapa (obrigatório pela licença) e as ferramentas visíveis da fileira que rola. Antes da G16 eram 18 ações e 1 sobreposição.",
    },
    {
      tela: "Mapa da igreja · Traçar rota",
      tamanho: "1366×860",
      medido: { palavras: 103, acoes: 39, sobreposicoes: 0 },
      limite: { palavras: 100, acoes: 25, sobreposicoes: 0 },
      motivo: "G11, prancha P9: objetivo, paradas que se reordenam, área, jeito de ir, nome, quando, equipe e as três saídas ficam no mesmo painel para a rota sair numa tela só. A casca do painel soma 24 ações. Antes eram 37 ações e 127 palavras.",
    },
    {
      tela: "Mapa da igreja · Linha do tempo",
      tamanho: "1366×860",
      medido: { palavras: 96, acoes: 32, sobreposicoes: 0 },
      limite: { palavras: 100, acoes: 25, sobreposicoes: 0 },
      motivo: "G11, prancha P10: os dois controles do período, o play, os períodos prontos e De perto ou Cidade toda. A casca do painel soma 24 ações. Antes eram 30 ações, 108 palavras, 1 sobreposição e 2 alvos pequenos.",
    },
    {
      tela: "Mapa da igreja · Criar área",
      tamanho: "1366×860",
      medido: { palavras: 118, acoes: 45, sobreposicoes: 0 },
      limite: { palavras: 100, acoes: 25, sobreposicoes: 0 },
      motivo: "G10, prancha P5: as quatro formas, Desfazer e o ímã ficam à vista em cima do mapa, e nome, tipo, as 7 cores e o responsável no painel, para a área sair numa tela só. A casca do painel soma 24 ações e cerca de 40 palavras; a dica do gesto e a regra do responsável são o resto do texto. Antes eram 42 ações e 99 palavras. No celular (390×844) a tela tem 12 ações e 60 palavras, dentro da lei.",
    },
  ],
});
