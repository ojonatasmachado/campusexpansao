"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  const links = [
    { href: "/", label: "Início" },
    { href: pathname === "/" ? "#materiais" : "/materiais", label: "Materiais" },
    { href: "/cursos", label: "Cursos & Mentorias" },
    { href: "/sobre", label: "Sobre" },
    { href: "/quiz", label: "Sua Vocação" },
  ];

  return (
    <>
      <nav className="nav" style={{ position: "sticky", top: 0, zIndex: 100 }}>
        <Link href="/" className="nav-logo" onClick={() => setOpen(false)}>
          CE<span className="dot">.</span><span className="x">X</span>
        </Link>

        {/* Links desktop */}
        <ul className="nav-links">
          {links.map(l => (
            <li key={l.href}>
              <Link href={l.href} className={`nav-link${isActive(l.href) ? " active" : ""}`}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/materiais" className="nav-cta">Comece agora</Link>

        {/* Botão hamburguer (mobile) */}
        <button
          className={`nav-burger-btn${open ? " open" : ""}`}
          onClick={() => setOpen(o => !o)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* Drawer mobile */}
      <div className={`nav-drawer${open ? " open" : ""}`} aria-hidden={!open}>
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`nav-drawer-link${isActive(l.href) ? " active" : ""}`}
            onClick={() => setOpen(false)}
          >
            {l.label}
          </Link>
        ))}
        <Link href="/materiais" className="nav-drawer-cta" onClick={() => setOpen(false)}>
          Comece agora →
        </Link>
      </div>
    </>
  );
}
