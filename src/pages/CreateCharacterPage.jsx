import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { criarPersonagem, enviarImagemPersonagem } from '../lib/api'

export default function CreateCharacterPage() {
  const [nome, setNome] = useState('')
  const [genero, setGenero] = useState('Elu')
  const [arquivoImagem, setArquivoImagem] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const navegar = useNavigate()

  async function aoSalvar(e) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      let imagem_url = null
      if (arquivoImagem) {
        imagem_url = await enviarImagemPersonagem(arquivoImagem)
      }
      const personagem = await criarPersonagem({ nome: nome || 'Sem nome', genero, imagem_url })
      navegar(`/personagem/${personagem.id}`)
    } catch (e) {
      setErro(e.message)
      setEnviando(false)
    }
  }

  return (
    <div>
      <h1>Criar personagem</h1>
      <form onSubmit={aoSalvar} className="formulario">
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
          Imagem do personagem
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setArquivoImagem(e.target.files[0])}
          />
        </label>

        {erro && <p className="mensagem-erro">Erro: {erro}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'salvando...' : 'criar personagem'}
        </button>
      </form>
    </div>
  )
}
