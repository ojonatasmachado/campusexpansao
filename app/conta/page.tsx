import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase-server";
import ContaClient from "./ContaClient";

export default async function ContaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/conta");

  return <ContaClient user={user} />;
}
