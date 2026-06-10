import { notFound } from "next/navigation";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import { CURSOS_DATA, CURSOS_EM_ORDEM, NIVEIS } from "../../lib/cursos-data";
import { ACCENTS } from "../../lib/accents";

export function generateStaticParams() {
  return CURSOS_DATA.map(c => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const curso = CURSOS_DATA.find(c => c.slug === slug);
  if (!curso) return {};
  return { title: `${curso.title} · CE.X`, description: curso.promessa };
}

export default async function CursoDetalhe({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const curso = CURSOS_DATA.find(c => c.slug === slug);
  if (!curso) notFound();

  const nivel = NIVEIS.find(n => n.key === curso.nivel) ?? NIVEIS[0];
  const accent = ACCENTS[nivel.accent] ?? ACCENTS.olive;
  const relacionados = CURSOS_DATA.filter(c => c.nivel === curso.nivel && c.slug !== curso.slug);

  return (
    <div className="pg">
      <Nav />

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <div className="pg-wrap pg-section" style={{ paddingBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em",
            textTransform: "uppercase", color: accent.base,
          }}>◆ {nivel.label}</div>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.10em",
            textTransform: "uppercase", background: accent.base,
            color: "#0E110D", padding: "3px 8px", borderRadius: 4, fontWeight: 700,
          }}>● AO VIVO</div>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.10em",
            textTransform: "uppercase", color: "var(--muted)",
          }}>ETAPA {curso.num.padStart(2, "0")} de 06 · {curso.dur}</div>
        </div>
        <h1 style={{
          fontSize: "clamp(32px,6vw,56px)", fontWeight: 800, letterSpacing: "-0.03em",
          lineHeight: 1.05, color: "var(--white)", marginBottom: 20,
        }}>{curso.title}</h1>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: "#C9BFA0", maxWidth: 580, marginBottom: 32 }}>
          {curso.promessa}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/landing" className="btn btn-primary btn-lg btn-arrow"
            style={{ background: accent.base, borderColor: accent.base, color: "#0E110D" }}>
            Entrar na lista de espera
          </a>
          <a href="/cursos" className="btn btn-secondary btn-lg">Ver todos os cursos</a>
        </div>
      </div>

      {/* ── PRA QUEM É ──────────────────────────────────────────────────── */}
      <div className="pg-wrap pg-section tight">
        <div className="psec-eyebrow" style={{ color: accent.base }}>◆ Pra quem é</div>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--light)", maxWidth: 640 }}>
          {curso.praQuem}
        </p>
      </div>

      {/* ── A TRILHA ────────────────────────────────────────────────────── */}
      <div className="pg-wrap pg-section tight">
        <div className="psec-eyebrow" style={{ color: accent.base }}>◆ A trilha</div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--white)", marginBottom: 24 }}>
          Etapa {curso.num.padStart(2, "0")} de 06
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {CURSOS_EM_ORDEM.map((c, i) => {
            const isAtual = c.slug === curso.slug;
            const acentoItem = ACCENTS[NIVEIS.find(n => n.key === c.nivel)?.accent ?? "olive"] ?? ACCENTS.olive;
            return (
              <a key={c.slug} href={`/cursos/${c.slug}`} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 16px", borderRadius: 8,
                background: isAtual ? `${accent.base}18` : "transparent",
                border: `1px solid ${isAtual ? accent.base + "44" : "#25291F"}`,
                textDecoration: "none",
                transition: "background 0.2s",
              }}>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em",
                  color: isAtual ? accent.base : "var(--muted)", minWidth: 24,
                }}>{c.num.padStart(2, "0")}</span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: acentoItem.base,
                  background: `${acentoItem.base}18`, padding: "2px 6px", borderRadius: 3,
                  minWidth: 80, textAlign: "center",
                }}>{NIVEIS.find(n => n.key === c.nivel)!.label}</span>
                <span style={{
                  fontSize: 14, fontWeight: isAtual ? 700 : 400,
                  color: isAtual ? "var(--white)" : "var(--muted)",
                  flex: 1,
                }}>{c.title}</span>
                {isAtual && (
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: accent.base,
                  }}>← você está aqui</span>
                )}
              </a>
            );
          })}
        </div>
      </div>

      {/* ── EMENTA ──────────────────────────────────────────────────────── */}
      <div className="pg-wrap pg-section tight">
        <div className="psec-eyebrow" style={{ color: accent.base }}>◆ Ementa semana a semana</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          {curso.ementa.map((s) => (
            <div key={s.semana} style={{
              display: "flex", gap: 20, padding: "20px 24px",
              background: "var(--graphite)", border: "1px solid #25291F",
              borderRadius: 10,
            }}>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em",
                color: accent.base, minWidth: 64, paddingTop: 2,
              }}>SEM {String(s.semana).padStart(2, "0")}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--white)", marginBottom: 4 }}>
                  {s.titulo}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: "#C9BFA0" }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── COMO É ──────────────────────────────────────────────────────── */}
      <div className="pg-wrap pg-section tight">
        <div className="psec-eyebrow" style={{ color: accent.base }}>◆ Como é</div>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--light)", maxWidth: 560 }}>
          {curso.formato}
        </p>
      </div>

      {/* ── MENTOR ──────────────────────────────────────────────────────── */}
      <div className="pg-wrap pg-section tight">
        <div className="psec-eyebrow" style={{ color: accent.base }}>◆ Mentor</div>
        <div style={{
          display: "flex", gap: 24, alignItems: "flex-start",
          padding: "24px 28px", background: "var(--graphite)",
          border: "1px solid #25291F", borderRadius: 12, maxWidth: 560,
          flexWrap: "wrap",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
            background: `${accent.base}30`, border: `1px solid ${accent.base}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--mono)", fontSize: 14, fontWeight: 700, color: accent.base,
          }}>
            {curso.mentor.split(" ").map(w => w[0]).slice(0, 2).join("")}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--white)", marginBottom: 4 }}>
              {curso.mentor}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: "#C9BFA0" }}>{curso.mentorBio}</div>
          </div>
        </div>
      </div>

      {/* ── DEPOIMENTO ──────────────────────────────────────────────────── */}
      <div className="pg-wrap pg-section tight">
        <div className="testimonial">
          <div className="testi-mark">&ldquo;</div>
          <p className="testi-quote">{curso.depoimento.texto}</p>
          <div className="testi-author">
            <div className="testi-avatar" />
            <div>
              <div className="testi-name">{curso.depoimento.autor}</div>
              <div className="testi-role">{curso.depoimento.cargo}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TURMA + CTA ─────────────────────────────────────────────────── */}
      <div className="pg-wrap pg-section">
        <div className="cta-block">
          <div className="cta-x">X</div>
          <div className="cta-eyebrow" style={{ color: accent.base }}>◆ Próxima turma</div>
          <h2 className="cta-title">Garanta sua <em>vaga.</em></h2>
          <p className="cta-desc">
            Próxima turma: <strong>{curso.turma}</strong> · Vagas limitadas · Mentoria inclusa.
          </p>
          <div className="cta-actions">
            <a href="/landing" className="btn btn-ink btn-lg btn-arrow"
              style={{ background: accent.base, borderColor: accent.base, color: "#0E110D" }}>
              Entrar na lista de espera
            </a>
          </div>
        </div>
      </div>

      {/* ── RELACIONADOS ────────────────────────────────────────────────── */}
      {relacionados.length > 0 && (
        <div className="pg-wrap" style={{ paddingBottom: 64 }}>
          <div style={{
            background: "var(--graphite)", border: "1px solid #25291F",
            borderRadius: 14, padding: "32px 36px",
          }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: accent.base, marginBottom: 16 }}>
              ◆ Da mesma trilha
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {relacionados.map(r => (
                <a key={r.slug} href={`/cursos/${r.slug}`} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  gap: 16, padding: "12px 0",
                  borderBottom: "1px solid #25291F", textDecoration: "none",
                  flexWrap: "wrap",
                }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--white)" }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{r.dur}</div>
                  </div>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: accent.base }}>Ver curso →</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CROSS-LINK MATERIAIS ─────────────────────────────────────────── */}
      <div className="pg-wrap" style={{ paddingBottom: 64 }}>
        <div style={{
          background: "var(--graphite)", border: "0.5px solid var(--border-2)",
          borderRadius: "var(--r-lg)", padding: "32px 40px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          gap: 24, flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--olive)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>◆ Quer começar agora?</div>
            <p style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--white)" }}>
              Sem esperar turma: veja os materiais editáveis.
            </p>
          </div>
          <a href="/materiais" className="btn btn-primary btn-arrow">Ver materiais</a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
