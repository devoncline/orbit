import { useState } from 'react'

export default function StudyThreads({ threads, activeId, courses, onSwitch, onCreate }) {
  const active = threads.find((thread) => thread.id === activeId)
  const [creating, setCreating] = useState(false)
  const [courseName, setCourseName] = useState(active?.courseName || courses[0]?.name || '')
  const [topic, setTopic] = useState('')
  return <div className="study-threads">
    <details>
      <summary>Study threads <span>{threads.length}</span></summary>
      <p className="orbit-muted">Return to an idea from this app session. Refresh clears these threads.</p>
      <ul className="thread-list">{[...threads].reverse().map((thread) => <li key={thread.id}>
        <button className="orbit-button" aria-current={thread.id === activeId ? 'true' : undefined} onClick={(event) => { onSwitch(thread.id); event.currentTarget.closest('details').open = false }}>
          <strong>{thread.title}</strong>
          <small>{thread.courseName} · {thread.context} · {thread.status === 'practiced' ? 'Practiced' : 'In progress'} · <time dateTime={thread.createdAt}>{new Date(thread.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></small>
          <span>{thread.summary}</span>
        </button>
      </li>)}</ul>
    </details>
    <button className="orbit-button" onClick={() => { setCourseName(active?.courseName || courses[0]?.name || ''); setCreating(!creating) }} aria-expanded={creating}>New study thread</button>
    {creating && <form className="orbit-form thread-create" onSubmit={(event) => {
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
