export const metadata = {
  title: "CE.X · Links",
  description: "Links rápidos da CE.X · Campus Expansão",
};

const links = [
  {
    label: "Descubra Seu Ministério",
    desc: "Quiz — identifique seu chamado",
    href: "/quiz",
    highlight: true,
  },
  // Adicione novos links aqui seguindo o mesmo padrão
];

export default function LinksPage() {
  return (
    <>
      <style>{`
        body { background: var(--ink); }
        .links-wrap {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          gap: 0;
        }
        .links-logo {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -0.05em;
          margin-bottom: 6px;
        }
        .links-bio {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 48px;
        }
        .links-list {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .link-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: var(--graphite);
          border: 0.5px solid var(--border-2);
          border-radius: var(--r-lg);
          padding: 18px 22px;
          text-decoration: none;
          color: var(--white);
          transition: border-color 0.18s, background 0.18s;
        }
        .link-item:hover {
          border-color: var(--olive-line);
          background: var(--card);
        }
        .link-item.highlight {
          border-color: var(--olive-line);
          background: var(--olive-dim);
        }
        .link-item.highlight:hover {
          background: rgba(122,158,63,0.16);
        }
        .link-label {
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }
        .link-desc {
          font-size: 12px;
          color: var(--muted);
          font-family: var(--mono);
          letter-spacing: 0.04em;
        }
        .links-footer {
          margin-top: 48px;
          font-family: var(--mono);
          font-size: 10px;
          color: var(--subtle);
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
      `}</style>

      <div className="links-wrap">
        <div className="links-logo">
          CE<span style={{ color: "var(--olive)" }}>.</span>
          <span style={{ color: "var(--olive)" }}>X</span>
        </div>
        <div className="links-bio">Campus Expansão</div>

        <div className="links-list">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`link-item${link.highlight ? " highlight" : ""}`}
            >
              <span className="link-label">{link.label}</span>
              {link.desc && <span className="link-desc">{link.desc}</span>}
            </a>
          ))}
        </div>

        <div className="links-footer">campusexpansao.vercel.app</div>
      </div>
    </>
  );
}
