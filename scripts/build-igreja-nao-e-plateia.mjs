// Script pontual: monta pt.json/en.json/es.json de "Igreja não é plateia"
// a partir dos .html ja convertidos em /tmp/cex_extract e do texto lido das
// apresentacoes da serie. Nao e parte do pipeline reutilizavel (isso e so
// a montagem de dados deste material especifico).
import fs from "node:fs";

const H = "/tmp/cex_extract";
const OUT = "content-intake/igreja-nao-e-plateia";

function html(name) {
  return fs.readFileSync(`${H}/${name}`, "utf-8");
}

const PAGES = 8;

const base = {
  id: "igreja-nao-e-plateia",
  familia: "ministrar",
  estante: "igreja-toda",
  model: "A",
  etiqueta: "Igreja toda",
  code: null,
  big: null,
  big_label: "mensagens",
  mensagens: 4,
  paginas: 32,
  formatos: ["PDF", "Editável"],
  preco: "R$ 67",
  hotmart_url: "",
  hotmart_product_id: null,
  hotmart_offer_id: null,
  colecoes: [],
  status: "Rascunho",
};

const pt = {
  ...base,
  titulo: "Igreja Não É Plateia",
  promessa: "Quatro mensagens expositivas em Efésios 4:1-16 para a igreja sair da plateia: pertencer ao corpo, reconhecer a graça recebida, assumir responsabilidade pelo crescimento e aprender a edificar outras pessoas.",
  pra_quem: "Para pastores e líderes que precisam preparar a igreja para servir sem pressionar pessoas: fortalecer pertencimento, desenvolver novos trabalhadores e dar continuidade em pequenos grupos, mesmo com poucos voluntários, orçamento limitado e pouco tempo de preparação.",
  conteudo: [
    "Mensagem 1: Você não foi chamado para caminhar sozinho",
    "Mensagem 2: A graça colocou algo em suas mãos",
    "Mensagem 3: Crescer também é sua responsabilidade",
    "Mensagem 4: Quando cada parte funciona",
  ],
  como_usar: "Cada mensagem vem completa para 35 a 45 minutos: preparação do preletor, três movimentos de exposição do texto em Efésios 4, aplicações práticas, conexão com o evangelho, oração sugerida, roteiro para pequenos grupos e desafio da semana.",
  faq: [
    { q: "O texto bíblico completo vem incluído?", a: "Não. O preletor usa a tradução adotada pela igreja e pode comparar outras versões durante a preparação." },
    { q: "Preciso de formação teológica avançada para pregar essa série?", a: "Não. O material foi escrito para pastores, líderes e pregadores sem formação teológica avançada aplicarem com segurança." },
    { q: "Serve para quanto tempo de culto?", a: "Cada mensagem foi pensada para 35 a 45 minutos, com distribuição de tempo sugerida por movimento." },
    { q: "Tem roteiro para pequenos grupos?", a: "Sim, incluído em cada uma das quatro mensagens, junto com um desafio prático para a semana." },
  ],
  mensagens_lista: [
    { nome: "Você não foi chamado para caminhar sozinho", desc: "Efésios 4:1-6. O chamado recebido em Cristo nos reúne em um só corpo e ensina a proteger, com amor, a unidade que o Espírito já criou." },
    { nome: "A graça colocou algo em suas mãos", desc: "Efésios 4:7-12. O Cristo vitorioso concede graça à sua igreja e usa líderes para preparar todo o povo para o serviço." },
    { nome: "Crescer também é sua responsabilidade", desc: "Efésios 4:13-14. Cristo conduz todo o corpo à maturidade para que não vivamos instáveis, mas firmes na verdade e parecidos com ele." },
    { nome: "Quando cada parte funciona", desc: "Efésios 4:15-16. Sob o governo de Cristo, a igreja cresce quando verdade e amor permanecem juntos e cada parte oferece sua contribuição." },
  ],
  keywords: ["efésios 4", "igreja toda", "pertencimento", "serviço", "unidade", "maturidade", "discipulado", "adultos"],
  contents: [
    { kind: "word", name: "Mensagem 1: Você não foi chamado para caminhar sozinho", note: "Efésios 4:1-6 · pertencimento e unidade", pages: PAGES, messages: 1, delivery: "word", file: null, roteiro: html("01_Portugues__01_Mensagens__CEX_2026_001_PT_Mensagem_01_Voce_nao_foi_chamado_para_caminhar_sozinho_v2.0.html") },
    { kind: "word", name: "Mensagem 2: A graça colocou algo em suas mãos", note: "Efésios 4:7-12 · dons e serviço", pages: PAGES, messages: 1, delivery: "word", file: null, roteiro: html("01_Portugues__01_Mensagens__CEX_2026_001_PT_Mensagem_02_A_graca_colocou_algo_em_suas_maos_v2.0.html") },
    { kind: "word", name: "Mensagem 3: Crescer também é sua responsabilidade", note: "Efésios 4:13-14 · maturidade", pages: PAGES, messages: 1, delivery: "word", file: null, roteiro: html("01_Portugues__01_Mensagens__CEX_2026_001_PT_Mensagem_03_Crescer_tambem_e_sua_responsabilidade_v2.0.html") },
    { kind: "word", name: "Mensagem 4: Quando cada parte funciona", note: "Efésios 4:15-16 · verdade e amor em ação", pages: PAGES, messages: 1, delivery: "word", file: null, roteiro: html("01_Portugues__01_Mensagens__CEX_2026_001_PT_Mensagem_04_Quando_cada_parte_funciona_v2.0.html") },
  ],
};

