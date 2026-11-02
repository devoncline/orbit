import { useState } from 'react'
import { inferCoursePosition } from '../services/coursePosition'

export default function CoursePosition({ course, today, onChange, showSummary = true, editLabel = 'Change starting point', saveLabel = 'Save starting point', fieldLabel = 'What are you working on now?', placeholder = 'Enter your current topic', clearLabel = 'Clear my correction' }) {
  const [topic, setTopic] = useState('')
  const [editing, setEditing] = useState(false)
  const position = inferCoursePosition(course, today)
  if (!onChange) return null
  const open = editing || position.needsConfirmation

  return <div className="course-position">
    {showSummary && position.currentTopic && <p>{position.source === 'learner' ? 'Your starting point: ' : 'A likely starting point: '}<strong>{position.currentTopic}</strong></p>}
    {showSummary && position.reason && <p>{position.reason}</p>}
    {!open && <button className="orbit-text-button" onClick={() => setEditing(true)}>{editLabel}</button>}
    {open && <form className="orbit-form" noValidate onSubmit={(event) => {
      event.preventDefault()
      if (!topic.trim()) return
      onChange({ type: 'current', topic: topic.trim(), statement: `I'm currently on ${topic.trim()}` })
      setTopic('')
      setEditing(false)
    }}>
      <label>{fieldLabel}
        <input maxLength={120} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder={placeholder} />
      </label>
      <div className="position-actions">
        <button className="orbit-button" type="submit" disabled={!topic.trim()}>{saveLabel}</button>
        {!position.needsConfirmation && <button className="orbit-text-button" type="button" onClick={() => setEditing(false)}>Cancel</button>}
        {course.learnerPosition && <button className="orbit-text-button" type="button" onClick={() => { onChange(null); setEditing(false) }}>{clearLabel}</button>}
      </div>
    </form>}
  </div>
}
