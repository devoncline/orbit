import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight02Icon } from '@hugeicons/core-free-icons'
import OrbitStage from './OrbitStage'
import Carousel from './Carousel/Carousel'
import { learnRecommendations } from '../services/learnRecommendations'
import './LearnScreen.css'

export default function LearnScreen({ courses, threads = [], today, onStart, onSelectSpace, onOpenTopic, onNewSpace }) {
  const [topic, setTopic] = useState('')
  const recommendations = learnRecommendations(courses, threads, today)

  return (
    <section className="orbit-page orbit-page-layout learn-page" aria-labelledby="learn-heading">
      <header className="orbit-page-header"><h1 id="learn-heading">What do you want to learn?</h1></header>
      <OrbitStage variant="page" expression={!topic.trim() ? 'shy' : 'rest'} />
      <div className="orbit-page-content">
        <section className="learn-recommendations" aria-labelledby="learn-recommendations-heading">
          <h2 id="learn-recommendations-heading">Recommended next</h2>
          {recommendations.length ? <Carousel items={recommendations} loop renderItem={(item, active) => <button type="button"
            className="learn-recommendation" tabIndex={active ? 0 : -1} onClick={() => {
              if (item.kind === 'new') onNewSpace?.('topic', item.topic)
              else onOpenTopic?.(courses.find(course => course.name === item.courseName), item.topic)
            }} aria-label={`${item.kind === 'new' ? 'Create a space for' : 'Study'} ${item.topic}${item.courseName ? ` in ${item.courseName}` : ''}`}>
            <span className="learn-recommendation-space">{item.courseName || 'New space'}</span>
            <strong>{item.topic}</strong>
            <span className="learn-recommendation-reason">{item.reason}</span>
            <span className="learn-recommendation-action" aria-hidden="true">{item.kind === 'new' ? 'Explore in a new space' : 'Explore topic'}<HugeiconsIcon icon={ArrowRight02Icon} size={18} /></span>
          </button>} /> : <p className="learn-empty">No new topic suggestions yet. Choose something you’re curious about below.</p>}
        </section>
        <section className="learn-freeform" aria-labelledby="learn-freeform-heading">
        <h2 id="learn-freeform-heading">Study something new</h2>
        <form className="learn-topic-form" autoComplete="off" noValidate onSubmit={(event) => {
          event.preventDefault()
          if (topic.trim()) onStart(topic.trim())
        }}>
          <label className="carousel-sr-only" htmlFor="learn-topic-input">What do you want to learn?</label>
          <input id="learn-topic-input" name="topic" type="text" maxLength={120} autoComplete="off"
            value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="What do you want to learn?" />
          <button className="orbit-icon-button" type="submit" disabled={!topic.trim()} aria-label="Start learning"><HugeiconsIcon icon={ArrowRight02Icon} size={20} aria-hidden="true" /></button>
        </form>
        </section>
        {courses.length > 0 && <section className="learn-spaces"><h2>Your spaces</h2><ul className="space-links">{courses.map(course => <li key={course.name}><button onClick={() => onSelectSpace?.(course.name)}><span className="space-dot" /><span><strong>{course.name}</strong><small>Recommendations, recent learning & topics</small></span></button></li>)}</ul></section>}
      </div>
    </section>
  )
}
