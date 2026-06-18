import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase-server";
import { dbProfileToForm, ensureUserProfile } from "../lib/user-profile";
import ContaClient from "./ContaClient";

export default async function ContaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/conta");

  const profile = await ensureUserProfile(user);

  return <ContaClient user={user} initialProfile={dbProfileToForm(profile, user)} />;
}
