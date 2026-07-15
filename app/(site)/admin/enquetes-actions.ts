'use server'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '../../lib/supabase'
import { requireMaster } from './actions'

export type TipoPergunta = 'nota' | 'texto' | 'emoji' | 'multipla' | 'simnao'
export type Contexto = 'service' | 'site'
// Service: 'todos' | 'papel' | 'time' · Site: 'todos' | 'estante'
export type ModoSegmentacao = 'todos' | 'papel' | 'time' | 'estante'
// Service: 'livre' | 'periodica' | 'posescala' | 'campanha' · Site: 'livre' | 'periodica' | 'posdownload' | 'campanha'
export type ModoDisparo = 'livre' | 'periodica' | 'posescala' | 'posdownload' | 'campanha'

export type PerguntaRow = {
  id: string
  ordem: number
  tipo: TipoPergunta
  texto: string
  escala: 5 | 10 | null
  opcoes: string[] | null
}

export type EnqueteRow = {
  id: string
  nome: string
  contexto: Contexto
  status: 'ativa' | 'pausada' | 'encerrada'
  perguntas: PerguntaRow[]
  segmentacao: { modo: ModoSegmentacao; valores: string[] }
  disparo: { modo: ModoDisparo; ativoComoLivre: boolean; intervaloDias: number | null; horasDepois: number | null; emitidaEm: string | null }
  criadoEm: string
  totalRespostas: number
}

export type RespostaRow = {
  id: string
  papel: string
  data: string
  respostasPerguntas: { perguntaId: string; valor: string }[]
}

// `cex`/`service` são schemas separados por lei (HANDOFF Banco de Dados §0.2:
// "nunca uma tabela genérica" entre produtos) mas têm o MESMO shape de tabela
// (enquetes/perguntas/respostas/respostas_perguntas/enquete_visto), então o
// admin central só precisa trocar de schema pra falar com o produto certo.
const schemaFor = (contexto: Contexto) => (contexto === 'site' ? 'cex' : 'service')

type EnqueteDbRow = {
  id: string
  nome: string
  status: 'ativa' | 'pausada' | 'encerrada'
  segmentacao_modo: ModoSegmentacao
  segmentacao_valores: string[]
  disparo_modo: ModoDisparo
  ativo_como_livre: boolean
  intervalo_dias: number | null
  horas_depois: number | null
  emitida_em: string | null
  created_at: string
}
type PerguntaDbRow = {
  id: string
  enquete_id: string
  ordem: number
  tipo: TipoPergunta
  texto: string
  escala: 5 | 10 | null
  opcoes: string[] | null
}

export async function getEnquetes(contexto: Contexto): Promise<EnqueteRow[]> {
  await requireMaster()
  const db = supabaseAdmin().schema(schemaFor(contexto))
  const [{ data: enquetes, error: eErr }, { data: perguntas, error: pErr }, { data: respostas, error: rErr }] = await Promise.all([
    db.from('enquetes').select('*').order('created_at', { ascending: false }),
    db.from('perguntas').select('*').order('ordem', { ascending: true }),
    db.from('respostas').select('id, enquete_id'),
  ])
  if (eErr) { console.error('getEnquetes: enquetes falhou', eErr); return [] }
  if (pErr) console.error('getEnquetes: perguntas falhou', pErr)
  if (rErr) console.error('getEnquetes: respostas falhou', rErr)

  const perguntasPorEnquete = new Map<string, PerguntaDbRow[]>()
  for (const p of (perguntas ?? []) as PerguntaDbRow[]) {
    const arr = perguntasPorEnquete.get(p.enquete_id) ?? []
    arr.push(p)
    perguntasPorEnquete.set(p.enquete_id, arr)
  }
  const respostasPorEnquete = new Map<string, number>()
  for (const r of (respostas ?? []) as { enquete_id: string }[]) {
    respostasPorEnquete.set(r.enquete_id, (respostasPorEnquete.get(r.enquete_id) ?? 0) + 1)
  }

  return ((enquetes ?? []) as EnqueteDbRow[]).map((e) => ({
    id: e.id,
    nome: e.nome,
    contexto,
    status: e.status,
    perguntas: (perguntasPorEnquete.get(e.id) ?? []).map((p) => ({
      id: p.id, ordem: p.ordem, tipo: p.tipo, texto: p.texto, escala: p.escala, opcoes: p.opcoes,
    })),
    segmentacao: { modo: e.segmentacao_modo, valores: e.segmentacao_valores ?? [] },
    disparo: {
      modo: e.disparo_modo,
      ativoComoLivre: e.ativo_como_livre,
      intervaloDias: e.intervalo_dias,
      horasDepois: e.horas_depois,
      emitidaEm: e.emitida_em,
    },
    criadoEm: e.created_at,
    totalRespostas: respostasPorEnquete.get(e.id) ?? 0,
  }))
}

