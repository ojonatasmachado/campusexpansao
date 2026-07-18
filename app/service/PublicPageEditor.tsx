"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import QRCode from "react-qr-code";
import { createServiceBrowserClient } from "./lib/supabase-browser";
import { uploadServiceImage, imageExtension } from "./lib/upload-image";
import { useChurchSettingsField } from "./lib/settings-field";
import { Icon } from "./lib/icons";
import { ImageUpload } from "./ImageUpload";
import { AccentField } from "./AccentField";
import LinkIconView from "../lib/LinkIcon";
import { LINK_ICON_NAMES, DEFAULT_LINK_ICON } from "../lib/link-icons";
import { PAGINA_CFG_DEFAULT, IDENTIDADE_CFG_DEFAULT, mergeChurchIdentity } from "../lib/church-page";
import type { PaginaCfg, PaginaSocial, PaginaTemplate, ChurchPageData, IdentidadeCfg } from "../lib/church-page";
import ChurchPageView from "../[slug]/ChurchPageView";

/* Editor da Página pública (link-in-bio) da igreja, aba "Página pública" em
   Configurações. Arquivo próprio (não dentro de ServiceExactApp.tsx, que já
   tem 10k+ linhas) : essa funcionalidade tem peso real (CRUD de links com
   reordenação, CRUD de notícias, seletor de modelo, QR code, preview ao
   vivo). Reaproveita AccentField (cor), ImageUpload (capa) e o próprio
   ChurchPageView da rota pública pra a pré-visualização ser exatamente igual
   ao que sai no ar, não uma imitação.

   Logo/fundo/cor do texto/cor das caixas NÃO são configuração desta página :
   são identidade da igreja (settings.identidadeCfg), editada em
   Configurações → Personalização (ver IdentidadeFields.tsx) e só consumida
   aqui pro preview. accentColor continua aqui como override intencional : a
   Página pública pode ter uma cor de destaque diferente do resto do
   Service. */

/* Toda rota real que já existe na raiz do domínio (app/<rota>), pra um
   app/[slug]/page.tsx na raiz nunca colidir com elas (Next 16 : rota
   estática sempre vence a dinâmica no mesmo nível) : admin, api, auth,
   checkout, comprado, conta, cursos, igreja, landing, links, login,
   materiais, perfil, quiz, redefinir-senha, series, service, sobre, studio,
   teste-design. "entrar" também entra : é a rota do login temático dentro
   de cada igreja (app/[slug]/entrar). O resto são palavras genéricas
   reservadas por segurança, sem rota real hoje. */
const RESERVED_SLUGS = new Set([
  "admin", "api", "auth", "checkout", "comprado", "conta", "cursos", "igreja",
  "landing", "links", "login", "materiais", "perfil", "quiz", "redefinir-senha",
  "series", "service", "sobre", "studio", "teste-design", "entrar",
  "app", "www", "cadastro", "novo", "editar", "home", "inicio",
]);

