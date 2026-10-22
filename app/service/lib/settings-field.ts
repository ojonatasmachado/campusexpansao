"use client";

import { useState } from "react";
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
/* uma fila só por igreja, compartilhada por todos os campos: dois campos
   diferentes salvos juntos também esperam um pelo outro (cada um lê o banco
   depois do anterior gravar) */
const filas = new Map<string, Promise<unknown>>();
function enfileirar<R>(churchId: string, run: () => Promise<R>): Promise<R> {
  const anterior = filas.get(churchId) ?? Promise.resolve();
  const next = anterior.then(run, run);
  filas.set(churchId, next.then(() => undefined, () => undefined));
  return next;
}

export function useChurchSettingsField<T extends object>(
  key: string,
  defaults: T,
  church: { id: string; settings?: Record<string, unknown> } | undefined,
  onSaved?: () => void,
) {
  const [value, setValue] = useState<T>(() => ({ ...defaults, ...((church?.settings?.[key] as Partial<T>) ?? {}) }));

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
    return church?.id ? enfileirar(church.id, run) : run();
  };

  return [value, setValue, save] as const;
}

/* Mesmo padrão de fila para um valor simples (lista, sim/não, texto) dentro
   de settings: o save lê o banco, troca só esta chave e grava, um de cada vez.
   Usado pelos interruptores e listas de Configurações, que antes gravavam o
   settings inteiro a partir da cópia da tela e podiam perder o clique anterior. */
export function useChurchSettingsValor<T>(
  key: string,
  padrao: T,
  church: { id: string; settings?: Record<string, unknown> } | undefined,
  onSaved?: () => void,
) {
  const [value, setValue] = useState<T>(() => (church?.settings?.[key] as T | undefined) ?? padrao);

  const [settingsAnteriores, setSettingsAnteriores] = useState(church?.settings);
  if (settingsAnteriores !== church?.settings) {
    setSettingsAnteriores(church?.settings);
    setValue((church?.settings?.[key] as T | undefined) ?? padrao);
  }

  const save = (novo: T): Promise<boolean> => {
    setValue(novo);
    const run = async () => {
      if (!church?.id) return false;
      const client = createServiceBrowserClient().schema("service");
      const { data: currentRow } = await client.from("churches").select("settings").eq("id", church.id).maybeSingle();
      const currentSettings = (currentRow as { settings?: Record<string, unknown> } | null)?.settings ?? church.settings ?? {};
      const { data, error } = await client.from("churches").update({ settings: { ...currentSettings, [key]: novo } }).eq("id", church.id).select("id");
      if (error || !data?.length) return false;
      onSaved?.();
      return true;
    };
    return church?.id ? enfileirar(church.id, run) : run();
  };

  return [value, setValue, save] as const;
}
