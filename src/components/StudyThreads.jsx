import { useEffect, useId, useRef, useState } from 'react'
import TopicBrowser from './TopicBrowser'
import './StudyThreads.css'

export default function StudyThreads({ threads = [], activeId, courses = [], onSwitch, onCreate, courseGuidance, children }) {
  const active = threads.find(thread => thread.id === activeId)
  const [expanded, setExpanded] = useState(true)
  const [creating, setCreating] = useState(false)
  const [courseName, setCourseName] = useState(active?.courseName || courses[0]?.name || '')
  const [topic, setTopic] = useState('')
  const [mobile, setMobile] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const dialog = useRef(null)
  const trigger = useRef(null)
  const firstField = useRef(null)
  const restoreFocus = useRef(true)
  const railClose = useRef(null)
  const id = useId()
  const currentCourse = active?.courseName || courses[0]?.name

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1100px)')
    const update = () => { setMobile(media.matches); dialog.current?.close() }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => { if (creating) firstField.current?.focus() }, [creating])

  function close(returnFocus = true) { restoreFocus.current = returnFocus; dialog.current?.close(); if (returnFocus) trigger.current?.focus() }
  function collapseRail() {
    setExpanded(false)
    queueMicrotask(() => trigger.current?.focus())
  }
  const content = <>
    <div className="study-nav-heading"><h2>Topics & history</h2><button type="button" ref={railClose} className="orbit-icon-button study-nav-close" onClick={() => mobile ? close() : collapseRail()} aria-label={mobile ? 'Hide topics and history' : 'Collapse topics and history'} aria-controls={id} aria-expanded={mobile ? drawerOpen : expanded}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16m7-11-3 3 3 3" /></svg></button></div>
    <div onClickCapture={event => { if (event.target.closest('[data-study-navigation-select]')) close(false) }}>{children}</div>
    <section className="study-nav-topics" aria-label="Topics in this space"><h3>Your topics</h3><TopicBrowser threads={threads} courseName={currentCourse} activeId={activeId} onOpen={threadId => { close(); onSwitch?.(threadId) }} /></section>
    {onCreate && <>
      <button className="orbit-text-button study-thread-new" onClick={() => { setCourseName(currentCourse); setCreating(!creating) }} aria-expanded={creating} aria-controls={`${id}-create`}>+ <span>New topic</span></button>
      {creating && <form id={`${id}-create`} className="orbit-form thread-create" onSubmit={event => {
        event.preventDefault()
        const course = courses.find(entry => entry.name === courseName)
        if (!course) return
        close(); onCreate(course, topic.trim()); setCreating(false); setTopic('')
      }}>
        <label>Learning space<select ref={firstField} value={courseName} onChange={event => setCourseName(event.target.value)}>{courses.map(course => <option key={course.name}>{course.name}</option>)}</select></label>
        <label>What would you like to explore? (optional)<input value={topic} maxLength={120} onChange={event => setTopic(event.target.value)} placeholder="Use my current course position" /></label>
        <button className="orbit-button orbit-button-primary" disabled={!courses.length}>Start topic</button>
      </form>}
    </>}
    {courseGuidance && <details className="study-course-guidance"><summary>Update class focus</summary><p>Tell Orbit what your class is covering so future recommendations stay relevant.</p>{courseGuidance}</details>}
    <p className="study-nav-note">Up to 20 sessions are saved in this browser. After a refresh, recent discussion and lesson summaries remain; full activities and earlier exchanges last for this visit.</p>
  </>
  return <aside className={`study-threads${expanded ? ' study-threads-expanded' : ''}`} aria-label="Study navigation" onKeyDown={event => {
    if (!mobile && expanded && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); collapseRail() }
  }}>
    <button type="button" className="orbit-text-button study-nav-toggle" ref={trigger} aria-label="Expand topics and history" aria-expanded={mobile ? drawerOpen : expanded} aria-haspopup={mobile ? 'dialog' : undefined} aria-controls={id} onClick={() => {
      if (mobile) { dialog.current?.showModal(); setDrawerOpen(true) }
      else { setExpanded(true); queueMicrotask(() => railClose.current?.focus()) }
    }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16m4-11 3 3-3 3" /></svg><span>Topics & history</span></button>
    {mobile ? <dialog id={id} className="study-nav-drawer" ref={dialog} aria-label="Topics and history" onClose={() => { setDrawerOpen(false); if (restoreFocus.current) trigger.current?.focus(); restoreFocus.current = true }} onClick={event => { if (event.target === event.currentTarget) close() }}>{content}</dialog>
      : <div id={id} className="study-nav-rail" hidden={!expanded}>{content}</div>}
  </aside>
}
