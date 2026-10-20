/* Entrada pelo link ou código único da igreja (migração 0071). Configurações
   › Entrada na igreja: link, código, QR e a regra (gestão aprova ou entra
   direto). Pedidos aguardando aparecem no "Para resolver" do Início do painel,
   só para a gestão. Parte da casca do acesso: não se desliga por igreja. */
import { defineModule } from "../define";

export default defineModule({
  id: "entrada",
  liga: true,
  essencial: true,
  painel: {
    inicio: ["painel.inicio.pendencias"],
    config: [
      { id: "entrada", rotulo: "Entrada na igreja", grupo: "Acesso", sub: "Link, código e quem aprova", ordem: 55 },
    ],
  },
  rotas: [
    { caminho: "/service/participar", tipo: "qr" },
    { caminho: "/service/participar/[codigo]", tipo: "publica" },
  ],
});
