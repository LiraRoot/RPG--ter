import { useState } from 'react'

// Lista de barras de status (nome + valor atual + valor máximo), com uma
// barrinha visual simples. Usado para Vida, Energia, Mana etc, mas aceita
// qualquer nome customizado.
export default function StatusBarList({ barras, onAdicionar, onAtualizar, onRemover }) {
  const [novoNome, setNovoNome] = useState('')

  function limparZeroAoFocar(evento) {
    if (evento.target.value === '0') {
      evento.target.value = ''
    }
  }

  function adicionar() {
    if (!novoNome.trim()) return
    onAdicionar(novoNome.trim())
    setNovoNome('')
  }

  return (
    <section className="secao">
      <h2>Barras de status</h2>
      <ul className="lista-simples">
        {barras.map((barra) => {
          const percentual = barra.valor_maximo > 0
            ? Math.min(100, Math.max(0, (barra.valor_atual / barra.valor_maximo) * 100))
            : 0
          return (
            <li key={barra.id} className="linha-item linha-barra">
              <input
                className="input-nome"
                value={barra.nome}
                onChange={(e) => onAtualizar(barra.id, { nome: e.target.value })}
              />
              <input
                className="input-numero"
                type="number"
                value={barra.valor_atual ?? 0}
                onFocus={limparZeroAoFocar}
                onBlur={(e) => {
                  if (e.target.value === '') e.target.value = '0'
                }}
                onChange={(e) => onAtualizar(barra.id, { valor_atual: Number(e.target.value) || 0 })}
              />
              <span>/</span>
              <input
                className="input-numero"
                type="number"
                value={barra.valor_maximo ?? 0}
                onFocus={limparZeroAoFocar}
                onBlur={(e) => {
                  if (e.target.value === '') e.target.value = '0'
                }}
                onChange={(e) => onAtualizar(barra.id, { valor_maximo: Number(e.target.value) || 0 })}
              />
              <div className="barra-fundo">
                <div className="barra-preenchida" style={{ width: `${percentual}%` }} />
              </div>
              <button className="botao-remover" onClick={() => onRemover(barra.id)}>
                remover
              </button>
            </li>
          )
        })}
      </ul>
      <div className="linha-adicionar">
        <input
          placeholder="Nome da nova barra"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && adicionar()}
        />
        <button onClick={adicionar}>adicionar barra</button>
      </div>
    </section>
  )
}
