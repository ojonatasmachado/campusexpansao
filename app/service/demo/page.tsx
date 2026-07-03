import ServiceExactApp from "../ServiceExactApp";

const ORG = "org-demo";
const CHURCH_1 = "ch-1";
const CHURCH_2 = "ch-2";

const CHURCHES = [
  { id: CHURCH_1, organizationId: ORG, nome: "CE.X Central", cidade: "São Paulo", matriz: true, doc: "12.345.678/0001-90", foundedYear: "2012", address: "Rua das Missões, 120", postalCode: "01234-000", email: "contato@cexcentral.org", phone: "(11) 4002-8922" },
  { id: CHURCH_2, organizationId: ORG, nome: "CE.X Norte", cidade: "São Paulo", matriz: false },
];

const CHURCH_IDENTITY = {
  church_id: CHURCH_1,
  purpose: "Existimos para os de fora. Toda a nossa estrutura serve ao alcance da cidade.",
  mission: "CE.X Central existe para fazer discípulos de Jesus Cristo que transformem a cidade.",
  vision: "Uma rede de igrejas saudáveis que impacta cada bairro da cidade.",
  verse: "Mateus 28:18-20 · A Grande Comissão",
  values: [{ title: "Comunidade" }, { title: "Palavra" }, { title: "Missão" }],
};

const CYCLES = [
  { id: "cy-1", year: "2026 · 1º semestre", theme: "Raízes profundas", verse: "Salmos 1:3 · \"Será como árvore plantada junto a ribeiros de águas\"", body: "Um chamado a aprofundar a vida com Deus — na Palavra, na oração e na comunidade — para que o crescimento externo seja fruto de raízes internas sólidas.", objectives: [{ title: "Crescimento pessoal na leitura bíblica diária" }, { title: "Multiplicação de grupos de discipulado" }, { title: "Integração de 80% dos visitantes em GCs" }], is_active: true },
];

const HISTORY_ENTRIES = [
  { id: "he-1", year: "2012", title: "Fundação", body: "Início do ministério com 12 pessoas comprometidas com a visão de alcançar a cidade por meio de discipulado intencional.", link: null, sort_order: 0 },
  { id: "he-2", year: "2016", title: "Primeira expansão", body: "Abertura da primeira congregação em bairro vizinho. A rede começa a tomar forma: mesma visão, mesma doutrina, mesma cultura.", link: null, sort_order: 1 },
  { id: "he-3", year: "2020", title: "Transformação digital", body: "Migração completa para plataforma digital durante a pandemia. A comunidade descobriu a força dos grupos online.", link: null, sort_order: 2 },
  { id: "he-4", year: "2024", title: "CE.X Service", body: "Lançamento da plataforma de gestão ministerial: pessoas, escala, jornada e comunicação num único lugar.", link: null, sort_order: 3 },
];

const MINISTERIAL_TITLES = [
  { id: "mt-1", name: "Pastor", sort_order: 0 },
  { id: "mt-2", name: "Diácono", sort_order: 1 },
  { id: "mt-3", name: "Presbítero", sort_order: 2 },
];

const FELLOWSHIP_GROUPS = [
  { id: "fg-1", name: "GC Centro", leader_person_id: "p1", weekday: "Quarta-feira", time: "20h", neighborhood: "Centro" },
  { id: "fg-2", name: "GC Vila Madalena", leader_person_id: "p2", weekday: "Terça-feira", time: "19h30", neighborhood: "Vila Madalena" },
];

const TAGS = [
  { id: "tg-1", name: "Jovens", color: "olive", leaders: ["p1"] },
  { id: "tg-2", name: "Kids", color: "wheat", leaders: ["p4"] },
];

