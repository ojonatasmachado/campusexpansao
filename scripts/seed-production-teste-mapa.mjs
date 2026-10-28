// Run after seed-production-teste.mjs. Input is a local audit of public CNEFE data.
// node --env-file=.env.local scripts/seed-production-teste-mapa.mjs /tmp/cex-teste-ceps-cnefe.json --apply
import {createClient} from '@supabase/supabase-js';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const church='48100f8c-3d6d-42c2-8452-41cca4e528b2',org='6eff8c44-a9fe-4b87-b906-ef491a648ed1',batch='cex-teste-300-v1';
const c=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}),s=c.schema('service');
const must=(r,t)=>{if(r.error)throw Error(`${t}: ${r.error.message}`);return r.data;};
const id=(t,i)=>{const h=createHash('sha256').update(`${batch}:${church}:${t}:${i}`).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const data=JSON.parse(readFileSync(process.argv[2],'utf8'));
const chosen=['94010020','94010030','94010090','94015080','94170110','94190040','94910001','94910002','94910003','94920370','94930415','94960055'];
const selected=chosen.map(cep=>data.find(x=>x.cep===cep));
const sede=data.find(x=>x.cep==='94080230');
if(selected.some(x=>!x)||!sede)throw Error('Missing public CEP evidence');
for(const x of [...selected,sede])if(x.source!=='ibge:cnefe:2022'||x.nearest_address_m>50||x.count<10||x.state!=='RS'||!['4309209','4303103'].includes(x.ibge))throw Error(`Unverified CEP ${x.cep}`);
const churchBefore=must(await s.from('churches').select('*').eq('id',church).single(),'church');
if(churchBefore.name.toLowerCase()!=='teste'||churchBefore.organization_id!==org||churchBefore.postal_code.replace(/\D/g,'')!==sede.cep)throw Error('Target or headquarters CEP changed');
if(!process.argv.includes('--apply')){console.log('Validated 12 compact CEPs and existing headquarters CEP. Use --apply.');process.exit(0);}
const backup='/tmp/cex-teste-map-before.json';if(!existsSync(backup))writeFileSync(backup,JSON.stringify({church:churchBefore},null,2),{mode:0o600});
for(const x of [...selected,sede]){
 must(await s.from('cep_centros').upsert({cep:x.cep,municipio_ibge:x.ibge,latitude:x.latitude,longitude:x.longitude,enderecos:x.count,fonte:x.source},{onConflict:'cep',ignoreDuplicates:true}),'CEP center');
 // Genuine public address metadata, preserving the raw API reply and IBGE provenance.
 const normalized={postalCode:x.cep,street:x.street,streetNumber:null,complement:null,neighborhood:x.neighborhood||null,city:x.city,state:'RS',country:'Brasil',municipalityIbge:x.ibge,latitude:x.latitude,longitude:x.longitude,geoSource:x.source,geoPrecision:'postal_code'};
 must(await s.from('address_lookups').upsert({kind:'cep',lookup_key:x.cep,source:'viacep+ibge:cnefe:2022',data:normalized,raw:{viacep:x.viacep??null,cnefe:{source:x.source,count:x.count,streets:x.streets}},fetched_at:new Date().toISOString()},{onConflict:'kind,lookup_key',ignoreDuplicates:true}),'CEP metadata');
}
for(let k=0;k<selected.length;k++){
 const x=selected[k],ids=Array.from({length:25},(_,j)=>id('members',k*25+j));
 must(await s.from('members').update({postal_code:x.cep,street:x.street,neighborhood:x.neighborhood,city:x.city,state:'RS',country:'Brasil',map_consent_at:new Date().toISOString(),map_consent_source:'perfil',map_consent_terms:'Conta fictícia para testes, sem titular real.'}).eq('organization_id',org).eq('church_id',church).in('id',ids),'members geo');
}
for(let i=0;i<15;i++){
 const x=selected[i%selected.length];
 must(await s.from('fellowship_groups').update({postal_code:x.cep,street:x.street,neighborhood:x.neighborhood,city:x.city,state:'RS',country:'Brasil'}).eq('organization_id',org).eq('id',id('groups',i)),'group geo');
}
// Keep the headquarters address. Re-run its enrichment using the genuine CNEFE center.
must(await s.from('churches').update({postal_code:churchBefore.postal_code}).eq('id',church).eq('organization_id',org),'headquarters geo');
const members=must(await s.from('members').select('id,postal_code,street,city,state,latitude,longitude,geo_source,geo_precision,map_consent_at').eq('organization_id',org).in('id',Array.from({length:300},(_,i)=>id('members',i))),'verify');
if(members.length!==300)throw Error(`Expected 300, got ${members.length}`);
for(const m of members){const x=selected.find(x=>x.cep===m.postal_code);if(!x||m.latitude!==x.latitude||m.longitude!==x.longitude||m.city!==x.city||m.state!=='RS'||!m.map_consent_at)throw Error(`Incorrect saved position ${m.id}`);}
const after=must(await s.from('churches').select('id,address,postal_code,latitude,longitude,is_headquarters').eq('id',church).single(),'headquarters verification');
if(after.latitude!==sede.latitude||after.longitude!==sede.longitude||!after.is_headquarters)throw Error('Wrong headquarters position');
const report={members:members.length,cities:members.reduce((a,m)=>(a[m.city]=(a[m.city]??0)+1,a),{}),ceps:selected.map(({cep,street,city,latitude,longitude,count,nearest_address_m,rounding_m})=>({cep,street,city,latitude,longitude,count,nearest_address_m,rounding_m})),headquarters:after};
writeFileSync('/tmp/cex-teste-map-audit.json',JSON.stringify(report,null,2),{mode:0o600});console.log(JSON.stringify(report,null,2));
