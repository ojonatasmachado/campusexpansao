/* Regras da escala, delegação e presets de funções, guardados em
   service.churches.settings (jsonb) : ver 0005_service_foundation.sql:24. */
export type EscalaSettings = {
  modo: "manual" | "assistido" | "automatico";
  maxPorMes: number;
  folgaSemanas: number;
  considerarFerias: boolean;
  naRecusa: "proximo" | "avisar";
  /* Lista de cuidado (v7 4.17): semanas sem presença para entrar na lista */
  cuidadoSemanas?: number;
};
export type EscalaPreset = { id: string; nome: string; posicoes: Record<string, Array<{ name: string; need_count: number }>> };

export const ESCALA_DEFAULT: EscalaSettings = { modo: "assistido", maxPorMes: 4, folgaSemanas: 0, considerarFerias: true, naRecusa: "proximo", cuidadoSemanas: 3 };
