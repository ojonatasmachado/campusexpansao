"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();
  const link = (href: string, label: string) => (
    <li>
      <Link href={href} className={`nav-link${pathname === href ? " active" : ""}`}>
        {label}
      </Link>
    </li>
  );

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">
        CE<span className="dot">.</span><span className="x">X</span>
      </Link>
      <ul className="nav-links">
        {link("/", "Início")}
        {link("/materiais", "Materiais")}
        {link("/cursos", "Cursos & Mentorias")}
        {link("/#sobre", "Sobre")}
      </ul>
      <Link href="/materiais" className="nav-cta">Comece agora</Link>
    </nav>
  );
}
