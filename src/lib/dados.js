// Motor de rolagem de dados: parsing da fórmula, execução da rolagem e
// utilitários para a animação 3D. Usado tanto pelo painel de rolagem quanto
// pelo componente DiceRoller3D - um único lugar calcula os números, o 3D só
// "reencena" visualmente um resultado que já foi determinado aqui.

export const FACES_SUPORTADAS = [4, 6, 8, 10, 12, 20, 100]
export const MAX_GRUPOS = 5
export const MAX_DADOS_POR_GRUPO = 4
export const MAX_VISUAIS_TOTAL = 5

// Um d100 é representado fisicamente por dois d10 (percentile dice): um
// marca a dezena (00,10,20...90) e o outro a unidade (0-9). 00+0 = 100.
export const TEXTOS_DEZENA = ['00', '10', '20', '30', '40', '50', '60', '70', '80', '90']
export const TEXTOS_UNIDADE = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

// ---------- Parsing da fórmula ----------
// Aceita múltiplos grupos de dado (até MAX_GRUPOS), cada um com 1 a
// MAX_DADOS_POR_GRUPO dados, sinal +/- em grupos e bônus, e um bônus
// numérico fixo. Ex: "1d20+1d6+3", "2d10-1d4", "4d20+20".
export function analisarFormulaDados(formulaBruta) {
  const limpa = String(formulaBruta || '').trim().toLowerCase().replace(/\s+/g, '').replace(/d%/g, 'd100')
  if (!limpa) return { erro: 'Digite uma fórmula.' }

  const tokens = limpa.match(/[+-]?[^+-]+/g)
  if (!tokens) return { erro: 'Fórmula inválida.' }

  const termos = []

  for (const tokenBruto of tokens) {
    const sinal = tokenBruto.startsWith('-') ? -1 : 1
    const token = tokenBruto.replace(/^[+-]/, '')
    if (!token) return { erro: 'Fórmula inválida.' }

    const matchDado = token.match(/^(\d*)d(\d+)$/)
    if (matchDado) {
      const quantidade = matchDado[1] ? parseInt(matchDado[1], 10) : 1
      const faces = parseInt(matchDado[2], 10)
      if (!FACES_SUPORTADAS.includes(faces)) {
        return { erro: `Dado d${faces} não suportado (use d4, d6, d8, d10, d12, d20 ou d100).` }
      }
      if (quantidade < 1 || quantidade > MAX_DADOS_POR_GRUPO) {
        return { erro: `Cada grupo de dado aceita de 1 a ${MAX_DADOS_POR_GRUPO} dados.` }
      }
      termos.push({ tipo: 'dado', qtd: quantidade, lados: faces, sinal })
      continue
    }

    const matchNumero = token.match(/^\d+$/)
    if (matchNumero) {
      termos.push({ tipo: 'numero', valor: sinal * parseInt(matchNumero[0], 10) })
      continue
    }

    return { erro: `Não entendi "${tokenBruto}".` }
  }

  const grupos = termos.filter((termo) => termo.tipo === 'dado')
  if (grupos.length === 0) return { erro: 'Inclua ao menos um dado (ex: 1d20).' }
  if (grupos.length > MAX_GRUPOS) return { erro: `No máximo ${MAX_GRUPOS} tipos de dado por rolagem.` }

  const totalVisuais = grupos.reduce((soma, grupo) => soma + grupo.qtd * (grupo.lados === 100 ? 2 : 1), 0)
  if (totalVisuais > MAX_VISUAIS_TOTAL) {
    return { erro: `No máximo ${MAX_VISUAIS_TOTAL} dados na tela ao mesmo tempo (um d100 usa 2).` }
  }

  return { termos }
}

// ---------- Execução da rolagem ----------

export function rolarTermos(termos) {
  let total = 0
  const resultados = []
  const termosResolvidos = termos.map((termo) => {
    if (termo.tipo === 'dado') {
      const valores = Array.from({ length: termo.qtd }, () => Math.floor(Math.random() * termo.lados) + 1)
      valores.forEach((valor) => resultados.push(valor))
      const somaGrupo = valores.reduce((soma, valor) => soma + valor, 0)
      total += termo.sinal * somaGrupo
      return { ...termo, valores }
    }
    total += termo.valor
    return termo
  })
  return { total, resultados, termosResolvidos }
}

// ---------- Formatação para texto ----------

export function formatarFormula(termos) {
  return termos.map((termo, indice) => {
    const negativo = termo.tipo === 'dado' ? termo.sinal < 0 : termo.valor < 0
    const corpo = termo.tipo === 'dado' ? `${termo.qtd}d${termo.lados}` : `${Math.abs(termo.valor)}`
    const prefixo = negativo ? '-' : (indice === 0 ? '' : '+')
    return `${prefixo}${corpo}`
  }).join('')
}

