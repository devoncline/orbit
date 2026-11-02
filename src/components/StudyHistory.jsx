import { useId, useState } from 'react'
import { studyContextLabels } from '../services/studyNavigation'

export default function StudyHistory({ history, earlierLessons, visitedLessons = [], review, onReview }) {
  const [showAll, setShowAll] = useState(false)
  const id = useId()
  const entries = [
    ...[...history].reverse(),
    ...[...earlierLessons].reverse().map(entry => ({ type: 'lesson', title: entry.concept, summaryOnly: true, understood: entry.understood,
      content: `You visited ${entry.concept} in ${entry.topic}.${entry.understood ? ' You said you felt ready to continue.' : ''}` })),
  ]
  if (!entries.length) return null
  return <section className="study-history" aria-labelledby={`${id}-heading`}>
    <h3 id={`${id}-heading`}>Previous work</h3>
    <ul className="study-history-list" id={id}>{entries.slice(0, showAll ? entries.length : 5).map((entry, index) => <li key={index}>
      <button className="orbit-text-button" data-study-navigation-select aria-current={review === entry || (entry.summaryOnly && review?.summaryOnly && review.title === entry.title) ? 'true' : undefined} onClick={() => onReview(entry)}>
        <strong>{entry.title}</strong><small>{studyContextLabels[entry.type] || 'Lesson'}{entry.summaryOnly ? ' · Saved summary' : ''}{entry.understood || (entry.type === 'lesson' && visitedLessons.some(item => item.understood && item.concept.slice(0, 80) === entry.title)) ? ' · Felt ready' : ''}</small>
      </button>
    </li>)}</ul>
    {entries.length > 5 && <button className="orbit-text-button study-history-toggle" aria-expanded={showAll} aria-controls={id} onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : `Show more (${entries.length - 5})`}</button>}
  </section>
}
