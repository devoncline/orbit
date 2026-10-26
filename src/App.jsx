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
        <section>
          <h2>Biology Session</h2>
          <p>Let’s review photosynthesis.</p>

          <h3>Question 1</h3>
          <p>What is the main purpose of photosynthesis?</p>

          <button
            onClick={() => {
              setAnswerResult('incorrect')
              setShowAdaptedLesson(true)
            }}
          >
            To make oxygen for animals
          </button>

          <button
            onClick={() => {
              setAnswerResult('correct')
              setShowAdaptedLesson(false)
            }}
          >
            To convert light energy into chemical energy
          </button>

          <button
            onClick={() => {
              setAnswerResult('incorrect')
              setShowAdaptedLesson(true)
            }}
          >
            To absorb nutrients from the soil
          </button>

          {answerResult === 'correct' && (
            <p>
              Correct. Photosynthesis converts light energy into chemical energy.
            </p>
          )}

          {answerResult === 'incorrect' && (
            <p>
              Not quite. Orbit noticed a gap, so the next step should explain this
              differently before moving on.
            </p>
          )}

          {showAdaptedLesson && (
            <div>
              <h3>Orbit changed the approach</h3>

              <p>
                Think of a plant like a tiny solar-powered factory.
              </p>

              <p>
                Sunlight is the energy source. The plant uses that energy to make
                glucose, which stores chemical energy the plant can use later.
              </p>

              <h4>Try this instead:</h4>

              <p>
                If sunlight gives the plant energy, where does that energy end up?
              </p>

              <button onClick={() => setFollowUpResult('correct')}>
                Stored in glucose
              </button>

              <button onClick={() => setFollowUpResult('incorrect')}>
                Stored in oxygen
              </button>

              <button onClick={() => setFollowUpResult('incorrect')}>
                Stored in the soil
              </button>

              {followUpResult === 'correct' && (
                <p>
                  Nice. That shows the concept is starting to click. Orbit can now move you
                  forward.
                </p>
              )}

              {followUpResult === 'incorrect' && (
                <p>
                  Orbit would simplify the idea again before advancing.
                </p>
              )}
            </div>
          )}
        </section>
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