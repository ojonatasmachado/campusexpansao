import type { Metadata, Viewport } from "next";
import { familyById } from "./lib/theme";
import "../../evolucoes/service_app/service-app.css";
/* mapa da igreja: CSS do módulo, depois do Service */
import "./modules/mapa/mapa.css";
/* visual das peças da biblioteca (lei 17), por último para vencer as regras antigas */
import "./ui/biblioteca.css";
import PwaBootstrap from "./PwaBootstrap";
import DialogosAcessiveis from "./DialogosAcessiveis";

export const metadata: Metadata = {
  title: "CE.X Service · Gestão ministerial",
  description: "Plataforma de gestão de pessoas, escala e agenda para igrejas CE.X.",
  manifest: "/service-manifest.json",
};

/* viewportFit "cover": o app ocupa a tela inteira do celular e o CSS v5
   afasta o que é fixo do notch, da Dynamic Island e da barra de gestos
   (--safe-*, seção 6 do service-v5.css). Só no Service: o site e a
   Página da igreja continuam sem cover. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: familyById(undefined, "dark").tokens.ink,
};

export default function ServiceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PwaBootstrap />
      <DialogosAcessiveis />
    </>
  );
}
