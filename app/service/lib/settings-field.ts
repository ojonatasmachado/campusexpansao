"use client";

import { useEffect, useRef, useState } from "react";
import { createServiceBrowserClient } from "./supabase-browser";

/* Estado + salvamento de UM campo dentro de service.churches.settings
   (jsonb), com fila de salvamento : cada save só começa a ler o banco
   depois do anterior ter terminado de escrever. Ler-fresco-antes-de-escrever
   sozinho ainda deixa uma corrida quando duas mudanças (ex.: trocar a fonte
   do logo e digitar o texto do logo) disparam quase juntas — o segundo save
   pode ler o banco ANTES do primeiro terminar de gravar, e escrever por
   cima sem o campo que o primeiro acabou de salvar.

   Extraído de savePagina (PublicPageEditor.tsx) pra ser reaproveitado
   também pela identidade da igreja (Personalização, ServiceExactApp.tsx) :
   mesmo padrão de fila, chave diferente dentro do mesmo jsonb. */
export function useChurchSettingsField<T extends object>(
  key: string,
  defaults: T,
  church: { id: string; settings?: Record<string, unknown> } | undefined,
  onSaved?: () => void,
) {
  const [value, setValue] = useState<T>(() => ({ ...defaults, ...((church?.settings?.[key] as Partial<T>) ?? {}) }));
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  /* configurações novas do servidor: o valor recomeça delas (ajuste na renderização, sem efeito) */
  const [settingsAnteriores, setSettingsAnteriores] = useState(church?.settings);
  if (settingsAnteriores !== church?.settings) {
    setSettingsAnteriores(church?.settings);
    setValue({ ...defaults, ...((church?.settings?.[key] as Partial<T>) ?? {}) });
  }

  /* resolve true quando o banco gravou (sem linha de volta = sem permissão ou igreja inexistente) */
  const save = (patch: Partial<T>): Promise<boolean> => {
    setValue((prev) => ({ ...prev, ...patch }));
    const run = async () => {
      if (!church?.id) return false;
      const client = createServiceBrowserClient().schema("service");
      const { data: currentRow } = await client.from("churches").select("settings").eq("id", church.id).maybeSingle();
      const currentSettings = (currentRow as { settings?: Record<string, unknown> } | null)?.settings ?? church.settings ?? {};
      const currentValue = (currentSettings[key] as Partial<T> | undefined) ?? {};
      const merged = { ...currentSettings, [key]: { ...currentValue, ...patch } };
      const { data, error } = await client.from("churches").update({ settings: merged }).eq("id", church.id).select("id");
      if (error || !data?.length) return false;
      onSaved?.();
      return true;
    };
    const next = queueRef.current.then(run, run);
    queueRef.current = next.then(() => undefined);
    return next;
  };

  return [value, setValue, save] as const;
}
