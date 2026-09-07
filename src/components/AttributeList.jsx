import { useState } from 'react'
import { calcularValorPericia } from '../lib/api'

// Lista de atributos (nome + valor numérico). Usado para Força, Destreza etc,
// mas aceita qualquer nome customizado.
export default function AttributeList({
  atributos,
  pericias,
  onAdicionar,
  onAdicionarPericia,
  onAtualizar,
  onAtualizarPericia,
  onRemover,
  onRemoverPericia,
}) {
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
      <h2>Atributos</h2>
      <ul className="lista-simples">
        {atributos.map((attr) => {
          const periciasDoAtributo = (pericias || []).filter((pericia) => pericia.atributo === attr.nome)

          return (
            <li key={attr.id} className="linha-item atributo-com-pericias">
              <div className="atributo-principal">
                <input
                  className="input-nome"
                  value={attr.nome}
                  onChange={(e) => onAtualizar(attr.id, { nome: e.target.value })}
                />
                <input
                  className="input-numero"
                  type="number"
                  value={attr.valor ?? 0}
                  onFocus={limparZeroAoFocar}
                  onBlur={(e) => {
                    if (e.target.value === '') e.target.value = '0'
                  }}
                  onChange={(e) => onAtualizar(attr.id, { valor: Number(e.target.value) || 0 })}
                />
                <button className="botao-remover" onClick={() => onRemover(attr.id)}>
                  remover
                </button>
              </div>

              <div className="pericias-container">
                {periciasDoAtributo.map((pericia) => (
                  <div key={pericia.id} className="pericia-item">
                    <input
                      className="input-pericia"
                      value={pericia.nome}
                      onChange={(e) => onAtualizarPericia(pericia.id, { nome: e.target.value })}
                    />
                    <input
                      className="input-numero input-numero-pequeno"
                      type="number"
                      value={calcularValorPericia(attr.valor)}
                      readOnly
                    />
                    <button className="botao-remover botao-pericia-remover" onClick={() => onRemoverPericia(pericia.id)}>
                      x
                    </button>
                  </div>
                ))}

                <button
                  className="botao-adicionar-pericia"
                  onClick={() => onAdicionarPericia(attr.nome, 'Nova perícia')}
                >
                  + perícia
                </button>
              </div>
            </li>
          )
        })}
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
