import { studyLessonContext } from '../services/lessonContext'
import { parseWorkDate } from '../services/upcomingWork'
import StudyPath from './StudyPath'

export default function StudyLessonHeader({ course, lesson, step, path, today }) {
    const context = studyLessonContext(course, lesson, today)
    return <header className="study-context">
        <p className="study-subject"><span>{course.name}</span>{lesson && <span>Lesson {step}</span>}</p>
        <h1>{context.lessonTitle}</h1>
        {context.reasonForLesson && <p className="study-lesson-reason">{context.reasonForLesson}</p>}
        {context.upcomingAssignments.length > 0 && <div className="study-deadlines">
            <span>Preparing for</span>
            <ul aria-label="Upcoming assignments">{context.upcomingAssignments.map((item) => <li key={`${item.title}-${item.date}`}>
                <time dateTime={item.date}>{parseWorkDate(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>{' '}{item.title}
            </li>)}</ul>
        </div>}
        {context.focusAreas.length > 0 && <p className="study-lesson-focus"><span>Today’s focus</span> {context.focusAreas.join(' · ')}</p>}
        {lesson && <StudyPath path={path} />}
    </header>
}
