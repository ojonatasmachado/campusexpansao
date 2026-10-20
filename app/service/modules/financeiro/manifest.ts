/* Financeiro (fase 1): contas, categorias, fundos, lançamentos, transferência e
   contagem de oferta. Mora só no painel (Gestão). Não entra pelo papel de
   líder nem pela matriz: só dono, master, pastor e quem recebe a liberação
   pessoa a pessoa (financeiro.ver lê, financeiro.lancar lê e lança). Dízimo
   individual é dado sensível: nada aparece no app do membro nem na história
   da pessoa (lei 10). Banco em 0073; tela em ./Financeiro.tsx. */
import { defineModule } from "../define";

export const ACESSO_FIN_VER = "financeiro.ver";
export const ACESSO_FIN_LANCAR = "financeiro.lancar";

export default defineModule({
  id: "financeiro",
  liga: true,
  permissoes: [ACESSO_FIN_VER, ACESSO_FIN_LANCAR],
  painel: {
    menu: [{
      rota: "financeiro", grupo: "Gestão", rotulo: "Financeiro", icone: "carteira", ordem: 70.5,
      papeis: ["master", "pastor"], acessos: [ACESSO_FIN_VER, ACESSO_FIN_LANCAR],
    }],
  },
});
