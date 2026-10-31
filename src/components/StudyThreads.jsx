import { useEffect, useId, useRef, useState } from 'react'

export default function StudyThreads({ threads, activeId, courses, onSwitch, onCreate }) {
  const active = threads.find((thread) => thread.id === activeId)
  const [creating, setCreating] = useState(false)
  const [courseName, setCourseName] = useState(active?.courseName || courses[0]?.name || '')
  const [topic, setTopic] = useState('')
  const selector = useRef(null)
  const createId = useId()

  useEffect(() => {
    function dismiss(event) {
      if (selector.current?.open && !selector.current.contains(event.target)) selector.current.open = false
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [])

  function closeSelector() {
    if (!selector.current) return
    selector.current.open = false
    selector.current.querySelector('summary')?.focus()
  }

  return <div className="study-threads">
    <div className="study-thread-toolbar">
    <details className="study-thread-selector" ref={selector} onKeyDown={(event) => {
      if (event.key === 'Escape' && event.currentTarget.open) { event.preventDefault(); event.stopPropagation(); closeSelector() }
    }} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false
    }}>
      <summary><span className="study-thread-context"><span>Study threads <small>{threads.length}</small></span><strong>{active?.title || 'Choose a thread'}</strong></span></summary>
      <div className="thread-menu">
      <p className="orbit-muted">This browser keeps up to 20 recent threads, their summaries, and a little context to continue.</p>
      <ul className="thread-list">{[...threads].reverse().map((thread) => <li key={thread.id}>
        <button aria-current={thread.id === activeId ? 'true' : undefined} onClick={() => { closeSelector(); onSwitch(thread.id) }}>
          <span className="thread-option-heading"><strong>{thread.title}</strong>{thread.id === activeId && <small className="thread-current">Current</small>}</span>
          <small>{thread.courseName} · {thread.context} · {thread.status === 'practiced' ? 'Practiced' : 'In progress'} · <time dateTime={thread.createdAt}>{new Date(thread.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></small>
          <span className="thread-option-summary">{thread.summary}</span>
        </button>
      </li>)}</ul>
      </div>
    </details>
    <button className="orbit-text-button study-thread-new" onClick={() => { setCourseName(active?.courseName || courses[0]?.name || ''); setCreating(!creating) }} aria-expanded={creating} aria-controls={createId}><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg><span>New thread</span></button>
    </div>
    {creating && <form id={createId} className="orbit-form thread-create" onSubmit={(event) => {
      event.preventDefault()
      const course = courses.find((entry) => entry.name === courseName)
      if (!course) return
      onCreate(course, topic.trim())
      setCreating(false)
      setTopic('')
    }}>
      <label>Learning space<select value={courseName} onChange={(event) => setCourseName(event.target.value)}>{courses.map((course) => <option key={course.name}>{course.name}</option>)}</select></label>
      <label>What would you like to explore? (optional)<input value={topic} maxLength={120} onChange={(event) => setTopic(event.target.value)} placeholder="Use my current course position" /></label>
      <button className="orbit-button orbit-button-primary" disabled={!courses.length}>Start thread</button>
    </form>}
  </div>
}
