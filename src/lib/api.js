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

export async function criarPersonagem({ nome, genero, imagem_url, nivel = 1, mundo_id = null, atributos, barras, pericias, pontos_proficiencia = 2 }) {
  const { data, error } = await supabase
    .from('personagens')
    .insert({
      nome,
      genero,
      imagem_url,
      nivel: Number(nivel) || 1,
      mundo_id: mundo_id ?? null,
      pontos_proficiencia: Math.max(0, Number(pontos_proficiencia) || 0),
    })
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
          proficiente: Boolean(pericia.proficiente),
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

// Um único bucket ("personagens") guarda as imagens de personagens e de
// mundos - os dois usam a mesma função de upload por baixo.
async function enviarImagem(file) {
  const nomeArquivo = `${crypto.randomUUID()}-${file.name}`
  const { error } = await supabase.storage.from('personagens').upload(nomeArquivo, file)
  if (error) throw error
  const { data } = supabase.storage.from('personagens').getPublicUrl(nomeArquivo)
  return data.publicUrl
}

export const enviarImagemPersonagem = enviarImagem
export const enviarImagemMundo = enviarImagem

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

// Escuta TODA mudança de barras de status (sem filtrar por personagem), pra
// telas com vários personagens na tela (ex: a mesa) saberem quando alguma
// barra de qualquer um deles mudou, sem precisar de uma inscrição por token.
export function escutarBarrasStatus(aoMudar) {
  const canal = supabase
    .channel('barras-status-global')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'barras_status' }, aoMudar)
    .subscribe()

  return () => supabase.removeChannel(canal)
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

// ---------- Solicitações de rolagem ----------

// O Mestre pede uma rolagem específica a um jogador; o jogador vê o pedido
// e, ao rolar, o resultado volta para o Mestre. Tudo via realtime.
export const TIPOS_SOLICITACAO_ROLAGEM = [
  { valor: 'acerto', rotulo: 'Rolagem de acerto', dadoPadrao: '1d20' },
  { valor: 'pericia', rotulo: 'Rolagem de Perícia', dadoPadrao: '1d20' },
  { valor: 'dano', rotulo: 'Rolagem de dano', dadoPadrao: '1d6' },
]

export async function criarSolicitacaoRolagem({ mundo_id, personagem_id, tipo }) {
  const { data, error } = await supabase
    .from('solicitacoes_rolagem')
    .insert({ mundo_id, personagem_id, tipo })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listarSolicitacoesRolagem(mundoId) {
  const { data, error } = await supabase
    .from('solicitacoes_rolagem')
    .select('*')
    .eq('mundo_id', mundoId)
    .order('criado_em', { ascending: false })
  if (error) throw error
  return data
}

export async function concluirSolicitacaoRolagem(id, { resultado_total, resultado_texto }) {
  const { error } = await supabase
    .from('solicitacoes_rolagem')
    .update({
      status: 'concluida',
      resultado_total,
      resultado_texto,
      concluido_em: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

export async function cancelarSolicitacaoRolagem(id) {
  const { error } = await supabase
    .from('solicitacoes_rolagem')
    .update({ status: 'cancelada' })
    .eq('id', id)
  if (error) throw error
}

export function escutarSolicitacoesRolagem(mundoId, aoMudar) {
  const canal = supabase
    .channel(`solicitacoes-rolagem-${mundoId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'solicitacoes_rolagem', filter: `mundo_id=eq.${mundoId}` },
      aoMudar
    )
    .subscribe()

  return () => supabase.removeChannel(canal)
}

// ---------- Rolagens de dados (broadcast em tempo real) ----------

// A animação 3D de uma rolagem precisa ser vista igual por todo mundo
// conectado na mesa, não só por quem rolou. Como isso é um evento efêmero
// (o resultado final já fica salvo em historicoDados local e, quando é uma
// solicitação, em solicitacoes_rolagem), usamos "broadcast" do Realtime em
// vez de gravar em tabela: nenhuma linha de banco por rolagem, latência menor.
// self:true faz o próprio cliente que rolou também receber o evento, então
// todo mundo (incluindo quem rolou) reage exatamente do mesmo jeito.
export function escutarRolagensDados(mundoId, aoReceberRolagem) {
  const canal = supabase
    .channel(`rolagens-dados-${mundoId}`, { config: { broadcast: { self: true } } })
    .on('broadcast', { event: 'rolagem' }, (mensagem) => aoReceberRolagem(mensagem.payload))
    .subscribe()

  return {
    enviar: (payload) => canal.send({ type: 'broadcast', event: 'rolagem', payload }),
    parar: () => supabase.removeChannel(canal),
  }
}

// ---------- Inventário ----------

export async function listarItensInventario(personagemId) {
  const { data, error } = await supabase
    .from('itens_inventario')
    .select('*')
    .eq('personagem_id', personagemId)
    .order('slot', { ascending: true })
  if (error) throw error
  return data
}

export async function definirItemInventario(personagemId, slot, nome) {
  const { error } = await supabase
    .from('itens_inventario')
    .upsert({ personagem_id: personagemId, slot, nome }, { onConflict: 'personagem_id,slot' })
  if (error) throw error
}

export async function removerItemInventario(personagemId, slot) {
  const { error } = await supabase
    .from('itens_inventario')
    .delete()
    .eq('personagem_id', personagemId)
    .eq('slot', slot)
  if (error) throw error
}

export function escutarInventario(personagemId, aoMudar) {
  const canal = supabase
    .channel(`inventario-${personagemId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'itens_inventario', filter: `personagem_id=eq.${personagemId}` },
      aoMudar
    )
    .subscribe()

  return () => supabase.removeChannel(canal)
}

// ---------- Desenhos no mapa ----------

export async function listarDesenhosMapa(mundoId) {
  const { data, error } = await supabase
    .from('desenhos_mapa')
    .select('*')
    .eq('mundo_id', mundoId)
    .order('criado_em', { ascending: true })
  if (error) throw error
  return data
}

export async function criarDesenhoMapa({ mundo_id, pontos, cor, espessura }) {
  const { data, error } = await supabase
    .from('desenhos_mapa')
    .insert({ mundo_id, pontos, cor, espessura })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function limparDesenhosMapa(mundoId) {
  const { error } = await supabase
    .from('desenhos_mapa')
    .delete()
    .eq('mundo_id', mundoId)
  if (error) throw error
}

export async function removerDesenhoMapa(id) {
  const { error } = await supabase
    .from('desenhos_mapa')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export function escutarDesenhosMapa(mundoId, aoMudar) {
  const canal = supabase
    .channel(`desenhos-mapa-${mundoId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'desenhos_mapa', filter: `mundo_id=eq.${mundoId}` },
      aoMudar
    )
    .subscribe()

  return () => supabase.removeChannel(canal)
}
