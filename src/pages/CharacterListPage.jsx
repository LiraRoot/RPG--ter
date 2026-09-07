import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarPersonagens, escutarMudancasListaPersonagens } from '../lib/api'

export default function CharacterListPage() {
  const [personagens, setPersonagens] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    carregar()
    const pararDeEscutar = escutarMudancasListaPersonagens(carregar)
    return pararDeEscutar
  }, [])

  async function carregar() {
    try {
      const dados = await listarPersonagens()
      setPersonagens(dados)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  if (carregando) return <p>Carregando personagens...</p>
  if (erro) return <p>Erro ao carregar: {erro}</p>

  return (
    <div>
      <div className="cabecalho-lista">
        <h1>Personagens</h1>
        <Link to="/novo" className="botao-principal">
          + criar personagem
        </Link>
      </div>

      {personagens.length === 0 && <p>Nenhum personagem criado ainda.</p>}

      <div className="grade-personagens">
        {personagens.map((p) => (
          <Link to={`/personagem/${p.id}`} key={p.id} className="card-personagem">
            {p.imagem_url ? (
              <img src={p.imagem_url} alt={p.nome} className="imagem-card" />
            ) : (
              <div className="imagem-card imagem-vazia" />
            )}
            <span className="nome-card">{p.nome}</span>
            <span className="genero-card">{p.genero}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
