import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { User } from "@supabase/supabase-js";

/* Convite de acesso ao app do Service. O líder gera o link e manda pelo
   WhatsApp; a pessoa abre e cria a própria senha. O token nunca é guardado
   em claro: só o hash fica em app_metadata (que o usuário não consegue
   editar). invite_pending marca contas criadas pelo convite e ainda sem
   senha: só essas podem ter senha definida pelo link. Conta que já existia
   (ex: comprador da loja CE.X) nunca tem a senha tocada. */

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type InviteMeta = {
  invite_pending?: boolean;
  invite_hash?: string | null;
  invite_expires_at?: string | null;
};

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newInvite(): { token: string; meta: InviteMeta } {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    meta: {
      invite_pending: true,
      invite_hash: hashInviteToken(token),
      invite_expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
    },
  };
}

export const CLEARED_INVITE: InviteMeta = { invite_pending: false, invite_hash: null, invite_expires_at: null };

export function isInvitePending(user: User): boolean {
  return (user.app_metadata as InviteMeta | undefined)?.invite_pending === true;
}

export function isInviteValid(user: User, token: string): boolean {
  const meta = user.app_metadata as InviteMeta | undefined;
  if (!meta?.invite_pending || !meta.invite_hash || !meta.invite_expires_at) return false;
  if (Date.parse(meta.invite_expires_at) < Date.now()) return false;
  const a = Buffer.from(hashInviteToken(token), "hex");
  const b = Buffer.from(meta.invite_hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function inviteUrl(origin: string, userId: string, token: string): string {
  const url = new URL("/service/convite", origin);
  url.searchParams.set("u", userId);
  url.searchParams.set("t", token);
  return url.toString();
}
