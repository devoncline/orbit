import { useEffect, useRef, useState } from 'react'
import {
    generateStudyLesson,
    explainStudyLessonDifferently,
    generateStudyExample,
    respondToStudyMessage,
    generateStudyActivity,
    evaluateStudyActivity,
    generateStudyQuestion,
    evaluateStudyAnswer,
} from '../services/meta'
import { MAX_STUDY_MESSAGE_LENGTH, retainStudyExchanges } from '../services/studyConversation'
import { rememberLearningAnchor, anchorAfterFollowUp } from '../services/studyLearningContext'
import OrbitStage from './OrbitStage'
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
    const [conversation, setConversation] = useState([])
    const [learningAnchors, setLearningAnchors] = useState([])
    const [learnerMessage, setLearnerMessage] = useState('')
    const [loadingConversation, setLoadingConversation] = useState(false)
    const [conversationError, setConversationError] = useState('')
    const conversationRequest = useRef(null)
    const [activity, setActivity] = useState(null)
    const [activityResponse, setActivityResponse] = useState('')
    const [activityFeedback, setActivityFeedback] = useState(null)
    const [loadingActivity, setLoadingActivity] = useState('')
    const [activityError, setActivityError] = useState(null)
    const activityRequest = useRef(null)
    const [initialContext] = useState(() => ({ course, mastery }))
    const initialLessonRequest = useRef(null)
    const [studyQuestion, setStudyQuestion] = useState(null)
    const [loadingQuestion, setLoadingQuestion] = useState(false)
    const [questionError, setQuestionError] = useState('')
    const [evaluation, setEvaluation] = useState(null)
    const [loadingEvaluation, setLoadingEvaluation] = useState(false)
    const [questionNumber, setQuestionNumber] = useState(0)
    const activityContext = activity ? {
        activity,
        learnerResponse: activityFeedback?.learnerResponse || '',
        feedback: activityFeedback?.feedback || '',
    } : undefined

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

    useEffect(() => {
        return () => {
            conversationRequest.current?.abort()
            activityRequest.current?.abort()
        }
    }, [])

    function rememberAnchor(anchor) {
        if (anchor) setLearningAnchors((current) => rememberLearningAnchor(current, anchor))
    }

    async function sendMessage(event) {
        event.preventDefault()
        const message = learnerMessage.trim()
        if (!lesson || stage !== 'learn' || !message || loadingLesson ||
            loadingQuestion || activityRequest.current || conversationRequest.current) return

        const controller = new AbortController()
        conversationRequest.current = controller
        setLoadingConversation(true)
        setConversationError('')
        setLessonError('')
        setQuestionError('')

        try {
            const result = await respondToStudyMessage(course, lesson, {
                message,
                history: conversation,
                example,
                activityContext,
                anchors: learningAnchors,
                signal: controller.signal,
            })
            if (controller.signal.aborted) return

            rememberAnchor(result.anchor)
            setConversation((current) => retainStudyExchanges([
                ...current,
                { message, response: result.response, signal: result.signal },
            ]))
            setLearnerMessage('')
        } catch {
            if (!controller.signal.aborted) {
                setConversationError('Orbit could not reply. Your message is still here; try sending it again.')
            }
        } finally {
            if (conversationRequest.current === controller) {
                conversationRequest.current = null
                setLoadingConversation(false)
            }
        }
    }

    async function runActivity(action) {
        const response = activityResponse.trim()
        if (!lesson || stage !== 'learn' || loadingLesson || loadingQuestion ||
            conversationRequest.current || activityRequest.current ||
            (action === 'evaluate' && (!activity || !response))) return

        const controller = new AbortController()
        activityRequest.current = controller
        setLoadingActivity(action)
        setActivityError(null)
        setLessonError('')
        setQuestionError('')

        try {
            const options = { history: conversation, example, signal: controller.signal, anchors: learningAnchors }
            const result = action === 'generate'
                ? await generateStudyActivity(course, lesson, { ...options, activityContext })
                : await evaluateStudyActivity(course, lesson, activity, response, options)
            if (controller.signal.aborted) return

            if (action === 'generate') {
                setActivity(result)
                setActivityResponse('')
                setActivityFeedback(null)
            } else {
                rememberAnchor(result.anchor)
                setActivityFeedback({ ...result, learnerResponse: response })
            }
        } catch {
            if (!controller.signal.aborted) {
                setActivityError({
                    action,
                    message: action === 'generate'
                        ? 'Orbit could not prepare an activity. Please try again.'
                        : 'Orbit could not respond to your activity. Your response is still here; try again.',
                })
            }
        } finally {
            if (activityRequest.current === controller) {
                activityRequest.current = null
                setLoadingActivity('')
            }
        }
    }

    function submitActivity(event) {
        event.preventDefault()
        return runActivity('evaluate')
    }

    function retryLesson() {
        initialLessonRequest.current = null
        setLessonError('')
        setLoadingLesson('lesson')
        setLessonAttempt((attempt) => attempt + 1)
    }

    async function changeLesson(action) {
        if (loadingLesson || loadingQuestion || loadingConversation || loadingActivity) return
        setLoadingLesson(action)
        setLessonError('')
        setQuestionError('')

        try {
            const result = action === 'simplify'
                ? await explainStudyLessonDifferently(course, lesson, example, { anchors: learningAnchors })
                : await generateStudyExample(course, lesson, example, { anchors: learningAnchors })

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
        conversationRequest.current?.abort()
        conversationRequest.current = null
        setLoadingConversation(false)
        setConversationError('')
        activityRequest.current?.abort()
        activityRequest.current = null
        setLoadingActivity('')
        setActivityError(null)
        setLoadingQuestion(true)
        setQuestionError('')
        setLessonError('')
        setStudyQuestion(null)
        setAnswerResult('')
        setFollowUpResult('')
        setShowAdaptedLesson(false)
        setEvaluation(null)

        try {
            const question = await generateStudyQuestion(course, mastery, lessonContext, { anchors: learningAnchors })
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
        <section className="study-session">
            <header className="study-context">
                {stage === 'learn' && lesson && <p className="study-topic">{lesson.topic}</p>}
                <h1>{stage === 'learn' ? lesson?.concept || course.nextTask || course.name : studyQuestion?.topic || lesson?.topic || 'Practice'}</h1>
            </header>
            <OrbitStage thinking={Boolean(loadingLesson || loadingConversation || loadingActivity || loadingQuestion || loadingEvaluation)} />
            <div className="study-body">
            {stage === 'learn' && (
                <div className="study-lesson">
                    {lesson && (
                        <div aria-live="polite">
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
                                disabled={Boolean(loadingLesson || loadingActivity) || loadingQuestion || loadingConversation}
                                onClick={() => changeLesson('simplify')}
                            >
                                I lost you
                            </button>
                            <button
                                disabled={Boolean(loadingLesson || loadingActivity) || loadingQuestion || loadingConversation}
                                onClick={() => changeLesson('example')}
                            >
                                Give me an example
                            </button>
                            <button
                                disabled={Boolean(loadingLesson || loadingActivity) || loadingQuestion || loadingConversation}
                                onClick={() => runActivity('generate')}
                            >
                                Let me try it
                            </button>
                            <button className="study-primary-action"
                                disabled={Boolean(loadingLesson) || loadingQuestion}
                                onClick={() => loadQuestion(lesson)}
                            >
                                Quiz me
                            </button>
                        </div>
                    )}

                    {(activity || loadingActivity || activityError) && (
                        <div className="study-activity" aria-busy={Boolean(loadingActivity)}>
                            {activity && (
                                <>
                                    <h4>{activity.title}</h4>
                                    <p>{activity.instruction}</p>
                                    <form onSubmit={submitActivity}>
                                        <label htmlFor="study-activity-response">What did you try or notice?</label>
                                        <textarea
                                            id="study-activity-response"
                                            rows={3}
                                            maxLength={MAX_STUDY_MESSAGE_LENGTH}
                                            value={activityResponse}
                                            onChange={(event) => {
                                                setActivityResponse(event.target.value)
                                                if (activityError?.action === 'evaluate') setActivityError(null)
                                            }}
                                            readOnly={Boolean(loadingActivity)}
                                            disabled={Boolean(loadingLesson) || loadingQuestion || loadingConversation}
                                            required
                                        />
                                        <button
                                            type="submit"
                                            disabled={!activityResponse.trim() || Boolean(loadingLesson || loadingActivity) ||
                                                loadingQuestion || loadingConversation}
                                        >
                                            {activityError?.action === 'evaluate' ? 'Try again' : 'Share response'}
                                        </button>
                                    </form>
                                    <div aria-live="polite">
                                        {activityFeedback?.learnerResponse === activityResponse.trim() && (
                                            <p><strong>Orbit:</strong> {activityFeedback.feedback}</p>
                                        )}
                                    </div>
                                </>
                            )}
                            {loadingActivity && (
                                <p role="status">
                                    {loadingActivity === 'generate'
                                        ? 'Orbit is preparing something to try...'
                                        : 'Orbit is looking at your response...'}
                                </p>
                            )}
                            {activityError && <p role="alert">{activityError.message}</p>}
                            {activityError?.action === 'generate' && (
                                <button
                                    disabled={Boolean(loadingLesson || loadingActivity) || loadingQuestion || loadingConversation}
                                    onClick={() => runActivity('generate')}
                                >
                                    Try again
                                </button>
                            )}
                        </div>
                    )}

                    {lesson && (
                        <div className="study-conversation">
                            <div aria-live="polite">
                                {conversation.slice(-2).map((exchange, index) => (
                                    <div key={index}>
                                        <p><strong>You:</strong> {exchange.message}</p>
                                        <p><strong>Orbit:</strong> {exchange.response}</p>
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={sendMessage} aria-busy={loadingConversation}>
                                <label htmlFor="study-message">What are you thinking?</label>
                                <textarea
                                    id="study-message"
                                    rows={2}
                                    maxLength={MAX_STUDY_MESSAGE_LENGTH}
                                    placeholder="Ask about this idea, or share a connection."
                                    value={learnerMessage}
                                    onChange={(event) => {
                                        setLearnerMessage(event.target.value)
                                        setConversationError('')
                                    }}
                                    readOnly={loadingConversation}
                                    disabled={Boolean(loadingLesson || loadingActivity) || loadingQuestion}
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={!learnerMessage.trim() || Boolean(loadingLesson || loadingActivity) ||
                                        loadingQuestion || loadingConversation}
                                >
                                    {conversationError ? 'Try again' : 'Send'}
                                </button>
                            </form>
                            {loadingConversation && <p role="status">Orbit is thinking about that...</p>}
                            {conversationError && <p role="alert">{conversationError}</p>}
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
                <div className="study-quiz">
                    {studyQuestion && (
                        <p>{studyQuestion.question}</p>
                    )}

                    {studyQuestion?.answers?.map((answer) => (
                        <button className="study-answer"
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
                                            mastery,
                                            { anchors: learningAnchors }
                                        )

                                        setEvaluation(result)
                                        rememberAnchor(result.anchor)
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
                        <button className="study-primary-action" onClick={loadNextQuestion}>
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
                        <div className="study-adapted">
                            <h3>Orbit changed the approach</h3>

                            <p>{evaluation.adaptedExplanation}</p>

                            <h4>Try this instead:</h4>

                            <p>{evaluation.followUpQuestion}</p>

                            {evaluation.followUpAnswers.map((answer) => (
                                <button className="study-answer"
                                    key={answer.text}
                                    onClick={() => {
                                        rememberAnchor(anchorAfterFollowUp(evaluation.anchor, answer.correct))
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
                                <button className="study-primary-action" onClick={loadNextQuestion}>
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
                </div>
            )}
            </div>
            <footer className="study-progress">
                <ol className="study-stages" aria-label="Session progress">
                    <li aria-current={stage === 'learn' ? 'step' : undefined}>Learn & try</li>
                    <li aria-current={stage === 'quiz' ? 'step' : undefined}>Practice{stage === 'quiz' ? ` · Question ${questionNumber}` : ''}</li>
                </ol>
                <p className="study-mastery">Mastery · {mastery}%</p>
            </footer>
        </section>
    )
}
