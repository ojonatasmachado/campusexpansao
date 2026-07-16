import type { Metadata, Viewport } from "next";
import "../../evolucoes/service_app/service.css";
import "../../evolucoes/service_app/service-v2.css";
import "../../evolucoes/service_app/service-v3.css";
import PwaBootstrap from "./PwaBootstrap";

export const metadata: Metadata = {
  title: "CE.X Service · Gestão ministerial",
  description: "Plataforma de gestão de pessoas, escala e agenda para igrejas CE.X.",
  manifest: "/service-manifest.json",
};

export const viewport: Viewport = {
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
