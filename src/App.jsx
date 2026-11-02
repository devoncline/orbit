import StudySession from './components/StudySession'
import AddCourse from './components/AddCourse'
import HomeScreen from './components/HomeScreen'
import LearnScreen from './components/LearnScreen'
import AppShell from './components/AppShell'
import SpaceScreen from './components/SpaceScreen'
import UpcomingWork from './components/UpcomingWork'
import OrbitStage from './components/OrbitStage'
import { findTopicThread } from './services/studyNavigation'
import LearningPreferences from './components/LearningPreferences'
import { normalizeLearningPreferences } from './services/learningProfile'
import { applyPositionOverride, inferCoursePosition, localDate, mergeCourseAnalysis, positionAction } from './services/coursePosition'
import { createStudyThread, resolveLearningSpace, studyThreadsReducer } from './services/studyThreads'
import { clearLearnerMemory, learnerPositionKey, loadLearnerMemory, saveLearnerMemory } from './services/learnerMemory'
import { retainLearningAnchors } from './services/studyLearningContext'
import { applyMasteryEvidence } from './services/mastery'
import { analyzeCourseFile } from './services/meta'
import { canAnalyzeMaterial, materialValidationError, MAX_COURSE_MATERIALS, materialMetadata, normalizeCourseMaterials, removeCourseMaterial, sameMaterial } from './services/courseMaterials'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import './App.css'

