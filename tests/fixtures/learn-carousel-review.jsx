// Isolated manual layout fixture: no saved learner data or provider requests.
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import AppShell from '../../src/components/AppShell'
import LearnScreen from '../../src/components/LearnScreen'
import '../../src/index.css'

export function Preview() {
  const [count, setCount] = useState(12)
  const [notice, setNotice] = useState('')
  const courses = count ? Array.from({ length: count > 1 ? 2 : 1 }, (_, index) => ({
    name: index ? 'Orbital motion' : 'A class with a long name about light, energy, living systems and their connections',
    importantTopics: Array.from({ length: count > 1 ? 6 : 1 }, (_, i) => i === 0 ? 'How energy travels through interconnected living systems and changes along the way' : `Explore idea ${index * 6 + i + 1}`),
  })) : []
  return <><div style={{ padding: 8, background: '#20283c', color: 'white' }}>
    {[0, 1, 12].map(value => <button key={value} onClick={() => setCount(value)}>{value} suggestions</button>)}<output>{notice}</output>
  </div><AppShell courses={courses} destination="learn" onNavigate={() => {}} onSelectSpace={name => setNotice(`Open ${name}`)} onNewSpace={() => setNotice('Create a space')}>
    <LearnScreen courses={courses} today="2026-11-02" onStart={topic => setNotice(`Start ${topic}`)}
      onSelectSpace={name => setNotice(`Open ${name}`)} onOpenTopic={(course, topic) => setNotice(`Study ${topic} in ${course.name}`)}
      onNewSpace={(_intent, topic) => setNotice(`Prefill a new space: ${topic}`)} />
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
      const card = doc.querySelector('.carousel-slide[data-current] button')
      setMeasurement(`Viewport ${frame.current.clientWidth} / document ${doc.documentElement.scrollWidth} / overflow ${doc.documentElement.scrollWidth > frame.current.clientWidth + 1} / card width ${Math.round(card?.getBoundingClientRect().width || 0)} / errors ${doc.documentElement.dataset.errors || 0} / requests ${doc.documentElement.dataset.requests || 0}`)
    }, 300)
    return () => clearInterval(timer)
  }, [])
  return <div style={{ height: '100dvh', display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', background: '#252a35' }}>
    <header style={{ padding: 10, color: 'white', display: 'flex', gap: 10, flexWrap: 'wrap' }}>{[1440, 768, 390, 320].map(value => <button key={value} onClick={() => setWidth(value)}>{value}px</button>)}<output>{measurement}</output></header>
    <div style={{ overflow: 'auto' }}><iframe ref={frame} title="Learn carousel preview" src="?frame" style={{ display: 'block', border: 0, width, height: '100%', marginInline: 'auto' }} /></div>
  </div>
}

if (location.search.includes('frame')) {
  window.addEventListener('error', () => { document.documentElement.dataset.errors = String(Number(document.documentElement.dataset.errors || 0) + 1) })
  window.addEventListener('unhandledrejection', () => { document.documentElement.dataset.errors = String(Number(document.documentElement.dataset.errors || 0) + 1) })
  window.fetch = async () => { document.documentElement.dataset.requests = String(Number(document.documentElement.dataset.requests || 0) + 1); throw new Error('Requests disabled in Learn preview') }
}
createRoot(document.getElementById('root')).render(location.search.includes('frame') ? <Preview /> : <Review />)
