// Script pontual: monta pt.json/en.json/es.json para os 14 materiais do
// "Catalogo Lote 02". Generaliza build-catalogo-2.mjs pra numero variavel de
// encontros por material (5 a 7). Os arquivos roteiro.html sao localizados
// por glob (codigo CEX + idioma), nao por nome literal, pra evitar erro de
// transcricao com os nomes de pasta variados por idioma.
import fs from "node:fs";
import path from "node:path";

const H = "/tmp/cex_lote2_extract";
const OUT_ROOT = "content-intake";
const ALL_FILES = fs.readdirSync(H);

function findRoteiros(code, langDir, msgDir) {
  const re = new RegExp(`CEX_2026_${code}_.*__${langDir}__${msgDir}__CEX_2026_${code}_.*\\.html$`);
  const matches = ALL_FILES.filter((f) => re.test(f));
  matches.sort((a, b) => {
    const na = Number(a.match(/_(\d{2})_/g)?.pop()?.replace(/_/g, ""));
    const nb = Number(b.match(/_(\d{2})_/g)?.pop()?.replace(/_/g, ""));
    return na - nb;
  });
  return matches.map((f) => fs.readFileSync(`${H}/${f}`, "utf-8"));
}

const COMO_USAR = {
  pt: "Cada encontro vem completo e pronto para preparação do líder: leitura bíblica, orientações, atividades, perguntas, momento de resposta e continuidade semanal. Inclui versões integrais em português, inglês e espanhol, com a mesma ordem, estrutura e nível de detalhe.",
  en: "Each session comes complete and ready for leader preparation: Bible reading, guidance, activities, questions, a response moment, and weekly follow-through. Includes complete Portuguese, English, and Spanish versions with the same order, structure, and level of detail.",
  es: "Cada encuentro viene completo y listo para la preparación del líder: lectura bíblica, orientaciones, actividades, preguntas, momento de respuesta y continuidad semanal. Incluye versiones completas en portugués, inglés y español con el mismo orden, estructura y nivel de detalle.",
};

function faqFor(resultado, uso, lang) {
  const Q1 = { pt: "Qual é o resultado esperado desta série?", en: "What is the expected outcome of this series?", es: "¿Cuál es el resultado esperado de esta serie?" }[lang];
  const Q2 = { pt: "Como usar essa série com responsabilidade?", en: "How should this series be used responsibly?", es: "¿Cómo usar esta serie con responsabilidad?" }[lang];
  return [
    { q: Q1, a: resultado },
    { q: Q2, a: uso },
  ];
}

const UNIT_WORD = { pt: "Encontro", en: "Session", es: "Encuentro" };

