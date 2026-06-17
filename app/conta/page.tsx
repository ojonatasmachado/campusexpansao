import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase-server";

export default async function ContaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/perfil");

  redirect("/perfil");
}
