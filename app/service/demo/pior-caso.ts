/* Pior caso realista do /service/demo (skill break-ui): os mesmos dados do
   demo, trocados na origem, com o que aparece em igreja de verdade. Nome
   comprido de igreja e de pessoa, nome de uma sílaba, e-mail sem ponto de
   quebra, time e culto com nome longo, contagens em 1. Só fora de produção:
   /service/demo?dados=pior. Fica como teste de regressão das telas. */

export const IGREJA_LONGA = "Igreja Evangélica Assembleia de Deus Ministério Madureira, Campo Vila Nova Cachoeirinha";

/* por id do demo: p = voluntário, m = membro (mesma pessoa, mesmo nome) */
export const NOMES: Record<string, string> = {
  p1: "Maria Aparecida dos Santos Albuquerque Nascimento",
  m1: "Maria Aparecida dos Santos Albuquerque Nascimento",
  p2: "Jô",
  m2: "Jô",
  p3: "Francisco de Assis Gonçalves Bittencourt Júnior",
  p4: "Thaís Nguyễn",
  m3: "Thaís Nguyễn",
  p5: "Ana",
  m4: "Ana",
  p6: "José Raimundo Cavalcanti de Albuquerque Neto",
};

export const EMAIL_LONGO = "maria.aparecida.albuquerque.nascimento@assembleiamadureiravilanovacachoeirinha.org.br";

export const TIMES: Record<string, string> = {
  "min-1": "Ministério de Louvor e Adoração Congregacional",
  "min-2": "Comunicação, Mídias Sociais e Transmissão ao Vivo",
  "min-3": "Recepção, Acolhimento e Integração de Visitantes",
};

export const CULTOS: Record<string, string> = {
  "ev-1": "Culto de Celebração da Santa Ceia e Batismo nas Águas",
};

export const TAREFA_LONGA = "Definir tema, versículo-base e cronograma de pregações do segundo semestre com o conselho pastoral";
export const AVISO_LONGO = "Retiro de jovens e adolescentes 2026: inscrições abertas até 15 de julho, vagas limitadas, transporte saindo da sede";
export const GRUPO_LONGO = "GC Família Albuquerque · Jardim São Bento Novo";
