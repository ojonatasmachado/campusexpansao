"use client";
import Nav from "../../../components/Nav";
import Footer from "../../../components/Footer";

const mensagens = [
  {
    num: "01",
    title: "Tem vozes demais aqui",
    meta: "1 Samuel 3:1-10 · Abertura da série",
    arquivo: "/downloads/muito-barulho/mensagem-1-tem-vozes-demais-aqui.docx",
  },
  {
    num: "02",
    title: "Você não é só o que dizem",
    meta: "Jeremias 1:4-10 · Identidade e insegurança",
    arquivo: "/downloads/muito-barulho/mensagem-2-voce-nao-e-so-o-que-dizem.docx",
  },
  {
    num: "03",
    title: "Não espera crescer para viver de verdade",
    meta: "1 Timóteo 4:12 · Chamado e exemplo",
    arquivo: "/downloads/muito-barulho/mensagem-3-nao-espera-crescer.docx",
  },
  {
    num: "04",
    title: "Luz no lugar onde você está",
    meta: "Mateus 5:13-16 · Missão cotidiana",
    arquivo: "/downloads/muito-barulho/mensagem-4-luz-no-lugar-onde-voce-esta.docx",
  },
  {
    num: "05",
    title: "A voz que chama também envia",
    meta: "Efésios 2:10 · João 10:27 · Resposta e próximos passos",
    arquivo: "/downloads/muito-barulho/mensagem-5-a-voz-que-chama-tambem-envia.docx",
  },
];

