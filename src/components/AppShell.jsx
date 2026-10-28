import { useEffect, useRef, useState } from 'react'
import orbitLogo from '../assets/brand/orbit-logo-horizontal-dark.svg'
import './AppShell.css'

const destinations = [
  ['home', 'Home', 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z'],
  ['learn', 'Learn', 'm9 5 11 7-11 7Z'],
  ['calendar', 'Calendar', 'M4 5h16v16H4ZM4 10h16M8 3v4M16 3v4'],
  ['library', 'Library', 'M4 4h5v17H4ZM12 4h4v17h-4ZM18 5l3 15'],
]

export default function AppShell({ courses, destination, selectedSpace, onNavigate, onSelectSpace, onNewSpace, children }) {
  const drawer = useRef(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const main = useRef(null)
  const focused = destination === 'study'

  useEffect(() => {
    main.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [destination, selectedSpace])

  function navigate(action) {
    drawer.current?.close()
    action()
  }

  function navigation() {
    return (
      <>
        <button className="shell-brand" onClick={() => navigate(() => onNavigate('home'))} aria-label="Orbit home"><img src={orbitLogo} width="528" height="176" alt="Orbit" /></button>
        <nav className="shell-destinations" aria-label="Main navigation">
          {destinations.map(([id, label, path]) => (
            <button key={id} aria-current={(destination === id || (id === 'learn' && focused)) ? 'page' : undefined} onClick={() => navigate(() => onNavigate(id))}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>{label}
            </button>
          ))}
        </nav>
        <div className="shell-spaces-heading"><h2>Your spaces</h2><span>{courses.length || ''}</span></div>
        <nav className="shell-spaces" aria-label="Your learning spaces">
          {courses.length ? courses.map((course) => (
            <button key={course.name} title={course.name} aria-current={destination === 'space' && selectedSpace === course.name ? 'page' : undefined} onClick={() => navigate(() => onSelectSpace(course.name))}><span className="space-dot" /><span>{course.name}</span></button>
          )) : <p>No spaces yet</p>}
        </nav>
        <button className="shell-new-space" onClick={() => navigate(() => onNewSpace('topic'))}><span aria-hidden="true">＋</span> New space</button>
      </>
    )
  }

  return (
    <div className={`orbit-shell${focused ? ' orbit-shell-focused' : ''}`}>
      <a className="orbit-skip-link" href="#orbit-content">Skip to learning</a>
      <div className="orbit-environment" aria-hidden="true" />
      <aside className="shell-sidebar">{navigation()}</aside>
      <header className="shell-mobile-header">
        <button className="orbit-text-button shell-menu-toggle" onClick={() => { drawer.current.showModal(); setDrawerOpen(true) }} aria-label="Open navigation" aria-haspopup="dialog" aria-controls="orbit-navigation" aria-expanded={drawerOpen}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <button className="shell-brand" onClick={() => onNavigate('home')} aria-label="Orbit home"><img src={orbitLogo} width="528" height="176" alt="Orbit" /></button>
      </header>
      <dialog id="orbit-navigation" className="shell-drawer" ref={drawer} aria-label="Orbit navigation" onClose={() => setDrawerOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
        <div className="shell-drawer-content"><button className="orbit-text-button shell-close" onClick={() => drawer.current.close()} autoFocus>Close menu ×</button>{navigation()}</div>
      </dialog>
      <main id="orbit-content" className="shell-main" tabIndex={-1} ref={main}>{children}</main>
    </div>
  )
}
