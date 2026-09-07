import { supabase } from './supabaseClient'

// Centralizar aqui todo acesso ao banco. Se um dia trocar de backend,
// só este arquivo precisa mudar - o resto do app usa só estas funções.

export const ATRIBUTOS_PADRAO = [
  'Força',
  'Destreza',
  'Constituição',
  'Agilidade',
  'Inteligência',
  'Sabedoria',
  'Carisma',
]

export const BARRAS_PADRAO = [
  { nome: 'Vida', valor_atual: 100, valor_maximo: 100 },
  { nome: 'Mana', valor_atual: 100, valor_maximo: 100 },
  { nome: 'Energia', valor_atual: 100, valor_maximo: 100 },
]

export const PERICIAS_PADRAO = {
  Força: ['Atletismo'],
  Agilidade: ['Acrobacia', 'Furtividade', 'Instinto'],
  Destreza: ['Prestidigitação', 'Manuseio de Ferramentas / Ladinagem', 'Pontaria'],
  Constituição: ['Resistência Física'],
  Inteligência: ['Arcanismo', 'História', 'Investigação', 'Natureza', 'Tecnomancia / Runologia', 'Medicina'],
  Sabedoria: ['Percepção', 'Intuição', 'Sobrevivência', 'Religião', 'Foco', 'Vontade'],
  Carisma: ['Persuasão', 'Enganação', 'Intimidação', 'Performance'],
}

export const IMAGEM_MUNDO_PADRAO = '/mundo-padrao.jpg'

export function calcularValorPericia(valorAtributo) {
  const atributo = Number(valorAtributo ?? 0)
  return Math.floor((atributo - 10) / 2)
}

// ---------- Mundos ----------

export async function listarMundos() {
  const { data, error } = await supabase
    .from('mundos')
    .select('*')
    .order('criado_em', { ascending: true })
  if (error) throw error
  return data
}

