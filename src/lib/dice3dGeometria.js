// Geometria e textura de cada dado (portado do protótipo), compartilhado
// entre o preview "idle" (DiceIdlePreview) e a animação de resultado
// (DiceRoller3D). Cada face vira uma textura de canvas com o número/rótulo
// "gravado" em dourado. O mapeamento de UV/normal por face é genérico o
// bastante pra funcionar tanto em faces triangulares (d4/d6/d8/d10/d20)
// quanto pentagonais (d12, que o three.js divide internamente em 3
// triângulos).
import * as THREE from 'three'
import { textoDaFace } from './dados'

export function criarTexturaFace(texto) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')

  const gradiente = ctx.createRadialGradient(64, 64, 10, 64, 64, 100)
  gradiente.addColorStop(0, '#2b2b2e')
  gradiente.addColorStop(1, '#111113')
  ctx.fillStyle = gradiente
  ctx.fillRect(0, 0, 128, 128)

  const tamanhoFonte = String(texto).length > 2 ? 40 : 58
  ctx.font = `bold ${tamanhoFonte}px Georgia`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.lineWidth = 5
  ctx.strokeStyle = '#3a2f10'
  ctx.strokeText(String(texto), 64, 64)

  ctx.shadowColor = '#c9a13b'
  ctx.shadowBlur = 8
  ctx.fillStyle = '#e8c565'
  ctx.fillText(String(texto), 64, 64)

  const textura = new THREE.CanvasTexture(canvas)
  textura.colorSpace = THREE.SRGBColorSpace
  textura.needsUpdate = true
  return textura
}

export function materialPadrao(texto) {
  return new THREE.MeshStandardMaterial({
    map: criarTexturaFace(texto),
    metalness: 0.1,
    roughness: 0.78,
    flatShading: true,
  })
}

export function processarFacesPoligonais(geometria, rawPorFace, cantosPorFace) {
  const posAttr = geometria.attributes.position
  const totalFaces = posAttr.count / rawPorFace
  const normais = []
  const uv = new Float32Array(posAttr.count * 2)

  const padraoTriangulos = cantosPorFace === 5
    ? [[1, 2, 0], [2, 3, 0], [3, 4, 0]]
    : [[0, 1, 2]]

  // Para pentágonos, o vértice do "leque" (compartilhado pelos 3 triângulos)
  // é sempre o último de cada trinca (offsets 2, 5, 8) - não o primeiro.
  const offsetsCantos = cantosPorFace === 5 ? [2, 0, 1, 4, 7] : [0, 1, 2]

  for (let f = 0; f < totalFaces; f++) {
    const base = f * rawPorFace
    const cantos = offsetsCantos.map((off) => new THREE.Vector3().fromBufferAttribute(posAttr, base + off))

    const centroide = new THREE.Vector3()
    cantos.forEach((c) => centroide.add(c))
    centroide.divideScalar(cantos.length)

    const normal = new THREE.Vector3()
      .subVectors(cantos[1], cantos[0])
      .cross(new THREE.Vector3().subVectors(cantos[2], cantos[0]))
      .normalize()
    if (normal.dot(centroide) < 0) normal.negate()
    normais.push(normal)

    const uAxis = new THREE.Vector3().subVectors(cantos[0], centroide).normalize()
    const vAxis = new THREE.Vector3().crossVectors(normal, uAxis).normalize()

    const pontos2D = cantos.map((c) => {
      const rel = new THREE.Vector3().subVectors(c, centroide)
      return { x: rel.dot(uAxis), y: rel.dot(vAxis) }
    })
    const maxR = Math.max(...pontos2D.map((p) => Math.sqrt(p.x * p.x + p.y * p.y)))
    const escala = 0.46 / maxR
    const uvCantos = pontos2D.map((p) => ({ u: 0.5 + p.x * escala, v: 0.5 + p.y * escala }))

    padraoTriangulos.forEach((tri, ti) => {
      tri.forEach((cantoIdx, vi) => {
        const rawIdx = base + ti * 3 + vi
        uv[rawIdx * 2] = uvCantos[cantoIdx].u
        uv[rawIdx * 2 + 1] = uvCantos[cantoIdx].v
      })
    })
  }

  geometria.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return { totalFaces, normais }
}

export function adicionarBordas(dado, geometria) {
  const linhas = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometria),
    new THREE.LineBasicMaterial({ color: 0x1a1a1a })
  )
  dado.add(linhas)
}

