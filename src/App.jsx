import StudySession from './components/StudySession'
import AddCourse from './components/AddCourse'
import HomeScreen from './components/HomeScreen'
import AppShell from './components/AppShell'
import SpaceScreen from './components/SpaceScreen'
import UpcomingWork from './components/UpcomingWork'
import orbitTeaching from './assets/mascot/orbit-teaching-tilt-transparent.png'
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
          <span>Still here: {sessionCourse.name}</span>
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
          learning={destination === 'learn'}
          resuming={sessionStarted && recommendedCourse?.name === sessionCourseName}
        />
      )}
      {destination === 'new' && (
        <section className="orbit-page">
          <p className="orbit-eyebrow">Make room for something new</p>
          <h1>{newSpaceIntent === 'class' ? 'Your class, your space.' : newSpaceIntent === 'material' ? 'Give your material a home.' : 'Follow your curiosity.'}</h1>
          <p className="orbit-page-intro">A learning space can be a class, a topic, a skill, or a goal. Start with a name. You can bring in material along the way.</p>
          <p className="orbit-muted">For now, spaces and progress stay here until you refresh.</p>
          <AddCourse key={newSpaceIntent} onAddCourse={addCourse} intent={newSpaceIntent} courses={courses} />
        </section>
      )}
      {destination === 'space' && selectedCourse && (
        <SpaceScreen key={selectedCourse.name} course={selectedCourse} onContinue={startSession} onAddFile={addCourseFile} onSelectSpace={selectSpace} />
      )}
      {destination === 'calendar' && (
        <section className="orbit-page">
          <p className="orbit-eyebrow">A little room to look ahead</p>
          <h1>On the horizon.</h1>
          <p className="orbit-page-intro">Dates from your learning materials, gathered in one place. You can keep learning even when there’s nothing due.</p>
          <UpcomingWork courses={courses} onSelectSpace={selectSpace} />
          <div className="orbit-page-actions">
            <button className="orbit-button" onClick={() => courses.length ? navigate('library') : newSpace('material')}>Add learning material <span aria-hidden="true">↗</span></button>
          </div>
          <p className="orbit-muted">Manual events and date editing are still to come.</p>
        </section>
      )}
      {destination === 'library' && (
        <section className="orbit-page">
          <p className="orbit-eyebrow">Everything you’re exploring</p>
          <h1>Your library.</h1>
          <p className="orbit-page-intro">Your spaces and the material you bring to them. Open a space to add a PDF or pick up an idea.</p>
          {courses.length ? (
            <ul className="space-links">
              {courses.map((course) => (
                <li key={course.name}>
                  <button onClick={() => selectSpace(course.name)}>
                    <span className="space-dot" />
                    <span><strong>{course.name}</strong><small>{course.files?.length || 0} materials · {course.nextTask}</small></span>
                    <span aria-hidden="true">↗</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="orbit-muted">Your first learning space starts with something you’re curious about.</p>}
          <div className="orbit-page-actions"><button className="orbit-button" onClick={() => newSpace('topic')}>＋ New space</button></div>
        </section>
      )}
      {sessionStarted && sessionCourse && (
        <div hidden={destination !== 'study'}>
          <div className="study-room-header">
            <button className="orbit-text-button" onClick={() => navigate('home')}>← Back home</button>
            <span>Focused study · {sessionCourse.name}</span>
          </div>
          <div className="study-room">
            <img className="study-companion" src={orbitTeaching} alt="" width="1600" height="1600" aria-hidden="true" />
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