export async function buscarMundo(id) {
  const { data, error } = await supabase
    .from('mundos')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function criarMundo({ nome, mestre, imagem_url = null, campanha_ativa = false }) {
  const { data, error } = await supabase
    .from('mundos')
    .insert({
      nome: nome || 'Novo mundo',
      mestre: mestre || 'Sem mestre',
      imagem_url: imagem_url || IMAGEM_MUNDO_PADRAO,
      campanha_ativa: Boolean(campanha_ativa),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarMundo(id, campos) {
  const { error } = await supabase.from('mundos').update(campos).eq('id', id)
  if (error) throw error
}

export async function excluirMundo(id) {
  const { error } = await supabase.from('mundos').delete().eq('id', id)
  if (error) throw error
}

// ---------- Personagens ----------

export async function listarPersonagens(mundoId = null) {
  let query = supabase
    .from('personagens')
    .select('*')
    .order('criado_em', { ascending: true })

  if (mundoId) {
    query = query.eq('mundo_id', mundoId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function buscarPersonagem(id) {
  const { data, error } = await supabase
    .from('personagens')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function criarPersonagem({ nome, genero, imagem_url, nivel = 1, mundo_id = null, atributos, barras, pericias }) {
  const { data, error } = await supabase
    .from('personagens')
    .insert({ nome, genero, imagem_url, nivel: Number(nivel) || 1, mundo_id: mundo_id ?? null })
    .select()
    .single()
  if (error) throw error

  const atributosPadrao = (atributos && atributos.length
    ? atributos
    : ATRIBUTOS_PADRAO).map((nomeAtributo, i) => ({
      personagem_id: data.id,
      nome: nomeAtributo.nome ?? nomeAtributo,
      valor: Number(nomeAtributo.valor ?? 0),
      ordem: i,
    }))
  const { error: errAtributos } = await supabase.from('atributos').insert(atributosPadrao)
  if (errAtributos) throw errAtributos

  const barrasPadrao = (barras && barras.length
    ? barras
    : BARRAS_PADRAO).map((barra, i) => ({
      personagem_id: data.id,
      nome: barra.nome ?? barra,
      valor_atual: Number(barra.valor_atual ?? 100),
      valor_maximo: Number(barra.valor_maximo ?? 100),
      ordem: i,
    }))
  const { error: errBarras } = await supabase.from('barras_status').insert(barrasPadrao)
  if (errBarras) throw errBarras

  const periciasPadrao = (pericias && pericias.length
    ? pericias
    : Object.entries(PERICIAS_PADRAO).flatMap(([atributo, nomes]) =>
        nomes.map((nome, i) => ({ atributo, nome, valor: 0, ordem: i }))
      )).map((pericia, i) => {
        const valorAtributo = (atributosPadrao.find((atributo) => atributo.nome === pericia.atributo)?.valor ?? 0)
        return {
          personagem_id: data.id,
          atributo: pericia.atributo,
          nome: pericia.nome,
          valor: calcularValorPericia(valorAtributo),
          ordem: i,
        }
      })
  const { error: errPericias } = await supabase.from('pericias').insert(periciasPadrao)
  if (errPericias) throw errPericias

  return data
}

export async function atualizarPersonagem(id, campos) {
  const { error } = await supabase.from('personagens').update(campos).eq('id', id)
  if (error) throw error
}

export async function excluirPersonagem(id) {
  const { error } = await supabase.from('personagens').delete().eq('id', id)
  if (error) throw error
}

// ---------- Imagem ----------

export async function enviarImagemPersonagem(file) {
  const nomeArquivo = `${crypto.randomUUID()}-${file.name}`
  const { error } = await supabase.storage.from('personagens').upload(nomeArquivo, file)
  if (error) throw error
  const { data } = supabase.storage.from('personagens').getPublicUrl(nomeArquivo)
  return data.publicUrl
}

export async function enviarImagemMundo(file) {
  const nomeArquivo = `${crypto.randomUUID()}-${file.name}`
  const { error } = await supabase.storage.from('personagens').upload(nomeArquivo, file)
  if (error) throw error
  const { data } = supabase.storage.from('personagens').getPublicUrl(nomeArquivo)
  return data.publicUrl
}

// ---------- Atributos ----------

export async function listarAtributos(personagemId) {
  const { data, error } = await supabase
    .from('atributos')
    .select('*')
    .eq('personagem_id', personagemId)
    .order('ordem', { ascending: true })
  if (error) throw error
  return data
}

export async function adicionarAtributo(personagemId, nome) {
  const { error } = await supabase
    .from('atributos')
    .insert({ personagem_id: personagemId, nome, valor: 0 })
  if (error) throw error
}

export async function atualizarAtributo(id, campos) {
  const { error } = await supabase.from('atributos').update(campos).eq('id', id)
  if (error) throw error
}

export async function removerAtributo(id) {
  const { error } = await supabase.from('atributos').delete().eq('id', id)
  if (error) throw error
}

// ---------- Barras de status ----------

export async function listarBarras(personagemId) {
  const { data, error } = await supabase
    .from('barras_status')
    .select('*')
    .eq('personagem_id', personagemId)
    .order('ordem', { ascending: true })
  if (error) throw error
  return data
}

export async function adicionarBarra(personagemId, nome) {
  const { error } = await supabase
    .from('barras_status')
    .insert({ personagem_id: personagemId, nome, valor_atual: 0, valor_maximo: 0 })
  if (error) throw error
}

export async function atualizarBarra(id, campos) {
  const { error } = await supabase.from('barras_status').update(campos).eq('id', id)
  if (error) throw error
}

export async function removerBarra(id) {
  const { error } = await supabase.from('barras_status').delete().eq('id', id)
  if (error) throw error
}

// ---------- Perícias ----------

export async function listarPericias(personagemId) {
  const { data, error } = await supabase
    .from('pericias')
    .select('*')
    .eq('personagem_id', personagemId)
    .order('ordem', { ascending: true })
  if (error) throw error
  return data
}

export async function adicionarPericia(personagemId, atributo, nome) {
  const { error } = await supabase
    .from('pericias')
    .insert({ personagem_id: personagemId, atributo, nome, valor: 0 })
  if (error) throw error
}

export async function atualizarPericia(id, campos) {
  const { error } = await supabase.from('pericias').update(campos).eq('id', id)
  if (error) throw error
}

export async function removerPericia(id) {
  const { error } = await supabase.from('pericias').delete().eq('id', id)
  if (error) throw error
}

// ---------- Habilidades ----------

function ehErroColunaInexistente(error) {
  const mensagem = (error?.message || '').toLowerCase()
  return (
    (mensagem.includes('could not find the') && mensagem.includes('column')) ||
    (mensagem.includes('column') && mensagem.includes('does not exist'))
  )
}

export async function listarHabilidades(personagemId) {
  const consultas = [
    supabase
      .from('habilidades')
      .select('id, personagem_id, nome, descricao, custo, dano, cooldown_turnos, tipo, ordem')
      .eq('personagem_id', personagemId)
      .order('ordem', { ascending: true }),
    supabase
      .from('habilidades')
      .select('id, personagem_id, nome, descricao, custo, ordem')
      .eq('personagem_id', personagemId)
      .order('ordem', { ascending: true }),
  ]

  for (const consulta of consultas) {
    const { data, error } = await consulta

    if (!error) {
      return (data || []).map((habilidade) => ({
        ...habilidade,
        dano: habilidade.dano ?? '',
        cooldown_turnos: habilidade.cooldown_turnos ?? '',
        tipo: habilidade.tipo ?? 'ativa',
      }))
    }

    if (!ehErroColunaInexistente(error)) {
      throw error
    }
  }

  return []
}

export async function adicionarHabilidade(personagemId, tipo = 'ativa') {
  const payloadPadrao = {
    personagem_id: personagemId,
    nome: '',
    descricao: '',
    custo: '',
    dano: '',
    cooldown_turnos: null,
    tipo: tipo === 'passiva' ? 'passiva' : 'ativa',
  }

  try {
    const { error } = await supabase.from('habilidades').insert(payloadPadrao)
    if (error) throw error
  } catch (error) {
    if (!ehErroColunaInexistente(error)) throw error

    const payloadFallback = {
      personagem_id: personagemId,
      nome: '',
      descricao: '',
      custo: '',
      dano: '',
    }

    const { error: erroFallback } = await supabase.from('habilidades').insert(payloadFallback)
    if (erroFallback) throw erroFallback
  }
}

export async function atualizarHabilidade(id, campos) {
  const payload = { ...campos }

  if (payload.cooldown_turnos === undefined && payload.tipo === undefined) {
    const { error } = await supabase.from('habilidades').update(payload).eq('id', id)
    if (error) throw error
    return
  }

  try {
    const { error } = await supabase.from('habilidades').update(payload).eq('id', id)
    if (error) throw error
  } catch (error) {
    if (!ehErroColunaInexistente(error)) throw error

    const payloadFallback = { ...payload }
    delete payloadFallback.cooldown_turnos
    delete payloadFallback.tipo

    const { error: erroFallback } = await supabase.from('habilidades').update(payloadFallback).eq('id', id)
    if (erroFallback) throw erroFallback
  }
}

export async function removerHabilidade(id) {
  const { error } = await supabase.from('habilidades').delete().eq('id', id)
  if (error) throw error
}

// ---------- Realtime ----------

// Escuta mudanças em qualquer tabela ligada a um personagem e chama o callback.
// Usado para que todo mundo veja as atualizações ao vivo, sem precisar recarregar.
export function escutarMudancasPersonagem(personagemId, aoMudar) {
  const canal = supabase
    .channel(`personagem-${personagemId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'personagens', filter: `id=eq.${personagemId}` }, aoMudar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'atributos', filter: `personagem_id=eq.${personagemId}` }, aoMudar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'barras_status', filter: `personagem_id=eq.${personagemId}` }, aoMudar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pericias', filter: `personagem_id=eq.${personagemId}` }, aoMudar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'habilidades', filter: `personagem_id=eq.${personagemId}` }, aoMudar)
    .subscribe()

  return () => supabase.removeChannel(canal)
}

export function escutarMudancasListaPersonagens(aoMudar, mundoId = null) {
  const canal = supabase
    .channel(mundoId ? `lista-personagens-${mundoId}` : 'lista-personagens')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'personagens',
        ...(mundoId ? { filter: `mundo_id=eq.${mundoId}` } : {}),
      },
      aoMudar
    )
    .subscribe()

  return () => supabase.removeChannel(canal)
}
