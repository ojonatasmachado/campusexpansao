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
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    setValue({ ...defaults, ...((church?.settings?.[key] as Partial<T>) ?? {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [church?.settings]);

  const save = (patch: Partial<T>): Promise<void> => {
    setValue((prev) => ({ ...prev, ...patch }));
    const run = async () => {
      if (!church?.id) return;
      const client = createServiceBrowserClient().schema("service");
      const { data: currentRow } = await client.from("churches").select("settings").eq("id", church.id).maybeSingle();
      const currentSettings = (currentRow as { settings?: Record<string, unknown> } | null)?.settings ?? church.settings ?? {};
      const currentValue = (currentSettings[key] as Partial<T> | undefined) ?? {};
      const merged = { ...currentSettings, [key]: { ...currentValue, ...patch } };
      await client.from("churches").update({ settings: merged }).eq("id", church.id);
      onSaved?.();
    };
    const next = queueRef.current.then(run, run);
    queueRef.current = next;
    return next;
  };

  return [value, setValue, save] as const;
}
