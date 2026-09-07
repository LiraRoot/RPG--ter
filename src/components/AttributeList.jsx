import { useState } from 'react'

// Lista de atributos (nome + valor numérico). Usado para Força, Destreza etc,
// mas aceita qualquer nome customizado.
export default function AttributeList({ atributos, onAdicionar, onAtualizar, onRemover }) {
  const [novoNome, setNovoNome] = useState('')

  function adicionar() {
    if (!novoNome.trim()) return
    onAdicionar(novoNome.trim())
    setNovoNome('')
  }

  return (
    <section className="secao">
      <h2>Atributos</h2>
      <ul className="lista-simples">
        {atributos.map((attr) => (
          <li key={attr.id} className="linha-item">
            <input
              className="input-nome"
              value={attr.nome}
              onChange={(e) => onAtualizar(attr.id, { nome: e.target.value })}
            />
            <input
              className="input-numero"
              type="number"
              value={attr.valor}
              onChange={(e) => onAtualizar(attr.id, { valor: Number(e.target.value) })}
            />
            <button className="botao-remover" onClick={() => onRemover(attr.id)}>
              remover
            </button>
          </li>
        ))}
      </ul>
      <div className="linha-adicionar">
        <input
          placeholder="Nome do novo atributo"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && adicionar()}
        />
        <button onClick={adicionar}>adicionar atributo</button>
      </div>
    </section>
  )
}
