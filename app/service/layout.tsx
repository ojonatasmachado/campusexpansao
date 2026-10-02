import type { Metadata, Viewport } from "next";
import "../../evolucoes/service_app/service.css";
import "../../evolucoes/service_app/service-v2.css";
import "../../evolucoes/service_app/service-v3.css";
import "../../evolucoes/service_app/service-v4.css";
import "../../evolucoes/service_app/service-v5.css";
import "../../evolucoes/service_app/service-v6.css";
import PwaBootstrap from "./PwaBootstrap";

export const metadata: Metadata = {
  title: "CE.X Service · Gestão ministerial",
  description: "Plataforma de gestão de pessoas, escala e agenda para igrejas CE.X.",
  manifest: "/service-manifest.json",
};

/* viewportFit "cover": o app ocupa a tela inteira do celular e o CSS v5
   afasta o que é fixo do notch, da Dynamic Island e da barra de gestos
   (--safe-*, seção 6 do service-v5.css). Só no Service: o site e a
   Página pública da igreja continuam sem cover. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0E110D",
};

export default function ServiceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PwaBootstrap />
    </>
  );
}
