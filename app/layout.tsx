import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
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
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
