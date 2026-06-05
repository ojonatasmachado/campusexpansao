"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    document.querySelectorAll(".faq-q").forEach((q) =>
      q.addEventListener("click", () =>
        (q.parentElement as HTMLElement)?.classList.toggle("open")
      )
    );
  }, []);

  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          CE<span className="dot">.</span><span className="x">X</span>
        </a>
        <div className="nav-links">
          <a href="#cursos" className="nav-link">Cursos</a>
          <a href="#materiais" className="nav-link">Materiais</a>
          <a href="#sobre" className="nav-link">Sobre</a>
        </div>
        <a href="#inscricao" className="btn btn-primary btn-sm nav-cta">Começar agora</a>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="hero-x" aria-hidden="true">X</div>
        <div className="hero-inner">
          <span className="hero-eyebrow t-eyebrow">Campus Expansão</span>
          <h1 className="hero-title t-display">
            Formação que <em>expande</em>
          </h1>
          <p className="hero-desc t-body-lg">
            Cursos, materiais e comunidade para quem quer crescer de verdade —
            sem atalhos, com método.
          </p>
          <div className="hero-actions">
            <a href="#inscricao" className="btn btn-primary btn-lg btn-arrow">
              Começar agora
            </a>
            <a href="#cursos" className="btn btn-ghost btn-lg">
              Ver cursos
            </a>
          </div>
        </div>
      </section>

      {/* CURSOS */}
      <section id="cursos" style={{ padding: "96px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="psec-head">
          <div className="psec-head-left">
            <span className="psec-eyebrow t-eyebrow">Formações</span>
            <h2 className="psec-title t-h1">Cursos disponíveis</h2>
            <p className="psec-desc t-body">
              Cada curso foi construído com foco em resultado real — não em horas assistidas.
            </p>
          </div>
        </div>
        <div className="course-grid">
          {[
            { num: "01", title: "Fundamentos da Fé", desc: "Bases teológicas sólidas para uma vida cristã madura e frutífera." },
            { num: "02", title: "Liderança Servil", desc: "Como liderar com autoridade e humildade ao mesmo tempo." },
            { num: "03", title: "Comunicação & Pregação", desc: "Ferramentas práticas para comunicar a Palavra com clareza e poder." },
          ].map((c) => (
            <div className="course" key={c.num}>
              <span className="course-num t-eyebrow">{c.num}</span>
              <h3 className="course-title t-h3">{c.title}</h3>
              <p className="course-desc t-body">{c.desc}</p>
              <div className="course-foot">
                <a href="#inscricao" className="btn btn-secondary btn-sm btn-arrow">
                  Saiba mais
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CAPTURA / INSCRIÇÃO */}
      <section id="inscricao" className="capture">
        <span className="capture-eyebrow t-eyebrow">Lista de espera</span>
        <h2 className="capture-title t-h1">
          Pronto para <em>expandir</em>?
        </h2>
        <p className="capture-desc t-body-lg">
          Entre na lista e receba acesso antecipado, materiais gratuitos e as
          novidades da CE.X antes de todo mundo.
        </p>
        <form className="capture-form" onSubmit={(e) => e.preventDefault()}>
          <div className="field">
            <label className="field-label req">Seu nome</label>
            <input className="input" type="text" placeholder="Como você se chama?" />
          </div>
          <div className="field">
            <label className="field-label req">E-mail</label>
            <input className="input" type="email" placeholder="seu@email.com" />
          </div>
          <button type="submit" className="btn btn-cream btn-lg capture-btn btn-arrow">
            Quero entrar
          </button>
        </form>
      </section>

      {/* DEPOIMENTO */}
      <section style={{ padding: "96px 24px", maxWidth: 720, margin: "0 auto" }}>
        <div className="testimonial">
          <span className="testi-mark">◆</span>
          <blockquote className="testi-quote t-h2">
            "A CE.X mudou completamente a forma como estudo e aplico a Palavra.
            Conteúdo denso, mas acessível."
          </blockquote>
          <footer className="testi-author">
            <div className="testi-avatar">JM</div>
            <div>
              <div className="testi-name">João Machado</div>
              <div className="testi-role">Aluno — Turma 2025</div>
            </div>
          </footer>
        </div>
      </section>

      {/* FAQ */}
      <section id="sobre" style={{ padding: "0 24px 96px", maxWidth: 720, margin: "0 auto" }}>
        <div className="psec-head" style={{ marginBottom: 40 }}>
          <span className="psec-eyebrow t-eyebrow">Dúvidas frequentes</span>
          <h2 className="psec-title t-h2">Perguntas comuns</h2>
        </div>
        <div className="faq">
          {[
            { q: "Para quem é a CE.X?", a: "Para qualquer pessoa que queira crescer na fé com seriedade — independente de denominação ou nível de conhecimento." },
            { q: "Os cursos têm certificado?", a: "Sim. Todos os cursos emitem certificado de conclusão digital após aprovação nas avaliações." },
            { q: "Posso assistir no meu ritmo?", a: "Sim. Todo o conteúdo é gravado e fica disponível para você assistir quando e onde quiser." },
          ].map((item, i) => (
            <div className="faq-item" key={i}>
              <button className="faq-q">
                <span className="faq-q-text">{item.q}</span>
                <span className="faq-icon">+</span>
              </button>
              <div className="faq-a t-body">{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="cta-block" style={{ margin: "0 24px 96px" }}>
        <span className="cta-eyebrow t-eyebrow">CE.X · Campus Expansão</span>
        <h2 className="cta-title t-h1">
          O próximo passo é <em>seu</em>
        </h2>
        <p className="cta-desc t-body-lg">
          Junte-se a centenas de alunos que estão expandindo sua compreensão da
          fé e da vida.
        </p>
        <div className="cta-actions">
          <a href="#inscricao" className="btn btn-primary btn-lg btn-arrow">
            Entrar na lista
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-top">
          <div>
            <div className="footer-brand-logo">
              CE<span className="dot">.</span><span className="x">X</span>
            </div>
            <p className="t-small" style={{ marginTop: 8, maxWidth: 280 }}>
              Campus Expansão — formação que expande fé, caráter e capacidade.
            </p>
          </div>
          <div>
            <div className="footer-col-title">Links</div>
            <ul className="footer-links">
              <li><a href="#cursos">Cursos</a></li>
              <li><a href="#sobre">Sobre</a></li>
              <li><a href="#inscricao">Inscrição</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Contato</div>
            <ul className="footer-links">
              <li><a href="mailto:contato@campusexpansao.com.br">contato@campusexpansao.com.br</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} CE.X · Campus Expansão</span>
          <div className="footer-social">
            <a href="#">Instagram</a>
            <a href="#">YouTube</a>
          </div>
        </div>
      </footer>
    </>
  );
}
