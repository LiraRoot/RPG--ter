// Lista de habilidades (nome + descrição + custo).
export default function AbilityList({ habilidades, onAdicionar, onAtualizar, onRemover }) {
  return (
    <section className="secao">
      <h2>Habilidades</h2>
      <ul className="lista-simples">
        {habilidades.map((hab) => (
          <li key={hab.id} className="linha-item linha-habilidade">
            <input
              className="input-nome"
              value={hab.nome}
              onChange={(e) => onAtualizar(hab.id, { nome: e.target.value })}
            />
            <input
              className="input-custo"
              placeholder="custo (ex: 10 de mana)"
              value={hab.custo || ''}
              onChange={(e) => onAtualizar(hab.id, { custo: e.target.value })}
            />
            <textarea
              className="input-descricao"
              placeholder="descrição"
              value={hab.descricao || ''}
              onChange={(e) => onAtualizar(hab.id, { descricao: e.target.value })}
            />
            <button className="botao-remover" onClick={() => onRemover(hab.id)}>
              remover
            </button>
          </li>
        ))}
      </ul>
      <button onClick={onAdicionar}>adicionar habilidade</button>
    </section>
  )
}
