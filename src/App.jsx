import StudySession from './components/StudySession'
import { useState } from 'react'
import './App.css'

export default function App() {
  const [courses] = useState([
    {
      name: 'Biology',
      nextTask: 'Review photosynthesis',
      reason: 'Quiz tomorrow and weak performance on light reactions',
    },
    {
      name: 'Algebra',
      nextTask: 'Practice quadratic equations',
      reason: 'Homework due tonight',
    },
    {
      name: 'History',
      nextTask: 'Review Industrial Revolution notes',
      reason: 'Test on Friday',
    },
  ])

  const recommendedCourse = courses[0]
  const [sessionStarted, setSessionStarted] = useState(false)
  const [answerResult, setAnswerResult] = useState('')
  const [showAdaptedLesson, setShowAdaptedLesson] = useState(false)
  const [followUpResult, setFollowUpResult] = useState('')

  return (
    <div>
      <h1>Orbit</h1>
      <p>Learn → Quiz → Evaluate → Adapt → Continue</p>
      <p>Your adaptive learning companion.</p>

      {!sessionStarted ? (
        <section>
          <h2>What should I work on now?</h2>

          <h3>{recommendedCourse.name}</h3>
          <p>{recommendedCourse.nextTask}</p>
          <p>{recommendedCourse.reason}</p>

          <button onClick={() => setSessionStarted(true)}>
            Start session
          </button>
        </section>
      ) : (
        <StudySession
          answerResult={answerResult}
          setAnswerResult={setAnswerResult}
          showAdaptedLesson={showAdaptedLesson}
          setShowAdaptedLesson={setShowAdaptedLesson}
          followUpResult={followUpResult}
          setFollowUpResult={setFollowUpResult}
        />
      )}

      <h2>Courses</h2>

      {courses.map((course) => (
        <div key={course.name}>
          <h3>{course.name}</h3>
          <p>{course.nextTask}</p>
          <p>{course.reason}</p>
        </div>
      ))}
    </div>
  )
}