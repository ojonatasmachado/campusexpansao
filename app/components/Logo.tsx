// Fonte única do wordmark CE.X (AGENTS.md §1): "CE" peso 700, ".X" peso 700
// em oliva (--olive / #7A9E3F), nunca itálico, sempre Inter. A cor de "CE"
// herda do contexto (o wrapper de cada tela já define isso); só o que a
// marca não permite variar fica fixo aqui.
export default function Logo({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{ fontWeight: 700, fontStyle: "normal", fontFamily: "Inter, sans-serif" }}
    >
      CE
      <span style={{ color: "#7A9E3F", fontWeight: 700, fontStyle: "normal" }}>.X</span>
    </span>
  );
}
