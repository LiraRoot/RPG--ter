import { useEffect, useState } from 'react'
import { definirItemInventario, escutarInventario, listarItensInventario, removerItemInventario } from '../lib/api'

const TOTAL_SLOTS = 9

// Grade 3x3 de compartimentos ligada a UM personagem por vez. O aventureiro
// só vê o próprio; o Mestre pode trocar de personagem pelo seletor.
// Cada compartimento é um espaço pra guardar um item (não um campo de texto)
// - itens podem ser arrastados de um quadrado pro outro. Por enquanto não há
// como criar um item pela UI ainda, só a grade e a movimentação já prontas.
export default function InventoryPanel({ personagens, personagemPadraoId, podeEscolherPersonagem }) {
  const [personagemId, setPersonagemId] = useState(personagemPadraoId || '')
  const [itens, setItens] = useState([])
  const [slotArrastado, setSlotArrastado] = useState(null)
  const [slotSobre, setSlotSobre] = useState(null)

  useEffect(() => {
    setPersonagemId(personagemPadraoId || '')
  }, [personagemPadraoId])

  useEffect(() => {
    if (!personagemId) {
      setItens([])
      return undefined
    }

    let ativo = true
    async function carregar() {
      try {
        const dados = await listarItensInventario(personagemId)
        if (ativo) setItens(dados)
      } catch {
        if (ativo) setItens([])
      }
    }

    carregar()
    const pararDeEscutar = escutarInventario(personagemId, carregar)
    return () => {
      ativo = false
      pararDeEscutar()
    }
  }, [personagemId])

  function obterItemDoSlot(slot) {
    return itens.find((item) => item.slot === slot)
  }

  async function moverItem(slotOrigem, slotDestino) {
    if (slotOrigem === slotDestino || !personagemId) return
    const itemOrigem = obterItemDoSlot(slotOrigem)
    if (!itemOrigem) return
    const itemDestino = obterItemDoSlot(slotDestino)

    setItens((atual) => atual.map((item) => {
      if (item.id === itemOrigem.id) return { ...item, slot: slotDestino }
      if (itemDestino && item.id === itemDestino.id) return { ...item, slot: slotOrigem }
      return item
    }))

    try {
      if (itemDestino) {
        // Troca: como definirItemInventario faz upsert por (personagem_id,
        // slot), cada chamada só atualiza o "nome" da linha que já existe
        // naquele slot - não precisa apagar nada antes. Isso evita tanto uma
        // janela de dado perdido (se uma falha no meio do caminho) quanto a
        // "piscada" de ambos os slots ficarem vazios por um instante.
        await Promise.all([
          definirItemInventario(personagemId, slotDestino, itemOrigem.nome),
          definirItemInventario(personagemId, slotOrigem, itemDestino.nome),
        ])
      } else {
        await definirItemInventario(personagemId, slotDestino, itemOrigem.nome)
        await removerItemInventario(personagemId, slotOrigem)
      }
    } catch {
      // a lista se corrige sozinha no próximo evento de realtime
    }
  }

  const personagemSelecionado = personagens.find((p) => String(p.id) === String(personagemId))

  return (
    <div className="inventario-painel">
      <div className="campaign-dice-floating__header">Inventário</div>

      {podeEscolherPersonagem && (
        <select
          className="inventario-selecionar-personagem"
          value={personagemId}
          onChange={(event) => setPersonagemId(event.target.value)}
        >
          <option value="">Selecione um personagem...</option>
          {personagens.map((personagem) => (
            <option key={personagem.id} value={personagem.id}>{personagem.nome}</option>
          ))}
        </select>
      )}

      {!podeEscolherPersonagem && personagemSelecionado && (
        <div className="inventario-personagem-atual">{personagemSelecionado.nome}</div>
      )}

      {personagemId ? (
        <div className="inventario-grade">
          {Array.from({ length: TOTAL_SLOTS }, (_, slot) => {
            const item = obterItemDoSlot(slot)
            return (
              <div
                key={slot}
                className={`inventario-slot ${item ? 'is-ocupado' : ''} ${slotSobre === slot ? 'is-alvo' : ''}`}
                onDragOver={(event) => {
                  event.preventDefault()
                  setSlotSobre(slot)
                }}
                onDragLeave={() => setSlotSobre((atual) => (atual === slot ? null : atual))}
                onDrop={(event) => {
                  event.preventDefault()
                  setSlotSobre(null)
                  if (slotArrastado !== null) moverItem(slotArrastado, slot)
                  setSlotArrastado(null)
                }}
              >
                {item ? (
                  <div
                    className="inventario-slot__item"
                    draggable
                    onDragStart={() => setSlotArrastado(slot)}
                    onDragEnd={() => setSlotArrastado(null)}
                    title={item.nome}
                  >
                    <span className="inventario-slot__nome">{item.nome}</span>
                  </div>
                ) : (
                  <span className="inventario-slot__vazio" aria-hidden="true" />
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="inventario-aviso">Selecione um personagem para ver o inventário.</p>
      )}
    </div>
  )
}
