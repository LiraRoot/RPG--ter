import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IMAGEM_MUNDO_PADRAO, listarMundos, atualizarMundo } from '../lib/api'

const PERFIL_KEY = 'rpg-perfil-atual'
const MESTRE_ATUAL_KEY = 'rpg-mestre-atual'

export default function WorldListPage() {
  const [mundos, setMundos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  const perfil = window.sessionStorage.getItem(PERFIL_KEY)
  const mestreAtual = window.sessionStorage.getItem(MESTRE_ATUAL_KEY) || ''
  const ehMestre = perfil === 'mestre' && !!mestreAtual.trim()

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    try {
      const dados = await listarMundos()
      setMundos(dados)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  async function alternarCampanha(mundoId, campanhaAtiva) {
    try {
      await atualizarMundo(mundoId, { campanha_ativa: !campanhaAtiva })
      await carregar()
    } catch (e) {
      setErro(e.message)
    }
  }

  if (carregando) return <p>Carregando mundos...</p>
  if (erro) return <p>Erro ao carregar: {erro}</p>

  return (
    <div>
      <div className="cabecalho-lista">
        <h1>Mundos</h1>
        {ehMestre && (
          <Link to="/mundos/novo" className="botao-principal">
            + criar mundo
          </Link>
        )}
      </div>

      {mundos.length === 0 && <p>Nenhum mundo criado ainda.</p>}

      <div className="grade-personagens">
        {mundos.map((mundo) => {
          const podeEditar = ehMestre && mundo.mestre === mestreAtual
          const campanhaAtiva = Boolean(mundo.campanha_ativa)

          return (
            <div key={mundo.id} className="card-personagem world-card">
              {podeEditar && (
                <Link
                  to={`/mundos/${mundo.id}/editar`}
                  className="world-edit-button"
                  aria-label={`Editar ${mundo.nome}`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19.1 12.9a7.4 7.4 0 0 0 .1-.9c0-.3 0-.6-.1-.9l1.9-1.5-1.8-3.1-2.3.7a7.7 7.7 0 0 0-1.5-1L14.7 3h-5.4l-.7 2.2a7.7 7.7 0 0 0-1.5 1l-2.3-.7L3 9.6l1.9 1.5c-.1.3-.1.6-.1.9s0 .6.1.9L3 14.4l1.8 3.1 2.3-.7c.5.4 1 .8 1.5 1l.7 2.2h5.4l.7-2.2c.5-.2 1-.6 1.5-1l2.3.7 1.8-3.1-1.9-1.5ZM12 15.4A3.4 3.4 0 1 1 12 8.6a3.4 3.4 0 0 1 0 6.8Z" fill="currentColor" fillRule="evenodd"/>
                  </svg>
                </Link>
              )}

              {campanhaAtiva && (
                <span className="world-campaign-bell" aria-label="Campanha ativa">🔔</span>
              )}

              <Link to={`/mundo/${mundo.id}`} className="world-card-link">
                {mundo.imagem_url || IMAGEM_MUNDO_PADRAO ? (
                  <img src={mundo.imagem_url || IMAGEM_MUNDO_PADRAO} alt={mundo.nome} className="imagem-card" />
                ) : (
                  <div className="imagem-card imagem-vazia" />
                )}
                <span className="nome-card">{mundo.nome}</span>
                <span className="genero-card">Mestre: {mundo.mestre}</span>
              </Link>

              {podeEditar && (
                <button
                  type="button"
                  className="world-campaign-toggle"
                  onClick={() => alternarCampanha(mundo.id, campanhaAtiva)}
                >
                  {campanhaAtiva ? 'Encerrar campanha' : 'Iniciar campanha'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
