import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import MetricsTracker from "./components/MetricsTracker";
import "./loja.css";

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
        <link rel="stylesheet" href="/tokens.css" />
        <link rel="stylesheet" href="/components.css" />
        <link rel="stylesheet" href="/sections.css" />
        <link rel="stylesheet" href="/domain.css" />
        <link rel="stylesheet" href="/ui.css" />
        {/* loja.css importado via module import acima — cache busting automático */}
        {/* admin.css carregado apenas no painel admin */}
        <script src="/library.js" defer></script>
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
