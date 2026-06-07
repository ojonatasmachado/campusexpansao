import Nav from "../components/Nav";
import Footer from "../components/Footer";

export default function Sobre() {
  return (
    <div className="pg">
      <Nav />

      <div className="pg-wrap about-hero">
        <div className="hero-eyebrow" style={{ display: "flex" }}>— Quem somos</div>
        <p className="about-lead">
          A CE.X existe para <em>preparar trabalhadores</em> — porque a colheita é grande, e o preparo não pode ser negligente.
        </p>
      </div>

      <div className="pg-wrap pg-section tight">
        <div className="about-cols">
          <div className="about-col">
            <h3>Nossa <em>missão</em></h3>
            <p>Equipar líderes de igrejas locais com a estrutura ministerial que falta entre a fé e o fruto. Não substituímos o agir de Deus — preparamos o que cabe a nós.</p>
            <p>Acreditamos que a maioria das igrejas não tem problema de fé. Tem problema de estrutura. E estrutura se aprende.</p>
          </div>
          <div className="about-col">
            <h3>Como <em>nascemos</em></h3>
            <p>Começamos formando líderes dentro de uma única igreja local. O método funcionou, multiplicou, e virou Campus Expansão — um sistema replicável de preparo ministerial.</p>
            <p>Hoje servimos centenas de equipes que querem crescer com saúde, sem depender de uma pessoa só.</p>
          </div>
        </div>
      </div>

      <div className="pg-wrap pg-section tight">
        <div className="psec-eyebrow">— A equação da marca</div>
        <div className="about-values">
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
            <div className="value-desc">O crescimento que só Deus dá — e que nos mantém em dependência.</div>
          </div>
        </div>
      </div>

      <div className="pg-wrap pg-section">
        <div className="cta-block">
          <div className="cta-x">X</div>
          <div className="cta-eyebrow">— Faça parte</div>
          <h2 className="cta-title">Caminhe <em>conosco.</em></h2>
          <p className="cta-desc">Receba os materiais e comece a estruturar seu ministério hoje.</p>
          <div className="cta-actions">
            <a href="/landing" className="btn btn-ink btn-lg btn-arrow">Baixar manual</a>
          </div>
        </div>
      </div>

      <Footer minimal />
    </div>
  );
}
