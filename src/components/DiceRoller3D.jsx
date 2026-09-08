import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { montarListaDadosVisuais, indiceFaceParaValor, podeExibirEm3D, montarPartesDescricao } from '../lib/dados'
import { calcularLayoutDados, descartarMesh, posicionarDados } from '../lib/dice3dGeometria'

const LARGURA_CENA = 320
const ALTURA_CENA = 200
const DURACAO_CAOTICA = 950
const DURACAO_TOTAL = 1600

function IconeFechar({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 5L19 19M19 5L5 19" />
    </svg>
  )
}

function facilitador(t) { return 1 - Math.pow(1 - t, 3) }

function criarParticulas(container) {
  if (!container) return
  for (let i = 0; i < 18; i++) {
    const particula = document.createElement('div')
    particula.className = 'dice3d-particula'
    const tamanho = 3 + Math.random() * 4
    particula.style.width = `${tamanho}px`
    particula.style.height = `${tamanho}px`
    container.appendChild(particula)
    const angulo = Math.random() * Math.PI * 2
    const distancia = 55 + Math.random() * 45
    const x = Math.cos(angulo) * distancia
    const y = Math.sin(angulo) * distancia
    const animacao = particula.animate([
      { transform: 'translate(-50%, -50%) translate(0, 0)', opacity: 1 },
      { transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, opacity: 0 },
    ], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.2,1)' })
    animacao.onfinish = () => particula.remove()
  }
}

// ---------- Componente ----------
// `rolagem` já traz o resultado determinado (termos resolvidos + total) -
// este componente só "reencena" visualmente algo que já foi calculado em
// src/lib/dados.js, nunca gera um número novo por conta própria. Isso é o
// que garante que todo mundo conectado veja a mesma animação com o mesmo
// resultado: todos recebem o mesmo payload via realtime e todos rodam este
// mesmo componente.
export default function DiceRoller3D({ rolagem, onFechar }) {
  const containerRef = useRef(null)
  const [revelado, setRevelado] = useState(false)
  const modoSimples = !podeExibirEm3D(rolagem.termos)
  const partesDescricao = montarPartesDescricao(rolagem.termos)

  useEffect(() => {
    let cancelado = false
    let frameRenderId = null
    let frameAnimId = null
    let renderer = null
    let scene = null
    const dadosCena = []
    const timers = []

    function revelarResultado() {
      if (cancelado) return
      setRevelado(true)
      criarParticulas(containerRef.current)
    }

    if (modoSimples) {
      timers.push(window.setTimeout(revelarResultado, 500))
      return () => {
        cancelado = true
        timers.forEach(window.clearTimeout)
      }
    }

    const container = containerRef.current
    scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, LARGURA_CENA / ALTURA_CENA, 0.1, 100)
    camera.position.set(0, 0, 6.6)
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(LARGURA_CENA, ALTURA_CENA)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xaaaaaa, 0.7))
    const luzPonto = new THREE.PointLight(0xffe4a8, 1.6, 20)
    luzPonto.position.set(2, 3, 4)
    scene.add(luzPonto)
    const luzPonto2 = new THREE.PointLight(0x8899cc, 0.8, 20)
    luzPonto2.position.set(-3, -2, 2)
    scene.add(luzPonto2)
    const luzFrontal = new THREE.PointLight(0xffffff, 0.7, 20)
    luzFrontal.position.set(0, 0, 6)
    scene.add(luzFrontal)

    const listaVisual = montarListaDadosVisuais(rolagem.termos)
    const layout = calcularLayoutDados(listaVisual.length)
    posicionarDados(scene, listaVisual, layout, ({ dado, normais, dadoVisual }) => {
      dadosCena.push({ dado, normais, indiceFaceAlvo: indiceFaceParaValor(dadoVisual) })
    })

    function renderizar() {
      frameRenderId = requestAnimationFrame(renderizar)
      renderer.render(scene, camera)
    }
    renderizar()

    dadosCena.forEach((d) => {
      const alinhar = new THREE.Quaternion().setFromUnitVectors(d.normais[d.indiceFaceAlvo], new THREE.Vector3(0, 0, 1))
      const giroExtra = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.random() * Math.PI * 2)
      d.quaternionFinal = giroExtra.clone().multiply(alinhar)
      d.velX = 0.22 + Math.random() * 0.18
      d.velY = 0.26 + Math.random() * 0.18
    })

    const inicioTempo = performance.now()

    function faseCaotica(agora) {
      const decorrido = agora - inicioTempo
      if (decorrido < DURACAO_CAOTICA) {
        const amortecimento = 1 - decorrido / DURACAO_CAOTICA
        dadosCena.forEach((d) => {
          d.dado.rotation.x += d.velX * amortecimento
          d.dado.rotation.y += d.velY * amortecimento
        })
        frameAnimId = requestAnimationFrame(faseCaotica)
        return
      }

      dadosCena.forEach((d) => { d.quaternionInicial = d.dado.quaternion.clone() })
      const inicioFaseFinal = performance.now()
      const duracaoFaseFinal = DURACAO_TOTAL - DURACAO_CAOTICA

      function faseFinal(agora2) {
        const decorrido2 = agora2 - inicioFaseFinal
        const t = Math.min(decorrido2 / duracaoFaseFinal, 1)
        dadosCena.forEach((d) => {
          d.dado.quaternion.slerpQuaternions(d.quaternionInicial, d.quaternionFinal, facilitador(t))
        })
        if (t < 1) {
          frameAnimId = requestAnimationFrame(faseFinal)
        } else {
          revelarResultado()
        }
      }
      frameAnimId = requestAnimationFrame(faseFinal)
    }
    frameAnimId = requestAnimationFrame(faseCaotica)

    return () => {
      cancelado = true
      timers.forEach(window.clearTimeout)
      if (frameRenderId) cancelAnimationFrame(frameRenderId)
      if (frameAnimId) cancelAnimationFrame(frameAnimId)
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
  }, [])

  return (
    <div className="dice3d-backdrop" onClick={onFechar}>
      <div className="dice3d-frame" onClick={(evento) => evento.stopPropagation()}>
        <div className="dice3d-topo">
          <span className="dice3d-titulo">Rolagem de dados</span>
          {rolagem.nomeJogador && <span className="dice3d-jogador">{rolagem.nomeJogador}</span>}
        </div>

        <div className={`dice3d-palco ${modoSimples ? 'is-simples' : ''}`} ref={containerRef}>
          <div className={`dice3d-resultado ${revelado ? 'is-visivel' : ''}`}>{rolagem.total}</div>
        </div>

        {revelado && (
          <>
            <p className="dice3d-descricao">
              Resultado de {rolagem.formula}:{' '}
              {partesDescricao.map((parte, indice) => (
                <span key={parte.chave}>
                  {indice > 0 ? (parte.negativo ? ' - ' : ' + ') : (parte.negativo ? '-' : '')}
                  {parte.destaque ? <strong>[{parte.texto}]</strong> : parte.texto}
                </span>
              ))}
              {' '}= <strong>{rolagem.total}</strong>
            </p>

            <button type="button" className="dice3d-confirmar" onClick={onFechar}>
              Confirmar
            </button>
          </>
        )}

        <button type="button" className="dice3d-fechar" onClick={onFechar} aria-label="Fechar rolagem">
          <IconeFechar className="icone-remover" />
        </button>
      </div>
    </div>
  )
}
