import StudySession from './components/StudySession'
import AddCourse from './components/AddCourse'
import HomeScreen from './components/HomeScreen'
import AppShell from './components/AppShell'
import SpaceScreen from './components/SpaceScreen'
import UpcomingWork from './components/UpcomingWork'
import OrbitStage from './components/OrbitStage'
import {
  analyzeCourseFile,
  recommendCourse,
} from './services/meta'
import { useEffect, useState } from 'react'
import './App.css'

export default function App() {
  const [courses, setCourses] = useState([])
  const [destination, setDestination] = useState('home')
  const [selectedSpace, setSelectedSpace] = useState(null)
  const [newSpaceIntent, setNewSpaceIntent] = useState('topic')

  const [recommendation, setRecommendation] = useState(null)
  const [loadingRecommendation, setLoadingRecommendation] = useState(false)

  const recommendedCourse =
    courses.find(
      (course) => course.name === recommendation?.courseName
    ) || courses[0]
  const [sessionStarted, setSessionStarted] = useState(false)
  const [sessionCourseName, setSessionCourseName] = useState(null)
  const sessionCourse =
    courses.find((course) => course.name === sessionCourseName) || recommendedCourse
  const [answerResult, setAnswerResult] = useState('')
  const [showAdaptedLesson, setShowAdaptedLesson] = useState(false)
  const [followUpResult, setFollowUpResult] = useState('')

  useEffect(() => {
    if (!courses.length) return
    let active = true
    async function loadRecommendation() {
      try {
        setLoadingRecommendation(true)

        const result = await recommendCourse(courses)

        if (active) setRecommendation(result)
      } catch (error) {
        console.error(error)
      } finally {
        if (active) setLoadingRecommendation(false)
      }
    }

    loadRecommendation()
    return () => { active = false }
  }, [courses])

  function addCourse(newCourse) {
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
    setDestination('space')
  }

  function updateCourseMastery(courseName, newMastery) {
    setCourses(
      courses.map((course) => {
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

            importantTopics:
              analysis.importantTopics || [],

            upcomingWork:
              analysis.upcomingWork || [],

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
    if (sessionCourseName !== course.name) {
      setAnswerResult('')
      setShowAdaptedLesson(false)
      setFollowUpResult('')
    }
    setSessionCourseName(course.name)
    setSessionStarted(true)
    setDestination('study')
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
      {sessionStarted && destination !== 'study' && !(destination === 'home' && recommendedCourse?.name === sessionCourseName) && (
        <div className="session-resume">
          <span>{sessionCourse.name}</span>
          <button className="orbit-text-button" onClick={() => navigate('learn')}>Resume your session →</button>
        </div>
      )}
      {(destination === 'home' || destination === 'learn') && (
        <HomeScreen
          courses={courses}
          recommendedCourse={recommendedCourse}
          recommendation={currentRecommendation}
          loadingRecommendation={loadingRecommendation}
          onContinue={startSession}
          onSelectSpace={selectSpace}
          onNewSpace={newSpace}
          onNavigate={navigate}
          resuming={sessionStarted && recommendedCourse?.name === sessionCourseName}
        />
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
            <p className="orbit-session-note">Spaces and progress are cleared when you refresh.</p>
          </div>
        </section>
      )}
      {destination === 'space' && selectedCourse && (
        <SpaceScreen key={selectedCourse.name} course={selectedCourse} onContinue={startSession} onAddFile={addCourseFile} onSelectSpace={selectSpace} />
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
              <button className="orbit-button" onClick={() => courses.length ? navigate('library') : newSpace('material')}>Add a syllabus or notes <span aria-hidden="true">↗</span></button>
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
                    <span><strong>{course.name}</strong><small>{course.files?.length || 0} {course.files?.length === 1 ? 'material' : 'materials'} · {course.nextTask}</small></span>
                    <span aria-hidden="true">↗</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="orbit-page-actions"><button className="orbit-button" onClick={() => newSpace('topic')}>＋ New space</button></div>
          </div>
        </section>
      )}
      {sessionStarted && sessionCourse && (
        <div hidden={destination !== 'study'}>
          <div className="study-room-header">
            <button className="orbit-text-button" onClick={() => navigate('home')}>← Back home</button>
            <span>{sessionCourse.name}</span>
          </div>
          <div className="study-room">
            <StudySession
              key={sessionCourse.name}
              course={sessionCourse}
              answerResult={answerResult}
              setAnswerResult={setAnswerResult}
              showAdaptedLesson={showAdaptedLesson}
              setShowAdaptedLesson={setShowAdaptedLesson}
              followUpResult={followUpResult}
              setFollowUpResult={setFollowUpResult}
              mastery={sessionCourse.mastery?.overall ?? 40}
              setMastery={(newMastery) => updateCourseMastery(sessionCourse.name, newMastery)}
              updateTopicMastery={(topicName, newMastery) => updateTopicMastery(sessionCourse.name, topicName, newMastery)}
            />
          </div>
        </div>
      )}
    </AppShell>
  )
}
