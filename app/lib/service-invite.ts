import { createHash, randomBytes } from "crypto";
import type { supabaseAdmin } from "./supabase";

type AdminClient = ReturnType<typeof supabaseAdmin>;

/* Convite de acesso ao app do Service (service.member_invites, 0045). O
   líder cadastra a pessoa só com nome, sobrenome e telefone; o link vai pelo
   WhatsApp e a conta só nasce quando a pessoa abre o link e informa e-mail,
   senha e CEP. O token nunca é guardado em claro: só o hash sha256. */

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newInviteToken(): { token: string; hash: string; expiresAt: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashInviteToken(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString() };
}

export function inviteUrl(origin: string, token: string): string {
  const url = new URL("/service/convite", origin);
  url.searchParams.set("t", token);
  return url.toString();
}

export type OpenInvite = {
  id: string;
  organization_id: string;
  member_id: string;
  member: { id: string; name: string; phone: string | null; church_id: string; volunteer_id: string | null };
};

/* convite válido (não usado, dentro do prazo) a partir do token do link */
export async function findOpenInvite(db: AdminClient, token: string): Promise<OpenInvite | null> {
  if (!token) return null;
  const { data } = await db
    .schema("service")
    .from("member_invites")
    .select("id,organization_id,member_id,expires_at,used_at,member:members(id,name,phone,church_id,volunteer_id)")
    .eq("token_hash", hashInviteToken(token))
    .maybeSingle();
  if (!data || data.used_at || Date.parse(data.expires_at) < Date.now() || !data.member) return null;
  return data as unknown as OpenInvite;
}

function slugify(name: string): string {
  const base = name
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 34);
  return base.length >= 3 ? base : `igreja-${base}`.slice(0, 34);
}

/* endereço da igreja pro login do membro (/{slug}/entrar). O slug só nascia
   quando a igreja configurava a página pública; o login do membro precisa
   dele sempre, então é criado aqui a partir do nome quando falta. */
export async function ensureChurchSlug(db: AdminClient, churchId: string): Promise<string | null> {
  const { data: church } = await db.schema("service").from("churches").select("slug,name").eq("id", churchId).maybeSingle();
  if (!church) return null;
  if (church.slug) return church.slug as string;
  const base = slugify(church.name as string);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const { error } = await db.schema("service").from("churches").update({ slug: candidate }).eq("id", churchId).is("slug", null);
    if (!error) {
      /* relê: se outra requisição criou o slug antes, vale o dela */
      const { data: now } = await db.schema("service").from("churches").select("slug").eq("id", churchId).maybeSingle();
      return (now?.slug as string | null) ?? null;
    }
    if (!/duplicate|unique/i.test(error.message)) return null;
  }
  return null;
}
