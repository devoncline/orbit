import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import AppShell from './src/components/AppShell.jsx'
import StudySession from './src/components/StudySession.jsx'
import StudyThreads from './src/components/StudyThreads.jsx'
import LearningPreferences from './src/components/LearningPreferences.jsx'
import HomeScreen from './src/components/HomeScreen.jsx'
import LearnScreen from './src/components/LearnScreen.jsx'
import { normalizeLearningPreferences } from './src/services/learningProfile.js'
import { learningPathContextKey } from './src/services/learningPath.js'
import './src/index.css'
const scenario = new URLSearchParams(location.search).get('scenario')
const profiles = {
  guided: { chunkSize: 'short', exampleTiming: 'early', visualPreference: 'on_request', guidance: 'focused', reentrySupport: 'where_left_off' },
  explore: { chunkSize: 'detailed', exampleTiming: 'after', visualPreference: 'often', guidance: 'explore', reentrySupport: 'continue' },
}
const course = { name: 'React', mastery: { overall: 40, topics: {} } }
const visual = { type: 'generated_image', purpose: 'A render is requested, prepared, then committed to the screen.', focus: 'Rendering', data: [{ label: 'Trigger', detail: 'Request an update.' }, { label: 'Render', detail: 'Prepare the result.' }, { label: 'Commit', detail: 'Update the screen.' }] }
const lesson = { topic: 'State', concept: 'From a click to a new screen', content: '**State is component memory.** It keeps a value between renders.\n\nWhen you click a counter, its event handler requests a state update. React renders the component again using the new value, then updates the screen.\n\nFor example, clicking a counter showing **2** can update its state to **3**. The next render shows 3.', ...(['visual', 'failure', 'explore', 'image-wait'].includes(scenario) ? { visual } : {}) }
const json = (value) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })
let imageAttempts = 0
window.fetch = async (url, options = {}) => {
  const body = options.body ? JSON.parse(options.body) : {}
  await new Promise(resolve => setTimeout(resolve, 600))
  if (scenario === 'thinking' || (scenario === 'image-wait' && url === '/api/generate-lesson-image')) {
    await new Promise(resolve => { window.releaseReviewRequest = resolve })
  }
  if (url === '/api/generate-lesson-image') {
    imageAttempts += 1
    document.documentElement.dataset.imageRequests = imageAttempts
    if ((scenario === 'failure' && imageAttempts === 1) || document.documentElement.dataset.failNextImage === 'true') {
      delete document.documentElement.dataset.failNextImage
      return new Response('{}', { status: 503 })
    }
    return json({ url: 'https://react.dev/images/docs/illustrations/i_render-and-commit1.png' })
  }
  if (url === '/api/generate-study-lesson') return json(body.action === 'simplify'
    ? { ...lesson, content: 'Think of state as a small notebook. A click writes **3** where **2** used to be.\n\nReact reads the notebook again and shows **3** on the screen.' }
    : { ...lesson, concept: 'Responding to an event', content: 'An event handler connects a click to a state update.' })
  if (url === '/api/study-activity') return json(body.action === 'generate'
    ? { title: 'Predict the next count', instruction: 'A counter shows 2. Its click handler adds one to the state. What will the next render display, and why?', topic: 'State', type: 'prediction' }
    : { feedback: 'Separate the stored value from the rendered text. State changes first; the new render then displays that value.', signal: 'misconception' })
  if (url === '/api/generate-study-question') return json({ topic: 'State', question: 'What remembers the counter value between renders?', answers: [{ text: 'The component state', correct: true }, { text: 'The text already on the screen', correct: false }], explanation: 'State keeps the value between renders.' })
  if (url === '/api/evaluate-study-answer') return json({ feedback: 'The screen displays the value, but does not store the component memory.', adaptedExplanation: 'Think of state as a notebook and the screen as a copy. Changing the notebook lets React make an updated copy.\n\nThe notebook holds the value between renders.', followUpQuestion: 'Where should the counter remember its next value?', followUpAnswers: [{ text: 'In component state', correct: true }, { text: 'Only in the visible text', correct: false }] })
  if (url === '/api/respond-to-study-message') return new Response(JSON.stringify({ type: 'delta', text: 'State stores the value. Rendering shows it.' })+'\n'+JSON.stringify({ type: 'complete', response: 'State stores the value. Rendering shows it.', signal: 'confusion' })+'\n', { headers: { 'Content-Type': 'application/x-ndjson' } })
  throw Error('Unexpected mock route: '+url)
}
export default function Review() {
  const [preferences, setPreferences] = useState(() => normalizeLearningPreferences({ status: 'saved', profile: profiles[scenario] }))
  const [threads, setThreads] = useState([
    { id: 'earlier', title: 'Passing values from a parent to a child component', courseName: course.name, context: 'lesson', summary: 'Props carry values into a component.', createdAt: '2026-10-30T09:00:00', status: 'practiced' },
    { id: 'review', title: lesson.concept, courseName: course.name, context: 'lesson', summary: 'You were comparing stored state with visible text.', createdAt: '2026-10-30T10:00:00', status: 'active' },
  ])
  const [activeId, setActiveId] = useState('review')
  const activeThread = threads.find(thread => thread.id === activeId)
  const learningPath = { step: 3, visited: [{ topic: 'State', concept: 'Remembering a value', understood: true }], upcoming: [{ topic: 'Events', concept: 'Responding to a click and updating the value on screen' }, { topic: 'State', concept: 'Sharing state between components' }], contextKey: learningPathContextKey(course) }
  if (['home', 'learn'].includes(scenario)) return <AppShell courses={[course]} destination={scenario} onNavigate={()=>{}} onSelectSpace={()=>{}} onNewSpace={()=>{}}>
    {scenario === 'home' ? <HomeScreen courses={[course]} recommendedCourse={course} onContinue={()=>{}} onSelectSpace={()=>{}} onNewSpace={()=>{}} onNavigate={()=>{}} learningPreferences={preferences} onPreferencesChange={setPreferences} />
      : <LearnScreen courses={[]} onStart={()=>{}} />}
  </AppShell>
  return <AppShell courses={[course]} destination="study" onNavigate={()=>{}} onSelectSpace={()=>{}} onNewSpace={()=>{}}>
    <div className="orbit-page study-page">
      <StudyThreads threads={threads} activeId={activeId} courses={[course]} onSwitch={setActiveId} onCreate={(_, topic) => {
        const thread = { ...activeThread, id: `review-${threads.length}`, title: topic || lesson.concept }
        setThreads([...threads, thread]); setActiveId(thread.id)
      }} />
      <div className="study-room">
      <StudySession key={activeId} course={course} learningProfile={preferences.profile} threadId={activeId} initialThread={{ ...activeThread, resume: { lesson: { ...lesson, concept: activeThread.title }, learningPath } }} mastery={40} setMastery={()=>{}} updateTopicMastery={()=>{}} />
      {profiles[scenario] && <LearningPreferences value={preferences} onChange={(value) => setPreferences(normalizeLearningPreferences(value))} />}
    </div></div>
  </AppShell>
}
createRoot(document.getElementById('root')).render(<Review />)
