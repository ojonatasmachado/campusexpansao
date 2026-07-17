"use client";

/* Único componente cliente da rota pública : embrulha o <a> de cada link e
   registra o clique (fire-and-forget) antes de deixar o navegador seguir o
   href normalmente. */

export default function TrackedLink({
  href,
  churchId,
  linkId,
  className,
  children,
  preview,
}: {
  href: string;
  churchId: string;
  linkId: string;
  className?: string;
  children: React.ReactNode;
  preview?: boolean;
}) {
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (preview) {
      e.preventDefault();
      return;
    }
    try {
      fetch("/api/igreja/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ churchId, kind: "click", linkId }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* silencioso : tracking nunca pode travar o clique real */
    }
  };

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
      {children}
    </a>
  );
}
