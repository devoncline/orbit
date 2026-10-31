import { useId, useRef, useState } from 'react'
import { normalizeLearningPreferences, normalizeLearningProfile, PROFILE_QUESTIONS } from '../services/learningProfile'
import './LearningPreferences.css'

export default function LearningPreferences({ value, onChange }) {
  const preferences = normalizeLearningPreferences(value)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(preferences.profile)
  const [message, setMessage] = useState('')
  const heading = useRef(null)
  const id = useId()
  function start() {
    setDraft(preferences.profile)
    setEditing(true)
    setMessage('')
    heading.current?.focus({ preventScroll: true })
  }
  function finish(next, message) {
    if (next) onChange(next)
    setEditing(false)
    setMessage(message)
    heading.current?.focus({ preventScroll: true })
  }
  return <section className="learning-preferences" aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`} tabIndex={-1} ref={heading}>{editing ? 'How do you like to learn?' : 'Learning preferences'}</h2>
    {editing ? <form onSubmit={(event) => { event.preventDefault(); finish({ status: 'saved', profile: normalizeLearningProfile(draft) }, 'Preferences saved. They will guide your next explanation.') }}>
      <p>Tell Orbit what tends to help you learn. Five quick choices, about a minute. You can change them any time.</p>
      {PROFILE_QUESTIONS.map(({ key, question, options }, index) => <fieldset key={key}>
        <legend>{index + 1}. {question}</legend>
        {options.map(({ value, label }) => <label key={value} className={draft[key] === value ? 'preference-selected' : ''}>
          <input type="radio" name={`${id}-${key}`} value={value} checked={draft[key] === value} onChange={() => setDraft((current) => ({ ...current, [key]: value }))} />
          <span>{label}</span>
        </label>)}
      </fieldset>)}
      <p className="orbit-session-note">Saved in this browser. Your choices guide Orbit’s AI explanations; they do not measure ability or change progress.</p>
      <div className="orbit-page-actions">
        <button className="orbit-button orbit-button-primary" type="submit">Save preferences</button>
        <button className="orbit-text-button" type="button" onClick={() => finish(preferences.status === 'saved' ? null : { status: 'dismissed' }, preferences.status === 'saved' ? 'Changes canceled.' : 'Setup skipped. You can return here any time.')}>{preferences.status === 'saved' ? 'Cancel' : 'Skip setup'}</button>
      </div>
    </form> : preferences.status === 'saved' ? <>
      <ul>{PROFILE_QUESTIONS.map(({ key, options }) => <li key={key}>{options.find((option) => option.value === preferences.profile[key]).summary}</li>)}</ul>
      <div className="orbit-page-actions">
        <button className="orbit-text-button" onClick={start}>Edit preferences</button>
        <button className="orbit-text-button" onClick={() => finish({ status: 'dismissed' }, 'Preferences reset to Orbit’s defaults. Your learning progress is unchanged.')}>Reset preferences</button>
      </div>
    </> : <>
      {preferences.status === 'new' && <p>Help Orbit learn how you learn. Five optional choices to shape your explanations.</p>}
      <div className="orbit-page-actions">
        <button className="orbit-text-button" onClick={start}>{preferences.status === 'new' ? 'Set up my preferences' : 'Choose learning preferences'}</button>
        {preferences.status === 'new' && <button className="orbit-text-button" onClick={() => finish({ status: 'dismissed' }, 'Setup dismissed. You can choose preferences here or in Library.')}>Not now</button>}
      </div>
    </>}
    <p className="orbit-session-note" role="status">{message}</p>
  </section>
}
