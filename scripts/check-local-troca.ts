// Teste e fixtures exclusivamente no Supabase local. Sem notificações externas.
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { TEST_PASSWORD } from "./seed-local-service";
import { todayISO, somaDias } from "../app/service/lib/date";
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

const path = "/tmp/cex-troca-fixture.json";
type Fixture = { org: string; church: string; ministry: string; event: string; position: string; assignment: string; users: Record<string, { id: string; email: string; person: string; member: string }> };
function must<T>(r: { data: T | null; error: unknown }): NonNullable<T> {
 if (r.error || r.data === null) throw r.error ?? new Error("Sem dados");
 return r.data as NonNullable<T>;
}
function row<T>(r: { data: unknown; error: unknown }): T {
 if (r.error || r.data === null) throw r.error ?? new Error("Sem dados");
 return r.data as T;
}
async function seed(): Promise<Fixture> {
 if (existsSync(path)) return JSON.parse(readFileSync(path,"utf8"));
 const users: Fixture["users"] = {};
 for (const [key,name] of [["master","Marta Gestão"],["lider","Lucas Responsável"],["original","Ana Escalada"],["substituta","Bia Substituta"]]) {
  const email=`ux-troca-${key}@teste.local`;
  const {data:existing}=await admin.auth.admin.listUsers({perPage:1000});
  const found=existing.users.find((u)=>u.email===email && u.user_metadata?.full_name===name);
  const {data,error}=found ? {data:{user:found},error:null} : await admin.auth.admin.createUser({email,password:TEST_PASSWORD,email_confirm:true,user_metadata:{full_name:name}});
  if(error)throw error;
  const id=data.user!.id;users[key]={id,email,person:"",member:""};
  const profile=await admin.schema("core").from("users").update({full_name:name,phone:"+5511987654321"}).eq("id",id);if(profile.error)throw profile.error;
 }
 const owner=await as(users.master.email);
 const rows=must(await owner.schema("core").rpc("bootstrap_church_org_v2",{p_org_name:"Igreja Jornada Troca",p_cnpj:null,p_city:"São Paulo"})) as {organization_id:string;church_id:string}[];
 const org=rows[0].organization_id,church=rows[0].church_id;const db=admin.schema("service");
 const f:Fixture={org,church,ministry:"",event:"",position:"",assignment:"",users};
 writeFileSync(path,JSON.stringify(f,null,2));
 const settings=await db.from("churches").update({settings:{setup:{fase:3,feitas:[1,2,3],concluido:true}}}).eq("id",church);if(settings.error)throw settings.error;
 for (const [key,u] of Object.entries(users)) {
  const name=key==="master"?"Marta Gestão":key==="lider"?"Lucas Responsável":key==="original"?"Ana Escalada":"Bia Substituta";
  if(key!=="master") { const r=await admin.schema("core").from("memberships").insert({organization_id:org,user_id:u.id,role:key==="lider"?"lider":"membro",status:"active"});if(r.error)throw r.error; }
  const existing=must(await db.from("people").select("id").eq("organization_id",org).eq("user_id",u.id));
  u.person=existing[0]?.id ?? row<{id:string}>(await db.from("people").insert({organization_id:org,church_id:church,user_id:u.id,name,email:u.email,phone:"+5511987654321",status:"ativo"}).select("id").single()).id;
  const members=must(await db.from("members").select("id").eq("organization_id",org).eq("volunteer_id",u.person));
  const memberRow={organization_id:org,church_id:church,volunteer_id:u.person,name,email:u.email,phone:"+5511987654321",country:"BR",postal_code:"01310930",journey:[1,1,1,1,1]};
  u.member=members[0]?.id ?? row<{id:string}>(await db.from("members").insert(memberRow).select("id").single()).id;
  const updated=await db.from("members").update(memberRow).eq("id",u.member);if(updated.error)throw updated.error;
 }
 f.ministry=row<{id:string}>(await db.from("ministries").insert({organization_id:org,church_id:church,name:"Louvor",icon:"louvor"}).select("id").single()).id;
 f.position=row<{id:string}>(await db.from("ministry_positions").insert({organization_id:org,ministry_id:f.ministry,name:"Vocal",need_count:1}).select("id").single()).id;
 for(const key of ["lider","original","substituta"]) {const r=await db.from("person_ministries").insert({organization_id:org,ministry_id:f.ministry,person_id:users[key].person,is_leader:key==="lider",functions:["Vocal"]});if(r.error)throw r.error;}
 f.event=row<{id:string}>(await db.from("events").insert({organization_id:org,church_id:church,name:"Encontro da comunidade",kind:"Culto",event_date:somaDias(todayISO(),3),time:"19:00",location:"Salão principal",ministries:[f.ministry]}).select("id").single()).id;
 f.assignment=row<{id:string}>(await db.from("roster_assignments").insert({organization_id:org,event_id:f.event,position_id:f.position,person_id:users.original.person,status:"ok",rascunho:false}).select("id").single()).id;
 writeFileSync(path,JSON.stringify(f,null,2));return f;
}
async function verify(f:Fixture) {
 const original=(await as(f.users.original.email)).schema("service"),leader=(await as(f.users.lider.email)).schema("service"),replacement=(await as(f.users.substituta.email)).schema("service");
 const recipients=must(await original.rpc("request_recipient",{p_kind:"troca",p_ministry:f.ministry}));assert.equal(recipients[0].member_id,f.users.lider.member);
 const candidates=must(await original.rpc("swap_candidates",{p_assignment:f.assignment}));assert.ok(candidates.some((r:{member_id:string})=>r.member_id===f.users.substituta.member));
 const chat=must(await original.rpc("start_dm",{p_target_member:f.users.lider.member,p_body:"Preciso trocar minha escala. Pode conferir a substituição?"}));
 const messages=must(await leader.from("messages").select("id,body").eq("chat_id",chat));assert.ok(messages.some(m=>m.body.includes("substituição")));
 const denied=await replacement.from("roster_assignments").update({person_id:f.users.substituta.person}).eq("id",f.assignment).select("id");assert.ok(denied.error||!denied.data?.length);
 must(await leader.from("roster_assignments").update({person_id:f.users.substituta.person,status:"wait"}).eq("id",f.assignment).eq("person_id",f.users.original.person).select("id").single());
 const removed=must(await original.rpc("respond_my_assignment",{p_assignment:f.assignment,p_status:"ok"}));assert.notEqual(removed,"ok");
 const pending=row<{status:string;person_id:string}>(await replacement.from("roster_assignments").select("status,person_id").eq("id",f.assignment).single());assert.equal(pending.status,"wait");
 assert.equal(must(await replacement.rpc("respond_my_assignment",{p_assignment:f.assignment,p_status:"ok"})),"ok");
 const facts=must(await admin.schema("service").from("timeline_events").select("event_type,member_id").eq("organization_id",f.org).eq("event_type","trocou"));assert.ok(facts.some(x=>x.member_id===f.users.original.member));
 console.log("Troca local: pedido chega ao líder, candidata disponível, membro não transfere a vaga, liderança substitui, pessoa anterior perde a ação e substituta confirma. Histórico gravado.");
}
async function cleanup(f:Fixture) {
 assert.match(f.org,/^[0-9a-f-]{36}$/i);
 const churches=must(await admin.schema("service").from("churches").select("name").eq("organization_id",f.org));
 assert.ok(churches.every(c=>c.name==="Igreja Jornada Troca"));
 // Só o container local. Billing não oferece DELETE à service_role pela API.
 const tables=["fin_transactions","fin_offering_counts","fin_recurring","fin_campaigns","fin_closings","fin_accounts","fin_categories","fin_funds"];
 const sql="begin;\n"+tables.map(t=>`delete from service.${t} where organization_id='${f.org}'::uuid;`).join("\n")+`
 delete from billing.subscriptions where organization_id='${f.org}'::uuid;
 delete from core.organizations where id='${f.org}'::uuid;
 delete from audit.activity_log where organization_id='${f.org}'::uuid or before->>'organization_id'='${f.org}' or after->>'organization_id'='${f.org}';
 commit;`;
 execFileSync("docker",["exec","-i","supabase_db_campusexpansao","psql","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-q"],{input:sql,stdio:["pipe","pipe","pipe"]});
 for(const u of Object.values(f.users)){const {error}=await admin.auth.admin.deleteUser(u.id);if(error)throw error;}
 unlinkSync(path);console.log("Fixtures de troca removidas.");
}
async function main() {
 const mode=process.argv[2]??"test";
 if(mode==="cleanup"){if(existsSync(path))await cleanup(JSON.parse(readFileSync(path,"utf8")));return;}
 const f=await seed();
 if(mode==="seed"){console.log("Fixtures de troca prontas no banco local.");return;}
 try{await verify(f);}finally{await cleanup(f);}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
