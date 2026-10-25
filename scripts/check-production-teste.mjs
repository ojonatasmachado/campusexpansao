// Read-only validation of the authorized fixtures, including real password logins and map RPCs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
const state=JSON.parse(readFileSync('/tmp/cex-teste-300-credentials.json','utf8'));
const a=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const must=(r,t)=>{if(r.error)throw Error(`${t}: ${r.error.message}`);return r.data;};
const report={roles:{},checks:[]};
const people=must(await a.schema('service').from('people').select('user_id,email').eq('organization_id',state.org).like('email','teste.%@cex-fixture.example.com'),'people');
assert.equal(people.length,300);
const memberships=must(await a.schema('core').from('memberships').select('user_id,role,status').eq('organization_id',state.org).in('user_id',people.map(p=>p.user_id)),'memberships');
assert.equal(memberships.length,300);for(const m of memberships){assert.equal(m.status,'active');report.roles[m.role]=(report.roles[m.role]??0)+1;}
for(const i of [0,2,10,40,41,299]){
 const u=state.users[i],c=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
 const auth=must(await c.auth.signInWithPassword({email:u.email,password:state.password}),'login');assert.equal(auth.user.id,u.id);
 const locals=must(await c.schema('service').rpc('mapa_locais_publicos',{p_org:state.org}),'map locations');
 const sede=locals.find(l=>l.tipo==='sede');assert.ok(sede);assert.equal(sede.latitude,-29.926749);assert.equal(sede.longitude,-51.06355);
 const access=must(await c.schema('service').rpc('mapa_acesso',{p_org:state.org}),'map access')[0];
 if(i<10){assert.equal(access.pode,true);const points=must(await c.schema('service').rpc('mapa_pessoas',{p_org:state.org}),'map people');assert.ok(points.length>=300);const fixture=points.filter(p=>p.nome?.includes(' Teste '));assert.equal(fixture.length,300);assert.equal(new Set(fixture.map(p=>`${p.latitude},${p.longitude}`)).size,12);}
 else assert.equal(access.pode,false);
 report.checks.push({email:u.email,role:u.role,login:true,headquarters:true,mapAccess:access.pode});
 await c.auth.signOut();
}
writeFileSync('/tmp/cex-teste-validation.json',JSON.stringify(report,null,2),{mode:0o600});console.log(JSON.stringify(report,null,2));