function buildLangPayload(lang, m, langData, pages, roteiros) {
  const conteudo = langData.unidades.map((u, i) => `${UNIT_WORD[lang]} ${i + 1}: ${u.titulo}`);
  const mensagens_lista = langData.unidades.map((u) => ({ nome: u.titulo, desc: u.verdade }));
  const contents = langData.unidades.map((u, i) => ({
    kind: "word",
    name: `${UNIT_WORD[lang]} ${i + 1}: ${u.titulo}`,
    note: u.texto,
    pages,
    messages: 1,
    delivery: "word",
    file: null,
    roteiro: roteiros[i],
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
  const n = m.pt.unidades.length;
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
    mensagens: n,
    paginas: pages * n,
    formatos: ["PDF", "Editável"],
    preco: m.preco,
    hotmart_url: "",
    hotmart_product_id: null,
    hotmart_offer_id: null,
    colecoes: [],
    status: "Rascunho",
  };
  const ptRoteiros = findRoteiros(m.code, "01_Portugues", "01_Mensagens");
  const enRoteiros = findRoteiros(m.code, "02_English", "01_Messages");
  const esRoteiros = findRoteiros(m.code, "03_Espanol", "01_Mensajes");
  if (ptRoteiros.length !== n || enRoteiros.length !== n || esRoteiros.length !== n) {
    throw new Error(`${m.slug}: esperado ${n} roteiros, achou pt=${ptRoteiros.length} en=${enRoteiros.length} es=${esRoteiros.length}`);
  }
  const pt = { ...base, ...buildLangPayload("pt", m, m.pt, pages, ptRoteiros) };
  const en = { ...base, ...buildLangPayload("en", m, m.en, pages, enRoteiros) };
  const es = { ...base, ...buildLangPayload("es", m, m.es, pages, esRoteiros) };
  fs.writeFileSync(`${dir}/pt.json`, JSON.stringify(pt, null, 2));
  fs.writeFileSync(`${dir}/en.json`, JSON.stringify(en, null, 2));
  fs.writeFileSync(`${dir}/es.json`, JSON.stringify(es, null, 2));
  console.log("Escrito:", dir, `(${n} encontros)`);
}

// ── dados dos 14 materiais ──────────────────────────────────────────────────
const MATERIALS = [
  {
    slug: "pelo-nome", code: "015", estante: "infantil-bercario", etiqueta: "Berçário", preco: "R$ 37", pages: 3,
    pt: {
      titulo: "Pelo Nome",
      promessa: "5 encontros bíblicos que ajudam bebês a receber a verdade bíblica por meio de presença, repetição e cuidado, sem que o encontro vire apenas recreação.",
      pra_quem: "Encontros de berçário durante cultos, com um líder e cuidadores próximos. Todos os recursos são grandes, laváveis e de baixo custo.",
      resultado: "O líder conduzirá cinco experiências bíblicas breves, e os cuidadores levarão para casa frases simples de bênção e cuidado.",
      uso: "A série não transforma promessas feitas a Israel em garantias individuais, não afirma que Deus evita todo desconforto e não vincula valor a saúde, aparência ou desenvolvimento.",
      keywords: ["berçário", "deus conhece", "nome", "cuidado", "bebês"],
      unidades: [
        { titulo: "Deus sabe meu nome", texto: "Salmo 139:1-6", verdade: "Deus conhece cada pessoa por inteiro e nunca nos confunde." },
        { titulo: "Chamados com amor", texto: "Isaías 43:1-3", verdade: "O Deus que formou seu povo o chama para pertencer a ele." },
        { titulo: "Jesus recebe os pequenos", texto: "Marcos 10:13-16", verdade: "Jesus recebe as crianças e mostra que elas não são um incômodo no Reino." },
        { titulo: "O Pastor conhece suas ovelhas", texto: "João 10:1-16", verdade: "Jesus conhece os seus e os conduz como o Bom Pastor." },
        { titulo: "Filhos amados", texto: "1 João 3:1-3", verdade: "O amor do Pai nos recebe em sua família por meio de Cristo." },
      ],
    },
    en: {
      titulo: "Called by Name",
      promessa: "5 biblical sessions that help babies receive biblical truth through presence, repetition, and care, without the gathering becoming mere playtime.",
      pra_quem: "Nursery gatherings during church services, with one leader and caregivers nearby. Every resource is large, washable, and low cost.",
      resultado: "The leader will guide five brief biblical experiences, and caregivers will take home simple sentences of blessing and care.",
      uso: "The series does not turn promises made to Israel into individual guarantees, does not claim that God prevents every discomfort, and does not tie worth to health, appearance, or development.",
      keywords: ["nursery", "god knows", "name", "care", "babies"],
      unidades: [
        { titulo: "God Knows My Name", texto: "Psalm 139:1-6", verdade: "God knows every person completely and never confuses us with someone else." },
        { titulo: "Called with Love", texto: "Isaiah 43:1-3", verdade: "The God who formed his people calls them to belong to him." },
        { titulo: "Jesus Welcomes Little Ones", texto: "Mark 10:13-16", verdade: "Jesus welcomes children and shows that they are not a nuisance in the kingdom." },
        { titulo: "The Shepherd Knows His Sheep", texto: "John 10:1-16", verdade: "Jesus knows his own and leads them as the Good Shepherd." },
        { titulo: "Beloved Children", texto: "1 John 3:1-3", verdade: "The Father's love welcomes us into his family through Christ." },
      ],
    },
    es: {
      titulo: "Por tu Nombre",
      promessa: "5 encuentros bíblicos que ayudan a los bebés a recibir la verdad bíblica mediante presencia, repetición y cuidado, sin que el encuentro se vuelva solo recreación.",
      pra_quem: "Encuentros de sala cuna durante los cultos, con un líder y cuidadores cerca. Todos los recursos son grandes, lavables y de bajo costo.",
      resultado: "El líder guiará cinco experiencias bíblicas breves, y los cuidadores llevarán a casa frases sencillas de bendición y cuidado.",
      uso: "La serie no convierte promesas dadas a Israel en garantías individuales, no afirma que Dios evita toda incomodidad ni relaciona el valor con salud, apariencia o desarrollo.",
      keywords: ["sala cuna", "dios conoce", "nombre", "cuidado", "bebés"],
      unidades: [
        { titulo: "Dios Sabe mi Nombre", texto: "Salmo 139:1-6", verdade: "Dios conoce por completo a cada persona y nunca nos confunde con otra." },
        { titulo: "Llamados con Amor", texto: "Isaías 43:1-3", verdade: "El Dios que formó a su pueblo lo llama a pertenecerle." },
        { titulo: "Jesús Recibe a los Pequeños", texto: "Marcos 10:13-16", verdade: "Jesús recibe a los niños y muestra que no son una molestia en el Reino." },
        { titulo: "El Pastor Conoce a sus Ovejas", texto: "Juan 10:1-16", verdade: "Jesús conoce a los suyos y los guía como el Buen Pastor." },
        { titulo: "Hijos Amados", texto: "1 Juan 3:1-3", verdade: "El amor del Padre nos recibe en su familia por medio de Cristo." },
      ],
    },
  },
  {
    slug: "tudo-o-que-respira", code: "016", estante: "infantil-bercario", etiqueta: "Berçário", preco: "R$ 39", pages: 3,
    pt: {
      titulo: "Tudo o que Respira",
      promessa: "6 encontros bíblicos para ensinar que Deus é digno de louvor e que gestos simples podem participar de uma resposta reverente e alegre.",
      pra_quem: "Seis encontros breves com cuidadores presentes, volume controlado e instrumentos grandes usados somente por adultos.",
      resultado: "Bebês experimentarão padrões previsíveis de louvor, e cuidadores aprenderão a adorar sem excesso de estímulo.",
      uso: "Adoração não é barulho, performance ou tentativa de provocar uma reação. O volume deve ser baixo, o bebê pode apenas observar e nenhuma resposta corporal é exigida.",
      keywords: ["berçário", "adoração", "louvor", "criação", "bebês"],
      unidades: [
        { titulo: "O fôlego vem de Deus", texto: "Gênesis 2:4-7", verdade: "A vida é dom de Deus e todo fôlego depende dele." },
        { titulo: "Palmas para o Rei", texto: "Salmo 47:1-2", verdade: "Deus reina sobre todos e seu povo responde com alegria." },
        { titulo: "Mãos levantadas", texto: "Salmo 134", verdade: "Podemos bendizer o Senhor com reverência em todos os momentos." },
        { titulo: "A criação faz festa", texto: "Salmo 98:4-9", verdade: "Toda a criação aponta para a grandeza e a justiça do Senhor." },
        { titulo: "Se ficarmos calados", texto: "Lucas 19:35-40", verdade: "Jesus é o Rei digno de louvor e sua chegada não pode ser escondida." },
        { titulo: "Todo ser diante do Cordeiro", texto: "Apocalipse 5:9-14", verdade: "Jesus, o Cordeiro que venceu, recebe a adoração de toda a criação." },
      ],
    },
    en: {
      titulo: "Everything That Breathes",
      promessa: "6 biblical sessions to teach that God is worthy of praise and that simple gestures can take part in a joyful, reverent response.",
      pra_quem: "Six brief gatherings with caregivers present, controlled volume, and large instruments handled only by adults.",
      resultado: "Babies will experience predictable patterns of praise, and caregivers will learn to worship without overstimulation.",
      uso: "Worship is not noise, performance, or an attempt to force a reaction. Volume must remain low, babies may simply observe, and no bodily response is required.",
      keywords: ["nursery", "worship", "praise", "creation", "babies"],
      unidades: [
        { titulo: "Breath Comes from God", texto: "Genesis 2:4-7", verdade: "Life is God's gift, and every breath depends on him." },
        { titulo: "Clap for the King", texto: "Psalm 47:1-2", verdade: "God reigns over all, and his people respond with joy." },
        { titulo: "Hands Lifted", texto: "Psalm 134", verdade: "We can bless the Lord with reverence at every time." },
        { titulo: "Creation Rejoices", texto: "Psalm 98:4-9", verdade: "All creation points to the Lord's greatness and justice." },
        { titulo: "If We Keep Silent", texto: "Luke 19:35-40", verdade: "Jesus is the King worthy of praise, and his coming cannot be hidden." },
        { titulo: "Every Creature Before the Lamb", texto: "Revelation 5:9-14", verdade: "Jesus, the Lamb who conquered, receives the worship of all creation." },
      ],
    },
    es: {
      titulo: "Todo lo que Respira",
      promessa: "6 encuentros bíblicos para enseñar que Dios es digno de alabanza y que gestos sencillos pueden participar de una respuesta reverente y alegre.",
      pra_quem: "Seis encuentros breves con cuidadores presentes, volumen controlado e instrumentos grandes usados solo por adultos.",
      resultado: "Los bebés experimentarán patrones previsibles de alabanza, y los cuidadores aprenderán a adorar sin exceso de estímulo.",
      uso: "La adoración no es ruido, espectáculo ni intento de provocar una reacción. El volumen debe ser bajo, el bebé puede solo observar y no se exige respuesta corporal.",
      keywords: ["sala cuna", "adoración", "alabanza", "creación", "bebés"],
      unidades: [
        { titulo: "El Aliento Viene de Dios", texto: "Génesis 2:4-7", verdade: "La vida es don de Dios y todo aliento depende de él." },
        { titulo: "Palmas para el Rey", texto: "Salmo 47:1-2", verdade: "Dios reina sobre todos y su pueblo responde con alegría." },
        { titulo: "Manos Levantadas", texto: "Salmo 134", verdade: "Podemos bendecir al Señor con reverencia en todo momento." },
        { titulo: "La Creación se Alegra", texto: "Salmo 98:4-9", verdade: "Toda la creación señala la grandeza y la justicia del Señor." },
        { titulo: "Si Callamos", texto: "Lucas 19:35-40", verdade: "Jesús es el Rey digno de alabanza y su llegada no puede ocultarse." },
        { titulo: "Toda Criatura Ante el Cordero", texto: "Apocalipsis 5:9-14", verdade: "Jesús, el Cordero que venció, recibe la adoración de toda la creación." },
      ],
    },
  },
  {
    slug: "tem-lugar", code: "017", estante: "infantil-maternal", etiqueta: "Maternal", preco: "R$ 37", pages: 3,
    pt: {
      titulo: "Tem Lugar",
      promessa: "5 encontros bíblicos para mostrar que Jesus acolhe, transforma a mesa em lugar de graça e forma uma comunidade que compartilha e cuida.",
      pra_quem: "Cinco aulas para igreja infantil, com narrativa breve, brincadeira cooperativa, desenho para colorir e continuidade em família.",
      resultado: "As crianças reconhecerão atitudes simples de acolhimento, partilha, ajuda e participação na comunidade de Jesus.",
      uso: "A série não obriga contato físico, não exige compartilhar objetos pessoais e não usa a timidez como sinal de desobediência. Crianças podem observar antes de participar.",
      keywords: ["maternal", "acolhimento", "partilha", "comunidade"],
      unidades: [
        { titulo: "Jesus abre espaço", texto: "Marcos 10:13-16", verdade: "Jesus recebe as crianças e ensina seus seguidores a não criar barreiras." },
        { titulo: "Uma mesa diferente", texto: "Lucas 19:1-10", verdade: "Jesus se aproxima de quem estava isolado e sua graça produz mudança." },
        { titulo: "O pouco pode servir", texto: "João 6:1-13", verdade: "Jesus recebe o que é colocado em suas mãos e cuida da multidão." },
        { titulo: "Eu posso ajudar", texto: "Lucas 10:25-37", verdade: "Amar o próximo inclui perceber a necessidade e oferecer ajuda segura." },
        { titulo: "Uma família que reparte", texto: "Atos 2:42-47", verdade: "O evangelho forma uma igreja que aprende, ora, reparte e cuida." },
      ],
    },
    en: {
      titulo: "There Is Room",
      promessa: "5 biblical sessions to show that Jesus welcomes, turns the table into a place of grace, and forms a community that shares and cares.",
      pra_quem: "Five children's church lessons with a brief story, cooperative play, a coloring page, and family follow-through.",
      resultado: "Children will recognize simple practices of welcome, sharing, help, and participation in Jesus' community.",
      uso: "The series does not require physical contact, does not force children to share personal belongings, and does not treat shyness as disobedience. Children may observe before participating.",
      keywords: ["preschool", "welcome", "sharing", "community"],
      unidades: [
        { titulo: "Jesus Makes Room", texto: "Mark 10:13-16", verdade: "Jesus welcomes children and teaches his followers not to create barriers." },
        { titulo: "A Different Table", texto: "Luke 19:1-10", verdade: "Jesus comes near to those who were isolated, and his grace produces change." },
        { titulo: "A Little Can Serve", texto: "John 6:1-13", verdade: "Jesus receives what is placed in his hands and cares for the crowd." },
        { titulo: "I Can Help", texto: "Luke 10:25-37", verdade: "Loving our neighbor includes noticing need and offering safe help." },
        { titulo: "A Family That Shares", texto: "Acts 2:42-47", verdade: "The gospel forms a church that learns, prays, shares, and cares." },
      ],
    },
    es: {
      titulo: "Hay Lugar",
      promessa: "5 encuentros bíblicos para mostrar que Jesús recibe, convierte la mesa en lugar de gracia y forma una comunidad que comparte y cuida.",
      pra_quem: "Cinco clases para iglesia infantil con relato breve, juego cooperativo, dibujo para colorear y continuidad en familia.",
      resultado: "Los niños reconocerán prácticas sencillas de bienvenida, compartir, ayuda y participación en la comunidad de Jesús.",
      uso: "La serie no obliga al contacto físico, no exige compartir objetos personales ni trata la timidez como desobediencia. Los niños pueden observar antes de participar.",
      keywords: ["preescolar", "bienvenida", "compartir", "comunidad"],
      unidades: [
        { titulo: "Jesús Hace Lugar", texto: "Marcos 10:13-16", verdade: "Jesús recibe a los niños y enseña a sus seguidores a no crear barreras." },
        { titulo: "Una Mesa Diferente", texto: "Lucas 19:1-10", verdade: "Jesús se acerca a quien estaba aislado y su gracia produce cambio." },
        { titulo: "Lo Poco Puede Servir", texto: "Juan 6:1-13", verdade: "Jesús recibe lo que se pone en sus manos y cuida a la multitud." },
        { titulo: "Puedo Ayudar", texto: "Lucas 10:25-37", verdade: "Amar al prójimo incluye percibir la necesidad y ofrecer ayuda segura." },
        { titulo: "Una Familia que Comparte", texto: "Hechos 2:42-47", verdade: "El evangelio forma una iglesia que aprende, ora, comparte y cuida." },
      ],
    },
  },
  {
    slug: "com-jesus-eu-vou", code: "018", estante: "infantil-maternal", etiqueta: "Maternal", preco: "R$ 39", pages: 3,
    pt: {
      titulo: "Com Jesus Eu Vou",
      promessa: "6 encontros bíblicos para apresentar o discipulado como resposta à graça de Jesus, com passos concretos e adequados à idade.",
      pra_quem: "Seis aulas com movimentos, narrativas curtas, atividades de imitação segura e desenho para colorir.",
      resultado: "As crianças ligarão a expressão seguir Jesus a ouvir sua Palavra, confiar nele, amar pessoas e contar as boas notícias.",
      uso: "A resposta da criança não deve ser medida por repetição de palavras, decisão pública forçada ou comportamento perfeito. O líder apresenta o evangelho e convida sem pressão.",
      keywords: ["maternal", "seguir jesus", "discipulado", "confiança"],
      unidades: [
        { titulo: "Venham comigo", texto: "Marcos 1:14-20", verdade: "Jesus chama pessoas comuns para segui-lo e aprender com ele." },
        { titulo: "Jesus chama Levi", texto: "Marcos 2:13-17", verdade: "Jesus chama pecadores ao arrependimento e oferece uma nova direção." },
        { titulo: "Parar para ouvir", texto: "Lucas 10:38-42", verdade: "Seguir Jesus inclui parar para ouvir sua palavra." },
        { titulo: "Jesus está no barco", texto: "Marcos 4:35-41", verdade: "Jesus é Senhor mesmo quando sentimos medo." },
        { titulo: "Amar como Jesus", texto: "João 13:1-17,34-35", verdade: "Quem segue Jesus aprende a servir e amar como ele." },
        { titulo: "Jesus nos envia", texto: "Mateus 28:16-20", verdade: "Jesus ressuscitado envia seus discípulos e promete estar com eles." },
      ],
    },
    en: {
      titulo: "With Jesus I Go",
      promessa: "6 biblical sessions to present discipleship as a response to Jesus' grace, with concrete, age-appropriate steps.",
      pra_quem: "Six lessons with movement, brief narratives, safe imitation activities, and a coloring page.",
      resultado: "Children will connect following Jesus with hearing his Word, trusting him, loving people, and telling the good news.",
      uso: "A child's response must not be measured by repeated words, a forced public decision, or perfect behavior. The leader presents the gospel and invites without pressure.",
      keywords: ["preschool", "following jesus", "discipleship", "trust"],
      unidades: [
        { titulo: "Come with Me", texto: "Mark 1:14-20", verdade: "Jesus calls ordinary people to follow him and learn from him." },
        { titulo: "Jesus Calls Levi", texto: "Mark 2:13-17", verdade: "Jesus calls sinners to repentance and offers a new direction." },
        { titulo: "Stop and Listen", texto: "Luke 10:38-42", verdade: "Following Jesus includes stopping to hear his word." },
        { titulo: "Jesus Is in the Boat", texto: "Mark 4:35-41", verdade: "Jesus is Lord even when we feel afraid." },
        { titulo: "Love Like Jesus", texto: "John 13:1-17,34-35", verdade: "Those who follow Jesus learn to serve and love as he does." },
        { titulo: "Jesus Sends Us", texto: "Matthew 28:16-20", verdade: "The risen Jesus sends his disciples and promises to be with them." },
      ],
    },
    es: {
      titulo: "Con Jesús Voy",
      promessa: "6 encuentros bíblicos para presentar el discipulado como respuesta a la gracia de Jesús, con pasos concretos y adecuados a la edad.",
      pra_quem: "Seis clases con movimiento, relatos breves, actividades de imitación segura y dibujo para colorear.",
      resultado: "Los niños relacionarán seguir a Jesús con escuchar su Palabra, confiar en él, amar a las personas y contar las buenas noticias.",
      uso: "La respuesta del niño no debe medirse por repetir palabras, una decisión pública forzada o conducta perfecta. El líder presenta el evangelio e invita sin presión.",
      keywords: ["preescolar", "seguir a jesús", "discipulado", "confianza"],
      unidades: [
        { titulo: "Vengan Conmigo", texto: "Marcos 1:14-20", verdade: "Jesús llama a personas comunes a seguirlo y aprender de él." },
        { titulo: "Jesús Llama a Leví", texto: "Marcos 2:13-17", verdade: "Jesús llama a pecadores al arrepentimiento y ofrece una nueva dirección." },
        { titulo: "Detenerse para Escuchar", texto: "Lucas 10:38-42", verdade: "Seguir a Jesús incluye detenerse para escuchar su palabra." },
        { titulo: "Jesús Está en la Barca", texto: "Marcos 4:35-41", verdade: "Jesús es Señor aun cuando sentimos miedo." },
        { titulo: "Amar como Jesús", texto: "Juan 13:1-17,34-35", verdade: "Quien sigue a Jesús aprende a servir y amar como él." },
        { titulo: "Jesús Nos Envía", texto: "Mateo 28:16-20", verdade: "Jesús resucitado envía a sus discípulos y promete estar con ellos." },
      ],
    },
  },
  {
    slug: "o-medo-nao-manda", code: "019", estante: "infantil-primarios", etiqueta: "Primários", preco: "R$ 39", pages: 3,
    pt: {
      titulo: "O Medo Não Manda",
      promessa: "6 encontros bíblicos para ajudar crianças a reconhecer o medo, lembrar quem Deus é, pedir ajuda e agir com obediência possível.",
      pra_quem: "Seis aulas completas para igreja infantil, com narrativa bíblica, atividade de decisão, desenho para colorir e orientação à família.",
      resultado: "As crianças saberão dizer que coragem não é ausência de medo, identificar adultos seguros e responder a desafios sem se colocar em risco.",
      uso: "Nenhuma atividade expõe a criança a sustos, escuro, altura, confronto ou relato pessoal. Situações de ameaça, violência ou sofrimento devem ser encaminhadas a responsáveis e liderança de proteção.",
      keywords: ["primários", "coragem", "medo", "confiança em deus"],
      unidades: [
        { titulo: "A tempestade não decide", texto: "Marcos 4:35-41", verdade: "Podemos levar nosso medo a Jesus porque ele é Senhor no meio da tempestade." },
        { titulo: "Coragem para o próximo passo", texto: "Josué 1:1-9", verdade: "Coragem cresce quando ouvimos a Palavra e obedecemos ao próximo passo." },
        { titulo: "Maior que o gigante", texto: "1 Samuel 17:1-50", verdade: "A coragem de Davi nasce da honra ao nome de Deus, não da confiança em si mesmo." },
        { titulo: "Coragem para falar", texto: "Ester 4:10-17", verdade: "Coragem pode significar usar nossa voz para proteger outras pessoas." },
        { titulo: "Fiel quando custa", texto: "Daniel 6:1-23", verdade: "Podemos permanecer fiéis a Deus e buscar ajuda quando obedecer traz pressão." },
        { titulo: "Medo e grande alegria", texto: "Mateus 28:1-10", verdade: "A ressurreição de Jesus transforma medo em esperança e nos envia com boas notícias." },
      ],
    },
    en: {
      titulo: "Fear Does Not Decide",
      promessa: "6 biblical sessions to help children recognize fear, remember who God is, ask for help, and take possible steps of obedience.",
      pra_quem: "Six complete children's church lessons with biblical narrative, a decision activity, a coloring page, and family guidance.",
      resultado: "Children will be able to say that courage is not the absence of fear, identify safe adults, and respond to challenges without putting themselves in danger.",
      uso: "No activity exposes children to scares, darkness, heights, confrontation, or personal disclosure. Threats, violence, or suffering must be referred to caregivers and safeguarding leaders.",
      keywords: ["primary", "courage", "fear", "trust in god"],
      unidades: [
        { titulo: "The Storm Does Not Decide", texto: "Mark 4:35-41", verdade: "We can bring our fear to Jesus because he is Lord in the middle of the storm." },
        { titulo: "Courage for the Next Step", texto: "Joshua 1:1-9", verdade: "Courage grows as we hear the Word and obey the next step." },
        { titulo: "Greater Than the Giant", texto: "1 Samuel 17:1-50", verdade: "David's courage grows from honoring God's name, not from self-confidence." },
        { titulo: "Courage to Speak", texto: "Esther 4:10-17", verdade: "Courage can mean using our voice to protect other people." },
        { titulo: "Faithful When It Costs", texto: "Daniel 6:1-23", verdade: "We can remain faithful to God and seek help when obedience brings pressure." },
        { titulo: "Fear and Great Joy", texto: "Matthew 28:1-10", verdade: "Jesus' resurrection turns fear toward hope and sends us with good news." },
      ],
    },
    es: {
      titulo: "El Miedo No Manda",
      promessa: "6 encuentros bíblicos para ayudar a los niños a reconocer el miedo, recordar quién es Dios, pedir ayuda y actuar con una obediencia posible.",
      pra_quem: "Seis clases completas para iglesia infantil con relato bíblico, actividad de decisión, dibujo para colorear y orientación familiar.",
      resultado: "Los niños podrán decir que la valentía no es ausencia de miedo, identificar adultos seguros y responder a desafíos sin ponerse en peligro.",
      uso: "Ninguna actividad expone al niño a sustos, oscuridad, altura, confrontación ni relato personal. Las situaciones de amenaza, violencia o sufrimiento deben comunicarse a responsables y líderes de protección.",
      keywords: ["primarios", "valentía", "miedo", "confianza en dios"],
      unidades: [
        { titulo: "La Tormenta No Decide", texto: "Marcos 4:35-41", verdade: "Podemos llevar nuestro miedo a Jesús porque él es Señor en medio de la tormenta." },
        { titulo: "Valentía para el Próximo Paso", texto: "Josué 1:1-9", verdade: "La valentía crece cuando escuchamos la Palabra y obedecemos el próximo paso." },
        { titulo: "Mayor que el Gigante", texto: "1 Samuel 17:1-50", verdade: "La valentía de David nace de honrar el nombre de Dios, no de confiar en sí mismo." },
        { titulo: "Valentía para Hablar", texto: "Ester 4:10-17", verdade: "La valentía puede significar usar nuestra voz para proteger a otras personas." },
        { titulo: "Fiel Cuando Cuesta", texto: "Daniel 6:1-23", verdade: "Podemos permanecer fieles a Dios y buscar ayuda cuando obedecer trae presión." },
        { titulo: "Temor y Gran Alegría", texto: "Mateo 28:1-10", verdade: "La resurrección de Jesús transforma el miedo en esperanza y nos envía con buenas noticias." },
      ],
    },
  },
  {
    slug: "entre-nos", code: "020", estante: "infantil-primarios", etiqueta: "Primários", preco: "R$ 41", pages: 3,
    pt: {
      titulo: "Entre Nós",
      promessa: "7 encontros bíblicos para formar hábitos de amizade fiel, fala responsável, resolução segura de conflitos e reconciliação centrada em Cristo.",
      pra_quem: "Sete aulas para igreja infantil, grupos ou escola bíblica, com cenas bíblicas, atividades cooperativas e desenhos para colorir.",
      resultado: "As crianças saberão diferenciar amizade de pressão, usar palavras que edificam, pedir perdão e procurar adultos diante de agressão ou ameaça.",
      uso: "Perdão não obriga proximidade imediata, segredo ou retorno a uma situação insegura. Conflitos comuns podem ser conversados; agressão, coerção e ameaças exigem intervenção adulta.",
      keywords: ["primários", "amizade", "perdão", "conflitos"],
      unidades: [
        { titulo: "Amigo em todo tempo", texto: "Provérbios 17:17; 18:24", verdade: "A amizade fiel permanece presente e não depende apenas de conveniência." },
        { titulo: "Uma amizade que protege", texto: "1 Samuel 18:1-5; 20:12-17", verdade: "Amigos fiéis falam a verdade e usam sua influência para proteger, não controlar." },
        { titulo: "Palavras deixam marcas", texto: "Tiago 3:1-12", verdade: "Nossas palavras têm poder e precisam ser guiadas pela sabedoria de Deus." },
        { titulo: "Quando queremos coisas diferentes", texto: "Gênesis 13:1-18", verdade: "Conflitos podem ser tratados com paz, generosidade e limites claros." },
        { titulo: "Perdão com verdade", texto: "Gênesis 45:1-15", verdade: "Perdoar não apaga a verdade, mas abre um caminho de graça e restauração." },
        { titulo: "Converse, não espalhe", texto: "Mateus 18:15-20", verdade: "Jesus ensina sua comunidade a tratar o pecado com verdade, cuidado e responsabilidade." },
        { titulo: "Amados e enviados como amigos", texto: "João 15:9-17", verdade: "A amizade cristã nasce do amor de Jesus e aprende a amar com entrega e obediência." },
      ],
    },
    en: {
      titulo: "Between Us",
      promessa: "7 biblical sessions to form habits of faithful friendship, responsible speech, safe conflict resolution, and Christ-centered reconciliation.",
      pra_quem: "Seven lessons for children's church, groups, or Bible school, with biblical scenes, cooperative activities, and coloring pages.",
      resultado: "Children will distinguish friendship from pressure, use words that build up, ask forgiveness, and seek adults when facing aggression or threats.",
      uso: "Forgiveness does not require immediate closeness, secrecy, or return to an unsafe situation. Ordinary conflict can be discussed; aggression, coercion, and threats require adult intervention.",
      keywords: ["primary", "friendship", "forgiveness", "conflict"],
      unidades: [
        { titulo: "A Friend at All Times", texto: "Proverbs 17:17; 18:24", verdade: "Faithful friendship remains present and does not depend only on convenience." },
        { titulo: "A Friendship That Protects", texto: "1 Samuel 18:1-5; 20:12-17", verdade: "Faithful friends tell the truth and use influence to protect, not control." },
        { titulo: "Words Leave Marks", texto: "James 3:1-12", verdade: "Our words have power and must be guided by God's wisdom." },
        { titulo: "When We Want Different Things", texto: "Genesis 13:1-18", verdade: "Conflict can be handled with peace, generosity, and clear boundaries." },
        { titulo: "Forgiveness with Truth", texto: "Genesis 45:1-15", verdade: "Forgiveness does not erase truth, but opens a path of grace and restoration." },
        { titulo: "Talk, Do Not Spread It", texto: "Matthew 18:15-20", verdade: "Jesus teaches his community to address sin with truth, care, and responsibility." },
        { titulo: "Loved and Sent as Friends", texto: "John 15:9-17", verdade: "Christian friendship grows from Jesus' love and learns self-giving, obedient love." },
      ],
    },
    es: {
      titulo: "Entre Nosotros",
      promessa: "7 encuentros bíblicos para formar hábitos de amistad fiel, habla responsable, resolución segura de conflictos y reconciliación centrada en Cristo.",
      pra_quem: "Siete clases para iglesia infantil, grupos o escuela bíblica, con escenas bíblicas, actividades cooperativas y dibujos para colorear.",
      resultado: "Los niños distinguirán amistad de presión, usarán palabras que edifican, pedirán perdón y buscarán adultos ante agresión o amenaza.",
      uso: "El perdón no obliga a cercanía inmediata, secreto ni regreso a una situación insegura. Los conflictos comunes pueden conversarse; agresión, coacción y amenazas requieren intervención adulta.",
      keywords: ["primarios", "amistad", "perdón", "conflictos"],
      unidades: [
        { titulo: "Amigo en Todo Tiempo", texto: "Proverbios 17:17; 18:24", verdade: "La amistad fiel permanece presente y no depende solo de conveniencia." },
        { titulo: "Una Amistad que Protege", texto: "1 Samuel 18:1-5; 20:12-17", verdade: "Los amigos fieles dicen la verdad y usan su influencia para proteger, no controlar." },
        { titulo: "Las Palabras Dejan Huellas", texto: "Santiago 3:1-12", verdade: "Nuestras palabras tienen poder y necesitan ser guiadas por la sabiduría de Dios." },
        { titulo: "Cuando Queremos Cosas Diferentes", texto: "Génesis 13:1-18", verdade: "Los conflictos pueden tratarse con paz, generosidad y límites claros." },
        { titulo: "Perdón con Verdad", texto: "Génesis 45:1-15", verdade: "Perdonar no borra la verdad, sino que abre un camino de gracia y restauración." },
        { titulo: "Habla, No lo Difundas", texto: "Mateo 18:15-20", verdade: "Jesús enseña a su comunidad a tratar el pecado con verdad, cuidado y responsabilidad." },
        { titulo: "Amados y Enviados como Amigos", texto: "Juan 15:9-17", verdade: "La amistad cristiana nace del amor de Jesús y aprende a amar con entrega y obediencia." },
      ],
    },
  },
  {
    slug: "sem-plateia-2", code: "021", estante: "juniores", etiqueta: "Juniores", preco: "R$ 41", pages: 4,
    pt: {
      titulo: "Sem Plateia",
      promessa: "6 encontros bíblicos para cultivar oração, Palavra, coração íntegro, escolhas coerentes, prática da verdade e vida comum diante de Deus.",
      pra_quem: "Seis encontros para igreja infantil, grupos de discipulado ou escola bíblica, com estudo, discussão e prática semanal.",
      resultado: "Os alunos distinguirão privacidade de segredo perigoso, identificarão motivações e escolherão práticas que não dependem de aplauso.",
      uso: "O ensino de que Deus vê não será usado para assustar, controlar ou impedir denúncias. Segredos que envolvem ameaça, toque inadequado, medo ou dano devem ser contados a um adulto seguro.",
      keywords: ["juniores", "integridade", "caráter", "vida interior"],
      unidades: [
        { titulo: "A porta fechada", texto: "Mateus 6:1-13", verdade: "Oramos para estar com o Pai, não para construir uma imagem diante das pessoas." },
        { titulo: "Guardado no coração", texto: "Salmo 119:9-16", verdade: "A Palavra guardada no coração orienta escolhas quando não há alguém lembrando o que fazer." },
        { titulo: "Deus olha o coração", texto: "1 Samuel 16:1-13", verdade: "Deus não avalia pessoas pelos critérios rápidos da aparência e da posição." },
        { titulo: "Uma decisão antes da pressão", texto: "Daniel 1:1-21", verdade: "Integridade prepara decisões antes que a pressão escolha por nós." },
        { titulo: "Ouvir e praticar", texto: "Tiago 1:19-27", verdade: "A verdade recebida se torna visível quando praticamos o que ouvimos." },
        { titulo: "Tudo em nome de Jesus", texto: "Colossenses 3:12-17", verdade: "A vida com Jesus alcança palavras, relações e tarefas comuns, mesmo sem aplauso." },
      ],
    },
    en: {
      titulo: "No Audience",
      promessa: "6 biblical sessions to cultivate prayer, Scripture, an undivided heart, consistent choices, practiced truth, and ordinary life before God.",
      pra_quem: "Six gatherings for children's church, discipleship groups, or Bible school, with study, discussion, and weekly practice.",
      resultado: "Students will distinguish privacy from dangerous secrecy, identify motivations, and choose practices that do not depend on applause.",
      uso: "The teaching that God sees will not be used to frighten, control, or silence disclosure. Secrets involving threats, inappropriate touch, fear, or harm must be told to a safe adult.",
      keywords: ["juniors", "integrity", "character", "inner life"],
      unidades: [
        { titulo: "The Closed Door", texto: "Matthew 6:1-13", verdade: "We pray to be with the Father, not to build an image before people." },
        { titulo: "Kept in the Heart", texto: "Psalm 119:9-16", verdade: "The Word kept in the heart guides choices when no one is reminding us what to do." },
        { titulo: "God Looks at the Heart", texto: "1 Samuel 16:1-13", verdade: "God does not evaluate people by the quick standards of appearance and position." },
        { titulo: "A Decision Before the Pressure", texto: "Daniel 1:1-21", verdade: "Integrity prepares decisions before pressure chooses for us." },
        { titulo: "Hear and Practice", texto: "James 1:19-27", verdade: "Received truth becomes visible when we practice what we hear." },
        { titulo: "Everything in Jesus' Name", texto: "Colossians 3:12-17", verdade: "Life with Jesus reaches words, relationships, and ordinary tasks, even without applause." },
      ],
    },
    es: {
      titulo: "Sin Público",
      promessa: "6 encuentros bíblicos para cultivar oración, Palabra, corazón íntegro, decisiones coherentes, práctica de la verdad y vida cotidiana delante de Dios.",
      pra_quem: "Seis encuentros para iglesia infantil, grupos de discipulado o escuela bíblica, con estudio, conversación y práctica semanal.",
      resultado: "Los alumnos distinguirán privacidad de secreto peligroso, identificarán motivaciones y elegirán prácticas que no dependan del aplauso.",
      uso: "La enseñanza de que Dios ve no se usará para asustar, controlar ni impedir que se cuente algo. Los secretos que involucren amenazas, contacto inadecuado, miedo o daño deben contarse a un adulto seguro.",
      keywords: ["juniors", "integridad", "carácter", "vida interior"],
      unidades: [
        { titulo: "La Puerta Cerrada", texto: "Mateo 6:1-13", verdade: "Oramos para estar con el Padre, no para construir una imagen ante las personas." },
        { titulo: "Guardado en el Corazón", texto: "Salmo 119:9-16", verdade: "La Palabra guardada en el corazón orienta decisiones cuando nadie está recordando qué hacer." },
        { titulo: "Dios Mira el Corazón", texto: "1 Samuel 16:1-13", verdade: "Dios no evalúa a las personas por los criterios rápidos de apariencia y posición." },
        { titulo: "Una Decisión Antes de la Presión", texto: "Daniel 1:1-21", verdade: "La integridad prepara decisiones antes de que la presión elija por nosotros." },
        { titulo: "Oír y Practicar", texto: "Santiago 1:19-27", verdade: "La verdad recibida se vuelve visible cuando practicamos lo que oímos." },
        { titulo: "Todo en el Nombre de Jesús", texto: "Colosenses 3:12-17", verdade: "La vida con Jesús alcanza palabras, relaciones y tareas comunes, aun sin aplauso." },
      ],
    },
  },
  {
    slug: "olha-de-novo", code: "022", estante: "juniores", etiqueta: "Juniores", preco: "R$ 39", pages: 4,
    pt: {
      titulo: "Olha de Novo",
      promessa: "5 encontros bíblicos para corrigir olhares superficiais, reconhecer dignidade, atravessar preconceitos e organizar cuidado comunitário responsável.",
      pra_quem: "Cinco encontros com observação de textos, estudo de casos fictícios e ações simples de cuidado supervisionado.",
      resultado: "Os alunos perceberão como rótulos distorcem o olhar, saberão chamar adultos e participarão de um plano de cuidado da igreja.",
      uso: "Não peça que alunos revelem pobreza, doença, discriminação ou conflitos da família. Serviço deve ser supervisionado, consentido e livre de exposição de imagem.",
      keywords: ["juniores", "compaixão", "dignidade", "preconceito"],
      unidades: [
        { titulo: "O Deus que me vê", texto: "Gênesis 16:1-16", verdade: "Deus vê pessoas feridas e esquecidas sem aprovar a injustiça que sofreram." },
        { titulo: "Além da aparência", texto: "1 Samuel 16:1-13", verdade: "Deus corrige critérios superficiais e olha o coração para seu propósito." },
        { titulo: "Quem parou para ver", texto: "Lucas 10:25-37", verdade: "Compaixão vê, aproxima-se com sabedoria e oferece ajuda concreta." },
        { titulo: "Jesus toca o intocável", texto: "Marcos 1:40-45", verdade: "Jesus trata com dignidade quem era afastado e demonstra autoridade para purificar." },
        { titulo: "Ninguém esquecido", texto: "Atos 6:1-7", verdade: "A igreja enfrenta desigualdades com escuta, estrutura e pessoas cheias do Espírito e sabedoria." },
      ],
    },
    en: {
      titulo: "Look Again",
      promessa: "5 biblical sessions to correct superficial vision, recognize dignity, cross prejudice, and organize responsible community care.",
      pra_quem: "Five gatherings with close reading, fictional case studies, and simple supervised acts of care.",
      resultado: "Students will notice how labels distort vision, know when to involve adults, and participate in a church care plan.",
      uso: "Do not ask students to disclose poverty, illness, discrimination, or family conflict. Service must be supervised, consent-based, and free from image exposure.",
      keywords: ["juniors", "compassion", "dignity", "prejudice"],
      unidades: [
        { titulo: "The God Who Sees Me", texto: "Genesis 16:1-16", verdade: "God sees wounded and forgotten people without approving the injustice they suffered." },
        { titulo: "Beyond Appearance", texto: "1 Samuel 16:1-13", verdade: "God corrects superficial standards and looks at the heart for his purpose." },
        { titulo: "The One Who Stopped to See", texto: "Luke 10:25-37", verdade: "Compassion sees, approaches wisely, and offers concrete help." },
        { titulo: "Jesus Touches the Untouchable", texto: "Mark 1:40-45", verdade: "Jesus treats the excluded with dignity and demonstrates authority to cleanse." },
        { titulo: "No One Overlooked", texto: "Acts 6:1-7", verdade: "The church faces inequality with listening, structure, and people full of the Spirit and wisdom." },
      ],
    },
    es: {
      titulo: "Mira de Nuevo",
      promessa: "5 encuentros bíblicos para corregir miradas superficiales, reconocer dignidad, atravesar prejuicios y organizar cuidado comunitario responsable.",
      pra_quem: "Cinco encuentros con observación de textos, casos ficticios y acciones sencillas de cuidado supervisado.",
      resultado: "Los alumnos reconocerán cómo las etiquetas distorsionan la mirada, sabrán cuándo llamar a adultos y participarán en un plan de cuidado de la iglesia.",
      uso: "No pida que los alumnos revelen pobreza, enfermedad, discriminación o conflictos familiares. El servicio debe ser supervisado, consentido y sin exposición de imagen.",
      keywords: ["juniors", "compasión", "dignidad", "prejuicio"],
      unidades: [
        { titulo: "El Dios que Me Ve", texto: "Génesis 16:1-16", verdade: "Dios ve a personas heridas y olvidadas sin aprobar la injusticia que sufrieron." },
        { titulo: "Más Allá de la Apariencia", texto: "1 Samuel 16:1-13", verdade: "Dios corrige criterios superficiales y mira el corazón para su propósito." },
        { titulo: "Quien se Detuvo a Ver", texto: "Lucas 10:25-37", verdade: "La compasión ve, se acerca con sabiduría y ofrece ayuda concreta." },
        { titulo: "Jesús Toca al Intocable", texto: "Marcos 1:40-45", verdade: "Jesús trata con dignidad a quien era apartado y demuestra autoridad para limpiar." },
        { titulo: "Nadie Olvidado", texto: "Hechos 6:1-7", verdade: "La iglesia enfrenta desigualdades con escucha, estructura y personas llenas del Espíritu y sabiduría." },
      ],
    },
  },
  {
    slug: "quando-tudo-grita", code: "023", estante: "adolescentes", etiqueta: "Adolescentes", preco: "R$ 47", pages: 5,
    pt: {
      titulo: "Quando Tudo Grita",
      promessa: "6 encontros bíblicos para ensinar adolescentes a buscar refúgio em Deus, interpretar pensamentos pela verdade, orar, receber ajuda da comunidade e descansar em Cristo.",
      pra_quem: "Seis mensagens para cultos, grupos ou retiros, com respostas privadas, pequenos grupos e encaminhamento responsável quando necessário.",
      resultado: "Os adolescentes reconhecerão que paz bíblica não é negação, praticarão ritmos de oração e verdade e saberão procurar adultos seguros e ajuda qualificada.",
      uso: "A série não diagnostica, não promete cura imediata e não substitui acompanhamento profissional. O líder não pede exposição pública de sofrimento e segue o protocolo de proteção da igreja diante de risco ou incapacidade de funcionar.",
      keywords: ["adolescentes", "ansiedade", "paz", "descanso em cristo"],
      unidades: [
        { titulo: "Ainda que a terra mude", texto: "Salmo 46", verdade: "Deus é refúgio presente quando o mundo parece instável." },
        { titulo: "Quem está no barco?", texto: "Marcos 4:35-41", verdade: "A presença e a autoridade de Jesus são maiores que a tempestade e que nossa percepção de abandono." },
        { titulo: "Fale com a sua alma", texto: "Salmos 42 e 43", verdade: "Podemos levar emoções a Deus e responder a elas com verdade e esperança." },
        { titulo: "Perto, em oração", texto: "Filipenses 4:4-9", verdade: "A proximidade do Senhor nos convida a orar, agradecer e treinar a atenção na verdade." },
        { titulo: "Não atravesse sozinho", texto: "Hebreus 10:19-25", verdade: "Jesus nos dá acesso a Deus e nos coloca em uma comunidade que encoraja e sustenta." },
        { titulo: "Aprendam de mim", texto: "Mateus 11:25-30", verdade: "Jesus recebe os cansados e ensina um caminho de descanso sob seu governo bondoso." },
      ],
    },
    en: {
      titulo: "When Everything Shouts",
      promessa: "6 biblical sessions to teach teenagers to seek refuge in God, interpret thoughts through truth, pray, receive help from community, and rest in Christ.",
      pra_quem: "Six messages for services, groups, or retreats, with private responses, small groups, and responsible referral when needed.",
      resultado: "Teenagers will recognize that biblical peace is not denial, practice rhythms of prayer and truth, and know how to seek safe adults and qualified help.",
      uso: "The series does not diagnose, promise immediate healing, or replace professional care. Leaders do not request public disclosure of distress and follow the church's safeguarding protocol when risk or inability to function is present.",
      keywords: ["teenagers", "anxiety", "peace", "rest in christ"],
      unidades: [
        { titulo: "Even If the Earth Gives Way", texto: "Psalm 46", verdade: "God is a present refuge when the world feels unstable." },
        { titulo: "Who Is in the Boat?", texto: "Mark 4:35-41", verdade: "Jesus' presence and authority are greater than the storm and our sense of abandonment." },
        { titulo: "Speak to Your Soul", texto: "Psalms 42 and 43", verdade: "We can bring emotions to God and answer them with truth and hope." },
        { titulo: "Near, in Prayer", texto: "Philippians 4:4-9", verdade: "The Lord's nearness invites us to pray, give thanks, and train attention on truth." },
        { titulo: "Do Not Walk Through It Alone", texto: "Hebrews 10:19-25", verdade: "Jesus gives us access to God and places us in a community that encourages and sustains." },
        { titulo: "Learn from Me", texto: "Matthew 11:25-30", verdade: "Jesus welcomes the weary and teaches a way of rest under his gentle rule." },
      ],
    },
    es: {
      titulo: "Cuando Todo Grita",
      promessa: "6 encuentros bíblicos para enseñar a los adolescentes a buscar refugio en Dios, interpretar pensamientos por la verdad, orar, recibir ayuda de la comunidad y descansar en Cristo.",
      pra_quem: "Seis mensajes para cultos, grupos o retiros, con respuestas privadas, grupos pequeños y derivación responsable cuando sea necesario.",
      resultado: "Los adolescentes reconocerán que la paz bíblica no es negación, practicarán ritmos de oración y verdad y sabrán buscar adultos seguros y ayuda calificada.",
      uso: "La serie no diagnostica, no promete sanidad inmediata ni sustituye atención profesional. El líder no pide exposición pública del sufrimiento y sigue el protocolo de protección de la iglesia ante riesgo o incapacidad de funcionar.",
      keywords: ["adolescentes", "ansiedad", "paz", "descanso en cristo"],
      unidades: [
        { titulo: "Aunque la Tierra Cambie", texto: "Salmo 46", verdade: "Dios es refugio presente cuando el mundo parece inestable." },
        { titulo: "¿Quién Está en la Barca?", texto: "Marcos 4:35-41", verdade: "La presencia y autoridad de Jesús son mayores que la tormenta y nuestra sensación de abandono." },
        { titulo: "Habla con tu Alma", texto: "Salmos 42 y 43", verdade: "Podemos llevar nuestras emociones a Dios y responderles con verdad y esperanza." },
        { titulo: "Cerca, en Oración", texto: "Filipenses 4:4-9", verdade: "La cercanía del Señor nos invita a orar, agradecer y entrenar la atención en la verdad." },
        { titulo: "No lo Atravieses Solo", texto: "Hebreos 10:19-25", verdade: "Jesús nos da acceso a Dios y nos coloca en una comunidad que anima y sostiene." },
        { titulo: "Aprendan de Mí", texto: "Mateo 11:25-30", verdade: "Jesús recibe a los cansados y enseña un camino de descanso bajo su gobierno bondadoso." },
      ],
    },
  },
  {
    slug: "antes-de-chamar-de-amor", code: "024", estante: "adolescentes", etiqueta: "Adolescentes", preco: "R$ 49", pages: 5,
    pt: {
      titulo: "Antes de Chamar de Amor",
      promessa: "7 encontros bíblicos para definir o amor a partir do caráter e da obra de Deus, submeter sentimentos à sabedoria e praticar relações que respeitam dignidade, santidade e comunidade.",
      pra_quem: "Sete mensagens para adolescentes, preferencialmente com líderes treinados, responsáveis informados e espaço para perguntas anônimas.",
      resultado: "Os adolescentes identificarão sinais de honra e pressão, compreenderão que limites podem ser amorosos e saberão buscar ajuda sem vergonha.",
      uso: "A série não faz aconselhamento individual público, não pede relatos íntimos e não oferece uma fórmula de namoro. Qualquer coerção, ameaça, diferença imprópria de poder ou situação insegura deve ser encaminhada conforme o protocolo de proteção.",
      keywords: ["adolescentes", "amor", "limites", "relacionamentos"],
      unidades: [
        { titulo: "O amor tem origem", texto: "1 João 4:7-12", verdade: "Conhecemos o amor olhando para Deus, que enviou seu Filho para nos dar vida." },
        { titulo: "Sentimento não é senhor", texto: "Provérbios 4:20-27", verdade: "Sentimentos são reais, mas precisam ser guardados e orientados pela sabedoria de Deus." },
        { titulo: "Honra também diz não", texto: "1 Tessalonicenses 4:1-8", verdade: "Santidade trata o próprio corpo e o corpo do outro com honra, nunca como objeto." },
        { titulo: "Amizade antes da pressa", texto: "Provérbios 17:17; 27:5-10", verdade: "Amizade fiel oferece presença, verdade e conselho, não isolamento e dependência." },
        { titulo: "O amor não pressiona", texto: "1 Coríntios 13:1-7", verdade: "O amor busca o bem do outro com paciência, verdade e ausência de domínio." },
        { titulo: "Limites protegem pessoas", texto: "2 Timóteo 2:22; 1 Timóteo 5:1-2", verdade: "Fugir do que corrompe e buscar o que é bom em comunidade são formas de sabedoria." },
        { titulo: "Andem em amor", texto: "Efésios 5:1-2", verdade: "O amor de Cristo se torna o caminho diário de quem foi recebido por Deus como filho amado." },
      ],
    },
    en: {
      titulo: "Before You Call It Love",
      promessa: "7 biblical sessions to define love from God's character and work, submit feelings to wisdom, and practice relationships that honor dignity, holiness, and community.",
      pra_quem: "Seven messages for teenagers, preferably with trained leaders, informed caregivers, and space for anonymous questions.",
      resultado: "Teenagers will identify signs of honor and pressure, understand that boundaries can be loving, and know how to seek help without shame.",
      uso: "The series does not provide public individual counseling, request intimate disclosures, or offer a dating formula. Coercion, threats, improper power differences, or unsafe situations must be referred under safeguarding procedures.",
      keywords: ["teenagers", "love", "boundaries", "relationships"],
      unidades: [
        { titulo: "Love Has a Source", texto: "1 John 4:7-12", verdade: "We know love by looking to God, who sent his Son to give us life." },
        { titulo: "Feelings Are Not Lord", texto: "Proverbs 4:20-27", verdade: "Feelings are real, but they need to be guarded and guided by God's wisdom." },
        { titulo: "Honor Can Also Say No", texto: "1 Thessalonians 4:1-8", verdade: "Holiness treats one's own body and another person's body with honor, never as an object." },
        { titulo: "Friendship Before Hurry", texto: "Proverbs 17:17; 27:5-10", verdade: "Faithful friendship offers presence, truth, and counsel, not isolation and dependence." },
        { titulo: "Love Does Not Pressure", texto: "1 Corinthians 13:1-7", verdade: "Love seeks another person's good with patience, truth, and freedom from control." },
        { titulo: "Boundaries Protect People", texto: "2 Timothy 2:22; 1 Timothy 5:1-2", verdade: "Fleeing what corrupts and pursuing what is good in community are forms of wisdom." },
        { titulo: "Walk in Love", texto: "Ephesians 5:1-2", verdade: "Christ's love becomes the daily way of those received by God as beloved children." },
      ],
    },
    es: {
      titulo: "Antes de Llamarlo Amor",
      promessa: "7 encuentros bíblicos para definir el amor desde el carácter y la obra de Dios, someter sentimientos a la sabiduría y practicar relaciones que respeten dignidad, santidad y comunidad.",
      pra_quem: "Siete mensajes para adolescentes, preferentemente con líderes capacitados, responsables informados y espacio para preguntas anónimas.",
      resultado: "Los adolescentes identificarán señales de honra y presión, entenderán que los límites pueden ser amorosos y sabrán buscar ayuda sin vergüenza.",
      uso: "La serie no ofrece consejería individual pública, no pide relatos íntimos ni da una fórmula de noviazgo. Coacción, amenazas, diferencias inapropiadas de poder o situaciones inseguras deben derivarse según el protocolo de protección.",
      keywords: ["adolescentes", "amor", "límites", "relaciones"],
      unidades: [
        { titulo: "El Amor Tiene Origen", texto: "1 Juan 4:7-12", verdade: "Conocemos el amor mirando a Dios, que envió a su Hijo para darnos vida." },
        { titulo: "El Sentimiento No es Señor", texto: "Proverbios 4:20-27", verdade: "Los sentimientos son reales, pero necesitan ser guardados y guiados por la sabiduría de Dios." },
        { titulo: "La Honra También Dice No", texto: "1 Tesalonicenses 4:1-8", verdade: "La santidad trata el propio cuerpo y el cuerpo del otro con honra, nunca como objeto." },
        { titulo: "Amistad Antes de la Prisa", texto: "Proverbios 17:17; 27:5-10", verdade: "La amistad fiel ofrece presencia, verdad y consejo, no aislamiento y dependencia." },
        { titulo: "El Amor No Presiona", texto: "1 Corintios 13:1-7", verdade: "El amor busca el bien del otro con paciencia, verdad y ausencia de dominio." },
        { titulo: "Los Límites Protegen a las Personas", texto: "2 Timoteo 2:22; 1 Timoteo 5:1-2", verdade: "Huir de lo que corrompe y buscar lo bueno en comunidad son formas de sabiduría." },
        { titulo: "Anden en Amor", texto: "Efesios 5:1-2", verdade: "El amor de Cristo se vuelve el camino diario de quienes fueron recibidos por Dios como hijos amados." },
      ],
    },
  },
  {
    slug: "depois-do-domingo", code: "025", estante: "jovens", etiqueta: "Jovens", preco: "R$ 47", pages: 5,
    pt: {
      titulo: "Depois do Domingo",
      promessa: "6 encontros bíblicos para mostrar que o senhorio de Jesus alcança corpo, mente, estudos, trabalho, dinheiro, descanso e comunidade.",
      pra_quem: "Seis mensagens para cultos de jovens, pequenos grupos ou encontros de formação, cada uma com uma prática semanal mensurável.",
      resultado: "Os jovens construirão uma regra simples de vida, identificarão incoerências sem culpa manipulativa e praticarão decisões comuns como resposta ao evangelho.",
      uso: "A série não transforma produtividade em santidade, não culpa quem enfrenta desemprego ou sobrecarga e não promete prosperidade financeira. Aplicações devem respeitar estudo, cuidado familiar, saúde e condições reais.",
      keywords: ["jovens", "vida cotidiana", "senhorio de jesus", "trabalho"],
      unidades: [
        { titulo: "Segunda também é culto", texto: "Romanos 12:1-2", verdade: "O evangelho transforma a vida inteira em resposta consciente à misericórdia de Deus." },
        { titulo: "Aprender também é serviço", texto: "Daniel 1:17-21", verdade: "Conhecimento e habilidade são dons a serem desenvolvidos com fidelidade e usados sem perder identidade." },
        { titulo: "Trabalhem com tranquilidade", texto: "1 Tessalonicenses 4:9-12", verdade: "O amor cristão inclui trabalho responsável, vida coerente e respeito aos limites de cada pessoa." },
        { titulo: "Onde está seu tesouro?", texto: "Mateus 6:19-24", verdade: "Dinheiro é um servo limitado e um senhor destrutivo; o coração precisa pertencer a Deus." },
        { titulo: "Descansar sem desaparecer", texto: "Marcos 6:30-44", verdade: "Jesus cuida do cansaço dos discípulos e da necessidade da multidão sem transformar ninguém em máquina." },
        { titulo: "Uma vida com ritmo", texto: "Atos 2:42-47", verdade: "O Espírito forma uma comunidade por meio de ritmos simples e perseverantes." },
      ],
    },
    en: {
      titulo: "After Sunday",
      promessa: "6 biblical sessions to show that Jesus' lordship reaches body, mind, study, work, money, rest, and community.",
      pra_quem: "Six messages for youth services, small groups, or formation gatherings, each with a measurable weekly practice.",
      resultado: "Young people will build a simple rule of life, identify inconsistencies without manipulative guilt, and practice ordinary choices as a response to the gospel.",
      uso: "The series does not turn productivity into holiness, blame those facing unemployment or overload, or promise financial prosperity. Applications must respect study, family care, health, and real conditions.",
      keywords: ["young adults", "daily life", "lordship of jesus", "work"],
      unidades: [
        { titulo: "Monday Is Worship Too", texto: "Romans 12:1-2", verdade: "The gospel turns the whole of life into a conscious response to God's mercy." },
        { titulo: "Learning Is Also Service", texto: "Daniel 1:17-21", verdade: "Knowledge and skill are gifts to develop faithfully and use without losing identity." },
        { titulo: "Work Quietly", texto: "1 Thessalonians 4:9-12", verdade: "Christian love includes responsible work, a coherent life, and respect for each person's responsibilities." },
        { titulo: "Where Is Your Treasure?", texto: "Matthew 6:19-24", verdade: "Money is a limited servant and a destructive master; the heart must belong to God." },
        { titulo: "Rest Without Disappearing", texto: "Mark 6:30-44", verdade: "Jesus cares for the disciples' weariness and the crowd's need without turning anyone into a machine." },
        { titulo: "A Life with Rhythm", texto: "Acts 2:42-47", verdade: "The Spirit forms a community through simple, persevering rhythms." },
      ],
    },
    es: {
      titulo: "Después del Domingo",
      promessa: "6 encuentros bíblicos para mostrar que el señorío de Jesús alcanza cuerpo, mente, estudios, trabajo, dinero, descanso y comunidad.",
      pra_quem: "Seis mensajes para cultos de jóvenes, grupos pequeños o encuentros de formación, cada uno con una práctica semanal medible.",
      resultado: "Los jóvenes construirán una regla sencilla de vida, identificarán incoherencias sin culpa manipuladora y practicarán decisiones comunes como respuesta al evangelio.",
      uso: "La serie no convierte productividad en santidad, no culpa a quien enfrenta desempleo o sobrecarga ni promete prosperidad financiera. Las aplicaciones deben respetar estudio, cuidado familiar, salud y condiciones reales.",
      keywords: ["jóvenes", "vida cotidiana", "señorío de jesús", "trabajo"],
      unidades: [
        { titulo: "El Lunes También es Culto", texto: "Romanos 12:1-2", verdade: "El evangelio convierte toda la vida en respuesta consciente a la misericordia de Dios." },
        { titulo: "Aprender También es Servicio", texto: "Daniel 1:17-21", verdade: "Conocimiento y habilidad son dones que se desarrollan con fidelidad y se usan sin perder identidad." },
        { titulo: "Trabajen con Tranquilidad", texto: "1 Tesalonicenses 4:9-12", verdade: "El amor cristiano incluye trabajo responsable, vida coherente y respeto a las responsabilidades de cada persona." },
        { titulo: "¿Dónde Está tu Tesoro?", texto: "Mateo 6:19-24", verdade: "El dinero es un siervo limitado y un señor destructivo; el corazón necesita pertenecer a Dios." },
        { titulo: "Descansar Sin Desaparecer", texto: "Marcos 6:30-44", verdade: "Jesús cuida el cansancio de los discípulos y la necesidad de la multitud sin convertir a nadie en máquina." },
        { titulo: "Una Vida con Ritmo", texto: "Hechos 2:42-47", verdade: "El Espíritu forma una comunidad mediante ritmos sencillos y perseverantes." },
      ],
    },
  },
  {
    slug: "e-agora", code: "026", estante: "jovens", etiqueta: "Jovens", preco: "R$ 49", pages: 5,
    pt: {
      titulo: "E Agora?",
      promessa: "7 encontros bíblicos para formar decisões a partir da misericórdia, sabedoria, Escritura, conselho, providência, espera e submissão a Deus.",
      pra_quem: "Sete mensagens para cultos, grupos e processos de transição, com ferramentas de discernimento que não prometem certeza absoluta.",
      resultado: "Os jovens saberão distinguir mandamentos, princípios e liberdade, buscarão conselho e tomarão decisões responsáveis sem paralisia espiritual.",
      uso: "A série não trata desejo pessoal como voz de Deus, não transforma portas abertas em aprovação moral e não responsabiliza a pessoa por prever todo resultado. Decisões complexas podem exigir orientação pastoral, profissional e familiar.",
      keywords: ["jovens", "decisões", "discernimento", "vontade de deus"],
      unidades: [
        { titulo: "Não começa com um sinal", texto: "Romanos 12:1-2", verdade: "Discernir a vontade de Deus começa por misericórdia recebida, vida entregue e mente renovada." },
        { titulo: "Peça sabedoria", texto: "Tiago 1:2-8", verdade: "Deus dá sabedoria generosamente para atravessar provações com fidelidade." },
        { titulo: "Luz para o passo", texto: "Salmo 119:97-105", verdade: "A Palavra ilumina o caminho suficiente para a obediência de hoje." },
        { titulo: "Decisão não é projeto solo", texto: "Provérbios 15:22; 20:18", verdade: "Conselho sábio expõe pontos cegos e torna planos mais responsáveis." },
        { titulo: "Quando a porta fecha", texto: "Atos 16:6-15", verdade: "A providência pode redirecionar planos, e a igreja discerne enquanto continua obedecendo." },
        { titulo: "Espere com coragem", texto: "Salmo 27", verdade: "Esperar no Senhor é permanecer em busca, oração e coragem quando a resposta ainda não chegou." },
        { titulo: "Seja feita a tua vontade", texto: "Lucas 22:39-46", verdade: "Jesus mostra que submissão ao Pai pode incluir pedido honesto, obediência e perseverança em oração." },
      ],
    },
    en: {
      titulo: "What Now?",
      promessa: "7 biblical sessions to form decisions through mercy, wisdom, Scripture, counsel, providence, waiting, and submission to God.",
      pra_quem: "Seven messages for services, groups, and transition seasons, with discernment tools that do not promise absolute certainty.",
      resultado: "Young people will distinguish commands, principles, and freedom, seek counsel, and make responsible decisions without spiritual paralysis.",
      uso: "The series does not treat personal desire as God's voice, turn open doors into moral approval, or hold people responsible for predicting every outcome. Complex decisions may require pastoral, professional, and family guidance.",
      keywords: ["young adults", "decisions", "discernment", "god's will"],
      unidades: [
        { titulo: "It Does Not Begin with a Sign", texto: "Romans 12:1-2", verdade: "Discerning God's will begins with received mercy, a yielded life, and a renewed mind." },
        { titulo: "Ask for Wisdom", texto: "James 1:2-8", verdade: "God gives wisdom generously so we can pass through trials faithfully." },
        { titulo: "Light for the Step", texto: "Psalm 119:97-105", verdade: "The Word gives enough light for today's obedience." },
        { titulo: "Decision Is Not a Solo Project", texto: "Proverbs 15:22; 20:18", verdade: "Wise counsel exposes blind spots and makes plans more responsible." },
        { titulo: "When the Door Closes", texto: "Acts 16:6-15", verdade: "Providence can redirect plans, and the church discerns while continuing in obedience." },
        { titulo: "Wait with Courage", texto: "Psalm 27", verdade: "Waiting for the Lord means remaining in seeking, prayer, and courage when the answer has not yet come." },
        { titulo: "Your Will Be Done", texto: "Luke 22:39-46", verdade: "Jesus shows that submission to the Father can include honest request, obedience, and perseverance in prayer." },
      ],
    },
    es: {
      titulo: "¿Y Ahora?",
      promessa: "7 encuentros bíblicos para formar decisiones desde misericordia, sabiduría, Escritura, consejo, providencia, espera y sumisión a Dios.",
      pra_quem: "Siete mensajes para cultos, grupos y tiempos de transición, con herramientas de discernimiento que no prometen certeza absoluta.",
      resultado: "Los jóvenes distinguirán mandamientos, principios y libertad, buscarán consejo y tomarán decisiones responsables sin parálisis espiritual.",
      uso: "La serie no trata el deseo personal como voz de Dios, no convierte puertas abiertas en aprobación moral ni responsabiliza a la persona por prever todo resultado. Decisiones complejas pueden requerir orientación pastoral, profesional y familiar.",
      keywords: ["jóvenes", "decisiones", "discernimiento", "voluntad de dios"],
      unidades: [
        { titulo: "No Comienza con una Señal", texto: "Romanos 12:1-2", verdade: "Discernir la voluntad de Dios comienza con misericordia recibida, vida entregada y mente renovada." },
        { titulo: "Pide Sabiduría", texto: "Santiago 1:2-8", verdade: "Dios da sabiduría generosamente para atravesar pruebas con fidelidad." },
        { titulo: "Luz para el Paso", texto: "Salmo 119:97-105", verdade: "La Palabra ilumina el camino suficiente para la obediencia de hoy." },
        { titulo: "Decidir No es un Proyecto Solitario", texto: "Proverbios 15:22; 20:18", verdade: "El consejo sabio expone puntos ciegos y vuelve los planes más responsables." },
        { titulo: "Cuando la Puerta se Cierra", texto: "Hechos 16:6-15", verdade: "La providencia puede redirigir planes, y la iglesia discierne mientras sigue obedeciendo." },
        { titulo: "Espera con Valentía", texto: "Salmo 27", verdade: "Esperar en el Señor es permanecer en búsqueda, oración y valentía cuando la respuesta aún no llega." },
        { titulo: "Hágase tu Voluntad", texto: "Lucas 22:39-46", verdade: "Jesús muestra que someterse al Padre puede incluir petición honesta, obediencia y perseverancia en oración." },
      ],
    },
  },
  {
    slug: "lugar-a-mesa", code: "027", estante: "igreja-toda", etiqueta: "Igreja toda", preco: "R$ 67", pages: 6,
    pt: {
      titulo: "Lugar à Mesa",
      promessa: "6 encontros bíblicos para conduzir a igreja da mesa da libertação para a mesa de Jesus e para uma comunidade que recebe, reparte e testemunha.",
      pra_quem: "Seis mensagens para celebrações gerais, pequenos grupos ou campanhas de comunhão, com práticas simples de hospitalidade.",
      resultado: "A igreja compreenderá a mesa como fruto do evangelho, examinará barreiras de pertencimento e organizará práticas reais de acolhimento e partilha.",
      uso: "Hospitalidade não exige que famílias exponham a casa, ultrapassem limites financeiros ou recebam pessoas sem cuidado de segurança. A Ceia do Senhor deve seguir a doutrina e a liderança da igreja local.",
      keywords: ["igreja toda", "comunhão", "hospitalidade", "graça"],
      unidades: [
        { titulo: "A mesa da libertação", texto: "Êxodo 12:1-28", verdade: "Deus dá ao seu povo uma mesa que lembra libertação, aliança e dependência." },
        { titulo: "Jesus escolhe a mesa errada", texto: "Lucas 5:27-32", verdade: "Jesus chama pecadores ao arrependimento e se aproxima sem participar de sua injustiça." },
        { titulo: "Quando o pouco é repartido", texto: "Marcos 6:30-44", verdade: "Jesus recebe recursos limitados, organiza seu povo e alimenta a multidão com compaixão." },
        { titulo: "Esta mesa conta uma história", texto: "Lucas 22:14-23", verdade: "Na Ceia, Jesus interpreta sua entrega e dá à igreja uma memória centrada na nova aliança." },
        { titulo: "Reconhecido ao partir do pão", texto: "Lucas 24:13-35", verdade: "O Cristo ressuscitado caminha com discípulos confusos, abre as Escrituras e se dá a conhecer." },
        { titulo: "Mesa que vira testemunho", texto: "Atos 2:42-47", verdade: "O evangelho forma uma comunidade perseverante cuja mesa, oração e generosidade tornam Cristo visível." },
      ],
    },
    en: {
      titulo: "A Place at the Table",
      promessa: "6 biblical sessions to lead the church from the table of deliverance to Jesus' table and toward a community that welcomes, shares, and witnesses.",
      pra_quem: "Six messages for whole-church services, small groups, or fellowship campaigns, with simple hospitality practices.",
      resultado: "The church will understand the table as fruit of the gospel, examine barriers to belonging, and organize real practices of welcome and sharing.",
      uso: "Hospitality does not require families to expose their homes, exceed financial limits, or receive people without safety care. The Lord's Supper must follow the doctrine and leadership of the local church.",
      keywords: ["whole church", "fellowship", "hospitality", "grace"],
      unidades: [
        { titulo: "The Table of Deliverance", texto: "Exodus 12:1-28", verdade: "God gives his people a table that remembers deliverance, covenant, and dependence." },
        { titulo: "Jesus Chooses the Wrong Table", texto: "Luke 5:27-32", verdade: "Jesus calls sinners to repentance and draws near without participating in their injustice." },
        { titulo: "When a Little Is Shared", texto: "Mark 6:30-44", verdade: "Jesus receives limited resources, organizes his people, and feeds the crowd with compassion." },
        { titulo: "This Table Tells a Story", texto: "Luke 22:14-23", verdade: "At the Supper, Jesus interprets his self-giving and gives the church a memory centered on the new covenant." },
        { titulo: "Known in the Breaking of Bread", texto: "Luke 24:13-35", verdade: "The risen Christ walks with confused disciples, opens Scripture, and makes himself known." },
        { titulo: "A Table That Becomes Witness", texto: "Acts 2:42-47", verdade: "The gospel forms a persevering community whose table, prayer, and generosity make Christ visible." },
      ],
    },
    es: {
      titulo: "Lugar en la Mesa",
      promessa: "6 encuentros bíblicos para conducir a la iglesia desde la mesa de liberación hasta la mesa de Jesús y hacia una comunidad que recibe, comparte y da testimonio.",
      pra_quem: "Seis mensajes para celebraciones generales, grupos pequeños o campañas de comunión, con prácticas sencillas de hospitalidad.",
      resultado: "La iglesia comprenderá la mesa como fruto del evangelio, examinará barreras de pertenencia y organizará prácticas reales de bienvenida y compartir.",
      uso: "La hospitalidad no exige que familias expongan su hogar, superen límites financieros ni reciban personas sin cuidado de seguridad. La Cena del Señor debe seguir la doctrina y liderazgo de la iglesia local.",
      keywords: ["iglesia toda", "comunión", "hospitalidad", "gracia"],
      unidades: [
        { titulo: "La Mesa de la Liberación", texto: "Éxodo 12:1-28", verdade: "Dios da a su pueblo una mesa que recuerda liberación, pacto y dependencia." },
        { titulo: "Jesús Elige la Mesa Equivocada", texto: "Lucas 5:27-32", verdade: "Jesús llama a pecadores al arrepentimiento y se acerca sin participar de su injusticia." },
        { titulo: "Cuando lo Poco se Comparte", texto: "Marcos 6:30-44", verdade: "Jesús recibe recursos limitados, organiza a su pueblo y alimenta a la multitud con compasión." },
        { titulo: "Esta Mesa Cuenta una Historia", texto: "Lucas 22:14-23", verdade: "En la Cena, Jesús interpreta su entrega y da a la iglesia una memoria centrada en el nuevo pacto." },
        { titulo: "Reconocido al Partir el Pan", texto: "Lucas 24:13-35", verdade: "El Cristo resucitado camina con discípulos confundidos, abre las Escrituras y se da a conocer." },
        { titulo: "Una Mesa que se Vuelve Testimonio", texto: "Hechos 2:42-47", verdade: "El evangelio forma una comunidad perseverante cuya mesa, oración y generosidad hacen visible a Cristo." },
      ],
    },
  },
  {
    slug: "ate-os-confins", code: "028", estante: "igreja-toda", etiqueta: "Igreja toda", preco: "R$ 69", pages: 6,
    pt: {
      titulo: "Até os Confins",
      promessa: "7 encontros bíblicos para percorrer a expansão de Atos e conduzir a igreja a testemunho dependente do Espírito, bíblico, intercultural e perseverante.",
      pra_quem: "Sete mensagens para campanha missionária, celebrações gerais ou formação de uma igreja local enviada.",
      resultado: "A igreja identificará seu campo próximo e distante, orará, enviará, sustentará e testemunhará com clareza sobre Jesus.",
      uso: "Missão não é colonialismo, turismo religioso ou pressão emocional. A igreja honra culturas, protege pessoas vulneráveis, presta contas, trabalha com lideranças locais e não promete resultados que pertencem a Deus.",
      keywords: ["igreja toda", "missões", "atos", "envio"],
      unidades: [
        { titulo: "Poder para testemunhar", texto: "Atos 1:1-11", verdade: "O Cristo ressurreto envia sua igreja e promete o poder do Espírito para testemunhar." },
        { titulo: "Uma mensagem para todos", texto: "Atos 2:1-41", verdade: "O Espírito glorifica Jesus e faz o evangelho ser ouvido por povos diferentes." },
        { titulo: "O evangelho atravessa a fronteira", texto: "Atos 8:4-40", verdade: "O Espírito conduz o evangelho a pessoas e lugares que os discípulos poderiam ignorar." },
        { titulo: "O perseguidor é alcançado", texto: "Atos 9:1-22", verdade: "A graça de Jesus alcança inimigos, transforma direção e os integra à comunidade." },
        { titulo: "Deus não faz acepção", texto: "Atos 10:1-48", verdade: "Em Cristo, Deus atravessa barreiras étnicas e recebe pessoas de todas as nações pela fé." },
        { titulo: "Separados e enviados", texto: "Atos 13:1-4; 14:21-28", verdade: "O Espírito envia por meio de uma igreja que ora, reconhece chamados, sustenta e recebe prestação de contas." },
        { titulo: "Sem impedimento", texto: "Atos 28:16-31", verdade: "Mesmo em limitações, o evangelho do Reino continua avançando com clareza e coragem." },
      ],
    },
    en: {
      titulo: "To the Ends of the Earth",
      promessa: "7 biblical sessions to trace the expansion of Acts and lead the church toward Spirit-dependent, biblical, intercultural, and persevering witness.",
      pra_quem: "Seven messages for a missions emphasis, whole-church services, or forming a sent local church.",
      resultado: "The church will identify its near and far mission fields, pray, send, support, and witness clearly about Jesus.",
      uso: "Mission is not colonialism, religious tourism, or emotional pressure. The church honors cultures, safeguards vulnerable people, remains accountable, works with local leaders, and does not promise results that belong to God.",
      keywords: ["whole church", "missions", "acts", "sending"],
      unidades: [
        { titulo: "Power to Witness", texto: "Acts 1:1-11", verdade: "The risen Christ sends his church and promises the Spirit's power for witness." },
        { titulo: "One Message for All", texto: "Acts 2:1-41", verdade: "The Spirit glorifies Jesus and makes the gospel heard by different peoples." },
        { titulo: "The Gospel Crosses the Border", texto: "Acts 8:4-40", verdade: "The Spirit carries the gospel to people and places the disciples might overlook." },
        { titulo: "The Persecutor Is Reached", texto: "Acts 9:1-22", verdade: "Jesus' grace reaches enemies, changes direction, and integrates them into community." },
        { titulo: "God Shows No Partiality", texto: "Acts 10:1-48", verdade: "In Christ, God crosses ethnic barriers and receives people from every nation through faith." },
        { titulo: "Set Apart and Sent", texto: "Acts 13:1-4; 14:21-28", verdade: "The Spirit sends through a church that prays, recognizes callings, supports, and receives accountability." },
        { titulo: "Without Hindrance", texto: "Acts 28:16-31", verdade: "Even under limitations, the gospel of the kingdom continues advancing with clarity and courage." },
      ],
    },
    es: {
      titulo: "Hasta los Confines",
      promessa: "7 encuentros bíblicos para recorrer la expansión de Hechos y conducir a la iglesia hacia un testimonio dependiente del Espíritu, bíblico, intercultural y perseverante.",
      pra_quem: "Siete mensajes para campaña misionera, celebraciones generales o formación de una iglesia local enviada.",
      resultado: "La iglesia identificará su campo cercano y lejano, orará, enviará, sostendrá y dará testimonio claro sobre Jesús.",
      uso: "La misión no es colonialismo, turismo religioso ni presión emocional. La iglesia honra culturas, protege personas vulnerables, rinde cuentas, trabaja con líderes locales y no promete resultados que pertenecen a Dios.",
      keywords: ["iglesia toda", "misiones", "hechos", "envío"],
      unidades: [
        { titulo: "Poder para Testificar", texto: "Hechos 1:1-11", verdade: "El Cristo resucitado envía a su iglesia y promete el poder del Espíritu para testificar." },
        { titulo: "Un Mensaje para Todos", texto: "Hechos 2:1-41", verdade: "El Espíritu glorifica a Jesús y hace que el evangelio sea oído por pueblos diferentes." },
        { titulo: "El Evangelio Cruza la Frontera", texto: "Hechos 8:4-40", verdade: "El Espíritu lleva el evangelio a personas y lugares que los discípulos podrían ignorar." },
        { titulo: "El Perseguidor es Alcanzado", texto: "Hechos 9:1-22", verdade: "La gracia de Jesús alcanza enemigos, cambia dirección y los integra a la comunidad." },
        { titulo: "Dios No Hace Acepción", texto: "Hechos 10:1-48", verdade: "En Cristo, Dios cruza barreras étnicas y recibe personas de todas las naciones por la fe." },
        { titulo: "Apartados y Enviados", texto: "Hechos 13:1-4; 14:21-28", verdade: "El Espíritu envía por medio de una iglesia que ora, reconoce llamados, sostiene y recibe rendición de cuentas." },
        { titulo: "Sin Impedimento", texto: "Hechos 28:16-31", verdade: "Aun bajo limitaciones, el evangelio del Reino sigue avanzando con claridad y valentía." },
      ],
    },
  },
];

if (process.argv[2] !== "--export-only") {
  MATERIALS.forEach(build);
  console.log(`\nTotal: ${MATERIALS.length} materiais montados.`);
}

export { MATERIALS };
