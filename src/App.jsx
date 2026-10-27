import StudySession from './components/StudySession'
import CourseDetails from './components/CourseDetails'
import AddCourse from './components/AddCourse'
import AddCourseFile from './components/AddCourseFile'
import HomeScreen from './components/HomeScreen'
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
      mastery: {
        overall: 40,
        topics: {
          'Mendelian genetics': 40,
          'genotype vs phenotype': 40,
          'dominant/recessive alleles': 40,
          'homozygous vs. heterozygous genotypes': 40,
          'Punnett squares': 40,
          probability: 40,
        },
      },
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
      mastery: {
        overall: 40,
        topics: {},
      },
      nextTask: 'Practice quadratic equations',
    },
    {
      name: 'History',
      mastery: {
        overall: 40,
        topics: {},
      },
      nextTask: 'Review Industrial Revolution notes',
    },
  ])

  const [recommendation, setRecommendation] = useState(null)
  const [loadingRecommendation, setLoadingRecommendation] = useState(true)

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
    setCourses([
      ...courses,
      {
        ...newCourse,
        mastery: {
          overall: 40,
          topics: {},
        },
      },
    ])
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

  if (!sessionStarted) {
    return (
      <HomeScreen
        courses={courses}
        recommendedCourse={recommendedCourse}
        recommendation={recommendation}
        loadingRecommendation={loadingRecommendation}
        onContinue={() => {
          setSessionCourseName(recommendedCourse.name)
          setSessionStarted(true)
        }}
        onAddCourse={addCourse}
        onAddFile={addCourseFile}
      />
    )
  }

  return (
    <div>
      <h1>Orbit</h1>
      <p>Learn → Quiz → Evaluate → Adapt → Continue</p>
      <p>Your adaptive learning companion.</p>

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
        setMastery={(newMastery) =>
          updateCourseMastery(
            sessionCourse.name,
            newMastery
          )
        }
        updateTopicMastery={(topicName, newMastery) =>
          updateTopicMastery(
            sessionCourse.name,
            topicName,
            newMastery
          )
        }
      />

      <AddCourse onAddCourse={addCourse} />

      <h2>Courses</h2>

      {courses.map((course) => (
        <div key={course.name}>
          <h3>{course.name}</h3>
          <p>Mastery: {course.mastery?.overall ?? 40}%</p>
          <p>{course.nextTask}</p>
          <p>{course.reason}</p>
        </div>
      ))}

      <AddCourseFile onAddFile={addCourseFile} />

      <CourseDetails course={sessionCourse} />
    </div>
  )
}
