import AddCourse from './AddCourse'
import AddCourseFile from './AddCourseFile'
import CourseDetails from './CourseDetails'
import orbitLogo from '../assets/brand/orbit-logo-horizontal-dark.svg'
import orbitMascot from '../assets/mascot/orbit-hero-asset-transparent.png'
import './HomeScreen.css'

export default function HomeScreen({
  courses,
  recommendedCourse,
  recommendation,
  loadingRecommendation,
  onContinue,
  onAddCourse,
  onAddFile,
}) {
  const waitingForFirstRecommendation = loadingRecommendation && !recommendation
  const nextAction = recommendation?.recommendedAction || recommendedCourse.nextTask
  const reason = recommendation?.reason || recommendedCourse.reason

  return (
    <div className="orbit-home" id="home">
      <a className="home-skip-link" href="#home-content">Skip to learning</a>

      <header className="home-header">
        <div className="home-container home-header-content">
          <a className="home-wordmark" href="#home">
            <img className="home-logo" src={orbitLogo} alt="Orbit home" width="528" height="176" />
          </a>
          <nav className="home-nav" aria-label="Main navigation">
            <a href="#home" aria-current="page">Learn</a>
            <a href="#courses">Courses</a>
          </nav>
        </div>
      </header>

      <main className="home-container" id="home-content" tabIndex={-1}>
        <section className="home-hero" aria-labelledby="home-heading">
          {/* A full-hero layer for future environmental artwork and ambient motion. */}
          <div className="home-hero-environment" aria-hidden="true" />

          <div className="home-hero-content">
            <p className="home-eyebrow">Your next step</p>
            <h1 id="home-heading">Let's keep learning.</h1>

            <div className="home-recommendation">
              <p className="home-course-label">{recommendedCourse.name}</p>
              <h2>{nextAction}</h2>
              {reason && <p className="home-reason">{reason}</p>}
            </div>

            <div className="home-hero-action">
              <button
                className="home-button home-button-primary"
                type="button"
                onClick={onContinue}
                disabled={loadingRecommendation}
              >
                Continue learning <span aria-hidden="true">→</span>
              </button>
              <p className="home-status" role="status">
                {loadingRecommendation
                  ? waitingForFirstRecommendation
                    ? 'Finding your next step…'
                    : 'Updating your next step…'
                  : ''}
              </p>
            </div>
          </div>

          <div className="home-hero-scene" aria-hidden="true">
            <img
              className="home-mascot"
              src={orbitMascot}
              alt=""
              width="1600"
              height="1600"
              decoding="async"
            />
          </div>
        </section>

        <section className="home-courses" id="courses" aria-labelledby="courses-heading">
          <div className="home-section-heading">
            <h2 id="courses-heading">Your courses</h2>
            <p>Choose where to go next.</p>
          </div>

          <ul className="home-course-list">
            {courses.map((course) => (
              <li key={course.name}>
                <details className="home-course">
                  <summary className="home-course-row">
                    <span className="home-course-copy">
                      <span className="home-course-name">{course.name}</span>
                      <span className="home-course-task">{course.nextTask}</span>
                      {course.reason && <span className="home-course-reason">{course.reason}</span>}
                    </span>
                    <span className="home-mastery">{course.mastery?.overall ?? 40}% mastery</span>
                    <span className="home-course-toggle" aria-hidden="true">
                      <span className="home-course-view">View course</span>
                      <span className="home-course-close">Close details</span>
                      <span className="home-disclosure-mark" />
                    </span>
                  </summary>
                  <div className="home-course-details">
                    <CourseDetails course={course} />
                  </div>
                </details>
              </li>
            ))}
          </ul>

          <div className="home-tools">
            <details className="home-tool">
              <summary>Add a course <span className="home-disclosure-mark" aria-hidden="true" /></summary>
              <div className="home-tool-content"><AddCourse onAddCourse={onAddCourse} /></div>
            </details>
            <details className="home-tool">
              <summary>Add course material <span className="home-disclosure-mark" aria-hidden="true" /></summary>
              <div className="home-tool-content"><AddCourseFile onAddFile={onAddFile} /></div>
            </details>
          </div>
        </section>
      </main>
    </div>
  )
}
