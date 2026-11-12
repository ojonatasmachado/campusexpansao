"use client";

import { Carregando } from "./ui/Estados";
import { useTexto } from "./lib/internacional/contexto";

export default function Loading() {
  const traduzirUi = useTexto();
  return <Carregando telaInteira rotulo={traduzirUi("Carregando o Service…")} />;
}
