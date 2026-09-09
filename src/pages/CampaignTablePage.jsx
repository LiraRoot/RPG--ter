import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  TIPOS_SOLICITACAO_ROLAGEM,
  atualizarPericia,
  atualizarPersonagem,
  buscarMundo,
  cancelarSolicitacaoRolagem,
  concluirSolicitacaoRolagem,
  criarDesenhoMapa,
  criarSolicitacaoRolagem,
  escutarBarrasStatus,
  escutarDesenhosMapa,
  escutarMudancasPersonagem,
  escutarMudancasListaPersonagens,
  escutarRolagensDados,
  escutarSolicitacoesRolagem,
  limparDesenhosMapa,
  listarAtributos,
  listarBarras,
  listarDesenhosMapa,
  listarHabilidades,
  listarPericias,
  listarPersonagens,
  listarSolicitacoesRolagem,
  removerDesenhoMapa,
} from '../lib/api'
import { analisarFormulaDados, formatarDetalhamentoDados, formatarFormula, rolarTermos } from '../lib/dados'
import DiceRoller3D from '../components/DiceRoller3D'
import DiceIdlePreview from '../components/DiceIdlePreview'
import InventoryPanel from '../components/InventoryPanel'
import NotepadPanel from '../components/NotepadPanel'

const PERSONAGEM_SELECIONADO_KEY = 'rpg-personagem-selecionado'

function IconeEstrela({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M9 1L12 6L17 9L12 12L9 17L6 12L1 9L6 6Z" />
      <path d="M18 13L20 16L23 18L20 20L18 23L16 20L13 18L16 16Z" />
    </svg>
  )
}

function IconeX({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 5L19 19M19 5L5 19" />
    </svg>
  )
}

function IconeMochila({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M9 2a1 1 0 0 0-1 1v1.05A5.002 5.002 0 0 0 4 9v9a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V9a5.002 5.002 0 0 0-4-4.95V3a1 1 0 0 0-1-1H9Zm1 2h4v1h-4V4ZM6 9a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v1H6V9Zm0 3h12v6a2 2 0 0 1-2 2h-1v-4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v4H8a2 2 0 0 1-2-2v-6Z" />
    </svg>
  )
}

function IconeLapis({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" />
    </svg>
  )
}

function IconeCaderno({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5Zm0 2h2v14H5V5Zm4 0h10v14H9V5Zm1 3v1.5h8V8h-8Zm0 3v1.5h8V11h-8Zm0 3v1.5h6V14h-6Z" />
    </svg>
  )
}

const GRID_SIZE = 80

const POSICOES = [
  { x: 4, y: 8 },
  { x: 11, y: 5 },
  { x: 18, y: 8 },
  { x: 24, y: 4 },
  { x: 30, y: 8 },
  { x: 7, y: 16 },
  { x: 15, y: 17 },
  { x: 23, y: 15 },
  { x: 30, y: 17 },
]

function clamp(valor, min, max) {
  return Math.min(Math.max(valor, min), max)
}

function pixelsParaGrid(x, y) {
  return {
    x: (x - GRID_SIZE / 2) / GRID_SIZE,
    y: (y - GRID_SIZE / 2) / GRID_SIZE,
  }
}

