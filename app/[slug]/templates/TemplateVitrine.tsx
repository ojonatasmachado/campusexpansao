import type { ChurchPageData } from "../../lib/church-page";
import LinkThumb from "../LinkThumb";
import LogoMark from "../LogoMark";
import TrackedLink from "../TrackedLink";
import { groupLinks, formatPostDate } from "../group-links";

/* Modelo "Vitrine" : capa no topo com o logo sobreposto (estilo perfil de
   rede social), links em cards com ícone visível, notícias em destaque logo
   abaixo do cabeçalho. */

export default function TemplateVitrine({ data, preview }: { data: ChurchPageData; preview?: boolean }) {
  const groups = groupLinks(data.links);

  return (
    <>
      {data.pagina.coverUrl && <img src={data.pagina.coverUrl} alt="" className="cx-cover" />}
      <header className="cx-header">
        <LogoMark data={data} />
        {data.pagina.logoMode !== "texto" && <h1 className="cx-name">{data.name}</h1>}
        {data.pagina.bio && <p className="cx-bio">{data.pagina.bio}</p>}
      </header>

      {data.posts.length > 0 && (
        <div className="cx-posts">
          {data.posts.slice(0, 3).map((post) => (
            <article key={post.id} className="cx-post">
              {post.coverUrl && <img src={post.coverUrl} alt="" className="cx-post-cover" />}
              {post.pinned && <span className="cx-post-pin">Fixado</span>}
              <h2 className="cx-post-title">{post.title}</h2>
              <p className="cx-post-date">{formatPostDate(post.publishedAt)}</p>
              {post.body && <p className="cx-post-body">{post.body}</p>}
            </article>
          ))}
        </div>
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
    </>
  );
}
