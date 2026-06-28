"use client";

import { useEffect, useState } from "react";

type ThemeName = "dark" | "light";

const THEME_KEY = "cex-theme";

function normalizeTheme(value: string | null): ThemeName {
  return value === "light" ? "light" : "dark";
}

function readTheme(): ThemeName {
  if (typeof window === "undefined") return "dark";
  return normalizeTheme(window.localStorage.getItem(THEME_KEY) || document.documentElement.dataset.theme || null);
}

function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeName>("dark");

  useEffect(() => {
    const sync = () => setTheme(readTheme());
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY) sync();
    };

    sync();
    window.addEventListener("storage", syncFromStorage);
    window.addEventListener("cex-theme-change", sync);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener("cex-theme-change", sync);
    };
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    window.localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    setTheme(next);
    window.dispatchEvent(new Event("cex-theme-change"));
  }

  const nextLabel = theme === "light" ? "escuro" : "claro";
  const currentLabel = theme === "light" ? "Claro" : "Escuro";

  return (
    <button
      type="button"
      className={`theme-toggle${compact ? " theme-toggle--compact" : ""}`}
      onClick={toggleTheme}
      aria-label={`Alternar para tema ${nextLabel}`}
      title={`Alternar para tema ${nextLabel}`}
    >
      <span className="theme-toggle-icon" aria-hidden="true" />
      {!compact && <span className="theme-toggle-label">{currentLabel}</span>}
    </button>
  );
}
