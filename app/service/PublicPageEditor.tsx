"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import QRCode from "react-qr-code";
import { createServiceBrowserClient } from "./lib/supabase-browser";
import { uploadServiceImage, imageExtension } from "./lib/upload-image";
import { Icon } from "./lib/icons";
import { ImageUpload } from "./ImageUpload";
import { AccentField } from "./AccentField";
import LinkIconView from "../lib/LinkIcon";
import { LINK_ICON_NAMES, DEFAULT_LINK_ICON } from "../lib/link-icons";
import { PAGINA_CFG_DEFAULT } from "../lib/church-page";
import type { PaginaCfg, PaginaSocial, PaginaTemplate, ChurchPageData } from "../lib/church-page";
import ChurchPageView from "../igreja/[slug]/ChurchPageView";

/* Editor da Página pública (link-in-bio) da igreja, aba "Página pública" em
   Configurações. Arquivo próprio (não dentro de ServiceExactApp.tsx, que já
   tem 10k+ linhas) : essa funcionalidade tem peso real (CRUD de links com
   reordenação, CRUD de notícias, seletor de modelo, QR code, preview ao
   vivo). Reaproveita AccentField (cor), ImageUpload (capa) e o próprio
   ChurchPageView da rota pública pra a pré-visualização ser exatamente igual
   ao que sai no ar, não uma imitação. */

const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "www", "service", "perfil", "materiais", "cursos",
  "sobre", "login", "cadastro", "novo", "editar", "home", "inicio", "igreja",
]);

type ChurchProp = {
  id: string;
  organizationId: string;
  nome: string;
  logoUrl?: string | null;
  slug?: string | null;
  settings?: { paginaCfg?: PaginaCfg; [key: string]: unknown };
};

type LinkItem = {
  id: string;
  label: string;
  url: string;
  icon: string;
  imageUrl: string | null;
  groupLabel: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  position: number;
  clickCount: number;
};

type PostItem = {
  id: string;
  title: string;
  body: string;
  coverUrl: string | null;
  pinned: boolean;
  publishedAt: string;
};

