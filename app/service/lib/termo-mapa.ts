/* Termo do mapa da igreja (docs/service-v7/mapa/PLANO.md, 2.3). A versão
   vai gravada junto com o aceite (members.map_consent_terms): mudou o texto,
   muda a versão. Texto a validar com o jurídico antes de publicar. */

export const TERMO_MAPA_VERSAO = "2026-10-21";

/* aviso que acompanha o campo de CEP (convite, primeiro acesso e perfil) */
export const AVISO_CEP = "A igreja poderá usar seu CEP para ver em que regiões da cidade estão as pessoas que a conhecem. O CEP mostra só a rua ou o bairro, não a sua casa.";

/* os 3 pontos que ficam visíveis na tela de aceite (não escondidos no termo) */
export function pontosDoTermo(igreja?: string | null): string[] {
  return [
    `Seus dados ficam só com a ${igreja?.trim() || "igreja"}.`,
    "A liderança pode ver seu nome, a região do seu CEP, sua célula e onde você serve. Nunca o endereço.",
    "Você muda isso quando quiser no Perfil.",
  ];
}

export function termoCompleto(igreja?: string | null): string[] {
  const nome = igreja?.trim() || "a igreja";
  return [
    `Quem cuida dos seus dados: ${nome}, que usa o Service para organizar a vida da igreja.`,
    "O que usamos: nome, contato, data de nascimento (se você informar) e endereço com CEP.",
    "Para que usamos o CEP: para saber em que regiões da cidade estão as pessoas que conhecem a igreja, mostrar a célula mais perto de você e ajudar a liderança a cuidar de quem mora perto. O CEP indica a rua ou o bairro, não a sua casa.",
    "O mapa da igreja: só a liderança autorizada pelo pastor vê o mapa. Ela pode ver seu nome, a região do seu CEP, a célula de que você participa e os ministérios em que serve. O número da casa e o endereço completo nunca aparecem no mapa.",
    "Se você não quiser aparecer com o nome: desligue em Perfil, em Meu nome no mapa. Você continua contado nos números do bairro, sem nome.",
    "Emergências: em enchente ou temporal, quem coordena o socorro pode abrir o endereço das famílias da área atingida. Cada abertura fica registrada com nome e hora.",
    "Com quem dividimos: com ninguém. Nenhum serviço de mapa recebe seu nome.",
    "Seus direitos: você pode pedir para ver, corrigir ou apagar seus dados falando com a secretaria da igreja.",
  ];
}
