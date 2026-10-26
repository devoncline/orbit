import { useState } from 'react'
import './App.css'

export default function App() {
  const [studentPrompt, setStudentPrompt] = useState('')
  const [submittedPrompt, setSubmittedPrompt] = useState('')

  return (
    <div>
      <h1>Orbit</h1>
      <p>Learn → Quiz → Evaluate → Adapt → Continue</p>
      <p>Your adaptive learning companion.</p>

      <textarea
        value={studentPrompt}
        onChange={(event) => setStudentPrompt(event.target.value)}
        placeholder="What are you learning?"
      />

      <p>You are learning: {studentPrompt}</p>
    </div>
  )
}