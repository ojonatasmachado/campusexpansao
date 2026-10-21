"use client";

import { createContext, useContext, useMemo } from "react";
import { FUSO_PADRAO, normalizarFuso } from "./fuso";
import { relogioDoFuso } from "./relogio";

const RelogioContext = createContext(FUSO_PADRAO);
export function RelogioProvider({ fuso, children }: { fuso?: string | null; children: React.ReactNode }) {
  return <RelogioContext.Provider value={normalizarFuso(fuso)}>{children}</RelogioContext.Provider>;
}
export function useRelogioDaIgreja() {
  const fuso = useContext(RelogioContext);
  return useMemo(() => relogioDoFuso(fuso), [fuso]);
}