const en = {
  titulo: "Church Is Not an Audience",
  promessa: "A four-message expository series on Ephesians 4:1-16 to help the church move beyond the audience: belonging to the body, recognizing grace received, taking responsibility for growth, and learning to build others up.",
  pra_quem: "For pastors and leaders who need to equip the church to serve without pressuring people: strengthen belonging, develop new workers, and follow through in small groups, even with few volunteers, limited budgets, and little preparation time.",
  conteudo: [
    "Message 1: You Were Not Called to Walk Alone",
    "Message 2: Grace Has Placed Something in Your Hands",
    "Message 3: Your Growth Is Also Your Responsibility",
    "Message 4: When Every Part Does Its Work",
  ],
  contents: [
    { kind: "word", name: "Message 1: You Were Not Called to Walk Alone", note: "Ephesians 4:1-6 · belonging and unity", pages: PAGES, messages: 1, delivery: "word", file: null, roteiro: html("02_English__01_Messages__CEX_2026_001_EN_Message_01_You_were_not_called_to_walk_alone_v2.0.html") },
    { kind: "word", name: "Message 2: Grace Has Placed Something in Your Hands", note: "Ephesians 4:7-12 · gifts and service", pages: PAGES, messages: 1, delivery: "word", file: null, roteiro: html("02_English__01_Messages__CEX_2026_001_EN_Message_02_Grace_has_placed_something_in_your_hands_v2.0.html") },
    { kind: "word", name: "Message 3: Your Growth Is Also Your Responsibility", note: "Ephesians 4:13-14 · maturity", pages: PAGES, messages: 1, delivery: "word", file: null, roteiro: html("02_English__01_Messages__CEX_2026_001_EN_Message_03_Your_growth_is_also_your_responsibility_v2.0.html") },
    { kind: "word", name: "Message 4: When Every Part Does Its Work", note: "Ephesians 4:15-16 · truth and love in action", pages: PAGES, messages: 1, delivery: "word", file: null, roteiro: html("02_English__01_Messages__CEX_2026_001_EN_Message_04_When_every_part_does_its_work_v2.0.html") },
  ],
  mensagens_lista: [
    { nome: "You Were Not Called to Walk Alone", desc: "Ephesians 4:1-6. The calling we received in Christ gathers us into one body and teaches us to protect, with love, the unity the Spirit has already created." },
    { nome: "Grace Has Placed Something in Your Hands", desc: "Ephesians 4:7-12. The victorious Christ gives grace to his church and uses leaders to equip all his people for service." },
    { nome: "Your Growth Is Also Your Responsibility", desc: "Ephesians 4:13-14. Christ leads the whole body toward maturity so that we will not live unstable lives, but will stand firm in the truth and become like him." },
    { nome: "When Every Part Does Its Work", desc: "Ephesians 4:15-16. Under Christ's rule, the church grows when truth and love remain together and every part offers its contribution." },
  ],
  faq: [
    { q: "Is the full biblical text included?", a: "No. The preacher uses the translation adopted by the church and may compare other versions during preparation." },
    { q: "Do I need advanced theological training to preach this series?", a: "No. The material was written for pastors, leaders, and preachers without advanced theological training to apply it safely." },
    { q: "How long is each service meant to be?", a: "Each message was designed for 35 to 45 minutes, with a suggested time distribution per movement." },
    { q: "Is there a small-group guide?", a: "Yes, included in each of the four messages, along with a practical challenge for the week." },
  ],
  keywords: ["ephesians 4", "whole church", "belonging", "service", "unity", "maturity", "discipleship", "adults"],
};

