import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { atualizarMundo, buscarMundo, enviarImagemMundo, IMAGEM_MUNDO_PADRAO } from '../lib/api'

const PERFIL_KEY = 'rpg-perfil-atual'
const MESTRE_ATUAL_KEY = 'rpg-mestre-atual'

export default function EditWorldPage() {
  const { mundoId } = useParams()
  const navegar = useNavigate()

  const [nome, setNome] = useState('')
  const [mestre, setMestre] = useState('')
  const [arquivoImagem, setArquivoImagem] = useState(null)
  const [imagemPreview, setImagemPreview] = useState(IMAGEM_MUNDO_PADRAO)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    const perfil = window.sessionStorage.getItem(PERFIL_KEY)
    const mestreAtual = (window.sessionStorage.getItem(MESTRE_ATUAL_KEY) || '').trim()

    if (perfil !== 'mestre' || !mestreAtual) {
      navegar('/')
      return
    }

    async function carregarMundo() {
      try {
        const mundo = await buscarMundo(mundoId)

        if (mundo.mestre !== mestreAtual) {
          navegar(`/mundo/${mundoId}`)
          return
        }

        setMestre(mestreAtual)
        setNome(mundo.nome || 'Novo mundo')
        setImagemPreview(mundo.imagem_url || IMAGEM_MUNDO_PADRAO)
      } catch (e) {
        setErro(e.message)
      } finally {
        setCarregando(false)
      }
    }

    carregarMundo()
  }, [mundoId, navegar])

  async function aoSalvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)

    try {
      const mestreAtual = (window.sessionStorage.getItem(MESTRE_ATUAL_KEY) || '').trim()
      const perfil = window.sessionStorage.getItem(PERFIL_KEY)

      if (perfil !== 'mestre' || !mestreAtual) {
        navegar('/')
        return
      }

      let imagem_url = imagemPreview || IMAGEM_MUNDO_PADRAO

      if (arquivoImagem) {
        imagem_url = await enviarImagemMundo(arquivoImagem)
      }

      await atualizarMundo(mundoId, {
        nome: nome || 'Novo mundo',
        mestre: mestreAtual,
        imagem_url,
      })

      navegar(`/mundo/${mundoId}`)
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <p>Carregando mundo...</p>

  return (
    <div className="edit-world-page">
      <Link to="/" className="link-voltar">← voltar</Link>

      <h1>Editar mundo</h1>

      <form onSubmit={aoSalvar} className="formulario edit-world-form">
        <label>
          Nome do mundo
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Reinos de Ishtar"
            required
          />
        </label>

        <label>
          Mestre
          <input value={mestre} readOnly />
        </label>

        <label>
          Imagem do mundo
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const arquivo = e.target.files[0]
              setArquivoImagem(arquivo || null)
              if (arquivo) {
                setImagemPreview(URL.createObjectURL(arquivo))
              }
            }}
          />
        </label>

        {(imagemPreview || IMAGEM_MUNDO_PADRAO) && (
          <img src={imagemPreview || IMAGEM_MUNDO_PADRAO} alt={nome || 'Preview do mundo'} className="preview-imagem" />
        )}

        {erro && <p className="mensagem-erro">Erro: {erro}</p>}

        <div className="modal-actions">
          <Link to={`/mundo/${mundoId}`} className="botao-secundario">cancelar</Link>
          <button type="submit" disabled={salvando}>
            {salvando ? 'salvando...' : 'salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
