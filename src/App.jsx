import StudySession from './components/StudySession'
import CourseDetails from './components/CourseDetails'
import AddCourse from './components/AddCourse'
import AddCourseFile from './components/AddCourseFile'
import {
  analyzeCourseFile,
  recommendCourse,
} from './services/meta'
import { useEffect, useState } from 'react'
import './App.css'

export default function App() {
  const [courses, setCourses] = useState([
    {
      name: 'Biology',
      nextTask: 'Review photosynthesis',
      reason: 'Quiz tomorrow and weak performance on light reactions',

      syllabus: {
        courseName: 'Biology 101',
        instructor: 'Dr. Carter',
        semester: 'Fall 2026',
      },

      files: [
        {
          name: 'Photosynthesis Notes',
          type: 'notes',
        },
        {
          name: 'Chapter 6 Study Guide',
          type: 'study-guide',
        },
        {
          name: 'Biology Syllabus',
          type: 'syllabus',
        },
      ],
    },
    {
      name: 'Algebra',
      nextTask: 'Practice quadratic equations',
      reason: 'Homework due tonight',
    },
    {
      name: 'History',
      nextTask: 'Review Industrial Revolution notes',
      reason: 'Test on Friday',
    },
  ])

  const [recommendation, setRecommendation] = useState(null)
  const [loadingRecommendation, setLoadingRecommendation] = useState(true)

  const recommendedCourse =
    courses.find(
      (course) => course.name === recommendation?.courseName
    ) || courses[0]
  const [sessionStarted, setSessionStarted] = useState(false)
  const [answerResult, setAnswerResult] = useState('')
  const [showAdaptedLesson, setShowAdaptedLesson] = useState(false)
  const [followUpResult, setFollowUpResult] = useState('')
  const [mastery, setMastery] = useState(40)

  useEffect(() => {
    async function loadRecommendation() {
      try {
        setLoadingRecommendation(true)

        const result = await recommendCourse(courses)

        setRecommendation(result)
      } catch (error) {
        console.error(error)
      } finally {
        setLoadingRecommendation(false)
      }
    }

    loadRecommendation()
  }, [courses])

  function addCourse(newCourse) {
    setCourses([...courses, newCourse])
  }

  async function addCourseFile(file) {
    const analysis = await analyzeCourseFile(file)

    console.log('Orbit analysis:', analysis)

    setCourses(
      courses.map((course) => {
        const analyzedCourseName =
          analysis.courseName?.toLowerCase() || ''

        const existingCourseName =
          course.name?.toLowerCase() || ''

        const matchesCourse =
          analyzedCourseName.includes(existingCourseName) ||
          existingCourseName.includes(analyzedCourseName)

        if (matchesCourse) {
          return {
            ...course,

            name: analysis.courseName || course.name,

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

  return (
    <div>
      <h1>Orbit</h1>
      <p>Learn → Quiz → Evaluate → Adapt → Continue</p>
      <p>Your adaptive learning companion.</p>

      {!sessionStarted ? (
        <section>
          <h2>What should I work on now?</h2>

          {loadingRecommendation ? (
            <p>Orbit is deciding what you should work on...</p>
          ) : (
            <>
              <h3>{recommendedCourse.name}</h3>

              <p>
                {recommendation?.recommendedAction ||
                  recommendedCourse.nextTask}
              </p>

              <p>
                {recommendation?.reason ||
                  recommendedCourse.reason}
              </p>
            </>
          )}

          {!loadingRecommendation && (
            <button onClick={() => setSessionStarted(true)}>
              Start session
            </button>
          )}
        </section>
      ) : (
        <StudySession
          course={recommendedCourse}
          answerResult={answerResult}
          setAnswerResult={setAnswerResult}
          showAdaptedLesson={showAdaptedLesson}
          setShowAdaptedLesson={setShowAdaptedLesson}
          followUpResult={followUpResult}
          setFollowUpResult={setFollowUpResult}
          mastery={mastery}
          setMastery={setMastery}
        />
      )}

      <AddCourse onAddCourse={addCourse} />

      <h2>Courses</h2>

      {courses.map((course) => (
        <div key={course.name}>
          <h3>{course.name}</h3>
          <p>{course.nextTask}</p>
          <p>{course.reason}</p>
        </div>
      ))}

      <AddCourseFile onAddFile={addCourseFile} />

      <CourseDetails course={recommendedCourse} />
    </div>
  )
}