function distanciaEmMetros(a, b) {
  if (!a || !b) return 0
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function formatarDescricaoHabilidade(habilidade) {
  if (!habilidade) return 'Habilidade inexistente'

  const descricao = String(habilidade.descricao || '').trim()
  const custo = String(habilidade.custo || '').trim()
  const dano = String(habilidade.dano || '').trim()
  const cooldown = Number(habilidade.cooldown_turnos ?? 0)

  const custoNumerico = String(custo || '').replace(/[^0-9]/g, '')

  return {
    descricao: descricao || 'Habilidade inexistente',
    custo: custoNumerico ? `${custoNumerico} de Mana` : custo || '0 de Mana',
    dano,
    cooldown,
  }
}

function normalizarBarrasHud(barras = []) {
  const nomesPadrao = ['Vida', 'Mana', 'Estamina']
  const mapa = new Map((barras || []).map((barra) => [String(barra.nome || '').toLowerCase(), barra]))

  return nomesPadrao.map((nome) => {
    const barraExistente = mapa.get(nome.toLowerCase())
    if (barraExistente) {
      return {
        ...barraExistente,
        nome,
        valor_atual: Number(barraExistente.valor_atual ?? 0),
        valor_maximo: Number(barraExistente.valor_maximo ?? 100),
      }
    }

    return {
      id: `padrao-${nome.toLowerCase()}`,
      nome,
      valor_atual: 100,
      valor_maximo: 100,
    }
  })
}

function CharacterHud({
  personagem,
  barras = [],
  habilidades = [],
  pericias = [],
  atributos = [],
  podeAlocarProficiencia = false,
  podeRemoverProficiencia = false,
  onAtribuirProficiencia,
  onRemoverProficiencia,
}) {
  const [atributosExpandidos, setAtributosExpandidos] = useState({})

  if (!personagem) return null

  const barrasHud = normalizarBarrasHud(barras)
  const nivelPorAtributo = new Map((atributos || []).map((atributo) => [String(atributo.nome || '').toLowerCase(), Number(atributo.valor ?? 0)]))
  const gruposDePericias = [...(pericias || [])]
    .filter((pericia) => pericia && pericia.nome)
    .reduce((acc, pericia) => {
      const chaveAtributo = String(pericia.atributo || 'Outros')
      if (!acc[chaveAtributo]) {
        acc[chaveAtributo] = []
      }
      acc[chaveAtributo].push(pericia)
      return acc
    }, {})
  const atributosOrdenados = Object.keys(gruposDePericias).sort((a, b) => a.localeCompare(b))
  const slots = Array.from({ length: 4 }, (_, indice) => {
    const hab = habilidades[indice]
    if (!hab || !hab.nome || String(hab.nome).trim() === '') {
      return {
        id: `slot-vazio-${indice}`,
        nome: '?',
        descricao: 'Habilidade inexistente',
      }
    }

    const tooltip = formatarDescricaoHabilidade(hab)

    return {
      ...hab,
      nome: hab.nome,
      descricao: tooltip.descricao,
      tooltip,
    }
  })

  return (
    <section className="character-hud">
      <div className="character-hud__top">
        <div className="character-hud__identity">
          <div className="character-hud__avatar">
            {personagem.imagem_url ? (
              <img src={personagem.imagem_url} alt={personagem.nome} />
            ) : (
              <span>{(personagem.nome || '?').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="character-hud__label">Personagem</p>
            <h3>{personagem.nome}</h3>
          </div>
        </div>

        <div className="character-hud__level">{personagem.nivel ?? 1}</div>
      </div>

      <div className="character-hud__bars">
        {barrasHud.map((barra) => {
          const valorAtual = Number(barra.valor_atual ?? 0)
          const valorMaximo = Number(barra.valor_maximo ?? 100)
          const percentual = valorMaximo > 0 ? Math.min(100, Math.max(0, (valorAtual / valorMaximo) * 100)) : 0

          const corBarra = barra.nome?.toLowerCase() === 'vida'
            ? '#ef4444'
            : barra.nome?.toLowerCase() === 'mana'
              ? '#3b82f6'
              : '#cbd5e1'

          return (
            <div key={barra.id || barra.nome} className="character-hud__bar">
              <span className="character-hud__bar-name">{barra.nome}</span>
              <div className="character-hud__bar-track">
                <div
                  className="character-hud__bar-fill"
                  style={{ width: `${percentual}%`, background: `linear-gradient(90deg, ${corBarra} 0%, ${corBarra} 100%)` }}
                />
              </div>
              <span className="character-hud__bar-value">{valorAtual}/{valorMaximo}</span>
            </div>
          )
        })}
      </div>

      <div className="character-hud__ability-grid">
        {slots.map((habilidade, indice) => (
          <div
            key={habilidade.id || `slot-${indice}`}
            className={`character-hud__ability ${!habilidade.id ? 'character-hud__ability--empty' : ''}`}
          >
            <span className="character-hud__ability-label">{habilidade.nome}</span>

            <span className="character-hud__ability-tooltip">
              <span className="character-hud__ability-tooltip__header">
                <span className="character-hud__ability-tooltip__description">{habilidade.tooltip?.descricao || 'Habilidade inexistente'}</span>
                {habilidade.tooltip?.custo ? (
                  <span className="character-hud__ability-tooltip__cost">{habilidade.tooltip.custo}</span>
                ) : null}
              </span>

              <span className="character-hud__ability-tooltip__footer">
                {habilidade.tooltip?.dano ? (
                  <span className="character-hud__ability-tooltip__damage">Dano: {habilidade.tooltip.dano}</span>
                ) : null}
                {habilidade.tooltip?.cooldown > 0 ? (
                  <span className="character-hud__ability-tooltip__cd">CD: {habilidade.tooltip.cooldown} turno{habilidade.tooltip.cooldown === 1 ? '' : 's'}</span>
                ) : null}
              </span>
            </span>
          </div>
        ))}
      </div>

      {atributosOrdenados.length > 0 && (
        <div className="character-hud__pericias">
          <div className="secao-cabecalho-com-info">
            <div className="character-hud__pericias-header">Atributos</div>
            {(personagem.pontos_proficiencia ?? 0) > 0 && (
              <span className="proficiencia-contador">Pontos de proficiência: {personagem.pontos_proficiencia}</span>
            )}
          </div>
          <div className="character-hud__pericias-groups">
            {atributosOrdenados.map((nomeAtributo) => {
              const periciasDoAtributo = [...gruposDePericias[nomeAtributo]].sort((a, b) => String(a.nome).localeCompare(String(b.nome)))
              const nivelAtributo = nivelPorAtributo.get(String(nomeAtributo).toLowerCase()) ?? Number(periciasDoAtributo[0]?.valor ?? 0)
              const expandido = Boolean(atributosExpandidos[nomeAtributo])

              return (
                <div key={nomeAtributo} className="character-hud__atributo-pericia">
                  <button
                    type="button"
                    className="character-hud__atributo-toggle"
                    onClick={() => setAtributosExpandidos((atual) => ({
                      ...atual,
                      [nomeAtributo]: !atual[nomeAtributo],
                    }))}
                  >
                    <span className="character-hud__atributo-toggle__label">
                      <span className="character-hud__atributo-toggle__nome">{nomeAtributo}</span>
                      <span className="character-hud__atributo-toggle__nivel">{nivelAtributo}</span>
                    </span>
                    <span className={`character-hud__atributo-toggle__arrow ${expandido ? 'is-open' : ''}`}>▾</span>
                  </button>

                  {expandido && (
                    <div className="character-hud__pericia-list">
                      {periciasDoAtributo.map((pericia) => {
                        const valorPericia = Number(pericia.valor ?? 0)
                        const valorFormatado = valorPericia >= 0 ? `+${valorPericia}` : `${valorPericia}`
                        return (
                          <div key={pericia.id || `${pericia.atributo}-${pericia.nome}`} className="character-hud__pericia">
                            <span className="character-hud__pericia-nome-wrap">
                              <span className="character-hud__pericia-nome">{pericia.nome}</span>
                              {pericia.proficiente ? (
                                <button
                                  type="button"
                                  className={`character-hud__pericia-estrela is-ativa ${podeRemoverProficiencia ? 'is-removivel' : ''}`}
                                  title="Proficiência"
                                  disabled={!podeRemoverProficiencia}
                                  onClick={() => onRemoverProficiencia?.(pericia.id)}
                                >
                                  <IconeEstrela className="icone-proficiencia" />
                                </button>
                              ) : (
                                podeAlocarProficiencia && (personagem.pontos_proficiencia ?? 0) > 0 && (
                                  <button
                                    type="button"
                                    className="character-hud__pericia-estrela is-hover-only"
                                    title="Adicionar proficiência"
                                    onClick={() => onAtribuirProficiencia?.(pericia.id)}
                                  >
                                    <IconeEstrela className="icone-proficiencia" />
                                  </button>
                                )
                              )}
                            </span>
                            <span className="character-hud__pericia-valor">{valorFormatado}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

export default function CampaignTablePage() {
  const { mundoId } = useParams()
  const navegar = useNavigate()
  const mesaRef = useRef(null)

  const [mundo, setMundo] = useState(null)
  const [personagens, setPersonagens] = useState([])
  const [personagemAtual, setPersonagemAtual] = useState(null)
  const [ordemTurnos, setOrdemTurnos] = useState([])
  const [turnoAtualId, setTurnoAtualId] = useState(null)
  const [draggedTurnId, setDraggedTurnId] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [erroAcao, setErroAcao] = useState(null)
  const [hudOculto, setHudOculto] = useState(false)
  const [posicoes, setPosicoes] = useState({})
  const [dragId, setDragId] = useState(null)
  const [hudBarras, setHudBarras] = useState([])
  const [barrasPorPersonagem, setBarrasPorPersonagem] = useState({})
  const [hudHabilidades, setHudHabilidades] = useState([])
  const [hudAtributos, setHudAtributos] = useState([])
  const [hudPericias, setHudPericias] = useState([])
  const [acaoPadraoExpandida, setAcaoPadraoExpandida] = useState(false)
  const [habilidadeSelecionada, setHabilidadeSelecionada] = useState(null)
  const [confirmarFinalizarTurno, setConfirmarFinalizarTurno] = useState(false)
  const [dadoAberto, setDadoAberto] = useState(false)
  const [dadoInput, setDadoInput] = useState('1d20')
  const [historicoDados, setHistoricoDados] = useState([])
  const historicoDadosListaRef = useRef(null)
  const [solicitacoesRolagem, setSolicitacoesRolagem] = useState([])
  const [solicitarAberto, setSolicitarAberto] = useState(false)
  const [solicitarPersonagemId, setSolicitarPersonagemId] = useState('')
  const [solicitarTipo, setSolicitarTipo] = useState(TIPOS_SOLICITACAO_ROLAGEM[0].valor)
  const [enviandoSolicitacao, setEnviandoSolicitacao] = useState(false)
  const [solicitacaoAtivaId, setSolicitacaoAtivaId] = useState(null)
  const ultimaSolicitacaoAvisadaRef = useRef(null)
  const [rolagemAtiva, setRolagemAtiva] = useState(null)
  const [enviandoRolagem, setEnviandoRolagem] = useState(false)
  const canalRolagemRef = useRef(null)
  const [inventarioAberto, setInventarioAberto] = useState(false)
  const [notasAberto, setNotasAberto] = useState(false)
  const [desenhoAtivo, setDesenhoAtivo] = useState(false)
  const [desenhos, setDesenhos] = useState([])
  const [pontosAtuais, setPontosAtuais] = useState([])
  const desenhoAtualRef = useRef([])
  const desenhandoRef = useRef(false)

  const perfilAtual = (() => {
    try {
      return window.sessionStorage.getItem('rpg-perfil-atual') || 'mestre'
    } catch {
      return 'mestre'
    }
  })()
  const personagemInicialDoAventureiro = (() => {
    try {
      return window.sessionStorage.getItem(PERSONAGEM_SELECIONADO_KEY) || null
    } catch {
      return null
    }
  })()
  const personagemDoJogador = perfilAtual === 'aventureiro'
    ? personagens.find((personagem) => String(personagem.id) === String(personagemInicialDoAventureiro)) || null
    : null
  const personagemControladoPeloAventureiro = perfilAtual === 'aventureiro'
    ? personagemDoJogador || null
    : null
  const solicitacaoPendenteParaMim = perfilAtual === 'aventureiro' && personagemControladoPeloAventureiro
    ? solicitacoesRolagem.find((item) => item.status === 'pendente' && String(item.personagem_id) === String(personagemControladoPeloAventureiro.id))
    : null

  function infoTipoSolicitacao(tipo) {
    return TIPOS_SOLICITACAO_ROLAGEM.find((item) => item.valor === tipo)
  }
  const indiceTurnoAtual = ordemTurnos.findIndex((id) => String(id) === String(turnoAtualId))
  const proximaPersonagemDoTurno = (() => {
    if (!ordemTurnos.length || indiceTurnoAtual < 0) return personagens[0] || null
    const proximoIndice = (indiceTurnoAtual + 1) % ordemTurnos.length
    const proximoId = ordemTurnos[proximoIndice]
    return personagens.find((personagem) => String(personagem.id) === String(proximoId)) || null
  })()
  const ehTurnoDoPersonagemControlado = perfilAtual === 'aventureiro'
    && !!personagemControladoPeloAventureiro
    && String(turnoAtualId) === String(personagemControladoPeloAventureiro.id)
  const podeFinalizarTurno = perfilAtual === 'mestre' || ehTurnoDoPersonagemControlado
  const deveConfirmarFinalizarTurno = perfilAtual !== 'mestre' && podeFinalizarTurno
  const acoesDisponiveis = {
    padrao: 1,
    movimento: 1,
    reacao: 1,
  }

  function selecionarPersonagem(personagem) {
    if (!personagem) return
    if (perfilAtual === 'aventureiro' && String(personagem.id) !== String(personagemInicialDoAventureiro)) {
      return
    }
    setPersonagemAtual(personagem)
    try {
      window.sessionStorage.setItem(PERSONAGEM_SELECIONADO_KEY, String(personagem.id))
    } catch {
      // ignora falha de storage
    }
  }

  function finalizarTurno() {
    if (!podeFinalizarTurno || !proximaPersonagemDoTurno) return
    if (perfilAtual === 'aventureiro' && !ehTurnoDoPersonagemControlado) return

    setConfirmarFinalizarTurno(false)
    setTurnoAtualId(String(proximaPersonagemDoTurno.id))
    if (perfilAtual === 'aventureiro' && personagemControladoPeloAventureiro) {
      setPersonagemAtual(personagemControladoPeloAventureiro)
      try {
        window.sessionStorage.setItem(PERSONAGEM_SELECIONADO_KEY, String(personagemControladoPeloAventureiro.id))
      } catch {
        // ignora falha de storage
      }
      return
    }

    setPersonagemAtual(proximaPersonagemDoTurno)
    try {
      window.sessionStorage.setItem(PERSONAGEM_SELECIONADO_KEY, String(proximaPersonagemDoTurno.id))
    } catch {
      // ignora falha de storage
    }
  }

  function obterBarraVida(personagemId) {
    const barras = barrasPorPersonagem[personagemId] || []
    return barras.find((barra) => String(barra.nome || '').toLowerCase() === 'vida') || null
  }

  function obterPontoDoEvento(event) {
    const mesa = mesaRef.current
    if (!mesa) return null
    const rect = mesa.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function aoPressionarParaDesenhar(event) {
    if (!desenhoAtivo) return
    const ponto = obterPontoDoEvento(event)
    if (!ponto) return
    desenhandoRef.current = true
    desenhoAtualRef.current = [ponto]
    setPontosAtuais([ponto])
    event.preventDefault()
  }

  function aoMoverParaDesenhar(event) {
    if (!desenhoAtivo || !desenhandoRef.current) return
    const ponto = obterPontoDoEvento(event)
    if (!ponto) return
    desenhoAtualRef.current = [...desenhoAtualRef.current, ponto]
    setPontosAtuais(desenhoAtualRef.current)
  }

  async function aoSoltarParaDesenhar() {
    if (!desenhandoRef.current) return
    desenhandoRef.current = false
    const pontosFinais = desenhoAtualRef.current
    desenhoAtualRef.current = []

    if (pontosFinais.length <= 1) {
      setPontosAtuais([])
      return
    }

    try {
      // Mantém o traço em preview até o desenho confirmado entrar na lista,
      // pra não sumir por 1s enquanto espera a volta do servidor (piscada).
      const novoDesenho = await criarDesenhoMapa({ mundo_id: mundoId, pontos: pontosFinais, cor: '#000000', espessura: 3 })
      setDesenhos((atual) => (atual.some((d) => d.id === novoDesenho.id) ? atual : [...atual, novoDesenho]))
    } catch (e) {
      setErroAcao(e.message)
    } finally {
      setPontosAtuais([])
    }
  }

  function aoLimparDesenhos() {
    limparDesenhosMapa(mundoId).catch((e) => setErroAcao(e.message))
  }

  function aoDesfazerUltimoDesenho() {
    const ultimo = desenhos[desenhos.length - 1]
    if (!ultimo) return
    removerDesenhoMapa(ultimo.id).catch((e) => setErroAcao(e.message))
  }

  async function aoAtribuirProficienciaHud(periciaId) {
    const pontosAtuais = personagemAtual?.pontos_proficiencia ?? 0
    const pericia = hudPericias.find((item) => item.id === periciaId)
    if (!personagemAtual || !pericia || pericia.proficiente || pontosAtuais <= 0) return

    const novosPontos = pontosAtuais - 1
    setPersonagemAtual((atual) => atual ? { ...atual, pontos_proficiencia: novosPontos } : atual)
    setHudPericias((atual) => atual.map((item) => item.id === periciaId ? { ...item, proficiente: true } : item))

    try {
      await Promise.all([
        atualizarPericia(periciaId, { proficiente: true }),
        atualizarPersonagem(personagemAtual.id, { pontos_proficiencia: novosPontos }),
      ])
    } catch (e) {
      setErroAcao(e.message)
    }
  }

  async function aoRemoverProficienciaHud(periciaId) {
    const pericia = hudPericias.find((item) => item.id === periciaId)
    if (!personagemAtual || !pericia || !pericia.proficiente) return

    const novosPontos = (personagemAtual.pontos_proficiencia ?? 0) + 1
    setPersonagemAtual((atual) => atual ? { ...atual, pontos_proficiencia: novosPontos } : atual)
    setHudPericias((atual) => atual.map((item) => item.id === periciaId ? { ...item, proficiente: false } : item))

    try {
      await Promise.all([
        atualizarPericia(periciaId, { proficiente: false }),
        atualizarPersonagem(personagemAtual.id, { pontos_proficiencia: novosPontos }),
      ])
    } catch (e) {
      setErroAcao(e.message)
    }
  }

  function cancelarAcaoPadrao() {
    setAcaoPadraoExpandida(false)
    setHabilidadeSelecionada(null)
  }

  function cancelarHabilidadeSelecionada() {
    setHabilidadeSelecionada(null)
    setAcaoPadraoExpandida(false)
  }

  function rolarDadosPersonalizados() {
    if (enviandoRolagem || rolagemAtiva) return

    const analise = analisarFormulaDados(dadoInput)
    if (analise.erro) {
      setErroAcao(analise.erro)
      return
    }

    const textoExpressao = formatarFormula(analise.termos)
    const resultado = rolarTermos(analise.termos)
    const nomeJogador = personagemAtual?.nome || 'Mestre'
    const solicitacaoParaConcluir = solicitacaoAtivaId

    setEnviandoRolagem(true)
    setDadoAberto(false)

    if (solicitacaoParaConcluir) {
      setSolicitacaoAtivaId(null)
      concluirSolicitacaoRolagem(solicitacaoParaConcluir, {
        resultado_total: resultado.total,
        resultado_texto: textoExpressao,
      }).catch((e) => setErroAcao(e.message))
    }

    const payloadRolagem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      nomeJogador,
      formula: textoExpressao,
      termos: resultado.termosResolvidos,
      total: resultado.total,
    }

    if (canalRolagemRef.current) {
      canalRolagemRef.current.enviar(payloadRolagem).catch((e) => {
        setErroAcao(e.message)
        setEnviandoRolagem(false)
      })
    } else {
      setEnviandoRolagem(false)
    }
  }

  async function aoEnviarSolicitacaoRolagem() {
    if (!solicitarPersonagemId) return
    setEnviandoSolicitacao(true)
    try {
      await criarSolicitacaoRolagem({
        mundo_id: mundoId,
        personagem_id: solicitarPersonagemId,
        tipo: solicitarTipo,
      })
      setSolicitarPersonagemId('')
      setSolicitarAberto(false)
    } catch (e) {
      setErroAcao(e.message)
    } finally {
      setEnviandoSolicitacao(false)
    }
  }

  function aoAceitarSolicitacaoRolagem(solicitacao) {
    const info = infoTipoSolicitacao(solicitacao.tipo)
    setDadoInput(info?.dadoPadrao || '1d20')
    setSolicitacaoAtivaId(solicitacao.id)
  }

  function aoCancelarSolicitacaoRolagem(id) {
    cancelarSolicitacaoRolagem(id).catch((e) => setErroAcao(e.message))
  }

  useEffect(() => {
    const lista = historicoDadosListaRef.current
    if (!lista) return
    lista.scrollTop = lista.scrollHeight
  }, [historicoDados])

  useEffect(() => {
    if (!mundoId) return undefined

    async function carregarSolicitacoes() {
      try {
        const dados = await listarSolicitacoesRolagem(mundoId)
        setSolicitacoesRolagem(dados)
      } catch {
        // não é crítico para a mesa continuar funcionando
      }
    }

    carregarSolicitacoes()
    const pararDeEscutar = escutarSolicitacoesRolagem(mundoId, carregarSolicitacoes)
    return pararDeEscutar
  }, [mundoId])

  useEffect(() => {
    if (!mundoId) return undefined

    const canal = escutarRolagensDados(mundoId, (payload) => {
      setRolagemAtiva(payload)
      setEnviandoRolagem(false)
      setHistoricoDados((atual) => [...atual, {
        nome: payload.nomeJogador,
        texto: payload.formula,
        resultado: payload.total,
        termos: payload.termos,
      }].slice(-50))
    })
    canalRolagemRef.current = canal

    return () => {
      canalRolagemRef.current = null
      canal.parar()
    }
  }, [mundoId])

  useEffect(() => {
    if (!mundoId) return undefined

    async function carregarDesenhos() {
      try {
        const dados = await listarDesenhosMapa(mundoId)
        setDesenhos(dados)
      } catch {
        // desenhos são um extra visual; não impede a mesa de funcionar
      }
    }

    carregarDesenhos()
    const pararDeEscutar = escutarDesenhosMapa(mundoId, carregarDesenhos)
    return pararDeEscutar
  }, [mundoId])

  useEffect(() => {
    if (!desenhoAtivo) return undefined

    function aoPressionarTecla(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        aoDesfazerUltimoDesenho()
      }
    }

    window.addEventListener('keydown', aoPressionarTecla)
    return () => window.removeEventListener('keydown', aoPressionarTecla)
  }, [desenhoAtivo, desenhos, mundoId])

  useEffect(() => {
    if (solicitacaoPendenteParaMim && ultimaSolicitacaoAvisadaRef.current !== solicitacaoPendenteParaMim.id) {
      ultimaSolicitacaoAvisadaRef.current = solicitacaoPendenteParaMim.id
      setDadoAberto(true)
    }
  }, [solicitacaoPendenteParaMim])

  useEffect(() => {
    if (!erroAcao) return undefined
    const temporizador = window.setTimeout(() => setErroAcao(null), 5000)
    return () => window.clearTimeout(temporizador)
  }, [erroAcao])

  useEffect(() => {
    async function carregar() {
      try {
        const mundoAtual = await buscarMundo(mundoId)
        if (!mundoAtual?.campanha_ativa) {
          navegar(`/mundo/${mundoId}`)
          return
        }

        const dados = await listarPersonagens(mundoId)
        setMundo(mundoAtual)
        setPersonagens(dados)

        const listasBarras = await Promise.all(dados.map((personagem) => listarBarras(personagem.id).catch(() => [])))
        const mapaBarras = {}
        dados.forEach((personagem, indice) => {
          mapaBarras[personagem.id] = listasBarras[indice]
        })
        setBarrasPorPersonagem(mapaBarras)

        const proximoPosicoes = {}
        dados.forEach((personagem, indice) => {
          const padrao = POSICOES[indice % POSICOES.length]
          proximoPosicoes[personagem.id] = { x: padrao.x, y: padrao.y }
        })
        setPosicoes(proximoPosicoes)

        const idSelecionado = window.sessionStorage.getItem(PERSONAGEM_SELECIONADO_KEY)
        const personagemSelecionado = dados.find((personagem) => String(personagem.id) === String(idSelecionado)) || dados[0] || null
        const ordemInicial = dados.map((personagem) => personagem.id)
        setOrdemTurnos(ordemInicial)
        setTurnoAtualId(personagemSelecionado ? String(personagemSelecionado.id) : (dados[0] ? String(dados[0].id) : null))
        setPersonagemAtual(personagemSelecionado)
      } catch (e) {
        setErro(e.message)
      } finally {
        setCarregando(false)
      }
    }

    carregar()
  }, [mundoId, navegar])

  // Mantém a lista de personagens (nome, nível, imagem, pontos de
  // proficiência, notas...) sincronizada quando qualquer um deles é editado
  // em outra aba/dispositivo (ex: pela ficha do personagem), sem precisar
  // de F5 na mesa. O campo "notas" é preservado como está localmente porque
  // o bloco de notas já tem seu próprio caminho de atualização otimista
  // (aoMudarTexto) - sobrescrever aqui poderia "voltar no tempo" o texto
  // enquanto o jogador ainda está digitando.
  useEffect(() => {
    if (!mundoId) return undefined

    async function recarregarPersonagens() {
      try {
        const dados = await listarPersonagens(mundoId)
        setPersonagens(dados)
        setPersonagemAtual((atual) => {
          if (!atual) return atual
          const atualizado = dados.find((personagem) => String(personagem.id) === String(atual.id))
          return atualizado ? { ...atualizado, notas: atual.notas } : atual
        })
      } catch {
        // mantém os dados já carregados se a atualização falhar
      }
    }

    const pararDeEscutar = escutarMudancasListaPersonagens(recarregarPersonagens, mundoId)
    return pararDeEscutar
  }, [mundoId])

  // Mantém as barras de vida/mana/estamina exibidas nos tokens do mapa em
  // dia quando qualquer personagem toma dano ou é curado em outra tela -
  // sem isso, a barra de vida no mapa só atualizava pra quem estava com a
  // ficha daquele personagem em foco no momento da mudança.
  useEffect(() => {
    if (!personagens.length) return undefined

    const idsConhecidos = new Set(personagens.map((personagem) => String(personagem.id)))

    const pararDeEscutar = escutarBarrasStatus((payload) => {
      const linha = payload.new || payload.old
      const personagemId = linha?.personagem_id
      if (!personagemId || !idsConhecidos.has(String(personagemId))) return

      listarBarras(personagemId)
        .then((barras) => setBarrasPorPersonagem((atual) => ({ ...atual, [personagemId]: barras })))
        .catch(() => {})
    })

    return pararDeEscutar
  }, [personagens])

  useEffect(() => {
    if (perfilAtual === 'aventureiro' && personagemDoJogador) {
      const jaEstaNoPersonagemCorreto = personagemAtual && String(personagemAtual.id) === String(personagemDoJogador.id)
      if (!jaEstaNoPersonagemCorreto) {
        setPersonagemAtual(personagemDoJogador)
        try {
          window.sessionStorage.setItem(PERSONAGEM_SELECIONADO_KEY, String(personagemDoJogador.id))
        } catch {
          // ignora falha de storage
        }
      }
    }
  }, [perfilAtual, personagemAtual, personagemDoJogador])

  useEffect(() => {
    if (!personagemAtual?.id) {
      setHudBarras([])
      setHudHabilidades([])
      setHudAtributos([])
      setHudPericias([])
      return undefined
    }

    async function carregarHud() {
      try {
        const [barras, habilidades, atributos, pericias] = await Promise.all([
          listarBarras(personagemAtual.id),
          listarHabilidades(personagemAtual.id),
          listarAtributos(personagemAtual.id),
          listarPericias(personagemAtual.id),
        ])
        setHudBarras(barras)
        setHudHabilidades(habilidades)
        setHudAtributos(atributos)
        setHudPericias(pericias)
        setBarrasPorPersonagem((atual) => ({ ...atual, [personagemAtual.id]: barras }))
      } catch {
        setHudBarras([])
        setHudHabilidades([])
        setHudAtributos([])
        setHudPericias([])
      }
    }

    carregarHud()
    const pararDeEscutar = escutarMudancasPersonagem(personagemAtual.id, carregarHud)
    return pararDeEscutar
  }, [personagemAtual?.id])

  useEffect(() => {
    if (!dragId) return undefined

    function mover(event) {
      const mesa = mesaRef.current
      if (!mesa) return

      const rect = mesa.getBoundingClientRect()
      const xPixels = event.clientX - rect.left
      const yPixels = event.clientY - rect.top
      const { x, y } = pixelsParaGrid(xPixels, yPixels)
      const cols = Math.max(10, Math.floor(rect.width / GRID_SIZE) - 1)
      const rows = Math.max(8, Math.floor(rect.height / GRID_SIZE) - 1)

      setPosicoes((atual) => ({
        ...atual,
        [dragId]: {
          x: clamp(x, 1, cols),
          y: clamp(y, 1, rows),
        },
      }))
    }

    function parar() {
      setDragId(null)
    }

    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', parar)
    window.addEventListener('pointercancel', parar)

    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', parar)
      window.removeEventListener('pointercancel', parar)
    }
  }, [dragId])

  if (carregando) return <p>Carregando mesa da campanha...</p>
  if (erro) return <p>Erro ao carregar: {erro}</p>
  if (!mundo) return <p>Mesa não encontrada.</p>

  return (
    <div className="campaign-page">
      {erroAcao && (
        <div className="campaign-toast-erro">
          <span>{erroAcao}</span>
          <button type="button" onClick={() => setErroAcao(null)} aria-label="Fechar aviso">
            <IconeX className="icone-remover" />
          </button>
        </div>
      )}

      <div className="campaign-header">
        <div className="campaign-header-left">
          <p className="campaign-kicker">Campanha ativa</p>
          <h1>{mundo.nome}</h1>
        </div>

        <div className="campaign-header-actions">
          <Link to={`/mundo/${mundoId}`} className="campaign-back-button">← voltar</Link>

          {personagemAtual && (
            <div className="campaign-person-summary">
              <span className="campaign-person-label">Personagem em foco</span>
              <strong>{personagemAtual.nome}</strong>
              {perfilAtual === 'mestre' && (
                <button
                  type="button"
                  className="campaign-hud-toggle"
                  onClick={() => setHudOculto((atual) => !atual)}
                >
                  {hudOculto ? 'Mostrar' : 'Ocultar'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {!hudOculto && (
        <CharacterHud
          personagem={personagemAtual}
          barras={hudBarras}
          habilidades={hudHabilidades}
          atributos={hudAtributos}
          pericias={hudPericias}
          podeAlocarProficiencia={perfilAtual === 'mestre' || String(personagemAtual?.id) === String(personagemInicialDoAventureiro)}
          podeRemoverProficiencia={perfilAtual === 'mestre' || String(personagemAtual?.id) === String(personagemInicialDoAventureiro)}
          onAtribuirProficiencia={aoAtribuirProficienciaHud}
          onRemoverProficiencia={aoRemoverProficienciaHud}
        />
      )}

      <div className={`campaign-table-scene ${acaoPadraoExpandida || rolagemAtiva ? 'is-blurred' : ''}`}>
        <div className="campaign-master-strip" title={mundo.mestre}>
          <svg className="campaign-master-icon" viewBox="0 0 64 64" aria-hidden="true">
            <path d="M32 5v10M32 49v10M15 22h34M15 42h34M18 22l-8 10M46 22l8 10M18 42l-8-10M46 42l8-10M20 30h24M20 34h24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6"/>
            <path d="M32 16v32M24 22h16M24 42h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.6"/>
          </svg>
          <span className="campaign-master-name">{mundo.mestre}</span>
        </div>

        <div className="campaign-turn-actions">
          <div className="campaign-turn-actions__item campaign-turn-actions__item--toggle">
            <button
              type="button"
              className="campaign-turn-actions__button"
              onClick={() => setAcaoPadraoExpandida((atual) => !atual)}
            >
              <span className="campaign-turn-actions__label">Ação padrão</span>
              <strong>{acoesDisponiveis.padrao}</strong>
            </button>
          </div>

          <div className="campaign-turn-actions__item">
            <span className="campaign-turn-actions__label">Ação de movimento</span>
            <strong>{acoesDisponiveis.movimento}</strong>
          </div>
          <div className="campaign-turn-actions__item">
            <span className="campaign-turn-actions__label">Reação</span>
            <strong>{acoesDisponiveis.reacao}</strong>
          </div>
        </div>

        <div
          className={`campaign-map-surface ${habilidadeSelecionada ? 'is-targeting' : ''}`}
          ref={mesaRef}
          onContextMenu={(event) => {
            if (habilidadeSelecionada) {
              event.preventDefault()
              cancelarHabilidadeSelecionada()
              return
            }
            event.preventDefault()
          }}
        >
          <div className="campaign-map" />

          <svg
            className={`campaign-mapa-desenho ${desenhoAtivo ? 'is-ativo' : ''}`}
            onPointerDown={aoPressionarParaDesenhar}
            onPointerMove={aoMoverParaDesenhar}
            onPointerUp={aoSoltarParaDesenhar}
            onPointerLeave={aoSoltarParaDesenhar}
          >
            {desenhos.map((desenho) => (
              <polyline
                key={desenho.id}
                points={(desenho.pontos || []).map((ponto) => `${ponto.x},${ponto.y}`).join(' ')}
                fill="none"
                stroke={desenho.cor || '#000000'}
                strokeWidth={desenho.espessura || 3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {pontosAtuais.length > 1 && (
              <polyline
                points={pontosAtuais.map((ponto) => `${ponto.x},${ponto.y}`).join(' ')}
                fill="none"
                stroke="#000000"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
              />
            )}
          </svg>

          {personagens.map((personagem, indice) => {
            const pos = posicoes[personagem.id] || POSICOES[indice % POSICOES.length]
            const eSelecionado = personagemAtual && personagem.id === personagemAtual.id
            const permiteMover = perfilAtual === 'mestre' || String(personagem.id) === String(personagemInicialDoAventureiro)
            const posPx = {
              x: pos.x * GRID_SIZE + GRID_SIZE / 2,
              y: pos.y * GRID_SIZE + GRID_SIZE / 2,
            }
            const posSelecionadoAtual = personagemAtual ? posicoes[personagemAtual.id] : null
            const distancia = eSelecionado && posSelecionadoAtual ? distanciaEmMetros(pos, posSelecionadoAtual) : 0
            const barraVida = obterBarraVida(personagem.id)
            const percentualVida = barraVida?.valor_maximo
              ? clamp((Number(barraVida.valor_atual) / Number(barraVida.valor_maximo)) * 100, 0, 100)
              : null
            return (
              <div
                key={personagem.id}
                className="campaign-token"
                style={{ left: `${posPx.x}px`, top: `${posPx.y}px` }}
                title={`${personagem.nome}${distancia ? ` • ${distancia.toFixed(1)}m` : ''}`}
              >
                <span className="campaign-token__nome">{personagem.nome}</span>
                <button
                  type="button"
                  className={`campaign-seat ${habilidadeSelecionada ? 'is-targeting' : ''} ${eSelecionado ? 'is-selected' : ''} ${!permiteMover ? 'is-locked' : ''}`}
                  onPointerDown={(event) => {
                    if (!permiteMover) return
                    setDragId(personagem.id)
                    selecionarPersonagem(personagem)
                    event.preventDefault()
                  }}
                  onContextMenu={(event) => {
                    if (!habilidadeSelecionada) return
                    event.preventDefault()
                    event.stopPropagation()
                    cancelarHabilidadeSelecionada()
                    if (perfilAtual === 'aventureiro' && String(personagem.id) !== String(personagemInicialDoAventureiro)) {
                      return
                    }
                    selecionarPersonagem(personagem)
                  }}
                  onClick={() => {
                    if (perfilAtual === 'aventureiro' && String(personagem.id) !== String(personagemInicialDoAventureiro)) {
                      return
                    }
                    if (habilidadeSelecionada) return
                    selecionarPersonagem(personagem)
                  }}
                >
                  {personagem.imagem_url ? (
                    <img
                      src={personagem.imagem_url}
                      alt={personagem.nome}
                      className="campaign-seat-image"
                    />
                  ) : (
                    <span className="campaign-seat-fallback" aria-hidden="true">
                      {personagem.nome?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  )}
                </button>
                {percentualVida !== null && (
                  <div className="campaign-token__vida" title={`Vida: ${barraVida.valor_atual}/${barraVida.valor_maximo}`}>
                    <div className="campaign-token__vida-preenchimento" style={{ width: `${percentualVida}%` }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="campaign-ferramentas-menu">
        <div className="campaign-ferramentas-menu__moldura" aria-hidden="true" />
        <div className="campaign-ferramentas-menu__item campaign-ferramentas-menu__item--inventario">
          <button
            type="button"
            className={`campaign-floating-tool__button ${inventarioAberto ? 'is-ativo' : ''}`}
            aria-label="Abrir inventário"
            onClick={() => setInventarioAberto((atual) => !atual)}
          >
            <IconeMochila className="campaign-floating-tool__icone" />
          </button>

          {inventarioAberto && (
            <div className="campaign-dice-floating__panel campaign-floating-tool__panel">
              <InventoryPanel
                personagens={personagens}
                personagemPadraoId={personagemControladoPeloAventureiro?.id || ''}
                podeEscolherPersonagem={perfilAtual === 'mestre'}
              />
            </div>
          )}
        </div>

        {perfilAtual === 'aventureiro' && personagemControladoPeloAventureiro && (
          <div className="campaign-ferramentas-menu__item campaign-ferramentas-menu__item--anotacao">
            <button
              type="button"
              className={`campaign-floating-tool__button ${notasAberto ? 'is-ativo' : ''}`}
              aria-label="Abrir anotações"
              onClick={() => setNotasAberto((atual) => !atual)}
            >
              <IconeCaderno className="campaign-floating-tool__icone" />
            </button>

            {notasAberto && (
              <div className="campaign-dice-floating__panel campaign-floating-tool__panel">
                <NotepadPanel
                  personagem={personagemAtual}
                  aoMudarTexto={(personagemId, notas) => {
                    setPersonagemAtual((atual) => (
                      atual && String(atual.id) === String(personagemId) ? { ...atual, notas } : atual
                    ))
                    setPersonagens((atual) => atual.map((personagemItem) => (
                      String(personagemItem.id) === String(personagemId) ? { ...personagemItem, notas } : personagemItem
                    )))
                  }}
                />
              </div>
            )}
          </div>
        )}

        <div className="campaign-ferramentas-menu__item campaign-ferramentas-menu__item--desenho">
          <button
            type="button"
            className={`campaign-floating-tool__button ${desenhoAtivo ? 'is-ativo' : ''}`}
            aria-label="Desenhar no mapa"
            onClick={() => setDesenhoAtivo((atual) => !atual)}
          >
            <IconeLapis className="campaign-floating-tool__icone" />
          </button>

          {desenhoAtivo && perfilAtual === 'mestre' && (
            <button type="button" className="campaign-desenho-limpar" onClick={aoLimparDesenhos}>
              Limpar desenhos
            </button>
          )}
        </div>

        <div className="campaign-ferramentas-menu__item campaign-ferramentas-menu__item--dado">
          <button
            type="button"
            className={`campaign-floating-tool__button ${dadoAberto ? 'is-ativo' : ''}`}
            aria-label="Abrir rolagem de dados"
            onClick={() => setDadoAberto((atual) => !atual)}
          >
            <img
              src="/246569.png"
              alt="Dado de rolagem"
              className="campaign-floating-tool__icone campaign-floating-tool__icone--invertido"
            />
            {solicitacaoPendenteParaMim && <span className="campaign-dice-floating__badge" aria-hidden="true" />}
          </button>

          {dadoAberto && (
            <div className="campaign-dice-floating__panel">
              <div className="campaign-dice-floating__header-row">
                <div className="campaign-dice-floating__header">Rolagem</div>
                {perfilAtual === 'mestre' && (
                  <button
                    type="button"
                    className="campaign-dice-floating__solicitar-toggle"
                    onClick={() => setSolicitarAberto((atual) => !atual)}
                  >
                    Solicitar
                  </button>
                )}
              </div>

              {solicitarAberto && (
                <div className="campaign-dice-solicitar">
                  <label className="campaign-dice-solicitar__campo">
                    <span>Jogador</span>
                    <select
                      value={solicitarPersonagemId}
                      onChange={(event) => setSolicitarPersonagemId(event.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {personagens.map((personagem) => (
                        <option key={personagem.id} value={personagem.id}>{personagem.nome}</option>
                      ))}
                    </select>
                  </label>

                  <div className="campaign-dice-solicitar__tipos">
                    {TIPOS_SOLICITACAO_ROLAGEM.map((tipo) => (
                      <button
                        key={tipo.valor}
                        type="button"
                        className={`campaign-dice-solicitar__tipo-botao ${solicitarTipo === tipo.valor ? 'is-selecionado' : ''}`}
                        onClick={() => setSolicitarTipo(tipo.valor)}
                      >
                        {tipo.rotulo}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="campaign-dice-solicitar__enviar"
                    disabled={!solicitarPersonagemId || enviandoSolicitacao}
                    onClick={aoEnviarSolicitacaoRolagem}
                  >
                    {enviandoSolicitacao ? 'Enviando...' : 'Enviar solicitação'}
                  </button>
                </div>
              )}

              {perfilAtual === 'mestre' && solicitacoesRolagem.length > 0 && (
                <div className="campaign-dice-solicitacoes-lista">
                  {solicitacoesRolagem.slice(0, 5).map((solicitacao) => {
                    const personagemAlvo = personagens.find((item) => String(item.id) === String(solicitacao.personagem_id))
                    const info = infoTipoSolicitacao(solicitacao.tipo)
                    return (
                      <div key={solicitacao.id} className={`campaign-dice-solicitacoes-item is-${solicitacao.status}`}>
                        <span className="campaign-dice-solicitacoes-item__info">
                          <span className="campaign-dice-solicitacoes-item__nome">{personagemAlvo?.nome || '???'}</span>
                          <span className="campaign-dice-solicitacoes-item__tipo">{info?.rotulo || solicitacao.tipo}</span>
                        </span>
                        {solicitacao.status === 'pendente' && (
                          <span className="campaign-dice-solicitacoes-item__acoes">
                            <span className="campaign-dice-solicitacoes-item__status">Aguardando...</span>
                            <button
                              type="button"
                              className="campaign-dice-solicitacoes-item__cancelar"
                              title="Cancelar solicitação"
                              onClick={() => aoCancelarSolicitacaoRolagem(solicitacao.id)}
                            >
                              <IconeX className="icone-remover" />
                            </button>
                          </span>
                        )}
                        {solicitacao.status === 'concluida' && (
                          <span className="campaign-dice-solicitacoes-item__resultado">
                            {solicitacao.resultado_texto}: <strong>{solicitacao.resultado_total}</strong>
                          </span>
                        )}
                        {solicitacao.status === 'cancelada' && (
                          <span className="campaign-dice-solicitacoes-item__status">Cancelada</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {solicitacaoPendenteParaMim && solicitacaoAtivaId !== solicitacaoPendenteParaMim.id && (
                <div className="campaign-dice-solicitacao-pendente">
                  <span>O Mestre pediu: <strong>{infoTipoSolicitacao(solicitacaoPendenteParaMim.tipo)?.rotulo}</strong></span>
                  <button
                    type="button"
                    onClick={() => aoAceitarSolicitacaoRolagem(solicitacaoPendenteParaMim)}
                  >
                    Preencher
                  </button>
                </div>
              )}

              <input
                type="text"
                value={dadoInput}
                onChange={(event) => setDadoInput(event.target.value)}
                className="campaign-dice-floating__input"
                placeholder="Ex: 2d10+20+30+1d10+6"
                aria-label="Rolar dado"
              />

              <div className="campaign-dice-floating__quick">
                {[ '1d20', '2d20', '1d10', '2d10', '1d8', '3d6' ].map((valor) => (
                  <button
                    key={valor}
                    type="button"
                    className="campaign-dice-floating__quick-button"
                    onClick={() => setDadoInput(valor)}
                  >
                    {valor}
                  </button>
                ))}
              </div>

              <DiceIdlePreview formula={dadoInput} />

              {solicitacaoAtivaId && (
                <div className="campaign-dice-solicitacao-ativa">Essa rolagem será enviada ao Mestre.</div>
              )}

              <button
                type="button"
                className="campaign-dice-floating__roll"
                onClick={rolarDadosPersonalizados}
                disabled={enviandoRolagem || !!rolagemAtiva}
              >
                {enviandoRolagem || rolagemAtiva ? 'Rolando...' : 'Rolar'}
              </button>
            </div>
          )}
        </div>
        </div>

        {acaoPadraoExpandida && (
          <div className="campaign-action-modal" role="dialog" aria-modal="true" aria-label="Ações padrão">
            <div className="campaign-action-modal__header">
              <span>Ação padrão</span>
              <button
                type="button"
                className="campaign-action-modal__close"
                aria-label="Fechar ação padrão"
                onClick={cancelarAcaoPadrao}
              >
                ×
              </button>
            </div>

            <div className="campaign-turn-actions__list">
              {hudHabilidades.length > 0 ? (
                hudHabilidades.map((habilidade) => (
                  <button
                    key={habilidade.id || `${habilidade.nome}-${habilidade.descricao}`}
                    type="button"
                    className={`campaign-turn-actions__ability ${habilidadeSelecionada?.id === habilidade.id ? 'is-selected' : ''}`}
                    onClick={() => {
                      setHabilidadeSelecionada(habilidade)
                      setAcaoPadraoExpandida(false)
                    }}
                  >
                    {habilidade.nome}
                  </button>
                ))
              ) : (
                <span className="campaign-turn-actions__empty">Nenhuma habilidade cadastrada.</span>
              )}
            </div>
          </div>
        )}

        {rolagemAtiva && (
          <DiceRoller3D
            key={rolagemAtiva.id}
            rolagem={rolagemAtiva}
            onFechar={() => setRolagemAtiva(null)}
          />
        )}
      </div>

      {confirmarFinalizarTurno && (
        <div className="campaign-confirmation-overlay" role="dialog" aria-modal="true" aria-label="Confirmar finalização de turno">
          <div className="campaign-confirmation-card">
            <p className="campaign-confirmation-card__title">Certeza que quer finalizar o turno?</p>
            <p className="campaign-confirmation-card__summary">
              Você ainda tem {acoesDisponiveis.padrao} ação{acoesDisponiveis.padrao === 1 ? '' : 's'} padrão, {acoesDisponiveis.movimento} ação{acoesDisponiveis.movimento === 1 ? '' : 's'} de movimento e {acoesDisponiveis.reacao} reação{acoesDisponiveis.reacao === 1 ? '' : 's'}.
            </p>
            <div className="campaign-confirmation-card__actions">
              <button type="button" className="campaign-confirmation-card__confirm" onClick={finalizarTurno}>
                Finalizar
              </button>
              <button type="button" className="campaign-confirmation-card__cancel" onClick={() => setConfirmarFinalizarTurno(false)}>
                Não
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="campaign-turn-controls">
        <div className="campaign-dice-history">
          <div className="campaign-dice-history__header">Histórico de dados</div>
          {historicoDados.length > 0 ? (
            <ul className="campaign-dice-history__list" ref={historicoDadosListaRef}>
              {historicoDados.map((registro, indice) => (
                <li key={`${registro.nome}-${registro.texto}-${registro.resultado}-${indice}`} className="campaign-dice-history__item">
                  <span className="campaign-dice-history__name">{registro.nome}:</span>
                  <span className="campaign-dice-history__roll"> {registro.texto}</span>
                  <span className="campaign-dice-history__result">. Resultado: {registro.resultado}</span>
                  {registro.termos && registro.termos.length > 1 && (
                    <span className="campaign-dice-history__detail"> ({formatarDetalhamentoDados(registro.termos)})</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <span className="campaign-dice-history__empty">Nenhuma rolagem registrada.</span>
          )}
        </div>

        <div className="campaign-turn-order">
          <div className="campaign-turn-order__list">
            {ordemTurnos.map((idPersonagem) => {
              const personagem = personagens.find((item) => String(item.id) === String(idPersonagem))
              if (!personagem) return null
              const eAtual = String(idPersonagem) === String(turnoAtualId)
              return (
                <div
                  key={personagem.id}
                  className={`campaign-turn-order__item ${eAtual ? 'is-current' : ''}`}
                  draggable={perfilAtual === 'mestre'}
                  onDragStart={() => {
                    if (perfilAtual !== 'mestre') return
                    setDraggedTurnId(String(personagem.id))
                  }}
                  onDragOver={(event) => {
                    if (perfilAtual !== 'mestre') return
                    event.preventDefault()
                  }}
                  onDrop={() => {
                    if (perfilAtual !== 'mestre') return
                    if (!draggedTurnId || String(draggedTurnId) === String(personagem.id)) return
                    setOrdemTurnos((atual) => {
                      const proximo = [...atual]
                      const origem = proximo.indexOf(String(draggedTurnId))
                      const destino = proximo.indexOf(String(personagem.id))
                      if (origem < 0 || destino < 0) return atual
                      const [item] = proximo.splice(origem, 1)
                      proximo.splice(destino, 0, item)
                      return proximo
                    })
                    setDraggedTurnId(null)
                  }}
                  onDragEnd={() => setDraggedTurnId(null)}
                >
                  <span className="campaign-turn-order__name">{personagem.nome}</span>
                  {idPersonagem !== ordemTurnos[ordemTurnos.length - 1] && <span className="campaign-turn-order__separator">→</span>}
                </div>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          className="campaign-end-turn-button"
          onClick={() => {
            if (deveConfirmarFinalizarTurno) {
              setConfirmarFinalizarTurno(true)
              return
            }
            finalizarTurno()
          }}
          disabled={!podeFinalizarTurno}
        >
          Finalizar turno
        </button>
      </div>
    </div>
  )
}