const PEOPLE = [
  { id: "p1", name: "Ana Lima", phone: "(11) 9 8765-4321", email: "ana@cex.com", status: "ativo" as const, engagement: 92, availability: { dom_m: true, dom_n: true, qua: false }, tags: ["louvor"] },
  { id: "p2", name: "Bruno Costa", phone: "(11) 9 7654-3210", email: "bruno@cex.com", status: "ativo" as const, engagement: 78, availability: { dom_m: true, dom_n: false, qua: true }, tags: ["midia"] },
  { id: "p3", name: "Carla Santos", phone: "(11) 9 6543-2109", email: "carla@cex.com", status: "pausa" as const, engagement: 45, availability: { dom_m: false, dom_n: true, qua: true }, tags: ["recepcao"] },
  { id: "p4", name: "Diego Ferreira", phone: "(11) 9 5432-1098", email: "diego@cex.com", status: "ativo" as const, engagement: 85, availability: { dom_m: true, dom_n: true, qua: false }, tags: ["louvor", "kids"] },
  { id: "p5", name: "Eduarda Nunes", phone: "(11) 9 4321-0987", email: "edu@cex.com", status: "ativo" as const, engagement: 67, availability: { dom_m: false, dom_n: true, qua: false }, tags: ["diaconia"] },
  { id: "p6", name: "Felipe Rocha", phone: "(11) 9 3210-9876", email: "felipe@cex.com", status: "ferias" as const, engagement: 55, availability: { dom_m: true, dom_n: false, qua: false }, tags: ["intercessao"] },
];

const MEMBERS = [
  { id: "m1", name: "Ana Lima", phone: "(11) 9 8765-4321", email: "ana@cex.com", situation: "membro" as const, firstContact: "2019-03-12", neighborhood: "Pinheiros", journey: [1, 1, 1, 1, 1] },
  { id: "m2", name: "Bruno Costa", phone: "(11) 9 7654-3210", email: "bruno@cex.com", situation: "membro" as const, firstContact: "2020-07-08", neighborhood: "Vila Madalena", journey: [1, 1, 1, 0, 1] },
  { id: "m3", name: "Diego Ferreira", phone: "(11) 9 5432-1098", email: "diego@cex.com", situation: "membro" as const, firstContact: "2021-01-15", neighborhood: "Santana", journey: [1, 1, 0, 0, 0] },
  { id: "m4", name: "Eduarda Nunes", phone: "(11) 9 4321-0987", email: "edu@cex.com", situation: "novo" as const, firstContact: "2024-09-03", neighborhood: "Mooca", journey: [1, 0, 0, 0, 0] },
];

const MINISTRIES = [
  {
    id: "min-1", organizationId: ORG, name: "Louvor", icon: "louvor", description: "Time de música e adoração. Ensaios toda semana.",
    positions: [
      { id: "pos-1-1", ministry_id: "min-1", name: "Vocal", need_count: 3, sort_order: 0 },
      { id: "pos-1-2", ministry_id: "min-1", name: "Instrumentista", need_count: 4, sort_order: 1 },
    ],
    people: [
      { personId: "p1", personName: "Ana Lima", isLeader: true, functions: ["vocal"] },
      { personId: "p4", personName: "Diego Ferreira", isLeader: false, functions: ["guitarra"] },
    ],
  },
  {
    id: "min-2", organizationId: ORG, name: "Mídia & Comunicação", icon: "midia", description: "Transmissão, design e redes sociais.",
    positions: [
      { id: "pos-2-1", ministry_id: "min-2", name: "Operador", need_count: 2, sort_order: 0 },
    ],
    people: [
      { personId: "p2", personName: "Bruno Costa", isLeader: true, functions: ["operador"] },
    ],
  },
  {
    id: "min-3", organizationId: ORG, name: "Recepção", icon: "recepcao", description: "Acolhimento e recepção de visitantes no domingo.",
    positions: [
      { id: "pos-3-1", ministry_id: "min-3", name: "Recepcionista", need_count: 4, sort_order: 0 },
    ],
    people: [
      { personId: "p3", personName: "Carla Santos", isLeader: true, functions: ["recepcao"] },
      { personId: "p5", personName: "Eduarda Nunes", isLeader: false, functions: ["recepcao"] },
    ],
  },
  {
    id: "min-4", organizationId: ORG, name: "Kids", icon: "kids", description: "Ministério infantil e escola bíblica.",
    positions: [
      { id: "pos-4-1", ministry_id: "min-4", name: "Professor", need_count: 2, sort_order: 0 },
    ],
    people: [
      { personId: "p4", personName: "Diego Ferreira", isLeader: false, functions: ["professor"] },
    ],
  },
];

