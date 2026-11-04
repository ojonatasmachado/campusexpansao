import { createClient } from "@supabase/supabase-js";

const URL = "http://127.0.0.1:54321";
const SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

async function main() {
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  const svc = admin.schema("service");

  const { data: people, error } = await svc.from("people").select("id,name,email").limit(10);
  console.log("error:", JSON.stringify(error));
  console.log("people:", JSON.stringify(people, null, 2));

  if (people?.length) {
    const maria = people.find(p => p.email === "membro@teste.local");
    console.log("maria:", JSON.stringify(maria));

    if (maria) {
      const { data: roster, error: rErr } = await svc
        .from("roster_assignments")
        .select("id,status,event_id")
        .eq("person_id", maria.id);
      console.log("roster error:", JSON.stringify(rErr));
      console.log("roster:", JSON.stringify(roster, null, 2));
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });