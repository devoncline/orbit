import OrbitStage from './OrbitStage'
import { learningAction } from './learningAction'
import UpcomingWork from './UpcomingWork'
import CoursePosition from './CoursePosition'
import { continuationReason, inferCoursePosition, positionAction } from '../services/coursePosition'
import './HomeScreen.css'

export default function HomeScreen({
  courses, recommendedCourse, recommendation, loadingRecommendation,
  onContinue, onSelectSpace, onNewSpace, onNavigate, resuming = false,
  today, onPositionChange,
}) {
  const empty = courses.length === 0
  const position = recommendedCourse ? inferCoursePosition(recommendedCourse, today) : null
  const nextAction = position && (position.currentTopic || position.needsConfirmation || position.learner.exclusions.length)
    ? positionAction(recommendedCourse, position) : recommendation?.recommendedAction || recommendedCourse?.nextTask || 'Explore something new'
  const reason = (recommendedCourse && continuationReason(recommendedCourse, today)) || recommendation?.reason || recommendedCourse?.reason
  const otherSpaces = courses.filter((course) => course.name !== recommendedCourse?.name).slice(0, 2)

  return (
    <div className="orbit-home">
      <section className={`home-arrival${empty ? ' home-arrival-empty' : ''}`} aria-labelledby="home-heading">
        <div className="home-copy">
          {empty ? (
            <>
              <h1 id="home-heading">What do you want<br />to do?</h1>
              <div className="home-entry-points" aria-label="Start learning">
                <button onClick={() => onNewSpace('class')}><strong>I’m taking a class</strong></button>
                <button onClick={() => onNavigate('learn')}><strong>I want to learn something</strong></button>
                <button onClick={() => onNewSpace('material')}><span><strong>I already have material</strong><small>Add a PDF</small></span></button>
              </div>
            </>
          ) : (
            <div className="home-recommendation">
              <button className="orbit-text-button home-space-label" onClick={() => onSelectSpace(recommendedCourse.name)}><span className="space-dot" />{recommendedCourse.name}</button>
              <h1 id="home-heading">{nextAction}</h1>
              {reason && <p className="home-reason">{reason}</p>}
              <button className="orbit-button orbit-button-primary" onClick={() => onContinue(recommendedCourse)}>{learningAction(nextAction, recommendedCourse.name, resuming)}</button>
              <CoursePosition course={recommendedCourse} today={today} onChange={onPositionChange} showSummary={false} />
              <p className="home-status" role="status">{loadingRecommendation ? 'Updating recommendation…' : ''}</p>
            </div>
          )}
        </div>
        <OrbitStage variant="home" thinking={loadingRecommendation} />
      </section>
      {!empty && (
        <div className="home-support">
          <section aria-labelledby="other-spaces-heading">
            <div className="orbit-section-heading"><h2 id="other-spaces-heading">{otherSpaces.length ? 'Your other spaces' : 'Your space'}</h2><button className="orbit-text-button" onClick={() => onNavigate('library')}>Library</button></div>
            <ul className="space-links">
              {(otherSpaces.length ? otherSpaces : [recommendedCourse]).map((course) => (
                <li key={course.name}><button onClick={() => onSelectSpace(course.name)}><span className="space-dot" /><span><strong>{course.name}</strong><small>{positionAction(course, inferCoursePosition(course, today))}</small></span></button></li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="coming-up-heading">
            <div className="orbit-section-heading"><h2 id="coming-up-heading">Coming up</h2><button className="orbit-text-button" onClick={() => onNavigate('calendar')}>Calendar</button></div>
            <UpcomingWork courses={courses} preview onSelectSpace={onSelectSpace} />
          </section>
        </div>
      )}
    </div>
  )
}
