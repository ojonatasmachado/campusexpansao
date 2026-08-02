// Script pontual: monta pt.json/en.json/es.json para os 13 materiais do
// "Catalogo 2 por prateleira". Mesma logica do build-igreja-nao-e-plateia.mjs,
// generalizada pra varios materiais com o mesmo template de apresentacao.
import fs from "node:fs";

const H = "/tmp/cex_cat2_extract";
const OUT_ROOT = "content-intake";

function html(name) {
  return fs.readFileSync(`${H}/${name}`, "utf-8");
}

const COMO_USAR = {
  pt: "Cada encontro vem completo e pronto para preparação do líder: leitura bíblica, roteiro de atividades ou movimentos de exposição, aplicação, momento de resposta e continuidade durante a semana. Inclui versões integrais em português, inglês e espanhol, com a mesma sequência de conteúdo.",
  en: "Each session comes complete and ready for leader preparation: Bible reading, activity outline or teaching movements, application, a response moment, and continuity during the week. Includes complete versions in Portuguese, English, and Spanish, with the same content sequence.",
  es: "Cada encuentro viene completo y listo para la preparación del líder: lectura bíblica, guion de actividades o movimientos de exposición, aplicación, momento de respuesta y continuidad durante la semana. Incluye versiones íntegras en portugués, inglés y español, con la misma secuencia de contenido.",
};

function faqFor(resultado, uso, lang) {
  const Q1 = { pt: "Qual é o resultado esperado desta série?", en: "What is the expected outcome of this series?", es: "¿Cuál es el resultado esperado de esta serie?" }[lang];
  const Q2 = { pt: "Como usar essa série com responsabilidade?", en: "How should this series be used responsibly?", es: "¿Cómo usar esta serie con responsabilidad?" }[lang];
  return [
    { q: Q1, a: resultado },
    { q: Q2, a: uso },
  ];
}

function buildLangPayload(lang, m, langData, pages) {
  const conteudo = langData.unidades.map((u, i) => `${lang === "pt" ? "Unidade" : lang === "en" ? "Unit" : "Unidad"} ${i + 1}: ${u.titulo}`);
  const mensagens_lista = langData.unidades.map((u) => ({ nome: u.titulo, desc: u.verdade }));
  const contents = langData.unidades.map((u, i) => ({
    kind: "word",
    name: `${lang === "pt" ? "Unidade" : lang === "en" ? "Unit" : "Unidad"} ${i + 1}: ${u.titulo}`,
    note: u.texto,
    pages,
    messages: 1,
    delivery: "word",
    file: null,
    roteiro: html(u.file),
  }));
  return {
    titulo: langData.titulo,
    promessa: langData.promessa,
    pra_quem: langData.pra_quem,
    conteudo,
    como_usar: COMO_USAR[lang],
    faq: faqFor(langData.resultado, langData.uso, lang),
    mensagens_lista,
    keywords: langData.keywords,
    contents,
  };
}

function build(m) {
  const dir = `${OUT_ROOT}/${m.slug}`;
  fs.mkdirSync(dir, { recursive: true });
  const pages = m.pages;
  const base = {
    id: m.slug,
    familia: "ministrar",
    estante: m.estante,
    model: "A",
    etiqueta: m.etiqueta,
    code: `CEX-2026-${m.code}`,
    big: null,
    big_label: "mensagens",
    mensagens: 4,
    paginas: pages * 4,
    formatos: ["PDF", "Editável"],
    preco: m.preco,
    hotmart_url: "",
    hotmart_product_id: null,
    hotmart_offer_id: null,
    colecoes: [],
    status: "Rascunho",
  };
  const pt = { ...base, ...buildLangPayload("pt", m, m.pt, pages) };
  const en = { ...base, ...buildLangPayload("en", m, m.en, pages) };
  const es = { ...base, ...buildLangPayload("es", m, m.es, pages) };
  fs.writeFileSync(`${dir}/pt.json`, JSON.stringify(pt, null, 2));
  fs.writeFileSync(`${dir}/en.json`, JSON.stringify(en, null, 2));
  fs.writeFileSync(`${dir}/es.json`, JSON.stringify(es, null, 2));
  console.log("Escrito:", dir);
}