export function obterGeometriaBase(faces, raio) {
  switch (faces) {
    case 4: return { geometria: new THREE.TetrahedronGeometry(raio, 0), cantosPorFace: 3 }
    case 8: return { geometria: new THREE.OctahedronGeometry(raio, 0), cantosPorFace: 3 }
    case 10: return { geometria: construirBipiramide(raio), cantosPorFace: 3 }
    case 12: return { geometria: new THREE.DodecahedronGeometry(raio, 0), cantosPorFace: 5 }
    case 20: return { geometria: new THREE.IcosahedronGeometry(raio, 0), cantosPorFace: 3 }
    default: return { geometria: new THREE.IcosahedronGeometry(raio, 0), cantosPorFace: 3 }
  }
}

// Pentágono-bipirâmide simples como aproximação visual de um d10.
export function construirBipiramide(raio) {
  const alturaApice = raio * 1.1
  const raioEquador = raio * 0.95
  const topo = new THREE.Vector3(0, alturaApice, 0)
  const base = new THREE.Vector3(0, -alturaApice, 0)
  const equador = []
  for (let i = 0; i < 5; i++) {
    const angulo = (i / 5) * Math.PI * 2
    equador.push(new THREE.Vector3(Math.cos(angulo) * raioEquador, 0, Math.sin(angulo) * raioEquador))
  }
  const posicoes = []
  function adicionarFace(a, b, c) { posicoes.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z) }
  for (let i = 0; i < 5; i++) {
    const proximo = equador[(i + 1) % 5]
    adicionarFace(topo, equador[i], proximo)
    adicionarFace(base, proximo, equador[i])
  }
  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posicoes, 3))
  return geometria
}

// `dadoVisual` é { lados, papel } - papel é 'dezena'/'unidade' (percentil,
// parte de um d100) ou null (dado normal). Usado só pra escolher o rótulo
// certo de cada face (textoDaFace).
export function construirMeshDado(dadoVisual, raio) {
  const faces = dadoVisual.lados

  if (faces === 6) {
    const geometria = new THREE.BoxGeometry(raio * 1.5, raio * 1.5, raio * 1.5)
    const normais = [
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
    ]
    const materiais = normais.map((_, i) => materialPadrao(textoDaFace(dadoVisual, i)))
    const dado = new THREE.Mesh(geometria, materiais)
    adicionarBordas(dado, geometria)
    return { dado, normais }
  }

  const { geometria, cantosPorFace } = obterGeometriaBase(faces, raio)
  const rawPorFace = cantosPorFace === 5 ? 9 : 3
  geometria.clearGroups()
  const { totalFaces, normais } = processarFacesPoligonais(geometria, rawPorFace, cantosPorFace)

  const materiais = []
  for (let i = 0; i < totalFaces; i++) {
    geometria.addGroup(i * rawPorFace, rawPorFace, i)
    materiais.push(materialPadrao(textoDaFace(dadoVisual, i)))
  }

  const dado = new THREE.Mesh(geometria, materiais)
  adicionarBordas(dado, geometria)
  return { dado, normais }
}

export function descartarMesh(mesh) {
  mesh.geometry?.dispose()
  const materiais = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  materiais.forEach((material) => {
    material.map?.dispose()
    material.dispose()
  })
  mesh.children.forEach((filho) => {
    filho.geometry?.dispose()
    filho.material?.dispose()
  })
}

// Posiciona uma lista de dados visuais em até 2 linhas centralizadas
// (3 por linha), devolvendo o raio usado - reaproveitado tanto pelo preview
// idle quanto pela resolução final, pra manter o mesmo layout nos dois.
export function calcularLayoutDados(totalDados, dadosPorLinha = 3) {
  const raio = totalDados <= 1 ? 1.1 : totalDados === 2 ? 0.95 : totalDados === 3 ? 0.78 : 0.68
  const espaco = raio * 2.15
  const gapVertical = raio * 1.9
  return { raio, espaco, gapVertical, dadosPorLinha }
}

export function posicionarDados(scene, listaVisual, layout, aoCriarDado) {
  const { raio, espaco, gapVertical, dadosPorLinha } = layout
  const totalDados = listaVisual.length
  const linha1 = totalDados <= dadosPorLinha ? listaVisual : listaVisual.slice(0, dadosPorLinha)
  const linha2 = totalDados <= dadosPorLinha ? [] : listaVisual.slice(dadosPorLinha)

  function posicionarLinha(linha, y) {
    const largura = (linha.length - 1) * espaco
    const inicioX = -largura / 2
    linha.forEach((dadoVisual, i) => {
      const { dado, normais } = construirMeshDado(dadoVisual, raio)
      dado.position.x = inicioX + i * espaco
      dado.position.y = y
      scene.add(dado)
      aoCriarDado({ dado, normais, dadoVisual })
    })
  }

  if (linha2.length === 0) {
    posicionarLinha(linha1, 0)
  } else {
    posicionarLinha(linha1, gapVertical / 2)
    posicionarLinha(linha2, -gapVertical / 2)
  }
}
