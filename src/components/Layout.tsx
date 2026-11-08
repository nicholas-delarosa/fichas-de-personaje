import { useEffect } from 'react'
import { NavLink, Outlet, Link } from 'react-router'
import { useSession } from '../lib/session'
import { cloudEnabled } from '../lib/supabase'
import { play, setSoundEnabled, useSoundEnabled } from '../lib/sound'
import './Layout.css'

const isTyping = (el: Element | null) => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement

// Como en el portafolio: el alma sigue al mouse (pasarlo por una opción la enfoca) y suena al moverse.
// Si estás escribiendo en un campo no se roba el foco
function useSoulCursor() {
  useEffect(() => {
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const item = (e.target as Element).closest<HTMLElement>('.menu-item')
      if (!item || item === document.activeElement || isTyping(document.activeElement)) return
      if ((item as HTMLButtonElement).disabled) return
      item.focus({ preventScroll: true })
    }
    const focus = (e: FocusEvent) => {
      if ((e.target as Element).classList?.contains('menu-item')) play('move')
    }
    const click = (e: MouseEvent) => {
      const item = (e.target as Element).closest<HTMLElement>('.menu-item, .tab')
      if (item && !(item as HTMLButtonElement).disabled) play('select')
    }
    document.addEventListener('pointerover', over)
    document.addEventListener('focusin', focus)
    document.addEventListener('click', click)
    return () => {
      document.removeEventListener('pointerover', over)
      document.removeEventListener('focusin', focus)
      document.removeEventListener('click', click)
    }
  }, [])
}

export function Layout() {
  const { user, displayName, signOut } = useSession()
  const sound = useSoundEnabled()
  useSoulCursor()

  return (
    <div className="layout">
      <header className="layout-header">
        <Link to="/" className="menu-item layout-logo">FICHAS</Link>
        <nav className="layout-options" aria-label="Principal">
          <NavLink to="/" end className="menu-item">Mis fichas</NavLink>
          {cloudEnabled && <NavLink to="/explorar" className="menu-item">Explorar</NavLink>}
          <NavLink to="/plantillas" className="menu-item">Plantillas</NavLink>
          <NavLink to="/mundos" className="menu-item">Mundos</NavLink>
        </nav>
        <div className="layout-account">
          <button type="button" className="menu-item" onClick={() => setSoundEnabled(!sound)} aria-pressed={sound}>
            Sonido: {sound ? 'Sí' : 'No'}
          </button>
          {cloudEnabled && (user
            ? <button type="button" className="menu-item" onClick={() => signOut()} title={displayName ?? undefined}>Salir</button>
            : <NavLink to="/entrar" className="menu-item">Entrar</NavLink>)}
        </div>
      </header>
      {!user && (
        <p className="guest-banner">
          Modo invitado: tus fichas se guardan solo en este navegador.
          {cloudEnabled && <> <Link to="/entrar" className="link">Entra con tu cuenta</Link> para compartirlas.</>}
        </p>
      )}
      <main className="layout-main">
        <Outlet />
      </main>
      <footer className="layout-footer">
        <p>Avatares por piezas: “Pixel Art” de DiceBear (CC0). Fuentes Determination (fan-made).</p>
      </footer>
    </div>
  )
}
