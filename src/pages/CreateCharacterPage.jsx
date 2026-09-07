import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ATRIBUTOS_PADRAO, BARRAS_PADRAO, PERICIAS_PADRAO, calcularValorPericia, criarPersonagem, enviarImagemPersonagem } from '../lib/api'

function criarEstadoPadraoAtributos() {
  return ATRIBUTOS_PADRAO.map((nome) => ({ nome, valor: 0 }))
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
    nomes.map((nome) => ({ atributo, nome, valor: 0 }))
  )
}

export default function CreateCharacterPage() {
  const [nome, setNome] = useState('')
  const [genero, setGenero] = useState('Elu')
  const [nivel, setNivel] = useState(1)
  const [arquivoImagem, setArquivoImagem] = useState(null)
  const [atributos, setAtributos] = useState(criarEstadoPadraoAtributos())
  const [barras, setBarras] = useState(criarEstadoPadraoBarras())
  const [pericias, setPericias] = useState(criarEstadoPadraoPericias())
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const { mundoId } = useParams()
  const navegar = useNavigate()

  function atualizarAtributo(index, campo, valor) {
    setAtributos((prev) => prev.map((item, i) => i === index ? { ...item, [campo]: valor } : item))
  }

  function adicionarAtributo() {
    setAtributos((prev) => [...prev, { nome: `Novo atributo ${prev.length + 1}`, valor: 0 }])
  }

  function removerAtributo(index) {
    setAtributos((prev) => prev.filter((_, i) => i !== index))
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

  function adicionarPericiaParaAtributo(atributo) {
    setPericias((prev) => [...prev, { atributo, nome: 'Nova perícia', valor: 0 }])
  }

  function atualizarPericia(index, campo, valor) {
    setPericias((prev) => prev.map((item, i) => i === index ? { ...item, [campo]: valor } : item))
  }

  function obterValorPericiaAtual(atributoNome) {
    const atributo = atributos.find((item) => item.nome === atributoNome)
    return calcularValorPericia(atributo?.valor ?? 0)
  }

  function removerPericia(index) {
    setPericias((prev) => prev.filter((_, i) => i !== index))
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
        <label>
          Nome
          <input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </label>

        <label>
          Gênero
          <select value={genero} onChange={(e) => setGenero(e.target.value)}>
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
            value={nivel}
            onChange={(e) => setNivel(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>

        <label>
          Imagem do personagem
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setArquivoImagem(e.target.files[0])}
          />
        </label>

        <section className="secao secao-criacao">
          <h2>Atributos</h2>
          {atributos.map((atributo, index) => {
            const periciasDoAtributo = pericias.filter((pericia) => pericia.atributo === atributo.nome)

            return (
              <div key={`${atributo.nome}-${index}`} className="criacao-atributo-bloco">
                <div className="criacao-linha criacao-linha-principal">
                  <input
                    value={atributo.nome}
                    onChange={(e) => atualizarAtributo(index, 'nome', e.target.value)}
                  />
                  <input
                    type="number"
                    value={atributo.valor}
                    onChange={(e) => atualizarAtributo(index, 'valor', Number(e.target.value))}
                  />
                  <button type="button" className="botao-remover" onClick={() => removerAtributo(index)}>
                    remover
                  </button>
                </div>

                <div className="criacao-pericias">
                  {periciasDoAtributo.map((pericia, periciaIndex) => {
                    const realIndex = pericias.findIndex((item) => item === pericia)
                    return (
                      <div key={`${pericia.atributo}-${pericia.nome}-${periciaIndex}`} className="criacao-linha criacao-linha-pericia">
                        <input
                          value={pericia.nome}
                          onChange={(e) => atualizarPericia(realIndex, 'nome', e.target.value)}
                        />
                        <input
                          type="number"
                          value={obterValorPericiaAtual(atributo.nome)}
                          readOnly
                        />
                        <button type="button" className="botao-remover" onClick={() => removerPericia(realIndex)}>
                          remover
                        </button>
                      </div>
                    )
                  })}

                  <button type="button" className="botao-adicionar-pericia" onClick={() => adicionarPericiaParaAtributo(atributo.nome)}>
                    + perícia
                  </button>
                </div>
              </div>
            )
          })}
          <button type="button" onClick={adicionarAtributo}>+ atributo</button>
        </section>

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