export default function MuitoBarulho() {
  return (
    <div className="pg">
      <Nav />

      {/* HERO */}
      <div className="home-hero">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="hero-x" aria-hidden="true">X</div>
        <div className="pg-wrap">
          <div className="hero-inner">
            <div className="hero-eyebrow">Série para Adolescentes · 13 a 17 anos</div>
            <h1 className="hero-title">
              Muito <em>Barulho</em>
            </h1>
            <p className="hero-desc">
              Quando todo mundo fala, como ouvir a voz certa? Cinco mensagens sobre chamado, identidade e discernimento espiritual, para adolescentes que vivem cercados de vozes.
            </p>
            <div className="hero-actions">
              <a href="#mensagens" className="btn btn-primary btn-lg btn-arrow">
                Ver mensagens
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* VISÃO GERAL */}
      <div className="pg-wrap pg-section">
        <div className="psec-head">
          <div className="psec-head-left">
            <div className="psec-eyebrow">Base bíblica · 1 Samuel 3:1-10</div>
            <div className="psec-title">Sobre a <em>série</em></div>
          </div>
        </div>

        <div className="card-grid">
          <div className="card" style={{ background: "var(--graphite)" }}>
            <div className="card-body">
              <div className="card-eyebrow">O ponto de entrada</div>
              <h3 className="card-title">Uma dor <em>real</em></h3>
              <p className="card-desc">
                Adolescentes estão cercados de vozes: notificações, comparação, escola, redes, amizades, medo, cobrança. A série começa nessa tensão e conduz até a pergunta bíblica central: qual voz está formando a minha vida?
              </p>
            </div>
          </div>
          <div className="card" style={{ background: "var(--graphite)" }}>
            <div className="card-body">
              <div className="card-eyebrow">O objetivo</div>
              <h3 className="card-title">Chamado no <em>presente</em></h3>
              <p className="card-desc">
                Mostrar que chamado começa antes do palco, antes do cargo e antes da performance. Começa quando Deus chama alguém pelo nome, forma esse coração pela Palavra e envia para viver como luz onde ele já está.
              </p>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="stats-strip" style={{ marginTop: 48 }}>
          <div className="stat-item">
            <div className="stat-item-num">5</div>
            <div className="stat-item-label">Mensagens completas</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-num"><em>13</em> a 17</div>
            <div className="stat-item-label">Faixa etária</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-num">1<em>S</em></div>
            <div className="stat-item-label">Samuel 3:1-10 · texto-eixo</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-num"><em>Word</em></div>
            <div className="stat-item-label">Editável · sem senha</div>
          </div>
        </div>
      </div>

      {/* JORNADA DAS MENSAGENS */}
      <div className="pg-wrap" style={{ paddingBottom: 32 }}>
        <div className="psec-eyebrow" style={{ marginBottom: 32 }}>A jornada em cinco etapas</div>
        <div className="course-grid">
          <div className="course">
            <div className="course-num">01</div>
            <h3 className="course-title">Vozes demais</h3>
            <p className="course-desc">Localiza a dor: há vozes demais tentando guiar o adolescente. Deus continua chamando pelo nome, mas é preciso aprender a ouvir.</p>
          </div>
          <div className="course">
            <div className="course-num">02</div>
            <h3 className="course-title">Identidade</h3>
            <p className="course-desc">Confronta rótulos. Deus chama antes da insegurança definir, antes da comparação rotular e antes das pessoas decidirem o valor de alguém.</p>
          </div>
          <div className="course">
            <div className="course-num">03</div>
            <h3 className="course-title">Agora</h3>
            <p className="course-desc">Adolescência não é intervalo espiritual. Paulo não pede que Timóteo espere ser mais velho. Chama para exemplo na palavra, amor, fé e pureza.</p>
          </div>
          <div className="course">
            <div className="course-num">04</div>
            <h3 className="course-title">Missão cotidiana</h3>
            <p className="course-desc">O chamado aparece na escola, em casa, na internet, nas amizades. Jesus não chama para fugir do mundo, mas para ser luz onde você já está.</p>
          </div>
          <div className="course">
            <div className="course-num">05</div>
            <h3 className="course-title">Resposta</h3>
            <p className="course-desc">A voz que chama também envia. Não para performance; para seguimento. A série termina com um próximo passo concreto de discipulado.</p>
          </div>
          <div className="course" style={{ borderColor: "var(--olive-line)", background: "var(--olive-dim)" }}>
            <div className="course-num" style={{ opacity: 1 }}>→</div>
            <h3 className="course-title">Cada mensagem inclui</h3>
            <p className="course-desc">Roteiro expandido · Base bíblica · Pontes culturais · Ação da semana · Perguntas para grupos · Conexão com a próxima etapa</p>
          </div>
        </div>
      </div>

      {/* LISTA DE DOWNLOAD */}
      <div className="pg-wrap pg-section" id="mensagens">
        <div className="psec-head">
          <div className="psec-head-left">
            <div className="psec-eyebrow">As mensagens</div>
            <div className="psec-title">As 5 <em>mensagens</em></div>
            <p className="psec-desc">Cada arquivo em Word, pronto para adaptar à linguagem do seu pregador.</p>
          </div>
        </div>
        <div className="mat-list">
          {mensagens.map((m) => (
            <a
              key={m.num}
              href={m.arquivo}
              download
              className="mat-item"
            >
              <div className="mat-num">{m.num}</div>
              <div className="mat-body">
                <div className="mat-title">{m.title}</div>
                <div className="mat-meta">{m.meta}</div>
              </div>
              <div className="mat-type">Word</div>
            </a>
          ))}
        </div>
      </div>

      {/* DEPOIMENTO / FRASE */}
      <div className="pg-wrap pg-section tight">
        <div className="testimonial">
          <div className="testi-mark">&ldquo;</div>
          <p className="testi-quote">
            Nem toda voz que chama você <em>merece guiar você.</em>
          </p>
          <div className="testi-author">
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--olive-deep)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Frase-mãe da série · Muito Barulho
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="pg-wrap pg-section">
        <div className="capture">
          <div className="capture-x">X</div>
          <div className="capture-eyebrow">Acompanhe os lançamentos</div>
          <h3 className="capture-title">Mais séries <em>chegando</em></h3>
          <p className="capture-desc">
            Cadastre-se para receber as próximas séries em primeira mão, com acesso antecipado quando abrirem no checkout.
          </p>
          <form className="capture-form" onSubmit={(e) => e.preventDefault()}>
            <input className="input" type="email" placeholder="Seu melhor e-mail" />
            <button type="submit" className="capture-btn">Quero receber</button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}
