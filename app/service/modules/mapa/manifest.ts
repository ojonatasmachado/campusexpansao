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
});
