"use client";

import { createContext, useContext, useLayoutEffect, useMemo } from "react";
import { bindVocabulary, createText, sourceText, type Messages, type Text } from "./mensagens";
import { DEFAULT_LOCALE, type Locale } from "./contrato";
import { useVocabularioDaIgreja } from "../vocabulario-context";

type InternationalContext = { locale: Locale; text: Text; enabled: boolean };
const Context = createContext<InternationalContext | null>(null);

/** Provider de dados/idioma, sem nova superfície ou controles de interface. */
export function ServiceLocaleProvider({ locale, messages, enabled = false, children }: { locale: Locale; messages: Messages; enabled?: boolean; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, text: createText(locale, messages), enabled }), [locale, messages, enabled]);
  useLayoutEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = locale;
    return () => { if (document.documentElement.lang === locale) document.documentElement.lang = previous; };
  }, [locale]);
  return (
    <Context.Provider value={value}>
      {/* Linguagem do conteúdo já no HTML do servidor; sem caixa adicional de layout. */}
      <div lang={locale} style={{ display: "contents" }} data-service-locale={locale}>
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang=${JSON.stringify(locale)};` }} />
        {children}
      </div>
    </Context.Provider>
  );
}

export function useTexto(): Text {
  const base = useContext(Context)?.text ?? sourceText;
  const vocabulary = useVocabularioDaIgreja();
  return useMemo(() => bindVocabulary(base, vocabulary ?? undefined), [base, vocabulary]);
}

export function useServiceLocale(): Locale {
  return useContext(Context)?.locale ?? DEFAULT_LOCALE;
}

export function useInternationalEnabled(): boolean {
  return useContext(Context)?.enabled ?? false;
}