const EVENTS = [
  {
    id: "ev-1", organizationId: ORG, name: "Culto de domingo manhã", kind: "culto", weekday: "Dom",
    eventDate: "06/07/2026", time: "10h00", slot: "dom_m", location: "Templo principal",
    ministries: ["min-1", "min-2", "min-3"],
    schedule: [
      { id: "sc-1", item: "Abertura e boas-vindas", time: "10:00", category: "recepcao" },
      { id: "sc-2", item: "Louvor (3 músicas)", time: "10:10", category: "louvor" },
      { id: "sc-3", item: "Anúncios", time: "10:35", category: "comunicacao" },
      { id: "sc-4", item: "Mensagem", time: "10:45", category: "palavra" },
      { id: "sc-5", item: "Oferta e encerramento", time: "11:25", category: "geral" },
    ],
    setlist: [
      { id: "sl-1", title: "Grande é o Senhor", song_key: "G" },
      { id: "sl-2", title: "Teu Reino", song_key: "D" },
      { id: "sl-3", title: "Imensidão", song_key: "A" },
    ],
    checkinToken: null, checkinActive: true,
  },
  {
    id: "ev-2", organizationId: ORG, name: "Culto de domingo noite", kind: "culto", weekday: "Dom",
    eventDate: "06/07/2026", time: "19h00", slot: "dom_n", location: "Templo principal",
    ministries: ["min-1", "min-2"],
    schedule: [
      { id: "sc-6", item: "Abertura", time: "19:00", category: "geral" },
      { id: "sc-7", item: "Louvor", time: "19:10", category: "louvor" },
      { id: "sc-8", item: "Mensagem", time: "19:45", category: "palavra" },
    ],
    setlist: [
      { id: "sl-4", title: "Hosana", song_key: "E" },
      { id: "sl-5", title: "Alvo Mais que a Neve", song_key: "C" },
    ],
    checkinToken: null, checkinActive: true,
  },
];

const ROSTER = [
  { id: "r1", event_id: "ev-1", position_id: "pos-1-1", person_id: "p1", status: "ok" as const },
  { id: "r2", event_id: "ev-1", position_id: "pos-1-2", person_id: "p4", status: "ok" as const },
  { id: "r3", event_id: "ev-1", position_id: "pos-2-1", person_id: "p2", status: "wait" as const },
  { id: "r4", event_id: "ev-1", position_id: "pos-3-1", person_id: "p3", status: "ok" as const },
  { id: "r5", event_id: "ev-2", position_id: "pos-1-1", person_id: "p1", status: "ok" as const },
];

const VISITORS = [
  { id: "v1", name: "Marina Oliveira", phone: "(11) 9 2109-8765", stage: "novo" as const, origin: "Amigo da comunidade", visited_on: "29/06/2026", responsible_id: "p1", due: "1º contato", due_status: "soon" as const, reply_status: null, member_id: null, created_at: new Date().toISOString() },
  { id: "v2", name: "Rafael Souza", phone: "(11) 9 1098-7654", stage: "contato" as const, origin: "Instagram", visited_on: "22/06/2026", responsible_id: "p3", due: "Convidar para GC", due_status: "ok" as const, reply_status: "respondeu" as const, member_id: null, created_at: new Date().toISOString() },
  { id: "v3", name: "Letícia Alves", phone: "(11) 9 0987-6543", stage: "integrando" as const, origin: "Culto aberto", visited_on: "15/06/2026", responsible_id: "p5", due: "Decisão?", due_status: "late" as const, reply_status: "sem_resposta" as const, member_id: null, created_at: new Date().toISOString() },
];

const DECISIONS = [
  { id: "d1", name: "Carlos Mendes", phone: "(11) 9 8765-0000", happened_on: "29/06/2026", kind: "decisao" as const, service_name: "Culto Domingo manhã", responsible_id: "p1", status: "novo" as const, member_id: null, age: 28, notes: null, created_at: new Date().toISOString() },
  { id: "d2", name: "Juliana Pires", phone: "(11) 9 7654-0000", happened_on: "22/06/2026", kind: "reconciliacao" as const, service_name: "Culto Domingo noite", responsible_id: "p3", status: "acompanhando" as const, member_id: null, age: 34, notes: "Veio com a família", created_at: new Date().toISOString() },
];

