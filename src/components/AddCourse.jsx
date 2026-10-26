import { useState } from 'react'

export default function AddCourse({ onAddCourse }) {
  const [courseName, setCourseName] = useState('')
  const [instructor, setInstructor] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    const newCourse = {
      name: courseName,
      nextTask: 'No recommendation yet',
      reason: 'Orbit needs course material before making a recommendation',

      syllabus: {
        courseName: courseName,
        instructor: instructor,
        semester: 'Fall 2026',
      },

      files: [],
    }

    onAddCourse(newCourse)

    setCourseName('')
    setInstructor('')
  }

  return (
    <section>
      <h2>Add a Course</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={courseName}
          onChange={(event) => setCourseName(event.target.value)}
          placeholder="Course name"
        />

        <input
          type="text"
          value={instructor}
          onChange={(event) => setInstructor(event.target.value)}
          placeholder="Instructor"
        />

        <button type="submit">Add course</button>
      </form>
    </section>
  )
}