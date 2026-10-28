import { useEffect, useId, useRef, useState } from 'react'
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
import { rememberLearningAnchor, anchorAfterFollowUp, retainLearningAnchors } from '../services/studyLearningContext'
import { compactThreadResume } from '../services/learnerMemory'
import { applyPositionOverride, readPositionStatement } from '../services/coursePosition'
import { selectStudyInteraction, studyThreadMetadata } from '../services/studyThreads'
import CoursePosition from './CoursePosition'
import OrbitStage from './OrbitStage'
import './StudySession.css'

export default function StudySession({
    course,
    threadId,
    initialThread,
    active = true,
    onThreadUpdate,
    onPositionChange,
    onNewThread,
    today,
    mastery,
    setMastery,
    updateTopicMastery,
}) {
    const [resume] = useState(() => compactThreadResume(initialThread?.resume))
    const [initialThreadContext] = useState(initialThread)
    const [resumeSummary, setResumeSummary] = useState(initialThread?.resume ? initialThread.summary : '')
    const [activeInteraction, setActiveInteraction] = useState('lesson')
    const stage = activeInteraction === 'quiz' ? 'quiz' : 'learn'
    const [answerResult, setAnswerResult] = useState('')
    const [showAdaptedLesson, setShowAdaptedLesson] = useState(false)
    const [followUpResult, setFollowUpResult] = useState('')
    const [history, setHistory] = useState([])
    const [selectedHistory, setSelectedHistory] = useState(null)
    const [positionChanged, setPositionChanged] = useState(false)
    const [evaluationError, setEvaluationError] = useState('')
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const panel = useRef(null)
    const id = useId()
    const [lesson, setLesson] = useState(resume.lesson)
    const [example, setExample] = useState('')
    const [loadingLesson, setLoadingLesson] = useState(resume.lesson ? '' : 'lesson')
    const [lessonError, setLessonError] = useState('')
    const [lessonAttempt, setLessonAttempt] = useState(0)
    const [conversation, setConversation] = useState(resume.conversation)
    const [learningAnchors, setLearningAnchors] = useState(() => retainLearningAnchors([...(course.learningAnchors || []), ...resume.learningAnchors]))
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
    const initialLessonLoaded = useRef(Boolean(resume.lesson))
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
    const busy = Boolean(loadingLesson || loadingConversation || loadingActivity || loadingQuestion || loadingEvaluation)
    const lastPublished = useRef('')

    useEffect(() => {
        if (!lesson) return
        const snapshot = compactThreadResume({ lesson, conversation, learningAnchors })
        const metadata = studyThreadMetadata({ lesson, activeInteraction, conversation, activity, activityFeedback, questionNumber, answerResult, followUpResult })
        const signature = JSON.stringify({ snapshot, metadata })
        if (lastPublished.current === signature) return
        const firstPublish = !lastPublished.current
        lastPublished.current = signature
        // Restoring a lesson is not new learning evidence and must not replace its saved summary.
        if (firstPublish && resume.lesson) return
        onThreadUpdate?.(threadId, { ...metadata, resume: snapshot, courseName: initialContext.course.name,
            positionKey: initialThreadContext?.positionKey || 'null', updatedAt: new Date().toISOString() })
    }, [threadId, onThreadUpdate, lesson, activeInteraction, conversation, activity, activityFeedback, questionNumber, answerResult, followUpResult, learningAnchors, resume, initialContext, initialThreadContext])

    useEffect(() => {
        if (active) panel.current?.focus({ preventScroll: false })
    }, [active, activeInteraction])

    function openInteraction(next) {
        setResumeSummary('')
        setSelectedHistory(null)
        setActiveInteraction((current) => selectStudyInteraction(current, next))
    }

    function rememberInteraction(type, title, content, response = '') {
        setHistory((current) => [...current, { type, title: title.slice(0, 80), content, response }].slice(-12))
    }

    function changePosition(update) {
        onPositionChange?.(update)
        setPositionChanged(true)
    }

    useEffect(() => {
        if (!active || initialLessonLoaded.current) return
        let current = true

        // Reuse the request when StrictMode repeats effect setup on mount.
        if (!initialLessonRequest.current) {
            initialLessonRequest.current = generateStudyLesson(
                initialContext.course,
                initialContext.mastery,
                { anchors: initialContext.course.learningAnchors || [] }
            )
        }

        initialLessonRequest.current
            .then((result) => {
                if (current) { initialLessonLoaded.current = true; setLesson(result) }
            })
            .catch(() => {
                if (current) setLessonError('Orbit could not load your lesson. Please try again.')
            })
            .finally(() => {
                if (current) setLoadingLesson('')
            })

        return () => { current = false }
    }, [initialContext, lessonAttempt, active, resume])

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
            const update = readPositionStatement(message, lesson.topic)
            if (update) changePosition(update)
            const requestCourse = update ? { ...course, learnerPosition: applyPositionOverride(course.learnerPosition, update) } : course
            const result = await respondToStudyMessage(requestCourse, lesson, {
                message,
                history: conversation,
                example,
                activityContext,
                anchors: learningAnchors,
                signal: controller.signal,
            })
            if (controller.signal.aborted) return

            rememberAnchor(result.anchor)
            // Keep raw exchanges bounded in memory as well as in persistent storage.
            setConversation((current) => retainStudyExchanges([
                ...current,
                { message, response: result.response, signal: result.signal },
            ]))
            rememberInteraction('conversation', message, message, result.response)
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
        if (!lesson || loadingLesson || loadingQuestion || loadingEvaluation ||
            conversationRequest.current || activityRequest.current ||
            (action === 'evaluate' && (!activity || !response))) return

        const controller = new AbortController()
        openInteraction('activity')
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
                if (activity) rememberInteraction('activity', activity.title, `${activity.instruction}\n\nYour response: ${activityResponse || 'Not submitted'}`, activityFeedback?.feedback || '')
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
        openInteraction(action === 'example' ? 'example' : 'lesson')
        setLoadingLesson(action)
        setLessonError('')
        setQuestionError('')

        try {
            const result = action === 'simplify'
                ? await explainStudyLessonDifferently(course, lesson, example, { anchors: learningAnchors })
                : await generateStudyExample(course, lesson, example, { anchors: learningAnchors })

            if (action === 'simplify') {
                rememberInteraction('lesson', lesson.concept, lesson.content)
                setLesson(result)
            } else {
                if (example) rememberInteraction('example', lesson.concept, example)
                setExample(result.content)
            }
        } catch {
            setLessonError('Orbit could not update this lesson. Please try that action again.')
        } finally {
            setLoadingLesson('')
        }
    }

    async function loadQuestion(lessonContext) {
        if (loadingQuestion || loadingLesson || loadingEvaluation) return
        if (studyQuestion) rememberInteraction('quiz', studyQuestion.topic || 'Practice', studyQuestion.question, `${answerResult || 'Not answered'}${evaluation ? `\n${evaluation.feedback}\n${evaluation.adaptedExplanation}\nFollow-up: ${followUpResult || 'Not answered'}` : studyQuestion.explanation ? `\n${studyQuestion.explanation}` : ''}`)
        openInteraction('quiz')
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
        setEvaluationError('')
        setSelectedAnswer(null)

        try {
            const question = await generateStudyQuestion(course, mastery, lessonContext, { anchors: learningAnchors })
            setStudyQuestion(question)
            setQuestionNumber((number) => number + 1)
        } catch {
            setQuestionError('Orbit could not load your question. Please try again.')
        } finally {
            setLoadingQuestion(false)
        }
    }

    function loadNextQuestion() {
        return loadQuestion()
    }

    async function answerQuestion(answer, retry = false) {
        if (busy || (answerResult && !retry)) return
        setSelectedAnswer(answer)
        setAnswerResult(answer.correct ? 'correct' : 'incorrect')
        setShowAdaptedLesson(!answer.correct)
        setFollowUpResult('')
        setEvaluation(null)
        setEvaluationError('')
        if (!retry) {
            if (studyQuestion.topic) updateTopicMastery(studyQuestion.topic, answer.correct ? 80 : 40)
            else setMastery(answer.correct ? 80 : 40)
        }
        if (answer.correct) return
        setLoadingEvaluation(true)
        try {
            const result = await evaluateStudyAnswer(course, studyQuestion, answer, mastery, { anchors: learningAnchors })
            setEvaluation(result)
            rememberAnchor(result.anchor)
        } catch {
            setEvaluationError('Orbit could not prepare a different explanation. Your answer is saved; try again.')
        } finally {
            setLoadingEvaluation(false)
        }
    }

    return (
        <section className="study-session">
            <header className="study-context">
                {stage === 'learn' && lesson && <p className="study-topic">{lesson.topic}</p>}
                <h1>{stage === 'learn' ? lesson?.concept || course.nextTask || course.name : studyQuestion?.topic || lesson?.topic || 'Practice'}</h1>
            </header>
            <OrbitStage thinking={Boolean(loadingLesson || loadingConversation || loadingActivity || loadingQuestion || loadingEvaluation)} />
            <div className="study-body">
            {lesson && <div className="study-lesson-actions" aria-label="Choose a study interaction">
                <button disabled={busy} aria-pressed={activeInteraction === 'lesson'} onClick={() => openInteraction('lesson')}>Lesson</button>
                <button disabled={busy} aria-pressed={activeInteraction === 'example'} onClick={() => example ? openInteraction('example') : changeLesson('example')}>Give me an example</button>
                <button disabled={busy} aria-pressed={activeInteraction === 'activity'} onClick={() => activity ? openInteraction('activity') : runActivity('generate')}>Let me try it</button>
                <button disabled={busy} aria-pressed={activeInteraction === 'conversation'} onClick={() => openInteraction('conversation')}>Talk it through</button>
                <button className="study-primary-action" disabled={Boolean(loadingLesson || loadingQuestion || loadingEvaluation)} aria-pressed={activeInteraction === 'quiz'} onClick={() => studyQuestion ? openInteraction('quiz') : loadQuestion(lesson)}>Quiz me</button>
            </div>}
            {history.length > 0 && <details className="study-history">
                <summary>Earlier in this thread <span>{history.length}</span></summary>
                <ol>{history.map((entry, index) => <li key={index}>
                    <button disabled={busy} onClick={(event) => { setSelectedHistory(entry); setActiveInteraction('history'); event.currentTarget.closest('details').open = false }}>
                        <small>{index + 1} · {entry.type}</small><span>{entry.title}</span>
                    </button>
                </li>)}</ol>
            </details>}
            <section className="study-active-panel" data-study-interaction={activeInteraction} ref={panel} tabIndex={-1} aria-label="Current study interaction">
            {resumeSummary && <p className="orbit-muted">Last time: {resumeSummary} Your lesson is ready to revisit; activities and quizzes start fresh.</p>}
            {positionChanged && <div className="study-position-notice" role="status">Your course starting point is updated. This thread is still here.
                <button onClick={onNewThread}>Start a thread there</button>
            </div>}
            {selectedHistory && activeInteraction === 'history' && <div className="study-history-entry">
                <h3>{selectedHistory.title}</h3><p>{selectedHistory.content}</p>
                {selectedHistory.response && <p><strong>Orbit:</strong> {selectedHistory.response}</p>}
                <button onClick={() => openInteraction(selectedHistory.type)}>Return to current {selectedHistory.type}</button>
            </div>}
            {activeInteraction === 'example' && example && <div className="study-example"><h3>One example</h3><p>{example}</p><button disabled={busy} onClick={() => changeLesson('example')}>Another example</button></div>}
            {stage === 'learn' && (
                <div className="study-lesson">
                    {lesson && activeInteraction === 'lesson' && (
                        <div aria-live="polite">
                            <p>{lesson.content}</p>
                            <button disabled={busy} onClick={() => changeLesson('simplify')}>I lost you</button>
                            <CoursePosition course={course} today={today} onChange={onPositionChange ? changePosition : undefined} />
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

                    {activeInteraction === 'activity' && (activity || loadingActivity || activityError) && (
                        <div className="study-activity" aria-busy={Boolean(loadingActivity)}>
                            {activity && (
                                <>
                                    <div className="study-panel-heading"><h4>{activity.title}</h4><button disabled={busy} onClick={() => runActivity('generate')}>Another activity</button></div>
                                    <p>{activity.instruction}</p>
                                    <form onSubmit={submitActivity}>
                                        <label htmlFor={`study-activity-response-${id}`}>What did you try or notice?</label>
                                        <textarea
                                            id={`study-activity-response-${id}`}
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

                    {lesson && activeInteraction === 'conversation' && (
                        <div className="study-conversation">
                            <div aria-live="polite">
                                {conversation.slice(-1).map((exchange, index) => (
                                    <div key={index}>
                                        <details className="study-thought"><summary>Your thought: {exchange.message.slice(0, 80)}{exchange.message.length > 80 ? '…' : ''}</summary><p>{exchange.message}</p></details>
                                        <p><strong>Orbit:</strong> {exchange.response}</p>
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={sendMessage} aria-busy={loadingConversation}>
                                <label htmlFor={`study-message-${id}`}>What are you thinking?</label>
                                <textarea
                                    id={`study-message-${id}`}
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
                    {studyQuestion && !(showAdaptedLesson && evaluation) && (
                        <p>{studyQuestion.question}</p>
                    )}
                    {selectedAnswer && !(showAdaptedLesson && evaluation) && <p className="orbit-muted">Your answer: {selectedAnswer.text}</p>}
                    {evaluationError && <div role="alert"><p>{evaluationError}</p><button onClick={() => answerQuestion(selectedAnswer, true)}>Try again</button></div>}

                    {!answerResult && studyQuestion?.answers?.map((answer) => (
                        <button className="study-answer"
                            key={answer.text}
                            disabled={busy}
                            onClick={() => answerQuestion(answer)}
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
                            <details><summary>Review the original question</summary><p>{studyQuestion.question}</p><p>Your answer: {selectedAnswer?.text}</p></details>
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
            </section>
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
