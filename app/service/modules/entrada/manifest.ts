/* Entrada pelo link ou código único da igreja (migração 0071). Configurações
   › Entrada na igreja: link, código, QR e a regra (gestão aprova ou entra
   direto). Pedidos aguardando aparecem no "Para resolver" do Início do painel,
   só para a gestão. Parte da casca do acesso: não se desliga por igreja.
   Q12, lei 13: Início 1366×860 já mede 30 ações/25 e 103 palavras/100
   sem pedidos. A falha visível mede 31/25 e 115/100; um pedido, 33/25 e
   131/100. Mantemos erro e recuperação explícitos: +1 ação e +12 palavras
   em vez de ocultar falha como vazio. O pedido também mantém a linha-resumo
   e Aprovar/Recusar existentes. Três molduras herdadas; nenhuma sobreposição.
   A revisão da densidade da casca continua na I3; não se recorta conteúdo. */
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
