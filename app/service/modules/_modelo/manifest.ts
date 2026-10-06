/* Manifesto de exemplo. Copie esta pasta para app/service/modules/<id>/ e
   preencha. Siga o checklist "Criar um módulo novo" em ../README.md.
   Este exemplo não é registrado: o registro só lê os módulos de verdade. */

import { defineModule } from "../define";

export default defineModule({
  // Nome interno, estável. Nunca aparece na tela.
  id: "modelo",

  // Ligado por padrão em toda igreja nova? A gestão liga e desliga em
  // Configurações; o estado fica no banco por igreja.
  liga: false,

  // Sem estes, o módulo some inteiro (lei 6: nenhum beco sem saída).
  // Ex.: "escalas" para algo que só faz sentido com escala; "destinatario"
  // quando o módulo envia algo a alguém e precisa de quem receba.
  depende: ["escalas"],

  // Permissões de Configurações › Permissões que liberam o módulo no painel.
  permissoes: ["escalas.ver"],

  // App do membro: em que lugar mora (lei 2) e quais lugares ocupa (lei 1).
  membro: { visivel: true, lugares: ["inicio.fila", "agenda.minha"] },

  // Painel: item de menu, blocos no Início e abas de Configurações.
  painel: {
    menu: [{ grupo: "Ministério", rotulo: "Modelo", icone: "escalas", papeis: ["master", "gestao", "lider"] }],
    inicio: ["painel.inicio.pendencias"],
    config: [{ id: "modelo", rotulo: "Modelo" }],
  },

  // Cada aviso tem categoria (que a pessoa desliga) e o cartão que o
  // representa no Início (lei 9: notificação = ação).
  avisos: [{ tipo: "modelo_pendente", categoria: "escala", publico: "pessoa escalada", cartao: "acao", quando: "ao escalar" }],

  // Rotas abertas por QR ou link público.
  rotas: [{ caminho: "/service/modelo-checkin", tipo: "qr" }],

  // Termos renomeáveis que os textos do módulo usam via termo() (lei 7).
  vocabulario: ["culto", "voluntario"],

  // Fatos gravados na linha do tempo da pessoa (lei 10). Nada de pontos.
  historico: ["serviu", "faltou"],
});
