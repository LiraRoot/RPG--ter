import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { buscarMundo, listarAtributos, listarBarras, listarHabilidades, listarPericias, listarPersonagens } from '../lib/api'

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

function CharacterHud({ personagem, barras = [], habilidades = [], pericias = [], atributos = [] }) {
  if (!personagem) return null

  const [atributosExpandidos, setAtributosExpandidos] = useState({})
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
          <div className="character-hud__pericias-header">Perícias</div>
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
                      <span className="character-hud__atributo-toggle__nivel">Nível {nivelAtributo}</span>
                    </span>
                    <span className={`character-hud__atributo-toggle__arrow ${expandido ? 'is-open' : ''}`}>▾</span>
                  </button>

                  {expandido && (
                    <div className="character-hud__pericia-list">
                      {periciasDoAtributo.map((pericia) => (
                        <div key={pericia.id || `${pericia.atributo}-${pericia.nome}`} className="character-hud__pericia">
                          <span className="character-hud__pericia-nome">{pericia.nome}</span>
                          <span className="character-hud__pericia-valor">Nível {Number(pericia.valor ?? 0)}</span>
                        </div>
                      ))}
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
  const [posicoes, setPosicoes] = useState({})
  const [dragId, setDragId] = useState(null)
  const [hudBarras, setHudBarras] = useState([])
  const [hudHabilidades, setHudHabilidades] = useState([])
  const [hudAtributos, setHudAtributos] = useState([])
  const [hudPericias, setHudPericias] = useState([])
  const [acaoPadraoExpandida, setAcaoPadraoExpandida] = useState(false)
  const [habilidadeSelecionada, setHabilidadeSelecionada] = useState(null)
  const [confirmarFinalizarTurno, setConfirmarFinalizarTurno] = useState(false)
  const [dadoAberto, setDadoAberto] = useState(false)
  const [dadoInput, setDadoInput] = useState('1d20')
  const [dadoUltimoResultado, setDadoUltimoResultado] = useState(null)
  const [dadoAnimando, setDadoAnimando] = useState(false)
  const [historicoDados, setHistoricoDados] = useState([])
  const historicoDadosListaRef = useRef(null)

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
  const turnoAtual = personagens.find((personagem) => String(personagem.id) === String(turnoAtualId)) || personagens[0] || null
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

  function cancelarAcaoPadrao() {
    setAcaoPadraoExpandida(false)
    setHabilidadeSelecionada(null)
  }

  function cancelarHabilidadeSelecionada() {
    setHabilidadeSelecionada(null)
    setAcaoPadraoExpandida(false)
  }

  function analisarExpressaoDados(expressaoBruta) {
    const expressao = String(expressaoBruta || '').trim().toLowerCase().replace(/\s+/g, '')
    if (!expressao) return null

    const partes = expressao.split('+').filter((parte) => parte.length > 0)
    if (!partes.length || partes.length > 10) return null

    const termos = []
    for (const parte of partes) {
      const dadoMatch = /^(\d*)d([1-9]\d*)$/.exec(parte)
      if (dadoMatch) {
        const qtd = Math.min(20, Math.max(1, Number(dadoMatch[1] || '1')))
        const lados = Math.min(100, Math.max(2, Number(dadoMatch[2])))
        termos.push({ tipo: 'dado', qtd, lados })
        continue
      }

      const numeroMatch = /^\d+$/.exec(parte)
      if (numeroMatch) {
        termos.push({ tipo: 'numero', valor: Math.min(1000, Number(parte)) })
        continue
      }

      return null
    }

    if (!termos.some((termo) => termo.tipo === 'dado')) return null

    return termos
  }

  function rolarTermos(termos) {
    let total = 0
    const resultados = []
    const termosResolvidos = termos.map((termo) => {
      if (termo.tipo === 'dado') {
        const valores = Array.from({ length: termo.qtd }, () => Math.floor(Math.random() * termo.lados) + 1)
        valores.forEach((valor) => resultados.push(valor))
        total += valores.reduce((soma, valor) => soma + valor, 0)
        return { ...termo, valores }
      }
      total += termo.valor
      return termo
    })
    return { total, resultados, termosResolvidos }
  }

  function formatarExpressaoDados(termos) {
    return termos.map((termo) => (termo.tipo === 'dado' ? `${termo.qtd}d${termo.lados}` : `${termo.valor}`)).join('+')
  }

  function formatarDetalhamentoDados(termosResolvidos) {
    return (termosResolvidos || [])
      .map((termo) => (termo.tipo === 'dado' ? `[${termo.valores.join(', ')}]` : `+${termo.valor}`))
      .join(' ')
  }

  function rolarDadosPersonalizados() {
    const termos = analisarExpressaoDados(dadoInput)
    if (!termos || dadoAnimando) return

    const textoExpressao = formatarExpressaoDados(termos)

    setDadoAnimando(true)
    const parcial = rolarTermos(termos)
    setDadoUltimoResultado({
      texto: textoExpressao,
      total: parcial.total,
      resultados: parcial.resultados,
      termos: parcial.termosResolvidos,
    })

    window.setTimeout(() => {
      const final = rolarTermos(termos)
      const nomeJogador = personagemAtual?.nome || 'Mestre'

      setDadoUltimoResultado({
        texto: textoExpressao,
        total: final.total,
        resultados: final.resultados,
        termos: final.termosResolvidos,
      })
      setHistoricoDados((atual) => [...atual, {
        nome: nomeJogador,
        texto: textoExpressao,
        resultado: final.total,
        dados: final.resultados,
        termos: final.termosResolvidos,
      }].slice(-50))
      setDadoAnimando(false)
    }, 850)
  }

  function consumirHabilidadeEmAlvo(personagemAlvo) {
    if (!habilidadeSelecionada || !personagemAlvo) return
    if (perfilAtual === 'aventureiro' && String(personagemAlvo.id) !== String(personagemInicialDoAventureiro)) {
      cancelarHabilidadeSelecionada()
      return
    }
    cancelarHabilidadeSelecionada()
  }

  useEffect(() => {
    const lista = historicoDadosListaRef.current
    if (!lista) return
    lista.scrollTop = lista.scrollHeight
  }, [historicoDados])

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
      } catch {
        setHudBarras([])
        setHudHabilidades([])
        setHudAtributos([])
        setHudPericias([])
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

      <CharacterHud personagem={personagemAtual} barras={hudBarras} habilidades={hudHabilidades} atributos={hudAtributos} pericias={hudPericias} />

      <div className={`campaign-table-scene ${acaoPadraoExpandida ? 'is-blurred' : ''}`}>
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

          <div className="campaign-dice-floating">
            <button
              type="button"
              className="campaign-dice-floating__button"
              aria-label="Abrir rolagem de dados"
              onClick={() => setDadoAberto((atual) => !atual)}
            >
              <img src="/246569.png" alt="Dado de rolagem" className="campaign-dice-floating__image" />
            </button>

            {dadoAberto && (
              <div className="campaign-dice-floating__panel">
                <div className="campaign-dice-floating__header">Rolagem</div>
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

                <button
                  type="button"
                  className="campaign-dice-floating__roll"
                  onClick={rolarDadosPersonalizados}
                  disabled={dadoAnimando}
                >
                  {dadoAnimando ? 'Rolando...' : 'Rolar'}
                </button>

                <div className={`campaign-dice-floating__tray ${dadoAnimando ? 'is-rolling' : ''}`}>
                  {(dadoUltimoResultado?.resultados || []).map((valor, indice) => (
                    <div
                      key={`${dadoUltimoResultado?.texto || 'dado'}-${indice}-${valor}-${dadoAnimando ? 'anim' : 'final'}`}
                      className={`campaign-dice-floating__die ${dadoAnimando ? 'is-falling' : 'is-landed'}`}
                      style={{ animationDelay: `${indice * 80}ms` }}
                    >
                      <span>{valor}</span>
                    </div>
                  ))}
                </div>

                {dadoUltimoResultado && (
                  <div className="campaign-dice-floating__result">
                    <span className="campaign-dice-floating__result-label">{dadoUltimoResultado.texto}</span>
                    <strong>{dadoUltimoResultado.total}</strong>
                    <small>{formatarDetalhamentoDados(dadoUltimoResultado.termos)}</small>
                  </div>
                )}
              </div>
            )}
          </div>

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
                className={`campaign-seat ${habilidadeSelecionada ? 'is-targeting' : ''} ${eSelecionado ? 'is-selected' : ''} ${!permiteMover ? 'is-locked' : ''}`}
                style={{ left: `${posPx.x}px`, top: `${posPx.y}px` }}
                title={`${personagem.nome}${distancia ? ` • ${distancia.toFixed(1)}m` : ''}`}
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
            )
          })}
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