const BAPTISM_CLASSES = [
  { id: "bc-1", label: "Turma Julho 2026", baptism_date: "20/07/2026", location: "Rio Tietê", pastor: "Pr. João", status: "aberta" as const, open_enrollment: true, notes: null },
];

const BAPTISM_CANDIDATES = [
  { id: "bca-1", class_id: "bc-1", member_id: "m4", decision_id: null },
];

const COURSES = [
  { id: "c1", name: "Fundamentos da Fé", level: "Básico", category: "discipulado", kind: "trilha" as const, color: "olive", description: "Introdução à doutrina cristã e vida na comunidade." },
  { id: "c2", name: "Liderança servidora", level: "Avançado", category: "liderança", kind: "trilha" as const, color: "wheat", description: "Formação de líderes para ministério." },
];

const ENROLLMENTS = [
  { id: "e1", course_id: "c1", member_id: "m1", status: "concluido" as const, done_count: 8 },
  { id: "e2", course_id: "c1", member_id: "m2", status: "cursando" as const, done_count: 5 },
  { id: "e3", course_id: "c2", member_id: "m1", status: "cursando" as const, done_count: 3 },
];

const BOARDS = [
  { id: "bd-1", name: "Planejamento anual", description: "Metas e iniciativas de 2026.", scope: "geral" as const, ministry_id: null, columns: [{ id: "todo", nome: "A fazer" }, { id: "doing", nome: "Em andamento" }, { id: "done", nome: "Concluído" }] },
  { id: "bd-2", name: "Louvor", description: "Repertório, datas e novas músicas.", scope: "time" as const, ministry_id: "min-1", columns: [{ id: "todo", nome: "A estudar" }, { id: "doing", nome: "Aprendendo" }, { id: "done", nome: "Pronta" }] },
];

const CARDS = [
  { id: "cd-1", board_id: "bd-1", column_id: "todo", title: "Definir tema do 2º semestre", description: null, priority: "alta" as const, due: "15/07/2026", assignees: ["p1"], source_type: "manual", moved_days_ago: null },
  { id: "cd-2", board_id: "bd-1", column_id: "doing", title: "Planejar retiro de líderes", description: "Logística e programação", priority: "media" as const, due: "30/07/2026", assignees: ["p2"], source_type: "manual", moved_days_ago: 3 },
  { id: "cd-3", board_id: "bd-2", column_id: "todo", title: "Aprender 'Oceanos'", description: null, priority: "baixa" as const, due: null, assignees: [], source_type: "manual", moved_days_ago: null },
];

const CHATS = [
  { id: "chat-1", name: "Louvor", kind: "time" as const, ministry_id: "min-1" },
  { id: "chat-2", name: "Liderança geral", kind: "grupo" as const, ministry_id: null },
];

const CHAT_MEMBERS = [
  { id: "cm-1", chat_id: "chat-1", member_id: "m1" },
  { id: "cm-2", chat_id: "chat-1", member_id: "m2" },
  { id: "cm-3", chat_id: "chat-2", member_id: "m1" },
];

const MESSAGES = [
  { id: "msg-1", chat_id: "chat-1", sender_id: "m1", body: "Pessoal, ensaio confirmado quinta às 19h30!", created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: "msg-2", chat_id: "chat-1", sender_id: "m2", body: "Confirmado! Vou levar o teclado.", created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: "msg-3", chat_id: "chat-2", sender_id: "m1", body: "Reunião de líderes cancelada esta semana.", created_at: new Date(Date.now() - 7200000).toISOString() },
];

const MEETINGS = [
  {
    id: "mt-1", title: "Reunião de liderança", meeting_date: "10/07/2026", time: "19h00",
    location: "Sala de reuniões", ministries: ["min-1", "min-2"],
    attendees: ["p1", "p2"], agenda: [{ item: "Planejamento do semestre" }, { item: "Relatório de crescimento" }],
    status: "agendada" as const, author_id: null, minutes: null,
  },
];

