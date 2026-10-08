/* Etapas da Caminhada no painel, na ordem da ficha (members.journey).
   Saiu de ServiceExactApp.tsx na 4.1 para o painel e os módulos usarem a mesma lista. */
import type { JourneyStepKind } from "../ServiceExactApp";

/* "{Grupo}": nome que a igreja dá ao grupo (vocabulário, lei 7); passe o rótulo por comTermos/ct ao mostrar */
export const JRN_STEPS: Array<{ label: string; kind: JourneyStepKind; icon: string }> = [
  { label: "Decisão", kind: "decisao", icon: "decisoes" },
  { label: "Batismo nas águas", kind: "batismo", icon: "batismos" },
  { label: "Fundamentos", kind: "curso", icon: "cursos" },
  { label: "{Grupo}", kind: "integracao", icon: "pessoa" },
  { label: "Servindo", kind: "time", icon: "times" },
];
