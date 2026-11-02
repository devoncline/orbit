import { useId, useState } from 'react'
import OrbitStage from './OrbitStage'

const subjects = ['React', 'Quantum physics', 'Biology', 'Music theory', 'History of ancient Rome']

export default function LearnScreen({ courses, recommendedCourse, onStart, onSelectSpace }) {
  const [topic, setTopic] = useState(recommendedCourse?.name || '')
  const suggestionsId = useId()
  const suggestions = [...new Map([...courses.map((course) => course.name), ...subjects]
    .map((name) => [name.toLowerCase(), name])).values()]

  return (
    <section className="orbit-page orbit-page-layout" aria-labelledby="learn-heading">
      <header className="orbit-page-header"><h1 id="learn-heading">What do you want to learn?</h1></header>
      <OrbitStage variant="page" expression={!topic.trim() ? 'shy' : 'rest'} />
      <div className="orbit-page-content">
        {courses.length > 0 && <section className="learn-spaces"><h2>Your spaces</h2><ul className="space-links">{courses.map(course => <li key={course.name}><button onClick={() => onSelectSpace?.(course.name)}><span className="space-dot" /><span><strong>{course.name}</strong><small>Recommendations, recent learning & topics</small></span></button></li>)}</ul></section>}
        <form className="orbit-form" onSubmit={(event) => {
          event.preventDefault()
          if (topic.trim()) onStart(topic.trim())
        }}>
          <label>Subject or topic
            <input name="topic" type="text" required maxLength={120} autoComplete="off" list={suggestionsId}
              value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. React or music theory" />
          </label>
          <datalist id={suggestionsId}>{suggestions.map((name) => <option key={name} value={name} />)}</datalist>
          <button className="orbit-button orbit-button-primary" type="submit" disabled={!topic.trim()}>Start learning</button>
        </form>
      </div>
    </section>
  )
}
