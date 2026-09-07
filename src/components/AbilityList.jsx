// Lista de habilidades (nome + dano + cooldown + descrição + custo).
export default function AbilityList({ habilidades, onAdicionar, onAdicionarPassiva, onAtualizar, onRemover }) {
  function limparZeroAoFocar(evento) {
    if (evento.target.value === '0') {
      evento.target.value = ''
    }
  }

  return (
    <section className="secao">
      <h2>Habilidades</h2>
      <ul className="lista-simples">
        {habilidades.map((hab) => (
          <li key={hab.id} className="linha-item linha-habilidade">
            <div className="habilidade-campos">
              <div className="habilidade-row">
                <div className="campo-habilidade campo-nome">
                  <label>Nome</label>
                  <input
                    className="input-nome"
                    placeholder="Insira o nome da habilidade"
                    value={hab.nome || ''}
                    onChange={(e) => onAtualizar(hab.id, { nome: e.target.value })}
                  />
                </div>

                <div className="campo-habilidade campo-custo">
                  <label>
                    <div className="campo-titulo">
                      <span>Custo</span>
                      <sup>Mana</sup>
                    </div>
                  </label>
                  <input
                    className="input-custo"
                    placeholder="Ex.: 35"
                    value={hab.custo || ''}
                    onChange={(e) => onAtualizar(hab.id, { custo: e.target.value })}
                  />
                </div>

                <div className="campo-habilidade campo-dano">
                  <label>Dano</label>
                  <input
                    className="input-dano"
                    type="text"
                    placeholder="Ex.: 1d10"
                    value={hab.dano || ''}
                    onChange={(e) => onAtualizar(hab.id, { dano: e.target.value })}
                  />
                </div>

                <div className="campo-habilidade campo-cd">
                  <label>
                    <div className="campo-titulo">
                      <span>CD</span>
                      <sup>Turnos</sup>
                    </div>
                  </label>
                  <input
                    className="input-cd"
                    type="number"
                    min="0"
                    placeholder="Ex.: 4"
                    value={hab.cooldown_turnos ?? ''}
                    onFocus={limparZeroAoFocar}
                    onChange={(e) => {
                      const valor = e.target.value === '' ? null : Number(e.target.value)
                      onAtualizar(hab.id, { cooldown_turnos: valor })
                    }}
                  />
                </div>
              </div>

              <div className="campo-habilidade campo-descricao">
                <label>Descrição</label>
                <textarea
                  className="input-descricao"
                  placeholder="Descreva o efeito da habilidade"
                  value={hab.descricao || ''}
                  onChange={(e) => onAtualizar(hab.id, { descricao: e.target.value })}
                />
              </div>
            </div>

            <button className="botao-remover" onClick={() => onRemover(hab.id)}>
              remover
            </button>
          </li>
        ))}
      </ul>

      <div className="habilidade-acoes">
        <button onClick={onAdicionar}>adicionar habilidade</button>
        <button onClick={onAdicionarPassiva}>adicionar passiva</button>
      </div>
    </section>
  )
}
