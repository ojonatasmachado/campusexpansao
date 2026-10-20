/* Configuração guiada em 3 fases (v7 4.12): assistente que dá para pular e
   retomar. Mora fora do menu (tela "configurar"); o Início do painel mostra
   "Sua igreja: fase 2 de 3 · cerca de 10 minutos" até terminar. */
import { defineModule } from "../define";

export default defineModule({
  id: "configuracao",
  liga: true,
  essencial: true,
  permissoes: ["permissoes"],
  painel: {
    rotas: [{ rota: "configurar", grupo: "Início", permissao: "permissoes" }],
    inicio: ["painel.inicio.pendencias"],
  },
  vocabulario: ["culto"],
});
