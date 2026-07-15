import "../loja.css";
import AvaliacaoModal from "../components/AvaliacaoModal";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/tokens.css" />
      <link rel="stylesheet" href="/components.css" />
      <link rel="stylesheet" href="/sections.css" />
      <link rel="stylesheet" href="/domain.css" />
      <link rel="stylesheet" href="/pages.css" />
      <link rel="stylesheet" href="/ui.css" />
      {/* loja.css importado via module import acima: cache busting automático */}
      <script src="/library.js" defer></script>
      {children}
      {/* Só renderiza quando há usuário logado (cex.user_profiles) com
          enquete elegível — some sozinho no /admin (auth diferente, sem
          sessão Supabase). Ver app/lib/enquetes-site.ts. */}
      <AvaliacaoModal />
    </>
  );
}
