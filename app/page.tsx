"use client";

import { useEffect } from "react";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import styles from "./page.module.css";
import MateriaisContent from "./components/MateriaisContent";

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

      {/* MATERIAIS — catálogo completo embutido */}
      <div id="materiais">
        <div className="pg-wrap" style={{ paddingTop: 80, paddingBottom: 0 }}>
          <div className="psec-eyebrow">◆ Recursos gratuitos</div>
          <div className="psec-title" style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: 8 }}>Materiais</div>
        </div>
        <MateriaisContent showHero={false} showCrossLink={false} />
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

      {/* QUIZ — SUA VOCAÇÃO */}
      <div className="pg-wrap pg-section">
        <div className="capture">
          <div className="capture-x">X</div>
          <div className="capture-eyebrow">◆ Descubra seu chamado</div>
          <h3 className="capture-title">Sua <em>Vocação</em></h3>
          <p className="capture-desc">
            Qual dos cinco ministérios de Efésios 4:11 representa o seu chamado? Responda 12 perguntas e descubra onde sua liderança tem mais impacto.
          </p>
          <a href="/quiz" className="capture-btn">Fazer o quiz →</a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