const MEETING_ACTIONS = [
  { id: "ma-1", meeting_id: "mt-1", description: "Enviar cronograma ao time", assignee_id: "p1", status: "pendente" as const },
];

const REHEARSALS = [
  {
    id: "rh-1", title: "Ensaio Domingo 06/07", ministry_id: "min-1",
    rehearsal_date: "03/07/2026", time: "19h30", location: "Auditório", kind: "louvor",
    recurrence: "semanal", audience: null, attendees: ["p1", "p4"],
    repertoire: [{ title: "Grande é o Senhor" }, { title: "Teu Reino" }],
    attachments: [], notes: "Focar na música nova.",
  },
];

const ROOMS = [
  { id: "rm-1", name: "Auditório principal", capacity: 300, location: "Térreo", resources: ["som", "projetor", "ar-condicionado"] },
  { id: "rm-2", name: "Sala de reuniões", capacity: 20, location: "1º andar", resources: ["TV", "quadro"] },
  { id: "rm-3", name: "Sala Kids", capacity: 40, location: "Térreo", resources: ["brinquedos", "TV"] },
];

const RESERVATIONS = [
  { id: "rv-1", room_id: "rm-1", title: "Culto domingo manhã", kind: "culto", reserved_date: "06/07/2026", start_time: "09:00", end_time: "12:00", source_type: "evento", source_id: "ev-1" },
  { id: "rv-2", room_id: "rm-2", title: "Reunião de liderança", kind: "reuniao", reserved_date: "10/07/2026", start_time: "19:00", end_time: "21:00", source_type: "reuniao", source_id: "mt-1" },
];

const ANNOUNCEMENTS = [
  { id: "an-1", title: "Retiro de jovens — inscrições abertas!", body: "Vagas limitadas. Garanta a sua até dia 15.", audience: "todos", author: "Liderança", when_label: "até 15/jul" },
  { id: "an-2", title: "Escalas de julho disponíveis", body: "Acesse o app do voluntário para confirmar sua participação.", audience: "voluntários", author: "Equipe de escalas", when_label: "agora" },
];

const WALL_POSTS = [
  { id: "wp-1", body: "Que culto incrível ontem! Deus esteve no meio de nós de forma especial. Gratidão a toda a equipe que serviu.", author: "Pr. João", audience: "todos", channels: ["app", "mural"], pinned: true, created_at: new Date().toISOString() },
  { id: "wp-2", body: "Novo ponto de oração às quartas, 7h da manhã. Venha interceder pela cidade!", author: "Equipe de intercessão", audience: "todos", channels: ["app"], pinned: false, created_at: new Date().toISOString() },
];

const VISITOR_NOTES = [
  { id: "vn-1", visitor_id: "v1", body: "Veio com o irmão. Interesse em GC.", author: "Ana Lima", happened_on: null, is_milestone: false, created_at: new Date().toISOString() },
];

export default function ServiceDemoPage() {
  return (
    <ServiceExactApp
      churches={CHURCHES}
      people={PEOPLE}
      members={MEMBERS}
      ministries={MINISTRIES}
      events={EVENTS}
      roster={ROSTER}
      visitorsInCare={VISITORS.length}
      visitors={VISITORS}
      visitorNotes={VISITOR_NOTES}
      announcements={ANNOUNCEMENTS}
      wallPosts={WALL_POSTS}
      decisions={DECISIONS}
      baptismClasses={BAPTISM_CLASSES}
      baptismCandidates={BAPTISM_CANDIDATES}
      courses={COURSES}
      enrollments={ENROLLMENTS}
      boards={BOARDS}
      cards={CARDS}
      chats={CHATS}
      chatMembers={CHAT_MEMBERS}
      messages={MESSAGES}
      meetings={MEETINGS}
      meetingActions={MEETING_ACTIONS}
      rehearsals={REHEARSALS}
      rooms={ROOMS}
      reservations={RESERVATIONS}
      churchIdentity={CHURCH_IDENTITY}
      cycles={CYCLES}
      historyEntries={HISTORY_ENTRIES}
      ministerialTitles={MINISTERIAL_TITLES}
      fellowshipGroups={FELLOWSHIP_GROUPS}
      tags={TAGS}
      error=""
    />
  );
}
