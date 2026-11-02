import { useId, useState } from 'react'
import { startedTopics, threadDate, threadDescription } from '../services/studyNavigation'
import TopicItem from './TopicItem'
import { topicMasteryRank } from '../services/masteryRanks'

export default function TopicBrowser({ threads, courseName, mastery, activeId, onOpen }) {
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(8)
  const [expanded, setExpanded] = useState(null)
  const id = useId()
  const topics = startedTopics(threads, courseName)
  const filtered = topics.filter(group => `${group.topic} ${group.threads.map(thread => thread.title).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()))
  return <div className="topic-browser">
    {topics.length > 5 && <label className="topic-search" htmlFor={id}>Find a topic<input id={id} type="search" value={query} onChange={event => { setQuery(event.target.value); setLimit(8) }} placeholder="Search your topics" /></label>}
    {!topics.length ? <p className="orbit-muted">Your topics will appear here after you start learning.</p> : <>
      <ul className="topic-grid">{filtered.slice(0, limit).map(group => {
        const latest = group.threads[0]
        return <li key={group.id}><TopicItem topic={group.topic} rank={topicMasteryRank(mastery, group.topic)} detail={threadDescription(latest)} meta={threadDate(latest)} current={group.threads.some(thread => thread.id === activeId)} onClick={() => onOpen(latest.id)}>
          {group.threads.length > 1 && <div className="topic-sessions">
            <button className="orbit-text-button" aria-expanded={expanded === group.id} aria-controls={`${id}-${latest.id}`} onClick={() => setExpanded(expanded === group.id ? null : group.id)}>{group.threads.length} saved sessions</button>
            {expanded === group.id && <ul id={`${id}-${latest.id}`}>{group.threads.map(thread => <li key={thread.id}><button className="orbit-text-button" aria-current={thread.id === activeId ? 'true' : undefined} onClick={() => onOpen(thread.id)}><strong>{thread.title || group.topic}</strong><small>{threadDescription(thread)} · {threadDate(thread)}</small>{thread.summary && <span>{thread.summary}</span>}</button></li>)}</ul>}
          </div>}
        </TopicItem></li>
      })}</ul>
      {!filtered.length && <p role="status" className="orbit-muted">No topics match “{query}”.</p>}
      {filtered.length > limit && <button className="orbit-text-button" onClick={() => setLimit(limit + 8)}>Show more topics ({filtered.length - limit})</button>}
    </>}
  </div>
}
