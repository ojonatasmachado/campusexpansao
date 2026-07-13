"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import ThemeToggle from "./ThemeToggle";
import Logo from "./Logo";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

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
          <Logo />
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
          <div className="nav-auth-actions" style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
            <ThemeToggle compact />
            <button
              type="button"
              onClick={() => setProfileOpen((current) => !current)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--cream)",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontFamily: "inherit",
                padding: 0,
              }}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
            >
              <span style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--olive)",
                color: "var(--accent-ink, #0E110D)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
              }}>
                {userName[0]?.toUpperCase()}
              </span>
              {userName}
            </button>
            {profileOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  right: 0,
                  top: 40,
                  width: 210,
                  background: "var(--graphite)",
                  border: "1px solid var(--border-2)",
                  borderRadius: 8,
                  padding: 8,
                  boxShadow: "0 18px 42px rgba(0,0,0,.35)",
                }}
              >
                <Link href="/perfil" role="menuitem" onClick={() => setProfileOpen(false)} style={menuItemStyle}>
                  Minhas compras
                </Link>
                <Link href="/conta" role="menuitem" onClick={() => setProfileOpen(false)} style={menuItemStyle}>
                  Minha conta
                </Link>
                <button
                  role="menuitem"
                  onClick={() => { setProfileOpen(false); handleLogout(); }}
                  style={{ ...menuItemStyle, width: "100%", background: "transparent", border: "none", textAlign: "left" }}
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="nav-auth-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ThemeToggle compact />
            <Link href="/login" className="nav-login-cta">Entrar</Link>
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
        <div className="nav-drawer-theme">
          <ThemeToggle />
        </div>
        {user ? (
          <>
            <Link href="/perfil" className="nav-drawer-link" onClick={() => setOpen(false)}>
              Minhas compras
            </Link>
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
            <Link href="/login" className="nav-drawer-cta" onClick={() => setOpen(false)}>
              Entrar
            </Link>
          </>
        )}
      </div>
    </>
  );
}

const menuItemStyle: React.CSSProperties = {
  borderRadius: 6,
  color: "var(--light)",
  cursor: "pointer",
  display: "block",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  padding: "10px 12px",
  textDecoration: "none",
};