export function formatarDetalhamentoDados(termosResolvidos) {
  return (termosResolvidos || [])
    .map((termo) => {
      if (termo.tipo === 'dado') {
        const prefixo = termo.sinal < 0 ? '-' : '+'
        return `${prefixo}[${termo.valores.join(', ')}]`
      }
      const prefixo = termo.valor < 0 ? '-' : '+'
      return `${prefixo}${Math.abs(termo.valor)}`
    })
    .join(' ')
}

// Lista plana de partes para a descrição do resultado na animação 3D, ex:
// "7 + 2 + 5 + 8 + [20]" (bônus sempre destacado, entre colchetes).
export function montarPartesDescricao(termosResolvidos) {
  const partes = []
  ;(termosResolvidos || []).forEach((termo) => {
    if (termo.tipo === 'dado') {
      termo.valores.forEach((valor, indice) => {
        const valorComSinal = termo.sinal < 0 ? -valor : valor
        partes.push({ texto: String(Math.abs(valorComSinal)), negativo: valorComSinal < 0, destaque: false, chave: `d-${termo.lados}-${indice}-${valor}` })
      })
    } else {
      partes.push({ texto: String(Math.abs(termo.valor)), negativo: termo.valor < 0, destaque: true, chave: `n-${termo.valor}` })
    }
  })
  return partes
}

// ---------- Ponte para a visualização 3D ----------
// Decide se um resultado já calculado pode ser exibido com dados 3D reais
// (dentro dos limites visuais) ou se deve cair no modo simplificado.
export function podeExibirEm3D(termosResolvidos) {
  const grupos = (termosResolvidos || []).filter((termo) => termo.tipo === 'dado')
  if (!grupos.length) return false
  if (grupos.length > MAX_GRUPOS) return false
  if (grupos.some((termo) => termo.qtd < 1 || termo.qtd > MAX_DADOS_POR_GRUPO)) return false
  if (grupos.some((termo) => !FACES_SUPORTADAS.includes(termo.lados))) return false
  const totalVisuais = grupos.reduce((soma, termo) => soma + termo.qtd * (termo.lados === 100 ? 2 : 1), 0)
  if (totalVisuais > MAX_VISUAIS_TOTAL) return false
  return true
}

function decomporD100(valor) {
  const dezenaValor = valor === 100 ? 0 : Math.floor(valor / 10) * 10
  const unidadeValor = valor === 100 ? 0 : valor % 10
  return { dezenaValor, unidadeValor }
}

// Achata os termos resolvidos numa lista de "dados visuais": cada dado real
// vira uma entrada { lados, papel, valorAlvo, sinal }; um d100 vira duas
// entradas (dezena + unidade) ligadas pelo mesmo parId.
export function montarListaDadosVisuais(termosResolvidos) {
  const lista = []
  let proximoParId = 0
  ;(termosResolvidos || []).forEach((termo) => {
    if (termo.tipo !== 'dado') return
    termo.valores.forEach((valor) => {
      if (termo.lados === 100) {
        const parId = proximoParId++
        const { dezenaValor, unidadeValor } = decomporD100(valor)
        lista.push({ lados: 10, papel: 'dezena', valorAlvo: dezenaValor, sinal: termo.sinal, parId })
        lista.push({ lados: 10, papel: 'unidade', valorAlvo: unidadeValor, sinal: termo.sinal, parId })
      } else {
        lista.push({ lados: termo.lados, papel: null, valorAlvo: valor, sinal: termo.sinal, parId: null })
      }
    })
  })
  return lista
}

// Igual a montarListaDadosVisuais, mas a partir de termos AINDA NÃO
// rolados (sem `valores`) - usado só pelo preview "idle" antes de clicar em
// Rolar, quando ainda não existe nenhum resultado, só o tipo/quantidade de
// cada dado que a fórmula atual descreve.
export function montarListaDadosParaPreview(termos) {
  const lista = []
  ;(termos || []).forEach((termo) => {
    if (termo.tipo !== 'dado') return
    for (let i = 0; i < termo.qtd; i++) {
      if (termo.lados === 100) {
        lista.push({ lados: 10, papel: 'dezena' })
        lista.push({ lados: 10, papel: 'unidade' })
      } else {
        lista.push({ lados: termo.lados, papel: null })
      }
    }
  })
  return lista
}

// Índice (0-based) da face que deve ficar de frente pra câmera para exibir
// o valorAlvo de um dado visual.
export function indiceFaceParaValor(dadoVisual) {
  if (dadoVisual.papel === 'dezena') return TEXTOS_DEZENA.indexOf(String(dadoVisual.valorAlvo))
  if (dadoVisual.papel === 'unidade') return TEXTOS_UNIDADE.indexOf(String(dadoVisual.valorAlvo))
  return dadoVisual.valorAlvo - 1
}

// Texto exibido em cada face do dado (usado para gerar a textura).
export function textoDaFace(dadoVisual, indiceFace) {
  if (dadoVisual.papel === 'dezena') return TEXTOS_DEZENA[indiceFace]
  if (dadoVisual.papel === 'unidade') return TEXTOS_UNIDADE[indiceFace]
  return String(indiceFace + 1)
}
