"use client";

import { createContext, useContext, useLayoutEffect, useMemo } from "react";
import { createText, sourceText, type Messages, type Text } from "./mensagens";
import { DEFAULT_LOCALE, type Locale } from "./contrato";

type InternationalContext = { locale: Locale; text: Text };
const Context = createContext<InternationalContext | null>(null);

/** Provider de dados/idioma, sem nova superfície ou controles de interface. */
export function ServiceLocaleProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, text: createText(locale, messages) }), [locale, messages]);
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
  return useContext(Context)?.text ?? sourceText;
}

export function useServiceLocale(): Locale {
  return useContext(Context)?.locale ?? DEFAULT_LOCALE;
}
