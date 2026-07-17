import type { ChurchPageData } from "../../lib/church-page";
import LinkThumb from "../LinkThumb";
import LogoMark from "../LogoMark";
import TrackedLink from "../TrackedLink";
import { groupLinks, formatPostDate } from "../group-links";

/* Modelo "Editorial" : a notícia/aviso mais recente entra em destaque logo
   abaixo do cabeçalho (tipo capa de revista), links agrupados por
   ministério/frente abaixo, demais notícias no fim. */

export default function TemplateEditorial({ data, preview }: { data: ChurchPageData; preview?: boolean }) {
  const groups = groupLinks(data.links);
  const [featured, ...rest] = data.posts;

  return (
    <>
      <header className="cx-header">
        <LogoMark data={data} />
        {data.pagina.logoMode !== "texto" && <h1 className="cx-name">{data.name}</h1>}
        {data.pagina.bio && <p className="cx-bio">{data.pagina.bio}</p>}
      </header>

      {featured && (
        <article className="cx-post cx-post-featured">
          {featured.coverUrl && <img src={featured.coverUrl} alt="" className="cx-post-cover" />}
          {featured.pinned && <span className="cx-post-pin">Fixado</span>}
          <h2 className="cx-post-title">{featured.title}</h2>
          <p className="cx-post-date">{formatPostDate(featured.publishedAt)}</p>
          {featured.body && <p className="cx-post-body">{featured.body}</p>}
        </article>
      )}

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

      {rest.length > 0 && (
        <>
          <div className="cx-section-title">Mais novidades</div>
          <div className="cx-posts">
            {rest.map((post) => (
              <article key={post.id} className="cx-post">
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
