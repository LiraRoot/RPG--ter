import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { buscarMundo, listarPersonagens, escutarMudancasListaPersonagens } from '../lib/api'

const PERFIL_KEY = 'rpg-perfil-atual'
const PERSONAGEM_SELECIONADO_KEY = 'rpg-personagem-selecionado'

export default function CharacterListPage() {
  const { mundoId } = useParams()
  const navegar = useNavigate()
  const [mundo, setMundo] = useState(null)
  const [personagens, setPersonagens] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [personagemSelecionado, setPersonagemSelecionado] = useState(() => {
    try {
      return window.sessionStorage.getItem(PERSONAGEM_SELECIONADO_KEY) || ''
    } catch {
      return ''
    }
  })

  const perfil = window.sessionStorage.getItem(PERFIL_KEY)
  const podeEditarPersonagens = perfil === 'aventureiro' || perfil === 'mestre'

  useEffect(() => {
    carregar()
    const pararDeEscutar = escutarMudancasListaPersonagens(carregar, mundoId || null)
    return pararDeEscutar
  }, [mundoId])

  async function carregar() {
    try {
      if (mundoId) {
        const mundoAtual = await buscarMundo(mundoId)
        setMundo(mundoAtual)
      } else {
        setMundo(null)
      }

      const dados = await listarPersonagens(mundoId || null)
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
        <div>
          {mundo && (
            <>
              <Link to="/" className="link-voltar">← voltar para mundos</Link>
              <h1>{mundo.nome}</h1>
              <p>Mestre: {mundo.mestre}</p>
            </>
          )}
          {!mundo && <h1>Personagens</h1>}
        </div>

        <Link to={mundo ? `/mundo/${mundo.id}/novo` : '/novo'} className="botao-principal">
          + criar personagem
        </Link>
      </div>

      {personagens.length === 0 && (
        <p>{mundo ? 'Nenhum personagem neste mundo ainda.' : 'Nenhum personagem criado ainda.'}</p>
      )}

      <div className="grade-personagens">
        {personagens.map((p) => {
          const estaSelecionado = personagemSelecionado === String(p.id)

          function aoSelecionar() {
            setPersonagemSelecionado(String(p.id))
            try {
              window.sessionStorage.setItem(PERSONAGEM_SELECIONADO_KEY, String(p.id))
            } catch {
              // ignora falha de storage
            }

            if (mundo?.campanha_ativa) {
              navegar(`/mundo/${mundoId}/mesa`)
            }
          }

          return (
            <div key={p.id} className={`card-personagem character-card ${estaSelecionado ? 'is-selected' : ''}`}>
              {podeEditarPersonagens && (
                <button
                  type="button"
                  className="character-edit-button"
                  aria-label={`Editar ${p.nome}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    navegar(`/personagem/${p.id}`)
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19.1 12.9a7.4 7.4 0 0 0 .1-.9c0-.3 0-.6-.1-.9l1.9-1.5-1.8-3.1-2.3.7a7.7 7.7 0 0 0-1.5-1L14.7 3h-5.4l-.7 2.2a7.7 7.7 0 0 0-1.5 1l-2.3-.7L3 9.6l1.9 1.5c-.1.3-.1.6-.1.9s0 .6.1.9L3 14.4l1.8 3.1 2.3-.7c.5.4 1 .8 1.5 1l.7 2.2h5.4l.7-2.2c.5-.2 1-.6 1.5-1l2.3.7 1.8-3.1-1.9-1.5ZM12 15.4A3.4 3.4 0 1 1 12 8.6a3.4 3.4 0 0 1 0 6.8Z" fill="currentColor" fillRule="evenodd"/>
                  </svg>
                </button>
              )}

              <button type="button" className="character-card-link" onClick={aoSelecionar}>
                {p.imagem_url ? (
                  <img src={p.imagem_url} alt={p.nome} className="imagem-card" />
                ) : (
                  <div className="imagem-card imagem-vazia" />
                )}
                <span className="nome-card">{p.nome}</span>
                <span className="genero-card">{p.genero}</span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
