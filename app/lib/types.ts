// ── FONTE ÚNICA DE VERDADE — tipos do banco Supabase ────────────────────────
// Qualquer componente que leia dados do Supabase importa daqui.
// Se mudar um campo no banco, muda aqui e o TS grita em todos os lugares certos.

export type DbEstante = {
  key: string
  label: string
  familia: string
  accent: string        // hex canônico da paleta
  faixa_etaria: string
  status: string        // 'visible' | 'hidden'
  ord: number
}

export type DbMaterial = {
  id: string
  familia: string       // 'ministrar' | 'liderar'
  estante: string       // key da estante
  model: string         // 'A' | 'B' | 'C' | 'D'
  etiqueta: string
  titulo: string
  code: string | null
  big: string | null
  big_label: string | null
  promessa: string
  mensagens: number | null
  paginas: number
  formatos: string[]
  preco: string         // 'R$ 47'
  hotmart_url: string
  hotmart_product_id?: string | null
  hotmart_offer_id?: string | null
  colecoes: string[]
  pra_quem: string
  conteudo: string[]    // benefícios / itens do que vem dentro
  contents?: DbMaterialContent[] | null
  como_usar: string
  faq: { q: string; a: string }[]
  mensagens_lista?: { nome: string; desc: string }[] | null
  depoimento?: { texto: string; autor: string } | null
  keywords?: string[] | null
  status: string        // 'Publicado' | 'Rascunho'
}

export type DbMaterialContent = {
  kind: "word" | "pdf" | "ppt"
  name: string
  note: string
  pages?: number | null
  messages?: number | null
  slides?: number | null
  delivery?: "word" | "pdf" | null
  file?: string | null
}

export type DbCurso = {
  slug: string
  num: string           // '01' … '06'
  nivel: string         // 'fundacao' | 'lideranca' | 'multiplicacao'
  title: string
  desc_text: string
  dur: string           // '4 semanas'
  promessa: string
  pra_quem: string
  ementa: { semana: number; titulo: string; desc: string }[]
  formato: string
  mentor: string
  mentor_bio: string
  depoimento: { texto: string; autor: string; cargo: string }
  turma: string         // 'Julho 2026'
  status: string        // 'Publicado' | 'Rascunho'
  keywords?: string[] | null
}

export type DbMentoria = {
  id: string
  title: string
  desc_text: string
  formato: string
  vagas: number
  mentor: string
  accent: string
  cadencia: string
  status: string
  waitlist: number
  keywords?: string[] | null
}

export type DbUserProfile = {
  user_id: string
  email: string
  full_name: string
  church_name: string
  phone: string
  state: string
  city: string
  church_address: string
  role: string
  ministry_area: string
  denomination: string
  created_at: string | null
  updated_at: string | null
}
