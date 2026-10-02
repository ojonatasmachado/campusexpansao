"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./lib/icons";

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
}: {
  name: string;
  roleLabel: string;
  photoUrl?: string | null;
  churchPageUrl?: string | null;
  onLogout: () => void;
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
  const initials = (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2)).toUpperCase();

  return (
    <div className="top-user" ref={ref}>
      <button className="top-user-btn" type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <span className={`av av-sm${photoUrl ? " has-foto" : ""}`} style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}>
          {initials}
        </span>
        <span className="top-user-name">{parts[0]}</span>
      </button>
      {open && (
        <div className="top-user-pop" role="menu">
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
          <button type="button" role="menuitem" onClick={onLogout}>
            <span className="ic"><Icon name="sair" size={16} /></span>
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
