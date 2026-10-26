import { useEffect, useState } from 'react'
import {
    generateStudyQuestion,
    evaluateStudyAnswer,
} from '../services/meta'

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
}) {
    const [studyQuestion, setStudyQuestion] = useState(null)
    const [loadingQuestion, setLoadingQuestion] = useState(true)
    const [evaluation, setEvaluation] = useState(null)
    const [loadingEvaluation, setLoadingEvaluation] = useState(false)
    const [questionNumber, setQuestionNumber] = useState(1)

    useEffect(() => {
        async function loadQuestion() {
            try {
                const question = await generateStudyQuestion(course, mastery)
                setStudyQuestion(question)
            } catch (error) {
                console.error(error)
            } finally {
                setLoadingQuestion(false)
            }
        }

        loadQuestion()
    }, [])

    useEffect(() => {
        async function loadQuestion() {
            try {
                const question = await generateStudyQuestion(course, mastery)
                setStudyQuestion(question)
            } catch (error) {
                console.error(error)
            } finally {
                setLoadingQuestion(false)
            }
        }

        loadQuestion()
    }, [])

    async function loadNextQuestion() {
        setLoadingQuestion(true)
        setAnswerResult('')
        setFollowUpResult('')
        setShowAdaptedLesson(false)
        setEvaluation(null)

        try {
            const question = await generateStudyQuestion(course, mastery)
            setStudyQuestion(question)
            setQuestionNumber(questionNumber + 1)
        } catch (error) {
            console.error(error)
        } finally {
            setLoadingQuestion(false)
        }
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

            <h3>Question {questionNumber}</h3>

            {loadingQuestion && <p>Orbit is building your question...</p>}

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
                            setMastery(80)
                            setEvaluation(null)
                        } else {
                            setAnswerResult('incorrect')
                            setShowAdaptedLesson(true)
                            setFollowUpResult('')
                            setMastery(40)
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
                                    setMastery(70)
                                } else {
                                    setFollowUpResult('incorrect')
                                    setMastery(40)
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
        </section>
    )
}