export default function App() {
  const [restored] = useState(loadLearnerMemory)
  const [courses, setCourses] = useState(restored.courses)
  const [learningPreferences, setLearningPreferences] = useState(restored.learningPreferences)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [resetMessage, setResetMessage] = useState('')
  const [resetPending, setResetPending] = useState(false)
  const [destination, setDestination] = useState('home')
  const [selectedSpace, setSelectedSpace] = useState(null)
  const [newSpaceIntent, setNewSpaceIntent] = useState('topic')
  const [suggestedTopic, setSuggestedTopic] = useState('')
  const sessionFiles = useRef(new Map())
  const materialKey = (courseName, file) => JSON.stringify([courseName, file.name, file.size, file.lastModified])

  const [recommendation, setRecommendation] = useState(restored.recommendation)
  const [today, setToday] = useState(localDate)
  const [{ threads, activeId }, dispatchThreads] = useReducer(studyThreadsReducer, { threads: restored.threads, activeId: restored.activeId })
  const activeThread = threads.find((thread) => thread.id === activeId)

  const recommendedCourse =
    courses.find(
      (course) => course.name === recommendation?.courseName
    ) || courses.find((course) => course.name === activeThread?.courseName) || courses[0]
  const sessionStarted = Boolean(activeThread)
  const sessionCourseName = activeThread?.courseName
  const sessionCourse =
    courses.find((course) => course.name === sessionCourseName) || recommendedCourse

  useEffect(() => {
    // Refresh only when the local calendar day changes, including after a sleeping tab wakes.
    const refreshDate = () => setToday(localDate())
    const timer = setInterval(refreshDate, 60_000)
    window.addEventListener('focus', refreshDate)
    return () => { clearInterval(timer); window.removeEventListener('focus', refreshDate) }
  }, [])

  useEffect(() => {
    const saved = saveLearnerMemory({ courses, threads, activeId, recommendation, learningPreferences })
    let current = true
    queueMicrotask(() => { if (current) setStorageAvailable(saved) })
    return () => { current = false }
  }, [courses, threads, activeId, recommendation, learningPreferences])

  function resetLearningData() {
    if (!clearLearnerMemory()) {
      setResetMessage('Orbit could not clear browser storage. Check your browser storage settings and try again.')
      return
    }
    setCourses([])
    sessionFiles.current.clear()
    setLearningPreferences(normalizeLearningPreferences())
    dispatchThreads({ type: 'reset' })
    setRecommendation(null)
    setSelectedSpace(null)
    setResetPending(false)
    setResetMessage('Local Orbit learning data cleared.')
  }

  function addCourse(newCourse, { beginLearning = false } = {}) {
    setCourses((currentCourses) => [
      ...currentCourses,
      {
        ...newCourse,
        mastery: {
          overall: 0,
          topics: {},
        },
      },
    ])
    setSelectedSpace(newCourse.name)
    if (beginLearning) newThread(newCourse)
    else setDestination('space')
  }

  function updateTopicMastery(courseName, topic, evidence) {
    setCourses(current => current.map(course => course.name === courseName
      ? { ...course, mastery: applyMasteryEvidence(course.mastery, { ...evidence, topic }) } : course))
  }

  function addCourseFile(file, targetCourseName, kind = 'resource') {
    const error = materialValidationError(file)
    if (error) throw new Error(error)
    const existing = courses.find(course => course.name === targetCourseName)
    if (!existing) return
    const previous = existing.files?.find(item => sameMaterial(item, materialMetadata(file)))
    if (!previous && existing.files?.length >= MAX_COURSE_MATERIALS) throw new Error('Material limit reached')
    const metadata = previous || materialMetadata(file, new Date().toISOString(), kind)
    if (canAnalyzeMaterial(file)) sessionFiles.current.set(materialKey(targetCourseName, metadata), file)
    setCourses(current => current.map(course => course.name === targetCourseName
      ? { ...course, files: normalizeCourseMaterials([...(course.files || []), metadata]) } : course))
  }

  function removeMaterial(material, courseName) {
    sessionFiles.current.delete(materialKey(courseName, material))
    setCourses(current => current.map(course => course.name === courseName ? removeCourseMaterial(course, material) : course))
  }

  async function analyzeMaterial(material, targetCourseName) {
    const key = materialKey(targetCourseName, material)
    const file = sessionFiles.current.get(key)
    if (!file || !canAnalyzeMaterial(file)) throw new Error('Choose the PDF again to read it')
    const analysis = await analyzeCourseFile(file, material.kind)
    if (sessionFiles.current.get(key) !== file) return // Removed or reset during the request.

    setCourses((currentCourses) =>
      currentCourses.map((course) => {
        if (course.name === targetCourseName) {
          if (!course.files?.some(item => sameMaterial(item, material))) return course
          const files = normalizeCourseMaterials(course.files.map(item => sameMaterial(item, material)
            ? { ...item, analyzed: true, ...(material.kind === 'resource' ? { summary: analysis.summary, topics: analysis.importantTopics } : {}) } : item))
          if (material.kind === 'resource') return { ...course, files }
          return {
            ...course,

            nextTask:
              analysis.nextRecommendedAction || course.nextTask,

            reason:
              analysis.upcomingWork?.length > 0
                ? `${analysis.upcomingWork[0].title} on ${analysis.upcomingWork[0].date}`
                : course.reason,

            syllabus: {
              courseName:
                analysis.courseName || course.syllabus?.courseName || '',

              instructor:
                analysis.instructor || course.syllabus?.instructor || '',

              semester:
                analysis.semester || course.syllabus?.semester || '',
            },

            ...mergeCourseAnalysis(course, analysis),

            files,
          }
        }

        return course
      })
    )
    sessionFiles.current.delete(key)
  }

  function navigate(next) {
    setDestination(next)
  }

  function selectSpace(name) {
    setSelectedSpace(name)
    setDestination('space')
  }

  function newSpace(intent, topic = '') {
    setNewSpaceIntent(intent)
    setSuggestedTopic(topic)
    setDestination('new')
  }

  function startSession(course) {
    if (!course) return
    const position = inferCoursePosition(course, today)
    const matching = (thread) => thread?.courseName === course.name && thread.positionKey === learnerPositionKey(course) && (!position.currentTopic || thread.topic?.toLowerCase() === position.currentTopic.toLowerCase())
    const previous = matching(activeThread) ? activeThread : [...threads].reverse().find(matching)
    if (previous) switchThread(previous.id)
    else newThread(course)
  }

  function startLearning(topic) {
    const course = resolveLearningSpace(courses, topic)
    if (!course) return
    if (courses.includes(course)) startSession(course)
    else addCourse(course, { beginLearning: true })
  }

  function newThread(course, topic = '') {
    const position = inferCoursePosition(course, today)
    if (!topic && position.needsConfirmation) {
      selectSpace(course.name)
      return
    }
    // Intent belongs to this click only; learner-memory's projection never saves it.
    dispatchThreads({ type: 'create', thread: { ...createStudyThread(course, topic), startRequested: true } })
    setDestination('study')
  }

  function openTopic(course, topic) {
    if (!topic?.trim()) { startSession(course); return }
    const previous = findTopicThread(threads, course.name, topic)
    if (previous) switchThread(previous.id)
    else newThread(course, topic)
  }

  function switchThread(id) {
    dispatchThreads({ type: 'switch', id })
    setDestination('study')
  }

  const updateThread = useCallback((id, metadata) => {
    dispatchThreads({ type: 'update', id, metadata })
    if (!metadata.topic || !metadata.resume) return
    setCourses((current) => current.map((course) => course.name === metadata.courseName ? {
      ...course,
      // An older thread can be reviewed without undoing a later explicit correction.
      recentLearning: metadata.positionKey === learnerPositionKey(course) ? {
        topic: metadata.topic, summary: metadata.summary, updatedAt: metadata.updatedAt, positionKey: metadata.positionKey,
      } : course.recentLearning,
      learningAnchors: retainLearningAnchors([...(course.learningAnchors || []), ...metadata.resume.learningAnchors]),
    } : course))
  }, [])

  function updatePosition(courseName, update) {
    setCourses((current) => current.map((course) => course.name === courseName
      ? { ...course, learnerPosition: update ? applyPositionOverride(course.learnerPosition, update) : undefined, recentLearning: null }
      : course))
  }

  const selectedCourse = courses.find((course) => course.name === selectedSpace)
  const currentRecommendation = recommendation?.courseName === recommendedCourse?.name ? recommendation : null

  return (
    <AppShell
      courses={courses}
      destination={destination}
      selectedSpace={selectedSpace}
      onNavigate={navigate}
      onSelectSpace={selectSpace}
      onNewSpace={newSpace}
    >
      <div className="shell-page-notices">
      {!storageAvailable && <p className="orbit-session-note" role="status">Browser storage is unavailable or full. Your current session still works, but recent changes may not survive a refresh.</p>}
      </div>
      {destination === 'home' && (
        <HomeScreen
          courses={courses}
          recommendedCourse={recommendedCourse}
          recommendation={currentRecommendation}
          onContinue={startSession}
          onSelectSpace={selectSpace}
          onNewSpace={newSpace}
          onNavigate={navigate}
          resuming={sessionStarted && recommendedCourse?.name === sessionCourseName && activeThread.positionKey === JSON.stringify(recommendedCourse.learnerPosition || null)}
          today={today}
          learningPreferences={learningPreferences}
          onPreferencesChange={(value) => setLearningPreferences(normalizeLearningPreferences(value))}
          onPositionChange={(update) => updatePosition(recommendedCourse.name, update)}
        />
      )}
      {destination === 'learn' && (
        <LearnScreen courses={courses} threads={threads} today={today} onStart={startLearning} onSelectSpace={selectSpace} onOpenTopic={openTopic} onNewSpace={newSpace} />
      )}
      {destination === 'new' && (
        <section className="orbit-page orbit-page-layout new-space-page">
          <header className="orbit-page-header">
            <h1>{newSpaceIntent === 'class' ? 'Add a class' : newSpaceIntent === 'material' ? 'Start from a PDF' : 'What do you want to learn?'}</h1>
            {newSpaceIntent === 'material' && <p className="orbit-page-intro">Name your space, then add your material.</p>}
          </header>
          <OrbitStage variant="page" />
          <div className="orbit-page-content">
            <AddCourse key={`${newSpaceIntent}:${suggestedTopic}`} onAddCourse={addCourse} intent={newSpaceIntent} courses={courses} suggestedTopic={suggestedTopic} />
            <p className="orbit-session-note">Your learning is saved in this browser. It won't appear on your other devices.</p>
          </div>
        </section>
      )}
      {destination === 'space' && selectedCourse && (
        <SpaceScreen key={selectedCourse.name} course={selectedCourse} threads={threads} onOpenThread={switchThread} today={today} onStartLesson={openTopic} onPositionChange={(update) => updatePosition(selectedCourse.name, update)} onAddFile={addCourseFile} onAnalyzeFile={analyzeMaterial} onRemoveFile={removeMaterial} hasFile={file => sessionFiles.current.has(materialKey(selectedCourse.name, file))} />
      )}
      {destination === 'calendar' && (
        <section className="orbit-page orbit-page-layout calendar-page">
          <header className="orbit-page-header">
            <h1>Calendar</h1>
            <p className="orbit-page-intro">Dates from your learning materials.</p>
          </header>
          <OrbitStage variant="page" />
          <div className="orbit-page-content">
            <UpcomingWork courses={courses} onSelectSpace={selectSpace} />
            <div className="orbit-page-actions">
              <button className="orbit-button" onClick={() => courses.length ? navigate('library') : newSpace('material')}>Add a syllabus or notes</button>
            </div>
          </div>
        </section>
      )}
      {destination === 'library' && (
        <section className="orbit-page orbit-page-layout library-page">
          <header className="orbit-page-header">
            <h1>Library</h1>
            <p className="orbit-page-intro">{courses.length ? 'Open a space to study or add material.' : 'Keep a class, topic, or skill and its materials together.'}</p>
          </header>
          <OrbitStage variant="page" />
          <div className="orbit-page-content">
          {courses.length ? (
            <ul className="space-links">
              {courses.map((course) => (
                <li key={course.name}>
                  <button onClick={() => selectSpace(course.name)}>
                    <span className="space-dot" />
                    <span><strong>{course.name}</strong><small>{course.files?.length || 0} {course.files?.length === 1 ? 'material' : 'materials'} · {positionAction(course, inferCoursePosition(course, today))}</small></span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="orbit-page-actions"><button className="orbit-button" onClick={() => newSpace('topic')}>＋ New space</button></div>
          <div className="orbit-page-utility">
          <LearningPreferences value={learningPreferences} onChange={(value) => setLearningPreferences(normalizeLearningPreferences(value))} />
          <p className="orbit-session-note">Your spaces, progress, and recent lessons are saved in this browser. Anyone using this browser profile can access them. Clearing browser data removes them. Original files, drafts, and full conversations aren't saved. Relevant learning context is sent to Orbit's AI to help with your lessons.</p>
          {resetPending ? <div>
            <p>Clear all local Orbit spaces, progress, learning preferences, and learning memory? This cannot be undone.</p>
            <div className="orbit-page-actions">
              <button className="orbit-text-button" onClick={() => setResetPending(false)}>Keep my data</button>
              <button className="orbit-text-button" onClick={resetLearningData}>Confirm clear learning data</button>
            </div>
          </div> : <button className="orbit-text-button" onClick={() => { setResetPending(true); setResetMessage('') }}>Clear local learning data</button>}
          {resetMessage && <p role="status">{resetMessage}</p>}
          </div>
          </div>
        </section>
      )}
      {sessionStarted && sessionCourse && (
        <div className="orbit-page study-page" hidden={destination !== 'study'}>
          {threads.map((thread) => {
            const originalCourse = courses.find((course) => course.name === thread.courseName)
            // A thread goal seeds its lesson; a later course correction takes precedence.
            const useThreadGoal = thread.requestedTopic && thread.positionKey === JSON.stringify(originalCourse.learnerPosition || null)
            const course = useThreadGoal ? { ...originalCourse, learnerPosition: applyPositionOverride(originalCourse.learnerPosition, { type: 'current', topic: thread.requestedTopic }) } : originalCourse
            return <div className="study-room" key={thread.id} hidden={thread.id !== activeId}>
              <StudySession
                course={course}
                navigation={{ threads, activeId, courses, onSwitch: switchThread, onCreate: openTopic, onSelectSpace: selectSpace }}
                learningProfile={learningPreferences.profile}
                threadId={thread.id}
                initialThread={thread}
                coursePositionKey={learnerPositionKey(originalCourse)}
                active={destination === 'study' && thread.id === activeId}
                onThreadUpdate={updateThread}
                onPositionChange={(update) => updatePosition(course.name, update)}
                onNewThread={() => newThread(courses.find((entry) => entry.name === course.name))}
                today={today}
                mastery={originalCourse.mastery?.overall ?? 0}
                updateTopicMastery={(topicName, evidence) => updateTopicMastery(course.name, topicName, evidence)}
              />
            </div>
          })}
        </div>
      )}
    </AppShell>
  )
}
