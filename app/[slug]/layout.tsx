import type { Viewport } from "next";

/* Isolado de propósito : sem Brand Library CE.X, sem CSS do Service. A cor da
   página é da igreja (ver AGENTS.md §2). Mobile-first porque o tráfego real é
   o navegador interno do Instagram/WhatsApp. */

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0E110D",
};

export default function IgrejaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/igreja-page.css" />
      {/* fontes do logo em texto (LOGO_FONTS em app/lib/church-page.ts) : só
          as igrejas que escolhem "Texto" usam, mas carregar a família toda
          aqui é mais simples do que montar a URL do Google Fonts dinâmica
          por página, e o peso é pequeno (6 famílias, um request só). */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@700&family=Bebas+Neue&family=Pacifico&family=Oswald:wght@600&display=swap"
      />
      {children}
    </>
  );
}
