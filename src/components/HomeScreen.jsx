import orbitMascot from '../assets/mascot/orbit-hero-asset-transparent.png'
import UpcomingWork from './UpcomingWork'
import './HomeScreen.css'

export default function HomeScreen({
  courses, recommendedCourse, recommendation, loadingRecommendation,
  onContinue, onSelectSpace, onNewSpace, onNavigate, learning = false, resuming = false,
}) {
  const empty = courses.length === 0
  const nextAction = recommendation?.recommendedAction || recommendedCourse?.nextTask || 'Explore something new'
  const reason = recommendation?.reason || recommendedCourse?.reason
  const otherSpaces = courses.filter((course) => course.name !== recommendedCourse?.name).slice(0, 2)

  return (
    <div className="orbit-home">
      <section className={`home-arrival${empty ? ' home-arrival-empty' : ''}`} aria-labelledby="home-heading">
        <div className="home-copy">
          <p className="orbit-eyebrow">{empty ? 'A little curiosity goes a long way' : learning ? 'Room to focus' : 'Welcome back'}</p>
          <h1 id="home-heading">{empty ? <>Where will your<br />curiosity take you?</> : learning ? <>One idea.<br />A little further.</> : <>Let’s keep<br />learning.</>}</h1>
          <p className="home-intro">{empty ? 'A class, a new skill, or something you’ve always wondered about. There’s space for it here.' : 'Pick up a thread. See where it leads.'}</p>
          {empty ? (
            <div className="home-entry-points" aria-label="Start learning">
              <button onClick={() => onNewSpace('class')}><span><strong>I’m taking a class</strong><small>Make a space for what you’re studying.</small></span><span aria-hidden="true">↗</span></button>
              <button onClick={() => onNewSpace('topic')}><span><strong>I want to learn something</strong><small>Follow a subject, a skill, or a question.</small></span><span aria-hidden="true">↗</span></button>
              <button onClick={() => onNewSpace('material')}><span><strong>I already have material</strong><small>Start a space, then bring in a PDF.</small></span><span aria-hidden="true">↗</span></button>
            </div>
          ) : (
            <div className="home-recommendation">
              <p className="orbit-eyebrow">Your next step</p>
              <button className="orbit-text-button home-space-label" onClick={() => onSelectSpace(recommendedCourse.name)}><span className="space-dot" />{recommendedCourse.name}<span aria-hidden="true">↗</span></button>
              <h2>{nextAction}</h2>
              <p className="home-reason">{reason || 'Start with a short explanation, try the idea, and check what you understand.'}</p>
              <button className="orbit-button orbit-button-primary" onClick={() => onContinue(recommendedCourse)}>{resuming ? 'Continue learning' : 'Start learning'} <span aria-hidden="true">→</span></button>
              <p className="home-status" role="status">{loadingRecommendation ? 'Orbit is considering your next step…' : 'A short lesson. Room for questions. A chance to try.'}</p>
            </div>
          )}
        </div>
        <div className="home-companion" aria-hidden="true">
          <img src={orbitMascot} alt="" width="1600" height="1600" decoding="async" />
          <p>A little further, together.</p>
        </div>
      </section>
      {!empty && (
        <div className="home-support">
          <section aria-labelledby="other-spaces-heading">
            <div className="orbit-section-heading"><h2 id="other-spaces-heading">{otherSpaces.length ? 'Other paths to explore' : 'Your learning space'}</h2><button className="orbit-text-button" onClick={() => onNavigate('library')}>Library <span aria-hidden="true">↗</span></button></div>
            <ul className="space-links">
              {(otherSpaces.length ? otherSpaces : [recommendedCourse]).map((course) => (
                <li key={course.name}><button onClick={() => onSelectSpace(course.name)}><span className="space-dot" /><span><strong>{course.name}</strong><small>{course.nextTask || 'Take the next step'}</small></span><span aria-hidden="true">→</span></button></li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="coming-up-heading">
            <div className="orbit-section-heading"><h2 id="coming-up-heading">Coming up</h2><button className="orbit-text-button" onClick={() => onNavigate('calendar')}>Calendar <span aria-hidden="true">↗</span></button></div>
            <UpcomingWork courses={courses} preview onSelectSpace={onSelectSpace} />
          </section>
        </div>
      )}
    </div>
  )
}
