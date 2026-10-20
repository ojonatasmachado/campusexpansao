/* Vídeo incorporado pelo link colado (v7 4.4): YouTube (sem cookies) e
   Instagram (embed oficial). Link de outro lugar não é aceito. */
export type Video = { tipo: "youtube" | "instagram"; src: string };

export function videoDoLink(link?: string | null): Video | null {
  const t = (link ?? "").trim();
  if (!t) return null;
  let u: URL;
  try { u = new URL(t.startsWith("http") ? t : `https://${t}`); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const id = /^[\w-]{6,}$/;
  if (host === "youtu.be") {
    const v = u.pathname.slice(1).split("/")[0];
    return id.test(v) ? { tipo: "youtube", src: `https://www.youtube-nocookie.com/embed/${v}` } : null;
  }
  if (host === "youtube.com" || host === "music.youtube.com") {
    const v = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1] ?? "";
    return id.test(v) ? { tipo: "youtube", src: `https://www.youtube-nocookie.com/embed/${v}` } : null;
  }
  if (host === "instagram.com") {
    const m = u.pathname.match(/^\/(p|reel|tv)\/([\w-]+)/);
    return m ? { tipo: "instagram", src: `https://www.instagram.com/${m[1]}/${m[2]}/embed` } : null;
  }
  return null;
}
