/* Aniversariantes: quem faz aniversário hoje, na semana e no mês, com o
   parabéns pelo WhatsApp. Painel: bloco no Início ("Para resolver") e a lista
   do mês em Pessoas. App: no dia, o líder recebe um cartão de prioridade baixa
   com quem do seu time faz aniversário.
   Privacidade: o membro comum não vê a data de ninguém (nem "faz aniversário
   hoje"); o líder vê só o seu escopo, sem ano e sem idade; idade só para a gestão.
   Sem nenhuma data de nascimento no cadastro, o Início não mostra o bloco (lei 6). */
import { defineModule } from "../define";

export default defineModule({
  id: "aniversarios",
  liga: true,
  membro: {
    visivel: true,
    lugares: ["inicio.fila"],
  },
  painel: {
    /* sem código de permissão: toda a liderança vê, cada um no seu escopo */
    menu: [{ rota: "aniversariantes", grupo: "Pessoas", rotulo: "Aniversariantes", icone: "presente", ordem: 25, papeis: ["master", "pastor", "lider"] }],
    inicio: ["painel.inicio.pendencias"],
  },
  vocabulario: ["grupo"],
});
