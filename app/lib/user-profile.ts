import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { DbUserProfile } from "./types";

export type UserProfileForm = {
  full_name: string;
  church_name: string;
  phone: string;
  state: string;
  city: string;
  church_address: string;
  role: string;
  ministry_area: string;
  denomination: string;
};

export const EMPTY_USER_PROFILE: UserProfileForm = {
  full_name: "",
  church_name: "",
  phone: "",
  state: "",
  city: "",
  church_address: "",
  role: "",
  ministry_area: "",
  denomination: "",
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function profileFromUserMetadata(user: User): UserProfileForm {
  const meta = user.user_metadata ?? {};

  return {
    ...EMPTY_USER_PROFILE,
    full_name: text(meta.full_name),
  };
}

export function dbProfileToForm(profile: DbUserProfile | null | undefined, user: User): UserProfileForm {
  if (!profile) return profileFromUserMetadata(user);

  return {
    full_name: profile.full_name ?? "",
    church_name: profile.church_name ?? "",
    phone: profile.phone ?? "",
    state: profile.state ?? "",
    city: profile.city ?? "",
    church_address: profile.church_address ?? "",
    role: profile.role ?? "",
    ministry_area: profile.ministry_area ?? "",
    denomination: profile.denomination ?? "",
  };
}

export function sanitizeProfileForm(form: UserProfileForm): UserProfileForm {
  return {
    full_name: form.full_name.trim(),
    church_name: form.church_name.trim(),
    phone: form.phone.trim(),
    state: form.state.trim(),
    city: form.city.trim(),
    church_address: form.church_address.trim(),
    role: form.role.trim(),
    ministry_area: form.ministry_area.trim(),
    denomination: form.denomination.trim(),
  };
}

type ProfileDb = Pick<SupabaseClient, "from">;

function isMissingProfileTable(error: { code?: string; message?: string } | null) {
  return error?.code === "42P01" || error?.message?.toLowerCase().includes("does not exist");
}

export async function getUserProfile(db: ProfileDb, user: User): Promise<DbUserProfile | null> {
  const { data, error } = await db
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    if (isMissingProfileTable(error)) return null;
    throw error;
  }

  return (data ?? null) as DbUserProfile | null;
}

export async function ensureUserProfile(db: ProfileDb, user: User): Promise<DbUserProfile | null> {
  const existing = await getUserProfile(db, user);
  if (existing) return existing;

  const fallbackProfile = profileFromUserMetadata(user);
  const { data, error } = await db
    .from("user_profiles")
    .upsert({
      user_id: user.id,
      email: user.email?.trim().toLowerCase() ?? "",
      ...fallbackProfile,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    if (isMissingProfileTable(error)) return null;
    throw error;
  }

  return data as DbUserProfile;
}

export async function ensureUserProfileOrNull(db: ProfileDb, user: User): Promise<DbUserProfile | null> {
  try {
    return await ensureUserProfile(db, user);
  } catch {
    return null;
  }
}
