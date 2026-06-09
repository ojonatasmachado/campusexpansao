"use client";

import { useEffect } from "react";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import styles from "./page.module.css";

const cursos = [
  { num: "01", title: "Fundamentos da estrutura", desc: "Por que estrutura honra o agir de Deus. O alicerce de todo ministério que multiplica.", dur: "4 semanas" },
  { num: "02", title: "Formação de líderes", desc: "Como identificar, treinar e soltar líderes que não dependem de você pra funcionar.", dur: "6 semanas" },
  { num: "03", title: "Discipulado intencional", desc: "Um sistema de discipulado que nasce com data pra multiplicar, não só informar.", dur: "8 semanas" },
  { num: "04", title: "Gestão de equipe", desc: "Reuniões que decidem, processos que documentam, pessoas que crescem com o sistema.", dur: "5 semanas" },
  { num: "05", title: "Plantação de igrejas", desc: "Estrutura mínima viável pra plantar com saúde e multiplicar com intenção.", dur: "10 semanas" },
  { num: "06", title: "Liderança e descanso", desc: "Como liderar sem queimar. Ritmo sustentável pra quem carrega muita responsabilidade.", dur: "4 semanas" },
];

export default function Home() {
  useEffect(() => {
    document.querySelectorAll(".faq-q").forEach((q) =>
      q.addEventListener("click", () =>
        (q.parentElement as HTMLElement)?.classList.toggle("open")
      )
    );
  }, []);

  return (
    <div className="pg">
      <Nav />

      {/* HERO */}
      <div className="home-hero">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="hero-x" aria-hidden="true">X</div>
        <div className="pg-wrap">
          <div className="hero-inner">
            <div className="hero-eyebrow">Campus Expansão</div>
            <h1 className="hero-title">
              Nós preparamos.<br /><em>Deus multiplica.</em>
            </h1>
            <p className="hero-desc">
              Estrutura ministerial para líderes de igreja locais. Materiais, formação e ferramentas pra preparar trabalhadores fiéis.
            </p>
            <div className="hero-actions">
              <a href="/landing" className="btn btn-primary btn-lg btn-arrow">Baixar manual gratuito</a>
              <a href="/cursos" className="btn btn-secondary btn-lg">Conhecer cursos</a>
            </div>
          </div>
        </div>
      </div>

      {/* O QUE É A CE.X */}
      <div id="sobre" className="pg-wrap pg-section">
        <div className="psec-eyebrow">◆ O que é a CE.X</div>
        <p className="about-lead" style={{ marginBottom: 40 }}>
          A maioria das igrejas não tem problema de fé. Tem problema de <em>estrutura.</em>
        </p>
        <div className="about-cols" style={{ marginTop: 0 }}>
          <div className="about-col">
            <p>A CE.X existe para preparar trabalhadores, porque a colheita é grande e o preparo não pode ser negligente.</p>
            <p>Não substituímos o agir de Deus. Preparamos o que cabe a nós.</p>
          </div>
          <div className="about-col">
            <p>Começamos formando líderes dentro de uma única igreja local. O método funcionou, multiplicou, e virou Campus Expansão: um sistema replicável de preparo ministerial.</p>
            <p>Hoje servimos centenas de equipes que querem crescer com saúde, sem depender de uma pessoa só.</p>
          </div>
        </div>
        <div className="about-values" style={{ marginTop: 40 }}>
          <div className="value">
            <div className="value-letter">CE</div>
            <div className="value-title">Campus Expansão</div>
            <div className="value-desc">A parte que cabe a nós: ensino, estrutura, preparo, formação.</div>
          </div>
          <div className="value">
            <div className="value-letter">.</div>
            <div className="value-title">Multiplicação</div>
            <div className="value-desc">O ponto que une o trabalho humano ao agir divino.</div>
          </div>
          <div className="value">
            <div className="value-letter">X</div>
            <div className="value-title">Variável divina</div>
            <div className="value-desc">O crescimento que só Deus dá e que nos mantém em dependência.</div>
          </div>
        </div>
        <div style={{ marginTop: 40 }}>
          <a href="/sobre" className="btn btn-secondary btn-arrow">Conhecer a CE.X</a>
        </div>
      </div>

      {/* PROVA — STATS */}
      <div className="pg-wrap">
        <div className="stats-strip">
          <div className="stat-item">
            <div className="stat-item-num">+2<em>mil</em></div>
            <div className="stat-item-label">Líderes formados</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-num">12</div>
            <div className="stat-item-label">Cursos &amp; trilhas</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-num">40<em>+</em></div>
            <div className="stat-item-label">Materiais gratuitos</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-num">6</div>
            <div className="stat-item-label">Anos de estrada</div>
          </div>
        </div>
      </div>

      {/* DEPOIMENTO */}
      <div className="pg-wrap pg-section tight">
        <div className="testimonial">
          <div className="testi-mark">&ldquo;</div>
          <p className="testi-quote">
            A CE.X mudou como eu enxergo liderança. Parei de <em>apagar incêndio</em> e comecei a construir sistema.
          </p>
          <div className="testi-author">
            <div className="testi-avatar" />
            <div>
              <div className="testi-name">Pr. Ricardo Almeida</div>
              <div className="testi-role">Igreja Batista Renovo · São Paulo</div>
            </div>
          </div>
        </div>
      </div>

      {/* TEASER MATERIAIS */}
      <div id="materiais" className="pg-wrap pg-section">
        <div className="psec-head">
          <div className="psec-head-left">
            <div className="psec-eyebrow">◆ Recursos gratuitos</div>
            <div className="psec-title">Materiais</div>
          </div>
          <a href="/materiais" className="btn btn-ghost btn-arrow">Ver catálogo completo</a>
        </div>
        <div className="card-grid">
          <article className="card">
            <div className="card-media">
              <div className="card-media-x">X</div>
              <span className="card-tag">Apostila</span>
            </div>
            <div className="card-body">
              <div className="card-eyebrow">Material gratuito</div>
              <h3 className="card-title">A igreja que <em>discipula</em></h3>
              <p className="card-desc">Seis módulos para estruturar o discipulado da sua igreja.</p>
              <div className="card-foot">
                <span className="card-meta">PDF · 64 páginas</span>
                <a href="/landing" className="card-link">Baixar</a>
              </div>
            </div>
          </article>
          <article className="card card-cream">
            <div className="card-media" style={{ background: "linear-gradient(135deg,#94B85C 0%,#4F6B26 100%)" }}>
              <div className="card-media-x" style={{ color: "rgba(14,17,13,0.1)" }}>X</div>
              <span className="card-tag" style={{ background: "rgba(14,17,13,0.4)" }}>Curso</span>
            </div>
            <div className="card-body">
              <div className="card-eyebrow">Formação · 6 semanas</div>
              <h3 className="card-title">Estrutura de <em>equipe</em></h3>
              <p className="card-desc">Da dependência de uma pessoa ao sistema que sustenta.</p>
              <div className="card-foot">
                <span className="card-meta">Online · ao vivo</span>
                <a href="/cursos" className="card-link">Inscrever</a>
              </div>
            </div>
          </article>
        </div>
        <div style={{ marginTop: 20 }}>
          <article className="card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <div className="card-media" style={{ height: "100%", minHeight: 180, background: "linear-gradient(135deg,var(--ink) 0%,var(--graphite) 100%)", position: "relative" }}>
              <div style={{ position: "absolute", right: -20, bottom: -40, fontSize: 160, fontWeight: 700, fontStyle: "italic", color: "rgba(122,158,63,0.12)", lineHeight: 0.8, pointerEvents: "none" }}>X</div>
              <span className="card-tag" style={{ position: "relative", zIndex: 1 }}>Série · 5 mensagens</span>
            </div>
            <div className="card-body">
              <div className="card-eyebrow">Série para adolescentes · 13 a 17 anos</div>
              <h3 className="card-title">Muito <em>Barulho</em></h3>
              <p className="card-desc">Cinco mensagens gratuitas sobre chamado, identidade e discernimento.</p>
              <div className="card-foot">
                <span className="card-meta">Word · 5 arquivos · gratuito</span>
                <a href="/series/muito-barulho" className="card-link">Acessar</a>
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* TEASER CURSOS */}
      <div id="cursos" className="pg-wrap pg-section">
        <div className="psec-head">
          <div className="psec-head-left">
            <div className="psec-eyebrow">◆ Formação ao vivo</div>
            <div className="psec-title">Cursos &amp; <em>trilhas</em></div>
          </div>
          <a href="/cursos" className="btn btn-ghost btn-arrow">Conhecer formação ao vivo</a>
        </div>
        <div className="course-grid">
          {cursos.map((c) => (
            <div className="course" key={c.num}>
              <div className="course-num">{c.num}</div>
              <h3 className="course-title">{c.title}</h3>
              <p className="course-desc">{c.desc}</p>
              <div className="course-foot">
                <span className="course-dur">{c.dur}</span>
                <a href="/cursos" className="course-link">Detalhes</a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className={`pg-wrap pg-section ${styles.faqSection}`}>
        <div className="psec-head">
          <div className="psec-head-left">
            <div className="psec-eyebrow">◆ Dúvidas frequentes</div>
            <div className="psec-title">Perguntas</div>
          </div>
        </div>
        <div className="faq">
          {[
            { q: "Para quem é a CE.X?", a: "Para líderes de igrejas locais que querem preparar sua equipe com estrutura, independente de denominação ou tamanho da igreja." },
            { q: "Os materiais são realmente gratuitos?", a: "Sim. Todo o conteúdo da biblioteca é gratuito. Só pedimos seu e-mail para liberar o acesso." },
            { q: "Os cursos têm acompanhamento?", a: "Sim. As turmas ao vivo têm mentoria e acompanhamento direto. O conteúdo gravado fica disponível para assistir no seu ritmo." },
            { q: "Como funciona o método CE.X?", a: "Estrutura ministerial aplicada: diagnóstico, princípios bíblicos e ferramentas práticas que você implementa na mesma semana." },
          ].map((item, i) => (
            <div className="faq-item" key={i}>
              <button className="faq-q" type="button">
                <span className="faq-q-text">{item.q}</span>
                <span className="faq-icon" aria-hidden="true" />
              </button>
              <div className="faq-a">{item.a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA FINAL */}
      <div className="pg-wrap pg-section">
        <div className="cta-block">
          <div className="cta-x">X</div>
          <div className="cta-eyebrow">◆ Comece hoje</div>
          <h2 className="cta-title">Prepare sua <em>equipe.</em></h2>
          <p className="cta-desc">Baixe o manual gratuito e dê o primeiro passo pra estruturar seu ministério.</p>
          <div className="cta-actions">
            <a href="/landing" className="btn btn-ink btn-lg btn-arrow">Baixar manual</a>
            <a href="#" className="btn btn-lg" style={{ background: "transparent", color: "var(--ink)", borderColor: "rgba(14,17,13,0.3)" }}>Falar conosco</a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
