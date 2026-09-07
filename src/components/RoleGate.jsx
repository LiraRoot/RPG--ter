import { useEffect, useState } from 'react'

const STORAGE_KEY = 'rpg-perfil-atual'
const MESTRE_ATUAL_KEY = 'rpg-mestre-atual'
const MESTRES_KEY = 'rpg-mestres'
const THEME_KEY = 'rpg-theme'

function getPerfilAtual() {
  try {
    const valor = window.sessionStorage.getItem(STORAGE_KEY)
    return valor === 'mestre' || valor === 'aventureiro' ? valor : null
  } catch {
    return null
  }
}

function getTemaAtual() {
  try {
    const valor = localStorage.getItem(THEME_KEY)
    return valor === 'dark' || valor === 'light' ? valor : 'dark'
  } catch {
    return 'dark'
  }
}

function getMestresSalvos() {
  try {
    const valor = localStorage.getItem(MESTRES_KEY)
    if (!valor) return []
    const lista = JSON.parse(valor)
    return Array.isArray(lista) ? lista.filter(Boolean).map((item) => String(item).trim()) : []
  } catch {
    return []
  }
}

export default function RoleGate({ children }) {
  const [perfil, setPerfil] = useState(() => getPerfilAtual())
  const [tema, setTema] = useState(() => getTemaAtual())
  const [mestresSalvos, setMestresSalvos] = useState(() => getMestresSalvos())
  const [mestreAtual, setMestreAtual] = useState(() => {
    try {
      return window.sessionStorage.getItem(MESTRE_ATUAL_KEY) || ''
    } catch {
      return ''
    }
  })
  const [mostrarDialogo, setMostrarDialogo] = useState(!getPerfilAtual())
  const [etapa, setEtapa] = useState('perfil')
  const [nomeNovoMestre, setNomeNovoMestre] = useState('')

  useEffect(() => {
    const valor = getPerfilAtual()
    setPerfil(valor)
    setMostrarDialogo(!valor)
    if (!valor) {
      setEtapa('perfil')
    }
  }, [])

  useEffect(() => {
    document.body.dataset.theme = tema
    try {
      localStorage.setItem(THEME_KEY, tema)
    } catch {
      // ignora falha de storage
    }
  }, [tema])

  function salvarMestres(lista) {
    const nomes = Array.from(new Set(lista.map((nome) => String(nome).trim()).filter(Boolean)))
    try {
      localStorage.setItem(MESTRES_KEY, JSON.stringify(nomes))
    } catch {
      // ignora falha de storage
    }
    setMestresSalvos(nomes)
  }

  function escolherPerfil(tipo) {
    setPerfil(tipo)

    if (tipo === 'aventureiro') {
      setMestreAtual('')
      try {
        window.sessionStorage.removeItem(MESTRE_ATUAL_KEY)
      } catch {
        // ignora falha de storage
      }
      setMostrarDialogo(false)
      setEtapa('perfil')
      try {
        window.sessionStorage.setItem(STORAGE_KEY, tipo)
      } catch {
        // ignora falha de storage em ambientes restritivos
      }
      return
    }

    setEtapa('mestre')
    setNomeNovoMestre('')
  }

  function confirmarMestreSelecionado(nome) {
    const nomeLimpo = String(nome || '').trim()
    if (!nomeLimpo) return

    const listaAtual = getMestresSalvos()
    const novaLista = Array.from(new Set([...listaAtual, nomeLimpo]))
    salvarMestres(novaLista)
    setMestreAtual(nomeLimpo)
    setPerfil('mestre')
    setMostrarDialogo(false)
    setEtapa('perfil')

    try {
      window.sessionStorage.setItem(STORAGE_KEY, 'mestre')
      window.sessionStorage.setItem(MESTRE_ATUAL_KEY, nomeLimpo)
    } catch {
      // ignora falha de storage em ambientes restritivos
    }
  }

  function ativarEtapaNovoMestre() {
    setEtapa('novo-mestre')
    setNomeNovoMestre('')
  }

  function confirmarNovoMestre() {
    const nomeLimpo = String(nomeNovoMestre || '').trim()
    if (!nomeLimpo) return
    confirmarMestreSelecionado(nomeLimpo)
  }

  function alternarTema() {
    setTema((temaAtual) => (temaAtual === 'dark' ? 'light' : 'dark'))
  }

  function voltarParaPerfil() {
    setEtapa('perfil')
    setNomeNovoMestre('')
  }

  if (mostrarDialogo) {
    return (
      <div className={`app-shell theme-${tema}`}>
        <div className="role-overlay">
          <div className="role-card">
            {etapa === 'perfil' && (
              <>
                <h2>Antes de entrar, como você vai acessar?</h2>
                <p>Selecione o perfil que melhor descreve você neste momento.</p>

                <div className="role-opcoes">
                  <button type="button" className="role-botao role-botao-aventureiro" onClick={() => escolherPerfil('aventureiro')}>
                    Aventureiro(a)
                  </button>
                  <button type="button" className="role-botao role-botao-mestre" onClick={() => escolherPerfil('mestre')}>
                    Mestre
                  </button>
                </div>

                <small>
                  {perfil ? 'Perfil salvo para esta sessão.' : 'Se ainda não houver um perfil selecionado, esta pergunta aparece novamente na próxima entrada.'}
                </small>
              </>
            )}

            {etapa === 'mestre' && (
              <>
                <h2>Quem está entrando?</h2>
                <p>Selecione o mestre ou cadastre um nome novo.</p>

                {mestresSalvos.length > 0 ? (
                  <div className="role-form">
                    <div className="role-grid-mestres">
                      {mestresSalvos.map((mestre) => (
                        <button
                          key={mestre}
                          type="button"
                          className={`role-mestre-botao ${mestreAtual === mestre ? 'is-active' : ''}`}
                          onClick={() => setMestreAtual(mestre)}
                        >
                          <svg className="role-mestre-coroa" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 18h16l-1.2-9.4-4.1 3.6L12 5l-2.7 7.2L5.2 8.6 4 18Zm2.5 1.7h11v.8h-11v-.8Z" fill="currentColor" fillRule="evenodd"/>
                          </svg>
                          <span>{mestre}</span>
                        </button>
                      ))}
                    </div>

                    <div className="role-actions-row">
                      <button type="button" className="role-secondary" onClick={ativarEtapaNovoMestre}>
                        Novo mestre
                      </button>
                      <button
                        type="button"
                        className="role-primary"
                        onClick={() => confirmarMestreSelecionado(mestreAtual)}
                        disabled={!mestreAtual}
                      >
                        Entrar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="role-form">
                    <label className="role-field">
                      Nome do mestre
                      <input
                        type="text"
                        value={nomeNovoMestre}
                        onChange={(e) => setNomeNovoMestre(e.target.value)}
                        placeholder="Ex.: Darius"
                        className="role-input"
                      />
                    </label>

                    <div className="role-actions-row single">
                      <button type="button" className="role-primary" onClick={confirmarNovoMestre}>
                        Salvar e entrar
                      </button>
                    </div>
                  </div>
                )}

                <div className="role-back-link">
                  <button type="button" className="link-button" onClick={voltarParaPerfil}>
                    ← Voltar
                  </button>
                </div>
              </>
            )}

            {etapa === 'novo-mestre' && (
              <>
                <h2>Adicionar mestre</h2>
                <p>Digite o nome do mestre para guardar para a próxima vez.</p>

                <div className="role-form">
                  <label className="role-field">
                    Nome do mestre
                    <input
                      type="text"
                      value={nomeNovoMestre}
                      onChange={(e) => setNomeNovoMestre(e.target.value)}
                      placeholder="Ex.: Darius"
                      className="role-input"
                    />
                  </label>

                  <div className="role-actions-row">
                    <button type="button" className="role-secondary" onClick={() => setEtapa('mestre')}>
                      Voltar
                    </button>
                    <button type="button" className="role-primary" onClick={confirmarNovoMestre}>
                      Salvar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`app-shell theme-${tema}`}>
      <div className="role-header">
        <span className="role-badge">
          Perfil: {perfil === 'mestre' ? `Mestre · ${mestreAtual || 'Sem nome'}` : 'Aventureiro(a)'}
        </span>

        <div className="role-actions">
          <button type="button" className="role-trocar" onClick={alternarTema}>
            {tema === 'dark' ? 'Modo claro' : 'Modo escuro'}
          </button>
          <button type="button" className="role-trocar" onClick={() => {
            setEtapa('perfil')
            setMostrarDialogo(true)
          }}>
            Trocar perfil
          </button>
        </div>
      </div>
      {children}
    </div>
  )
}
