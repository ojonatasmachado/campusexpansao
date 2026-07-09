import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import MetricsTracker from "./components/MetricsTracker";

export const metadata: Metadata = {
  title: "CE.X · Campus Expansão",
  description: "Formação que expande: cursos, materiais e comunidade para quem quer crescer de verdade.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "(function(){try{var t=localStorage.getItem('cex-theme')||'dark';if(t!=='light'&&t!=='dark')t='dark';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.dataset.theme='dark';document.documentElement.style.colorScheme='dark';}})();",
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Brand Library v2.0 (tokens/components/sections/domain/ui + loja.css)
            carregada em app/(site)/layout.tsx: só as rotas do site público e
            do admin herdam. /service tem seu próprio sistema de CSS. */}
        {/* admin.css carregado apenas no painel admin */}
      </head>
      <body suppressHydrationWarning>
        <Suspense fallback={null}>
          <MetricsTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
