import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ATRIBUTOS_PADRAO, BARRAS_PADRAO, PERICIAS_PADRAO, calcularValorPericia, criarPersonagem, enviarImagemPersonagem } from '../lib/api'
import AttributeList from '../components/AttributeList'

function criarEstadoPadraoAtributos() {
  return ATRIBUTOS_PADRAO.map((nome) => ({ id: crypto.randomUUID(), nome, valor: 0 }))
}

function criarEstadoPadraoBarras() {
  return BARRAS_PADRAO.map((barra) => ({
    nome: barra.nome,
    valor_atual: barra.valor_atual,
    valor_maximo: barra.valor_maximo,
  }))
}

function criarEstadoPadraoPericias() {
  return Object.entries(PERICIAS_PADRAO).flatMap(([atributo, nomes]) =>
    nomes.map((nome) => ({ id: crypto.randomUUID(), atributo, nome, valor: 0, proficiente: false }))
  )
}

const PONTOS_PROFICIENCIA_INICIAIS = 2

export default function CreateCharacterPage() {
  const [nome, setNome] = useState('')
  const [genero, setGenero] = useState('Elu')
  const [nivel, setNivel] = useState(1)
  const [arquivoImagem, setArquivoImagem] = useState(null)
  const [previewImagem, setPreviewImagem] = useState('')
  const [atributos, setAtributos] = useState(criarEstadoPadraoAtributos())
  const [barras, setBarras] = useState(criarEstadoPadraoBarras())
  const [pericias, setPericias] = useState(criarEstadoPadraoPericias())
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const { mundoId } = useParams()
  const navegar = useNavigate()

  function atualizarAtributo(id, campos) {
    setAtributos((prev) => prev.map((item) => item.id === id ? { ...item, ...campos } : item))
  }

  function adicionarAtributo(nome) {
    setAtributos((prev) => [...prev, { id: crypto.randomUUID(), nome: nome || `Novo atributo ${prev.length + 1}`, valor: 0 }])
  }

  function removerAtributo(id) {
    setAtributos((prev) => prev.filter((item) => item.id !== id))
  }

  function atualizarBarra(index, campo, valor) {
    setBarras((prev) => prev.map((item, i) => i === index ? { ...item, [campo]: valor } : item))
  }

  function adicionarBarra() {
    setBarras((prev) => [...prev, { nome: `Nova barra ${prev.length + 1}`, valor_atual: 100, valor_maximo: 100 }])
  }

  function removerBarra(index) {
    setBarras((prev) => prev.filter((_, i) => i !== index))
  }

  function adicionarPericiaParaAtributo(atributo, nome) {
    setPericias((prev) => [...prev, { id: crypto.randomUUID(), atributo, nome: nome || 'Nova perícia', valor: 0, proficiente: false }])
  }

  function atualizarPericia(id, campos) {
    setPericias((prev) => prev.map((item) => item.id === id ? { ...item, ...campos } : item))
  }

  function obterValorPericiaAtual(atributoNome) {
    const atributo = atributos.find((item) => item.nome === atributoNome)
    return calcularValorPericia(atributo?.valor ?? 0)
  }

  function removerPericia(id) {
    setPericias((prev) => prev.filter((item) => item.id !== id))
  }

  const pontosProficienciaDisponiveis = PONTOS_PROFICIENCIA_INICIAIS - pericias.filter((pericia) => pericia.proficiente).length

  function atribuirProficiencia(id) {
    setPericias((prev) => {
      const alvo = prev.find((item) => item.id === id)
      if (!alvo || alvo.proficiente || pontosProficienciaDisponiveis <= 0) return prev
      return prev.map((item) => item.id === id ? { ...item, proficiente: true } : item)
    })
  }

  function removerProficiencia(id) {
    setPericias((prev) => prev.map((item) => item.id === id ? { ...item, proficiente: false } : item))
  }

  async function aoSalvar(e) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      let imagem_url = null
      if (arquivoImagem) {
        imagem_url = await enviarImagemPersonagem(arquivoImagem)
      }
      const periciasComValorCalculado = pericias.map((pericia) => ({
        ...pericia,
        valor: obterValorPericiaAtual(pericia.atributo),
      }))

      const personagem = await criarPersonagem({
        nome: nome || 'Sem nome',
        genero,
        imagem_url,
        nivel,
        mundo_id: mundoId || null,
        atributos,
        barras,
        pericias: periciasComValorCalculado,
        pontos_proficiencia: pontosProficienciaDisponiveis,
      })

      if (mundoId) {
        navegar(`/mundo/${mundoId}`)
        return
      }

      navegar(`/personagem/${personagem.id}`)
    } catch (e) {
      setErro(e.message)
      setEnviando(false)
    }
  }

  return (
    <div>
      <h1>Criar personagem</h1>
      <form onSubmit={aoSalvar} className="formulario formulario-criacao">
        <div className="criacao-cabecalho">
          <div className="criacao-foto-bloco">
            <label className="criacao-foto-frame criacao-foto-label" htmlFor="input-foto-personagem">
              {previewImagem ? (
                <img src={previewImagem} alt={nome || 'Preview do personagem'} className="criacao-foto" />
              ) : (
                <div className="criacao-foto-vazia">?</div>
              )}
            </label>
            <input
              id="input-foto-personagem"
              type="file"
              accept="image/*"
              className="input-foto-personagem-hidden"
              onChange={(e) => {
                const arquivo = e.target.files[0]
                setArquivoImagem(arquivo || null)
                setPreviewImagem(arquivo ? URL.createObjectURL(arquivo) : '')
              }}
            />
          </div>

          <div className="criacao-dados">
            <label className="campo-personagem">
              <span>Nome</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} required />
            </label>

            <label className="campo-personagem">
              <span>Gênero</span>
              <select value={genero} onChange={(e) => setGenero(e.target.value)}>
                <option value="Ele">Ele</option>
                <option value="Ela">Ela</option>
                <option value="Elu">Elu (não-binário)</option>
              </select>
            </label>

            <label className="campo-personagem">
              <span>Nível</span>
              <input
                type="number"
                min="1"
                value={nivel}
                onChange={(e) => setNivel(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
          </div>
        </div>

        <AttributeList
          atributos={atributos}
          pericias={pericias}
          onAdicionar={adicionarAtributo}
          onAdicionarPericia={adicionarPericiaParaAtributo}
          onAtualizar={atualizarAtributo}
          onAtualizarPericia={atualizarPericia}
          onRemover={removerAtributo}
          onRemoverPericia={removerPericia}
          pontosProficiencia={pontosProficienciaDisponiveis}
          podeRemoverProficiencia
          onAtribuirProficiencia={atribuirProficiencia}
          onRemoverProficiencia={removerProficiencia}
        />

        <section className="secao secao-criacao">
          <h2>Barras de status</h2>
          {barras.map((barra, index) => (
            <div key={`${barra.nome}-${index}`} className="criacao-linha">
              <input
                value={barra.nome}
                onChange={(e) => atualizarBarra(index, 'nome', e.target.value)}
              />
              <input
                type="number"
                value={barra.valor_atual}
                onChange={(e) => atualizarBarra(index, 'valor_atual', Number(e.target.value))}
              />
              <span>/</span>
              <input
                type="number"
                value={barra.valor_maximo}
                onChange={(e) => atualizarBarra(index, 'valor_maximo', Number(e.target.value))}
              />
              <button type="button" className="botao-remover" onClick={() => removerBarra(index)}>
                remover
              </button>
            </div>
          ))}
          <button type="button" onClick={adicionarBarra}>+ barra</button>
        </section>

        {erro && <p className="mensagem-erro">Erro: {erro}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'salvando...' : 'criar personagem'}
        </button>
      </form>
    </div>
  )
}
