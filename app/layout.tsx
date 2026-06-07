import type { Metadata } from "next";
import Head from "next/head";

export const metadata: Metadata = {
  title: "CE.X · Campus Expansão",
  description: "Formação que expande — cursos, materiais e comunidade para quem quer crescer de verdade.",
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
        <link rel="stylesheet" href="/pages.css" />
        <link rel="stylesheet" href="/loja.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
