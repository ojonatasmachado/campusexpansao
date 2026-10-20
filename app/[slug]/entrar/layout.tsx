import type { Viewport } from "next";
/* O login da igreja usa a mesma cara do app que o membro abre em seguida:
   CSS do Service (+ v5) só nesta rota. O layout de /[slug] continua isolado
   pra Página pública (igreja-page.css), que não muda. */
import "../../../evolucoes/service_app/service-app.css";

/* mesmo viewport do /service (áreas seguras do celular, service-v5.css §6) */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0E110D",
};

export default function EntrarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
