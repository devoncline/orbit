import { useEffect, useRef, useState } from 'react'
import {
    generateStudyLesson,
    explainStudyLessonDifferently,
    generateStudyExample,
    generateStudyQuestion,
    evaluateStudyAnswer,
} from '../services/meta'
import './StudySession.css'

export default function StudySession({
    course,
    answerResult,
    setAnswerResult,
    showAdaptedLesson,
    setShowAdaptedLesson,
    followUpResult,
    setFollowUpResult,
    mastery,
    setMastery,
    updateTopicMastery,
}) {
    const [stage, setStage] = useState('learn')
    const [lesson, setLesson] = useState(null)
    const [example, setExample] = useState('')
    const [loadingLesson, setLoadingLesson] = useState('lesson')
    const [lessonError, setLessonError] = useState('')
    const [lessonAttempt, setLessonAttempt] = useState(0)
    const [initialContext] = useState(() => ({ course, mastery }))
    const initialLessonRequest = useRef(null)
    const [studyQuestion, setStudyQuestion] = useState(null)
    const [loadingQuestion, setLoadingQuestion] = useState(false)
    const [questionError, setQuestionError] = useState('')
    const [evaluation, setEvaluation] = useState(null)
    const [loadingEvaluation, setLoadingEvaluation] = useState(false)
    const [questionNumber, setQuestionNumber] = useState(0)

    useEffect(() => {
        let active = true

        // Reuse the request when StrictMode repeats effect setup on mount.
        if (!initialLessonRequest.current) {
            initialLessonRequest.current = generateStudyLesson(
                initialContext.course,
                initialContext.mastery
            )
        }

        initialLessonRequest.current
            .then((result) => {
                if (active) setLesson(result)
            })
            .catch(() => {
                if (active) setLessonError('Orbit could not load your lesson. Please try again.')
            })
            .finally(() => {
                if (active) setLoadingLesson('')
            })

        return () => { active = false }
    }, [initialContext, lessonAttempt])

    function retryLesson() {
        initialLessonRequest.current = null
        setLessonError('')
        setLoadingLesson('lesson')
        setLessonAttempt((attempt) => attempt + 1)
    }

    async function changeLesson(action) {
        if (loadingLesson || loadingQuestion) return
        setLoadingLesson(action)
        setLessonError('')
        setQuestionError('')

        try {
            const result = action === 'simplify'
                ? await explainStudyLessonDifferently(course, lesson, example)
                : await generateStudyExample(course, lesson, example)

            if (action === 'simplify') {
                setLesson(result)
                setExample('')
            } else {
                setExample(result.content)
            }
        } catch {
            setLessonError('Orbit could not update this lesson. Please try that action again.')
        } finally {
            setLoadingLesson('')
        }
    }

    async function loadQuestion(lessonContext) {
        if (loadingQuestion || loadingLesson) return
        setLoadingQuestion(true)
        setQuestionError('')
        setLessonError('')
        setStudyQuestion(null)
        setAnswerResult('')
        setFollowUpResult('')
        setShowAdaptedLesson(false)
        setEvaluation(null)

        try {
            const question = await generateStudyQuestion(course, mastery, lessonContext)
            setStudyQuestion(question)
            setQuestionNumber((number) => number + 1)
            setStage('quiz')
        } catch {
            setQuestionError('Orbit could not load your question. Please try again.')
        } finally {
            setLoadingQuestion(false)
        }
    }

    function loadNextQuestion() {
        return loadQuestion()
    }

    return (
        <section>
            <h2>{course.name} Session</h2>
            <p>{course.nextTask}</p>

            <p>Mastery: {mastery}%</p>

            {course.importantTopics?.length > 0 && (
                <p>
                    Focus topics: {course.importantTopics.join(', ')}
                </p>
            )}

            {stage === 'learn' && (
                <div className="study-lesson">
                    <h3>Learn{lesson ? `: ${lesson.topic}` : ''}</h3>

                    {lesson && (
                        <div aria-live="polite">
                            <h4>{lesson.concept}</h4>
                            <p>{lesson.content}</p>
                            {example && (
                                <>
                                    <h4>One example</h4>
                                    <p>{example}</p>
                                </>
                            )}
                        </div>
                    )}

                    {loadingLesson && (
                        <p role="status">
                            {loadingLesson === 'lesson'
                                ? 'Orbit is preparing a short lesson...'
                                : loadingLesson === 'simplify'
                                    ? 'Orbit is trying a different approach...'
                                    : 'Orbit is finding an example...'}
                        </p>
                    )}
                    {lessonError && <p role="alert">{lessonError}</p>}
                    {!lesson && !loadingLesson && (
                        <button onClick={retryLesson}>Try again</button>
                    )}

                    {lesson && (
                        <div className="study-lesson-actions">
                            <button
                                disabled={Boolean(loadingLesson) || loadingQuestion}
                                onClick={() => changeLesson('simplify')}
                            >
                                I lost you
                            </button>
                            <button
                                disabled={Boolean(loadingLesson) || loadingQuestion}
                                onClick={() => changeLesson('example')}
                            >
                                Give me an example
                            </button>
                            <button
                                disabled={Boolean(loadingLesson) || loadingQuestion}
                                onClick={() => loadQuestion(lesson)}
                            >
                                Quiz me
                            </button>
                        </div>
                    )}
                </div>
            )}

            {stage === 'quiz' && <h3>Question {questionNumber}</h3>}

            {loadingQuestion && <p role="status">Orbit is building your question...</p>}
            {questionError && (
                <div role="alert">
                    <p>{questionError}</p>
                    {stage === 'quiz' && (
                        <button onClick={loadNextQuestion}>Try again</button>
                    )}
                </div>
            )}

            {stage === 'quiz' && (
                <>
                    {studyQuestion && (
                        <p>{studyQuestion.question}</p>
                    )}

                    {studyQuestion?.answers?.map((answer) => (
                        <button
                            key={answer.text}
                            onClick={async () => {
                                if (answer.correct) {
                                    setAnswerResult('correct')
                                    setShowAdaptedLesson(false)
                                    setFollowUpResult('')
                                    if (studyQuestion.topic) {
                                        updateTopicMastery(studyQuestion.topic, 80)
                                    } else {
                                        setMastery(80)
                                    }
                                    setEvaluation(null)
                                } else {
                                    setAnswerResult('incorrect')
                                    setShowAdaptedLesson(true)
                                    setFollowUpResult('')
                                    if (studyQuestion.topic) {
                                        updateTopicMastery(studyQuestion.topic, 40)
                                    } else {
                                        setMastery(40)
                                    }
                                    setLoadingEvaluation(true)

                                    try {
                                        const result = await evaluateStudyAnswer(
                                            course,
                                            studyQuestion,
                                            answer,
                                            mastery
                                        )

                                        setEvaluation(result)
                                    } catch (error) {
                                        console.error(error)
                                    } finally {
                                        setLoadingEvaluation(false)
                                    }
                                }
                            }}
                        >
                            {answer.text}
                        </button>
                    ))}

                    {answerResult === 'correct' && studyQuestion && (
                        <p>{studyQuestion.explanation}</p>
                    )}

                    {answerResult === 'correct' && (
                        <button onClick={loadNextQuestion}>
                            Continue
                        </button>
                    )}

                    {answerResult === 'incorrect' && loadingEvaluation && (
                        <p>Orbit is changing the approach...</p>
                    )}

                    {answerResult === 'incorrect' && evaluation && (
                        <p>{evaluation.feedback}</p>
                    )}

                    {showAdaptedLesson && evaluation && (
                        <div>
                            <h3>Orbit changed the approach</h3>

                            <p>{evaluation.adaptedExplanation}</p>

                            <h4>Try this instead:</h4>

                            <p>{evaluation.followUpQuestion}</p>

                            {evaluation.followUpAnswers.map((answer) => (
                                <button
                                    key={answer.text}
                                    onClick={() => {
                                        if (answer.correct) {
                                            setFollowUpResult('correct')
                                            if (studyQuestion.topic) {
                                                updateTopicMastery(studyQuestion.topic, 70)
                                            } else {
                                                setMastery(70)
                                            }
                                        } else {
                                            setFollowUpResult('incorrect')
                                            if (studyQuestion.topic) {
                                                updateTopicMastery(studyQuestion.topic, 40)
                                            } else {
                                                setMastery(40)
                                            }
                                        }
                                    }}
                                >
                                    {answer.text}
                                </button>
                            ))}

                            {followUpResult === 'correct' && (
                                <p>
                                    Nice. That shows the concept is starting to click. Orbit can now move you forward.
                                </p>
                            )}

                            {followUpResult === 'correct' && (
                                <button onClick={loadNextQuestion}>
                                    Continue
                                </button>
                            )}

                            {followUpResult === 'incorrect' && (
                                <p>
                                    Orbit marked this concept for another pass before moving on.
                                </p>
                            )}
                        </div>
                    )}
                </>
            )}
        </section>
    )
}
