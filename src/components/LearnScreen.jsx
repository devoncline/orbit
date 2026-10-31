import { useId, useState } from 'react'
import OrbitStage from './OrbitStage'

const subjects = ['React', 'Quantum physics', 'Biology', 'Music theory', 'History of ancient Rome']

export default function LearnScreen({ courses, recommendedCourse, onStart }) {
  const [topic, setTopic] = useState(recommendedCourse?.name || '')
  const suggestionsId = useId()
  const suggestions = [...new Map([...courses.map((course) => course.name), ...subjects]
    .map((name) => [name.toLowerCase(), name])).values()]

  return (
    <section className="orbit-page orbit-page-layout" aria-labelledby="learn-heading">
      <header className="orbit-page-header"><h1 id="learn-heading">What do you want to learn?</h1></header>
      <OrbitStage variant="page" expression={!topic.trim() ? 'shy' : 'rest'} />
      <div className="orbit-page-content">
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
