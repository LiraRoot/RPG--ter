import { useEffect, useRef, useState } from 'react'
import { atualizarPersonagem } from '../lib/api'

// Anotações livres do aventureiro, ligadas ao personagem que ele controla.
// Salva sozinho (debounced) enquanto digita, sem precisar de botão salvar.
export default function NotepadPanel({ personagem, aoMudarTexto }) {
  const [texto, setTexto] = useState(personagem?.notas || '')
  const timerRef = useRef(null)

  useEffect(() => {
    setTexto(personagem?.notas || '')
  }, [personagem?.id])

  function aoDigitar(valor) {
    setTexto(valor)
    if (!personagem?.id) return
    // Reflete o texto no personagem em memória na hora, sem esperar o
    // debounce - senão fechar e reabrir o bloco mostra a versão antiga.
    aoMudarTexto?.(personagem.id, valor)
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      atualizarPersonagem(personagem.id, { notas: valor }).catch(() => {})
    }, 500)
  }

  return (
    <div className="bloco-notas">
      <div className="campaign-dice-floating__header">Anotações</div>
      <textarea
        className="bloco-notas__area"
        value={texto}
        onChange={(event) => aoDigitar(event.target.value)}
        placeholder="Escreva suas anotações..."
      />
    </div>
  )
}
