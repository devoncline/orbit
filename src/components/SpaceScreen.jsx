import CourseDetails from './CourseDetails'
import AddCourseFile from './AddCourseFile'
import UpcomingWork from './UpcomingWork'

export default function SpaceScreen({ course, onContinue, onAddFile, onSelectSpace }) {
  return (
    <section className="orbit-page">
      <p className="orbit-eyebrow">Your learning space</p>
      <h1>{course.name}</h1>
      <p className="orbit-page-intro">A place to follow this thread, at your own pace.</p>
      <h2>{course.nextTask || `Explore ${course.name}`}</h2>
      {course.reason && <p className="orbit-muted">{course.reason}</p>}
      <div className="orbit-page-actions"><button className="orbit-button orbit-button-primary" onClick={() => onContinue(course)}>Start learning <span aria-hidden="true">→</span></button></div>
      <AddCourseFile onAddFile={(file) => onAddFile(file, course.name)} />
      <section className="calendar-group"><h2>Coming up in this space</h2><UpcomingWork courses={[course]} preview onSelectSpace={onSelectSpace} /></section>
      <details className="space-details"><summary>Material & learning details</summary><p>Current mastery: {course.mastery?.overall ?? 40}%</p><CourseDetails course={course} /></details>
    </section>
  )
}
