// Isolated responsive fixture: no local storage, provider calls, or learner data.
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import AppShell from '../../src/components/AppShell'
import SpaceScreen from '../../src/components/SpaceScreen'
import StudySession from '../../src/components/StudySession'
import TopicItem from '../../src/components/TopicItem'
import { biologyCourse } from './courseLaunch'
import '../../src/index.css'

const courses = [biologyCourse, { name: 'Astronomy', importantTopics: ['Stars'], mastery: { overall: 0, topics: {} } }]
const threads = Array.from({ length: 15 }, (_, i) => {
  const topic = i < 2 ? 'Photosynthesis' : i === 2 ? 'How extraordinarily long topic names wrap without losing the meaning of the lesson or overflowing a narrow phone screen' : `Biology topic ${i}`
  return { id: String(i), topic, title: `${topic} · session ${i + 1}`, courseName: biologyCourse.name, context: i % 2 ? 'activity' : 'conversation', updatedAt: `2026-10-${String(30 - i).padStart(2, '0')}T12:00:00Z`,
    resume: { lesson: { topic, concept: `A useful idea ${i + 1}`, content: 'Plants use **light**, water and carbon dioxide to store energy in sugar. Oxygen is released.\n\nTry connecting each input to its role in the process.' },
      conversation: [{ message: 'Where does the carbon come from?', response: 'The carbon comes from carbon dioxide in the air.' }], learningPath: { step: 2, visited: [{ topic, concept: 'Inputs and outputs', understood: true }] } } }
})

export function Fixture() {
  const [count, setCount] = useState(15)
  const [course, setCourse] = useState(courses[0])
  const [active, setActive] = useState(null)
  const [notice, setNotice] = useState('')
  return <><div style={{ padding: 8, background: '#20283c', color: 'white', position: 'relative', zIndex: 9 }}>
    {[0, 1, 15].map(value => <button key={value} onClick={() => { setCount(value); setActive(null) }}>{value} topics</button>)}
    <button onClick={() => { setCourse(courses[1]); setActive(null) }}>Other class</button><button onClick={() => { setCourse(courses[0]); setActive(null) }}>Biology class</button><output>{notice}</output>
  </div><AppShell courses={courses} destination={active ? 'study' : 'space'} selectedSpace={course.name} onNavigate={() => setActive(null)} onSelectSpace={name => { setCourse(courses.find(item => item.name === name)); setActive(null) }} onNewSpace={() => setNotice('New space selected')}>
    {active ? <div className="orbit-page study-page"><div className="study-room"><StudySession key={active.id} course={course} mastery={40} threadId={active.id} initialThread={active} learningProfile={{ visualPreference: 'on_request' }} navigation={{ threads: threads.slice(0, count), activeId: active.id, courses, onSwitch: id => setActive(threads.find(thread => thread.id === id)), onSelectSpace: () => setActive(null), onCreate: () => setNotice('Start topic selected') }} /></div></div>
      : <SpaceScreen course={course} threads={threads.slice(0, count)} onOpenThread={id => setActive(threads.find(thread => thread.id === id))} onStartLesson={() => setNotice('Lesson launch selected')} today="2026-11-01" />}
    {!active && <div style={{ maxWidth: 460, marginBlock: 24 }}><TopicItem topic="Future mastery slot preview" detail="Optional presentation only" mastery={<><span aria-hidden="true">✦</span><span>Rank label</span></>} onClick={() => setNotice('Badge preview selected')} /></div>}
  </AppShell></>
}

export function Review() {
  const [width, setWidth] = useState(1440)
  const [measurement, setMeasurement] = useState('')
  const frame = useRef(null)
  useEffect(() => {
    const timer = setInterval(() => {
      const doc = frame.current?.contentDocument
      if (!doc) return
      const drawers = [...doc.querySelectorAll('dialog[open]')]
      setMeasurement(`Viewport ${frame.current.clientWidth} / document ${doc.documentElement.scrollWidth} / drawer overflow ${drawers.some(el => el.scrollWidth > el.clientWidth + 1)} / runtime errors ${doc.documentElement.dataset.errors || 0} / requests ${doc.documentElement.dataset.requests || 0}`)
    }, 300)
    return () => clearInterval(timer)
  }, [])
  return <div style={{ height: '100dvh', display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', background: '#252a35' }}><header style={{ padding: 10, color: 'white', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
    {[1440, 768, 390, 320].map(value => <button key={value} onClick={() => setWidth(value)}>{value}px</button>)}<output>{measurement}</output></header>
    <div style={{ overflow: 'auto' }}><iframe ref={frame} title="Navigation preview" src="?frame" style={{ display: 'block', border: 0, width, height: '100%', marginInline: 'auto' }} /></div></div>
}

if (location.search.includes('frame')) {
  window.addEventListener('error', () => { document.documentElement.dataset.errors = String(Number(document.documentElement.dataset.errors || 0) + 1) })
  window.addEventListener('unhandledrejection', () => { document.documentElement.dataset.errors = String(Number(document.documentElement.dataset.errors || 0) + 1) })
  window.fetch = async () => { document.documentElement.dataset.requests = String(Number(document.documentElement.dataset.requests || 0) + 1); throw new Error('Provider calls disabled in navigation review') }
}
createRoot(document.getElementById('root')).render(location.search.includes('frame') ? <Fixture /> : <Review />)