const TEMPLATES: { id: PaginaTemplate; label: string; desc: string }[] = [
  { id: "simples", label: "Simples", desc: "Lista de botões, direto ao ponto." },
  { id: "vitrine", label: "Vitrine", desc: "Capa no topo, links em cards." },
  { id: "editorial", label: "Editorial", desc: "Última notícia em destaque." },
];

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PublicPageEditor({ church, currentRole }: { church: ChurchProp; currentRole?: string }) {
  const router = useRouter();
  const canEdit = currentRole === "master" || currentRole === "pastor" || currentRole === "owner";

  const [pagina, setPagina] = useState<PaginaCfg>(() => ({ ...PAGINA_CFG_DEFAULT, ...(church.settings?.paginaCfg ?? {}) }));
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [linkModal, setLinkModal] = useState<{ draft: LinkItem; isNew: boolean } | null>(null);
  const [postModal, setPostModal] = useState<{ draft: PostItem; isNew: boolean } | null>(null);
  const [slugDraft, setSlugDraft] = useState(church.slug ?? "");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid" | "reserved">("idle");
  const [viewCount, setViewCount] = useState<number | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const client = () => createServiceBrowserClient().schema("service");

  const loadLinks = async () => {
    const { data } = await client()
      .from("church_links")
      .select("id,label,url,icon,image_url,group_label,starts_at,ends_at,active,position,click_count")
      .eq("church_id", church.id)
      .order("position", { ascending: true });
    const rows = (data ?? []) as Array<{ id: string; label: string; url: string; icon: string; image_url: string | null; group_label: string | null; starts_at: string | null; ends_at: string | null; active: boolean; position: number; click_count: number }>;
    setLinks(rows.map((row) => ({
      id: row.id,
      label: row.label,
      url: row.url,
      icon: row.icon,
      imageUrl: row.image_url,
      groupLabel: row.group_label ?? "",
      startsAt: toDatetimeLocal(row.starts_at),
      endsAt: toDatetimeLocal(row.ends_at),
      active: row.active,
      position: row.position,
      clickCount: row.click_count,
    })));
  };

  const loadPosts = async () => {
    const { data } = await client()
      .from("church_page_posts")
      .select("id,title,body,cover_url,pinned,published_at")
      .eq("church_id", church.id)
      .order("published_at", { ascending: false });
    const rows = (data ?? []) as Array<{ id: string; title: string; body: string | null; cover_url: string | null; pinned: boolean; published_at: string }>;
    setPosts(rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body ?? "",
      coverUrl: row.cover_url,
      pinned: row.pinned,
      publishedAt: row.published_at,
    })));
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    Promise.all([loadLinks(), loadPosts()]).finally(() => setLoading(false));
    client().from("church_page_views").select("id", { count: "exact", head: true }).eq("church_id", church.id).eq("kind", "view").then(({ count }) => setViewCount(count ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [church.id]);

  useEffect(() => {
    setPagina({ ...PAGINA_CFG_DEFAULT, ...(church.settings?.paginaCfg ?? {}) });
  }, [church.settings]);

  useEffect(() => {
    setSlugDraft(church.slug ?? "");
  }, [church.slug]);

  const savePagina = async (patch: Partial<PaginaCfg>) => {
    setPagina((prev) => ({ ...prev, ...patch }));
    /* lê o settings mais recente do banco antes de gravar, em vez de
       montar o objeto a partir do estado local (que pode estar
       desatualizado) : duas fotos salvas em sequência rápida (upload é
       assíncrono, demora) cada uma escrevendo a partir do `pagina`/`church`
       "congelados" no fechamento da função apagava o campo que a outra
       tinha acabado de salvar. Ler fresco por último reduz essa janela de
       corrida ao tamanho de uma consulta, não ao tempo de dois uploads. */
    const { data: currentRow } = await client().from("churches").select("settings").eq("id", church.id).maybeSingle();
    const currentSettings = (currentRow as { settings?: Record<string, unknown> } | null)?.settings ?? church.settings ?? {};
    const currentPagina = (currentSettings.paginaCfg as PaginaCfg | undefined) ?? {};
    const merged = { ...currentSettings, paginaCfg: { ...currentPagina, ...patch } };
    await client().from("churches").update({ settings: merged }).eq("id", church.id);
    router.refresh();
  };

  const saveSocial = (key: keyof PaginaSocial, value: string) => {
    savePagina({ social: { ...(pagina.social ?? {}), [key]: value || undefined } });
  };

  const checkSlug = async () => {
    const value = slugDraft.trim().toLowerCase();
    if (value === (church.slug ?? "")) { setSlugStatus("idle"); return; }
    if (!/^[a-z0-9-]{3,40}$/.test(value)) { setSlugStatus("invalid"); return; }
    if (RESERVED_SLUGS.has(value)) { setSlugStatus("reserved"); return; }
    setSlugStatus("checking");
    const { data } = await client().from("churches").select("id").eq("slug", value).neq("id", church.id).maybeSingle();
    setSlugStatus(data ? "taken" : "ok");
  };

  const saveSlug = async () => {
    if (slugStatus !== "ok") return;
    const value = slugDraft.trim().toLowerCase();
    await client().from("churches").update({ slug: value }).eq("id", church.id);
    setSlugStatus("idle");
    router.refresh();
  };

  const moveLink = async (id: string, dir: -1 | 1) => {
    const idx = links.findIndex((l) => l.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= links.length) return;
    const a = links[idx];
    const b = links[swapIdx];
    await Promise.all([
      client().from("church_links").update({ position: b.position }).eq("id", a.id),
      client().from("church_links").update({ position: a.position }).eq("id", b.id),
    ]);
    loadLinks();
  };

  const deleteLink = async (id: string) => {
    if (!confirm("Remover este link da página?")) return;
    await client().from("church_links").delete().eq("id", id);
    setLinkModal(null);
    loadLinks();
  };

  const saveLink = async (draft: LinkItem, isNew: boolean) => {
    const payload = {
      label: draft.label.trim() || "Link",
      url: draft.url.trim(),
      icon: draft.icon || DEFAULT_LINK_ICON,
      image_url: draft.imageUrl,
      group_label: draft.groupLabel.trim() || null,
      starts_at: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
      ends_at: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
      active: draft.active,
    };
    if (isNew) {
      await client().from("church_links").insert({
        id: draft.id,
        organization_id: church.organizationId,
        church_id: church.id,
        position: links.length,
        ...payload,
      });
    } else {
      await client().from("church_links").update(payload).eq("id", draft.id);
    }
    setLinkModal(null);
    loadLinks();
  };

  const deletePost = async (id: string) => {
    if (!confirm("Remover esta notícia da página?")) return;
    await client().from("church_page_posts").delete().eq("id", id);
    setPostModal(null);
    loadPosts();
  };

  const savePost = async (draft: PostItem, isNew: boolean) => {
    const payload = {
      title: draft.title.trim() || "Novidade",
      body: draft.body.trim() || null,
      cover_url: draft.coverUrl,
      pinned: draft.pinned,
    };
    if (isNew) {
      await client().from("church_page_posts").insert({
        id: draft.id,
        organization_id: church.organizationId,
        church_id: church.id,
        ...payload,
      });
    } else {
      await client().from("church_page_posts").update(payload).eq("id", draft.id);
    }
    setPostModal(null);
    loadPosts();
  };

  const baixarQr = async () => {
    if (!qrRef.current) return;
    try {
      const url = await toPng(qrRef.current, { pixelRatio: 3, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${church.slug || "pagina"}.png`;
      a.click();
    } catch {
      alert("Não consegui gerar o QR agora. Tente de novo.");
    }
  };

  const pageUrl = origin && church.slug ? `${origin}/igreja/${church.slug}` : "";
  const effectiveBgHex = pagina.bgMode === "imagem" ? "#0E110D" : pagina.bgMode === "degrade" ? (pagina.bgFrom ?? PAGINA_CFG_DEFAULT.bgFrom) : (pagina.bgColor ?? PAGINA_CFG_DEFAULT.bgColor);

  const previewData: ChurchPageData = {
    id: church.id,
    slug: church.slug || slugDraft || "sua-igreja",
    name: church.nome,
    logoUrl: church.logoUrl ?? null,
    pagina: {
      ...PAGINA_CFG_DEFAULT,
      ...pagina,
      bio: pagina.bio ?? "",
      coverUrl: pagina.coverUrl ?? null,
      social: pagina.social ?? {},
    },
    published: true,
    links: links.filter((l) => l.active).map((l) => ({ id: l.id, label: l.label, url: l.url, icon: l.icon, imageUrl: l.imageUrl, groupLabel: l.groupLabel || null })),
    posts: posts.map((p) => ({ id: p.id, title: p.title, body: p.body || null, coverUrl: p.coverUrl, pinned: p.pinned, publishedAt: p.publishedAt })),
  };

  if (!canEdit) {
    return <div className="empty">Só master ou pastor pode configurar a página pública.</div>;
  }

  return (
    <div className="cfg-grid2">
      <link rel="stylesheet" href="/igreja-page.css" />

      {/* ─── Publicar + endereço ─── */}
      <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cfg-card-t">Publicar página</div>
        <div className="cfg-card-s">Enquanto estiver desligada, a página existe mas mostra "ainda não publicada" pra quem acessar.</div>
        <div className="cfg-row" style={{ padding: "10px 0" }}>
          <div className="cfg-row-main">
            <div className="cfg-row-t">{pagina.enabled ? "Publicada" : "Despublicada"}</div>
            <div className="cfg-row-s">{viewCount !== null ? `${viewCount} visualizações até agora` : "Carregando estatísticas..."}</div>
          </div>
          <button type="button" className={`sw${pagina.enabled ? " on" : ""}`} onClick={() => savePagina({ enabled: !pagina.enabled })} />
        </div>

        <div className="field-label" style={{ marginTop: 14 }}>Endereço da página</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "var(--subtle)" }}>{origin.replace(/^https?:\/\//, "")}/igreja/</span>
          <input
            className="input"
            style={{ maxWidth: 220 }}
            value={slugDraft}
            placeholder="minha-igreja"
            onChange={(e) => { setSlugDraft(e.target.value.toLowerCase()); setSlugStatus("idle"); }}
            onBlur={checkSlug}
          />
          <button type="button" className="btn btn-sec btn-sm" disabled={slugStatus !== "ok"} onClick={saveSlug}>Salvar endereço</button>
          {pageUrl && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(pageUrl)}>
              <Icon name="copiar" size={13} /> Copiar link
            </button>
          )}
        </div>
        {slugStatus === "invalid" && <div className="brand-accent-warn">Use só letras minúsculas, números e hífen, de 3 a 40 caracteres.</div>}
        {slugStatus === "reserved" && <div className="brand-accent-warn">Este endereço é reservado, escolha outro.</div>}
        {slugStatus === "taken" && <div className="brand-accent-warn">Já tem outra igreja com este endereço.</div>}
        {slugStatus === "ok" && <div className="brand-accent-contrast">Disponível.</div>}

        {church.slug && (
          <div style={{ display: "flex", gap: 18, alignItems: "center", marginTop: 18, flexWrap: "wrap" }}>
            <div ref={qrRef} style={{ background: "#fff", padding: 10, borderRadius: 10 }}>
              <QRCode value={pageUrl || `${origin}/igreja/${church.slug}`} size={104} style={{ height: "auto", maxWidth: "100%", width: 104 }} viewBox="0 0 104 104" />
            </div>
            <div>
              <div className="cfg-row-s">QR code pronto pra colocar em boletim, cartaz ou tela de projeção.</div>
              <button type="button" className="btn btn-sec btn-sm" style={{ marginTop: 8 }} onClick={baixarQr}>Baixar QR code</button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modelo ─── */}
      <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cfg-card-t">Modelo</div>
        <div className="cfg-card-s">Muda o layout da página. As cores e os links continuam os mesmos.</div>
        <div className="opt-row">
          {TEMPLATES.map((tpl) => (
            <button key={tpl.id} type="button" className={`opt${pagina.template === tpl.id ? " on" : ""}`} onClick={() => savePagina({ template: tpl.id })}>
              <div className="opt-t">{tpl.label}</div>
              <div className="opt-s">{tpl.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Aparência ─── */}
      <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cfg-card-t">Aparência</div>
        <div className="cfg-card-s">O logo é o mesmo já enviado em Personalização. Aqui vão a bio, a capa e as cores só desta página.</div>

        <div className="field-label" style={{ marginTop: 10 }}>Bio (aparece embaixo do nome da igreja)</div>
        <textarea
          className="input"
          rows={2}
          value={pagina.bio ?? ""}
          onChange={(e) => setPagina((p) => ({ ...p, bio: e.target.value }))}
          onBlur={(e) => savePagina({ bio: e.target.value })}
          placeholder="Uma frase curta sobre a igreja"
        />

        <div style={{ marginTop: 14 }}>
          <ImageUpload
            label="Capa (banner do topo, modelo Vitrine)"
            hint="Tamanho ideal: 1200×500px."
            url={pagina.coverUrl}
            aspectRatio={2.4}
            onUpload={async (file) => {
              const path = `${church.organizationId}/paginas/${church.id}-capa.${imageExtension(file)}`;
              const url = await uploadServiceImage(createServiceBrowserClient(), file, path);
              await savePagina({ coverUrl: url });
            }}
            onRemove={() => savePagina({ coverUrl: undefined })}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          <BackgroundField pagina={pagina} onSave={savePagina} organizationId={church.organizationId} churchId={church.id} />
          <AccentField compact label="Cor do texto" bgHex={effectiveBgHex} value={pagina.textColor ?? PAGINA_CFG_DEFAULT.textColor} defaultHex={PAGINA_CFG_DEFAULT.textColor} onChange={(hex) => savePagina({ textColor: hex })} />
          <AccentField compact label="Cor de destaque (ícones e selos)" bgHex={effectiveBgHex} value={pagina.accentColor ?? PAGINA_CFG_DEFAULT.accentColor} defaultHex={PAGINA_CFG_DEFAULT.accentColor} onChange={(hex) => savePagina({ accentColor: hex })} />
          <AccentField compact label="Cor das caixas e balões" bgHex={effectiveBgHex} value={pagina.boxColor ?? PAGINA_CFG_DEFAULT.boxColor} defaultHex={PAGINA_CFG_DEFAULT.boxColor} onChange={(hex) => savePagina({ boxColor: hex })} />
        </div>
      </div>

      {/* ─── Links ─── */}
      <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
        <div className="panel-head" style={{ padding: 0, marginBottom: 10 }}>
          <span className="panel-title">Links</span>
          <button
            type="button"
            className="btn btn-pri btn-sm"
            onClick={() => setLinkModal({ isNew: true, draft: { id: crypto.randomUUID(), label: "", url: "", icon: DEFAULT_LINK_ICON, imageUrl: null, groupLabel: "", startsAt: "", endsAt: "", active: true, position: links.length, clickCount: 0 } })}
          >
            + Link
          </button>
        </div>
        {loading && <div className="empty">Carregando...</div>}
        {!loading && links.length === 0 && <div className="empty">Nenhum link ainda. Adicione o primeiro.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {links.map((link, idx) => (
            <div className="cfg-row" key={link.id}>
              {link.imageUrl ? (
                <img src={link.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover", flex: "none" }} />
              ) : (
                <span className="cx-link-icon" style={{ background: "var(--olive)", color: "#0E110D" }}><LinkIconView name={link.icon} size={16} /></span>
              )}
              <div className="cfg-row-main">
                <div className="cfg-row-t">{link.label || "(sem título)"} {!link.active && <span className="chip">oculto</span>}</div>
                <div className="cfg-row-s">{link.groupLabel ? `${link.groupLabel} · ` : ""}{link.url} · {link.clickCount} cliques</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button type="button" className="btn btn-ghost btn-sm" disabled={idx === 0} onClick={() => moveLink(link.id, -1)}>↑</button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={idx === links.length - 1} onClick={() => moveLink(link.id, 1)}>↓</button>
                <button type="button" className="btn btn-sec btn-sm" onClick={() => setLinkModal({ isNew: false, draft: link })}>Editar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Redes sociais ─── */}
      <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cfg-card-t">Redes sociais</div>
        <div className="cfg-card-s">Aparecem como ícones no rodapé da página. Deixe em branco o que não usar.</div>
        <div className="cfg-grid2" style={{ marginTop: 10 }}>
          <div>
            <div className="field-label">WhatsApp (só números, com DDD)</div>
            <input className="input" defaultValue={pagina.social?.whatsapp ?? ""} placeholder="5511999999999" onBlur={(e) => saveSocial("whatsapp", e.target.value)} />
          </div>
          <div>
            <div className="field-label">Instagram (link completo)</div>
            <input className="input" defaultValue={pagina.social?.instagram ?? ""} placeholder="https://instagram.com/suaigreja" onBlur={(e) => saveSocial("instagram", e.target.value)} />
          </div>
          <div>
            <div className="field-label">YouTube (link completo)</div>
            <input className="input" defaultValue={pagina.social?.youtube ?? ""} placeholder="https://youtube.com/@suaigreja" onBlur={(e) => saveSocial("youtube", e.target.value)} />
          </div>
          <div>
            <div className="field-label">Facebook (link completo)</div>
            <input className="input" defaultValue={pagina.social?.facebook ?? ""} placeholder="https://facebook.com/suaigreja" onBlur={(e) => saveSocial("facebook", e.target.value)} />
          </div>
          <div>
            <div className="field-label">TikTok (link completo)</div>
            <input className="input" defaultValue={pagina.social?.tiktok ?? ""} placeholder="https://tiktok.com/@suaigreja" onBlur={(e) => saveSocial("tiktok", e.target.value)} />
          </div>
          <div>
            <div className="field-label">Site (link completo)</div>
            <input className="input" defaultValue={pagina.social?.site ?? ""} placeholder="https://suaigreja.com" onBlur={(e) => saveSocial("site", e.target.value)} />
          </div>
        </div>
      </div>

      {/* ─── Notícias e avisos ─── */}
      <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
        <div className="panel-head" style={{ padding: 0, marginBottom: 10 }}>
          <span className="panel-title">Notícias e avisos</span>
          <button
            type="button"
            className="btn btn-pri btn-sm"
            onClick={() => setPostModal({ isNew: true, draft: { id: crypto.randomUUID(), title: "", body: "", coverUrl: null, pinned: false, publishedAt: new Date().toISOString() } })}
          >
            + Notícia
          </button>
        </div>
        {!loading && posts.length === 0 && <div className="empty">Nenhuma notícia publicada ainda.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {posts.map((post) => (
            <div className="cfg-row" key={post.id}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">{post.title} {post.pinned && <span className="chip chip-ok">fixado</span>}</div>
                <div className="cfg-row-s">{new Date(post.publishedAt).toLocaleDateString("pt-BR")}</div>
              </div>
              <button type="button" className="btn btn-sec btn-sm" onClick={() => setPostModal({ isNew: false, draft: post })}>Editar</button>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Preview ao vivo ─── */}
      <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cfg-card-t">Preview</div>
        <div className="cfg-card-s">Exatamente como a página fica pro visitante (os links não abrem aqui).</div>
        <div style={{ width: 300, maxWidth: "100%", height: 560, overflowY: "auto", borderRadius: 28, border: "8px solid #14170F", margin: "14px auto 0" }}>
          <ChurchPageView data={previewData} preview />
        </div>
      </div>

      {linkModal && (
        <LinkModal
          draft={linkModal.draft}
          isNew={linkModal.isNew}
          organizationId={church.organizationId}
          onCancel={() => setLinkModal(null)}
          onSave={(draft) => saveLink(draft, linkModal.isNew)}
          onDelete={linkModal.isNew ? undefined : () => deleteLink(linkModal.draft.id)}
        />
      )}

      {postModal && (
        <PostModal
          draft={postModal.draft}
          isNew={postModal.isNew}
          organizationId={church.organizationId}
          onCancel={() => setPostModal(null)}
          onSave={(draft) => savePost(draft, postModal.isNew)}
          onDelete={postModal.isNew ? undefined : () => deletePost(postModal.draft.id)}
        />
      )}
    </div>
  );
}

const BG_ANGLE_PRESETS: { angle: number; label: string }[] = [
  { angle: 180, label: "↓" },
  { angle: 135, label: "↘" },
  { angle: 90, label: "→" },
  { angle: 45, label: "↗" },
];

/* Cor de fundo da página : sólida, degradê (como no Studio) ou uma foto
   (com uma camada escura por cima, ajustável, pra sempre continuar dando
   pra ler o texto e os botões). Fica no próprio PublicPageEditor, não em
   AccentField.tsx, porque essa lógica é específica de fundo de página : não
   faz sentido pra cor de texto/destaque. */
function BackgroundField({ pagina, onSave, organizationId, churchId }: { pagina: PaginaCfg; onSave: (patch: Partial<PaginaCfg>) => void; organizationId: string; churchId: string }) {
  const mode = pagina.bgMode ?? "solida";
  const from = pagina.bgFrom ?? PAGINA_CFG_DEFAULT.bgFrom;
  const to = pagina.bgTo ?? PAGINA_CFG_DEFAULT.bgTo;
  const angle = pagina.bgAngle ?? PAGINA_CFG_DEFAULT.bgAngle;
  const overlay = pagina.bgOverlay ?? PAGINA_CFG_DEFAULT.bgOverlay;

  return (
    <div>
      <div className="field-label" style={{ marginBottom: 8 }}>Cor de fundo</div>
      <div className="opt-row" style={{ marginBottom: 10 }}>
        <button type="button" className={`opt${mode === "solida" ? " on" : ""}`} style={{ padding: "8px 14px" }} onClick={() => onSave({ bgMode: "solida" })}>
          <div className="opt-t">Sólida</div>
        </button>
        <button type="button" className={`opt${mode === "degrade" ? " on" : ""}`} style={{ padding: "8px 14px" }} onClick={() => onSave({ bgMode: "degrade" })}>
          <div className="opt-t">Degradê</div>
        </button>
        <button type="button" className={`opt${mode === "imagem" ? " on" : ""}`} style={{ padding: "8px 14px" }} onClick={() => onSave({ bgMode: "imagem" })}>
          <div className="opt-t">Imagem</div>
        </button>
      </div>

      {mode === "solida" && (
        <AccentField compact label="Cor de fundo" bgHex="#0E110D" value={pagina.bgColor ?? PAGINA_CFG_DEFAULT.bgColor} defaultHex={PAGINA_CFG_DEFAULT.bgColor} onChange={(hex) => onSave({ bgColor: hex })} />
      )}

      {mode === "degrade" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ height: 40, borderRadius: 10, background: `linear-gradient(${angle}deg, ${from}, ${to})`, border: "1px solid var(--border-2)" }} />
          <AccentField compact label="Cor inicial" bgHex="#0E110D" value={from} defaultHex={PAGINA_CFG_DEFAULT.bgFrom} onChange={(hex) => onSave({ bgFrom: hex })} />
          <AccentField compact label="Cor final" bgHex="#0E110D" value={to} defaultHex={PAGINA_CFG_DEFAULT.bgTo} onChange={(hex) => onSave({ bgTo: hex })} />
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Direção</div>
            <div style={{ display: "flex", gap: 8 }}>
              {BG_ANGLE_PRESETS.map((p) => (
                <button
                  key={p.angle}
                  type="button"
                  className={`opt${angle === p.angle ? " on" : ""}`}
                  style={{ width: 44, height: 44, padding: 0, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}
                  onClick={() => onSave({ bgAngle: p.angle })}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === "imagem" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <ImageUpload
            label="Foto de fundo"
            hint="Cobre a página inteira. Escureça um pouco pra manter os botões legíveis."
            url={pagina.bgImageUrl}
            aspectRatio={0.75}
            onUpload={async (file) => {
              const path = `${organizationId}/paginas/${churchId}-fundo.${imageExtension(file)}`;
              const url = await uploadServiceImage(createServiceBrowserClient(), file, path);
              await onSave({ bgImageUrl: url });
            }}
            onRemove={() => onSave({ bgImageUrl: undefined })}
          />
          {pagina.bgImageUrl && (
            <div>
              <div className="field-label" style={{ marginBottom: 6 }}>Escurecer a foto</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="range"
                  min={0}
                  max={0.85}
                  step={0.01}
                  value={overlay}
                  onChange={(e) => onSave({ bgOverlay: Number(e.target.value) })}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 12, color: "var(--subtle)", width: 34, textAlign: "right" }}>{Math.round(overlay * 100)}%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LinkModal({
  draft, isNew, organizationId, onCancel, onSave, onDelete,
}: {
  draft: LinkItem;
  isNew: boolean;
  organizationId: string;
  onCancel: () => void;
  onSave: (draft: LinkItem) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState(draft);
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    if (!form.label.trim() || !form.url.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">{isNew ? "Novo link" : "Editar link"}</div>
          <div className="modal-title">{form.label || "Link da página"}</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="field-label">Título</div>
          <input className="input" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Ex.: Culto ao vivo" />

          <div className="field-label" style={{ marginTop: 12 }}>Link</div>
          <input className="input" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." />

          <div className="field-label" style={{ marginTop: 12 }}>Ícone</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {LINK_ICON_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                className={`opt${form.icon === name ? " on" : ""}`}
                style={{ padding: 8, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center" }}
                onClick={() => setForm((f) => ({ ...f, icon: name }))}
                title={name}
              >
                <LinkIconView name={name} size={16} />
              </button>
            ))}
          </div>

          <div className="field-label" style={{ marginTop: 12 }}>Foto do link (opcional)</div>
          <div className="cfg-card-s" style={{ marginTop: 0, marginBottom: 8 }}>Se enviar uma foto, ela aparece no lugar do ícone.</div>
          <ImageUpload
            label="Foto"
            round
            aspectRatio={1}
            url={form.imageUrl}
            onUpload={async (file) => {
              const path = `${organizationId}/paginas/links/${form.id}.${imageExtension(file)}`;
              const url = await uploadServiceImage(createServiceBrowserClient(), file, path);
              setForm((f) => ({ ...f, imageUrl: url }));
            }}
            onRemove={() => setForm((f) => ({ ...f, imageUrl: null }))}
          />

          <div className="field-label" style={{ marginTop: 12 }}>Grupo (opcional, ex.: Jovens, Eventos)</div>
          <input className="input" value={form.groupLabel} onChange={(e) => setForm((f) => ({ ...f, groupLabel: e.target.value }))} placeholder="Deixe em branco pra não agrupar" />

          <div className="cfg-grid2" style={{ marginTop: 12 }}>
            <div>
              <div className="field-label">Aparece a partir de (opcional)</div>
              <input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
            </div>
            <div>
              <div className="field-label">Some depois de (opcional)</div>
              <input className="input" type="datetime-local" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
            </div>
          </div>

          <div className="cfg-row" style={{ padding: "10px 0 0" }}>
            <div className="cfg-row-main">
              <div className="cfg-row-t">Visível na página</div>
            </div>
            <button type="button" className={`sw${form.active ? " on" : ""}`} onClick={() => setForm((f) => ({ ...f, active: !f.active }))} />
          </div>
        </div>
        <div className="modal-foot" style={{ justifyContent: "space-between" }}>
          {onDelete ? <button className="btn btn-ghost" type="button" onClick={onDelete}>Excluir</button> : <span />}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-sec" type="button" onClick={onCancel}>Cancelar</button>
            <button className="btn btn-pri" type="button" disabled={saving || !form.label.trim() || !form.url.trim()} onClick={salvar}>Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostModal({
  draft, isNew, organizationId, onCancel, onSave, onDelete,
}: {
  draft: PostItem;
  isNew: boolean;
  organizationId: string;
  onCancel: () => void;
  onSave: (draft: PostItem) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState(draft);
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">{isNew ? "Nova notícia" : "Editar notícia"}</div>
          <div className="modal-title">{form.title || "Notícia da página"}</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="field-label">Título</div>
          <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex.: Retiro de Jovens abre inscrições" />

          <div className="field-label" style={{ marginTop: 12 }}>Texto</div>
          <textarea className="input" rows={4} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Detalhes da notícia ou aviso" />

          <div style={{ marginTop: 12 }}>
            <ImageUpload
              label="Imagem (opcional)"
              url={form.coverUrl}
              aspectRatio={16 / 9}
              onUpload={async (file) => {
                const path = `${organizationId}/paginas/posts/${form.id}.${imageExtension(file)}`;
                const url = await uploadServiceImage(createServiceBrowserClient(), file, path);
                setForm((f) => ({ ...f, coverUrl: url }));
              }}
              onRemove={() => setForm((f) => ({ ...f, coverUrl: null }))}
            />
          </div>

          <div className="cfg-row" style={{ padding: "10px 0 0" }}>
            <div className="cfg-row-main">
              <div className="cfg-row-t">Fixar no topo</div>
            </div>
            <button type="button" className={`sw${form.pinned ? " on" : ""}`} onClick={() => setForm((f) => ({ ...f, pinned: !f.pinned }))} />
          </div>
        </div>
        <div className="modal-foot" style={{ justifyContent: "space-between" }}>
          {onDelete ? <button className="btn btn-ghost" type="button" onClick={onDelete}>Excluir</button> : <span />}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-sec" type="button" onClick={onCancel}>Cancelar</button>
            <button className="btn btn-pri" type="button" disabled={saving || !form.title.trim()} onClick={salvar}>Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
