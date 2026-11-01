import CourseDetails from './CourseDetails'
import AddCourseFile from './AddCourseFile'
import UpcomingWork from './UpcomingWork'
import OrbitStage from './OrbitStage'
import { useId, useState } from 'react'
import CoursePosition from './CoursePosition'
import { courseLaunchRecommendations } from '../services/coursePosition'
import { parseWorkDate } from '../services/upcomingWork'
import './SpaceScreen.css'

export default function SpaceScreen({ course, onStartLesson, onAddFile, today, onPositionChange }) {
  const { primary, alternatives } = courseLaunchRecommendations(course, today)
  const [topic, setTopic] = useState('')
  const id = useId()
  const validTopic = topic.trim().length > 0 && topic.trim().length <= 120
  const manual = <section className="space-topic-entry" aria-labelledby={`${id}-manual`}>
    <h2 id={`${id}-manual`}>{primary ? 'Study something else' : 'What are you working on right now?'}</h2>
    <form className="orbit-form" noValidate onSubmit={event => {
      event.preventDefault()
      if (validTopic) onStartLesson(course, topic.trim())
    }}>
      <label htmlFor={`${id}-topic`}>What do you want to work on?</label>
      <input id={`${id}-topic`} value={topic} maxLength={120} onChange={event => setTopic(event.target.value)} placeholder="Enter a topic…" />
      <button className={`orbit-button${primary ? '' : ' orbit-button-primary'}`} type="submit" disabled={!validTopic}>Start lesson</button>
    </form>
  </section>
  return (
    <section className="orbit-page orbit-page-layout space-page">
      <header className="orbit-page-header"><h1>{course.name}</h1>{course.files?.length > 0 && <p className="space-material-context">{course.files.length} {course.files.length === 1 ? 'material' : 'materials'} added to this space</p>}</header>
      <OrbitStage variant="page" />
      <div className="orbit-page-content">
      {primary ? <>
        <section className="space-recommendation" aria-labelledby={`${id}-recommended`}>
          <h2 id={`${id}-recommended`}>Recommended next</h2>
          <h3>{primary.topic}</h3>
          <p>{primary.upcomingWork ? <>Prepare for {primary.upcomingWork.title} on <time dateTime={primary.upcomingWork.date}>{parseWorkDate(primary.upcomingWork.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>.</> : primary.reason}</p>
          <button className="orbit-button orbit-button-primary" onClick={() => onStartLesson(course, primary.topic)}>Start lesson</button>
        </section>
        {alternatives.length > 0 && <section className="space-starting-options" aria-labelledby={`${id}-options`}>
          <h2 id={`${id}-options`}>Other useful topics</h2>
          <ul>{alternatives.map(option => <li key={option}><button className="orbit-text-button" aria-label={`Start lesson: ${option}`} onClick={() => onStartLesson(course, option)}><span>{option}</span><span aria-hidden="true">Start lesson <span>→</span></span></button></li>)}</ul>
        </section>}
      </> : manual}
      <section className="calendar-group space-coming-up"><h2>Coming up in this space</h2><UpcomingWork courses={[course]} preview today={today} /></section>
      {primary && manual}
      <AddCourseFile files={course.files} onAddFile={(file) => onAddFile(file, course.name)} />
      <details className="space-details"><summary>Learning details</summary><p>Current mastery: {course.mastery?.overall ?? 40}%</p><CourseDetails course={course} showMaterials={false} />
        {onPositionChange && <CoursePosition course={course} today={today} onChange={onPositionChange} showSummary={false} />}
      </details>
      </div>
    </section>
  )
}
