"use client";

/* Contexto do vocabulário da igreja (lei 7). O painel e o app do membro ficam
   dentro do mesmo provider (ServiceExactApp), que lê o vocabulário da igreja
   matriz junto com o tema. Fora do provider valem os nomes padrão. */

import { createContext, useContext, useMemo } from "react";
import { comTermos, termoDe, VOCABULARIO_PADRAO, type FormaTermo, type Termo, type Vocabulario } from "./vocabulario";

const VocabularioContext = createContext<Vocabulario>(VOCABULARIO_PADRAO);

export function VocabularioProvider({ value, children }: { value: Vocabulario; children: React.ReactNode }) {
  return <VocabularioContext.Provider value={value}>{children}</VocabularioContext.Provider>;
}

export type Termos = {
  vocab: Vocabulario;
  /** nome da tela: termo("culto") → "Culto"; termo("culto", { plural: true, minuscula: true }) → "cultos" */
  termo: (id: Termo, forma?: Omit<FormaTermo, "curto">) => string;
  /** nome curto da barra (até 10 caracteres) */
  termoCurto: (id: Termo, forma?: Omit<FormaTermo, "curto">) => string;
  /** texto com marcadores: "{Cultos} e eventos" */
  comTermos: (texto: string) => string;
};

export function useTermos(): Termos {
  const vocab = useContext(VocabularioContext);
  return useMemo(
    () => ({
      vocab,
      termo: (id, forma) => termoDe(vocab, id, forma),
      termoCurto: (id, forma) => termoDe(vocab, id, { ...forma, curto: true }),
      comTermos: (texto) => comTermos(texto, vocab),
    }),
    [vocab],
  );
}
