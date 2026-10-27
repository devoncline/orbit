import CourseDetails from './CourseDetails'
import AddCourseFile from './AddCourseFile'
import UpcomingWork from './UpcomingWork'
import OrbitStage from './OrbitStage'
import { learningAction } from './learningAction'
import CoursePosition from './CoursePosition'
import { inferCoursePosition, positionAction } from '../services/coursePosition'

export default function SpaceScreen({ course, onContinue, onAddFile, onSelectSpace, today, onPositionChange, onNewThread }) {
  const position = inferCoursePosition(course, today)
  const action = positionAction(course, position)
  return (
    <section className="orbit-page orbit-page-layout space-page">
      <header className="orbit-page-header"><h1>{course.name}</h1></header>
      <OrbitStage variant="page" />
      <div className="orbit-page-content">
      <h2>{action}</h2>
      {!position.reason && course.reason && <p className="orbit-muted">{course.reason}</p>}
      <CoursePosition course={course} today={today} onChange={onPositionChange} />
      <div className="orbit-page-actions"><button className="orbit-button orbit-button-primary" onClick={() => onContinue(course)}>{learningAction(action, course.name)}</button>
        {onNewThread && <button className="orbit-button" onClick={() => onNewThread(course)}>New study thread</button>}
      </div>
      <AddCourseFile onAddFile={(file) => onAddFile(file, course.name)} />
      <section className="calendar-group"><h2>Coming up in this space</h2><UpcomingWork courses={[course]} preview onSelectSpace={onSelectSpace} /></section>
      <details className="space-details"><summary>Material & learning details</summary><p>Current mastery: {course.mastery?.overall ?? 40}%</p><CourseDetails course={course} /></details>
      </div>
    </section>
  )
}
