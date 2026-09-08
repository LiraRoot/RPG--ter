import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { analisarFormulaDados, montarListaDadosParaPreview } from '../lib/dados'
import { calcularLayoutDados, descartarMesh, posicionarDados } from '../lib/dice3dGeometria'

const LARGURA_CENA = 220
const ALTURA_CENA = 120

const DEFAULT_PREVIEW = [{ lados: 20, papel: null }]

// Preview "idle": os dados da fórmula atual ficam parados na tela, girando
// devagar, antes mesmo de clicar em "Rolar" - igual ao protótipo original.
// Não sorteia nada nem mostra resultado; só dá o gostinho de "os dados estão
// prontos". Reconstrói a cena apenas quando o CONJUNTO de dados muda (ex:
// trocou de "1d20" pra "2d20+1d6"), não a cada tecla digitada no bônus.
export default function DiceIdlePreview({ formula }) {
  const containerRef = useRef(null)

  const listaPreview = useMemo(() => {
    const analise = analisarFormulaDados(formula)
    if (analise.erro) return DEFAULT_PREVIEW
    const lista = montarListaDadosParaPreview(analise.termos)
    return lista.length ? lista : DEFAULT_PREVIEW
  }, [formula])

  const assinatura = listaPreview.map((d) => `${d.lados}${d.papel || ''}`).join('-')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, LARGURA_CENA / ALTURA_CENA, 0.1, 100)
    camera.position.set(0, 0, 6.6)
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(LARGURA_CENA, ALTURA_CENA)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xaaaaaa, 0.7))
    const luzPonto = new THREE.PointLight(0xffe4a8, 1.4, 20)
    luzPonto.position.set(2, 3, 4)
    scene.add(luzPonto)
    const luzFrontal = new THREE.PointLight(0xffffff, 0.6, 20)
    luzFrontal.position.set(0, 0, 6)
    scene.add(luzFrontal)

    const dadosCena = []
    const layout = calcularLayoutDados(listaPreview.length)
    posicionarDados(scene, listaPreview, layout, ({ dado, dadoVisual }) => {
      dado.rotation.x = Math.random() * Math.PI
      dado.rotation.y = Math.random() * Math.PI
      dadosCena.push({ dado, dadoVisual })
    })

    let frameId
    function loop() {
      frameId = requestAnimationFrame(loop)
      dadosCena.forEach((d) => {
        d.dado.rotation.y += 0.006
        d.dado.rotation.x += 0.002
      })
      renderer.render(scene, camera)
    }
    loop()

    return () => {
      cancelAnimationFrame(frameId)
      dadosCena.forEach((d) => {
        descartarMesh(d.dado)
        scene.remove(d.dado)
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura])

  return <div className="dice3d-preview-palco" ref={containerRef} />
}
