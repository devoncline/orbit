import CourseDetails from './CourseDetails'
import AddCourseFile from './AddCourseFile'
import UpcomingWork from './UpcomingWork'
import OrbitStage from './OrbitStage'
import { useId, useState } from 'react'
import CoursePosition from './CoursePosition'
import { courseLaunchRecommendations } from '../services/coursePosition'
import { parseWorkDate } from '../services/upcomingWork'
import './SpaceScreen.css'
import TopicItem from './TopicItem'
import TopicBrowser from './TopicBrowser'
import { courseThreads, findTopicThread, startedTopics, threadDate, threadDescription, threadTopic } from '../services/studyNavigation'
import { masteryRankDistribution } from '../services/masteryRanks'

export default function SpaceScreen({ course, threads = [], onOpenThread, onStartLesson, onAddFile, onAnalyzeFile, onRemoveFile, hasFile, today, onPositionChange }) {
  const { primary, recommendations } = courseLaunchRecommendations(course, today)
  const recent = courseThreads(threads, course.name).slice(0, 3)
  const rankDistribution = masteryRankDistribution(course.mastery, startedTopics(threads, course.name).map(group => group.topic))
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
      <button className={`orbit-button${primary ? '' : ' orbit-button-primary'}`} type="submit" disabled={!validTopic}>{findTopicThread(threads, course.name, topic) ? 'Continue topic' : 'Start lesson'}</button>
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
          <button className="orbit-button orbit-button-primary" onClick={() => onStartLesson(course, primary.topic)}>{findTopicThread(threads, course.name, primary.topic) ? 'Continue topic' : 'Start lesson'}</button>
        </section>
        {recommendations.length > 1 && <section className="space-starting-options" aria-label="More recommended topics">
          <ul className="topic-grid">{recommendations.slice(1).map(option => <li key={option.topic}><TopicItem topic={option.topic} detail={option.upcomingWork ? `Prepare for ${option.upcomingWork.title}.` : option.reason} action={findTopicThread(threads, course.name, option.topic) ? 'Continue' : 'Explore'} onClick={() => onStartLesson(course, option.topic)} /></li>)}</ul>
        </section>}
      </> : <section className="space-recommendation-empty"><h2>Recommended next</h2><p className="orbit-muted">Choose a topic below, or add a syllabus to find a useful starting point.</p></section>}
      <section className="space-learning-section" aria-labelledby={`${id}-continue`}>
        <h2 id={`${id}-continue`}>Continue learning</h2>
        {recent.length ? <ul className="topic-grid space-recent">{recent.map(thread => <li key={thread.id}><TopicItem topic={threadTopic(thread)} detail={threadDescription(thread)} meta={`${thread.title && thread.title !== threadTopic(thread) ? `${thread.title} · ` : ''}${threadDate(thread)}`} onClick={() => onOpenThread(thread.id)} /></li>)}</ul>
          : <p className="orbit-muted">Nothing to pick up yet. Start a lesson when you’re ready.</p>}
      </section>
      <section className="space-learning-section" aria-labelledby={`${id}-topics`}>
        <h2 id={`${id}-topics`}>Your topics</h2>
        <TopicBrowser threads={threads} courseName={course.name} mastery={course.mastery} onOpen={onOpenThread} />
      </section>
      {manual}
      <section className="calendar-group space-coming-up"><h2>Coming up in this space</h2><UpcomingWork courses={[course]} preview today={today} /></section>
      <AddCourseFile files={course.files} onAddFile={(file, kind) => onAddFile(file, course.name, kind)} onAnalyzeFile={file => onAnalyzeFile(file, course.name)} onRemoveFile={onRemoveFile && (file => onRemoveFile(file, course.name))} hasFile={hasFile} />
      <details className="space-details"><summary>Learning details</summary>
        <p>Topic mastery</p>
        {rankDistribution.length ? <ul className="space-mastery-distribution" aria-label="Topic mastery ranks">{rankDistribution.map(({ rank, count }) => <li key={rank.id}>{count} {rank.label}</li>)}</ul>
          : <p className="orbit-muted">Start a topic to begin at Launch Pad.</p>}
        <p className="orbit-muted">Each topic has its own rank. Build understanding through quiz answers, applied activities, and practice after mistakes. Reading or choosing “I understand” does not raise your rank. Your saved practice still counts.</p>
        <CourseDetails course={course} showMaterials={false} />
        {onPositionChange && <CoursePosition course={course} today={today} onChange={onPositionChange} showSummary={false} />}
      </details>
      </div>
    </section>
  )
}
