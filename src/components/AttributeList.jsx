import { useState } from 'react'
import { calcularValorPericia } from '../lib/api'

function IconeEstrela({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M9 1L12 6L17 9L12 12L9 17L6 12L1 9L6 6Z" />
      <path d="M18 13L20 16L23 18L20 20L18 23L16 20L13 18L16 16Z" />
    </svg>
  )
}

function IconeX({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 5L19 19M19 5L5 19" />
    </svg>
  )
}

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
  pontosProficiencia = 0,
  podeRemoverProficiencia = false,
  onAtribuirProficiencia,
  onRemoverProficiencia,
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
      <div className="secao-cabecalho-com-info">
        <h2>Atributos</h2>
        {pontosProficiencia > 0 && (
          <span className="proficiencia-contador">Pontos de proficiência: {pontosProficiencia}</span>
        )}
      </div>
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
                <button className="botao-remover-x" title="Remover atributo" onClick={() => onRemover(attr.id)}>
                  <IconeX className="icone-remover" />
                </button>
              </div>

              <div className="pericias-container">
                {periciasDoAtributo.map((pericia) => (
                  <div key={pericia.id} className="pericia-item">
                    <div className="pericia-nome-wrap">
                      <input
                        className="input-pericia"
                        value={pericia.nome}
                        onChange={(e) => onAtualizarPericia(pericia.id, { nome: e.target.value })}
                      />
                      {pericia.proficiente ? (
                        <button
                          type="button"
                          className={`estrela-proficiencia is-ativa ${podeRemoverProficiencia ? 'is-removivel' : ''}`}
                          title="Proficiência"
                          disabled={!podeRemoverProficiencia}
                          onClick={() => onRemoverProficiencia?.(pericia.id)}
                        >
                          <IconeEstrela className="icone-proficiencia" />
                        </button>
                      ) : (
                        pontosProficiencia > 0 && (
                          <button
                            type="button"
                            className="estrela-proficiencia is-hover-only"
                            title="Adicionar proficiência"
                            onClick={() => onAtribuirProficiencia?.(pericia.id)}
                          >
                            <IconeEstrela className="icone-proficiencia" />
                          </button>
                        )
                      )}
                    </div>
                    <input
                      className="input-numero input-numero-pequeno"
                      type="number"
                      value={calcularValorPericia(attr.valor)}
                      readOnly
                    />
                    <button className="botao-remover-x" title="Remover perícia" onClick={() => onRemoverPericia(pericia.id)}>
                      <IconeX className="icone-remover" />
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
