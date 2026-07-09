import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import { CursosNiveis } from "../../components/CursoCard";
import { supabase } from "../../lib/supabase";

export const revalidate = 60;

export default async function Cursos() {
  const [{ data: cursosDb }, { data: mentoriasDb }] = await Promise.all([
    supabase.from('cursos').select('*').eq('status', 'Publicado').order('num'),
    supabase.from('mentorias').select('*').eq('status', 'Publicado').order('created_at'),
  ])

  return (
    <div className="pg">
      <Nav />

      {/* HERO : mesma estrutura da página de Materiais */}
      <div className="loja-hero pg-wrap" style={{ paddingTop: 80, paddingBottom: 56 }}>
        <div className="loja-hero-tag">◆ Formação ao vivo</div>
        <h1 className="loja-hero-title">
          Cursos &amp;<br />Mentorias
        </h1>
        <p className="loja-hero-desc">
          Uma trilha por nível. Você entra onde está e sobe quando estiver pronto.
        </p>
      </div>

      {/* CURSOS POR NÍVEL */}
      <div className="pg-wrap" style={{ paddingBottom: 56 }}>
        <CursosNiveis dbCursos={cursosDb ?? undefined} dbMentorias={mentoriasDb ?? undefined} />
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
            <p style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--white)", margin: 0 }}>
              Quer começar agora, sem esperar turma?
            </p>
          </div>
          <a href="/materiais" className="btn btn-primary btn-arrow">Ver materiais editáveis</a>
        </div>
      </div>

      {/* CTA LISTA DE ESPERA */}
      <div className="pg-wrap" style={{ paddingBottom: 80 }}>
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
