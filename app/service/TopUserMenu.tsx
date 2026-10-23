"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./lib/icons";
import { instalarApp, jaInstalado } from "./lib/instalar";

import { Acao } from "./ui/Acao";
import { Avatar } from "./ui/Avatar";
/* Avatar da pessoa logada no topo do painel, com menu. Substitui as
   iniciais da IGREJA (que não abriam nada) e o sino "Avisos" sem ação.
   O botão de tema continua na barra, como hoje.
   CSS: .top-user-* (service-v5.css). Ver PROMPT v5, etapa 3. */
export default function TopUserMenu({
  name,
  roleLabel,
  photoUrl,
  churchPageUrl,
  onLogout,
  onOpenApp,
  theme,
  onToggleTheme,
}: {
  name: string;
  roleLabel: string;
  photoUrl?: string | null;
  churchPageUrl?: string | null;
  onLogout: () => void;
  /* troca para o app do membro (a pessoa também usa o app como qualquer membro) */
  onOpenApp?: () => void;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const esc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  const parts = (name.trim() || "Você").split(/\s+/);

  return (
    <div className="top-user" ref={ref}>
      <Acao className="top-user-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <Avatar nome={name} foto={photoUrl} tamanho="sm" />
        <span className="top-user-name">{parts[0]}</span>
      </Acao>
      {open && (
        <div className="top-user-pop" /* lei17-ok: menu do usuário com cabeçalho, link e tema */ role="menu">
          <div className="top-user-head">
            <b>{name}</b>
            <small>{roleLabel}</small>
          </div>
          {churchPageUrl ? (
            <a role="menuitem" href={churchPageUrl} target="_blank" rel="noreferrer">
              <span className="ic"><Icon name="globo" size={16} /></span>
              Ver a página da igreja
            </a>
          ) : null}
          {onOpenApp ? (
            <Acao role="menuitem" onClick={() => { setOpen(false); onOpenApp(); }}>
              <span className="ic"><Icon name="perfil" size={16} /></span>
              Abrir o app
            </Acao>
          ) : null}
          {!jaInstalado() ? (
            <Acao role="menuitem" onClick={() => { setOpen(false); void instalarApp(); }}>
              <span className="ic"><Icon name="baixar" size={16} /></span>
              Instalar o app
            </Acao>
          ) : null}
          {onToggleTheme ? (
            <Acao role="menuitem" onClick={onToggleTheme}>
              <span className="ic"><Icon name={theme === "dark" ? "sol" : "lua"} size={16} /></span>
              {theme === "dark" ? "Tema claro" : "Tema escuro"}
            </Acao>
          ) : null}
          <Acao role="menuitem" onClick={onLogout}>
            <span className="ic"><Icon name="sair" size={16} /></span>
            Sair
          </Acao>
        </div>
      )}
    </div>
  );
}
