import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  buscarPersonagem,
  atualizarPersonagem,
  excluirPersonagem,
  enviarImagemPersonagem,
  listarAtributos,
  adicionarAtributo,
  atualizarAtributo,
  removerAtributo,
  listarBarras,
  adicionarBarra,
  atualizarBarra,
  removerBarra,
  listarPericias,
  adicionarPericia,
  atualizarPericia,
  removerPericia,
  listarHabilidades,
  adicionarHabilidade,
  atualizarHabilidade,
  removerHabilidade,
  escutarMudancasPersonagem,
} from '../lib/api'

const PERFIL_KEY = 'rpg-perfil-atual'
import AttributeList from '../components/AttributeList'
import StatusBarList from '../components/StatusBarList'
import AbilityList from '../components/AbilityList'

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

function CharacterHud({ personagem, barras = [], habilidades = [] }) {
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
    </section>
  )
}

export default function CharacterSheetPage() {
  const { id } = useParams()
  const navegar = useNavigate()

  const [personagem, setPersonagem] = useState(null)
  const [atributos, setAtributos] = useState([])
  const [barras, setBarras] = useState([])
  const [pericias, setPericias] = useState([])
  const [habilidades, setHabilidades] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const timersEdicao = useRef({})
  const ignorarAtualizacaoRemota = useRef(false)

  useEffect(() => {
    const perfil = window.sessionStorage.getItem(PERFIL_KEY)
    if (perfil !== 'aventureiro' && perfil !== 'mestre') {
      navegar('/')
    }
  }, [navegar])

  const carregarTudo = useCallback(async () => {
    try {
      const [p, a, b, pe, h] = await Promise.all([
        buscarPersonagem(id),
        listarAtributos(id),
        listarBarras(id),
        listarPericias(id),
        listarHabilidades(id),
      ])
      setPersonagem(p)
      setAtributos(a)
      setBarras(b)
      setPericias(pe)
      setHabilidades(h)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    carregarTudo()
    const pararDeEscutar = escutarMudancasPersonagem(id, () => {
      if (ignorarAtualizacaoRemota.current) return
      carregarTudo()
    })
    return () => {
      Object.values(timersEdicao.current).forEach(clearTimeout)
      ignorarAtualizacaoRemota.current = false
      pararDeEscutar()
    }
  }, [id, carregarTudo])

  const atualizarListaLocal = useCallback((setLista, itemId, campos) => {
    setLista((prev) => prev.map((item) => item.id === itemId ? { ...item, ...campos } : item))
  }, [])

  const agendarAtualizacao = useCallback((chave, salvar) => {
    clearTimeout(timersEdicao.current[chave])
    ignorarAtualizacaoRemota.current = true
    timersEdicao.current[chave] = setTimeout(async () => {
      try {
        await salvar()
      } catch (e) {
        setErro(e.message)
      } finally {
        ignorarAtualizacaoRemota.current = false
      }
    }, 250)
  }, [])

  const limparZeroAoFocarNumero = useCallback((evento) => {
    if (evento.target.value === '0') {
      evento.target.value = ''
    }
  }, [])

  const aoAtualizarAtributo = useCallback((attrId, campos) => {
    const atributoAtual = atributos.find((item) => item.id === attrId)
    const valorNovo = Number(campos.valor ?? atributoAtual?.valor ?? 0)

    atualizarListaLocal(setAtributos, attrId, campos)

    if (campos.valor !== undefined && atributoAtual?.nome) {
      const novoValor = Number.isFinite(valorNovo) ? valorNovo : 0
      const valorPericia = calcularValorPericia(novoValor)

      setPericias((prev) => prev.map((pericia) =>
        pericia.atributo === atributoAtual.nome
          ? { ...pericia, valor: valorPericia }
          : pericia
      ))

      ;(pericias || [])
        .filter((pericia) => pericia.atributo === atributoAtual.nome)
        .forEach((pericia) => {
          agendarAtualizacao(`pericia-${pericia.id}`, () => atualizarPericia(pericia.id, { valor: valorPericia }))
        })
    }

    agendarAtualizacao(`atributo-${attrId}`, () => atualizarAtributo(attrId, campos))
  }, [agendarAtualizacao, atributos, atualizarListaLocal, pericias])

  const aoAtualizarBarra = useCallback((barraId, campos) => {
    atualizarListaLocal(setBarras, barraId, campos)
    agendarAtualizacao(`barra-${barraId}`, () => atualizarBarra(barraId, campos))
  }, [agendarAtualizacao, atualizarListaLocal])

  const normalizarNumeroInput = useCallback((valor) => {
    if (valor === '' || valor === null || valor === undefined) return 0
    const numero = Number(valor)
    return Number.isFinite(numero) ? numero : 0
  }, [])

  const aoAtualizarHabilidade = useCallback((habId, campos) => {
    atualizarListaLocal(setHabilidades, habId, campos)
    agendarAtualizacao(`habilidade-${habId}`, () => atualizarHabilidade(habId, campos))
  }, [agendarAtualizacao, atualizarListaLocal])

  const aoAtualizarPericia = useCallback((perId, campos) => {
    atualizarListaLocal(setPericias, perId, campos)
    agendarAtualizacao(`pericia-${perId}`, () => atualizarPericia(perId, campos))
  }, [agendarAtualizacao, atualizarListaLocal])

  const aoAtribuirProficiencia = useCallback(async (periciaId) => {
    const pontosAtuais = personagem?.pontos_proficiencia ?? 0
    const pericia = pericias.find((item) => item.id === periciaId)
    if (!pericia || pericia.proficiente || pontosAtuais <= 0) return

    const novosPontos = pontosAtuais - 1
    ignorarAtualizacaoRemota.current = true
    setPersonagem((atual) => ({ ...atual, pontos_proficiencia: novosPontos }))
    atualizarListaLocal(setPericias, periciaId, { proficiente: true })

    try {
      await Promise.all([
        atualizarPericia(periciaId, { proficiente: true }),
        atualizarPersonagem(id, { pontos_proficiencia: novosPontos }),
      ])
    } catch (e) {
      setErro(e.message)
    } finally {
      ignorarAtualizacaoRemota.current = false
    }
  }, [id, personagem, pericias, atualizarListaLocal])

  const aoRemoverProficiencia = useCallback(async (periciaId) => {
    const pericia = pericias.find((item) => item.id === periciaId)
    if (!pericia || !pericia.proficiente) return

    const novosPontos = (personagem?.pontos_proficiencia ?? 0) + 1
    ignorarAtualizacaoRemota.current = true
    setPersonagem((atual) => ({ ...atual, pontos_proficiencia: novosPontos }))
    atualizarListaLocal(setPericias, periciaId, { proficiente: false })

    try {
      await Promise.all([
        atualizarPericia(periciaId, { proficiente: false }),
        atualizarPersonagem(id, { pontos_proficiencia: novosPontos }),
      ])
    } catch (e) {
      setErro(e.message)
    } finally {
      ignorarAtualizacaoRemota.current = false
    }
  }, [id, personagem, pericias, atualizarListaLocal])

  async function aoTrocarImagem(e) {
    const arquivo = e.target.files[0]
    if (!arquivo) return
    const imagem_url = await enviarImagemPersonagem(arquivo)
    await atualizarPersonagem(id, { imagem_url })
    carregarTudo()
  }

  async function aoExcluirPersonagem() {
    if (!confirm(`Excluir ${personagem.nome} permanentemente?`)) return
    await excluirPersonagem(id)
    navegar('/')
  }

  const perfilAtual = window.sessionStorage.getItem(PERFIL_KEY)
  if (perfilAtual !== 'aventureiro' && perfilAtual !== 'mestre') return <p>Somente aventureiros e mestres podem editar personagens.</p>

  if (carregando) return <p>Carregando ficha...</p>
  if (erro) return <p>Erro ao carregar: {erro}</p>
  if (!personagem) return <p>Personagem não encontrado.</p>

  return (
    <div>
      <Link to={personagem.mundo_id ? `/mundo/${personagem.mundo_id}` : '/'} className="link-voltar">
        ← voltar para a lista
      </Link>

      <CharacterHud personagem={personagem} barras={barras} habilidades={habilidades} />

      <section className="cabecalho-ficha">
        <div className="imagem-ficha-container">
          <label className="imagem-ficha-frame imagem-ficha-label" htmlFor="input-foto-edicao">
            {personagem.imagem_url ? (
              <img src={personagem.imagem_url} alt={personagem.nome} className="imagem-ficha" />
            ) : (
              <div className="imagem-ficha imagem-vazia" />
            )}
          </label>
          <input
            id="input-foto-edicao"
            className="input-foto-personagem-hidden"
            type="file"
            accept="image/*"
            onChange={aoTrocarImagem}
          />
        </div>

        <div className="dados-ficha">
          <label>
            Nome
            <input
              className="input-titulo"
              value={personagem.nome}
              onChange={(e) => setPersonagem({ ...personagem, nome: e.target.value })}
              onBlur={(e) => atualizarPersonagem(id, { nome: e.target.value })}
            />
          </label>
          <label>
            Gênero
            <select
              value={personagem.genero}
              onChange={(e) => {
                setPersonagem({ ...personagem, genero: e.target.value })
                atualizarPersonagem(id, { genero: e.target.value })
              }}
            >
              <option value="Ele">Ele</option>
              <option value="Ela">Ela</option>
              <option value="Elu">Elu (não-binário)</option>
            </select>
          </label>
          <label>
            Nível
            <input
              type="number"
              min="1"
              value={personagem.nivel ?? 1}
              onFocus={limparZeroAoFocarNumero}
              onBlur={(e) => {
                if (e.target.value === '') e.target.value = '1'
                atualizarPersonagem(id, { nivel: Math.max(1, Number(e.target.value) || 1) })
              }}
              onChange={(e) => setPersonagem({ ...personagem, nivel: Math.max(1, Number(e.target.value) || 1) })}
            />
          </label>
        </div>
      </section>

      <StatusBarList
        barras={barras}
        onAdicionar={(nome) => adicionarBarra(id, nome).then(carregarTudo)}
        onAtualizar={aoAtualizarBarra}
        onRemover={(barraId) => removerBarra(barraId).then(carregarTudo)}
      />

      <AttributeList
        atributos={atributos}
        pericias={pericias}
        onAdicionar={(nome) => adicionarAtributo(id, nome).then(carregarTudo)}
        onAdicionarPericia={(atributo, nome) => adicionarPericia(id, atributo, nome).then(carregarTudo)}
        onAtualizar={aoAtualizarAtributo}
        onAtualizarPericia={aoAtualizarPericia}
        onRemover={(attrId) => removerAtributo(attrId).then(carregarTudo)}
        onRemoverPericia={(perId) => removerPericia(perId).then(carregarTudo)}
        pontosProficiencia={personagem.pontos_proficiencia ?? 0}
        podeRemoverProficiencia={perfilAtual === 'mestre'}
        onAtribuirProficiencia={aoAtribuirProficiencia}
        onRemoverProficiencia={aoRemoverProficiencia}
      />

      <AbilityList
        habilidades={habilidades}
        onAdicionar={() => adicionarHabilidade(id, 'ativa').then(carregarTudo)}
        onAdicionarPassiva={() => adicionarHabilidade(id, 'passiva').then(carregarTudo)}
        onAtualizar={aoAtualizarHabilidade}
        onRemover={(habId) => removerHabilidade(habId).then(carregarTudo)}
      />

      <button className="botao-perigo" onClick={aoExcluirPersonagem}>
        excluir personagem
      </button>
    </div>
  )
}
