import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase";
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

export async function getUserProfile(user: User): Promise<DbUserProfile | null> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      if (error.code === "42P01") return null;
      throw error;
    }

    return (data ?? null) as DbUserProfile | null;
  } catch (error) {
    console.error("Erro ao buscar perfil do usuário", error);
    return null;
  }
}

export async function ensureUserProfile(user: User): Promise<DbUserProfile | null> {
  const existing = await getUserProfile(user);
  if (existing) return existing;

  try {
    const fallbackProfile = profileFromUserMetadata(user);
    const { data, error } = await supabaseAdmin()
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
      if (error.code === "42P01") return null;
      throw error;
    }

    return data as DbUserProfile;
  } catch (error) {
    console.error("Erro ao criar perfil do usuário", error);
    return null;
  }
}
