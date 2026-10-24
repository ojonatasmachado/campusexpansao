import type { Metadata, Viewport } from "next";
import { familyById } from "./lib/theme";
import "../../evolucoes/service_app/service-app.css";
/* mapa da igreja: CSS do módulo, depois do Service */
import "./modules/mapa/mapa.css";
/* visual das peças da biblioteca (lei 17), por último para vencer as regras antigas */
import "./ui/biblioteca.css";
import PwaBootstrap from "./PwaBootstrap";
import DialogosAcessiveis from "./DialogosAcessiveis";
import { ServiceLocaleProvider } from "./lib/internacional/contexto";
import { getServiceInternational, getTexto } from "./lib/internacional/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const text = await getTexto();
  return {
    title: text("CE.X Service · Gestão ministerial"),
    description: text("Plataforma de gestão de pessoas, escala e agenda para igrejas CE.X."),
    manifest: "/service-manifest.json",
  };
}

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

export default async function ServiceLayout({ children }: { children: React.ReactNode }) {
  const international = await getServiceInternational();
  return (
    <ServiceLocaleProvider {...international}>
      {children}
      <PwaBootstrap />
      <DialogosAcessiveis />
    </ServiceLocaleProvider>
  );
}
