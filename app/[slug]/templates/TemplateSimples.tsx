import type { ChurchPageData } from "../../lib/church-page";
import LinkThumb from "../LinkThumb";
import LogoMark from "../LogoMark";
import TrackedLink from "../TrackedLink";
import { groupLinks, formatPostDate } from "../group-links";

/* Modelo "Simples" : lista vertical de botões, sem foto de capa, foco em ir
   direto ao ponto. Ideal pra igrejas pequenas com poucos links. */

export default function TemplateSimples({ data, preview }: { data: ChurchPageData; preview?: boolean }) {
  const groups = groupLinks(data.links);

  return (
    <>
      <header className="cx-header">
        <LogoMark data={data} />
        {data.pagina.logoMode !== "texto" && <h1 className="cx-name">{data.name}</h1>}
        {data.pagina.bio && <p className="cx-bio">{data.pagina.bio}</p>}
      </header>

      {groups.map((group) => (
        <div key={group.label || "geral"}>
          {group.label && <div className="cx-group-label">{group.label}</div>}
          <div className="cx-links">
            {group.items.map((link) => (
              <TrackedLink key={link.id} href={link.url} churchId={data.id} linkId={link.id} className="cx-link" preview={preview}>
                <LinkThumb imageUrl={link.imageUrl} icon={link.icon} label={link.label} />
                {link.label}
              </TrackedLink>
            ))}
          </div>
        </div>
      ))}

      {data.posts.length > 0 && (
        <>
          <div className="cx-section-title">Novidades</div>
          <div className="cx-posts">
            {data.posts.map((post) => (
              <article key={post.id} className="cx-post">
                {post.pinned && <span className="cx-post-pin">Fixado</span>}
                <h2 className="cx-post-title">{post.title}</h2>
                <p className="cx-post-date">{formatPostDate(post.publishedAt)}</p>
                {post.body && <p className="cx-post-body">{post.body}</p>}
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
