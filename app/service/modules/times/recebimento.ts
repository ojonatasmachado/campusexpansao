/* A oferta depende da decisão da gestão e de alguém para receber o pedido.
   Vaga na escala não equivale a recrutamento aberto. */
export type TimeComRecebimento = {
  recebePedidos?: boolean;
  profile?: Record<string, unknown> | null;
  people: Array<{ personId: string; isLeader: boolean }>;
};
export function recebimentoAberto(time: TimeComRecebimento): boolean {
  return time.profile?.recebendoVoluntarios === true;
}
export function podeReceberPedidos(time: TimeComRecebimento): boolean {
  return recebimentoAberto(time) && time.recebePedidos === true;
}