export async function saveEnquete(input: Omit<EnqueteRow, 'criadoEm' | 'totalRespostas'>): Promise<void> {
  await requireMaster()
  const schema = schemaFor(input.contexto)
  const db = supabaseAdmin().schema(schema)
  const isNew = !input.id || input.id.startsWith('novo-')

  // Só uma "livre" ativa por contexto (regra de negócio do HANDOFF §1) — o
  // admin já desliga as outras no client, mas reforçamos aqui pra não
  // depender só da UI.
  if (input.disparo.ativoComoLivre) {
    await db.from('enquetes').update({ ativo_como_livre: false }).neq('id', isNew ? '00000000-0000-0000-0000-000000000000' : input.id)
  }

  const payload = {
    nome: input.nome,
    status: input.status,
    segmentacao_modo: input.segmentacao.modo,
    segmentacao_valores: input.segmentacao.valores,
    disparo_modo: input.disparo.modo,
    ativo_como_livre: input.disparo.ativoComoLivre,
    intervalo_dias: input.disparo.intervaloDias,
    horas_depois: input.contexto === 'service' ? input.disparo.horasDepois : null,
  }

  let enqueteId = input.id
  if (isNew) {
    const { data, error } = await db.from('enquetes').insert(payload).select('id').single()
    if (error) throw error
    enqueteId = (data as { id: string }).id
  } else {
    const { error } = await db.from('enquetes').update(payload).eq('id', input.id)
    if (error) throw error
  }

  const { data: existentes } = await db.from('perguntas').select('id').eq('enquete_id', enqueteId)
  const idsAtuais = new Set(input.perguntas.filter((p) => !p.id.startsWith('nova-')).map((p) => p.id))
  const idsRemover = ((existentes ?? []) as { id: string }[]).map((p) => p.id).filter((id) => !idsAtuais.has(id))
  if (idsRemover.length) {
    const { error } = await db.from('perguntas').delete().in('id', idsRemover)
    if (error) throw error
  }
  for (const [ordem, p] of input.perguntas.entries()) {
    const perguntaPayload = { enquete_id: enqueteId, ordem, tipo: p.tipo, texto: p.texto, escala: p.tipo === 'nota' ? (p.escala ?? 10) : null, opcoes: p.tipo === 'multipla' ? (p.opcoes ?? []) : null }
    if (p.id.startsWith('nova-')) {
      const { error } = await db.from('perguntas').insert(perguntaPayload)
      if (error) throw error
    } else {
      const { error } = await db.from('perguntas').update(perguntaPayload).eq('id', p.id)
      if (error) throw error
    }
  }

  revalidatePath('/admin')
}

export async function deleteEnquete(contexto: Contexto, id: string): Promise<void> {
  await requireMaster()
  const { error } = await supabaseAdmin().schema(schemaFor(contexto)).from('enquetes').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin')
}

export async function setEnqueteStatus(contexto: Contexto, id: string, status: 'ativa' | 'pausada' | 'encerrada'): Promise<void> {
  await requireMaster()
  const { error } = await supabaseAdmin().schema(schemaFor(contexto)).from('enquetes').update({ status }).eq('id', id)
  if (error) throw error
  revalidatePath('/admin')
}

export async function emitirCampanha(contexto: Contexto, id: string): Promise<void> {
  await requireMaster()
  const { error } = await supabaseAdmin().schema(schemaFor(contexto)).from('enquetes').update({ emitida_em: new Date().toISOString() }).eq('id', id)
  if (error) throw error
  revalidatePath('/admin')
}

export async function getEnqueteRespostas(contexto: Contexto, enqueteId: string): Promise<RespostaRow[]> {
  await requireMaster()
  const db = supabaseAdmin().schema(schemaFor(contexto))
  const { data: respostas, error } = await db.from('respostas').select('id, papel, data').eq('enquete_id', enqueteId).order('data', { ascending: false })
  if (error) { console.error('getEnqueteRespostas: falhou', error); return [] }
  const respostaIds = ((respostas ?? []) as { id: string }[]).map((r) => r.id)
  if (!respostaIds.length) return []
  const { data: itens, error: itensErr } = await db.from('respostas_perguntas').select('resposta_id, pergunta_id, valor').in('resposta_id', respostaIds)
  if (itensErr) console.error('getEnqueteRespostas: respostas_perguntas falhou', itensErr)
  const itensPorResposta = new Map<string, { perguntaId: string; valor: string }[]>()
  for (const it of (itens ?? []) as { resposta_id: string; pergunta_id: string; valor: string }[]) {
    const arr = itensPorResposta.get(it.resposta_id) ?? []
    arr.push({ perguntaId: it.pergunta_id, valor: it.valor })
    itensPorResposta.set(it.resposta_id, arr)
  }
  return ((respostas ?? []) as { id: string; papel: string; data: string }[]).map((r) => ({
    id: r.id, papel: r.papel, data: r.data, respostasPerguntas: itensPorResposta.get(r.id) ?? [],
  }))
}

// Nomes de time/ministério que existem de verdade no banco, cross-tenant —
// cada igreja nomeia o próprio time (Louvor, Banda, Música...), então em vez
// de uma lista fixa no admin, oferecemos o que já foi cadastrado por alguém.
export async function getTimesDisponiveis(): Promise<string[]> {
  await requireMaster()
  const { data, error } = await supabaseAdmin().schema('service').from('ministries').select('name')
  if (error) { console.error('getTimesDisponiveis: falhou', error); return [] }
  const nomes = Array.from(new Set(((data ?? []) as { name: string }[]).map((m) => m.name).filter(Boolean)))
  return nomes.sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
