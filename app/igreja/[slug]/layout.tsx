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
      {children}
    </>
  );
}
