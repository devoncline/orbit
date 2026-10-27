import { useState } from 'react'

export default function AddCourse({ onAddCourse, intent = 'topic', courses = [] }) {
  const [courseName, setCourseName] = useState('')
  const [instructor, setInstructor] = useState('')
  const [goal, setGoal] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    const name = courseName.trim()
    if (!name) {
      setError('Give your space a name.')
      return
    }
    if (courses.some((course) => course.name.toLowerCase() === name.toLowerCase())) {
      setError('You already have a space with that name. Choose it from Your spaces, or use a different name.')
      return
    }

    const newCourse = {
      name,
      nextTask: goal.trim() || `Explore ${name}`,
      reason: '',
      ...(intent === 'class' ? { syllabus: { courseName: name, instructor: instructor.trim(), semester: '' } } : {}),
      files: [],
    }

    onAddCourse(newCourse)

    setCourseName('')
    setInstructor('')
  }

  return (
      <form className="orbit-form" onSubmit={handleSubmit}>
        <label>{intent === 'class' ? 'Class name' : intent === 'material' ? 'Space name' : 'Topic or skill'}
        <input
          type="text"
          autoComplete="off"
          required
          maxLength={120}
          value={courseName}
          onChange={(event) => { setCourseName(event.target.value); setError('') }}
          placeholder={intent === 'class' ? 'e.g. Biology 101' : 'e.g. React, music theory, quantum physics'}
        />
        </label>
        <label>A starting point (optional)
          <input type="text" maxLength={240} value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="An idea, a question, or something to practice" />
        </label>
        {intent === 'class' && <label>Instructor (optional)
        <input
          type="text"
          maxLength={120}
          value={instructor}
          onChange={(event) => setInstructor(event.target.value)}
          placeholder="Instructor"
        />
        </label>}
        {error && <p role="alert">{error}</p>}
        <button className="orbit-button orbit-button-primary" type="submit">{intent === 'material' ? 'Create space & add PDF' : 'Create space'}</button>
      </form>
  )
}
