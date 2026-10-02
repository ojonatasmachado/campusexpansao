import type { ReactNode } from "react";
import ChurchLockup from "./ChurchLockup";

/* Casca única das telas de entrada do Service: login da gestão, login da
   igreja, convite, senha nova e primeiro acesso da conta. Mesmo desenho do
   protótipo: cartão central, marca da igreja no topo, título grande,
   formulário com rótulo visível. As cores vêm do <ServiceTheme> que a
   página (server) renderiza antes. CSS: .login-* (service.css + v5). */
export default function AuthShell({
  logoUrl,
  churchName,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  logoUrl?: string | null;
  churchName?: string | null;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="login">
      <div className="login-grid" aria-hidden="true" />
      <section className="login-card">
        <div className="login-logo">
          <ChurchLockup logoUrl={logoUrl} name={churchName} size="lg" />
        </div>
        {eyebrow ? <p className="login-eyebrow">{eyebrow}</p> : null}
        <h1 className="login-title">{title}</h1>
        {subtitle ? <p className="login-sub">{subtitle}</p> : null}
        {children}
        {footer ? (
          <>
            <div className="login-sep" />
            <div className="login-note">{footer}</div>
          </>
        ) : null}
      </section>
    </main>
  );
}
