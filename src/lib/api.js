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

// ---------- Personagens ----------

export async function listarPersonagens() {
  const { data, error } = await supabase
    .from('personagens')
    .select('*')
    .order('criado_em', { ascending: true })
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

export async function criarPersonagem({ nome, genero, imagem_url }) {
  const { data, error } = await supabase
    .from('personagens')
    .insert({ nome, genero, imagem_url })
    .select()
    .single()
  if (error) throw error

  // já cria os atributos base zerados
  const atributos = ATRIBUTOS_PADRAO.map((nome, i) => ({
    personagem_id: data.id,
    nome,
    valor: 0,
    ordem: i,
  }))
  const { error: errAtributos } = await supabase.from('atributos').insert(atributos)
  if (errAtributos) throw errAtributos

  const barras = BARRAS_PADRAO.map((barra, i) => ({
    personagem_id: data.id,
    nome: barra.nome,
    valor_atual: barra.valor_atual,
    valor_maximo: barra.valor_maximo,
    ordem: i,
  }))
  const { error: errBarras } = await supabase.from('barras_status').insert(barras)
  if (errBarras) throw errBarras

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

// ---------- Habilidades ----------

export async function listarHabilidades(personagemId) {
  const { data, error } = await supabase
    .from('habilidades')
    .select('*')
    .eq('personagem_id', personagemId)
    .order('ordem', { ascending: true })
  if (error) throw error
  return data
}

export async function adicionarHabilidade(personagemId) {
  const { error } = await supabase
    .from('habilidades')
    .insert({ personagem_id: personagemId, nome: 'Nova habilidade', descricao: '', custo: '' })
  if (error) throw error
}

export async function atualizarHabilidade(id, campos) {
  const { error } = await supabase.from('habilidades').update(campos).eq('id', id)
  if (error) throw error
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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'habilidades', filter: `personagem_id=eq.${personagemId}` }, aoMudar)
    .subscribe()

  return () => supabase.removeChannel(canal)
}

export function escutarMudancasListaPersonagens(aoMudar) {
  const canal = supabase
    .channel('lista-personagens')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'personagens' }, aoMudar)
    .subscribe()

  return () => supabase.removeChannel(canal)
}
