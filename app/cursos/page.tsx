import Nav from "../components/Nav";
import Footer from "../components/Footer";
import { CursosNiveis } from "../components/CursoCard";

export default function Cursos() {
  return (
    <div className="pg">
      <Nav />

      <div className="pg-wrap pg-section">
        <div className="hero-eyebrow" style={{ display: "flex" }}>◆ Formação ao vivo</div>
        <h1 className="t-display" style={{ marginBottom: 16 }}>Cursos &amp; <em>trilhas</em></h1>
        <p className="t-body-lg" style={{ maxWidth: 560 }}>
          Programas de formação com mentoria. Da fundação da estrutura ao discipulado que multiplica.
        </p>
      </div>

      <div className="pg-wrap pg-section tight">
        <CursosNiveis />
      </div>

      {/* CROSS-LINK PARA MATERIAIS */}
      <div className="pg-wrap" style={{ paddingBottom: 64 }}>
        <div style={{
          background: "var(--graphite)",
          border: "0.5px solid var(--border-2)",
          borderRadius: "var(--r-lg)",
          padding: "32px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--olive)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>◆ Comece antes da próxima turma</div>
            <p style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--white)" }}>
              Quer começar agora, sem esperar turma?
            </p>
          </div>
          <a href="/materiais" className="btn btn-primary btn-arrow">Ver materiais editáveis</a>
        </div>
      </div>

      <div className="pg-wrap pg-section">
        <div className="cta-block">
          <div className="cta-x">X</div>
          <div className="cta-eyebrow">◆ Próxima turma</div>
          <h2 className="cta-title">Garanta sua <em>vaga.</em></h2>
          <p className="cta-desc">As turmas ao vivo são limitadas. Entre na lista de espera e seja avisado primeiro.</p>
          <div className="cta-actions">
            <a href="/landing" className="btn btn-ink btn-lg btn-arrow">Entrar na lista</a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
