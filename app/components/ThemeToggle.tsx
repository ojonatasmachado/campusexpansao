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

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.9 4.9 1.4 1.4" />
      <path d="m17.7 17.7 1.4 1.4" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.3 17.7-1.4 1.4" />
      <path d="m19.1 4.9-1.4 1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6.5 6.5 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
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
      <span className="theme-toggle-icon">{theme === "dark" ? <SunIcon /> : <MoonIcon />}</span>
      {!compact && <span className="theme-toggle-label">{currentLabel}</span>}
    </button>
  );
}
