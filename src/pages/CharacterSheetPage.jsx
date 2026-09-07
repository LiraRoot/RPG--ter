import { useEffect, useState, useCallback } from 'react'
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
  listarHabilidades,
  adicionarHabilidade,
  atualizarHabilidade,
  removerHabilidade,
  escutarMudancasPersonagem,
} from '../lib/api'
import AttributeList from '../components/AttributeList'
import StatusBarList from '../components/StatusBarList'
import AbilityList from '../components/AbilityList'

export default function CharacterSheetPage() {
  const { id } = useParams()
  const navegar = useNavigate()

  const [personagem, setPersonagem] = useState(null)
  const [atributos, setAtributos] = useState([])
  const [barras, setBarras] = useState([])
  const [habilidades, setHabilidades] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  const carregarTudo = useCallback(async () => {
    try {
      const [p, a, b, h] = await Promise.all([
        buscarPersonagem(id),
        listarAtributos(id),
        listarBarras(id),
        listarHabilidades(id),
      ])
      setPersonagem(p)
      setAtributos(a)
      setBarras(b)
      setHabilidades(h)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    carregarTudo()
    const pararDeEscutar = escutarMudancasPersonagem(id, carregarTudo)
    return pararDeEscutar
  }, [id, carregarTudo])

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

  if (carregando) return <p>Carregando ficha...</p>
  if (erro) return <p>Erro ao carregar: {erro}</p>
  if (!personagem) return <p>Personagem não encontrado.</p>

  return (
    <div>
      <Link to="/" className="link-voltar">
        ← voltar para a lista
      </Link>

      <section className="cabecalho-ficha">
        <div className="imagem-ficha-container">
          {personagem.imagem_url ? (
            <img src={personagem.imagem_url} alt={personagem.nome} className="imagem-ficha" />
          ) : (
            <div className="imagem-ficha imagem-vazia" />
          )}
          <input type="file" accept="image/*" onChange={aoTrocarImagem} />
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
        </div>
      </section>

      <StatusBarList
        barras={barras}
        onAdicionar={(nome) => adicionarBarra(id, nome).then(carregarTudo)}
        onAtualizar={(barraId, campos) => atualizarBarra(barraId, campos).then(carregarTudo)}
        onRemover={(barraId) => removerBarra(barraId).then(carregarTudo)}
      />

      <AttributeList
        atributos={atributos}
        onAdicionar={(nome) => adicionarAtributo(id, nome).then(carregarTudo)}
        onAtualizar={(attrId, campos) => atualizarAtributo(attrId, campos).then(carregarTudo)}
        onRemover={(attrId) => removerAtributo(attrId).then(carregarTudo)}
      />

      <AbilityList
        habilidades={habilidades}
        onAdicionar={() => adicionarHabilidade(id).then(carregarTudo)}
        onAtualizar={(habId, campos) => atualizarHabilidade(habId, campos).then(carregarTudo)}
        onRemover={(habId) => removerHabilidade(habId).then(carregarTudo)}
      />

      <button className="botao-perigo" onClick={aoExcluirPersonagem}>
        excluir personagem
      </button>
    </div>
  )
}
