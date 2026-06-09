export const metadata = {
  title: "Sua Vocação · CE.X",
  description: "Quiz: identifique qual dos cinco ministérios de Efésios 4:11 representa seu chamado.",
};

export default function QuizPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0E110D" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        height: 48,
        borderBottom: "0.5px solid rgba(255,255,255,0.08)",
        flexShrink: 0,
      }}>
        <a href="/" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--mono, monospace)",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)",
          textDecoration: "none",
        }}>
          ← Voltar para a home
        </a>
      </div>
      <iframe
        src="/quiz/index.html"
        style={{ width: "100%", flex: 1, border: "none", display: "block" }}
        title="Sua Vocação · Descubra Seu Ministério"
      />
    </div>
  );
}
