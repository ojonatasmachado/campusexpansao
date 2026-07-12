export default function Footer({ minimal = false }: { minimal?: boolean }) {
  if (minimal) {
    return (
      <footer className="footer">
        <div className="footer-x">X</div>
        <div className="pg-wrap">
          <div className="footer-bottom" style={{ borderTop: "none", paddingTop: 0 }}>
            <div className="footer-copy">© 2026 Campus Expansão · campusexpansao.com</div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="footer">
      <div className="footer-x">X</div>
      <div className="pg-wrap">
        <div className="footer-top">
          <div>
            <div className="footer-brand-logo">
              CE<span className="dot">.</span><span className="x">X</span>
            </div>
            <p className="footer-brand-text">
              Preparamos trabalhadores para a <em>Grande Comissão</em>.
            </p>
          </div>
          <div>
            <div className="footer-col-title">Conteúdo</div>
            <ul className="footer-links">
              <li><a href="/materiais" className="footer-link">Materiais</a></li>
              <li><a href="/cursos" className="footer-link">Cursos</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Institucional</div>
            <ul className="footer-links">
              <li><a href="/sobre" className="footer-link">Sobre</a></li>
              <li><a href="/sobre" className="footer-link">Missão</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Comece</div>
            <ul className="footer-links">
              <li><a href="/landing" className="footer-link">Baixar manual</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">© 2026 Campus Expansão · campusexpansao.com</div>
        </div>
      </div>
    </footer>
  );
}
