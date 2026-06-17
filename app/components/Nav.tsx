"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const isActive = (href: string) => pathname === href;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const links = [
    { href: "/", label: "Início" },
    { href: pathname === "/" ? "#materiais" : "/materiais", label: "Materiais", scrollId: pathname === "/" ? "materiais" : undefined },
    { href: "/cursos", label: "Cursos & Mentorias" },
    { href: pathname === "/" ? "#sobre" : "/#sobre", label: "Sobre", scrollId: pathname === "/" ? "sobre" : undefined },
    { href: "/quiz", label: "Sua Vocação" },
  ];

  const userName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "";

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
              <Link
                href={l.href}
                className={`nav-link${isActive(l.href) ? " active" : ""}`}
                onClick={l.scrollId ? (e) => { e.preventDefault(); scrollTo(l.scrollId!); } : undefined}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Auth area desktop */}
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/conta"
              style={{
                color: "var(--cream)",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--olive)",
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
              }}>
                {userName[0]?.toUpperCase()}
              </span>
              {userName}
            </Link>
            <button
              onClick={handleLogout}
              style={{
                background: "none",
                border: "1px solid var(--border-2)",
                borderRadius: 6,
                padding: "5px 12px",
                color: "var(--muted)",
                fontFamily: "inherit",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Sair
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link
              href="/perfil"
              style={{
                color: "var(--cream)",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                border: "1px solid var(--border-2)",
                borderRadius: 8,
                padding: "8px 12px",
              }}
            >
              Área do comprador
            </Link>
            <Link
              href="/login"
              style={{
                color: "var(--muted)",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Entrar
            </Link>
            <Link href="/materiais" className="nav-cta">Comece agora</Link>
          </div>
        )}

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
            onClick={l.scrollId ? (e) => { e.preventDefault(); setOpen(false); scrollTo(l.scrollId!); } : () => setOpen(false)}
          >
            {l.label}
          </Link>
        ))}
        {user ? (
          <>
            <Link href="/conta" className="nav-drawer-link" onClick={() => setOpen(false)}>
              Minha conta
            </Link>
            <button
              onClick={() => { setOpen(false); handleLogout(); }}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted)",
                fontFamily: "inherit",
                fontSize: 15,
                padding: "16px 24px",
                textAlign: "left",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Sair
            </button>
          </>
        ) : (
          <>
            <Link href="/perfil" className="nav-drawer-link" onClick={() => setOpen(false)}>
              Área do comprador
            </Link>
            <Link href="/login" className="nav-drawer-link" onClick={() => setOpen(false)}>
              Entrar
            </Link>
            <Link href="/login?redirect=/conta" className="nav-drawer-cta" onClick={() => setOpen(false)}>
              Criar conta →
            </Link>
          </>
        )}
      </div>
    </>
  );
}