type ChurchProp = {
  id: string;
  organizationId: string;
  nome: string;
  logoUrl?: string | null;
  slug?: string | null;
  settings?: { paginaCfg?: PaginaCfg; identidadeCfg?: IdentidadeCfg; brandCfg?: { accentDark?: string }; [key: string]: unknown };
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

type PageEditorTab = "publicar" | "modelo" | "aparencia" | "links" | "redes" | "noticias";
const PAGE_EDITOR_TABS: { id: PageEditorTab; label: string }[] = [
  { id: "publicar", label: "Publicar" },
  { id: "modelo", label: "Modelo" },
  { id: "aparencia", label: "Aparência" },
  { id: "links", label: "Links" },
  { id: "redes", label: "Redes sociais" },
  { id: "noticias", label: "Notícias" },
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

  const [pagina, setPagina, savePagina] = useChurchSettingsField<PaginaCfg>("paginaCfg", PAGINA_CFG_DEFAULT, church, () => router.refresh());
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
  const [activeTab, setActiveTab] = useState<PageEditorTab>("publicar");

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
    setSlugDraft(church.slug ?? "");
  }, [church.slug]);

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

  const pageUrl = origin && church.slug ? `${origin}/${church.slug}` : "";
  const loginUrl = origin && church.slug ? `${origin}/${church.slug}/entrar` : "";
  const identidade: IdentidadeCfg = { ...IDENTIDADE_CFG_DEFAULT, ...(church.settings?.identidadeCfg ?? {}) };
  const serviceAccent = church.settings?.brandCfg?.accentDark || PAGINA_CFG_DEFAULT.accentColor;
  const effectiveBgHex = identidade.bgMode === "imagem" ? "#0E110D" : identidade.bgMode === "degrade" ? (identidade.bgFrom ?? IDENTIDADE_CFG_DEFAULT.bgFrom) : (identidade.bgColor ?? IDENTIDADE_CFG_DEFAULT.bgColor);

  const previewData: ChurchPageData = {
    id: church.id,
    slug: church.slug || slugDraft || "sua-igreja",
    name: church.nome,
    logoUrl: church.logoUrl ?? null,
    pagina: mergeChurchIdentity(church.settings?.identidadeCfg, pagina, church.settings?.brandCfg?.accentDark),
    serviceAccent,
    published: true,
    links: links.filter((l) => l.active).map((l) => ({ id: l.id, label: l.label, url: l.url, icon: l.icon, imageUrl: l.imageUrl, groupLabel: l.groupLabel || null })),
    posts: posts.map((p) => ({ id: p.id, title: p.title, body: p.body || null, coverUrl: p.coverUrl, pinned: p.pinned, publishedAt: p.publishedAt })),
  };

  if (!canEdit) {
    return <div className="empty">Só master ou pastor pode configurar a página pública.</div>;
  }

  return (
    <div className="pge-layout">
      <link rel="stylesheet" href="/igreja-page.css" />

      <div className="pge-main">
        <div className="cfg-tabs">
          {PAGE_EDITOR_TABS.map((t) => (
            <button key={t.id} type="button" className={`cfg-tab${activeTab === t.id ? " on" : ""}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* ─── Publicar + endereço ─── */}
        {activeTab === "publicar" && (
          <div className="cfg-card">
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
              <span style={{ fontSize: 13, color: "var(--subtle)" }}>{origin.replace(/^https?:\/\//, "")}/</span>
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

            {loginUrl && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
                <div className="cfg-row-main" style={{ flex: "none" }}>
                  <div className="field-label" style={{ marginTop: 0 }}>Acesso da equipe (login com a cara da igreja)</div>
                  <span style={{ fontSize: 13, color: "var(--subtle)" }}>{loginUrl.replace(/^https?:\/\//, "")}</span>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(loginUrl)}>
                  <Icon name="copiar" size={13} /> Copiar link
                </button>
              </div>
            )}

            {church.slug && (
              <div style={{ display: "flex", gap: 18, alignItems: "center", marginTop: 18, flexWrap: "wrap" }}>
                <div ref={qrRef} style={{ background: "#fff", padding: 10, borderRadius: 10 }}>
                  <QRCode value={pageUrl || `${origin}/${church.slug}`} size={104} style={{ height: "auto", maxWidth: "100%", width: 104 }} viewBox="0 0 104 104" />
                </div>
                <div>
                  <div className="cfg-row-s">QR code pronto pra colocar em boletim, cartaz ou tela de projeção.</div>
                  <button type="button" className="btn btn-sec btn-sm" style={{ marginTop: 8 }} onClick={baixarQr}>Baixar QR code</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Modelo ─── */}
        {activeTab === "modelo" && (
          <div className="cfg-card">
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
        )}

        {/* ─── Aparência ─── */}
        {activeTab === "aparencia" && (
          <div className="cfg-card">
            <div className="cfg-card-t">Aparência</div>
            <div className="cfg-card-s">
              Bio, capa e cor de destaque só desta página. Logo, fundo e as demais cores são a
              identidade da igreja, editada em Configurações → Personalização.
            </div>

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

            <div style={{ marginTop: 14 }}>
              <AccentField
                compact
                label="Cor de destaque (ícones e selos)"
                bgHex={effectiveBgHex}
                value={pagina.accentColor ?? serviceAccent}
                defaultHex={serviceAccent}
                onChange={(hex) => savePagina({ accentColor: hex })}
              />
              <div className="cfg-card-s" style={{ marginTop: 6 }}>
                Usa a cor de destaque do Service por padrão. Mude aqui só se quiser diferente nesta página.
              </div>
            </div>
          </div>
        )}

        {/* ─── Links ─── */}
        {activeTab === "links" && (
          <div className="cfg-card">
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
        )}

        {/* ─── Redes sociais ─── */}
        {activeTab === "redes" && (
          <div className="cfg-card">
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
        )}

        {/* ─── Notícias e avisos ─── */}
        {activeTab === "noticias" && (
          <div className="cfg-card">
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
        )}
      </div>

      {/* ─── Preview ao vivo : fica fixo à direita durante o scroll ─── */}
      <div className="pge-preview">
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