const es = {
  titulo: "La Iglesia No Es Una Audiencia",
  promessa: "Una serie expositiva de cuatro mensajes sobre Efesios 4:1-16 para que la iglesia deje de ser audiencia: pertenecer al cuerpo, reconocer la gracia recibida, asumir responsabilidad por el crecimiento y aprender a edificar a otras personas.",
  pra_quem: "Para pastores y líderes que necesitan preparar a la iglesia para servir sin presionar a las personas: fortalecer la pertenencia, desarrollar nuevos obreros y dar continuidad en grupos pequeños, incluso con pocos voluntarios, presupuesto limitado y poco tiempo de preparación.",
  conteudo: [
    "Mensaje 1: No fuiste llamado a caminar solo",
    "Mensaje 2: La gracia puso algo en tus manos",
    "Mensaje 3: Tu crecimiento también es tu responsabilidad",
    "Mensaje 4: Cuando cada parte hace su trabajo",
  ],
  contents: [
    { kind: "word", name: "Mensaje 1: No fuiste llamado a caminar solo", note: "Efesios 4:1-6 · pertenencia y unidad", pages: PAGES, messages: 1, delivery: "word", file: null, roteiro: html("03_Espanol__01_Mensajes__CEX_2026_001_ES_Mensaje_01_No_fuiste_llamado_a_caminar_solo_v2.0.html") },
    { kind: "word", name: "Mensaje 2: La gracia puso algo en tus manos", note: "Efesios 4:7-12 · dones y servicio", pages: PAGES, messages: 1, delivery: "word", file: null, roteiro: html("03_Espanol__01_Mensajes__CEX_2026_001_ES_Mensaje_02_La_gracia_puso_algo_en_tus_manos_v2.0.html") },
    { kind: "word", name: "Mensaje 3: Tu crecimiento también es tu responsabilidad", note: "Efesios 4:13-14 · madurez", pages: PAGES, messages: 1, delivery: "word", file: null, roteiro: html("03_Espanol__01_Mensajes__CEX_2026_001_ES_Mensaje_03_Tu_crecimiento_tambien_es_tu_responsabilidad_v2.0.html") },
    { kind: "word", name: "Mensaje 4: Cuando cada parte hace su trabajo", note: "Efesios 4:15-16 · verdad y amor en acción", pages: PAGES, messages: 1, delivery: "word", file: null, roteiro: html("03_Espanol__01_Mensajes__CEX_2026_001_ES_Mensaje_04_Cuando_cada_parte_hace_su_trabajo_v2.0.html") },
  ],
  mensagens_lista: [
    { nome: "No fuiste llamado a caminar solo", desc: "Efesios 4:1-6. El llamado recibido en Cristo nos reúne en un solo cuerpo y nos enseña a proteger, con amor, la unidad que el Espíritu ya creó." },
    { nome: "La gracia puso algo en tus manos", desc: "Efesios 4:7-12. El Cristo victorioso concede gracia a su iglesia y usa líderes para preparar a todo su pueblo para el servicio." },
    { nome: "Tu crecimiento también es tu responsabilidad", desc: "Efesios 4:13-14. Cristo conduce a todo el cuerpo hacia la madurez para que no vivamos de manera inestable, sino firmes en la verdad y semejantes a él." },
    { nome: "Cuando cada parte hace su trabajo", desc: "Efesios 4:15-16. Bajo el gobierno de Cristo, la iglesia crece cuando la verdad y el amor permanecen unidos y cada parte ofrece su contribución." },
  ],
  faq: [
    { q: "¿Se incluye el texto bíblico completo?", a: "No. El predicador usa la traducción adoptada por la iglesia y puede comparar otras versiones durante la preparación." },
    { q: "¿Necesito formación teológica avanzada para predicar esta serie?", a: "No. El material fue escrito para que pastores, líderes y predicadores sin formación teológica avanzada lo apliquen con seguridad." },
    { q: "¿Para cuánto tiempo de celebración sirve?", a: "Cada mensaje fue pensado para 35 a 45 minutos, con una distribución de tiempo sugerida por movimiento." },
    { q: "¿Tiene guía para grupos pequeños?", a: "Sí, incluida en cada uno de los cuatro mensajes, junto con un desafío práctico para la semana." },
  ],
  keywords: ["efesios 4", "iglesia toda", "pertenencia", "servicio", "unidad", "madurez", "discipulado", "adultos"],
};

fs.writeFileSync(`${OUT}/pt.json`, JSON.stringify(pt, null, 2));
fs.writeFileSync(`${OUT}/en.json`, JSON.stringify({ ...base, ...en }, null, 2));
fs.writeFileSync(`${OUT}/es.json`, JSON.stringify({ ...base, ...es }, null, 2));
console.log("Escrito:", `${OUT}/pt.json`, `${OUT}/en.json`, `${OUT}/es.json`);
