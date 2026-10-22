import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TEST_PASSWORD } from "./seed-local-service";
const URL = "http://127.0.0.1:54321";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
if (!URL.startsWith("http://127.0.0.1")) throw new Error("só roda no Supabase local");

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
async function as(email: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (error) throw error;
  return c;
}

async function main() {
 const db=admin.schema("service");
 const {data: churches,error}=await db.from("churches").select("id,organization_id,name,time_zone"); if(error)throw error;
 const igreja=churches!.find(c=>c.name==="Igreja Teste Local")!;
 const master=await as("master@teste.local"), membro=await as("membro@teste.local"), outra=await as("outra@teste.local");
 const {data: before}=await db.from("events").select("id,event_date,time").eq("church_id",igreja.id).order("id");
 try {
  const {data:saved,error:saveError}=await master.schema("service").from("churches").update({time_zone:"Asia/Tokyo"}).eq("id",igreja.id).select("id,time_zone").single();
  assert.ifError(saveError);assert.equal(saved!.time_zone,"Asia/Tokyo");
  for(const client of [membro,outra]) {
   const {data,error}=await client.schema("service").from("churches").update({time_zone:"UTC"}).eq("id",igreja.id).select("id");
   assert.ok(error || !data?.length,"Pessoa sem gestão não pode alterar o fuso");
  }
  const {error:invalid}=await master.schema("service").from("churches").update({time_zone:"Invalid/Clock"}).eq("id",igreja.id);
  assert.equal(invalid?.code,"22023");
  const {data: after}=await db.from("events").select("id,event_date,time").eq("church_id",igreja.id).order("id");assert.deepEqual(after,before);
  const {error:metrics}=await master.schema("service").rpc("metricas_internas",{p_org:igreja.organization_id,p_dias:30});assert.ifError(metrics);
  console.log("Banco local: gestão salva fuso, membro e outra igreja bloqueados, valor inválido recusado, eventos preservados e métricas executam.");
 } finally {
  const {error}=await db.from("churches").update({time_zone:igreja.time_zone}).eq("id",igreja.id);if(error)throw error;
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