// ── dados dos 13 materiais ──────────────────────────────────────────────────
const MATERIALS = [
  {
    slug: "feito-por-deus", code: "002", estante: "infantil-bercario", etiqueta: "Berçário", preco: "R$ 37", pages: 3,
    pt: {
      titulo: "Feito por Deus",
      promessa: "Quatro encontros bíblicos para apresentar o Criador aos bebês por meio de palavras curtas, gestos repetidos e experiências sensoriais seguras.",
      pra_quem: "Criada para encontros de berçário com a presença de cuidadores ou voluntários próximos. Funciona em salas pequenas, com poucos recursos e sem necessidade de impressão.",
      resultado: "Ao final, o líder saberá conduzir um momento bíblico breve e o cuidador terá quatro frases simples para repetir na rotina da casa.",
      uso: "A série não transforma Gênesis em aula científica e não promete um mundo sem dor. Ela afirma quem criou, a bondade do projeto de Deus e a dignidade das pessoas, preparando o caminho para apresentar Cristo como Senhor da criação.",
      keywords: ["berçário", "criação", "deus criador", "gênesis", "bebês"],
      unidades: [
        { titulo: "Quando a luz chegou", texto: "Gênesis 1:1-5", verdade: "Deus criou a luz e chamou sua obra de boa.", file: "01_Bercario_0a1ano11meses__CEX_2026_002_Feito_por_Deus__01_Portugues__01_Mensagens__CEX_2026_002_PT_Mensagem_01_Quando_a_luz_chegou_v1.0.html" },
        { titulo: "Céu, água e chão", texto: "Gênesis 1:6-10", verdade: "Deus organizou os espaços onde sua criação viveria.", file: "01_Bercario_0a1ano11meses__CEX_2026_002_Feito_por_Deus__01_Portugues__01_Mensagens__CEX_2026_002_PT_Mensagem_02_Ceu_agua_e_chao_v1.0.html" },
        { titulo: "Um mundo cheio de vida", texto: "Gênesis 1:11-25", verdade: "Deus encheu a terra de plantas e animais conforme sua sabedoria.", file: "01_Bercario_0a1ano11meses__CEX_2026_002_Feito_por_Deus__01_Portugues__01_Mensagens__CEX_2026_002_PT_Mensagem_03_Um_mundo_cheio_de_vida_v1.0.html" },
        { titulo: "Pessoas feitas por Deus", texto: "Gênesis 1:26-31 e 2:1-3", verdade: "Toda pessoa foi criada à imagem de Deus e possui dignidade.", file: "01_Bercario_0a1ano11meses__CEX_2026_002_Feito_por_Deus__01_Portugues__01_Mensagens__CEX_2026_002_PT_Mensagem_04_Pessoas_feitas_por_Deus_v1.0.html" },
      ],
    },
    en: {
      titulo: "Made by God",
      promessa: "Four Bible sessions that introduce babies to the Creator through short phrases, repeated gestures, and safe sensory experiences.",
      pra_quem: "Created for nursery sessions with caregivers or nearby volunteers present. It works in small rooms, with few resources, and without the need for printing.",
      resultado: "By the end, the leader will know how to guide a brief Bible moment, and the caregiver will have four simple phrases to repeat in the home routine.",
      uso: "The series does not turn Genesis into a science lesson or promise a world without pain. It affirms who created, the goodness of God's design, and the dignity of people, preparing the way to present Christ as Lord of creation.",
      keywords: ["nursery", "creation", "god the creator", "genesis", "babies"],
      unidades: [
        { titulo: "When Light Appeared", texto: "Genesis 1:1-5", verdade: "God created light and called his work good.", file: "01_Bercario_0a1ano11meses__CEX_2026_002_Feito_por_Deus__02_English__01_Messages__CEX_2026_002_EN_Message_01_When_Light_Appeared_v1.0.html" },
        { titulo: "Sky, Water, and Ground", texto: "Genesis 1:6-10", verdade: "God arranged the spaces where his creation would live.", file: "01_Bercario_0a1ano11meses__CEX_2026_002_Feito_por_Deus__02_English__01_Messages__CEX_2026_002_EN_Message_02_Sky_Water_and_Ground_v1.0.html" },
        { titulo: "A World Full of Life", texto: "Genesis 1:11-25", verdade: "God filled the earth with plants and animals according to his wisdom.", file: "01_Bercario_0a1ano11meses__CEX_2026_002_Feito_por_Deus__02_English__01_Messages__CEX_2026_002_EN_Message_03_A_World_Full_of_Life_v1.0.html" },
        { titulo: "People Made by God", texto: "Genesis 1:26-31 and 2:1-3", verdade: "Every person was created in the image of God and has dignity.", file: "01_Bercario_0a1ano11meses__CEX_2026_002_Feito_por_Deus__02_English__01_Messages__CEX_2026_002_EN_Message_04_People_Made_by_God_v1.0.html" },
      ],
    },
    es: {
      titulo: "Hecho por Dios",
      promessa: "Cuatro encuentros bíblicos para presentar al Creador a los bebés mediante frases cortas, gestos repetidos y experiencias sensoriales seguras.",
      pra_quem: "Creada para encuentros de sala cuna con la presencia de cuidadores o voluntarios cercanos. Funciona en salas pequeñas, con pocos recursos y sin necesidad de imprimir.",
      resultado: "Al final, el líder sabrá conducir un momento bíblico breve y el cuidador tendrá cuatro frases sencillas para repetir en la rutina del hogar.",
      uso: "La serie no convierte Génesis en una clase de ciencias ni promete un mundo sin dolor. Afirma quién creó, la bondad del diseño de Dios y la dignidad de las personas, preparando el camino para presentar a Cristo como Señor de la creación.",
      keywords: ["sala cuna", "creación", "dios creador", "génesis", "bebés"],
      unidades: [
        { titulo: "Cuando llegó la luz", texto: "Génesis 1:1-5", verdade: "Dios creó la luz y llamó buena a su obra.", file: "01_Bercario_0a1ano11meses__CEX_2026_002_Feito_por_Deus__03_Espanol__01_Mensajes__CEX_2026_002_ES_Mensaje_01_Cuando_llego_la_luz_v1.0.html" },
        { titulo: "Cielo, agua y suelo", texto: "Génesis 1:6-10", verdade: "Dios organizó los espacios donde viviría su creación.", file: "01_Bercario_0a1ano11meses__CEX_2026_002_Feito_por_Deus__03_Espanol__01_Mensajes__CEX_2026_002_ES_Mensaje_02_Cielo_agua_y_suelo_v1.0.html" },
        { titulo: "Un mundo lleno de vida", texto: "Génesis 1:11-25", verdade: "Dios llenó la tierra de plantas y animales conforme a su sabiduría.", file: "01_Bercario_0a1ano11meses__CEX_2026_002_Feito_por_Deus__03_Espanol__01_Mensajes__CEX_2026_002_ES_Mensaje_03_Un_mundo_lleno_de_vida_v1.0.html" },
        { titulo: "Personas hechas por Dios", texto: "Génesis 1:26-31 y 2:1-3", verdade: "Toda persona fue creada a imagen de Dios y posee dignidad.", file: "01_Bercario_0a1ano11meses__CEX_2026_002_Feito_por_Deus__03_Espanol__01_Mensajes__CEX_2026_002_ES_Mensaje_04_Personas_hechas_por_Dios_v1.0.html" },
      ],
    },
  },
  {
    slug: "bem-perto", code: "003", estante: "infantil-bercario", etiqueta: "Berçário", preco: "R$ 37", pages: 3,
    pt: {
      titulo: "Bem Perto",
      promessa: "Uma primeira apresentação de Jesus pelas ações concretas dos Evangelhos: ele recebe, alimenta, acalma e vive com seu povo.",
      pra_quem: "Indicada para berçários durante cultos e encontros infantis. Cada unidade pode ser aplicada por um líder com apoio dos cuidadores e materiais grandes de uso comum.",
      resultado: "O bebê ouvirá o nome de Jesus em um ambiente seguro, e o cuidador receberá uma frase bíblica responsável para repetir em casa.",
      uso: "A presença de Jesus não é apresentada como promessa de ausência de medo, fome ou desconforto. A série mostra quem ele é e como seu senhorio sustenta confiança no meio da vida real.",
      keywords: ["berçário", "jesus", "evangelhos", "cuidado", "bebês"],
      unidades: [
        { titulo: "Jesus recebe os pequenos", texto: "Marcos 10:13-16", verdade: "Jesus recebe as crianças e mostra que elas não são invisíveis em seu Reino.", file: "01_Bercario_0a1ano11meses__CEX_2026_003_Bem_Perto__01_Portugues__01_Mensagens__CEX_2026_003_PT_Mensagem_01_Jesus_recebe_os_pequenos_v1.0.html" },
        { titulo: "Jesus vê a necessidade", texto: "Marcos 6:30-44", verdade: "Jesus vê pessoas cansadas e necessitadas e cuida delas com compaixão.", file: "01_Bercario_0a1ano11meses__CEX_2026_003_Bem_Perto__01_Portugues__01_Mensagens__CEX_2026_003_PT_Mensagem_02_Jesus_ve_a_necessidade_v1.0.html" },
        { titulo: "Jesus é maior que a tempestade", texto: "Marcos 4:35-41", verdade: "Jesus é Senhor mesmo quando seus discípulos sentem medo.", file: "01_Bercario_0a1ano11meses__CEX_2026_003_Bem_Perto__01_Portugues__01_Mensagens__CEX_2026_003_PT_Mensagem_03_Jesus_e_maior_que_a_tempestade_v1.0.html" },
        { titulo: "Jesus vive e está conosco", texto: "Mateus 28:1-10 e 16-20", verdade: "Jesus ressuscitou, é Senhor e permanece com seus discípulos na missão.", file: "01_Bercario_0a1ano11meses__CEX_2026_003_Bem_Perto__01_Portugues__01_Mensagens__CEX_2026_003_PT_Mensagem_04_Jesus_vive_e_esta_conosco_v1.0.html" },
      ],
    },
    en: {
      titulo: "Very Near",
      promessa: "A first introduction to Jesus through the concrete actions of the Gospels: he welcomes, feeds, calms, and lives with his people.",
      pra_quem: "Designed for nurseries during worship services and children's gatherings. Each unit can be led by one leader with support from caregivers and large, commonly available materials.",
      resultado: "The baby will hear the name of Jesus in a safe environment, and the caregiver will receive a responsible biblical phrase to repeat at home.",
      uso: "The presence of Jesus is not presented as a promise that fear, hunger, or discomfort will be absent. The series shows who he is and how his lordship sustains trust in the midst of real life.",
      keywords: ["nursery", "jesus", "gospels", "care", "babies"],
      unidades: [
        { titulo: "Jesus Welcomes Little Ones", texto: "Mark 10:13-16", verdade: "Jesus welcomes children and shows that they are not invisible in his Kingdom.", file: "01_Bercario_0a1ano11meses__CEX_2026_003_Bem_Perto__02_English__01_Messages__CEX_2026_003_EN_Message_01_Jesus_Welcomes_Little_Ones_v1.0.html" },
        { titulo: "Jesus Sees the Need", texto: "Mark 6:30-44", verdade: "Jesus sees tired and needy people and cares for them with compassion.", file: "01_Bercario_0a1ano11meses__CEX_2026_003_Bem_Perto__02_English__01_Messages__CEX_2026_003_EN_Message_02_Jesus_Sees_the_Need_v1.0.html" },
        { titulo: "Jesus Is Greater Than the Storm", texto: "Mark 4:35-41", verdade: "Jesus is Lord even when his disciples are afraid.", file: "01_Bercario_0a1ano11meses__CEX_2026_003_Bem_Perto__02_English__01_Messages__CEX_2026_003_EN_Message_03_Jesus_Is_Greater_Than_the_Storm_v1.0.html" },
        { titulo: "Jesus Lives and Is with Us", texto: "Matthew 28:1-10 and 16-20", verdade: "Jesus rose from the dead, is Lord, and remains with his disciples in the mission.", file: "01_Bercario_0a1ano11meses__CEX_2026_003_Bem_Perto__02_English__01_Messages__CEX_2026_003_EN_Message_04_Jesus_Lives_and_Is_with_Us_v1.0.html" },
      ],
    },
    es: {
      titulo: "Muy Cerca",
      promessa: "Una primera presentación de Jesús a través de las acciones concretas de los Evangelios: él recibe, alimenta, calma y vive con su pueblo.",
      pra_quem: "Indicada para salas cuna durante cultos y encuentros infantiles. Cada unidad puede ser aplicada por un líder con el apoyo de los cuidadores y materiales grandes de uso común.",
      resultado: "El bebé oirá el nombre de Jesús en un ambiente seguro, y el cuidador recibirá una frase bíblica responsable para repetir en casa.",
      uso: "La presencia de Jesús no se presenta como promesa de ausencia de miedo, hambre o incomodidad. La serie muestra quién es él y cómo su señorío sostiene la confianza en medio de la vida real.",
      keywords: ["sala cuna", "jesús", "evangelios", "cuidado", "bebés"],
      unidades: [
        { titulo: "Jesús recibe a los pequeños", texto: "Marcos 10:13-16", verdade: "Jesús recibe a los niños y muestra que no son invisibles en su Reino.", file: "01_Bercario_0a1ano11meses__CEX_2026_003_Bem_Perto__03_Espanol__01_Mensajes__CEX_2026_003_ES_Mensaje_01_Jesus_recibe_a_los_pequenos_v1.0.html" },
        { titulo: "Jesús ve la necesidad", texto: "Marcos 6:30-44", verdade: "Jesús ve a personas cansadas y necesitadas y las cuida con compasión.", file: "01_Bercario_0a1ano11meses__CEX_2026_003_Bem_Perto__03_Espanol__01_Mensajes__CEX_2026_003_ES_Mensaje_02_Jesus_ve_la_necesidad_v1.0.html" },
        { titulo: "Jesús es mayor que la tormenta", texto: "Marcos 4:35-41", verdade: "Jesús es Señor aun cuando sus discípulos sienten miedo.", file: "01_Bercario_0a1ano11meses__CEX_2026_003_Bem_Perto__03_Espanol__01_Mensajes__CEX_2026_003_ES_Mensaje_03_Jesus_es_mayor_que_la_tormenta_v1.0.html" },
        { titulo: "Jesús vive y está con nosotros", texto: "Mateo 28:1-10 y 16-20", verdade: "Jesús resucitó, es Señor y permanece con sus discípulos en la misión.", file: "01_Bercario_0a1ano11meses__CEX_2026_003_Bem_Perto__03_Espanol__01_Mensajes__CEX_2026_003_ES_Mensaje_04_Jesus_vive_y_esta_con_nosotros_v1.0.html" },
      ],
    },
  },
  {
    slug: "do-jeitinho-que-estou", code: "004", estante: "infantil-maternal", etiqueta: "Maternal", preco: "R$ 37", pages: 3,
    pt: {
      titulo: "Do Jeitinho que Estou",
      promessa: "Uma série bíblica que ajuda crianças pequenas a nomear alegria, medo, tristeza e raiva sem vergonha e sem transformar sentimentos em falta de fé.",
      pra_quem: "Criada para classes de 2 a 5 anos, com orientações de adaptação. Pode ser conduzida com recursos simples e sem exigir relatos pessoais diante do grupo.",
      resultado: "A criança aprende quatro frases para reconhecer o que sente e buscar ajuda. O professor recebe linguagem pastoral para acolher sem diagnosticar nem expor.",
      uso: "A série não afirma que sentimentos desaparecem depois de uma oração. Ela diferencia emoção e ação, aponta para o cuidado de Jesus e ensina a procurar adultos seguros.",
      keywords: ["maternal", "emoções", "sentimentos", "medo", "raiva"],
      unidades: [
        { titulo: "Quando a alegria chega", texto: "Lucas 17:11-19", verdade: "Podemos reconhecer o cuidado de Deus e responder com gratidão.", file: "02_Maternal_2a5__CEX_2026_004_Do_Jeitinho_que_Estou__01_Portugues__01_Mensagens__CEX_2026_004_PT_Mensagem_01_Quando_a_alegria_chega_v1.0.html" },
        { titulo: "Quando o medo chega", texto: "Marcos 4:35-41", verdade: "Podemos buscar Jesus e um adulto seguro quando sentimos medo.", file: "02_Maternal_2a5__CEX_2026_004_Do_Jeitinho_que_Estou__01_Portugues__01_Mensagens__CEX_2026_004_PT_Mensagem_02_Quando_o_medo_chega_v1.0.html" },
        { titulo: "Quando a tristeza pesa", texto: "João 11:17-36", verdade: "Jesus se importa com nossa tristeza e se aproxima de quem sofre.", file: "02_Maternal_2a5__CEX_2026_004_Do_Jeitinho_que_Estou__01_Portugues__01_Mensagens__CEX_2026_004_PT_Mensagem_03_Quando_a_tristeza_pesa_v1.0.html" },
        { titulo: "Quando a raiva quer mandar", texto: "Efésios 4:26, 31-32", verdade: "Sentir raiva não nos autoriza a ferir; podemos pedir ajuda e escolher bondade.", file: "02_Maternal_2a5__CEX_2026_004_Do_Jeitinho_que_Estou__01_Portugues__01_Mensagens__CEX_2026_004_PT_Mensagem_04_Quando_a_raiva_quer_mandar_v1.0.html" },
      ],
    },
    en: {
      titulo: "Just as I Am",
      promessa: "A Bible series that helps young children name joy, fear, sadness, and anger without shame and without treating feelings as a lack of faith.",
      pra_quem: "Created for classes of children ages 2 to 5, with adaptation guidance. It can be led with simple resources and without requiring personal stories in front of the group.",
      resultado: "The child learns four phrases to recognize what they feel and seek help. The teacher receives pastoral language for welcoming without diagnosing or exposing anyone.",
      uso: "The series does not claim that feelings disappear after a prayer. It distinguishes emotion from action, points to the care of Jesus, and teaches children to seek safe adults.",
      keywords: ["preschool", "emotions", "feelings", "fear", "anger"],
      unidades: [
        { titulo: "When Joy Comes", texto: "Luke 17:11-19", verdade: "We can recognize God's care and respond with gratitude.", file: "02_Maternal_2a5__CEX_2026_004_Do_Jeitinho_que_Estou__02_English__01_Messages__CEX_2026_004_EN_Message_01_When_Joy_Comes_v1.0.html" },
        { titulo: "When Fear Comes", texto: "Mark 4:35-41", verdade: "We can seek Jesus and a safe adult when we are afraid.", file: "02_Maternal_2a5__CEX_2026_004_Do_Jeitinho_que_Estou__02_English__01_Messages__CEX_2026_004_EN_Message_02_When_Fear_Comes_v1.0.html" },
        { titulo: "When Sadness Feels Heavy", texto: "John 11:17-36", verdade: "Jesus cares about our sadness and draws near to those who suffer.", file: "02_Maternal_2a5__CEX_2026_004_Do_Jeitinho_que_Estou__02_English__01_Messages__CEX_2026_004_EN_Message_03_When_Sadness_Feels_Heavy_v1.0.html" },
        { titulo: "When Anger Wants to Take Charge", texto: "Ephesians 4:26, 31-32", verdade: "Feeling angry does not give us permission to hurt others; we can ask for help and choose kindness.", file: "02_Maternal_2a5__CEX_2026_004_Do_Jeitinho_que_Estou__02_English__01_Messages__CEX_2026_004_EN_Message_04_When_Anger_Wants_to_Take_Charge_v1.0.html" },
      ],
    },
    es: {
      titulo: "Tal Como Estoy",
      promessa: "Una serie bíblica que ayuda a los niños pequeños a nombrar la alegría, el miedo, la tristeza y el enojo sin vergüenza y sin convertir los sentimientos en falta de fe.",
      pra_quem: "Creada para clases de niños de 2 a 5 años, con orientaciones de adaptación. Puede desarrollarse con recursos sencillos y sin exigir relatos personales delante del grupo.",
      resultado: "El niño aprende cuatro frases para reconocer lo que siente y buscar ayuda. El maestro recibe lenguaje pastoral para acoger sin diagnosticar ni exponer.",
      uso: "La serie no afirma que los sentimientos desaparecen después de una oración. Distingue entre emoción y acción, señala el cuidado de Jesús y enseña a buscar adultos seguros.",
      keywords: ["preescolar", "emociones", "sentimientos", "miedo", "enojo"],
      unidades: [
        { titulo: "Cuando llega la alegría", texto: "Lucas 17:11-19", verdade: "Podemos reconocer el cuidado de Dios y responder con gratitud.", file: "02_Maternal_2a5__CEX_2026_004_Do_Jeitinho_que_Estou__03_Espanol__01_Mensajes__CEX_2026_004_ES_Mensaje_01_Cuando_llega_la_alegria_v1.0.html" },
        { titulo: "Cuando llega el miedo", texto: "Marcos 4:35-41", verdade: "Podemos buscar a Jesús y a un adulto seguro cuando sentimos miedo.", file: "02_Maternal_2a5__CEX_2026_004_Do_Jeitinho_que_Estou__03_Espanol__01_Mensajes__CEX_2026_004_ES_Mensaje_02_Cuando_llega_el_miedo_v1.0.html" },
        { titulo: "Cuando la tristeza pesa", texto: "Juan 11:17-36", verdade: "Jesús se interesa por nuestra tristeza y se acerca a quienes sufren.", file: "02_Maternal_2a5__CEX_2026_004_Do_Jeitinho_que_Estou__03_Espanol__01_Mensajes__CEX_2026_004_ES_Mensaje_03_Cuando_la_tristeza_pesa_v1.0.html" },
        { titulo: "Cuando el enojo quiere mandar", texto: "Efesios 4:26, 31-32", verdade: "Sentir enojo no nos autoriza a lastimar; podemos pedir ayuda y elegir la bondad.", file: "02_Maternal_2a5__CEX_2026_004_Do_Jeitinho_que_Estou__03_Espanol__01_Mensajes__CEX_2026_004_ES_Mensaje_04_Cuando_el_enojo_quiere_mandar_v1.0.html" },
      ],
    },
  },
  {
    slug: "ele-me-ouve", code: "005", estante: "infantil-maternal", etiqueta: "Maternal", preco: "R$ 37", pages: 3,
    pt: {
      titulo: "Ele Me Ouve",
      promessa: "Oração ensinada como relação com Deus, não como apresentação, fórmula ou garantia de receber tudo o que se pede.",
      pra_quem: "Para classes de 2 a 5 anos, com formas de participação por fala, gesto, desenho ou silêncio. Nenhuma criança precisa orar diante do grupo.",
      resultado: "A criança saberá que pode falar com Deus e terá quatro orações de uma frase. O professor aprenderá a acolher diferentes níveis de linguagem.",
      uso: "A série afirma que Deus ouve sem ensinar que ele sempre responde como esperamos. Silêncio, espera e respostas diferentes são tratados com confiança e honestidade.",
      keywords: ["maternal", "oração", "deus ouve", "confiança"],
      unidades: [
        { titulo: "Posso contar o que dói", texto: "1 Samuel 1:9-20", verdade: "Podemos falar com Deus com sinceridade quando o coração está triste.", file: "02_Maternal_2a5__CEX_2026_005_Ele_Me_Ouve__01_Portugues__01_Mensagens__CEX_2026_005_PT_Mensagem_01_Posso_contar_o_que_doi_v1.0.html" },
        { titulo: "Posso pedir ajuda no medo", texto: "Salmo 56:1-4", verdade: "Quando sentimos medo, podemos falar com Deus e decidir confiar nele.", file: "02_Maternal_2a5__CEX_2026_005_Ele_Me_Ouve__01_Portugues__01_Mensagens__CEX_2026_005_PT_Mensagem_02_Posso_pedir_ajuda_no_medo_v1.0.html" },
        { titulo: "Jesus ensina a orar", texto: "Mateus 6:5-13", verdade: "Jesus nos ensina a falar com o Pai com simplicidade, confiança e perdão.", file: "02_Maternal_2a5__CEX_2026_005_Ele_Me_Ouve__01_Portugues__01_Mensagens__CEX_2026_005_PT_Mensagem_03_Jesus_ensina_a_orar_v1.0.html" },
        { titulo: "Oramos juntos", texto: "Atos 12:1-17", verdade: "A igreja leva necessidades a Deus e sustenta pessoas em oração.", file: "02_Maternal_2a5__CEX_2026_005_Ele_Me_Ouve__01_Portugues__01_Mensagens__CEX_2026_005_PT_Mensagem_04_Oramos_juntos_v1.0.html" },
      ],
    },
    en: {
      titulo: "He Hears Me",
      promessa: "Prayer taught as a relationship with God, not as a performance, formula, or guarantee of receiving everything we ask for.",
      pra_quem: "For classes of children ages 2 to 5, with participation through speech, gesture, drawing, or silence. No child needs to pray in front of the group.",
      resultado: "The child will know that they can talk with God and will have four one-sentence prayers. The teacher will learn to welcome different levels of language development.",
      uso: "The series affirms that God hears without teaching that he always answers as we expect. Silence, waiting, and different answers are addressed with trust and honesty.",
      keywords: ["preschool", "prayer", "god hears", "trust"],
      unidades: [
        { titulo: "I Can Tell God What Hurts", texto: "1 Samuel 1:9-20", verdade: "We can speak honestly with God when our heart is sad.", file: "02_Maternal_2a5__CEX_2026_005_Ele_Me_Ouve__02_English__01_Messages__CEX_2026_005_EN_Message_01_I_Can_Tell_God_What_Hurts_v1.0.html" },
        { titulo: "I Can Ask for Help When I Am Afraid", texto: "Psalm 56:1-4", verdade: "When we are afraid, we can talk with God and choose to trust him.", file: "02_Maternal_2a5__CEX_2026_005_Ele_Me_Ouve__02_English__01_Messages__CEX_2026_005_EN_Message_02_I_Can_Ask_for_Help_When_I_Am_Afraid_v1.0.html" },
        { titulo: "Jesus Teaches Us to Pray", texto: "Matthew 6:5-13", verdade: "Jesus teaches us to speak with the Father with simplicity, trust, and forgiveness.", file: "02_Maternal_2a5__CEX_2026_005_Ele_Me_Ouve__02_English__01_Messages__CEX_2026_005_EN_Message_03_Jesus_Teaches_Us_to_Pray_v1.0.html" },
        { titulo: "We Pray Together", texto: "Acts 12:1-17", verdade: "The church brings needs to God and supports people in prayer.", file: "02_Maternal_2a5__CEX_2026_005_Ele_Me_Ouve__02_English__01_Messages__CEX_2026_005_EN_Message_04_We_Pray_Together_v1.0.html" },
      ],
    },
    es: {
      titulo: "Él Me Escucha",
      promessa: "La oración enseñada como relación con Dios, no como presentación, fórmula ni garantía de recibir todo lo que se pide.",
      pra_quem: "Para clases de niños de 2 a 5 años, con formas de participación por medio de palabras, gestos, dibujos o silencio. Ningún niño necesita orar delante del grupo.",
      resultado: "El niño sabrá que puede hablar con Dios y tendrá cuatro oraciones de una frase. El maestro aprenderá a acoger diferentes niveles de lenguaje.",
      uso: "La serie afirma que Dios escucha sin enseñar que siempre responde como esperamos. El silencio, la espera y las respuestas diferentes se tratan con confianza y honestidad.",
      keywords: ["preescolar", "oración", "dios escucha", "confianza"],
      unidades: [
        { titulo: "Puedo contar lo que me duele", texto: "1 Samuel 1:9-20", verdade: "Podemos hablar con Dios con sinceridad cuando el corazón está triste.", file: "02_Maternal_2a5__CEX_2026_005_Ele_Me_Ouve__03_Espanol__01_Mensajes__CEX_2026_005_ES_Mensaje_01_Puedo_contar_lo_que_me_duele_v1.0.html" },
        { titulo: "Puedo pedir ayuda cuando tengo miedo", texto: "Salmo 56:1-4", verdade: "Cuando sentimos miedo, podemos hablar con Dios y decidir confiar en él.", file: "02_Maternal_2a5__CEX_2026_005_Ele_Me_Ouve__03_Espanol__01_Mensajes__CEX_2026_005_ES_Mensaje_02_Puedo_pedir_ayuda_cuando_tengo_miedo_v1.0.html" },
        { titulo: "Jesús enseña a orar", texto: "Mateo 6:5-13", verdade: "Jesús nos enseña a hablar con el Padre con sencillez, confianza y perdón.", file: "02_Maternal_2a5__CEX_2026_005_Ele_Me_Ouve__03_Espanol__01_Mensajes__CEX_2026_005_ES_Mensaje_03_Jesus_ensena_a_orar_v1.0.html" },
        { titulo: "Oramos juntos", texto: "Hechos 12:1-17", verdade: "La iglesia lleva las necesidades a Dios y sostiene a las personas en oración.", file: "02_Maternal_2a5__CEX_2026_005_Ele_Me_Ouve__03_Espanol__01_Mensajes__CEX_2026_005_ES_Mensaje_04_Oramos_juntos_v1.0.html" },
      ],
    },
  },
  {
    slug: "jesus-no-centro", code: "006", estante: "infantil-primarios", etiqueta: "Primários", preco: "R$ 39", pages: 3,
    pt: {
      titulo: "Jesus no Centro",
      promessa: "Quatro encontros no Evangelho de João para ligar as palavras, os sinais e a missão de Jesus em uma única resposta de fé.",
      pra_quem: "Para classes de 6 a 7 anos em quatro semanas. O professor recebe contexto suficiente para explicar as imagens usadas por Jesus sem transformá-las em slogans.",
      resultado: "A criança será capaz de explicar quatro verdades sobre Jesus e relacioná-las à sua morte, ressurreição e chamado à fé.",
      uso: "As declarações de Jesus são ensinadas dentro de seus contextos. A série não promete cura imediata, ausência de problemas nem satisfação de todo desejo.",
      keywords: ["primários", "evangelho de joão", "identidade de jesus", "sinais"],
      unidades: [
        { titulo: "O pão que dá vida", texto: "João 6:25-40", verdade: "Jesus é o pão da vida e somente ele satisfaz nossa necessidade mais profunda de Deus.", file: "03_Primarios_6a7__CEX_2026_006_Jesus_no_Centro__01_Portugues__01_Mensagens__CEX_2026_006_PT_Mensagem_01_O_pao_que_da_vida_v1.0.html" },
        { titulo: "A luz que mostra o caminho", texto: "João 8:12-20", verdade: "Jesus é a luz do mundo e quem o segue não precisa viver guiado pelas trevas.", file: "03_Primarios_6a7__CEX_2026_006_Jesus_no_Centro__01_Portugues__01_Mensagens__CEX_2026_006_PT_Mensagem_02_A_luz_que_mostra_o_caminho_v1.0.html" },
        { titulo: "O Pastor que entrega a vida", texto: "João 10:1-18", verdade: "Jesus é o bom Pastor que conhece suas ovelhas e entrega a vida por elas.", file: "03_Primarios_6a7__CEX_2026_006_Jesus_no_Centro__01_Portugues__01_Mensagens__CEX_2026_006_PT_Mensagem_03_O_Pastor_que_entrega_a_vida_v1.0.html" },
        { titulo: "A vida vence a morte", texto: "João 11:17-27 e 38-44", verdade: "Jesus é a ressurreição e a vida; a morte não terá a palavra final.", file: "03_Primarios_6a7__CEX_2026_006_Jesus_no_Centro__01_Portugues__01_Mensagens__CEX_2026_006_PT_Mensagem_04_A_vida_vence_a_morte_v1.0.html" },
      ],
    },
    en: {
      titulo: "Jesus at the Center",
      promessa: "Four sessions in the Gospel of John that connect Jesus' words, signs, and mission in one response of faith.",
      pra_quem: "For classes of children ages 6 to 7 over four weeks. The teacher receives enough context to explain the images Jesus used without turning them into slogans.",
      resultado: "The child will be able to explain four truths about Jesus and connect them with his death, resurrection, and call to faith.",
      uso: "Jesus' declarations are taught within their contexts. The series does not promise immediate healing, absence of problems, or fulfillment of every desire.",
      keywords: ["primary", "gospel of john", "identity of jesus", "signs"],
      unidades: [
        { titulo: "The Bread That Gives Life", texto: "John 6:25-40", verdade: "Jesus is the bread of life, and only he satisfies our deepest need for God.", file: "03_Primarios_6a7__CEX_2026_006_Jesus_no_Centro__02_English__01_Messages__CEX_2026_006_EN_Message_01_The_Bread_That_Gives_Life_v1.0.html" },
        { titulo: "The Light That Shows the Way", texto: "John 8:12-20", verdade: "Jesus is the light of the world, and whoever follows him does not need to live guided by darkness.", file: "03_Primarios_6a7__CEX_2026_006_Jesus_no_Centro__02_English__01_Messages__CEX_2026_006_EN_Message_02_The_Light_That_Shows_the_Way_v1.0.html" },
        { titulo: "The Shepherd Who Gives His Life", texto: "John 10:1-18", verdade: "Jesus is the good Shepherd who knows his sheep and gives his life for them.", file: "03_Primarios_6a7__CEX_2026_006_Jesus_no_Centro__02_English__01_Messages__CEX_2026_006_EN_Message_03_The_Shepherd_Who_Gives_His_Life_v1.0.html" },
        { titulo: "Life Defeats Death", texto: "John 11:17-27 and 38-44", verdade: "Jesus is the resurrection and the life; death will not have the final word.", file: "03_Primarios_6a7__CEX_2026_006_Jesus_no_Centro__02_English__01_Messages__CEX_2026_006_EN_Message_04_Life_Defeats_Death_v1.0.html" },
      ],
    },
    es: {
      titulo: "Jesús en el Centro",
      promessa: "Cuatro encuentros en el Evangelio de Juan que relacionan las palabras, las señales y la misión de Jesús en una sola respuesta de fe.",
      pra_quem: "Para clases de niños de 6 a 7 años durante cuatro semanas. El maestro recibe contexto suficiente para explicar las imágenes utilizadas por Jesús sin convertirlas en lemas.",
      resultado: "El niño podrá explicar cuatro verdades acerca de Jesús y relacionarlas con su muerte, resurrección y llamado a la fe.",
      uso: "Las declaraciones de Jesús se enseñan dentro de sus contextos. La serie no promete sanidad inmediata, ausencia de problemas ni satisfacción de todo deseo.",
      keywords: ["primarios", "evangelio de juan", "identidad de jesús", "señales"],
      unidades: [
        { titulo: "El pan que da vida", texto: "Juan 6:25-40", verdade: "Jesús es el pan de vida y solamente él satisface nuestra necesidad más profunda de Dios.", file: "03_Primarios_6a7__CEX_2026_006_Jesus_no_Centro__03_Espanol__01_Mensajes__CEX_2026_006_ES_Mensaje_01_El_pan_que_da_vida_v1.0.html" },
        { titulo: "La luz que muestra el camino", texto: "Juan 8:12-20", verdade: "Jesús es la luz del mundo y quien lo sigue no necesita vivir guiado por las tinieblas.", file: "03_Primarios_6a7__CEX_2026_006_Jesus_no_Centro__03_Espanol__01_Mensajes__CEX_2026_006_ES_Mensaje_02_La_luz_que_muestra_el_camino_v1.0.html" },
        { titulo: "El Pastor que entrega la vida", texto: "Juan 10:1-18", verdade: "Jesús es el buen Pastor que conoce a sus ovejas y entrega la vida por ellas.", file: "03_Primarios_6a7__CEX_2026_006_Jesus_no_Centro__03_Espanol__01_Mensajes__CEX_2026_006_ES_Mensaje_03_El_Pastor_que_entrega_la_vida_v1.0.html" },
        { titulo: "La vida vence a la muerte", texto: "Juan 11:17-27 y 38-44", verdade: "Jesús es la resurrección y la vida; la muerte no tendrá la última palabra.", file: "03_Primarios_6a7__CEX_2026_006_Jesus_no_Centro__03_Espanol__01_Mensajes__CEX_2026_006_ES_Mensaje_04_La_vida_vence_a_la_muerte_v1.0.html" },
      ],
    },
  },
  {
    slug: "a-grande-historia", code: "007", estante: "infantil-primarios", etiqueta: "Primários", preco: "R$ 39", pages: 3,
    pt: {
      titulo: "A Grande História",
      promessa: "Uma primeira formação para ler a Bíblia com confiança, pedir ajuda, praticar o que aprende e reconhecer Cristo no centro do enredo.",
      pra_quem: "Para crianças que já iniciam leitura, sem exigir fluência. Funciona com Bíblia, folhas e participação oral.",
      resultado: "A criança saberá por que lê a Bíblia, a quem pedir ajuda, como responder e por que Jesus é o centro.",
      uso: "A série não promete que toda leitura será fácil e não transforma cada detalhe do Antigo Testamento em código secreto sobre Jesus.",
      keywords: ["primários", "bíblia", "leitura bíblica", "redenção"],
      unidades: [
        { titulo: "Uma Palavra que nos prepara", texto: "2 Timóteo 3:14-17", verdade: "As Escrituras vêm de Deus e nos tornam sábios para a salvação em Cristo.", file: "03_Primarios_6a7__CEX_2026_007_A_Grande_Historia__01_Portugues__01_Mensagens__CEX_2026_007_PT_Mensagem_01_Uma_Palavra_que_nos_prepara_v1.0.html" },
        { titulo: "Não preciso entender sozinho", texto: "Atos 8:26-40", verdade: "Deus usa sua Palavra e pessoas preparadas para nos ajudar a compreender o evangelho.", file: "03_Primarios_6a7__CEX_2026_007_A_Grande_Historia__01_Portugues__01_Mensagens__CEX_2026_007_PT_Mensagem_02_Nao_preciso_entender_sozinho_v1.0.html" },
        { titulo: "Ouvir é praticar", texto: "Tiago 1:19-25", verdade: "A Palavra recebida com humildade deve produzir uma vida que pratica a verdade.", file: "03_Primarios_6a7__CEX_2026_007_A_Grande_Historia__01_Portugues__01_Mensagens__CEX_2026_007_PT_Mensagem_03_Ouvir_e_praticar_v1.0.html" },
        { titulo: "O centro da história", texto: "Lucas 24:13-35", verdade: "Jesus cumpre as Escrituras e dá sentido à grande história da redenção.", file: "03_Primarios_6a7__CEX_2026_007_A_Grande_Historia__01_Portugues__01_Mensagens__CEX_2026_007_PT_Mensagem_04_O_centro_da_historia_v1.0.html" },
      ],
    },
    en: {
      titulo: "The Great Story",
      promessa: "A first formation in reading the Bible with confidence, asking for help, practicing what is learned, and recognizing Christ at the center of the storyline.",
      pra_quem: "For children who are beginning to read, without requiring fluency. It works with a Bible, paper, and oral participation.",
      resultado: "The child will know why we read the Bible, whom to ask for help, how to respond, and why Jesus is at the center.",
      uso: "The series does not promise that every reading will be easy and does not turn every detail of the Old Testament into a secret code about Jesus.",
      keywords: ["primary", "bible", "bible reading", "redemption"],
      unidades: [
        { titulo: "A Word That Prepares Us", texto: "2 Timothy 3:14-17", verdade: "Scripture comes from God and makes us wise for salvation in Christ.", file: "03_Primarios_6a7__CEX_2026_007_A_Grande_Historia__02_English__01_Messages__CEX_2026_007_EN_Message_01_A_Word_That_Prepares_Us_v1.0.html" },
        { titulo: "I Do Not Have to Understand Alone", texto: "Acts 8:26-40", verdade: "God uses his Word and prepared people to help us understand the gospel.", file: "03_Primarios_6a7__CEX_2026_007_A_Grande_Historia__02_English__01_Messages__CEX_2026_007_EN_Message_02_I_Do_Not_Have_to_Understand_Alone_v1.0.html" },
        { titulo: "Hearing Means Practicing", texto: "James 1:19-25", verdade: "The Word received with humility should produce a life that practices the truth.", file: "03_Primarios_6a7__CEX_2026_007_A_Grande_Historia__02_English__01_Messages__CEX_2026_007_EN_Message_03_Hearing_Means_Practicing_v1.0.html" },
        { titulo: "The Center of the Story", texto: "Luke 24:13-35", verdade: "Jesus fulfills Scripture and gives meaning to the great story of redemption.", file: "03_Primarios_6a7__CEX_2026_007_A_Grande_Historia__02_English__01_Messages__CEX_2026_007_EN_Message_04_The_Center_of_the_Story_v1.0.html" },
      ],
    },
    es: {
      titulo: "La Gran Historia",
      promessa: "Una primera formación para leer la Biblia con confianza, pedir ayuda, practicar lo aprendido y reconocer a Cristo en el centro de la trama.",
      pra_quem: "Para niños que están comenzando a leer, sin exigir fluidez. Funciona con Biblia, hojas y participación oral.",
      resultado: "El niño sabrá por qué lee la Biblia, a quién pedir ayuda, cómo responder y por qué Jesús es el centro.",
      uso: "La serie no promete que toda lectura será fácil y no convierte cada detalle del Antiguo Testamento en un código secreto acerca de Jesús.",
      keywords: ["primarios", "biblia", "lectura bíblica", "redención"],
      unidades: [
        { titulo: "Una Palabra que nos prepara", texto: "2 Timoteo 3:14-17", verdade: "Las Escrituras vienen de Dios y nos hacen sabios para la salvación en Cristo.", file: "03_Primarios_6a7__CEX_2026_007_A_Grande_Historia__03_Espanol__01_Mensajes__CEX_2026_007_ES_Mensaje_01_Una_Palabra_que_nos_prepara_v1.0.html" },
        { titulo: "No necesito entender solo", texto: "Hechos 8:26-40", verdade: "Dios utiliza su Palabra y personas preparadas para ayudarnos a comprender el evangelio.", file: "03_Primarios_6a7__CEX_2026_007_A_Grande_Historia__03_Espanol__01_Mensajes__CEX_2026_007_ES_Mensaje_02_No_necesito_entender_solo_v1.0.html" },
        { titulo: "Oír es practicar", texto: "Santiago 1:19-25", verdade: "La Palabra recibida con humildad debe producir una vida que practica la verdad.", file: "03_Primarios_6a7__CEX_2026_007_A_Grande_Historia__03_Espanol__01_Mensajes__CEX_2026_007_ES_Mensaje_03_Oir_es_practicar_v1.0.html" },
        { titulo: "El centro de la historia", texto: "Lucas 24:13-35", verdade: "Jesús cumple las Escrituras y da sentido a la gran historia de la redención.", file: "03_Primarios_6a7__CEX_2026_007_A_Grande_Historia__03_Espanol__01_Mensajes__CEX_2026_007_ES_Mensaje_04_El_centro_de_la_historia_v1.0.html" },
      ],
    },
  },
  {
    slug: "depois-do-clique", code: "008", estante: "juniores", etiqueta: "Juniores", preco: "R$ 41", pages: 4,
    pt: {
      titulo: "Depois do Clique",
      promessa: "Tecnologia tratada como parte do discipulado, com critérios para atenção, palavras, liberdade e discernimento.",
      pra_quem: "Para igrejas e famílias que desejam conversar sobre vida digital sem demonizar tecnologia nem deixar toda responsabilidade sobre a criança.",
      resultado: "A criança sairá com um filtro simples: o que isso alimenta, é verdadeiro, faz bem ao próximo e combina com uma mente renovada?",
      uso: "A série não substitui supervisão, configurações de segurança nem conversa familiar. Textos bíblicos governam o discipulado; aplicativos aparecem apenas como campo de aplicação.",
      keywords: ["juniores", "tecnologia", "discernimento digital", "sabedoria"],
      unidades: [
        { titulo: "Antes de abrir", texto: "Provérbios 4:20-27", verdade: "Sabedoria protege o coração e observa o caminho antes de cada passo.", file: "04_Juniores_8a11__CEX_2026_008_Depois_do_Clique__01_Portugues__01_Mensagens__CEX_2026_008_PT_Mensagem_01_Antes_de_abrir_v1.0.html" },
        { titulo: "Antes de enviar", texto: "Efésios 4:25-32", verdade: "Quem pertence a Cristo abandona mentira e usa palavras que edificam.", file: "04_Juniores_8a11__CEX_2026_008_Depois_do_Clique__01_Portugues__01_Mensagens__CEX_2026_008_PT_Mensagem_02_Antes_de_enviar_v1.0.html" },
        { titulo: "Antes de continuar", texto: "1 Coríntios 10:23-24 e 31", verdade: "Liberdade cristã busca a glória de Deus e o bem do próximo, não apenas o que é permitido.", file: "04_Juniores_8a11__CEX_2026_008_Depois_do_Clique__01_Portugues__01_Mensagens__CEX_2026_008_PT_Mensagem_03_Antes_de_continuar_v1.0.html" },
        { titulo: "Depois do clique", texto: "Romanos 12:1-2", verdade: "Deus renova nossa mente para discernirmos uma vida que responde à sua misericórdia.", file: "04_Juniores_8a11__CEX_2026_008_Depois_do_Clique__01_Portugues__01_Mensagens__CEX_2026_008_PT_Mensagem_04_Depois_do_clique_v1.0.html" },
      ],
    },
    en: {
      titulo: "After the Click",
      promessa: "Technology treated as part of discipleship, with criteria for attention, words, freedom, and discernment.",
      pra_quem: "For churches and families that want to talk about digital life without demonizing technology or placing all responsibility on the child.",
      resultado: "The child will leave with a simple filter: What does this feed? Is it true? Does it do good to my neighbor? Does it agree with a renewed mind?",
      uso: "The series does not replace supervision, safety settings, or family conversation. Biblical passages govern discipleship; applications appear only as the field in which it is practiced.",
      keywords: ["juniors", "technology", "digital discernment", "wisdom"],
      unidades: [
        { titulo: "Before You Open", texto: "Proverbs 4:20-27", verdade: "Wisdom protects the heart and examines the path before each step.", file: "04_Juniores_8a11__CEX_2026_008_Depois_do_Clique__02_English__01_Messages__CEX_2026_008_EN_Message_01_Before_You_Open_v1.0.html" },
        { titulo: "Before You Send", texto: "Ephesians 4:25-32", verdade: "Those who belong to Christ leave falsehood behind and use words that build others up.", file: "04_Juniores_8a11__CEX_2026_008_Depois_do_Clique__02_English__01_Messages__CEX_2026_008_EN_Message_02_Before_You_Send_v1.0.html" },
        { titulo: "Before You Continue", texto: "1 Corinthians 10:23-24 and 31", verdade: "Christian freedom seeks God's glory and the good of our neighbor, not only what is permitted.", file: "04_Juniores_8a11__CEX_2026_008_Depois_do_Clique__02_English__01_Messages__CEX_2026_008_EN_Message_03_Before_You_Continue_v1.0.html" },
        { titulo: "After the Click", texto: "Romans 12:1-2", verdade: "God renews our minds so that we can discern a life that responds to his mercy.", file: "04_Juniores_8a11__CEX_2026_008_Depois_do_Clique__02_English__01_Messages__CEX_2026_008_EN_Message_04_After_the_Click_v1.0.html" },
      ],
    },
    es: {
      titulo: "Después del Clic",
      promessa: "La tecnología tratada como parte del discipulado, con criterios para la atención, las palabras, la libertad y el discernimiento.",
      pra_quem: "Para iglesias y familias que desean conversar sobre la vida digital sin demonizar la tecnología ni dejar toda la responsabilidad sobre el niño.",
      resultado: "El niño saldrá con un filtro sencillo: ¿Qué alimenta esto? ¿Es verdadero? ¿Hace bien al prójimo? ¿Concuerda con una mente renovada?",
      uso: "La serie no sustituye la supervisión, las configuraciones de seguridad ni la conversación familiar. Los textos bíblicos gobiernan el discipulado; las aplicaciones aparecen solamente como campo de práctica.",
      keywords: ["juniors", "tecnología", "discernimiento digital", "sabiduría"],
      unidades: [
        { titulo: "Antes de abrir", texto: "Proverbios 4:20-27", verdade: "La sabiduría protege el corazón y observa el camino antes de cada paso.", file: "04_Juniores_8a11__CEX_2026_008_Depois_do_Clique__03_Espanol__01_Mensajes__CEX_2026_008_ES_Mensaje_01_Antes_de_abrir_v1.0.html" },
        { titulo: "Antes de enviar", texto: "Efesios 4:25-32", verdade: "Quien pertenece a Cristo abandona la mentira y utiliza palabras que edifican.", file: "04_Juniores_8a11__CEX_2026_008_Depois_do_Clique__03_Espanol__01_Mensajes__CEX_2026_008_ES_Mensaje_02_Antes_de_enviar_v1.0.html" },
        { titulo: "Antes de continuar", texto: "1 Corintios 10:23-24 y 31", verdade: "La libertad cristiana busca la gloria de Dios y el bien del prójimo, no solamente lo permitido.", file: "04_Juniores_8a11__CEX_2026_008_Depois_do_Clique__03_Espanol__01_Mensajes__CEX_2026_008_ES_Mensaje_03_Antes_de_continuar_v1.0.html" },
        { titulo: "Después del clic", texto: "Romanos 12:1-2", verdade: "Dios renueva nuestra mente para que discernamos una vida que responde a su misericordia.", file: "04_Juniores_8a11__CEX_2026_008_Depois_do_Clique__03_Espanol__01_Mensajes__CEX_2026_008_ES_Mensaje_04_Despues_del_clic_v1.0.html" },
      ],
    },
  },
  {
    slug: "pode-perguntar", code: "009", estante: "juniores", etiqueta: "Juniores", preco: "R$ 41", pages: 4,
    pt: {
      titulo: "Pode Perguntar",
      promessa: "Uma série que acolhe perguntas, ensina a examinar fontes e conduz a criança à pergunta central sobre Jesus.",
      pra_quem: "Para classes de 8 a 11 anos e encontros em família. O professor recebe permissão explícita para dizer “não sei ainda” e pesquisar.",
      resultado: "A criança perceberá que não precisa esconder dúvidas e aprenderá quatro caminhos para continuar buscando com fé e honestidade.",
      uso: "A série não usa mistério como fuga e não promete explicação completa para sofrimento. Perguntas são acolhidas sem abandonar a autoridade das Escrituras.",
      keywords: ["juniores", "dúvidas", "fé", "apologética infantil"],
      unidades: [
        { titulo: "Quando não entendo", texto: "Salmo 13", verdade: "A fé pode levar perguntas honestas a Deus e continuar lembrando de seu amor.", file: "04_Juniores_8a11__CEX_2026_009_Pode_Perguntar__01_Portugues__01_Mensagens__CEX_2026_009_PT_Mensagem_01_Quando_nao_entendo_v1.0.html" },
        { titulo: "Por que confiar nas Escrituras?", texto: "Lucas 1:1-4 e 2 Timóteo 3:14-17", verdade: "A fé cristã recebe Escrituras inspiradas e testemunho investigado sobre Jesus.", file: "04_Juniores_8a11__CEX_2026_009_Pode_Perguntar__01_Portugues__01_Mensagens__CEX_2026_009_PT_Mensagem_02_Por_que_confiar_nas_Escrituras_v1.0.html" },
        { titulo: "Quando a resposta é diferente", texto: "2 Coríntios 12:7-10", verdade: "A graça de Cristo pode sustentar quando Deus não remove a dificuldade como pedimos.", file: "04_Juniores_8a11__CEX_2026_009_Pode_Perguntar__01_Portugues__01_Mensagens__CEX_2026_009_PT_Mensagem_03_Quando_a_resposta_e_diferente_v1.0.html" },
        { titulo: "A pergunta que muda tudo", texto: "Marcos 8:27-38", verdade: "A pergunta central da fé é quem Jesus é e se o seguiremos em seu caminho.", file: "04_Juniores_8a11__CEX_2026_009_Pode_Perguntar__01_Portugues__01_Mensagens__CEX_2026_009_PT_Mensagem_04_A_pergunta_que_muda_tudo_v1.0.html" },
      ],
    },
    en: {
      titulo: "You Can Ask",
      promessa: "A series that welcomes questions, teaches children to examine sources, and leads them to the central question about Jesus.",
      pra_quem: "For classes of children ages 8 to 11 and family gatherings. The teacher has explicit permission to say, \"I do not know yet,\" and research.",
      resultado: "The child will realize that questions do not need to be hidden and will learn four paths for continuing to seek with faith and honesty.",
      uso: "The series does not use mystery as an escape and does not promise a complete explanation for suffering. Questions are welcomed without abandoning the authority of Scripture.",
      keywords: ["juniors", "doubts", "faith", "kids apologetics"],
      unidades: [
        { titulo: "When I Do Not Understand", texto: "Psalm 13", verdade: "Faith can bring honest questions to God and continue remembering his love.", file: "04_Juniores_8a11__CEX_2026_009_Pode_Perguntar__02_English__01_Messages__CEX_2026_009_EN_Message_01_When_I_Do_Not_Understand_v1.0.html" },
        { titulo: "Why Trust Scripture?", texto: "Luke 1:1-4 and 2 Timothy 3:14-17", verdade: "Christian faith receives inspired Scripture and investigated testimony about Jesus.", file: "04_Juniores_8a11__CEX_2026_009_Pode_Perguntar__02_English__01_Messages__CEX_2026_009_EN_Message_02_Why_Trust_Scripture_v1.0.html" },
        { titulo: "When the Answer Is Different", texto: "2 Corinthians 12:7-10", verdade: "Christ's grace can sustain us when God does not remove the difficulty as we asked.", file: "04_Juniores_8a11__CEX_2026_009_Pode_Perguntar__02_English__01_Messages__CEX_2026_009_EN_Message_03_When_the_Answer_Is_Different_v1.0.html" },
        { titulo: "The Question That Changes Everything", texto: "Mark 8:27-38", verdade: "The central question of faith is who Jesus is and whether we will follow him on his way.", file: "04_Juniores_8a11__CEX_2026_009_Pode_Perguntar__02_English__01_Messages__CEX_2026_009_EN_Message_04_The_Question_That_Changes_Everything_v1.0.html" },
      ],
    },
    es: {
      titulo: "Puedes Preguntar",
      promessa: "Una serie que acoge las preguntas, enseña a examinar las fuentes y conduce al niño a la pregunta central acerca de Jesús.",
      pra_quem: "Para clases de 8 a 11 años y encuentros familiares. El maestro recibe permiso explícito para decir «todavía no lo sé» e investigar.",
      resultado: "El niño comprenderá que no necesita ocultar sus preguntas y aprenderá cuatro caminos para seguir buscando con fe y honestidad.",
      uso: "La serie no usa el misterio como evasión ni promete una explicación completa del sufrimiento. Las preguntas se acogen sin abandonar la autoridad de las Escrituras.",
      keywords: ["juniors", "dudas", "fe", "apologética infantil"],
      unidades: [
        { titulo: "Cuando no entiendo", texto: "Salmo 13", verdade: "La fe puede llevar preguntas sinceras a Dios y seguir recordando su amor.", file: "04_Juniores_8a11__CEX_2026_009_Pode_Perguntar__03_Espanol__01_Mensajes__CEX_2026_009_ES_Mensaje_01_Cuando_no_entiendo_v1.0.html" },
        { titulo: "¿Por qué confiar en las Escrituras?", texto: "Lucas 1:1-4 y 2 Timoteo 3:14-17", verdade: "La fe cristiana recibe las Escrituras inspiradas y el testimonio investigado acerca de Jesús.", file: "04_Juniores_8a11__CEX_2026_009_Pode_Perguntar__03_Espanol__01_Mensajes__CEX_2026_009_ES_Mensaje_02_Por_que_confiar_en_las_Escrituras_v1.0.html" },
        { titulo: "Cuando la respuesta es diferente", texto: "2 Corintios 12:7-10", verdade: "La gracia de Cristo puede sostenernos cuando Dios no quita la dificultad como pedimos.", file: "04_Juniores_8a11__CEX_2026_009_Pode_Perguntar__03_Espanol__01_Mensajes__CEX_2026_009_ES_Mensaje_03_Cuando_la_respuesta_es_diferente_v1.0.html" },
        { titulo: "La pregunta que lo cambia todo", texto: "Marcos 8:27-38", verdade: "La pregunta central de la fe es quién es Jesús y si lo seguiremos en su camino.", file: "04_Juniores_8a11__CEX_2026_009_Pode_Perguntar__03_Espanol__01_Mensajes__CEX_2026_009_ES_Mensaje_04_La_pregunta_que_lo_cambia_todo_v1.0.html" },
      ],
    },
  },
  {
    slug: "sem-mascaras", code: "010", estante: "adolescentes", etiqueta: "Adolescentes", preco: "R$ 47", pages: 5,
    pt: {
      titulo: "Sem Máscaras",
      promessa: "Uma série sobre identidade em Cristo para adolescentes cansados de comparação, desempenho e construção de imagem.",
      pra_quem: "Para cultos, pequenos grupos e encontros de adolescentes. Cada mensagem oferece aplicação sem exposição pública de inseguranças.",
      resultado: "O adolescente identificará vozes que disputam sua identidade e responderá com verdades bíblicas, comunidade e próximos passos reais.",
      uso: "A série não comenta corpos, não promete que inseguranças desaparecerão e não substitui cuidado profissional quando necessário. Identidade em Cristo não é personalidade, talento ou slogan motivacional.",
      keywords: ["adolescentes", "identidade em cristo", "comparação", "graça"],
      unidades: [
        { titulo: "Inteiramente conhecido", texto: "Salmo 139:1-18", verdade: "Deus nos conhece por inteiro e sua presença alcança cada lugar da nossa vida.", file: "05_Adolescentes_12a15__CEX_2026_010_Sem_Mascaras__01_Portugues__01_Mensagens__CEX_2026_010_PT_Mensagem_01_Inteiramente_conhecido_v1.0.html" },
        { titulo: "Recebido pela graça", texto: "Efésios 1:3-14", verdade: "Nossa identidade começa no que Deus fez em Cristo, não no que conseguimos provar.", file: "05_Adolescentes_12a15__CEX_2026_010_Sem_Mascaras__01_Portugues__01_Mensagens__CEX_2026_010_PT_Mensagem_02_Recebido_pela_graca_v1.0.html" },
        { titulo: "Livre da comparação", texto: "João 21:15-22", verdade: "Jesus restaura, chama e nos ensina a segui-lo sem medir nossa história pela do outro.", file: "05_Adolescentes_12a15__CEX_2026_010_Sem_Mascaras__01_Portugues__01_Mensagens__CEX_2026_010_PT_Mensagem_03_Livre_da_comparacao_v1.0.html" },
        { titulo: "Uma vida por inteiro", texto: "Colossenses 3:1-17", verdade: "A nova identidade em Cristo produz uma nova maneira de pensar, abandonar pecado e vestir amor.", file: "05_Adolescentes_12a15__CEX_2026_010_Sem_Mascaras__01_Portugues__01_Mensagens__CEX_2026_010_PT_Mensagem_04_Uma_vida_por_inteiro_v1.0.html" },
      ],
    },
    en: {
      titulo: "No Masks",
      promessa: "A series about identity in Christ for teenagers who are tired of comparison, performance, and image-building.",
      pra_quem: "For services, small groups, and youth gatherings. Each message offers application without publicly exposing insecurities.",
      resultado: "Teenagers will identify the voices competing for their identity and respond with biblical truths, community, and realistic next steps.",
      uso: "The series does not comment on bodies, promise that insecurities will disappear, or replace professional care when it is needed. Identity in Christ is not a personality, talent, or motivational slogan.",
      keywords: ["teenagers", "identity in christ", "comparison", "grace"],
      unidades: [
        { titulo: "Fully Known", texto: "Psalm 139:1-18", verdade: "God knows us completely, and his presence reaches every part of our lives.", file: "05_Adolescentes_12a15__CEX_2026_010_Sem_Mascaras__02_English__01_Messages__CEX_2026_010_EN_Message_01_Fully_Known_v1.0.html" },
        { titulo: "Received by Grace", texto: "Ephesians 1:3-14", verdade: "Our identity begins with what God has done in Christ, not with what we manage to prove.", file: "05_Adolescentes_12a15__CEX_2026_010_Sem_Mascaras__02_English__01_Messages__CEX_2026_010_EN_Message_02_Received_by_Grace_v1.0.html" },
        { titulo: "Free from Comparison", texto: "John 21:15-22", verdade: "Jesus restores us, calls us, and teaches us to follow him without measuring our story against someone else's.", file: "05_Adolescentes_12a15__CEX_2026_010_Sem_Mascaras__02_English__01_Messages__CEX_2026_010_EN_Message_03_Free_from_Comparison_v1.0.html" },
        { titulo: "A Whole Life", texto: "Colossians 3:1-17", verdade: "Our new identity in Christ produces a new way of thinking, putting away sin, and putting on love.", file: "05_Adolescentes_12a15__CEX_2026_010_Sem_Mascaras__02_English__01_Messages__CEX_2026_010_EN_Message_04_A_Whole_Life_v1.0.html" },
      ],
    },
    es: {
      titulo: "Sin Máscaras",
      promessa: "Una serie acerca de la identidad en Cristo para adolescentes cansados de la comparación, el desempeño y la construcción de una imagen.",
      pra_quem: "Para cultos, grupos pequeños y encuentros de adolescentes. Cada mensaje ofrece una aplicación sin exponer públicamente las inseguridades.",
      resultado: "El adolescente identificará las voces que compiten por su identidad y responderá con verdades bíblicas, comunidad y próximos pasos reales.",
      uso: "La serie no comenta cuerpos, no promete que las inseguridades desaparecerán ni sustituye la atención profesional cuando sea necesaria. La identidad en Cristo no es una personalidad, un talento ni un lema motivacional.",
      keywords: ["adolescentes", "identidad en cristo", "comparación", "gracia"],
      unidades: [
        { titulo: "Conocido por Completo", texto: "Salmo 139:1-18", verdade: "Dios nos conoce por completo y su presencia alcanza cada área de nuestra vida.", file: "05_Adolescentes_12a15__CEX_2026_010_Sem_Mascaras__03_Espanol__01_Mensajes__CEX_2026_010_ES_Mensaje_01_Conocido_por_Completo_v1.0.html" },
        { titulo: "Recibido por Gracia", texto: "Efesios 1:3-14", verdade: "Nuestra identidad comienza en lo que Dios hizo en Cristo, no en lo que logramos demostrar.", file: "05_Adolescentes_12a15__CEX_2026_010_Sem_Mascaras__03_Espanol__01_Mensajes__CEX_2026_010_ES_Mensaje_02_Recibido_por_Gracia_v1.0.html" },
        { titulo: "Libre de la Comparación", texto: "Juan 21:15-22", verdade: "Jesús restaura, llama y nos enseña a seguirlo sin medir nuestra historia por la del otro.", file: "05_Adolescentes_12a15__CEX_2026_010_Sem_Mascaras__03_Espanol__01_Mensajes__CEX_2026_010_ES_Mensaje_03_Libre_de_la_Comparacion_v1.0.html" },
        { titulo: "Una Vida Entera", texto: "Colosenses 3:1-17", verdade: "La nueva identidad en Cristo produce una nueva manera de pensar, abandonar el pecado y vestirnos de amor.", file: "05_Adolescentes_12a15__CEX_2026_010_Sem_Mascaras__03_Espanol__01_Mensajes__CEX_2026_010_ES_Mensaje_04_Una_Vida_Entera_v1.0.html" },
      ],
    },
  },
  {
    slug: "contra-a-corrente", code: "011", estante: "adolescentes", etiqueta: "Adolescentes", preco: "R$ 47", pages: 5,
    pt: {
      titulo: "Contra a Corrente",
      promessa: "Convicção sem arrogância, coragem que nasce da oração, amizades que fortalecem e esperança para assumir o custo do discipulado.",
      pra_quem: "Para cultos e pequenos grupos, com casos de escola, família, amizade e ambiente digital sem narrativa de guerra contra todos os que pensam diferente.",
      resultado: "O adolescente saberá diferenciar convicção, agressividade, medo e prudência, e terá caminhos para buscar apoio.",
      uso: "A série não glorifica conflito, não chama toda consequência de perseguição e não promete livramento físico em cada situação.",
      keywords: ["adolescentes", "convicção", "coragem", "perseverança"],
      unidades: [
        { titulo: "Convicção sem arrogância", texto: "Daniel 1:1-21", verdade: "Fidelidade a Deus pode unir convicção firme, respeito e prudência.", file: "05_Adolescentes_12a15__CEX_2026_011_Contra_a_Corrente__01_Portugues__01_Mensagens__CEX_2026_011_PT_Mensagem_01_Conviccao_sem_arrogancia_v1.0.html" },
        { titulo: "Coragem que nasce da oração", texto: "Atos 4:13-31", verdade: "O Espírito forma coragem para testemunhar de Jesus com verdade e dependência.", file: "05_Adolescentes_12a15__CEX_2026_011_Contra_a_Corrente__01_Portugues__01_Mensagens__CEX_2026_011_PT_Mensagem_02_Coragem_que_nasce_da_oracao_v1.0.html" },
        { titulo: "Ninguém permanece sozinho", texto: "Daniel 3:1-30", verdade: "Companheiros fiéis ajudam a permanecer, e Deus continua Senhor mesmo diante do risco.", file: "05_Adolescentes_12a15__CEX_2026_011_Contra_a_Corrente__01_Portugues__01_Mensagens__CEX_2026_011_PT_Mensagem_03_Ninguem_permanece_sozinho_v1.0.html" },
        { titulo: "O custo e a esperança", texto: "Marcos 8:34-38", verdade: "Seguir Jesus custa o governo do próprio eu, mas conduz à vida verdadeira e à esperança do Reino.", file: "05_Adolescentes_12a15__CEX_2026_011_Contra_a_Corrente__01_Portugues__01_Mensagens__CEX_2026_011_PT_Mensagem_04_O_custo_e_a_esperanca_v1.0.html" },
      ],
    },
    en: {
      titulo: "Against the Current",
      promessa: "Conviction without arrogance, courage born from prayer, friendships that strengthen, and hope to embrace the cost of discipleship.",
      pra_quem: "For services and small groups, with situations from school, family, friendship, and digital life, without creating a war narrative against everyone who thinks differently.",
      resultado: "Teenagers will know how to distinguish conviction, aggression, fear, and prudence, and will have paths for seeking support.",
      uso: "The series does not glorify conflict, call every consequence persecution, or promise physical deliverance in every situation.",
      keywords: ["teenagers", "conviction", "courage", "perseverance"],
      unidades: [
        { titulo: "Conviction without Arrogance", texto: "Daniel 1:1-21", verdade: "Faithfulness to God can unite firm conviction, respect, and prudence.", file: "05_Adolescentes_12a15__CEX_2026_011_Contra_a_Corrente__02_English__01_Messages__CEX_2026_011_EN_Message_01_Conviction_without_Arrogance_v1.0.html" },
        { titulo: "Courage Born from Prayer", texto: "Acts 4:13-31", verdade: "The Spirit forms courage to bear witness to Jesus with truth and dependence.", file: "05_Adolescentes_12a15__CEX_2026_011_Contra_a_Corrente__02_English__01_Messages__CEX_2026_011_EN_Message_02_Courage_Born_from_Prayer_v1.0.html" },
        { titulo: "No One Stands Alone", texto: "Daniel 3:1-30", verdade: "Faithful companions help us stand, and God remains Lord even in the face of risk.", file: "05_Adolescentes_12a15__CEX_2026_011_Contra_a_Corrente__02_English__01_Messages__CEX_2026_011_EN_Message_03_No_One_Stands_Alone_v1.0.html" },
        { titulo: "The Cost and the Hope", texto: "Mark 8:34-38", verdade: "Following Jesus costs the rule of the self, but leads to true life and the hope of the Kingdom.", file: "05_Adolescentes_12a15__CEX_2026_011_Contra_a_Corrente__02_English__01_Messages__CEX_2026_011_EN_Message_04_The_Cost_and_the_Hope_v1.0.html" },
      ],
    },
    es: {
      titulo: "Contra la Corriente",
      promessa: "Convicción sin arrogancia, valentía que nace de la oración, amistades que fortalecen y esperanza para asumir el costo del discipulado.",
      pra_quem: "Para cultos y grupos pequeños, con situaciones de la escuela, la familia, la amistad y el ambiente digital, sin crear una narrativa de guerra contra todos los que piensan diferente.",
      resultado: "El adolescente sabrá diferenciar la convicción, la agresividad, el miedo y la prudencia, y tendrá caminos para buscar apoyo.",
      uso: "La serie no glorifica el conflicto, no llama persecución a toda consecuencia ni promete liberación física en cada situación.",
      keywords: ["adolescentes", "convicción", "valentía", "perseverancia"],
      unidades: [
        { titulo: "Convicción sin Arrogancia", texto: "Daniel 1:1-21", verdade: "La fidelidad a Dios puede unir una convicción firme, respeto y prudencia.", file: "05_Adolescentes_12a15__CEX_2026_011_Contra_a_Corrente__03_Espanol__01_Mensajes__CEX_2026_011_ES_Mensaje_01_Conviccion_sin_Arrogancia_v1.0.html" },
        { titulo: "Valentía que Nace de la Oración", texto: "Hechos 4:13-31", verdade: "El Espíritu forma valentía para dar testimonio de Jesús con verdad y dependencia.", file: "05_Adolescentes_12a15__CEX_2026_011_Contra_a_Corrente__03_Espanol__01_Mensajes__CEX_2026_011_ES_Mensaje_02_Valentia_que_Nace_de_la_Oracion_v1.0.html" },
        { titulo: "Nadie Permanece Solo", texto: "Daniel 3:1-30", verdade: "Los compañeros fieles ayudan a permanecer, y Dios sigue siendo Señor incluso ante el riesgo.", file: "05_Adolescentes_12a15__CEX_2026_011_Contra_a_Corrente__03_Espanol__01_Mensajes__CEX_2026_011_ES_Mensaje_03_Nadie_Permanece_Solo_v1.0.html" },
        { titulo: "El Costo y la Esperanza", texto: "Marcos 8:34-38", verdade: "Seguir a Jesús cuesta el gobierno del propio yo, pero conduce a la vida verdadera y a la esperanza del Reino.", file: "05_Adolescentes_12a15__CEX_2026_011_Contra_a_Corrente__03_Espanol__01_Mensajes__CEX_2026_011_ES_Mensaje_04_El_Costo_y_la_Esperanza_v1.0.html" },
      ],
    },
  },
  {
    slug: "alem-do-palco", code: "012", estante: "jovens", etiqueta: "Jovens", preco: "R$ 47", pages: 5,
    pt: {
      titulo: "Além do Palco",
      promessa: "Uma série para libertar chamado da ansiedade por cargo, plataforma e destino extraordinário, devolvendo-o ao seguimento de Jesus.",
      pra_quem: "Para cultos de jovens, pequenos grupos e retiros. As aplicações alcançam igreja, estudo, trabalho, casa e cidade.",
      resultado: "O jovem conseguirá descrever seu próximo passo de discipulado e serviço sem depender de um cargo ideal.",
      uso: "A série não desvaloriza vocações profissionais, não promete clareza instantânea e não transforma serviço em ativismo ou prova de valor.",
      keywords: ["jovens", "chamado", "vocação", "serviço", "grande comissão"],
      unidades: [
        { titulo: "Antes de fazer, siga", texto: "Marcos 1:14-20", verdade: "O chamado de Jesus começa com arrependimento, fé e seguimento antes de qualquer função.", file: "06_Jovens_16a24__CEX_2026_012_Alem_do_Palco__01_Portugues__01_Mensagens__CEX_2026_012_PT_Mensagem_01_Antes_de_fazer_siga_v1.0.html" },
        { titulo: "Graça que vira caminho", texto: "Efésios 2:1-10", verdade: "Somos salvos pela graça em Cristo e recriados para boas obras preparadas por Deus.", file: "06_Jovens_16a24__CEX_2026_012_Alem_do_Palco__01_Portugues__01_Mensagens__CEX_2026_012_PT_Mensagem_02_Graca_que_vira_caminho_v1.0.html" },
        { titulo: "Dons para servir", texto: "1 Pedro 4:7-11", verdade: "A graça de Deus distribui dons para servirmos uns aos outros e para que Deus seja glorificado.", file: "06_Jovens_16a24__CEX_2026_012_Alem_do_Palco__01_Portugues__01_Mensagens__CEX_2026_012_PT_Mensagem_03_Dons_para_servir_v1.0.html" },
        { titulo: "Enviados para fazer discípulos", texto: "Mateus 28:16-20", verdade: "O Cristo ressuscitado envia sua igreja a fazer discípulos, sustentada por sua autoridade e presença.", file: "06_Jovens_16a24__CEX_2026_012_Alem_do_Palco__01_Portugues__01_Mensagens__CEX_2026_012_PT_Mensagem_04_Enviados_para_fazer_discipulos_v1.0.html" },
      ],
    },
    en: {
      titulo: "Beyond the Stage",
      promessa: "A series that frees calling from anxiety about roles, platforms, and an extraordinary destiny, returning it to following Jesus.",
      pra_quem: "For young adult services, small groups, and retreats. The applications reach church, study, work, home, and the city.",
      resultado: "Young adults will be able to describe their next step in discipleship and service without depending on an ideal role.",
      uso: "The series does not devalue professional vocations, promise instant clarity, or turn service into activism or proof of worth.",
      keywords: ["young adults", "calling", "vocation", "service", "great commission"],
      unidades: [
        { titulo: "Before You Do, Follow", texto: "Mark 1:14-20", verdade: "Jesus' call begins with repentance, faith, and following before any role.", file: "06_Jovens_16a24__CEX_2026_012_Alem_do_Palco__02_English__01_Messages__CEX_2026_012_EN_Message_01_Before_You_Do_Follow_v1.0.html" },
        { titulo: "Grace That Becomes a Path", texto: "Ephesians 2:1-10", verdade: "We are saved by grace in Christ and recreated for good works prepared by God.", file: "06_Jovens_16a24__CEX_2026_012_Alem_do_Palco__02_English__01_Messages__CEX_2026_012_EN_Message_02_Grace_That_Becomes_a_Path_v1.0.html" },
        { titulo: "Gifts for Serving", texto: "1 Peter 4:7-11", verdade: "God's grace distributes gifts so that we may serve one another and God may be glorified.", file: "06_Jovens_16a24__CEX_2026_012_Alem_do_Palco__02_English__01_Messages__CEX_2026_012_EN_Message_03_Gifts_for_Serving_v1.0.html" },
        { titulo: "Sent to Make Disciples", texto: "Matthew 28:16-20", verdade: "The risen Christ sends his church to make disciples, sustained by his authority and presence.", file: "06_Jovens_16a24__CEX_2026_012_Alem_do_Palco__02_English__01_Messages__CEX_2026_012_EN_Message_04_Sent_to_Make_Disciples_v1.0.html" },
      ],
    },
    es: {
      titulo: "Más Allá del Escenario",
      promessa: "Una serie para liberar el llamado de la ansiedad por un cargo, una plataforma y un destino extraordinario, devolviéndolo al seguimiento de Jesús.",
      pra_quem: "Para cultos de jóvenes, grupos pequeños y retiros. Las aplicaciones alcanzan la iglesia, los estudios, el trabajo, el hogar y la ciudad.",
      resultado: "El joven podrá describir su próximo paso de discipulado y servicio sin depender de una función ideal.",
      uso: "La serie no desvaloriza las vocaciones profesionales, no promete claridad instantánea ni convierte el servicio en activismo o prueba de valor.",
      keywords: ["jóvenes", "llamado", "vocación", "servicio", "gran comisión"],
      unidades: [
        { titulo: "Antes de Hacer, Sigue", texto: "Marcos 1:14-20", verdade: "El llamado de Jesús comienza con arrepentimiento, fe y seguimiento antes de cualquier función.", file: "06_Jovens_16a24__CEX_2026_012_Alem_do_Palco__03_Espanol__01_Mensajes__CEX_2026_012_ES_Mensaje_01_Antes_de_Hacer_Sigue_v1.0.html" },
        { titulo: "Gracia que se Convierte en Camino", texto: "Efesios 2:1-10", verdade: "Somos salvos por gracia en Cristo y recreados para las buenas obras preparadas por Dios.", file: "06_Jovens_16a24__CEX_2026_012_Alem_do_Palco__03_Espanol__01_Mensajes__CEX_2026_012_ES_Mensaje_02_Gracia_que_se_Convierte_en_Camino_v1.0.html" },
        { titulo: "Dones para Servir", texto: "1 Pedro 4:7-11", verdade: "La gracia de Dios distribuye dones para que nos sirvamos unos a otros y Dios sea glorificado.", file: "06_Jovens_16a24__CEX_2026_012_Alem_do_Palco__03_Espanol__01_Mensajes__CEX_2026_012_ES_Mensaje_03_Dones_para_Servir_v1.0.html" },
        { titulo: "Enviados a Hacer Discípulos", texto: "Mateo 28:16-20", verdade: "El Cristo resucitado envía a su iglesia a hacer discípulos, sostenida por su autoridad y presencia.", file: "06_Jovens_16a24__CEX_2026_012_Alem_do_Palco__03_Espanol__01_Mensajes__CEX_2026_012_ES_Mensaje_04_Enviados_a_Hacer_Discipulos_v1.0.html" },
      ],
    },
  },
  {
    slug: "raizes", code: "013", estante: "jovens", etiqueta: "Jovens", preco: "R$ 47", pages: 5,
    pt: {
      titulo: "Raízes",
      promessa: "Fé recebida, decisões sábias, relações que formam e perseverança na comunidade para a transição à vida adulta.",
      pra_quem: "Para jovens em transição de estudo, trabalho, cidade e responsabilidades. Não oferece respostas prontas para cada escolha; ensina critérios e comunidade.",
      resultado: "O jovem terá um plano de práticas que conecta convicção pessoal, discernimento e permanência no corpo de Cristo.",
      uso: "Fé própria não significa fé solitária. Provérbios é tratado como sabedoria, não como promessa automática, e permanência na igreja não se resume a presença em reuniões.",
      keywords: ["jovens", "fé própria", "sabedoria", "perseverança"],
      unidades: [
        { titulo: "Fé recebida, fé cultivada", texto: "2 Timóteo 1:3-14", verdade: "A fé recebida de testemunhas precisa ser reavivada, guardada e vivida pelo Espírito.", file: "06_Jovens_16a24__CEX_2026_013_Raizes__01_Portugues__01_Mensagens__CEX_2026_013_PT_Mensagem_01_Fe_recebida_fe_cultivada_v1.0.html" },
        { titulo: "Sabedoria para decisões reais", texto: "Tiago 1:5-8 e 3:13-18", verdade: "Deus dá sabedoria que nasce da humildade e produz uma vida pura, pacífica e cheia de bons frutos.", file: "06_Jovens_16a24__CEX_2026_013_Raizes__01_Portugues__01_Mensagens__CEX_2026_013_PT_Mensagem_02_Sabedoria_para_decisoes_reais_v1.0.html" },
        { titulo: "Relações que formam", texto: "Provérbios 13:20 e 27:5-17", verdade: "As relações que cultivamos participam da nossa formação e precisam unir presença, verdade e sabedoria.", file: "06_Jovens_16a24__CEX_2026_013_Raizes__01_Portugues__01_Mensagens__CEX_2026_013_PT_Mensagem_03_Relacoes_que_formam_v1.0.html" },
        { titulo: "Permanecer juntos", texto: "Hebreus 10:19-25", verdade: "A obra de Jesus nos aproxima de Deus e nos chama a perseverar estimulando uns aos outros em comunidade.", file: "06_Jovens_16a24__CEX_2026_013_Raizes__01_Portugues__01_Mensagens__CEX_2026_013_PT_Mensagem_04_Permanecer_juntos_v1.0.html" },
      ],
    },
    en: {
      titulo: "Roots",
      promessa: "Received faith, wise decisions, formative relationships, and perseverance in community for the transition into adult life.",
      pra_quem: "For young adults transitioning through study, work, cities, and responsibilities. It does not offer ready-made answers for every choice; it teaches criteria and community.",
      resultado: "Young adults will have a plan of practices connecting personal conviction, discernment, and remaining in the body of Christ.",
      uso: "A personal faith does not mean a solitary faith. Proverbs is treated as wisdom, not an automatic promise, and remaining in the church is not reduced to attending meetings.",
      keywords: ["young adults", "personal faith", "wisdom", "perseverance"],
      unidades: [
        { titulo: "Faith Received, Faith Cultivated", texto: "2 Timothy 1:3-14", verdade: "Faith received from witnesses needs to be rekindled, guarded, and lived by the Spirit.", file: "06_Jovens_16a24__CEX_2026_013_Raizes__02_English__01_Messages__CEX_2026_013_EN_Message_01_Faith_Received_Faith_Cultivated_v1.0.html" },
        { titulo: "Wisdom for Real Decisions", texto: "James 1:5-8 and 3:13-18", verdade: "God gives wisdom that is born from humility and produces a pure, peaceable life full of good fruit.", file: "06_Jovens_16a24__CEX_2026_013_Raizes__02_English__01_Messages__CEX_2026_013_EN_Message_02_Wisdom_for_Real_Decisions_v1.0.html" },
        { titulo: "Relationships That Form Us", texto: "Proverbs 13:20 and 27:5-17", verdade: "The relationships we cultivate participate in our formation and need to unite presence, truth, and wisdom.", file: "06_Jovens_16a24__CEX_2026_013_Raizes__02_English__01_Messages__CEX_2026_013_EN_Message_03_Relationships_That_Form_Us_v1.0.html" },
        { titulo: "Remaining Together", texto: "Hebrews 10:19-25", verdade: "Jesus' work draws us near to God and calls us to persevere by encouraging one another in community.", file: "06_Jovens_16a24__CEX_2026_013_Raizes__02_English__01_Messages__CEX_2026_013_EN_Message_04_Remaining_Together_v1.0.html" },
      ],
    },
    es: {
      titulo: "Raíces",
      promessa: "Fe recibida, decisiones sabias, relaciones que forman y perseverancia en comunidad para la transición a la vida adulta.",
      pra_quem: "Para jóvenes en transición de estudios, trabajo, ciudad y responsabilidades. No ofrece respuestas preparadas para cada elección; enseña criterios y comunidad.",
      resultado: "El joven tendrá un plan de prácticas que conecta la convicción personal, el discernimiento y la permanencia en el cuerpo de Cristo.",
      uso: "Una fe propia no significa una fe solitaria. Proverbios se trata como sabiduría, no como promesa automática, y permanecer en la iglesia no se reduce a asistir a reuniones.",
      keywords: ["jóvenes", "fe propia", "sabiduría", "perseverancia"],
      unidades: [
        { titulo: "Fe Recibida, Fe Cultivada", texto: "2 Timoteo 1:3-14", verdade: "La fe recibida de testigos necesita ser reavivada, guardada y vivida por el Espíritu.", file: "06_Jovens_16a24__CEX_2026_013_Raizes__03_Espanol__01_Mensajes__CEX_2026_013_ES_Mensaje_01_Fe_Recibida_Fe_Cultivada_v1.0.html" },
        { titulo: "Sabiduría para Decisiones Reales", texto: "Santiago 1:5-8 y 3:13-18", verdade: "Dios da sabiduría que nace de la humildad y produce una vida pura, pacífica y llena de buenos frutos.", file: "06_Jovens_16a24__CEX_2026_013_Raizes__03_Espanol__01_Mensajes__CEX_2026_013_ES_Mensaje_02_Sabiduria_para_Decisiones_Reales_v1.0.html" },
        { titulo: "Relaciones que Forman", texto: "Proverbios 13:20 y 27:5-17", verdade: "Las relaciones que cultivamos participan en nuestra formación y necesitan unir presencia, verdad y sabiduría.", file: "06_Jovens_16a24__CEX_2026_013_Raizes__03_Espanol__01_Mensajes__CEX_2026_013_ES_Mensaje_03_Relaciones_que_Forman_v1.0.html" },
        { titulo: "Permanecer Juntos", texto: "Hebreos 10:19-25", verdade: "La obra de Jesús nos acerca a Dios y nos llama a perseverar, animándonos unos a otros en comunidad.", file: "06_Jovens_16a24__CEX_2026_013_Raizes__03_Espanol__01_Mensajes__CEX_2026_013_ES_Mensaje_04_Permanecer_Juntos_v1.0.html" },
      ],
    },
  },
  {
    slug: "legado", code: "014", estante: "igreja-toda", etiqueta: "Igreja toda", preco: "R$ 67", pages: 6,
    pt: {
      titulo: "Legado",
      promessa: "Uma campanha para transformar memória, rotina, pertencimento e transmissão do evangelho em responsabilidade de toda a igreja.",
      pra_quem: "Para quatro celebrações gerais, com aplicações distintas para crianças, adolescentes, jovens, adultos e idosos dentro da mesma mensagem.",
      resultado: "A igreja identificará práticas concretas de memória, rotina, cuidado e discipulado entre gerações.",
      uso: "A série não culpa pais por todas as escolhas dos filhos, não idealiza famílias, não coloca tradição acima do evangelho e não pressupõe que todos possuam a mesma estrutura familiar.",
      keywords: ["igreja toda", "gerações", "discipulado intergeracional", "transmissão da fé"],
      unidades: [
        { titulo: "Lembre o que Deus fez", texto: "Salmo 78:1-8", verdade: "O povo de Deus transmite seus feitos para que a próxima geração coloque nele a esperança.", file: "07_Geral__CEX_2026_014_Legado__01_Portugues__01_Mensagens__CEX_2026_014_PT_Mensagem_01_Lembre_o_que_Deus_fez_v1.0.html" },
        { titulo: "Faça da fé parte da rotina", texto: "Deuteronômio 6:4-9 e Marcos 12:28-34", verdade: "O amor ao único Deus ocupa a vida inteira e é ensinado no ritmo comum da casa e da comunidade.", file: "07_Geral__CEX_2026_014_Legado__01_Portugues__01_Mensagens__CEX_2026_014_PT_Mensagem_02_Faca_da_fe_parte_da_rotina_v1.0.html" },
        { titulo: "Abra espaço para todas as gerações", texto: "1 Coríntios 12:12-27", verdade: "Deus forma um corpo em Cristo no qual diferença não elimina pertencimento e ninguém pode ser descartado.", file: "07_Geral__CEX_2026_014_Legado__01_Portugues__01_Mensagens__CEX_2026_014_PT_Mensagem_03_Abra_espaco_para_todas_as_geracoes_v1.0.html" },
        { titulo: "Guarde e transmita o evangelho", texto: "2 Timóteo 1:3-14 e 2:1-2", verdade: "O evangelho deve ser guardado pelo Espírito e confiado a pessoas fiéis que ensinarão outras.", file: "07_Geral__CEX_2026_014_Legado__01_Portugues__01_Mensagens__CEX_2026_014_PT_Mensagem_04_Guarde_e_transmita_o_evangelho_v1.0.html" },
      ],
    },
    en: {
      titulo: "Legacy",
      promessa: "A campaign to turn memory, routine, belonging, and transmission of the gospel into the responsibility of the whole church.",
      pra_quem: "For four general services, with distinct applications for children, teenagers, young adults, adults, and older adults within the same message.",
      resultado: "The church will identify concrete practices of memory, routine, care, and discipleship between generations.",
      uso: "The series does not blame parents for every choice their children make, idealize families, place tradition above the gospel, or assume that everyone has the same family structure.",
      keywords: ["whole church", "generations", "intergenerational discipleship", "passing on faith"],
      unidades: [
        { titulo: "Remember What God Has Done", texto: "Psalm 78:1-8", verdade: "God's people pass on his deeds so that the next generation may place their hope in him.", file: "07_Geral__CEX_2026_014_Legado__02_English__01_Messages__CEX_2026_014_EN_Message_01_Remember_What_God_Has_Done_v1.0.html" },
        { titulo: "Make Faith Part of the Routine", texto: "Deuteronomy 6:4-9 and Mark 12:28-34", verdade: "Love for the one God fills all of life and is taught within the ordinary rhythm of home and community.", file: "07_Geral__CEX_2026_014_Legado__02_English__01_Messages__CEX_2026_014_EN_Message_02_Make_Faith_Part_of_the_Routine_v1.0.html" },
        { titulo: "Make Room for Every Generation", texto: "1 Corinthians 12:12-27", verdade: "God forms one body in Christ where difference does not eliminate belonging and no one can be discarded.", file: "07_Geral__CEX_2026_014_Legado__02_English__01_Messages__CEX_2026_014_EN_Message_03_Make_Room_for_Every_Generation_v1.0.html" },
        { titulo: "Guard and Pass On the Gospel", texto: "2 Timothy 1:3-14 and 2:1-2", verdade: "The gospel must be guarded by the Spirit and entrusted to faithful people who will teach others.", file: "07_Geral__CEX_2026_014_Legado__02_English__01_Messages__CEX_2026_014_EN_Message_04_Guard_and_Pass_On_the_Gospel_v1.0.html" },
      ],
    },
    es: {
      titulo: "Legado",
      promessa: "Una campaña para convertir la memoria, la rutina, la pertenencia y la transmisión del evangelio en responsabilidad de toda la iglesia.",
      pra_quem: "Para cuatro celebraciones generales, con aplicaciones distintas para niños, adolescentes, jóvenes, adultos y adultos mayores dentro del mismo mensaje.",
      resultado: "La iglesia identificará prácticas concretas de memoria, rutina, cuidado y discipulado entre generaciones.",
      uso: "La serie no culpa a los padres por todas las decisiones de sus hijos, no idealiza a las familias, no coloca la tradición por encima del evangelio ni presupone que todos tienen la misma estructura familiar.",
      keywords: ["iglesia toda", "generaciones", "discipulado intergeneracional", "transmisión de la fe"],
      unidades: [
        { titulo: "Recuerda lo que Dios Hizo", texto: "Salmo 78:1-8", verdade: "El pueblo de Dios transmite sus obras para que la próxima generación ponga en él su esperanza.", file: "07_Geral__CEX_2026_014_Legado__03_Espanol__01_Mensajes__CEX_2026_014_ES_Mensaje_01_Recuerda_lo_que_Dios_Hizo_v1.0.html" },
        { titulo: "Haz de la Fe Parte de la Rutina", texto: "Deuteronomio 6:4-9 y Marcos 12:28-34", verdade: "El amor al único Dios ocupa la vida entera y se enseña en el ritmo común del hogar y la comunidad.", file: "07_Geral__CEX_2026_014_Legado__03_Espanol__01_Mensajes__CEX_2026_014_ES_Mensaje_02_Haz_de_la_Fe_Parte_de_la_Rutina_v1.0.html" },
        { titulo: "Abre Espacio para Todas las Generaciones", texto: "1 Corintios 12:12-27", verdade: "Dios forma un cuerpo en Cristo donde la diferencia no elimina la pertenencia y nadie puede ser descartado.", file: "07_Geral__CEX_2026_014_Legado__03_Espanol__01_Mensajes__CEX_2026_014_ES_Mensaje_03_Abre_Espacio_para_Todas_las_Generaciones_v1.0.html" },
        { titulo: "Guarda y Transmite el Evangelio", texto: "2 Timoteo 1:3-14 y 2:1-2", verdade: "El evangelio debe ser guardado por el Espíritu y confiado a personas fieles que enseñarán a otras.", file: "07_Geral__CEX_2026_014_Legado__03_Espanol__01_Mensajes__CEX_2026_014_ES_Mensaje_04_Guarda_y_Transmite_el_Evangelio_v1.0.html" },
      ],
    },
  },
];

if (process.argv[2] !== "--export-only") {
  MATERIALS.forEach(build);
  console.log(`\nTotal: ${MATERIALS.length} materiais montados.`);
}

export { MATERIALS };
