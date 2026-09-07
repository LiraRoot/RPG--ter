import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { buscarMundo, listarBarras, listarHabilidades, listarPersonagens } from '../lib/api'

const PERSONAGEM_SELECIONADO_KEY = 'rpg-personagem-selecionado'

const GRID_SIZE = 32

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

function CharacterHud({ personagem, barras = [], habilidades = [] }) {
  if (!personagem) return null

  const barrasHud = normalizarBarrasHud(barras)
  const slots = Array.from({ length: 4 }, (_, indice) => {
    const hab = habilidades[indice]
    if (!hab || !hab.nome || String(hab.nome).trim() === '') {
      return {
        id: `slot-vazio-${indice}`,
        nome: '?',
        descricao: 'Habilidade inexistente',
      }
    }

    return {
      ...hab,
      nome: hab.nome,
      descricao: hab.descricao || 'Habilidade inexistente',
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

        <div className="character-hud__level">Nível {personagem.nivel ?? 1}</div>
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
            title={habilidade.descricao || 'Habilidade inexistente'}
          >
            <span className="character-hud__ability-label">{habilidade.nome}</span>
            <span className="character-hud__ability-tooltip">{habilidade.descricao || 'Habilidade inexistente'}</span>
          </div>
        ))}
      </div>
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
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [posicoes, setPosicoes] = useState({})
  const [dragId, setDragId] = useState(null)
  const [hudBarras, setHudBarras] = useState([])
  const [hudHabilidades, setHudHabilidades] = useState([])

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

        const proximoPosicoes = {}
        dados.forEach((personagem, indice) => {
          const padrao = POSICOES[indice % POSICOES.length]
          proximoPosicoes[personagem.id] = { x: padrao.x, y: padrao.y }
        })
        setPosicoes(proximoPosicoes)

        const idSelecionado = window.sessionStorage.getItem(PERSONAGEM_SELECIONADO_KEY)
        const personagemSelecionado = dados.find((personagem) => String(personagem.id) === String(idSelecionado)) || dados[0] || null
        setPersonagemAtual(personagemSelecionado)
      } catch (e) {
        setErro(e.message)
      } finally {
        setCarregando(false)
      }
    }

    carregar()
  }, [mundoId, navegar])

  useEffect(() => {
    if (!personagemAtual?.id) {
      setHudBarras([])
      setHudHabilidades([])
      return undefined
    }

    async function carregarHud() {
      try {
        const [barras, habilidades] = await Promise.all([
          listarBarras(personagemAtual.id),
          listarHabilidades(personagemAtual.id),
        ])
        setHudBarras(barras)
        setHudHabilidades(habilidades)
      } catch {
        setHudBarras([])
        setHudHabilidades([])
      }
    }

    carregarHud()
    return undefined
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
            </div>
          )}
        </div>
      </div>

      <CharacterHud personagem={personagemAtual} barras={hudBarras} habilidades={hudHabilidades} />

      <div className="campaign-table-scene">
        <div className="campaign-master-strip" title={mundo.mestre}>
          <svg className="campaign-master-icon" viewBox="0 0 64 64" aria-hidden="true">
            <path d="M32 5v10M32 49v10M15 22h34M15 42h34M18 22l-8 10M46 22l8 10M18 42l-8-10M46 42l8-10M20 30h24M20 34h24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6"/>
            <path d="M32 16v32M24 22h16M24 42h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.6"/>
          </svg>
          <span className="campaign-master-name">{mundo.mestre}</span>
        </div>

        <div className="campaign-map-surface" ref={mesaRef}>
          <div className="campaign-map" />

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
            return (
              <button
                key={personagem.id}
                type="button"
                className={`campaign-seat ${eSelecionado ? 'is-selected' : ''} ${!permiteMover ? 'is-locked' : ''}`}
                style={{ left: `${posPx.x}px`, top: `${posPx.y}px` }}
                title={`${personagem.nome}${distancia ? ` • ${distancia.toFixed(1)}m` : ''}`}
                onPointerDown={(event) => {
                  if (!permiteMover) return
                  setDragId(personagem.id)
                  setPersonagemAtual(personagem)
                  try {
                    window.sessionStorage.setItem(PERSONAGEM_SELECIONADO_KEY, String(personagem.id))
                  } catch {
                    // ignora falha de storage
                  }
                  event.preventDefault()
                }}
                onClick={() => {
                  if (perfilAtual === 'aventureiro' && String(personagem.id) !== String(personagemInicialDoAventureiro)) {
                    return
                  }
                  setPersonagemAtual(personagem)
                  try {
                    window.sessionStorage.setItem(PERSONAGEM_SELECIONADO_KEY, String(personagem.id))
                  } catch {
                    // ignora falha de storage
                  }
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
            )
          })}
        </div>
      </div>
    </div>
  )
}
