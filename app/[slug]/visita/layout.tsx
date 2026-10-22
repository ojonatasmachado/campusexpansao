import type { Viewport } from "next";
/* Autocadastro do visitante: mesma casca das telas de entrada do Service
   (AuthShell + .login-*), com as cores da igreja. CSS do Service só nesta
   rota, igual ao /[slug]/entrar. */
import "../../../evolucoes/service_app/service-app.css";
import "../../service/ui/biblioteca.css";

/* mesmo viewport do /service: área segura do celular (viewport-fit=cover) */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#0E110D",
};

export default function VisitaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
