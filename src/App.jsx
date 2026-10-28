import StudySession from './components/StudySession'
import AddCourse from './components/AddCourse'
import HomeScreen from './components/HomeScreen'
import LearnScreen from './components/LearnScreen'
import AppShell from './components/AppShell'
import SpaceScreen from './components/SpaceScreen'
import UpcomingWork from './components/UpcomingWork'
import OrbitStage from './components/OrbitStage'
import StudyThreads from './components/StudyThreads'
import { applyPositionOverride, inferCoursePosition, localDate, mergeCourseAnalysis, positionAction } from './services/coursePosition'
import { createStudyThread, resolveLearningSpace, studyThreadsReducer } from './services/studyThreads'
import { clearLearnerMemory, learnerPositionKey, loadLearnerMemory, saveLearnerMemory } from './services/learnerMemory'
import { retainLearningAnchors } from './services/studyLearningContext'
import {
  analyzeCourseFile,
  recommendCourse,
  recommendationCourses,
} from './services/meta'
import { useCallback, useEffect, useReducer, useState } from 'react'
import './App.css'

export default function App() {
  const [restored] = useState(loadLearnerMemory)
  const [courses, setCourses] = useState(restored.courses)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [resetMessage, setResetMessage] = useState('')
  const [resetPending, setResetPending] = useState(false)
  const [destination, setDestination] = useState('home')
  const [selectedSpace, setSelectedSpace] = useState(null)
  const [newSpaceIntent, setNewSpaceIntent] = useState('topic')

  const [recommendation, setRecommendation] = useState(restored.recommendation)
  const [loadingRecommendation, setLoadingRecommendation] = useState(false)
  const [today, setToday] = useState(localDate)
  const [{ threads, activeId }, dispatchThreads] = useReducer(studyThreadsReducer, { threads: restored.threads, activeId: restored.activeId })
  const activeThread = threads.find((thread) => thread.id === activeId)
  const recommendationInput = JSON.stringify(recommendationCourses(courses))

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
    const saved = saveLearnerMemory({ courses, threads, activeId, recommendation })
    let current = true
    queueMicrotask(() => { if (current) setStorageAvailable(saved) })
    return () => { current = false }
  }, [courses, threads, activeId, recommendation])

  useEffect(() => {
    const context = JSON.parse(recommendationInput)
    if (!context.length) return
    let active = true
    const controller = new AbortController()
    async function loadRecommendation() {
      try {
        setLoadingRecommendation(true)

        const result = await recommendCourse(context, { currentDate: today, signal: controller.signal })

        if (active && context.some((course) => course.name === result?.courseName)) setRecommendation(result)
      } catch {
        // Keep the previous recommendation and local position-based action available.
      } finally {
        if (active) setLoadingRecommendation(false)
      }
    }

    loadRecommendation()
    return () => { active = false; controller.abort() }
  }, [recommendationInput, today])

  function resetLearningData() {
    if (!clearLearnerMemory()) {
      setResetMessage('Orbit could not clear browser storage. Check your browser storage settings and try again.')
      return
    }
    setCourses([])
    dispatchThreads({ type: 'reset' })
    setRecommendation(null)
    setLoadingRecommendation(false)
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
          overall: 40,
          topics: {},
        },
      },
    ])
    setSelectedSpace(newCourse.name)
    if (beginLearning) newThread(newCourse)
    else setDestination('space')
  }

  function updateCourseMastery(courseName, newMastery) {
    setCourses((currentCourses) =>
      currentCourses.map((course) => {
        if (course.name === courseName) {
          return {
            ...course,
            mastery: {
              ...course.mastery,
              overall: newMastery,
            },
          }
        }

        return course
      })
    )
  }

  function updateTopicMastery(courseName, topicName, newMastery) {
    if (!topicName) return

    setCourses((currentCourses) =>
      currentCourses.map((course) => {
        if (course.name !== courseName) {
          return course
        }

        const currentTopics = course.mastery?.topics || {}

        const existingTopic =
          Object.keys(currentTopics).find(
            (topic) =>
              topic.toLowerCase() === topicName.toLowerCase()
          ) || topicName

        const updatedTopics = {
          ...currentTopics,
          [existingTopic]: newMastery,
        }

        const topicScores = Object.values(updatedTopics)

        const overall =
          topicScores.length > 0
            ? Math.round(
                topicScores.reduce(
                  (total, score) => total + score,
                  0
                ) / topicScores.length
              )
            : course.mastery?.overall ?? 40

        return {
          ...course,
          mastery: {
            overall,
            topics: updatedTopics,
          },
        }
      })
    )
  }

  async function addCourseFile(file, targetCourseName) {
    const analysis = await analyzeCourseFile(file)

    setCourses((currentCourses) =>
      currentCourses.map((course) => {
        if (course.name === targetCourseName) {
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

            files: [
              ...(course.files || []),
              {
                name: file.name,
                type: file.type || 'file',
                size: file.size,
                file: file,
              },
            ],
          }
        }

        return course
      })
    )
  }

  function navigate(next) {
    setDestination(next === 'learn' && sessionStarted ? 'study' : next)
  }

  function selectSpace(name) {
    setSelectedSpace(name)
    setDestination('space')
  }

  function newSpace(intent) {
    setNewSpaceIntent(intent)
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
    dispatchThreads({ type: 'create', thread: createStudyThread(course, topic) })
    setDestination('study')
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
      <div className={`shell-page-notices${sessionStarted && destination !== 'study' ? ' shell-page-notices-resumable' : ''}`}>
      {!storageAvailable && <p className="orbit-session-note" role="status">Browser storage is unavailable or full. Your current session still works, but recent changes may not survive a refresh.</p>}
      {sessionStarted && destination !== 'study' && !(destination === 'home' && recommendedCourse?.name === sessionCourseName) && (
        <div className="session-resume">
          <span>{sessionCourse.name}</span>
          <button className="orbit-text-button" onClick={() => navigate('learn')}>Resume your session</button>
        </div>
      )}
      </div>
      {destination === 'home' && (
        <HomeScreen
          courses={courses}
          recommendedCourse={recommendedCourse}
          recommendation={currentRecommendation}
          loadingRecommendation={loadingRecommendation}
          onContinue={startSession}
          onSelectSpace={selectSpace}
          onNewSpace={newSpace}
          onNavigate={navigate}
          resuming={sessionStarted && recommendedCourse?.name === sessionCourseName && activeThread.positionKey === JSON.stringify(recommendedCourse.learnerPosition || null)}
          today={today}
          onPositionChange={(update) => updatePosition(recommendedCourse.name, update)}
        />
      )}
      {destination === 'learn' && (
        <LearnScreen courses={courses} recommendedCourse={recommendedCourse} onStart={startLearning} />
      )}
      {destination === 'new' && (
        <section className="orbit-page orbit-page-layout new-space-page">
          <header className="orbit-page-header">
            <h1>{newSpaceIntent === 'class' ? 'Add a class' : newSpaceIntent === 'material' ? 'Start from a PDF' : 'What do you want to learn?'}</h1>
            {newSpaceIntent === 'material' && <p className="orbit-page-intro">Name your space, then add your material.</p>}
          </header>
          <OrbitStage variant="page" />
          <div className="orbit-page-content">
            <AddCourse key={newSpaceIntent} onAddCourse={addCourse} intent={newSpaceIntent} courses={courses} />
            <p className="orbit-session-note">Learning memory is saved in this browser. No account or cross-device sync.</p>
          </div>
        </section>
      )}
      {destination === 'space' && selectedCourse && (
        <SpaceScreen key={selectedCourse.name} course={selectedCourse} today={today} onContinue={startSession} onNewThread={newThread} onPositionChange={(update) => updatePosition(selectedCourse.name, update)} onAddFile={addCourseFile} onSelectSpace={selectSpace} />
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
          <p className="orbit-session-note">Orbit keeps compact learning memory in this browser, accessible to anyone using this browser profile. Clearing browser data removes it. Original uploads, drafts, and full conversation history are not saved; relevant context is used by Orbit's existing learning service.</p>
          {resetPending ? <div>
            <p>Clear all local Orbit spaces, progress, and learning memory? This cannot be undone.</p>
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
        <div hidden={destination !== 'study'}>
          <div className="study-room-header">
            <button className="orbit-text-button" onClick={() => navigate('home')}>← Back home</button>
            <span>{sessionCourse.name}</span>
          </div>
          <StudyThreads threads={threads} activeId={activeId} courses={courses} onSwitch={switchThread} onCreate={newThread} />
          {threads.map((thread) => {
            const originalCourse = courses.find((course) => course.name === thread.courseName)
            // A thread goal seeds its lesson; a later course correction takes precedence.
            const useThreadGoal = thread.requestedTopic && thread.positionKey === JSON.stringify(originalCourse.learnerPosition || null)
            const course = useThreadGoal ? { ...originalCourse, learnerPosition: applyPositionOverride(originalCourse.learnerPosition, { type: 'current', topic: thread.requestedTopic }) } : originalCourse
            return <div className="study-room" key={thread.id} hidden={thread.id !== activeId}>
              <StudySession
                course={course}
                threadId={thread.id}
                initialThread={thread}
                active={destination === 'study' && thread.id === activeId}
                onThreadUpdate={updateThread}
                onPositionChange={(update) => updatePosition(course.name, update)}
                onNewThread={() => newThread(courses.find((entry) => entry.name === course.name))}
                today={today}
                mastery={originalCourse.mastery?.overall ?? 40}
                setMastery={(newMastery) => updateCourseMastery(course.name, newMastery)}
                updateTopicMastery={(topicName, newMastery) => updateTopicMastery(course.name, topicName, newMastery)}
              />
            </div>
          })}
        </div>
      )}
    </AppShell>
  )
}
