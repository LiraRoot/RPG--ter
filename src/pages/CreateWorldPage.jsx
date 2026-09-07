import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { criarMundo, enviarImagemMundo, IMAGEM_MUNDO_PADRAO } from '../lib/api'

const PERFIL_KEY = 'rpg-perfil-atual'
const MESTRE_ATUAL_KEY = 'rpg-mestre-atual'

export default function CreateWorldPage() {
  const [nome, setNome] = useState('')
  const [mestre, setMestre] = useState('')
  const [arquivoImagem, setArquivoImagem] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const navegar = useNavigate()

  useEffect(() => {
    const perfil = window.sessionStorage.getItem(PERFIL_KEY)
    const mestreAtual = window.sessionStorage.getItem(MESTRE_ATUAL_KEY) || ''

    if (perfil !== 'mestre' || !mestreAtual.trim()) {
      navegar('/')
      return
    }

    setMestre(mestreAtual)
  }, [navegar])

  async function aoSalvar(e) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)

    const mestreAtual = (window.sessionStorage.getItem(MESTRE_ATUAL_KEY) || '').trim()
    if (window.sessionStorage.getItem(PERFIL_KEY) !== 'mestre' || !mestreAtual) {
      navegar('/')
      return
    }

    try {
      let imagem_url = IMAGEM_MUNDO_PADRAO
      if (arquivoImagem) {
        imagem_url = await enviarImagemMundo(arquivoImagem)
      }

      const mundo = await criarMundo({
        nome: nome || 'Novo mundo',
        mestre: mestreAtual,
        imagem_url,
      })

      navegar(`/mundo/${mundo.id}`)
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div>
      <h1>Criar mundo</h1>

      <form onSubmit={aoSalvar} className="formulario">
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
          <input
            value={mestre}
            readOnly
            placeholder="Ex.: Darius"
          />
        </label>

        <label>
          Imagem do mundo
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setArquivoImagem(e.target.files[0])}
          />
        </label>

        {erro && <p className="mensagem-erro">Erro: {erro}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'salvando...' : 'criar mundo'}
        </button>
      </form>
    </div>
  )
}
