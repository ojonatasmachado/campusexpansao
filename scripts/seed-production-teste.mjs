// Authorized fixture for the existing production church Teste only.
// Run: node --env-file=.env.local scripts/seed-production-teste.mjs --apply
// Stable IDs + insert-only upserts make retries safe. Credentials stay in /tmp.
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';
import { writeFileSync, existsSync, readFileSync, chmodSync } from 'node:fs';
const church='48100f8c-3d6d-42c2-8452-41cca4e528b2', org='6eff8c44-a9fe-4b87-b906-ef491a648ed1';
const batch='cex-teste-300-v1', file='/tmp/cex-teste-300-credentials.json';
const c=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}), s=c.schema('service');
const must=(r,t)=>{if(r.error)throw new Error(`${t}: ${r.error.message}`);return r.data;};
const target=must(await s.from('churches').select('id,name,organization_id,settings,modules_on,modules_off').eq('id',church).single(),'church');
if(target.name.toLowerCase()!=='teste'||target.organization_id!==org)throw Error('Target mismatch');
if(!process.argv.includes('--apply')) { console.log('Target verified: Teste. Use --apply to insert 300 accounts and linked fixtures.');process.exit(0); }
const id=(t,i)=>{const h=createHash('sha256').update(`${batch}:${church}:${t}:${i}`).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const date=n=>new Date(Date.UTC(2026,9,25+n,15)).toISOString().slice(0,10), br=n=>date(n).split('-').reverse().join('/');
const rows=(n,f)=>Array.from({length:n},(_,i)=>f(i));
const base={organization_id:org,church_id:church}, counts={}, errors=[];
async function put(t,data,conflict='id',schema=s){if(!data.length)return;for(let i=0;i<data.length;i+=100)must(await schema.from(t).upsert(data.slice(i,i+100),{onConflict:conflict,ignoreDuplicates:true}),t);counts[t]=data.length;console.log(t,data.length);}
async function feature(name,f){try{await f();}catch(e){errors.push({name,error:e.message});console.log('FAILED',name,e.message);}}
const state=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{batch,church,org,password:randomBytes(24).toString('base64url'),users:[]};
if(state.batch!==batch||state.church!==church)throw Error('Credential state mismatch');
const save=()=>{writeFileSync(file,JSON.stringify(state,null,2),{mode:0o600});chmodSync(file,0o600);};save();
let existing=[];for(let page=1;;page++){const x=must(await c.auth.admin.listUsers({page,perPage:1000}),'auth list').users;existing.push(...x);if(x.length<1000)break;}
const first=['Ana','Bruno','Camila','Daniel','Ester','Felipe','Gabriela','Henrique','Isabela','João','Larissa','Lucas','Mariana','Mateus','Natália','Pedro','Raquel','Rafael','Sofia','Tiago'];
const last=['Silva','Santos','Oliveira','Souza','Pereira','Costa','Almeida','Ferreira','Lima','Ribeiro','Rocha','Martins','Barbosa','Carvalho','Nascimento'];
const role=i=>i<2?'master':i<10?'pastor':i<40?'lider':'membro';
for(let i=0;i<300;i++){
 const email=`teste.${String(i+1).padStart(3,'0')}@cex-fixture.example.com`, name=`${first[i%20]} ${last[Math.floor(i/20)%15]} Teste ${String(i+1).padStart(3,'0')}`;
 if(state.users[i])continue;
 const found=existing.find(u=>u.email===email);
 if(found&&found.user_metadata?.fixture_batch!==batch)throw Error(`Email collision ${email}`);
 const user=found??must(await c.auth.admin.createUser({email,password:state.password,email_confirm:true,user_metadata:{full_name:name,fixture_batch:batch}}),'create user').user;
 state.users[i]={id:user.id,email,name,role:role(i)};save();if(i%25===24)console.log('auth',i+1);
}
await put('users',state.users.map(u=>({id:u.id,email:u.email,full_name:u.name})),'id',c.schema('core'));
await put('memberships',state.users.map(u=>({user_id:u.id,organization_id:org,role:u.role,status:'active'})),'user_id,organization_id',c.schema('core'));
await put('people',state.users.map((u,i)=>({...base,id:id('people',i),user_id:u.id,name:u.name,email:u.email,status:i>40&&i%17===0?'ferias':i>40&&i%19===0?'pausa':'ativo'})));
await put('fellowship_groups',rows(15,i=>({...base,id:id('groups',i),name:`Teste · Grupo ${i+1}`,leader_person_id:id('people',10+i),weekday:['terça','quarta','quinta'][i%3],time:'20:00',capacity:25,neighborhood:['Centro','Jardim das Flores','Vila Esperança'][i%3],city:'São Paulo',state:'SP',country:'BR'})));
await put('members',state.users.map((u,i)=>({...base,id:id('members',i),volunteer_id:id('people',i),name:u.name,email:u.email,birth:`${String(1+i%28).padStart(2,'0')}/${String(1+i%12).padStart(2,'0')}/${1950+i%58}`,situation:i%6===0?'novo':'membro',since_year:String(2010+i%17),journey:[]})) .map((x,i)=>({...x,journey:rows(5,k=>k<i%6?1:0),group_id:i%6>=4?id('groups',i%15):null,city:'São Paulo',state:'SP',country:'BR'})));
const teams=['Louvor','Recepção','Kids','Mídia','Intercessão','Diaconia','Jovens','Ação social'];
await put('ministries',teams.map((n,i)=>({...base,id:id('teams',i),name:`Teste · ${n}`,icon:['louvor','recepcao','kids','midia','oracao','diaconia','louvor','diaconia'][i],app_modules:[]})));
await put('ministry_positions',rows(24,i=>({organization_id:org,id:id('positions',i),ministry_id:id('teams',Math.floor(i/3)),name:['Responsável','Apoio','Operação'][i%3],need_count:2,sort_order:i%3})));
await put('person_ministries',rows(180,i=>({organization_id:org,person_id:id('people',i),ministry_id:id('teams',i%8),is_leader:i>=10&&i<40,functions:['Apoio']})),'person_id,ministry_id');
await put('rooms',rows(8,i=>({...base,id:id('rooms',i),name:`Teste · ${['Auditório','Sala de reuniões','Sala de aula 1','Sala de aula 2','Berçário','Sala Kids','Estúdio','Salão social'][i]}`,capacity:[300,20,30,30,15,25,10,80][i],location:`Piso ${i%2+1}`,resources:['Cadeiras','Projetor','Wi-Fi']})));
const events=rows(24,i=>({...base,id:id('events',i),name:`Teste · ${i%3===0?'Culto':i%3===1?'Encontro de oração':'Encontro de jovens'} ${i+1}`,kind:i%3===0?'Culto':'Evento',event_date:date((i-8)*2),time:'19:30',location:'Teste · Auditório',ministries:teams.map((_,k)=>id('teams',k))}));
await put('events',events);
await put('roster_assignments',events.flatMap((e,i)=>rows(24,k=>({organization_id:org,id:id('roster',i*24+k),event_id:e.id,position_id:id('positions',k),person_id:id('people',(Math.floor(k/3)+(i+k%3)*8)%176),status:['ok','wait','no'][((i+k)%5===0?2:(i+k)%3===0?1:0)]}))));
await put('event_schedule_items',events.flatMap((e,i)=>rows(4,k=>({organization_id:org,id:id('schedule',i*4+k),event_id:e.id,item:['Boas-vindas','Louvor','Mensagem','Encerramento'][k],duration_min:[10,25,40,10][k],sort_order:k}))));
await put('setlist_songs',events.flatMap((e,i)=>rows(3,k=>({organization_id:org,id:id('songs',i*3+k),event_id:e.id,title:`Canção fictícia ${k+1}`,song_key:['G','D','C'][k],sort_order:k}))));
await put('event_attendance',events.slice(0,8).flatMap((e,i)=>rows(100,k=>({organization_id:org,id:id('attendance',i*100+k),event_id:e.id,person_id:id('people',(k+i*13)%270),checked_in_at:`${e.event_date}T22:30:00Z`,via:'manual',is_extra:k>50}))));
await put('courses',rows(6,i=>({...base,id:id('courses',i),name:`Teste · ${['Primeiros passos','Fundamentos da fé','Vida em comunidade','Liderança servidora','Família','Formação de voluntários'][i]}`,kind:['trilha','conteudo','presencial'][i%3],level:i<3?'Fundação':'Liderança',color:i<3?'wheat':'clay',description:'Curso fictício para testar matrículas e conclusão.',category:i<3?'entrada':'lideranca'})));
await put('course_modules',rows(18,i=>({organization_id:org,id:id('course_modules',i),course_id:id('courses',Math.floor(i/3)),name:`Módulo ${i%3+1}`,sort_order:i%3})));
await put('course_lessons',rows(54,i=>({organization_id:org,id:id('lessons',i),module_id:id('course_modules',Math.floor(i/3)),name:`Aula ${i%3+1}: conteúdo de teste`,kind:'texto',duration:'15 min',sort_order:i%3})));
await put('enrollments',rows(300,i=>({organization_id:org,id:id('enrollments',i),course_id:id('courses',i%6),member_id:id('members',i),done_count:i%4===0?9:i%9,status:i%4===0?'concluido':'cursando'})));
await put('meetings',rows(12,i=>({...base,id:id('meetings',i),title:`Teste · Reunião de planejamento ${i+1}`,meeting_date:date(i-4),time:'18:00',location:'Teste · Sala de reuniões',author_id:id('people',10+i),status:i<4?'realizada':'agendada',attendees:rows(8,k=>id('people',10+k)),ministries:[id('teams',i%8)],minutes:i<4?'Ata fictícia: próximos passos definidos.':null})));
await put('meeting_actions',rows(36,i=>({organization_id:org,id:id('actions',i),meeting_id:id('meetings',Math.floor(i/3)),description:`Teste · Providenciar material ${i+1}`,assignee_id:id('people',10+i%30),status:['pendente','andamento','feito'][i%3]})));
await put('reservations',rows(24,i=>({organization_id:org,id:id('reservations',i),room_id:id('rooms',i%8),title:`Teste · Reserva ${i+1}`,reserved_date:date(i),start_time:'18:00',end_time:'19:00',kind:'reuniao'})));
await put('rehearsals',rows(8,i=>({...base,id:id('rehearsals',i),ministry_id:id('teams',0),title:`Teste · Ensaio ${i+1}`,rehearsal_date:date(i*3),time:'20:00',location:'Teste · Auditório',attendees:rows(10,k=>id('people',k*8)),notes:'Ensaio fictício para testes.'})));
await put('visitors',rows(40,i=>({...base,id:id('visitors',i),name:`Visitante Fictício ${i+1}`,stage:['novo','contato','integrando','membro'][i%4],visited_on:br(-i),responsible_id:id('people',10+i%30),due_status:['soon','ok','late'][i%3],origin:'culto'})));
await put('visitor_notes',rows(40,i=>({organization_id:org,id:id('visitor_notes',i),visitor_id:id('visitors',i),body:'Contato fictício de acompanhamento.',author:'Equipe Teste',happened_on:br(-i)})));
await put('decisions',rows(24,i=>({...base,id:id('decisions',i),member_id:id('members',i+200),name:state.users[i+200].name,kind:i%3===0?'reconciliacao':'decisao',happened_on:br(-i),status:['novo','acompanhando','encaminhado'][i%3],responsible_id:id('people',2+i%8)})));
await put('baptism_classes',rows(3,i=>({...base,id:id('baptism_classes',i),label:`Teste · Turma de batismo ${i+1}`,baptism_date:date(i===0?-15:15+i*20),location:'Teste · Auditório',status:['concluida','aberta','preparacao'][i],open_enrollment:i===1,pastor:state.users[2+i].name})));
await put('baptism_candidates',rows(30,i=>({organization_id:org,id:id('baptism_candidates',i),class_id:id('baptism_classes',i%3),member_id:id('members',200+i)})));
await put('timeline_events',rows(300,i=>({organization_id:org,id:id('timeline',i),member_id:id('members',i),event_type:'decisao',title:'Decisão registrada para teste',when_label:br(-180+i%90),sort_key:Number(date(-180+i%90).replaceAll('-',''))})));
await put('announcements',rows(8,i=>({...base,id:id('announcements',i),title:`Teste · ${['Encontro da comunidade','Campanha solidária','Inscrições para batismo','Curso de fundamentos'][i%4]} ${i+1}`,body:'Conteúdo fictício para validar a ferramenta.',audience:'todos',status:i<6?'publicado':'rascunho',kind:'aviso',author:'Equipe Teste'})));
await put('prayer_requests',rows(24,i=>({...base,id:id('prayers',i),member_id:id('members',i+50),kind:'oracao',body:`Pedido fictício ${i+1}: oração pela família e comunidade.`,status:['aberto','em_contato','resolvido'][i%3],audience:i%2?'mural':'intercessao',moderation:'ativo',is_private:i%4===0})));
await put('boards',rows(4,i=>({...base,id:id('boards',i),name:`Teste · Planejamento ${i+1}`,scope:'time',ministry_id:id('teams',i),columns:[{id:'pendente',nome:'A fazer'},{id:'andamento',nome:'Em andamento'},{id:'feito',nome:'Concluído'}]})));
await put('cards',rows(40,i=>({organization_id:org,id:id('cards',i),board_id:id('boards',i%4),column_id:['pendente','andamento','feito'][i%3],title:`Teste · Tarefa ${i+1}`,assignees:[id('people',i+10)],due:date(i-10),priority:['alta','media','baixa'][i%3]})));
await put('chats',rows(8,i=>({...base,id:id('chats',i),kind:'time',ministry_id:id('teams',i),name:`Teste · Conversa ${teams[i]}`})));
await put('chat_members',rows(80,i=>({organization_id:org,chat_id:id('chats',i%8),member_id:id('members',i)})),'chat_id,member_id');
await put('messages',rows(80,i=>({organization_id:org,id:id('messages',i),chat_id:id('chats',i%8),sender_id:id('members',i%80),body:`Mensagem fictícia ${i+1} para testar a conversa da equipe.`})));
await feature('kids',async()=>{
 await put('kids_classes',rows(4,i=>({...base,id:id('kids_classes',i),name:`Teste · ${['Berçário','Maternal','Primários','Juniores'][i]}`,min_age_months:[0,24,72,96][i],max_age_months:[23,71,95,143][i],room_id:id('rooms',4+i%2),capacity:20})));
 await put('children',rows(40,i=>({...base,id:id('children',i),class_id:id('kids_classes',i%4),name:`Criança Fictícia ${i+1}`,birth:`${2026-[1,4,7,10][i%4]}-01-15`,allergies:i%8===0?'Alergia fictícia: lactose':null,notes:'Cadastro fictício para teste.'})));
 await put('child_guardians',rows(40,i=>({organization_id:org,id:id('guardians',i),child_id:id('children',i),guardian_person_id:id('people',i+50),relationship:i%2?'pai':'mãe',can_pickup:true,is_primary:true})));
 await put('kids_sessions',rows(4,i=>({organization_id:org,id:id('kids_sessions',i),event_id:id('events',9),class_id:id('kids_classes',i)})));
 await put('kids_attendance',rows(40,i=>({organization_id:org,id:id('kids_attendance',i),session_id:id('kids_sessions',i%4),child_id:id('children',i),dropped_off_by:id('people',i+50),dropped_off_via:'manual',status:['presente','retirada_pendente','retirado'][i%3]})));
});
await feature('financeiro',async()=>{
 await put('fin_accounts',rows(2,i=>({...base,id:id('fin_accounts',i),name:`Teste · ${i?'Conta bancária':'Caixa'}`,kind:i?'banco':'caixa',opening_balance_cents:100000,opening_date:date(-90)})));
 await put('fin_categories',rows(2,i=>({organization_id:org,id:id('fin_categories',i),name:`Teste · ${i?'Despesas':'Contribuições'}`,kind:i?'despesa':'entrada'})));
 await put('fin_funds',[{organization_id:org,id:id('fin_funds',0),name:'Teste · Fundo de simulação',is_default:false}]);
 await put('fin_transactions',rows(90,i=>({...base,id:id('fin_tx',i),kind:i%2?'despesa':'entrada',status:i>70?'previsto':'realizado',occurred_on:date(i-70),due_on:date(i-70),amount_cents:1000+i*137,account_id:id('fin_accounts',i%2),category_id:id('fin_categories',i%2),fund_id:id('fin_funds',0),method:'pix',description:`Teste · Lançamento fictício ${i+1}`,contributor_member_id:i%2?null:id('members',i)})));
});
await put('care_marks',rows(12,i=>({organization_id:org,id:id('care',i),person_id:id('people',260+i),kind:i%2?'justificada':'contato',via:i%2?null:'mensagem',until:i%2?date(30):null,by_person:id('people',2)})));
await put('person_grants',[{organization_id:org,person_id:id('people',40),grant_code:'financeiro'},{organization_id:org,person_id:id('people',41),grant_code:'secretaria'}],'person_id,grant_code');
state.counts=counts;state.errors=errors;save();
console.log(JSON.stringify({church:target.name,counts,errors,credentials:file}));
